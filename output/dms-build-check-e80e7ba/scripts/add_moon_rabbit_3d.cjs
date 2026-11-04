const fs = require('fs');
const esbuild = require('esbuild');

const backdropPath = 'components/login/MidAutumnSvgBackdrop.tsx';
let code = fs.readFileSync(backdropPath, 'utf8');

// 1. Add keyframes to style block
const keyframeToAdd = `
                /* THỎ NGỌC 3D NHẤP NHÔ ĐÁNG YÊU BÊN BẾN SÔNG */
                @keyframes rabbit-3d-breathe {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    50% { transform: translateY(-6px) rotate(1deg); }
                }
                .animate-rabbit-3d {
                    animation: rabbit-3d-breathe 4s ease-in-out infinite;
                    transform-origin: 1328px 548px;
                }
`;

if (!code.includes('animate-rabbit-3d')) {
    code = code.replace('/* Làn khói trà sen & bếp ẩm thực phố Hội bay nhè nhẹ */', keyframeToAdd.trim() + '\n\n                /* Làn khói trà sen & bếp ẩm thực phố Hội bay nhè nhẹ */');
}

// 2. Add Moon Rabbit element before Section 10
const rabbitBlock = `
                {/* ============================================================================== */}
                {/* 9. THỎ NGỌC 3D SIÊU DỄ THƯƠNG ĐỨNG BẾN SÔNG HỘI AN ÔM ĐÈN ÔNG SAO RỰC RỠ      */}
                {/* ============================================================================== */}
                <g id="hoian-moon-rabbit-3d" className="animate-rabbit-3d">
                    {/* Vệt bóng đổ tiếp đất mềm mại trên sàn gỗ bến sông */}
                    <ellipse cx="1328" cy="548" rx="42" ry="10" fill="#020617" opacity="0.75" />
                    <ellipse cx="1328" cy="548" rx="24" ry="5.5" fill="#000000" opacity="0.9" />

                    {/* Ánh đèn ông sao tỏa hào quang ấm áp trên mặt sàn gỗ & lan can bến sông */}
                    <circle cx="1285" cy="485" r="55" fill="#fef08a" opacity="0.28" filter="url(#maBloom)" />
                    <circle cx="1285" cy="485" r="32" fill="#f59e0b" opacity="0.35" filter="url(#maBloom)" />
                    <ellipse cx="1285" cy="546" rx="45" ry="10" fill="#f59e0b" opacity="0.3" filter="url(#maBloom)" />

                    {/* Nhân vật Thỏ Ngọc 3D cao cấp cầm đèn ông sao */}
                    <image
                        href={\`\${import.meta.env.BASE_URL}assets/moon_rabbit_3d.png\`}
                        x="1255"
                        y="410"
                        width="145"
                        height="145"
                        preserveAspectRatio="xMidYMid meet"
                        className="filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.6)] drop-shadow-[0_0_20px_rgba(251,191,36,0.65)]"
                    />

                    {/* Hộp thoại chúc Tết Trung Thu ngộ nghĩnh của Thỏ Ngọc */}
                    <g transform="translate(1328, 388)" opacity="0.95" filter="url(#maDropShadow)">
                        <rect x="-70" y="-22" width="140" height="24" rx="12" fill="#1e1b4b" stroke="#fef08a" strokeWidth="1" opacity="0.92" />
                        <path d="M 0,2 L -4,-2 L 4,-2 Z" fill="#1e1b4b" stroke="#fef08a" strokeWidth="0.8" />
                        <text x="0" y="-6" fill="#fef08a" fontSize="10.5" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
                            ✨ Thỏ Ngọc đón Trăng 🏮
                        </text>
                    </g>
                </g>
`;

const targetAnchor = '{/* 10. KHÓM HOA MỘC QUẾ & TRÚC QUÂN TỬ DÁT VÀNG VEN VIỀN DƯỚI */}';
if (!code.includes('hoian-moon-rabbit-3d')) {
    code = code.replace(targetAnchor, rabbitBlock.trim() + '\n\n                ' + targetAnchor);
}

try {
    esbuild.transformSync(code, { loader: 'tsx' });
    fs.writeFileSync(backdropPath, code, 'utf8');
    console.log('SUCCESS: Moon Rabbit 3D integrated into MidAutumnSvgBackdrop.tsx!');
} catch (err) {
    console.error('esbuild check FAILED:', err.message);
    process.exit(1);
}
