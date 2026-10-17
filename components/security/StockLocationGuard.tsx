import React, { useState, useEffect, useCallback, useRef } from 'react';
import { logStaffActivity } from '../../services/activityLogger';

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
  currentUser,
  currentUserName,
  userEmail,
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
  }, [showToast, currentUserName, currentUser, userEmail]);

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
  }, [currentUserName, currentUser, userEmail, showToast]);

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

// Khung xương (Skeleton) Kho xe khớp 100% từng thẻ xe và bộ lọc từ giao diện thật của Showroom
const StockSkeletonBackground: React.FC = () => {
  const stockMockCards = [
    // Hàng 1 (Từ trái qua phải đúng như ảnh thực tế)
    { model: 'EC Van', version: 'Plus_Cửa trượt', extColor: 'Solar Ruby (CE2...)', extColorClass: 'text-rose-600', intColor: 'Black', vin: 'RNXVGRMK9TT725625', warehouse: 'Thuận An', status: 'Chưa ghép', btn: 'hold', web: true, spider: true },
    { model: 'EC Van', version: 'Plus', extColor: 'White (CE18)', extColorClass: 'text-slate-600', intColor: 'Black', vin: 'RNXVGRPK0TT741176', warehouse: 'QL13 (HCM)', status: 'Chưa ghép', btn: 'hold', web: true },
    { model: 'EC Van', version: 'Plus', extColor: 'White (CE18)', extColorClass: 'text-slate-600', intColor: 'Black', vin: 'RNXVGRPK1TT741154', warehouse: 'QL13 (HCM)', status: 'Chưa ghép', btn: 'hold', web: true, spider: true },
    { model: 'MINIO', version: 'MINIO', extColor: 'Solar Ruby (CE2Q)', extColorClass: 'text-rose-600', intColor: 'Grey', vin: 'RLNVMNP56TT710017', warehouse: 'Thuận An', status: 'Đã ghép', btn: 'queue', web: true },
    { model: 'LIMO', version: 'LIMO', extColor: 'White (CE18)', extColorClass: 'text-slate-600', intColor: 'Black', vin: 'RLLVFPNT0TH844051', warehouse: 'QL13 (HCM)', status: 'Đã ghép', btn: 'queue', web: true },
    { model: 'VF LIMO', version: 'MPV 7', extColor: 'Jet Black (CE11)', extColorClass: 'text-slate-900', intColor: 'Brown', vin: 'RLLVFPTT5TH735460', warehouse: 'Thuận An', status: 'Chưa ghép', btn: 'hold', web: false, pumpkin: true },
    { model: 'LIMO', version: 'LIMO', extColor: 'White (CE18)', extColorClass: 'text-slate-600', intColor: 'Black', vin: 'RLLVFPNT7TH845536', warehouse: 'QL13 (HCM)', status: 'Chưa ghép', btn: 'hold', web: true },
    { model: 'LIMO', version: 'LIMO', extColor: 'White (CE18)', extColorClass: 'text-slate-600', intColor: 'Black', vin: 'RLLVFPNT7TH845021', warehouse: 'QL13 (HCM)', status: 'Chưa ghép', btn: 'hold', web: true, spider: true },

    // Hàng 2 (Đúng như ảnh thực tế)
    { model: 'LIMO', version: 'LIMO', extColor: 'Solar Ruby (CE2...)', extColorClass: 'text-rose-600', intColor: 'Black', vin: 'RLLVFPNT1TH812760', warehouse: 'QL13 (HCM)', status: 'Chưa ghép', btn: 'hold', web: true },
    { model: 'LIMO', version: 'LIMO', extColor: 'Jet Black (CE11)', extColorClass: 'text-slate-900', intColor: 'Black', vin: 'RLLVFPNT9TH810643', warehouse: 'QL13 (HCM)', status: 'Chưa ghép', btn: 'hold', web: false },
    { model: 'VF LIMO', version: 'MPV 7', extColor: 'White (CE18)', extColorClass: 'text-slate-600', intColor: 'Brown', vin: 'RLLVFPTT1TH811840', warehouse: 'Thuận An', status: 'Chưa ghép', btn: 'hold', web: true },
    { model: 'LIMO', version: 'LIMO', extColor: 'White (CE18)', extColorClass: 'text-slate-600', intColor: 'Black', vin: 'RLLVFPNT9TH801084', warehouse: 'QL13 (HCM)', status: 'Chưa ghép', btn: 'hold', web: true },
    { model: 'LIMO', version: 'LIMO', extColor: 'White (CE18)', extColorClass: 'text-slate-600', intColor: 'Black', vin: 'RLLVFPNT2TH799842', warehouse: 'Q12 (HCM)', status: 'Chưa ghép', btn: 'hold', web: false, pumpkin: true },
    { model: 'LIMO', version: 'LIMO', extColor: 'Solar Ruby (CE2...)', extColorClass: 'text-rose-600', intColor: 'Black', vin: 'RLLVFPNT7TH839817', warehouse: 'QL13 (HCM)', status: 'Chưa ghép', btn: 'hold', web: false },
    { model: 'VF LIMO', version: 'MPV 7', extColor: 'White (CE18)', extColorClass: 'text-slate-600', intColor: 'Black', vin: 'RLLVFPTT1TH813698', warehouse: 'QL13 (HCM)', status: 'Chưa ghép', btn: 'hold', web: true },
    { model: 'LIMO', version: 'LIMO', extColor: 'Silver (CE17)', extColorClass: 'text-slate-700', intColor: 'Black', vin: 'RLLVFPNT0TH842493', warehouse: 'QL13 (HCM)', status: 'Chưa ghép', btn: 'hold', web: false }
  ];

  const realTabs = [
    { label: 'Tất cả', count: 48, active: true },
    { label: 'EC Van', count: 3, active: false },
    { label: 'LIMO', count: 19, active: false },
    { label: 'MINIO', count: 1, active: false },
    { label: 'VF 3', count: 16, active: false },
    { label: 'VF 5', count: 15, active: false },
    { label: 'VF 6', count: 9, active: false },
    { label: 'VF 7', count: 3, active: false },
    { label: 'VF 8', count: 2, active: false },
    { label: 'VF LIMO', count: 9, active: false }
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none opacity-85 filter blur-[0.8px] scale-[0.995] p-2 flex flex-col bg-slate-100 z-0">
      {/* 1. Thanh Tabs & Bộ lọc chuẩn 100% từ ảnh thật */}
      <div className="w-full mb-1 flex-shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center gap-1.5 p-1 lg:py-1 lg:px-2 border bg-white/95 border-slate-200/90 rounded-xl shadow-xs">
          
          {/* Nhóm Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-1 min-w-0">
            <div className="flex items-center gap-0.5 bg-slate-100/90 border border-slate-200/70 rounded-lg p-0.5">
              {realTabs.map((tab, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-md whitespace-nowrap ${
                    tab.active
                      ? 'bg-gradient-to-r from-sky-600 via-sky-500 to-blue-600 text-white shadow-xs'
                      : 'text-slate-600 bg-transparent'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`text-[8.5px] font-extrabold px-1.5 py-0.2 rounded-full ${
                    tab.active ? 'bg-white/30 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {tab.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Ô tìm kiếm & Các nút lọc dropdown */}
          <div className="flex items-center gap-1.5">
            <div className="relative w-44 lg:w-48">
              <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
              <div className="w-full pl-7 pr-3 py-1 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-400 truncate">
                Tìm hồ sơ...
              </div>
            </div>

            {['Kho', 'Phiên Bản', 'Mã DMS', 'Trạng Thái', 'Ngoại Thất'].map((filterName, i) => (
              <div key={i} className="hidden xl:flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-600 shadow-2xs">
                <span>{filterName}</span>
                <i className="fa-solid fa-chevron-down text-[8px] text-slate-400"></i>
              </div>
            ))}

            <div className="hidden xl:flex items-center justify-center w-7 h-7 bg-white border border-slate-200 rounded-lg text-slate-400 text-xs">
              <i className="fa-solid fa-xmark"></i>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Lưới thẻ xe chuẩn 8 cột khớp 100% với ảnh thật */}
      <div className="flex-1 flex flex-col min-h-0 bg-slate-50 rounded-2xl shadow-xs border border-slate-200/80 p-2 overflow-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8 gap-2 overflow-hidden">
          {stockMockCards.map((car, idx) => (
            <div
              key={idx}
              className="bg-white rounded-xl border border-slate-200/80 p-2 shadow-2xs flex flex-col justify-between relative overflow-hidden"
            >
              {/* Halloween Spiderweb góc trên bên trái */}
              {car.web && (
                <div className="absolute top-0.5 left-0.5 pointer-events-none opacity-40 text-xs">
                  🕸️
                </div>
              )}
              {car.spider && (
                <div className="absolute top-1 right-2 pointer-events-none opacity-40 text-[9px]">
                  🕷️
                </div>
              )}
              {car.pumpkin && (
                <div className="absolute top-1 right-1 pointer-events-none opacity-50 text-[10px]">
                  🎃
                </div>
              )}

              <div>
                {/* Ảnh xe & Sparkle backdrop */}
                <div className="relative h-[82px] w-full bg-gradient-to-br from-slate-50 to-white rounded-lg flex items-center justify-center mb-1 border border-slate-100 overflow-hidden">
                  <div className="w-24 h-12 rounded-lg bg-slate-100 border border-slate-200/60 flex items-center justify-center text-slate-400 text-2xl">
                    <i className="fa-solid fa-car-side"></i>
                  </div>
                  <div className="absolute top-1 right-1 text-[8px] text-amber-400 opacity-60">✨</div>
                </div>

                {/* Dòng 1: Dòng xe & Phiên bản */}
                <div className="flex items-baseline gap-1 overflow-hidden mb-0.5">
                  <span className="font-bold text-[12px] text-slate-800 whitespace-nowrap">{car.model}</span>
                  <span className="text-[9.5px] text-slate-500 truncate">{car.version}</span>
                </div>

                {/* Dòng 2: Ngoại thất | Nội thất */}
                <div className="text-[9px] text-slate-600 truncate flex items-center gap-1 mb-1">
                  <span className={`font-medium ${car.extColorClass}`}>{car.extColor}</span>
                  <span className="text-slate-300">|</span>
                  <span className="flex items-center gap-0.5 text-slate-500">
                    <i className="fa-solid fa-chair text-[8px]"></i> {car.intColor}
                  </span>
                </div>

                {/* Dòng 3: Số VIN */}
                <div className="flex items-center gap-1 text-[9.5px] font-mono mb-0.5">
                  <i className="fa-solid fa-tag text-slate-400 text-[8px]"></i>
                  <span className="text-slate-400 text-[9px] font-sans">VIN</span>
                  <span className="font-bold text-blue-600 truncate">{car.vin}</span>
                </div>

                {/* Dòng 4: Vị trí kho */}
                <div className="flex items-center gap-1 text-[9.5px] mb-1.5">
                  <i className="fa-solid fa-warehouse text-emerald-600 text-[8.5px]"></i>
                  <span className="text-emerald-700 font-semibold text-[9px]">Kho</span>
                  <span className="text-slate-700 font-bold text-[9.5px] truncate">{car.warehouse}</span>
                </div>

                {/* Dòng 5: Huy hiệu trạng thái */}
                <div className="mb-2">
                  <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded ${
                    car.status === 'Đã ghép'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}>
                    {car.status}
                  </span>
                </div>
              </div>

              {/* Dòng 6: Nút thao tác Giữ xe / Chờ xe */}
              <div>
                <div className={`w-full py-1 px-2 rounded-lg border text-[10.5px] font-bold flex items-center justify-center gap-1 shadow-2xs ${
                  car.btn === 'queue'
                    ? 'border-amber-400 text-amber-700 bg-amber-50/60'
                    : 'border-blue-400 text-blue-600 bg-blue-50/40'
                }`}>
                  {car.btn === 'queue' ? (
                    <>
                      <i className="fa-solid fa-user-plus text-[9px]"></i>
                      <span>Chờ xe</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-lock text-[9px]"></i>
                      <span>Giữ xe</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

  if (isVerified) {
    return <>{children}</>;
  }

  return (
    <div className="h-full w-full relative overflow-hidden select-none font-sans animate-fade-in bg-slate-100">
      {/* 1. Khung xương (Skeleton) kho xe hiển thị mờ vui nhộn phía sau */}
      <StockSkeletonBackground />

      {/* 2. Hộp thoại xác thực vị trí nổi trên nền kính mờ */}
      <div className="absolute inset-0 z-10 flex items-center justify-center p-4 bg-slate-900/25 backdrop-blur-[2px]">
        <div className="relative max-w-[360px] w-full bg-white/95 backdrop-blur-md rounded-3xl border border-white/80 shadow-2xl p-7 text-center flex flex-col items-center">
          
          {/* Soft VinFast Blue Icon */}
          <div className="relative w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center text-xl shadow-sm mb-4">
            <i className={`fa-solid ${isVerifying ? 'fa-circle-notch fa-spin' : errorMessage ? 'fa-location-dot text-amber-500' : 'fa-location-crosshairs'}`}></i>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${errorMessage ? 'bg-amber-400' : 'bg-blue-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 border-2 border-white ${errorMessage ? 'bg-amber-500' : 'bg-blue-500'}`}></span>
            </span>
          </div>

          {/* Title & Subtitle */}
          <h2 className="text-base font-bold text-slate-800 mb-1 tracking-tight">
            Xác thực vị trí
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Bật định vị GPS để mở Kho xe
          </p>

          {/* Gentle Security Note */}
          <div className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-[11.5px] text-slate-600 mb-4 flex items-center gap-2 text-left">
            <i className="fa-solid fa-shield-halved text-blue-500 text-xs shrink-0"></i>
            <span className="leading-snug">Vì lý do bảo mật, bắt buộc chia sẻ vị trí để xem kho xe.</span>
          </div>

          {/* Status / Error Guidance */}
          {errorMessage && (
            <div className="w-full bg-amber-50 border border-amber-200/80 rounded-xl px-3 py-2.5 text-[11.5px] text-amber-900 mb-4 flex items-start gap-2 text-left animate-shake">
              <i className="fa-solid fa-triangle-exclamation text-amber-500 text-xs shrink-0 mt-0.5"></i>
              <span className="leading-snug">{errorMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="w-full space-y-2">
            <button
              type="button"
              onClick={requestLocation}
              disabled={isVerifying}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isVerifying ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>
                  <span>Đang lấy vị trí thiết bị...</span>
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
              className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs rounded-xl transition-all cursor-pointer"
            >
              Quay lại
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
