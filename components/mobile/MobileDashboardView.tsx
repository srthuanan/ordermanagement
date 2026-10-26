import React, { useState } from 'react';
import {
  Car,
  FileText,
  Warehouse,
  UserPlus,
  Gauge,
  Receipt,
  ShieldCheck,
  LogOut,
  Bell,
  X,
  CheckCheck,
  FilePlus,
  UserRoundCog,
  KeyRound,
  ChevronLeft,
} from 'lucide-react';
import { VinFastAnimatedLogo } from '../common/VinFastAnimatedLogo';
import { VinFastBrandTextSvg } from '../common/VinFastBrandTextSvg';
import { VinFastWelcomeBannerSvg } from '../common/VinFastWelcomeBannerSvg';

export type MobileTabId =
  | 'orders'
  | 'backlog'
  | 'stock'
  | 'crm'
  | 'laithu'
  | 'sold'
  | 'admin';

interface MobileDashboardViewProps {
  currentUser?: any;
  currentUserName?: string;
  userRole?: string;
  isCurrentUserAdmin?: boolean;
  onSelectTab: (tabId: MobileTabId) => void;
  onCreateRequest?: () => void;
  renderChangePassword?: (onBack: () => void) => React.ReactNode;
  onLogout: () => void;
  ordersCount?: number;
  stockCount?: number;
  backlogCount?: number;
  crmCount?: number;
  isStockEnabled?: boolean;
  isCrmEnabled?: boolean;
  unreadNotificationsCount?: number;
  notifications?: any[];
  onNotificationClick?: (notification: any, e: React.MouseEvent) => void;
  onMarkAllAsRead?: (e: React.MouseEvent) => void;
}

const formatRelativeTime = (isoString?: string) => {
  if (!isoString) return '';
  try {
    const diff = (Date.now() - new Date(isoString).getTime()) / 1000;
    if (diff < 60) return 'Vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    return `${Math.floor(diff / 86400)} ngày trước`;
  } catch {
    return '';
  }
};

interface RefinedNotification {
  title: string;
  categoryBadge: { label: string; bg: string; text: string; dot: string };
  message: string;
  vin?: string;
}

const getRefinedNotification = (item: any): RefinedNotification => {
  const rawMsg = (item?.message || '').trim();
  const meta = item?.metadata || {};
  const type = item?.type || '';

  // 1. Xe nhả giữ / xe rảnh (VD: 📢 XE RẢNH: Xe RNXVGRPKOTT741176 vừa được nhả!)
  const xeRanhMatch = rawMsg.match(/(?:XE RẢNH:\s*)?Xe\s+([A-Z0-9]{8,17})(?:\s*\((.*?)\))?\s*vừa được (?:nhả|giải phóng)!?/i);
  if (xeRanhMatch) {
    const vin = xeRanhMatch[1];
    const model = xeRanhMatch[2] ? xeRanhMatch[2].trim() : '';
    return {
      title: 'Xe Mở Giữ Tự Do',
      categoryBadge: { label: 'Kho Xe', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
      message: model 
        ? `${model} (${vin}) đã mở lại quyền giữ xe, sẵn sàng ghép đơn.`
        : `Xe (${vin}) đã mở lại quyền giữ xe, sẵn sàng ghép đơn.`,
      vin,
    };
  }

  // 2. Xe nhập kho (VD: <b>VF 5</b> - Plus (RLNV5JSE7TH846649) đã nhập kho. Sẵn sàng giao dịch!)
  const nhapKhoMatch = rawMsg.match(/(?:<b>(.*?)<\/b>|(.*?))\s*[-–]?\s*(.*?)\s*\(([A-Z0-9]{8,17})\)\s*đã (?:nhập kho|cập bến)/i);
  if (nhapKhoMatch) {
    const model = (nhapKhoMatch[1] || nhapKhoMatch[2] || '').trim();
    const version = (nhapKhoMatch[3] || '').replace(/^-\s*/, '').trim();
    const vin = nhapKhoMatch[4];
    const carName = [model, version].filter(Boolean).join(' ');
    return {
      title: 'Xe Mới Cập Bến',
      categoryBadge: { label: 'Nhập Kho', bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500' },
      message: `${carName ? carName + ' ' : ''}(${vin}) đã về bãi Thuận An, sẵn sàng ký hợp đồng.`,
      vin,
    };
  }

  // 3. Cập nhật nhiều xe mới vào kho
  const khoUpdateMatch = rawMsg.match(/(?:Đã cập nhật|Đã tiếp nhận)\s*(?:<b>)?(\d+)\s*xe mới(?:<\/b>)?/i);
  if (khoUpdateMatch) {
    const count = khoUpdateMatch[1];
    return {
      title: 'Cập Nhật Danh Mục Kho',
      categoryBadge: { label: 'Kho Bãi', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
      message: `Đã tiếp nhận ${count} xe mới vào danh mục kho bãi, sẵn sàng phân bổ.`,
    };
  }

  // 4. Ghép xe tự động dự phòng
  const autoMatchBackup = rawMsg.match(/tự động ghép xe dự phòng\s*\((?:VIN:\s*)?([A-Z0-9]+)\)\s*cho đơn hàng\s*([A-Z0-9_-]+)/i);
  if (autoMatchBackup) {
    const vin = autoMatchBackup[1];
    const orderNo = autoMatchBackup[2];
    return {
      title: 'Phân Bổ Xe Dự Phòng',
      categoryBadge: { label: 'Đơn Hàng', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
      message: `Đơn hàng #${orderNo} đã tự động ghép xe dự phòng (${vin}).`,
      vin,
    };
  }

  // 5. Admin ghép xe thành công
  const adminMatch = rawMsg.match(/Admin đã ghép xe\s*\((?:VIN:\s*)?([A-Z0-9]+)\)\s*cho ĐH\s*([A-Z0-9_-]+)/i);
  if (adminMatch) {
    const vin = adminMatch[1];
    const orderNo = adminMatch[2];
    return {
      title: 'Ghép Xe Thành Công',
      categoryBadge: { label: 'Phân Bổ', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
      message: `Đơn hàng #${orderNo} đã ghép số VIN ${vin}.`,
      vin,
    };
  }

  // 6. Phát hành hóa đơn
  const invoiceMatch = rawMsg.match(/(?:Đã có|phát hành) hóa đơn cho ĐH\s*([A-Z0-9_-]+)/i);
  if (invoiceMatch) {
    const orderNo = invoiceMatch[1];
    return {
      title: 'Phát Hành Hóa Đơn',
      categoryBadge: { label: 'Hóa Đơn', bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500' },
      message: `Hóa đơn điện tử M-Invoice cho đơn hàng #${orderNo} đã phát hành.`,
    };
  }

  // 7. Quyền lợi VinClub
  if (/VinClub|VC/i.test(rawMsg)) {
    const isUNC = /UNC/i.test(rawMsg);
    const isApprove = /phê duyệt|xác thực/i.test(rawMsg);
    return {
      title: isUNC ? 'Đối Soát UNC VinClub' : 'Chính Sách VinClub',
      categoryBadge: { label: 'VinClub', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
      message: isApprove
        ? rawMsg.replace(/<[^>]*>/g, '').replace(/yêu cầu vinclub cho đh/i, 'Đơn hàng').replace(/đã được phê duyệt/i, 'đã xác nhận quyền lợi VinClub.')
        : rawMsg.replace(/<[^>]*>/g, ''),
    };
  }

  // 8. Giữ xe
  const holdMatch = rawMsg.match(/TVBH\s+(.+?)\s+vừa mới giữ xe\s+([A-Z0-9]+)/i);
  if (holdMatch) {
    const tvbh = holdMatch[1];
    const vin = holdMatch[2];
    return {
      title: 'Ghi Nhận Giữ Xe',
      categoryBadge: { label: 'Tác Nghiệp', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
      message: `${tvbh} đã giữ tạm thời xe (${vin}) trong 24 giờ.`,
      vin,
    };
  }

  // 9. Hàng chờ ưu tiên
  const queueMatch = rawMsg.match(/TVBH\s+(.+?)\s+đã tham gia hàng chờ ưu tiên xe\s+([A-Z0-9]+)/i);
  if (queueMatch) {
    const tvbh = queueMatch[1];
    const vin = queueMatch[2];
    return {
      title: 'Hàng Đợi Nhận Xe',
      categoryBadge: { label: 'Hàng Chờ', bg: 'bg-sky-50', text: 'text-sky-700', dot: 'bg-sky-500' },
      message: `${tvbh} đã đăng ký nhận thông báo ưu tiên xe (${vin}).`,
      vin,
    };
  }

  // Fallback: Làm sạch thẻ HTML, loại bỏ emoji loa kèn, chuẩn hóa câu từ
  let cleanMsg = rawMsg
    .replace(/<[^>]*>/g, '')
    .replace(/^📢\s*/, '')
    .replace(/^XE RẢNH:\s*/i, '')
    .replace(/vừa được nhả!/i, 'đã mở lại quyền giữ xe.')
    .trim();

  let title = meta.title || '';
  if (!title || title === 'Thông báo hệ thống') {
    if (type === 'stock_hero' || /kho|xe/i.test(cleanMsg)) title = 'Biến Động Kho Xe';
    else if (/hóa đơn|xhđ/i.test(cleanMsg)) title = 'Tiến Độ Hóa Đơn';
    else if (/đơn hàng/i.test(cleanMsg)) title = 'Cập Nhật Đơn Hàng';
    else title = 'Thông Báo Showroom';
  }

  return {
    title,
    categoryBadge: { label: 'Hệ Thống', bg: 'bg-slate-50', text: 'text-slate-600', dot: 'bg-slate-400' },
    message: cleanMsg,
  };
};

export const MobileDashboardView: React.FC<MobileDashboardViewProps> = ({
  currentUser,
  currentUserName,
  userRole,
  isCurrentUserAdmin = false,
  onSelectTab,
  onCreateRequest,
  renderChangePassword,
  onLogout,
  ordersCount,
  stockCount,
  backlogCount,
  crmCount,
  isStockEnabled = true,
  isCrmEnabled = true,
  unreadNotificationsCount = 0,
  notifications = [],
  onNotificationClick,
  onMarkAllAsRead,
}) => {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileView, setProfileView] = useState<'menu' | 'password'>('menu');

  const displayName =
    (typeof currentUser === 'string' && currentUser.trim() ? currentUser.trim() : '') ||
    currentUser?.consultantName ||
    currentUser?.name ||
    currentUserName ||
    currentUser?.username ||
    (isCurrentUserAdmin ? 'Quản trị viên' : 'Tư vấn bán hàng');

  const roleBadgeLabel = isCurrentUserAdmin
    ? 'Admin Showroom'
    : userRole === 'accountant'
    ? 'Kế toán'
    : 'Tư vấn bán hàng';

  // Chuẩn hóa tên sang Title Case sang trọng nếu bị ALL-CAPS (VD: TẤT BÁCH TƯỜNG -> Tất Bách Tường)
  const formattedName = React.useMemo(() => {
    if (!displayName) return '';
    const trimmed = displayName.trim();
    if (trimmed === trimmed.toUpperCase() && trimmed.length > 2) {
      return trimmed
        .toLowerCase()
        .split(' ')
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    }
    return trimmed;
  }, [displayName]);

  // Lời chào thông minh theo thời gian thực
  const timeGreeting = React.useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  }, []);

  // Định nghĩa danh mục các ICON Tab Nghiệp Vụ chuẩn 1-1 với thanh menu trên Laptop
  const menuItems = [
    {
      id: 'orders' as MobileTabId,
      title: 'Đơn Hàng',
      subtitle: 'Tiến độ VSO & Ghép xe',
      icon: Car,
      iosGradient: 'from-[#60A5FA] via-[#2563EB] to-[#1E40AF]',
      shadowColor: 'rgba(37, 99, 235, 0.28)',
      rawCount: ordersCount || 0,
      badge: ordersCount !== undefined ? `${ordersCount} đơn` : undefined,
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      visible: true,
    },
    {
      id: 'create-request' as const,
      title: 'Tạo Đơn Hàng',
      subtitle: 'Tạo đơn mới',
      icon: FilePlus,
      iosGradient: 'from-[#F472B6] via-[#DB2777] to-[#9D174D]',
      shadowColor: 'rgba(219, 39, 119, 0.24)',
      rawCount: 0,
      badge: 'Tạo mới',
      badgeColor: 'bg-violet-50 text-violet-700 border-violet-200',
      visible: true,
      onClick: onCreateRequest,
    },
    {
      id: 'backlog' as MobileTabId,
      title: 'Đơn Tồn',
      subtitle: 'Yêu cầu XHĐ & Thẩm định',
      icon: FileText,
      iosGradient: 'from-[#4ADE80] via-[#16A34A] to-[#166534]',
      shadowColor: 'rgba(22, 163, 74, 0.24)',
      rawCount: backlogCount || 0,
      badge: backlogCount !== undefined ? `${backlogCount} hồ sơ` : undefined,
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      visible: true,
    },
    {
      id: 'stock' as MobileTabId,
      title: 'Kho Xe',
      subtitle: 'Tồn kho & Giữ xe 24h',
      icon: Warehouse,
      iosGradient: 'from-[#A78BFA] via-[#6D28D9] to-[#3B0764]',
      shadowColor: 'rgba(109, 40, 217, 0.24)',
      rawCount: stockCount || 0,
      badge: stockCount !== undefined ? `${stockCount} xe` : undefined,
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      visible: isStockEnabled || isCurrentUserAdmin,
    },
    {
      id: 'crm' as MobileTabId,
      title: 'Khách Tiềm Năng',
      subtitle: 'Nhập Leads & Dán Zalo',
      icon: UserPlus,
      iosGradient: 'from-[#5EEAD4] via-[#0D9488] to-[#115E59]',
      shadowColor: 'rgba(13, 148, 136, 0.24)',
      rawCount: crmCount || 0,
      badge: crmCount ? `${crmCount} khách` : 'Leads',
      badgeColor: 'bg-teal-50 text-teal-700 border-teal-200',
      visible: isCrmEnabled || isCurrentUserAdmin,
    },
    {
      id: 'laithu' as MobileTabId,
      title: 'Lái Thử',
      subtitle: 'Lịch hẹn & Trải nghiệm',
      icon: Gauge,
      iosGradient: 'from-[#FB923C] via-[#EA580C] to-[#9A3412]',
      shadowColor: 'rgba(234, 88, 12, 0.24)',
      rawCount: 0,
      badge: 'Sẵn sàng',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
      visible: true,
    },
    {
      id: 'sold' as MobileTabId,
      title: 'Lịch Sử Bán Hàng',
      subtitle: 'Hóa đơn M-Invoice & TD4',
      icon: Receipt,
      iosGradient: 'from-[#64748B] via-[#334155] to-[#0F172A]',
      shadowColor: 'rgba(30, 41, 59, 0.22)',
      rawCount: 0,
      badge: 'Lưu trữ',
      badgeColor: 'bg-slate-100 text-slate-700 border-slate-300',
      visible: true,
    },
    {
      id: 'admin' as MobileTabId,
      title: 'Quản Trị',
      subtitle: 'Trung tâm showroom',
      icon: ShieldCheck,
      iosGradient: 'from-[#FDE047] via-[#EAB308] to-[#A16207]',
      shadowColor: 'rgba(202, 138, 4, 0.24)',
      rawCount: 0,
      badge: 'Admin',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
      visible: isCurrentUserAdmin,
    },
    {
      id: 'profile' as const,
      title: 'Cá Nhân',
      subtitle: 'Tài khoản & cài đặt',
      icon: UserRoundCog,
      iosGradient: 'from-[#FB7185] via-[#E11D48] to-[#881337]',
      shadowColor: 'rgba(225, 29, 72, 0.22)',
      rawCount: 0,
      badge: 'Cài đặt',
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
      visible: true,
      onClick: () => {
        setProfileView('menu');
        setIsProfileOpen(true);
      },
    },
  ];
  const visibleMenuItems = menuItems.filter((item) => item.visible);

  return (
    <div
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
      }}
      className="h-[100dvh] max-h-[100dvh] w-full bg-[linear-gradient(160deg,#eef3fb_0%,#f5f7fb_46%,#f2f2f7_100%)] text-slate-800 flex flex-col justify-between select-none relative overflow-hidden font-sans"
    >
      {/* Subtle Aurora Ambient Lights */}
      <div className="absolute -top-20 left-1/2 h-80 w-[34rem] -translate-x-1/2 rounded-full bg-blue-400/[0.09] blur-[110px] pointer-events-none" />
      <div className="absolute top-48 -right-16 w-64 h-64 bg-cyan-300/[0.08] rounded-full blur-[90px] pointer-events-none" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-9 left-1/2 z-0 -translate-x-1/2 grayscale opacity-[0.025]"
      >
        <VinFastAnimatedLogo size={170} showText={false} />
      </div>

      {/* 🌟 2. TOP NAV: Brand & Notification Bar */}
      <header className="w-full max-w-md mx-auto px-4 pt-2.5 pb-2 flex items-center justify-between z-30 flex-shrink-0">
        {/* Left: Animated Brand Icon & Title */}
        <div className="flex items-center space-x-2">
          <VinFastAnimatedLogo size={32} showText={false} />
          <VinFastBrandTextSvg height={24} />
        </div>

        {/* Right: Chuông thông báo tinh tế & Nút đăng xuất tối giản */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsNotificationsOpen(true)}
            title="Hộp thư thông báo"
            className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/70 bg-white/65 text-slate-600 shadow-[0_4px_16px_-10px_rgba(15,23,42,0.45)] backdrop-blur-xl transition-all active:scale-90 hover:text-blue-600"
          >
            <Bell size={15} strokeWidth={2.2} className="text-slate-600" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-[#FF3B30] text-[9px] font-black text-white shadow-xs ring-2 ring-white animate-pulse">
                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
              </span>
            )}
          </button>

          <div className="w-px h-3.5 bg-slate-300/80" />

          <button
            onClick={onLogout}
            title="Đăng xuất"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/70 bg-white/65 text-slate-400 shadow-[0_4px_16px_-10px_rgba(15,23,42,0.45)] backdrop-blur-xl transition-all active:scale-90 hover:text-rose-500"
          >
            <LogOut size={13} strokeWidth={2} />
          </button>
        </div>
      </header>

      {/* 🚀 3. MAIN CONTENT: MÀN HÌNH ỨNG DỤNG IPHONE */}
      <main className="w-full max-w-md mx-auto px-3.5 pt-1 pb-1 flex-1 flex flex-col justify-between z-10 overflow-hidden">
        {/* 🌟 IPHONE SMART WIDGET: CARD CHÀO MỪNG THEO THỜI GIAN THỰC */}
        <VinFastWelcomeBannerSvg
          displayName={displayName}
          formattedName={formattedName}
          roleBadgeLabel={roleBadgeLabel}
          timeGreeting={timeGreeting}
          ordersCount={ordersCount}
          className="flex-shrink-0 mb-3.5"
        />

        {/* 📱 SECTION TITLE: ỨNG DỤNG TÁC NGHIỆP */}
        <div className="flex items-center justify-between px-1.5 mb-1 flex-shrink-0">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-sans">
            Ứng dụng tác nghiệp
          </span>
          <span className="text-[10px] font-medium text-slate-400">
            Chạm để mở
          </span>
        </div>

        {/* 📱 MÀN HÌNH BIỂU TƯỢNG ỨNG DỤNG IPHONE (SPRINGBOARD IPHONE ICONS) */}
        <div className="grid grid-cols-6 auto-rows-fr items-start gap-x-2 px-1 pt-12 pb-0 flex-1 min-h-0 animate-in fade-in duration-200">
          {visibleMenuItems
            .map((item, index) => {
              const IconComponent = item.icon;
              const remainder = visibleMenuItems.length % 3;
              const shouldCenterTwo = remainder === 2 && index === visibleMenuItems.length - 2;
              const shouldCenterOne = remainder === 1 && index === visibleMenuItems.length - 1;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if ('onClick' in item && item.onClick) {
                      item.onClick();
                    } else {
                      onSelectTab(item.id as MobileTabId);
                    }
                  }}
                  className={`group col-span-2 flex flex-col items-center p-1 text-center transition-transform duration-150 active:scale-90 focus:outline-none ${
                    shouldCenterTwo ? 'col-start-2' : shouldCenterOne ? 'col-start-3' : ''
                  }`}
                >
                  {/* iOS App Squircle */}
                  <div className="relative">
                    <div
                      className={`relative flex h-[58px] w-[58px] items-center justify-center overflow-hidden rounded-[15px] border border-white/45 bg-gradient-to-br ${item.iosGradient} text-white`}
                      style={{
                        boxShadow: `0 9px 20px -11px ${item.shadowColor}, inset 0 1px 0 rgba(255,255,255,0.42), inset 0 -1px 0 rgba(15,23,42,0.1)`,
                      }}
                    >
                      <span className="pointer-events-none absolute inset-x-1 top-0 h-[46%] rounded-t-[13px] bg-gradient-to-b from-white/18 to-transparent" />
                      <span className="pointer-events-none absolute -bottom-5 -right-4 h-10 w-10 rounded-full bg-slate-950/15 blur-lg" />
                      <IconComponent
                        size={25}
                        strokeWidth={1.9}
                        className="relative z-10 drop-shadow-[0_1px_2px_rgba(15,23,42,0.28)]"
                      />
                    </div>

                    {/* iOS Red Notification Badge */}
                    {item.rawCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#FF3B30] px-1 font-sans text-[9px] font-bold tracking-tight text-white shadow-[0_2px_6px_rgba(255,59,48,0.2)] ring-2 ring-white">
                        {item.rawCount > 99 ? '99+' : item.rawCount}
                      </span>
                    )}
                  </div>

                  {/* App Title */}
                  <span className="text-[11.5px] font-semibold text-[#1C1C1E] tracking-tight mt-1.5 leading-tight truncate w-full px-0.5">
                    {item.title}
                  </span>
                  {/* App Subtitle / Badge */}
                  <span className="text-[9.5px] text-[#8E8E93] tracking-tight line-clamp-1 w-full mt-0.5">
                    {item.badge || item.subtitle}
                  </span>
                </button>
              );
            })}
        </div>

      </main>

      {isProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs"
            onClick={() => setIsProfileOpen(false)}
          />
          <div className={`relative z-10 flex w-full max-w-md flex-col overflow-hidden rounded-t-[28px] border-t border-white/80 bg-white shadow-[0_-14px_40px_rgba(15,23,42,0.16)] ${profileView === 'password' ? 'h-[min(82dvh,560px)]' : ''}`}>
            <div className="flex justify-center pb-1 pt-2.5">
              <div className="h-1 w-10 rounded-full bg-slate-300" />
            </div>

            <div className="relative flex min-h-[50px] items-center justify-between border-b border-slate-100 px-4 pb-3 pt-1.5">
              {profileView === 'password' ? (
                <button
                  type="button"
                  onClick={() => setProfileView('menu')}
                  className="inline-flex h-8 items-center gap-1 rounded-lg pr-2 text-xs font-semibold text-slate-600 active:bg-slate-100"
                >
                  <ChevronLeft size={17} />
                  <span>Back</span>
                </button>
              ) : (
                <div>
                  <h3 className="text-base font-bold tracking-tight text-slate-900">Cá Nhân & Cài Đặt</h3>
                  <p className="text-[10.5px] text-slate-400">Quản lý tài khoản của bạn</p>
                </div>
              )}
              {profileView === 'password' && (
                <span className="absolute left-1/2 -translate-x-1/2 text-[12px] font-bold uppercase tracking-[0.12em] text-slate-800">
                  Đổi mật khẩu
                </span>
              )}
              <button
                type="button"
                onClick={() => setIsProfileOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 active:scale-90"
                aria-label="Đóng"
              >
                <X size={15} />
              </button>
            </div>

            {profileView === 'password' && renderChangePassword ? (
              <div className="min-h-0 flex-1">
                {renderChangePassword(() => setProfileView('menu'))}
              </div>
            ) : (
            <div className="p-4">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3.5">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-rose-400 via-rose-600 to-rose-900 text-sm font-bold text-white shadow-[0_8px_18px_-8px_rgba(225,29,72,0.45)]">
                  {(formattedName || 'U')
                    .split(' ')
                    .slice(-2)
                    .map((part: string) => part.charAt(0))
                    .join('')
                    .toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold text-slate-900">{formattedName}</p>
                  <p className="mt-0.5 truncate text-[10.5px] text-slate-500">{roleBadgeLabel}</p>
                </div>
                <span className="rounded-lg bg-white px-2 py-1 text-[9.5px] font-semibold text-slate-500 shadow-2xs ring-1 ring-slate-200/70">
                  Đang hoạt động
                </span>
              </div>

              <div className="mt-3 space-y-1.5">
                <button
                  type="button"
                  onClick={() => {
                    if (renderChangePassword) setProfileView('password');
                  }}
                  className="flex h-11 w-full items-center gap-3 rounded-xl bg-slate-100 px-3 text-left text-[12px] font-medium text-slate-700 active:bg-slate-200"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-blue-600 shadow-2xs">
                    <KeyRound size={14} />
                  </span>
                  <span className="flex-1">Đổi mật khẩu</span>
                  <span className="text-slate-300">›</span>
                </button>

                <button
                  type="button"
                  onClick={onLogout}
                  className="flex h-11 w-full items-center gap-3 rounded-xl bg-rose-50 px-3 text-left text-[12px] font-medium text-rose-700 active:bg-rose-100"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-rose-500 shadow-2xs">
                    <LogOut size={14} />
                  </span>
                  <span className="flex-1">Đăng xuất</span>
                </button>
              </div>
            </div>
            )}
          </div>
        </div>
      )}

      {/* 🔔 MOBILE NOTIFICATION DRAWER / SHEET */}
      {isNotificationsOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsNotificationsOpen(false)}
          />

          {/* iOS Sheet */}
          <div className="relative z-10 w-full max-w-md mx-auto bg-white rounded-t-[28px] shadow-[0_-10px_40px_rgba(0,0,0,0.15)] border-t border-slate-200/90 flex flex-col max-h-[82dvh] animate-in slide-in-from-bottom duration-300 overflow-hidden">
            {/* Grab handle */}
            <div className="pt-2.5 pb-1 flex justify-center">
              <div className="w-10 h-1 rounded-full bg-slate-300" />
            </div>

            {/* Header */}
            <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Bell size={15} strokeWidth={2.2} />
                </div>
                <h3 className="text-sm font-bold text-slate-800">Thông Báo</h3>
                {unreadNotificationsCount > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                    {unreadNotificationsCount} mới
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {unreadNotificationsCount > 0 && onMarkAllAsRead && (
                  <button
                    onClick={(e) => onMarkAllAsRead(e)}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center space-x-1 px-2 py-1 rounded-lg hover:bg-blue-50 active:scale-95 transition-all"
                  >
                    <CheckCheck size={13} />
                    <span>Đã đọc tất cả</span>
                  </button>
                )}
                <button
                  onClick={() => setIsNotificationsOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center active:scale-90 transition-all"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Notification List */}
            <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-2">
              {notifications.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-2.5">
                    <Bell size={22} strokeWidth={1.6} />
                  </div>
                  <p className="text-xs font-semibold text-slate-600">Chưa có thông báo nào</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Bạn đã cập nhật mọi biến động mới nhất</p>
                </div>
              ) : (
                notifications.map((item, idx) => {
                  const isUnread = !item.isRead;
                  const refined = getRefinedNotification(item);
                  return (
                    <div
                      key={item.id || idx}
                      onClick={(e) => {
                        onNotificationClick?.(item, e);
                        setIsNotificationsOpen(false);
                      }}
                      className={`p-3.5 rounded-2xl transition-all cursor-pointer border active:scale-[0.98] ${
                        isUnread
                          ? 'bg-blue-50/60 border-blue-100 shadow-[0_2px_8px_rgba(37,99,235,0.06)]'
                          : 'bg-white hover:bg-slate-50/80 border-slate-100 shadow-2xs'
                      }`}
                    >
                      {/* Top row: Category Badge + Title + Relative Time */}
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center space-x-1.5 min-w-0">
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold tracking-wide ${refined.categoryBadge.bg} ${refined.categoryBadge.text}`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${refined.categoryBadge.dot} ${
                                isUnread ? 'animate-pulse' : ''
                              }`}
                            />
                            {refined.categoryBadge.label}
                          </span>
                          <h4
                            className={`text-[11.5px] font-bold truncate ${
                              isUnread ? 'text-slate-900' : 'text-slate-700'
                            }`}
                          >
                            {refined.title}
                          </h4>
                        </div>
                        <span className="text-[9.5px] font-medium text-slate-400 flex-shrink-0">
                          {formatRelativeTime(item.timestamp || item.created_at)}
                        </span>
                      </div>

                      {/* Message Body */}
                      <p
                        className={`text-[11.5px] leading-relaxed ${
                          isUnread ? 'text-slate-800 font-medium' : 'text-slate-500'
                        }`}
                      >
                        {refined.message}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
