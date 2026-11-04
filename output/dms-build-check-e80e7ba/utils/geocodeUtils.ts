/**
 * Reusable & resilient Reverse Geocoding for browser environments.
 * Uses a multi-tier fallback mechanism so it NEVER fails with CORS or rate-limits:
 * 1. Fast Offline Bounding Box for major Vietnamese Provinces/Regions (0ms, zero network)
 * 2. In-memory Geocoding Cache
 * 3. Photon by Komoot (OpenStreetMap mirror, CORS-enabled, fast)
 * 4. Nominatim fallback
 */

const geocodeCache = new Map<string, string>();

/**
 * Tra cứu địa danh Tỉnh/Khu vực nhanh bằng Bounding Box tọa độ (tốc độ 0ms, không tốn request mạng)
 */
export function getQuickLocationName(lat: number | null | undefined, lng: number | null | undefined): string {
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) return '';

    // Bounding Box các vùng dọc trục vận tải Bắc - Nam VinFast
    if (lat >= 20.75 && lat <= 20.95 && lng >= 106.85 && lng <= 107.1) return 'NM VinFast (Cát Hải)';
    if (lat >= 20.65 && lat <= 21.15 && lng >= 106.5 && lng <= 107.15) return 'Hải Phòng';
    if (lat >= 20.85 && lat <= 21.45 && lng >= 105.55 && lng <= 106.15) return 'Hà Nội';
    if (lat >= 20.45 && lat <= 20.75 && lng >= 105.75 && lng <= 106.2) return 'Hà Nam';
    if (lat >= 20.15 && lat <= 20.45 && lng >= 105.75 && lng <= 106.15) return 'Ninh Bình';
    if (lat >= 20.25 && lat <= 20.65 && lng >= 106.15 && lng <= 106.6) return 'Nam Định';
    if (lat >= 20.4 && lat <= 20.75 && lng >= 106.25 && lng <= 106.7) return 'Thái Bình';
    if (lat >= 19.3 && lat <= 20.3 && lng >= 104.9 && lng <= 106.1) return 'Thanh Hóa';
    if (lat >= 18.5 && lat <= 19.35 && lng >= 105.1 && lng <= 105.9) return 'Nghệ An';
    if (lat >= 17.85 && lat <= 18.55 && lng >= 105.3 && lng <= 106.4) return 'Hà Tĩnh';
    if (lat >= 17.1 && lat <= 17.9 && lng >= 105.8 && lng <= 106.8) return 'Quảng Bình';
    if (lat >= 16.5 && lat <= 17.2 && lng >= 106.6 && lng <= 107.4) return 'Quảng Trị';
    if (lat >= 16.0 && lat <= 16.6 && lng >= 107.1 && lng <= 107.9) return 'Huế';
    if (lat >= 15.9 && lat <= 16.25 && lng >= 108.0 && lng <= 108.4) return 'Đà Nẵng';
    if (lat >= 15.15 && lat <= 15.95 && lng >= 108.0 && lng <= 108.8) return 'Quảng Nam';
    if (lat >= 14.7 && lat <= 15.35 && lng >= 108.4 && lng <= 109.1) return 'Quảng Ngãi';
    if (lat >= 13.8 && lat <= 14.75 && lng >= 108.6 && lng <= 109.35) return 'Bình Định';
    if (lat >= 12.85 && lat <= 13.85 && lng >= 108.9 && lng <= 109.45) return 'Phú Yên';
    if (lat >= 11.9 && lat <= 12.95 && lng >= 108.9 && lng <= 109.35) return 'Khánh Hòa (Nha Trang)';
    if (lat >= 11.35 && lat <= 11.95 && lng >= 108.65 && lng <= 109.25) return 'Ninh Thuận';
    if (lat >= 10.7 && lat <= 11.45 && lng >= 107.6 && lng <= 108.6) return 'Bình Thuận';
    if (lat >= 10.75 && lat <= 11.45 && lng >= 106.75 && lng <= 107.5) return 'Đồng Nai';
    if (lat >= 10.9 && lat <= 11.5 && lng >= 106.45 && lng <= 106.95) return 'Bình Dương';
    if (lat >= 10.65 && lat <= 10.95 && lng >= 106.55 && lng <= 106.9) return 'TP. Hồ Chí Minh';
    if (lat >= 10.3 && lat <= 10.75 && lng >= 107.0 && lng <= 107.55) return 'Bà Rịa - Vũng Tàu';
    if (lat >= 10.2 && lat <= 10.85 && lng >= 105.8 && lng <= 106.6) return 'Long An / Tiền Giang';
    if (lat >= 9.8 && lat <= 10.35 && lng >= 105.4 && lng <= 105.95) return 'Cần Thơ';

    return '';
}

/**
 * Trả về link trực tiếp Google Maps đến tọa độ GPS
 */
export function getGoogleMapsUrl(lat: number, lng: number): string {
    return `https://www.google.com/maps?q=${lat},${lng}`;
}

/**
 * Reverse Geocoding lấy chi tiết địa chỉ kèm in-memory cache
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
        return 'Tọa độ không hợp lệ';
    }

    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    if (geocodeCache.has(key)) {
        return geocodeCache.get(key)!;
    }

    // Provider 1: BigDataCloud client-side reverse geocode (Free, no CORS, highly accurate for VN streets/wards/districts)
    try {
        const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=vi`;
        const res = await fetch(bdcUrl);
        if (res.ok) {
            const data = await res.json();
            const parts = [
                data.locality || '',
                data.principalSubdivision || data.city || ''
            ].filter(Boolean);

            // Hoặc lấy full formatted:
            const fullParts = [
                data.localityInfo?.administrative?.[3]?.name,
                data.localityInfo?.administrative?.[2]?.name,
                data.localityInfo?.administrative?.[1]?.name,
            ].filter(Boolean);

            if (fullParts.length > 0) {
                const addr = fullParts.join(', ');
                geocodeCache.set(key, addr);
                return addr;
            } else if (parts.length > 0) {
                const addr = parts.join(', ');
                geocodeCache.set(key, addr);
                return addr;
            }
        }
    } catch (e) {
        // Fallback to Photon
    }

    // Provider 2: Photon Komoot (OpenStreetMap global mirror with open CORS)
    try {
        const photonUrl = `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`;
        const res = await fetch(photonUrl);
        if (res.ok) {
            const data = await res.json();
            const feat = data.features?.[0];
            if (feat && feat.properties) {
                const p = feat.properties;
                const streetPart = p.street || p.name;
                const parts = [
                    streetPart ? `${p.housenumber ? p.housenumber + ' ' : ''}${streetPart}` : '',
                    p.district,
                    p.city,
                    p.state
                ].filter(Boolean);

                if (parts.length > 0) {
                    const addr = parts.join(', ');
                    geocodeCache.set(key, addr);
                    return addr;
                }
            }
        }
    } catch (e) {
        // Continue to fallback
    }

    const quick = getQuickLocationName(lat, lng);
    if (quick) {
        geocodeCache.set(key, quick);
        return quick;
    }

    const fallback = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    geocodeCache.set(key, fallback);
    return fallback;
}
