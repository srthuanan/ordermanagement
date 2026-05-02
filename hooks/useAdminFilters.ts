import { useState, useCallback, useEffect } from 'react';
import { AdminSubView, Order } from '../types';

interface UseAdminFiltersProps {
    initialState: { targetTab?: AdminSubView; orderToShow?: Order; inquiryId?: string } | null;
    clearInitialState: () => void;
}

export const useAdminFilters = ({ initialState, clearInitialState }: UseAdminFiltersProps) => {
    const [adminView, setAdminView] = useState<AdminSubView>(() => {
        return (localStorage.getItem('lastAdminView') as AdminSubView) || 'invoices';
    });
    const [matchingTab, setMatchingTab] = useState<'pending' | 'paired' | 'suggested'>(() => {
        return (localStorage.getItem('lastMatchingTab') as 'pending' | 'paired' | 'suggested') || 'pending';
    });

    useEffect(() => {
        localStorage.setItem('lastAdminView', adminView);
    }, [adminView]);

    useEffect(() => {
        localStorage.setItem('lastMatchingTab', matchingTab);
    }, [matchingTab]);
    // Lưu số đơn hàng hoặc inquiry ID cần được select ngay khi navigate đến tab
    const [targetOrderId, setTargetOrderId] = useState<string | null>(null);
    const [targetInquiryId, setTargetInquiryId] = useState<string | null>(null);

    const [invoiceFilters, setInvoiceFilters] = useState(() => {
        try {
            const saved = localStorage.getItem('adminInvoiceFilters');
            return saved ? JSON.parse(saved) : { keyword: '', tvbh: [], dongXe: [], version: [], exterior: [], trangThai: [] };
        } catch { return { keyword: '', tvbh: [], dongXe: [], version: [], exterior: [], trangThai: [] }; }
    });
    const [pendingFilters, setPendingFilters] = useState(() => {
        try {
            const saved = localStorage.getItem('adminPendingFilters');
            return saved ? JSON.parse(saved) : { keyword: '', tvbh: [], dongXe: [], version: [], exterior: [] };
        } catch { return { keyword: '', tvbh: [], dongXe: [], version: [], exterior: [] }; }
    });
    const [pairedFilters, setPairedFilters] = useState(() => {
        try {
            const saved = localStorage.getItem('adminPairedFilters');
            return saved ? JSON.parse(saved) : { keyword: '', tvbh: [], dongXe: [], version: [], exterior: [] };
        } catch { return { keyword: '', tvbh: [], dongXe: [], version: [], exterior: [] }; }
    });
    const [vcFilters, setVcFilters] = useState(() => {
        try {
            const saved = localStorage.getItem('adminVcFilters');
            return saved ? JSON.parse(saved) : { keyword: '', nguoiyc: [], trangthai: [] };
        } catch { return { keyword: '', nguoiyc: [], trangthai: [] }; }
    });
    const [matchingFilters, setMatchingFilters] = useState(() => {
        try {
            const saved = localStorage.getItem('adminMatchingFilters');
            return saved ? JSON.parse(saved) : { keyword: '', tvbh: [], dongXe: [], version: [], ngoaiThat: [] };
        } catch { return { keyword: '', tvbh: [], dongXe: [], version: [], ngoaiThat: [] }; }
    });

    useEffect(() => { localStorage.setItem('adminInvoiceFilters', JSON.stringify(invoiceFilters)); }, [invoiceFilters]);
    useEffect(() => { localStorage.setItem('adminPendingFilters', JSON.stringify(pendingFilters)); }, [pendingFilters]);
    useEffect(() => { localStorage.setItem('adminPairedFilters', JSON.stringify(pairedFilters)); }, [pairedFilters]);
    useEffect(() => { localStorage.setItem('adminVcFilters', JSON.stringify(vcFilters)); }, [vcFilters]);
    useEffect(() => { localStorage.setItem('adminMatchingFilters', JSON.stringify(matchingFilters)); }, [matchingFilters]);

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
                    setMatchingFilters((prev: any) => ({ ...prev, keyword: orderId }));
                    // Nếu đơn đã ghép (có VIN), chuyển sang sub-tab "Đã Ghép"
                    setMatchingTab(order.VIN ? 'paired' : 'pending');
                } else if (targetTab === 'invoices') {
                    setInvoiceFilters((prev: any) => ({ ...prev, keyword: orderId }));
                } else if (targetTab === 'vc') {
                    setVcFilters((prev: any) => ({ ...prev, keyword: orderId }));
                } else if (targetTab === 'pending') {
                    setPendingFilters((prev: any) => ({ ...prev, keyword: orderId }));
                } else if (targetTab === 'paired') {
                    setPairedFilters((prev: any) => ({ ...prev, keyword: orderId }));
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
            setInvoiceFilters((prev: any) => ({ ...prev, ...newFilters }));
        } else if (adminView === 'pending') {
            setPendingFilters((prev: any) => ({ ...prev, ...newFilters }));
        } else if (adminView === 'paired') {
            setPairedFilters((prev: any) => ({ ...prev, ...newFilters }));
        } else if (adminView === 'vc') {
            setVcFilters((prev: any) => ({ ...prev, ...newFilters }));
        } else if (adminView === 'matching') {
            setMatchingFilters((prev: any) => ({ ...prev, ...newFilters }));
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
