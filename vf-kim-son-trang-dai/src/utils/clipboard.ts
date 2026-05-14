/**
 * Tiện ích sao chép dữ liệu một chạm siêu tốc (Click-to-Copy)
 * Đi kèm hiệu ứng Toast thông báo cao cấp và tương tác tactile visual feedback.
 */
export const copyToClipboard = (text: string, label: string) => {
  const cleanText = String(text || '').trim();
  if (!cleanText || cleanText === 'Trống' || cleanText === 'N/A' || cleanText === 'Chưa cập nhật' || cleanText === 'Chưa khai báo địa chỉ') {
    return;
  }
  
  navigator.clipboard.writeText(cleanText).then(() => {
    // 1. Tự động nạp CSS tương tác nếu chưa tồn tại
    if (!document.getElementById('click-to-copy-styles')) {
      const style = document.createElement('style');
      style.id = 'click-to-copy-styles';
      style.textContent = `
        .clickable-copy-field {
          cursor: pointer !important;
          transition: all 0.12s cubic-bezier(0.4, 0, 0.2, 1) !important;
          position: relative !important;
          user-select: text !important;
        }
        .clickable-copy-field:hover {
          background-color: #f0f9ff !important; /* Xanh nhạt mát mẻ */
          box-shadow: inset 0 0 0 1px #0ea5e9 !important; /* Viền focus xanh */
        }
        .clickable-copy-field:active {
          transform: scale(0.97) !important;
        }
        
        .floating-copy-toast {
          position: fixed;
          bottom: 32px;
          left: 50%;
          transform: translateX(-50%) translateY(20px);
          background-color: #0f172a;
          color: #ffffff;
          padding: 10px 18px;
          border-radius: 12px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.1);
          font-size: 13px;
          font-weight: 600;
          z-index: 999999;
          pointer-events: none;
          opacity: 0;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); /* Hiệu ứng nảy lò xo cao cấp */
        }
        .floating-copy-toast.show {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
      `;
      document.head.appendChild(style);
    }
    
    // 2. Hủy các Toast cũ để tránh đè lấp giao diện
    const existingToast = document.querySelector('.floating-copy-toast');
    if (existingToast) {
      existingToast.remove();
    }
    
    // 3. Dựng Toast thông báo mới tinh xảo
    const toast = document.createElement('div');
    toast.className = 'floating-copy-toast';
    toast.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><path d="M20 6L9 17l-5-5"/></svg>
      <span>Đã copy ${label}: <span style="color: #38bdf8; font-weight: 800; font-family: monospace;">${cleanText}</span></span>
    `;
    document.body.appendChild(toast);
    
    // Kích hoạt hiệu ứng trượt lên
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });
    
    // Tự động rút về sau 1.5s
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 1500);
  }).catch(err => {
    console.error('Lỗi truy cập bộ nhớ tạm (Clipboard API):', err);
  });
};
