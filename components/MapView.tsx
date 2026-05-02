import React, { useState, useEffect, useRef, useMemo } from 'react';

interface MapViewProps {
    stockData: any[];
    refetchStock: () => void;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
    currentUser: any;
    targetVinOnMap?: string | null;
    onClearTargetVinOnMap?: () => void;
}

const MapView: React.FC<MapViewProps> = ({ stockData, refetchStock: _refetchStock, showToast, currentUser: _currentUser, targetVinOnMap, onClearTargetVinOnMap }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedModel, setSelectedModel] = useState('all');
    const [isMapLoaded, setIsMapLoaded] = useState(false);
    const [addresses, setAddresses] = useState<Record<string, any>>(() => {
        try {
            const cached = localStorage.getItem('car_addresses_cache');
            return cached ? JSON.parse(cached) : {};
        } catch (e) {
            return {};
        }
    });

    const getCachedAddress = (vin: string, lat: number, lng: number): string | null => {
        try {
            const item = addresses[vin];
            if (!item) return null;
            if (typeof item === 'string') return item;
            if (item.lat === lat && item.lng === lng) return item.address;
            return null;
        } catch (e) {
            return null;
        }
    };

    const mapRef = useRef<HTMLDivElement | null>(null);
    const mapInstance = useRef<any>(null);
    const markersRef = useRef<Record<string, any>>({});
    const hasFittedBounds = useRef<boolean>(false);
    const addressesRef = useRef<Record<string, any>>(addresses);

    // Keep ref sync with state
    useEffect(() => {
        addressesRef.current = addresses;
    }, [addresses]);

    // Extract cars with GPS
    const allCarsWithGps = useMemo(() => {
        try {
            return stockData.filter(car => {
                if (!car) return false;
                const reason = car.extension_reason || (car as any)['extension_reason'];
                return reason && typeof reason === 'string' && reason.startsWith('GPS:');
            }).map(car => {
                const reason = car.extension_reason || (car as any)['extension_reason'] || '';
                const parts = reason.replace('GPS:', '').split(',');
                const lat = parseFloat(parts[0]);
                const lng = parseFloat(parts[1]);
                return {
                    ...car,
                    lat: isNaN(lat) ? 0 : lat,
                    lng: isNaN(lng) ? 0 : lng,
                    dong_xe: String(car.dong_xe || (car as any)['Dòng xe'] || 'Khác'),
                    vin: String(car.vin || (car as any)['VIN'] || ''),
                    trang_thai: String(car.trang_thai || (car as any)['Trạng thái'] || 'Chưa ghép'),
                    phien_ban: String(car.phien_ban || (car as any)['Phiên bản'] || ''),
                    ngoai_that: String(car.ngoai_that || (car as any)['Màu ngoại thất'] || ''),
                    noi_that: String(car.noi_that || (car as any)['Màu nội thất'] || '')
                };
            }).filter(car => car.lat !== 0 && car.lng !== 0 && !isNaN(car.lat) && !isNaN(car.lng));
        } catch (err) {
            console.error('Error parsing GPS cars:', err);
            return [];
        }
    }, [stockData]);

    const carModels = useMemo(() => {
        try {
            const models = allCarsWithGps.map(car => car.dong_xe).filter(Boolean);
            return Array.from(new Set(models)).sort();
        } catch (err) {
            return [];
        }
    }, [allCarsWithGps]);

    const filteredCars = useMemo(() => {
        try {
            return allCarsWithGps.filter(car => {
                const vinStr = String(car.vin || '').toLowerCase();
                const modelStr = String(car.dong_xe || '').toLowerCase();
                const versionStr = String(car.phien_ban || '').toLowerCase();

                const matchesSearch = vinStr.includes(searchTerm.toLowerCase()) ||
                    modelStr.includes(searchTerm.toLowerCase()) ||
                    versionStr.includes(searchTerm.toLowerCase());
                const matchesModel = selectedModel === 'all' || car.dong_xe === selectedModel;
                return matchesSearch && matchesModel;
            });
        } catch (err) {
            return [];
        }
    }, [allCarsWithGps, searchTerm, selectedModel]);

    // Initialize Map
    useEffect(() => {
        try {
            if (!mapRef.current) return;
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
            }).setView([16.047079, 108.20623], 6);

            const tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                subdomains: 'abcd',
                maxZoom: 20
            }).addTo(mapInstance.current);

            tileLayer.on('load', () => setIsMapLoaded(true));
            const fallbackTimer = setTimeout(() => setIsMapLoaded(true), 1200);

            // Trigger size calculations
            setTimeout(() => mapInstance.current?.invalidateSize(), 50);
            setTimeout(() => mapInstance.current?.invalidateSize(), 150);
            setTimeout(() => mapInstance.current?.invalidateSize(), 300);

            return () => {
                clearTimeout(fallbackTimer);
                if (mapInstance.current) {
                    mapInstance.current.remove();
                    mapInstance.current = null;
                }
            };
        } catch (err) {
            console.error('Error initializing map:', err);
        }
    }, []);

    // Draw markers
    useEffect(() => {
        try {
            const L = (window as any).L;
            if (!L || !mapInstance.current) return;

            // Clear old markers
            Object.values(markersRef.current).forEach(m => m.remove());
            markersRef.current = {};

            if (allCarsWithGps.length === 0) return;

            allCarsWithGps.forEach(car => {
                const popupId = `popup-vin-${car.vin}`;
                const bgClass = car.trang_thai === 'Chưa ghép' ? 'background: #f0fdf4; color: #16a34a; border: 1px solid #dcfce7;' : car.trang_thai === 'Đã ghép' ? 'background: #eff6ff; color: #2563eb; border: 1px solid #dbeafe;' : 'background: #f8fafc; color: #475569; border: 1px solid #e2e8f0;';

                const popupContent = `
                    <div style="min-width: 220px; font-family: sans-serif; padding: 4px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                            <span style="font-size: 11px; font-weight: bold; color: #4f46e5; text-transform: uppercase;">${car.dong_xe}</span>
                            <span style="font-size: 10px; ${bgClass} padding: 2px 6px; border-radius: 6px; font-weight: bold;">${car.trang_thai}</span>
                        </div>
                        <div style="font-size: 13px; font-weight: bold; color: #111827; margin-bottom: 2px;">${car.phien_ban}</div>
                        <div style="font-size: 11px; font-family: monospace; color: #6b7280; font-weight: bold; margin-bottom: 8px;">VIN: ${car.vin}</div>
                        <div style="font-size: 11px; color: #1f2937; line-height: 1.4; border-top: 1px solid #e5e7eb; padding-top: 6px; margin-top: 4px;">
                            📍 <strong>Địa chỉ:</strong>
                            <span id="${popupId}" style="display: block; color: #374151; margin-top: 2px; font-style: italic;">Đang lấy địa chỉ...</span>
                        </div>
                    </div>
                `;

                const carEmojis = ['🚗', '🚙', '🏎️', '🚐', '🛻', '🚘'];
                const charSum = car.vin.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
                const emoji = carEmojis[charSum % carEmojis.length];

                const statusColor = car.trang_thai === 'Chưa ghép' ? '#16a34a' : car.trang_thai === 'Đã ghép' ? '#2563eb' : car.trang_thai === 'Đang giữ' ? '#4f46e5' : '#475569';

                const carIcon = L.divIcon({
                    html: `
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 36px; height: 42px; transition: transform 0.2s;" class="hover:scale-110">
                        <div style="background: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 21px; box-shadow: 0 4px 10px rgba(0,0,0,0.22); border: 2.5px solid ${statusColor};">
                            ${emoji}
                        </div>
                        <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 6px solid ${statusColor}; margin-top: -2px;"></div>
                    </div>`,
                    className: '',
                    iconSize: [36, 42],
                    iconAnchor: [18, 42],
                    popupAnchor: [0, -42]
                });

                const marker = L.marker([car.lat, car.lng], { icon: carIcon })
                    .addTo(mapInstance.current)
                    .bindPopup(popupContent);

                marker.on('popupopen', () => {
                    resolveAddress(car.lat, car.lng, car.vin, popupId);
                });

                markersRef.current[car.vin] = marker;
            });

            // Fit bounds exactly once
            if (allCarsWithGps.length > 0 && !hasFittedBounds.current) {
                hasFittedBounds.current = true;
                const bounds = allCarsWithGps.map(c => [c.lat, c.lng]);
                mapInstance.current.fitBounds(bounds, { padding: [50, 50] });
            }
        } catch (err) {
            console.error('Error drawing markers:', err);
        }
    }, [allCarsWithGps]);

    useEffect(() => {
        if (targetVinOnMap && mapInstance.current && markersRef.current[targetVinOnMap]) {
            const marker = markersRef.current[targetVinOnMap];
            const latLng = marker.getLatLng();
            mapInstance.current.setView(latLng, 16);
            marker.openPopup();
            
            if (onClearTargetVinOnMap) {
                onClearTargetVinOnMap();
            }
        }
    }, [targetVinOnMap, allCarsWithGps, isMapLoaded]);

    const resolveAddress = async (lat: number, lng: number, vin: string, popupId: string) => {
        const existing = addressesRef.current[vin];
        if (existing && typeof existing === 'object' && existing.lat === lat && existing.lng === lng) {
            const el = document.getElementById(popupId);
            if (el) el.innerHTML = `<strong>${existing.address}</strong>`;
            return;
        }

        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=vi`, {
                headers: { 'User-Agent': 'ShowroomThuanAnOrderManagement/1.0' }
            });
            if (res.ok) {
                const d = await res.json();
                const address = d.display_name || 'Không tìm thấy địa chỉ cụ thể';
                addressesRef.current[vin] = { address, lat, lng };
                
                localStorage.setItem('car_addresses_cache', JSON.stringify(addressesRef.current));

                const el = document.getElementById(popupId);
                if (el) el.innerHTML = `<strong>${address}</strong>`;

                setAddresses({ ...addressesRef.current });
            }
        } catch (err) {
            const el = document.getElementById(popupId);
            if (el) el.innerHTML = 'Không thể lấy địa chỉ';
        }
    };

    const flyToCar = (car: any) => {
        if (!mapInstance.current) return;
        mapInstance.current.stop();
        mapInstance.current.flyTo([car.lat, car.lng], 16, { animate: true, duration: 1 });
        const marker = markersRef.current[car.vin];
        if (marker) {
            setTimeout(() => {
                marker.openPopup();
            }, 1000);
        }
    };

    return (
        <div className="flex flex-col md:flex-row overflow-hidden bg-slate-50 w-full border border-slate-200/60 rounded-2xl h-[calc(100vh-130px)] md:h-[calc(100vh-86px)]">
            {/* Map Area */}
            <div className="flex-1 h-1/2 md:h-full relative min-h-[300px] md:min-h-0">
                <div ref={mapRef} className="w-full h-full bg-white" />
            </div>

            {/* Sidebar Car List */}
            <div className="bg-white flex flex-col h-1/2 md:h-full w-full md:w-[380px] md:min-w-[380px] flex-shrink-0 shadow-sm z-10 border-t md:border-t-0 md:border-l border-slate-200/80">
                {/* Header */}
                <div className="p-4 bg-slate-50/70 border-b border-slate-200/80 space-y-3">
                    <div className="flex justify-between items-center">
                        <h2 className="text-sm font-black text-slate-800 flex items-center gap-2">
                            <i className="fa-solid fa-map-location-dot text-indigo-600"></i>
                            <span>Vị Trí Xe</span>
                        </h2>
                        <div className="flex items-center gap-1.5">
                            {!isMapLoaded && (
                                <span className="text-[10px] text-amber-600 bg-amber-50 font-bold px-2 py-0.5 rounded border border-amber-100 flex items-center gap-1 animate-pulse">
                                    <i className="fa-solid fa-spinner fa-spin"></i> Đang tải...
                                </span>
                            )}
                            <span className="text-[10px] bg-indigo-50 text-indigo-600 font-bold px-2 py-0.5 rounded border border-indigo-100">
                                {allCarsWithGps.length} Xe Định Vị
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                            <input
                                type="text"
                                placeholder="Tìm theo VIN, model..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
                            />
                        </div>

                        <select
                            value={selectedModel}
                            onChange={e => setSelectedModel(e.target.value)}
                            className="text-xs bg-white border border-slate-200 rounded-xl px-2 py-1.5 outline-none focus:border-indigo-500 transition-all min-w-[130px]"
                        >
                            <option value="all">Tất cả dòng xe</option>
                            {carModels.map(m => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Car List */}
                <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1.5">
                    {filteredCars.length > 0 ? (
                        filteredCars.map(car => {
                            return (
                                <div
                                    key={car.vin}
                                    onClick={() => {
                                        if (isMapLoaded) {
                                            flyToCar(car);
                                        } else {
                                            showToast('Đang Tải Bản Đồ', 'Vui lòng chờ bản đồ tải xong trước khi xem xe.', 'warning');
                                        }
                                    }}
                                    className={`p-3.5 flex flex-col gap-1.5 transition-all border rounded-xl cursor-pointer ${!isMapLoaded ? 'opacity-90' : 'hover:bg-slate-50/60 hover:shadow-sm hover:border-slate-300/80 bg-white border-slate-100 shadow-sm'}`}
                                >
                                    <div className="flex justify-between items-start gap-1">
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-slate-800 truncate">{car.dong_xe} {car.phien_ban}</p>
                                            <p className="text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wide mt-0.5">{car.vin}</p>
                                        </div>
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${car.trang_thai === 'Chưa ghép' ? 'bg-green-50 border-green-100 text-green-600' : car.trang_thai === 'Đã ghép' ? 'bg-blue-50 border-blue-100 text-blue-600' : car.trang_thai === 'Đang giữ' ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                                            {car.trang_thai}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-3 text-[10px] text-slate-500">
                                        <div className="flex items-center gap-1 min-w-0">
                                            <i className="fa-solid fa-palette text-slate-400"></i>
                                            <span className="truncate">{car.ngoai_that} / {car.noi_that}</span>
                                        </div>
                                        <div className="flex items-center gap-1 min-w-0 flex-1">
                                            <i className="fa-solid fa-map-pin text-indigo-500"></i>
                                            <span className="truncate" title={getCachedAddress(car.vin, car.lat, car.lng) || 'Đang lấy địa chỉ...'}>
                                                {getCachedAddress(car.vin, car.lat, car.lng) || 'Đang lấy địa chỉ...'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center py-12 flex flex-col items-center justify-center gap-2">
                            <i className="fa-solid fa-map-pin text-3xl text-slate-200"></i>
                            <p className="text-xs font-bold text-slate-400">Không tìm thấy xe định vị nào</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default React.memo(MapView);
