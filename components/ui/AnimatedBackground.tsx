import React from 'react';

const AnimatedBackground: React.FC = () => {
    return (
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden rounded-xl bg-slate-50/50">
            {/* Optimized Layer 1: Simple Static Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] bg-[size:60px_60px] opacity-40"></div>

            {/* Optimized Layer 2: Single Slow Pulse Glow */}
            <div className="absolute -top-[20%] -left-[10%] w-[40rem] h-[40rem] bg-[radial-gradient(circle,rgba(59,130,246,0.08)_0%,transparent_70%)] animate-pulse-glow-heavy opacity-50 transform-gpu"></div>

            {/* Optimized Layer 3: Static Accent Gradient */}
            <div className="absolute bottom-0 right-0 w-[50%] h-[50%] bg-[radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.05)_0%,transparent_60%)]"></div>

            {/* Subtle Texture Noise - Minimal rendering cost */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E')] opacity-[0.03]"></div>
        </div>
    );
};

export default React.memo(AnimatedBackground);
