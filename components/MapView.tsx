import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { getCarImage, getBackgroundColorStyle } from '../utils/styleUtils';
import { getAppSetting, updateAppSetting, supabase } from '../services/apiService';
import moment from 'moment';
import 'moment/locale/vi';
import ShareSidePanel from './modals/ShareSidePanel';
import { reverseGeocode } from '../utils/geocodeUtils';
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
    onSelectVin?: (vin: string) => void;
    hideSidebar?: boolean;
}

const TOMTOM_KEY = 'WbsnHpupuR5dtk36955dkSQVG5QKZ21d';

const MapView: React.FC<MapViewProps> = ({ stockData, xuathoadonData = [], refetchStock: _refetchStock, showToast, currentUser: _currentUser, targetVinOnMap, onClearTargetVinOnMap, isReferenceAccount, onSelectVin, hideSidebar = false }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedModel, setSelectedModel] = useState('all');
    const [selectedColor, setSelectedColor] = useState('all');
    const [mapType, setMapType] = useState<'satellite' | 'standard'>('standard');
    const [showTraffic, setShowTraffic] = useState<boolean>(true);
    const [showIncidents, setShowIncidents] = useState<boolean>(true);
    const [isTrafficMenuOpen, setIsTrafficMenuOpen] = useState<boolean>(false);
    const [isMapLoaded, setIsMapLoaded] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
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
    const [, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

    const [carToShare, setCarToShare] = useState<any>(null);

    const mapRef = useRef<HTMLDivElement | null>(null);
    const mapInstance = useRef<any>(null);
    const markersRef = useRef<Record<string, any>>({});
    const tileLayerRef = useRef<any>(null);
    const trafficLayerRef = useRef<any>(null);
    const incidentsLayerRef = useRef<any>(null);
    const labelLayerRef = useRef<any>(null);
    const userMarkerRef = useRef<any>(null);
    const markerClusterGroupRef = useRef<any>(null);

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

    const carColors = useMemo(() => {
        try {
            const colors = allCarsWithGps.map(car => car.ngoai_that).filter(Boolean);
            return Array.from(new Set(colors)).sort();
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
                const matchesColor = selectedColor === 'all' || car.ngoai_that === selectedColor;
                const match = matchesSearch && matchesModel && matchesColor; return match; });
            return cars;

        } catch (err) {
            return [];
        }
    }, [allCarsWithGps, searchTerm, selectedModel, selectedColor]);

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

            tileLayerRef.current = L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
                maxZoom: 20
            }).addTo(mapInstance.current);

            tileLayerRef.current.on('load', () => setIsMapLoaded(true));
            // Initialize Marker Cluster Group
            markerClusterGroupRef.current = L.markerClusterGroup({
                showCoverageOnHover: false,
                spiderfyOnMaxZoom: true,
                disableClusteringAtZoom: 1,  // Không bao giờ gom cluster, luôn hiển thị từng xe riêng
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



            const fallbackTimer = setTimeout(() => setIsMapLoaded(true), 1200);

            // Trigger size calculations
            setTimeout(() => mapInstance.current?.invalidateSize(), 50);
            setTimeout(() => mapInstance.current?.invalidateSize(), 150);
            setTimeout(() => mapInstance.current?.invalidateSize(), 300);
            setTimeout(() => mapInstance.current?.invalidateSize(), 800);

            // ResizeObserver: tự động invalidate khi container xuất hiện trong split-screen
            let resizeObserver: ResizeObserver | null = null;
            if (mapRef.current && typeof ResizeObserver !== 'undefined') {
                resizeObserver = new ResizeObserver((entries) => {
                    for (const entry of entries) {
                        const { width, height } = entry.contentRect;
                        if (width > 0 && height > 0 && mapInstance.current) {
                            mapInstance.current.invalidateSize();
                        }
                    }
                });
                resizeObserver.observe(mapRef.current);
            }

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
                if (resizeObserver) {
                    resizeObserver.disconnect();
                }
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
                tileLayerRef.current.setUrl('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}');
                if (labelLayerRef.current) {
                    labelLayerRef.current.remove();
                    labelLayerRef.current = null;
                }
            } else {
                tileLayerRef.current.setUrl('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}');
                if (labelLayerRef.current) {
                    labelLayerRef.current.remove();
                    labelLayerRef.current = null;
                }
            }
        } catch (err) {
            console.error('Error switching map mode:', err);
        }
    }, [mapType]);

    // TomTom Realtime Traffic Flow & Incidents
    useEffect(() => {
        if (!mapInstance.current) return;
        const L = (window as any).L;
        if (!L) return;

        // Manage Traffic Flow Layer
        if (showTraffic) {
            if (!trafficLayerRef.current) {
                trafficLayerRef.current = L.tileLayer(
                    `https://api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?key=${TOMTOM_KEY}`,
                    { maxZoom: 18, opacity: 0.85, zIndex: 50 }
                );
            }
            if (!mapInstance.current.hasLayer(trafficLayerRef.current)) {
                trafficLayerRef.current.addTo(mapInstance.current);
            }
        } else if (trafficLayerRef.current && mapInstance.current.hasLayer(trafficLayerRef.current)) {
            trafficLayerRef.current.remove();
        }

        // Manage Traffic Incidents Layer
        if (showIncidents) {
            if (!incidentsLayerRef.current) {
                incidentsLayerRef.current = L.tileLayer(
                    `https://api.tomtom.com/traffic/map/4/tile/incidents/s0/{z}/{x}/{y}.png?key=${TOMTOM_KEY}`,
                    { maxZoom: 18, opacity: 0.95, zIndex: 60 }
                );
            }
            if (!mapInstance.current.hasLayer(incidentsLayerRef.current)) {
                incidentsLayerRef.current.addTo(mapInstance.current);
            }
        } else if (incidentsLayerRef.current && mapInstance.current.hasLayer(incidentsLayerRef.current)) {
            incidentsLayerRef.current.remove();
        }
    }, [showTraffic, showIncidents, isMapLoaded]);

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

            (window as any).shareCarFromMap = (vin: string) => {
                const targetVin = (vin || '').trim().toUpperCase();
                if (!targetVin) return;

                const shareUrl = `${window.location.origin}${window.location.pathname}?vin=${targetVin}`;
                navigator.clipboard.writeText(shareUrl).catch(() => {});

                const infoEl = document.getElementById(`popup-body-info-${targetVin}`);
                const qrEl = document.getElementById(`popup-body-qr-${targetVin}`);
                if (infoEl) infoEl.style.display = 'none';
                if (qrEl) qrEl.style.display = 'flex';

                // Auto-center map on the marker & offset popup to the exact middle of screen
                const marker = markersRef.current[targetVin] || Object.values(markersRef.current).find((m: any) => m.options?.carVin === targetVin);
                if (marker && mapInstance.current) {
                    const latLng = marker.getLatLng();
                    mapInstance.current.panTo(latLng, { animate: true });
                    setTimeout(() => {
                        if (mapInstance.current) {
                            mapInstance.current.panBy([0, -145], { animate: true });
                        }
                    }, 50);
                }
            };

            (window as any).showInfoInPopup = (vin: string) => {
                const targetVin = (vin || '').trim().toUpperCase();
                const infoEl = document.getElementById(`popup-body-info-${targetVin}`);
                const qrEl = document.getElementById(`popup-body-qr-${targetVin}`);
                if (infoEl) infoEl.style.display = 'flex';
                if (qrEl) qrEl.style.display = 'none';
            };

            (window as any).copyShareUrlFromPopup = (vin: string, urlEncoded: string) => {
                const url = decodeURIComponent(urlEncoded);
                navigator.clipboard.writeText(url).catch(() => {});

                const btnEl = document.getElementById(`btn-copy-qr-${vin}`);
                const textEl = document.getElementById(`text-copy-qr-${vin}`);
                if (btnEl && textEl) {
                    const originalText = textEl.innerHTML;
                    const originalBg = btnEl.style.background;
                    btnEl.style.background = 'linear-gradient(135deg,#16a34a 0%,#15803d 100%)';
                    textEl.innerHTML = '✓ Đã copy link!';
                    setTimeout(() => {
                        if (btnEl && textEl) {
                            btnEl.style.background = originalBg;
                            textEl.innerHTML = originalText;
                        }
                    }, 1800);
                }
            };

            const getPopupContentForCar = (car: any) => {
                const popupId = `popup-vin-${car.vin}`;
                const vinElId = `vin-el-${car.vin}`;
                const carImgUrl = getCarImage(car.dong_xe, car.ngoai_that);
                const shareUrl = `${window.location.origin}${window.location.pathname}?vin=${car.vin}`;

                const statusColor = car.trang_thai === 'Chưa ghép' ? '#16a34a'
                    : car.trang_thai === 'Đã ghép' ? '#2563eb'
                    : car.trang_thai === 'Đang giữ' ? '#4f46e5'
                    : car.trang_thai === 'Lịch sử vị trí' ? '#9333ea'
                    : '#64748b';
                const statusBg = car.trang_thai === 'Chưa ghép' ? '#f0fdf4'
                    : car.trang_thai === 'Đã ghép' ? '#eff6ff'
                    : car.trang_thai === 'Đang giữ' ? '#eef2ff'
                    : car.trang_thai === 'Lịch sử vị trí' ? '#faf5ff'
                    : '#f8fafc';

                const formatTime = (t: any) => {
                    if (!t) return 'Không rõ';
                    const dt = new Date(t);
                    if (isNaN(dt.getTime())) return String(t);
                    const h = dt.getHours(), m = dt.getMinutes(), d = dt.getDate(), mo = dt.getMonth() + 1;
                    return (h < 10 ? '0' + h : h) + ':' + (m < 10 ? '0' + m : m) + ' • ' + (d < 10 ? '0' + d : d) + '/' + (mo < 10 ? '0' + mo : mo);
                };
                const updateTimeStr = car.updated_at ? formatTime(car.updated_at) : 'Chưa rõ';

                return `
                    <div style="width:215px;font-family:'Segoe UI',system-ui,sans-serif;border-radius:14px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.13);background:#fff;">
                        <!-- Header: ảnh xe + gradient -->
                        <div style="position:relative;background:linear-gradient(135deg,#1e293b 0%,#334155 100%);padding:12px 12px 10px;display:flex;align-items:center;gap:10px;">
                            <div style="width:52px;height:52px;border-radius:12px;background:rgba(255,255,255,0.12);backdrop-filter:blur(4px);border:1.5px solid rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;">
                                <img src="${carImgUrl}" style="width:100%;height:100%;object-fit:contain;" alt="${car.dong_xe}" />
                            </div>
                            <div style="flex:1;min-width:0;">
                                <div style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.55);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:2px;">${car.dong_xe}</div>
                                <div style="font-size:13px;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${car.phien_ban || '—'}</div>
                                <div style="margin-top:5px;">
                                    <span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;background:${statusBg};color:${statusColor};">
                                        <span style="width:6px;height:6px;border-radius:50%;background:${statusColor};display:inline-block;"></span>
                                        ${car.trang_thai}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <!-- Body 1: Info View -->
                        <div id="popup-body-info-${car.vin}" style="padding:10px 12px;display:flex;flex-direction:column;gap:8px;">
                            <!-- VIN chip -->
                            <div
                                id="${vinElId}"
                                onclick="event.stopPropagation();window.copyVinFromMap('${car.vin}','${vinElId}')"
                                title="Click để copy VIN"
                                style="display:flex;align-items:center;gap:6px;background:#f1f5f9;border:1px dashed #94a3b8;border-radius:8px;padding:5px 8px;cursor:pointer;transition:background 0.2s;"
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                                <span style="font-size:11px;font-family:monospace;font-weight:800;color:#1e1b4b;letter-spacing:0.3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${car.vin}</span>
                            </div>

                            <!-- Địa chỉ -->
                            <div
                                onclick="event.stopPropagation();window.copyAddressFromMap('${popupId}')"
                                title="Click để copy địa chỉ"
                                style="display:flex;align-items:flex-start;gap:6px;cursor:pointer;"
                            >
                                <div style="width:20px;height:20px;border-radius:6px;background:#eff6ff;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;">
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2.5"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
                                </div>
                                <span id="${popupId}" style="font-size:11px;color:#374151;line-height:1.45;flex:1;">Đang lấy địa chỉ...</span>
                            </div>

                            <!-- Timestamp -->
                            <div style="display:flex;align-items:center;justify-content:space-between;padding-top:6px;border-top:1px solid #f1f5f9;">
                                <div style="display:flex;align-items:center;gap:5px;">
                                    <div style="width:18px;height:18px;border-radius:5px;background:#fefce8;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 16 14"/></svg>
                                    </div>
                                    <span style="font-size:10px;font-weight:600;color:#92400e;">${updateTimeStr}</span>
                                </div>
                            </div>

                            <!-- Share Location Button -->
                            <button
                                id="btn-share-car-${car.vin}"
                                type="button"
                                onclick="event.stopPropagation();window.shareCarFromMap('${car.vin}')"
                                style="width:100%;background:linear-gradient(135deg,#0284c7 0%,#0369a1 100%);color:#fff;border:none;border-radius:8px;padding:6px 10px;font-size:11px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;box-shadow:0 3px 8px rgba(2,132,199,0.35);margin-top:2px;transition:all 0.2s;"
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                                <span id="btn-share-text-${car.vin}">Chia sẻ vị trí</span>
                            </button>
                        </div>

                        <!-- Body 2: QR Code View (Morphs inside this popup!) -->
                        <div id="popup-body-qr-${car.vin}" style="display:none;padding:10px 12px;flex-direction:column;align-items:center;gap:7px;background:#f8fafc;">
                            <div style="background:#fff;padding:8px;border-radius:12px;border:1px solid #e2e8f0;box-shadow:0 2px 8px rgba(0,0,0,0.06);display:flex;justify-content:center;margin-top:2px;">
                                <img src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(shareUrl)}" style="width:130px;height:130px;display:block;" alt="QR Code" />
                            </div>

                            <span style="font-size:10px;font-weight:700;color:#475569;text-align:center;">
                                Quét camera để xem vị trí xe Live
                            </span>

                            <button
                                id="btn-copy-qr-${car.vin}"
                                type="button"
                                onclick="event.stopPropagation();window.copyShareUrlFromPopup('${car.vin}','${encodeURIComponent(shareUrl)}')"
                                style="width:100%;background:linear-gradient(135deg,#0284c7 0%,#0369a1 100%);color:#fff;border:none;border-radius:8px;padding:6px 10px;font-size:11px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;box-shadow:0 2px 6px rgba(2,132,199,0.3);margin-top:2px;"
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                                <span id="text-copy-qr-${car.vin}">SAO CHÉP LINK</span>
                            </button>

                            <button
                                type="button"
                                onclick="event.stopPropagation();window.showInfoInPopup('${car.vin}')"
                                style="width:100%;background:#fff;color:#475569;border:1px solid #cbd5e1;border-radius:8px;padding:5px 8px;font-size:10px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;"
                            >
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                                <span>Quay lại thông tin</span>
                            </button>
                        </div>
                    </div>
                `;
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

                const popupContent = getPopupContentForCar(car);
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
                        .bindPopup(popupContent, { autoPan: false });

                    marker.on('popupopen', () => {
                        resolveAddress(car.lat, car.lng, car.vin, popupId);
                        if (onSelectVin) onSelectVin(car.vin);

                        // Auto-center map so popup is dead-centered vertically & horizontally on screen
                        if (mapInstance.current) {
                            const latLng = marker.getLatLng();
                            mapInstance.current.panTo(latLng, { animate: true });
                            setTimeout(() => {
                                if (mapInstance.current) {
                                    mapInstance.current.panBy([0, -145], { animate: true });
                                }
                            }, 50);
                        }
                    });
                    marker.on('click', () => {
                        if (onSelectVin) onSelectVin(car.vin);
                        if (mapInstance.current) {
                            const latLng = marker.getLatLng();
                            mapInstance.current.panTo(latLng, { animate: true });
                            setTimeout(() => {
                                if (mapInstance.current) {
                                    mapInstance.current.panBy([0, -145], { animate: true });
                                }
                            }, 50);
                        }
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
    }, [filteredCars, isMapLoaded, hoveredVin]);

    
    // Auto-focus target VIN when arriving from deep link or external click
    useEffect(() => {
        if (!targetVinOnMap || !isMapLoaded) return;

        let retryCount = 0;
        const maxRetries = 40; // Chờ tối đa 4 giây

        const tryFocusMarker = () => {
            if (mapInstance.current && markersRef.current && markersRef.current[targetVinOnMap]) {
                const marker = markersRef.current[targetVinOnMap];
                const latLng = marker.getLatLng ? marker.getLatLng() : null;

                try { mapInstance.current.invalidateSize(); } catch (e) {}

                if (latLng) {
                    try {
                        mapInstance.current.setView(latLng, 18, { animate: true });
                    } catch (e) {}

                    // Mở popup sau khi animation setView kết thúc (~600ms)
                    setTimeout(() => {
                        try {
                            marker.openPopup();
                            if (mapInstance.current) {
                                mapInstance.current.panBy([0, -110], { animate: true });
                            }
                        } catch (e) {}
                    }, 650);
                } else {
                    try { marker.openPopup(); } catch (e) {}
                }

                if (onClearTargetVinOnMap) onClearTargetVinOnMap();
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
                    onClearTargetVinOnMap();
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
            const address = await reverseGeocode(lat, lng);
            addressesRef.current[vin] = { address, lat, lng };
            localStorage.setItem('car_addresses_cache', JSON.stringify(addressesRef.current));

            const el = document.getElementById(popupId);
            if (el) el.innerHTML = `<strong>${address}</strong>`;

            setAddresses({ ...addressesRef.current });
        } catch (err) {
            const el = document.getElementById(popupId);
            if (el) el.innerHTML = `Tọa độ: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
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
        <div className="flex flex-col md:flex-row overflow-hidden bg-slate-50/80 backdrop-blur-xl w-full border border-slate-200/70 rounded-2xl h-[calc(100vh-130px)] md:h-[calc(100vh-86px)] shadow-sm">
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
                        box-shadow: 0 0 0 0px var(--pulse-color, rgba(2, 132, 199, 0.4));
                        opacity: 0.9;
                    }
                    100% {
                        transform: scale(1.6);
                        box-shadow: 0 0 0 14px rgba(2, 132, 199, 0);
                        opacity: 0;
                    }
                }
            `}</style>
            {/* Map Area */}
            <div className="flex-1 h-1/2 md:h-full relative min-h-[300px] md:min-h-0">
                <div ref={mapRef} className="w-full h-full bg-white" />
                
                {/* Glassmorphic Map Type Toggle Button */}
                <div className={`absolute top-2 right-2 z-[400] bg-white/90 backdrop-blur-md p-1 rounded-xl shadow-md border border-slate-200/70 flex items-center gap-1 select-none`}>
                    {/* TomTom Live Traffic Toggle */}
                    <div className="relative">
                        <button 
                            onClick={() => setIsTrafficMenuOpen(!isTrafficMenuOpen)}
                            className={`text-[10px] font-extrabold px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                                showTraffic || showIncidents
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-300/80 shadow-xs'
                                    : 'text-slate-600 hover:bg-slate-100/60'
                            }`}
                            title="Lưu lượng giao thông thời gian thực TomTom"
                        >
                            <i className="fa-solid fa-traffic-light text-amber-500 text-[11px]"></i>
                            {!hideSidebar && <span>GIAO THÔNG</span>}
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        </button>

                        {/* Traffic Dropdown Panel */}
                        {isTrafficMenuOpen && (
                            <div className="absolute top-full right-0 mt-2 w-64 bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-2xl shadow-xl p-3.5 z-[1050] animate-fade-in-up text-left">
                                <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100">
                                    <div className="flex items-center gap-1.5">
                                        <i className="fa-solid fa-traffic-light text-amber-500 text-xs"></i>
                                        <span className="text-[11px] font-extrabold text-slate-800 tracking-tight">TomTom Live Traffic</span>
                                    </div>
                                    <button 
                                        onClick={() => setIsTrafficMenuOpen(false)}
                                        className="text-slate-400 hover:text-slate-600 text-xs p-1"
                                    >
                                        <i className="fa-solid fa-xmark"></i>
                                    </button>
                                </div>

                                <div className="space-y-2 mb-3">
                                    <label className="flex items-center gap-2 text-[11px] font-bold text-slate-700 cursor-pointer select-none">
                                        <input 
                                            type="checkbox" 
                                            checked={showTraffic} 
                                            onChange={(e) => setShowTraffic(e.target.checked)}
                                            className="w-3.5 h-3.5 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                                        />
                                        <span>Tình trạng kẹt xe (Traffic Flow)</span>
                                    </label>

                                    <label className="flex items-center gap-2 text-[11px] font-bold text-slate-700 cursor-pointer select-none">
                                        <input 
                                            type="checkbox" 
                                            checked={showIncidents} 
                                            onChange={(e) => setShowIncidents(e.target.checked)}
                                            className="w-3.5 h-3.5 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                                        />
                                        <span>Cảnh báo sự cố / Tai nạn</span>
                                    </label>
                                </div>

                                <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-500 space-y-1">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                                        <span>Thông thoáng (Bình thường)</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                                        <span>Chậm chạp (Đông đúc)</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
                                        <span>Tắc nghẽn nghiêm trọng (Kẹt xe)</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-slate-700 shrink-0"></span>
                                        <span>Đường đóng / Công trình</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="w-px h-4 bg-slate-200 mx-0.5"></div>

                    <button 
                        onClick={() => setMapType('satellite')}
                        className={`text-[10px] font-extrabold px-2 py-1.5 rounded-lg flex items-center gap-1 transition-all ${
                            mapType === 'satellite' 
                                ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-md shadow-sky-500/25 scale-[1.02]' 
                                : 'text-slate-600 hover:bg-slate-100/60'
                        }`}
                        title="Vệ tinh"
                    >
                        <i className="fa-solid fa-satellite text-[11px]"></i>
                        {!hideSidebar && <span>VỆ TINH</span>}
                    </button>
                    <button 
                        onClick={() => setMapType('standard')}
                        className={`text-[10px] font-extrabold px-2 py-1.5 rounded-lg flex items-center gap-1 transition-all ${
                            mapType === 'standard' 
                                ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-md shadow-sky-500/25 scale-[1.02]' 
                                : 'text-slate-600 hover:bg-slate-100/60'
                        }`}
                        title="Bản đồ thường"
                    >
                        <i className="fa-solid fa-map text-[11px]"></i>
                        {!hideSidebar && <span>MINIMALIST</span>}
                    </button>
                </div>

                {/* Map Control Buttons */}
                <div className="absolute top-12 right-2 z-[400] flex flex-col gap-1.5 select-none">
                    <button 
                        onClick={() => {
                            if (!mapInstance.current) return;
                            navigator.geolocation.getCurrentPosition((pos) => {
                                mapInstance.current.flyTo([pos.coords.latitude, pos.coords.longitude], 15, { animate: true, duration: 1.2 });
                            });
                        }}
                        title="Vị trí của tôi"
                        className="bg-white/90 backdrop-blur-md hover:bg-white text-sky-600 hover:text-sky-700 shadow-md border border-slate-200/70 w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer hover:scale-105"
                    >
                        <i className="fa-solid fa-crosshairs text-sm"></i>
                    </button>

                    <button 
                        onClick={() => {
                            if (!mapInstance.current || allCarsWithGps.length === 0) return;
                            const bounds = allCarsWithGps.map(c => [c.lat, c.lng]);
                            const L = (window as any).L;
                            if (L) {
                                mapInstance.current.fitBounds(L.latLngBounds(bounds), { padding: [30, 30] });
                            }
                        }}
                        title="Xem toàn bộ xe"
                        className="bg-white/90 backdrop-blur-md hover:bg-white text-sky-600 hover:text-sky-700 shadow-md border border-slate-200/70 w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer hover:scale-105"
                    >
                        <i className="fa-solid fa-expand text-sm"></i>
                    </button>


                </div>
            </div>

            {/* Sidebar Car List Panel */}
            {!hideSidebar && (
                <div className="bg-white/95 backdrop-blur-xl flex flex-col h-1/2 md:h-full w-full md:w-[390px] md:min-w-[390px] flex-shrink-0 shadow-sm z-10 border-t md:border-t-0 md:border-l border-slate-200/70">
                    {/* Header Section */}
                    <div className="p-4 bg-slate-50/60 backdrop-blur-md border-b border-slate-200/70 space-y-3">
                        <div className="flex justify-between items-center">
                            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                                <i className="fa-solid fa-map-location-dot text-sky-600"></i>
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
                                    className="text-sky-600 hover:text-sky-700 hover:bg-sky-50 p-1.5 rounded-lg transition-all"
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
                                        className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 p-1.5 rounded-lg transition-all"
                                    >
                                        <i className="fa-solid fa-broom"></i>
                                    </button>
                                )}
                            </h2>
                            <div className="flex items-center gap-1.5">
                                {!isMapLoaded && (
                                    <span className="text-[10px] text-amber-700 bg-amber-50 font-bold px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1 animate-pulse">
                                        <i className="fa-solid fa-spinner fa-spin"></i> Đang tải...
                                    </span>
                                )}
                                <span className="text-[10px] bg-sky-50 text-sky-700 font-extrabold px-2.5 py-0.5 rounded-full border border-sky-200/60 shadow-xs">
                                    {allCarsWithGps.length} Xe Định Vị
                                </span>
                            </div>
                        </div>

                        {/* Filter Inputs */}
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                                <input
                                    type="text"
                                    placeholder="Tìm kiếm VIN..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all outline-none placeholder-slate-400 text-slate-800"
                                />
                            </div>

                            <div className="relative flex-shrink-0">
                                <select
                                    value={selectedModel}
                                    onChange={e => setSelectedModel(e.target.value)}
                                    className="text-xs font-bold bg-white border border-slate-200 rounded-xl pl-3 pr-7 py-1.5 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all appearance-none cursor-pointer text-slate-700 w-[100px]"
                                >
                                    <option value="all">Dòng xe</option>
                                    {carModels.map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                                <i className="fa-solid fa-chevron-down absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[9px] pointer-events-none"></i>
                            </div>

                            <div className="relative flex-shrink-0">
                                <select
                                    value={selectedColor}
                                    onChange={e => setSelectedColor(e.target.value)}
                                    className="text-xs font-bold bg-white border border-slate-200 rounded-xl pl-3 pr-7 py-1.5 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all appearance-none cursor-pointer text-slate-700 w-[95px]"
                                >
                                    <option value="all">Màu sắc</option>
                                    {carColors.map((c: string) => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                                <i className="fa-solid fa-chevron-down absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[9px] pointer-events-none"></i>
                            </div>
                        </div>
                    </div>

                    {/* Car List Items */}
                    <div className="flex-1 overflow-y-auto p-2.5 space-y-2 hidden-scrollbar">
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
                                        className={`p-3 flex items-center transition-all duration-200 border rounded-xl cursor-pointer group ${
                                            !isMapLoaded 
                                                ? 'opacity-90' 
                                                : 'bg-white hover:bg-sky-50/40 border-slate-200/70 hover:border-sky-300 hover:shadow-md'
                                        }`}
                                    >
                                        {/* Column 1: Car Model & Trim */}
                                        <div className="w-[28%] min-w-0 pr-2 border-r border-slate-100 h-full flex flex-col justify-center">
                                            <p className="text-[12px] font-extrabold text-slate-800 group-hover:text-sky-600 transition-colors truncate leading-tight" title={car.dong_xe}>
                                                {car.dong_xe}
                                            </p>
                                            <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5" title={car.phien_ban}>
                                                {car.phien_ban}
                                            </p>
                                        </div>

                                        {/* Column 2: VIN & Color */}
                                        <div className="w-[42%] min-w-0 px-2.5 border-r border-slate-100 h-full flex flex-col justify-center">
                                            <p className="text-xs font-mono font-bold text-slate-800 uppercase tracking-wider select-all truncate" title={car.vin}>
                                                {car.vin}
                                            </p>
                                            <p className="text-[10px] text-slate-500 truncate mt-0.5 flex items-center gap-1" title={`${car.ngoai_that} / ${car.noi_that}`}>
                                                <span className="w-2 h-2 rounded-full border border-black/20 shrink-0 inline-block" style={getBackgroundColorStyle(car.ngoai_that)}></span>
                                                <span className="truncate">{car.ngoai_that}</span>
                                            </p>
                                        </div>

                                        {/* Column 3: Action Button */}
                                        <div className="w-[30%] min-w-0 pl-2 flex flex-col items-end flex-shrink-0 h-full justify-center">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setCarToShare(car);
                                                    setIsShareModalOpen(true);
                                                }}
                                                className="text-[10px] font-bold bg-sky-50 hover:bg-sky-600 text-sky-700 hover:text-white px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all border border-sky-200/60 shadow-xs hover:shadow-md cursor-pointer"
                                            >
                                                <i className="fa-solid fa-share-nodes text-[9px]"></i>
                                                <span>Chia sẻ</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="text-center py-12 flex flex-col items-center justify-center gap-2">
                                <i className="fa-solid fa-map-pin text-3xl text-slate-300"></i>
                                <p className="text-xs font-bold text-slate-400">Không tìm thấy xe định vị nào</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

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
