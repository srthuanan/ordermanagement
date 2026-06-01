import React from 'react';
import { useNightMode } from '../../hooks/useNightMode';

// Removed unused CloudIcon

const RealisticCloud = ({ className, opacity = 1, style }: { className?: string; opacity?: number; style?: React.CSSProperties }) => (
    <div className={`absolute pointer-events-none z-0 mix-blend-screen transition-opacity duration-1000 ${className}`} style={{ opacity, ...style }}>
        <div className="relative w-48 h-20 bg-white/60 rounded-full blur-xl" />
        <div className="absolute -top-10 left-6 w-24 h-24 bg-white/70 rounded-full blur-xl" />
        <div className="absolute -top-6 left-20 w-20 h-20 bg-white/70 rounded-full blur-xl" />
        <div className="absolute top-4 left-10 w-32 h-16 bg-white/50 rounded-full blur-2xl" />
    </div>
);

const SummerBackground: React.FC = () => {
    const isNight = useNightMode();

    return (
        <>
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                {/* Lớp phủ bầu trời đêm */}
                <div className={`absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-900 transition-opacity duration-1000 ${isNight ? 'opacity-95' : 'opacity-0'}`}></div>

                {/* Sun or Moon */}
            {!isNight ? (
                <div className="absolute top-40 right-32 w-24 h-24 bg-yellow-300 rounded-full blur-[2px] shadow-[0_0_60px_rgba(253,224,71,0.5)] animate-pulse-slow flex items-center justify-center opacity-40">
                    <div className="w-16 h-16 bg-yellow-200 rounded-full shadow-[0_0_30px_rgba(253,224,71,0.8)] animate-spin-slow relative">
                        {/* Sun rays */}
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="absolute top-1/2 left-1/2 w-1 h-8 bg-yellow-200 -mt-4 -ml-0.5 rounded-full" style={{ transform: `rotate(${i * 45}deg) translateY(-14px)` }}></div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="absolute top-40 right-32 w-20 h-20 bg-slate-100 rounded-full shadow-[0_0_50px_rgba(241,245,249,0.8),inset_-10px_-5px_15px_rgba(148,163,184,0.4)] animate-pulse-slow flex items-center justify-center opacity-90 border border-slate-200">
                    {/* Craters */}
                    <div className="absolute top-4 left-6 w-3 h-3 rounded-full bg-slate-300/40 blur-[1px]"></div>
                    <div className="absolute bottom-6 right-5 w-4 h-5 rounded-full bg-slate-300/30 blur-[1px]"></div>
                    <div className="absolute top-8 right-6 w-2 h-2 rounded-full bg-slate-300/50 blur-[1px]"></div>
                </div>
            )}

            {/* Stars at night */}
            {isNight && (
                <div className="absolute inset-0">
                    <div className="absolute top-[10%] left-[20%] w-1 h-1 bg-white rounded-full shadow-[0_0_4px_#fff] animate-pulse"></div>
                    <div className="absolute top-[25%] left-[45%] w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_5px_#fff] animate-pulse" style={{ animationDelay: '1s' }}></div>
                    <div className="absolute top-[15%] right-[30%] w-1 h-1 bg-white rounded-full shadow-[0_0_3px_#fff] animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                    <div className="absolute top-[35%] right-[15%] w-2 h-2 bg-white rounded-full shadow-[0_0_6px_#fff] animate-pulse" style={{ animationDelay: '1.5s' }}></div>
                    <div className="absolute top-[40%] left-[10%] w-1 h-1 bg-white rounded-full shadow-[0_0_4px_#fff] animate-pulse" style={{ animationDelay: '2s' }}></div>
                </div>
            )}

            {/* Realistic Clouds */}
            <RealisticCloud className="top-12 left-[10%] animate-float-slow scale-75" opacity={isNight ? 0.2 : 0.4} />
            <RealisticCloud className="top-24 left-[30%] animate-float-slower scale-110" opacity={isNight ? 0.1 : 0.25} style={{ animationDelay: '1s' }} />
            <RealisticCloud className="top-16 right-[20%] animate-float-slow scale-90" opacity={isNight ? 0.15 : 0.3} style={{ animationDelay: '2s' }} />
            <RealisticCloud className="top-32 right-[40%] animate-float-slower scale-50" opacity={isNight ? 0.1 : 0.2} style={{ animationDelay: '3s' }} />

            {/* Birds (only daytime) */}
            {!isNight && (
                <>
                    {/* Đàn chim 1 bay từ Phải sang Trái (Hải âu - Wingull) */}
                    <div className="absolute top-10 left-0 w-full h-full pointer-events-none z-0 opacity-60">
                        <div className="absolute animate-fly-rtl">
                            <div className="flex gap-6 animate-bobbing">
                                <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/278.gif" className="w-8 h-8 object-contain" alt="seagull" />
                                <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/278.gif" className="w-7 h-7 object-contain mt-8" alt="seagull" />
                                <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/278.gif" className="w-10 h-10 object-contain -mt-4" alt="seagull" />
                                <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/278.gif" className="w-6 h-6 object-contain mt-12" alt="seagull" />
                                <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/278.gif" className="w-7 h-7 object-contain -mt-8 ml-4" alt="seagull" />
                            </div>
                        </div>
                    </div>

                    {/* Đàn chim 2 bay từ Trái sang Phải (Bồ nông Pelipper & Togekiss đang bay) */}
                    <div className="absolute top-28 left-0 w-full h-full pointer-events-none z-0 opacity-60">
                        <div className="absolute animate-fly-ltr" style={{ animationDelay: '5s' }}>
                            <div className="flex gap-4 animate-bobbing">
                                <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/279.gif" className="w-10 h-10 object-contain mt-2" alt="pelipper" />
                                <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/468.gif" className="w-8 h-8 object-contain -mt-6" alt="togekiss" />
                                <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/468.gif" className="w-7 h-7 object-contain mt-8 ml-2" alt="togekiss" />
                                <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/279.gif" className="w-11 h-11 object-contain -mt-2 ml-4" alt="pelipper" />
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Sóng biển tự nhiên (Layer dưới) */}
            <div className={`absolute bottom-12 left-0 w-full overflow-hidden leading-[0] z-0 transition-opacity duration-1000 ${isNight ? 'opacity-20' : 'opacity-80'}`}>
                <svg className="relative block w-[200%] md:w-full h-[80px] md:h-[120px]" xmlns="http://www.w3.org/2000/svg" viewBox="0 24 150 28" preserveAspectRatio="none" shapeRendering="auto">
                    <defs>
                        <path id="gentle-wave" d="M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z" />
                    </defs>
                    <g>
                        <use href="#gentle-wave" x="48" y="0" className="wave-use" fill="rgba(125, 211, 252, 0.8)" /> {/* sky-300 */}
                        <use href="#gentle-wave" x="48" y="3" className="wave-use" fill="rgba(186, 230, 253, 0.8)" /> {/* sky-200 */}
                        <use href="#gentle-wave" x="48" y="5" className="wave-use" fill="rgba(224, 242, 254, 0.8)" /> {/* sky-100 */}
                        <use href="#gentle-wave" x="48" y="7" className="wave-use" fill="#7dd3fc" /> {/* sky-300 solid */}
                    </g>
                </svg>
            </div>

            {/* Ảnh GIF vui nhộn do người dùng cung cấp (Đặt ngoài overflow-hidden) */}
            <div 
                className={`absolute bottom-[120px] left-[20%] w-24 md:w-32 z-10 pointer-events-none transition-opacity duration-1000 ${!isNight ? 'opacity-90' : 'opacity-30'} drop-shadow-md`}
            >
                <img src="https://media.tenor.com/leZaIBtFzDUAAAAi/dolphin.gif" alt="Animated GIF" className="w-full h-auto object-contain" />
            </div>

            {/* Bãi cát vàng (Layer giữa) */}
            <div className={`absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-[#e6d0a3] to-[#f4e8c1] z-10 transition-opacity duration-1000 ${isNight ? 'opacity-30' : 'opacity-100'}`} style={{ clipPath: 'ellipse(120% 100% at 50% 100%)' }}>
                
                {/* Ốc, sò, cua nằm trên cát */}
                <div className="absolute bottom-6 left-[10%] text-2xl drop-shadow-sm rotate-12">🐚</div>
                <div className="absolute bottom-2 left-[25%] text-xl drop-shadow-sm -rotate-45">🦪</div>
                <div className="absolute bottom-10 left-[40%] text-3xl drop-shadow-sm rotate-[20deg] animate-[pulse_4s_ease-in-out_infinite]">🦀</div>
                <div className="absolute bottom-4 right-[35%] text-2xl drop-shadow-sm -rotate-12">🐚</div>
                <div className="absolute bottom-8 right-[25%] text-xl drop-shadow-sm rotate-[60deg]">🦪</div>
                <div className="absolute bottom-3 right-[12%] text-3xl drop-shadow-sm rotate-6">🐚</div>
                <div className="absolute bottom-12 right-[5%] text-sm drop-shadow-sm">🦞</div>
            </div>

            {/* Palm Trees mọc trên bãi cát (Layer trên) */}
            <div className={`absolute bottom-4 left-[5%] text-[130px] leading-none animate-sway-delayed drop-shadow-lg z-20 pointer-events-none transition-opacity duration-1000 ${isNight ? 'opacity-20' : 'opacity-80'}`} style={{ transformOrigin: 'bottom center', WebkitMaskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)' }}>
                🌴
            </div>
            <div className={`absolute bottom-0 right-[2%] text-[280px] leading-none animate-sway drop-shadow-xl z-20 pointer-events-none transition-opacity duration-1000 ${isNight ? 'opacity-20' : 'opacity-90'}`} style={{ transformOrigin: 'bottom center', WebkitMaskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)' }}>
                🌴
            </div>
            <div className={`absolute bottom-10 right-[15%] text-[90px] leading-none animate-sway-delayed drop-shadow-md z-10 pointer-events-none transition-opacity duration-1000 ${isNight ? 'opacity-10' : 'opacity-70'}`} style={{ transformOrigin: 'bottom center', animationDelay: '2s', WebkitMaskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)' }}>
                🌴
            </div>
        </div>
        </>
    );
};

export default SummerBackground;
