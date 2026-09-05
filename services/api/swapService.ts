import { supabase, supabaseAdmin } from '../supabaseClient';
import { getStorageItem, logAction, ApiResult, ADMIN_USER } from './baseService';
import { createNotification } from './notificationService';

export interface SwapRequestItem {
    id: string;
    createdAt: string;
    actorId: string;
    actorName: string;
    recipient: string;
    targetId: string; // Order A
    targetView: string; // Order B
    orderA: string;
    vinA: string;
    tvbhA: string;
    orderB: string;
    vinB: string;
    tvbhB: string;
    config: {
        dong_xe: string;
        phien_ban: string;
        ngoai_that: string;
        noi_that: string;
    };
    reason: string;
    status: 'pending_tvbh2' | 'waiting_admin' | 'approved' | 'rejected' | 'cancelled' | 'expired';
    rejectReason?: string;
}

/**
 * Kiểm tra xem Đơn hàng có đủ điều kiện tráo đổi xe hay không
 * Đơn đã gửi Yêu cầu XHĐ hoặc Đã xuất hóa đơn -> KHÔNG ĐƯỢC TRAO ĐỔI
 */
const checkOrderEligibilityForSwap = async (orderNumber: string): Promise<boolean> => {
    if (!orderNumber) return false;
    // 1. Kiểm tra đơn trong bảng donhang
    const { data: order } = await supabase.from('donhang').select('ket_qua').eq('so_don_hang', orderNumber).maybeSingle();
    if (order && (order.ket_qua || '').toLowerCase().includes('hóa đơn')) {
        return false;
    }

    // 2. Kiểm tra đơn có đang nằm trong bảng yeucauxhd hay không
    const { data: xhd } = await supabase.from('yeucauxhd').select('so_don_hang, trang_thai_vc').eq('so_don_hang', orderNumber).maybeSingle();
    if (xhd) {
        return false; // Đã tạo Yêu cầu XHĐ -> Chặn tráo đổi
    }

    return true;
};

/**
 * Khởi tạo Yêu cầu Trao đổi xe từ TVBH 1 gửi cho TVBH 2
 */
export const createSwapRequest = async (payload: {
    orderA: string;
    vinA: string;
    orderB: string;
    vinB: string;
    reason: string;
}): Promise<ApiResult> => {
    try {
        const currentUser = getStorageItem("currentConsultant") || getStorageItem("currentUser") || "Unknown";
        const { orderA, vinA, orderB, vinB, reason } = payload;

        // 1. Kiểm tra điều kiện xuất hóa đơn
        const eligibleA = await checkOrderEligibilityForSwap(orderA);
        if (!eligibleA) {
            return { status: 'ERROR', message: `Đơn hàng ${orderA} đã tạo Yêu cầu xuất hóa đơn, không được phép tráo đổi xe!` };
        }
        if (orderB) {
            const eligibleB = await checkOrderEligibilityForSwap(orderB);
            if (!eligibleB) {
                return { status: 'ERROR', message: `Đơn hàng ${orderB} của đối phương đã tạo Yêu cầu xuất hóa đơn, không được phép tráo đổi xe!` };
            }
        }

        // 2. Tra cứu dữ liệu 2 xe/đơn để xác nhận cấu hình và thông tin TVBH 2
        const { data: carBData } = await supabase.from('khoxe').select('*').eq('vin', vinB).single();
        if (!carBData) {
            return { status: 'ERROR', message: `Không tìm thấy thông tin xe ${vinB} trong kho!` };
        }

        let resolvedOrderB = orderB || '';
        let tvbhB = carBData.nguoi_giu_xe || "Unknown";

        // Tự động tìm đơn hàng B đang ghép với vinB nếu orderB chưa được truyền
        if (!resolvedOrderB) {
            const { data: matchedOrderB } = await supabase.from('donhang')
                .select('so_don_hang, ten_tu_van_ban_hang')
                .eq('vin', vinB)
                .not('ket_qua', 'ilike', 'Đã hủy%')
                .maybeSingle();

            if (matchedOrderB) {
                resolvedOrderB = matchedOrderB.so_don_hang;
                if (matchedOrderB.ten_tu_van_ban_hang) {
                    tvbhB = matchedOrderB.ten_tu_van_ban_hang;
                }
            }
        }

        if (tvbhB.toLowerCase() === currentUser.toLowerCase()) {
            return { status: 'ERROR', message: 'Bạn không thể tự gửi yêu cầu tráo đổi xe với chính mình!' };
        }

        // Lấy thông tin đơn A
        const { data: orderAData } = await supabase.from('donhang').select('*').eq('so_don_hang', orderA).single();
        if (!orderAData) {
            return { status: 'ERROR', message: `Không tìm thấy đơn hàng ${orderA}!` };
        }

        // Kiểm tra cấu hình khớp 100%
        const configA = {
            dong_xe: (orderAData.dong_xe || '').trim().toLowerCase(),
            phien_ban: (orderAData.phien_ban || '').trim().toLowerCase(),
            ngoai_that: (orderAData.ngoai_that || '').trim().toLowerCase(),
            noi_that: (orderAData.noi_that || '').trim().toLowerCase()
        };

        const configB = {
            dong_xe: (carBData.dong_xe || '').trim().toLowerCase(),
            phien_ban: (carBData.phien_ban || '').trim().toLowerCase(),
            ngoai_that: (carBData.ngoai_that || '').trim().toLowerCase(),
            noi_that: (carBData.noi_that || '').trim().toLowerCase()
        };

        if (configA.dong_xe !== configB.dong_xe || configA.phien_ban !== configB.phien_ban || configA.ngoai_that !== configB.ngoai_that || configA.noi_that !== configB.noi_that) {
            return { status: 'ERROR', message: 'Hai xe/đơn hàng không cùng cấu hình (Dòng xe, Phiên bản, Màu sắc). Không thể trao đổi!' };
        }

        // 3. Tạo Yêu cầu trong bảng 'interactions'
        const createdAt = new Date().toISOString();
        const requestData = {
            category: 'SWAP_REQUEST',
            type: 'PENDING_TVBH2',
            message: `TVBH ${currentUser} đề nghị trao đổi xe VIN ${vinB} (ĐH ${orderA} ↔ ĐH ${resolvedOrderB || 'Chưa ghép'}). Lý do: ${reason}`,
            actor_id: getStorageItem("currentUser") || currentUser,
            actor_name: currentUser,
            recipient: tvbhB,
            target_id: orderA,
            target_view: resolvedOrderB || vinB,
            metadata: {
                orderA,
                vinA: vinA || orderAData.vin || '',
                tvbhA: currentUser,
                orderB: resolvedOrderB,
                vinB,
                tvbhB,
                config: {
                    dong_xe: carBData.dong_xe,
                    phien_ban: carBData.phien_ban,
                    ngoai_that: carBData.ngoai_that,
                    noi_that: carBData.noi_that
                },
                reason,
                status: 'pending_tvbh2',
                created_at: createdAt
            }
        };

        const { data: inserted, error: insErr } = await supabaseAdmin.from('interactions').insert([requestData]).select().single();
        if (insErr) throw insErr;

        // 4. Gửi thông báo Realtime cho TVBH 2
        await createNotification({
            message: `TVBH ${currentUser} gửi đề nghị đổi xe VIN ${vinB} với bạn (ĐH ${orderA}).`,
            type: 'warning',
            recipient: tvbhB,
            targetView: 'swap_inbox',
            targetId: inserted.id
        });

        await logAction('CREATE_SWAP_REQUEST', { orderA, vinB, tvbhB, reason }, orderA, 'order');

        return { status: 'SUCCESS', message: `Đã gửi đề nghị đổi xe thành công tới TVBH ${tvbhB}!` };
    } catch (err: any) {
        console.error("Lỗi createSwapRequest:", err);
        return { status: 'ERROR', message: err.message || 'Lỗi khi gửi đề nghị đổi xe' };
    }
};

/**
 * Tải danh sách Yêu cầu Trao đổi xe (Tự động lọc yêu cầu quá 24h)
 */
export const getSwapRequests = async (): Promise<ApiResult> => {
    try {
        const currentUser = getStorageItem("currentConsultant") || getStorageItem("currentUser") || "Unknown";
        const userRole = getStorageItem("userRole");
        const actualUsername = getStorageItem("currentUser") || "";
        const isAdmin = currentUser === ADMIN_USER || userRole === 'Quản trị viên' || actualUsername.toLowerCase() === 'admin';

        const { data, error } = await supabase
            .from('interactions')
            .select('*')
            .in('category', ['SWAP_REQUEST', 'SWAP_CAR'])
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) throw error;

        const nowMs = Date.now();
        const EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 Giờ

        const items: SwapRequestItem[] = (data || []).map((m: any) => {
            const meta = m.metadata || {};
            const createdAtMs = new Date(m.created_at).getTime();
            let status = meta.status || 'pending_tvbh2';

            // Auto-expire requests older than 24 hours if still pending
            if ((status === 'pending_tvbh2' || status === 'waiting_admin') && (nowMs - createdAtMs > EXPIRATION_MS)) {
                status = 'expired';
                // Trigger background status update
                supabase.from('interactions').update({ metadata: { ...meta, status: 'expired' } }).eq('id', m.id).then();
            }

            return {
                id: m.id,
                createdAt: m.created_at,
                actorId: m.actor_id,
                actorName: m.actor_name,
                recipient: m.recipient,
                targetId: m.target_id,
                targetView: m.target_view,
                orderA: meta.orderA || m.target_id,
                vinA: meta.vinA || '',
                tvbhA: meta.tvbhA || m.actor_name,
                orderB: meta.orderB || '',
                vinB: meta.vinB || m.target_view,
                tvbhB: meta.tvbhB || m.recipient,
                config: meta.config || { dong_xe: '', phien_ban: '', ngoai_that: '', noi_that: '' },
                reason: meta.reason || '',
                status,
                rejectReason: meta.rejectReason
            };
        });

        // Filter for relevant items
        const filtered = items.filter(item => {
            if (isAdmin) return true;
            const isUserA = item.tvbhA.toLowerCase() === currentUser.toLowerCase();
            const isUserB = item.tvbhB.toLowerCase() === currentUser.toLowerCase();
            return isUserA || isUserB;
        });

        return { status: 'SUCCESS', message: 'Fetched swap requests', data: filtered };
    } catch (err: any) {
        console.error("Lỗi getSwapRequests:", err);
        return { status: 'ERROR', message: err.message || 'Lỗi tải danh sách đổi xe' };
    }
};

/**
 * TVBH 2 bấm Đồng Ý lời đề nghị đổi xe -> Chuyển sang chờ Admin phê duyệt
 */
export const tvbhAcceptSwapRequest = async (requestId: string): Promise<ApiResult> => {
    try {
        const currentUser = getStorageItem("currentConsultant") || "Unknown";
        const { data: req } = await supabase.from('interactions').select('*').eq('id', requestId).single();
        if (!req) return { status: 'ERROR', message: 'Không tìm thấy yêu cầu đổi xe!' };

        const meta = req.metadata || {};
        if (meta.status !== 'pending_tvbh2') {
            return { status: 'ERROR', message: `Yêu cầu này đã được xử lý (Trạng thái hiện tại: ${meta.status})` };
        }

        const updatedMeta = { ...meta, status: 'waiting_admin', tvbh2_accepted_at: new Date().toISOString() };
        const { error } = await supabaseAdmin.from('interactions').update({
            type: 'WAITING_ADMIN',
            metadata: updatedMeta
        }).eq('id', requestId);

        if (error) throw error;

        // Thông báo cho Admin & TVBH 1
        await createNotification({
            message: `TVBH ${currentUser} đã ĐỒNG Ý đề nghị đổi xe (ĐH ${meta.orderA} ↔ VIN ${meta.vinB}). Chờ Admin phê duyệt!`,
            type: 'info',
            recipient: 'ADMINS',
            targetView: 'swap_inbox',
            targetId: requestId
        });

        await createNotification({
            message: `TVBH ${currentUser} đã ĐỒNG Ý đề nghị đổi xe của bạn. Yêu cầu đã chuyển tới Admin để phê duyệt cuối cùng!`,
            type: 'success',
            recipient: meta.tvbhA,
            targetView: 'swap_inbox',
            targetId: requestId
        });

        return { status: 'SUCCESS', message: 'Đã chấp nhận lời đề nghị! Yêu cầu đã được chuyển tới Admin để phê duyệt.' };
    } catch (err: any) {
        return { status: 'ERROR', message: err.message || 'Lỗi khi chấp nhận đổi xe' };
    }
};

/**
 * Admin bấm PHÊ DUYỆT -> Thực thi tráo đổi VIN Atomic giữa 2 Đơn hàng và gửi Email
 */
export const adminApproveSwapRequest = async (requestId: string): Promise<ApiResult> => {
    try {
        const { data: req } = await supabase.from('interactions').select('*').eq('id', requestId).single();
        if (!req) return { status: 'ERROR', message: 'Không tìm thấy yêu cầu đổi xe!' };

        const meta = req.metadata || {};
        let { orderA, vinA, tvbhA, orderB, vinB, tvbhB } = meta;

        // Nếu orderB chưa có trong metadata, tự động tìm đơn B ghép với vinB ngoại trừ orderA
        if (!orderB && vinB) {
            const { data: matchedOrderB } = await supabaseAdmin.from('donhang')
                .select('so_don_hang, ten_tu_van_ban_hang')
                .eq('vin', vinB)
                .neq('so_don_hang', orderA)
                .maybeSingle();
            if (matchedOrderB) {
                orderB = matchedOrderB.so_don_hang;
                if (matchedOrderB.ten_tu_van_ban_hang) tvbhB = matchedOrderB.ten_tu_van_ban_hang;
            }
        }

        // Kiểm tra lại tính hợp lệ của Đơn hàng A & B trước khi hoán đổi
        const eligibleA = await checkOrderEligibilityForSwap(orderA);
        if (!eligibleA) return { status: 'ERROR', message: `Đơn hàng ${orderA} đã tạo Yêu cầu XHĐ, không thể phê duyệt tráo đổi!` };

        if (orderB) {
            const eligibleB = await checkOrderEligibilityForSwap(orderB);
            if (!eligibleB) return { status: 'ERROR', message: `Đơn hàng ${orderB} đã tạo Yêu cầu XHĐ, không thể phê duyệt tráo đổi!` };
        }

        const swapTime = new Date().toISOString();

        // 1. Cập nhật Đơn hàng A (Nhận VIN B)
        await supabaseAdmin.from('donhang').update({
            vin: vinB,
            ket_qua: 'Đã ghép',
            thoi_gian_ghep: swapTime
        }).eq('so_don_hang', orderA);

        // 2. Cập nhật Đơn hàng B (Nhận VIN A hoặc trở thành Chưa ghép nếu không có VIN A)
        if (orderB) {
            const newStatusB = vinA ? 'Đã ghép' : 'Chưa ghép';
            await supabaseAdmin.from('donhang').update({
                vin: vinA || null,
                ket_qua: newStatusB,
                thoi_gian_ghep: vinA ? swapTime : null
            }).eq('so_don_hang', orderB);
        }

        // Đảm bảo không có bất kỳ đơn nào khác ngoại trừ orderA tiếp tục sở hữu vinB
        if (vinB) {
            const { data: otherOrdersWithVinB } = await supabaseAdmin.from('donhang')
                .select('so_don_hang')
                .eq('vin', vinB)
                .neq('so_don_hang', orderA);

            if (otherOrdersWithVinB && otherOrdersWithVinB.length > 0) {
                for (const o of otherOrdersWithVinB) {
                    await supabaseAdmin.from('donhang').update({
                        vin: vinA || null,
                        ket_qua: vinA ? 'Đã ghép' : 'Chưa ghép',
                        thoi_gian_ghep: vinA ? swapTime : null
                    }).eq('so_don_hang', o.so_don_hang);
                }
            }
        }

        // 3. Cập nhật người giữ xe trong Kho xe
        if (vinB) {
            await supabaseAdmin.from('khoxe').update({
                trang_thai: 'Đã ghép',
                nguoi_giu_xe: tvbhA,
                thoi_gian_het_han_giu: 'Vô thời hạn'
            }).eq('vin', vinB);
        }

        if (vinA) {
            const newHolder = orderB ? tvbhB : 'Chưa ghép';
            const newCarStatus = orderB ? 'Đã ghép' : 'Chưa ghép';
            await supabaseAdmin.from('khoxe').update({
                trang_thai: newCarStatus,
                nguoi_giu_xe: newHolder,
                thoi_gian_het_han_giu: orderB ? 'Vô thời hạn' : null
            }).eq('vin', vinA);
        }

        // 4. Cập nhật trạng thái Yêu cầu đổi xe = 'approved'
        const updatedMeta = { ...meta, status: 'approved', approved_at: swapTime };
        await supabaseAdmin.from('interactions').update({
            type: 'APPROVED',
            metadata: updatedMeta
        }).eq('id', requestId);

        // 5. Ghi Log Audit Trail
        await logAction('SWAP_VIN_SUCCESS', { orderA, vinA, tvbhA, orderB, vinB, tvbhB }, orderA, 'order');

        // 6. Gửi Email thông báo hoán đổi VIN cho 2 TVBH qua Edge Function
        try {
            const swapEmailPayload = {
                actionId: 'swap_car_success',
                orderA,
                vinA: meta.vinA || vinA || 'N/A',   // VIN ban đầu Đơn A
                newVinA: vinB,                     // VIN mới nhận Đơn A
                tvbhA,
                orderB: orderB || 'N/A',
                vinB: meta.vinB || vinB || 'N/A',   // VIN ban đầu Đơn B
                newVinB: vinA,                     // VIN mới nhận Đơn B
                tvbhB,
                config: meta.config,
                reason: meta.reason || 'Trao đổi xe cùng cấu hình'
            };

            // Gửi email cho TVBH A (Đề nghị)
            supabaseAdmin.functions.invoke('send-email', {
                body: { ...swapEmailPayload, targetTvbh: tvbhA }
            }).catch(e => console.warn('Failed to send swap email to TVBH A:', e));

            // Gửi email cho TVBH B (Sở hữu)
            if (tvbhB) {
                supabaseAdmin.functions.invoke('send-email', {
                    body: { ...swapEmailPayload, targetTvbh: tvbhB }
                }).catch(e => console.warn('Failed to send swap email to TVBH B:', e));
            }
        } catch (e) {
            console.error('Error invoking swap email:', e);
        }

        // 7. Gửi thông báo Realtime cho cả 2 TVBH
        await createNotification({
            message: `Admin đã PHÊ DUYỆT hoán đổi xe! Đơn ${orderA} của bạn hiện sở hữu VIN ${vinB}.`,
            type: 'success',
            recipient: tvbhA,
            targetView: 'orders',
            targetId: orderA
        });

        await createNotification({
            message: `Admin đã PHÊ DUYỆT hoán đổi xe! Đơn ${orderB || 'xe'} của bạn đã được cập nhật thành công.`,
            type: 'success',
            recipient: tvbhB,
            targetView: 'orders',
            targetId: orderB || vinB
        });

        return { status: 'SUCCESS', message: `Đã phê duyệt tráo đổi xe thành công giữa ĐH ${orderA} và ĐH ${orderB || vinB}!` };
    } catch (err: any) {
        console.error("Lỗi adminApproveSwapRequest:", err);
        return { status: 'ERROR', message: err.message || 'Lỗi khi Admin phê duyệt tráo đổi xe' };
    }
};

/**
 * TVBH 2 hoặc Admin bấm TỪ CHỐI đề nghị đổi xe
 */
export const rejectSwapRequest = async (requestId: string, rejectReason?: string): Promise<ApiResult> => {
    try {
        const currentUser = getStorageItem("currentConsultant") || "Unknown";
        const { data: req } = await supabase.from('interactions').select('*').eq('id', requestId).single();
        if (!req) return { status: 'ERROR', message: 'Không tìm thấy yêu cầu đổi xe!' };

        const meta = req.metadata || {};
        const updatedMeta = { ...meta, status: 'rejected', rejectReason: rejectReason || '', rejected_by: currentUser, rejected_at: new Date().toISOString() };

        await supabaseAdmin.from('interactions').update({
            type: 'REJECTED',
            metadata: updatedMeta
        }).eq('id', requestId);

        // Thông báo cho TVBH 1
        await createNotification({
            message: `${currentUser} đã TỪ CHỐI đề nghị đổi xe (ĐH ${meta.orderA} ↔ VIN ${meta.vinB}).${rejectReason ? ' Lý do: ' + rejectReason : ''}`,
            type: 'error',
            recipient: meta.tvbhA,
            targetView: 'swap_inbox',
            targetId: requestId
        });

        return { status: 'SUCCESS', message: 'Đã từ chối đề nghị đổi xe!' };
    } catch (err: any) {
        return { status: 'ERROR', message: err.message || 'Lỗi khi từ chối đổi xe' };
    }
};

/**
 * Admin chủ động tráo VIN trực tiếp giữa 2 Đơn hàng bất kỳ cùng cấu hình (Admin Power Swap)
 */
export const adminDirectSwap = async (payload: {
    orderA: string;
    orderB: string;
    reason?: string;
}): Promise<ApiResult> => {
    try {
        const { orderA, orderB, reason } = payload;
        if (!orderA || !orderB) {
            return { status: 'ERROR', message: 'Vui lòng chọn đầy đủ 2 đơn hàng để tráo đổi VIN!' };
        }
        if (orderA === orderB) {
            return { status: 'ERROR', message: 'Không thể tráo đổi 1 đơn hàng với chính nó!' };
        }

        // Fetch Order A & Order B
        const [{ data: orderAData }, { data: orderBData }] = await Promise.all([
            supabaseAdmin.from('donhang').select('*').eq('so_don_hang', orderA).single(),
            supabaseAdmin.from('donhang').select('*').eq('so_don_hang', orderB).single()
        ]);

        if (!orderAData) return { status: 'ERROR', message: `Không tìm thấy đơn hàng ${orderA}!` };
        if (!orderBData) return { status: 'ERROR', message: `Không tìm thấy đơn hàng ${orderB}!` };

        // Verify configuration match 100%
        const configA = {
            dong_xe: (orderAData.dong_xe || '').trim().toLowerCase(),
            phien_ban: (orderAData.phien_ban || '').trim().toLowerCase(),
            ngoai_that: (orderAData.ngoai_that || '').trim().toLowerCase(),
            noi_that: (orderAData.noi_that || '').trim().toLowerCase()
        };

        const configB = {
            dong_xe: (orderBData.dong_xe || '').trim().toLowerCase(),
            phien_ban: (orderBData.phien_ban || '').trim().toLowerCase(),
            ngoai_that: (orderBData.ngoai_that || '').trim().toLowerCase(),
            noi_that: (orderBData.noi_that || '').trim().toLowerCase()
        };

        if (configA.dong_xe !== configB.dong_xe || configA.phien_ban !== configB.phien_ban || configA.ngoai_that !== configB.ngoai_that || configA.noi_that !== configB.noi_that) {
            return { status: 'ERROR', message: 'Hai đơn hàng không cùng cấu hình (Dòng xe, Phiên bản, Màu sắc). Không thể tráo đổi!' };
        }

        const vinA = orderAData.vin || '';
        const vinB = orderBData.vin || '';
        const tvbhA = orderAData.ten_tu_van_ban_hang || 'Unknown';
        const tvbhB = orderBData.ten_tu_van_ban_hang || 'Unknown';

        const swapTime = new Date().toISOString();

        // 1. Swap VINs in donhang table
        await Promise.all([
            supabaseAdmin.from('donhang').update({
                vin: vinB || null,
                ket_qua: vinB ? 'Đã ghép' : 'Chưa ghép',
                thoi_gian_ghep: vinB ? swapTime : null
            }).eq('so_don_hang', orderA),
            supabaseAdmin.from('donhang').update({
                vin: vinA || null,
                ket_qua: vinA ? 'Đã ghép' : 'Chưa ghép',
                thoi_gian_ghep: vinA ? swapTime : null
            }).eq('so_don_hang', orderB)
        ]);

        // 2. Update khoxe holders
        if (vinB) {
            await supabaseAdmin.from('khoxe').update({
                trang_thai: 'Đã ghép',
                nguoi_giu_xe: tvbhA,
                thoi_gian_het_han_giu: 'Vô thời hạn'
            }).eq('vin', vinB);
        }
        if (vinA) {
            await supabaseAdmin.from('khoxe').update({
                trang_thai: 'Đã ghép',
                nguoi_giu_xe: tvbhB,
                thoi_gian_het_han_giu: 'Vô thời hạn'
            }).eq('vin', vinA);
        }

        // 3. Record interaction log
        const createdAt = new Date().toISOString();
        await supabaseAdmin.from('interactions').insert([{
            category: 'SWAP_REQUEST',
            type: 'APPROVED',
            message: `[ADMIN POWER SWAP] Admin tráo đổi trực tiếp VIN giữa ĐH ${orderA} (${vinA || 'Chưa ghép'}) ↔ ĐH ${orderB} (${vinB || 'Chưa ghép'}). Lý do: ${reason || 'Admin điều phối'}`,
            actor_id: 'ADMIN',
            actor_name: 'Admin',
            recipient: tvbhB,
            target_id: orderA,
            target_view: orderB,
            metadata: {
                orderA,
                vinA,
                tvbhA,
                orderB,
                vinB,
                tvbhB,
                config: {
                    dong_xe: orderAData.dong_xe,
                    phien_ban: orderAData.phien_ban,
                    ngoai_that: orderAData.ngoai_that,
                    noi_that: orderAData.noi_that
                },
                reason: reason || 'Admin tráo VIN trực tiếp',
                status: 'approved',
                created_at: createdAt,
                approved_at: createdAt,
                by_admin: true
            }
        }]);

        await logAction('ADMIN_DIRECT_SWAP_VIN', { orderA, vinA, tvbhA, orderB, vinB, tvbhB, reason }, orderA, 'order');

        // 4. Send Emails to both TVBHs
        try {
            const swapEmailPayload = {
                actionId: 'swap_car_success',
                orderA,
                vinA: vinA || 'N/A',
                newVinA: vinB || 'N/A',
                tvbhA,
                orderB,
                vinB: vinB || 'N/A',
                newVinB: vinA || 'N/A',
                tvbhB,
                config: {
                    dong_xe: orderAData.dong_xe,
                    phien_ban: orderAData.phien_ban,
                    ngoai_that: orderAData.ngoai_that,
                    noi_that: orderAData.noi_that
                },
                reason: reason || 'Admin tráo VIN trực tiếp'
            };

            supabaseAdmin.functions.invoke('send-email', {
                body: { ...swapEmailPayload, targetTvbh: tvbhA }
            }).catch(() => {});

            supabaseAdmin.functions.invoke('send-email', {
                body: { ...swapEmailPayload, targetTvbh: tvbhB }
            }).catch(() => {});
        } catch (e) {}

        // 5. Send Realtime notifications
        await Promise.all([
            createNotification({
                message: `Admin đã TRÁO VIN trực tiếp! Đơn ${orderA} của bạn hiện đổi sang sở hữu VIN ${vinB}.`,
                type: 'success',
                recipient: tvbhA,
                targetView: 'orders',
                targetId: orderA
            }),
            createNotification({
                message: `Admin đã TRÁO VIN trực tiếp! Đơn ${orderB} của bạn hiện đổi sang sở hữu VIN ${vinA}.`,
                type: 'success',
                recipient: tvbhB,
                targetView: 'orders',
                targetId: orderB
            })
        ]);

        return { status: 'SUCCESS', message: `Đã tráo đổi VIN trực tiếp thành công giữa đơn ${orderA} và ${orderB}!` };
    } catch (err: any) {
        console.error("Lỗi adminDirectSwap:", err);
        return { status: 'ERROR', message: err.message || 'Lỗi tráo VIN trực tiếp' };
    }
};

/**
 * TVBH 1 tự HỦY ĐỀ NGHỊ đổi xe trước khi hoàn tất
 */
export const cancelSwapRequest = async (requestId: string): Promise<ApiResult> => {
    try {
        const currentUser = getStorageItem("currentConsultant") || "Unknown";
        const { data: req } = await supabase.from('interactions').select('*').eq('id', requestId).single();
        if (!req) return { status: 'ERROR', message: 'Không tìm thấy yêu cầu đổi xe!' };

        const meta = req.metadata || {};
        const updatedMeta = { ...meta, status: 'cancelled', cancelled_at: new Date().toISOString() };

        await supabaseAdmin.from('interactions').update({
            type: 'CANCELLED',
            metadata: updatedMeta
        }).eq('id', requestId);

        // Thông báo cho TVBH 2
        await createNotification({
            message: `TVBH ${currentUser} đã HỦY đề nghị đổi xe với bạn.`,
            type: 'info',
            recipient: meta.tvbhB,
            targetView: 'swap_inbox',
            targetId: requestId
        });

        return { status: 'SUCCESS', message: 'Đã hủy đề nghị đổi xe thành công.' };
    } catch (err: any) {
        return { status: 'ERROR', message: err.message || 'Lỗi khi hủy đề nghị đổi xe' };
    }
};
