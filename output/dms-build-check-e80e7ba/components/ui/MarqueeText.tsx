import React, { useState, useRef, useEffect } from 'react';

interface MarqueeTextProps {
    text: string;
    className?: string;
    title?: string;
    onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
    speed?: number; // Duration in seconds for a full scroll cycle
    pauseOnHover?: boolean;
    separator?: string;
}

export const MarqueeText: React.FC<MarqueeTextProps> = ({
    text,
    className = '',
    title,
    onClick,
    speed,
    pauseOnHover = true,
    separator = '   '
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const measureRef = useRef<HTMLSpanElement>(null);
    const [isOverflowing, setIsOverflowing] = useState(false);

    useEffect(() => {
        const checkOverflow = () => {
            if (containerRef.current && measureRef.current) {
                const containerWidth = containerRef.current.clientWidth;
                const textWidth = measureRef.current.scrollWidth;
                setIsOverflowing(textWidth > containerWidth + 2);
            }
        };

        checkOverflow();

        const resizeObserver = new ResizeObserver(() => {
            checkOverflow();
        });

        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        // Also check when document fonts finish loading for accurate text width
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(checkOverflow);
        }

        return () => {
            resizeObserver.disconnect();
        };
    }, [text]);

    // Calculate dynamic duration based on text length if not explicitly provided
    const duration = speed || Math.max(12, (text?.length || 10) * 0.4);

    return (
        <div
            ref={containerRef}
            className={`relative overflow-hidden w-full max-w-full ${className}`}
            title={title || text}
            onClick={onClick}
            style={isOverflowing ? {
                maskImage: 'linear-gradient(to right, transparent 0%, black 8px, black calc(100% - 8px), transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 8px, black calc(100% - 8px), transparent 100%)'
            } : undefined}
        >
            {/* Hidden measuring span */}
            <span
                ref={measureRef}
                className="inline-block whitespace-nowrap opacity-0 pointer-events-none absolute left-0 top-0 select-none"
                aria-hidden="true"
            >
                {text}
            </span>

            {isOverflowing ? (
                <div
                    className={`flex items-center w-max animate-marquee ${pauseOnHover ? 'hover:[animation-play-state:paused]' : ''}`}
                    style={{
                        animationDuration: `${duration}s`,
                        animationTimingFunction: 'linear',
                        animationIterationCount: 'infinite'
                    }}
                >
                    <span className="inline-block whitespace-nowrap pr-8">
                        {text}{separator}
                    </span>
                    <span className="inline-block whitespace-nowrap pr-8" aria-hidden="true">
                        {text}{separator}
                    </span>
                </div>
            ) : (
                <div className="truncate whitespace-nowrap">
                    {text}
                </div>
            )}
        </div>
    );
};

export default MarqueeText;
