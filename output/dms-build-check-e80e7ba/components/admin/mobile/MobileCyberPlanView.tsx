import React, { useState, useMemo } from 'react';
import {
    ChevronLeft,
    Search,
    SlidersHorizontal,
    X,
    Car,
    Copy,
    Check,
    RotateCw,
    FileText,
    Printer,
    Clock,
    CheckCircle2,
    AlertCircle,
    Warehouse,
    FileSpreadsheet,
    Send,
    Truck,
    ChevronRight
} from 'lucide-react';
import { formatShortWarehouseName } from '../../../utils/stringUtils';
import MobileSatelliteWarehousesView from './MobileSatelliteWarehousesView';
import MobileReconcileK83View from './MobileReconcileK83View';

// ==========================================
// TYPES & INTERFACES
// ==========================================
export type MobileCyberSubTab = 
    | 'factory_plan' 
    | 'ton_kho' 
    | 'xep_xe' 
    | 'de_nghi_xuat' 
    | 'tra_cuu_phieu' 
    | 'satellite_warehouses' 
    | 'reconcile';

export interface MobileCyberPlanViewProps {
    // Current Active Sub-tab
    activeSubTab: string;
    onSubTabChange: (tab: any) => void;

    // Navigation & Global Actions
    onBackToAdminHome?: () => void;
    onOpenActionMenu?: () => void;
    handleFullSyncCyber: () => void;
    isFullSyncing: boolean;
    lastSyncTime?: string;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;

    // Sub-tab 1: Factory Plan
    cars: any[];
    displayedCars: any[];
    planKeyword: string;
    setPlanKeyword: (kw: string) => void;
    executePlanSearch: (params?: any) => void;
    isLoadingPlan: boolean;
    totalPlanCount: number;
    filterOptions: {
        models: string[];
        versions: string[];
        colors: string[];
        ttcp_list: { code: string; name: string; count: number }[];
    };
    selectedModel: string;
    selectedVersion: string;
    selectedColor: string;
    selectedTtcp: string;
    onModelChange: (model: string) => void;
    setSelectedVersion: (v: string) => void;
    setSelectedColor: (c: string) => void;
    setSelectedTtcp: (t: string) => void;
    copiedVin: string | null;
    onCopyVin: (vin: string) => void;

    // Sub-tab 2: Ton Kho
    tonKhoCars: any[];
    displayedTonKhoCars: any[];
    tonKhoKeyword: string;
    setTonKhoKeyword: (kw: string) => void;
    executeTonKhoSearch: (params?: any) => void;
    isLoadingTonKho: boolean;
    tonKhoTotal: number;
    tonKhoInvoiced: number;
    tonKhoNotInvoiced: number;
    tonKhoStatus: 'all' | 'invoiced' | 'not_invoiced';
    setTonKhoStatus: (st: 'all' | 'invoiced' | 'not_invoiced') => void;
    tonKhoCopiedVin: string | null;
    onTonKhoCopyVin: (vin: string) => void;

    // Sub-tab 3: Xep Xe
    xepXeContracts: any[];
    displayedXepXeContracts: any[];
    xepXeKeyword: string;
    setXepXeKeyword: (kw: string) => void;
    xepXeStatusFilter: string;
    setXepXeStatusFilter: (st: string) => void;
    executeXepXeSearch: (params?: any) => void;
    isLoadingXepXe: boolean;
    invoicedCount: number;
    notInvoicedCount: number;
    xepXeCopiedVin: string | null;
    onXepXeCopyVin: (vin: string) => void;

    // Sub-tab 4: Lap DNX
    dnxVinInput: string;
    setDnxVinInput: (vin: string) => void;
    dnxMaGd: '4' | '9';
    setDnxMaGd: (gd: '4' | '9') => void;
    dnxMaKhoXuat: string;
    setDnxMaKhoXuat: (kho: string) => void;
    dnxMaKhoNhan: string;
    setDnxMaKhoNhan: (kho: string) => void;
    dnxKhachHang: string;
    setDnxKhachHang: (kh: string) => void;
    dnxLyDo: string;
    setDnxLyDo: (ld: string) => void;
    extractedVins: string[];
    isLookingUpVin: boolean;
    detectedWarehouseName: string;
    handleCreateDnxSubmitInAdmin: (e: React.FormEvent) => void;
    isSubmittingDnx: boolean;
    dnxResult: any;
    setDnxResult: (res: any) => void;
    dnxError: string;
    setPrintTicketData: (data: any) => void;
    pendingTransferRequests: any[];
    isLoadingTransferRequests: boolean;
    loadPendingTransferRequests: () => void;
    handleApplyTransferRequest: (req: any) => void;
    handleRejectTransferRequest: (req: any) => void;
    handleResolveTransferRequestWithExistingTicket: (req: any, ticket: any) => void;
    recentDnxTickets: any[];
    isLoadingRecentTickets: boolean;
    loadRecentDnxTickets: () => void;
    handlePrintFromRecentList: (ticket: any) => void;
    detectedExistingTicket: any;
    bypassExistingTicket: boolean;
    setBypassExistingTicket: (bp: boolean) => void;

    // Sub-tab 5: Tra Cuu Phieu
    voucherTickets: any[];
    voucherKeyword: string;
    setVoucherKeyword: (kw: string) => void;
    voucherTypeFilter: string;
    setVoucherTypeFilter: (vt: string) => void;
    voucherPostFilter: string;
    setVoucherPostFilter: (vp: string) => void;
    isLoadingTickets: boolean;
    executeVoucherTicketsSearch: () => void;
    selectedTicketModal: any;
    setSelectedTicketModal: (t: any) => void;
    setPrintTd4Data: (data: any) => void;

    // Sub-tab 6 & 7: Satellite Warehouses & Reconcile
    allOrders?: any[];
    stockData?: any[];
    reconcileCounts: any;
    navigateToTab: (tab: string, options?: any) => void;
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================
const formatCustomerName = (name?: string): string => {
    if (!name) return '—';
    const raw = String(name).trim();
    if (!raw) return '—';

    const words = raw.split(/\s+/);
    const keepUpperSet = new Set(['TNHH', 'CP', 'MTV', 'TM', 'DV', 'XD', 'ĐT', 'KT', 'CN', 'XNK', 'SX', 'BĐS', 'VINFAST', 'VF', 'VSO', 'ARI', 'DNX', 'TD4']);

    return words.map(w => {
        const clean = w.replace(/[^\w\u00C0-\u1EF9]/gi, '');
        if (keepUpperSet.has(clean.toUpperCase())) {
            return w.toUpperCase();
        }
        return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    }).join(' ');
};

const formatCarModel = (model?: string): string => {
    if (!model) return 'VF';
    const m = model.trim();
    if (m.toUpperCase().startsWith('VF') && !m.toUpperCase().startsWith('VF ')) {
        return `VF ${m.slice(2).trim()}`;
    }
    return m;
};

const getExteriorSwatchColor = (colorName?: string): string => {
    if (!colorName) return '#94a3b8';
    const c = colorName.toLowerCase();
    if (c.includes('white') || c.includes('trắng') || c.includes('blanc') || c.includes('ce18')) return '#f8fafc';
    if (c.includes('black') || c.includes('đen') || c.includes('noir') || c.includes('ce11')) return '#0f172a';
    if (c.includes('red') || c.includes('đỏ') || c.includes('crimson') || c.includes('rouge') || c.includes('ce1m')) return '#dc2626';
    if (c.includes('blue') || c.includes('xanh dương') || c.includes('aquatic') || c.includes('bleu') || c.includes('ce14') || c.includes('sky')) return '#2563eb';
    if (c.includes('green') || c.includes('xanh lá') || c.includes('vert') || c.includes('ce13') || c.includes('emerald')) return '#059669';
    if (c.includes('grey') || c.includes('gray') || c.includes('xám') || c.includes('gris') || c.includes('ce12') || c.includes('zenith')) return '#64748b';
    if (c.includes('silver') || c.includes('bạc') || c.includes('argent') || c.includes('desat')) return '#cbd5e1';
    if (c.includes('pink') || c.includes('hồng') || c.includes('rose') || c.includes('ce2k')) return '#f472b6';
    if (c.includes('orange') || c.includes('cam') || c.includes('vitality') || c.includes('ce1e')) return '#ea580c';
    if (c.includes('yellow') || c.includes('vàng') || c.includes('jaune') || c.includes('ce16')) return '#eab308';
    if (c.includes('purple') || c.includes('tím') || c.includes('violet') || c.includes('iris')) return '#9333ea';
    return '#94a3b8';
};

// ==========================================
// COMPONENT
// ==========================================
export const MobileCyberPlanView: React.FC<MobileCyberPlanViewProps> = ({
    activeSubTab,
    onSubTabChange,
    onBackToAdminHome,
    onOpenActionMenu,
    handleFullSyncCyber,
    isFullSyncing,
    lastSyncTime: _lastSyncTime,
    showToast,

    // Factory Plan
    cars,
    displayedCars,
    planKeyword,
    setPlanKeyword,
    executePlanSearch,
    isLoadingPlan,
    totalPlanCount,
    filterOptions,
    selectedModel,
    selectedVersion,
    selectedColor,
    selectedTtcp,
    onModelChange,
    setSelectedVersion,
    setSelectedColor,
    setSelectedTtcp,
    copiedVin,
    onCopyVin,

    // Ton Kho
    tonKhoCars,
    displayedTonKhoCars,
    tonKhoKeyword,
    setTonKhoKeyword,
    executeTonKhoSearch,
    isLoadingTonKho,
    tonKhoTotal: _tonKhoTotal,
    tonKhoInvoiced: _tonKhoInvoiced,
    tonKhoNotInvoiced,
    tonKhoStatus,
    setTonKhoStatus,
    tonKhoCopiedVin,
    onTonKhoCopyVin,

    // Xep Xe
    xepXeContracts,
    displayedXepXeContracts,
    xepXeKeyword,
    setXepXeKeyword,
    xepXeStatusFilter,
    setXepXeStatusFilter,
    executeXepXeSearch: _executeXepXeSearch,
    isLoadingXepXe,
    invoicedCount,
    notInvoicedCount,
    xepXeCopiedVin,
    onXepXeCopyVin,

    // Lap DNX
    dnxVinInput,
    setDnxVinInput,
    dnxMaGd: _dnxMaGd,
    setDnxMaGd: _setDnxMaGd,
    dnxMaKhoXuat,
    setDnxMaKhoXuat,
    dnxMaKhoNhan,
    setDnxMaKhoNhan,
    dnxKhachHang: _dnxKhachHang,
    setDnxKhachHang: _setDnxKhachHang,
    dnxLyDo,
    setDnxLyDo,
    extractedVins,
    isLookingUpVin,
    detectedWarehouseName,
    handleCreateDnxSubmitInAdmin,
    isSubmittingDnx,
    dnxResult,
    setDnxResult: _setDnxResult,
    dnxError,
    setPrintTicketData,
    pendingTransferRequests,
    isLoadingTransferRequests,
    loadPendingTransferRequests,
    handleApplyTransferRequest,
    handleRejectTransferRequest,
    handleResolveTransferRequestWithExistingTicket: _handleResolveTransferRequestWithExistingTicket,
    recentDnxTickets,
    isLoadingRecentTickets,
    loadRecentDnxTickets,
    handlePrintFromRecentList,
    detectedExistingTicket,
    bypassExistingTicket,
    setBypassExistingTicket,

    // Tra Cuu Phieu
    voucherTickets,
    voucherKeyword,
    setVoucherKeyword,
    voucherTypeFilter,
    setVoucherTypeFilter,
    voucherPostFilter: _voucherPostFilter,
    setVoucherPostFilter: _setVoucherPostFilter,
    isLoadingTickets,
    executeVoucherTicketsSearch: _executeVoucherTicketsSearch,
    selectedTicketModal: _selectedTicketModal,
    setSelectedTicketModal,
    setPrintTd4Data: _setPrintTd4Data,

    // Satellite & Reconcile
    allOrders,
    stockData: _stockData,
    reconcileCounts,
    navigateToTab
}) => {
    // Mobile modal bottom sheet state for item inspection
    const [inspectedPlanCar, setInspectedPlanCar] = useState<any | null>(null);
    const [inspectedTonKhoCar, setInspectedTonKhoCar] = useState<any | null>(null);
    const [inspectedContract, setInspectedContract] = useState<any | null>(null);

    // Filter sheet states
    const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

    // DNX Mobile sub-view state
    const [mobileDnxSubTab, setMobileDnxSubTab] = useState<'create' | 'requests' | 'history'>('create');

    // Sub-tab Navigation Definitions
    const mainSubTabs = useMemo(() => [
        {
            id: 'factory_plan',
            label: 'Kế hoạch',
            icon: 'fa-truck-ramp-box',
            count: totalPlanCount || cars.length
        },
        {
            id: 'ton_kho',
            label: 'Tồn kho',
            icon: 'fa-warehouse',
            count: tonKhoNotInvoiced || tonKhoCars.length
        },
        {
            id: 'xep_xe',
            label: 'Xếp xe',
            icon: 'fa-car-side',
            count: xepXeContracts.length
        },
        {
            id: 'de_nghi_xuat',
            label: 'Lập DNX',
            icon: 'fa-truck',
            count: pendingTransferRequests.length > 0 ? `${pendingTransferRequests.length} YC` : null,
            badgePulse: pendingTransferRequests.length > 0
        },
        {
            id: 'tra_cuu_phieu',
            label: 'Tiến trình',
            icon: 'fa-file-invoice',
            count: voucherTickets.length
        },
        {
            id: 'satellite_warehouses',
            label: 'Bãi xe (3 kho)',
            icon: 'fa-building',
            count: reconcileCounts?.carsCount || null
        },
        {
            id: 'reconcile_k83',
            label: 'Đối soát kho',
            icon: 'fa-scale-balanced',
            count: reconcileCounts?.k83DiffCount > 0 ? `${reconcileCounts.k83DiffCount} lệch` : null,
            badgeDanger: reconcileCounts?.k83DiffCount > 0
        }
    ], [totalPlanCount, cars.length, tonKhoNotInvoiced, tonKhoCars.length, xepXeContracts.length, pendingTransferRequests.length, voucherTickets.length, reconcileCounts]);

    // Active sub-tab normalization (reconcile sub-tabs map to reconcile_k83 for mobile pill)
    const normalizedSubTab = useMemo(() => {
        if (activeSubTab.startsWith('reconcile')) return 'reconcile_k83';
        return activeSubTab;
    }, [activeSubTab]);

    // Active filter counts for Factory Plan
    const activePlanFiltersCount = useMemo(() => {
        let count = 0;
        if (selectedModel && selectedModel !== 'Tất cả') count++;
        if (selectedVersion && selectedVersion !== 'Tất cả') count++;
        if (selectedColor && selectedColor !== 'Tất cả') count++;
        if (selectedTtcp) count++;
        return count;
    }, [selectedModel, selectedVersion, selectedColor, selectedTtcp]);


    // Quick clear filters for Factory Plan
    const handleResetPlanFilters = () => {
        onModelChange('Tất cả');
        setSelectedVersion('Tất cả');
        setSelectedColor('Tất cả');
        setSelectedTtcp('');
        executePlanSearch({ model: '', version: '', color: '', ttcp: '' });
    };

    return (
        <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#F2F2F7] text-[#1C1C1E] font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','SF_Pro_Display','Segoe_UI',Roboto,sans-serif]">
            {/* ========================================================================= */}
            {/* 1. iOS TOP NAVIGATION BAR */}
            {/* ========================================================================= */}
            <header className="relative flex h-11 shrink-0 items-center justify-between border-b border-black/[0.08] bg-[#F2F2F7]/95 px-3 backdrop-blur-2xl z-30">
                <button
                    type="button"
                    onClick={onBackToAdminHome}
                    className="inline-flex h-8 items-center gap-1 text-[15px] font-normal text-[#007AFF] active:opacity-60 transition-opacity"
                >
                    <ChevronLeft size={18} strokeWidth={2.4} className="-mr-0.5 text-[#007AFF]" />
                    <span>Quản trị</span>
                </button>

                <h1 className="absolute left-1/2 -translate-x-1/2 text-[16px] font-semibold tracking-[-0.015em] text-[#1C1C1E] pointer-events-none">
                    Kế Hoạch Cyber
                </h1>

                <div className="flex items-center gap-1.5">
                    {/* Sync button with CyberSoft */}
                    <button
                        type="button"
                        onClick={handleFullSyncCyber}
                        disabled={isFullSyncing}
                        className={`flex h-8 items-center gap-1 px-2 rounded-full text-[12px] font-semibold transition-all active:scale-95 ${
                            isFullSyncing 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : 'bg-white/80 text-emerald-700 shadow-2xs hover:bg-white'
                        }`}
                        title="Đồng bộ dữ liệu CyberSoft ERP"
                    >
                        <RotateCw size={13} className={isFullSyncing ? 'animate-spin text-emerald-600' : 'text-emerald-600'} />
                        <span className="hidden sm:inline text-[11px]">{isFullSyncing ? 'Đang kéo...' : 'Đồng bộ'}</span>
                    </button>

                    {/* Tools / Action Menu */}
                    <button
                        type="button"
                        onClick={onOpenActionMenu}
                        aria-label="Công cụ quản trị"
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-[#007AFF] shadow-2xs active:bg-white active:scale-95 transition-all"
                    >
                        <i className="fas fa-ellipsis-h text-[13px]" />
                    </button>
                </div>
            </header>

            {/* ========================================================================= */}
            {/* 2. iOS HORIZONTAL SEGMENTED PILL SWITCHER */}
            {/* ========================================================================= */}
            <div className="shrink-0 px-3 pt-2 pb-1.5 bg-[#F2F2F7] z-20">
                <div className="flex items-center gap-1 overflow-x-auto p-[3px] rounded-xl bg-slate-200/80 no-scrollbar">
                    {mainSubTabs.map(tab => {
                        const isActive = normalizedSubTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => onSubTabChange(tab.id)}
                                className={`flex shrink-0 items-center justify-center gap-1 h-[29px] px-3 rounded-[9px] text-[11.5px] transition-all whitespace-nowrap cursor-pointer ${
                                    isActive
                                        ? 'bg-white text-slate-900 shadow-2xs font-bold'
                                        : 'text-slate-600 hover:text-slate-900 active:opacity-70 font-semibold'
                                }`}
                            >
                                <i className={`fas ${tab.icon} text-[10.5px] ${isActive ? 'text-[#007AFF]' : 'text-slate-400'}`} />
                                <span>{tab.label}</span>
                                {tab.count !== null && (
                                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full shrink-0 ${
                                        isActive
                                            ? tab.badgeDanger
                                                ? 'bg-rose-600 text-white'
                                                : tab.badgePulse
                                                ? 'bg-amber-500 text-white animate-pulse'
                                                : 'bg-blue-100 text-blue-700'
                                            : tab.badgeDanger
                                            ? 'bg-rose-100 text-rose-700 font-extrabold'
                                            : 'bg-black/[0.06] text-slate-500'
                                    }`}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ========================================================================= */}
            {/* 3. MAIN CONTENT PANELS (SUB-SECTIONS) */}
            {/* ========================================================================= */}
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative">

                {/* ------------------------------------------------------------- */}
                {/* 3.1: SUB-TAB KẾ HOẠCH (factory_plan) */}
                {/* ------------------------------------------------------------- */}
                {activeSubTab === 'factory_plan' && (
                    <>
                        <main className="flex-1 overflow-y-auto px-3 pt-1 pb-16 no-scrollbar">
                            {isLoadingPlan ? (
                                <div className="py-24 flex flex-col items-center justify-center text-center px-4">
                                    <div className="w-8 h-8 border-2 border-slate-800 border-t-transparent rounded-full animate-spin mb-3" />
                                    <p className="text-xs font-bold text-slate-700">Đang nạp dữ liệu xe kế hoạch nhà máy...</p>
                                </div>
                            ) : displayedCars.length === 0 ? (
                                <div className="py-20 flex flex-col items-center justify-center text-center px-4">
                                    <div className="w-14 h-14 rounded-2xl bg-white text-slate-400 flex items-center justify-center mb-3 shadow-xs border border-slate-200">
                                        <Car size={26} strokeWidth={1.8} />
                                    </div>
                                    <h3 className="text-sm font-bold text-slate-700">Không tìm thấy xe kế hoạch</h3>
                                    <p className="text-xs text-slate-400 mt-1 max-w-xs">
                                        Thử thay đổi từ khóa tìm kiếm hoặc bấm Tìm trên CyberSoft ERP.
                                    </p>
                                    <div className="mt-3.5 flex items-center gap-2">
                                        {planKeyword && (
                                            <button
                                                type="button"
                                                onClick={() => setPlanKeyword('')}
                                                className="px-3 py-1.5 rounded-full bg-slate-200 text-slate-700 text-xs font-semibold active:scale-95"
                                            >
                                                Xóa từ khóa
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => executePlanSearch()}
                                            className="px-3.5 py-1.5 rounded-full bg-blue-600 text-white text-xs font-semibold shadow-xs active:scale-95"
                                        >
                                            Tìm trên CyberSoft
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
                                    {/* Table Header */}
                                    <div className="flex items-center px-3.5 py-1.5 bg-slate-100/75 border-b border-slate-200/80 text-[10.5px] font-bold text-slate-500 uppercase tracking-wider select-none">
                                        <div className="flex-1 min-w-0 pr-3 border-r border-slate-200/60">Cấu hình xe</div>
                                        <div className="flex-1 min-w-0 pl-3 pr-1">Vị trí / Showroom</div>
                                        <div className="w-3 shrink-0"></div>
                                    </div>

                                    {/* Table Body */}
                                    <div className="divide-y divide-slate-100">
                                        {displayedCars.map((item, idx) => {
                                            const modelName = item.dong_xe || item.ten_kx || item.ma_kx || 'VF';
                                            const version = item.phien_ban || '';
                                            const color = item.ten_mau || item.ma_mau || 'Tiêu chuẩn';
                                            const showroom = item.ten_ttcp || item.ma_ttcp || 'Showroom';
                                            const wh = item.current_physical_warehouse || item.vi_tri_kho || 'Đang vận tải';
                                            const isAtYard = wh && wh !== 'Đang vận tải';

                                            return (
                                                <div
                                                    key={`${item.vin}-${idx}`}
                                                    onClick={() => setInspectedPlanCar(item)}
                                                    className="flex min-h-[62px] cursor-pointer select-none items-center justify-between px-3.5 py-2.5 transition-colors hover:bg-slate-50/80 active:bg-slate-100/70"
                                                >
                                                    {/* CỘT 1: CẤU HÌNH XE */}
                                                    <div className="flex min-w-0 flex-1 flex-col justify-center space-y-0.5 self-stretch border-r border-slate-100/90 pr-3">
                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                            <span className="font-bold text-[13px] tracking-tight text-slate-900 truncate">
                                                                {formatCarModel(modelName)}
                                                            </span>
                                                            {version && (
                                                                <span className="text-[11px] font-semibold text-slate-600 truncate">
                                                                    {version}
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center gap-1.5 text-[10.5px] text-slate-500 font-medium truncate">
                                                            <span
                                                                className="h-2.5 w-2.5 flex-shrink-0 rounded-full border border-white ring-1 ring-slate-300 shadow-2xs"
                                                                style={{ backgroundColor: getExteriorSwatchColor(color) }}
                                                                title={color}
                                                            />
                                                            <span className="truncate text-slate-600" title={color}>
                                                                {color}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onCopyVin(item.vin);
                                                                }}
                                                                className="font-mono text-[9.5px] font-bold text-slate-700 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 px-1.5 py-0.2 rounded shrink-0 flex items-center gap-0.5"
                                                                title="Sao chép VIN"
                                                            >
                                                                <span>{item.vin.slice(-8)}</span>
                                                                {copiedVin === item.vin ? (
                                                                    <Check size={9} className="text-emerald-600 stroke-[3]" />
                                                                ) : (
                                                                    <Copy size={8} className="text-slate-400" />
                                                                )}
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* CỘT 2: VỊ TRÍ / SHOWROOM */}
                                                    <div className="flex min-w-0 flex-1 flex-col justify-center space-y-0.5 self-stretch pl-3 pr-1">
                                                        <div className="font-semibold text-[12px] text-slate-800 truncate" title={showroom}>
                                                            {formatCustomerName(showroom)}
                                                        </div>

                                                        <div className="flex items-center gap-1 text-[10px] font-bold">
                                                            <span className={`px-2 py-0.5 rounded-full truncate ${
                                                                isAtYard
                                                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                                            }`}>
                                                                {wh}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* CỘT 3: CHEVRON */}
                                                    <div className="flex items-center justify-end shrink-0 pl-1 text-slate-300 w-3">
                                                        <ChevronRight size={13} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </main>

                        {/* Floating Bottom Dock */}
                        <div className="absolute inset-x-0 bottom-0 z-30 border-t border-black/[0.06] bg-white/92 px-3 py-2 backdrop-blur-2xl">
                            <div className="flex items-center space-x-2">
                                <div className="relative flex-1">
                                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                                        <Search size={13} strokeWidth={2} />
                                    </div>
                                    <input
                                        type="text"
                                        value={planKeyword}
                                        onChange={e => setPlanKeyword(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' && cars.length === 0) executePlanSearch();
                                        }}
                                        placeholder="Tìm số VIN, số máy, DMS…"
                                        className="w-full h-[34px] pl-[30px] pr-[28px] rounded-xl bg-slate-100/90 focus:bg-white text-[11.5px] text-slate-800 placeholder-slate-400 border border-slate-200/80 focus:border-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-200 shadow-2xs transition-all font-sans"
                                    />
                                    {planKeyword && (
                                        <button
                                            type="button"
                                            onClick={() => setPlanKeyword('')}
                                            className="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-400 hover:text-slate-600 active:scale-90"
                                        >
                                            <X size={12} />
                                        </button>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsFilterSheetOpen(true)}
                                    className={`h-[34px] px-2.5 rounded-xl flex items-center space-x-1 font-medium text-[11px] transition-all active:scale-95 flex-shrink-0 border ${
                                        activePlanFiltersCount > 0
                                            ? 'bg-slate-700 text-white border-slate-700 shadow-xs'
                                            : 'bg-slate-100/90 text-slate-700 hover:bg-slate-200/80 border-slate-200/80 shadow-2xs'
                                    }`}
                                >
                                    <SlidersHorizontal size={12} strokeWidth={2} />
                                    <span>Lọc</span>
                                    {activePlanFiltersCount > 0 && (
                                        <span className="w-3.5 h-3.5 rounded-full bg-white text-slate-700 font-bold text-[9px] flex items-center justify-center -mr-0.5">
                                            {activePlanFiltersCount}
                                        </span>
                                    )}
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {/* ------------------------------------------------------------- */}
                {/* 3.2: SUB-TAB TỒN KHO (ton_kho) */}
                {/* ------------------------------------------------------------- */}
                {activeSubTab === 'ton_kho' && (
                    <>
                        <main className="flex-1 overflow-y-auto px-3 pt-1 pb-16 no-scrollbar">
                            {isLoadingTonKho ? (
                                <div className="py-24 flex flex-col items-center justify-center text-center px-4">
                                    <div className="w-8 h-8 border-2 border-slate-800 border-t-transparent rounded-full animate-spin mb-3" />
                                    <p className="text-xs font-bold text-slate-700">Đang nạp dữ liệu tồn kho [CP_BETONXE]...</p>
                                </div>
                            ) : displayedTonKhoCars.length === 0 ? (
                                <div className="py-20 flex flex-col items-center justify-center text-center px-4">
                                    <div className="w-14 h-14 rounded-2xl bg-white text-slate-400 flex items-center justify-center mb-3 shadow-xs border border-slate-200">
                                        <Warehouse size={26} strokeWidth={1.8} />
                                    </div>
                                    <h3 className="text-sm font-bold text-slate-700">Không tìm thấy xe tồn kho</h3>
                                    <p className="text-xs text-slate-400 mt-1 max-w-xs">
                                        Thử thay đổi từ khóa hoặc bấm tải lại tồn kho từ CyberSoft.
                                    </p>
                                    <div className="mt-3.5 flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => executeTonKhoSearch({ force: true })}
                                            className="px-4 py-1.5 rounded-full bg-blue-600 text-white text-xs font-semibold shadow-xs active:scale-95"
                                        >
                                            Tải lại từ Cyber
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
                                    {/* Table Header */}
                                    <div className="flex items-center px-3.5 py-1.5 bg-slate-100/75 border-b border-slate-200/80 text-[10.5px] font-bold text-slate-500 uppercase tracking-wider select-none">
                                        <div className="flex-1 min-w-0 pr-3 border-r border-slate-200/60">Cấu hình xe</div>
                                        <div className="flex-1 min-w-0 pl-3 pr-1">Kho / Tuổi tồn</div>
                                        <div className="w-3 shrink-0"></div>
                                    </div>

                                    {/* Table Body */}
                                    <div className="divide-y divide-slate-100">
                                        {displayedTonKhoCars.map((item, idx) => {
                                            const model = item.ten_kx || item.ma_kx || 'VF';
                                            const color = item.ten_mau || item.ma_mau || '—';
                                            const kho = item.ten_kho || item.ma_kho || 'Chưa rõ';
                                            const tuoiTon = Number(item.tuoi_ton || 0);
                                            const isInvoiced = Boolean(item.is_invoiced);

                                            return (
                                                <div
                                                    key={`${item.vin}-${idx}`}
                                                    onClick={() => setInspectedTonKhoCar(item)}
                                                    className={`flex min-h-[62px] cursor-pointer select-none items-center justify-between px-3.5 py-2.5 transition-colors active:bg-slate-100/70 ${
                                                        isInvoiced ? 'bg-amber-50/40' : 'hover:bg-slate-50/80'
                                                    }`}
                                                >
                                                    {/* CỘT 1: CẤU HÌNH XE */}
                                                    <div className="flex min-w-0 flex-1 flex-col justify-center space-y-0.5 self-stretch border-r border-slate-100/90 pr-3">
                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                            <span className="font-bold text-[13px] tracking-tight text-slate-900 truncate">
                                                                {formatCarModel(model)}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center gap-1.5 text-[10.5px] text-slate-500 font-medium truncate">
                                                            <span
                                                                className="h-2.5 w-2.5 flex-shrink-0 rounded-full border border-white ring-1 ring-slate-300 shadow-2xs"
                                                                style={{ backgroundColor: getExteriorSwatchColor(color) }}
                                                                title={color}
                                                            />
                                                            <span className="truncate text-slate-600" title={color}>
                                                                {color}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onTonKhoCopyVin(item.vin);
                                                                }}
                                                                className="font-mono text-[9.5px] font-bold text-slate-700 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 px-1.5 py-0.2 rounded shrink-0 flex items-center gap-0.5"
                                                                title="Sao chép VIN"
                                                            >
                                                                <span>{item.vin.slice(-8)}</span>
                                                                {tonKhoCopiedVin === item.vin ? (
                                                                    <Check size={9} className="text-emerald-600 stroke-[3]" />
                                                                ) : (
                                                                    <Copy size={8} className="text-slate-400" />
                                                                )}
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* CỘT 2: KHO & TUỔI TỒN */}
                                                    <div className="flex min-w-0 flex-1 flex-col justify-center space-y-0.5 self-stretch pl-3 pr-1">
                                                        <div className="font-semibold text-[12px] text-slate-800 truncate" title={kho}>
                                                            {formatShortWarehouseName(kho)}
                                                        </div>

                                                        <div className="flex items-center gap-1.5 text-[10px]">
                                                            <span className={`px-2 py-0.2 rounded-full font-bold ${
                                                                tuoiTon >= 90
                                                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                                                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                                                            }`}>
                                                                {tuoiTon} ngày
                                                            </span>
                                                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                                                isInvoiced ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                                                            }`}>
                                                                {isInvoiced ? 'Đã XHĐ' : 'Chưa XHĐ'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* CỘT 3: CHEVRON */}
                                                    <div className="flex items-center justify-end shrink-0 pl-1 text-slate-300 w-3">
                                                        <ChevronRight size={13} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </main>

                        {/* Floating Bottom Dock */}
                        <div className="absolute inset-x-0 bottom-0 z-30 border-t border-black/[0.06] bg-white/92 px-3 py-2 backdrop-blur-2xl">
                            <div className="flex items-center space-x-2">
                                <div className="relative flex-1">
                                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                                        <Search size={13} strokeWidth={2} />
                                    </div>
                                    <input
                                        type="text"
                                        value={tonKhoKeyword}
                                        onChange={e => setTonKhoKeyword(e.target.value)}
                                        placeholder="Tìm VIN, số máy, kho…"
                                        className="w-full h-[34px] pl-[30px] pr-[28px] rounded-xl bg-slate-100/90 focus:bg-white text-[11.5px] text-slate-800 placeholder-slate-400 border border-slate-200/80 focus:border-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-200 shadow-2xs transition-all font-sans"
                                    />
                                    {tonKhoKeyword && (
                                        <button
                                            type="button"
                                            onClick={() => setTonKhoKeyword('')}
                                            className="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-400 hover:text-slate-600 active:scale-90"
                                        >
                                            <X size={12} />
                                        </button>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setTonKhoStatus(tonKhoStatus === 'all' ? 'not_invoiced' : tonKhoStatus === 'not_invoiced' ? 'invoiced' : 'all');
                                    }}
                                    className={`h-[34px] px-2.5 rounded-xl flex items-center space-x-1 font-medium text-[11px] transition-all active:scale-95 flex-shrink-0 border ${
                                        tonKhoStatus !== 'not_invoiced'
                                            ? 'bg-slate-700 text-white border-slate-700 shadow-xs'
                                            : 'bg-slate-100/90 text-slate-700 hover:bg-slate-200/80 border-slate-200/80 shadow-2xs'
                                    }`}
                                >
                                    <span>{tonKhoStatus === 'not_invoiced' ? 'Chưa XHĐ' : tonKhoStatus === 'invoiced' ? 'Đã XHĐ' : 'Tất cả'}</span>
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {/* ------------------------------------------------------------- */}
                {/* 3.3: SUB-TAB XẾP XE (xep_xe) */}
                {/* ------------------------------------------------------------- */}
                {activeSubTab === 'xep_xe' && (
                    <>
                        {/* Secondary status filter pills */}
                        <div className="shrink-0 px-3 pt-1 pb-1 bg-[#F2F2F7]">
                            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-200/70">
                                {[
                                    { id: 'all', label: 'Tất cả', count: xepXeContracts.length },
                                    { id: 'Đã xuất HĐ', label: 'Đã xuất HĐ', count: invoicedCount, activeClass: 'bg-purple-600 text-white' },
                                    { id: 'Chưa xuất HĐ', label: 'Chưa xuất HĐ', count: notInvoicedCount, activeClass: 'bg-slate-900 text-white' }
                                ].map(st => (
                                    <button
                                        key={st.id}
                                        type="button"
                                        onClick={() => setXepXeStatusFilter(st.id)}
                                        className={`flex-1 h-7 rounded-md text-[11px] font-semibold transition-all flex items-center justify-center gap-1 ${
                                            xepXeStatusFilter === st.id
                                                ? st.activeClass || 'bg-white text-slate-900 shadow-2xs font-bold'
                                                : 'text-slate-600 active:text-slate-900'
                                        }`}
                                    >
                                        <span>{st.label}</span>
                                        <span className="text-[9px] px-1 py-0.2 rounded-full bg-black/10">
                                            {st.count}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <main className="flex-1 overflow-y-auto px-3 pt-1 pb-16 no-scrollbar">
                            {isLoadingXepXe ? (
                                <div className="py-24 flex flex-col items-center justify-center text-center px-4">
                                    <div className="w-8 h-8 border-2 border-slate-800 border-t-transparent rounded-full animate-spin mb-3" />
                                    <p className="text-xs font-bold text-slate-700">Đang nạp hợp đồng xếp xe [CP_BEXEPXE]...</p>
                                </div>
                            ) : displayedXepXeContracts.length === 0 ? (
                                <div className="py-20 flex flex-col items-center justify-center text-center px-4">
                                    <div className="w-14 h-14 rounded-2xl bg-white text-slate-400 flex items-center justify-center mb-3 shadow-xs border border-slate-200">
                                        <FileSpreadsheet size={26} strokeWidth={1.8} />
                                    </div>
                                    <h3 className="text-sm font-bold text-slate-700">Không tìm thấy hợp đồng</h3>
                                    <p className="text-xs text-slate-400 mt-1 max-w-xs">
                                        Thử thay đổi từ khóa hoặc bộ lọc trạng thái.
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
                                    {/* Table Header */}
                                    <div className="flex items-center px-3.5 py-1.5 bg-slate-100/75 border-b border-slate-200/80 text-[10.5px] font-bold text-slate-500 uppercase tracking-wider select-none">
                                        <div className="flex-1 min-w-0 pr-3 border-r border-slate-200/60">Hợp đồng / Khách</div>
                                        <div className="flex-1 min-w-0 pl-3 pr-1">Xe ghép / Showroom</div>
                                        <div className="w-3 shrink-0"></div>
                                    </div>

                                    {/* Table Body */}
                                    <div className="divide-y divide-slate-100">
                                        {displayedXepXeContracts.slice(0, 100).map((c, idx) => {
                                            const custName = formatCustomerName(c.ten_kh);
                                            const soHd = c.ma_hd || c.so_ct || '—';
                                            const tvbh = c.ten_hs ? formatCustomerName(c.ten_hs) : '';
                                            const vin = (c.so_khung || '').trim();
                                            const isInvoiced = c.ten_color === 'Đã xuất HĐ' || (c.back_color || '').toLowerCase() === 'violet';
                                            const showroom = c.ten_ttcp || '—';

                                            return (
                                                <div
                                                    key={`${c.stt_rec}_${idx}`}
                                                    onClick={() => setInspectedContract(c)}
                                                    className={`flex min-h-[62px] cursor-pointer select-none items-center justify-between px-3.5 py-2.5 transition-colors active:bg-slate-100/70 ${
                                                        isInvoiced ? 'bg-purple-50/30' : 'hover:bg-slate-50/80'
                                                    }`}
                                                >
                                                    {/* CỘT 1: HỢP ĐỒNG / KHÁCH */}
                                                    <div className="flex min-w-0 flex-1 flex-col justify-center space-y-0.5 self-stretch border-r border-slate-100/90 pr-3">
                                                        <div className="font-semibold text-[12.5px] text-slate-900 truncate" title={custName}>
                                                            {custName}
                                                        </div>

                                                        <div className="flex items-center gap-1.5 text-[10.5px] text-slate-500 font-medium truncate">
                                                            <span className="font-mono text-slate-700 font-bold">{soHd}</span>
                                                            {tvbh && (
                                                                <>
                                                                    <span>•</span>
                                                                    <span className="truncate">{tvbh}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* CỘT 2: XE GHÉP / SHOWROOM */}
                                                    <div className="flex min-w-0 flex-1 flex-col justify-center space-y-0.5 self-stretch pl-3 pr-1">
                                                        <div className="flex items-center gap-1 min-w-0">
                                                            {vin ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        onXepXeCopyVin(vin);
                                                                    }}
                                                                    className="font-mono text-[10px] font-bold text-slate-800 bg-slate-100 hover:bg-blue-50 px-1.5 py-0.2 rounded truncate flex items-center gap-1"
                                                                >
                                                                    <span>{vin}</span>
                                                                    {xepXeCopiedVin === vin ? (
                                                                        <Check size={9} className="text-emerald-600 stroke-[3]" />
                                                                    ) : (
                                                                        <Copy size={8} className="text-slate-400" />
                                                                    )}
                                                                </button>
                                                            ) : (
                                                                <span className="text-[10.5px] text-slate-400 italic">Chưa ghép VIN</span>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center gap-1 text-[10px] truncate">
                                                            {isInvoiced ? (
                                                                <span className="px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 font-bold shrink-0">
                                                                    Đã xuất HĐ
                                                                </span>
                                                            ) : (
                                                                <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium shrink-0">
                                                                    {c.ten_color || 'Chờ giao'}
                                                                </span>
                                                            )}
                                                            <span className="text-slate-500 truncate" title={showroom}>{showroom}</span>
                                                        </div>
                                                    </div>

                                                    {/* CỘT 3: CHEVRON */}
                                                    <div className="flex items-center justify-end shrink-0 pl-1 text-slate-300 w-3">
                                                        <ChevronRight size={13} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </main>

                        {/* Floating Bottom Dock */}
                        <div className="absolute inset-x-0 bottom-0 z-30 border-t border-black/[0.06] bg-white/92 px-3 py-2 backdrop-blur-2xl">
                            <div className="relative w-full">
                                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                                    <Search size={13} strokeWidth={2} />
                                </div>
                                <input
                                    type="text"
                                    value={xepXeKeyword}
                                    onChange={e => setXepXeKeyword(e.target.value)}
                                    placeholder="Tìm tên KH, số VIN, số HĐ…"
                                    className="w-full h-[34px] pl-[30px] pr-[28px] rounded-xl bg-slate-100/90 focus:bg-white text-[11.5px] text-slate-800 placeholder-slate-400 border border-slate-200/80 focus:border-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-200 shadow-2xs transition-all font-sans"
                                />
                                {xepXeKeyword && (
                                    <button
                                        type="button"
                                        onClick={() => setXepXeKeyword('')}
                                        className="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-400 hover:text-slate-600 active:scale-90"
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {/* ------------------------------------------------------------- */}
                {/* 3.4: SUB-TAB LẬP PHIẾU DNX (de_nghi_xuat) */}
                {/* ------------------------------------------------------------- */}
                {activeSubTab === 'de_nghi_xuat' && (
                    <>
                        {/* Secondary switcher for DNX */}
                        <div className="shrink-0 px-3 pt-1 pb-1 bg-[#F2F2F7]">
                            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-200/70">
                                <button
                                    type="button"
                                    onClick={() => setMobileDnxSubTab('create')}
                                    className={`flex-1 h-7 rounded-md text-[11px] font-semibold transition-all flex items-center justify-center gap-1 ${
                                        mobileDnxSubTab === 'create'
                                            ? 'bg-white text-slate-900 shadow-2xs font-bold'
                                            : 'text-slate-600'
                                    }`}
                                >
                                    <span>Lập Phiếu Mới</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMobileDnxSubTab('requests')}
                                    className={`flex-1 h-7 rounded-md text-[11px] font-semibold transition-all flex items-center justify-center gap-1 ${
                                        mobileDnxSubTab === 'requests'
                                            ? 'bg-white text-slate-900 shadow-2xs font-bold'
                                            : 'text-slate-600'
                                    }`}
                                >
                                    <span>Y/C TVBH</span>
                                    {pendingTransferRequests.length > 0 && (
                                        <span className="text-[9px] px-1 py-0.2 rounded-full bg-amber-500 text-white font-bold animate-pulse">
                                            {pendingTransferRequests.length}
                                        </span>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMobileDnxSubTab('history')}
                                    className={`flex-1 h-7 rounded-md text-[11px] font-semibold transition-all flex items-center justify-center gap-1 ${
                                        mobileDnxSubTab === 'history'
                                            ? 'bg-white text-slate-900 shadow-2xs font-bold'
                                            : 'text-slate-600'
                                    }`}
                                >
                                    <span>Phiếu Gần Đây</span>
                                </button>
                            </div>
                        </div>

                        <main className="flex-1 overflow-y-auto px-3 pt-1 pb-4 no-scrollbar">
                            {/* Panel 1: Form lập phiếu */}
                            {mobileDnxSubTab === 'create' && (
                                <form onSubmit={handleCreateDnxSubmitInAdmin} className="space-y-3">
                                    {/* Success notification */}
                                    {dnxResult && (
                                        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center justify-between gap-2 shadow-2xs">
                                            <div className="min-w-0">
                                                <div className="text-[12px] font-bold text-emerald-900 flex items-center gap-1">
                                                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                                                    <span>Đã lập: <strong className="font-mono text-blue-700">{dnxResult.so_ct}</strong></span>
                                                </div>
                                                <div className="text-[10px] text-emerald-700 mt-0.5">
                                                    Đã ghi nhận {dnxResult.total_cars || 1} xe lên CyberSoft
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setPrintTicketData(dnxResult)}
                                                className="px-3 py-1.5 bg-blue-600 text-white font-bold rounded-xl text-[11px] flex items-center gap-1 shadow-xs active:scale-95"
                                            >
                                                <Printer size={12} />
                                                <span>In Phiếu</span>
                                            </button>
                                        </div>
                                    )}

                                    {/* Error notification */}
                                    {dnxError && (
                                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-[11px] text-rose-700 flex items-start gap-1.5">
                                            <AlertCircle size={14} className="text-rose-500 shrink-0 mt-0.5" />
                                            <span>{dnxError}</span>
                                        </div>
                                    )}

                                    {/* Existing ticket warning */}
                                    {detectedExistingTicket && !bypassExistingTicket && (
                                        <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl text-[11px] text-amber-900 space-y-1.5">
                                            <div className="font-bold flex items-center gap-1">
                                                <Clock size={14} className="text-amber-600 shrink-0" />
                                                <span>Xe đã có phiếu: {detectedExistingTicket.so_ct}</span>
                                            </div>
                                            <p className="text-[10.5px] text-amber-800">
                                                Đã tồn tại phiếu trên CyberSoft. Nếu muốn lập phiếu mới đè lên, hãy tích chọn bên dưới.
                                            </p>
                                            <label className="flex items-center gap-2 pt-1 font-semibold cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={bypassExistingTicket}
                                                    onChange={e => setBypassExistingTicket(e.target.checked)}
                                                    className="w-4 h-4 rounded text-blue-600"
                                                />
                                                <span>Cho phép lập phiếu DNX mới</span>
                                            </label>
                                        </div>
                                    )}

                                    {/* Card: Nhập số VIN */}
                                    <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[12px] font-bold text-slate-800">
                                                Số VIN xe điều chuyển
                                            </label>
                                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                                {extractedVins.length} VIN
                                            </span>
                                        </div>
                                        <textarea
                                            rows={2}
                                            value={dnxVinInput}
                                            onChange={e => setDnxVinInput(e.target.value)}
                                            placeholder="Nhập hoặc dán 1 hoặc nhiều số VIN (phân cách bằng khoảng trắng, phẩy, xuống dòng)…"
                                            className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-mono font-semibold focus:border-blue-500 focus:outline-none"
                                        />
                                        {isLookingUpVin && (
                                            <div className="text-[10.5px] text-blue-600 font-semibold flex items-center gap-1 animate-pulse">
                                                <RotateCw size={11} className="animate-spin" />
                                                <span>Đang tra cứu kho thực tế trên CyberSoft...</span>
                                            </div>
                                        )}
                                        {detectedWarehouseName && !isLookingUpVin && (
                                            <div className="text-[10.5px] text-emerald-700 font-semibold flex items-center gap-1">
                                                <CheckCircle2 size={11} className="text-emerald-600" />
                                                <span>Vị trí hiện tại: <strong>{detectedWarehouseName}</strong></span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Card: Kho xuất & Kho nhận */}
                                    <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
                                        <div className="grid grid-cols-2 gap-2.5">
                                            <div>
                                                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                                                    Kho xuất
                                                </label>
                                                <select
                                                    value={dnxMaKhoXuat}
                                                    onChange={e => setDnxMaKhoXuat(e.target.value)}
                                                    className="w-full h-9 px-2 rounded-xl border border-slate-200 text-xs font-semibold focus:border-blue-500 bg-slate-50"
                                                >
                                                    <option value="K87">K87 (Kho xe Thuận An)</option>
                                                    <option value="K83">K83 (Kho PDI / Showroom)</option>
                                                    <option value="K65">K65 (Kho Bình Triệu)</option>
                                                    <option value="K61">K61 (Kho Quang Trung)</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                                                    Kho nhận
                                                </label>
                                                <select
                                                    value={dnxMaKhoNhan}
                                                    onChange={e => setDnxMaKhoNhan(e.target.value)}
                                                    className="w-full h-9 px-2 rounded-xl border border-slate-200 text-xs font-semibold focus:border-blue-500 bg-slate-50"
                                                >
                                                    <option value="K83">K83 (Kho PDI / Showroom)</option>
                                                    <option value="K87">K87 (Kho xe Thuận An)</option>
                                                    <option value="K65">K65 (Kho Bình Triệu)</option>
                                                    <option value="K61">K61 (Kho Quang Trung)</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-[11px] font-bold text-slate-700 block mb-1">
                                                Lý do điều chuyển
                                            </label>
                                            <input
                                                type="text"
                                                value={dnxLyDo}
                                                onChange={e => setDnxLyDo(e.target.value)}
                                                placeholder="Lý do điều chuyển…"
                                                className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs font-medium focus:border-blue-500"
                                            />
                                            {/* Quick pills */}
                                            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                                {[
                                                    'PDI giao KH',
                                                    'Điều chuyển kho K83',
                                                    'Trưng bày showroom'
                                                ].map(q => (
                                                    <button
                                                        key={q}
                                                        type="button"
                                                        onClick={() => setDnxLyDo(q)}
                                                        className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 active:scale-95"
                                                    >
                                                        {q}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Submit Button */}
                                    <button
                                        type="submit"
                                        disabled={isSubmittingDnx || extractedVins.length === 0}
                                        className={`w-full h-11 rounded-2xl text-[13px] font-bold text-white shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                                            isSubmittingDnx || extractedVins.length === 0
                                                ? 'bg-slate-300 cursor-not-allowed'
                                                : 'bg-[#007AFF] hover:bg-[#0066D6]'
                                        }`}
                                    >
                                        <Send size={15} />
                                        <span>{isSubmittingDnx ? 'Đang tạo phiếu lên Cyber...' : 'Tạo Phiếu Đề Nghị Xuất (DNX)'}</span>
                                    </button>
                                </form>
                            )}

                            {/* Panel 2: Yêu cầu từ TVBH */}
                            {mobileDnxSubTab === 'requests' && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between px-1">
                                        <span className="text-[12px] font-bold text-slate-700">
                                            Yêu cầu chờ duyệt ({pendingTransferRequests.length})
                                        </span>
                                        <button
                                            type="button"
                                            onClick={loadPendingTransferRequests}
                                            disabled={isLoadingTransferRequests}
                                            className="text-[11px] font-semibold text-[#007AFF] flex items-center gap-1"
                                        >
                                            <RotateCw size={11} className={isLoadingTransferRequests ? 'animate-spin' : ''} />
                                            <span>Làm mới</span>
                                        </button>
                                    </div>

                                    {pendingTransferRequests.length === 0 ? (
                                        <div className="py-16 text-center text-slate-400 text-xs">
                                            Không có yêu cầu chuyển xe nào đang chờ.
                                        </div>
                                    ) : (
                                        pendingTransferRequests.map(req => (
                                            <div
                                                key={req.id}
                                                className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-2"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="font-mono font-bold text-[13px] text-slate-900">{req.vin}</span>
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                                                        {req.consultantName}
                                                    </span>
                                                </div>

                                                <div className="text-[11px] text-slate-600 space-y-0.5">
                                                    <div>KH: <strong className="text-slate-800">{formatCustomerName(req.customerName)}</strong> • {req.carModel}</div>
                                                    <div className="text-[#007AFF] font-bold">
                                                        {formatShortWarehouseName(req.fromWarehouseName || req.fromWarehouse)} ➔ {formatShortWarehouseName(req.toWarehouseName || req.toWarehouse)}
                                                    </div>
                                                    <div className="italic text-slate-500 text-[10px]">"{req.reason}"</div>
                                                </div>

                                                <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRejectTransferRequest(req)}
                                                        className="px-3 py-1 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 active:scale-95"
                                                    >
                                                        Từ chối
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            handleApplyTransferRequest(req);
                                                            setMobileDnxSubTab('create');
                                                        }}
                                                        className="px-3.5 py-1 rounded-xl text-xs font-bold text-white bg-[#007AFF] shadow-xs active:scale-95"
                                                    >
                                                        Nạp form & Tạo
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {/* Panel 3: Phiếu gần đây */}
                            {mobileDnxSubTab === 'history' && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between px-1">
                                        <span className="text-[12px] font-bold text-slate-700">
                                            Phiếu DNX đã lập gần đây ({recentDnxTickets.length})
                                        </span>
                                        <button
                                            type="button"
                                            onClick={loadRecentDnxTickets}
                                            disabled={isLoadingRecentTickets}
                                            className="text-[11px] font-semibold text-[#007AFF] flex items-center gap-1"
                                        >
                                            <RotateCw size={11} className={isLoadingRecentTickets ? 'animate-spin' : ''} />
                                            <span>Làm mới</span>
                                        </button>
                                    </div>

                                    {recentDnxTickets.length === 0 ? (
                                        <div className="py-16 text-center text-slate-400 text-xs">
                                            Chưa có phiếu DNX nào được ghi nhận.
                                        </div>
                                    ) : (
                                        recentDnxTickets.map((t, idx) => {
                                            const isPost9 = String(t.ma_post) === '9';
                                            const isPost3 = String(t.ma_post) === '3';

                                            return (
                                                <div
                                                    key={idx}
                                                    className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-1.5"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono font-bold text-[13px] text-slate-900">{t.so_ct}</span>
                                                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                                                                isPost9
                                                                    ? 'bg-emerald-100 text-emerald-800'
                                                                    : isPost3
                                                                    ? 'bg-amber-100 text-amber-800'
                                                                    : 'bg-blue-100 text-blue-800'
                                                            }`}>
                                                                {isPost9 ? 'Đã duyệt' : isPost3 ? 'Chờ duyệt' : 'Ghi nhận'}
                                                            </span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => handlePrintFromRecentList(t)}
                                                            className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-xl text-[11px] font-bold flex items-center gap-1 active:scale-95"
                                                        >
                                                            <Printer size={12} />
                                                            <span>In</span>
                                                        </button>
                                                    </div>

                                                    <div className="text-[11px] text-slate-600">
                                                        <div>KH: <strong className="text-slate-800">{formatCustomerName(t.ten_kh || 'Chuyển nội bộ')}</strong></div>
                                                        <div className="flex items-center justify-between text-slate-500 text-[10px] mt-0.5">
                                                            <span className="font-mono">{t.vin || '—'}</span>
                                                            <span>{t.ngay_ct}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            )}
                        </main>
                    </>
                )}

                {/* ------------------------------------------------------------- */}
                {/* 3.5: SUB-TAB TIẾN TRÌNH PHIẾU (tra_cuu_phieu) */}
                {/* ------------------------------------------------------------- */}
                {activeSubTab === 'tra_cuu_phieu' && (
                    <>
                        {/* Secondary filter pills for vouchers */}
                        <div className="shrink-0 px-3 pt-1 pb-1 bg-[#F2F2F7]">
                            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-200/70">
                                {[
                                    { id: '', label: 'Tất cả' },
                                    { id: 'DNX', label: 'DNX' },
                                    { id: 'TD4', label: 'TD4' }
                                ].map(vt => (
                                    <button
                                        key={vt.id}
                                        type="button"
                                        onClick={() => setVoucherTypeFilter(vt.id)}
                                        className={`flex-1 h-7 rounded-md text-[11px] font-semibold transition-all flex items-center justify-center gap-1 ${
                                            voucherTypeFilter === vt.id
                                                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                                                : 'text-slate-600'
                                        }`}
                                    >
                                        <span>{vt.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <main className="flex-1 overflow-y-auto px-3 pt-1 pb-16 no-scrollbar">
                            {isLoadingTickets ? (
                                <div className="py-24 flex flex-col items-center justify-center text-center px-4">
                                    <div className="w-8 h-8 border-2 border-slate-800 border-t-transparent rounded-full animate-spin mb-3" />
                                    <p className="text-xs font-bold text-slate-700">Đang nạp danh sách phiếu DNX / TD4...</p>
                                </div>
                            ) : voucherTickets.length === 0 ? (
                                <div className="py-20 flex flex-col items-center justify-center text-center px-4">
                                    <div className="w-14 h-14 rounded-2xl bg-white text-slate-400 flex items-center justify-center mb-3 shadow-xs border border-slate-200">
                                        <FileText size={26} strokeWidth={1.8} />
                                    </div>
                                    <h3 className="text-sm font-bold text-slate-700">Không tìm thấy phiếu phù hợp</h3>
                                    <p className="text-xs text-slate-400 mt-1 max-w-xs">
                                        Thử thay đổi từ khóa tìm kiếm số phiếu, số VIN.
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
                                    {/* Table Header */}
                                    <div className="flex items-center px-3.5 py-1.5 bg-slate-100/75 border-b border-slate-200/80 text-[10.5px] font-bold text-slate-500 uppercase tracking-wider select-none">
                                        <div className="flex-1 min-w-0 pr-3 border-r border-slate-200/60">Chứng từ / Khách</div>
                                        <div className="flex-1 min-w-0 pl-3 pr-1">Xe / Trạng thái</div>
                                        <div className="w-3 shrink-0"></div>
                                    </div>

                                    {/* Table Body */}
                                    <div className="divide-y divide-slate-100">
                                        {voucherTickets.slice(0, 100).map((t, idx) => {
                                            const isDNX = t.voucher_type === 'DNX';
                                            const isPost9 = String(t.ma_post) === '9';
                                            const isPost3 = String(t.ma_post) === '3';
                                            const isPost1 = String(t.ma_post) === '1';

                                            return (
                                                <div
                                                    key={`${t.stt_rec}_${idx}`}
                                                    onClick={() => setSelectedTicketModal(t)}
                                                    className="flex min-h-[62px] cursor-pointer select-none items-center justify-between px-3.5 py-2.5 transition-colors hover:bg-slate-50/80 active:bg-slate-100/70"
                                                >
                                                    {/* CỘT 1: CHỨNG TỪ / KHÁCH */}
                                                    <div className="flex min-w-0 flex-1 flex-col justify-center space-y-0.5 self-stretch border-r border-slate-100/90 pr-3">
                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                            <span className="font-mono font-bold text-[13px] text-slate-900 truncate">
                                                                {t.so_ct}
                                                            </span>
                                                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                                                isDNX ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-800'
                                                            }`}>
                                                                {isDNX ? 'DNX' : 'TD4'}
                                                            </span>
                                                        </div>

                                                        <div className="text-[11px] text-slate-600 truncate" title={t.ten_kh}>
                                                            {formatCustomerName(t.ten_kh || 'Nội bộ')}
                                                        </div>
                                                    </div>

                                                    {/* CỘT 2: XE / TRẠNG THÁI */}
                                                    <div className="flex min-w-0 flex-1 flex-col justify-center space-y-0.5 self-stretch pl-3 pr-1">
                                                        <div className="font-mono text-[11px] font-bold text-slate-800 truncate">
                                                            {t.vin || '—'}
                                                        </div>

                                                        <div className="flex items-center gap-1 text-[10px]">
                                                            <span className={`px-2 py-0.2 rounded-full font-bold ${
                                                                isPost9
                                                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                                    : isPost3
                                                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                                                    : isPost1
                                                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                                                    : 'bg-slate-100 text-slate-600'
                                                            }`}>
                                                                {isPost9 ? 'Đã duyệt' : isPost3 ? 'Chờ duyệt' : isPost1 ? 'Đã hủy' : `Post ${t.ma_post}`}
                                                            </span>
                                                            <span className="text-slate-400 text-[9px]">{t.ngay_ct}</span>
                                                        </div>
                                                    </div>

                                                    {/* CỘT 3: CHEVRON */}
                                                    <div className="flex items-center justify-end shrink-0 pl-1 text-slate-300 w-3">
                                                        <ChevronRight size={13} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </main>

                        {/* Floating Bottom Dock */}
                        <div className="absolute inset-x-0 bottom-0 z-30 border-t border-black/[0.06] bg-white/92 px-3 py-2 backdrop-blur-2xl">
                            <div className="relative w-full">
                                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                                    <Search size={13} strokeWidth={2} />
                                </div>
                                <input
                                    type="text"
                                    value={voucherKeyword}
                                    onChange={e => setVoucherKeyword(e.target.value)}
                                    placeholder="Tìm số phiếu, số VIN, tên KH…"
                                    className="w-full h-[34px] pl-[30px] pr-[28px] rounded-xl bg-slate-100/90 focus:bg-white text-[11.5px] text-slate-800 placeholder-slate-400 border border-slate-200/80 focus:border-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-200 shadow-2xs transition-all font-sans"
                                />
                                {voucherKeyword && (
                                    <button
                                        type="button"
                                        onClick={() => setVoucherKeyword('')}
                                        className="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-400 hover:text-slate-600 active:scale-90"
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {/* ------------------------------------------------------------- */}
                {/* 3.6 & 3.7: BÃI XE (3 KHO) & ĐỐI SOÁT KHO (MOBILE-FIRST) */}
                {/* ------------------------------------------------------------- */}
                {activeSubTab === 'satellite_warehouses' && (
                    <MobileSatelliteWarehousesView
                        showToast={showToast}
                        allOrders={allOrders}
                        onNavigateToTab={navigateToTab}
                    />
                )}
                {activeSubTab.startsWith('reconcile') && (
                    <MobileReconcileK83View
                        showToast={showToast}
                        allOrders={allOrders}
                        onNavigateToTab={navigateToTab}
                    />
                )}
            </div>

            {/* ========================================================================= */}
            {/* 4. MODAL BOTTOM SHEETS FOR INSPECTION */}
            {/* ========================================================================= */}

            {/* 4.1: Chi tiết Xe Kế Hoạch */}
            {/* ========================================================================= */}
            {/* 4. APPLE BOTTOM SHEETS (CHI TIẾT & BỘ LỌC ĐỒNG BỘ 1-1) */}
            {/* ========================================================================= */}

            {/* 4.1: Chi tiết Xe Kế Hoạch */}
            {inspectedPlanCar && (
                <div className="fixed inset-0 z-50 flex flex-col justify-end">
                    <div
                        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
                        onClick={() => setInspectedPlanCar(null)}
                    />
                    <div className="relative z-10 w-full max-w-md mx-auto bg-white rounded-t-[24px] shadow-[0_-8px_30px_rgba(0,0,0,0.15)] flex flex-col max-h-[65dvh] animate-in slide-in-from-bottom duration-250 overflow-hidden">
                        <div className="pt-2 pb-0.5 flex justify-center">
                            <div className="w-8 h-1 rounded-full bg-slate-300" />
                        </div>

                        <div className="px-4 py-1.5 border-b border-black/[0.06] flex items-center justify-between">
                            <span className="w-8" />
                            <h3 className="text-[13.5px] font-bold text-slate-800 tracking-tight text-center flex-1">Chi Tiết Xe Kế Hoạch</h3>
                            <button
                                type="button"
                                onClick={() => setInspectedPlanCar(null)}
                                className="w-8 flex justify-end text-slate-400 hover:text-slate-700 active:scale-90"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 no-scrollbar text-xs">
                            <div className="flex justify-between py-1 border-b border-slate-50">
                                <span className="text-slate-500">Số VIN:</span>
                                <div className="flex items-center gap-1">
                                    <strong className="font-mono text-slate-900 select-all">{inspectedPlanCar.vin}</strong>
                                    <button
                                        type="button"
                                        onClick={() => onCopyVin(inspectedPlanCar.vin)}
                                        className="text-blue-600 p-0.5"
                                    >
                                        <Copy size={12} />
                                    </button>
                                </div>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-50">
                                <span className="text-slate-500">Dòng xe / Phiên bản:</span>
                                <strong className="text-slate-900">{inspectedPlanCar.dong_xe || inspectedPlanCar.ten_kx} {inspectedPlanCar.phien_ban ? `· ${inspectedPlanCar.phien_ban}` : ''}</strong>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-50">
                                <span className="text-slate-500">Ngoại thất / Nội thất:</span>
                                <span className="font-semibold text-slate-800">{inspectedPlanCar.ten_mau || inspectedPlanCar.ma_mau || '—'}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-50">
                                <span className="text-slate-500">Đơn vị nhận (TTCP):</span>
                                <span className="font-semibold text-blue-700">{inspectedPlanCar.ten_ttcp || inspectedPlanCar.ma_ttcp || '—'}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-50">
                                <span className="text-slate-500">Kho thực tế:</span>
                                <span className="font-bold text-emerald-700">{inspectedPlanCar.current_physical_warehouse || 'Đang vận tải'}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-50">
                                <span className="text-slate-500">Số máy:</span>
                                <span className="font-mono text-slate-700">{inspectedPlanCar.so_may || '—'}</span>
                            </div>
                            {inspectedPlanCar.ma_dms && (
                                <div className="flex justify-between py-1 border-b border-slate-50">
                                    <span className="text-slate-500">Mã DMS:</span>
                                    <span className="font-mono font-bold text-blue-600">{inspectedPlanCar.ma_dms}</span>
                                </div>
                            )}
                            {inspectedPlanCar.ghi_chu && (
                                <div className="py-1 text-slate-500">
                                    <span>Ghi chú: </span>
                                    <span className="italic text-slate-700">{inspectedPlanCar.ghi_chu}</span>
                                </div>
                            )}
                        </div>

                        <div className="p-3 border-t border-black/[0.06] bg-white">
                            <button
                                type="button"
                                onClick={() => {
                                    setDnxVinInput(inspectedPlanCar.vin);
                                    onSubTabChange('de_nghi_xuat');
                                    setMobileDnxSubTab('create');
                                    setInspectedPlanCar(null);
                                }}
                                className="w-full h-[38px] rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[13px] tracking-tight shadow-xs active:scale-[0.98] transition-all flex items-center justify-center space-x-1.5"
                            >
                                <Truck size={14} />
                                <span>Chuyển sang Lập Phiếu DNX</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 4.2: Chi tiết Xe Tồn Kho */}
            {inspectedTonKhoCar && (
                <div className="fixed inset-0 z-50 flex flex-col justify-end">
                    <div
                        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
                        onClick={() => setInspectedTonKhoCar(null)}
                    />
                    <div className="relative z-10 w-full max-w-md mx-auto bg-white rounded-t-[24px] shadow-[0_-8px_30px_rgba(0,0,0,0.15)] flex flex-col max-h-[65dvh] animate-in slide-in-from-bottom duration-250 overflow-hidden">
                        <div className="pt-2 pb-0.5 flex justify-center">
                            <div className="w-8 h-1 rounded-full bg-slate-300" />
                        </div>

                        <div className="px-4 py-1.5 border-b border-black/[0.06] flex items-center justify-between">
                            <span className="w-8" />
                            <h3 className="text-[13.5px] font-bold text-slate-800 tracking-tight text-center flex-1">Chi Tiết Xe Tồn Kho</h3>
                            <button
                                type="button"
                                onClick={() => setInspectedTonKhoCar(null)}
                                className="w-8 flex justify-end text-slate-400 hover:text-slate-700 active:scale-90"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 no-scrollbar text-xs">
                            <div className="flex justify-between py-1 border-b border-slate-50">
                                <span className="text-slate-500">Số VIN:</span>
                                <div className="flex items-center gap-1">
                                    <strong className="font-mono text-slate-900 select-all">{inspectedTonKhoCar.vin}</strong>
                                    <button
                                        type="button"
                                        onClick={() => onTonKhoCopyVin(inspectedTonKhoCar.vin)}
                                        className="text-blue-600 p-0.5"
                                    >
                                        <Copy size={12} />
                                    </button>
                                </div>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-50">
                                <span className="text-slate-500">Dòng xe / Màu:</span>
                                <strong className="text-slate-900">{inspectedTonKhoCar.ten_kx || inspectedTonKhoCar.ma_kx} · {inspectedTonKhoCar.ten_mau || '—'}</strong>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-50">
                                <span className="text-slate-500">Tên kho:</span>
                                <span className="font-bold text-emerald-700">{inspectedTonKhoCar.ten_kho || inspectedTonKhoCar.ma_kho}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-50">
                                <span className="text-slate-500">Tuổi tồn:</span>
                                <span className="font-bold text-blue-700">{inspectedTonKhoCar.tuoi_ton || 0} ngày</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-50">
                                <span className="text-slate-500">Trạng thái xuất HĐ:</span>
                                <span className="font-bold">{inspectedTonKhoCar.is_invoiced ? 'Đã xuất hóa đơn' : 'Chưa xuất hóa đơn'}</span>
                            </div>
                            {inspectedTonKhoCar.so_hd && (
                                <div className="flex justify-between py-1 border-b border-slate-50">
                                    <span className="text-slate-500">Số HĐ nhập:</span>
                                    <span className="font-mono text-slate-700">{inspectedTonKhoCar.so_hd}</span>
                                </div>
                            )}
                            {inspectedTonKhoCar.tvbh && (
                                <div className="flex justify-between py-1 border-b border-slate-50">
                                    <span className="text-slate-500">TVBH:</span>
                                    <span className="font-semibold text-slate-800">{inspectedTonKhoCar.tvbh}</span>
                                </div>
                            )}
                        </div>

                        <div className="p-3 border-t border-black/[0.06] bg-white">
                            <button
                                type="button"
                                onClick={() => {
                                    setDnxVinInput(inspectedTonKhoCar.vin);
                                    onSubTabChange('de_nghi_xuat');
                                    setMobileDnxSubTab('create');
                                    setInspectedTonKhoCar(null);
                                }}
                                className="w-full h-[38px] rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[13px] tracking-tight shadow-xs active:scale-[0.98] transition-all flex items-center justify-center space-x-1.5"
                            >
                                <Truck size={14} />
                                <span>Lập Phiếu Đề Nghị Xuất (DNX)</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 4.3: Chi tiết Hợp Đồng Xếp Xe */}
            {inspectedContract && (
                <div className="fixed inset-0 z-50 flex flex-col justify-end">
                    <div
                        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
                        onClick={() => setInspectedContract(null)}
                    />
                    <div className="relative z-10 w-full max-w-md mx-auto bg-white rounded-t-[24px] shadow-[0_-8px_30px_rgba(0,0,0,0.15)] flex flex-col max-h-[65dvh] animate-in slide-in-from-bottom duration-250 overflow-hidden">
                        <div className="pt-2 pb-0.5 flex justify-center">
                            <div className="w-8 h-1 rounded-full bg-slate-300" />
                        </div>

                        <div className="px-4 py-1.5 border-b border-black/[0.06] flex items-center justify-between">
                            <span className="w-8" />
                            <h3 className="text-[13.5px] font-bold text-slate-800 tracking-tight text-center flex-1">Chi Tiết Hợp Đồng Xếp Xe</h3>
                            <button
                                type="button"
                                onClick={() => setInspectedContract(null)}
                                className="w-8 flex justify-end text-slate-400 hover:text-slate-700 active:scale-90"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 no-scrollbar text-xs">
                            <div className="flex justify-between py-1 border-b border-slate-50">
                                <span className="text-slate-500">Khách hàng:</span>
                                <strong className="text-slate-900">{formatCustomerName(inspectedContract.ten_kh)}</strong>
                            </div>
                            {inspectedContract.dien_thoai && (
                                <div className="flex justify-between py-1 border-b border-slate-50">
                                    <span className="text-slate-500">Điện thoại:</span>
                                    <span className="font-mono text-slate-800">{inspectedContract.dien_thoai}</span>
                                </div>
                            )}
                            <div className="flex justify-between py-1 border-b border-slate-50">
                                <span className="text-slate-500">Số HĐ / Chứng từ:</span>
                                <span className="font-mono font-bold text-purple-700">{inspectedContract.ma_hd || inspectedContract.so_ct}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-50">
                                <span className="text-slate-500">Số khung (VIN):</span>
                                <div className="flex items-center gap-1">
                                    <span className="font-mono font-bold text-slate-900">{inspectedContract.so_khung || 'Chưa ghép'}</span>
                                    {inspectedContract.so_khung && (
                                        <button
                                            type="button"
                                            onClick={() => onXepXeCopyVin(inspectedContract.so_khung)}
                                            className="text-blue-600 p-0.5"
                                        >
                                            <Copy size={12} />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-50">
                                <span className="text-slate-500">Showroom xuất HĐ:</span>
                                <span className="font-bold text-purple-800">{inspectedContract.ten_ttcp || '—'}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-50">
                                <span className="text-slate-500">TVBH:</span>
                                <span className="font-semibold text-slate-800">{inspectedContract.ten_hs || '—'}</span>
                            </div>
                        </div>

                        <div className="p-3 border-t border-black/[0.06] bg-white">
                            <button
                                type="button"
                                onClick={() => setInspectedContract(null)}
                                className="w-full h-[38px] rounded-full bg-slate-800 hover:bg-slate-900 text-white font-semibold text-[13px] tracking-tight shadow-xs active:scale-[0.98] transition-all flex items-center justify-center"
                            >
                                <span>Đóng</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 4.4: Filter Sheet for Factory Plan */}
            {isFilterSheetOpen && (
                <div className="fixed inset-0 z-50 flex flex-col justify-end">
                    <div
                        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
                        onClick={() => setIsFilterSheetOpen(false)}
                    />

                    <div className="relative z-10 w-full max-w-md mx-auto bg-white rounded-t-[24px] shadow-[0_-8px_30px_rgba(0,0,0,0.15)] flex flex-col max-h-[55dvh] animate-in slide-in-from-bottom duration-250 overflow-hidden">
                        <div className="pt-2 pb-0.5 flex justify-center">
                            <div className="w-8 h-1 rounded-full bg-slate-300" />
                        </div>

                        <div className="px-4 py-1.5 border-b border-black/[0.06] flex items-center justify-between">
                            <div className="w-16 flex justify-start">
                                {activePlanFiltersCount > 0 ? (
                                    <button
                                        type="button"
                                        onClick={handleResetPlanFilters}
                                        className="text-[12.5px] font-medium text-slate-500 hover:text-slate-800 active:opacity-60 transition-opacity"
                                    >
                                        Đặt lại
                                    </button>
                                ) : (
                                    <span className="w-1" />
                                )}
                            </div>
                            <h3 className="text-[13.5px] font-bold text-slate-800 tracking-tight text-center flex-1">
                                Bộ Lọc Kế Hoạch
                            </h3>
                            <div className="w-16 flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => {
                                        executePlanSearch();
                                        setIsFilterSheetOpen(false);
                                    }}
                                    className="text-[13.5px] font-bold text-slate-700 hover:text-slate-900 active:opacity-60 transition-opacity"
                                >
                                    Xong
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 no-scrollbar">
                            {/* Dòng xe */}
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5 px-0.5">
                                    Dòng xe ({filterOptions.models.length})
                                </label>
                                <div className="flex flex-wrap gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => onModelChange('Tất cả')}
                                        className={`h-[26px] px-2.5 rounded-full text-[11px] flex items-center space-x-1 transition-all active:scale-95 border ${
                                            selectedModel === 'Tất cả'
                                                ? 'bg-slate-700 border-slate-700 text-white font-semibold shadow-2xs'
                                                : 'bg-slate-100/90 border-slate-200/80 text-slate-700 font-medium hover:bg-slate-200/70'
                                        }`}
                                    >
                                        Tất cả xe
                                    </button>
                                    {filterOptions.models.map(m => (
                                        <button
                                            key={m}
                                            type="button"
                                            onClick={() => onModelChange(m)}
                                            className={`h-[26px] px-2.5 rounded-full text-[11px] flex items-center space-x-1 transition-all active:scale-95 border ${
                                                selectedModel === m
                                                    ? 'bg-slate-700 border-slate-700 text-white font-semibold shadow-2xs'
                                                    : 'bg-slate-100/90 border-slate-200/80 text-slate-700 font-medium hover:bg-slate-200/70'
                                            }`}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Phiên bản */}
                            {filterOptions.versions.length > 0 && (
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5 px-0.5">
                                        Phiên bản ({filterOptions.versions.length})
                                    </label>
                                    <div className="flex flex-wrap gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedVersion('Tất cả')}
                                            className={`h-[26px] px-2.5 rounded-full text-[11px] flex items-center space-x-1 transition-all active:scale-95 border ${
                                                selectedVersion === 'Tất cả'
                                                    ? 'bg-slate-700 border-slate-700 text-white font-semibold shadow-2xs'
                                                    : 'bg-slate-100/90 border-slate-200/80 text-slate-700 font-medium hover:bg-slate-200/70'
                                            }`}
                                        >
                                            Tất cả bản
                                        </button>
                                        {filterOptions.versions.map(v => (
                                            <button
                                                key={v}
                                                type="button"
                                                onClick={() => setSelectedVersion(v)}
                                                className={`h-[26px] px-2.5 rounded-full text-[11px] flex items-center space-x-1 transition-all active:scale-95 border ${
                                                    selectedVersion === v
                                                        ? 'bg-slate-700 border-slate-700 text-white font-semibold shadow-2xs'
                                                        : 'bg-slate-100/90 border-slate-200/80 text-slate-700 font-medium hover:bg-slate-200/70'
                                                }`}
                                            >
                                                {v}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Màu ngoại thất */}
                            {filterOptions.colors.length > 0 && (
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5 px-0.5">
                                        Màu ngoại thất ({filterOptions.colors.length})
                                    </label>
                                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto no-scrollbar">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedColor('Tất cả')}
                                            className={`h-[26px] px-2.5 rounded-full text-[11px] flex items-center space-x-1 transition-all active:scale-95 border ${
                                                selectedColor === 'Tất cả'
                                                    ? 'bg-slate-700 border-slate-700 text-white font-semibold shadow-2xs'
                                                    : 'bg-slate-100/90 border-slate-200/80 text-slate-700 font-medium hover:bg-slate-200/70'
                                            }`}
                                        >
                                            Tất cả màu
                                        </button>
                                        {filterOptions.colors.map(c => (
                                            <button
                                                key={c}
                                                type="button"
                                                onClick={() => setSelectedColor(c)}
                                                className={`h-[26px] px-2.5 rounded-full text-[11px] flex items-center space-x-1 transition-all active:scale-95 border ${
                                                    selectedColor === c
                                                        ? 'bg-slate-700 border-slate-700 text-white font-semibold shadow-2xs'
                                                        : 'bg-slate-100/90 border-slate-200/80 text-slate-700 font-medium hover:bg-slate-200/70'
                                                }`}
                                            >
                                                {c}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Showroom nhận */}
                            {filterOptions.ttcp_list.length > 0 && (
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5 px-0.5">
                                        Showroom nhận ({filterOptions.ttcp_list.length})
                                    </label>
                                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto no-scrollbar">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedTtcp('')}
                                            className={`h-[26px] px-2.5 rounded-full text-[11px] flex items-center space-x-1 transition-all active:scale-95 border ${
                                                !selectedTtcp
                                                    ? 'bg-slate-700 border-slate-700 text-white font-semibold shadow-2xs'
                                                    : 'bg-slate-100/90 border-slate-200/80 text-slate-700 font-medium hover:bg-slate-200/70'
                                            }`}
                                        >
                                            Tất cả showroom
                                        </button>
                                        {filterOptions.ttcp_list.map(t => (
                                            <button
                                                key={t.code}
                                                type="button"
                                                onClick={() => setSelectedTtcp(t.code)}
                                                className={`h-[26px] px-2.5 rounded-full text-[11px] flex items-center space-x-1 transition-all active:scale-95 border max-w-[190px] truncate ${
                                                    selectedTtcp === t.code
                                                        ? 'bg-slate-700 border-slate-700 text-white font-semibold shadow-2xs'
                                                        : 'bg-slate-100/90 border-slate-200/80 text-slate-700 font-medium hover:bg-slate-200/70'
                                                }`}
                                            >
                                                <span className="truncate">{t.name} ({t.count})</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-3 border-t border-black/[0.06] bg-white">
                            <button
                                type="button"
                                onClick={() => {
                                    executePlanSearch();
                                    setIsFilterSheetOpen(false);
                                }}
                                className="w-full h-[38px] rounded-full bg-slate-700 hover:bg-slate-800 text-white font-semibold text-[13px] tracking-tight shadow-xs active:scale-[0.98] transition-all flex items-center justify-center space-x-1"
                            >
                                <span>Xem {displayedCars.length} Xe Kế Hoạch</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default React.memo(MobileCyberPlanView);
