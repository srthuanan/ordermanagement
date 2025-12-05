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
    refetchHistory: (isSilent?: boolean) => Promise<void>;
    refetchStock: (isSilent?: boolean) => Promise<void>;
    setAllHistoryData: React.Dispatch<React.SetStateAction<Order[]>>;
}

export const useOrderOperations = ({ showToast, hideToast, refetchHistory, refetchStock, setAllHistoryData }: UseOrderOperationsProps) => {
    // --- STATE ---
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
    const [orderToRequestInvoice, setOrderToRequestInvoice] = useState<Order | null>(null);
    const [orderToSupplement, setOrderToSupplement] = useState<Order | null>(null);
    const [orderToEdit, setOrderToEdit] = useState<Order | null>(null);
    const [orderToRequestVC, setOrderToRequestVC] = useState<Order | null>(null);
    const [orderToConfirmVC, setOrderToConfirmVC] = useState<Order | null>(null);
    const [createRequestData, setCreateRequestData] = useState<{ isOpen: boolean; initialVehicle?: StockVehicle }>({ isOpen: false });
    const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
    const [imagePreview, setImagePreview] = useState<{ images: ImageSource[], startIndex: number, customerName: string } | null>(null);
    const [filePreview, setFilePreview] = useState<{ url: string, label: string } | null>(null);
    const [isPendingStatsModalOpen, setIsPendingStatsModalOpen] = useState(false);

    const [processingOrder, setProcessingOrder] = useState<string | null>(null);
    const [processingVin, setProcessingVin] = useState<string | null>(null);

    // --- HANDLERS ---

    const handleHoldCar = async (vin: string) => {
        setProcessingVin(vin);
        showToast('Đang xử lý...', `Đang giữ xe VIN ${vin}.`, 'loading');
        try {
            const result = await apiService.holdCar(vin);
            hideToast();
            showToast('Giữ Xe Thành Công', result.message, 'success', 3000);
            refetchStock(true);
        } catch (err) {
            hideToast();
            const message = err instanceof Error ? err.message : 'Không thể giữ xe.';
            showToast('Giữ Xe Thất Bại', message, 'error', 5000);
        } finally {
            setProcessingVin(null);
        }
    };

    const handleReleaseCar = async (vin: string) => {
        setProcessingVin(vin);
        showToast('Đang xử lý...', `Đang hủy giữ xe VIN ${vin}.`, 'loading');
        try {
            const result = await apiService.releaseCar(vin);
            hideToast();
            showToast('Hủy Giữ Thành Công', result.message, 'info', 3000);
            refetchStock(true);
        } catch (err) {
            hideToast();
            const message = err instanceof Error ? err.message : 'Không thể hủy giữ xe.';
            showToast('Hủy Giữ Thất Bại', message, 'error', 5000);
        } finally {
            setProcessingVin(null);
        }
    };

    const handleViewDetails = (order: Order) => setSelectedOrder(order);

    const handleCancelOrder = async (order: Order, reason: string) => {
        setProcessingOrder(order["Số đơn hàng"]);
        showToast('Đang Hủy Yêu Cầu', `Hủy yêu cầu cho đơn hàng ${order["Số đơn hàng"]}.`, 'loading');
        try {
            const result = await apiService.cancelRequest(order["Số đơn hàng"], reason);
            await refetchHistory();
            hideToast();
            showToast('Hủy Thành Công', result.message, 'success', 3000);
        } catch (error) {
            hideToast();
            const message = error instanceof Error ? error.message : "Lỗi không xác định";
            showToast('Hủy Thất Bại', message, 'error', 5000);
        } finally {
            setOrderToCancel(null);
            setProcessingOrder(null);
        }
    };

    const handleRequestInvoice = async (order: Order, contractFile: File, proposalFile: File, policy: string[], commission: string, vpoint: string) => {

        setProcessingOrder(order["Số đơn hàng"]);
        // Modal will handle the loading UI

        try {
            await apiService.requestInvoice(order["Số đơn hàng"], contractFile, proposalFile, policy.join(', '), commission, vpoint);
            await refetchHistory();
            hideToast();
            // showToast('Gửi Thành Công', result.message, 'success', 3000); // Removed as per user request
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


    const handleSupplementFiles = async (order: Order, contractFile: File | null, proposalFile: File | null) => {
        setProcessingOrder(order["Số đơn hàng"]);
        showToast('Đang Bổ Sung Chứng Từ', 'Hệ thống đang xử lý tệp của bạn.', 'loading');
        try {
            const result = await apiService.uploadSupplementaryFiles(order["Số đơn hàng"], contractFile, proposalFile);
            await refetchHistory();
            hideToast();
            showToast('Bổ Sung Thành Công', result.message, 'success', 3000);
        } catch (error) {
            hideToast();
            const message = error instanceof Error ? error.message : "Lỗi không xác định";
            showToast('Bổ Sung Thất Bại', message, 'error', 5000);
        } finally {
            setOrderToSupplement(null);
            setProcessingOrder(null);
        }
    };

    const handleEditSuccess = (message: string) => {
        setOrderToEdit(null);
        showToast('Cập nhật thành công!', message, 'success');
        refetchHistory(true);
        refetchStock(true);
    };

    const handleConfirmRequestVC = async (payload: any, vin?: string): Promise<boolean> => {
        if (!orderToRequestVC) return false;
        setProcessingOrder(orderToRequestVC["Số đơn hàng"]);
        showToast('Đang gửi YC VinClub', `Vui lòng chờ trong giây lát...`, 'loading');

        const fileToBase64 = (file: File) => {
            return new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve((reader.result as string).split(',')[1]); // Only data part
                reader.onerror = error => reject(error);
            });
        };

        try {
            const filesData = [];
            for (const key in payload.files) {
                if (payload.files[key]) {
                    const file = payload.files[key];
                    const base64 = await fileToBase64(file);
                    filesData.push({
                        key: key,
                        name: file.name,
                        type: file.type,
                        data: base64
                    });
                }
            }

            const serverPayload = {
                orderNumber: payload.orderNumber,
                customerType: payload.customerType,
                dmsCode: payload.dmsCode,
                filesData: JSON.stringify(filesData),
                vin: vin,
            };

            const result = await apiService.requestVinClub(serverPayload);

            hideToast();
            showToast('Thành Công', result.message || 'Yêu cầu VinClub đã được gửi.', 'success');

            if (result.updatedOrder) {
                setAllHistoryData(currentOrders =>
                    currentOrders.map(order =>
                        order['Số đơn hàng'] === result.updatedOrder['Số đơn hàng']
                            ? { ...order, ...result.updatedOrder }
                            : order
                    )
                );
            } else {
                refetchHistory(true); // Silent refetch
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
        setProcessingOrder(orderToConfirmVC["Số đơn hàng"]);
        showToast('Đang Xác Thực VC', 'Vui lòng chờ...', 'loading');
        try {
            await apiService.performAdminAction('confirmVcUnc', { orderNumber: orderToConfirmVC['Số đơn hàng'] });
            await refetchHistory();
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

    const handleCreateRequestForVehicle = (vehicle: StockVehicle) => {
        setCreateRequestData({ isOpen: true, initialVehicle: vehicle });
    };

    const handleCreateRequestClose = useCallback(() => {
        setCreateRequestData({ isOpen: false });
    }, []);

    const handleFormSuccess = useCallback((newOrder: Order) => {
        setCreateRequestData({ isOpen: false });
        setAllHistoryData(prev => [newOrder, ...prev].sort((a, b) => new Date(b['Thời gian nhập']).getTime() - new Date(a['Thời gian nhập']).getTime()));
        showToast('Yêu Cầu Đã Gửi', 'Yêu cầu ghép xe của bạn đã được ghi nhận thành công.', 'success', 4000);
        refetchStock(true);
        setTimeout(() => { setSelectedOrder(newOrder); }, 500);
    }, [setAllHistoryData, showToast, refetchStock]);

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
        createRequestData, setCreateRequestData,
        isChangePasswordModalOpen, setIsChangePasswordModalOpen,
        imagePreview, setImagePreview,
        filePreview, setFilePreview,
        isPendingStatsModalOpen, setIsPendingStatsModalOpen,
        processingOrder,
        processingVin,

        handleHoldCar,
        handleReleaseCar,
        handleViewDetails,
        handleCancelOrder,
        handleRequestInvoice,
        handleSupplementFiles,
        handleEditSuccess,
        handleConfirmRequestVC,
        handleConfirmVC,
        handleCreateRequestForVehicle,
        handleCreateRequestClose,
        handleFormSuccess,
        openImagePreviewModal,
        openFilePreviewModal
    };
};
