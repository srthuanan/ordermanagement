const fs = require('fs');
const sharp = require('sharp');

function buildUltraRealisticHoiAnSvg() {
    const defs = `
    <defs>
        <!-- NIGHT SKY -->
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#020617" />
            <stop offset="35%" stop-color="#05102a" />
            <stop offset="70%" stop-color="#0b1b42" />
            <stop offset="100%" stop-color="#142858" />
        </linearGradient>

        <radialGradient id="townAtmosphere" cx="50%" cy="45%" r="65%">
            <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.18" />
            <stop offset="35%" stop-color="#d97706" stop-opacity="0.08" />
            <stop offset="75%" stop-color="#78350f" stop-opacity="0.02" />
            <stop offset="100%" stop-color="#020617" stop-opacity="0" />
        </radialGradient>

        <!-- VINTAGE WEATHERED HOI AN WALLS -->
        <linearGradient id="wallOchre1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#78350f" />
            <stop offset="15%" stop-color="#b45309" />
            <stop offset="45%" stop-color="#d97706" />
            <stop offset="80%" stop-color="#b45309" />
            <stop offset="100%" stop-color="#451a03" />
        </linearGradient>

        <linearGradient id="wallOchreBright" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#92400e" />
            <stop offset="20%" stop-color="#d97706" />
            <stop offset="50%" stop-color="#f59e0b" />
            <stop offset="80%" stop-color="#d97706" />
            <stop offset="100%" stop-color="#78350f" />
        </linearGradient>

        <linearGradient id="wallRedHeritage" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#450a0a" />
            <stop offset="25%" stop-color="#831843" />
            <stop offset="55%" stop-color="#991b1b" />
            <stop offset="85%" stop-color="#7f1d1d" />
            <stop offset="100%" stop-color="#2b0505" />
        </linearGradient>

        <!-- MOSS & WATER DAMAGE -->
        <linearGradient id="mossGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#142410" stop-opacity="0.9" />
            <stop offset="40%" stop-color="#243312" stop-opacity="0.5" />
            <stop offset="100%" stop-color="#142410" stop-opacity="0" />
        </linearGradient>

        <linearGradient id="baseDampness" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#0f172a" stop-opacity="0" />
            <stop offset="50%" stop-color="#1c180e" stop-opacity="0.55" />
            <stop offset="100%" stop-color="#0a0905" stop-opacity="0.85" />
        </linearGradient>

        <!-- YIN-YANG TERRACOTTA TILED ROOFS -->
        <linearGradient id="roofTerracotta" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#220e03" />
            <stop offset="30%" stop-color="#451a03" />
            <stop offset="65%" stop-color="#78350f" />
            <stop offset="85%" stop-color="#451a03" />
            <stop offset="100%" stop-color="#180901" />
        </linearGradient>

        <linearGradient id="roofDarkSlate" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#0f172a" />
            <stop offset="30%" stop-color="#1e293b" />
            <stop offset="70%" stop-color="#334155" />
            <stop offset="90%" stop-color="#1e293b" />
            <stop offset="100%" stop-color="#090d16" />
        </linearGradient>

        <!-- WOOD & TIMBER -->
        <linearGradient id="woodDark" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#3b1d06" />
            <stop offset="40%" stop-color="#241002" />
            <stop offset="100%" stop-color="#120601" />
        </linearGradient>

        <!-- WARM CANDLELIGHT GLOW FROM INSIDE HOUSES -->
        <radialGradient id="interiorGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="1" />
            <stop offset="25%" stop-color="#fef08a" stop-opacity="0.95" />
            <stop offset="65%" stop-color="#f59e0b" stop-opacity="0.8" />
            <stop offset="100%" stop-color="#b45309" stop-opacity="0.4" />
        </radialGradient>

        <!-- SÔNG HOÀI DEEP RIVER WATER -->
        <linearGradient id="riverGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#06122d" />
            <stop offset="20%" stop-color="#0a193d" />
            <stop offset="50%" stop-color="#071533" />
            <stop offset="75%" stop-color="#040e24" />
            <stop offset="100%" stop-color="#020714" />
        </linearGradient>

        <!-- BROAD RIVER WATER GLOW (REFLECTING TOWN & MOON) -->
        <radialGradient id="riverAura" cx="50%" cy="15%" r="65%">
            <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.28" />
            <stop offset="35%" stop-color="#d97706" stop-opacity="0.14" />
            <stop offset="70%" stop-color="#b45309" stop-opacity="0.04" />
            <stop offset="100%" stop-color="#06122d" stop-opacity="0" />
        </radialGradient>

        <!-- HOA DANG CANDLE FLAME -->
        <radialGradient id="haCandleFlame" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#ffffff" />
            <stop offset="35%" stop-color="#fef08a" />
            <stop offset="70%" stop-color="#f97316" />
            <stop offset="100%" stop-color="#dc2626" stop-opacity="0" />
        </radialGradient>

        <!-- SAMPAN BOAT WOOD -->
        <linearGradient id="haBoatWood" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#5c3818" />
            <stop offset="40%" stop-color="#3d2008" />
            <stop offset="80%" stop-color="#251203" />
            <stop offset="100%" stop-color="#130801" />
        </linearGradient>

        <radialGradient id="haCardAreaDarken" cx="50%" cy="58%" r="48%">
            <stop offset="0%" stop-color="#020617" stop-opacity="0.45" />
            <stop offset="60%" stop-color="#020617" stop-opacity="0.25" />
            <stop offset="100%" stop-color="#020617" stop-opacity="0" />
        </radialGradient>

        <!-- FILTERS -->
        <filter id="bloomHigh" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>

        <filter id="bloomSoft" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur2" />
            <feMerge><feMergeNode in="blur2" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>

        <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#000000" flood-opacity="0.8" />
        </filter>
    </defs>
    `;

    // Yin-yang roof generator: authentic curve & tile grooves
    function generateRoof(x, y, w, h, curveLeft = -15, curveRight = 15, hasRidgeOrnaments = true, roofFill = 'url(#roofTerracotta)') {
        const topY = y - h;
        const eaveLeft = x + curveLeft;
        const eaveRight = x + w + curveRight;
        const ridgeLeft = x + 12;
        const ridgeRight = x + w - 12;

        let svg = `
        <g filter="url(#dropShadow)">
            <path d="M ${eaveLeft},${y} 
                     Q ${x + w * 0.25},${y - 8} ${x + w * 0.5},${y - 10} 
                     Q ${x + w * 0.75},${y - 8} ${eaveRight},${y} 
                     L ${ridgeRight},${topY} 
                     Q ${x + w * 0.5},${topY - 6} ${ridgeLeft},${topY} Z" 
                  fill="${roofFill}" stroke="#1c0a02" stroke-width="2" />
        `;

        const steps = Math.floor(w / 16);
        for (let i = 1; i < steps; i++) {
            const rx1 = ridgeLeft + (ridgeRight - ridgeLeft) * (i / steps);
            const rx2 = eaveLeft + (eaveRight - eaveLeft) * (i / steps);
            const ry2 = y - 9 * Math.sin(Math.PI * (i / steps));
            svg += `<line x1="${rx1.toFixed(1)}" y1="${topY}" x2="${rx2.toFixed(1)}" y2="${ry2.toFixed(1)}" stroke="#140601" stroke-width="1.6" opacity="0.65" />\n`;
            svg += `<line x1="${(rx1 + 1).toFixed(1)}" y1="${topY}" x2="${(rx2 + 1).toFixed(1)}" y2="${ry2.toFixed(1)}" stroke="#78350f" stroke-width="0.8" opacity="0.4" />\n`;
        }

        // Curved upturned eave tips
        svg += `
            <path d="M ${eaveLeft},${y} Q ${eaveLeft - 16},${y - 5} ${eaveLeft - 10},${y - 20}" fill="none" stroke="#f59e0b" stroke-width="2.8" stroke-linecap="round" />
            <path d="M ${eaveRight},${y} Q ${eaveRight + 16},${y - 5} ${eaveRight + 10},${y - 20}" fill="none" stroke="#f59e0b" stroke-width="2.8" stroke-linecap="round" />
        `;

        if (hasRidgeOrnaments) {
            const midX = x + w * 0.5;
            svg += `
                <ellipse cx="${midX}" cy="${topY - 6}" rx="5" ry="7" fill="#f59e0b" filter="url(#bloomSoft)" />
                <circle cx="${midX}" cy="${topY - 14}" r="3.5" fill="#fef08a" />
                <path d="M ${midX - 10},${topY - 4} Q ${midX},${topY - 12} ${midX + 10},${topY - 4}" fill="none" stroke="#ca8a04" stroke-width="2" />
            `;
        }

        svg += `</g>`;
        return svg;
    }

    // Realistic Bougainvillea with woody stems, emerald leaves, layered flower petals
    function generateBougainvillea(cx, cy, radius, spreadX = 55, spreadY = 75, density = 40) {
        let svg = `<g filter="url(#bloomSoft)">\n`;
        svg += `<path d="M ${cx - spreadX * 0.4},${cy - spreadY * 0.5} Q ${cx},${cy - spreadY * 0.2} ${cx + 10},${cy} Q ${cx + spreadX * 0.3},${cy + spreadY * 0.4} ${cx - 5},${cy + spreadY * 0.7}" fill="none" stroke="#241203" stroke-width="2.6" stroke-linecap="round" />\n`;
        svg += `<path d="M ${cx - 15},${cy} Q ${cx - spreadX * 0.5},${cy + spreadY * 0.3} ${cx - spreadX * 0.3},${cy + spreadY * 0.6}" fill="none" stroke="#180b02" stroke-width="1.8" stroke-linecap="round" />\n`;

        const colors = ['#f472b6', '#db2777', '#be185d', '#9d174d', '#e879f9', '#c026d3'];
        const leafColors = ['#15803d', '#166534', '#14532d'];

        let seed = cx * 1000 + cy;
        function rnd() {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        }

        for (let i = 0; i < density * 0.55; i++) {
            const lx = cx + (rnd() - 0.5) * spreadX * 1.5;
            const ly = cy + (rnd() - 0.5) * spreadY * 1.4;
            const lr = 3.5 + rnd() * 4.5;
            const lcol = leafColors[Math.floor(rnd() * leafColors.length)];
            svg += `<ellipse cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" rx="${lr.toFixed(1)}" ry="${(lr * 0.6).toFixed(1)}" fill="${lcol}" transform="rotate(${(rnd() * 180).toFixed(0)}, ${lx.toFixed(1)}, ${ly.toFixed(1)})" />\n`;
        }

        for (let i = 0; i < density; i++) {
            const fx = cx + (rnd() - 0.5) * spreadX * 1.35;
            const fy = cy + (rnd() - 0.5) * spreadY * 1.25;
            const fr = 4.5 + rnd() * 7;
            const fcol = colors[Math.floor(rnd() * colors.length)];
            svg += `<circle cx="${fx.toFixed(1)}" cy="${fy.toFixed(1)}" r="${fr.toFixed(1)}" fill="${fcol}" opacity="0.9" />\n`;
            if (rnd() > 0.45) {
                svg += `<circle cx="${(fx - 1).toFixed(1)}" cy="${(fy - 1).toFixed(1)}" r="${(fr * 0.4).toFixed(1)}" fill="#fbcfe8" opacity="0.75" />\n`;
            }
        }
        svg += `</g>\n`;
        return svg;
    }

    // Realistic Silk Lantern
    function generateSilkLantern(x, y, type = 'garlic', color = '#ef4444', glowColor = '#fca5a5', scale = 1) {
        let svg = `<g transform="translate(${x}, ${y}) scale(${scale})" filter="url(#bloomSoft)">\n`;
        svg += `<line x1="0" y1="-12" x2="0" y2="-4" stroke="#78350f" stroke-width="1.6" />\n`;
        svg += `<rect x="-5" y="-5" width="10" height="3" rx="1" fill="#1c0a02" stroke="#d97706" stroke-width="0.6" />\n`;

        if (type === 'garlic') {
            svg += `
                <ellipse cx="0" cy="10" rx="9" ry="13" fill="${color}" />
                <ellipse cx="0" cy="10" rx="5" ry="12.5" fill="none" stroke="#78350f" stroke-width="0.8" opacity="0.7" />
                <line x1="0" y1="-2" x2="0" y2="22" stroke="#78350f" stroke-width="0.8" opacity="0.7" />
                <ellipse cx="0" cy="9" rx="4" ry="6" fill="${glowColor}" opacity="0.7" />
                <circle cx="0" cy="8" r="2" fill="#ffffff" opacity="0.85" />
            `;
        } else if (type === 'diamond') {
            svg += `
                <polygon points="0,-3 11,10 0,23 -11,10" fill="${color}" />
                <polygon points="0,-3 5,10 0,23 -5,10" fill="none" stroke="#78350f" stroke-width="0.8" opacity="0.7" />
                <line x1="-11" y1="10" x2="11" y2="10" stroke="#78350f" stroke-width="0.8" opacity="0.7" />
                <circle cx="0" cy="10" r="4" fill="${glowColor}" opacity="0.75" />
                <circle cx="0" cy="10" r="1.8" fill="#ffffff" opacity="0.9" />
            `;
        } else {
            svg += `
                <ellipse cx="0" cy="9" rx="13" ry="8" fill="${color}" />
                <ellipse cx="0" cy="9" rx="8" ry="7.5" fill="none" stroke="#78350f" stroke-width="0.8" opacity="0.7" />
                <ellipse cx="0" cy="9" rx="5" ry="4" fill="${glowColor}" opacity="0.8" />
                <circle cx="0" cy="9" r="2" fill="#ffffff" opacity="0.9" />
            `;
        }

        svg += `
            <rect x="-4" y="21" width="8" height="2.5" rx="1" fill="#1c0a02" stroke="#d97706" stroke-width="0.6" />
            <circle cx="0" cy="25" r="1.6" fill="#f59e0b" />
            <line x1="0" y1="26" x2="0" y2="44" stroke="#eab308" stroke-width="1.8" stroke-linecap="round" />
            <line x1="-1.5" y1="26" x2="-2" y2="41" stroke="#dc2626" stroke-width="1.1" stroke-linecap="round" />
            <line x1="1.5" y1="26" x2="2" y2="41" stroke="#dc2626" stroke-width="1.1" stroke-linecap="round" />
        </g>\n`;
        return svg;
    }

    // Realistic Floating Lotus Lantern (Hoa Đăng) on water
    function generateFloatingLotus(x, y, scale = 1, petalColor = '#f43f5e', lightColor = '#fef08a') {
        return `
        <g transform="translate(${x}, ${y}) scale(${scale})" filter="url(#bloomHigh)">
            <ellipse cx="0" cy="10" rx="18" ry="4.5" fill="${petalColor}" opacity="0.4" />
            <ellipse cx="0" cy="10" rx="9" ry="2.5" fill="${lightColor}" opacity="0.6" />
            <polygon points="-16,4 -10,8 10,8 16,4 12,-1 -12,-1" fill="#451a03" opacity="0.85" />
            <path d="M -16,4 Q -8,-10 0,-16 Q 8,-10 16,4 Z" fill="${petalColor}" opacity="0.85" />
            <path d="M -12,5 Q -5,-7 0,-12 Q 5,-7 12,5 Z" fill="#fda4af" />
            <path d="M -7,6 Q 0,-5 7,6 Z" fill="#ffffff" opacity="0.9" />
            <ellipse cx="0" cy="-7" rx="3.5" ry="7" fill="url(#haCandleFlame)" />
            <circle cx="0" cy="-6" r="1.5" fill="#ffffff" />
        </g>
        `;
    }

    // Realistic Wooden Sampan Boat (Thuyền Nan Hội An)
    function generateSampan(x, y, scale = 1, hasOarsman = true, hasLantern = true, lanternColor = '#ef4444') {
        let svg = `
        <g transform="translate(${x}, ${y}) scale(${scale})" filter="url(#dropShadow)">
            <ellipse cx="45" cy="22" rx="55" ry="9" fill="#01040a" opacity="0.75" />
            <path d="M -22,5 Q 10,22 45,24 Q 85,22 118,5 Q 85,32 45,34 Q 10,32 -22,5 Z" fill="url(#haBoatWood)" stroke="#170c02" stroke-width="1.8" />
            <path d="M -22,5 Q 10,22 45,24 Q 85,22 118,5" fill="none" stroke="#854d0e" stroke-width="3" stroke-linecap="round" />
            <line x1="10" y1="18" x2="10" y2="28" stroke="#3b1d06" stroke-width="1.5" />
            <line x1="32" y1="21" x2="32" y2="31" stroke="#3b1d06" stroke-width="1.5" />
            <line x1="58" y1="21" x2="58" y2="31" stroke="#3b1d06" stroke-width="1.5" />
            <line x1="82" y1="18" x2="82" y2="28" stroke="#3b1d06" stroke-width="1.5" />
            <path d="M 22,8 C 22,-10 72,-10 72,8 Z" fill="#381e05" stroke="#1c0e02" stroke-width="1.5" />
            <path d="M 32,5 C 32,-7 62,-7 62,5" fill="none" stroke="#a16207" stroke-width="1.2" opacity="0.7" />
        `;

        if (hasOarsman) {
            svg += `
            <g transform="translate(18, -4)">
                <path d="M -10,-6 L 10,-6 L 0,-17 Z" fill="#fde047" stroke="#78350f" stroke-width="0.8" />
                <path d="M 0,-4 L 4,16" stroke="#1e293b" stroke-width="5.5" stroke-linecap="round" />
                <ellipse cx="2" cy="1" rx="4.5" ry="6" fill="#334155" />
                <line x1="5" y1="5" x2="-22" y2="34" stroke="#5c3818" stroke-width="2.5" stroke-linecap="round" />
                <path d="M -22,34 L -30,42" stroke="#854d0e" stroke-width="4.5" stroke-linecap="round" />
            </g>
            `;
        }

        if (hasLantern) {
            svg += `
            <line x1="110" y1="5" x2="110" y2="-12" stroke="#78350f" stroke-width="1.8" stroke-linecap="round" />
            <ellipse cx="110" cy="-4" rx="6" ry="8.5" fill="${lanternColor}" filter="url(#bloomHigh)" />
            <circle cx="110" cy="-4" r="2.6" fill="#ffffff" />
            <ellipse cx="110" cy="28" rx="14" ry="5" fill="${lanternColor}" opacity="0.55" filter="url(#bloomSoft)" />
            `;
        }

        svg += `</g>\n`;
        return svg;
    }

    // Sinuous undulating wave path generator
    function generateWavePath(y, amplitude, color, width, opacity) {
        let d = `M 0,${y} `;
        const waveLength = 240;
        const count = Math.ceil(1920 / waveLength);
        for (let i = 0; i < count; i++) {
            const startX = i * waveLength;
            const midX = startX + waveLength * 0.5;
            const endX = startX + waveLength;
            d += `Q ${midX},${(y + (i % 2 === 0 ? amplitude : -amplitude)).toFixed(1)} ${endX},${y} `;
        }
        return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" opacity="${opacity}" stroke-linecap="round" />\n`;
    }

    let svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
    ${defs}

    <!-- 1. BẦU TRỜI ĐÊM & KHÍ QUYỂN HỘI AN -->
    <rect width="1920" height="1080" fill="url(#skyGrad)" />
    <rect width="1920" height="1080" fill="url(#townAtmosphere)" />

    <!-- 2. CÂY CỔ THỤ XANH BIẾC SAU MÁI PHỐ CỔ (ANCIENT BANYAN / PLUMERIA TREES) -->
    <g opacity="0.75" filter="url(#bloomSoft)">
        <!-- Cây sau Chùa Cầu -->
        <circle cx="340" cy="290" r="45" fill="#0f291e" />
        <circle cx="365" cy="275" r="35" fill="#143d2b" />
        <!-- Cây sau Hội Quán -->
        <circle cx="980" cy="265" r="50" fill="#0f291e" />
        <circle cx="1015" cy="250" r="40" fill="#143d2b" />
        <!-- Cây góc bờ đông -->
        <circle cx="1520" cy="275" r="48" fill="#0f291e" />
        <circle cx="1555" cy="260" r="38" fill="#143d2b" />
    </g>

    <!-- 3. ĐƯỜNG CHÂN TRỜI XA XĂM (FAR HORIZON ROOFTOPS) -->
    <g opacity="0.6">
        <path d="M 0,380 L 50,355 L 90,380 L 140,350 L 190,385 L 240,345 L 300,380 L 350,340 L 410,385 L 480,345 L 560,390 L 640,335 L 710,380 L 780,340 L 860,385 L 930,330 L 1000,380 L 1080,340 L 1160,385 L 1240,335 L 1320,380 L 1400,340 L 1480,385 L 1560,335 L 1640,380 L 1720,345 L 1800,385 L 1870,340 L 1920,370 L 1920,535 L 0,535 Z" fill="#0a1738" />
        <circle cx="95" cy="370" r="2.2" fill="#f59e0b" filter="url(#bloomSoft)" />
        <circle cx="210" cy="375" r="2" fill="#ef4444" filter="url(#bloomSoft)" />
        <circle cx="360" cy="365" r="2.6" fill="#fef08a" filter="url(#bloomSoft)" />
        <circle cx="510" cy="370" r="2" fill="#f59e0b" filter="url(#bloomSoft)" />
        <circle cx="680" cy="365" r="2.5" fill="#ef4444" filter="url(#bloomSoft)" />
        <circle cx="850" cy="360" r="2.8" fill="#fef08a" filter="url(#bloomSoft)" />
        <circle cx="1020" cy="355" r="2.8" fill="#f59e0b" filter="url(#bloomSoft)" />
        <circle cx="1190" cy="368" r="2" fill="#ef4444" filter="url(#bloomSoft)" />
        <circle cx="1360" cy="360" r="2.8" fill="#fef08a" filter="url(#bloomSoft)" />
        <circle cx="1520" cy="365" r="2.5" fill="#f59e0b" filter="url(#bloomSoft)" />
        <circle cx="1700" cy="368" r="2" fill="#ef4444" filter="url(#bloomSoft)" />
        <circle cx="1860" cy="362" r="2.8" fill="#fef08a" filter="url(#bloomSoft)" />
    </g>

    <!-- ============================================================================== -->
    <!-- 4. KIẾN TRÚC PHỐ CỔ HỘI AN TIỀN CẢNH (CHI TIẾT, NGHỆ THUẬT, CHÂN THỰC) -->
    <!-- ============================================================================== -->

    <!-- KHU VỰC 1: CHÙA CẦU (LAI VIỄN KIỀU) (x: 40..380) -->
    <g id="chua-cau-real" transform="translate(40, 305)" filter="url(#dropShadow)">
        <polygon points="60,235 85,170 120,170 105,235" fill="#1e293b" />
        <polygon points="155,235 175,170 210,170 200,235" fill="#1e293b" />
        <polygon points="250,235 265,170 300,170 285,235" fill="#1e293b" />
        <path d="M 60,235 L 105,235 M 155,235 L 200,235 M 250,235 L 285,235" stroke="#101828" stroke-width="3" />

        <path d="M 20,182 Q 185,138 350,182 L 350,162 Q 185,118 20,162 Z" fill="url(#woodDark)" stroke="#120601" stroke-width="2.2" />
        <path d="M 30,162 Q 185,122 340,162" fill="none" stroke="#ca8a04" stroke-width="1.5" opacity="0.75" />

        <path d="M 35,150 Q 185,108 335,150" fill="none" stroke="#78350f" stroke-width="4" />
        <g stroke="#3b1d06" stroke-width="2.2">
            <line x1="65" y1="156" x2="65" y2="144" /><line x1="100" y1="148" x2="100" y2="136" />
            <line x1="140" y1="140" x2="140" y2="128" /><line x1="185" y1="135" x2="185" y2="122" />
            <line x1="230" y1="140" x2="230" y2="128" /><line x1="270" y1="148" x2="270" y2="136" />
            <line x1="305" y1="156" x2="305" y2="144" />
        </g>

        <rect x="60" y="88" width="250" height="62" fill="#241002" />
        <rect x="75" y="94" width="48" height="46" rx="2" fill="url(#wallOchre1)" stroke="#3b1d06" stroke-width="1.8" />
        <rect x="247" y="94" width="48" height="46" rx="2" fill="url(#wallOchre1)" stroke="#3b1d06" stroke-width="1.8" />
        
        <rect x="135" y="95" width="100" height="44" rx="2" fill="#140801" />
        <rect x="155" y="97" width="60" height="12" rx="1" fill="#991b1b" stroke="#f59e0b" stroke-width="1" />
        <text x="185" y="106" fill="#fef08a" font-size="7" font-weight="bold" text-anchor="middle" font-family="serif">來遠橋</text>

        <circle cx="185" cy="122" r="14" fill="url(#interiorGlow)" stroke="#78350f" stroke-width="2.5" filter="url(#bloomSoft)" />
        <line x1="185" y1="108" x2="185" y2="136" stroke="#451a03" stroke-width="2" />
        <line x1="171" y1="122" x2="199" y2="122" stroke="#451a03" stroke-width="2" />

        ${generateRoof(35, 96, 300, 26, -18, 18, false)}
        ${generateRoof(115, 72, 140, 28, -8, 8, true)}

        ${generateSilkLantern(75, 108, 'garlic', '#dc2626', '#fca5a5', 0.85)}
        ${generateSilkLantern(125, 104, 'garlic', '#f59e0b', '#fef08a', 0.8)}
        ${generateSilkLantern(185, 88, 'garlic', '#ef4444', '#fca5a5', 1.05)}
        ${generateSilkLantern(245, 104, 'garlic', '#f59e0b', '#fef08a', 0.8)}
        ${generateSilkLantern(295, 108, 'garlic', '#dc2626', '#fca5a5', 0.85)}
    </g>

    <!-- KHU VỰC 2: NHÀ CỔ TẤN KÝ (x: 360..650) -->
    <g id="nhaco-tan-ky" transform="translate(360, 280)" filter="url(#dropShadow)">
        <rect x="0" y="80" width="175" height="185" fill="url(#wallOchreBright)" />
        <path d="M 0,80 L 55,80 L 30,160 L 0,180 Z" fill="url(#mossGradient)" />
        <rect x="0" y="225" width="175" height="40" fill="url(#baseDampness)" />

        <!-- Cột gỗ khung nhà rường nổi bật -->
        <rect x="0" y="80" width="8" height="185" fill="#241002" opacity="0.8" />
        <rect x="167" y="80" width="8" height="185" fill="#241002" opacity="0.8" />

        <rect x="18" y="105" width="50" height="58" rx="3" fill="#241002" />
        <rect x="23" y="110" width="40" height="50" rx="2" fill="url(#interiorGlow)" filter="url(#bloomSoft)" />
        <line x1="43" y1="110" x2="43" y2="160" stroke="#3b1d06" stroke-width="2" />
        <line x1="23" y1="126" x2="63" y2="126" stroke="#3b1d06" stroke-width="1.2" />
        <line x1="23" y1="142" x2="63" y2="142" stroke="#3b1d06" stroke-width="1.2" />

        <rect x="105" y="105" width="50" height="58" rx="3" fill="#241002" />
        <rect x="110" y="110" width="40" height="50" rx="2" fill="url(#interiorGlow)" filter="url(#bloomSoft)" />
        <line x1="130" y1="110" x2="130" y2="160" stroke="#3b1d06" stroke-width="2" />
        <line x1="110" y1="126" x2="150" y2="126" stroke="#3b1d06" stroke-width="1.2" />
        <line x1="110" y1="142" x2="150" y2="142" stroke="#3b1d06" stroke-width="1.2" />

        <rect x="10" y="162" width="155" height="12" fill="#241002" stroke="#120601" stroke-width="1.2" />
        <g stroke="#3b1d06" stroke-width="2">
            <line x1="20" y1="174" x2="20" y2="162" /><line x1="40" y1="174" x2="40" y2="162" />
            <line x1="60" y1="174" x2="60" y2="162" /><line x1="80" y1="174" x2="80" y2="162" />
            <line x1="100" y1="174" x2="100" y2="162" /><line x1="120" y1="174" x2="120" y2="162" />
            <line x1="140" y1="174" x2="140" y2="162" /><line x1="155" y1="174" x2="155" y2="162" />
        </g>
        <polygon points="25,174 35,174 25,188" fill="#1c0a02" />
        <polygon points="145,174 155,174 145,188" fill="#1c0a02" />

        <rect x="52" y="176" width="70" height="16" rx="2" fill="#1c0a02" stroke="#d97706" stroke-width="1" />
        <text x="87" y="187" fill="#fef08a" font-size="8.5" font-weight="bold" text-anchor="middle" font-family="serif">TRÀ QUÁN HỘI AN</text>

        <rect x="42" y="196" width="90" height="69" rx="2" fill="#140801" />
        <rect x="50" y="202" width="74" height="63" fill="url(#interiorGlow)" opacity="0.92" filter="url(#bloomSoft)" />
        <rect x="42" y="196" width="22" height="69" fill="#2d1502" stroke="#120601" stroke-width="1.2" />
        <rect x="110" y="196" width="22" height="69" fill="#2d1502" stroke="#120601" stroke-width="1.2" />

        ${generateRoof(-12, 84, 200, 32, -16, 16, true)}
        ${generateBougainvillea(160, 115, 30, 45, 80, 55)}

        <path d="M 5,95 Q 90,115 170,95" fill="none" stroke="#78350f" stroke-width="1.5" />
        ${generateSilkLantern(35, 106, 'garlic', '#dc2626', '#fca5a5', 0.8)}
        ${generateSilkLantern(75, 112, 'diamond', '#059669', '#6ee7b7', 0.8)}
        ${generateSilkLantern(115, 112, 'flying-saucer', '#f59e0b', '#fef08a', 0.85)}
        ${generateSilkLantern(150, 106, 'garlic', '#c026d3', '#f5d0fe', 0.8)}

        <!-- Nhà son kế bên -->
        <rect x="175" y="65" width="125" height="200" fill="url(#wallRedHeritage)" />
        <path d="M 215,128 C 215,95 260,95 260,128 L 260,170 L 215,170 Z" fill="url(#interiorGlow)" filter="url(#bloomSoft)" />
        ${generateRoof(165, 72, 145, 28, -12, 12, false, 'url(#roofDarkSlate)')}
        ${generateSilkLantern(238, 115, 'garlic', '#f59e0b', '#fef08a', 0.9)}
    </g>

    <!-- KHU VỰC 3: HỘI QUÁN & TRUNG TÂM PHỐ (x: 650..1280) -->
    <g id="nhaco-center-hoi-quan" transform="translate(650, 265)" filter="url(#dropShadow)">
        <rect x="0" y="95" width="150" height="185" fill="url(#wallOchre1)" />
        <rect x="25" y="125" width="40" height="50" rx="2" fill="url(#interiorGlow)" filter="url(#bloomSoft)" />
        <rect x="85" y="125" width="40" height="50" rx="2" fill="url(#interiorGlow)" filter="url(#bloomSoft)" />
        ${generateRoof(-8, 98, 166, 28, -14, 14, false)}

        <!-- HỘI QUÁN PHÚC KIẾN -->
        <rect x="150" y="75" width="195" height="205" fill="url(#wallOchreBright)" />
        <rect x="150" y="235" width="195" height="45" fill="url(#baseDampness)" />
        
        <path d="M 205,150 C 205,105 285,105 285,150 L 285,205 L 205,205 Z" fill="url(#interiorGlow)" filter="url(#bloomSoft)" />
        <path d="M 205,150 C 205,105 285,105 285,150 L 285,205 L 205,205 Z" fill="none" stroke="#991b1b" stroke-width="4" />
        <rect x="218" y="105" width="55" height="16" rx="2" fill="#7f1d1d" stroke="#f59e0b" stroke-width="1.2" />
        <text x="245" y="117" fill="#fef08a" font-size="8.5" font-weight="bold" text-anchor="middle" font-family="serif">會 館</text>

        ${generateRoof(138, 78, 220, 36, -22, 22, true)}
        ${generateSilkLantern(185, 125, 'garlic', '#dc2626', '#fca5a5', 1.2)}
        ${generateSilkLantern(305, 125, 'garlic', '#dc2626', '#fca5a5', 1.2)}

        <!-- Phố nối tiếp -->
        <rect x="345" y="100" width="145" height="180" fill="url(#wallOchre1)" />
        <rect x="370" y="130" width="40" height="48" rx="2" fill="url(#interiorGlow)" filter="url(#bloomSoft)" />
        <rect x="425" y="130" width="40" height="48" rx="2" fill="url(#interiorGlow)" filter="url(#bloomSoft)" />
        ${generateRoof(335, 104, 165, 28, -12, 12, false, 'url(#roofDarkSlate)')}

        <rect x="490" y="85" width="140" height="195" fill="url(#wallOchreBright)" />
        <rect x="515" y="120" width="42" height="50" rx="2" fill="url(#interiorGlow)" filter="url(#bloomSoft)" />
        <rect x="570" y="120" width="42" height="50" rx="2" fill="url(#interiorGlow)" filter="url(#bloomSoft)" />
        ${generateRoof(480, 90, 160, 30, -14, 14, true)}

        ${generateBougainvillea(485, 118, 32, 50, 85, 60)}

        <path d="M 20,108 Q 170,130 320,108 Q 470,130 620,108" fill="none" stroke="#78350f" stroke-width="1.6" />
        ${generateSilkLantern(60, 120, 'garlic', '#f59e0b', '#fef08a', 0.85)}
        ${generateSilkLantern(110, 124, 'diamond', '#dc2626', '#fca5a5', 0.8)}
        ${generateSilkLantern(370, 122, 'flying-saucer', '#06b6d4', '#a5f3fc', 0.85)}
        ${generateSilkLantern(430, 125, 'garlic', '#eab308', '#fef08a', 0.85)}
        ${generateSilkLantern(560, 122, 'diamond', '#ef4444', '#fca5a5', 0.85)}
    </g>

    <!-- KHU VỰC 4: DÃY PHỐ BỜ ĐÔNG (x: 1280..1920) -->
    <g id="nhaco-block-right" transform="translate(1280, 275)" filter="url(#dropShadow)">
        <rect x="0" y="90" width="185" height="185" fill="url(#wallOchreBright)" />
        <path d="M 0,90 L 55,90 L 30,165 L 0,185 Z" fill="url(#mossGradient)" />
        <rect x="0" y="235" width="185" height="40" fill="url(#baseDampness)" />

        <rect x="25" y="118" width="48" height="56" rx="3" fill="#241002" />
        <rect x="30" y="123" width="38" height="46" rx="2" fill="url(#interiorGlow)" filter="url(#bloomSoft)" />
        <line x1="49" y1="123" x2="49" y2="169" stroke="#3b1d06" stroke-width="1.8" />
        
        <rect x="110" y="118" width="48" height="56" rx="3" fill="#241002" />
        <rect x="115" y="123" width="38" height="46" rx="2" fill="url(#interiorGlow)" filter="url(#bloomSoft)" />
        <line x1="134" y1="123" x2="134" y2="169" stroke="#3b1d06" stroke-width="1.8" />

        <rect x="10" y="174" width="165" height="11" fill="#241002" stroke="#120601" stroke-width="1.2" />
        <g stroke="#3b1d06" stroke-width="2">
            <line x1="20" y1="185" x2="20" y2="174" /><line x1="40" y1="185" x2="40" y2="174" />
            <line x1="60" y1="185" x2="60" y2="174" /><line x1="80" y1="185" x2="80" y2="174" />
            <line x1="100" y1="185" x2="100" y2="174" /><line x1="120" y1="185" x2="120" y2="174" />
            <line x1="140" y1="185" x2="140" y2="174" /><line x1="160" y1="185" x2="160" y2="174" />
        </g>

        <rect x="42" y="200" width="100" height="75" rx="3" fill="#140801" />
        <rect x="52" y="208" width="80" height="67" fill="url(#interiorGlow)" opacity="0.9" filter="url(#bloomSoft)" />
        <rect x="42" y="200" width="24" height="75" fill="#2d1502" stroke="#120601" stroke-width="1.2" />
        <rect x="118" y="200" width="24" height="75" fill="#2d1502" stroke="#120601" stroke-width="1.2" />

        ${generateRoof(-12, 94, 208, 34, -16, 16, true)}

        <rect x="185" y="65" width="210" height="210" fill="url(#wallOchre1)" />
        <rect x="185" y="235" width="210" height="40" fill="url(#baseDampness)" />
        
        <path d="M 215,130 C 215,102 250,102 250,130 L 250,158 L 215,158 Z" fill="url(#interiorGlow)" filter="url(#bloomSoft)" />
        <path d="M 270,130 C 270,102 305,102 305,130 L 305,158 L 270,158 Z" fill="url(#interiorGlow)" filter="url(#bloomSoft)" />
        <path d="M 325,130 C 325,102 360,102 360,130 L 360,158 L 325,158 Z" fill="url(#interiorGlow)" filter="url(#bloomSoft)" />
        ${generateRoof(170, 70, 240, 36, -18, 18, true, 'url(#roofDarkSlate)')}

        <rect x="395" y="85" width="230" height="190" fill="url(#wallOchreBright)" />
        <rect x="430" y="118" width="48" height="56" rx="2" fill="url(#interiorGlow)" filter="url(#bloomSoft)" />
        <rect x="510" y="118" width="48" height="56" rx="2" fill="url(#interiorGlow)" filter="url(#bloomSoft)" />
        ${generateRoof(380, 90, 250, 32, -16, 16, true)}

        ${generateBougainvillea(185, 100, 34, 55, 95, 65)}

        <path d="M 10,105 Q 100,124 185,105 Q 290,128 395,105 Q 500,128 605,105" fill="none" stroke="#78350f" stroke-width="1.6" />
        ${generateSilkLantern(50, 118, 'garlic', '#f59e0b', '#fef08a', 0.85)}
        ${generateSilkLantern(95, 122, 'diamond', '#dc2626', '#fca5a5', 0.8)}
        ${generateSilkLantern(145, 120, 'flying-saucer', '#06b6d4', '#a5f3fc', 0.85)}
        ${generateSilkLantern(235, 122, 'garlic', '#dc2626', '#fca5a5', 0.9)}
        ${generateSilkLantern(290, 125, 'diamond', '#eab308', '#fef08a', 0.85)}
        ${generateSilkLantern(345, 122, 'flying-saucer', '#db2777', '#fbcfe8', 0.85)}
        ${generateSilkLantern(445, 122, 'garlic', '#059669', '#6ee7b7', 0.85)}
        ${generateSilkLantern(505, 125, 'diamond', '#ef4444', '#fca5a5', 0.85)}
        ${generateSilkLantern(555, 122, 'garlic', '#f59e0b', '#fef08a', 0.85)}
    </g>

    <!-- ============================================================================== -->
    <!-- 5. BỜ KÈ ĐÁ CỔ VEN SÔNG BẠCH ĐẰNG (y: 515..560) -->
    <!-- ============================================================================== -->
    <g id="bo-ke-da-co-real">
        <polygon points="0,515 1920,515 1920,542 0,542" fill="#334155" />
        <line x1="0" y1="515" x2="1920" y2="515" stroke="#64748b" stroke-width="1.8" opacity="0.85" />
        <polygon points="0,542 1920,542 1920,562 0,562" fill="#0f172a" />
        <line x1="0" y1="542" x2="1920" y2="542" stroke="#94a3b8" stroke-width="1.5" opacity="0.9" />

        <g fill="#241002">
            <rect x="175" y="524" width="10" height="28" rx="2" /><circle cx="180" cy="524" r="5.5" fill="#f59e0b" filter="url(#bloomSoft)" />
            <rect x="415" y="526" width="9" height="26" rx="2" /><circle cx="419.5" cy="526" r="5" fill="#ef4444" filter="url(#bloomSoft)" />
            <rect x="715" y="528" width="9" height="24" rx="2" />
            <rect x="1195" y="528" width="9" height="24" rx="2" />
            <rect x="1495" y="524" width="10" height="28" rx="2" /><circle cx="1500" cy="524" r="5.5" fill="#f59e0b" filter="url(#bloomSoft)" />
            <rect x="1775" y="526" width="9" height="26" rx="2" /><circle cx="1779.5" cy="526" r="5" fill="#ef4444" filter="url(#bloomSoft)" />
        </g>

        <!-- Bậc tam cấp bến đò -->
        <polygon points="425,542 465,542 468,565 422,565" fill="#1e293b" />
        <line x1="424" y1="550" x2="466" y2="550" stroke="#64748b" stroke-width="1.2" />
        <line x1="423" y1="558" x2="467" y2="558" stroke="#64748b" stroke-width="1.2" />

        <!-- Thiếu nữ Áo Dài nón lá cúi thả hoa đăng -->
        <g transform="translate(445, 526)">
            <path d="M -13,-9 L 13,-9 L 0,-21 Z" fill="#fef08a" stroke="#b45309" stroke-width="1" />
            <ellipse cx="0" cy="6" rx="6.5" ry="15" fill="#f43f5e" />
            <path d="M -5,7 Q 4,24 14,27" stroke="#f43f5e" stroke-width="5" fill="none" stroke-linecap="round" />
            <circle cx="18" cy="29" r="6" fill="url(#haCandleFlame)" filter="url(#bloomHigh)" />
        </g>

        <!-- Cặp đôi dạo bước ngắm trăng bờ đông -->
        <g transform="translate(1470, 514)">
            <circle cx="-9" cy="-16" r="4.5" fill="#1e293b" />
            <path d="M -9,-11 L -9,20" stroke="#1e293b" stroke-width="6" stroke-linecap="round" />
            <circle cx="8" cy="-14" r="4.5" fill="#475569" />
            <path d="M 8,-9 L 8,20" stroke="#be185d" stroke-width="5.5" stroke-linecap="round" />
            <line x1="12" y1="-2" x2="24" y2="4" stroke="#78350f" stroke-width="1.6" />
            <ellipse cx="24" cy="12" rx="5" ry="7" fill="#f59e0b" filter="url(#bloomSoft)" />
        </g>
    </g>

    <!-- ============================================================================== -->
    <!-- 6. DÒNG SÔNG HOÀI & PHẢN CHIẾU NƯỚC UỐN LƯỢN TỰ NHIÊN (y: 560..1080) -->
    <!-- ============================================================================== -->
    <g id="song-hoai-fluid">
        <!-- Nước sông Hoài đêm rằm -->
        <rect x="0" y="560" width="1920" height="520" fill="url(#riverGrad)" />
        <!-- Ánh sáng phản chiếu tỏa rộng của trăng rằm và phố cổ -->
        <ellipse cx="960" cy="660" rx="800" ry="180" fill="url(#riverAura)" />
        <ellipse cx="260" cy="640" rx="300" ry="100" fill="url(#riverAura)" opacity="0.6" />
        <ellipse cx="1640" cy="640" rx="320" ry="100" fill="url(#riverAura)" opacity="0.7" />

        <!-- SÓNG NƯỚC UỐN LƯỢN ĐỘNG PHẢN CHIẾU ÁNH HOÀNG KIM (ORGANIC SINUOUS WAVES) -->
        <g filter="url(#bloomSoft)">
            ${generateWavePath(575, 4, '#fef08a', 2.2, 0.45)}
            ${generateWavePath(598, 5, '#fde047', 2.5, 0.5)}
            ${generateWavePath(625, 6, '#f59e0b', 2.8, 0.55)}
            ${generateWavePath(658, 7, '#d97706', 3.2, 0.52)}
            ${generateWavePath(698, 8, '#f59e0b', 3.5, 0.5)}
            ${generateWavePath(745, 9, '#fde047', 3.8, 0.48)}
            ${generateWavePath(802, 10, '#fef08a', 4.0, 0.45)}
            ${generateWavePath(870, 12, '#f59e0b', 4.3, 0.42)}
            ${generateWavePath(948, 14, '#fde047', 4.6, 0.38)}
            ${generateWavePath(1035, 16, '#fef08a', 4.8, 0.35)}

            <!-- Các vệt sóng điểm xuyết sắc đỏ và hồng của lồng đèn phản chiếu -->
            <path d="M 50,610 Q 200,622 380,610 Q 520,622 660,610" fill="none" stroke="#ef4444" stroke-width="2.5" opacity="0.45" stroke-linecap="round" />
            <path d="M 1340,610 Q 1500,622 1700,610 Q 1820,622 1920,610" fill="none" stroke="#db2777" stroke-width="2.5" opacity="0.45" stroke-linecap="round" />
            <path d="M 20,670 Q 220,684 460,670" fill="none" stroke="#ef4444" stroke-width="3" opacity="0.4" stroke-linecap="round" />
            <path d="M 1460,670 Q 1680,684 1900,670" fill="none" stroke="#f59e0b" stroke-width="3" opacity="0.45" stroke-linecap="round" />
        </g>
    </g>

    <!-- ============================================================================== -->
    <!-- 7. THUYỀN NAN HỘI AN (5 BOATS) -->
    <!-- ============================================================================== -->
    ${generateSampan(235, 620, 1.0, true, true, '#ef4444')}
    ${generateSampan(1550, 650, 1.05, true, true, '#f59e0b')}
    ${generateSampan(910, 580, 0.7, false, true, '#ef4444')}
    ${generateSampan(110, 765, 1.25, false, true, '#f59e0b')}
    ${generateSampan(1660, 825, 1.35, false, true, '#dc2626')}

    <!-- ============================================================================== -->
    <!-- 8. HOA ĐĂNG HOA SEN TRÊN SÔNG (HOA ĐĂNG) -->
    <!-- ============================================================================== -->
    ${generateFloatingLotus(515, 635, 1.0, '#f43f5e', '#fef08a')}
    ${generateFloatingLotus(385, 705, 1.15, '#f59e0b', '#ffffff')}
    ${generateFloatingLotus(595, 755, 1.25, '#06b6d4', '#ffffff')}
    ${generateFloatingLotus(1375, 665, 1.0, '#c026d3', '#fef08a')}
    ${generateFloatingLotus(1475, 765, 1.25, '#f59e0b', '#ffffff')}
    ${generateFloatingLotus(1715, 715, 1.1, '#f43f5e', '#ffffff')}

    ${generateFloatingLotus(300, 885, 1.45, '#f43f5e', '#ffffff')}
    ${generateFloatingLotus(880, 975, 1.6, '#f59e0b', '#ffffff')}
    ${generateFloatingLotus(1530, 935, 1.5, '#06b6d4', '#ffffff')}

    ${generateFloatingLotus(465, 585, 0.65, '#f59e0b', '#fef08a')}
    ${generateFloatingLotus(675, 600, 0.7, '#f43f5e', '#fef08a')}
    ${generateFloatingLotus(785, 610, 0.75, '#f59e0b', '#fef08a')}
    ${generateFloatingLotus(885, 605, 0.7, '#06b6d4', '#fef08a')}
    ${generateFloatingLotus(1005, 610, 0.75, '#f43f5e', '#fef08a')}
    ${generateFloatingLotus(1105, 600, 0.65, '#f59e0b', '#fef08a')}
    ${generateFloatingLotus(1215, 615, 0.75, '#c026d3', '#fef08a')}
    ${generateFloatingLotus(1415, 610, 0.7, '#f43f5e', '#fef08a')}
    ${generateFloatingLotus(1635, 605, 0.65, '#f59e0b', '#fef08a')}

    <!-- MÀNG TỐI KHỬ CHÓI QUANG HỌC PHÍA TRUNG TÂM NƠI ĐẶT 2 THẺ ĐĂNG NHẬP -->
    <rect x="360" y="320" width="1200" height="660" rx="32" fill="url(#haCardAreaDarken)" pointer-events="none" />
</svg>
`;

    return svg;
}

const fullSvg = buildUltraRealisticHoiAnSvg();
fs.writeFileSync('scratch/test_ultra_hoian.svg', fullSvg);

sharp(Buffer.from(fullSvg))
    .resize(1920, 1080)
    .png()
    .toFile('scratch/test_ultra_hoian.png')
    .then(() => console.log('Successfully generated scratch/test_ultra_hoian.png!'))
    .catch(err => console.error(err));
