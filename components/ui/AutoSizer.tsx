import React, { useRef, useState, useEffect } from 'react';

export type Size = { height: number; width: number };
export type AutoSizerProps = {
    children: (size: Size) => React.ReactElement;
    className?: string;
    style?: React.CSSProperties;
};

const AutoSizer: React.FC<AutoSizerProps> = ({ children, className, style }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState<Size>({ height: 0, width: 0 });

    useEffect(() => {
        if (!ref.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                // Using contentRect is standard for ResizeObserver
                const { width, height } = entry.contentRect;
                // Avoid updates if dimensions haven't effectively changed
                setSize(prev => {
                    if (prev.width === width && prev.height === height) return prev;
                    return { width, height };
                });
            }
        });

        resizeObserver.observe(ref.current);

        return () => {
            resizeObserver.disconnect();
        };
    }, []);

    return (
        <div ref={ref} className={className} style={{ width: '100%', height: '100%', overflow: 'hidden', ...style }}>
            {size.width > 0 && size.height > 0 && children(size)}
        </div>
    );
};

export default AutoSizer;
