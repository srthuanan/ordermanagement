const fs = require('fs');
const sharp = require('sharp');

// Create the Hội An Ancient Town SVG Component
const hoianSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
    <defs>
        <!-- NIGHT SKY -->
        <linearGradient id="haNightSky" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#020617" />
            <stop offset="35%" stopColor="#07132e" />
            <stop offset="70%" stopColor="#0f1c3f" />
            <stop offset="100%" stopColor="#14214a" />
        </linearGradient>

        <!-- MOON & MIST GLOW -->
        <radialGradient id="haMistGlow" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#fef08a" stopOpacity="0.18" />
            <stop offset="45%" stopColor="#f59e0b" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#020617" stopOpacity="0" />
        </radialGradient>

        <!-- HOI AN WALL OCHRE (VÀNG HOÀNG THỔ CỔ KÍNH) -->
        <linearGradient id="haOchre1" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#92400e" />
            <stop offset="25%" stopColor="#d97706" />
            <stop offset="65%" stopColor="#b45309" />
            <stop offset="100%" stopColor="#78350f" />
        </linearGradient>

        <linearGradient id="haOchreWarm" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#b45309" />
            <stop offset="30%" stopColor="#f59e0b" />
            <stop offset="70%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#78350f" />
        </linearGradient>

        <linearGradient id="haOchreMoss" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2e2b10" />
            <stop offset="40%" stopColor="#b45309" />
            <stop offset="85%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#1c2818" />
        </linearGradient>

        <!-- YIN YANG TILED ROOF (MÁI NGÓI ÂM DƯƠNG RÊU PHONG) -->
        <linearGradient id="haTileRoofDark" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e1b4b" />
            <stop offset="40%" stopColor="#312e81" />
            <stop offset="80%" stopColor="#1e1b4b" />
            <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>

        <linearGradient id="haTileRoofClay" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#451a03" />
            <stop offset="50%" stopColor="#78350f" />
            <stop offset="100%" stopColor="#291102" />
        </linearGradient>

        <!-- WOOD BEAMS & BALCONY -->
        <linearGradient id="haDarkWood" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3d1e06" />
            <stop offset="50%" stopColor="#231003" />
            <stop offset="100%" stopColor="#120801" />
        </linearGradient>

        <!-- WINDOW LIGHT GLOW -->
        <linearGradient id="haWindowGlow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fffbeb" stopOpacity="0.95" />
            <stop offset="40%" stopColor="#fde047" stopOpacity="0.9" />
            <stop offset="80%" stopColor="#f59e0b" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#b45309" stopOpacity="0.5" />
        </linearGradient>

        <!-- RIVER WATER GRADIENT (SÔNG HOÀI ĐÊM RẰM) -->
        <linearGradient id="haRiverGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#06122d" />
            <stop offset="20%" stopColor="#0a1a3e" />
            <stop offset="50%" stopColor="#071533" />
            <stop offset="80%" stopColor="#040e24" />
            <stop offset="100%" stopColor="#020714" />
        </linearGradient>

        <!-- RIVER REFLECTION WATER BEAM -->
        <radialGradient id="haWaterMoonAura" cx="50%" cy="10%" r="70%">
            <stop offset="0%" stopColor="#fef08a" stopOpacity="0.25" />
            <stop offset="35%" stopColor="#f59e0b" stopOpacity="0.14" />
            <stop offset="70%" stopColor="#b45309" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#06122d" stopOpacity="0" />
        </radialGradient>

        <!-- BOUGAINVILLEA PINK GRADIENT (HOA GIẤY HỘI AN) -->
        <radialGradient id="haBougPink" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="45%" stopColor="#db2777" />
            <stop offset="85%" stopColor="#9d174d" />
            <stop offset="100%" stopColor="#4c0519" />
        </radialGradient>

        <!-- HOA DANG LOTUS GRADIENTS -->
        <linearGradient id="haLotusRed" x1="0%" y1="0%" x2="0%" y2="100%">
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

        <!-- HOA DANG CANDLE FLAME -->
        <radialGradient id="haFlame3D" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="35%" stopColor="#fef08a" />
            <stop offset="70%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
        </radialGradient>

        <!-- WOODEN BOAT (THUYỀN NAN GỖ HỘI AN) -->
        <linearGradient id="haBoatWood" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#5c3818" />
            <stop offset="40%" stopColor="#3d2008" />
            <stop offset="80%" stopColor="#251203" />
            <stop offset="100%" stopColor="#130801" />
        </linearGradient>

        <linearGradient id="haBoatRibs" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#854d0e" />
            <stop offset="100%" stopColor="#451a03" />
        </linearGradient>

        <!-- STONE WHARF (BỜ KÈ ĐÁ CỔ) -->
        <linearGradient id="haStoneWharf" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="30%" stopColor="#334155" />
            <stop offset="70%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>

        <!-- FILTERS -->
        <filter id="haGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur1" />
            <feMerge>
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
            </feMerge>
        </filter>

        <filter id="haSoftGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur2" />
            <feMerge>
                <feMergeNode in="blur2" />
                <feMergeNode in="SourceGraphic" />
            </feMerge>
        </filter>

        <filter id="haDropShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000000" floodOpacity="0.75" />
        </filter>
    </defs>

    <!-- 1. BẦU TRỜI & KHÍ QUYỂN HUYỀN ẢO HỘI AN VỀ ĐÊM -->
    <rect width="1920" height="1080" fill="url(#haNightSky)" />
    <rect width="1920" height="1080" fill="url(#haMistGlow)" />

    <!-- ============================================================================== -->
    <!-- 2. DÃY PHỐ CỔ HỘI AN BỜ BẮC SÔNG HOÀI (BÊN TRÁI & TRUNG TÂM & BÊN PHẢI) -->
    <!-- ============================================================================== -->

    <!-- LỚP NHÀ PHỐ CỔ NỀN XA (FAR SILHOUETTE HOUSES) -->
    <g opacity="0.55">
        <!-- Mái ngói xa xa nhấp nhô -->
        <path d="M 0,380 L 70,350 L 140,380 L 180,360 L 260,395 L 340,355 L 420,385 L 520,345 L 600,380 L 700,340 L 790,385 L 880,350 L 980,390 L 1080,345 L 1180,385 L 1280,350 L 1380,390 L 1490,340 L 1600,385 L 1710,345 L 1820,380 L 1920,350 L 1920,560 L 0,560 Z" fill="#0b1736" />
        <!-- Đèn lồng xa xăm lấm tấm điểm sáng vàng đỏ -->
        <circle cx="95" cy="375" r="2.5" fill="#f59e0b" filter="url(#haSoftGlow)" />
        <circle cx="210" cy="378" r="2" fill="#ef4444" filter="url(#haSoftGlow)" />
        <circle cx="360" cy="370" r="2.5" fill="#fef08a" filter="url(#haSoftGlow)" />
        <circle cx="560" cy="365" r="2.2" fill="#f59e0b" filter="url(#haSoftGlow)" />
        <circle cx="740" cy="360" r="2.5" fill="#ef4444" filter="url(#haSoftGlow)" />
        <circle cx="920" cy="370" r="2.2" fill="#fef08a" filter="url(#haSoftGlow)" />
        <circle cx="1120" cy="365" r="2.5" fill="#f59e0b" filter="url(#haSoftGlow)" />
        <circle cx="1320" cy="368" r="2.2" fill="#ef4444" filter="url(#haSoftGlow)" />
        <circle cx="1540" cy="360" r="2.5" fill="#fef08a" filter="url(#haSoftGlow)" />
        <circle cx="1760" cy="365" r="2.5" fill="#f59e0b" filter="url(#haSoftGlow)" />
    </g>

    <!-- ============================================================================== -->
    <!-- 3. CHÙA CẦU HỘI AN (LAI VIỄN KIỀU - JAPANESE COVERED BRIDGE) TẠI GÓC BỜ TÂY (x: 40..390) -->
    <!-- ============================================================================== -->
    <g id="chua-cau-assembly" transform="translate(45, 330)" filter="url(#haDropShadow)">
        <!-- Trụ móng cầu bằng đá cổ cắm xuống dòng sông -->
        <path d="M 60,195 L 85,150 L 115,150 L 105,215 Z" fill="#1e293b" />
        <path d="M 160,205 L 180,150 L 210,150 L 205,215 Z" fill="#1e293b" />
        <path d="M 260,195 L 275,150 L 305,150 L 295,215 Z" fill="#1e293b" />
        
        <!-- Vòm cầu uốn cong bắc qua sông -->
        <path d="M 30,165 Q 185,125 340,165 L 340,152 Q 185,112 30,152 Z" fill="url(#haBoatWood)" stroke="#1c1917" stroke-width="1.5" />
        <path d="M 40,152 Q 185,115 330,152" fill="none" stroke="#ca8a04" stroke-width="1.2" opacity="0.7" />

        <!-- Lan can gỗ & hàng chấn song con tiện Chùa Cầu -->
        <path d="M 45,142 Q 185,105 325,142" fill="none" stroke="#78350f" stroke-width="3" />
        <path d="M 75,147 L 75,138 M 110,140 L 110,131 M 145,134 L 145,124 M 185,128 L 185,118 M 225,134 L 225,124 M 260,140 L 260,131 M 295,147 L 295,138" stroke="#451a03" stroke-width="2" />

        <!-- Gian chùa và các gian nhà cầu có mái ngói che kín -->
        <rect x="70" y="85" width="230" height="52" fill="url(#haDarkWood)" />
        <!-- Vách gỗ và ô cửa sổ tròn cổ kính giữa cầu -->
        <rect x="85" y="92" width="40" height="38" rx="2" fill="url(#haOchre1)" stroke="#451a03" stroke-width="1.5" />
        <rect x="140" y="95" width="90" height="35" rx="2" fill="#2d1502" />
        <circle cx="185" cy="112" r="13" fill="url(#haWindowGlow)" stroke="#78350f" stroke-width="2" filter="url(#haSoftGlow)" />
        <line x1="185" y1="99" x2="185" y2="125" stroke="#451a03" stroke-width="1.5" />
        <line x1="172" y1="112" x2="198" y2="112" stroke="#451a03" stroke-width="1.5" />
        <rect x="245" y="92" width="40" height="38" rx="2" fill="url(#haOchre1)" stroke="#451a03" stroke-width="1.5" />

        <!-- Mái ngói Chùa Cầu uốn lượn đa tầng với đầu đao cong vút -->
        <!-- Mái hạ -->
        <path d="M 50,92 C 120,78 250,78 320,92 L 310,80 C 240,68 130,68 60,80 Z" fill="url(#haTileRoofClay)" stroke="#271003" stroke-width="1.5" />
        <!-- Mái thượng (mái đỉnh trung tâm Chùa Cầu) -->
        <path d="M 120,72 C 150,50 220,50 250,72 L 245,45 C 220,38 150,38 125,45 Z" fill="url(#haTileRoofClay)" stroke="#271003" stroke-width="1.5" />
        <!-- Đỉnh bờ nóc Chùa Cầu đắp nổi đôi rồng triều mặt nguyệt / hồ lô -->
        <circle cx="185" cy="38" r="4.5" fill="#f59e0b" filter="url(#haSoftGlow)" />
        <path d="M 185,34 L 185,28 M 175,40 Q 185,33 195,40" stroke="#fef08a" stroke-width="1.8" fill="none" stroke-linecap="round" />
        <!-- Đầu đao cong vút 2 bên mái -->
        <path d="M 50,92 Q 35,88 38,78" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" />
        <path d="M 320,92 Q 335,88 332,78" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" />
        <path d="M 120,72 Q 108,68 112,58" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" />
        <path d="M 250,72 Q 262,68 258,58" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" />

        <!-- Hàng lồng đèn đỏ Hội An treo dưới hiên Chùa Cầu -->
        <g filter="url(#haSoftGlow)">
            <ellipse cx="80" cy="100" rx="5.5" ry="7.5" fill="#ef4444" />
            <line x1="80" y1="92" x2="80" y2="100" stroke="#fef08a" stroke-width="1" />
            <ellipse cx="130" cy="98" rx="5" ry="7" fill="#f59e0b" />
            <ellipse cx="240" cy="98" rx="5" ry="7" fill="#f59e0b" />
            <ellipse cx="290" cy="100" rx="5.5" ry="7.5" fill="#ef4444" />
            <!-- Đèn lồng tròn treo ngay cửa vòm Chùa Cầu tỏa sáng -->
            <ellipse cx="185" cy="85" rx="7" ry="9" fill="#dc2626" />
            <circle cx="185" cy="85" r="3.5" fill="#fef08a" />
        </g>
    </g>

    <!-- ============================================================================== -->
    <!-- 4. QUẦN THỂ NHÀ CỔ TƯỜNG VÀNG HOA CÚC & GIÀN HOA GIẤY (HỘI AN YELLOW HOUSES) -->
    <!-- ============================================================================== -->
    
    <!-- CỤM NHÀ CỔ BÊN TRÁI (x: 360..600) -->
    <g id="nhaco-left" transform="translate(360, 310)" filter="url(#haDropShadow)">
        <!-- Tường vàng hoàng thổ Hội An -->
        <rect x="0" y="70" width="160" height="150" fill="url(#haOchreWarm)" />
        <!-- Mảng rêu phong loang lổ cổ kính -->
        <path d="M 0,70 L 40,70 L 25,120 L 0,140 Z" fill="url(#haOchreMoss)" opacity="0.75" />
        <path d="M 120,160 L 160,140 L 160,220 L 110,220 Z" fill="#78350f" opacity="0.6" />

        <!-- Tầng 2: Ban công gỗ và cửa lá sách gỗ -->
        <rect x="25" y="90" width="45" height="55" rx="3" fill="#291102" />
        <rect x="30" y="95" width="35" height="50" rx="2" fill="url(#haWindowGlow)" filter="url(#haSoftGlow)" />
        <!-- Nan chấn song cửa sổ gỗ -->
        <line x1="47.5" y1="95" x2="47.5" y2="145" stroke="#451a03" stroke-width="1.8" />
        <line x1="30" y1="110" x2="65" y2="110" stroke="#451a03" stroke-width="1" />
        <line x1="30" y1="125" x2="65" y2="125" stroke="#451a03" stroke-width="1" />

        <rect x="90" y="90" width="45" height="55" rx="3" fill="#291102" />
        <rect x="95" y="95" width="35" height="50" rx="2" fill="url(#haWindowGlow)" filter="url(#haSoftGlow)" />
        <line x1="112.5" y1="95" x2="112.5" y2="145" stroke="#451a03" stroke-width="1.8" />
        <line x1="95" y1="110" x2="130" y2="110" stroke="#451a03" stroke-width="1" />
        <line x1="95" y1="125" x2="130" y2="125" stroke="#451a03" stroke-width="1" />

        <!-- Lan can gỗ tầng 2 -->
        <rect x="15" y="140" width="130" height="10" fill="url(#haDarkWood)" stroke="#1c1917" stroke-width="1" />
        <path d="M 25,150 L 25,140 M 45,150 L 45,140 M 65,150 L 65,140 M 85,150 L 85,140 M 105,150 L 105,140 M 125,150 L 125,140 M 140,150 L 140,140" stroke="#451a03" stroke-width="1.6" />

        <!-- Tầng 1: Cửa chính nhà phố cổ hé mở đón gió sông -->
        <rect x="50" y="165" width="60" height="55" rx="2" fill="#1f1003" />
        <rect x="56" y="170" width="48" height="50" fill="url(#haWindowGlow)" opacity="0.8" filter="url(#haSoftGlow)" />
        <rect x="50" y="165" width="28" height="55" fill="#3a1e05" stroke="#1c1917" stroke-width="1" />
        <rect x="82" y="165" width="28" height="55" fill="#3a1e05" stroke="#1c1917" stroke-width="1" />

        <!-- Mái ngói âm dương rêu phong uốn cong -->
        <path d="M -15,75 C 30,52 130,52 175,75 L 165,58 C 120,40 40,40 -5,58 Z" fill="url(#haTileRoofClay)" stroke="#1e1003" stroke-width="1.5" />
        <path d="M -15,75 Q -25,72 -20,62" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" />
        <path d="M 175,75 Q 185,72 180,62" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" />

        <!-- GIÀN HOA GIẤY HỘI AN RỰC RỠ RỦ XUỐNG TỪ BAN CÔNG -->
        <g id="bougainvillea-left" filter="url(#haSoftGlow)">
            <!-- Nhánh cây gỗ leo -->
            <path d="M 130,70 Q 155,90 145,125 Q 160,140 140,160" fill="none" stroke="#291807" stroke-width="2" stroke-linecap="round" />
            <!-- Tán hoa giấy hồng thắm -->
            <circle cx="140" cy="80" r="14" fill="url(#haBougPink)" />
            <circle cx="155" cy="95" r="16" fill="url(#haBougPink)" />
            <circle cx="145" cy="115" r="18" fill="url(#haBougPink)" />
            <circle cx="160" cy="130" r="13" fill="url(#haBougPink)" />
            <circle cx="138" cy="142" r="15" fill="url(#haBougPink)" />
            <circle cx="148" cy="158" r="10" fill="url(#haBougPink)" />
            <!-- Chùm hoa rơi lấm tấm -->
            <circle cx="125" cy="100" r="6" fill="#f472b6" />
            <circle cx="168" cy="112" r="7" fill="#f472b6" />
            <circle cx="132" cy="130" r="8" fill="#ec4899" />
            <circle cx="152" cy="148" r="6" fill="#f472b6" />
        </g>

        <!-- Dây lồng đèn Hội An treo trước hiên nhà -->
        <path d="M 0,82 Q 80,95 160,82" fill="none" stroke="#78350f" stroke-width="1.2" />
        <ellipse cx="30" cy="92" rx="6" ry="8" fill="#dc2626" filter="url(#haSoftGlow)" />
        <ellipse cx="65" cy="95" rx="5" ry="7" fill="#059669" filter="url(#haSoftGlow)" />
        <ellipse cx="100" cy="96" rx="6" ry="8" fill="#f59e0b" filter="url(#haSoftGlow)" />
        <ellipse cx="130" cy="93" rx="5" ry="7" fill="#7c3aed" filter="url(#haSoftGlow)" />
    </g>

    <!-- CỤM NHÀ CỔ BÊN PHẢI (x: 1480..1880) -->
    <g id="nhaco-right" transform="translate(1480, 295)" filter="url(#haDropShadow)">
        <!-- Nhà 1: Nhà gỗ 2 tầng vàng nghệ Hội An -->
        <rect x="0" y="80" width="180" height="155" fill="url(#haOchreWarm)" />
        <path d="M 0,80 L 50,80 L 30,140 L 0,160 Z" fill="url(#haOchreMoss)" opacity="0.65" />
        
        <!-- Cửa sổ tầng 2 -->
        <rect x="25" y="105" width="42" height="52" rx="3" fill="#291102" />
        <rect x="30" y="110" width="32" height="42" fill="url(#haWindowGlow)" filter="url(#haSoftGlow)" />
        <line x1="46" y1="110" x2="46" y2="152" stroke="#451a03" stroke-width="1.8" />
        
        <rect x="110" y="105" width="42" height="52" rx="3" fill="#291102" />
        <rect x="115" y="110" width="32" height="42" fill="url(#haWindowGlow)" filter="url(#haSoftGlow)" />
        <line x1="131" y1="110" x2="131" y2="152" stroke="#451a03" stroke-width="1.8" />

        <!-- Lan can gỗ con tiện -->
        <rect x="10" y="155" width="160" height="9" fill="url(#haDarkWood)" />
        <path d="M 20,164 L 20,155 M 40,164 L 40,155 M 60,164 L 60,155 M 80,164 L 80,155 M 100,164 L 100,155 M 120,164 L 120,155 M 140,164 L 140,155 M 160,164 L 160,155" stroke="#3d1e06" stroke-width="1.6" />

        <!-- Cửa chính tầng trệt -->
        <rect x="40" y="180" width="100" height="55" rx="3" fill="#241002" />
        <rect x="50" y="185" width="80" height="50" fill="url(#haWindowGlow)" opacity="0.85" filter="url(#haSoftGlow)" />
        <rect x="40" y="180" width="45" height="55" fill="#3a1e05" stroke="#1c1917" stroke-width="1.2" />
        <rect x="95" y="180" width="45" height="55" fill="#3a1e05" stroke="#1c1917" stroke-width="1.2" />

        <!-- Mái ngói vảy cá Hội An -->
        <path d="M -15,85 C 40,62 140,62 195,85 L 185,68 C 130,50 50,50 -5,68 Z" fill="url(#haTileRoofClay)" stroke="#1e1003" stroke-width="1.5" />
        <path d="M -15,85 Q -25,80 -20,70" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" />
        <path d="M 195,85 Q 205,80 200,70" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" />

        <!-- Nhà 2: Nhà kế bên (x: 180..340) có mái cao hơn -->
        <rect x="180" y="55" width="160" height="180" fill="url(#haOchre1)" />
        <path d="M 165,60 C 220,38 310,38 355,60 L 345,45 C 300,28 230,28 175,45 Z" fill="url(#haTileRoofDark)" stroke="#1e1003" stroke-width="1.5" />
        <!-- Cửa vòm cổ kính gạch rêu -->
        <path d="M 215,135 C 215,105 265,105 265,135 L 265,170 L 215,170 Z" fill="url(#haWindowGlow)" filter="url(#haSoftGlow)" />
        <path d="M 215,135 C 215,105 265,105 265,135 L 265,170 L 215,170 Z" fill="none" stroke="#451a03" stroke-width="2.5" />

        <!-- GIÀN HOA GIẤY RỦ PHỦ KÍN GÓC NHÀ PHẢI -->
        <g id="bougainvillea-right" filter="url(#haSoftGlow)">
            <circle cx="175" cy="70" r="16" fill="url(#haBougPink)" />
            <circle cx="190" cy="85" r="18" fill="url(#haBougPink)" />
            <circle cx="178" cy="105" r="20" fill="url(#haBougPink)" />
            <circle cx="195" cy="125" r="16" fill="url(#haBougPink)" />
            <circle cx="180" cy="145" r="14" fill="url(#haBougPink)" />
            <circle cx="165" cy="125" r="12" fill="#ec4899" />
            <circle cx="190" cy="155" r="9" fill="#f472b6" />
        </g>

        <!-- Dây lồng đèn rực rỡ giăng chéo giữa 2 mái nhà -->
        <path d="M 10,95 Q 100,110 180,95" fill="none" stroke="#78350f" stroke-width="1.2" />
        <path d="M 180,95 Q 260,115 340,95" fill="none" stroke="#78350f" stroke-width="1.2" />
        <!-- Các lồng đèn Hội An đặc sắc: hình quả nhót, củ tỏi, đĩa bay -->
        <ellipse cx="45" cy="106" rx="5" ry="8" fill="#f59e0b" filter="url(#haSoftGlow)" />
        <ellipse cx="85" cy="109" rx="6" ry="6" fill="#ef4444" filter="url(#haSoftGlow)" />
        <ellipse cx="130" cy="108" rx="7" ry="5" fill="#06b6d4" filter="url(#haSoftGlow)" />
        <ellipse cx="215" cy="110" rx="5" ry="8" fill="#dc2626" filter="url(#haSoftGlow)" />
        <ellipse cx="255" cy="112" rx="6" ry="7" fill="#eab308" filter="url(#haSoftGlow)" />
        <ellipse cx="305" cy="108" rx="6" ry="8" fill="#db2777" filter="url(#haSoftGlow)" />
    </g>

    <!-- ============================================================================== -->
    <!-- 5. BỜ KÈ ĐÁ CỔ & CON ĐƯỜNG VEN SÔNG BẠCH ĐẰNG - HỘI AN (y: 520..575) -->
    <!-- ============================================================================== -->
    <g id="bo-ke-song-hoai">
        <!-- Đường đi lát gạch/đá cổ bờ sông -->
        <polygon points="0,525 1920,525 1920,555 0,555" fill="url(#haStoneWharf)" />
        <line x1="0" y1="525" x2="1920" y2="525" stroke="#64748b" stroke-width="1.5" opacity="0.6" />
        <!-- Kè đá giật cấp xuống mép nước -->
        <polygon points="0,555 1920,555 1920,575 0,575" fill="#0f172a" />
        <line x1="0" y1="555" x2="1920" y2="555" stroke="#94a3b8" stroke-width="1.2" opacity="0.7" />

        <!-- Cọc gỗ buộc thuyền & cột đèn lồng đá ven bờ kè -->
        <rect x="220" y="535" width="8" height="25" rx="2" fill="#2d1502" />
        <circle cx="224" cy="535" r="4.5" fill="#f59e0b" filter="url(#haSoftGlow)" />
        
        <rect x="480" y="538" width="7" height="22" rx="2" fill="#2d1502" />
        <rect x="1420" y="535" width="8" height="25" rx="2" fill="#2d1502" />
        <circle cx="1424" cy="535" r="4.5" fill="#f59e0b" filter="url(#haSoftGlow)" />
        <rect x="1720" y="538" width="7" height="22" rx="2" fill="#2d1502" />

        <!-- BÓNG DÁNG NGƯỜI ĐI HỘI HOA ĐĂNG (SILHOUETTES) -->
        <!-- Thiếu nữ áo dài nón lá cúi thả hoa đăng bên bờ sông bên trái (x: 430, y: 535) -->
        <g transform="translate(435, 522)" opacity="0.85">
            <!-- Nón lá -->
            <path d="M -10,-8 L 10,-8 L 0,-18 Z" fill="#fef08a" stroke="#b45309" stroke-width="0.8" />
            <!-- Dáng người áo dài -->
            <ellipse cx="0" cy="5" rx="5" ry="12" fill="#f43f5e" />
            <path d="M -4,5 Q 3,22 10,25" stroke="#f43f5e" stroke-width="4" fill="none" stroke-linecap="round" />
            <!-- Hoa đăng trên tay cô gái chuẩn bị thả xuống nước -->
            <circle cx="14" cy="27" r="4" fill="url(#haFlame3D)" filter="url(#haGlow)" />
        </g>

        <!-- Cặp đôi dạo bước ngắm trăng bên bờ sông bên phải (x: 1460, y: 515) -->
        <g transform="translate(1460, 508)" opacity="0.85">
            <!-- Chàng trai -->
            <circle cx="-6" cy="-14" r="3.5" fill="#1e293b" />
            <path d="M -6,-10 L -6,15" stroke="#1e293b" stroke-width="5" stroke-linecap="round" />
            <!-- Cô gái áo dài cầm lồng đèn cầm tay -->
            <circle cx="6" cy="-12" r="3.5" fill="#475569" />
            <path d="M 6,-8 L 6,15" stroke="#be185d" stroke-width="4.5" stroke-linecap="round" />
            <!-- Cây gậy cầm đèn lồng nhỏ -->
            <line x1="9" y1="-2" x2="18" y2="4" stroke="#78350f" stroke-width="1.2" />
            <ellipse cx="18" cy="10" rx="3.5" ry="5" fill="#f59e0b" filter="url(#haSoftGlow)" />
        </g>
    </g>

    <!-- ============================================================================== -->
    <!-- 6. DÒNG SÔNG HOÀI LẤP LÁNH & VẠT SÓNG NƯỚC ÁNH KIM (y: 575..1080) -->
    <!-- ============================================================================== -->
    <g id="song-hoai-water">
        <!-- Mặt nước sâu của sông Hoài -->
        <rect x="0" y="575" width="1920" height="505" fill="url(#haRiverGrad)" />
        
        <!-- Vầng hào quang phản chiếu của trăng rằm và dãy phố vàng trên mặt nước -->
        <ellipse cx="960" cy="660" rx="600" ry="180" fill="url(#haWaterMoonAura)" />
        <ellipse cx="280" cy="640" rx="250" ry="90" fill="url(#haWaterMoonAura)" opacity="0.6" />
        <ellipse cx="1650" cy="640" rx="280" ry="90" fill="url(#haWaterMoonAura)" opacity="0.7" />

        <!-- Các vệt sóng nước gợn lăn tăn phản chiếu ánh đèn vàng lung linh (Water ripples) -->
        <g stroke="#fde047" stroke-linecap="round" opacity="0.45" filter="url(#haSoftGlow)">
            <path d="M 820,590 Q 960,594 1100,590" stroke-width="1.8" fill="none" />
            <path d="M 760,615 Q 960,620 1160,615" stroke-width="2.2" fill="none" />
            <path d="M 680,645 Q 960,652 1240,645" stroke-width="2.6" fill="none" />
            <path d="M 600,685 Q 960,694 1320,685" stroke-width="3" fill="none" />
            <path d="M 520,735 Q 960,746 1400,735" stroke-width="3.2" fill="none" />
            <path d="M 440,795 Q 960,808 1480,795" stroke-width="3.5" fill="none" />
            <path d="M 360,865 Q 960,880 1560,865" stroke-width="3.5" fill="none" />
            <path d="M 280,945 Q 960,962 1640,945" stroke-width="3.8" fill="none" />
            <path d="M 200,1030 Q 960,1050 1720,1030" stroke-width="4" fill="none" />

            <!-- Gợn sóng phản chiếu góc Chùa Cầu (bên trái) -->
            <path d="M 80,605 Q 220,610 360,605" stroke="#f59e0b" stroke-width="1.6" fill="none" />
            <path d="M 50,635 Q 220,642 400,635" stroke="#f59e0b" stroke-width="2" fill="none" />
            <path d="M 30,675 Q 240,684 450,675" stroke="#ef4444" stroke-width="2.2" fill="none" opacity="0.6" />
            <path d="M 20,725 Q 250,736 490,725" stroke="#f59e0b" stroke-width="2.5" fill="none" />

            <!-- Gợn sóng phản chiếu góc phố bên phải -->
            <path d="M 1520,605 Q 1680,610 1840,605" stroke="#f59e0b" stroke-width="1.6" fill="none" />
            <path d="M 1480,635 Q 1680,642 1880,635" stroke="#f59e0b" stroke-width="2" fill="none" />
            <path d="M 1440,675 Q 1680,684 1900,675" stroke="#ec4899" stroke-width="2.2" fill="none" opacity="0.6" />
            <path d="M 1400,725 Q 1680,736 1910,725" stroke="#f59e0b" stroke-width="2.5" fill="none" />
        </g>
    </g>

    <!-- ============================================================================== -->
    <!-- 7. THUYỀN NAN GỖ HỘI AN (AUTHENTIC WOODEN SAMPANS) LƯỚT NHẸ TRÊN SÔNG HOÀI -->
    <!-- ============================================================================== -->
    
    <!-- THUYỀN NAN #1 (Bên trái, gần Chùa Cầu: x: 260, y: 640) -->
    <g id="boat-left" transform="translate(260, 640)" filter="url(#haDropShadow)">
        <!-- Bóng phản chiếu thân thuyền dưới nước -->
        <ellipse cx="40" cy="22" rx="48" ry="8" fill="#020617" opacity="0.65" />
        <!-- Thân thuyền nan gỗ uốn cong 2 đầu mũi lái -->
        <path d="M -15,5 Q 40,24 95,5 Q 40,32 -15,5 Z" fill="url(#haBoatWood)" stroke="#170c02" stroke-width="1.5" />
        <!-- Mạn thuyền viền nẹp gỗ -->
        <path d="M -15,5 Q 40,24 95,5" fill="none" stroke="url(#haBoatRibs)" stroke-width="2.5" stroke-linecap="round" />
        <!-- Mái vòm nan tre che mưa nắng giữa thuyền -->
        <path d="M 20,8 C 20,-8 60,-8 60,8 Z" fill="#3b2007" stroke="#1c0e02" stroke-width="1.2" />
        <path d="M 30,5 C 30,-5 50,-5 50,5" fill="none" stroke="#78350f" stroke-width="1" />
        <!-- Mái chèo gác nghiêng -->
        <line x1="65" y1="2" x2="105" y2="22" stroke="#5c3818" stroke-width="2.2" stroke-linecap="round" />
        <!-- Đèn lồng đỏ treo ở mũi thuyền rọi bóng xuống mặt nước -->
        <line x1="-8" y1="2" x2="-8" y2="-12" stroke="#78350f" stroke-width="1.5" />
        <ellipse cx="-8" cy="-5" rx="5" ry="7" fill="#ef4444" filter="url(#haGlow)" />
        <circle cx="-8" cy="-5" r="2.2" fill="#fef08a" />
        <ellipse cx="-8" cy="24" rx="8" ry="4" fill="#ef4444" opacity="0.4" filter="url(#haSoftGlow)" />
    </g>

    <!-- THUYỀN NAN #2 (Bên phải: x: 1540, y: 690) -->
    <g id="boat-right" transform="translate(1540, 690)" filter="url(#haDropShadow)">
        <ellipse cx="45" cy="24" rx="55" ry="9" fill="#020617" opacity="0.7" />
        <path d="M -20,6 Q 45,26 110,6 Q 45,36 -20,6 Z" fill="url(#haBoatWood)" stroke="#170c02" stroke-width="1.5" />
        <path d="M -20,6 Q 45,26 110,6" fill="none" stroke="url(#haBoatRibs)" stroke-width="2.8" stroke-linecap="round" />
        <!-- Người chèo thuyền nan áo bà ba nón lá -->
        <g transform="translate(20, -5)" opacity="0.9">
            <path d="M -8,-6 L 8,-6 L 0,-15 Z" fill="#fde047" stroke="#78350f" stroke-width="0.8" />
            <path d="M 0,-4 L 4,14" stroke="#334155" stroke-width="4.5" stroke-linecap="round" />
            <line x1="5" y1="5" x2="-15" y2="25" stroke="#78350f" stroke-width="2" stroke-linecap="round" />
        </g>
        <!-- Khách ngồi thả hoa đăng trên thuyền -->
        <ellipse cx="75" cy="4" rx="4" ry="7" fill="#f43f5e" />
        <!-- Đèn lồng vàng treo ở mũi thuyền -->
        <line x1="102" y1="4" x2="102" y2="-10" stroke="#78350f" stroke-width="1.5" />
        <ellipse cx="102" cy="-3" rx="5.5" ry="7.5" fill="#f59e0b" filter="url(#haGlow)" />
        <circle cx="102" cy="-3" r="2.5" fill="#ffffff" />
        <ellipse cx="102" cy="25" rx="10" ry="4" fill="#f59e0b" opacity="0.45" filter="url(#haSoftGlow)" />
    </g>

    <!-- THUYỀN NAN #3 (Xa xa ở giữa: x: 920, y: 595, scale 0.6) -->
    <g id="boat-center-far" transform="translate(920, 595) scale(0.65)" opacity="0.75" filter="url(#haDropShadow)">
        <path d="M -15,5 Q 40,24 95,5 Q 40,30 -15,5 Z" fill="#1c0e02" />
        <ellipse cx="-8" cy="-4" rx="4.5" ry="6" fill="#ef4444" filter="url(#haSoftGlow)" />
        <circle cx="-8" cy="-4" r="1.8" fill="#fef08a" />
    </g>

    <!-- ============================================================================== -->
    <!-- 8. HÀNG CHỤC ĐÈN HOA ĐĂNG HOA SEN TRÔI BỀNH BỒNG TRÊN SÔNG HOÀI (HOA ĐĂNG) -->
    <!-- ============================================================================== -->
    <g id="hoa-dang-fleet">
        <!-- HOA ĐĂNG TIỀN CẢNH (Gần người xem, rực sáng sắc nét) -->
        <!-- Đèn hoa đăng #1 (x: 480, y: 620) -->
        <g transform="translate(480, 620)" filter="url(#haGlow)">
            <ellipse cx="0" cy="4" rx="14" ry="5" fill="#020617" opacity="0.5" />
            <!-- Cánh sen hồng -->
            <path d="M -12,2 Q 0,-10 12,2 Q 0,8 -12,2 Z" fill="url(#haLotusRed)" />
            <path d="M -8,0 Q 0,-14 8,0 Q 0,6 -8,0 Z" fill="#fda4af" />
            <!-- Ngọn nến phát sáng -->
            <ellipse cx="0" cy="-2" rx="3.5" ry="6" fill="url(#haFlame3D)" />
            <circle cx="0" cy="-2" r="1.5" fill="#ffffff" />
            <!-- Bóng nước lung linh bên dưới -->
            <ellipse cx="0" cy="10" rx="12" ry="3" fill="#f43f5e" opacity="0.4" />
        </g>

        <!-- Đèn hoa đăng #2 (x: 370, y: 665) -->
        <g transform="translate(370, 665)" filter="url(#haGlow)">
            <ellipse cx="0" cy="4" rx="16" ry="6" fill="#020617" opacity="0.5" />
            <path d="M -14,2 Q 0,-12 14,2 Q 0,9 -14,2 Z" fill="url(#haLotusAmber)" />
            <path d="M -9,0 Q 0,-15 9,0 Q 0,7 -9,0 Z" fill="#fef08a" />
            <ellipse cx="0" cy="-3" rx="4" ry="7" fill="url(#haFlame3D)" />
            <circle cx="0" cy="-3" r="1.8" fill="#ffffff" />
            <ellipse cx="0" cy="12" rx="15" ry="3.5" fill="#f59e0b" opacity="0.45" />
        </g>

        <!-- Đèn hoa đăng #3 (x: 560, y: 710) -->
        <g transform="translate(560, 710)" filter="url(#haGlow)">
            <ellipse cx="0" cy="5" rx="18" ry="6.5" fill="#020617" opacity="0.5" />
            <path d="M -16,2 Q 0,-13 16,2 Q 0,10 -16,2 Z" fill="url(#haLotusCyan)" />
            <path d="M -10,0 Q 0,-16 10,0 Q 0,7 -10,0 Z" fill="#a5f3fc" />
            <ellipse cx="0" cy="-3" rx="4.5" ry="7.5" fill="url(#haFlame3D)" />
            <circle cx="0" cy="-3" r="2" fill="#ffffff" />
            <ellipse cx="0" cy="14" rx="18" ry="4" fill="#06b6d4" opacity="0.4" />
        </g>

        <!-- Đèn hoa đăng #4 (x: 1360, y: 640) -->
        <g transform="translate(1360, 640)" filter="url(#haGlow)">
            <ellipse cx="0" cy="4" rx="15" ry="5.5" fill="#020617" opacity="0.5" />
            <path d="M -13,2 Q 0,-11 13,2 Q 0,8 -13,2 Z" fill="url(#haLotusRed)" />
            <ellipse cx="0" cy="-2" rx="3.8" ry="6.5" fill="url(#haFlame3D)" />
            <circle cx="0" cy="-2" r="1.6" fill="#ffffff" />
            <ellipse cx="0" cy="11" rx="13" ry="3.2" fill="#f43f5e" opacity="0.4" />
        </g>

        <!-- Đèn hoa đăng #5 (x: 1450, y: 730) -->
        <g transform="translate(1450, 730)" filter="url(#haGlow)">
            <ellipse cx="0" cy="5" rx="18" ry="6.5" fill="#020617" opacity="0.5" />
            <path d="M -16,2 Q 0,-14 16,2 Q 0,10 -16,2 Z" fill="url(#haLotusAmber)" />
            <path d="M -10,0 Q 0,-17 10,0 Q 0,7 -10,0 Z" fill="#fef08a" />
            <ellipse cx="0" cy="-3" rx="4.8" ry="8" fill="url(#haFlame3D)" />
            <circle cx="0" cy="-3" r="2.2" fill="#ffffff" />
            <ellipse cx="0" cy="14" rx="18" ry="4" fill="#f59e0b" opacity="0.45" />
        </g>

        <!-- Đèn hoa đăng #6 (x: 1680, y: 670) -->
        <g transform="translate(1680, 670)" filter="url(#haGlow)">
            <ellipse cx="0" cy="4" rx="14" ry="5" fill="#020617" opacity="0.5" />
            <path d="M -12,2 Q 0,-10 12,2 Q 0,8 -12,2 Z" fill="url(#haLotusRed)" />
            <ellipse cx="0" cy="-2" rx="3.5" ry="6" fill="url(#haFlame3D)" />
            <circle cx="0" cy="-2" r="1.5" fill="#ffffff" />
            <ellipse cx="0" cy="10" rx="12" ry="3" fill="#f43f5e" opacity="0.4" />
        </g>

        <!-- CÁC ĐÈN HOA ĐĂNG NHỎ TRÔI XA GIỮA DÒNG SÔNG (MID & DISTANT FLOATERS) -->
        <g filter="url(#haSoftGlow)">
            <!-- x: 670, y: 590 -->
            <g transform="translate(670, 590) scale(0.6)">
                <path d="M -10,2 Q 0,-8 10,2 Z" fill="url(#haLotusAmber)" />
                <ellipse cx="0" cy="-2" rx="3" ry="5" fill="url(#haFlame3D)" />
            </g>
            <!-- x: 780, y: 605 -->
            <g transform="translate(780, 605) scale(0.7)">
                <path d="M -10,2 Q 0,-8 10,2 Z" fill="url(#haLotusRed)" />
                <ellipse cx="0" cy="-2" rx="3" ry="5" fill="url(#haFlame3D)" />
            </g>
            <!-- x: 860, y: 615 -->
            <g transform="translate(860, 615) scale(0.75)">
                <path d="M -10,2 Q 0,-8 10,2 Z" fill="url(#haLotusAmber)" />
                <ellipse cx="0" cy="-2" rx="3" ry="5" fill="url(#haFlame3D)" />
            </g>
            <!-- x: 990, y: 610 -->
            <g transform="translate(990, 610) scale(0.7)">
                <path d="M -10,2 Q 0,-8 10,2 Z" fill="url(#haLotusCyan)" />
                <ellipse cx="0" cy="-2" rx="3" ry="5" fill="url(#haFlame3D)" />
            </g>
            <!-- x: 1080, y: 600 -->
            <g transform="translate(1080, 600) scale(0.65)">
                <path d="M -10,2 Q 0,-8 10,2 Z" fill="url(#haLotusRed)" />
                <ellipse cx="0" cy="-2" rx="3" ry="5" fill="url(#haFlame3D)" />
            </g>
            <!-- x: 1180, y: 615 -->
            <g transform="translate(1180, 615) scale(0.75)">
                <path d="M -10,2 Q 0,-8 10,2 Z" fill="url(#haLotusAmber)" />
                <ellipse cx="0" cy="-2" rx="3" ry="5" fill="url(#haFlame3D)" />
            </g>
            <!-- x: 1260, y: 600 -->
            <g transform="translate(1260, 600) scale(0.65)">
                <path d="M -10,2 Q 0,-8 10,2 Z" fill="url(#haLotusRed)" />
                <ellipse cx="0" cy="-2" rx="3" ry="5" fill="url(#haFlame3D)" />
            </g>
        </g>
    </g>

    <!-- 9. LỚP SƯƠNG ĐÊM LÃNG MẠNG VÀ VIGNETTE TẬP TRUNG ÁNH SÁNG -->
    <radialGradient id="haVignette" cx="50%" cy="50%" r="70%">
        <stop offset="60%" stopColor="#000000" stopOpacity="0" />
        <stop offset="85%" stopColor="#020617" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#020617" stopOpacity="0.8" />
    </radialGradient>
    <rect width="1920" height="1080" fill="url(#haVignette)" pointer-events="none" />
</svg>
`;

fs.writeFileSync('scratch/test_hoian.svg', hoianSvg);

sharp(Buffer.from(hoianSvg))
    .resize(1920, 1080)
    .png()
    .toFile('scratch/test_hoian.png')
    .then(() => console.log('Successfully generated scratch/test_hoian.png!'))
    .catch(err => console.error(err));
