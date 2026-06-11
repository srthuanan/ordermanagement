import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { getCarImage } from '../utils/styleUtils';
import { getAppSetting, updateAppSetting, supabase } from '../services/apiService';
import moment from 'moment';
import 'moment/locale/vi';
import ShareSidePanel from './modals/ShareSidePanel';
moment.locale('vi');

interface MapViewProps {
    stockData: any[];
    xuathoadonData?: any[];
    refetchStock: () => void;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
    currentUser: any;
    targetVinOnMap?: string | null;
    onClearTargetVinOnMap?: () => void;
    isReferenceAccount?: boolean;
}

const MapView: React.FC<MapViewProps> = ({ stockData, xuathoadonData = [], refetchStock: _refetchStock, showToast, currentUser: _currentUser, targetVinOnMap, onClearTargetVinOnMap, isReferenceAccount }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedModel, setSelectedModel] = useState('all');
    const [mapType, setMapType] = useState<'satellite' | 'standard'>('standard');
    const [isMapLoaded, setIsMapLoaded] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [routedVin, setRoutedVin] = useState<string | null>(null);
    const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
    const [isDrawingRoute, setIsDrawingRoute] = useState<string | null>(null);
    const [addresses, setAddresses] = useState<Record<string, any>>(() => {
        try {
            const cached = localStorage.getItem('car_addresses_cache');
            return cached ? JSON.parse(cached) : {};
        } catch (e) {
            return {};
        }
    });

    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [hoveredVin] = useState<string | null>(null);
    const [polygonCoords, setPolygonCoords] = useState<any[] | null>(null);
    const [, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

    const [carToShare, setCarToShare] = useState<any>(null);



    const mapRef = useRef<HTMLDivElement | null>(null);
    const mapInstance = useRef<any>(null);
    const markersRef = useRef<Record<string, any>>({});
    const tileLayerRef = useRef<any>(null);
    const labelLayerRef = useRef<any>(null);
    const routePolylineRef = useRef<any>(null);
    const userMarkerRef = useRef<any>(null);
    const markerClusterGroupRef = useRef<any>(null);
    const drawnItemsRef = useRef<any>(null);

    const hasFittedBounds = useRef<boolean>(false);
    const addressesRef = useRef<Record<string, any>>(addresses);

    // Keep ref sync with state
    useEffect(() => {
        addressesRef.current = addresses;
    }, [addresses]);

    const [isSynced, setIsSynced] = useState(false);
    const [cachedGpsPositions, setCachedGpsPositions] = useState<Record<string, any>>(() => {
        try {
            const cached = localStorage.getItem('car_gps_cache');
            return cached ? JSON.parse(cached) : {};
        } catch (e) {
            return {};
        }
    });

    // Fetch persistent cache from database and latest car_telemetry
    const fetchDBCache = useCallback(async () => {
        try {
            const [res, telemetryRes] = await Promise.all([
                getAppSetting('car_gps_cache'),
                supabase.from('car_telemetry').select('*')
            ]);

            let mergedPositions: Record<string, any> = {};
            if (res.status === 'SUCCESS' && res.data && typeof res.data === 'object') {
                mergedPositions = { ...res.data };
            }

            if (telemetryRes.data && Array.isArray(telemetryRes.data)) {
                telemetryRes.data.forEach((tel: any) => {
                    const existing = mergedPositions[tel.vin] || {};
                    mergedPositions[tel.vin] = {
                        ...existing,
                        lat: parseFloat(tel.lat),
                        lng: parseFloat(tel.lng),
                        vin: tel.vin,
                        speed: tel.speed || 0,
                        heading: tel.heading || 0,
                        updated_at: tel.updated_at || new Date().toISOString()
                    };
                });
            }

            if (Object.keys(mergedPositions).length > 0) {
                setCachedGpsPositions(mergedPositions);
                localStorage.setItem('car_gps_cache', JSON.stringify(mergedPositions));
            }
            setIsSynced(true);
        } catch (err) {
            console.error('Failed to fetch DB GPS cache or telemetry:', err);
            setIsSynced(true); // Vẫn set true để cho phép hoạt động nếu DB lỗi
        }
    }, []);

    useEffect(() => {
        fetchDBCache();
    }, [fetchDBCache]);

    // Ghost Hunter: Tự động dọn dẹp các VIN không còn tồn tại trong DB
    const hasCleanedGhosts = useRef(false);
    useEffect(() => {
        if (!isSynced || hasCleanedGhosts.current || isReferenceAccount) return;
        
        const cleanGhosts = async () => {
            try {
                // Lấy danh sách VIN trong cache nhưng KHÔNG có trong stock hiện tại và KHÔNG có trong yêu cầu XHĐ
                const activeVins = new Set(stockData.map(c => String(c.vin || (c as any)['VIN'] || '')));
                const invoicedVins = new Set(xuathoadonData.map(r => String(r.VIN || r.vin || '')));
                
                const cachedVins = Object.keys(cachedGpsPositions);
                const orphanVins = cachedVins.filter(vin => !activeVins.has(vin) && !invoicedVins.has(vin));

                if (orphanVins.length === 0) {
                    hasCleanedGhosts.current = true;
                    return;
                }

                // Kiểm tra xem các VIN "mồ côi" này có thực sự tồn tại trong bảng khoxe hoặc yeucauxhd không
                const [kxRes, yRes] = await Promise.all([
                    supabase.from('khoxe').select('vin').in('vin', orphanVins),
                    supabase.from('yeucauxhd').select('vin').in('vin', orphanVins)
                ]);

                const foundInDB = new Set([
                    ...(kxRes.data || []).map(r => r.vin),
                    ...(yRes.data || []).map(r => r.vin)
                ]);

                const vinsToRemove = orphanVins.filter(vin => !foundInDB.has(vin));

                if (vinsToRemove.length > 0) {
                    setCachedGpsPositions(prev => {
                        const next = { ...prev };
                        vinsToRemove.forEach(vin => delete next[vin]);
                        
                        // Cập nhật lại localStorage và DB
                        localStorage.setItem('car_gps_cache', JSON.stringify(next));
                        updateAppSetting('car_gps_cache', next).catch(e => console.error('Failed to sync ghost cleanup to DB:', e));
                        
                        return next;
                    });
                    console.log(`[Ghost Hunter] Đã dọn dẹp ${vinsToRemove.length} xe ma khỏi bản đồ.`, vinsToRemove);
                    showToast('Hệ thống', `Đã tự động dọn dẹp ${vinsToRemove.length} vị trí xe cũ không còn tồn tại.`, 'info');
                }
                
                hasCleanedGhosts.current = true;
            } catch (err) {
                console.error('Ghost Hunter failed:', err);
            }
        };

        cleanGhosts();
    }, [isSynced, cachedGpsPositions, stockData, xuathoadonData, showToast]);

    // Extract cars with GPS
    const allCarsWithGps = useMemo(() => {
        try {
            const currentMonthStart = moment().startOf('month');
            const recentXuathoadonData = xuathoadonData.filter(r => {
                const invoiceDate = r['Ngày xuất hóa đơn'] || r['NGÀY XUẤT HÓA ĐƠN'] || r.ngay_xuat_hoa_don || r['Thời gian nhập'] || r['NGÀY YÊU CẦU XHĐ'];
                if (!invoiceDate) return true; // Giữ lại nếu chưa có ngày
                
                let mDate = moment(invoiceDate, 'DD/MM/YYYY', true);
                if (!mDate.isValid()) {
                    mDate = moment(invoiceDate);
                }
                
                if (!mDate.isValid()) return true;

                // Chỉ giữ lại xe XHĐ trong tháng hiện tại
                return mDate.isSameOrAfter(currentMonthStart);
            });

            const combinedData = [...stockData, ...recentXuathoadonData];
            const activeGpsCars = combinedData.filter(car => {
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
                    noi_that: String(car.noi_that || (car as any)['Màu nội thất'] || ''),
                    thoi_gian_nhap: car.thoi_gian_nhap || (car as any)['Thời gian nhập'] || car.updated_at || null
                };
            }).filter(car => car.lat !== 0 && car.lng !== 0 && !isNaN(car.lat) && !isNaN(car.lng));

            const newCache = { ...cachedGpsPositions };
            let hasNew = false;

            const combinedMap = new Map();
            combinedData.forEach(car => {
                if (!car) return;
                const vin = String(car.vin || car['VIN'] || '').trim().toUpperCase();
                if (vin) combinedMap.set(vin, car);
            });

            const invoicedMap = new Map();
            recentXuathoadonData.forEach(r => {
                if (!r) return;
                const vin = String(r.VIN || r.vin || '').trim().toUpperCase();
                if (vin) invoicedMap.set(vin, r);
            });

            activeGpsCars.forEach(car => {
                newCache[car.vin] = {
                    lat: car.lat,
                    lng: car.lng,
                    dong_xe: car.dong_xe,
                    vin: car.vin,
                    trang_thai: car.trang_thai,
                    phien_ban: car.phien_ban,
                    ngoai_that: car.ngoai_that,
                    noi_that: car.noi_that,
                    thoi_gian_nhap: car.thoi_gian_nhap,
                    updated_at: new Date().toISOString()
                };
                hasNew = true;
            });

            // Enrich all other cache entries from combinedData if they exist
            Object.keys(newCache).forEach(vin => {
                const vinUpper = vin.trim().toUpperCase();
                const matchedCar = combinedMap.get(vinUpper);
                if (matchedCar) {
                    const existing = newCache[vin];
                    const dXe = matchedCar.dong_xe || matchedCar['Dòng xe'] || existing.dong_xe;
                    const pBan = matchedCar.phien_ban || matchedCar['Phiên bản'] || existing.phien_ban;
                    const ext = matchedCar.ngoai_that || matchedCar['Màu ngoại thất'] || matchedCar['Ngoại thất'] || existing.ngoai_that;
                    const int = matchedCar.noi_that || matchedCar['Màu nội thất'] || matchedCar['Nội thất'] || existing.noi_that;
                    const tThai = matchedCar.trang_thai || matchedCar['Trạng thái'] || existing.trang_thai;
                    const tgNhap = matchedCar.thoi_gian_nhap || matchedCar['Thời gian nhập'] || matchedCar.updated_at || existing.thoi_gian_nhap;

                    if (existing.dong_xe !== dXe || existing.phien_ban !== pBan || existing.trang_thai !== tThai) {
                        newCache[vin] = {
                            ...existing,
                            dong_xe: String(dXe || ''),
                            phien_ban: String(pBan || ''),
                            ngoai_that: String(ext || ''),
                            noi_that: String(int || ''),
                            trang_thai: String(tThai || ''),
                            thoi_gian_nhap: tgNhap,
                            updated_at: new Date().toISOString()
                        };
                        hasNew = true;
                    }
                }
            });

            if (hasNew && isSynced) {
                localStorage.setItem('car_gps_cache', JSON.stringify(newCache));
                // Update persistent database cache
                updateAppSetting('car_gps_cache', newCache).catch(err => {
                    console.error('Failed to update DB GPS cache:', err);
                });
            }

            const activeVins = new Set(activeGpsCars.map(c => c.vin));

            // Chỉ hiển thị Lịch sử vị trí khi đã đồng bộ xong với DB để tránh hiện xe "ma" đã bị xoá
            const cachedGpsCars = isSynced 
                ? Object.values(newCache)
                    .filter((c: any) => {
                        if (activeVins.has(c.vin)) return false;
                        
                        const vinUpper = String(c.vin || '').trim().toUpperCase();
                        // Chỉ hiển thị Lịch sử vị trí nếu xe này vẫn còn trong Kho (combinedMap)
                        // hoặc là xe mới Xuất hóa đơn trong tháng này (invoicedMap)
                        return combinedMap.has(vinUpper) || invoicedMap.has(vinUpper);
                    })
                    .map((c: any) => {
                        const vinUpper = String(c.vin || '').trim().toUpperCase();
                        const matchedCar = combinedMap.get(vinUpper);
                        const invoicedInfo = invoicedMap.get(vinUpper);
                        
                        let trangThai = 'Lịch sử vị trí';
                        if (matchedCar) {
                            trangThai = matchedCar.trang_thai || matchedCar['Trạng thái'] || 'Chưa ghép';
                        } else if (invoicedInfo) {
                            trangThai = 'Đã xuất hóa đơn';
                        }

                        const ext = matchedCar?.ngoai_that || matchedCar?.['Ngoại thất'] || matchedCar?.['Màu ngoại thất'] || invoicedInfo?.['Ngoại thất'] || invoicedInfo?.ngoai_that || c.ngoai_that || '';
                        const int = matchedCar?.noi_that || matchedCar?.['Nội thất'] || matchedCar?.['Màu nội thất'] || invoicedInfo?.['Nội thất'] || invoicedInfo?.noi_that || c.noi_that || '';
                        const dXe = matchedCar?.dong_xe || matchedCar?.['Dòng xe'] || invoicedInfo?.['Dòng xe'] || invoicedInfo?.dong_xe || c.dong_xe || 'Khác';
                        const pBan = matchedCar?.phien_ban || matchedCar?.['Phiên bản'] || invoicedInfo?.['Phiên bản'] || invoicedInfo?.phien_ban || c.phien_ban || '';
                        const tvbh = matchedCar?.nguoi_giu_xe || matchedCar?.['Người Giữ Xe'] || invoicedInfo?.['Tên tư vấn bán hàng'] || invoicedInfo?.tvbh || c.nguoi_giu_xe || null;

                        return {
                            ...c,
                            trang_thai: trangThai,
                            ngoai_that: String(ext),
                            noi_that: String(int),
                            dong_xe: String(dXe),
                            phien_ban: String(pBan),
                            nguoi_giu_xe: tvbh
                        };
                    })
                : [];

            return [...activeGpsCars, ...cachedGpsCars];
        } catch (err) {
            console.error('Error parsing GPS cars:', err);
            return [];
        }
    }, [stockData, xuathoadonData, cachedGpsPositions]);

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
            let cars = allCarsWithGps.filter(car => {
                const vinStr = String(car.vin || '').toLowerCase();
                const modelStr = String(car.dong_xe || '').toLowerCase();
                const versionStr = String(car.phien_ban || '').toLowerCase();

                const matchesSearch = vinStr.includes(searchTerm.toLowerCase()) ||
                    modelStr.includes(searchTerm.toLowerCase()) ||
                    versionStr.includes(searchTerm.toLowerCase());
                const matchesModel = selectedModel === 'all' || car.dong_xe === selectedModel;
                const match = matchesSearch && matchesModel; return match; });
            // Lọc theo Geofencing (Polygon)
            if (polygonCoords && polygonCoords.length > 3) {
                try {
                    const turf = (window as any).turf;
                    if (turf) {
                        const searchPolygon = turf.polygon([polygonCoords]);
                        cars = cars.filter(car => {
                            const point = turf.point([car.lng, car.lat]);
                            return turf.booleanPointInPolygon(point, searchPolygon);
                        });
                    }
                } catch(e) { console.error("Turf error", e); }
            }
            return cars;

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
            }).fitBounds(vnBounds);
            hasFittedBounds.current = true;

            tileLayerRef.current = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                subdomains: 'abcd',
                maxZoom: 18
            }).addTo(mapInstance.current);

            tileLayerRef.current.on('load', () => setIsMapLoaded(true));
            // Initialize Marker Cluster Group
            markerClusterGroupRef.current = L.markerClusterGroup({
                showCoverageOnHover: false,
                spiderfyOnMaxZoom: true,
                maxClusterRadius: 60,
                iconCreateFunction: function (cluster: any) {
                    const childCount = cluster.getChildCount();
                    const markers = cluster.getAllChildMarkers();
                    let sold = 0;
                    let available = 0;
                    
                    markers.forEach((m: any) => {
                        const status = m.options.customStatus || '';
                        if (status === 'Chưa ghép') available++;
                        else sold++;
                    });
                    
                    const total = sold + available;
                    const availablePercent = (available / total) * 100;
                    
                    const html = `
                        <div style="width: 40px; height: 40px; border-radius: 50%; background: conic-gradient(#16a34a 0% ${availablePercent}%, #475569 ${availablePercent}% 100%); display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.3); border: 2px solid white;">
                            <div style="background: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 13px; color: #1e293b;">
                                ${childCount}
                            </div>
                        </div>
                    `;
                    return L.divIcon({ html: html, className: 'custom-cluster-icon', iconSize: L.point(40, 40) });
                }
            });
            mapInstance.current.addLayer(markerClusterGroupRef.current);

            // Initialize Draw Control
            drawnItemsRef.current = new L.FeatureGroup();
            mapInstance.current.addLayer(drawnItemsRef.current);
            
            const drawControl = new L.Control.Draw({
                draw: { marker: false, polyline: false, circle: false, rectangle: true, circlemarker: false, polygon: { allowIntersection: false, drawError: { color: '#e1e100', message: 'Không được cắt chéo' }, shapeOptions: { color: '#4f46e5' } } },
                edit: { featureGroup: drawnItemsRef.current, remove: true, edit: false }
            });
            mapInstance.current.addControl(drawControl);

            mapInstance.current.on(L.Draw.Event.CREATED, function (e: any) {
                drawnItemsRef.current.clearLayers();
                const layer = e.layer;
                drawnItemsRef.current.addLayer(layer);
                let latlngs;
                if (layer instanceof L.Polygon || layer instanceof L.Rectangle) {
                    latlngs = layer.getLatLngs()[0];
                    const coords = latlngs.map((ll: any) => [ll.lng, ll.lat]);
                    if (coords.length > 0) coords.push([...coords[0]]);
                    setPolygonCoords(coords);
                }
            });

            mapInstance.current.on(L.Draw.Event.DELETED, function () {
                setPolygonCoords(null);
            });

            const fallbackTimer = setTimeout(() => setIsMapLoaded(true), 1200);

            // Trigger size calculations
            setTimeout(() => mapInstance.current?.invalidateSize(), 50);
            setTimeout(() => mapInstance.current?.invalidateSize(), 150);
            setTimeout(() => mapInstance.current?.invalidateSize(), 300);

            navigator.geolocation.getCurrentPosition((pos) => {
                const userLat = pos.coords.latitude;
                const userLng = pos.coords.longitude;
                setUserLocation({lat: userLat, lng: userLng});
                if (!mapInstance.current) return;

                const userIcon = L.divIcon({
                    html: `
                        <div style="position: relative; width: 24px; height: 24px;">
                            <div style="position: absolute; top: 0; left: 0; width: 24px; height: 24px; background: rgba(59, 130, 246, 0.4); border-radius: 50%; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                            <div style="position: absolute; top: 4px; left: 4px; width: 16px; height: 16px; background: #3b82f6; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(0,0,0,0.35);"></div>
                        </div>
                    `,
                    className: '',
                    iconSize: [24, 24]
                });

                if (userMarkerRef.current) {
                    userMarkerRef.current.remove();
                }

                userMarkerRef.current = L.marker([userLat, userLng], { icon: userIcon })
                    .addTo(mapInstance.current)
                    .bindPopup('<div style="font-size:12px; font-weight:bold; color:#1e293b; padding:2px;">📍 Vị trí của bạn</div>');
            }, (err) => {
                console.error('User denied location access or error occurred:', err);
            });

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

    useEffect(() => {
        try {
            if (!mapInstance.current || !tileLayerRef.current) return;
            const L = (window as any).L;
            if (!L) return;

            if (mapType === 'satellite') {
                tileLayerRef.current.setUrl('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}');
                if (labelLayerRef.current) {
                    labelLayerRef.current.setUrl('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png');
                } else {
                    labelLayerRef.current = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
                        subdomains: 'abcd',
                        maxZoom: 18
                    }).addTo(mapInstance.current);
                }
            } else {
                // Minimalist mode
                tileLayerRef.current.setUrl('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png');
                if (labelLayerRef.current) {
                    labelLayerRef.current.remove();
                    labelLayerRef.current = null;
                }
            }
        } catch (err) {
            console.error('Error switching map mode:', err);
        }
    }, [mapType]);

    // Draw markers
    useEffect(() => {
        try {
            const L = (window as any).L;
            if (!L || !mapInstance.current) return;

            (window as any).copyVinFromMap = (vin: string, id: string) => {
                navigator.clipboard.writeText(vin);
                const el = document.getElementById(id);
                if (el) {
                    const originalHtml = el.innerHTML;
                    el.innerHTML = 'Đã copy VIN! 🎉';
                    el.style.color = '#16a34a';
                    el.style.borderColor = '#22c55e';
                    setTimeout(() => {
                        el.innerHTML = originalHtml;
                        el.style.color = '#1e1b4b';
                        el.style.borderColor = '#94a3b8';
                    }, 1200);
                }
            };
            (window as any).copyAddressFromMap = (id: string) => {
                const el = document.getElementById(id);
                if (el) {
                    const originalHtml = el.innerHTML;
                    const textToCopy = el.innerText;
                    navigator.clipboard.writeText(textToCopy);
                    el.innerHTML = '<span style="color: #16a34a; font-weight: bold;">Đã copy địa chỉ! 🎉</span>';
                    setTimeout(() => {
                        el.innerHTML = originalHtml;
                    }, 1200);
                }
            };

            const getPopupContentForCar = (car: any, isRouted: boolean, rInfo: any, isDrawing: boolean) => {
                const popupId = `popup-vin-${car.vin}`;
                const vinElId = `vin-el-${car.vin}`;
                const bgClass = car.trang_thai === 'Chưa ghép' ? 'background: #f0fdf4; color: #16a34a; border: 1px solid #dcfce7;' : car.trang_thai === 'Đã ghép' ? 'background: #eff6ff; color: #2563eb; border: 1px solid #dbeafe;' : car.trang_thai === 'Lịch sử vị trí' ? 'background: #faf5ff; color: #9333ea; border: 1px solid #f3e8ff;' : 'background: #f8fafc; color: #475569; border: 1px solid #e2e8f0;';

                return `
                    <div style="min-width: 220px; font-family: sans-serif; padding: 4px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                            <span style="font-size: 11px; font-weight: bold; color: #4f46e5; text-transform: uppercase;">${car.dong_xe}</span>
                            <span style="font-size: 10px; ${bgClass} padding: 2px 6px; border-radius: 6px; font-weight: bold;">${car.trang_thai}</span>
                        </div>
                        <div style="font-size: 13px; font-weight: bold; color: #111827; margin-bottom: 4px;">${car.phien_ban}</div>
                        <div 
                            id="${vinElId}"
                            onclick="event.stopPropagation(); window.copyVinFromMap('${car.vin}', '${vinElId}')" 
                            title="Click để copy số VIN" 
                            style="font-size: 13px; font-family: monospace; color: #1e1b4b; font-weight: 900; margin-bottom: 8px; cursor: pointer; letter-spacing: 0.5px; background: #f1f5f9; padding: 4px 6px; border-radius: 6px; border: 1px dashed #94a3b8; display: inline-block; transition: all 0.2s;"
                        >
                            VIN: ${car.vin}
                        </div>
                        <div 
                            onclick="event.stopPropagation(); window.copyAddressFromMap('${popupId}')" 
                            title="Click để copy địa chỉ"
                            style="font-size: 11px; color: #1f2937; line-height: 1.4; border-top: 1px solid #e5e7eb; padding-top: 6px; margin-top: 4px; cursor: pointer;"
                        >
                            📍 <strong>Địa chỉ:</strong>
                            <span id="${popupId}" style="display: block; color: #374151; margin-top: 2px; font-style: italic; text-decoration: underline dashed 1px #cbd5e1;">Đang lấy địa chỉ...</span>
                        </div>
                        <div style="border-top: 1px solid #f1f5f9; padding-top: 8px; margin-top: 10px; display: flex; flex-direction: column; gap: 6px; justify-content: center;">
                            ${isRouted ? `
                            <div style="font-size: 11px; font-weight: bold; color: #4338ca; text-align: center; display: flex; align-items: center; justify-content: center; gap: 4px; background: #e0e7ff; padding: 4px 8px; border-radius: 6px;">
                                🏁 <span>${rInfo ? `${rInfo.distance} • ${rInfo.duration}` : 'Đang tính...'}</span>
                            </div>
                            <button 
                                onclick="event.stopPropagation(); window.clearRouteFromMap('${car.vin}');"
                                style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px; background: #ef4444; color: white; border: none; padding: 6px 12px; border-radius: 8px; font-weight: bold; font-size: 11px; cursor: pointer; transition: all 0.2s;"
                            >
                                ❌ Hủy chỉ đường
                            </button>
                            ` : `
                            <button 
                                id="draw-route-btn-${car.vin}"
                                onclick="event.stopPropagation(); window.drawRouteOnMap(${car.lat}, ${car.lng}, '${car.vin}');"
                                ${isDrawing ? 'disabled' : ''}
                                style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px; background: ${isDrawing ? '#94a3b8' : '#16a34a'}; color: white; border: none; padding: 6px 12px; border-radius: 8px; font-weight: bold; font-size: 11px; cursor: ${isDrawing ? 'not-allowed' : 'pointer'}; transition: all 0.2s;"
                            >
                                ${isDrawing ? '⏳ Đang tính...' : '🗺️ Chỉ đường'}
                            </button>
                            `}
                        </div>
                    </div>
                `;
            };

            (window as any).clearRouteFromMap = (vin?: string) => {
                if (routePolylineRef.current) {
                    routePolylineRef.current.remove();
                    routePolylineRef.current = null;
                }
                const prevRoutedVin = routedVin;
                setRoutedVin(null);
                setRouteInfo(null);
                showToast('Đã Xóa', 'Đã xóa đường đi trên bản đồ.', 'info');

                const targetVin = vin || prevRoutedVin;
                if (targetVin && markersRef.current[targetVin]) {
                    const carObj = allCarsWithGps.find(c => c.vin === targetVin);
                    if (carObj) {
                        markersRef.current[targetVin].setPopupContent(getPopupContentForCar(carObj, false, null, false));
                    }
                }
            };

            (window as any).drawRouteOnMap = (carLat: number, carLng: number, vin: string) => {
                if (!mapInstance.current) return;
                setIsDrawingRoute(vin);
                const btn = document.getElementById(`draw-route-btn-${vin}`);
                if (btn) {
                    (btn as any).disabled = true;
                    btn.style.background = '#94a3b8';
                    btn.style.cursor = 'not-allowed';
                    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> <span>Đang tính...</span>';
                }
                navigator.geolocation.getCurrentPosition(async (pos) => {
                    const userLat = pos.coords.latitude;
                    const userLng = pos.coords.longitude;
                    try {
                        const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${userLng},${userLat};${carLng},${carLat}?overview=full&geometries=geojson`);
                        if (res.ok) {
                            const data = await res.json();
                            if (data.routes && data.routes.length > 0) {
                                const route = data.routes[0];
                                const coordinates = route.geometry.coordinates;
                                const latLngs = coordinates.map((coord: any) => [coord[1], coord[0]]);

                                const L = (window as any).L;
                                if (!L) return;

                                if (routePolylineRef.current) {
                                    routePolylineRef.current.remove();
                                }

                                const distanceInKm = route.distance / 1000;
                                const distance = distanceInKm.toFixed(1);
                                const duration = Math.max(Math.round(route.duration / 60 * 1.6), Math.round(distanceInKm * 2.2));

                                routePolylineRef.current = L.polyline(latLngs, {
                                    color: '#4f46e5',
                                    weight: 5,
                                    opacity: 0.8,
                                    lineJoin: 'round'
                                }).addTo(mapInstance.current);

                                routePolylineRef.current.bindTooltip(
                                    `<div class="bg-indigo-600 text-white font-black text-[11px] px-3 py-1.5 rounded-xl flex items-center justify-center gap-1 border border-indigo-500/30 select-none shadow-md whitespace-nowrap animate-fade-in" style="pointer-events: none;">
                                        <i class="fa-solid fa-route text-xs flex-shrink-0"></i>
                                        <span>${distance} km • ${duration} phút</span>
                                    </div>`,
                                    {
                                        permanent: true,
                                        direction: 'center',
                                        className: 'leaflet-route-tooltip'
                                    }
                                ).openTooltip();

                                mapInstance.current.fitBounds(L.latLngBounds([[userLat, userLng], [carLat, carLng]]), { padding: [50, 50] });

                                showToast('Thành Công', 'Đã vẽ đường đi đến xe!', 'success');
                                setRoutedVin(vin);
                                setRouteInfo({ distance: `${distance} km`, duration: `${duration} phút` });

                                if (markersRef.current[vin]) {
                                    const carObj = allCarsWithGps.find(c => c.vin === vin);
                                    if (carObj) {
                                        markersRef.current[vin].setPopupContent(getPopupContentForCar(carObj, true, { distance: `${distance} km`, duration: `${duration} phút` }, false));
                                    }
                                }
                            }
                        } else {
                            showToast('Lỗi', 'Không thể lấy thông tin chỉ đường.', 'error');
                        }
                    } catch (e) {
                        showToast('Lỗi', 'Lỗi khi kết nối với máy chủ chỉ đường.', 'error');
                    } finally {
                        setIsDrawingRoute(null);
                    }
                }, () => {
                    showToast('Cần cấp quyền', 'Vui lòng cho phép truy cập vị trí trên trình duyệt của bạn.', 'warning');
                    setIsDrawingRoute(null);
                });
            };

            const newMarkers: Record<string, any> = {};
            const currentVinSet = new Set(filteredCars.map(c => c.vin));

            // 1. Dọn dẹp: Xóa bỏ những marker không còn tồn tại trong dữ liệu mới
            Object.keys(markersRef.current).forEach(vin => {
                if (!currentVinSet.has(vin)) {
                    if (markerClusterGroupRef.current) markerClusterGroupRef.current.removeLayer(markersRef.current[vin]); delete markersRef.current[vin];
                }
            });

            if (filteredCars.length === 0) {
                markersRef.current = {};
                return;
            }

            // 2. Vẽ/Cập nhật markers một cách thông minh (Smart Reconciliation)
            filteredCars.forEach(car => {
                const popupId = `popup-vin-${car.vin}`;
                const isCarRouted = car.vin === routedVin;
                const isDrawing = isDrawingRoute === car.vin;

                const popupContent = getPopupContentForCar(car, isCarRouted, isCarRouted ? routeInfo : null, isDrawing);
                const carImgUrl = getCarImage(car.dong_xe, car.ngoai_that);
                const isHovered = hoveredVin === car.vin;
                const statusColor = car.trang_thai === 'Chưa ghép' ? '#16a34a' : car.trang_thai === 'Đã ghép' ? '#2563eb' : car.trang_thai === 'Đang giữ' ? '#4f46e5' : car.trang_thai === 'Lịch sử vị trí' ? '#9333ea' : '#475569';
                const pulseHtml = isHovered ? `<div style="position: absolute; width: 64px; height: 64px; top: -7px; left: -10px; border-radius: 50%; background: ${statusColor}; opacity: 0.6; animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>` : '';

                const carIcon = L.divIcon({
                    html: `
                    <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 44px; height: 50px; transition: transform 0.2s;" class="${isHovered ? 'scale-125 z-50' : 'hover:scale-110'}">
                        ${pulseHtml} <div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; --pulse-color: ${statusColor}55; animation: markerPulse 2.2s infinite ease-in-out; opacity: 0; top: 0; pointer-events: none;"></div>
                        <div style="background: white; width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.22); border: 2.5px solid ${statusColor}; padding: 2px; position: relative; z-index: 2;">
                            <img src="${carImgUrl}" style="width: 100%; height: 100%; object-fit: contain;" alt="${car.dong_xe}" />
                        </div>
                        <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 6px solid ${statusColor}; margin-top: -2px; position: relative; z-index: 2;"></div>
                    </div>`,
                    className: '',
                    iconSize: [44, 50],
                    iconAnchor: [22, 50],
                    popupAnchor: [0, -50]
                });

                let existingMarker = markersRef.current[car.vin];

                if (existingMarker) {
                    // TẬN DỤNG LẠI MARKER CŨ: Chỉ cập nhật thuộc tính, KHÔNG vẽ lại toàn bộ
                    const currentLatLng = existingMarker.getLatLng();
                    if (currentLatLng.lat !== car.lat || currentLatLng.lng !== car.lng) {
                        existingMarker.setLatLng([car.lat, car.lng]);
                    }
                    
                    // Cập nhật Icon và Content nếu có sự thay đổi (tránh nhấp nháy)
                    if (existingMarker.options.isHovered !== isHovered || existingMarker.options.customStatus !== car.trang_thai) {
                        existingMarker.setIcon(carIcon);
                        existingMarker.options.isHovered = isHovered;
                        existingMarker.options.customStatus = car.trang_thai;
                    }
                    
                    // Cập nhật popup content
                    if (existingMarker.options.popupContent !== popupContent) {
                        existingMarker.setPopupContent(popupContent);
                        existingMarker.options.popupContent = popupContent;
                    }

                    newMarkers[car.vin] = existingMarker;
                } else {
                    // MARKER MỚI HOÀN TOÀN
                    const marker = L.marker([car.lat, car.lng], { icon: carIcon })
                        .bindPopup(popupContent);

                    marker.on('popupopen', () => {
                        resolveAddress(car.lat, car.lng, car.vin, popupId);
                    });

                    marker.options.customStatus = car.trang_thai; 
                    marker.options.isHovered = isHovered;
                    marker.options.popupContent = popupContent;

                    if(markerClusterGroupRef.current) markerClusterGroupRef.current.addLayer(marker); 
                    newMarkers[car.vin] = marker;
                }
            });

            // Cập nhật lại registry tham chiếu
            markersRef.current = newMarkers;

            // Fit bounds exactly once
            if (allCarsWithGps.length > 0 && !hasFittedBounds.current) {
                hasFittedBounds.current = true;
                const bounds = allCarsWithGps.map(c => [c.lat, c.lng]);
                mapInstance.current.fitBounds(bounds, { padding: [50, 50] });
            }
        } catch (err) {
            console.error('Error drawing markers:', err);
        }
    }, [filteredCars, isMapLoaded, routedVin, routeInfo, isDrawingRoute, hoveredVin]);

    
    // Auto-focus target VIN when arriving from deep link or external click
    useEffect(() => {
        if (!targetVinOnMap || !isMapLoaded) return;

        let retryCount = 0;
        const maxRetries = 20; // Chờ tối đa 2 giây

        const tryFocusMarker = () => {
            if (mapInstance.current && markersRef.current && markersRef.current[targetVinOnMap]) {
                console.log(`[MapView] Auto-focusing target marker: ${targetVinOnMap}`);
                const marker = markersRef.current[targetVinOnMap];
                
                // Cho dừng mọi animation đang chạy
                mapInstance.current.stop();
                
                if (markerClusterGroupRef.current) {
                    markerClusterGroupRef.current.zoomToShowLayer(marker, () => {
                        marker.openPopup();
                    });
                } else {
                    const latLng = marker.getLatLng();
                    mapInstance.current.setView(latLng, 16, { animate: true });
                    setTimeout(() => {
                        marker.openPopup();
                    }, 300);
                }

                if (onClearTargetVinOnMap) {
                    onClearTargetVinOnMap();
                }
                return true;
            }
            return false;
        };

        // Thử lần đầu ngay lập tức
        if (tryFocusMarker()) return;

        // Nếu chưa có marker (do map vẽ chậm), thử lại mỗi 100ms
        const interval = setInterval(() => {
            retryCount++;
            if (tryFocusMarker() || retryCount >= maxRetries) {
                clearInterval(interval);
                if (retryCount >= maxRetries && onClearTargetVinOnMap) {
                    console.warn(`[MapView] Failed to auto-focus marker ${targetVinOnMap} after timeout.`);
                    onClearTargetVinOnMap(); // Dọn sạch cờ để ko bị kẹt
                }
            }
        }, 100);

        return () => clearInterval(interval);
    }, [targetVinOnMap, allCarsWithGps, isMapLoaded, onClearTargetVinOnMap]);

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
        
        const marker = markersRef.current[car.vin];
        if (marker && markerClusterGroupRef.current) {
            markerClusterGroupRef.current.zoomToShowLayer(marker, () => {
                marker.openPopup();
            });
        } else {
            mapInstance.current.flyTo([car.lat, car.lng], 16, { animate: true, duration: 1 });
            if (marker) {
                setTimeout(() => {
                    marker.openPopup();
                }, 1000);
            }
        }
    };

    return (
        <div className="flex flex-col md:flex-row overflow-hidden bg-slate-50 w-full border border-slate-200/60 rounded-2xl h-[calc(100vh-130px)] md:h-[calc(100vh-86px)]">
            <style>{`
                .leaflet-route-tooltip {
                    background: transparent !important;
                    border: none !important;
                    box-shadow: none !important;
                    padding: 0 !important;
                    pointer-events: none !important;
                }
                .leaflet-route-tooltip::before {
                    display: none !important;
                }
                @keyframes markerPulse {
                    0% {
                        transform: scale(0.9);
                        box-shadow: 0 0 0 0px var(--pulse-color, rgba(99, 102, 241, 0.4));
                        opacity: 0.9;
                    }
                    100% {
                        transform: scale(1.6);
                        box-shadow: 0 0 0 14px rgba(99, 102, 241, 0);
                        opacity: 0;
                    }
                }
            `}</style>
            {/* Map Area */}
            <div className="flex-1 h-1/2 md:h-full relative min-h-[300px] md:min-h-0">
                <div ref={mapRef} className="w-full h-full bg-white" />
                
                {/* Map Type Toggle Button */}
                <div className="absolute top-4 right-4 z-[400] bg-white p-1 rounded-xl shadow-lg border border-slate-200/80 flex gap-1 select-none">
                    <button 
                        onClick={() => setMapType('satellite')}
                        className={`text-[10px] font-black px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${mapType === 'satellite' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <i className="fa-solid fa-satellite"></i>
                        <span>VỆ TINH</span>
                    </button>
                    <button 
                        onClick={() => setMapType('standard')}
                        className={`text-[10px] font-black px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${mapType === 'standard' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <i className="fa-solid fa-map"></i>
                        <span>MINIMALIST</span>
                    </button>
                </div>

                {/* Map Control Buttons */}
                <div className="absolute top-16 right-4 z-[400] flex flex-col gap-2 select-none">
                    <button 
                        onClick={() => {
                            if (!mapInstance.current) return;
                            navigator.geolocation.getCurrentPosition((pos) => {
                                mapInstance.current.flyTo([pos.coords.latitude, pos.coords.longitude], 15, { animate: true, duration: 1.2 });
                            });
                        }}
                        title="Vị trí của tôi"
                        className="bg-white hover:bg-slate-50 text-indigo-600 shadow-md border border-slate-200/80 w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer"
                    >
                        <i className="fa-solid fa-crosshairs text-base"></i>
                    </button>

                    <button 
                        onClick={() => {
                            if (!mapInstance.current || allCarsWithGps.length === 0) return;
                            const bounds = allCarsWithGps.map(c => [c.lat, c.lng]);
                            const L = (window as any).L;
                            if (L) {
                                mapInstance.current.fitBounds(L.latLngBounds(bounds), { padding: [50, 50] });
                            }
                        }}
                        title="Xem toàn bộ xe"
                        className="bg-white hover:bg-slate-50 text-indigo-600 shadow-md border border-slate-200/80 w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer"
                    >
                        <i className="fa-solid fa-expand text-base"></i>
                    </button>

                    {routedVin && (
                        <div className="flex flex-col items-end gap-2">
                            <button 
                                onClick={() => {
                                    if (routePolylineRef.current) {
                                        routePolylineRef.current.remove();
                                        routePolylineRef.current = null;
                                    }
                                    setRoutedVin(null);
                                    setRouteInfo(null);
                                    showToast('Đã Xóa', 'Đã xóa đường đi trên bản đồ.', 'info');
                                }}
                                title="Xóa đường đi"
                                className="bg-red-50 hover:bg-red-100 text-red-600 shadow-md border border-red-200/80 w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer animate-fade-in"
                            >
                                <i className="fa-solid fa-trash-can text-base"></i>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Sidebar Car List */}
            <div className="bg-white flex flex-col h-1/2 md:h-full w-full md:w-[380px] md:min-w-[380px] flex-shrink-0 shadow-sm z-10 border-t md:border-t-0 md:border-l border-slate-200/80">
                {/* Header */}
                <div className="p-4 bg-slate-50/70 border-b border-slate-200/80 space-y-3">
                    <div className="flex justify-between items-center">
                        <h2 className="text-sm font-black text-slate-800 flex items-center gap-2">
                            <i className="fa-solid fa-map-location-dot text-indigo-600"></i>
                            <span>Vị Trí Xe</span>
                            <button 
                                onClick={async () => {
                                    if (!_refetchStock) return;
                                    setIsRefreshing(true);
                                    try {
                                        await Promise.all([
                                            _refetchStock(),
                                            fetchDBCache()
                                        ]);
                                        showToast('Thành công', 'Đã làm mới dữ liệu vị trí xe.', 'success');
                                    } catch (err) {
                                        showToast('Lỗi', 'Không thể tải lại dữ liệu.', 'error');
                                    } finally {
                                        setIsRefreshing(false);
                                    }
                                }}
                                title="Tải lại dữ liệu xe"
                                className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50/60 p-1.5 rounded-lg transition-all"
                            >
                                <i className={`fa-solid fa-arrows-rotate ${isRefreshing ? 'fa-spin' : ''}`}></i>
                            </button>
                            {!isReferenceAccount && (
                                <button 
                                    onClick={() => {
                                        hasCleanedGhosts.current = false;
                                        fetchDBCache();
                                        showToast('Hệ thống', 'Đang quét và dọn dẹp các vị trí xe cũ...', 'info');
                                    }}
                                    title="Dọn dẹp xe ma (VIN không tồn tại)"
                                    className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50/60 p-1.5 rounded-lg transition-all"
                                >
                                    <i className="fa-solid fa-broom"></i>
                                </button>
                            )}
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
                <div className="flex-1 overflow-y-auto divide-y divide-slate-200/80 p-2 space-y-0.5">
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
                                    className={`p-3 flex items-center transition-all border rounded-xl cursor-pointer ${!isMapLoaded ? 'opacity-90' : 'hover:bg-indigo-50/20 bg-white hover:border-indigo-100/60 hover:shadow-sm border-slate-200'}`}
                                >
                                    {/* Column 1: Car Model */}
                                    <div className="w-[24%] min-w-0 pr-2 border-r border-slate-200 h-full flex flex-col justify-center">
                                        <p className="text-[11px] font-black text-slate-800 truncate leading-tight" title={car.dong_xe}>
                                            {car.dong_xe}
                                        </p>
                                        <p className="text-[9px] text-slate-400 font-medium truncate mt-0.5" title={car.phien_ban}>
                                            {car.phien_ban}
                                        </p>
                                    </div>

                                    {/* Column 2: VIN & Color */}
                                    <div className="w-[44%] min-w-0 px-2.5 border-r border-slate-200 h-full flex flex-col justify-center">
                                        <p className="text-xs font-mono font-black text-slate-800 uppercase tracking-wider select-all truncate" title={car.vin}>
                                            {car.vin}
                                        </p>
                                        <p className="text-[9px] text-slate-400 truncate mt-0.5" title={`${car.ngoai_that} / ${car.noi_that}`}>
                                            {car.ngoai_that}
                                        </p>
                                    </div>

                                    {/* Column 3: Button */}
                                    <div className="w-[32%] min-w-0 pl-2.5 flex flex-col items-end flex-shrink-0 h-full justify-center">
                                        <div className="flex flex-col gap-1 items-end">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setCarToShare(car);
                                                    setIsShareModalOpen(true);
                                                }}
                                                className="text-[9px] font-black bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white px-2.5 py-1 rounded-lg flex items-center justify-center gap-1 transition-all border border-indigo-100/40 w-max cursor-pointer"
                                            >
                                                <i className="fa-solid fa-share-nodes text-[8px]"></i>
                                                <span>Chia sẻ</span>
                                            </button>
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

            {isShareModalOpen && carToShare && (
                <ShareSidePanel 
                    car={carToShare} 
                    onClose={() => {
                        setIsShareModalOpen(false);
                        setCarToShare(null);
                    }} 
                    showToast={showToast}
                />
            )}
        </div>
    );
};

export default React.memo(MapView);
