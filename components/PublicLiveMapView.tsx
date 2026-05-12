import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/apiService';
import moment from 'moment';

interface PublicLiveMapViewProps {
    sharedVin?: string;
    shareToken?: string;
}

export const PublicLiveMapView: React.FC<PublicLiveMapViewProps> = ({ sharedVin, shareToken }) => {
    const [car, setCar] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [address, setAddress] = useState<string>('Đang lấy địa chỉ...');
    const [mapType, setMapType] = useState<'standard' | 'satellite'>('standard');
    
    // Security & Data states
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [shareData, setShareData] = useState<any>(null);
    const [breadcrumbs, setBreadcrumbs] = useState<any[]>([]);
    const [isVerified, setIsVerified] = useState(false);

    const mapRef = useRef<HTMLDivElement | null>(null);
    const mapInstance = useRef<any>(null);
    const tileLayerRef = useRef<any>(null);
    const markerRef = useRef<any>(null);
    const polylineRef = useRef<any>(null);

    // 1. Initial Validation & Metadata Fetch
    useEffect(() => {
        const validateLink = async () => {
            if (!shareToken) {
                if (sharedVin) {
                    setIsVerified(true); // Legacy mode
                    return;
                }
                setErrorMsg('Thiếu thông tin chia sẻ vị trí.');
                setIsLoading(false);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('shared_locations')
                    .select('*')
                    .eq('token', shareToken)
                    .maybeSingle();

                if (error) throw error;
                if (!data) {
                    setErrorMsg('Link chia sẻ không tồn tại hoặc đã bị gỡ bỏ.');
                    setIsLoading(false);
                    return;
                }

                if (!data.is_active || moment(data.expires_at).isBefore(moment())) {
                    setErrorMsg('Link chia sẻ đã hết hạn hoặc đã bị vô hiệu hóa.');
                    setIsLoading(false);
                    return;
                }

                setShareData(data);
                setIsVerified(true);
                
                // Record view count using RPC for atomic increment and RLS bypass
                try {
                    await supabase.rpc('increment_view_count', { target_id: data.id });
                } catch (rpcErr) {
                    // Fallback to manual update if RPC doesn't exist
                    await supabase.from('shared_locations')
                        .update({ view_count: (data.view_count || 0) + 1 })
                        .eq('id', data.id);
                }

            } catch (err) {
                console.error('Validation error:', err);
                setErrorMsg('Có lỗi xảy ra khi xác thực link chia sẻ.');
            } finally {
                if (!shareToken) setIsLoading(false);
            }
        };

        validateLink();
    }, [shareToken, sharedVin]);

    // 2. Fetch Car Data & Breadcrumbs (only if verified)
    useEffect(() => {
        if (!isVerified) return;

        let isMounted = true;
        const vin = shareToken ? shareData?.vin : sharedVin;
        if (!vin) return;

        const fetchCarAndHistory = async () => {
            try {
                // Fetch car details and latest telemetry in parallel
                const [carRes, telemetryRes] = await Promise.all([
                    supabase
                        .from('khoxe')
                        .select('vin, dong_xe, phien_ban, ngoai_that, noi_that, extension_reason, trang_thai')
                        .eq('vin', vin)
                        .maybeSingle(),
                    supabase
                        .from('car_telemetry')
                        .select('lat, lng, speed, heading')
                        .eq('vin', vin)
                        .maybeSingle()
                ]);

                const carData = carRes.data;
                const telemetryData = telemetryRes.data;

                if (carData && isMounted) {
                    let lat = null;
                    let lng = null;
                    let speed = null;
                    let heading = null;

                    if (telemetryData) {
                        lat = parseFloat(telemetryData.lat);
                        lng = parseFloat(telemetryData.lng);
                        speed = telemetryData.speed;
                        heading = telemetryData.heading;
                    } else {
                        // Fallback to legacy extension_reason GPS parsing
                        const reason = carData.extension_reason || '';
                        if (reason.startsWith('GPS:')) {
                            const parts = reason.replace('GPS:', '').split(',');
                            lat = parseFloat(parts[0]);
                            lng = parseFloat(parts[1]);
                        }
                    }

                    if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
                        setCar({
                            ...carData,
                            lat,
                            lng,
                            speed: speed || 0,
                            heading: heading || 0,
                            dong_xe: carData.dong_xe || 'VinFast',
                            phien_ban: carData.phien_ban || 'Plus',
                            ngoai_that: carData.ngoai_that || 'Màu sắc',
                            noi_that: carData.noi_that || 'Màu nội thất',
                            trang_thai: carData.trang_thai || 'Chưa ghép'
                        });
                    }
                }

                // Fetch breadcrumbs (last 20 points)
                const { data: historyData } = await supabase
                    .from('location_history')
                    .select('lat, lng, captured_at')
                    .eq('vin', vin)
                    .order('captured_at', { ascending: false })
                    .limit(20);

                if (historyData && isMounted) {
                    setBreadcrumbs(historyData.reverse());
                }

                setIsLoading(false);
            } catch (err) {
                console.error('Data fetch error:', err);
                setIsLoading(false);
            }
        };

        fetchCarAndHistory();
        const interval = setInterval(fetchCarAndHistory, 30000);

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [isVerified, shareToken, shareData, sharedVin]);

    // 3. Realtime View Count update
    useEffect(() => {
        if (!isVerified || !shareData?.id) return;

        const channel = supabase
            .channel(`shared_location_${shareData.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'shared_locations',
                    filter: `id=eq.${shareData.id}`,
                },
                (payload) => {
                    if (payload.new) {
                        setShareData((prev: any) => ({ ...prev, ...payload.new }));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [isVerified, shareData?.id]);

    // 4. Reverse geocode address
    useEffect(() => {
        if (!car || !car.lat || !car.lng) return;

        let isMounted = true;
        const resolveAddress = async () => {
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${car.lat}&lon=${car.lng}&accept-language=vi`, {
                    headers: { 'User-Agent': 'ShowroomThuanAnOrderManagement/1.0' }
                });
                if (res.ok && isMounted) {
                    const d = await res.json();
                    setAddress(d.display_name || 'Không tìm thấy địa chỉ cụ thể');
                }
            } catch (err) {
                if (isMounted) setAddress('Không thể lấy địa chỉ');
            }
        };

        resolveAddress();
        return () => { isMounted = false; };
    }, [car]);

    // 4. Leaflet Map Initialization & Breadcrumbs Layer
    useEffect(() => {
        if (!mapRef.current || !car) return;
        const L = (window as any).L;
        if (!L) return;

        if (mapInstance.current) {
            mapInstance.current.remove();
            mapInstance.current = null;
        }

        const vnBounds = L.latLngBounds([8.18, 102.14], [23.39, 109.46]);
        mapInstance.current = L.map(mapRef.current, {
            attributionControl: false,
            minZoom: 5,
            maxZoom: 18,
            maxBounds: vnBounds,
            maxBoundsViscosity: 1.0
        }).setView([car.lat, car.lng], 16);

        tileLayerRef.current = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            subdomains: 'abcd',
            maxZoom: 18
        }).addTo(mapInstance.current);

        // Draw Breadcrumbs
        if (breadcrumbs.length > 1) {
            const points = breadcrumbs.map(p => [p.lat, p.lng]);
            points.push([car.lat, car.lng]);
            
            polylineRef.current = L.polyline(points, {
                color: '#4f46e5',
                weight: 4,
                opacity: 0.5,
                dashArray: '8, 8',
                lineJoin: 'round'
            }).addTo(mapInstance.current);
        }

        const carIconHtml = `
            <div style="position: relative; width: 120px; height: 120px; display: flex; flex-direction: column; align-items: center; justify-content: center; transform: translateY(-30px);">
                <!-- VIN Label Badge -->
                <div style="background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(4px); color: white; padding: 3px 8px; border-radius: 6px; font-size: 9px; font-weight: 900; margin-bottom: 8px; border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 4px 10px rgba(0,0,0,0.3); white-space: nowrap; font-family: monospace; letter-spacing: 0.5px; z-index: 3;">
                    ${car.vin}
                </div>
                
                <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
                    <!-- Pulse Effect -->
                    <div class="marker-pulse" style="position: absolute; width: 48px; height: 48px; background: rgba(79, 70, 229, 0.4); border-radius: 50%; z-index: 1;"></div>
                    
                    <!-- Core Icon -->
                    <div style="position: absolute; width: 34px; height: 34px; background: white; border-radius: 50%; box-shadow: 0 4px 12px rgba(0,0,0,0.25); border: 3px solid #4f46e5; display: flex; align-items: center; justify-content: center; z-index: 2;">
                        <i class="fa-solid fa-car-side" style="color: #4f46e5; font-size: 16px;"></i>
                    </div>
                    
                    <!-- Bottom Arrow -->
                    <div style="position: absolute; bottom: -4px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 7px solid #4f46e5; z-index: 2;"></div>
                </div>
                
                <style>
                    @keyframes custom-ping {
                        0% { transform: scale(1); opacity: 0.8; }
                        70% { transform: scale(2.5); opacity: 0; }
                        100% { transform: scale(2.5); opacity: 0; }
                    }
                    .marker-pulse {
                        animation: custom-ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
                    }
                </style>
            </div>
        `;

        const carIcon = L.divIcon({
            html: carIconHtml,
            className: '',
            iconSize: [120, 120],
            iconAnchor: [60, 90]
        });

        markerRef.current = L.marker([car.lat, car.lng], { icon: carIcon })
            .addTo(mapInstance.current);

        setTimeout(() => mapInstance.current?.invalidateSize(), 150);

        return () => {
            if (mapInstance.current) {
                mapInstance.current.remove();
                mapInstance.current = null;
            }
        };
    }, [car, breadcrumbs]);

    // 5. Update tile layers when type changes
    useEffect(() => {
        if (!mapInstance.current) return;
        const L = (window as any).L;
        if (!L) return;

        if (tileLayerRef.current) {
            tileLayerRef.current.remove();
        }

        if (mapType === 'satellite') {
            tileLayerRef.current = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                maxZoom: 18
            }).addTo(mapInstance.current);
        } else {
            tileLayerRef.current = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                subdomains: 'abcd',
                maxZoom: 18
            }).addTo(mapInstance.current);
        }
    }, [mapType]);

    if (errorMsg) {
        return (
            <div className="w-screen h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-4 text-2xl shadow-sm">
                    <i className="fa-solid fa-circle-exclamation"></i>
                </div>
                <h2 className="text-lg font-black text-slate-800 mb-1 uppercase tracking-wider">Thông báo</h2>
                <p className="text-xs font-semibold text-slate-500 max-w-sm leading-relaxed mb-6">{errorMsg}</p>
                <button 
                    onClick={() => window.location.href = '/'}
                    className="px-5 py-2.5 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition-all shadow-md active:scale-95 text-xs"
                >
                    VỀ TRANG CHỦ
                </button>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="w-screen h-screen bg-slate-50 flex flex-col items-center justify-center gap-3 animate-fade-in">
                <i className="fa-solid fa-circle-notch fa-spin text-3xl text-indigo-600"></i>
                <p className="text-sm font-black text-slate-800 uppercase tracking-widest">Đang kết nối vị trí xe...</p>
            </div>
        );
    }

    if (!car) {
        return (
            <div className="w-screen h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-4 text-2xl shadow-sm">
                    <i className="fa-solid fa-circle-exclamation"></i>
                </div>
                <h2 className="text-lg font-black text-slate-800 mb-1 uppercase tracking-wider">Không tìm thấy vị trí xe</h2>
                <p className="text-xs font-semibold text-slate-400 max-w-sm leading-relaxed mb-6">
                    Xe hiện tại chưa có tọa độ GPS được cập nhật hoặc không tồn tại trong hệ thống.
                </p>
                <button 
                    onClick={() => window.location.reload()}
                    className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-md active:scale-95 text-xs"
                >
                    TẢI LẠI TRANG
                </button>
            </div>
        );
    }

    return (
        <div className="w-screen h-screen relative flex flex-col overflow-hidden bg-slate-100">
            {/* Top Minimalist Header */}
            <div className="absolute top-0 left-0 right-0 h-14 bg-white/80 backdrop-blur-md border-b border-slate-200/50 z-[1000] flex items-center justify-between px-4 sm:px-6 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-md">
                        <i className="fa-solid fa-car-side text-base"></i>
                    </div>
                    <div className="flex flex-col -space-y-0.5">
                        <span className="text-xs font-black text-slate-800 tracking-wider">THEO DÕI VỊ TRÍ XE</span>
                        <span className="text-[10px] font-bold text-slate-400 capitalize">Hệ thống Showroom Thuận An</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 select-none">
                    <button 
                        onClick={() => setMapType(mapType === 'standard' ? 'satellite' : 'standard')}
                        className="bg-white/90 hover:bg-white text-indigo-600 font-black text-[10px] border border-slate-200 px-3 py-2 rounded-xl shadow-sm transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                    >
                        <i className={`fa-solid ${mapType === 'satellite' ? 'fa-map' : 'fa-satellite'}`}></i>
                        <span>{mapType === 'satellite' ? 'BẢN ĐỒ PHẲNG' : 'BẢN ĐỒ VỆ TINH'}</span>
                    </button>
                </div>
            </div>

            {/* Map Area */}
            <div ref={mapRef} className="w-full h-full bg-white relative z-10" />

            {/* Information Card - Luxurious Floating Design */}
            <div className="absolute bottom-6 left-4 right-4 md:left-6 md:right-auto md:w-[400px] z-[1000] animate-fade-in-up select-none">
                <div className="bg-white/70 backdrop-blur-2xl border border-white/50 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.12)] overflow-hidden flex flex-col">
                    
                    {/* Top Section with Image/Icon Background */}
                    <div className="relative p-6 pb-4 bg-gradient-to-br from-indigo-600/5 to-transparent">
                        <div className="flex justify-between items-start">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-1">VinFast Premium</span>
                                <h2 className="text-xl font-black text-slate-800 tracking-tight leading-tight uppercase">{car.dong_xe}</h2>
                                <p className="text-xs font-bold text-slate-500 mt-0.5">{car.phien_ban}</p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                                    <span className="relative flex h-1.5 w-1.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                    </span>
                                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-wider">Trực tuyến</span>
                                </div>
                                
                                <div className="flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/10 px-2.5 py-1 rounded-full">
                                    <i className="fa-solid fa-eye text-[9px] text-indigo-500"></i>
                                    <span className="text-[9px] font-black text-indigo-500 uppercase tracking-wider">{shareData?.view_count || 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Specs Grid */}
                    <div className="px-6 py-4 grid grid-cols-2 gap-6 border-t border-slate-100/50">
                        <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ngoại thất</span>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full border border-slate-200 shadow-inner bg-slate-50" style={{ backgroundColor: car.ngoai_that?.toLowerCase().includes('trắng') ? '#fff' : car.ngoai_that?.toLowerCase().includes('đen') ? '#000' : car.ngoai_that?.toLowerCase().includes('đỏ') ? '#dc2626' : car.ngoai_that?.toLowerCase().includes('xanh') ? '#2563eb' : car.ngoai_that?.toLowerCase().includes('xám') ? '#4b5563' : '#f8fafc' }}></div>
                                <span className="text-xs font-black text-slate-700">{car.ngoai_that}</span>
                            </div>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nội thất</span>
                            <div className="flex items-center gap-2">
                                <i className="fa-solid fa-couch text-[10px] text-slate-400"></i>
                                <span className="text-xs font-black text-slate-700">{car.noi_that}</span>
                            </div>
                        </div>
                    </div>

                    {/* Location Section */}
                    <div className="px-6 py-5 bg-slate-50/50 border-y border-slate-100/50 flex flex-col gap-3">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200/50 shadow-sm flex items-center justify-center flex-shrink-0 text-indigo-600">
                                <i className="fa-solid fa-location-arrow animate-pulse text-sm"></i>
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em]">Vị trí hiện tại</span>
                                <p className="text-xs font-bold text-slate-700 leading-relaxed mt-1 line-clamp-2 italic">
                                    {address || 'Đang cập nhật địa chỉ...'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="p-4 flex items-center gap-3 bg-white/40">
                        <button 
                            onClick={() => {
                                if (car.lat && car.lng) {
                                    window.open(`https://www.google.com/maps/dir/?api=1&destination=${car.lat},${car.lng}`, '_blank');
                                }
                            }}
                            className="flex-1 h-12 bg-slate-900 hover:bg-black text-white rounded-2xl transition-all shadow-lg hover:shadow-black/20 active:scale-95 flex items-center justify-center gap-2 font-black text-xs tracking-widest"
                        >
                            <i className="fa-solid fa-diamond-turn-right text-[10px]"></i>
                            CHỈ ĐƯỜNG
                        </button>
                        
                        <button 
                            onClick={() => {
                                navigator.clipboard.writeText(car.vin);
                                // Optional: simple indicator instead of alert
                            }}
                            className="w-12 h-12 bg-white border border-slate-200 text-slate-600 rounded-2xl hover:bg-slate-50 transition-all active:scale-90 flex items-center justify-center shadow-sm"
                            title="Sao chép số VIN"
                        >
                            <i className="fa-solid fa-fingerprint"></i>
                        </button>
                    </div>
                </div>

                {/* Footer Brand Info */}
                <div className="mt-4 px-2 flex items-center justify-between opacity-40">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em]">Showroom Thuận An Digital</span>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">© 2026</span>
                </div>
            </div>
        </div>
    );
};
