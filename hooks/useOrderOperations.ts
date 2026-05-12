import { useState, useCallback } from 'react';
import { Order, StockVehicle } from '../types';
import * as apiService from '../services/apiService';

interface ImageSource {
    src: string;
    originalUrl?: string;
    label: string;
}

interface UseOrderOperationsProps {
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    hideToast: () => void;
    refetchHistory: any;
    refetchStock: any;
    setAllHistoryData: any;
    isReferenceAccount?: boolean;
}

export const useOrderOperations = ({ showToast, hideToast, refetchHistory, refetchStock, setAllHistoryData, isReferenceAccount }: UseOrderOperationsProps) => {
    // --- STATE ---
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
    const [orderToRequestInvoice, setOrderToRequestInvoice] = useState<Order | null>(null);
    const [orderToSupplement, setOrderToSupplement] = useState<Order | null>(null);
    const [orderToEdit, setOrderToEdit] = useState<Order | null>(null);
    const [orderToRequestVC, setOrderToRequestVC] = useState<Order | null>(null);
    const [orderToConfirmVC, setOrderToConfirmVC] = useState<Order | null>(null);
    const [orderToSuperEdit, setOrderToSuperEdit] = useState<Order | null>(null);
    const [createRequestData, setCreateRequestData] = useState<{ isOpen: boolean; initialVehicle?: StockVehicle }>({ isOpen: false });
    const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
    const [imagePreview, setImagePreview] = useState<{ images: ImageSource[], startIndex: number, customerName: string } | null>(null);
    const [filePreview, setFilePreview] = useState<{ url: string, label: string } | null>(null);
    const [isPendingStatsModalOpen, setIsPendingStatsModalOpen] = useState(false);
    const [extensionVehicle, setExtensionVehicle] = useState<StockVehicle | null>(null);

    const [processingOrder, setProcessingOrder] = useState<string | null>(null);
    const [processingVin, setProcessingVin] = useState<string | null>(null);

    // --- HANDLERS ---
    const checkReference = useCallback(() => {
        if (isReferenceAccount) {
            showToast('Thông báo', 'Đây là <b>Tài khoản tham khảo</b>. Bạn chỉ có quyền xem dữ liệu chứ không thể thực hiện hành động này.', 'info');
            return true;
        }
        return false;
    }, [isReferenceAccount, showToast]);

    const handleHoldCar = async (vin: string) => {
        if (checkReference()) return;
        setProcessingVin(vin);
//         showToast('Đang xử lý...', `Đang giữ xe VIN ${vin}.`, 'loading'); 
        try {
            const res = await apiService.holdCar(vin);
            if (res && res.status === 'ERROR') {
                showToast('Giữ Xe Thất Bại', res.message || 'Không thể giữ xe.', 'error', 5000);
            } else {
                showToast('Giữ Xe Thành Công', `Đã giữ xe ${vin}.`, 'success', 3000);
                refetchStock(true);
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Không thể giữ xe.';
            showToast('Giữ Xe Thất Bại', message, 'error', 5000);
        } finally {
            setProcessingVin(null);
        }
    };

    const handleReleaseCar = async (vin: string, outcome: 'released' | 'expired' | 'matched' = 'released') => {
        if (checkReference()) return;
        setProcessingVin(vin);
        const actionText = outcome === 'matched' ? 'đã ghép' : 'hủy giữ';
//         showToast('Đang xử lý...', `Đang ${actionText} xe VIN ${vin}.`, 'loading'); 
        try {
            await apiService.releaseCar(vin, outcome);
            showToast('Thành Công', `Đã ${actionText} xe ${vin}.`, 'success', 3000);
            refetchStock(true);
        } catch (err) {
            const message = err instanceof Error ? err.message : `Không thể ${actionText} xe.`;
            showToast('Lỗi', message, 'error', 5000);
        } finally {
            setProcessingVin(null);
        }
    };

    const handleJoinQueue = async (vin: string) => {
        if (checkReference()) return;
        setProcessingVin(vin);
//         showToast('Đang xử lý...', 'Đang đăng ký hàng chờ...', 'loading');
        try {
            const res = await apiService.joinHoldQueue(vin);
            if (res.status === 'SUCCESS') {
                showToast('Thành Công', res.message, 'success', 3000);
            } else {
                showToast('Lỗi', res.message, 'error', 3000);
            }
        } catch (err) {
            showToast('Lỗi', 'Không thể gia nhập hàng chờ.', 'error', 3000);
        } finally {
            setProcessingVin(null);
            refetchStock(true);
        }
    };

    const handleLeaveQueue = async (vin: string) => {
        if (checkReference()) return;
        setProcessingVin(vin);
//         showToast('Đang xử lý...', 'Đang hủy hàng chờ...', 'loading');
        try {
            const res = await apiService.leaveHoldQueue(vin);
            if (res.status === 'SUCCESS') {
                showToast('Thành Công', res.message, 'success', 3000);
            } else {
                showToast('Lỗi', res.message, 'error', 3000);
            }
        } catch (err) {
            showToast('Lỗi', 'Không thể hủy hàng chờ.', 'error', 3000);
        } finally {
            setProcessingVin(null);
            refetchStock(true);
        }
    };

    const handleRequestExtension = async (vin: string, file: File, reason: string) => {
        if (checkReference()) return;
        setProcessingVin(vin);
//         showToast('Đang xử lý...', 'Đang tải file minh chứng...', 'loading');
        try {
            const uploadRes = await apiService.uploadHoldEvidence(vin, file);
            if (uploadRes.status === 'ERROR') throw new Error(uploadRes.message);

            const res = await apiService.requestHoldExtension(vin, uploadRes.url!, reason);
            if (res.status === 'SUCCESS') {
                showToast('Thành Công', 'Đã gửi yêu cầu gia hạn. Chờ Admin duyệt.', 'success', 3000);
            } else {
                showToast('Lỗi', res.message, 'error', 3000);
            }
        } catch (err: any) {
            showToast('Lỗi', err.message || 'Không thể yêu cầu gia hạn.', 'error', 3000);
        } finally {
            setProcessingVin(null);
            refetchStock(true);
        }
    };

    const handleViewDetails = useCallback((order: Order) => setSelectedOrder(order), []);

    const handleCancelOrder = async (order: Order, reason: string, unmatchType: string = 'Hủy luôn đơn hàng (Hủy đơn)', thoiGianCanXe?: string) => {
        if (checkReference()) return;
        setProcessingOrder(order["Số đơn hàng"]);
//         showToast('Đang Hủy Yêu Cầu', `Hủy yêu cầu cho đơn hàng ${order["Số đơn hàng"]}.`, 'loading'); 
        try {
            await apiService.cancelRequest(order["Số đơn hàng"], reason, unmatchType, thoiGianCanXe);
            await refetchHistory();
            showToast('Thành Công', unmatchType.includes('Chờ xe') ? 'Đã hủy ghép và đưa vào danh sách chờ xe.' : 'Đã hủy yêu cầu thành công.', 'success', 3000);
            setSelectedOrder(null);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Lỗi không xác định";
            showToast('Hủy Thất Bại', message, 'error', 5000);
        } finally {
            setOrderToCancel(null);
            setProcessingOrder(null);
        }
    };

    const handleRequestInvoice = async (
        order: Order, contractFile: File, proposalFile: File, policy: string[], commission: string, vpoint: string, 
        aiNote?: string, _preProcessedPayloads?: { contract: any, proposal: any },
        xeXangVin?: string, xeXangHang?: string, xeXangModel?: string
    ) => {
        if (checkReference()) return;
        setProcessingOrder(order["Số đơn hàng"]);
        // Modal will handle the loading UI

        try {
            await apiService.requestInvoice(
                order["Số đơn hàng"],
                contractFile,
                proposalFile,
                policy.join('; '),
                commission,
                vpoint,
                {
                    ten_khach_hang: order["Tên khách hàng"],
                    tvbh: order["Tên tư vấn bán hàng"],
                    vin: order["VIN"],
                    dong_xe: order["Dòng xe"],
                    phien_ban: order["Phiên bản"],
                    ngoai_that: order["Ngoại thất"],
                    noi_that: order["Nội thất"],
                    ngay_coc: order["Ngày cọc"] ? new Date(order["Ngày cọc"]).toISOString() : undefined,
                },
                aiNote,
                xeXangVin,
                xeXangHang,
                xeXangModel,
                _preProcessedPayloads
            );
            await refetchHistory();
            hideToast();
            showToast('Gửi Thành Công', 'Đã gửi yêu cầu xuất hóa đơn.', 'success', 3000);
            return true;
        } catch (error) {
            hideToast();
            const message = error instanceof Error ? error.message : "Lỗi không xác định";
            showToast('Gửi Thất Bại', message, 'error', 5000);
            // Do NOT close modal on error so user can retry
        } finally {
            setProcessingOrder(null);
        }
    };


    const handleSupplementFiles = async (order: Order, contractFile: File | null, proposalFile: File | null, aiNote?: string) => {
        if (checkReference()) return;
        setProcessingOrder(order["Số đơn hàng"]);
        try {
            await apiService.uploadSupplementaryFiles(order["Số đơn hàng"], contractFile, proposalFile, aiNote);
            await refetchHistory();
            showToast('Bổ Sung Thành Công', 'Đã bổ sung hồ sơ thành công.', 'success', 3000);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Lỗi không xác định";
            showToast('Bổ Sung Thất Bại', message, 'error', 5000);
        } finally {
            setOrderToSupplement(null);
            setProcessingOrder(null);
        }
    };

    const handleEditSuccess = (message?: string, updatedOrder?: Order) => {
        setOrderToEdit(null);
        hideToast();
        showToast('Cập nhật thành công!', message || 'Thông tin đơn hàng đã được cập nhật.', 'success', 3000);
        
        if (updatedOrder) {
            setSelectedOrder(updatedOrder);
            setAllHistoryData((current: Order[]) => 
                current.map(o => o['Số đơn hàng'] === updatedOrder['Số đơn hàng'] ? { ...o, ...updatedOrder } : o)
            );
        }

        refetchHistory(true);
        refetchStock(true);
    };

    const handleSuperEditSuccess = (message: string) => {
        setOrderToSuperEdit(null);
        hideToast();
        showToast('Siêu đồng bộ thành công!', message, 'success', 3000);
        refetchHistory(true);
        refetchStock(true);
    };
    
    const handleSelectPolicy = async (order: Order, policy: string) => {
        if (checkReference()) return;
        setProcessingOrder(order["Số đơn hàng"]);
        try {
            const res = await apiService.updateOrderPolicy(order["Số đơn hàng"], policy);
            if (res.status === 'SUCCESS') {
                showToast('Thành Công', `Đã chọn chính sách: ${policy}`, 'success', 3000);
                
                // Cập nhật state cục bộ để UI phản hồi ngay lập tức
                setAllHistoryData((prev: Order[]) => 
                    prev.map(o => o["Số đơn hàng"] === order["Số đơn hàng"] ? { ...o, "CHÍNH SÁCH": policy } : o)
                );
                
                // Nếu đơn hàng đang được chọn trong modal, cập nhật nó luôn
                if (selectedOrder && selectedOrder["Số đơn hàng"] === order["Số đơn hàng"]) {
                    setSelectedOrder({ ...selectedOrder, "CHÍNH SÁCH": policy });
                }
            } else {
                showToast('Lỗi', res.message, 'error', 3000);
            }
        } catch (error: any) {
            showToast('Lỗi', error.message || 'Không thể cập nhật chính sách.', 'error', 3000);
        } finally {
            setProcessingOrder(null);
        }
    };

    const handleConfirmRequestVC = async (payload: any, vin?: string): Promise<boolean> => {
        if (!orderToRequestVC) return false;
        if (checkReference()) return false;
        setProcessingOrder(orderToRequestVC["Số đơn hàng"]);

        try {
            const serverPayload = {
                orderNumber: payload.orderNumber,
                customerType: payload.customerType,
                dmsCode: payload.dmsCode,
                files: payload.files,
                vin: vin,
            };

            const result = await apiService.requestVinClub(serverPayload);

            hideToast();
            showToast('Thành Công', result.message || 'Yêu cầu VinClub đã được gửi.', 'success');

            if (result.updatedOrder) {
                const updatedOrder = result.updatedOrder;
                
                // 1. Update memory (State)
                setAllHistoryData((currentOrders: Order[]) =>
                    currentOrders.map((order: Order) =>
                        order['Số đơn hàng'] === updatedOrder['Số đơn hàng']
                            ? { ...order, ...updatedOrder }
                            : order
                    )
                );

                // 2. Update session cache (Persistence within login session)
                try {
                    const archivesRaw = sessionStorage.getItem('archivedOrdersData');
                    if (archivesRaw) {
                        const parsedArchives: Order[] = JSON.parse(archivesRaw);
                        const updatedArchives = parsedArchives.map(o => 
                            o['Số đơn hàng'] === updatedOrder['Số đơn hàng'] ? { ...o, ...updatedOrder } : o
                        );
                        sessionStorage.setItem('archivedOrdersData', JSON.stringify(updatedArchives));
                    }
                } catch (e) {
                    console.error("Failed to sync cache during VC request:", e);
                }
            } else {
                refetchHistory(true); 
            }

            setOrderToRequestVC(null);
            return true;
        } catch (error) {
            hideToast();
            const message = error instanceof Error ? error.message : "Lỗi không xác định.";
            showToast('Yêu Cầu Thất Bại', message, 'error');
            return false;
        } finally {
            setProcessingOrder(null);
        }
    };

    const handleConfirmVC = async (): Promise<boolean> => {
        if (!orderToConfirmVC) return false;
        if (checkReference()) return false;
        const orderId = orderToConfirmVC["Số đơn hàng"];
        setProcessingOrder(orderId);
        try {
            await apiService.performAdminAction('confirmVcUnc', { orderNumber: orderId });
            
            // Optimistically update memory and cache
            const updateObj = { 'Trạng thái VC': 'Đã có VC' };
            setAllHistoryData((currentOrders: Order[]) =>
                currentOrders.map((order: Order) =>
                    order['Số đơn hàng'] === orderId ? { ...order, ...updateObj } : order
                )
            );

            // Sync with session cache
            try {
                const archivesRaw = sessionStorage.getItem('archivedOrdersData');
                if (archivesRaw) {
                    const parsedArchives: Order[] = JSON.parse(archivesRaw);
                    const updatedArchives = parsedArchives.map(o => 
                        o['Số đơn hàng'] === orderId ? { ...o, ...updateObj } : o
                    );
                    sessionStorage.setItem('archivedOrdersData', JSON.stringify(updatedArchives));
                }
            } catch (e) {
                console.error("Failed to sync cache during VC confirm:", e);
            }

            await refetchHistory(true); 
            hideToast();
            showToast('Thành Công', 'Đã xác thực UNC cho VinClub.', 'success');
            setOrderToConfirmVC(null);
            return true;
        } catch (error) {
            hideToast();
            const message = String(error instanceof Error ? error.message : "Lỗi không xác định");
            showToast('Xác Thực VC Thất Bại', message, 'error');
            return false;
        } finally {
            setProcessingOrder(null);
        }
    };

    const handleCreateRequestForVehicle = useCallback((vehicle: StockVehicle) => {
        setCreateRequestData({ isOpen: true, initialVehicle: vehicle });
    }, []);

    const handleCreateRequestClose = useCallback(() => {
        setCreateRequestData({ isOpen: false });
    }, []);

    const handleFormSuccess = useCallback((newOrder: Order) => {
        if (checkReference()) return;
        setCreateRequestData({ isOpen: false });
        setAllHistoryData((prev: Order[]) => [newOrder, ...prev].sort((a, b) => new Date(b['Thời gian nhập']).getTime() - new Date(a['Thời gian nhập']).getTime()));
        showToast('Yêu Cầu Đã Gửi', 'Yêu cầu ghép xe của bạn đã được ghi nhận thành công.', 'success', 4000);
        refetchStock(true);
        setTimeout(() => { setSelectedOrder(newOrder); }, 500);
    }, [setAllHistoryData, showToast, refetchStock, checkReference]);

    const openImagePreviewModal = useCallback((images: ImageSource[], startIndex: number = 0, customerName: string) => {
        setImagePreview({ images, startIndex, customerName });
    }, []);

    const openFilePreviewModal = useCallback((url: string, label: string) => {
        setFilePreview({ url, label });
    }, []);

    return {
        selectedOrder, setSelectedOrder,
        orderToCancel, setOrderToCancel,
        orderToRequestInvoice, setOrderToRequestInvoice,
        orderToSupplement, setOrderToSupplement,
        orderToEdit, setOrderToEdit,
        orderToRequestVC, setOrderToRequestVC,
        orderToConfirmVC, setOrderToConfirmVC,
        orderToSuperEdit, setOrderToSuperEdit,
        createRequestData, setCreateRequestData,
        isChangePasswordModalOpen, setIsChangePasswordModalOpen,
        imagePreview, setImagePreview,
        filePreview, setFilePreview,
        isPendingStatsModalOpen, setIsPendingStatsModalOpen,
        extensionVehicle, setExtensionVehicle,
        processingOrder,
        processingVin,

        handleHoldCar,
        handleReleaseCar,
        handleViewDetails,
        handleCancelOrder,
        handleRequestInvoice,
        handleSupplementFiles,
        handleEditSuccess,
        handleSuperEditSuccess,
        handleConfirmRequestVC,
        handleConfirmVC,
        handleJoinQueue,
        handleLeaveQueue,
        handleRequestExtension,
        handleCreateRequestForVehicle,
        handleCreateRequestClose,
        handleFormSuccess,
        openImagePreviewModal,
        openFilePreviewModal,
        handleSelectPolicy
    };
};
