import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './sidebar-filter-section.css';

/** Repositions existing controls without changing their state or handlers. */
export default function SidebarFilterSection({ targetId, title, search, children }: {
    targetId: string; title: string; search?: React.ReactNode; children?: React.ReactNode;
}) {
    const [target, setTarget] = useState<HTMLElement | null>(null);
    const [desktop, setDesktop] = useState(false);
    const [open, setOpen] = useState(false);
    const root = useRef<HTMLDivElement>(null);
    const trigger = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        const media = window.matchMedia('(min-width: 768px)');
        const update = () => { setDesktop(media.matches); setTarget(document.getElementById(targetId)); };
        update();
        media.addEventListener('change', update);
        const observer = new MutationObserver(update);
        observer.observe(document.body, { childList: true, subtree: true });
        return () => { media.removeEventListener('change', update); observer.disconnect(); };
    }, [targetId]);
    useEffect(() => {
        if (!open) return;
        const outside = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
        const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); trigger.current?.focus(); } };
        document.addEventListener('pointerdown', outside);
        document.addEventListener('keydown', escape);
        return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
    }, [open]);
    const content = <div className="admin-sidebar-filters" ref={root}>
        {desktop && target && <h2>{title}</h2>}
        <div className="admin-sidebar-search-row">
            {search && <label className="admin-sidebar-search"><i className="fas fa-search" aria-hidden="true" />{search}</label>}
            {children && <button type="button" ref={trigger} aria-expanded={open} onClick={() => setOpen(v => !v)}>
                <i className="fas fa-filter" aria-hidden="true" /> Lọc
            </button>}
        </div>
        {open && children && <section className="admin-sidebar-filter-sheet" aria-label={`Lọc ${title}`}>
            <strong>Bộ lọc</strong><div className="admin-sidebar-filter-fields">{children}</div>
            <button type="button" onClick={() => { setOpen(false); trigger.current?.focus(); }}>Xong</button>
        </section>}
    </div>;
    return desktop && target ? createPortal(content, target) : content;
}
