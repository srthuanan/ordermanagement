import { useEffect, useRef, useState } from 'react';
import { DropdownFilterConfig } from '../ui/Filters';
import '../orders/orders-workspace.css';

interface Props {
    filters: { keyword?: string; [key: string]: any };
    dropdowns: DropdownFilterConfig[];
    onChange: (filters: any) => void;
    onReset: () => void;
    onRefresh: () => void;
    totalCount: number;
    isLoading: boolean;
    searchPlaceholder?: string;
    filterLabel?: string;
    sidebar?: boolean;
}

export default function InvoiceCompactFilters({ filters, dropdowns, onChange, onReset, onRefresh, totalCount, isLoading, searchPlaceholder = 'Tên, SĐH, VIN…', filterLabel = 'Lọc dữ liệu', sidebar = false }: Props) {
    const [open, setOpen] = useState(false);
    const [expandedKey, setExpandedKey] = useState<string | null>(null);
    const [optionQuery, setOptionQuery] = useState('');
    const root = useRef<HTMLDivElement>(null);
    const trigger = useRef<HTMLButtonElement>(null);
    const activeCount = dropdowns.filter(d => filters[d.key]?.length > 0).length;

    useEffect(() => {
        if (!open) return;
        const outside = (event: PointerEvent) => {
            if (!root.current?.contains(event.target as Node)) setOpen(false);
        };
        const escape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); }
        };
        document.addEventListener('pointerdown', outside);
        document.addEventListener('keydown', escape);
        return () => {
            document.removeEventListener('pointerdown', outside);
            document.removeEventListener('keydown', escape);
        };
    }, [open]);

    return (
        <div className={`invoice-compact-filters ${sidebar ? 'is-sidebar' : ''}`} ref={root}>
            <label className="orders-page-search">
                <i className="fas fa-search" aria-hidden="true" />
                <input aria-label="Tìm kiếm dữ liệu" placeholder={searchPlaceholder} value={filters.keyword || ''}
                    onChange={e => onChange({ keyword: e.target.value })} />
            </label>
            <button ref={trigger} type="button" className="orders-page-secondary" aria-expanded={open}
                aria-controls="invoice-compact-filter-panel" onClick={() => setOpen(value => !value)}>
                <i className="fas fa-sliders" aria-hidden="true" /> Bộ lọc
                {activeCount > 0 && <b>{activeCount}</b>}
            </button>
            {!sidebar && <span className="invoice-compact-count">{totalCount} kết quả</span>}
            {!sidebar && <button type="button" className="orders-page-icon-button" onClick={onRefresh} disabled={isLoading} title="Tải lại dữ liệu" aria-label="Tải lại dữ liệu">
                <i className={`fas fa-sync-alt ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
            </button>}
            {open && (
                <section id="invoice-compact-filter-panel" className="orders-filter-panel" aria-label={filterLabel}>
                    <div className="orders-filter-panel-heading"><strong>{filterLabel}</strong><button type="button" onClick={onReset}>Đặt lại</button></div>
                    <div className="orders-filter-facets">
                        {dropdowns.map(dropdown => (
                            <div key={dropdown.key} className="admin-compact-facet">
                                <button type="button" aria-expanded={expandedKey === dropdown.key}
                                    onClick={() => { setExpandedKey(expandedKey === dropdown.key ? null : dropdown.key); setOptionQuery(''); }}>
                                    <span>{dropdown.label}</span>
                                    <small>{filters[dropdown.key]?.length ? `${filters[dropdown.key].length} đã chọn` : 'Tất cả'}</small>
                                    <i className={`fas fa-chevron-${expandedKey === dropdown.key ? 'up' : 'down'}`} aria-hidden="true" />
                                </button>
                                {expandedKey === dropdown.key && <div className="admin-compact-options">
                                    <input aria-label={`Tìm ${dropdown.label}`} placeholder="Tìm nhanh…" value={optionQuery} onChange={e => setOptionQuery(e.target.value)} />
                                    <div>{(dropdown.options || []).filter(option => option.toLocaleLowerCase('vi').includes(optionQuery.toLocaleLowerCase('vi'))).map(option => {
                                        const selected: string[] = filters[dropdown.key] || [];
                                        return <label key={option}><input type="checkbox" checked={selected.includes(option)} onChange={e => onChange({
                                            [dropdown.key]: e.target.checked ? [...selected, option] : selected.filter(value => value !== option)
                                        })} /><span>{option}</span></label>;
                                    })}</div>
                                </div>}
                            </div>
                        ))}
                    </div>
                    <button type="button" className="orders-filter-done" onClick={() => { setOpen(false); trigger.current?.focus(); }}>Xong</button>
                </section>
            )}
        </div>
    );
}
