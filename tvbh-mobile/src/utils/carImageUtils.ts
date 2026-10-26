// VinFast 3D Color CDN helper matching 100% with the web application
export const getCarImageUrl = (model: string, exteriorColor: string, _version?: string): string => {
  if (!model) return 'https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw05aa09f9/images/VF3/TH14V/CE18.webp';

  const m = model.toUpperCase().replace(/\s+/g, '');
  const ext = (exteriorColor || '').toLowerCase().trim();

  // Extract color code inside parentheses (e.g., "181Y", "182G", "CE18", "CE1U")
  const codeMatch = ext.match(/\(([^)]+)\)/);
  let code = codeMatch ? codeMatch[1].trim().toLowerCase() : '';

  // Quy chuẩn: Mã 182G dùng chung ảnh với mã 181Y
  if (code === '182g') code = '181y';

  // VF 3 CDN
  if (m.includes('VF3')) {
    if (code === '1823' || ext.includes('vàng summer')) return 'https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw15d65608/images/VF3/TH14V/1823.webp';
    if (code === '1832' || ext.includes('cam sunset')) return 'https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw0bf1ce03/images/VF3/TH14V/1832.webp';
    if (code === '182q' || ext.includes('đỏ')) return 'https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw61427c3e/images/VF3/TH14V/182Q.webp';
    if (code === '181y' || code === '182g' || ext.includes('aquatic azure') || ext.includes('sky blue')) return 'https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dweb4d0c15/images/VF3/TH14V/181Y.webp';
    if (code === '1821' || ext.includes('hồng iris')) return 'https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwd36b41ce/images/VF3/TH14V/1821.webp';
    if (code === 'ce18' || ext.includes('trắng')) return 'https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw05aa09f9/images/VF3/TH14V/CE18.webp';
    if (code === 'ce11' || ext.includes('đen')) return 'https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwb72a6b41/images/VF3/TH14V/CE11.webp';
    if (code === 'ce17' || ext.includes('bạc')) return 'https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dweb504538/images/VF3/TH14V/CE17.webp';
    if (code === 'ce1v' || ext.includes('xám')) return 'https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw00ee8ce4/images/VF3/TH14V/CE1V.webp';
    if (code === 'ce1w' || ext.includes('xanh lá') || ext.includes('mint')) return 'https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw022a5c2f/images/VF3/TH14V/CE1W.webp';
    return 'https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw05aa09f9/images/VF3/TH14V/CE18.webp';
  }

  // VF 5 CDN
  if (m.includes('VF5')) {
    if (code === 'ce18' || ext.includes('trắng')) return 'https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw15d65608/images/VF5/CE18.webp';
    if (code === 'ce11' || ext.includes('đen')) return 'https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw15d65608/images/VF5/CE11.webp';
    if (code === 'ce1u' || ext.includes('vàng')) return 'https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw15d65608/images/VF5/CE1U.webp';
    if (code === 'ce1a' || ext.includes('cam')) return 'https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw15d65608/images/VF5/CE1A.webp';
    if (code === 'ce1m' || ext.includes('đỏ')) return 'https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw15d65608/images/VF5/CE1M.webp';
    if (code === 'ce1n' || ext.includes('xanh dương')) return 'https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw15d65608/images/VF5/CE1N.webp';
    if (code === 'ce17' || ext.includes('bạc')) return 'https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw15d65608/images/VF5/CE17.webp';
    if (code === 'ce14' || ext.includes('xám')) return 'https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw15d65608/images/VF5/CE14.webp';
    return 'https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw15d65608/images/VF5/CE18.webp';
  }

  // VF 6 CDN
  if (m.includes('VF6')) {
    if (code === 'ce18' || ext.includes('trắng')) return 'https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw3eb40277/images/VF6/CE18.webp';
    if (code === 'ce11' || ext.includes('đen')) return 'https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw3eb40277/images/VF6/CE11.webp';
    if (code === 'ce1m' || ext.includes('đỏ')) return 'https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw3eb40277/images/VF6/CE1M.webp';
    if (code === 'ce1n' || ext.includes('xanh dương')) return 'https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw3eb40277/images/VF6/CE1N.webp';
    if (code === 'ce17' || ext.includes('bạc')) return 'https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw3eb40277/images/VF6/CE17.webp';
    return 'https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw3eb40277/images/VF6/CE18.webp';
  }

  // VF 7 CDN
  if (m.includes('VF7')) {
    if (code === 'ce18' || ext.includes('trắng')) return 'https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw06d48220/images/VF7/CE18.webp';
    if (code === 'ce11' || ext.includes('đen')) return 'https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw06d48220/images/VF7/CE11.webp';
    if (code === 'ce1m' || ext.includes('đỏ')) return 'https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw06d48220/images/VF7/CE1M.webp';
    if (code === 'ce1n' || ext.includes('xanh dương')) return 'https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw06d48220/images/VF7/CE1N.webp';
    return 'https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw06d48220/images/VF7/CE18.webp';
  }

  // VF 8 / VF 9
  if (m.includes('VF8') || m.includes('VF9')) {
    return 'https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw3cb77a1b/images/VF8/CE18.webp';
  }

  return 'https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw05aa09f9/images/VF3/TH14V/CE18.webp';
};

// Swatch Color mapping (Exact matching with web getBackgroundColorStyle)
export const getExteriorHex = (exteriorColor: string): string => {
  if (!exteriorColor) return '#cbd5e1';
  const lower = exteriorColor.toLowerCase().trim();
  const codeMatch = lower.match(/\(([^)]+)\)/);
  const code = codeMatch ? codeMatch[1].trim().toLowerCase() : '';

  if (code) {
    if (code === 'ce1u' || code === '111u' || code === '181u' || code === 'ce23' || code === '2523' || code === '1823') return '#facc15'; // Vàng
    if (code === 'ce1a' || code === 'ce32' || code === '1132' || code === '1832') return '#f97316'; // Cam
    if (code === 'ce1m' || code === '111m' || code === 'ce2q' || code === '112q' || code === '182q') return '#ef4444'; // Đỏ
    if (code === 'ce1w' || code === 'ce2b' || code === 'ce1h' || code === 'ce22' || code === 'ce21' || code === '171w' || code === '1722') return '#10b981'; // Xanh lá
    if (code === 'ce1n' || code === 'ce1j' || code === 'ce2j' || code === '1y26' || code === '182g' || code === '2a26' || code === 'ce33') return '#2563eb'; // Xanh VinFast
    if (code === 'ce17') return '#cbd5e1'; // Bạc
    if (code === 'ce14' || code === 'ce1v' || code === '171v' || code === '1v18' || code === '2811') return '#64748b'; // Xám
    if (code === 'ce11' || code === '3111') return '#0f172a'; // Đen
    if (code === 'ce1x' || code === 'ce2k' || code === '1821' || code === '181x') return '#ec4899'; // Hồng
    if (code === 'ce2n' || code === '2927') return '#92400e'; // Nâu
    if (code === 'ce2o' || code === '312o') return '#9333ea'; // Tím
    if (code === 'ce18' || code === '1818') return '#ffffff'; // Trắng
  }

  if (lower.includes('vàng') || lower.includes('yellow')) return '#facc15';
  if (lower.includes('đỏ') || lower.includes('red') || lower.includes('ruby')) return '#ef4444';
  if (lower.includes('cam') || lower.includes('orange')) return '#f97316';
  if (lower.includes('xanh lá') || lower.includes('green') || lower.includes('mint')) return '#10b981';
  if (lower.includes('xanh dương') || lower.includes('blue')) return '#2563eb';
  if (lower.includes('đen') || lower.includes('black')) return '#0f172a';
  if (lower.includes('xám') || lower.includes('grey') || lower.includes('gray')) return '#64748b';
  if (lower.includes('hồng') || lower.includes('pink') || lower.includes('iris')) return '#ec4899';
  if (lower.includes('trắng') || lower.includes('white') || lower.includes('blanc')) return '#ffffff';

  return '#cbd5e1';
};
