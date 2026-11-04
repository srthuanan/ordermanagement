import React, { useState, useMemo, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { StockVehicle, StockSortConfig, Order, AdminSubView } from '../types';
import CarImage from './ui/CarImage';
import { includesNormalized } from '../utils/stringUtils';
import AdminCarEditModal from './modals/AdminCarEditModal';
import { SwapCarModal } from './modals/SwapCarModal';
import { autoSyncCyberLocationsIfNeeded, triggerDmsRadarSync } from '../services/api/stockService';
import DmsRadarResultModal, { DmsRadarScanResult } from './modals/DmsRadarResultModal';
import { getExteriorColorStyle, getExteriorSwatchColor } from '../utils/styleUtils';
import './stock/faceted-stock.css';
import { preloadRequestForm } from './modals/CreateRequestModal';

interface StockViewProps {
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    currentUser: string;
    isAdmin: boolean;
    onCreateRequestForVehicle: (vehicle: StockVehicle) => void;
    stockData: StockVehicle[];
    isLoading: boolean;
    error: string | null;
    refetchStock: (isSilent?: boolean) => void;
    highlightedVins: Set<string>;
    onHoldCar: (vin: string) => void;
    onReleaseCar: (vin: string) => void;
    onJoinQueue: (vin: string) => void;
    onLeaveQueue: (vin: string) => void;
    onOpenExtensionModal: (vehicle: StockVehicle) => void;
    processingVin: string | null;
    isSidebarCollapsed: boolean;
    allOrders: Order[];
    showOrderInAdmin?: (order: Order, targetTab: AdminSubView) => void;
    showAdminTab?: (targetTab: AdminSubView) => void;
    forcedSearch?: string;
    onClearForcedSearch?: () => void;
    queuedVins: string[];
    canHoldMore: boolean;
    onNavigateToInquiry: () => void;
    onViewCarOnMap?: (vin: string) => void;
    isReferenceAccount?: boolean;
}

const tone = (status?: string) => {
    if (status === 'Chưa ghép') return '#22a774';
    if (status === 'Đang giữ') return '#edae27';
    return '#3978d5';
};

export const isHoldInFinalTwentyMinutes = (vehicle: StockVehicle, now = Date.now()): boolean => {
    if (vehicle['Trạng thái'] !== 'Đang giữ') return false;
    const raw = String(vehicle['Thời Gian Hết Hạn Giữ'] || vehicle.thoi_gian_het_han_giu || '').trim();
    // Legacy timestamps are showroom local time; ISO timestamps retain their offset.
    const local = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
    const expiry = Date.parse(local
        ? `${local[3]}-${local[2]}-${local[1]}T${local[4]}:${local[5]}:${local[6] || '00'}+07:00`
        : raw);
    const remaining = expiry - now;
    return Number.isFinite(expiry) && remaining > 0 && remaining <= 20 * 60 * 1000;
};

const StockView: React.FC<StockViewProps> = ({
    showToast,
    currentUser,
    isAdmin,
    onCreateRequestForVehicle,
    stockData,
    isLoading,
    error,
    refetchStock,
    highlightedVins: _highlightedVins,
    onHoldCar,
    onReleaseCar,
    onJoinQueue,
    onLeaveQueue,
    onOpenExtensionModal,
    processingVin,
    allOrders,
    showOrderInAdmin,
    showAdminTab,
    forcedSearch,
    onClearForcedSearch,
    queuedVins,
    canHoldMore,
    onNavigateToInquiry,
    onViewCarOnMap: _onViewCarOnMap,
    isReferenceAccount
}) => {
    useEffect(() => {
        void preloadRequestForm().catch(error => console.warn('[Stock] Form preload failed:', error));
    }, []);
    // Selected vehicle for Mẫu 36 Slide-In Drawer
    const [selectedDrawerVehicle, setSelectedDrawerVehicle] = useState<StockVehicle | null>(null);
    const [selectedSwapVehicle, setSelectedSwapVehicle] = useState<StockVehicle | null>(null);
    const [copiedValue, setCopiedValue] = useState<string | null>(null);
    const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [holdClock, setHoldClock] = useState(Date.now());
    useEffect(() => {
        const timer = setInterval(() => setHoldClock(Date.now()), 10000);
        return () => clearInterval(timer);
    }, []);
    useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current); }, []);
    const copyStockValue = async (label: string, value: string, key: string) => {
        if (!value || value === '—') return;
        try {
            await navigator.clipboard.writeText(value);
            if (copyTimer.current) clearTimeout(copyTimer.current);
            setCopiedValue(key);
            copyTimer.current = setTimeout(() => setCopiedValue(null), 2000);
        } catch {
            showToast('Không thể sao chép', `Vui lòng thử lại để sao chép ${label.toLowerCase()}.`, 'error', 3000);
        }
    };

    // Mẫu 36 Faceted Filters
    const [fModel, setFModel] = useState<string>('');
    const [fStatus, setFStatus] = useState<string>('');
    const [fLoc, setFLoc] = useState<string>('');
    const [keyword, setKeyword] = useState<string>('');
    const lastForcedSearchRef = useRef<string | null>(null);

    // Handle external forced search (notifications, global search) - consume once
    useEffect(() => {
        if (forcedSearch && forcedSearch !== lastForcedSearchRef.current) {
            lastForcedSearchRef.current = forcedSearch;
            setKeyword(forcedSearch);
            setFModel('');
            setFStatus('');
            setFLoc('');
            setVisibleCount(30);
            onClearForcedSearch?.();
        }
    }, [forcedSearch, onClearForcedSearch]);

    // Admin Modals State
    const [adminEditVehicle, setAdminEditVehicle] = useState<StockVehicle | null>(null);
    const [isSyncingRadar, setIsSyncingRadar] = useState(false);
    const [dmsRadarResult, setDmsRadarResult] = useState<DmsRadarScanResult | null>(null);
    const [isRadarModalOpen, setIsRadarModalOpen] = useState(false);

    const handleOpenAdminEdit = (vehicle: StockVehicle) => {
        setAdminEditVehicle(vehicle);
        setSelectedDrawerVehicle(null);
    };

    const handleTriggerDmsRadar = async () => {
        if (isSyncingRadar) return;
        setIsSyncingRadar(true);
        showToast('VinFast DMS Radar', 'Đang quét toàn bộ kho xe từ VinFast DMS OData (khoảng 10 giây)...', 'loading', 20000);
        try {
            const res = await triggerDmsRadarSync(true, true);
            if (res.success) {
                setDmsRadarResult(res as DmsRadarScanResult);
                setIsRadarModalOpen(true);
                showToast(
                    'DMS Radar Hoàn Tất',
                    res.message || `Đã cập nhật ${res.summary?.updated_count || 0} xe và ${res.summary?.gps_count || 0} tọa độ GPS!`,
                    'success',
                    5000
                );
                refetchStock(true);
            } else {
                showToast('Lỗi DMS Radar', res.error || 'Không thể đồng bộ dữ liệu từ DMS', 'error', 6000);
            }
        } catch (err: any) {
            showToast('Lỗi DMS Radar', err.message || 'Lỗi kết nối khi quét DMS', 'error', 6000);
        } finally {
            setIsSyncingRadar(false);
        }
    };

    // Auto sync CyberSoft location ngầm
    useEffect(() => {
        let isMounted = true;
        autoSyncCyberLocationsIfNeeded(false).then(res => {
            if (!isMounted) return;
            if (res.triggered && res.result?.changed_count > 0) {
                showToast(
                    'Vị trí kho xe',
                    `Đã tự động cập nhật vị trí mới cho ${res.result.changed_count} xe từ CyberSoft!`,
                    'info',
                    4000
                );
            }
        });
        return () => { isMounted = false; };
    }, [showToast]);

    // Unique filter options
    const models = useMemo(() => {
        return ['', ...new Set(stockData.map(c => c["Dòng xe"]).filter((v): v is string => !!v))].sort();
    }, [stockData]);

    const statuses = useMemo(() => {
        return ['', 'Chưa ghép', 'Đang giữ', 'Đã ghép'];
    }, []);

    const locations = useMemo(() => {
        return ['', ...new Set(stockData.map(c => c["Vị trí"]).filter((v): v is string => !!(v && v.trim() !== '')))].sort();
    }, [stockData]);

    const stockStreamRef = useRef<HTMLElement | null>(null);
    const stockOrderRef = useRef(new Map<string, number>());
    const pinnedVehiclesRef = useRef({ filterKey: '', vins: new Set<string>() });
    const stockPositionRef = useRef<{ vin: string; filterKey: string; offset: number } | null>(null);
    const stockFilterKey = JSON.stringify([fModel, fStatus, fLoc, keyword.trim().toLowerCase()]);

    const orderedStock = useMemo(() => {
        for (const car of stockData) {
            if (!stockOrderRef.current.has(car.VIN)) {
                stockOrderRef.current.set(car.VIN, stockOrderRef.current.size);
            }
        }
        return [...stockData].sort((a, b) => stockOrderRef.current.get(a.VIN)! - stockOrderRef.current.get(b.VIN)!);
    }, [stockData]);

    const rememberStockPosition = (vin: string) => {
        if (pinnedVehiclesRef.current.filterKey !== stockFilterKey) {
            pinnedVehiclesRef.current = { filterKey: stockFilterKey, vins: new Set() };
        }
        pinnedVehiclesRef.current.vins.add(vin);
        const stream = stockStreamRef.current;
        const card = stream && Array.from(stream.querySelectorAll<HTMLElement>('[data-stock-vin]'))
            .find(element => element.dataset.stockVin === vin);
        if (stream && card) {
            stockPositionRef.current = { vin, filterKey: stockFilterKey, offset: card.getBoundingClientRect().top - stream.getBoundingClientRect().top };
        }
    };

    const rememberStockScroll = () => {
        const position = stockPositionRef.current;
        const stream = stockStreamRef.current;
        if (!position || !stream || position.filterKey !== stockFilterKey) return;
        const card = Array.from(stream.querySelectorAll<HTMLElement>('[data-stock-vin]'))
            .find(element => element.dataset.stockVin === position.vin);
        if (card) position.offset = card.getBoundingClientRect().top - stream.getBoundingClientRect().top;
    };

    useLayoutEffect(() => {
        const position = stockPositionRef.current;
        if (!position || position.filterKey !== stockFilterKey) {
            stockPositionRef.current = null;
            if (pinnedVehiclesRef.current.filterKey !== stockFilterKey) {
                pinnedVehiclesRef.current = { filterKey: stockFilterKey, vins: new Set() };
            }
            return;
        }
        const stream = stockStreamRef.current;
        const card = stream && Array.from(stream.querySelectorAll<HTMLElement>('[data-stock-vin]'))
            .find(element => element.dataset.stockVin === position.vin);
        if (stream && card) {
            stream.scrollTop += card.getBoundingClientRect().top - stream.getBoundingClientRect().top - position.offset;
        }
    });

    // Keep acted-on vehicles visible until the user changes the filters.
    const baseVehicles = useMemo(() => {
        return orderedStock.filter(c => {
            if (pinnedVehiclesRef.current.filterKey === stockFilterKey && pinnedVehiclesRef.current.vins.has(c.VIN)) return true;
            const matchM = !fModel || c["Dòng xe"] === fModel;
            const matchS = !fStatus || (
                fStatus === 'Đã ghép'
                    ? (c["Trạng thái"] === 'Đã ghép' || (!['Chưa ghép', 'Đang giữ'].includes(c["Trạng thái"])))
                    : c["Trạng thái"] === fStatus
            );
            const matchL = !fLoc || c["Vị trí"] === fLoc;

            let matchKw = true;
            if (keyword.trim()) {
                const q = keyword.toLowerCase().trim();
                matchKw = (
                    includesNormalized(c.VIN, q) ||
                    includesNormalized(c["Dòng xe"], q) ||
                    includesNormalized(c["Phiên bản"], q) ||
                    includesNormalized(c["Ngoại thất"], q) ||
                    includesNormalized(c["Nội thất"], q) ||
                    includesNormalized(c["Vị trí"], q) ||
                    includesNormalized(c["Người Giữ Xe"], q) ||
                    includesNormalized(c["Mã DMS"], q) ||
                    includesNormalized((c as any).ma_dms, q) ||
                    includesNormalized(c["Số máy"], q) ||
                    includesNormalized((c as any).so_may, q) ||
                    includesNormalized(c["Số COC"], q) ||
                    includesNormalized((c as any).so_coc, q)
                );
            }

            return matchM && matchS && matchL && matchKw;
        });
    }, [orderedStock, stockFilterKey, fModel, fStatus, fLoc, keyword]);

    // Batch infinite scroll
    const [visibleCount, setVisibleCount] = useState(30);
    const loadMoreRef = useRef<HTMLDivElement>(null);

    const visibleVehicles = useMemo(() => {
        return baseVehicles.slice(0, visibleCount);
    }, [baseVehicles, visibleCount]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && visibleCount < baseVehicles.length) {
                    setVisibleCount(prev => Math.min(prev + 30, baseVehicles.length));
                }
            },
            { threshold: 0.1, rootMargin: '150px' }
        );

        if (loadMoreRef.current) {
            observer.observe(loadMoreRef.current);
        }

        return () => {
            if (loadMoreRef.current) observer.unobserve(loadMoreRef.current);
        };
    }, [visibleCount, baseVehicles.length]);

    const handleClearAllFacets = () => {
        setFModel('');
        setFStatus('');
        setFLoc('');
        setKeyword('');
        lastForcedSearchRef.current = '';
        setVisibleCount(30);
        onClearForcedSearch?.();
    };

    const hasActiveFacets = Boolean(fModel || fStatus || fLoc || keyword);

    // Swap car check
    const userOrders = useMemo(() => {
        return (allOrders || []).filter(o => {
            const tvbhName = (
                o["Tên tư vấn bán hàng"] ||
                o["Tên TVBH"] ||
                o.ten_tu_van_ban_hang ||
                ''
            ).toString().trim().toLowerCase();
            return tvbhName === (currentUser || '').trim().toLowerCase();
        });
    }, [allOrders, currentUser]);

    const canSwapCar = useCallback((c: StockVehicle) => {
        if (!userOrders || userOrders.length === 0) return false;
        const holder = (c["Người Giữ Xe"] || (c as any).nguoi_giu_xe || '').toString().trim();
        if (!holder || holder.toLowerCase() === (currentUser || '').toLowerCase()) return false;
        if (c["Trạng thái"] !== 'Đã ghép' && c["Trạng thái"] !== 'Đang giữ') return false;

        const tModel = (c["Dòng xe"] || '').trim().toLowerCase();
        const tVer = (c["Phiên bản"] || '').trim().toLowerCase();
        const tExt = (c["Ngoại thất"] || '').trim().toLowerCase();
        const tInt = (c["Nội thất"] || '').trim().toLowerCase();

        return userOrders.some((o: any) => {
            const oStatus = (o["Kết quả"] || '').toLowerCase();
            if (oStatus.includes('đã xuất hóa đơn') || oStatus.includes('hủy')) return false;
            return (
                (o["Dòng xe"] || '').trim().toLowerCase() === tModel &&
                (o["Phiên bản"] || '').trim().toLowerCase() === tVer &&
                (o["Ngoại thất"] || '').trim().toLowerCase() === tExt &&
                (o["Nội thất"] || '').trim().toLowerCase() === tInt
            );
        });
    }, [userOrders, currentUser]);

    const renderActionButtons = (c: StockVehicle) => {
        if (isReferenceAccount) {
            return <span style={{ fontSize: '10px', color: '#8aa0bc' }}>Chỉ xem</span>;
        }

        if (processingVin === c.VIN) {
            return <button type="button" className="cmd-btn" disabled aria-busy="true">Đang xử lý…</button>;
        }

        const isMine = (c["Người Giữ Xe"] || '').trim().toLowerCase() === (currentUser || '').trim().toLowerCase();
        const isQueued = queuedVins?.some(v => v?.toUpperCase() === c.VIN?.toUpperCase());

        const adminActions = isAdmin ? (
            <button
                type="button"
                className="cmd-btn"
                onClick={(e) => {
                    e.stopPropagation();
                    handleOpenAdminEdit(c);
                }}
                title="Quản trị xe (Sửa / Xóa xe)"
            >
                Sửa
            </button>
        ) : null;

        if (c["Trạng thái"] === 'Chưa ghép') {
            return (
                <>
                    <button
                        type="button"
                        className="cmd-btn primary"
                        onClick={(e) => {
                            e.stopPropagation();
                            onHoldCar(c.VIN);
                        }}
                        disabled={!canHoldMore}
                        title={canHoldMore ? 'Giữ xe trong 24 giờ' : 'Bạn đã hết lượt giữ xe'}
                    >
                        {canHoldMore ? 'Giữ' : 'Hết lượt'}
                    </button>
                    {adminActions}
                </>
            );
        }

        if (c["Trạng thái"] === 'Đang giữ' && isMine) {
            return (
                <>
                    {isHoldInFinalTwentyMinutes(c, holdClock) && <button
                        type="button"
                        className="cmd-btn warning"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (!isHoldInFinalTwentyMinutes(c)) return;
                            onOpenExtensionModal(c);
                        }}
                        title="Xin gia hạn giữ xe thêm 24 giờ"
                    >
                        Gia hạn
                    </button>}
                    <button
                        type="button"
                        className="cmd-btn danger"
                        onClick={(e) => {
                            e.stopPropagation();
                            onReleaseCar(c.VIN);
                        }}
                        title="Hủy giữ xe (nhả xe về kho)"
                    >
                        Hủy
                    </button>
                    <button
                        type="button"
                        className="cmd-btn primary"
                        onClick={(e) => {
                            e.stopPropagation();
                            onCreateRequestForVehicle(c);
                        }}
                        title="Tạo đơn hàng ghép xe này"
                    >
                        Ghép
                    </button>
                    {adminActions}
                </>
            );
        }

        if (c["Trạng thái"] === 'Đang giữ' && !isMine) {
            return (
                <>
                    {isQueued ? (
                        <button
                            type="button"
                            className="cmd-btn danger"
                            onClick={(e) => {
                                e.stopPropagation();
                                onLeaveQueue(c.VIN);
                            }}
                            title="Hủy đăng ký chờ xe"
                        >
                            Hủy chờ
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="cmd-btn warning"
                            onClick={(e) => {
                                e.stopPropagation();
                                onJoinQueue(c.VIN);
                            }}
                            title="Đăng ký chờ khi xe được nhả"
                        >
                            Chờ
                        </button>
                    )}
                    {canSwapCar(c) && (
                        <button
                            type="button"
                            className="cmd-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSwapVehicle(c);
                            }}
                            title="Đổi xe cùng cấu hình"
                        >
                            Đổi xe
                        </button>
                    )}
                    {isAdmin && (
                        <button
                            type="button"
                            className="cmd-btn danger"
                            onClick={(e) => {
                                e.stopPropagation();
                                onReleaseCar(c.VIN);
                            }}
                            title="Admin hủy giữ xe"
                        >
                            Hủy
                        </button>
                    )}
                    {adminActions}
                </>
            );
        }

        if (c["Trạng thái"] === 'Đã ghép') {
            return adminActions;
        }

        return adminActions;
    };

    const renderCompactActions = (vehicle: StockVehicle) => {
        const flatten = (nodes: React.ReactNode): React.ReactNode[] => React.Children.toArray(nodes).flatMap(node =>
            React.isValidElement<{ children?: React.ReactNode }>(node) && node.type === React.Fragment
                ? flatten(node.props.children) : [node]
        );
        const actions = flatten(renderActionButtons(vehicle));
        if (actions.length <= 2) return actions;
        const mainIndex = actions.findIndex(action => React.isValidElement<{ children?: React.ReactNode }>(action) && action.props.children === 'Ghép');
        const primary = mainIndex >= 0 ? mainIndex : 0;
        return <>
            {actions[primary]}
            <details className="cmd-action-menu" onClick={event => {
                event.stopPropagation();
                if ((event.target as HTMLElement).closest('button')) event.currentTarget.open = false;
            }}>
                <summary aria-label="Thao tác khác" title="Thao tác khác">⋯</summary>
                <div className="cmd-action-menu-items">{actions.filter((_, index) => index !== primary)}</div>
            </details>
        </>;
    };

    if (error) {
        return (
            <div className="cmd-root" style={{ alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
                <p style={{ color: '#b44f62', fontWeight: 600 }}>Không thể tải dữ liệu kho xe: {error}</p>
                <button type="button" className="cmd-btn primary" onClick={() => refetchStock()}>
                    Thử lại
                </button>
            </div>
        );
    }

    return (
        <div className="cmd-root">
            {/* Left Sidebar: 100% Đồng bộ kiến trúc với Tab Đơn Hàng */}
            <aside className="cmd-sidebar" id="cmd-sidebar">
                {/* Header trong Sidebar */}
                <div className="cmd-sidebar-head">
                    <h1>Kho xe <span>{stockData.length}</span></h1>
                    <div className="cmd-sidebar-actions">
                        {isAdmin && (
                            <button
                                type="button"
                                onClick={handleTriggerDmsRadar}
                                disabled={isSyncingRadar}
                                title="Quét DMS Radar"
                                className="cmd-icon-btn"
                            >
                                <i className={`fa-solid ${isSyncingRadar ? 'fa-circle-notch fa-spin' : 'fa-radar'}`}></i>
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => refetchStock(true)}
                            disabled={isLoading}
                            title="Làm mới kho xe"
                            className="cmd-icon-btn"
                        >
                            <i className={`fa-solid ${isLoading ? 'fa-circle-notch fa-spin' : 'fa-rotate'}`}></i>
                        </button>
                    </div>
                </div>

                {/* Ô tìm kiếm chuẩn Tab Đơn Hàng */}
                <div className="cmd-search-wrap">
                    <label className="cmd-search-label">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 21l-5-5 M18 10a8 8 0 1 0-16 0 8 8 0 0 0 16 0" />
                        </svg>
                        <input
                            value={keyword}
                            onChange={(e) => {
                                setKeyword(e.target.value);
                                setVisibleCount(30);
                            }}
                            placeholder="Tìm VIN, dòng xe, số máy, DMS…"
                        />
                        {keyword && (
                            <button
                                type="button"
                                onClick={() => {
                                    setKeyword('');
                                    lastForcedSearchRef.current = '';
                                    onClearForcedSearch?.();
                                }}
                                className="cmd-clear-btn"
                                title="Xóa tìm kiếm"
                            >
                                ✕
                            </button>
                        )}
                    </label>
                </div>

                {/* Tổng kết bộ lọc & Xóa bộ lọc chuẩn Tab Đơn Hàng */}
                {hasActiveFacets && (
                    <div className="cmd-filter-summary">
                        <span>{baseVehicles.length} xe phù hợp</span>
                        <button type="button" onClick={handleClearAllFacets}>Xóa bộ lọc</button>
                    </div>
                )}

                {/* Cuộn danh sách Facets */}
                <div className="cmd-facets-scroll">
                    {/* Facet Group 1: Trạng thái ghép xe */}
                    <div className="facet-group">
                        <strong>Trạng thái ghép xe</strong>
                        <div className="facet-btn-list">
                            {statuses.map(s => {
                                const count = s
                                    ? stockData.filter(c => s === 'Đã ghép' ? (c["Trạng thái"] === 'Đã ghép' || (!['Chưa ghép', 'Đang giữ'].includes(c["Trạng thái"]))) : c["Trạng thái"] === s).length
                                    : stockData.length;
                                return (
                                    <button
                                        key={s}
                                        type="button"
                                        className={`facet-item ${fStatus === s ? 'active' : ''}`}
                                        onClick={() => {
                                            setFStatus(fStatus === s ? '' : s);
                                            setVisibleCount(30);
                                        }}
                                    >
                                        <span>{s || 'Tất cả trạng thái'}</span>
                                        <small>{count}</small>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Facet Group 2: Dòng xe VinFast */}
                    <div className="facet-group">
                        <strong>Dòng xe VinFast</strong>
                        <div className="facet-btn-list">
                            {models.map(m => {
                                const count = m
                                    ? stockData.filter(c => c["Dòng xe"] === m).length
                                    : stockData.length;
                                return (
                                    <button
                                        key={m}
                                        type="button"
                                        className={`facet-item ${fModel === m ? 'active' : ''}`}
                                        onClick={() => {
                                            setFModel(fModel === m ? '' : m);
                                            setVisibleCount(30);
                                        }}
                                    >
                                        <span>{m || 'Tất cả dòng xe'}</span>
                                        <small>{count}</small>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Facet Group 3: Vị trí kho bãi */}
                    <div className="facet-group">
                        <strong>Vị trí kho bãi</strong>
                        <div className="facet-btn-list">
                            {locations.map(l => {
                                const count = l
                                    ? stockData.filter(c => c["Vị trí"] === l).length
                                    : stockData.length;
                                return (
                                    <button
                                        key={l}
                                        type="button"
                                        className={`facet-item ${fLoc === l ? 'active' : ''}`}
                                        onClick={() => {
                                            setFLoc(fLoc === l ? '' : l);
                                            setVisibleCount(30);
                                        }}
                                    >
                                        <span>📍 {l || 'Tất cả kho'}</span>
                                        <small>{count}</small>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

            </aside>

            {/* Right Stream: 100% Đồng bộ kiến trúc với Tab Đơn Hàng */}
            <div className="cmd-content-col">
                <div className="cmd-stream-fixed-spacer" aria-hidden="true" />
                <main className="cmd-stream" id="cmd-stream" ref={stockStreamRef} onScroll={rememberStockScroll}>
                    {visibleVehicles.map(c => {
                        const paint = getExteriorSwatchColor(c["Ngoại thất"]);
                        const holder = (c["Người Giữ Xe"] || '').trim();

                        return (
                            <article
                                key={c.VIN}
                                className="cmd-card"
                                data-stock-vin={c.VIN}
                                onClick={(event) => {
                                    if ((event.target as HTMLElement).closest('button')) return;
                                    setSelectedDrawerVehicle(c);
                                }}
                                onClickCapture={(event) => {
                                    if ((event.target as HTMLElement).closest('button')) rememberStockPosition(c.VIN);
                                }}
                            >
                                <div className="cmd-card-header">
                                    <div className="cmd-card-model">
                                        <strong>{c["Dòng xe"]}</strong>
                                        <span className="cmd-card-version" title={c["Phiên bản"] || 'Tiêu chuẩn'}>
                                            {c["Phiên bản"] || 'Tiêu chuẩn'}
                                        </span>
                                    </div>
                                    <div className="cmd-card-state">
                                        <span className="cmd-status" style={{ '--tone': tone(c["Trạng thái"]) } as React.CSSProperties}>
                                            {c["Trạng thái"]}
                                        </span>
                                        {holder && <span className="cmd-card-holder-name" title={`Người giữ: ${holder}`}>{holder}</span>}
                                    </div>
                                </div>
                                <div className="cmd-card-thumb">
                                    <CarImage
                                        model={c["Dòng xe"]}
                                        exteriorColor={c["Ngoại thất"]}
                                        version={c["Phiên bản"]}
                                        alt={c["Dòng xe"]}
                                    />
                                </div>
                                <div className="cmd-card-content">
                                    <div className="cmd-card-identity">
                                        <button
                                            type="button"
                                            className="cmd-card-vin"
                                            onClick={() => void copyStockValue('Số VIN', c.VIN, `${c.VIN}:vin`)}
                                            title="Bấm để sao chép số VIN"
                                            aria-label={`Sao chép số VIN ${c.VIN}`}
                                            data-copied={copiedValue === `${c.VIN}:vin`}
                                        >
                                            {c.VIN}
                                            <span className="cmd-copy-indicator" aria-live="polite">{copiedValue === `${c.VIN}:vin` ? '✓' : '⧉'}</span>
                                        </button>
                                    </div>
                                    <div className="cmd-card-meta">
                                        <span className="cmd-card-color" title={`${c["Ngoại thất"] || '—'} / ${c["Nội thất"] || '—'}`}>
                                            <i className="cmd-swatch" style={{ background: paint }} aria-hidden="true"></i>
                                            <span className="cmd-card-meta-text"><span className="cmd-card-label">Màu sắc</span><span>
                                                {c["Ngoại thất"] || '—'}
                                                {c["Nội thất"] && <span className="cmd-card-interior"> / {c["Nội thất"]}</span>}
                                            </span></span>
                                        </span>
                                        <span className="cmd-card-location" title={c["Vị trí"] || 'Chưa có vị trí'}>
                                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                                                <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" />
                                                <circle cx="12" cy="10" r="2.5" />
                                            </svg>
                                            <span className="cmd-card-meta-text"><span className="cmd-card-label">Địa điểm</span><span>{c["Vị trí"] || '—'}</span></span>
                                        </span>
                                    </div>
                                </div>
                                <div className="cmd-card-footer">
                                    <div className="cmd-card-specs">
                                        <div><span className="cmd-card-label">DMS</span><span>{c["Mã DMS"] || (c as any).ma_dms || '—'}</span></div>
                                        <div><span className="cmd-card-label">Số máy</span><button
                                            type="button"
                                            className="cmd-card-engine"
                                            disabled={!(c["Số máy"] || (c as any).so_may)}
                                            onClick={() => void copyStockValue('Số máy', c["Số máy"] || (c as any).so_may, `${c.VIN}:engine`)}
                                            title="Bấm để sao chép số máy"
                                            aria-label={`Sao chép số máy ${c["Số máy"] || (c as any).so_may || ''}`}
                                            data-copied={copiedValue === `${c.VIN}:engine`}
                                        >{c["Số máy"] || (c as any).so_may || '—'}<span className="cmd-copy-indicator" aria-live="polite">{copiedValue === `${c.VIN}:engine` ? '✓' : '⧉'}</span></button></div>
                                    </div>
                                    <div className="cmd-actions">
                                        {renderCompactActions(c)}
                                    </div>
                                </div>
                            </article>
                        );
                    })}

                    {visibleVehicles.length === 0 && (
                        <div style={{ padding: '35px', color: '#879bb5', fontSize: '12px', gridColumn: '1 / -1', textAlign: 'center' }}>
                            Không tìm thấy xe phù hợp tổ hợp bộ lọc đã chọn.
                        </div>
                    )}

                    {/* Infinite Scroll Trigger */}
                    {visibleCount < baseVehicles.length && (
                        <div ref={loadMoreRef} style={{ height: '30px', gridColumn: '1 / -1', textAlign: 'center', padding: '10px' }}>
                            <span style={{ fontSize: '11px', color: '#8aa0bc' }}>Đang tải thêm xe...</span>
                        </div>
                    )}
                </main>
            </div>

            {/* Slide-In Detail Drawer: 100% Mẫu 36 */}
            {selectedDrawerVehicle && (
                <div className="cmd-drawer-overlay" onClick={() => setSelectedDrawerVehicle(null)}>
                    <section
                        className="cmd-drawer"
                        role="dialog"
                        aria-modal="true"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <header className="cmd-drawer-head">
                            <div>
                                <h2>{selectedDrawerVehicle["Dòng xe"]} · Chi tiết VIN</h2>
                                <p>{selectedDrawerVehicle.VIN} · {selectedDrawerVehicle["Vị trí"] || 'Kho Thuận An'}</p>
                            </div>
                            <button
                                type="button"
                                className="cmd-drawer-close"
                                onClick={() => setSelectedDrawerVehicle(null)}
                                aria-label="Đóng"
                            >
                                ×
                            </button>
                        </header>

                        {/* Drawer Hero */}
                        <div className="cmd-drawer-hero">
                            <CarImage
                                model={selectedDrawerVehicle["Dòng xe"]}
                                exteriorColor={selectedDrawerVehicle["Ngoại thất"]}
                                version={selectedDrawerVehicle["Phiên bản"]}
                                alt={selectedDrawerVehicle["Dòng xe"]}
                            />
                            <div className="cmd-drawer-hero-info">
                                <h3>
                                    {selectedDrawerVehicle["Dòng xe"]}
                                    <small>{selectedDrawerVehicle["Phiên bản"] || 'Tiêu chuẩn'}</small>
                                </h3>
                                <p style={{ display: 'flex', alignItems: 'center' }}>
                                    <i
                                        className="cmd-swatch"
                                        style={{ background: getExteriorSwatchColor(selectedDrawerVehicle["Ngoại thất"]) }}
                                    ></i>
                                    {selectedDrawerVehicle["Ngoại thất"] || '—'} / {selectedDrawerVehicle["Nội thất"] || 'Black'}
                                </p>
                                <p style={{ marginTop: '7px', color: tone(selectedDrawerVehicle["Trạng thái"]), fontWeight: 600 }}>
                                    ● {selectedDrawerVehicle["Trạng thái"]}
                                    {selectedDrawerVehicle["Người Giữ Xe"] ? ` · Giữ bởi ${selectedDrawerVehicle["Người Giữ Xe"]}` : ''}
                                </p>
                            </div>
                        </div>

                        {/* Action buttons inside drawer */}
                        <div className="cmd-drawer-actions" onClickCapture={() => rememberStockPosition(selectedDrawerVehicle.VIN)}>
                            {renderActionButtons(selectedDrawerVehicle)}
                        </div>

                        {/* Drawer Body Detail Grid: 100% Mẫu 36 fields */}
                        <div className="cmd-drawer-body">
                            <div className="cmd-detail-grid">
                                {[
                                    ['Dòng xe', `${selectedDrawerVehicle["Dòng xe"]} - ${selectedDrawerVehicle["Phiên bản"] || 'Tiêu chuẩn'}`],
                                    ['Màu sắc', `${selectedDrawerVehicle["Ngoại thất"] || '—'} / ${selectedDrawerVehicle["Nội thất"] || 'Black'}`],
                                    ['Số VIN', selectedDrawerVehicle.VIN, true],
                                    ['Số máy', selectedDrawerVehicle["Số máy"] || (selectedDrawerVehicle as any).so_may || '—', true],
                                    ['Mã DMS', selectedDrawerVehicle["Mã DMS"] || (selectedDrawerVehicle as any).ma_dms || '—', true],
                                    ['Số COC', selectedDrawerVehicle["Số COC"] || (selectedDrawerVehicle as any).so_coc || '—', true],
                                    ['Kho xe', selectedDrawerVehicle["Vị trí"] || 'Kho Thuận An'],
                                    ['Vị trí bãi', selectedDrawerVehicle["Vị trí"] || 'Kho Thuận An'],
                                    ['Trạng thái', selectedDrawerVehicle["Trạng thái"] || '—'],
                                    ['Người giữ', selectedDrawerVehicle["Người Giữ Xe"] || '—'],
                                    ['Thời hạn giữ', selectedDrawerVehicle["Thời Gian Hết Hạn Giữ"] || '—'],
                                    ['Ngày nhập kho', selectedDrawerVehicle["Ngày nhập"] || '—'],
                                    ['Ghi chú DMS', (selectedDrawerVehicle as any)["Ghi chú dms"] || '—'],
                                ].map(([label, value, copyable]) => (
                                    <div key={label as string} className="cmd-field-row">
                                        <span className="cmd-field-label">{label}</span>
                                        {copyable && value && value !== '—' ? (
                                            <button
                                                type="button"
                                                className="cmd-copy-value"
                                                onClick={() => void copyStockValue(String(label), String(value), `${selectedDrawerVehicle.VIN}:${label}`)}
                                                title={`Sao chép ${label}`}
                                            >
                                                {value}
                                            </button>
                                        ) : (
                                            <span className="cmd-field-value">{value}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <footer className="cmd-drawer-foot">
                            <span>Toàn bộ trường thông tin từ hệ thống VinFast DMS & CyberSoft</span>
                            <span>MẪU 36 · SMART FACETED COMMAND CENTER</span>
                        </footer>
                    </section>
                </div>
            )}

            {/* Admin Modals */}
            {isAdmin && (
                <AdminCarEditModal
                    isOpen={!!adminEditVehicle}
                    vehicle={adminEditVehicle}
                    onClose={() => setAdminEditVehicle(null)}
                    showToast={showToast}
                    onSuccess={() => refetchStock(true)}
                />
            )}

            {isAdmin && (
                <DmsRadarResultModal
                    isOpen={isRadarModalOpen}
                    data={dmsRadarResult}
                    onClose={() => setIsRadarModalOpen(false)}
                    onRefreshStock={() => refetchStock(true)}
                />
            )}

            {selectedSwapVehicle && (
                <SwapCarModal
                    targetVehicle={selectedSwapVehicle}
                    userOrders={userOrders}
                    onClose={() => setSelectedSwapVehicle(null)}
                    showToast={showToast}
                    onSuccess={() => refetchStock(true)}
                />
            )}
        </div>
    );
};

export default React.memo(StockView);
