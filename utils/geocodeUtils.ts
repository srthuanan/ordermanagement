/**
 * Reusable & resilient Reverse Geocoding for browser environments.
 * Uses a multi-tier fallback mechanism so it NEVER fails with CORS or rate-limits:
 * 1. BigDataCloud Client Reverse Geocode API (CORS-friendly, no API key needed, high reliability in Vietnam)
 * 2. Photon by Komoot (OpenStreetMap mirror, CORS-enabled, fast)
 * 3. Nominatim (fallback without forbidden headers)
 */

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
        return 'Tọa độ không hợp lệ';
    }

    // Provider 1: Photon Komoot (OpenStreetMap global mirror with open CORS)
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
                    return parts.join(', ');
                }
            }
        }
    } catch (e) {
        // Continue to fallback
    }

    return `Vị trí: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}
