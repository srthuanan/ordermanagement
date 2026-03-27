import { useState, useCallback, useEffect } from 'react';
import { AdminSubView, Order } from '../types';

interface UseAdminFiltersProps {
    initialState: { targetTab?: AdminSubView; orderToShow?: Order; inquiryId?: string } | null;
    clearInitialState: () => void;
}

export const useAdminFilters = ({ initialState, clearInitialState }: UseAdminFiltersProps) => {
    const [adminView, setAdminView] = useState<AdminSubView>('invoices');
    const [matchingTab, setMatchingTab] = useState<'pending' | 'paired'>('pending');
    // Lưu số đơn hàng hoặc inquiry ID cần được select ngay khi navigate đến tab
    const [targetOrderId, setTargetOrderId] = useState<string | null>(null);
    const [targetInquiryId, setTargetInquiryId] = useState<string | null>(null);

    const [invoiceFilters, setInvoiceFilters] = useState<{ keyword: string, tvbh: string[], dongXe: string[], version: string[], exterior: string[], trangThai: string[], dateRange?: { start: string; end: string; } }>({ keyword: '', tvbh: [], dongXe: [], version: [], exterior: [], trangThai: [] });
    const [pendingFilters, setPendingFilters] = useState<{ keyword: string, tvbh: string[], dongXe: string[], version: string[], exterior: string[], dateRange?: { start: string; end: string; } }>({ keyword: '', tvbh: [], dongXe: [], version: [], exterior: [] });
    const [pairedFilters, setPairedFilters] = useState<{ keyword: string, tvbh: string[], dongXe: string[], version: string[], exterior: string[], dateRange?: { start: string; end: string; } }>({ keyword: '', tvbh: [], dongXe: [], version: [], exterior: [] });
    const [vcFilters, setVcFilters] = useState<{ keyword: string, nguoiyc: string[], trangthai: string[], dateRange?: { start: string; end: string; } }>({ keyword: '', nguoiyc: [], trangthai: [] });
    const [matchingFilters, setMatchingFilters] = useState<{ keyword: string, tvbh: string[], dongXe: string[], version: string[], ngoaiThat: string[], dateRange?: { start: string; end: string; } }>({ keyword: '', tvbh: [], dongXe: [], version: [], ngoaiThat: [] });

    useEffect(() => {
        if (initialState) {
            if (initialState.targetTab) {
                setAdminView(initialState.targetTab);
            }

            if (initialState.orderToShow) {
                const order = initialState.orderToShow;
                let targetTab = initialState.targetTab;
                if (!targetTab) {
                    const orderStatus = (order as any)['Trạng thái xử lý'] || order['Kết quả'] || 'N/A';
                    const s = orderStatus.toLowerCase();
                    if (s.includes('chưa')) {
                        targetTab = 'pending';
                    } else if (s === 'đã ghép') {
                        targetTab = 'paired';
                    } else {
                        targetTab = 'invoices';
                    }
                }
                setAdminView(targetTab as AdminSubView);

                // Reset tất cả filter
                setInvoiceFilters({ keyword: '', tvbh: [], dongXe: [], version: [], exterior: [], trangThai: [] });
                setPendingFilters({ keyword: '', tvbh: [], dongXe: [], version: [], exterior: [] });
                setPairedFilters({ keyword: '', tvbh: [], dongXe: [], version: [], exterior: [] });
                setVcFilters({ keyword: '', nguoiyc: [], trangthai: [] });
                setMatchingFilters({ keyword: '', tvbh: [], dongXe: [], version: [], ngoaiThat: [] });

                // Đặt targetOrderId để AdminView có thể select ngay lập tức
                const orderId = order['Số đơn hàng'];
                setTargetOrderId(orderId);

                if (targetTab === 'matching') {
                    setMatchingFilters(prev => ({ ...prev, keyword: orderId }));
                    // Nếu đơn đã ghép (có VIN), chuyển sang sub-tab "Đã Ghép"
                    setMatchingTab(order.VIN ? 'paired' : 'pending');
                } else if (targetTab === 'invoices') {
                    setInvoiceFilters(prev => ({ ...prev, keyword: orderId }));
                } else if (targetTab === 'vc') {
                    setVcFilters(prev => ({ ...prev, keyword: orderId }));
                } else if (targetTab === 'pending') {
                    setPendingFilters(prev => ({ ...prev, keyword: orderId }));
                } else if (targetTab === 'paired') {
                    setPairedFilters(prev => ({ ...prev, keyword: orderId }));
                }
            }

            if (initialState.inquiryId) {
                setAdminView('inquiries');
                setTargetInquiryId(initialState.inquiryId);
            }

            clearInitialState();
        }
    }, [initialState, clearInitialState]);

    const handleFilterChange = useCallback((newFilters: any) => {
        if (adminView === 'invoices') {
            setInvoiceFilters(prev => ({ ...prev, ...newFilters }));
        } else if (adminView === 'pending') {
            setPendingFilters(prev => ({ ...prev, ...newFilters }));
        } else if (adminView === 'paired') {
            setPairedFilters(prev => ({ ...prev, ...newFilters }));
        } else if (adminView === 'vc') {
            setVcFilters(prev => ({ ...prev, ...newFilters }));
        } else if (adminView === 'matching') {
            setMatchingFilters(prev => ({ ...prev, ...newFilters }));
        }
    }, [adminView]);

    const handleReset = useCallback(() => {
        if (adminView === 'invoices') {
            setInvoiceFilters({ keyword: '', tvbh: [], dongXe: [], version: [], exterior: [], trangThai: [] });
        } else if (adminView === 'pending') {
            setPendingFilters({ keyword: '', tvbh: [], dongXe: [], version: [], exterior: [] });
        } else if (adminView === 'paired') {
            setPairedFilters({ keyword: '', tvbh: [], dongXe: [], version: [], exterior: [] });
        } else if (adminView === 'vc') {
            setVcFilters({ keyword: '', nguoiyc: [], trangthai: [] });
        } else if (adminView === 'matching') {
            setMatchingFilters({ keyword: '', tvbh: [], dongXe: [], version: [], ngoaiThat: [] });
        }
    }, [adminView]);

    return {
        adminView,
        setAdminView,
        matchingTab,
        setMatchingTab,
        targetOrderId,
        setTargetOrderId,
        targetInquiryId,
        setTargetInquiryId,
        invoiceFilters,
        pendingFilters,
        pairedFilters,
        vcFilters,
        matchingFilters,
        handleFilterChange,
        handleReset,
        setInvoiceFilters,
        setPendingFilters,
        setPairedFilters,
        setVcFilters,
        setMatchingFilters
    };
};
