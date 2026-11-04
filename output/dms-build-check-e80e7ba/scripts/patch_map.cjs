const fs = require('fs');
let code = fs.readFileSync('components/MapView.tsx', 'utf8');

// 1. Add states and refs
const statesHook = `    const [isShareModalOpen, setIsShareModalOpen] = useState(false);`;
const newStates = `    const [hoveredVin, setHoveredVin] = useState<string | null>(null);
    const [polygonCoords, setPolygonCoords] = useState<any[] | null>(null);
    const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
`;
code = code.replace(statesHook, statesHook + '\n' + newStates);

const refsHook = `    const userMarkerRef = useRef<any>(null);`;
const newRefs = `    const markerClusterGroupRef = useRef<any>(null);
    const drawnItemsRef = useRef<any>(null);
`;
code = code.replace(refsHook, refsHook + '\n' + newRefs);

// 2. Add userLocation to geolocation
const geoHook = `const userLng = pos.coords.longitude;`;
code = code.replace(geoHook, geoHook + '\n                setUserLocation({lat: userLat, lng: userLng});');

// 3. Initialize Cluster and Draw
const mapInitHook = `tileLayerRef.current.on('load', () => setIsMapLoaded(true));`;
const mapInitNew = `
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
                    
                    const html = \`
                        <div style="width: 40px; height: 40px; border-radius: 50%; background: conic-gradient(#16a34a 0% \${availablePercent}%, #475569 \${availablePercent}% 100%); display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.3); border: 2px solid white;">
                            <div style="background: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 13px; color: #1e293b;">
                                \${childCount}
                            </div>
                        </div>
                    \`;
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
`;
code = code.replace(mapInitHook, mapInitHook + mapInitNew);

// 4. Update filteredCars with turf
const filteredCarsHook = `return matchesSearch && matchesModel;
            });`;
const filteredCarsNew = `
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
`;
code = code.replace(filteredCarsHook, `const match = matchesSearch && matchesModel; return match; });` + filteredCarsNew);
code = code.replace(`return allCarsWithGps.filter(car => {`, `let cars = allCarsWithGps.filter(car => {`);

// 5. Update marker rendering to use markerClusterGroup and hover effect
code = code.replace(`const currentVinSet = new Set(allCarsWithGps.map(c => c.vin));`, `const currentVinSet = new Set(filteredCars.map(c => c.vin));`);
code = code.replace(`if (allCarsWithGps.length === 0) {`, `if (filteredCars.length === 0) {`);
code = code.replace(`allCarsWithGps.forEach(car => {`, `filteredCars.forEach(car => {`);
code = code.replace(`[allCarsWithGps, isMapLoaded, routedVin, routeInfo, isDrawingRoute]`, `[filteredCars, isMapLoaded, routedVin, routeInfo, isDrawingRoute, hoveredVin]`);

// Fix remove logic
code = code.replace(`markersRef.current[vin].remove();`, `if (markerClusterGroupRef.current) markerClusterGroupRef.current.removeLayer(markersRef.current[vin]); delete markersRef.current[vin];`);

// Add hover styles to icon
const carIconHook = `const carImgUrl = getCarImage(car.dong_xe, car.ngoai_that);`;
const hoverHtml = `
                const isHovered = hoveredVin === car.vin;
                const pulseHtml = isHovered ? \`<div style="position: absolute; width: 64px; height: 64px; top: -7px; left: -10px; border-radius: 50%; background: \${statusColor}; opacity: 0.6; animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>\` : '';
`;
code = code.replace(carIconHook, carIconHook + hoverHtml);

const divIconHtml = `class="hover:scale-110"`;
code = code.replace(divIconHtml, `class="\${isHovered ? 'scale-125 z-50' : 'hover:scale-110'}"`);
code = code.replace(`<div style="position: absolute; width: 44px; height: 44px;`, `\${pulseHtml} <div style="position: absolute; width: 44px; height: 44px;`);

// Add layer to cluster instead of mapInstance
code = code.replace(`.addTo(mapInstance.current)`, ``);
code = code.replace(`existingMarker.setIcon(carIcon);`, `existingMarker.setIcon(carIcon); existingMarker.options.customStatus = car.trang_thai;`);
code = code.replace(`newMarkers[car.vin] = marker;`, `marker.options.customStatus = car.trang_thai; if(markerClusterGroupRef.current) markerClusterGroupRef.current.addLayer(marker); newMarkers[car.vin] = marker;`);

// 6. Update Sidebar Sidebar list mapping
const distFn = `
    const getDistanceText = (carLat: number, carLng: number) => {
        if (!userLocation) return null;
        const R = 6371;
        const dLat = (carLat - userLocation.lat) * Math.PI / 180;
        const dLon = (carLng - userLocation.lng) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(userLocation.lat * Math.PI / 180) * Math.cos(carLat * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const d = R * c;
        if (d < 1) return \`\${(d*1000).toFixed(0)} m\`;
        return \`\${d.toFixed(1)} km\`;
    };
`;
code = code.replace(`// Auto-focus target VIN`, distFn + '\n    // Auto-focus target VIN');

const sidebarMapHook = `filteredCars.map(car => (`;
code = code.replace(sidebarMapHook, `filteredCars.map(car => { const dist = getDistanceText(car.lat, car.lng); return (`);

code = code.replace(`className="bg-white rounded-xl`, `onMouseEnter={() => setHoveredVin(car.vin)} onMouseLeave={() => setHoveredVin(null)} className={\`bg-white rounded-xl transition-all duration-200 \${hoveredVin === car.vin ? 'ring-2 ring-indigo-500 shadow-lg scale-[1.02]' : ''}\`}`);

const sidebarShareBtn = `<button onClick={(e) => { e.stopPropagation(); setCarToShare(car); setIsShareModalOpen(true); }} className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 flex items-center gap-1">`;
code = code.replace(sidebarShareBtn, `{dist && <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">📍 {dist}</span>}\n                                            ` + sidebarShareBtn);

// Ensure map closure has closing brace
code = code.replace(`</ShareSidePanel>`, `</ShareSidePanel>
            );
        })`);

fs.writeFileSync('components/MapView.tsx', code);
console.log('Patch success!');
