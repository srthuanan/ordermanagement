const fs = require('fs');
const esbuild = require('esbuild');

const backdropPath = 'components/login/MidAutumnSvgBackdrop.tsx';
let code = fs.readFileSync(backdropPath, 'utf8');

// ============================================================================
// 1. HOUSE 2: HIỆU THUỐC BẮC ĐỒNG NHÂN ĐƯỜNG (Nhà đỏ cổ kính)
// Tọa độ local trong nhaco-tan-ky: x: 175-300, y: 65-265
// ============================================================================
const house2SignAndDoor = `
        {/* ==================================================================== */}
        {/* BIỂN HIỆU NGHỆ THUẬT: HIỆU THUỐC BẮC ĐỒNG NHÂN ĐƯỜNG                 */}
        {/* ==================================================================== */}
        <g filter="url(#dropShadow)">
            {/* Cặp quai đồng treo biển */}
            <circle cx="204" cy="172" r="1.6" fill="#ca8a04" stroke="#78350f" strokeWidth="0.6" />
            <circle cx="271" cy="172" r="1.6" fill="#ca8a04" stroke="#78350f" strokeWidth="0.6" />
            <line x1="204" y1="172" x2="204" y2="175" stroke="#ca8a04" strokeWidth="1" />
            <line x1="271" y1="172" x2="271" y2="175" stroke="#ca8a04" strokeWidth="1" />

            {/* Bảng gỗ mun đen dát viền vàng lá kiểu thẻ bài truyền thống */}
            <rect x="200" y="174" width="75" height="19" rx="2" fill="#1c1917" stroke="#eab308" strokeWidth="1.4" />
            <rect x="202" y="176" width="71" height="15" fill="none" stroke="#f59e0b" strokeWidth="0.6" strokeDasharray="3,1.5" />
            
            {/* Chữ Hán và Quốc Ngữ thếp vàng */}
            <text x="237.5" y="183.5" fill="#fef08a" fontSize="7.2" fontWeight="bold" textAnchor="middle" fontFamily="serif" letterSpacing="1.2">同 仁 堂</text>
            <text x="237.5" y="189.5" fill="#fed7aa" fontSize="4.2" fontWeight="bold" textAnchor="middle" fontFamily="serif" letterSpacing="0.6">ĐỒNG NHÂN ĐƯỜNG</text>
        </g>

        {/* CỬA HIỆU THUỐC BẮC MỞ RỘNG & TỦ THUỐC TRĂM NGĂN GỖ CỔ */}
        <g>
            {/* Khung bao cửa gỗ lim sẫm */}
            <rect x="202" y="196" width="71" height="69" rx="2" fill="#140801" />
            <rect x="208" y="201" width="59" height="64" fill="url(#interiorGlow)" opacity="0.95" filter="url(#bloomSoft)" />
            {/* Cánh cửa xếp gỗ bức bàn mở gấp 2 bên */}
            <rect x="202" y="196" width="10" height="69" fill="#291407" stroke="#120601" strokeWidth="0.8" />
            <rect x="263" y="196" width="10" height="69" fill="#291407" stroke="#120601" strokeWidth="0.8" />

            {/* Tủ thuốc Bắc nhiều ô ngăn kéo nhỏ bằng gỗ mun phía sau */}
            <g opacity="0.6" stroke="#451a03" strokeWidth="0.6">
                <line x1="214" y1="205" x2="260" y2="205" />
                <line x1="214" y1="212" x2="260" y2="212" />
                <line x1="214" y1="219" x2="260" y2="219" />
                <line x1="225" y1="201" x2="225" y2="225" />
                <line x1="237" y1="201" x2="237" y2="225" />
                <line x1="249" y1="201" x2="249" y2="225" />
                {/* Núm đồng ngăn kéo tủ thuốc */}
                <circle cx="219" cy="208" r="0.8" fill="#ca8a04" />
                <circle cx="231" cy="208" r="0.8" fill="#ca8a04" />
                <circle cx="243" cy="208" r="0.8" fill="#ca8a04" />
                <circle cx="255" cy="208" r="0.8" fill="#ca8a04" />
                <circle cx="219" cy="215" r="0.8" fill="#ca8a04" />
                <circle cx="231" cy="215" r="0.8" fill="#ca8a04" />
                <circle cx="243" cy="215" r="0.8" fill="#ca8a04" />
                <circle cx="255" cy="215" r="0.8" fill="#ca8a04" />
            </g>

            {/* Quầy gỗ bốc thuốc thảo mộc */}
            <rect x="214" y="235" width="46" height="30" rx="1.5" fill="#3b1d06" stroke="#1c0a02" strokeWidth="0.8" />
            {/* Khay đựng thuốc thảo mộc */}
            <ellipse cx="224" cy="235" rx="5" ry="2" fill="#78350f" stroke="#ca8a04" strokeWidth="0.5" />
            <circle cx="224" cy="234.5" r="2" fill="#15803d" />

            {/* 1. CHỦ TIỆM: CỤ LƯƠNG Y RÂU BẠC NÂNG CÂN TIỂU LY ĐỒNG */}
            <g transform="translate(244, 222)">
                <circle cx="0" cy="-11" r="4.2" fill="#fed7aa" />
                {/* Khăn đóng lam sẫm & râu dài bạc */}
                <ellipse cx="0" cy="-14" rx="4.4" ry="2" fill="#1e3a8a" />
                <path d="M -1.5,-8 Q 0,-2 1.5,-8" fill="#f8fafc" stroke="#f8fafc" strokeWidth="1.2" />
                <path d="M -5,-7 L 5,-7 L 6.5,20 L -6.5,20 Z" fill="#1d4ed8" stroke="#ca8a04" strokeWidth="0.6" />
                {/* Tay cầm cân tiểu ly đồng bốc thuốc */}
                <line x1="-3" y1="2" x2="-12" y2="4" stroke="#ca8a04" strokeWidth="1.2" />
                <line x1="-12" y1="4" x2="-12" y2="10" stroke="#f59e0b" strokeWidth="0.8" />
                <circle cx="-12" cy="11" r="2.2" fill="#ca8a04" />
            </g>

            {/* 2. NHÂN VIÊN: MÔN ĐỆ ÁO NÂU ĐANG TÁN THẢO DƯỢC */}
            <g transform="translate(225, 225)">
                <circle cx="0" cy="-10" r="3.6" fill="#fed7aa" />
                <path d="M -4,-6 L 4,-6 L 5,18 L -5,18 Z" fill="#78350f" />
                {/* Cầm chày nghiền thuốc */}
                <line x1="2" y1="1" x2="6" y2="9" stroke="#ca8a04" strokeWidth="1.4" strokeLinecap="round" />
            </g>
        </g>
`;

// Insert into House 2: after `<path d="M 215,128 C 215,95 260,95 260,128 L 260,170 L 215,170 Z" fill="url(#interiorGlow)" filter="url(#bloomSoft)" />`
const h2Target = '<path d="M 215,128 C 215,95 260,95 260,128 L 260,170 L 215,170 Z" fill="url(#interiorGlow)" filter="url(#bloomSoft)" />';
if (!code.includes(h2Target)) {
  console.error('Target for House 2 not found!');
  process.exit(1);
}
code = code.replace(h2Target, h2Target + '\n' + house2SignAndDoor);


// ============================================================================
// 2. HOUSE 5: GỐM MỸ NGHỆ THANH HÀ
// Tọa độ local trong nhaco-center-hoi-quan: x: 345-490, y: 100-280
// ============================================================================
const house5SignAndDoor = `
        {/* ==================================================================== */}
        {/* BIỂN HIỆU NGHỆ THUẬT: TIỆM GỐM MỸ NGHỆ THANH HÀ 1516                 */}
        {/* ==================================================================== */}
        <g filter="url(#dropShadow)">
            {/* Móc treo kim loại cổ đóng vào xà gồ */}
            <circle cx="380" cy="178" r="1.6" fill="#78350f" stroke="#000" strokeWidth="0.5" />
            <circle cx="455" cy="178" r="1.6" fill="#78350f" stroke="#000" strokeWidth="0.5" />
            <line x1="380" y1="178" x2="385" y2="182" stroke="#d97706" strokeWidth="1" />
            <line x1="455" y1="178" x2="450" y2="182" stroke="#d97706" strokeWidth="1" />

            {/* Bảng gốm nung men ngọc hình dáng vòm cuốn thư cổ kính */}
            <path d="M 374,182 Q 417.5,179 461,182 L 458,201 Q 417.5,198 377,201 Z" fill="#9a3412" stroke="#f59e0b" strokeWidth="1.4" />
            <path d="M 377,184 Q 417.5,181 458,184 L 455,199 Q 417.5,196 380,199 Z" fill="#7c2d12" stroke="#fef08a" strokeWidth="0.6" strokeDasharray="3,1.5" />
            
            {/* Tên tiệm gốm dát vàng */}
            <text x="417.5" y="191" fill="#fef08a" fontSize="7.8" fontWeight="bold" textAnchor="middle" fontFamily="serif" letterSpacing="1">GỐM THANH HÀ</text>
            <text x="417.5" y="197" fill="#fde047" fontSize="4.2" textAnchor="middle" fontFamily="serif" letterSpacing="0.5">Tinh Hoa Đất Nung 1516</text>
        </g>

        {/* CỬA HIỆU GỐM MỞ SÁNG & BÀN XOAY NẮN GỐM TRUYỀN THỐNG */}
        <g>
            <rect x="375" y="202" width="85" height="78" rx="2" fill="#140801" />
            <rect x="382" y="207" width="71" height="73" fill="url(#interiorGlow)" opacity="0.95" filter="url(#bloomSoft)" />
            {/* Cửa gỗ 2 bên */}
            <rect x="375" y="202" width="12" height="78" fill="#3b1d06" stroke="#1c0a02" strokeWidth="0.8" />
            <rect x="448" y="202" width="12" height="78" fill="#3b1d06" stroke="#1c0a02" strokeWidth="0.8" />

            {/* Kệ gỗ trưng bày các bình gốm đỏ, chóe men lam */}
            <g opacity="0.85">
                <line x1="388" y1="218" x2="446" y2="218" stroke="#78350f" strokeWidth="1.2" />
                {/* Bình hoa gốm đỏ & đĩa men ngọc trên kệ */}
                <ellipse cx="395" cy="214" rx="3.2" ry="4" fill="#ea580c" stroke="#ca8a04" strokeWidth="0.6" />
                <ellipse cx="406" cy="215" rx="4" ry="2.5" fill="#0284c7" stroke="#38bdf8" strokeWidth="0.6" />
                <path d="M 432,217 L 436,211 L 440,217 Z" fill="#d97706" stroke="#ca8a04" strokeWidth="0.5" />
            </g>

            {/* Bàn xoay làm gốm và khối đất sét */}
            <ellipse cx="424" cy="254" rx="14" ry="4.5" fill="#57534e" stroke="#292524" strokeWidth="1" />
            <path d="M 419,252 Q 424,244 429,252 Z" fill="#b45309" />

            {/* 1. NGHỆ NHÂN GỐM (NGỒI BÊN BÀN XOAY NẮN BÌNH GỐM ĐẤT NUNG) */}
            <g transform="translate(416, 238)">
                <circle cx="0" cy="-10" r="4" fill="#fed7aa" />
                <path d="M -4.5,-6 L 4.5,-6 L 6,18 L -6,18 Z" fill="#b45309" />
                {/* Đôi bàn tay nắn chiếc bình gốm trên bàn xoay */}
                <path d="M 3,4 Q 8,10 8,14" fill="none" stroke="#fed7aa" strokeWidth="1.6" strokeLinecap="round" />
            </g>

            {/* 2. NHÂN VIÊN: CÔ GÁI ÁO BÀ BA VÀNG BÊ BÌNH GỐM HOA LAM */}
            <g transform="translate(438, 236)">
                <circle cx="0" cy="-11" r="3.8" fill="#fed7aa" />
                <path d="M -4,-7 L 4,-7 L 5,20 L -5,20 Z" fill="#eab308" />
                {/* Hai tay nâng bình hoa gốm men lam */}
                <ellipse cx="-6" cy="3" rx="3.5" ry="4.5" fill="#0284c7" stroke="#bae6fd" strokeWidth="0.6" />
            </g>
        </g>
`;

// Insert into House 5: after `<rect x="425" y="130" width="40" height="48" rx="2" fill="url(#interiorGlow)" filter="url(#bloomSoft)" />`
const h5Target = '<rect x="425" y="130" width="40" height="48" rx="2" fill="url(#interiorGlow)" filter="url(#bloomSoft)" />';
if (!code.includes(h5Target)) {
  console.error('Target for House 5 not found!');
  process.exit(1);
}
code = code.replace(h5Target, h5Target + '\n' + house5SignAndDoor);


// ============================================================================
// 3. HOUSE 6: BÁNH MÌ HỘI AN (Dưới giàn hoa giấy rực rỡ)
// Tọa độ local trong nhaco-center-hoi-quan: x: 490-630, y: 85-280
// ============================================================================
const house6SignAndDoor = `
        {/* ==================================================================== */}
        {/* BIỂN HIỆU NGHỆ THUẬT: BÁNH MÌ HỘI AN - NỨC TIẾNG PHỐ CỔ             */}
        {/* ==================================================================== */}
        <g filter="url(#dropShadow)">
            {/* Giá đỡ sắt uốn mỹ thuật Hội An */}
            <path d="M 520,174 Q 525,168 530,174" fill="none" stroke="#1c1917" strokeWidth="1.4" />
            <path d="M 590,174 Q 595,168 600,174" fill="none" stroke="#1c1917" strokeWidth="1.4" />

            {/* Bảng gỗ vintage màu cánh gián vẽ hoa văn hoa giấy */}
            <rect x="520" y="174" width="80" height="20" rx="2.5" fill="#451a03" stroke="#f59e0b" strokeWidth="1.4" />
            <rect x="522" y="176" width="76" height="16" rx="1.5" fill="#2d1502" stroke="#fef08a" strokeWidth="0.6" strokeDasharray="3,1.5" />
            
            {/* Nhành hoa giấy nhỏ vẽ góc biển */}
            <circle cx="526" cy="180" r="1.5" fill="#f43f5e" />
            <circle cx="528" cy="178" r="1.2" fill="#e11d48" />

            {/* Tên tiệm bánh mì thơm ngon */}
            <text x="560" y="184" fill="#fef08a" fontSize="7.8" fontWeight="bold" textAnchor="middle" fontFamily="serif" letterSpacing="0.8">BÁNH MÌ HỘI AN</text>
            <text x="560" y="190" fill="#fed7aa" fontSize="4.2" textAnchor="middle" fontFamily="serif" letterSpacing="0.5">Giòn Rụm Hương Xưa • Đặc Sản</text>
        </g>

        {/* CỬA HÀNG BÁNH MÌ MỞ & QUẦY TỦ BÁNH VÀNG ÓNG BỐC KHÓI THƠM LỪNG */}
        <g>
            <rect x="522" y="200" width="76" height="80" rx="2" fill="#140801" />
            <rect x="528" y="205" width="64" height="75" fill="url(#interiorGlow)" opacity="0.95" filter="url(#bloomSoft)" />
            {/* Cửa gỗ 2 bên */}
            <rect x="522" y="200" width="10" height="80" fill="#291407" stroke="#120601" strokeWidth="0.8" />
            <rect x="588" y="200" width="10" height="80" fill="#291407" stroke="#120601" strokeWidth="0.8" />

            {/* Quầy tủ kính bánh mì giòn rụm */}
            <rect x="532" y="242" width="56" height="26" rx="1.5" fill="#3b1d06" stroke="#ca8a04" strokeWidth="0.8" />
            <rect x="534" y="244" width="26" height="12" fill="#0f172a" opacity="0.5" stroke="#94a3b8" strokeWidth="0.5" />
            {/* Các ổ bánh mì vàng ươm xếp ngay ngắn */}
            <ellipse cx="540" cy="249" rx="4" ry="2" fill="#f59e0b" stroke="#ca8a04" strokeWidth="0.5" />
            <ellipse cx="548" cy="249" rx="4" ry="2" fill="#f59e0b" stroke="#ca8a04" strokeWidth="0.5" />
            <ellipse cx="555" cy="249" rx="4" ry="2" fill="#f59e0b" stroke="#ca8a04" strokeWidth="0.5" />
            {/* Làn khói bánh mì nóng hổi thơm nức */}
            <path d="M 548,244 Q 545,236 550,230 Q 554,224 548,218" fill="none" stroke="#fef08a" strokeWidth="1.2" className="animate-steam" opacity="0.8" />

            {/* 1. CHỦ QUÁN (CHỊ CHỦ ÁO HOA TẠP DỀ ĐANG XẺ BÁNH KẸP THỊT) */}
            <g transform="translate(565, 226)">
                <circle cx="0" cy="-11" r="4" fill="#fed7aa" />
                {/* Tóc vấn cao duyên dáng */}
                <circle cx="0" cy="-15" r="2.5" fill="#1c1917" />
                <path d="M -4.5,-7 L 4.5,-7 L 6,19 L -6,19 Z" fill="#e11d48" />
                {/* Tạp dề trắng */}
                <rect x="-3" y="-3" width="6" height="14" fill="#f8fafc" opacity="0.9" />
                {/* Tay cầm ổ bánh mì đang kẹp nhân */}
                <ellipse cx="-7" cy="6" rx="4" ry="2" fill="#f59e0b" stroke="#ca8a04" strokeWidth="0.6" />
            </g>

            {/* 2. PHỤ BẾP (CHÀNG TRAI ÁO TRẮNG TRAO BÁNH MÌ CHO KHÁCH) */}
            <g transform="translate(545, 230)">
                <circle cx="0" cy="-10" r="3.6" fill="#fed7aa" />
                <path d="M -4,-6 L 4,-6 L 5,18 L -5,18 Z" fill="#0284c7" />
                {/* Tay đưa ổ bánh mì gói giấy */}
                <line x1="2" y1="2" x2="10" y2="4" stroke="#fed7aa" strokeWidth="1.5" strokeLinecap="round" />
                <ellipse cx="11" cy="4" rx="3.5" ry="1.8" fill="#f59e0b" />
            </g>
        </g>
`;

// Insert into House 6: after `<rect x="570" y="120" width="42" height="50" rx="2" fill="url(#interiorGlow)" filter="url(#bloomSoft)" />`
const h6Target = '<rect x="570" y="120" width="42" height="50" rx="2" fill="url(#interiorGlow)" filter="url(#bloomSoft)" />';
if (!code.includes(h6Target)) {
  console.error('Target for House 6 not found!');
  process.exit(1);
}
code = code.replace(h6Target, h6Target + '\n' + house6SignAndDoor);

// Validate with esbuild
try {
  esbuild.transformSync(code, { loader: 'tsx' });
  console.log('esbuild check PASSED for 3 missing shops!');
  fs.writeFileSync(backdropPath, code, 'utf8');
  console.log('Successfully added 3 missing shops with full signboards, doors, and owners/staff!');
} catch (err) {
  console.error('esbuild check FAILED:', err.message);
  process.exit(1);
}
