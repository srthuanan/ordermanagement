import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Clock, Search, X, ArrowRight, ArrowLeft, CornerDownLeft, FileText, ExternalLink, Check } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { getStorageItem } from '../../services/api/baseService';

interface GlobalSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectItem?: (item: any, category: string) => void;
}

/** Một "hồ sơ" duy nhất gộp toàn bộ dữ liệu liên quan (đơn hàng, YC XHĐ, lưu trữ, VinClub, kho xe) */
interface SearchEntity {
    key: string;
    order?: any;
    invoice?: any;
    archived?: any;
    vc?: any;
    stock?: any;
    score: number;
}

type Tone = 'green' | 'blue' | 'amber' | 'red' | 'grey';

const normalizeVi = (str: any): string =>
    String(str || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/gi, 'd')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();

const pick = (...vals: any[]): string => {
    const found = vals.find(v => v !== undefined && v !== null && String(v).trim() !== '');
    return found === undefined ? '' : String(found);
};

const isCancelledRow = (row: any) =>
    String(row?.so_don_hang || '').toUpperCase().includes('-HUY-') ||
    normalizeVi(row?.ket_qua).startsWith('da huy');

const formatDate = (value: any): string => {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' });
};

const detectQueryHint = (raw: string): string | null => {
    const kw = raw.trim();
    if (!kw) return null;
    if (/^[A-Z0-9]{17}$/i.test(kw)) return 'Số VIN';
    if (/^\d{6}$/.test(kw)) return '6 số cuối VIN';
    if (/^N3\d{4}|VSO/i.test(kw)) return 'Mã đơn DMS';
    if (kw.includes('/') || /HĐMB|HDMB/i.test(kw)) return 'HĐ Cyber';
    return null;
};

/** Gộp dữ liệu từ các nguồn theo thứ tự ưu tiên: Đơn hàng → YC XHĐ → Lưu trữ → VinClub → Kho */
const buildView = (e: SearchEntity) => {
    const o = e.order || {};
    const i = e.invoice || {};
    const a = e.archived || {};
    const v = e.vc || {};
    const s = e.stock || {};
    return {
        soDonHang: pick(o.so_don_hang, i.so_don_hang, a.so_don_hang, v.so_don_hang),
        customer: pick(o.ten_khach_hang, i.ten_khach_hang, a.ten_khach_hang, v.ten_khach_hang),
        tvbh: pick(o.ten_tu_van_ban_hang, i.tvbh, a.tvbh, v.nguoi_yc),
        maHdCyber: pick(o.ma_hd_cyber, i.ma_hd_cyber, a.ma_hd_cyber),
        dongXe: pick(o.dong_xe, i.dong_xe, a.dong_xe, s.dong_xe),
        phienBan: pick(o.phien_ban, i.phien_ban, a.phien_ban, s.phien_ban),
        ngoaiThat: pick(o.ngoai_that, i.ngoai_that, a.ngoai_that, s.ngoai_that),
        noiThat: pick(o.noi_that, i.noi_that, a.noi_that, s.noi_that),
        vin: pick(o.vin, i.vin, a.vin, v.vin, s.vin),
        soMay: pick(o.so_may, i.so_may, a.so_may, s.so_may),
        maDms: pick(o.ma_dms, i.ma_dms, a.ma_dms, s.ma_dms),
        chinhSach: pick(i.chinh_sach, o.chinh_sach, a.chinh_sach),
        ngayCoc: pick(o.ngay_coc, i.ngay_coc, a.ngay_coc),
        thoiGianGhep: pick(o.thoi_gian_ghep),
        ngayYeuCau: pick(i.ngay_yeu_cau, i.created_at),
        ngayXhd: pick(i.ngay_xuat_hoa_don, a.ngay_xuat_hoa_don, o.ngay_xuat_hoa_don),
        linkHoaDon: pick(i.url_hoa_don_da_xuat, a.url_hoa_don_da_xuat, o.link_hoa_don_da_xuat),
        linkHopDong: pick(i.url_hop_dong, o.url_hop_dong),
        linkDeNghi: pick(i.url_de_nghi_xhd, o.url_de_nghi_xhd),
        trangThaiVc: pick(v.trang_thai_xu_ly, o.trang_thai_vc, a.trang_thai_vc),
        orderStatus: pick(o.ket_qua),
        viTri: pick(s.vi_tri),
        trangThaiKho: pick(s.trang_thai),
        nguoiGiu: pick(s.nguoi_giu_xe),
        ghiChuAdmin: pick(i.ghi_chu_admin),
    };
};

type EntityView = ReturnType<typeof buildView>;

const getStatus = (e: SearchEntity, v: EntityView): { label: string; tone: Tone } => {
    const isInvoiced = !!(v.ngayXhd || v.linkHoaDon || e.archived);
    if (isInvoiced) return { label: 'Đã xuất hóa đơn', tone: 'green' };
    const st = normalizeVi(v.orderStatus);
    if (e.order) {
        if (st.startsWith('da huy')) return { label: v.orderStatus, tone: 'red' };
        if (e.invoice && (!st || st === 'da ghep')) return { label: 'Đã yêu cầu XHĐ', tone: 'amber' };
        if (st.includes('cho') || st.includes('yeu cau')) return { label: v.orderStatus, tone: 'amber' };
        if (st === 'da ghep') return { label: 'Đã ghép', tone: 'blue' };
        return { label: v.orderStatus || 'Chưa ghép', tone: 'grey' };
    }
    if (e.invoice) return { label: 'Đã yêu cầu XHĐ', tone: 'amber' };
    if (e.stock) {
        const ks = normalizeVi(v.trangThaiKho);
        if (ks.includes('giu')) return { label: v.trangThaiKho, tone: 'amber' };
        if (ks === 'da ghep') return { label: 'Đã ghép', tone: 'blue' };
        return { label: v.trangThaiKho || 'Chưa ghép', tone: 'grey' };
    }
    if (e.vc) return { label: v.trangThaiVc || 'Yêu cầu VinClub', tone: 'amber' };
    return { label: '—', tone: 'grey' };
};

/** Tô sáng từ khóa không phân biệt dấu */
const HighlightText: React.FC<{ text: any; query: string }> = ({ text, query }) => {
    const str = String(text ?? '');
    const tokens = normalizeVi(query).split(' ').filter(t => t.length >= 2);
    if (!str || tokens.length === 0) return <>{str}</>;

    const chars = Array.from(str);
    const normFull = chars.map(ch => ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase()).join('');
    if (normFull.length !== chars.length) return <>{str}</>;

    const ranges: Array<[number, number]> = [];
    tokens.forEach(token => {
        let idx = normFull.indexOf(token);
        while (idx !== -1) {
            ranges.push([idx, idx + token.length]);
            idx = normFull.indexOf(token, idx + token.length);
        }
    });
    if (ranges.length === 0) return <>{str}</>;

    ranges.sort((a, b) => a[0] - b[0]);
    const merged: Array<[number, number]> = [ranges[0]];
    ranges.slice(1).forEach(r => {
        const last = merged[merged.length - 1];
        if (r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
        else merged.push(r);
    });

    const parts: React.ReactNode[] = [];
    let cursor = 0;
    merged.forEach(([s, e], k) => {
        if (s > cursor) parts.push(chars.slice(cursor, s).join(''));
        parts.push(<mark key={k} className="global-search-mark">{chars.slice(s, e).join('')}</mark>);
        cursor = e;
    });
    if (cursor < chars.length) parts.push(chars.slice(cursor).join(''));
    return <>{parts}</>;
};

const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose, onSelectItem: _onSelectItem }) => {
    const [keyword, setKeyword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [entities, setEntities] = useState<SearchEntity[] | null>(null);
    const [executionTime, setExecutionTime] = useState<number | null>(null);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const [activeIndex, setActiveIndex] = useState<number>(-1);
    const [detailEntity, setDetailEntity] = useState<SearchEntity | null>(null);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);
    const copyTimerRef = useRef<number | null>(null);

    const copyValue = useCallback((key: string, val: string) => {
        if (!val) return;
        navigator.clipboard?.writeText(val).catch(() => {});
        setCopiedKey(key);
        if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
        copyTimerRef.current = window.setTimeout(() => setCopiedKey(null), 1200);
    }, []);

    const searchSeqRef = useRef(0);
    const cacheRef = useRef<Map<string, SearchEntity[]>>(new Map());
    const listContainerRef = useRef<HTMLDivElement>(null);
    const detailRef = useRef<SearchEntity | null>(null);
    detailRef.current = detailEntity;

    useEffect(() => {
        const saved = localStorage.getItem('global_recent_searches');
        if (saved) {
            try { setRecentSearches(JSON.parse(saved)); } catch (e) {}
        }
    }, []);

    const saveRecentSearch = useCallback((kw: string) => {
        const clean = kw.trim();
        if (clean.length < 2) return;
        setRecentSearches(prev => {
            const updated = [clean, ...prev.filter(s => s.toLowerCase() !== clean.toLowerCase())].slice(0, 7);
            localStorage.setItem('global_recent_searches', JSON.stringify(updated));
            return updated;
        });
    }, []);

    useEffect(() => {
        setActiveIndex(entities && entities.length > 0 ? 0 : -1);
    }, [entities]);

    useEffect(() => {
        if (!isOpen) {
            setKeyword('');
            setEntities(null);
            setExecutionTime(null);
            setActiveIndex(-1);
            setDetailEntity(null);
        }
    }, [isOpen]);

    const executeSmartSearch = useCallback(async (rawKeyword: string, recordHistory = false) => {
        const cleanKw = rawKeyword.trim();
        if (cleanKw.length < 2) {
            setEntities(null);
            setIsLoading(false);
            setExecutionTime(null);
            return;
        }
        if (recordHistory) saveRecentSearch(cleanKw);

        const cacheKey = cleanKw.toLowerCase();
        if (cacheRef.current.has(cacheKey)) {
            setEntities(cacheRef.current.get(cacheKey)!);
            setExecutionTime(0);
            setIsLoading(false);
            return;
        }

        const seq = ++searchSeqRef.current;
        setIsLoading(true);
        const startTime = performance.now();

        try {
            const currentUser = getStorageItem("currentConsultant") || getStorageItem("currentUser") || "";
            const userRole = getStorageItem("userRole") || "";
            const actualUsername = (getStorageItem("currentUser") || "").toLowerCase().trim();
            const userEmail = (getStorageItem("userEmail") || "").toLowerCase().trim();
            const isAdmin =
                actualUsername === 'admin' ||
                userRole === 'Admin' ||
                userRole === 'Quản trị viên' ||
                userEmail === 'showroomthuanan@gmail.com';

            const normKw = normalizeVi(cleanKw);
            const tokens = normKw.split(' ').filter(Boolean);
            const safeRaw = cleanKw.replace(/[,()]/g, ' ').trim();
            const rawTokens = safeRaw.split(/\s+/).filter(t => t.length >= 2);

            const scoreFields = (fields: any[], primaryFields: any[] = []): number => {
                const joined = fields.map(normalizeVi).filter(Boolean).join(' ');
                if (!joined || !tokens.every(t => joined.includes(t))) return 0;
                let score = 45;
                for (const p of primaryFields.map(normalizeVi).filter(Boolean)) {
                    if (p === normKw) return 100;
                    if (normKw.length >= 4 && p.endsWith(normKw)) score = Math.max(score, 94);
                    if (p.startsWith(normKw)) score = Math.max(score, 86);
                    if (p.includes(normKw)) score = Math.max(score, 74);
                }
                if (joined.includes(normKw)) score = Math.max(score, 62);
                return score;
            };

            const queryTable = async (tableName: string, columns: string[], ownerColumn?: string) => {
                const longest = rawTokens.length > 1 ? [rawTokens.reduce((x, y) => (x.length >= y.length ? x : y))] : [];
                const terms = Array.from(new Set([safeRaw, ...longest]));
                const orClauses = terms.flatMap(t => columns.map(col => `${col}.ilike.%${t}%`));

                let query = supabase.from(tableName).select('*').or(orClauses.join(','));
                if (!isAdmin && ownerColumn) query = query.eq(ownerColumn, currentUser);
                const { data, error } = await query.limit(80);
                let rows: any[] = !error && data ? data : [];
                rows = rows.filter(row => !isCancelledRow(row) && scoreFields(columns.map(c => row[c])) > 0);

                // Fallback tìm không dấu / nhiều từ (VD: "ha quang chung")
                const isAsciiWords = normKw === cleanKw.toLowerCase() && /[a-z]/i.test(cleanKw);
                if (rows.length === 0 && (isAsciiWords || tokens.length > 1)) {
                    let fb = supabase.from(tableName).select('*');
                    if (!isAdmin && ownerColumn) fb = fb.eq(ownerColumn, currentUser);
                    const { data: broad } = await fb.limit(500);
                    rows = (broad || []).filter(row => !isCancelledRow(row) && scoreFields(columns.map(c => row[c])) > 0).slice(0, 50);
                }
                return rows;
            };

            // 1. Tìm sơ cấp trên tất cả nguồn dữ liệu
            const [orders, stocks, archived, invoices, vcs] = await Promise.all([
                queryTable('donhang', ['so_don_hang', 'ten_khach_hang', 'vin', 'so_may', 'ma_hd_cyber', 'ten_tu_van_ban_hang', 'dong_xe', 'phien_ban', 'ngoai_that'], 'ten_tu_van_ban_hang'),
                queryTable('khoxe', ['vin', 'so_may', 'ma_dms', 'dong_xe', 'phien_ban', 'ngoai_that', 'noi_that', 'vi_tri', 'nguoi_giu_xe']),
                queryTable('archived_orders', ['so_don_hang', 'ten_khach_hang', 'vin', 'so_may', 'tvbh', 'dong_xe', 'phien_ban', 'ngoai_that'], 'tvbh'),
                queryTable('yeucauxhd', ['so_don_hang', 'ten_khach_hang', 'vin', 'so_may', 'tvbh', 'dong_xe'], 'tvbh'),
                queryTable('yeucauvc', ['so_don_hang', 'ten_khach_hang', 'vin', 'nguoi_yc', 'ma_kh_dms'], 'nguoi_yc'),
            ]);

            // 2. Bổ sung dữ liệu liên quan để mỗi hồ sơ có đầy đủ thông tin
            const orderNos = Array.from(new Set(
                [...orders, ...archived, ...invoices, ...vcs].map(r => String(r.so_don_hang || '').trim()).filter(Boolean)
            )).slice(0, 40);
            const vins = Array.from(new Set(
                [...orders, ...archived, ...invoices, ...vcs, ...stocks].map(r => String(r.vin || '').trim().toUpperCase()).filter(Boolean)
            )).slice(0, 40);

            const fetchIn = async (table: string, column: string, values: string[]) => {
                if (values.length === 0) return [] as any[];
                const { data } = await supabase.from(table).select('*').in(column, values).limit(120);
                return (data || []).filter((r: any) => !isCancelledRow(r));
            };

            const [exOrders, exInvoices, exArchived, exVcs, exStocks, exOrdersByVin, exInvoicesByVin, exArchivedByVin] = await Promise.all([
                fetchIn('donhang', 'so_don_hang', orderNos),
                fetchIn('yeucauxhd', 'so_don_hang', orderNos),
                fetchIn('archived_orders', 'so_don_hang', orderNos),
                fetchIn('yeucauvc', 'so_don_hang', orderNos),
                fetchIn('khoxe', 'vin', vins),
                fetchIn('donhang', 'vin', vins),
                fetchIn('yeucauxhd', 'vin', vins),
                fetchIn('archived_orders', 'vin', vins),
            ]);

            if (seq !== searchSeqRef.current) return;

            // 3. Gộp toàn bộ thành hồ sơ duy nhất theo Số đơn hàng, liên kết xe kho theo VIN
            const map = new Map<string, SearchEntity>();
            const attach = (rows: any[], field: keyof Omit<SearchEntity, 'key' | 'score'>) => {
                rows.forEach(row => {
                    const so = String(row.so_don_hang || '').trim().toUpperCase();
                    if (!so) return;
                    const key = `SO:${so}`;
                    let entity = map.get(key);
                    if (!entity) {
                        entity = { key, score: 0 };
                        map.set(key, entity);
                    }
                    if (!entity[field]) (entity as any)[field] = row;
                });
            };
            attach([...orders, ...exOrders, ...exOrdersByVin], 'order');
            attach([...invoices, ...exInvoices, ...exInvoicesByVin], 'invoice');
            attach([...archived, ...exArchived, ...exArchivedByVin], 'archived');
            attach([...vcs, ...exVcs], 'vc');

            const vinIndex = new Map<string, SearchEntity>();
            map.forEach(entity => {
                const vin = buildView(entity).vin.toUpperCase();
                if (vin && !vinIndex.has(vin)) vinIndex.set(vin, entity);
            });
            [...stocks, ...exStocks].forEach(stock => {
                const vin = String(stock.vin || '').trim().toUpperCase();
                if (!vin) return;
                const owner = vinIndex.get(vin);
                if (owner) {
                    if (!owner.stock) owner.stock = stock;
                } else if (!map.has(`VIN:${vin}`)) {
                    const entity: SearchEntity = { key: `VIN:${vin}`, stock, score: 0 };
                    map.set(entity.key, entity);
                    vinIndex.set(vin, entity);
                }
            });

            // 4. Chấm điểm phù hợp trên hồ sơ đã gộp & sắp xếp
            const ranked = Array.from(map.values())
                .map(entity => {
                    const v = buildView(entity);
                    entity.score = scoreFields(
                        [v.soDonHang, v.customer, v.tvbh, v.maHdCyber, v.dongXe, v.phienBan, v.ngoaiThat, v.noiThat, v.vin, v.soMay, v.maDms, v.viTri, v.nguoiGiu],
                        [v.vin, v.soDonHang, v.maHdCyber, v.customer, v.soMay]
                    );
                    return entity;
                })
                .filter(entity => entity.score > 0)
                .sort((x, y) => y.score - x.score || Number(!!y.order) - Number(!!x.order))
                .slice(0, 40);

            cacheRef.current.set(cacheKey, ranked);
            setEntities(ranked);
            setExecutionTime(Number(((performance.now() - startTime) / 1000).toFixed(2)));
            setIsLoading(false);
        } catch (err) {
            if (seq !== searchSeqRef.current) return;
            console.error('Global search error:', err);
            setIsLoading(false);
        }
    }, [saveRecentSearch]);

    // Tìm kiếm tức thì khi gõ (debounce 220ms)
    useEffect(() => {
        if (!isOpen) return;
        const clean = keyword.trim();
        if (clean.length < 2) {
            setEntities(null);
            setIsLoading(false);
            setExecutionTime(null);
            return;
        }
        const timer = window.setTimeout(() => { void executeSmartSearch(clean, false); }, 220);
        return () => window.clearTimeout(timer);
    }, [keyword, isOpen, executeSmartSearch]);

    useEffect(() => {
        const handleWindowKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            if (detailRef.current) setDetailEntity(null);
            else onClose();
        };
        window.addEventListener('keydown', handleWindowKeyDown);
        return () => window.removeEventListener('keydown', handleWindowKeyDown);
    }, [onClose]);

    if (!isOpen) return null;

    const openDetail = (entity: SearchEntity) => {
        if (keyword.trim().length >= 2) saveRecentSearch(keyword.trim());
        setDetailEntity(entity);
    };

    const scrollResultIntoView = (idx: number) => {
        const el = listContainerRef.current?.querySelector(`[data-result-index="${idx}"]`) as HTMLElement | null;
        el?.scrollIntoView({ block: 'nearest' });
    };

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const count = entities?.length || 0;
        if (e.key === 'ArrowDown' && count > 0) {
            e.preventDefault();
            setActiveIndex(prev => { const next = (prev + 1) % count; scrollResultIntoView(next); return next; });
        } else if (e.key === 'ArrowUp' && count > 0) {
            e.preventDefault();
            setActiveIndex(prev => { const next = prev <= 0 ? count - 1 : prev - 1; scrollResultIntoView(next); return next; });
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (entities && activeIndex >= 0 && activeIndex < count) openDetail(entities[activeIndex]);
            else if (keyword.trim().length >= 2) void executeSmartSearch(keyword, true);
        }
    };

    const queryHint = detectQueryHint(keyword);

    const renderDetail = (entity: SearchEntity) => {
        const v = buildView(entity);
        const status = getStatus(entity, v);
        const isInvoiced = status.tone === 'green' && status.label === 'Đã xuất hóa đơn';
        const hasOrderFlow = !!(entity.order || entity.invoice || entity.archived);
        const policies = v.chinhSach.split(/[;\n]+/).map(p => p.trim()).filter(Boolean);

        const steps = [
            { label: 'Đặt cọc', done: hasOrderFlow, date: v.ngayCoc },
            { label: 'Ghép xe', done: !!v.vin, date: v.thoiGianGhep },
            { label: 'Yêu cầu XHĐ', done: !!(entity.invoice || entity.archived || isInvoiced), date: v.ngayYeuCau },
            { label: 'Xuất hóa đơn', done: isInvoiced, date: v.ngayXhd },
        ];

        const Row = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => {
            if (!value) return null;
            const isCopied = copiedKey === label;
            return (
                <div className="gs-detail-row">
                    <span>{label}</span>
                    <button
                        type="button"
                        onClick={() => copyValue(label, value)}
                        className={`gs-copy-cell ${mono ? 'is-mono' : ''} ${isCopied ? 'is-copied' : ''}`}
                        title="Bấm để sao chép"
                    >
                        <span className="gs-copy-val">{value}</span>
                        {isCopied && <em className="gs-copied-tag">Đã chép</em>}
                    </button>
                </div>
            );
        };

        const mainTitle = hasOrderFlow ? (v.customer || v.soDonHang) : v.vin;

        return (
            <>
                <div className="gs-detail-heading">
                    <button type="button" className="gs-detail-back" onClick={() => setDetailEntity(null)} aria-label="Quay lại kết quả">
                        <ArrowLeft size={16} />
                    </button>
                    <button type="button" onClick={onClose} className="global-search-close" aria-label="Đóng tìm kiếm">
                        <X size={16} />
                    </button>
                </div>

                <div className="gs-detail-title">
                    <button
                        type="button"
                        className="gs-copy-heading"
                        onClick={() => copyValue('title', mainTitle)}
                        title="Bấm để sao chép"
                    >
                        <h2>{mainTitle}</h2>
                        {copiedKey === 'title' && <em className="gs-copied-tag">Đã chép</em>}
                    </button>
                    <div className="gs-detail-sub">
                        <span className={`global-search-status-pill tone-${status.tone}`}><i aria-hidden="true" />{status.label}</span>
                        {v.tvbh && (
                            <button
                                type="button"
                                className="gs-detail-owner-btn"
                                onClick={() => copyValue('tvbh', v.tvbh)}
                                title="Bấm để sao chép tên TVBH"
                            >
                                · {v.tvbh}
                                {copiedKey === 'tvbh' && <em className="gs-copied-tag">Đã chép</em>}
                            </button>
                        )}
                    </div>
                </div>

                <div className="gs-detail-body">
                    {hasOrderFlow && (
                        <div className="gs-steps">
                            {steps.map((step, idx) => (
                                <div key={step.label} className={`gs-step ${step.done ? 'is-done' : ''}`}>
                                    <span className="gs-step-dot">{step.done ? <Check size={9} strokeWidth={3} /> : idx + 1}</span>
                                    <span className="gs-step-label">{step.label}</span>
                                    <span className="gs-step-date">{step.done ? formatDate(step.date) || '✓' : '—'}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {hasOrderFlow && (v.soDonHang || v.maHdCyber) && (
                        <section className="gs-detail-section">
                            <h3>Đơn hàng</h3>
                            <div className="gs-table">
                                <Row label="Số đơn hàng" value={v.soDonHang} mono />
                                <Row label="Mã HĐ Cyber" value={v.maHdCyber} mono />
                            </div>
                        </section>
                    )}

                    <section className="gs-detail-section">
                        <h3>Cấu hình xe</h3>
                        <div className="gs-table">
                            <Row label="Dòng xe" value={[v.dongXe, v.phienBan && v.phienBan !== v.dongXe ? v.phienBan : ''].filter(Boolean).join(' · ') || v.dongXe} />
                            {v.phienBan && v.phienBan === v.dongXe && <Row label="Phiên bản" value={v.phienBan} />}
                            <Row label="Ngoại thất" value={v.ngoaiThat} />
                            <Row label="Nội thất" value={v.noiThat} />
                            <Row label="Số VIN" value={v.vin || 'Chưa ghép xe'} mono={!!v.vin} />
                            <Row label="Số máy" value={v.soMay} mono />
                        </div>
                    </section>

                    {(entity.stock || v.maDms) && (
                        <section className="gs-detail-section">
                            <h3>Kho xe</h3>
                            <div className="gs-table">
                                <Row label="Mã DMS" value={v.maDms} mono />
                                <Row label="Vị trí" value={v.viTri} />
                                <Row label="Trạng thái kho" value={v.trangThaiKho} />
                                <Row label="Người giữ / ghép" value={v.nguoiGiu} />
                            </div>
                        </section>
                    )}

                    {(v.linkHoaDon || v.linkHopDong || v.linkDeNghi || v.trangThaiVc) && (
                        <section className="gs-detail-section">
                            <h3>Hóa đơn & Hồ sơ</h3>
                            <div className="gs-table">
                                <Row label="VinClub" value={v.trangThaiVc} />
                                {(v.linkHoaDon || v.linkHopDong || v.linkDeNghi) && (
                                    <div className="gs-detail-row">
                                        <span>Chứng từ</span>
                                        <div className="gs-detail-links">
                                            {v.linkHoaDon && <a href={v.linkHoaDon} target="_blank" rel="noopener noreferrer"><FileText size={11} /> Hóa đơn<ExternalLink size={9} /></a>}
                                            {v.linkHopDong && <a href={v.linkHopDong} target="_blank" rel="noopener noreferrer"><FileText size={11} /> Hợp đồng<ExternalLink size={9} /></a>}
                                            {v.linkDeNghi && <a href={v.linkDeNghi} target="_blank" rel="noopener noreferrer"><FileText size={11} /> Đề nghị XHĐ<ExternalLink size={9} /></a>}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>
                    )}

                    {policies.length > 0 && (
                        <section className="gs-detail-section">
                            <h3>Chính sách áp dụng ({policies.length})</h3>
                            <div className="gs-table">
                                {policies.map((p, idx) => {
                                    const pKey = `policy-${idx}`;
                                    const isCopied = copiedKey === pKey;
                                    return (
                                        <div key={idx} className="gs-detail-row gs-policy-row">
                                            <span>#{idx + 1}</span>
                                            <button
                                                type="button"
                                                onClick={() => copyValue(pKey, p)}
                                                className={`gs-copy-cell ${isCopied ? 'is-copied' : ''}`}
                                                title="Bấm để sao chép"
                                            >
                                                <span className="gs-copy-val">{p}</span>
                                                {isCopied && <em className="gs-copied-tag">Đã chép</em>}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}
                </div>
            </>
        );
    };

    return (
        <div
            className="global-search-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Tìm kiếm toàn cục"
            onClick={(e) => { if (e.target === e.currentTarget) { window.dispatchEvent(new CustomEvent('close-all-sheets')); onClose(); } }}
        >
            <div className="global-search-panel">
                {detailEntity ? renderDetail(detailEntity) : (
                    <>
                        <div className="global-search-heading">
                            <div>
                                <h2>Tìm kiếm</h2>
                                <p>
                                    {entities
                                        ? `${entities.length} hồ sơ${executionTime !== null ? ` · ${executionTime}s` : ''}`
                                        : 'Tìm tức thì theo tên KH, VIN (6 số cuối), VSO, HĐ Cyber'}
                                </p>
                            </div>
                            <button type="button" onClick={onClose} className="global-search-close" aria-label="Đóng tìm kiếm">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="global-search-box-wrap">
                            <label className="global-search-input-label">
                                {isLoading ? <i className="fas fa-spinner fa-spin text-xs text-blue-600"></i> : <Search size={14} />}
                                <input
                                    type="text"
                                    placeholder="Nhập tên KH (có/không dấu), VIN, mã đơn..."
                                    value={keyword}
                                    onChange={(e) => setKeyword(e.target.value)}
                                    onKeyDown={handleInputKeyDown}
                                    autoFocus
                                />
                                {queryHint && <span className="global-search-hint-badge">{queryHint}</span>}
                                {keyword && (
                                    <button
                                        type="button"
                                        className="global-search-clear"
                                        onClick={() => { setKeyword(''); setEntities(null); }}
                                        aria-label="Xóa từ khóa"
                                    >
                                        <X size={13} />
                                    </button>
                                )}
                            </label>
                        </div>

                        <div ref={listContainerRef} className="global-search-body">
                            {isLoading && !entities ? (
                                <div className="global-search-empty">
                                    <div className="w-5 h-5 rounded-full border-2 border-slate-200 border-t-blue-600 animate-spin"></div>
                                    <strong>Đang tìm dữ liệu...</strong>
                                </div>
                            ) : !entities ? (
                                <div className="global-search-recent">
                                    <div className="global-search-section-head">
                                        <span>Tìm kiếm gần đây</span>
                                        {recentSearches.length > 0 && (
                                            <button type="button" onClick={() => { setRecentSearches([]); localStorage.removeItem('global_recent_searches'); }}>
                                                Xóa lịch sử
                                            </button>
                                        )}
                                    </div>
                                    {recentSearches.length > 0 ? (
                                        <div className="global-search-recent-list">
                                            {recentSearches.map((rs, i) => (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    onClick={() => { setKeyword(rs); void executeSmartSearch(rs, true); }}
                                                    className="global-search-recent-item"
                                                >
                                                    <Clock size={13} />
                                                    <span>{rs}</span>
                                                    <ArrowRight size={12} className="global-search-recent-arrow" />
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="global-search-empty">
                                            <Search size={22} strokeWidth={1.4} />
                                            <strong>Chưa có lịch sử tìm kiếm</strong>
                                            <p>Gõ từ 2 ký tự để tự động tìm kiếm không dấu trên toàn hệ thống.</p>
                                        </div>
                                    )}
                                </div>
                            ) : entities.length === 0 ? (
                                <div className="global-search-empty">
                                    <Search size={22} strokeWidth={1.4} />
                                    <strong>Không tìm thấy kết quả</strong>
                                    <p>Từ khóa "{keyword}" không khớp với dữ liệu nào.</p>
                                </div>
                            ) : (
                                <div className="global-search-group-list">
                                    {entities.map((entity, idx) => {
                                        const v = buildView(entity);
                                        const status = getStatus(entity, v);
                                        const hasOrderFlow = !!(entity.order || entity.invoice || entity.archived || entity.vc);
                                        const title = hasOrderFlow ? (v.customer || v.soDonHang || '—') : (v.vin || '—');
                                        const configLine = [v.dongXe, v.phienBan, v.ngoaiThat].filter(Boolean).join(' · ');
                                        const ownerLine = hasOrderFlow ? v.tvbh : [v.viTri, v.nguoiGiu ? `Giữ: ${v.nguoiGiu}` : ''].filter(Boolean).join(' · ');
                                        const codeLine = hasOrderFlow
                                            ? [v.soDonHang, v.vin].filter(Boolean).join(' · ')
                                            : [v.maDms ? `DMS ${v.maDms}` : '', v.soMay].filter(Boolean).join(' · ');

                                        return (
                                            <button
                                                key={entity.key}
                                                type="button"
                                                data-result-index={idx}
                                                onMouseEnter={() => setActiveIndex(idx)}
                                                onClick={() => openDetail(entity)}
                                                className={`global-search-result-card ${idx === activeIndex ? 'is-selected' : ''}`}
                                            >
                                                <div className="global-search-result-top">
                                                    <strong className="global-search-result-title">
                                                        <HighlightText text={title} query={keyword} />
                                                    </strong>
                                                    <span className={`global-search-status-pill tone-${status.tone}`}>
                                                        <i aria-hidden="true" />{status.label}
                                                    </span>
                                                </div>
                                                {(configLine || ownerLine) && (
                                                    <div className="global-search-result-sub">
                                                        <HighlightText text={configLine} query={keyword} />
                                                        {ownerLine && (
                                                            <span className="global-search-result-owner">
                                                                {configLine ? ' · ' : ''}<HighlightText text={ownerLine} query={keyword} />
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                                {codeLine && (
                                                    <div className="global-search-result-codes">
                                                        <HighlightText text={codeLine} query={keyword} />
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="global-search-footer">
                            <span><kbd>↑</kbd><kbd>↓</kbd> Di chuyển</span>
                            <span><kbd><CornerDownLeft size={9} style={{ display: 'inline' }} /></kbd> Xem chi tiết</span>
                            <span><kbd>ESC</kbd> Đóng</span>
                        </div>
                    </>
                )}
            </div>

            <style>{`
                .global-search-sheet {
                    position: fixed;
                    inset: 0 0 0 64px;
                    width: calc(100vw - 64px);
                    height: 100dvh;
                    z-index: 1005;
                    display: flex;
                    align-items: stretch;
                    justify-content: flex-start;
                    background: rgba(15, 23, 42, 0.08);
                    color: #17263b;
                    overflow: hidden;
                    animation: globalSearchBackdropIn 0.2s ease-out both;
                }
                .global-search-panel {
                    width: clamp(290px, 25vw, 390px);
                    max-width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    background: #ffffff;
                    border-right: 1px solid #e2e8f0;
                    box-shadow: 18px 0 42px -14px rgba(20, 34, 54, 0.16);
                    overflow: hidden;
                    animation: globalSearchSlideIn 0.26s cubic-bezier(0.22, 1, 0.36, 1) both;
                }
                .global-search-heading {
                    display: flex;
                    flex-shrink: 0;
                    align-items: center;
                    justify-content: space-between;
                    padding: 22px 20px 14px;
                }
                .global-search-heading h2 {
                    margin: 0;
                    color: #17263b;
                    font-size: 20px;
                    font-weight: 650;
                    letter-spacing: -0.5px;
                    line-height: 1.25;
                }
                .global-search-heading p {
                    margin: 4px 0 0;
                    color: #7b879a;
                    font-size: 10.5px;
                }
                .global-search-close, .gs-detail-back {
                    display: grid;
                    place-items: center;
                    width: 28px;
                    height: 28px;
                    padding: 0;
                    border: 0;
                    border-radius: 6px;
                    background: transparent;
                    color: #7b879a;
                    cursor: pointer;
                    transition: background 0.15s, color 0.15s;
                }
                .global-search-close:hover, .gs-detail-back:hover {
                    background: #edf1f6;
                    color: #17263b;
                }
                .global-search-box-wrap {
                    padding: 0 17px 14px;
                    border-bottom: 1px solid #e9edf2;
                }
                .global-search-input-label {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    height: 37px;
                    padding: 0 10px;
                    border: 1px solid #dee4ec;
                    border-radius: 6px;
                    background: #ffffff;
                    color: #8c98aa;
                    transition: border-color 0.15s;
                }
                .global-search-input-label:focus-within { border-color: #698fc5; }
                .global-search-input-label input {
                    flex: 1;
                    min-width: 0;
                    border: 0;
                    outline: 0;
                    background: transparent;
                    font-size: 11.5px;
                    color: #17263b;
                }
                .global-search-input-label input::placeholder { color: #8b97a9; }
                .global-search-hint-badge {
                    flex-shrink: 0;
                    padding: 1px 6px;
                    border-radius: 4px;
                    background: #eff6ff;
                    color: #2563eb;
                    font-size: 9.5px;
                    font-weight: 600;
                    white-space: nowrap;
                }
                .global-search-clear {
                    display: grid;
                    place-items: center;
                    width: 20px;
                    height: 20px;
                    border: 0;
                    border-radius: 4px;
                    background: transparent;
                    color: #94a3b8;
                    cursor: pointer;
                }
                .global-search-clear:hover { background: #f1f5f9; color: #475569; }
                .global-search-body {
                    flex: 1;
                    min-height: 0;
                    overflow-y: auto;
                    overscroll-behavior: contain;
                    padding: 0;
                    scrollbar-width: none; -ms-overflow-style: none;
                    
                }
                .global-search-recent { padding: 12px 14px; }
                .global-search-section-head {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 2px 6px 8px;
                    font-size: 10.5px;
                    font-weight: 600;
                    color: #7b879a;
                }
                .global-search-section-head button {
                    border: 0;
                    background: transparent;
                    color: #3275d3;
                    font-size: 10.5px;
                    font-weight: 500;
                    cursor: pointer;
                    padding: 0;
                }
                .global-search-section-head button:hover { text-decoration: underline; }
                .global-search-recent-list { display: flex; flex-direction: column; gap: 2px; }
                .global-search-recent-item {
                    display: flex;
                    align-items: center;
                    gap: 9px;
                    width: 100%;
                    padding: 9px 10px;
                    border: 0;
                    border-radius: 7px;
                    background: transparent;
                    color: #334155;
                    font-size: 12px;
                    font-weight: 500;
                    text-align: left;
                    cursor: pointer;
                    transition: background 0.14s, color 0.14s;
                }
                .global-search-recent-item svg:first-child { color: #94a3b8; flex-shrink: 0; }
                .global-search-recent-item span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                .global-search-recent-arrow { color: #94a3b8; opacity: 0; transform: translateX(-4px); transition: opacity 0.14s, transform 0.14s; }
                .global-search-recent-item:hover { background: #f8fafc; color: #0f172a; }
                .global-search-recent-item:hover svg:first-child { color: #2563eb; }
                .global-search-recent-item:hover .global-search-recent-arrow { opacity: 1; transform: translateX(0); }
                .global-search-empty {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    padding: 56px 20px;
                    color: #94a3b8;
                    text-align: center;
                }
                .global-search-empty strong { color: #475569; font-size: 12px; font-weight: 600; }
                .global-search-empty p { margin: 0; font-size: 11px; }
                .global-search-group-list { display: flex; flex-direction: column; }
                .global-search-result-card {
                    position: relative;
                    width: 100%;
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                    padding: 15px 20px;
                    border: 0;
                    border-bottom: 1px solid #e9edf2;
                    border-radius: 0;
                    background: transparent;
                    text-align: left;
                    cursor: pointer;
                    transition: background 0.14s;
                }
                .global-search-result-card:hover { background: #f1f4f8; }
                .global-search-result-card.is-selected { background: #edf3fd; }
                .global-search-result-card.is-selected::before {
                    position: absolute;
                    top: 10px;
                    bottom: 10px;
                    left: 0;
                    width: 3px;
                    border-radius: 3px;
                    background: #2466cd;
                    content: '';
                }
                .global-search-result-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
                .global-search-result-title {
                    font-size: 12px;
                    font-weight: 600;
                    color: #1c2a3d;
                    line-height: 1.4;
                    min-width: 0;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .global-search-status-pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    flex-shrink: 0;
                    color: #7d899b;
                    font-size: 10px;
                    font-weight: 400;
                    line-height: 1.4;
                    white-space: nowrap;
                }
                .global-search-status-pill i { flex-shrink: 0; width: 6px; height: 6px; border-radius: 50%; background: #9ba6b6; }
                .global-search-status-pill.tone-green i { background: #26a66d; }
                .global-search-status-pill.tone-blue i { background: #3673d0; }
                .global-search-status-pill.tone-amber i { background: #edaf29; }
                .global-search-status-pill.tone-red i { background: #d07474; }
                .global-search-result-sub {
                    font-size: 11px;
                    color: #718099;
                    line-height: 1.4;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .global-search-result-owner { color: #8c97a8; }
                .global-search-result-codes {
                    font-size: 10px;
                    color: #8b96a6;
                    line-height: 1.4;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .global-search-mark { background: transparent; color: #2466cd; padding: 0; font-weight: 650; }
                .global-search-footer {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 10px 18px;
                    border-top: 1px solid #e9edf2;
                    background: #fbfbfc;
                    font-size: 10.5px;
                    color: #7b879a;
                    flex-shrink: 0;
                }
                .global-search-footer kbd {
                    display: inline-block;
                    padding: 1px 5px;
                    margin-right: 3px;
                    border: 1px solid #dce3ed;
                    border-radius: 4px;
                    background: #ffffff;
                    color: #475569;
                    font-size: 9.5px;
                    font-family: inherit;
                    font-weight: 600;
                }

                /* ===== Chi tiết hồ sơ ===== */
                .gs-detail-heading {
                    display: flex;
                    flex-shrink: 0;
                    align-items: center;
                    justify-content: space-between;
                    padding: 14px 14px 2px;
                    user-select: none;
                }
                .gs-detail-title {
                    flex-shrink: 0;
                    padding: 4px 20px 14px;
                    border-bottom: 1px solid #e9edf2;
                }
                .gs-detail-title h2 {
                    margin: 0;
                    color: #17263b;
                    font-size: 18px;
                    font-weight: 650;
                    letter-spacing: -0.4px;
                    line-height: 1.3;
                    overflow-wrap: anywhere;
                }
                .gs-detail-sub {
                    display: flex;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 6px;
                    margin-top: 6px;
                }
                .gs-detail-sub .global-search-status-pill {
                    font-size: 11px;
                    color: #475569;
                }
                .gs-copy-heading {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    padding: 0;
                    border: 0;
                    background: transparent;
                    text-align: left;
                    cursor: pointer;
                }
                .gs-copy-heading:hover h2 {
                    color: #2466cd;
                }
                .gs-detail-owner-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    padding: 0;
                    border: 0;
                    background: transparent;
                    color: #7b879a;
                    font-size: 11px;
                    cursor: pointer;
                }
                .gs-detail-owner-btn:hover {
                    color: #2466cd;
                }
                .gs-copy-cell {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 8px;
                    padding: 7px 11px;
                    border: 0;
                    background: transparent;
                    color: #17263b;
                    font-size: 11px;
                    font-weight: 550;
                    text-align: left;
                    cursor: pointer;
                    transition: background 0.12s, color 0.12s;
                }
                .gs-copy-cell:hover {
                    background: #f4f8ff;
                    color: #2466cd;
                }
                .gs-copy-cell.is-mono {
                    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
                    font-size: 10.5px;
                    color: #1e40af;
                    font-weight: 600;
                }
                .gs-copy-val {
                    min-width: 0;
                    overflow-wrap: anywhere;
                }
                .gs-copied-tag {
                    flex-shrink: 0;
                    font-style: normal;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    font-size: 9.5px;
                    font-weight: 600;
                    color: #26a66d;
                }
                .gs-detail-body {
                    flex: 1;
                    min-height: 0;
                    overflow-y: auto;
                    overscroll-behavior: contain;
                    padding: 0 0 18px;
                    scrollbar-width: none; -ms-overflow-style: none;
                    
                }
                .gs-steps {
                    position: relative;
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 4px;
                    padding: 14px 16px 12px;
                    border-bottom: 1px solid #e9edf2;
                    background: #fbfcfd;
                }
                .gs-steps::before {
                    position: absolute;
                    top: 23px;
                    left: 16%;
                    right: 16%;
                    height: 1px;
                    background: #dce4ec;
                    content: '';
                }
                .gs-step {
                    position: relative;
                    z-index: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 4px;
                    text-align: center;
                    min-width: 0;
                }
                .gs-step-dot {
                    display: grid;
                    place-items: center;
                    width: 19px;
                    height: 19px;
                    border-radius: 50%;
                    border: 1.5px solid #cbd5e1;
                    background: #ffffff;
                    color: #94a3b8;
                    font-size: 9px;
                    font-weight: 600;
                    box-shadow: 0 0 0 3px #fbfcfd;
                }
                .gs-step.is-done .gs-step-dot {
                    border-color: #27a66c;
                    background: #27a66c;
                    color: #ffffff;
                }
                .gs-step-label {
                    font-size: 10px;
                    font-weight: 500;
                    color: #8b96a6;
                    line-height: 1.25;
                }
                .gs-step.is-done .gs-step-label {
                    color: #24364e;
                    font-weight: 600;
                }
                .gs-step-date {
                    font-size: 9.5px;
                    color: #8b96a6;
                    font-variant-numeric: tabular-nums;
                }
                .gs-detail-section {
                    padding: 14px 18px 0;
                }
                .gs-detail-section h3 {
                    margin: 0 0 7px;
                    font-size: 10px;
                    font-weight: 700;
                    color: #7b879a;
                    text-transform: uppercase;
                    letter-spacing: 0.03em;
                }
                .gs-table {
                    border: 1px solid #e9edf2;
                    border-radius: 6px;
                    overflow: hidden;
                    background: #ffffff;
                }
                .gs-detail-row {
                    display: grid;
                    grid-template-columns: 112px minmax(0, 1fr);
                    align-items: center;
                    border-bottom: 1px solid #f1f5f9;
                    font-size: 11px;
                    line-height: 1.45;
                }
                .gs-detail-row:last-child {
                    border-bottom: 0;
                }
                .gs-detail-row > span {
                    align-self: stretch;
                    display: flex;
                    align-items: center;
                    padding: 7px 10px;
                    background: #fafbfd;
                    border-right: 1px solid #f1f5f9;
                    color: #64748b;
                    font-weight: 500;
                }
                .gs-detail-row > strong {
                    padding: 7px 11px;
                    color: #17263b;
                    font-weight: 550;
                    text-align: left;
                    overflow-wrap: anywhere;
                }
                .gs-detail-row > strong.is-mono {
                    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
                    font-size: 10.5px;
                    color: #1e40af;
                    font-weight: 600;
                }
                .gs-detail-row.gs-policy-row {
                    grid-template-columns: 36px minmax(0, 1fr);
                }
                .gs-detail-row.gs-policy-row > span {
                    justify-content: center;
                    color: #94a3b8;
                    font-size: 10px;
                }
                .gs-detail-links {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 10px;
                    padding: 7px 11px;
                }
                .gs-detail-links a {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    color: #2466cd;
                    font-size: 11px;
                    font-weight: 550;
                    text-decoration: none;
                }
                .gs-detail-links a:hover {
                    text-decoration: underline;
                }

                @keyframes globalSearchSlideIn {
                    from { transform: translateX(-100%); }
                    to { transform: translateX(0); }
                }
                @keyframes globalSearchBackdropIn {
                    from { background: transparent; }
                    to { background: rgba(15, 23, 42, 0.08); }
                }
                @media (max-width: 768px) {
                    .global-search-sheet { inset: 0; width: 100vw; }
                    .global-search-panel { width: min(360px, 90vw); }
                }
            `}</style>
        </div>
    );
};

export default GlobalSearchModal;
