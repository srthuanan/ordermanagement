import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, LoaderCircle, Search } from 'lucide-react';
import { Policy, policyAdminService } from '../../services/api/policyAdminService';
import './inline-policy-picker.css';

interface Props {
    id: string;
    value: string;
    carModel?: string;
    onChange?: (value: string) => void;
    onConfirm?: (value: string) => void;
    triggerLabel?: string;
    triggerClassName?: string;
}

const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
export const getSelectedPolicies = (value: string): string[] => [...new Set(value.split(/[;\n]/).map(name => name.trim()).filter(Boolean))];
export const togglePolicySelection = (value: string, name: string): string => {
    const names = getSelectedPolicies(value);
    return (names.includes(name) ? names.filter(selected => selected !== name) : [...names, name]).join('; ');
};
export const filterSelectablePolicies = (policies: Policy[], query: string, carModel: string, onlyModel: boolean): Policy[] => {
    const search = normalize(query);
    const model = normalize(carModel);
    return policies.filter(policy => {
        if (policy.trang_thai !== 'Hoạt động') return false;
        const models = normalize(policy.dong_xe || '');
        const matchesModel = !onlyModel || !model || !models || models.includes('tat ca') || models.includes(model);
        return matchesModel && (!search || normalize(`${policy.ten_chinh_sach} ${policy.dong_xe || ''}`).includes(search));
    });
};

const InlinePolicyPicker: React.FC<Props> = ({ id, value, carModel = '', onChange, onConfirm, triggerLabel, triggerClassName }) => {
    const panelId = useId();
    const pickerRef = useRef<HTMLElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const [placement, setPlacement] = useState<React.CSSProperties>({ visibility: 'hidden' });
    const [expanded, setExpanded] = useState(false);
    const [draftValue, setDraftValue] = useState(() => getSelectedPolicies(value).join('; '));
    const [query, setQuery] = useState('');
    const [onlyModel, setOnlyModel] = useState(true);
    const [policies, setPolicies] = useState<Policy[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [retry, setRetry] = useState(0);
    const activeValue = onConfirm ? draftValue : value;
    const selected = useMemo(() => getSelectedPolicies(activeValue), [activeValue]);
    const filtered = useMemo(() => filterSelectablePolicies(policies, query, carModel, onlyModel), [policies, query, carModel, onlyModel]);

    useEffect(() => {
        if (!expanded) {
            setDraftValue(getSelectedPolicies(value).join('; '));
        }
    }, [value, expanded]);

    const commitRef = useRef<() => void>(() => {});
    commitRef.current = () => {
        setExpanded(false);
        const nextNormalized = getSelectedPolicies(draftValue).join('; ');
        const origNormalized = getSelectedPolicies(value).join('; ');
        if (onConfirm && nextNormalized !== origNormalized) {
            onConfirm(nextNormalized);
        }
    };

    useLayoutEffect(() => {
        if (!expanded) return;
        const update = () => {
            const picker = pickerRef.current;
            if (!picker) return;
            const rect = picker.getBoundingClientRect();
            const host = picker.closest<HTMLElement>('[role="dialog"], dialog');
            if (host) {
                // The portal belongs to the sheet: use its local coordinates, not viewport coordinates.
                const bounds = host.getBoundingClientRect();
                const scaleX = bounds.width / (host.offsetWidth || bounds.width) || 1;
                const scaleY = bounds.height / (host.offsetHeight || bounds.height) || 1;
                const anchorLeft = (rect.left - bounds.left) / scaleX - host.clientLeft;
                const anchorTop = (rect.top - bounds.top) / scaleY - host.clientTop;
                const anchorBottom = anchorTop + rect.height / scaleY;
                const below = host.clientHeight - anchorBottom - 16;
                const above = anchorTop - 16;
                const upwards = below < 220 && above > below;
                const width = Math.min(Math.max(rect.width / scaleX, 300), host.clientWidth - 24);
                setPlacement({ position: 'absolute', width, left: Math.max(12, Math.min(anchorLeft, host.clientWidth - width - 12)) + host.scrollLeft, maxHeight: Math.min(340, Math.max(0, upwards ? above : below)), ...(upwards ? { bottom: host.clientHeight - anchorTop + 6 - host.scrollTop, top: 'auto' } : { top: anchorBottom + 6 + host.scrollTop, bottom: 'auto' }) });
                return;
            }
            const view = window.visualViewport;
            const topEdge = (view?.offsetTop || 0) + 10;
            const bottomEdge = (view?.offsetTop || 0) + (view?.height || window.innerHeight) - 10;
            const below = bottomEdge - rect.bottom - 6;
            const above = rect.top - topEdge - 6;
            const upwards = below < 220 && above > below;
            const width = Math.min(Math.max(rect.width, 300), window.innerWidth - 24);
            setPlacement({ position: 'fixed', width, left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)), maxHeight: Math.min(340, Math.max(0, upwards ? above : below)), ...(upwards ? { bottom: window.innerHeight - rect.top + 6, top: 'auto' } : { top: rect.bottom + 6, bottom: 'auto' }) });
        };
        const outside = (event: PointerEvent) => {
            if (!pickerRef.current?.contains(event.target as Node) && !panelRef.current?.contains(event.target as Node)) commitRef.current();
        };
        update();
        window.addEventListener('resize', update);
        window.addEventListener('scroll', update, true);
        window.visualViewport?.addEventListener('resize', update);
        document.addEventListener('pointerdown', outside);
        return () => {
            window.removeEventListener('resize', update);
            window.removeEventListener('scroll', update, true);
            window.visualViewport?.removeEventListener('resize', update);
            document.removeEventListener('pointerdown', outside);
        };
    }, [expanded]);

    useEffect(() => {
        if (!expanded || loaded) return;
        let cancelled = false;
        setLoading(true);
        setError(false);
        const load = async () => {
            try {
                const result = await policyAdminService.getAllPolicies();
                if (result.status !== 'SUCCESS' || !Array.isArray(result.data)) throw new Error('Cannot load policies');
                if (!cancelled) { setPolicies(result.data); setLoaded(true); }
            } catch {
                if (!cancelled) setError(true);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        void load();
        return () => { cancelled = true; };
    }, [expanded, loaded, retry]);

    const panel = expanded && createPortal(<div ref={panelRef} id={panelId} className="inline-policy-panel" style={placement} onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); setExpanded(false); document.getElementById(id)?.focus(); } }}>
        <label className="inline-policy-search"><Search size={14} strokeWidth={1.8} /><input type="search" aria-label="Tìm chính sách" value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm tên chính sách…" /></label>
        <div className="inline-policy-filter"><span>{carModel ? `Theo dòng xe ${carModel}` : 'Tất cả dòng xe'}</span>{carModel && <button type="button" role="switch" aria-checked={onlyModel} aria-label={`Lọc chính sách theo dòng xe ${carModel}`} onClick={() => setOnlyModel(enabled => !enabled)}><span /></button>}</div>
        <div className="inline-policy-options" aria-label="Danh sách chính sách" aria-busy={loading}>
            {loading ? <div className="inline-policy-state" role="status"><LoaderCircle size={16} className="animate-spin" /> Đang tải chính sách…</div>
                : error ? <div className="inline-policy-state" role="alert"><span>Chưa tải được danh sách.</span><button type="button" onClick={() => setRetry(count => count + 1)}>Thử lại</button></div>
                : filtered.length ? filtered.map(policy => <label className="inline-policy-option" data-selected={selected.includes(policy.ten_chinh_sach)} key={policy.id || policy.ten_chinh_sach}>
                    <input type="checkbox" checked={selected.includes(policy.ten_chinh_sach)} onChange={() => {
                        const next = togglePolicySelection(activeValue, policy.ten_chinh_sach);
                        if (onConfirm) setDraftValue(next);
                        onChange?.(next);
                    }} />
                    <span className="inline-policy-option-copy"><strong>{policy.ten_chinh_sach}</strong><small>{policy.dong_xe || 'Tất cả các dòng xe'}<span>·</span>{policy.han_su_dung || 'Không giới hạn'}</small></span>
                    <span className="inline-policy-check" aria-hidden="true">{selected.includes(policy.ten_chinh_sach) && <Check size={12} strokeWidth={2.4} />}</span>
                </label>) : <div className="inline-policy-state">Không tìm thấy chính sách phù hợp.{onlyModel && carModel && <button type="button" onClick={() => setOnlyModel(false)}>Xem tất cả dòng xe</button>}</div>}
        </div>
        <div className="inline-policy-footer"><span aria-live="polite">Đã chọn <b>{selected.length}</b></span><button type="button" onClick={() => { commitRef.current(); document.getElementById(id)?.focus(); }}><Check size={13} /> Xong</button></div>
    </div>, pickerRef.current?.closest('[role="dialog"], dialog') || document.body);

    if (triggerClassName) {
        return <>
            <button ref={pickerRef as React.RefObject<HTMLButtonElement>} id={id} type="button" className={triggerClassName} aria-expanded={expanded} aria-controls={panelId} onClick={() => setExpanded(open => !open)}>
                {triggerLabel || 'Cập nhật chính sách'}
            </button>
            {panel}
        </>;
    }

    return <div ref={pickerRef as React.RefObject<HTMLDivElement>} className="inline-policy-picker" data-expanded={expanded}>
        <button id={id} type="button" className="inline-policy-trigger" aria-expanded={expanded} aria-controls={panelId} onClick={() => setExpanded(open => !open)}>
            <span title={selected.join('; ')}>{selected.length ? selected.join('; ') : (triggerLabel || 'Chọn chính sách áp dụng')}</span><ChevronDown size={15} strokeWidth={1.7} />
        </button>
        {panel}
    </div>;
};

export default InlinePolicyPicker;
