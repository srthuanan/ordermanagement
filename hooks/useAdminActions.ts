import { useState, useCallback } from 'react';
import { Order, VcRequest, ActionType, StockVehicle } from '../types';
import * as apiService from '../services/apiService';

interface UseAdminActionsProps {
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    hideToast: () => void;
    refetchHistory: (isSilent?: boolean) => void;
    refetchStock: (isSilent?: boolean) => void;
    refetchXuathoadon: (isSilent?: boolean) => void;
    refetchAdminData: (isSilent?: boolean) => void;
    fetchVcData: (isSilent?: boolean) => void;
    teamData: Record<string, string[]>;
    allOrders: Order[];
    suggestionsMap: Map<string, StockVehicle[]>;
    selectedRows: Set<string>;
    setSelectedRows: (rows: Set<string>) => void;
    setShowMatchingModal: (show: boolean) => void;
}

export const useAdminActions = ({
    showToast, hideToast, refetchHistory, refetchStock, refetchXuathoadon, refetchAdminData, fetchVcData,
    teamData, allOrders, suggestionsMap, selectedRows, setSelectedRows, setShowMatchingModal
}: UseAdminActionsProps) => {
    const [invoiceModalState, setInvoiceModalState] = useState<{ type: ActionType; order: Order | VcRequest } | null>(null);
    const [bulkActionModal, setBulkActionModal] = useState<{ type: ActionType } | null>(null);
    const [suggestionModalState, setSuggestionModalState] = useState<{ order: Order; cars: StockVehicle[] } | null>(null);
    const [adminModal, setAdminModal] = useState<'archive' | 'addCar' | 'deleteCar' | 'restoreCar' | 'deleteOrder' | 'revertOrder' | 'timeline' | 'addUser' | null>(null);
    const [editingOrder, setEditingOrder] = useState<Order | null>(null);
    const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
    const [editingTeam, setEditingTeam] = useState<{ leader: string; members: string[] } | null>(null);
    const [isAddingNewTeam, setIsAddingNewTeam] = useState(false);

    const handleAdminSubmit = useCallback(async (
        action: string,
        params: Record<string, any>,
        successMessage: string,
        refetchType: 'history' | 'stock' | 'both' | 'admin' | 'none' = 'history'
    ) => {
        showToast('Đang xử lý...', 'Vui lòng chờ trong giây lát.', 'loading');
        try {
            const result = await apiService.performAdminAction(action, params);
            setInvoiceModalState(null);
            setAdminModal(null);
            setSuggestionModalState(null);
            setSelectedRows(new Set());
            setBulkActionModal(null);
            setShowMatchingModal(false);

            hideToast();
            showToast('Thành công!', result.message || successMessage, 'success');

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
            hideToast();
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

    const handleEditInvoiceDetails = useCallback(async (orderNumber: string, data: { engineNumber: string; policy: string; po: string }) => {
        return handleAdminSubmit('updateRowData', {
            sheetName: 'Xuathoadon',
            primaryKeyColumn: 'SỐ ĐƠN HÀNG',
            primaryKeyValue: orderNumber,
            "SỐ ĐỘNG CƠ": data.engineNumber,
            "CHÍNH SÁCH": data.policy,
            "PO PIN": data.po
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

    const handleAction = (type: ActionType, order: Order | VcRequest, data?: any) => {
        if (type === 'manualMatch') {
            const suggestedCars = suggestionsMap.get(order['Số đơn hàng']) || [];
            setSuggestionModalState({ order: order as Order, cars: suggestedCars });
        } else if (type === 'pair' && data?.vin) {
            // Direct pair action from Matching Cockpit - No confirmation needed as per user request
            handleConfirmSuggestion(order['Số đơn hàng'], data.vin);
        } else if (type === 'requestInvoice') {
            const orderToRequest = allOrders.find(o => o['Số đơn hàng'] === order['Số đơn hàng']);
            if (orderToRequest) {
                showToast('Chức năng đang phát triển', 'Yêu cầu xuất hóa đơn từ Admin Panel sẽ sớm được cập nhật.', 'info');
            }
        } else if (type === 'approve') {
            handleAdminSubmit(
                'approveSelectedInvoiceRequest',
                { orderNumbers: JSON.stringify([order['Số đơn hàng']]) },
                'Đã phê duyệt yêu cầu.'
            );
        } else if (type === 'pendingSignature') {
            handleAdminSubmit(
                'markAsPendingSignature',
                { orderNumbers: JSON.stringify([order['Số đơn hàng']]) },
                'Đã chuyển trạng thái.'
            );
        } else if (type === 'uploadInvoice' && data?.file) {
            const file = data.file as File;
            const fileToBase64 = (f: File): Promise<string> => new Promise((res, rej) => { const r = new FileReader(); r.readAsDataURL(f); r.onload = () => res((r.result as string).split(',')[1]); r.onerror = e => rej(e); });

            fileToBase64(file).then(base64Data => {
                handleAdminSubmit(
                    'handleBulkUploadIssuedInvoices',
                    { filesData: JSON.stringify([{ orderNumber: order['Số đơn hàng'], base64Data, mimeType: file.type, fileName: file.name }]) },
                    'Đã tải lên hóa đơn thành công.'
                );
            }).catch(err => {
                showToast('Lỗi', 'Không thể đọc file.', 'error');
            });
        } else if (type === 'edit') {
            setEditingOrder(order as Order);
        } else {
            setInvoiceModalState({ type, order });
        }
    };

    const handleDownloadAllVcImages = async (request: VcRequest) => {
        showToast('Đang chuẩn bị...', `Đang chuẩn bị các tệp để tải xuống cho KH: ${request['Tên khách hàng']}.`, 'loading');

        const toDownloadableDriveUrl = (url: string): string | null => {
            if (!url || !url.includes('drive.google.com')) return url;
            const idMatch = url.match(/id=([a-zA-Z0-9_-]{25,})/) || url.match(/\/d\/([a-zA-Z0-9_-]{25,})/);
            if (idMatch && idMatch[1]) {
                return `https://drive.google.com/uc?export=download&id=${idMatch[1]}`;
            }
            return url;
        };

        let fileUrls: Record<string, string> = {};
        try {
            if (request.FileUrls) fileUrls = JSON.parse(request.FileUrls);
            else if (request['URL hình ảnh']) fileUrls = { unc: request['URL hình ảnh'] };
        } catch (e) {
            hideToast();
            showToast('Lỗi', 'Không thể đọc danh sách tệp.', 'error');
            return;
        }

        const downloads = Object.entries(fileUrls);
        if (downloads.length === 0) {
            hideToast();
            showToast('Không có tệp', 'Không tìm thấy tệp nào để tải xuống.', 'info');
            return;
        }

        for (let i = 0; i < downloads.length; i++) {
            const [, url] = downloads[i];
            const downloadableUrl = toDownloadableDriveUrl(url);

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

        hideToast();
        showToast('Hoàn tất', `Đã bắt đầu tải xuống ${downloads.length} tệp.`, 'success');
    };

    const handleConfirmSuggestion = async (orderNumber: string, vin: string) => {
        await handleAdminSubmit('manualMatchCar', { orderNumber, vin }, `Đã ghép thành công ĐH ${orderNumber}.`, 'both');
    };

    const handleSaveTeam = async (newTeamData: Record<string, string[]>) => {
        await handleAdminSubmit('updateTeams', { teams: JSON.stringify(newTeamData) }, 'Cập nhật phòng ban thành công.', 'admin');
        setEditingTeam(null);
        setIsAddingNewTeam(false);
    };

    const handleDeleteTeam = async (leader: string) => {
        const confirmed = window.confirm(`Bạn có chắc chắn muốn giải tán phòng của "${leader}"? Các thành viên sẽ không bị xóa khỏi hệ thống.`);
        if (confirmed) {
            const newTeamData = { ...teamData };
            delete newTeamData[leader];
            await handleSaveTeam(newTeamData);
        }
    };

    const handleCloseAdminModal = useCallback(() => setAdminModal(null), []);
    const handleCloseBulkActionModal = useCallback(() => setBulkActionModal(null), []);

    const handleArchiveSubmit = useCallback(() => handleAdminSubmit('archiveInvoicedOrdersMonthly', {}, 'Đã lưu trữ hóa đơn thành công.', 'history'), [handleAdminSubmit]);
    const handleAddCarSubmit = useCallback((data: Record<string, string>) => handleAdminSubmit('findAndAddCarByVin', { vin: data.vin }, 'Thêm xe thành công.', 'stock'), [handleAdminSubmit]);
    const handleDeleteCarSubmit = useCallback((data: Record<string, string>) => handleAdminSubmit('deleteCarFromStockLogic', data, 'Đã xóa xe thành công.', 'stock'), [handleAdminSubmit]);
    const handleRestoreCarSubmit = useCallback((data: Record<string, string>) => handleAdminSubmit('restoreCarToStockLogic', data, 'Đã phục hồi xe thành công.', 'stock'), [handleAdminSubmit]);
    const handleAddUserSubmit = useCallback((data: Record<string, string>) => handleAdminSubmit('addUser', data, `Đã tạo tài khoản cho ${data.fullName} và gửi email.`, 'admin'), [handleAdminSubmit]);
    const handleDeleteOrderSubmit = useCallback((data: Record<string, string>) => handleAdminSubmit('deleteOrderLogic', data, 'Đã xóa đơn hàng thành công.', 'history'), [handleAdminSubmit]);
    const handleRevertOrderSubmit = useCallback((data: Record<string, string>) => handleAdminSubmit('revertOrderStatus', data, 'Đã hoàn tác trạng thái đơn hàng.', 'history'), [handleAdminSubmit]);

    const handleBulkApproveSubmit = useCallback(() => handleBulkActionSubmit('approve'), [handleBulkActionSubmit]);
    const handleBulkPendingSignatureSubmit = useCallback(() => handleBulkActionSubmit('pendingSignature'), [handleBulkActionSubmit]);
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
        handleAddUserSubmit,
        handleDeleteOrderSubmit,
        handleRevertOrderSubmit,
        handleBulkApproveSubmit,
        handleBulkPendingSignatureSubmit,
        handleBulkCancelSubmit,
        handleBulkSupplementSubmit
    };
};
