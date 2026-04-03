import { useState, useCallback } from 'react';
import { Order, VcRequest, ActionType, StockVehicle } from '../types';
import * as apiService from '../services/apiService';
import { supabaseAdmin } from '../services/supabaseClient';

interface UseAdminActionsProps {
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    hideToast: () => void;
    refetchHistory: (isSilent?: boolean) => void;
    refetchStock: (isSilent?: boolean) => void;
    refetchXuathoadon: (isSilent?: boolean) => void;
    refetchAdminData: (isSilent?: boolean) => void;
    fetchVcData: (isSilent?: boolean) => void;
    teamData: Record<string, string[]>;
    allUsers: { name: string, role: string, username: string }[];
    allOrders: Order[];
    suggestionsMap: Map<string, StockVehicle[]>;
    selectedRows: Set<string>;
    setSelectedRows: (rows: Set<string>) => void;
    setShowMatchingModal: (show: boolean) => void;
}

export const useAdminActions = ({
    showToast, hideToast, refetchHistory, refetchStock, refetchXuathoadon, refetchAdminData, fetchVcData,
    teamData, allUsers, allOrders, suggestionsMap, selectedRows, setSelectedRows, setShowMatchingModal
}: UseAdminActionsProps) => {
    const [invoiceModalState, setInvoiceModalState] = useState<{ type: ActionType; order: Order | VcRequest } | null>(null);
    const [bulkActionModal, setBulkActionModal] = useState<{ type: ActionType } | null>(null);
    const [suggestionModalState, setSuggestionModalState] = useState<{ order: Order; cars: StockVehicle[] } | null>(null);
    const [adminModal, setAdminModal] = useState<'archive' | 'addCar' | 'bulkAddCar' | 'bulkAddCarExcel' | 'deleteCar' | 'restoreCar' | 'deleteOrder' | 'revertOrder' | 'advanceOrder' | 'timeline' | 'addUser' | 'thongTinXeExcel' | null>(null);
    const [editingOrder, setEditingOrder] = useState<Order | null>(null);
    const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
    const [editingTeam, setEditingTeam] = useState<{ leader: string; members: string[] } | null>(null);
    const [isAddingNewTeam, setIsAddingNewTeam] = useState(false);

    const [processingState, setProcessingState] = useState<{ id: string; type: ActionType } | null>(null);
    const processingId = processingState?.id || null;

    const handleAdminSubmit = useCallback(async (
        action: string,
        params: Record<string, any>,
        _successMessage: string,
        refetchType: 'history' | 'stock' | 'both' | 'admin' | 'none' = 'history'
    ) => {
//         showToast('Đang xử lý...', 'Vui lòng chờ trong giây lát.', 'loading');
        try {
            const result = await apiService.performAdminAction(action, params);
            if (result && result.status !== 'SUCCESS') {
                throw new Error(result.message || 'Thao tác thất bại.');
            }
            setInvoiceModalState(null);
            setAdminModal(null);
            setSuggestionModalState(null);
            setSelectedRows(new Set());
            setBulkActionModal(null);
            setShowMatchingModal(false);

            showToast('Thành công!', _successMessage || 'Thao tác thành công.', 'success');

            if (refetchType === 'history' || refetchType === 'both') {
                refetchHistory(true);
                refetchXuathoadon(true);
            }
            if (refetchType === 'stock' || refetchType === 'both') {
                refetchStock(true);
            }
            if (refetchType === 'admin') {
                refetchAdminData(true);
            }
            if (action.toLowerCase().includes('vcrequest') || action.toLowerCase().includes('vc')) {
                fetchVcData(true);
            }
            return true;
        } catch (error) {
            const message = error instanceof Error ? error.message : "Đã xảy ra lỗi.";
            showToast('Thao tác thất bại', message, 'error');
            return false;
        }
    }, [showToast, hideToast, refetchHistory, refetchXuathoadon, refetchStock, refetchAdminData, fetchVcData, setSelectedRows, setShowMatchingModal]);

    const handleEditSuccess = useCallback((message: string) => {
        setEditingOrder(null);
        showToast('Thành công!', message, 'success');
        refetchHistory(true);
        refetchXuathoadon(true);
    }, [showToast, refetchHistory, refetchXuathoadon]);

    const handleEditInvoiceDetails = useCallback(async (orderNumber: string, data: { engineNumber: string; policy: string; commission: string; vpoint: string }) => {
        return handleAdminSubmit('updateRowData', {
            sheetName: 'Xuathoadon',
            primaryKeyColumn: 'SỐ ĐƠN HÀNG',
            primaryKeyValue: orderNumber,
            "SỐ ĐỘNG CƠ": data.engineNumber,
            "CHÍNH SÁCH": data.policy,
            "Hoa hồng ứng": data.commission,
            "Điểm Vpoint sử dụng": data.vpoint
        }, 'Đã cập nhật thông tin hóa đơn.', 'history');
    }, [handleAdminSubmit]);

    const handleBulkActionSubmit = useCallback(async (action: ActionType, params: Record<string, any> = {}) => {
        if (selectedRows.size === 0) {
            showToast('Lỗi', 'Không có mục nào được chọn.', 'error');
            return false;
        }
        const orderNumbers = Array.from(selectedRows);
        const successMessage = `Đã thực hiện thao tác cho ${orderNumbers.length} mục.`;

        const apiActionMap: Partial<Record<ActionType, string>> = {
            approve: 'approveSelectedInvoiceRequest',
            pendingSignature: 'markAsPendingSignature',
            supplement: 'requestSupplementForInvoice',
            cancel: 'cancelRequest',
        };
        const apiAction = apiActionMap[action] || action;

        const success = await handleAdminSubmit(
            apiAction,
            { ...params, orderNumbers: JSON.stringify(orderNumbers) },
            successMessage
        );

        if (success) {
            setBulkActionModal(null);
            setSelectedRows(new Set());
        }
        return success;
    }, [selectedRows, handleAdminSubmit, showToast, setSelectedRows]);

    const handleAction = async (type: ActionType, order: Order | VcRequest, data?: any) => {
        if (type === 'manualMatch') {
            const suggestedCars = suggestionsMap.get(order['Số đơn hàng']) || [];
            setSuggestionModalState({ order: order as Order, cars: suggestedCars });
        } else if (type === 'pair' && data?.vin) {
            setProcessingState({ id: order['Số đơn hàng'], type });
            try {
                // Direct pair action from Matching Cockpit
                await handleConfirmSuggestion(order['Số đơn hàng'], data.vin);
            } finally {
                setProcessingState(null);
            }
        } else if (type === 'requestInvoice') {
            const orderToRequest = allOrders.find(o => o['Số đơn hàng'] === order['Số đơn hàng']);
            if (orderToRequest) {
                showToast('Chức năng đang phát triển', 'Yêu cầu xuất hóa đơn từ Admin Panel sẽ sớm được cập nhật.', 'info');
            }
        } else if (type === 'approve') {
            setProcessingState({ id: order['Số đơn hàng'], type });
            try {
                await handleAdminSubmit(
                    'approveSelectedInvoiceRequest',
                    { orderNumbers: JSON.stringify([order['Số đơn hàng']]) },
                    'Đã phê duyệt yêu cầu.'
                );
            } finally {
                setProcessingState(null);
            }
        } else if (type === 'pendingSignature') {
            setProcessingState({ id: order['Số đơn hàng'], type });
            try {
                await handleAdminSubmit(
                    'markAsPendingSignature',
                    { orderNumbers: JSON.stringify([order['Số đơn hàng']]) },
                    'Đã chuyển trạng thái.'
                );
            } finally {
                setProcessingState(null);
            }
        } else if (type === 'uploadInvoice' && data?.file) {
            setProcessingState({ id: order['Số đơn hàng'], type });
            try {
                const file = data.file as File;
                const fileToBase64 = (f: File): Promise<string> => new Promise((res, rej) => { const r = new FileReader(); r.readAsDataURL(f); r.onload = () => res((r.result as string).split(',')[1]); r.onerror = e => rej(e); });

                const base64Data = await fileToBase64(file);
                const res = await apiService.uploadBulkInvoices([{
                    orderNumber: order['Số đơn hàng'],
                    base64Data,
                    mimeType: file.type,
                    fileName: file.name,
                    fileObject: file
                }]);

                if (res.status === 'SUCCESS') {
                    showToast('Thành công!', res.message, 'success');
                    refetchHistory(true);
                    refetchXuathoadon(true);
                } else {
                    showToast('Lỗi', res.message, 'error');
                }
            } catch (e: any) {
                showToast('Lỗi', e.message || 'Không thể tải lên hóa đơn.', 'error');
            } finally {
                setProcessingState(null);
            }
        } else if (type === 'edit') {
            setEditingOrder(order as Order);
        } else if (type === 'approveVc') {
            setProcessingState({ id: order['Số đơn hàng'], type });
            try {
                await handleAdminSubmit(
                    'approveVcRequest',
                    { orderNumber: order['Số đơn hàng'] },
                    'Đã phê duyệt yêu cầu VC.'
                );
            } finally {
                setProcessingState(null);
            }
        } else if (type === 'resend') {
            setProcessingState({ id: order['Số đơn hàng'], type });
            try {
                const s = String(order['Trạng thái xử lý'] || order['Kết quả'] || '').toLowerCase();
                const emailType = s === 'yêu cầu bổ sung' ? 'invoice_supplement_requested' : 'invoice_issued';

                await handleAdminSubmit(
                    'resendEmail',
                    { orderNumbers: JSON.stringify([order['Số đơn hàng']]), emailType },
                    'Đã gửi lại email.'
                );
            } finally {
                setProcessingState(null);
            }
        } else {
            setInvoiceModalState({ type, order });
        }
    };

    const handleDownloadAllVcImages = async (request: VcRequest) => {
//         showToast('Đang chuẩn bị...', `Đang chuẩn bị các tệp để tải xuống cho KH: ${request['Tên khách hàng']}.`, 'loading');

        const toDownloadableUrl = (url: string): string | null => {
            if (!url) return null;
            if (url.includes('drive.google.com')) {
                const idMatch = url.match(/id=([a-zA-Z0-9_-]{25,})/) || url.match(/\/d\/([a-zA-Z0-9_-]{25,})/);
                if (idMatch && idMatch[1]) {
                    return `https://drive.google.com/uc?export=download&id=${idMatch[1]}`;
                }
            } else if (url.includes('supabase.co/storage/v1/object/public/')) {
                return url.includes('?') ? `${url}&download=` : `${url}?download=`;
            }
            return url;
        };

        let fileUrls: Record<string, string> = {};
        try {
            if (request.FileUrls) fileUrls = JSON.parse(request.FileUrls);
            else if (request['URL hình ảnh']) fileUrls = { unc: request['URL hình ảnh'] };
        } catch (e) {
            showToast('Lỗi', 'Không thể đọc danh sách tệp.', 'error');
            return;
        }

        const downloads = Object.entries(fileUrls);
        if (downloads.length === 0) {
            showToast('Không có tệp', 'Không tìm thấy tệp nào để tải xuống.', 'info');
            return;
        }

        for (let i = 0; i < downloads.length; i++) {
            const [, url] = downloads[i];
            const downloadableUrl = toDownloadableUrl(url);

            if (downloadableUrl) {
                const iframe = document.createElement('iframe');
                iframe.style.display = 'none';
                iframe.src = downloadableUrl;
                document.body.appendChild(iframe);

                setTimeout(() => {
                    if (iframe.parentNode) {
                        iframe.parentNode.removeChild(iframe);
                    }
                }, 10000);

                if (i < downloads.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }

        showToast('Hoàn tất', `Đã bắt đầu tải xuống ${downloads.length} tệp.`, 'success');
    };

    const handleConfirmSuggestion = async (orderNumber: string, vin: string) => {
        setProcessingState({ id: orderNumber, type: 'pair' });
        try {
            await handleAdminSubmit('manualMatchCar', { orderNumber, vin }, `Đã ghép thành công ĐH ${orderNumber}.`, 'both');
        } finally {
            setProcessingState(null);
        }
    };

    const handleSaveTeam = async (newTeamData: Record<string, string[]>) => {
//         showToast('Đang cập nhật...', 'Đang lưu cấu hình phòng ban lên Supabase.', 'loading');
        try {
            // Mapping names to usernames from allUsers
            const nameToUsername: Record<string, string> = {};
            allUsers.forEach(u => {
                nameToUsername[u.name.trim().toUpperCase()] = u.username;
            });

            const leaderNameToUpdate = editingTeam ? editingTeam.leader : (Object.keys(newTeamData).find(k => !teamData[k]) || '');
            if (!leaderNameToUpdate && !editingTeam) throw new Error("Không xác định được Trưởng phòng.");

            const leaderUsername = nameToUsername[leaderNameToUpdate.trim().toUpperCase()];
            if (!leaderUsername) throw new Error(`Không tìm thấy username cho leader: ${leaderNameToUpdate}`);

            const memberNames = newTeamData[leaderNameToUpdate] || [];
            const memberUsernames = memberNames
                .map(name => nameToUsername[name.trim().toUpperCase()])
                .filter(u => u != null);

            console.log(`Saving team for ${leaderUsername}. Members: ${memberUsernames}`);

            // 1. Reset manager_id for anyone who used to be in this team
            const { error: resetError } = await supabaseAdmin.from('users').update({ manager_id: null }).eq('manager_id', leaderUsername);
            if (resetError) throw resetError;

            // 2. Set manager_id for new members
            if (memberUsernames.length > 0) {
                const { error: updateError } = await supabaseAdmin.from('users').update({ manager_id: leaderUsername }).in('username', memberUsernames);
                if (updateError) throw updateError;
            }

            // Sync with GAS (optional but recommended for compatibility)
            // apiService.performAdminAction('updateTeams', { teams: JSON.stringify(newTeamData) }).catch(e => console.error("GAS sync failed:", e));

            showToast('Thành công', 'Cập nhật phòng ban thành công.', 'success');
            refetchAdminData(true);
            setEditingTeam(null);
            setIsAddingNewTeam(false);
        } catch (error: any) {
            console.error("Save Team Error:", error);
            showToast('Lỗi', error.message || 'Không thể cập nhật phòng ban.', 'error');
        }
    };

    const handleDeleteTeam = async (leaderName: string) => {
        const confirmed = window.confirm(`Bạn có chắc chắn muốn giải tán phòng của "${leaderName}"? Các thành viên sẽ không bị xóa khỏi hệ thống.`);
        if (confirmed) {
//             showToast('Đang xử lý...', 'Đang giải tán phòng...', 'loading');
            try {
                // Find leader username
                const leader = allUsers.find(u => u.name.trim().toUpperCase() === leaderName.trim().toUpperCase());
                if (!leader) throw new Error("Không tìm thấy thông tin Trưởng phòng.");

                const { error } = await supabaseAdmin.from('users').update({ manager_id: null }).eq('manager_id', leader.username);
                if (error) throw error;

                showToast('Thành công', 'Đã giải tán phòng ban.', 'success');
                refetchAdminData(true);
            } catch (error: any) {
                showToast('Lỗi', error.message || 'Không thể xóa phòng ban.', 'error');
            }
        }
    };

    const handleCloseAdminModal = useCallback(() => setAdminModal(null), []);
    const handleCloseBulkActionModal = useCallback(() => setBulkActionModal(null), []);

    const handleBackgroundAdminSubmit = useCallback(async (
        action: string,
        params: Record<string, any>,
        successMessage: string,
        refetchType: 'history' | 'stock' | 'both' | 'admin' | 'none' = 'history'
    ) => {
        // Immediately close the modal to unblock the UI
        setAdminModal(null);

        // Perform the action in the background
        apiService.performAdminAction(action, params)
            .then((res) => {
                // Phải kiểm tra status vì hàm postApi trả về kết quả mọc (kèm catch bên trong)
                if (res && res.status !== 'SUCCESS') {
                    throw new Error(res.message || "Thao tác thất bại.");
                }
                showToast('Thành công!', successMessage, 'success');
                if (refetchType === 'history' || refetchType === 'both') {
                    refetchHistory(true);
                    refetchXuathoadon(true);
                }
                if (refetchType === 'stock' || refetchType === 'both') {
                    refetchStock(true);
                }
                if (refetchType === 'admin') {
                    refetchAdminData(true);
                }
            })
            .catch((error) => {
                const message = error instanceof Error ? error.message : "Đã xảy ra lỗi.";
                showToast('Thao tác thất bại', message, 'error');
            });

        return true;
    }, [showToast, refetchHistory, refetchXuathoadon, refetchStock, refetchAdminData]);

    const handleArchiveSubmit = useCallback(() => handleBackgroundAdminSubmit('archiveInvoicedOrdersMonthly', {}, 'Đã lưu trữ hóa đơn thành công.', 'history'), [handleBackgroundAdminSubmit]);
    const handleAddCarSubmit = useCallback((data: Record<string, string>) => handleBackgroundAdminSubmit('findAndAddCarByVin', { vin: data.vin }, 'Thêm xe thành công.', 'stock'), [handleBackgroundAdminSubmit]);
    const handleDeleteCarSubmit = useCallback((data: Record<string, string>) => handleBackgroundAdminSubmit('deleteCarFromStockLogic', data, 'Đã xóa xe thành công.', 'stock'), [handleBackgroundAdminSubmit]);
    const handleRestoreCarSubmit = useCallback((data: Record<string, string>) => handleBackgroundAdminSubmit('restoreCarToStockLogic', data, 'Đã phục hồi xe thành công.', 'stock'), [handleBackgroundAdminSubmit]);
    const handleBulkAddCarSubmit = useCallback((data: Record<string, string>) => handleBackgroundAdminSubmit('bulkAddCarsByVin', { vins: data.vins }, 'Đã xử lý thêm xe hàng loạt.', 'stock'), [handleBackgroundAdminSubmit]);
    const handleBulkAddCarDetailedSubmit = useCallback((carData: any[]) => handleBackgroundAdminSubmit('bulkAddCarsDetailed', { carData: JSON.stringify(carData) }, 'Đã xử lý nhập xe hàng loạt từ Excel.', 'stock'), [handleBackgroundAdminSubmit]);
    const handleAddUserSubmit = useCallback(async (data: Record<string, string>) => {
//         showToast('Đang xử lý...', `Đang tạo tài khoản cho ${data.fullName}...`, 'loading');
        try {
            // Revert to GAS-first for user creation because GAS handles:
            // 1. Username generation
            // 2. Password generation & hashing
            // 3. Email sending
            // 4. Supabase sync
            const res = await apiService.performAdminAction('addUser', data);
            
            if (res.status === 'ERROR') {
                throw new Error(res.message || "Không thể tạo tài khoản.");
            }

            showToast('Thành công!', `Đã gửi yêu cầu tạo tài khoản cho ${data.fullName}.`, 'success');
            refetchAdminData(true);
            setAdminModal(null);
            return true;
        } catch (error: any) {
            console.error("Add User Error:", error);
            showToast('Thao tác thất bại', error.message || "Không thể tạo tài khoản.", 'error');
            return false;
        }
    }, [showToast, refetchAdminData]);
    const handleDeleteOrderSubmit = useCallback((data: Record<string, string>) => handleBackgroundAdminSubmit('deleteOrderLogic', data, 'Đã xóa đơn hàng thành công.', 'history'), [handleBackgroundAdminSubmit]);
    const handleRevertOrderSubmit = useCallback((data: Record<string, string>) => handleBackgroundAdminSubmit('revertOrderStatus', data, 'Đã hoàn tác trạng thái đơn hàng.', 'history'), [handleBackgroundAdminSubmit]);
    const handleAdvanceOrderSubmit = useCallback((data: Record<string, string>) => handleBackgroundAdminSubmit('advanceOrderStatus', data, 'Đã tiến tới trạng thái đơn hàng.', 'history'), [handleBackgroundAdminSubmit]);

    const handleBulkApproveSubmit = useCallback(() => handleBulkActionSubmit('approve'), [handleBulkActionSubmit]);
    const handleBulkPendingSignatureSubmit = useCallback((data?: Record<string, any>) => handleBulkActionSubmit('pendingSignature', data), [handleBulkActionSubmit]);
    const handleBulkCancelSubmit = useCallback((data: Record<string, any>) => handleBulkActionSubmit('cancel', { reason: data.reason }), [handleBulkActionSubmit]);
    const handleBulkSupplementSubmit = useCallback((reason: string, images: string[]) => handleBulkActionSubmit('supplement', { reason, pastedImagesBase64: JSON.stringify(images) }), [handleBulkActionSubmit]);

    return {
        invoiceModalState, setInvoiceModalState,
        bulkActionModal, setBulkActionModal,
        suggestionModalState, setSuggestionModalState,
        adminModal, setAdminModal,
        editingOrder, setEditingOrder,
        isBulkUploadModalOpen, setIsBulkUploadModalOpen,
        editingTeam, setEditingTeam,
        isAddingNewTeam, setIsAddingNewTeam,
        handleAdminSubmit,
        handleEditSuccess,
        handleEditInvoiceDetails,
        handleBulkActionSubmit,
        handleAction,
        handleDownloadAllVcImages,
        handleConfirmSuggestion,
        handleSaveTeam,
        handleDeleteTeam,
        handleCloseAdminModal,
        handleCloseBulkActionModal,
        handleArchiveSubmit,
        handleAddCarSubmit,
        handleDeleteCarSubmit,
        handleRestoreCarSubmit,
        handleBulkAddCarSubmit,
        handleBulkAddCarDetailedSubmit,
        handleAddUserSubmit,
        handleDeleteOrderSubmit,
        handleRevertOrderSubmit,
        handleAdvanceOrderSubmit,
        handleBulkApproveSubmit,
        handleBulkPendingSignatureSubmit,
        handleBulkCancelSubmit,
        handleBulkSupplementSubmit,
        processingId,
        processingActionType: processingState?.type || null
    };
};
