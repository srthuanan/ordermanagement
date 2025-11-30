import { useState, useCallback, useEffect } from 'react';
import { AdminSubView, Order } from '../types';

interface UseAdminFiltersProps {
    initialState: { targetTab?: AdminSubView; orderToShow?: Order } | null;
    clearInitialState: () => void;
}

export const useAdminFilters = ({ initialState, clearInitialState }: UseAdminFiltersProps) => {
    const [adminView, setAdminView] = useState<AdminSubView>('dashboard');

    const [invoiceFilters, setInvoiceFilters] = useState<{ keyword: string, tvbh: string[], dongXe: string[], trangThai: string[], dateRange?: { start: string; end: string; } }>({ keyword: '', tvbh: [], dongXe: [], trangThai: [] });
    const [pendingFilters, setPendingFilters] = useState<{ keyword: string, tvbh: string[], dongXe: string[], dateRange?: { start: string; end: string; } }>({ keyword: '', tvbh: [], dongXe: [] });
    const [pairedFilters, setPairedFilters] = useState<{ keyword: string, tvbh: string[], dongXe: string[], dateRange?: { start: string; end: string; } }>({ keyword: '', tvbh: [], dongXe: [] });
    const [vcFilters, setVcFilters] = useState<{ keyword: string, nguoiyc: string[], trangthai: string[], dateRange?: { start: string; end: string; } }>({ keyword: '', nguoiyc: [], trangthai: [] });

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

                setInvoiceFilters({ keyword: '', tvbh: [], dongXe: [], trangThai: [] });
                setPendingFilters({ keyword: '', tvbh: [], dongXe: [] });
                setPairedFilters({ keyword: '', tvbh: [], dongXe: [] });
                setVcFilters({ keyword: '', nguoiyc: [], trangthai: [] });

                const keyword = order['Số đơn hàng'];
                if (targetTab === 'invoices') {
                    setInvoiceFilters(prev => ({ ...prev, keyword }));
                } else if (targetTab === 'pending') {
                    setPendingFilters(prev => ({ ...prev, keyword }));
                } else if (targetTab === 'paired') {
                    setPairedFilters(prev => ({ ...prev, keyword }));
                }
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
        }
    }, [adminView]);

    const handleReset = useCallback(() => {
        if (adminView === 'invoices') {
            setInvoiceFilters({ keyword: '', tvbh: [], dongXe: [], trangThai: [] });
        } else if (adminView === 'pending') {
            setPendingFilters({ keyword: '', tvbh: [], dongXe: [] });
        } else if (adminView === 'paired') {
            setPairedFilters({ keyword: '', tvbh: [], dongXe: [] });
        } else if (adminView === 'vc') {
            setVcFilters({ keyword: '', nguoiyc: [], trangthai: [] });
        }
    }, [adminView]);

    return {
        adminView,
        setAdminView,
        invoiceFilters,
        pendingFilters,
        pairedFilters,
        vcFilters,
        handleFilterChange,
        handleReset,
        setInvoiceFilters,
        setPendingFilters,
        setPairedFilters,
        setVcFilters
    };
};
