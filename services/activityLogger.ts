import { supabase } from './supabaseClient';
import { parseUserAgent } from '../utils/deviceParser';

export interface StaffActivityLogEntry {
  id?: number;
  username: string;
  full_name?: string;
  user_email?: string;
  action_type: 
    | 'ENTER_STOCK' 
    | 'VIEW_CAR' 
    | 'HOLD_CAR' 
    | 'UNHOLD_CAR' 
    | 'JOIN_QUEUE' 
    | 'LEAVE_QUEUE' 
    | 'REQUEST_INVOICE' 
    | 'STOCK_GPS_REVOKED';
  action_title: string;
  action_details?: Record<string, any>;
  target_vin?: string;
  latitude?: number;
  longitude?: number;
  accuracy_meters?: number;
  formatted_address?: string;
  google_maps_url?: string;
  device_info?: Record<string, any>;
  ip_address?: string;
  created_at?: string;
}

/**
 * Tra cứu địa chỉ tiếng Việt chi tiết cấp số nhà / tên đường / phường / quận từ tọa độ GPS
 */
export const fetchDetailedAddress = async (lat: number, lng: number): Promise<{
  formattedAddress: string;
  city: string;
  district: string;
  road: string;
  googleMapsUrl: string;
}> => {
  const googleMapsUrl = `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;

  // 1. Thử qua OpenStreetMap Nominatim Tiếng Việt (chính xác đến từng số nhà và ngõ ngách)
  try {
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=vi&addressdetails=1`;
    const res = await fetch(nominatimUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'VinFastOrderManagement/2.4 (Showroom Thuan An)'
      }
    });

    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};

      const houseNumber = addr.house_number || '';
      const road = addr.road || addr.street || '';
      const suburb = addr.suburb || addr.quarter || addr.neighbourhood || addr.village || '';
      const district = addr.city_district || addr.district || addr.county || '';
      const city = addr.city || addr.state || 'Bình Dương';

      const parts = [
        houseNumber ? `Số ${houseNumber}` : '',
        road,
        suburb,
        district,
        city
      ].filter(Boolean);

      const formatted = parts.length > 0 ? parts.join(', ') : (data.display_name || `Tọa độ: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);

      return {
        formattedAddress: formatted,
        city: city || 'Bình Dương',
        district: district || '',
        road: road || '',
        googleMapsUrl
      };
    }
  } catch (_) {
    // Tiếp tục fallback nếu Nominatim chậm hoặc chặn
  }

  // 2. Fallback sang Komoot Photon API
  try {
    const photonUrl = `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`;
    const res = await fetch(photonUrl);
    if (res.ok) {
      const data = await res.json();
      const feat = data.features?.[0]?.properties || {};
      const street = [feat.housenumber, feat.street].filter(Boolean).join(' ');
      const city = feat.city || feat.county || feat.state || 'Bình Dương';
      const parts = [street, feat.district, city].filter(Boolean);
      return {
        formattedAddress: parts.length > 0 ? parts.join(', ') : `Tọa độ: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        city,
        district: feat.district || '',
        road: feat.street || '',
        googleMapsUrl
      };
    }
  } catch (_) {}

  return {
    formattedAddress: `Tọa độ: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
    city: 'Bình Dương',
    district: '',
    road: '',
    googleMapsUrl
  };
};

// Bộ nhớ đệm chống ghi nhận trùng lặp nhiều lần (Deduplication)
const recentLogsCache = new Map<string, number>();

/**
 * Ghi nhận một hành động của TVBH kèm vị trí GPS và thông tin thiết bị vào Supabase
 */
export const logStaffActivity = async (params: {
  actionType: StaffActivityLogEntry['action_type'];
  actionTitle: string;
  targetVin?: string;
  actionDetails?: Record<string, any>;
  lat?: number;
  lng?: number;
  accuracy?: number;
}): Promise<void> => {
  try {
    const username = (localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser') || 'anonymous').toLowerCase().trim();
    const fullName = localStorage.getItem('currentConsultant') || sessionStorage.getItem('currentConsultant') || username;
    const userEmail = (localStorage.getItem('userEmail') || sessionStorage.getItem('userEmail') || '').toLowerCase().trim();

    // Chống ghi trùng lặp (Deduplication): Ngăn các sự kiện lỗi hoặc click liên tiếp ghi nhiều dòng giống nhau
    const dedupeKey = `${username}_${params.actionType}_${params.targetVin || ''}`;
    const now = Date.now();
    const minIntervalMs = params.actionType === 'STOCK_GPS_REVOKED' ? 60000 : 8000;
    const lastLoggedAt = recentLogsCache.get(dedupeKey) || 0;
    if (now - lastLoggedAt < minIntervalMs) {
      return;
    }
    recentLogsCache.set(dedupeKey, now);

    // Lấy tọa độ từ tham số hoặc từ bộ nhớ đệm phiên hiện tại
    let lat = params.lat;
    let lng = params.lng;
    let accuracy = params.accuracy;

    if (!lat || !lng) {
      const cachedGps = sessionStorage.getItem('om_latest_gps');
      if (cachedGps) {
        try {
          const parsed = JSON.parse(cachedGps);
          lat = parsed.lat;
          lng = parsed.lng;
          accuracy = parsed.accuracy;
        } catch (_) {}
      }
    }

    let formattedAddress = '';
    let googleMapsUrl = '';
    if (lat && lng) {
      // Lưu lại tọa độ tươi nhất vào session
      sessionStorage.setItem('om_latest_gps', JSON.stringify({ lat, lng, accuracy }));
      const geo = await fetchDetailedAddress(lat, lng);
      formattedAddress = geo.formattedAddress;
      googleMapsUrl = geo.googleMapsUrl;
    }

    const device = parseUserAgent();

    // 1. Ghi vào bảng chuyên biệt staff_activity_logs
    await supabase.from('staff_activity_logs').insert({
      username,
      full_name: fullName,
      user_email: userEmail,
      action_type: params.actionType,
      action_title: params.actionTitle,
      action_details: params.actionDetails || {},
      target_vin: params.targetVin || null,
      latitude: lat || null,
      longitude: lng || null,
      accuracy_meters: accuracy || null,
      formatted_address: formattedAddress || null,
      google_maps_url: googleMapsUrl || null,
      device_info: {
        model: device.deviceModel,
        type: device.deviceType,
        os: device.osName,
        browser: device.browserName,
        screen: device.screenResolution
      }
    });

    // 2. Đồng thời cập nhật user_presence nếu có vị trí mới để bản đồ thời gian thực của Admin cập nhật ngay lập tức
    if (lat && lng) {
      try {
        const { data: presenceData } = await supabase
          .from('user_presence')
          .select('metadata')
          .eq('username', username)
          .maybeSingle();

        const currentMeta = (presenceData && presenceData.metadata && typeof presenceData.metadata === 'object')
          ? presenceData.metadata
          : {};

        await supabase.from('user_presence').upsert({
          username,
          full_name: fullName,
          last_active_at: new Date().toISOString(),
          status: 'online',
          metadata: {
            ...currentMeta,
            location: {
              ip: 'GPS Trực tiếp',
              city: formattedAddress || 'Bình Dương',
              region: 'Định vị GPS chính xác',
              displayName: formattedAddress,
              country: 'Việt Nam',
              countryCode: 'VN',
              lat,
              lng,
              accuracy,
              source: 'gps',
              verifiedAt: new Date().toISOString()
            }
          }
        }, { onConflict: 'username' });
      } catch (_) {}
    }

  } catch (err) {
    console.warn('[StaffActivityLogger] Lỗi ghi nhận hoạt động:', err);
  }
};

/**
 * Lấy danh sách lịch sử thao tác & vị trí dành cho Admin
 */
export const getStaffActivityLogs = async (options: {
  username?: string;
  actionType?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<{ data: StaffActivityLogEntry[]; total: number }> => {
  try {
    let query = supabase
      .from('staff_activity_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (options.username && options.username !== 'all') {
      query = query.eq('username', options.username.toLowerCase().trim());
    }

    if (options.actionType && options.actionType !== 'all') {
      query = query.eq('action_type', options.actionType);
    }

    const limit = options.limit || 50;
    const offset = options.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) throw error;

    return {
      data: (data || []) as StaffActivityLogEntry[],
      total: count || 0
    };
  } catch (err) {
    console.error('[StaffActivityLogger] Lỗi truy vấn logs:', err);
    return { data: [], total: 0 };
  }
};
