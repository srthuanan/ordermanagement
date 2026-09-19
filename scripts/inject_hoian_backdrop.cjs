const fs = require('fs');
const esbuild = require('esbuild');

const backdropPath = 'components/login/MidAutumnSvgBackdrop.tsx';
let content = fs.readFileSync(backdropPath, 'utf8');

// 1. Inject Hội An CSS Animations into <style>
const styleInjectPoint = '/* Keyframes đung đưa tự nhiên chuẩn từ móc treo trên dây */';
const hoianStyles = `
                /* HỘI AN ANCIENT TOWN ANIMATIONS */
                @keyframes hoian-boat-bob-1 {
                    0%, 100% { transform: translate(0, 0) rotate(0.8deg); }
                    50% { transform: translate(0, -5px) rotate(-1deg); }
                }
                .animate-hoian-boat-1 {
                    animation: hoian-boat-bob-1 6.5s ease-in-out infinite;
                }

                @keyframes hoian-boat-bob-2 {
                    0%, 100% { transform: translate(0, 0) rotate(-1deg); }
                    50% { transform: translate(0, -6px) rotate(0.8deg); }
                }
                .animate-hoian-boat-2 {
                    animation: hoian-boat-bob-2 7.2s ease-in-out infinite 1.2s;
                }

                @keyframes hoian-hoa-dang-float-1 {
                    0% { transform: translate(0, 0); }
                    50% { transform: translate(14px, -3px); }
                    100% { transform: translate(28px, 1px); }
                }
                @keyframes hoian-hoa-dang-float-2 {
                    0% { transform: translate(0, 0); }
                    50% { transform: translate(-12px, -4px); }
                    100% { transform: translate(-25px, 0px); }
                }
                .animate-hoa-dang-1 {
                    animation: hoian-hoa-dang-float-1 12s ease-in-out infinite alternate;
                }
                .animate-hoa-dang-2 {
                    animation: hoian-hoa-dang-float-2 15s ease-in-out infinite alternate 1.5s;
                }
                .animate-hoa-dang-3 {
                    animation: hoian-hoa-dang-float-1 10s ease-in-out infinite alternate 3s;
                }

                @keyframes hoian-water-shimmer {
                    0%, 100% { opacity: 0.45; }
                    50% { opacity: 0.75; }
                }
                .animate-water-shimmer {
                    animation: hoian-water-shimmer 4.5s ease-in-out infinite;
                }

                @keyframes hoian-lantern-flicker {
                    0%, 100% { opacity: 0.88; }
                    50% { opacity: 1; }
                }
                .animate-hoian-lantern {
                    animation: hoian-lantern-flicker 3.8s ease-in-out infinite;
                }

                ${styleInjectPoint}`;

content = content.replace(styleInjectPoint, hoianStyles);

// 2. Inject Hội An Defs before </defs>
const defsInjectPoint = '</defs>';
const hoianDefs = `
                    {/* HỘI AN ANCIENT TOWN DEFS */}
                    <radialGradient id="haTownAura" cx="50%" cy="48%" r="60%">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.20" />
                        <stop offset="45%" stopColor="#d97706" stopOpacity="0.08" />
                        <stop offset="100%" stopColor="#020617" stopOpacity="0" />
                    </radialGradient>

                    <linearGradient id="haWallGold1" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#b45309" />
                        <stop offset="35%" stopColor="#d97706" />
                        <stop offset="70%" stopColor="#b45309" />
                        <stop offset="100%" stopColor="#78350f" />
                    </linearGradient>

                    <linearGradient id="haWallGoldBright" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#d97706" />
                        <stop offset="40%" stopColor="#f59e0b" />
                        <stop offset="80%" stopColor="#d97706" />
                        <stop offset="100%" stopColor="#92400e" />
                    </linearGradient>

                    <linearGradient id="haWallMoss" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#1e2410" />
                        <stop offset="35%" stopColor="#b45309" />
                        <stop offset="75%" stopColor="#d97706" />
                        <stop offset="100%" stopColor="#141e12" />
                    </linearGradient>

                    <linearGradient id="haWallRedAncient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#831843" />
                        <stop offset="40%" stopColor="#991b1b" />
                        <stop offset="80%" stopColor="#7f1d1d" />
                        <stop offset="100%" stopColor="#450a0a" />
                    </linearGradient>

                    <linearGradient id="haRoofTile" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#2d1502" />
                        <stop offset="40%" stopColor="#451a03" />
                        <stop offset="80%" stopColor="#78350f" />
                        <stop offset="100%" stopColor="#1a0a01" />
                    </linearGradient>

                    <linearGradient id="haRoofIndigo" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#1e1b4b" />
                        <stop offset="40%" stopColor="#312e81" />
                        <stop offset="85%" stopColor="#17153b" />
                        <stop offset="100%" stopColor="#0b0a1d" />
                    </linearGradient>

                    <linearGradient id="haWarmLight" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                        <stop offset="30%" stopColor="#fef08a" stopOpacity="0.9" />
                        <stop offset="70%" stopColor="#f59e0b" stopOpacity="0.75" />
                        <stop offset="100%" stopColor="#b45309" stopOpacity="0.5" />
                    </linearGradient>

                    <radialGradient id="haBougPink" cx="30%" cy="30%" r="70%">
                        <stop offset="0%" stopColor="#f472b6" />
                        <stop offset="45%" stopColor="#db2777" />
                        <stop offset="85%" stopColor="#9d174d" />
                        <stop offset="100%" stopColor="#4c0519" />
                    </radialGradient>

                    <radialGradient id="haBougPurple" cx="30%" cy="30%" r="70%">
                        <stop offset="0%" stopColor="#e879f9" />
                        <stop offset="50%" stopColor="#c026d3" />
                        <stop offset="90%" stopColor="#701a75" />
                        <stop offset="100%" stopColor="#3b0764" />
                    </radialGradient>

                    <linearGradient id="haRiverGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#06122d" />
                        <stop offset="20%" stopColor="#0a1a3e" />
                        <stop offset="50%" stopColor="#071533" />
                        <stop offset="80%" stopColor="#040e24" />
                        <stop offset="100%" stopColor="#020714" />
                    </linearGradient>

                    <radialGradient id="haWaterAuraWide" cx="50%" cy="20%" r="65%">
                        <stop offset="0%" stopColor="#fef08a" stopOpacity="0.30" />
                        <stop offset="35%" stopColor="#f59e0b" stopOpacity="0.16" />
                        <stop offset="75%" stopColor="#b45309" stopOpacity="0.05" />
                        <stop offset="100%" stopColor="#06122d" stopOpacity="0" />
                    </radialGradient>

                    <linearGradient id="refHouseGold" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.45" />
                        <stop offset="35%" stopColor="#d97706" stopOpacity="0.25" />
                        <stop offset="70%" stopColor="#b45309" stopOpacity="0.10" />
                        <stop offset="100%" stopColor="#06122d" stopOpacity="0" />
                    </linearGradient>

                    <linearGradient id="refChuaCau" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#d97706" stopOpacity="0.38" />
                        <stop offset="40%" stopColor="#92400e" stopOpacity="0.20" />
                        <stop offset="100%" stopColor="#06122d" stopOpacity="0" />
                    </linearGradient>

                    <linearGradient id="haLotusRose" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#fecdd3" />
                        <stop offset="40%" stopColor="#f43f5e" />
                        <stop offset="85%" stopColor="#be123c" />
                        <stop offset="100%" stopColor="#4c0519" />
                    </linearGradient>

                    <linearGradient id="haLotusAmber" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#fef08a" />
                        <stop offset="40%" stopColor="#f59e0b" />
                        <stop offset="85%" stopColor="#d97706" />
                        <stop offset="100%" stopColor="#78350f" />
                    </linearGradient>

                    <linearGradient id="haLotusCyan" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#cffafe" />
                        <stop offset="40%" stopColor="#06b6d4" />
                        <stop offset="85%" stopColor="#0e7490" />
                        <stop offset="100%" stopColor="#164e63" />
                    </linearGradient>

                    <linearGradient id="haLotusViolet" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#f5d0fe" />
                        <stop offset="40%" stopColor="#c026d3" />
                        <stop offset="85%" stopColor="#86198f" />
                        <stop offset="100%" stopColor="#4a044e" />
                    </linearGradient>

                    <radialGradient id="haCandleFlame" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#ffffff" />
                        <stop offset="35%" stopColor="#fef08a" />
                        <stop offset="70%" stopColor="#f97316" />
                        <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
                    </radialGradient>

                    <linearGradient id="haBoatWood" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#5c3818" />
                        <stop offset="40%" stopColor="#3d2008" />
                        <stop offset="80%" stopColor="#251203" />
                        <stop offset="100%" stopColor="#130801" />
                    </linearGradient>

                    <radialGradient id="haCardAreaDarken" cx="50%" cy="58%" r="48%">
                        <stop offset="0%" stopColor="#020617" stopOpacity="0.45" />
                        <stop offset="60%" stopColor="#020617" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#020617" stopOpacity="0" />
                    </radialGradient>
                </defs>`;

content = content.replace(defsInjectPoint, hoianDefs);

// 3. Inject the Hội An Ancient Town SVG layers right after rect sky and before the Moon
const townInjectPoint = '{/* 2. ÁNH MÂY BỤI TINH VÂN KHỔNG LỒ */}';
const hoianArtwork = `
                {/* ============================================================================== */}
                {/* 1.5. BỨC TRANH SVG ĐỘNG: PHỐ CỔ HỘI AN ĐÊM RẰM TRUNG THU BÊN DÒNG SÔNG HOÀI */}
                {/* ============================================================================== */}
                <g id="hoian-ancient-town-artwork">
                    {/* HÀO QUANG ÁNH SÁNG PHỐ CỔ VỀ ĐÊM */}
                    <rect width="1920" height="1080" fill="url(#haTownAura)" />

                    {/* DÃY MÁI NHÀ PHỐ CỔ NỀN XA NHẤP NHÔ (SILHOUETTE SKYLINE) */}
                    <g opacity="0.65">
                        <path d="M 0,380 L 60,345 L 120,380 L 160,355 L 240,390 L 320,340 L 400,385 L 470,350 L 550,390 L 630,345 L 720,385 L 810,335 L 890,380 L 960,330 L 1040,385 L 1120,345 L 1200,385 L 1280,335 L 1370,380 L 1450,340 L 1540,385 L 1620,345 L 1710,385 L 1800,340 L 1880,380 L 1920,360 L 1920,545 L 0,545 Z" fill="#0b1738" />
                        {/* Lồng đèn xa xăm lấp lánh */}
                        <circle cx="80" cy="370" r="2.5" fill="#f59e0b" filter="url(#maSoftGlow)" />
                        <circle cx="190" cy="375" r="2" fill="#ef4444" filter="url(#maSoftGlow)" />
                        <circle cx="340" cy="365" r="2.8" fill="#fef08a" filter="url(#maSoftGlow)" />
                        <circle cx="500" cy="370" r="2.2" fill="#f59e0b" filter="url(#maSoftGlow)" />
                        <circle cx="670" cy="365" r="2.5" fill="#ef4444" filter="url(#maSoftGlow)" />
                        <circle cx="840" cy="358" r="2.8" fill="#fef08a" filter="url(#maSoftGlow)" />
                        <circle cx="1000" cy="355" r="2.8" fill="#f59e0b" filter="url(#maSoftGlow)" />
                        <circle cx="1160" cy="368" r="2.2" fill="#ef4444" filter="url(#maSoftGlow)" />
                        <circle cx="1320" cy="360" r="2.8" fill="#fef08a" filter="url(#maSoftGlow)" />
                        <circle cx="1490" cy="365" r="2.5" fill="#f59e0b" filter="url(#maSoftGlow)" />
                        <circle cx="1660" cy="368" r="2.2" fill="#ef4444" filter="url(#maSoftGlow)" />
                        <circle cx="1840" cy="362" r="2.8" fill="#fef08a" filter="url(#maSoftGlow)" />
                    </g>

                    {/* [KHU VỰC 1: CHÙA CẦU HỘI AN - LAI VIỄN KIỀU] (x: 45..390) */}
                    <g id="chua-cau" transform="translate(45, 315)" filter="url(#maDropShadow)">
                        <polygon points="65,225 90,165 125,165 110,225" fill="#1e293b" />
                        <polygon points="160,225 180,165 215,165 205,225" fill="#1e293b" />
                        <polygon points="255,225 270,165 305,165 290,225" fill="#1e293b" />
                        <path d="M 25,178 Q 185,135 345,178 L 345,160 Q 185,118 25,160 Z" fill="url(#haBoatWood)" stroke="#1a0d02" strokeWidth="2" />
                        <path d="M 35,160 Q 185,122 335,160" fill="none" stroke="#eab308" strokeWidth="1.2" opacity="0.6" />
                        
                        {/* Lan can con tiện Chùa Cầu */}
                        <path d="M 40,148 Q 185,108 330,148" fill="none" stroke="#78350f" strokeWidth="3.5" />
                        <path d="M 70,154 L 70,142 M 105,146 L 105,134 M 145,138 L 145,126 M 185,133 L 185,120 M 225,138 L 225,126 M 265,146 L 265,134 M 300,154 L 300,142" stroke="#3d1a04" strokeWidth="2.2" />

                        {/* Nhà chùa gỗ & vách vàng */}
                        <rect x="65" y="90" width="240" height="58" fill="#2d1502" />
                        <rect x="80" y="96" width="45" height="42" rx="2" fill="url(#haWallGold1)" stroke="#451a03" strokeWidth="1.5" />
                        <rect x="245" y="96" width="45" height="42" rx="2" fill="url(#haWallGold1)" stroke="#451a03" strokeWidth="1.5" />
                        
                        {/* Cửa sổ tròn cổ kính tỏa sáng */}
                        <rect x="135" y="98" width="100" height="40" rx="2" fill="#1b0b01" />
                        <circle cx="185" cy="118" r="14" fill="url(#haWarmLight)" stroke="#78350f" strokeWidth="2" filter="url(#maSoftGlow)" />
                        <line x1="185" y1="104" x2="185" y2="132" stroke="#451a03" strokeWidth="1.8" />
                        <line x1="171" y1="118" x2="199" y2="118" stroke="#451a03" strokeWidth="1.8" />

                        {/* Mái ngói đa tầng đầu đao cong vút */}
                        <path d="M 45,98 C 120,82 250,82 325,98 L 315,84 C 240,70 130,70 55,84 Z" fill="url(#haRoofTile)" stroke="#1a0a01" strokeWidth="1.8" />
                        <path d="M 115,76 C 150,52 220,52 255,76 L 250,50 C 220,40 150,40 120,50 Z" fill="url(#haRoofTile)" stroke="#1a0a01" strokeWidth="1.8" />
                        <circle cx="185" cy="42" r="5" fill="#f59e0b" filter="url(#maSoftGlow)" />
                        <path d="M 185,37 L 185,30 M 174,44 Q 185,36 196,44" stroke="#fef08a" strokeWidth="2" fill="none" strokeLinecap="round" />
                        <path d="M 45,98 Q 30,94 32,82" fill="none" stroke="#f59e0b" strokeWidth="2.8" strokeLinecap="round" />
                        <path d="M 325,98 Q 340,94 338,82" fill="none" stroke="#f59e0b" strokeWidth="2.8" strokeLinecap="round" />
                        <path d="M 115,76 Q 102,72 106,62" fill="none" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" />
                        <path d="M 255,76 Q 268,72 264,62" fill="none" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" />

                        {/* Hàng lồng đèn đỏ Hội An treo dưới hiên Chùa Cầu */}
                        <g filter="url(#maSoftGlow)" className="animate-hoian-lantern">
                            <ellipse cx="75" cy="108" rx="6" ry="8" fill="#ef4444" />
                            <ellipse cx="125" cy="104" rx="5.5" ry="7.5" fill="#f59e0b" />
                            <ellipse cx="185" cy="88" rx="7.5" ry="10" fill="#dc2626" />
                            <circle cx="185" cy="88" r="3.8" fill="#fef08a" />
                            <ellipse cx="245" cy="104" rx="5.5" ry="7.5" fill="#f59e0b" />
                            <ellipse cx="295" cy="108" rx="6" ry="8" fill="#ef4444" />
                        </g>
                    </g>

                    {/* [KHU VỰC 2: DÃY PHỐ CỔ TƯỜNG VÀNG BÊN TRÁI] (x: 365..660) */}
                    <g id="nhaco-block-left" transform="translate(365, 290)" filter="url(#maDropShadow)">
                        <rect x="0" y="80" width="165" height="175" fill="url(#haWallGoldBright)" />
                        <path d="M 0,80 L 45,80 L 25,150 L 0,170 Z" fill="url(#haWallMoss)" opacity="0.75" />
                        <path d="M 125,180 L 165,155 L 165,255 L 115,255 Z" fill="#78350f" opacity="0.65" />

                        <rect x="25" y="105" width="45" height="55" rx="3" fill="#291102" />
                        <rect x="30" y="110" width="35" height="50" rx="2" fill="url(#haWarmLight)" filter="url(#maSoftGlow)" />
                        <line x1="47.5" y1="110" x2="47.5" y2="160" stroke="#451a03" strokeWidth="1.8" />
                        
                        <rect x="95" y="105" width="45" height="55" rx="3" fill="#291102" />
                        <rect x="100" y="110" width="35" height="50" rx="2" fill="url(#haWarmLight)" filter="url(#maSoftGlow)" />
                        <line x1="117.5" y1="110" x2="117.5" y2="160" stroke="#451a03" strokeWidth="1.8" />

                        <rect x="10" y="158" width="145" height="10" fill="#2d1502" />
                        <path d="M 20,168 L 20,158 M 40,168 L 40,158 M 60,168 L 60,158 M 80,168 L 80,158 M 100,168 L 100,158 M 120,168 L 120,158 M 140,168 L 140,158" stroke="#451a03" strokeWidth="2" />

                        <rect x="40" y="185" width="85" height="70" rx="3" fill="#1f0f02" />
                        <rect x="48" y="192" width="69" height="63" fill="url(#haWarmLight)" opacity="0.9" filter="url(#maSoftGlow)" />
                        <rect x="40" y="185" width="38" height="70" fill="#3a1e05" stroke="#1c1917" strokeWidth="1.2" />
                        <rect x="87" y="185" width="38" height="70" fill="#3a1e05" stroke="#1c1917" strokeWidth="1.2" />

                        <path d="M -15,85 C 35,60 135,60 180,85 L 170,68 C 125,48 45,48 -5,68 Z" fill="url(#haRoofTile)" stroke="#1a0a01" strokeWidth="1.8" />
                        <path d="M -15,85 Q -25,80 -20,70" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
                        <path d="M 180,85 Q 190,80 185,70" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />

                        {/* Giàn hoa giấy Hội An rủ bóng */}
                        <g filter="url(#maSoftGlow)">
                            <circle cx="145" cy="95" r="16" fill="url(#haBougPink)" />
                            <circle cx="160" cy="115" r="18" fill="url(#haBougPink)" />
                            <circle cx="148" cy="138" r="20" fill="url(#haBougPink)" />
                            <circle cx="165" cy="158" r="15" fill="url(#haBougPink)" />
                            <circle cx="142" cy="172" r="16" fill="url(#haBougPink)" />
                            <circle cx="155" cy="192" r="12" fill="#ec4899" />
                            <circle cx="132" cy="145" r="8" fill="#f472b6" />
                        </g>

                        {/* Lồng đèn hiên nhà */}
                        <path d="M 0,95 Q 85,110 165,95" fill="none" stroke="#78350f" strokeWidth="1.4" />
                        <ellipse cx="30" cy="106" rx="6.5" ry="8.5" fill="#dc2626" filter="url(#maSoftGlow)" />
                        <ellipse cx="65" cy="109" rx="5.5" ry="7.5" fill="#059669" filter="url(#maSoftGlow)" />
                        <ellipse cx="105" cy="110" rx="6.5" ry="8.5" fill="#f59e0b" filter="url(#maSoftGlow)" />

                        {/* Nhà kế bên màu đỏ gạch nung */}
                        <rect x="165" y="65" width="120" height="190" fill="url(#haWallRedAncient)" />
                        <path d="M 155,70 C 205,48 275,48 295,70 L 288,55 C 265,38 210,38 160,55 Z" fill="url(#haRoofIndigo)" stroke="#1a0a01" strokeWidth="1.5" />
                        <path d="M 195,130 C 195,100 245,100 245,130 L 245,165 L 195,165 Z" fill="url(#haWarmLight)" filter="url(#maSoftGlow)" />
                        <ellipse cx="220" cy="120" rx="6" ry="8" fill="#f59e0b" filter="url(#maSoftGlow)" />
                    </g>

                    {/* [KHU VỰC 3: DÃY PHỐ CỔ TRUNG TÂM NỀN SAU] (x: 650..1280) */}
                    <g id="nhaco-block-center" transform="translate(650, 275)" filter="url(#maDropShadow)">
                        <rect x="0" y="90" width="150" height="180" fill="url(#haWallGold1)" />
                        <path d="M -10,95 C 40,70 120,70 160,95 L 152,78 C 115,58 45,58 -2,78 Z" fill="url(#haRoofTile)" stroke="#1a0a01" strokeWidth="1.6" />
                        <rect x="25" y="115" width="40" height="48" fill="url(#haWarmLight)" filter="url(#maSoftGlow)" />
                        <rect x="85" y="115" width="40" height="48" fill="url(#haWarmLight)" filter="url(#maSoftGlow)" />

                        {/* Hội Quán Phúc Kiến với đầu đao ngói cong */}
                        <rect x="150" y="70" width="180" height="200" fill="url(#haWallGoldBright)" />
                        <path d="M 135,75 C 205,45 305,45 345,75 L 335,55 C 295,35 215,35 145,55 Z" fill="url(#haRoofTile)" stroke="#1a0a01" strokeWidth="2" />
                        <path d="M 135,75 Q 115,70 120,58" fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
                        <path d="M 345,75 Q 365,70 360,58" fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
                        <path d="M 210,135 C 210,95 270,95 270,135 L 270,185 L 210,185 Z" fill="url(#haWarmLight)" filter="url(#maSoftGlow)" />
                        <ellipse cx="185" cy="115" rx="7" ry="10" fill="#dc2626" filter="url(#maSoftGlow)" />
                        <ellipse cx="295" cy="115" rx="7" ry="10" fill="#dc2626" filter="url(#maSoftGlow)" />

                        <rect x="330" y="105" width="150" height="165" fill="url(#haWallGold1)" />
                        <path d="M 320,110 C 370,88 450,88 490,110 L 482,95 C 445,78 375,78 328,95 Z" fill="url(#haRoofIndigo)" stroke="#1a0a01" strokeWidth="1.6" />
                        <rect x="355" y="130" width="38" height="42" fill="url(#haWarmLight)" filter="url(#maSoftGlow)" />
                        <rect x="415" y="130" width="38" height="42" fill="url(#haWarmLight)" filter="url(#maSoftGlow)" />

                        {/* Quán trà xưa với giàn hoa giấy tím */}
                        <rect x="480" y="85" width="150" height="185" fill="url(#haWallGoldBright)" />
                        <path d="M 470,90 C 520,68 600,68 640,90 L 632,75 C 595,58 525,58 478,75 Z" fill="url(#haRoofTile)" stroke="#1a0a01" strokeWidth="1.6" />
                        <rect x="505" y="115" width="45" height="50" fill="url(#haWarmLight)" filter="url(#maSoftGlow)" />
                        <rect x="570" y="115" width="45" height="50" fill="url(#haWarmLight)" filter="url(#maSoftGlow)" />

                        <g filter="url(#maSoftGlow)">
                            <circle cx="475" cy="105" r="18" fill="url(#haBougPurple)" />
                            <circle cx="490" cy="125" r="20" fill="url(#haBougPurple)" />
                            <circle cx="478" cy="148" r="22" fill="url(#haBougPurple)" />
                            <circle cx="495" cy="170" r="16" fill="url(#haBougPurple)" />
                        </g>

                        <path d="M 20,105 Q 160,125 310,105 Q 460,125 610,105" fill="none" stroke="#78350f" strokeWidth="1.5" />
                        <ellipse cx="60" cy="116" rx="6" ry="8" fill="#f59e0b" filter="url(#maSoftGlow)" />
                        <ellipse cx="110" cy="120" rx="5.5" ry="7.5" fill="#ef4444" filter="url(#maSoftGlow)" />
                        <ellipse cx="160" cy="118" rx="6.5" ry="8.5" fill="#06b6d4" filter="url(#maSoftGlow)" />
                        <ellipse cx="360" cy="118" rx="6" ry="8" fill="#ec4899" filter="url(#maSoftGlow)" />
                        <ellipse cx="410" cy="120" rx="5.5" ry="7.5" fill="#f59e0b" filter="url(#maSoftGlow)" />
                        <ellipse cx="560" cy="118" rx="6.5" ry="8.5" fill="#ef4444" filter="url(#maSoftGlow)" />
                    </g>

                    {/* [KHU VỰC 4: DÃY PHỐ CỔ BÊN PHẢI] (x: 1280..1920) */}
                    <g id="nhaco-block-right" transform="translate(1280, 285)" filter="url(#maDropShadow)">
                        <rect x="0" y="85" width="180" height="175" fill="url(#haWallGoldBright)" />
                        <path d="M 0,85 L 50,85 L 30,150 L 0,170 Z" fill="url(#haWallMoss)" opacity="0.7" />

                        <rect x="25" y="110" width="45" height="52" rx="3" fill="#291102" />
                        <rect x="30" y="115" width="35" height="42" fill="url(#haWarmLight)" filter="url(#maSoftGlow)" />
                        <line x1="47.5" y1="115" x2="47.5" y2="157" stroke="#451a03" strokeWidth="1.8" />
                        
                        <rect x="110" y="110" width="45" height="52" rx="3" fill="#291102" />
                        <rect x="115" y="115" width="35" height="42" fill="url(#haWarmLight)" filter="url(#maSoftGlow)" />
                        <line x1="132.5" y1="115" x2="132.5" y2="157" stroke="#451a03" strokeWidth="1.8" />

                        <rect x="10" y="160" width="160" height="10" fill="#2d1502" />
                        <path d="M 20,170 L 20,160 M 40,170 L 40,160 M 60,170 L 60,160 M 80,170 L 80,160 M 100,170 L 100,160 M 120,170 L 120,160 M 140,170 L 140,160 M 160,170 L 160,160" stroke="#3d1e06" strokeWidth="1.8" />

                        <rect x="40" y="188" width="100" height="68" rx="3" fill="#1f1003" />
                        <rect x="50" y="195" width="80" height="61" fill="url(#haWarmLight)" opacity="0.9" filter="url(#maSoftGlow)" />
                        <rect x="40" y="188" width="45" height="68" fill="#3a1e05" stroke="#1c1917" strokeWidth="1.2" />
                        <rect x="95" y="188" width="45" height="68" fill="#3a1e05" stroke="#1c1917" strokeWidth="1.2" />

                        <path d="M -15,90 C 40,65 140,65 195,90 L 185,72 C 130,52 50,52 -5,72 Z" fill="url(#haRoofTile)" stroke="#1e1003" strokeWidth="1.8" />
                        <path d="M -15,90 Q -25,85 -20,74" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
                        <path d="M 195,90 Q 205,85 200,74" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />

                        {/* Nhà cổ 3 gian mái cao tường vàng */}
                        <rect x="180" y="60" width="200" height="200" fill="url(#haWallGold1)" />
                        <path d="M 165,65 C 235,38 345,38 395,65 L 385,48 C 335,28 245,28 175,48 Z" fill="url(#haRoofIndigo)" stroke="#1e1003" strokeWidth="2" />
                        <path d="M 165,65 Q 148,60 152,48" fill="none" stroke="#f59e0b" strokeWidth="2.8" strokeLinecap="round" />
                        <path d="M 395,65 Q 412,60 408,48" fill="none" stroke="#f59e0b" strokeWidth="2.8" strokeLinecap="round" />

                        <path d="M 210,125 C 210,98 245,98 245,125 L 245,150 L 210,150 Z" fill="url(#haWarmLight)" filter="url(#maSoftGlow)" />
                        <path d="M 265,125 C 265,98 300,98 300,125 L 300,150 L 265,150 Z" fill="url(#haWarmLight)" filter="url(#maSoftGlow)" />
                        <path d="M 320,125 C 320,98 355,98 355,125 L 355,150 L 320,150 Z" fill="url(#haWarmLight)" filter="url(#maSoftGlow)" />

                        <rect x="380" y="80" width="220" height="180" fill="url(#haWallGoldBright)" />
                        <path d="M 365,85 C 445,60 555,60 615,85 L 605,68 C 545,48 455,48 375,68 Z" fill="url(#haRoofTile)" stroke="#1e1003" strokeWidth="1.8" />
                        <rect x="420" y="110" width="45" height="55" fill="url(#haWarmLight)" filter="url(#maSoftGlow)" />
                        <rect x="495" y="110" width="45" height="55" fill="url(#haWarmLight)" filter="url(#maSoftGlow)" />

                        {/* Giàn hoa giấy rủ bên phải */}
                        <g filter="url(#maSoftGlow)">
                            <circle cx="175" cy="75" r="18" fill="url(#haBougPink)" />
                            <circle cx="192" cy="95" r="22" fill="url(#haBougPink)" />
                            <circle cx="178" cy="118" r="24" fill="url(#haBougPink)" />
                            <circle cx="198" cy="142" r="18" fill="url(#haBougPink)" />
                            <circle cx="180" cy="165" r="16" fill="url(#haBougPink)" />
                            <circle cx="165" cy="138" r="14" fill="#ec4899" />
                        </g>

                        {/* Dây lồng đèn Hội An đa sắc */}
                        <path d="M 10,100 Q 100,118 180,100 Q 280,120 380,100 Q 480,120 580,100" fill="none" stroke="#78350f" strokeWidth="1.5" />
                        <ellipse cx="45" cy="112" rx="6" ry="8" fill="#f59e0b" filter="url(#maSoftGlow)" />
                        <ellipse cx="90" cy="115" rx="6.5" ry="6.5" fill="#ef4444" filter="url(#maSoftGlow)" />
                        <ellipse cx="140" cy="114" rx="7" ry="5.5" fill="#06b6d4" filter="url(#maSoftGlow)" />
                        <ellipse cx="230" cy="116" rx="6" ry="8.5" fill="#dc2626" filter="url(#maSoftGlow)" />
                        <ellipse cx="280" cy="118" rx="6.5" ry="7.5" fill="#eab308" filter="url(#maSoftGlow)" />
                        <ellipse cx="330" cy="115" rx="6" ry="8" fill="#db2777" filter="url(#maSoftGlow)" />
                        <ellipse cx="430" cy="116" rx="6.5" ry="8" fill="#059669" filter="url(#maSoftGlow)" />
                        <ellipse cx="480" cy="118" rx="6.5" ry="8.5" fill="#ef4444" filter="url(#maSoftGlow)" />
                    </g>

                    {/* BỜ KÈ ĐÁ CỔ VEN SÔNG BẠCH ĐẰNG (y: 520..565) */}
                    <g id="bo-ke-da-co">
                        <polygon points="0,520 1920,520 1920,545 0,545" fill="#334155" />
                        <line x1="0" y1="520" x2="1920" y2="520" stroke="#64748b" strokeWidth="1.6" opacity="0.8" />
                        <polygon points="0,545 1920,545 1920,565 0,565" fill="#0f172a" />
                        <line x1="0" y1="545" x2="1920" y2="545" stroke="#94a3b8" strokeWidth="1.4" opacity="0.85" />

                        {/* Cọc gỗ & trụ đèn lồng đá */}
                        <rect x="180" y="528" width="9" height="26" rx="2" fill="#2d1502" />
                        <circle cx="184.5" cy="528" r="5" fill="#f59e0b" filter="url(#maSoftGlow)" />
                        <rect x="420" y="530" width="8" height="24" rx="2" fill="#2d1502" />
                        <circle cx="424" cy="530" r="4.5" fill="#ef4444" filter="url(#maSoftGlow)" />
                        <rect x="720" y="532" width="8" height="22" rx="2" fill="#2d1502" />
                        <rect x="1200" y="532" width="8" height="22" rx="2" fill="#2d1502" />
                        <rect x="1500" y="528" width="9" height="26" rx="2" fill="#2d1502" />
                        <circle cx="1504.5" cy="528" r="5" fill="#f59e0b" filter="url(#maSoftGlow)" />
                        <rect x="1780" y="530" width="8" height="24" rx="2" fill="#2d1502" />
                        <circle cx="1784" cy="530" r="4.5" fill="#ef4444" filter="url(#maSoftGlow)" />

                        {/* Bóng dáng người dạo phố & thả hoa đăng */}
                        <g transform="translate(440, 526)">
                            <path d="M -12,-8 L 12,-8 L 0,-19 Z" fill="#fef08a" stroke="#b45309" strokeWidth="0.8" />
                            <ellipse cx="0" cy="5" rx="6" ry="14" fill="#f43f5e" />
                            <path d="M -4,6 Q 4,22 12,25" stroke="#f43f5e" strokeWidth="4.5" fill="none" strokeLinecap="round" />
                            <circle cx="16" cy="27" r="5" fill="url(#haCandleFlame)" filter="url(#maBloom)" />
                        </g>
                        <g transform="translate(1470, 516)">
                            <circle cx="-8" cy="-15" r="4" fill="#1e293b" />
                            <path d="M -8,-10 L -8,18" stroke="#1e293b" strokeWidth="5.5" strokeLinecap="round" />
                            <circle cx="7" cy="-13" r="4" fill="#475569" />
                            <path d="M 7,-9 L 7,18" stroke="#be185d" strokeWidth="5" strokeLinecap="round" />
                            <line x1="11" y1="-2" x2="22" y2="4" stroke="#78350f" strokeWidth="1.4" />
                            <ellipse cx="22" cy="11" rx="4.5" ry="6.5" fill="#f59e0b" filter="url(#maSoftGlow)" />
                        </g>
                    </g>

                    {/* DÒNG SÔNG HOÀI & VỆT PHẢN CHIẾU ÁNH SÁNG (y: 565..1080) */}
                    <g id="song-hoai">
                        <rect x="0" y="565" width="1920" height="515" fill="url(#haRiverGrad)" />
                        <ellipse cx="960" cy="670" rx="750" ry="200" fill="url(#haWaterAuraWide)" />
                        <ellipse cx="300" cy="650" rx="320" ry="110" fill="url(#haWaterAuraWide)" opacity="0.75" />
                        <ellipse cx="1620" cy="650" rx="350" ry="110" fill="url(#haWaterAuraWide)" opacity="0.85" />

                        {/* Vệt phản chiếu ánh sáng dọc của dãy nhà cổ xuống sông */}
                        <g id="river-vertical-reflections" opacity="0.55" filter="url(#maSoftGlow)">
                            <rect x="70" y="565" width="280" height="420" fill="url(#refChuaCau)" opacity="0.4" />
                            <ellipse cx="185" cy="620" rx="35" ry="120" fill="#dc2626" opacity="0.25" />
                            <rect x="370" y="565" width="280" height="450" fill="url(#refHouseGold)" opacity="0.5" />
                            <ellipse cx="440" cy="640" rx="25" ry="90" fill="#f43f5e" opacity="0.25" />
                            <rect x="660" y="565" width="600" height="480" fill="url(#refHouseGold)" opacity="0.45" />
                            <ellipse cx="800" cy="630" rx="40" ry="110" fill="#ef4444" opacity="0.25" />
                            <rect x="1290" y="565" width="600" height="450" fill="url(#refHouseGold)" opacity="0.5" />
                            <ellipse cx="1470" cy="640" rx="30" ry="100" fill="#db2777" opacity="0.25" />
                        </g>

                        {/* Vệt sóng nước lung linh động */}
                        <g strokeLinecap="round" className="animate-water-shimmer" filter="url(#maSoftGlow)">
                            <path d="M 800,580 Q 960,586 1120,580" stroke="#fef08a" strokeWidth="2" fill="none" />
                            <path d="M 720,605 Q 960,612 1200,605" stroke="#fde047" strokeWidth="2.4" fill="none" />
                            <path d="M 640,635 Q 960,644 1280,635" stroke="#f59e0b" strokeWidth="2.8" fill="none" />
                            <path d="M 560,675 Q 960,686 1360,675" stroke="#f59e0b" strokeWidth="3.2" fill="none" />
                            <path d="M 480,725 Q 960,738 1440,725" stroke="#fde047" strokeWidth="3.5" fill="none" />
                            <path d="M 400,785 Q 960,800 1520,785" stroke="#fef08a" strokeWidth="3.8" fill="none" />
                            <path d="M 320,855 Q 960,872 1600,855" stroke="#f59e0b" strokeWidth="4" fill="none" />
                            <path d="M 240,935 Q 960,955 1680,935" stroke="#fde047" strokeWidth="4.2" fill="none" />
                            <path d="M 160,1025 Q 960,1048 1760,1025" stroke="#fef08a" strokeWidth="4.5" fill="none" />

                            <path d="M 70,595 Q 220,602 370,595" stroke="#f59e0b" strokeWidth="1.8" fill="none" />
                            <path d="M 40,625 Q 230,634 420,625" stroke="#ef4444" strokeWidth="2.2" fill="none" opacity="0.7" />
                            <path d="M 20,665 Q 240,676 460,665" stroke="#f59e0b" strokeWidth="2.6" fill="none" />
                            <path d="M 10,715 Q 250,728 500,715" stroke="#fde047" strokeWidth="3" fill="none" />

                            <path d="M 1550,595 Q 1700,602 1850,595" stroke="#f59e0b" strokeWidth="1.8" fill="none" />
                            <path d="M 1500,625 Q 1690,634 1880,625" stroke="#ec4899" strokeWidth="2.2" fill="none" opacity="0.7" />
                            <path d="M 1460,665 Q 1680,676 1900,665" stroke="#f59e0b" strokeWidth="2.6" fill="none" />
                            <path d="M 1420,715 Q 1670,728 1910,715" stroke="#fde047" strokeWidth="3" fill="none" />
                        </g>
                    </g>

                    {/* 5 CHIẾC THUYỀN NAN HỘI AN ĐỘNG (NHẤP NHÔ TRÊN SÔNG) */}
                    {/* Thuyền 1 (Bờ Tây) */}
                    <g className="animate-hoian-boat-1" style={{ transformOrigin: '285px 635px' }}>
                        <g id="boat-1" transform="translate(240, 625)" filter="url(#maDropShadow)">
                            <ellipse cx="45" cy="22" rx="55" ry="8" fill="#020617" opacity="0.65" />
                            <path d="M -18,5 Q 45,25 105,5 Q 45,34 -18,5 Z" fill="url(#haBoatWood)" stroke="#170c02" strokeWidth="1.6" />
                            <path d="M -18,5 Q 45,25 105,5" fill="none" stroke="#854d0e" strokeWidth="2.6" strokeLinecap="round" />
                            <path d="M 22,7 C 22,-9 68,-9 68,7 Z" fill="#381e05" stroke="#1c0e02" strokeWidth="1.2" />
                            <line x1="72" y1="2" x2="115" y2="22" stroke="#5c3818" strokeWidth="2.4" strokeLinecap="round" />
                            <line x1="-10" y1="2" x2="-10" y2="-14" stroke="#78350f" strokeWidth="1.5" />
                            <ellipse cx="-10" cy="-6" rx="5.5" ry="7.5" fill="#ef4444" filter="url(#maBloom)" />
                            <circle cx="-10" cy="-6" r="2.5" fill="#fef08a" />
                            <ellipse cx="-10" cy="24" rx="10" ry="4" fill="#ef4444" opacity="0.45" filter="url(#maSoftGlow)" />
                        </g>
                    </g>

                    {/* Thuyền 2 (Bờ Đông chở khách) */}
                    <g className="animate-hoian-boat-2" style={{ transformOrigin: '1610px 670px' }}>
                        <g id="boat-2" transform="translate(1560, 660)" filter="url(#maDropShadow)">
                            <ellipse cx="50" cy="25" rx="62" ry="9" fill="#020617" opacity="0.7" />
                            <path d="M -22,6 Q 50,28 120,6 Q 50,38 -22,6 Z" fill="url(#haBoatWood)" stroke="#170c02" strokeWidth="1.6" />
                            <path d="M -22,6 Q 50,28 120,6" fill="none" stroke="#854d0e" strokeWidth="2.8" strokeLinecap="round" />
                            <g transform="translate(22, -6)">
                                <path d="M -9,-7 L 9,-7 L 0,-16 Z" fill="#fde047" stroke="#78350f" strokeWidth="0.8" />
                                <path d="M 0,-4 L 5,15" stroke="#334155" strokeWidth="5" strokeLinecap="round" />
                                <line x1="6" y1="6" x2="-16" y2="28" stroke="#78350f" strokeWidth="2.2" strokeLinecap="round" />
                            </g>
                            <ellipse cx="82" cy="4" rx="5" ry="8" fill="#f43f5e" />
                            <line x1="112" y1="4" x2="112" y2="-12" stroke="#78350f" strokeWidth="1.6" />
                            <ellipse cx="112" cy="-4" rx="6" ry="8.5" fill="#f59e0b" filter="url(#maBloom)" />
                            <circle cx="112" cy="-4" r="2.8" fill="#ffffff" />
                            <ellipse cx="112" cy="26" rx="12" ry="4.5" fill="#f59e0b" opacity="0.5" filter="url(#maSoftGlow)" />
                        </g>
                    </g>

                    {/* Thuyền 3 (Trung tâm xa xa) */}
                    <g className="animate-hoian-boat-1" style={{ transformOrigin: '940px 590px' }}>
                        <g id="boat-3" transform="translate(920, 585) scale(0.7)" opacity="0.8" filter="url(#maDropShadow)">
                            <path d="M -18,5 Q 45,25 105,5 Q 45,32 -18,5 Z" fill="#1c0e02" />
                            <ellipse cx="-10" cy="-5" rx="5" ry="7" fill="#ef4444" filter="url(#maSoftGlow)" />
                            <circle cx="-10" cy="-5" r="2" fill="#fef08a" />
                        </g>
                    </g>

                    {/* Thuyền 4 (Tiền cảnh trái) */}
                    <g className="animate-hoian-boat-2" style={{ transformOrigin: '160px 790px' }}>
                        <g id="boat-4" transform="translate(120, 780) scale(1.15)" filter="url(#maDropShadow)">
                            <ellipse cx="45" cy="24" rx="58" ry="9" fill="#020617" opacity="0.75" />
                            <path d="M -18,6 Q 45,28 110,6 Q 45,38 -18,6 Z" fill="url(#haBoatWood)" stroke="#170c02" strokeWidth="1.8" />
                            <path d="M -18,6 Q 45,28 110,6" fill="none" stroke="#854d0e" strokeWidth="3" strokeLinecap="round" />
                            <path d="M 24,7 C 24,-10 70,-10 70,7 Z" fill="#381e05" stroke="#1c0e02" strokeWidth="1.4" />
                            <line x1="-10" y1="2" x2="-10" y2="-15" stroke="#78350f" strokeWidth="1.6" />
                            <ellipse cx="-10" cy="-6" rx="6.5" ry="9" fill="#f59e0b" filter="url(#maBloom)" />
                            <circle cx="-10" cy="-6" r="3" fill="#ffffff" />
                            <ellipse cx="-10" cy="28" rx="14" ry="5" fill="#f59e0b" opacity="0.55" filter="url(#maSoftGlow)" />
                        </g>
                    </g>

                    {/* Thuyền 5 (Tiền cảnh phải) */}
                    <g className="animate-hoian-boat-1" style={{ transformOrigin: '1730px 850px' }}>
                        <g id="boat-5" transform="translate(1680, 840) scale(1.25)" filter="url(#maDropShadow)">
                            <ellipse cx="48" cy="26" rx="62" ry="10" fill="#020617" opacity="0.8" />
                            <path d="M -20,6 Q 48,30 115,6 Q 48,40 -20,6 Z" fill="url(#haBoatWood)" stroke="#170c02" strokeWidth="2" />
                            <path d="M -20,6 Q 48,30 115,6" fill="none" stroke="#854d0e" strokeWidth="3.2" strokeLinecap="round" />
                            <line x1="108" y1="4" x2="108" y2="-14" stroke="#78350f" strokeWidth="1.8" />
                            <ellipse cx="108" cy="-5" rx="7" ry="9.5" fill="#dc2626" filter="url(#maBloom)" />
                            <circle cx="108" cy="-5" r="3" fill="#fef08a" />
                            <ellipse cx="108" cy="30" rx="15" ry="5.5" fill="#dc2626" opacity="0.55" filter="url(#maSoftGlow)" />
                        </g>
                    </g>

                    {/* HÀNG CHỤC ĐÈN HOA ĐĂNG HOA SEN TRÔI BỀNH BỒNG (HOA ĐĂNG) */}
                    <g id="hoa-dang-fleet">
                        {/* Nhóm hoa đăng 1 */}
                        <g className="animate-hoa-dang-1">
                            <g transform="translate(520, 640)" filter="url(#maBloom)">
                                <ellipse cx="0" cy="5" rx="16" ry="5.5" fill="#020617" opacity="0.5" />
                                <path d="M -14,2 Q 0,-12 14,2 Q 0,9 -14,2 Z" fill="url(#haLotusRose)" />
                                <path d="M -9,0 Q 0,-16 9,0 Q 0,7 -9,0 Z" fill="#fda4af" />
                                <ellipse cx="0" cy="-3" rx="4" ry="7.5" fill="url(#haCandleFlame)" />
                                <circle cx="0" cy="-3" r="1.8" fill="#ffffff" />
                                <ellipse cx="0" cy="12" rx="15" ry="3.5" fill="#f43f5e" opacity="0.45" />
                            </g>
                            <g transform="translate(1380, 670)" filter="url(#maBloom)">
                                <ellipse cx="0" cy="5" rx="16" ry="5.5" fill="#020617" opacity="0.5" />
                                <path d="M -14,2 Q 0,-12 14,2 Q 0,9 -14,2 Z" fill="url(#haLotusViolet)" />
                                <ellipse cx="0" cy="-3" rx="4.2" ry="8" fill="url(#haCandleFlame)" />
                                <circle cx="0" cy="-3" r="2" fill="#ffffff" />
                                <ellipse cx="0" cy="13" rx="16" ry="3.8" fill="#c026d3" opacity="0.45" />
                            </g>
                            <g transform="translate(1720, 720)" filter="url(#maBloom)">
                                <ellipse cx="0" cy="5" rx="17" ry="6" fill="#020617" opacity="0.5" />
                                <path d="M -15,2 Q 0,-13 15,2 Q 0,9 -15,2 Z" fill="url(#haLotusRose)" />
                                <ellipse cx="0" cy="-3" rx="4.2" ry="8" fill="url(#haCandleFlame)" />
                                <circle cx="0" cy="-3" r="2" fill="#ffffff" />
                                <ellipse cx="0" cy="13" rx="16" ry="3.8" fill="#f43f5e" opacity="0.45" />
                            </g>
                        </g>

                        {/* Nhóm hoa đăng 2 */}
                        <g className="animate-hoa-dang-2">
                            <g transform="translate(390, 710)" filter="url(#maBloom)">
                                <ellipse cx="0" cy="6" rx="18" ry="6.5" fill="#020617" opacity="0.55" />
                                <path d="M -16,2 Q 0,-14 16,2 Q 0,10 -16,2 Z" fill="url(#haLotusAmber)" />
                                <path d="M -10,0 Q 0,-18 10,0 Q 0,8 -10,0 Z" fill="#fef08a" />
                                <ellipse cx="0" cy="-3.5" rx="4.5" ry="8.5" fill="url(#haCandleFlame)" />
                                <circle cx="0" cy="-3.5" r="2.2" fill="#ffffff" />
                                <ellipse cx="0" cy="14" rx="18" ry="4" fill="#f59e0b" opacity="0.5" />
                            </g>
                            <g transform="translate(1480, 770)" filter="url(#maBloom)">
                                <ellipse cx="0" cy="6" rx="20" ry="7" fill="#020617" opacity="0.55" />
                                <path d="M -18,3 Q 0,-15 18,3 Q 0,11 -18,3 Z" fill="url(#haLotusAmber)" />
                                <ellipse cx="0" cy="-4" rx="5" ry="9" fill="url(#haCandleFlame)" />
                                <circle cx="0" cy="-4" r="2.4" fill="#ffffff" />
                                <ellipse cx="0" cy="16" rx="20" ry="4.5" fill="#f59e0b" opacity="0.5" />
                            </g>
                        </g>

                        {/* Nhóm hoa đăng 3 */}
                        <g className="animate-hoa-dang-3">
                            <g transform="translate(600, 760)" filter="url(#maBloom)">
                                <ellipse cx="0" cy="6" rx="20" ry="7" fill="#020617" opacity="0.55" />
                                <path d="M -18,3 Q 0,-16 18,3 Q 0,11 -18,3 Z" fill="url(#haLotusCyan)" />
                                <ellipse cx="0" cy="-4" rx="5" ry="9" fill="url(#haCandleFlame)" />
                                <circle cx="0" cy="-4" r="2.4" fill="#ffffff" />
                                <ellipse cx="0" cy="16" rx="20" ry="4.5" fill="#06b6d4" opacity="0.45" />
                            </g>
                            <g transform="translate(310, 890) scale(1.3)" filter="url(#maBloom)">
                                <ellipse cx="0" cy="6" rx="20" ry="7" fill="#020617" opacity="0.6" />
                                <path d="M -18,3 Q 0,-16 18,3 Q 0,11 -18,3 Z" fill="url(#haLotusRose)" />
                                <ellipse cx="0" cy="-4" rx="5" ry="9" fill="url(#haCandleFlame)" />
                                <circle cx="0" cy="-4" r="2.5" fill="#ffffff" />
                                <ellipse cx="0" cy="16" rx="22" ry="5" fill="#f43f5e" opacity="0.5" />
                            </g>
                            <g transform="translate(880, 980) scale(1.45)" filter="url(#maBloom)">
                                <ellipse cx="0" cy="6" rx="22" ry="7.5" fill="#020617" opacity="0.65" />
                                <path d="M -20,3 Q 0,-18 20,3 Q 0,12 -20,3 Z" fill="url(#haLotusAmber)" />
                                <ellipse cx="0" cy="-4" rx="5.5" ry="10" fill="url(#haCandleFlame)" />
                                <circle cx="0" cy="-4" r="2.8" fill="#ffffff" />
                                <ellipse cx="0" cy="18" rx="25" ry="5.5" fill="#f59e0b" opacity="0.55" />
                            </g>
                            <g transform="translate(1540, 940) scale(1.35)" filter="url(#maBloom)">
                                <ellipse cx="0" cy="6" rx="20" ry="7" fill="#020617" opacity="0.6" />
                                <path d="M -18,3 Q 0,-16 18,3 Q 0,11 -18,3 Z" fill="url(#haLotusCyan)" />
                                <ellipse cx="0" cy="-4" rx="5" ry="9" fill="url(#haCandleFlame)" />
                                <circle cx="0" cy="-4" r="2.5" fill="#ffffff" />
                                <ellipse cx="0" cy="16" rx="22" ry="5" fill="#06b6d4" opacity="0.5" />
                            </g>
                        </g>

                        {/* Hoa đăng nhỏ xa xa trôi dập dềnh */}
                        <g filter="url(#maSoftGlow)" className="animate-hoa-dang-1">
                            <g transform="translate(470, 590) scale(0.65)"><path d="M -12,2 Q 0,-10 12,2 Z" fill="url(#haLotusAmber)" /><ellipse cx="0" cy="-2" rx="3.5" ry="6" fill="url(#haCandleFlame)" /></g>
                            <g transform="translate(680, 605) scale(0.7)"><path d="M -12,2 Q 0,-10 12,2 Z" fill="url(#haLotusRose)" /><ellipse cx="0" cy="-2" rx="3.5" ry="6" fill="url(#haCandleFlame)" /></g>
                            <g transform="translate(790, 615) scale(0.75)"><path d="M -12,2 Q 0,-10 12,2 Z" fill="url(#haLotusAmber)" /><ellipse cx="0" cy="-2" rx="3.5" ry="6" fill="url(#haCandleFlame)" /></g>
                            <g transform="translate(890, 610) scale(0.7)"><path d="M -12,2 Q 0,-10 12,2 Z" fill="url(#haLotusCyan)" /><ellipse cx="0" cy="-2" rx="3.5" ry="6" fill="url(#haCandleFlame)" /></g>
                            <g transform="translate(1010, 615) scale(0.75)"><path d="M -12,2 Q 0,-10 12,2 Z" fill="url(#haLotusRose)" /><ellipse cx="0" cy="-2" rx="3.5" ry="6" fill="url(#haCandleFlame)" /></g>
                            <g transform="translate(1110, 605) scale(0.65)"><path d="M -12,2 Q 0,-10 12,2 Z" fill="url(#haLotusAmber)" /><ellipse cx="0" cy="-2" rx="3.5" ry="6" fill="url(#haCandleFlame)" /></g>
                            <g transform="translate(1220, 620) scale(0.75)"><path d="M -12,2 Q 0,-10 12,2 Z" fill="url(#haLotusViolet)" /><ellipse cx="0" cy="-2" rx="3.5" ry="6" fill="url(#haCandleFlame)" /></g>
                            <g transform="translate(1420, 615) scale(0.7)"><path d="M -12,2 Q 0,-10 12,2 Z" fill="url(#haLotusRose)" /><ellipse cx="0" cy="-2" rx="3.5" ry="6" fill="url(#haCandleFlame)" /></g>
                            <g transform="translate(1640, 610) scale(0.65)"><path d="M -12,2 Q 0,-10 12,2 Z" fill="url(#haLotusAmber)" /><ellipse cx="0" cy="-2" rx="3.5" ry="6" fill="url(#haCandleFlame)" /></g>
                        </g>
                    </g>

                    {/* MÀNG TỐI PHỦ NHẸ TRUNG TÂM NƠI ĐẶT 2 THẺ ĐĂNG NHẬP (BẢO TOÀN ĐỘ TƯƠNG PHẢN FORM) */}
                    <rect x="360" y="320" width="1200" height="660" rx="32" fill="url(#haCardAreaDarken)" pointerEvents="none" />
                </g>

                ${townInjectPoint}`;

content = content.replace(townInjectPoint, hoianArtwork);

// Validate with esbuild
try {
    esbuild.transformSync(content, { loader: 'tsx' });
    console.log('esbuild check PASSED for Hội An backdrop!');
    fs.writeFileSync(backdropPath, content, 'utf8');
    console.log('Successfully written', backdropPath);
} catch (err) {
    console.error('esbuild check FAILED:', err.message);
    process.exit(1);
}
