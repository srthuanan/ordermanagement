/**
 * Device & Browser Parser Utility for Admin Security Dashboard
 * Pure TypeScript, zero external dependencies, lightweight & instant
 */

export interface ParsedDeviceInfo {
  browserName: string;
  browserVersion: string;
  browserIcon: string;
  osName: string;
  osVersion: string;
  osIcon: string;
  deviceType: 'Desktop' | 'Mobile' | 'Tablet';
  deviceModel: string;
  deviceIcon: string;
  isTouch: boolean;
  screenResolution: string;
  userAgentRaw: string;
}

export const parseUserAgent = (uaString?: string): ParsedDeviceInfo => {
  const ua = uaString || (typeof navigator !== 'undefined' ? navigator.userAgent : '');
  
  // 1. Browser Detection
  let browserName = 'Trình duyệt Web';
  let browserVersion = '';
  let browserIcon = 'fa-globe';

  if (ua.includes('CocCoc') || ua.includes('coc_coc')) {
    browserName = 'Cốc Cốc';
    browserIcon = 'fa-brands fa-chrome text-emerald-500';
    browserVersion = ua.match(/(?:CocCoc|coc_coc)_([0-9.]+)/i)?.[1] || '';
  } else if (ua.includes('Edg/')) {
    browserName = 'Microsoft Edge';
    browserIcon = 'fa-brands fa-edge text-sky-500';
    browserVersion = ua.match(/Edg\/([0-9.]+)/)?.[1] || '';
  } else if (ua.includes('Chrome/') && !ua.includes('Edg/')) {
    browserName = 'Google Chrome';
    browserIcon = 'fa-brands fa-chrome text-amber-500';
    browserVersion = ua.match(/Chrome\/([0-9.]+)/)?.[1] || '';
  } else if (ua.includes('Safari/') && !ua.includes('Chrome/')) {
    browserName = 'Apple Safari';
    browserIcon = 'fa-brands fa-safari text-blue-500';
    browserVersion = ua.match(/Version\/([0-9.]+)/)?.[1] || '';
  } else if (ua.includes('Firefox/')) {
    browserName = 'Mozilla Firefox';
    browserIcon = 'fa-brands fa-firefox text-orange-500';
    browserVersion = ua.match(/Firefox\/([0-9.]+)/)?.[1] || '';
  } else if (ua.includes('Opera') || ua.includes('OPR/')) {
    browserName = 'Opera';
    browserIcon = 'fa-brands fa-opera text-red-500';
    browserVersion = ua.match(/(?:Opera|OPR)\/([0-9.]+)/)?.[1] || '';
  }

  // 2. OS Detection
  let osName = 'Hệ điều hành khác';
  let osVersion = '';
  let osIcon = 'fa-laptop';

  if (ua.includes('Windows NT 10.0')) {
    osName = 'Windows';
    osVersion = '10 / 11';
    osIcon = 'fa-brands fa-windows text-sky-600';
  } else if (ua.includes('Windows NT 6.3') || ua.includes('Windows NT 6.2')) {
    osName = 'Windows';
    osVersion = '8 / 8.1';
    osIcon = 'fa-brands fa-windows text-sky-600';
  } else if (ua.includes('Windows NT 6.1')) {
    osName = 'Windows';
    osVersion = '7';
    osIcon = 'fa-brands fa-windows text-sky-600';
  } else if (ua.includes('iPhone')) {
    osName = 'iOS (iPhone)';
    osIcon = 'fa-brands fa-apple text-slate-800';
    const match = ua.match(/OS (\d+[_\d]*)/);
    osVersion = match ? match[1].replace(/_/g, '.') : '';
  } else if (ua.includes('iPad')) {
    osName = 'iPadOS (iPad)';
    osIcon = 'fa-brands fa-apple text-slate-800';
    const match = ua.match(/OS (\d+[_\d]*)/);
    osVersion = match ? match[1].replace(/_/g, '.') : '';
  } else if (ua.includes('Mac OS X')) {
    osName = 'macOS';
    osIcon = 'fa-brands fa-apple text-slate-800';
    const match = ua.match(/Mac OS X (\d+[_\d]*)/);
    osVersion = match ? match[1].replace(/_/g, '.') : '';
  } else if (ua.includes('Android')) {
    osName = 'Android';
    osIcon = 'fa-brands fa-android text-emerald-600';
    osVersion = ua.match(/Android\s+([0-9.]+)/)?.[1] || '';
  } else if (ua.includes('Linux')) {
    osName = 'Linux';
    osIcon = 'fa-brands fa-linux text-slate-700';
  }

  // 3. Device Type Detection
  let deviceType: 'Desktop' | 'Mobile' | 'Tablet' = 'Desktop';
  let deviceIcon = 'fa-desktop';
  let deviceModel = 'Máy tính cá nhân (PC/Laptop)';

  const isMobile = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isTablet = /iPad|Tablet|PlayBook|Silk/i.test(ua) || (ua.includes('Android') && !ua.includes('Mobile'));

  if (isTablet) {
    deviceType = 'Tablet';
    deviceIcon = 'fa-tablet-screen-button';
    deviceModel = ua.includes('iPad') ? 'Apple iPad' : 'Máy tính bảng Android';
  } else if (isMobile) {
    deviceType = 'Mobile';
    deviceIcon = 'fa-mobile-screen-button';
    if (ua.includes('iPhone')) deviceModel = 'Apple iPhone';
    else if (ua.includes('Samsung') || ua.includes('SM-')) deviceModel = 'Samsung Galaxy';
    else if (ua.includes('Xiaomi') || ua.includes('Redmi')) deviceModel = 'Xiaomi / Redmi';
    else if (ua.includes('Oppo')) deviceModel = 'Oppo';
    else deviceModel = 'Điện thoại thông minh';
  }

  const isTouch = typeof window !== 'undefined' ? ('ontouchstart' in window || navigator.maxTouchPoints > 0) : false;
  const screenResolution = typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : '1920x1080';

  return {
    browserName,
    browserVersion: browserVersion.split('.').slice(0, 2).join('.'),
    browserIcon,
    osName,
    osVersion,
    osIcon,
    deviceType,
    deviceModel,
    deviceIcon,
    isTouch,
    screenResolution,
    userAgentRaw: ua
  };
};
