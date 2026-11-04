import React, { useState, useEffect, useCallback, useRef } from 'react';
import { logStaffActivity } from '../../services/activityLogger';
import CarImage from '../ui/CarImage';
import { getExteriorSwatchColor } from '../../utils/styleUtils';
import '../stock/faceted-stock.css';

interface StockLocationGuardProps {
  children: React.ReactNode;
  currentUser: string;
  currentUserName: string;
  userEmail: string;
  isAdmin: boolean;
  onCancel: () => void;
  showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
}

export const StockLocationGuard: React.FC<StockLocationGuardProps> = ({
  children,
  currentUser: _currentUser,
  currentUserName: _currentUserName,
  userEmail: _userEmail,
  isAdmin,
  onCancel,
  showToast
}) => {
  // Admin được miễn trừ chặn cứng để tránh trường hợp máy bàn không có chip GPS
  if (isAdmin) {
    return <>{children}</>;
  }

  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(() => {
    return sessionStorage.getItem('om_stock_location_verified') === 'true';
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Ghi nhận vị trí và lưu vào bảng staff_activity_logs trên Supabase
  const reportLocationToAdmin = async (lat: number, lng: number, accuracy: number) => {
    await logStaffActivity({
      actionType: 'ENTER_STOCK',
      actionTitle: 'Truy cập tra cứu kho xe',
      lat,
      lng,
      accuracy
    });
  };

  // Ghi nhật ký khi bị ngắt GPS giữa chừng
  const reportGpsLossToAdmin = async (reason: string) => {
    await logStaffActivity({
      actionType: 'STOCK_GPS_REVOKED',
      actionTitle: 'Định vị GPS bị tắt hoặc thu hồi quyền khi đang xem kho xe',
      actionDetails: { reason }
    });
  };

  const isLockingRef = useRef(false);

  // Hàm khóa màn hình ngay lập tức khi phát hiện tắt GPS hoặc thu hồi quyền
  const lockStockImmediately = useCallback((reason: string) => {
    if (isLockingRef.current) return;
    isLockingRef.current = true;
    sessionStorage.removeItem('om_stock_location_verified');
    setIsVerified(false);
    setIsVerifying(false);
    setErrorMessage(reason);
    reportGpsLossToAdmin(reason);
    showToast('Bảo mật Kho xe', reason, 'error', 5000);
    setTimeout(() => {
      isLockingRef.current = false;
    }, 15000);
  }, [showToast]);

  // Yêu cầu lấy vị trí thiết bị (kích hoạt bằng cử chỉ bấm nút của người dùng)
  const requestLocation = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setErrorMessage('Trình duyệt hoặc thiết bị của bạn không hỗ trợ định vị GPS. Không thể mở Kho xe.');
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);

    const onPositionSuccess = async (pos: GeolocationPosition) => {
      try {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = pos.coords.accuracy;

        // Gửi dữ liệu về Admin
        await reportLocationToAdmin(lat, lng, accuracy);

        sessionStorage.setItem('om_stock_location_verified', 'true');
        setIsVerified(true);
        showToast('Đã xác thực vị trí', 'Vị trí của bạn đã được ghi nhận. Đã mở quyền xem kho xe.', 'success', 3000);
      } catch (e: any) {
        setErrorMessage('Lỗi ghi nhận vị trí về hệ thống: ' + (e.message || 'Thử lại sau ít phút'));
      } finally {
        setIsVerifying(false);
      }
    };

    const onPositionError = (err: GeolocationPositionError) => {
      // Nếu thất bại do GPS vệ tinh không phản hồi (thường gặp trên PC bàn), thử tiếp bằng Wi-Fi/IP của thiết bị
      if (err.code === err.TIMEOUT || err.code === err.POSITION_UNAVAILABLE) {
        navigator.geolocation.getCurrentPosition(
          onPositionSuccess,
          (finalErr) => {
            setIsVerifying(false);
            if (finalErr.code === finalErr.PERMISSION_DENIED) {
              setErrorMessage('Vị trí bị chặn: Vui lòng bấm vào biểu tượng 🔒 hoặc ⚙️ cạnh thanh địa chỉ web ➔ Cho phép vị trí.');
            } else {
              setErrorMessage('Không thể xác định vị trí. Vui lòng bật định vị trên máy và thử lại.');
            }
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
        );
        return;
      }

      setIsVerifying(false);
      if (err.code === err.PERMISSION_DENIED) {
        setErrorMessage('Vị trí bị chặn: Vui lòng bấm vào biểu tượng 🔒 hoặc ⚙️ cạnh thanh địa chỉ web ➔ Cho phép vị trí.');
      } else {
        setErrorMessage('Không thể lấy vị trí hiện tại: ' + err.message);
      }
    };

    // Bước 1: Kích hoạt trực tiếp hộp thoại chia sẻ vị trí của thiết bị
    navigator.geolocation.getCurrentPosition(
      onPositionSuccess,
      onPositionError,
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 0
      }
    );
  }, [showToast]);

  // GIÁM SÁT LIÊN TỤC (REAL-TIME GPS MONITORING):
  // Nếu TVBH tắt GPS trên điện thoại/máy tính hoặc thu hồi quyền trên trình duyệt,
  // lập tức khóa màn hình Kho xe ngay trong tích tắc!
  useEffect(() => {
    if (!isVerified) return;

    // 1. Lắng nghe sự kiện thay đổi quyền Geolocation qua Permissions API (nếu trình duyệt hỗ trợ)
    let permissionStatus: PermissionStatus | null = null;
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' }).then((status) => {
        permissionStatus = status;
        status.onchange = () => {
          if (status.state !== 'granted') {
            lockStockImmediately('Quyền vị trí đã bị thu hồi hoặc chuyển sang chặn! Kho xe đã tự động bị khóa ngay lập tức.');
          }
        };
      }).catch(() => {});
    }

    // 2. Kích hoạt watchPosition liên tục: Bắt sự kiện người dùng tắt GPS ở cài đặt điện thoại
    const watchId = navigator.geolocation.watchPosition(
      () => {
        // GPS vẫn đang hoạt động bình thường
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          lockStockImmediately('Quyền truy cập vị trí đã bị thu hồi trong khi đang xem kho xe! Hệ thống đã khóa màn hình Kho xe.');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          lockStockImmediately('Định vị GPS trên thiết bị đã bị tắt! Theo quy chuẩn bảo mật, Kho xe đã tự động bị khóa.');
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000
      }
    );

    // 3. Heartbeat định kỳ kiểm tra GPS mỗi 45 giây và khi quay lại tab (Visibility Change)
    const checkGpsAlive = () => {
      navigator.geolocation.getCurrentPosition(
        () => {},
        (err) => {
          if (err.code === err.PERMISSION_DENIED || err.code === err.POSITION_UNAVAILABLE) {
            lockStockImmediately('Phát hiện định vị GPS đã bị tắt! Kho xe đã tự động bị khóa.');
          }
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    };

    const heartbeatInterval = setInterval(checkGpsAlive, 45000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkGpsAlive();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
      if (permissionStatus) {
        permissionStatus.onchange = null;
      }
      clearInterval(heartbeatInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isVerified, lockStockImmediately]);

  if (isVerified) {
    return <>{children}</>;
  }

const tone = (status?: string) => {
  if (status === 'Chưa ghép') return '#22a774';
  if (status === 'Đang giữ') return '#edae27';
  return '#3978d5';
};

// Khung xương (Skeleton) Kho xe khớp 100% Mẫu 36 từ giao diện thật của Showroom
const StockSkeletonBackground: React.FC = () => {
  const mockVehicles = [
    { model: 'VF 5', version: 'Plus', extColor: 'Urbant Mint (CE1W)', vin: 'RLNV5JSE8TH842156', warehouse: 'Q12 (HCM)', dms: 'N31913', engine: 'VFCAFB269040212', holder: 'PHẠM KHÁNH DUY', status: 'Đã ghép' },
    { model: 'VF 6', version: 'Plus', extColor: 'Urbant Mint (CE1W)', vin: 'RLLVAG8C5TH835257', warehouse: 'Q12 (HCM)', dms: 'N31913', engine: 'VFBALB269040088', holder: '', status: 'Chưa ghép' },
    { model: 'VF 6', version: 'Plus', extColor: 'Jet Black (CE11)', vin: 'RLLVAG8C1TH833179', warehouse: 'Q12 (HCM)', dms: 'N31913', engine: 'VFBALD268150157', holder: 'NGUYỄN TRẦN HOÀNG THANH', status: 'Đã ghép' },
    { model: 'VF LIMO', version: 'MPV 7', extColor: 'White (CE18)', vin: 'RLLVFPTT5TH813980', warehouse: 'Q12 (HCM)', dms: 'N31923', engine: 'ENBALD266260106', holder: '', status: 'Chưa ghép' },
    { model: 'VF 5', version: 'Plus', extColor: 'Zenith Grey (CE1V)', vin: 'RLNV5JSE7TH803851', warehouse: 'Q12 (HCM)', dms: 'N31913', engine: 'VFCAFB266300365', holder: 'NGUYỄN HOÀNG KHANG HUY', status: 'Đã ghép' },
    { model: 'VF 3', version: 'Eco', extColor: 'Infinity Blanc Roof-Sky Blue (182G)', vin: 'RLNVBL9K4TT733352', warehouse: 'Q12 (HCM)', dms: 'N31903', engine: 'TZ160X30G26053000272', holder: '', status: 'Chưa ghép' },
    { model: 'VF 3', version: 'Eco', extColor: 'Brahminy White Roof - Summer Yellow Body (181U)', vin: 'RLNVBL9K4TT743542', warehouse: 'Q12 (HCM)', dms: 'N31911', engine: 'TZ160X30G26071600058', holder: '', status: 'Chưa ghép' },
    { model: 'VF 3', version: 'Plus', extColor: 'White (CE18)', vin: 'RLNVBL9K9TT750082', warehouse: 'Q12 (HCM)', dms: 'N31923', engine: 'TZ160X30G26081200482', holder: 'TRẦN DANH PHƯƠNG', status: 'Đang giữ' },
    { model: 'VF 8', version: 'Eco Tiêu chuẩn', extColor: 'White (CE18)', vin: 'RLLV1MTC6TH809210', warehouse: 'QL13 (HCM)', dms: 'N31920', engine: 'VFBALB266260216', holder: '', status: 'Chưa ghép' },
    { model: 'VF LIMO', version: 'MPV 7', extColor: 'White (CE18)', vin: 'RLLVFPTT3TH791655', warehouse: 'QL13 (HCM)', dms: 'N31913', engine: 'ENBALB265210261', holder: '', status: 'Chưa ghép' },
    { model: 'VF 5', version: 'Plus', extColor: 'Solar Ruby (CE2Q)', vin: 'RLNV5JSE8TH793685', warehouse: 'Q12 (HCM)', dms: 'N31913', engine: 'VFCAFB266190118', holder: '', status: 'Chưa ghép' },
    { model: 'VF 6', version: 'Eco', extColor: 'Jet Black (CE11)', vin: 'RLLVAGND5TH790351', warehouse: 'QL13 (HCM)', dms: 'N31923', engine: 'VFCAJB266110194', holder: '', status: 'Chưa ghép' }
  ];

  const statuses = [
    { name: 'Tất cả trạng thái', count: 67, active: true },
    { name: 'Chưa ghép', count: 45, active: false },
    { name: 'Đang giữ', count: 1, active: false },
    { name: 'Đã ghép', count: 21, active: false }
  ];

  const models = [
    { name: 'Tất cả dòng xe', count: 67, active: true },
    { name: 'EC Van', count: 2, active: false },
    { name: 'LIMO', count: 14, active: false },
    { name: 'MINIO', count: 1, active: false },
    { name: 'VF 2', count: 2, active: false },
    { name: 'VF 3', count: 17, active: false },
    { name: 'VF 5', count: 16, active: false },
    { name: 'VF 6', count: 6, active: false },
    { name: 'VF 7', count: 1, active: false },
    { name: 'VF 8', count: 1, active: false },
    { name: 'VF LIMO', count: 7, active: false }
  ];

  const locations = [
    { name: 'Tất cả vị trí', count: 67, active: true },
    { name: 'Q12 (HCM)', count: 24, active: false },
    { name: 'QL13 (HCM)', count: 28, active: false },
    { name: 'Thuận An', count: 15, active: false }
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none opacity-85 filter blur-[0.8px] scale-[0.995] z-0">
      <div className="cmd-root" style={{ height: '100%' }}>
        {/* Left Sidebar: 100% đồng bộ với Tab Đơn Hàng */}
        <aside className="cmd-sidebar">
          <div className="cmd-sidebar-head">
            <h1>Kho xe <span>67 / 67</span></h1>
            <div className="cmd-sidebar-actions">
              <button type="button" className="cmd-icon-btn">
                <i className="fa-solid fa-radar"></i>
              </button>
              <button type="button" className="cmd-icon-btn">
                <i className="fa-solid fa-rotate"></i>
              </button>
            </div>
          </div>

          <div className="cmd-search-wrap">
            <label className="cmd-search-label">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 21l-5-5 M18 10a8 8 0 1 0-16 0 8 8 0 0 0 16 0" />
              </svg>
              <input readOnly placeholder="Tìm VIN, dòng xe, số máy, DMS…" />
            </label>
          </div>

          <div className="cmd-facets-scroll">
            <div className="facet-group">
              <strong>Trạng thái ghép xe</strong>
              <div className="facet-btn-list">
                {statuses.map(s => (
                  <div key={s.name} className={`facet-item ${s.active ? 'active' : ''}`}>
                    <span>{s.name}</span>
                    <small>{s.count}</small>
                  </div>
                ))}
              </div>
            </div>

            <div className="facet-group">
              <strong>Dòng xe VinFast</strong>
              <div className="facet-btn-list">
                {models.map(m => (
                  <div key={m.name} className={`facet-item ${m.active ? 'active' : ''}`}>
                    <span>{m.name}</span>
                    <small>{m.count}</small>
                  </div>
                ))}
              </div>
            </div>

            <div className="facet-group">
              <strong>Vị trí kho bãi</strong>
              <div className="facet-btn-list">
                {locations.map(l => (
                  <div key={l.name} className={`facet-item ${l.active ? 'active' : ''}`}>
                    <span>{l.name}</span>
                    <small>{l.count}</small>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="cmd-sidebar-footer">
            <span>67 / 67 xe</span>
          </div>
        </aside>

        {/* Right Stream */}
        <div className="cmd-content-col">
          <div className="cmd-stream-fixed-spacer" aria-hidden="true" />
          <main className="cmd-stream">
            {mockVehicles.map(c => {
              const paint = getExteriorSwatchColor(c.extColor);
              return (
                <article key={c.vin} className="cmd-card">
                  <div className="cmd-card-thumb">
                    <CarImage
                      model={c.model}
                      exteriorColor={c.extColor}
                      version={c.version}
                      alt={c.model}
                    />
                  </div>
                  <div className="cmd-card-content">
                    <div className="cmd-card-header">
                      <strong>
                        {c.model} <small>{c.version || 'Tiêu chuẩn'}</small>
                      </strong>
                      <span className="cmd-status" style={{ '--tone': tone(c.status) } as React.CSSProperties}>
                        {c.status}
                      </span>
                    </div>
                    <div>
                      <div className="cmd-card-vin">
                        {c.vin}
                      </div>
                    </div>
                    <div className="cmd-card-meta">
                      <span>
                        <i className="cmd-swatch" style={{ background: paint }}></i>
                        {c.extColor || '—'}
                      </span>
                      <span>📍 {c.warehouse || '—'}</span>
                    </div>
                    <div className="cmd-card-specs">
                      DMS: {c.dms || '—'} · Máy: {c.engine || '—'}
                    </div>
                    <div className="cmd-card-footer">
                      <small className="cmd-card-holder">
                        {c.holder ? `Giữ: ${c.holder}` : 'Chưa có người giữ'}
                      </small>
                      <div className="cmd-actions">
                        <button type="button" className="cmd-btn">Chi tiết</button>
                        {c.status === 'Chưa ghép' && (
                          <button type="button" className="cmd-btn primary">Giữ xe (24h)</button>
                        )}
                        {c.status === 'Đang giữ' && (
                          <button type="button" className="cmd-btn">Hủy giữ</button>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </main>
        </div>
      </div>
    </div>
  );
};

  return (
    <div className="h-full w-full relative overflow-hidden select-none font-sans animate-fade-in bg-slate-100">
      {/* 1. Khung xương (Skeleton) kho xe hiển thị mờ vui nhộn phía sau */}
      <StockSkeletonBackground />

      {/* 2. Sheet nhỏ trượt từ trên xuống đồng bộ với Mẫu 36 */}
      <div className="cmd-top-sheet-overlay">
        <aside
          className="cmd-top-sheet"
          role="dialog"
          aria-modal="true"
        >
          {/* Top subtle drag pill */}
          <div className="pt-2 flex justify-center">
            <span className="w-9 h-1 rounded-full bg-slate-200"></span>
          </div>

          <div className="p-4 space-y-3">
            {/* Header hàng ngang gọn gàng */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="relative w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center text-sm shadow-xs shrink-0">
                  <i className={`fa-solid ${isVerifying ? 'fa-circle-notch fa-spin' : errorMessage ? 'fa-location-dot text-amber-500' : 'fa-location-crosshairs'}`}></i>
                  <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${errorMessage ? 'bg-amber-400' : 'bg-blue-400'}`}></span>
                    <span className={`relative inline-flex rounded-full h-2 w-2 border border-white ${errorMessage ? 'bg-amber-500' : 'bg-blue-500'}`}></span>
                  </span>
                </div>
                <div>
                  <h2 className="text-[13.5px] font-bold text-slate-800 leading-tight">Xác thực vị trí</h2>
                  <p className="text-[11px] text-slate-500 leading-tight mt-0.5">Bật định vị GPS để mở Kho xe</p>
                </div>
              </div>

              <button
                type="button"
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors text-base leading-none cursor-pointer"
                onClick={onCancel}
                title="Quay lại"
                aria-label="Đóng"
              >
                ×
              </button>
            </div>

            {/* Thông báo an ninh súc tích */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2 text-[11px] text-slate-600 flex items-center gap-2">
              <i className="fa-solid fa-shield-halved text-blue-500 text-xs shrink-0"></i>
              <span className="leading-snug">Vì lý do bảo mật, bắt buộc chia sẻ vị trí để xem kho xe.</span>
            </div>

            {/* Cảnh báo lỗi nếu có */}
            {errorMessage && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-[11px] text-amber-900 flex items-start gap-2 animate-shake">
                <i className="fa-solid fa-triangle-exclamation text-amber-500 text-xs shrink-0 mt-0.5"></i>
                <span className="leading-snug">{errorMessage}</span>
              </div>
            )}

            {/* Nút hành động ngang compact */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={requestLocation}
                disabled={isVerifying}
                className="flex-1 py-2 px-3 bg-[#234f87] hover:bg-[#1b4172] text-white font-bold text-[11.5px] rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isVerifying ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>
                    <span>Đang lấy vị trí...</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-location-arrow text-xs"></i>
                    <span>Chia sẻ vị trí của tôi</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onCancel}
                disabled={isVerifying}
                className="py-2 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-[11.5px] rounded-xl transition-all cursor-pointer whitespace-nowrap"
              >
                Quay lại
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
