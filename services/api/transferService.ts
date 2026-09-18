import { supabase, supabaseAdmin } from '../supabaseClient';
import { createNotification } from './notificationService';
import { getStorageItem } from './baseService';

export interface TransferRequestItem {
    id: string;
    createdAt: string;
    orderNumber: string;
    vin: string;
    customerName: string;
    consultantName: string;
    carModel: string;
    trim: string;
    extColor: string;
    fromWarehouse: string;
    fromWarehouseName?: string;
    toWarehouse: string;
    toWarehouseName?: string;
    reason: string;
    note?: string;
    status: 'pending' | 'completed' | 'rejected' | 'cancelled';
    soCtDnx?: string;
    adminNote?: string;
    printData?: any;
}

/**
 * TVBH gửi yêu cầu lập phiếu chuyển xe nội bộ (DNX) tới Admin
 */
export const createTransferRequest = async (payload: {
    orderNumber: string;
    vin: string;
    customerName: string;
    consultantName: string;
    carModel?: string;
    trim?: string;
    extColor?: string;
    fromWarehouse: string;
    fromWarehouseName?: string;
    toWarehouse: string;
    toWarehouseName?: string;
    reason: string;
    note?: string;
}): Promise<{ success: boolean; data?: TransferRequestItem; error?: string }> => {
    try {
        const username = (getStorageItem("currentUser") || "").toLowerCase();
        const consultant = payload.consultantName || getStorageItem("currentConsultant") || username || "TVBH";

        const metadata = {
            order_number: payload.orderNumber,
            vin: payload.vin,
            customer_name: payload.customerName,
            consultant_name: consultant,
            car_model: payload.carModel || '',
            trim: payload.trim || '',
            ext_color: payload.extColor || '',
            from_warehouse: payload.fromWarehouse || 'K87',
            from_warehouse_name: payload.fromWarehouseName || payload.fromWarehouse || 'Kho tổng K87',
            to_warehouse: payload.toWarehouse || 'K83',
            to_warehouse_name: payload.toWarehouseName || payload.toWarehouse || 'Showroom Thuận An (K83)',
            reason: payload.reason,
            note: payload.note || '',
            status: 'pending',
            so_ct_dnx: '',
            admin_note: '',
            print_data: null
        };

        const message = `TVBH ${consultant} yêu cầu lập phiếu chuyển xe nội bộ cho VIN ${payload.vin} (${payload.carModel || 'Xe'} - ĐH: ${payload.orderNumber}) từ ${metadata.from_warehouse} về ${metadata.to_warehouse}.`;

        const { data, error } = await supabaseAdmin.from('interactions').insert([{
            category: 'TRANSFER_REQUEST',
            type: 'INFO',
            message: message,
            actor_id: username,
            actor_name: consultant,
            recipient: 'ADMINS',
            is_read: false,
            target_view: 'cyber_plan',
            target_id: payload.orderNumber,
            metadata: metadata
        }]).select().single();

        if (error) throw error;

        // Gửi thông báo chuông cho Admin
        await createNotification({
            message: `🚚 [Chuyển xe] TVBH ${consultant} yêu cầu lập phiếu DNX xe ${payload.vin} (KH: ${payload.customerName}) về ${metadata.to_warehouse}.`,
            type: 'info',
            recipient: 'ADMINS',
            targetView: 'cyber_plan',
            targetId: payload.vin
        });

        const item: TransferRequestItem = {
            id: data.id,
            createdAt: data.created_at,
            orderNumber: payload.orderNumber,
            vin: payload.vin,
            customerName: payload.customerName,
            consultantName: consultant,
            carModel: payload.carModel || '',
            trim: payload.trim || '',
            extColor: payload.extColor || '',
            fromWarehouse: metadata.from_warehouse,
            fromWarehouseName: metadata.from_warehouse_name,
            toWarehouse: metadata.to_warehouse,
            toWarehouseName: metadata.to_warehouse_name,
            reason: payload.reason,
            note: payload.note,
            status: 'pending',
            printData: null
        };

        return { success: true, data: item };
    } catch (err: any) {
        console.error("Lỗi createTransferRequest:", err);
        return { success: false, error: err.message || 'Không thể tạo yêu cầu chuyển xe.' };
    }
};

/**
 * Lấy thông tin yêu cầu chuyển xe gần nhất theo Số đơn hàng hoặc Số VIN
 */
export const getTransferRequestByOrder = async (orderNumber: string, vin?: string): Promise<TransferRequestItem | null> => {
    try {
        if (!orderNumber && !vin) return null;
        let query = supabase
            .from('interactions')
            .select('*')
            .eq('category', 'TRANSFER_REQUEST')
            .order('created_at', { ascending: false });

        if (orderNumber && vin) {
            query = query.or(`target_id.eq.${orderNumber},metadata->>vin.eq.${vin}`);
        } else if (orderNumber) {
            query = query.eq('target_id', orderNumber);
        } else if (vin) {
            query = query.eq('metadata->>vin', vin);
        }

        const { data, error } = await query.limit(1);

        if (error || !data || data.length === 0) return null;
        const row = data[0];
        const m = row.metadata || {};

        // Nếu bản ghi đồng bộ tự động từ Cyber nhưng không phải phiếu DNX của Thuận An (08.DNX) thì bỏ qua
        if (m.synced_from_cyber && m.so_ct_dnx && !String(m.so_ct_dnx).startsWith('08.DNX')) {
            return null;
        }

        return {
            id: row.id,
            createdAt: row.created_at,
            orderNumber: m.order_number || row.target_id,
            vin: m.vin || '',
            customerName: m.customer_name || '',
            consultantName: m.consultant_name || row.actor_name,
            carModel: m.car_model || '',
            trim: m.trim || '',
            extColor: m.ext_color || '',
            fromWarehouse: m.from_warehouse || 'K87',
            fromWarehouseName: m.from_warehouse_name || m.from_warehouse,
            toWarehouse: m.to_warehouse || 'K83',
            toWarehouseName: m.to_warehouse_name || m.to_warehouse,
            reason: m.reason || '',
            note: m.note || '',
            status: m.status || 'pending',
            soCtDnx: m.so_ct_dnx || '',
            adminNote: m.admin_note || '',
            printData: m.print_data || null
        };
    } catch (err) {
        console.error("Lỗi getTransferRequestByOrder:", err);
        return null;
    }
};

/**
 * Tự động đồng bộ phiếu DNX đã lập trên CyberSoft về Supabase interactions
 */
export const syncCyberDnxToInteraction = async (payload: {
    orderNumber: string;
    vin: string;
    customerName: string;
    consultantName: string;
    carModel?: string;
    trim?: string;
    extColor?: string;
    fromWarehouse: string;
    fromWarehouseName?: string;
    toWarehouse: string;
    toWarehouseName?: string;
    reason: string;
    soCtDnx: string;
    printData?: any;
}): Promise<TransferRequestItem> => {
    try {
        const { data: existing } = await supabase
            .from('interactions')
            .select('*')
            .eq('category', 'TRANSFER_REQUEST')
            .or(`target_id.eq.${payload.orderNumber},metadata->>vin.eq.${payload.vin}`)
            .order('created_at', { ascending: false })
            .limit(1);

        const metadata = {
            order_number: payload.orderNumber,
            vin: payload.vin,
            customer_name: payload.customerName,
            consultant_name: payload.consultantName || 'TVBH',
            car_model: payload.carModel || '',
            trim: payload.trim || '',
            ext_color: payload.extColor || '',
            from_warehouse: payload.fromWarehouse || 'K87',
            from_warehouse_name: payload.fromWarehouseName || payload.fromWarehouse,
            to_warehouse: payload.toWarehouse || 'K83',
            to_warehouse_name: payload.toWarehouseName || payload.toWarehouse,
            reason: payload.reason || 'Lấy xe về PDI giao KH',
            note: '',
            status: 'completed',
            so_ct_dnx: payload.soCtDnx,
            admin_note: 'Đã hoàn tất phiếu chuyển trên CyberSoft',
            print_data: payload.printData || null,
            synced_from_cyber: true,
            updated_at: new Date().toISOString()
        };

        if (existing && existing.length > 0) {
            const rowId = existing[0].id;
            await supabaseAdmin
                .from('interactions')
                .update({
                    metadata: { ...existing[0].metadata, ...metadata },
                    is_read: true
                })
                .eq('id', rowId);

            return {
                id: rowId,
                createdAt: existing[0].created_at,
                orderNumber: payload.orderNumber,
                vin: payload.vin,
                customerName: payload.customerName,
                consultantName: payload.consultantName,
                carModel: payload.carModel || '',
                trim: payload.trim || '',
                extColor: payload.extColor || '',
                fromWarehouse: metadata.from_warehouse,
                fromWarehouseName: metadata.from_warehouse_name,
                toWarehouse: metadata.to_warehouse,
                toWarehouseName: metadata.to_warehouse_name,
                reason: metadata.reason,
                status: 'completed',
                soCtDnx: payload.soCtDnx,
                adminNote: metadata.admin_note,
                printData: payload.printData
            };
        } else {
            const message = `Phiếu chuyển xe DNX ${payload.soCtDnx} cho VIN ${payload.vin} (${payload.customerName}) từ ${metadata.from_warehouse} về ${metadata.to_warehouse}.`;
            const { data: inserted, error: insErr } = await supabaseAdmin.from('interactions').insert([{
                category: 'TRANSFER_REQUEST',
                type: 'INFO',
                message: message,
                actor_id: 'system_cyber',
                actor_name: payload.consultantName || 'Admin Cyber',
                recipient: payload.consultantName || 'TVBH',
                is_read: true,
                target_view: 'orders',
                target_id: payload.orderNumber,
                metadata: metadata
            }]).select().single();

            if (insErr) throw insErr;

            return {
                id: inserted.id,
                createdAt: inserted.created_at,
                orderNumber: payload.orderNumber,
                vin: payload.vin,
                customerName: payload.customerName,
                consultantName: payload.consultantName,
                carModel: payload.carModel || '',
                trim: payload.trim || '',
                extColor: payload.extColor || '',
                fromWarehouse: metadata.from_warehouse,
                fromWarehouseName: metadata.from_warehouse_name,
                toWarehouse: metadata.to_warehouse,
                toWarehouseName: metadata.to_warehouse_name,
                reason: metadata.reason,
                status: 'completed',
                soCtDnx: payload.soCtDnx,
                adminNote: metadata.admin_note,
                printData: payload.printData
            };
        }
    } catch (err) {
        console.error("Lỗi syncCyberDnxToInteraction:", err);
        return {
            id: `cyber-${payload.soCtDnx}`,
            createdAt: new Date().toISOString(),
            orderNumber: payload.orderNumber,
            vin: payload.vin,
            customerName: payload.customerName,
            consultantName: payload.consultantName,
            carModel: payload.carModel || '',
            trim: payload.trim || '',
            extColor: payload.extColor || '',
            fromWarehouse: payload.fromWarehouse,
            fromWarehouseName: payload.fromWarehouseName,
            toWarehouse: payload.toWarehouse,
            toWarehouseName: payload.toWarehouseName,
            reason: payload.reason,
            status: 'completed',
            soCtDnx: payload.soCtDnx,
            adminNote: 'Đã hoàn tất phiếu chuyển trên CyberSoft',
            printData: payload.printData
        };
    }
};

/**
 * Admin lấy danh sách các yêu cầu chuyển xe (mặc định lấy các yêu cầu đang chờ)
 */
export const getTransferRequests = async (statusFilter?: 'pending' | 'completed' | 'all'): Promise<TransferRequestItem[]> => {
    try {
        const query = supabase
            .from('interactions')
            .select('*')
            .eq('category', 'TRANSFER_REQUEST')
            .order('created_at', { ascending: false })
            .limit(100);

        const { data, error } = await query;
        if (error || !data) return [];

        const items: TransferRequestItem[] = data.map((row: any) => {
            const m = row.metadata || {};
            return {
                id: row.id,
                createdAt: row.created_at,
                orderNumber: m.order_number || row.target_id,
                vin: m.vin || '',
                customerName: m.customer_name || '',
                consultantName: m.consultant_name || row.actor_name,
                carModel: m.car_model || '',
                trim: m.trim || '',
                extColor: m.ext_color || '',
                fromWarehouse: m.from_warehouse || 'K87',
                fromWarehouseName: m.from_warehouse_name || m.from_warehouse,
                toWarehouse: m.to_warehouse || 'K83',
                toWarehouseName: m.to_warehouse_name || m.to_warehouse,
                reason: m.reason || '',
                note: m.note || '',
                status: m.status || 'pending',
                soCtDnx: m.so_ct_dnx || '',
                adminNote: m.admin_note || '',
                printData: m.print_data || null
            };
        });

        if (statusFilter === 'pending') {
            return items.filter(i => i.status === 'pending');
        } else if (statusFilter === 'completed') {
            return items.filter(i => i.status === 'completed');
        }

        return items;
    } catch (err) {
        console.error("Lỗi getTransferRequests:", err);
        return [];
    }
};

/**
 * Admin cập nhật trạng thái yêu cầu chuyển xe (Hoàn tất lập phiếu DNX hoặc từ chối)
 */
export const updateTransferRequestStatus = async (
    id: string,
    status: 'completed' | 'rejected' | 'cancelled',
    soCtDnx?: string,
    adminNote?: string,
    printData?: any
): Promise<{ success: boolean; error?: string }> => {
    try {
        const { data: existing, error: fetchErr } = await supabase
            .from('interactions')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchErr || !existing) throw new Error('Không tìm thấy yêu cầu chuyển xe');

        const currentMetadata = existing.metadata || {};
        const updatedMetadata = {
            ...currentMetadata,
            status,
            so_ct_dnx: soCtDnx !== undefined ? soCtDnx : currentMetadata.so_ct_dnx,
            admin_note: adminNote !== undefined ? adminNote : currentMetadata.admin_note,
            print_data: printData !== undefined ? printData : currentMetadata.print_data,
            updated_at: new Date().toISOString()
        };

        const { error } = await supabaseAdmin
            .from('interactions')
            .update({
                metadata: updatedMetadata,
                is_read: true
            })
            .eq('id', id);

        if (error) throw error;

        // Thông báo
        const tvbhName = currentMetadata.consultant_name || existing.actor_name;
        if (status === 'completed' && tvbhName) {
            await createNotification({
                message: `✅ Admin đã lập phiếu DNX ${soCtDnx || ''} điều chuyển xe ${currentMetadata.vin} (KH: ${currentMetadata.customer_name}) về ${currentMetadata.to_warehouse_name || 'K83'}. Bạn có thể xem và in phiếu ngay.`,
                type: 'success',
                recipient: tvbhName,
                targetView: 'orders',
                targetId: currentMetadata.order_number
            });
        } else if (status === 'rejected' && tvbhName) {
            await createNotification({
                message: `⚠️ Yêu cầu chuyển xe ${currentMetadata.vin} (ĐH ${currentMetadata.order_number}) đã bị Admin từ chối: ${adminNote || 'Admin từ chối'}.`,
                type: 'warning',
                recipient: tvbhName,
                targetView: 'orders',
                targetId: currentMetadata.order_number
            });
        } else if (status === 'cancelled') {
            await createNotification({
                message: `ℹ️ TVBH ${tvbhName || 'bán hàng'} đã hủy yêu cầu chuyển xe ${currentMetadata.vin} (KH: ${currentMetadata.customer_name}).`,
                type: 'info',
                recipient: 'ADMINS',
                targetView: 'cyber_plan',
                targetId: currentMetadata.vin
            });
        }

        return { success: true };
    } catch (err: any) {
        console.error("Lỗi updateTransferRequestStatus:", err);
        return { success: false, error: err.message || 'Không thể cập nhật trạng thái yêu cầu.' };
    }
};
