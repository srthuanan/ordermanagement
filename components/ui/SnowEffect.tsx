
import React, { useMemo } from 'react';

const SnowEffect: React.FC = () => {
    // Generate static random values once to avoid recalculation on re-renders
    const particles = useMemo(() => {
        // Standard small snow dots (Reduced quantity for performance)
        const smallSnow = Array.from({ length: 40 }).map((_, i) => ({
            id: `small-${i}`,
            left: `${Math.random() * 100}vw`,
            animationDuration: `${Math.random() * 8 + 5}s`, // 5-13s (falling slightly faster)
            animationDelay: `${Math.random() * -15}s`, // Negative delay to start immediately
            opacity: Math.random() * 0.6 + 0.4, // Higher opacity for visibility
            size: `${Math.random() * 4 + 3}px`, // Slightly larger: 3-7px
            type: 'dot'
        }));

        // Large detailed snowflakes (Reduced quantity)
        const bigFlakes = Array.from({ length: 5 }).map((_, i) => ({
            id: `big-${i}`,
            left: `${Math.random() * 95}vw`, // Keep slightly away from edges
            animationDuration: `${Math.random() * 12 + 10}s`, // 10-22s
            animationDelay: `${Math.random() * -20}s`,
            opacity: Math.random() * 0.7 + 0.3,
            size: `${Math.random() * 15 + 15}px`, // 15-30px
            type: 'flake'
        }));

        return [...smallSnow, ...bigFlakes];
    }, []);

    // Generate random mounds for the uneven snow pile effect
    const mounds = useMemo(() => {
        return Array.from({ length: 5 }).map((_, i) => ({
            id: `mound-${i}`,
            left: `${Math.random() * 100 - 10}%`, // Allow slight overflow to cover edges
            width: `${Math.random() * 30 + 20}%`, // 20-50% width
            height: `${Math.random() * 30 + 10}px`, // Reduced height
            animationDuration: `${Math.random() * 30 + 45}s`, // 45-75s for full accumulation
            animationDelay: `${Math.random() * 10}s`, // Staggered starts
            zIndex: Math.floor(Math.random() * 5),
        }));
    }, []);

    return (
        <div className="fixed inset-0 pointer-events-none z-[60] overflow-hidden" aria-hidden="true">
            <style>{`
                @keyframes accumulate {
                    0% { transform: translateY(100%); opacity: 0; }
                    100% { transform: translateY(0); opacity: 1; }
                }
                .snow-mound {
                    position: absolute;
                    bottom: -5px; /* Slight overlap */
                    /* Softer gradient for a fluffy look */
                    background: linear-gradient(to bottom, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 1) 40%);
                    box-shadow: 0 -4px 15px rgba(255, 255, 255, 0.5); /* Soft glow */
                    border-radius: 50% 50% 0 0 / 100% 100% 0 0; /* Flatter, wider curve */
                    animation: accumulate ease-out forwards;
                }
            `}</style>

            {/* Falling Particles */}
            {particles.map((p) => (
                <div
                    key={p.id}
                    className={`absolute top-[-40px] animate-fall ${p.type === 'flake' ? '' : 'rounded-full'}`}
                    style={{
                        left: p.left,
                        width: p.type === 'dot' ? p.size : undefined,
                        height: p.type === 'dot' ? p.size : undefined,
                        fontSize: p.type === 'flake' ? p.size : undefined,
                        opacity: p.opacity,
                        animationDuration: p.animationDuration,
                        animationDelay: p.animationDelay,
                        // Styling for white snow
                        backgroundColor: p.type === 'dot' ? '#FFFFFF' : undefined,
                        color: p.type === 'flake' ? '#FFFFFF' : undefined,
                        // REMOVED expensive drop-shadow filter
                        // filter: 'drop-shadow(0 1px 1px rgba(0, 0, 0, 0.15))', 
                        textShadow: p.type === 'flake' ? '0 1px 2px rgba(0,0,0,0.1)' : undefined, // Cheaper alternative for text
                        boxShadow: p.type === 'dot' ? '0 1px 2px rgba(0,0,0,0.1)' : undefined, // Cheaper alternative for box
                    }}
                >
                    {p.type === 'flake' && <i className="fas fa-snowflake"></i>}
                </div>
            ))}

            {/* Uneven Snow Pile Accumulation */}
            <div className="absolute bottom-0 left-0 right-0 h-0 w-full">
                {/* Base layer to fill gaps */}
                <div className="absolute bottom-0 left-0 w-full h-[15px] bg-white opacity-80" style={{ animation: 'accumulate 60s ease-out forwards' }}></div>

                {/* Random mounds */}
                {mounds.map((m) => (
                    <div
                        key={m.id}
                        className="snow-mound"
                        style={{
                            left: m.left,
                            width: m.width,
                            height: m.height,
                            animationDuration: m.animationDuration,
                            animationDelay: m.animationDelay,
                            zIndex: m.zIndex,
                        }}
                    ></div>
                ))}
            </div>
        </div>
    );
};

export default React.memo(SnowEffect);
