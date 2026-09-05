import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { getActiveUsers, recordUserPresence } from '../../services/apiService';
import Avatar from '../ui/Avatar';
import moment from 'moment';

interface LiveUser {
  username: string;
  full_name?: string;
  last_active_at: string;
  status: string;
  metadata?: {
    device?: {
      browser: string;
      browserIcon?: string;
      os: string;
      osIcon?: string;
      deviceModel: string;
      deviceType: 'Desktop' | 'Mobile' | 'Tablet';
      deviceIcon?: string;
      screen?: string;
    };
    location?: {
      ip: string;
      city: string;
      region: string;
      displayName?: string;
      country: string;
      countryCode: string;
      lat: number;
      lng: number;
      isp: string;
      source?: 'gps' | 'ip' | 'default';
    };
  };
}

interface LiveUserMonitorViewProps {
  showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
  isActive?: boolean;
}

export const LiveUserMonitorView: React.FC<LiveUserMonitorViewProps> = ({ showToast, isActive = true }) => {
  const [users, setUsers] = useState<LiveUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUpdatingGps, setIsUpdatingGps] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deviceFilter, setDeviceFilter] = useState<'all' | 'Desktop' | 'Mobile'>('all');
  const [selectedUser, setSelectedUser] = useState<LiveUser | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});

  const fetchUsers = useCallback(async (silent: boolean = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const res = await getActiveUsers();
      if (res.status === 'SUCCESS' && Array.isArray(res.data)) {
        setUsers(res.data);
      }
    } catch (e) {
      if (!silent) showToast('Lỗi', 'Không thể tải danh sách người dùng', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchUsers();
    const interval = setInterval(() => fetchUsers(true), 15000);
    return () => clearInterval(interval);
  }, [fetchUsers]);

  // Request high precision GPS and update presence
  const handleRequestExactGps = async () => {
    setIsUpdatingGps(true);
    try {
      sessionStorage.removeItem('client_geo_location_v2');
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async () => {
            await recordUserPresence();
            await fetchUsers(false);
            showToast('Thành công', 'Đã cập nhật vị trí GPS chính xác', 'success');
            setIsUpdatingGps(false);
          },
          (err) => {
            console.warn('GPS error:', err);
            showToast('Thông báo', 'Vui lòng cho phép truy cập vị trí trên trình duyệt để lấy GPS chuẩn', 'info');
            setIsUpdatingGps(false);
          },
          { enableHighAccuracy: true, timeout: 8000 }
        );
      } else {
        await recordUserPresence();
        await fetchUsers(false);
        setIsUpdatingGps(false);
      }
    } catch (e) {
      setIsUpdatingGps(false);
    }
  };

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const nameMatch = (u.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (u.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (u.metadata?.location?.city || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (u.metadata?.location?.region || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (u.metadata?.location?.displayName || '').toLowerCase().includes(searchTerm.toLowerCase());

      const deviceType = u.metadata?.device?.deviceType || 'Desktop';
      const deviceMatch = deviceFilter === 'all' || deviceType === deviceFilter;

      return nameMatch && deviceMatch;
    });
  }, [users, searchTerm, deviceFilter]);

  // Invalidate size helper
  const refreshMapSize = useCallback(() => {
    if (!mapInstance.current) return;
    mapInstance.current.invalidateSize();
  }, []);

  // Initialize or re-invalidate Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    if (!mapInstance.current) {
      const defaultCenter: [number, number] = [10.9250, 106.6992]; // Showroom Thuận An
      const map = L.map(mapContainerRef.current, {
        attributionControl: false,
        zoomControl: true,
        minZoom: 4,
        maxZoom: 18
      }).setView(defaultCenter, 11);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18
      }).addTo(map);

      mapInstance.current = map;
    }

    const t1 = setTimeout(refreshMapSize, 100);
    const t2 = setTimeout(refreshMapSize, 300);
    const t3 = setTimeout(refreshMapSize, 600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [refreshMapSize, isActive]);

  // ResizeObserver on container
  useEffect(() => {
    if (!mapContainerRef.current) return;
    const ro = new ResizeObserver(() => {
      if (mapInstance.current) {
        mapInstance.current.invalidateSize();
      }
    });
    ro.observe(mapContainerRef.current);
    return () => ro.disconnect();
  }, []);

  // Sync Markers on Map
  useEffect(() => {
    if (!mapInstance.current) return;
    const L = (window as any).L;
    if (!L) return;

    // Clear old markers
    Object.values(markersRef.current).forEach((m: any) => m.remove());
    markersRef.current = {};

    const bounds: [number, number][] = [];

    users.forEach(u => {
      const loc = u.metadata?.location;
      const lat = loc?.lat || 10.925;
      const lng = loc?.lng || 106.699;
      const dev = u.metadata?.device;
      const isGps = loc?.source === 'gps';

      const markerHtml = `
        <div style="position: relative; width: 44px; height: 44px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer;">
          <!-- Pulse wave -->
          <div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background: ${isGps ? 'rgba(14, 165, 233, 0.4)' : 'rgba(16, 185, 129, 0.4)'}; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <!-- Avatar container -->
          <div style="position: relative; width: 34px; height: 34px; border-radius: 50%; border: 2.5px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.3); background: ${isGps ? '#0284c7' : '#10b981'}; overflow: hidden; display: flex; align-items: center; justify-content: center; font-weight: bold; color: white; font-size: 13px;">
            ${(u.full_name || u.username || 'U').charAt(0).toUpperCase()}
          </div>
          <!-- Dot status -->
          <div style="position: absolute; bottom: 0; right: 2px; width: 10px; height: 10px; border-radius: 50%; background: ${isGps ? '#38bdf8' : '#10b981'}; border: 2px solid white;"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: '',
        iconSize: [44, 44],
        iconAnchor: [22, 22]
      });

      const popupHtml = `
        <div style="font-family: inherit; padding: 4px; min-width: 220px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <div style="width: 32px; height: 32px; border-radius: 50%; background: ${isGps ? '#0284c7' : '#10b981'}; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 13px;">
              ${(u.full_name || u.username || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <div style="font-weight: 800; font-size: 13px; color: #0f172a;">${u.full_name || u.username}</div>
              <div style="font-size: 11px; color: #64748b; font-family: monospace;">@${u.username}</div>
            </div>
          </div>
          <div style="font-size: 11px; color: #334155; line-height: 1.6; border-top: 1px solid #f1f5f9; padding-top: 6px;">
            <div>📍 <b>Vị trí:</b> ${loc?.displayName || `${loc?.city || 'Hồ Chí Minh'}, ${loc?.region || 'Bình Dương'}`}</div>
            <div>🎯 <b>Nguồn định vị:</b> <span style="color: ${isGps ? '#0284c7' : '#10b981'}; font-weight: bold;">${isGps ? '🎯 GPS Trực tiếp' : '📡 Trạm Mạng (IP)'}</span></div>
            <div>💻 <b>Thiết bị:</b> ${dev?.deviceModel || 'Máy tính'} (${dev?.os || 'Windows'})</div>
            <div>🌐 <b>Trình duyệt:</b> ${dev?.browser || 'Chrome'}</div>
            <div>⚡ <b>Nhà mạng:</b> ${loc?.isp || 'Internet'}</div>
            <div>⏱️ <b>Hoạt động:</b> ${moment(u.last_active_at).fromNow()}</div>
          </div>
        </div>
      `;

      const marker = L.marker([lat, lng], { icon: customIcon })
        .addTo(mapInstance.current)
        .bindPopup(popupHtml);

      markersRef.current[u.username] = marker;
      bounds.push([lat, lng]);
    });

    if (bounds.length > 0) {
      try {
        mapInstance.current.fitBounds(L.latLngBounds(bounds), { padding: [50, 50], maxZoom: 13 });
      } catch (e) {}
    }
  }, [users]);

  const handleFlyToUser = (u: LiveUser) => {
    setSelectedUser(u);
    const loc = u.metadata?.location;
    const lat = loc?.lat || 10.925;
    const lng = loc?.lng || 106.699;

    if (mapInstance.current) {
      mapInstance.current.flyTo([lat, lng], 14, { animate: true, duration: 1.2 });
      const marker = markersRef.current[u.username];
      if (marker) {
        setTimeout(() => marker.openPopup(), 1200);
      }
    }
  };

  // Stats calculation
  const stats = useMemo(() => {
    let desktop = 0;
    let mobile = 0;
    const cities: Record<string, number> = {};

    users.forEach(u => {
      const type = u.metadata?.device?.deviceType;
      if (type === 'Mobile' || type === 'Tablet') mobile++;
      else desktop++;

      const city = u.metadata?.location?.city || u.metadata?.location?.region || 'Hồ Chí Minh';
      cities[city] = (cities[city] || 0) + 1;
    });

    const topCity = Object.entries(cities).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Bình Dương';

    return {
      total: users.length,
      desktop,
      mobile,
      topCity
    };
  }, [users]);

  return (
    <div className="flex-1 flex flex-col h-full w-full bg-slate-100 overflow-hidden select-none animate-fade-in min-h-[500px]">
      {/* Top Banner Stats Bar */}
      <div className="flex-shrink-0 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 shadow-2xs flex flex-wrap items-center justify-between gap-3 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
            <i className="fa-solid fa-users-viewfinder text-base"></i>
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-800 tracking-tight flex items-center gap-2">
              <span>GIÁM SÁT TRUY CẬP & VỊ TRÍ LIVE</span>
              <span className="bg-emerald-100 text-emerald-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-300/60 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                {stats.total} Đang trực tuyến
              </span>
            </h1>
            <p className="text-[11px] font-semibold text-slate-500">Theo dõi thời gian thực thiết bị, trình duyệt và địa điểm của nhân viên</p>
          </div>
        </div>

        {/* Action Buttons & Quick KPI Badges */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-50 border border-slate-200/70 rounded-xl px-3 py-1.5 text-center">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Máy tính (PC)</span>
            <span className="text-xs font-black text-slate-800 flex items-center justify-center gap-1">
              <i className="fa-solid fa-desktop text-sky-500 text-[10px]"></i> {stats.desktop}
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200/70 rounded-xl px-3 py-1.5 text-center">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Điện thoại</span>
            <span className="text-xs font-black text-slate-800 flex items-center justify-center gap-1">
              <i className="fa-solid fa-mobile-screen text-indigo-500 text-[10px]"></i> {stats.mobile}
            </span>
          </div>

          <button
            onClick={handleRequestExactGps}
            disabled={isUpdatingGps}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-3 py-2 rounded-xl shadow-sm transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
            title="Kích hoạt GPS định vị chính xác vị trí của tôi"
          >
            <i className={`fa-solid ${isUpdatingGps ? 'fa-circle-notch fa-spin' : 'fa-location-crosshairs'}`}></i>
            <span className="hidden sm:inline">LẤY GPS CỦA TÔI</span>
          </button>

          <button
            onClick={() => fetchUsers(false)}
            disabled={isRefreshing}
            className="bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs px-3 py-2 rounded-xl shadow-sm transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
            title="Làm mới dữ liệu"
          >
            <i className={`fa-solid fa-rotate ${isRefreshing ? 'fa-spin' : ''}`}></i>
            <span className="hidden sm:inline">LÀM MỚI</span>
          </button>
        </div>
      </div>

      {/* Main Content Layout: Map + User List Panel */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 relative w-full h-full">
        {/* Live Map Area */}
        <div className="flex-1 h-[300px] lg:h-full relative min-h-[300px] bg-slate-200">
          <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0" />
          
          {/* Map Floating Legend */}
          <div className="absolute bottom-4 left-4 z-[400] bg-white/90 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-200/80 shadow-md text-[10px] text-slate-600 flex items-center gap-3">
            <span className="flex items-center gap-1 font-bold text-sky-700">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block"></span>
              🎯 GPS Trực tiếp
            </span>
            <span className="text-slate-300">|</span>
            <span className="flex items-center gap-1 font-bold text-emerald-700">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
              📡 Trạm Mạng (IP)
            </span>
          </div>
        </div>

        {/* User Sidebar List Panel */}
        <div className="w-full lg:w-[420px] lg:min-w-[420px] h-[350px] lg:h-full bg-white border-t lg:border-t-0 lg:border-l border-slate-200/80 flex flex-col z-10 shadow-sm">
          {/* Search & Filter Header */}
          <div className="p-3.5 bg-slate-50/70 border-b border-slate-200/80 space-y-2.5 flex-shrink-0">
            <div className="relative">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
              <input
                type="text"
                placeholder="Tìm nhân viên, khu vực..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all placeholder:text-slate-400 text-slate-800"
              />
            </div>

            <div className="flex items-center gap-1.5">
              {(['all', 'Desktop', 'Mobile'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setDeviceFilter(type)}
                  className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-all ${
                    deviceFilter === type
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {type === 'all' ? 'Tất cả' : type === 'Desktop' ? '💻 Máy tính' : '📱 Mobile'}
                </button>
              ))}
            </div>
          </div>

          {/* User List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 hidden-scrollbar">
            {isLoading ? (
              <div className="py-12 text-center text-slate-400">
                <i className="fa-solid fa-circle-notch fa-spin text-2xl mb-2 text-sky-500 block"></i>
                <span className="text-xs font-bold">Đang tải danh sách người dùng...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <i className="fa-solid fa-user-slash text-2xl mb-2 text-slate-300 block"></i>
                <span className="text-xs font-bold">Không tìm thấy người dùng phù hợp</span>
              </div>
            ) : (
              filteredUsers.map(u => {
                const loc = u.metadata?.location;
                const dev = u.metadata?.device;
                const isGps = loc?.source === 'gps';
                const isSelected = selectedUser?.username === u.username;

                return (
                  <div
                    key={u.username}
                    onClick={() => handleFlyToUser(u)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer group ${
                      isSelected
                        ? 'bg-sky-50/80 border-sky-400 shadow-md ring-2 ring-sky-400/20'
                        : 'bg-white hover:bg-slate-50 border-slate-200/70 hover:border-sky-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar with Online Dot */}
                      <div className="relative flex-shrink-0">
                        <Avatar name={u.username} size="md" />
                      </div>

                      {/* User & Info Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-extrabold text-xs text-slate-900 truncate leading-tight group-hover:text-sky-600 transition-colors">
                            {u.full_name || u.username}
                          </h3>
                          <span className="text-[9px] font-bold text-slate-400">
                            {moment(u.last_active_at).fromNow()}
                          </span>
                        </div>

                        <p className="text-[10.5px] font-mono text-slate-400 truncate mb-1.5">
                          @{u.username}
                        </p>

                        {/* Badges: Location & Device */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`inline-flex items-center gap-1 border text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            isGps ? 'bg-sky-50 border-sky-200 text-sky-700' : 'bg-emerald-50 border-emerald-200/70 text-emerald-700'
                          }`}>
                            <i className="fa-solid fa-location-dot text-[9px]"></i>
                            {loc?.displayName || `${loc?.city || 'Hồ Chí Minh'}, ${loc?.region || 'Bình Dương'}`}
                          </span>

                          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-slate-200/60">
                            <i className={`fa-solid ${dev?.deviceIcon || 'fa-desktop'} text-[9px] text-slate-500`}></i>
                            {dev?.deviceModel || 'PC'} • {dev?.os || 'Windows'}
                          </span>

                          <span className="inline-flex items-center gap-1 bg-slate-50 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-slate-200/60">
                            <i className="fa-solid fa-globe text-[9px] text-sky-500"></i>
                            {dev?.browser || 'Chrome'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveUserMonitorView;
