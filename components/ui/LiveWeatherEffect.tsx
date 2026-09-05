import React, { useEffect, useState, useRef } from 'react';

export type WeatherType = 'SUNNY' | 'RAIN' | 'THUNDERSTORM' | 'CLOUDY' | 'NIGHT';
export type WeatherIntensity = 'LIGHT' | 'MODERATE' | 'HEAVY';

interface WeatherData {
    type: WeatherType;
    intensity: WeatherIntensity;
    temp: number;
    description: string;
    isDay: boolean;
    locationName: string;
    lastUpdated: string;
}

interface LiveWeatherEffectProps {
    className?: string;
}

interface RainSplash {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    alpha: number;
    life: number;
    maxLife: number;
}

interface GroundRipple {
    x: number;
    y: number;
    r: number;
    maxR: number;
    alpha: number;
}

interface LightningBolt {
    segments: { x1: number; y1: number; x2: number; y2: number; isBranch?: boolean }[];
    alpha: number;
}

const CACHE_KEY = 'live_weather_cache_v2';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes real-time synchronization

const cleanLocationName = (name: string): string => {
    if (!name) return '';
    return name
        .replace(/Thành phố Hồ Chí Minh|Thành phố HCM/gi, 'TP.HCM')
        .replace(/Thành phố Hà Nội/gi, 'Hà Nội')
        .replace(/Thành phố Đà Nẵng/gi, 'Đà Nẵng')
        .replace(/Thành phố Cần Thơ/gi, 'Cần Thơ')
        .replace(/Thành phố Hải Phòng/gi, 'Hải Phòng')
        .replace(/Thành phố /gi, 'TP. ')
        .replace(/Tỉnh /gi, '')
        .replace(/Phường /gi, 'P. ')
        .replace(/Quận /gi, 'Q. ')
        .replace(/Huyện /gi, 'H. ')
        .replace(/Thị xã /gi, 'TX. ')
        .trim();
};

export const LiveWeatherEffect: React.FC<LiveWeatherEffectProps> = ({ className = '' }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const formatNow = () => new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Initial estimation based on local clock or fast cache
    const getInitialWeather = (): WeatherData => {
        const initialHour = new Date().getHours();
        const initialIsDay = initialHour >= 6 && initialHour < 18;
        const defaultState: WeatherData = {
            type: initialIsDay ? 'SUNNY' : 'NIGHT',
            intensity: 'MODERATE',
            temp: 32,
            description: initialIsDay ? 'Trời nắng' : 'Đêm thanh bình',
            isDay: initialIsDay,
            locationName: 'Đang định vị...',
            lastUpdated: formatNow()
        };
        try {
            const raw = localStorage.getItem(CACHE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed.data) {
                    return {
                        ...parsed.data,
                        locationName: cleanLocationName(parsed.data.locationName)
                    };
                }
            }
        } catch (e) {}
        return defaultState;
    };

    const [weather, setWeatherData] = useState<WeatherData>(getInitialWeather);

    const refreshRef = useRef<() => void>(() => {});
    
    useEffect(() => {
        let isMounted = true;
        let lastLat = 10.925;
        let lastLon = 106.705;
        let lastLocName = 'Thuận An';

        try {
            const raw = localStorage.getItem(CACHE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed.lat && parsed.lon) {
                    lastLat = parsed.lat;
                    lastLon = parsed.lon;
                    if (parsed.data?.locationName) {
                        lastLocName = cleanLocationName(parsed.data.locationName);
                    }
                }
            }
        } catch (e) {}

        const saveToCache = (data: WeatherData, lat: number, lon: number) => {
            try {
                localStorage.setItem(CACHE_KEY, JSON.stringify({
                    data,
                    lat,
                    lon,
                    timestamp: Date.now()
                }));
            } catch (e) {}
        };

        const loadFromCache = (lat: number, lon: number): WeatherData | null => {
            try {
                const raw = localStorage.getItem(CACHE_KEY);
                if (!raw) return null;
                const parsed = JSON.parse(raw);
                const isFresh = Date.now() - parsed.timestamp < CACHE_TTL_MS;
                const isSameLocation = Math.abs(parsed.lat - lat) < 0.005 && Math.abs(parsed.lon - lon) < 0.005;
                if (isFresh && isSameLocation && parsed.data) {
                    return parsed.data;
                }
            } catch (e) {}
            return null;
        };

        const fetchLiveWeather = async (lat = lastLat, lon = lastLon, locName = lastLocName, force = false) => {
            lastLat = lat;
            lastLon = lon;
            lastLocName = locName;

            // Don't waste API calls if browser tab is hidden/minimized
            if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
                return;
            }

            // Check if we already have fresh cached weather within 2m TTL (0 API calls unless forced)
            if (!force) {
                const cached = loadFromCache(lat, lon);
                if (cached) {
                    if (isMounted) {
                        setWeatherData(cached);
                    }
                    return;
                }
            }

            // 1. TIER 1 (PRIMARY): WeatherAPI.com (1,000,000 requests/month, ultra-fast, no 429 errors)
            try {
                const weatherApiRes = await fetch(
                    `https://api.weatherapi.com/v1/current.json?key=f87886fd3e824007b5231913262108&q=${lat},${lon}&lang=vi`
                );
                
                if (weatherApiRes.ok) {
                    const data = await weatherApiRes.json();
                    if (data?.current && isMounted) {
                        const current = data.current;
                        const code = Number(current.condition?.code ?? 1000);
                        const isDay = current.is_day === 1;
                        const temp = Math.round(current.temp_c ?? 30);
                        const precip = Number(current.precip_mm ?? 0);
                        const cloud = Number(current.cloud ?? 30);
                        const apiLocationName = locName !== 'Thuận An' && locName !== 'Đang định vị...' 
                            ? locName 
                            : (data.location?.name ? (data.location.name === 'Binh Nham' ? 'Thuận An' : data.location.name) : locName);
                        let description = current.condition?.text?.trim() || (isDay ? 'Trời nắng' : 'Đêm thanh bình');

                        let type: WeatherType = isDay ? 'SUNNY' : 'NIGHT';
                        let intensity: WeatherIntensity = 'MODERATE';

                        // Thunderstorm codes (1087, 1273, 1276, 1279, 1282)
                        if ([1087, 1273, 1276, 1279, 1282].includes(code)) {
                            type = 'THUNDERSTORM';
                            intensity = 'HEAVY';
                            description = description || 'Mưa dông sét';
                        }
                        // Actual Rain codes (Heavy/Moderate Rain)
                        else if ([1186, 1189, 1192, 1195, 1240, 1243, 1246].includes(code) || precip >= 0.5) {
                            type = 'RAIN';
                            if ([1192, 1195, 1243, 1246].includes(code) || precip > 2.5) {
                                intensity = 'HEAVY';
                                description = description || 'Mưa to';
                            } else {
                                intensity = 'MODERATE';
                                description = description || 'Mưa rào';
                            }
                        }
                        // Light rain / Drizzle (1150, 1153, 1180, 1183) or significant precip
                        else if ([1150, 1153, 1180, 1183].includes(code) || (precip > 0.1 && precip < 0.5)) {
                            type = 'RAIN';
                            intensity = 'LIGHT';
                            description = description || 'Mưa phùn nhẹ';
                        }
                        // Patchy rain nearby (1063) - if rainfall is negligible (<0.1mm), display as partly cloudy with sunshine
                        else if (code === 1063) {
                            if (precip >= 0.1) {
                                type = 'RAIN';
                                intensity = 'LIGHT';
                                description = 'Mưa rào nhẹ rải rác';
                            } else {
                                type = isDay ? (cloud > 70 ? 'CLOUDY' : 'SUNNY') : 'NIGHT';
                                intensity = 'LIGHT';
                                description = isDay ? (cloud > 70 ? 'Nhiều mây, mưa rải rác' : 'Nắng có mây, khả năng mưa nhẹ') : 'Đêm có mây';
                            }
                        }
                        // Overcast / Cloudy (1006, 1009, 1030, 1135, 1147)
                        else if ([1006, 1009, 1030, 1135, 1147].includes(code) || cloud > 75) {
                            type = isDay ? 'CLOUDY' : 'NIGHT';
                            intensity = 'MODERATE';
                            description = description || (isDay ? 'Nhiều mây' : 'Đêm nhiều mây');
                        }
                        // Partly Cloudy (1003)
                        else if (code === 1003 || (cloud >= 25 && cloud <= 75)) {
                            type = isDay ? 'SUNNY' : 'NIGHT';
                            intensity = isDay ? (cloud > 50 ? 'LIGHT' : 'MODERATE') : 'LIGHT';
                            description = description || (isDay ? 'Nắng nhẹ có mây' : 'Trời quang mây');
                        }
                        // Clear / Sunny (1000)
                        else {
                            type = isDay ? 'SUNNY' : 'NIGHT';
                            intensity = isDay ? (temp >= 33 ? 'HEAVY' : 'MODERATE') : 'MODERATE';
                            description = description || (isDay ? (temp >= 33 ? 'Nắng gắt' : 'Nắng đẹp') : 'Trời trong');
                        }

                        const resultData: WeatherData = {
                            type,
                            intensity,
                            temp,
                            description,
                            isDay,
                            locationName: apiLocationName,
                            lastUpdated: formatNow()
                        };

                        setWeatherData(resultData);
                        saveToCache(resultData, lat, lon);
                        return;
                    }
                }
            } catch (e) {
                console.warn('WeatherAPI error, trying wttr.in & Open-Meteo fallback:', e);
            }

            // 2. TIER 2 (HIGH PRECISION VIETNAMESE): wttr.in (WorldWeatherOnline Engine)
            try {
                const wttrRes = await fetch(
                    `https://wttr.in/${lat},${lon}?format=j1&lang=vi`,
                    { signal: AbortSignal.timeout(3000) }
                );
                if (wttrRes.ok) {
                    const wttrData = await wttrRes.json();
                    const current = wttrData?.current_condition?.[0];
                    if (current && isMounted) {
                        const temp = Number(current.temp_C ?? 32);
                        const desc = current.lang_vi?.[0]?.value?.trim() || current.weatherDesc?.[0]?.value?.trim() || 'Trời nắng';
                        const cloud = Number(current.cloudcover ?? 30);
                        const precip = Number(current.precipMM ?? 0);
                        const code = Number(current.weatherCode ?? 113);
                        const hour = new Date().getHours();
                        const isDay = hour >= 6 && hour < 18;

                        let type: WeatherType = isDay ? 'SUNNY' : 'NIGHT';
                        let intensity: WeatherIntensity = 'MODERATE';

                        if (code >= 386 || desc.toLowerCase().includes('dông') || desc.toLowerCase().includes('sét')) {
                            type = 'THUNDERSTORM';
                            intensity = 'HEAVY';
                        } else if (precip >= 0.5 || desc.toLowerCase().includes('mưa rào') || desc.toLowerCase().includes('mưa to')) {
                            type = 'RAIN';
                            intensity = precip > 2.5 ? 'HEAVY' : 'MODERATE';
                        } else if (precip > 0.1 || desc.toLowerCase().includes('mưa')) {
                            type = 'RAIN';
                            intensity = 'LIGHT';
                        } else if (cloud > 75 || desc.toLowerCase().includes('âm u') || desc.toLowerCase().includes('nhiều mây')) {
                            type = isDay ? 'CLOUDY' : 'NIGHT';
                            intensity = 'MODERATE';
                        } else {
                            type = isDay ? 'SUNNY' : 'NIGHT';
                            intensity = isDay ? (temp >= 33 ? 'HEAVY' : 'MODERATE') : 'MODERATE';
                        }

                        const resultData: WeatherData = {
                            type,
                            intensity,
                            temp,
                            description: desc,
                            isDay,
                            locationName: locName,
                            lastUpdated: formatNow()
                        };

                        setWeatherData(resultData);
                        saveToCache(resultData, lat, lon);
                        return;
                    }
                }
            } catch (e) {}

            // 3. TIER 3: Open-Meteo (Free Unlimited Backup)
            try {
                const openMeteoRes = await fetch(
                    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,is_day,weather_code,precipitation,rain,showers,cloud_cover&minutely_15=precipitation,weather_code&timezone=auto`
                );
                const omData = await openMeteoRes.json();
                const current = omData?.current;

                if (current && isMounted) {
                    let code = Number(current.weather_code ?? 0);
                    let isDay = current.is_day === 1;
                    let temp = Math.round(current.temperature_2m ?? 30);
                    let precip = Number(current.precipitation ?? 0) + Number(current.rain ?? 0) + Number(current.showers ?? 0);
                    let cloud = Number(current.cloud_cover ?? 30);

                    let type: WeatherType = isDay ? 'SUNNY' : 'NIGHT';
                    let intensity: WeatherIntensity = 'MODERATE';
                    let description = isDay ? 'Trời nắng' : 'Đêm thanh bình';

                    if ([95, 96, 99].includes(code)) {
                        type = 'THUNDERSTORM';
                        intensity = 'HEAVY';
                        description = 'Mưa dông sét';
                    } else if ([53, 55, 61, 63, 65, 80, 81, 82].includes(code) || precip >= 0.5) {
                        type = 'RAIN';
                        if ([65, 82].includes(code) || precip > 2.5) {
                            intensity = 'HEAVY';
                            description = 'Mưa to';
                        } else {
                            intensity = 'MODERATE';
                            description = 'Mưa rào';
                        }
                    } else if (code === 51 || (precip > 0.1 && precip < 0.5)) {
                        if (precip >= 0.1) {
                            type = 'RAIN';
                            intensity = 'LIGHT';
                            description = 'Mưa phùn nhẹ';
                        } else {
                            type = isDay ? (cloud > 70 ? 'CLOUDY' : 'SUNNY') : 'NIGHT';
                            intensity = 'LIGHT';
                            description = isDay ? 'Nắng có mây' : 'Trời quang mây';
                        }
                    } else if ([3, 45, 48].includes(code) || cloud > 75) {
                        type = isDay ? 'CLOUDY' : 'NIGHT';
                        intensity = 'MODERATE';
                        description = isDay ? 'Nhiều mây' : 'Đêm nhiều mây';
                    } else if (code === 2 || (cloud >= 25 && cloud <= 75)) {
                        type = isDay ? 'SUNNY' : 'NIGHT';
                        intensity = isDay ? (cloud > 50 ? 'LIGHT' : 'MODERATE') : 'LIGHT';
                        description = isDay ? 'Nắng nhẹ có mây' : 'Trời quang mây';
                    } else {
                        type = isDay ? 'SUNNY' : 'NIGHT';
                        intensity = isDay ? (temp >= 33 ? 'HEAVY' : 'MODERATE') : 'MODERATE';
                        description = isDay ? (temp >= 33 ? 'Nắng gắt' : 'Nắng đẹp') : 'Trời trong';
                    }

                    const resultData: WeatherData = {
                        type,
                        intensity,
                        temp,
                        description,
                        isDay,
                        locationName: locName,
                        lastUpdated: formatNow()
                    };

                    setWeatherData(resultData);
                    saveToCache(resultData, lat, lon);
                }
            } catch (e) {
                console.warn('Live weather fetch error:', e);
            }
        };

        const detectLocationAndFetch = async (force = false) => {
            // 1. Tự động fetch ngay tức thì trong 0.1s với tọa độ mặc định / cached
            fetchLiveWeather(lastLat, lastLon, lastLocName, force);

            // 2. Chạy ngầm định vị GPS để cập nhật vị trí chính xác hơn nếu có
            if (typeof navigator !== 'undefined' && navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    async (pos) => {
                        const lat = pos.coords.latitude;
                        const lon = pos.coords.longitude;
                        let locName = lastLocName;

                        try {
                            const geoRes = await fetch(
                                `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=vi`,
                                { signal: AbortSignal.timeout(2000) }
                            );
                            if (geoRes.ok) {
                                const geo = await geoRes.json();
                                const loc = cleanLocationName(geo.locality || '');
                                const city = cleanLocationName(geo.city || geo.principalSubdivision || '');
                                if (loc && city && loc !== city) {
                                    locName = `${loc}, ${city}`;
                                } else {
                                    locName = loc || city || lastLocName;
                                }
                            }
                        } catch (e) {}

                        if (isMounted) {
                            await fetchLiveWeather(lat, lon, locName, true);
                        }
                    },
                    async (_err) => {
                        // Dự phòng qua IP nếu không có GPS
                        try {
                            const ipRes = await fetch('https://ipwho.is/', { signal: AbortSignal.timeout(2000) });
                            if (ipRes.ok) {
                                const ipData = await ipRes.json();
                                if (ipData && ipData.success && ipData.latitude && ipData.longitude && isMounted) {
                                    const cityName = cleanLocationName(ipData.city || ipData.region || 'Thuận An');
                                    await fetchLiveWeather(ipData.latitude, ipData.longitude, cityName, force);
                                }
                            }
                        } catch (e) {}
                    },
                    { enableHighAccuracy: false, timeout: 3000, maximumAge: 60000 }
                );
            }
        };

        refreshRef.current = () => {
            detectLocationAndFetch(true);
        };

        // Tự động kích hoạt ngay khi mở web
        detectLocationAndFetch();

        // Tự động cập nhật ngầm định kỳ mỗi 5 phút (300 giây)
        const interval = setInterval(() => {
            detectLocationAndFetch(false);
        }, 5 * 60 * 1000);

        const handleVisibilityAndFocus = () => {
            if (document.visibilityState === 'visible') {
                detectLocationAndFetch(false);
            }
        };
        window.addEventListener('focus', handleVisibilityAndFocus);
        document.addEventListener('visibilitychange', handleVisibilityAndFocus);

        return () => {
            isMounted = false;
            clearInterval(interval);
            window.removeEventListener('focus', handleVisibilityAndFocus);
            document.removeEventListener('visibilitychange', handleVisibilityAndFocus);
        };
    }, []);

    const activeType = weather.type;
    const activeIntensity = weather.intensity;

    // Cinematic Weather Engine with Multi-Intensity Physics
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let width = (canvas.width = canvas.parentElement?.clientWidth || 500);
        let height = (canvas.height = canvas.parentElement?.clientHeight || 350);
        let time = 0;

        const handleResize = () => {
            if (!canvas.parentElement) return;
            width = canvas.width = canvas.parentElement.clientWidth;
            height = canvas.height = canvas.parentElement.clientHeight;
        };
        window.addEventListener('resize', handleResize);

        // Rain drops pool scaled by Intensity (Light / Moderate / Heavy)
        const rainDrops: {
            x: number;
            y: number;
            l: number;
            xs: number;
            ys: number;
            opacity: number;
            width: number;
        }[] = [];

        let rainCount = 90;
        let rainVelocityScale = 1.0;
        let rainLengthScale = 1.0;

        if (activeType === 'THUNDERSTORM') {
            rainCount = 145;
            rainVelocityScale = 1.35;
            rainLengthScale = 1.3;
        } else if (activeType === 'RAIN') {
            if (activeIntensity === 'LIGHT') {
                rainCount = 45;
                rainVelocityScale = 0.75;
                rainLengthScale = 0.75;
            } else if (activeIntensity === 'HEAVY') {
                rainCount = 140;
                rainVelocityScale = 1.3;
                rainLengthScale = 1.25;
            } else {
                rainCount = 90;
                rainVelocityScale = 1.0;
                rainLengthScale = 1.0;
            }
        }

        for (let i = 0; i < rainCount; i++) {
            const depth = Math.random();
            rainDrops.push({
                x: Math.random() * (width + 150) - 75,
                y: Math.random() * height,
                l: (depth * 20 + 10) * rainLengthScale,
                xs: (-2.0 - depth * 1.3) * rainVelocityScale,
                ys: (13 + depth * 12) * rainVelocityScale,
                opacity: 0.25 + depth * 0.55,
                width: depth * 1.3 + 0.5
            });
        }

        let splashes: RainSplash[] = [];
        let ripples: GroundRipple[] = [];
        let activeLightning: LightningBolt | null = null;
        let flashOpacity = 0;
        let flashCountdown = Math.floor(Math.random() * 120 + 80);

        // Night stars
        const stars: { x: number; y: number; r: number; alpha: number; delta: number }[] = [];
        for (let i = 0; i < 40; i++) {
            stars.push({
                x: Math.random() * width,
                y: Math.random() * (height * 0.65),
                r: Math.random() * 1.2 + 0.3,
                alpha: Math.random(),
                delta: Math.random() * 0.015 + 0.005
            });
        }

        // Atmospheric Volumetric Mist & Wind Particles for CLOUDY / OVERCAST mode
        const mistLayers: { x: number; y: number; rx: number; ry: number; speed: number; alpha: number; phase: number }[] = [];
        for (let i = 0; i < 9; i++) {
            mistLayers.push({
                x: Math.random() * (width + 300) - 150,
                y: Math.random() * (height * 0.70),
                rx: Math.random() * 95 + 75,
                ry: Math.random() * 45 + 30,
                speed: Math.random() * 0.32 + 0.18,
                alpha: Math.random() * 0.16 + 0.08,
                phase: Math.random() * Math.PI * 2
            });
        }

        const windParticles: { x: number; y: number; r: number; speed: number; alpha: number; wobble: number }[] = [];
        for (let i = 0; i < 28; i++) {
            windParticles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                r: Math.random() * 1.6 + 0.8,
                speed: Math.random() * 0.9 + 0.45,
                alpha: Math.random() * 0.45 + 0.2,
                wobble: Math.random() * Math.PI * 2
            });
        }

        const isInsideCar = (x: number, y: number): boolean => {
            const cx = width * 0.56;
            const cy = height * 0.54;
            const rx = width * 0.38;
            const ry = height * 0.24;
            const dx = (x - cx) / rx;
            const dy = (y - cy) / ry;
            return (dx * dx + dy * dy) <= 1.0;
        };

        const generateLightning = (): LightningBolt => {
            const segments: { x1: number; y1: number; x2: number; y2: number; isBranch?: boolean }[] = [];
            let curX = width * (0.2 + Math.random() * 0.6);
            let curY = 0;
            const targetY = height * (0.60 + Math.random() * 0.15);

            while (curY < targetY) {
                const nextX = curX + (Math.random() - 0.48) * 32;
                const nextY = curY + Math.random() * 18 + 10;
                segments.push({ x1: curX, y1: curY, x2: nextX, y2: nextY });

                if (Math.random() < 0.32) {
                    let bX = nextX;
                    let bY = nextY;
                    const bCount = Math.floor(Math.random() * 3 + 2);
                    for (let b = 0; b < bCount; b++) {
                        const bNextX = bX + (Math.random() - 0.45) * 24;
                        const bNextY = bY + Math.random() * 15 + 8;
                        segments.push({ x1: bX, y1: bY, x2: bNextX, y2: bNextY, isBranch: true });
                        bX = bNextX;
                        bY = bNextY;
                    }
                }

                curX = nextX;
                curY = nextY;
            }

            return { segments, alpha: 1.0 };
        };

        // Multi-tier Dynamic Sunbeams Pool (Scaled by Sun Intensity: Light / Moderate / Heavy)
        const sunIntensityMultiplier = activeIntensity === 'HEAVY' ? 1.4 : (activeIntensity === 'LIGHT' ? 0.65 : 1.0);

        const dynamicSunbeams = [
            { baseAngle: 0.52, angleShift: 0.035, speed: 0.45, phase: 0.0, width: 0.018, baseAlpha: 0.28 * sunIntensityMultiplier, pulseSpeed: 0.8 },
            { baseAngle: 0.68, angleShift: 0.045, speed: 0.35, phase: 1.8, width: 0.030, baseAlpha: 0.36 * sunIntensityMultiplier, pulseSpeed: 0.6 },
            { baseAngle: 0.82, angleShift: 0.030, speed: 0.55, phase: 3.2, width: 0.015, baseAlpha: 0.20 * sunIntensityMultiplier, pulseSpeed: 0.9 },
            { baseAngle: 0.96, angleShift: 0.040, speed: 0.40, phase: 4.5, width: 0.026, baseAlpha: 0.32 * sunIntensityMultiplier, pulseSpeed: 0.7 },
            { baseAngle: 1.12, angleShift: 0.035, speed: 0.50, phase: 5.8, width: 0.017, baseAlpha: 0.22 * sunIntensityMultiplier, pulseSpeed: 1.1 },
        ];

        const render = () => {
            time += 0.016;
            ctx.clearRect(0, 0, width, height);

            if (activeType === 'THUNDERSTORM' || activeType === 'RAIN') {
                if (activeType === 'THUNDERSTORM') {
                    flashCountdown--;
                    if (flashCountdown <= 0) {
                        activeLightning = generateLightning();
                        flashOpacity = 0.55;
                        flashCountdown = Math.floor(Math.random() * 220 + 120);
                    }

                    if (flashOpacity > 0.01) {
                        const flashGrad = ctx.createRadialGradient(width * 0.5, height * 0.45, 10, width * 0.5, height * 0.45, width * 0.55);
                        flashGrad.addColorStop(0, `rgba(224, 231, 255, ${flashOpacity * 1.2})`);
                        flashGrad.addColorStop(0.6, `rgba(224, 231, 255, ${flashOpacity * 0.5})`);
                        flashGrad.addColorStop(1, 'rgba(224, 231, 255, 0)');
                        ctx.fillStyle = flashGrad;
                        ctx.beginPath();
                        ctx.arc(width * 0.5, height * 0.45, width * 0.55, 0, Math.PI * 2);
                        ctx.fill();
                        flashOpacity *= 0.82;
                    }

                    if (activeLightning && activeLightning.alpha > 0.02) {
                        ctx.save();
                        ctx.shadowColor = 'rgba(165, 180, 252, 1)';
                        ctx.shadowBlur = 18;

                        for (const seg of activeLightning.segments) {
                            ctx.beginPath();
                            ctx.moveTo(seg.x1, seg.y1);
                            ctx.lineTo(seg.x2, seg.y2);
                            ctx.strokeStyle = seg.isBranch
                                ? `rgba(199, 210, 254, ${activeLightning.alpha * 0.75})`
                                : `rgba(255, 255, 255, ${activeLightning.alpha * 0.95})`;
                            ctx.lineWidth = seg.isBranch ? 1.2 : 2.4;
                            ctx.stroke();
                        }
                        ctx.restore();
                        activeLightning.alpha *= 0.78;
                    }
                }

                const groundY = height * 0.76;

                // 1. Expanding 3D Ground Ripples
                for (let i = ripples.length - 1; i >= 0; i--) {
                    const rp = ripples[i];
                    rp.r += activeIntensity === 'HEAVY' ? 1.2 : 0.9;
                    rp.alpha -= 0.035;

                    if (rp.alpha <= 0 || rp.r >= rp.maxR) {
                        ripples.splice(i, 1);
                        continue;
                    }

                    ctx.beginPath();
                    ctx.ellipse(rp.x, rp.y, rp.r, rp.r * 0.30, 0, 0, Math.PI * 2);
                    ctx.strokeStyle = `rgba(186, 230, 253, ${rp.alpha * 0.85})`;
                    ctx.lineWidth = 1.2;
                    ctx.stroke();
                }

                // 2. Splashes on Car & Floor
                for (let i = splashes.length - 1; i >= 0; i--) {
                    const sp = splashes[i];
                    sp.x += sp.vx;
                    sp.y += sp.vy;
                    sp.vy += 0.32;
                    sp.life++;

                    const progress = sp.life / sp.maxLife;
                    if (progress >= 1) {
                        splashes.splice(i, 1);
                        continue;
                    }

                    const currentAlpha = (1 - progress) * sp.alpha;
                    ctx.beginPath();
                    ctx.arc(sp.x, sp.y, sp.radius * (1 - progress * 0.4), 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(240, 249, 255, ${currentAlpha * 0.95})`;
                    ctx.fill();
                }

                // 3. Falling Rain Threads with High Velocity
                ctx.lineCap = 'round';

                for (let i = 0; i < rainDrops.length; i++) {
                    const d = rainDrops[i];
                    const hitCar = isInsideCar(d.x, d.y);
                    let hasImpact = false;

                    if (hitCar && Math.random() < (activeIntensity === 'HEAVY' ? 0.18 : 0.12)) {
                        hasImpact = true;
                        const count = activeIntensity === 'HEAVY' ? 3 : (Math.random() < 0.5 ? 2 : 3);
                        for (let s = 0; s < count; s++) {
                            splashes.push({
                                x: d.x + (Math.random() * 3 - 1.5),
                                y: d.y + (Math.random() * 2 - 1),
                                vx: (Math.random() - 0.5) * 3.4 - 1.0,
                                vy: -(Math.random() * 2.8 + 1.2),
                                radius: Math.random() * 1.3 + 0.6,
                                alpha: 0.95,
                                life: 0,
                                maxLife: Math.floor(Math.random() * 8 + 7)
                            });
                        }
                        d.y = -30;
                        d.x = Math.random() * (width + 150) - 75;
                    } else if (d.y >= groundY + (Math.random() * 8 - 4)) {
                        hasImpact = true;
                        if (Math.random() < (activeIntensity === 'HEAVY' ? 0.9 : 0.7)) {
                            ripples.push({
                                x: d.x,
                                y: d.y + (Math.random() * 10 - 5),
                                r: 1.8,
                                maxR: Math.random() * 12 + 6,
                                alpha: 0.75
                            });
                        }
                        for (let s = 0; s < (activeIntensity === 'HEAVY' ? 3 : 2); s++) {
                            splashes.push({
                                x: d.x,
                                y: d.y,
                                vx: (Math.random() - 0.5) * 2.8 - 0.8,
                                vy: -(Math.random() * 2.4 + 0.8),
                                radius: Math.random() * 1.2 + 0.5,
                                alpha: 0.75,
                                life: 0,
                                maxLife: Math.floor(Math.random() * 7 + 6)
                            });
                        }
                        d.y = -30;
                        d.x = Math.random() * (width + 150) - 75;
                    }

                    if (!hasImpact) {
                        ctx.beginPath();
                        ctx.moveTo(d.x, d.y);
                        ctx.lineTo(d.x + d.xs, d.y + d.ys);
                        ctx.strokeStyle = `rgba(215, 238, 255, ${Math.min(1, d.opacity * 1.15)})`;
                        ctx.lineWidth = d.width * 1.15;
                        ctx.stroke();

                        d.x += d.xs;
                        d.y += d.ys;

                        if (d.y > height + 35) {
                            d.y = -30;
                            d.x = Math.random() * (width + 150) - 75;
                        }
                    }
                }
            } else if (activeType === 'SUNNY') {
                ctx.save();

                const sunOriginX = -width * 0.03;
                const sunOriginY = -height * 0.03;
                const rayLength = Math.sqrt(width * width + height * height) * 1.35;
                const groundY = height * 0.76;

                // 1. Render Dynamic Moving & Multi-Intensity White Sunbeams
                for (let i = 0; i < dynamicSunbeams.length; i++) {
                    const beam = dynamicSunbeams[i];

                    const currentAngle = beam.baseAngle + Math.sin(time * beam.speed + beam.phase) * beam.angleShift;
                    const intensityNoise = (Math.sin(time * beam.pulseSpeed + beam.phase * 1.5) + Math.cos(time * 0.6 + i)) * 0.5;
                    const currentAlpha = Math.max(0.04, beam.baseAlpha * (0.75 + intensityNoise * 0.45));
                    const currentWidth = beam.width * (0.85 + Math.sin(time * 0.8 + i) * 0.25);

                    const a1 = currentAngle - currentWidth * 0.5;
                    const a2 = currentAngle + currentWidth * 0.5;

                    const x1 = sunOriginX + Math.cos(a1) * rayLength;
                    const y1 = sunOriginY + Math.sin(a1) * rayLength;
                    const x2 = sunOriginX + Math.cos(a2) * rayLength;
                    const y2 = sunOriginY + Math.sin(a2) * rayLength;

                    const grad = ctx.createRadialGradient(sunOriginX, sunOriginY, 10, sunOriginX, sunOriginY, rayLength * 0.85);
                    grad.addColorStop(0, `rgba(255, 255, 255, ${currentAlpha * 1.6})`);
                    grad.addColorStop(0.35, `rgba(255, 255, 255, ${currentAlpha * 0.95})`);
                    grad.addColorStop(0.75, `rgba(255, 255, 255, ${currentAlpha * 0.25})`);
                    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

                    ctx.beginPath();
                    ctx.moveTo(sunOriginX, sunOriginY);
                    ctx.lineTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.closePath();
                    ctx.fillStyle = grad;
                    ctx.fill();

                    // Dynamic Floor Light Pool corresponding to this active ray
                    const hitFloorX = sunOriginX + (groundY - sunOriginY) / Math.tan(currentAngle);
                    if (hitFloorX > -30 && hitFloorX < width + 50) {
                        const spotW = 28 + (i % 3) * 10;
                        const spotGrad = ctx.createRadialGradient(hitFloorX, groundY + 6, 2, hitFloorX, groundY + 6, spotW);
                        spotGrad.addColorStop(0, `rgba(255, 255, 255, ${currentAlpha * 1.5})`);
                        spotGrad.addColorStop(0.4, `rgba(255, 255, 255, ${currentAlpha * 0.75})`);
                        spotGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

                        ctx.beginPath();
                        ctx.ellipse(hitFloorX, groundY + 6, spotW, spotW * 0.26, 0, 0, Math.PI * 2);
                        ctx.fillStyle = spotGrad;
                        ctx.fill();
                    }
                }

                // 2. Optical Pure White Halo at Top-Left Sun Origin
                const sunPulse = 1 + Math.sin(time * 0.8) * 0.05;
                const coronaGrad = ctx.createRadialGradient(sunOriginX + 20, sunOriginY + 20, 2, sunOriginX + 20, sunOriginY + 20, 110 * sunPulse);
                coronaGrad.addColorStop(0, `rgba(255, 255, 255, ${0.45 * sunIntensityMultiplier})`);
                coronaGrad.addColorStop(0.3, `rgba(255, 255, 255, ${0.18 * sunIntensityMultiplier})`);
                coronaGrad.addColorStop(0.8, 'rgba(255, 255, 255, 0.03)');
                coronaGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

                ctx.fillStyle = coronaGrad;
                ctx.beginPath();
                ctx.arc(sunOriginX + 20, sunOriginY + 20, 110 * sunPulse, 0, Math.PI * 2);
                ctx.fill();

                // 4. Randomized Specular Sparkle Glints on Car Glass & Paint Curves
                const drawSparkle = (x: number, y: number, r: number, alpha: number) => {
                    if (alpha <= 0.05) return;
                    ctx.save();
                    ctx.translate(x, y);
                    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                    ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
                    ctx.shadowBlur = 8;
                    ctx.beginPath();
                    ctx.moveTo(0, -r * 2);
                    ctx.quadraticCurveTo(0, 0, r * 2, 0);
                    ctx.quadraticCurveTo(0, 0, 0, r * 2);
                    ctx.quadraticCurveTo(0, 0, -r * 2, 0);
                    ctx.quadraticCurveTo(0, 0, 0, -r * 2);
                    ctx.fill();
                    ctx.restore();
                };

                const glint1 = Math.max(0, Math.sin(time * 1.4) * 0.9 * sunIntensityMultiplier);
                const glint2 = Math.max(0, Math.sin(time * 1.7 + 1.8) * 0.85 * sunIntensityMultiplier);
                const glint3 = Math.max(0, Math.sin(time * 1.3 + 3.2) * 0.75 * sunIntensityMultiplier);
                drawSparkle(width * 0.44, height * 0.35, 2.5, glint1);
                drawSparkle(width * 0.31, height * 0.44, 2.2, glint2);
                drawSparkle(width * 0.22, height * 0.56, 2.0, glint3);

                ctx.restore();
            } else if (activeType === 'NIGHT') {
                for (let i = 0; i < stars.length; i++) {
                    const s = stars[i];
                    s.alpha += s.delta;
                    if (s.alpha > 1 || s.alpha < 0.1) s.delta = -s.delta;
                    ctx.beginPath();
                    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(224, 231, 255, ${s.alpha * 0.75})`;
                    ctx.fill();
                }
            } else if (activeType === 'CLOUDY') {
                ctx.save();

                // 1. Drifting Soft Organic Atmospheric Fog / Cloud Wisps
                for (let i = 0; i < mistLayers.length; i++) {
                    const m = mistLayers[i];
                    m.x += m.speed;
                    if (m.x > width + m.rx + 50) {
                        m.x = -m.rx - 50;
                        m.y = Math.random() * (height * 0.70);
                    }

                    const waveY = m.y + Math.sin(time * 0.7 + m.phase) * 10;
                    const grad = ctx.createRadialGradient(m.x, waveY, 4, m.x, waveY, m.rx);
                    grad.addColorStop(0, `rgba(203, 213, 225, ${m.alpha * 1.6})`);
                    grad.addColorStop(0.5, `rgba(226, 232, 240, ${m.alpha * 0.85})`);
                    grad.addColorStop(1, 'rgba(241, 245, 249, 0)');

                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.ellipse(m.x, waveY, m.rx, m.ry, 0, 0, Math.PI * 2);
                    ctx.fill();
                }

                // 2. Drifting Wind / Air Motes (Hạt gió khí quyển bay ngang)
                for (let i = 0; i < windParticles.length; i++) {
                    const p = windParticles[i];
                    p.x += p.speed;
                    p.y += Math.sin(time * 1.2 + p.wobble) * 0.4;

                    if (p.x > width + 20) {
                        p.x = -20;
                        p.y = Math.random() * height;
                    }

                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(148, 163, 184, ${p.alpha * 0.65})`;
                    ctx.fill();
                }

                ctx.restore();
            }

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
        };
    }, [activeType, activeIntensity]);

    const renderSfSymbol = (type: WeatherType) => {
        switch (type) {
            case 'SUNNY':
                return (
                    <svg className="w-3 h-3 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                        <circle cx="12" cy="12" r="4" />
                        <path strokeLinecap="round" d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41m14.14-14.14l-1.41 1.41" />
                    </svg>
                );
            case 'RAIN':
                return (
                    <svg className="w-3 h-3 text-sky-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 16.2A4.5 4.5 0 0017.5 8h-1.8A7 7 0 104 14.9M8 19v2m4-3v2m4-1v2" />
                    </svg>
                );
            case 'THUNDERSTORM':
                return (
                    <svg className="w-3 h-3 text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 14.5A4.5 4.5 0 0016.5 7h-1.8A7 7 0 103 13.9M13 11l-4 6h3l-1 5 5-7h-3l2-4" />
                    </svg>
                );
            case 'NIGHT':
                return (
                    <svg className="w-3 h-3 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                );
            case 'CLOUDY':
            default:
                return (
                    <svg className="w-3 h-3 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h10a4 4 0 001.5-7.7A6 6 0 007 8.5 4 4 0 003 15z" />
                    </svg>
                );
        }
    };

    return (
        <div className={`absolute inset-0 pointer-events-none overflow-hidden z-[35] ${className}`}>
            {/* Ambient Atmosphere */}
            {activeType === 'SUNNY' && (
                <>
                    <div className="absolute -top-16 -left-16 w-96 h-96 bg-gradient-to-br from-amber-200/25 via-yellow-100/15 to-transparent rounded-full blur-3xl pointer-events-none"></div>
                </>
            )}

            {(activeType === 'RAIN' || activeType === 'THUNDERSTORM') && (
                <>
                    {/* Wet Floor Reflection Glow */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-4/5 h-12 bg-sky-400/20 blur-2xl rounded-full pointer-events-none"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.07)_0%,transparent_70%)] pointer-events-none"></div>
                </>
            )}

            {activeType === 'THUNDERSTORM' && (
                <>
                    {/* Feathered Storm Ambient Atmosphere - Seamless with background grid */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4/5 h-4/5 bg-[radial-gradient(ellipse_at_center,rgba(30,27,75,0.10)_0%,rgba(15,23,42,0.03)_50%,transparent_75%)] pointer-events-none blur-2xl"></div>
                </>
            )}

            {activeType === 'NIGHT' && (
                <>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[90%] bg-[radial-gradient(ellipse_at_center,rgba(30,41,59,0.14)_0%,rgba(15,23,42,0.06)_50%,transparent_80%)] pointer-events-none blur-xl"></div>
                    <div className="absolute -top-10 -right-10 w-48 h-48 bg-blue-300/15 blur-3xl rounded-full pointer-events-none"></div>
                </>
            )}

            {activeType === 'CLOUDY' && (
                <>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4/5 h-3/5 bg-slate-300/25 blur-3xl rounded-full pointer-events-none"></div>
                    <div className="absolute -top-10 -left-10 w-72 h-72 bg-slate-200/30 blur-3xl rounded-full pointer-events-none"></div>
                </>
            )}

            {/* Particle, Lighting & Lightning Bolt Canvas (z-[35] - Rơi và bắn nước trực tiếp trên nóc xe và thân xe) */}
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-[35]" />

            {/* Apple Dynamic Island SF Symbols Minimalist Weather Capsule (100% Realtime GPS - Static Display) */}
            <div className="absolute top-1.5 right-1.5 md:top-2.5 md:right-3 z-[40] pointer-events-none select-none">
                <div
                    title={`Thời tiết thực tế theo GPS\n• Giờ cập nhật: ${weather.lastUpdated}\n• Vị trí: ${weather.locationName || 'Tọa độ GPS'}`}
                    className="flex items-center gap-1 md:gap-1.5 px-2 py-0.5 md:px-2.5 md:py-1 bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-full shadow-2xs text-[9px] md:text-[11px] select-none cursor-default max-w-[170px] sm:max-w-[220px] md:max-w-none"
                >
                    <span className="flex items-center justify-center shrink-0">
                        {renderSfSymbol(activeType)}
                    </span>
                    <span className="font-bold text-slate-800 tracking-tight">{weather.temp}°</span>
                    <span className="text-slate-300 text-[9px] md:text-[10px]">•</span>
                    <span className="text-slate-600 font-medium text-[8.5px] sm:text-[9.5px] md:text-[10.5px] tracking-tight truncate">{weather.description}</span>
                    {weather.locationName && (
                        <>
                            <span className="text-slate-300 text-[10px] hidden md:inline">•</span>
                            <span className="text-slate-500 font-medium text-[10px] hidden md:inline">{weather.locationName}</span>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LiveWeatherEffect;
