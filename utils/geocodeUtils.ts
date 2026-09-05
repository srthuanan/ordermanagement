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

    // Provider 1: BigDataCloud Reverse Geocoding (designed for web clients, zero CORS block, rich Vietnamese naming)
    try {
        const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=vi`;
        const res = await fetch(bdcUrl);
        if (res.ok) {
            const data = await res.json();
            const parts: string[] = [];

            // Check detailed administrative components (ward, district, province)
            if (data.localityInfo?.administrative) {
                const adminList = data.localityInfo.administrative;
                // Find street or neighborhood if present
                const ward = adminList.find((a: any) => a.order >= 5 && a.name);
                if (ward && ward.name) parts.push(ward.name);
            }

            if (data.locality && !parts.includes(data.locality)) parts.push(data.locality);
            if (data.city && !parts.includes(data.city)) parts.push(data.city);
            if (data.principalSubdivision && !parts.includes(data.principalSubdivision)) parts.push(data.principalSubdivision);

            if (parts.length > 0) {
                return parts.join(', ');
            }
        }
    } catch (e) {
        // Continue to fallback
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
                    return parts.join(', ');
                }
            }
        }
    } catch (e) {
        // Continue to fallback
    }

    // Provider 3: Nominatim (without illegal User-Agent header)
    try {
        const nomUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=vi`;
        const res = await fetch(nomUrl);
        if (res.ok) {
            const data = await res.json();
            if (data.display_name) {
                return data.display_name;
            }
        }
    } catch (e) {
        // Fallback to coordinates
    }

    return `Vị trí: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}
