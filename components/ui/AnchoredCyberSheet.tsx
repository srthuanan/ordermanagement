import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './anchored-cyber-sheet.css';

export default function AnchoredCyberSheet({ anchor, onClose, label, compact = false, className = '', children }: {
    anchor?: HTMLElement | null; onClose: () => void; label: string; compact?: boolean; className?: string; children: React.ReactNode;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const closeRef = useRef(onClose);
    closeRef.current = onClose;
    const [position, setPosition] = useState({ left: 8, top: 8, maxHeight: 500 });
    useLayoutEffect(() => {
        const element = ref.current;
        if (!element) return;
        const source = anchor || (document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null);
        const update = () => {
            const box = source?.isConnected ? source.getBoundingClientRect() : null;
            const width = element.getBoundingClientRect().width;
            const below = box ? window.innerHeight - box.bottom - 12 : 0;
            const above = box ? box.top - 12 : 0;
            const maxHeight = Math.max(120, Math.min(compact ? 430 : 540, box ? Math.max(below, above) : window.innerHeight - 24));
            const height = Math.min(element.scrollHeight, maxHeight);
            const top = box ? (below >= height || below >= above ? box.bottom + 8 : box.top - height - 8) : 16;
            const next = { left: Math.max(8, Math.min(box ? box.right - width : window.innerWidth - width - 16, window.innerWidth - width - 8)),
                top: Math.max(8, Math.min(top, window.innerHeight - height - 8)), maxHeight };
            setPosition(previous => previous.left === next.left && previous.top === next.top && previous.maxHeight === next.maxHeight ? previous : next);
        };
        const topmost = () => { const sheets = document.querySelectorAll('[data-cyber-sheet]'); return sheets[sheets.length - 1] === element; };
        const outside = (event: PointerEvent) => {
            const target = event.target as Element;
            if (topmost() && !element.contains(target) && !source?.contains(target)) closeRef.current();
        };
        const keyboard = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && topmost()) { event.stopImmediatePropagation(); closeRef.current(); source?.focus(); }
        };
        update(); element.focus({ preventScroll: true });
        const observer = new ResizeObserver(update); observer.observe(element);
        window.addEventListener('resize', update); window.addEventListener('scroll', update, true);
        document.addEventListener('pointerdown', outside); document.addEventListener('keydown', keyboard, true);
        return () => { observer.disconnect(); window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true);
            document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', keyboard, true); };
    }, [anchor, compact]);
    return createPortal(<div ref={ref} data-cyber-sheet role="dialog" aria-label={label} tabIndex={-1}
        className={`anchored-cyber-sheet ${compact ? 'is-compact' : ''} ${className}`} style={position}>{children}</div>, document.body);
}
