import { supabase, supabaseAdmin } from '../supabaseClient';
import { getStorageItem, logAction, ApiResult, getApi, ADMIN_USER } from './baseService';
import { parseUserAgent } from '../../utils/deviceParser';

let cachedGeoLocation: any = null;
let isGpsWatcherStarted = false;

export const startAutoGpsTracking = (): void => {
    if (isGpsWatcherStarted || typeof navigator === 'undefined' || !navigator.geolocation) return;
    isGpsWatcherStarted = true;

    try {
        navigator.geolocation.watchPosition(
            async (pos) => {
                if (pos?.coords?.latitude && pos?.coords?.longitude) {
                    const lat = pos.coords.latitude;
                    const lng = pos.coords.longitude;

                    if (!cachedGeoLocation || cachedGeoLocation.source !== 'gps' || Math.abs(cachedGeoLocation.lat - lat) > 0.001) {
                        try {
                            const nomRes = await fetch(
                                `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=vi`,
                                { headers: { 'Accept': 'application/json' } }
                            );
                            if (nomRes.ok) {
                                const nomData = await nomRes.json();
                                const addr = nomData.address || {};
                                const city = addr.city || addr.town || addr.county || addr.state_district || 'Hồ Chí Minh';
                                const region = addr.suburb || addr.neighbourhood || addr.state || 'Bình Dương';
                                const displayName = [addr.suburb || addr.neighbourhood, addr.city || addr.town || addr.county, addr.state]
                                    .filter(Boolean)
                                    .join(', ');

                                cachedGeoLocation = {
                                    ip: 'GPS Trực tiếp',
                                    city: city,
                                    region: region,
                                    displayName: displayName || nomData.display_name || 'Vị trí GPS',
                                    country: addr.country || 'Việt Nam',
                                    countryCode: (addr.country_code || 'VN').toUpperCase(),
                                    lat: lat,
                                    lng: lng,
                                    isp: 'GPS Thiết bị (Độ chính xác cao)',
                                    source: 'gps'
                                };
                                sessionStorage.setItem('client_geo_location_v2', JSON.stringify(cachedGeoLocation));
                                recordUserPresence();
                            }
                        } catch (e) {
                            // Silently ignore geocoding failure
                        }
                    }
                }
            },
            () => {},
            { enableHighAccuracy: true, maximumAge: 60000, timeout: 10000 }
        );
    } catch (e) {}
};

const getBrowserGpsCoordinates = (): Promise<{ lat: number; lng: number } | null> => {
    startAutoGpsTracking();
    return new Promise((resolve) => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
            return resolve(null);
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                resolve({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude
                });
            },
            () => resolve(null),
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 180000 }
        );
    });
};

const fetchClientGeoLocation = async (): Promise<any> => {
    if (cachedGeoLocation) return cachedGeoLocation;
    try {
        const stored = sessionStorage.getItem('client_geo_location_v2');
        if (stored) {
            cachedGeoLocation = JSON.parse(stored);
            return cachedGeoLocation;
        }
    } catch (e) {}

    // 1. Try High Accuracy GPS from Browser
    const gps = await getBrowserGpsCoordinates();
    if (gps && gps.lat && gps.lng) {
        try {
            const nomRes = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${gps.lat}&lon=${gps.lng}&format=json&accept-language=vi`,
                { headers: { 'Accept': 'application/json' } }
            );
            if (nomRes.ok) {
                const nomData = await nomRes.json();
                const addr = nomData.address || {};
                const city = addr.city || addr.town || addr.county || addr.state_district || 'Hồ Chí Minh';
                const region = addr.suburb || addr.neighbourhood || addr.state || 'Bình Dương';
                const displayName = [addr.suburb || addr.neighbourhood, addr.city || addr.town || addr.county, addr.state]
                    .filter(Boolean)
                    .join(', ');

                cachedGeoLocation = {
                    ip: 'GPS Trực tiếp',
                    city: city,
                    region: region,
                    displayName: displayName || nomData.display_name || 'Vị trí GPS',
                    country: addr.country || 'Việt Nam',
                    countryCode: (addr.country_code || 'VN').toUpperCase(),
                    lat: gps.lat,
                    lng: gps.lng,
                    isp: 'GPS Thiết bị (Độ chính xác cao)',
                    source: 'gps'
                };
                try {
                    sessionStorage.setItem('client_geo_location_v2', JSON.stringify(cachedGeoLocation));
                } catch (e) {}
                return cachedGeoLocation;
            }
        } catch (err) {
            // Silently fallback
        }
    }

    // 2. Fallback to IP Geolocation via CORS-friendly ipwho.is
    try {
        const res = await fetch('https://ipwho.is/');
        if (res.ok) {
            const data = await res.json();
            if (data && data.success !== false) {
                cachedGeoLocation = {
                    ip: data.ip || '',
                    city: data.city || 'Hồ Chí Minh',
                    region: data.region || 'Bình Dương',
                    displayName: `${data.city || 'Hồ Chí Minh'}, ${data.region || 'Bình Dương'}`,
                    country: data.country || 'Việt Nam',
                    countryCode: data.country_code || 'VN',
                    lat: typeof data.latitude === 'number' ? data.latitude : 10.925,
                    lng: typeof data.longitude === 'number' ? data.longitude : 106.699,
                    isp: data.connection?.isp || 'Trạm mạng ISP',
                    source: 'ip'
                };
                try {
                    sessionStorage.setItem('client_geo_location_v2', JSON.stringify(cachedGeoLocation));
                } catch (e) {}
                return cachedGeoLocation;
            }
        }
    } catch (err) {}

    // 3. Default fallback (Thuận An, Bình Dương)
    cachedGeoLocation = {
        ip: '',
        city: 'Thuận An',
        region: 'Bình Dương',
        displayName: 'Thuận An, Bình Dương',
        country: 'Việt Nam',
        countryCode: 'VN',
        lat: 10.925,
        lng: 106.699,
        isp: 'Mặc định',
        source: 'default'
    };
    try {
        sessionStorage.setItem('client_geo_location_v2', JSON.stringify(cachedGeoLocation));
    } catch (e) {}
    return cachedGeoLocation;
};

export const getActiveUsers = async (): Promise<ApiResult> => {
    try {
        // Fetch users active in the last 2 hours
        const twoHoursAgo = new Date(Date.now() - 120 * 60000).toISOString();
        const { data, error } = await supabase
            .from('user_presence')
            .select('*')
            .gt('last_active_at', twoHoursAgo)
            .order('last_active_at', { ascending: false });

        if (error) throw error;
        return { status: 'SUCCESS', message: 'Fetched active users from Supabase', data: data || [] };
    } catch (err: any) {
        console.warn('[getActiveUsers] Error:', err);
        return { status: 'SUCCESS', message: 'Fallback active users', data: [] };
    }
};

export const recordUserPresence = async (): Promise<void> => {
    try {
        const username = getStorageItem("currentUser") || ADMIN_USER;
        const fullName = getStorageItem("currentConsultant") || "User";
        if (!username) return;

        const [deviceInfo, geo] = await Promise.all([
            Promise.resolve(parseUserAgent()),
            fetchClientGeoLocation()
        ]);

        const metadata = {
            device: {
                browser: `${deviceInfo.browserName} ${deviceInfo.browserVersion}`.trim(),
                browserIcon: deviceInfo.browserIcon,
                os: `${deviceInfo.osName} ${deviceInfo.osVersion}`.trim(),
                osIcon: deviceInfo.osIcon,
                deviceModel: deviceInfo.deviceModel,
                deviceType: deviceInfo.deviceType,
                deviceIcon: deviceInfo.deviceIcon,
                screen: deviceInfo.screenResolution
            },
            location: {
                ip: geo.ip,
                city: geo.city,
                region: geo.region,
                country: geo.country,
                countryCode: geo.countryCode,
                lat: geo.lat,
                lng: geo.lng,
                isp: geo.isp
            }
        };

        await supabase.from('user_presence').upsert({
            username: username,
            full_name: fullName,
            last_active_at: new Date().toISOString(),
            status: 'online',
            metadata: metadata
        }, { onConflict: 'username' });
    } catch (error) {}
};

export const getUsers = async (): Promise<ApiResult> => {
    try {
        let { data, error } = await supabase.from('users').select('username, full_name, role, manager_id, email, is_blocked, block_reason');
        if (error || !data || data.length === 0) {
            const res = await supabaseAdmin.from('users').select('username, full_name, role, manager_id, email, is_blocked, block_reason');
            if (res.data) data = res.data;
        }
        return { 
            status: 'SUCCESS', message: 'Fetched users from Supabase',
            users: (data || []).map(u => ({ username: u.username, name: u.full_name, role: u.role, manager_id: u.manager_id, email: u.email, is_blocked: u.is_blocked, block_reason: u.block_reason })) 
        };
    } catch (error: any) {
        console.warn('[getUsers] Error fetching users:', error);
        return { status: 'SUCCESS', message: 'Fallback users list', users: [] };
    }
};

export const toggleUserBlock = async (username: string, isBlocked: boolean, reason?: string): Promise<ApiResult> => {
    try {
        const adminUser = getStorageItem("currentConsultant") || "Admin";
        const { error } = await supabaseAdmin.from('users').update({
            is_blocked: isBlocked, block_reason: isBlocked ? reason : null, 
            blocked_at: isBlocked ? new Date().toISOString() : null,
            blocked_by: isBlocked ? adminUser : null
        }).eq('username', username);
        if (error) throw error;
        await logAction(isBlocked ? 'BLOCK_USER' : 'UNBLOCK_USER', { username, reason }, username, 'admin');
        return { status: 'SUCCESS', message: isBlocked ? `Đã khóa tài khoản ${username}` : `Đã mở khóa tài khoản ${username}` };
    } catch (error: any) {
        return { status: 'ERROR', message: error.message };
    }
};

export const getTeamData = async (): Promise<ApiResult> => {
    try {
        let { data, error } = await supabase.from('users').select('username, full_name, manager_id');
        if (error || !data || data.length === 0) {
            const res = await supabaseAdmin.from('users').select('username, full_name, manager_id');
            if (res.data) data = res.data;
        }
        const teamData: Record<string, string[]> = {};
        const usernameToFullName: Record<string, string> = {};
        (data || []).forEach(u => usernameToFullName[u.username] = u.full_name || u.username);
        (data || []).forEach(user => {
            if (user.manager_id) {
                const leaderName = usernameToFullName[user.manager_id] || user.manager_id;
                if (!teamData[leaderName]) teamData[leaderName] = [];
                teamData[leaderName].push(user.full_name || user.username);
            }
        });
        return { status: 'SUCCESS', message: `Teams processed`, teamData };
    } catch (error: any) {
        console.warn('[getTeamData] Error fetching team data:', error);
        return { status: 'SUCCESS', message: 'Fallback team data', teamData: {} };
    }
};

export const getAuditLogs = async (limit: number = 100): Promise<ApiResult> => {
    try {
        const { data, error } = await supabase.from('interactions').select('*').eq('category', 'LOG').order('created_at', { ascending: false }).limit(limit);
        if (error) throw error;
        const mappedLogs = (data || []).map(log => ({ id: log.id, timestamp: log.created_at, user_email: log.actor_id, user_full_name: log.actor_name, action: log.type, details: log.metadata, target_id: log.target_id, target_type: log.target_view }));
        return { status: 'SUCCESS', message: 'Fetched logs from interactions', data: mappedLogs };
    } catch (err: any) {
        return { status: 'ERROR', message: err.message };
    }
};

export const getLogData = async (): Promise<ApiResult> => {
    return getApi({ action: 'getLogData' });
};
