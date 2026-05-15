import React from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPinned, Info } from 'lucide-react';
import { VehicleLocationRow, InventoryItem } from '../types';

type VehicleLocationMapPanelProps = {
  locations: VehicleLocationRow[];
  inventoryItems?: InventoryItem[];
  highlightedVin?: string | null; // Hỗ trợ focus xe từ danh sách
  isWidget?: boolean; // Nếu true sẽ ẩn heading thừa để lồng ghép widget gọn gàng
};

export const VehicleLocationMapPanel: React.FC<VehicleLocationMapPanelProps> = ({
  locations,
  inventoryItems = [],
  highlightedVin,
  isWidget = false
}) => {
  const mapRef = React.useRef<HTMLDivElement>(null);
  const mapInstance = React.useRef<L.Map | null>(null);
  const markersLayer = React.useRef<L.LayerGroup | null>(null);
  
  // Lưu trữ ref tới các marker theo VIN để có thể tương tác
  const markerMap = React.useRef<Map<string, L.CircleMarker>>(new Map());

  const validLocations = locations.filter(
    (location) => location.latitude !== null && location.longitude !== null
  );

  const carsWithGPS = React.useMemo(() => {
    return validLocations.map((loc) => {
      const inv = inventoryItems.find(
        (item) => item.vin.trim().toUpperCase() === loc.vin.trim().toUpperCase()
      );
      return {
        vin: loc.vin,
        lat: loc.latitude as number,
        lng: loc.longitude as number,
        vi_tri: loc.location || inv?.location || 'Không rõ bãi',
        updatedAt: loc.updatedAt,
        dong_xe: inv?.line || 'Không xác định',
        phien_ban: inv?.version || '',
        ngoai_that: inv?.exterior || '',
        noi_that: inv?.interior || '',
        trang_thai: inv?.status || 'Chưa ghép',
        nguoi_giu: inv?.holder || ''
      };
    });
  }, [validLocations, inventoryItems]);

  const latestUpdatedAt = React.useMemo(() => {
    return validLocations.reduce((latest, location) => {
      const value = new Date(location.updatedAt).getTime();
      return value > latest ? value : latest;
    }, 0);
  }, [validLocations]);

  function getColor(status: string) {
    if (status === 'Chưa ghép') return '#10b981';
    if (status === 'Đang giữ') return '#f59e0b';
    if (status === 'Đã ghép') return '#ef4444';
    return '#3b82f6';
  }

  // Khởi tạo bản đồ
  React.useEffect(() => {
    if (!mapRef.current) return;

    if (mapInstance.current) {
      mapInstance.current.remove();
      mapInstance.current = null;
    }

    const map = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: false
    }).setView([10.7769, 106.7009], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    const layer = L.layerGroup().addTo(map);

    mapInstance.current = map;
    markersLayer.current = layer;

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    
    if (mapRef.current) {
      resizeObserver.observe(mapRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // Cập nhật Markers
  React.useEffect(() => {
    const map = mapInstance.current;
    const layer = markersLayer.current;
    if (!map || !layer) return;

    layer.clearLayers();
    markerMap.current.clear();

    if (carsWithGPS.length === 0) return;

    const bounds: L.LatLngExpression[] = [];

    carsWithGPS.forEach((car) => {
      const color = getColor(car.trang_thai);
      const latLng: L.LatLngExpression = [car.lat, car.lng];
      bounds.push(latLng);

      const marker = L.circleMarker(latLng, {
        radius: 8,
        fillColor: color,
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.9
      });

      const colorText = car.ngoai_that + (car.noi_that ? ` / ${car.noi_that}` : '');
      const popupContent = `
        <div style="font-family: system-ui, -apple-system, sans-serif; min-width: 250px; padding: 4px 0;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 6px;">
            <strong style="font-size: 15px; color: #111827; letter-spacing: 0.5px;">${car.vin}</strong>
            <span style="background-color: ${color}20; color: ${color}; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 20px; border: 1px solid ${color};">
              ${car.trang_thai}
            </span>
          </div>
          <div style="font-size: 13px; color: #374151; line-height: 1.6;">
            <div style="font-weight: 600; color: #111; font-size: 14px; margin-bottom: 4px;">${car.dong_xe} ${car.phien_ban}</div>
            <div style="display: flex; align-items: center; gap: 6px;"><span style="color:#6b7280;">🎨</span> <span>${colorText || 'Chưa rõ'}</span></div>
            <div style="display: flex; align-items: center; gap: 6px;"><span style="color:#6b7280;">🏢</span> <span>${car.vi_tri}</span></div>
            ${car.nguoi_giu ? `<div style="display: flex; align-items: center; gap: 6px; font-weight: 500;"><span style="color:#6b7280;">👤</span> <span>Giữ bởi: ${car.nguoi_giu}</span></div>` : ''}
            
            <!-- Địa chỉ giải mã động giống dự án cha -->
            <div style="margin-top: 6px; font-size: 12px; background: #f3f4f6; padding: 6px 8px; border-radius: 6px; color: #4b5563; display: flex; flex-direction: column; gap: 2px;" id="popup-addr-${car.vin}">
              <span style="color: #9ca3af; font-style: italic;">⏳ Đang dò tìm tên đường...</span>
            </div>

            <div style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed #eee; display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 11px; color: #9ca3af;">Cập nhật: ${car.updatedAt && !isNaN(new Date(car.updatedAt).getTime()) ? new Date(car.updatedAt).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'}) : 'Hôm nay'}</span>
              <a href="https://www.google.com/maps?q=${car.lat},${car.lng}" target="_blank" rel="noreferrer" style="font-size: 12px; color: #2563eb; font-weight: 600; text-decoration: none; display: flex; align-items: center; gap: 2px;">Google Maps ↗</a>
            </div>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, { closeButton: false, minWidth: 230, maxWidth: 270 });
      
      // Tải địa chỉ động khi mở Popup (để tiết kiệm API & pin thiết bị)
      marker.on('popupopen', () => {
        const addrEl = document.getElementById(`popup-addr-${car.vin}`);
        if (addrEl && !addrEl.dataset.loaded) {
          fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${car.lat}&lon=${car.lng}`)
            .then((r) => r.json())
            .then((data) => {
              const fullAddr = data.display_name || 'Không tìm thấy tên đường';
              addrEl.innerHTML = `<span style="font-weight: 600; color: #1f2937; font-size: 11px;">📍 Địa chỉ hiện tại:</span><span style="line-height: 1.4;">${fullAddr}</span>`;
              addrEl.style.background = '#eff6ff';
              addrEl.style.color = '#1e40af';
              addrEl.dataset.loaded = 'true';
            })
            .catch(() => {
              addrEl.innerHTML = `<span style="color: #ef4444;">⚠️ Không thể lấy địa chỉ lúc này</span>`;
            });
        }
      });

      marker.addTo(layer);
      
      // Lưu trữ marker cho tương tác click sau này
      markerMap.current.set(car.vin, marker);
    });

    // Auto fit bounds
    if (bounds.length > 0) {
      if (bounds.length === 1) {
        map.setView(bounds[0], 16);
      } else {
        map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [40, 40], maxZoom: 17 });
      }
    }
  }, [carsWithGPS]);

  // Xử lý Effect khi nhận highlightedVin từ cha
  React.useEffect(() => {
    const map = mapInstance.current;
    if (!highlightedVin || !map) return;

    const targetMarker = markerMap.current.get(highlightedVin);
    if (targetMarker) {
      const latLng = targetMarker.getLatLng();
      
      // Bay mượt tới điểm xe và phóng to tối đa
      map.setView(latLng, 18, { animate: true, duration: 0.8 });
      
      // Tự động mở popup chi tiết xe
      setTimeout(() => {
        targetMarker.openPopup();
      }, 300);

      // Cuộn trang mượt để hiển thị bản đồ lên tầm mắt người dùng
      if (mapRef.current) {
        mapRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [highlightedVin]);

  if (isWidget) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        <div 
          className="interactive-map-wrapper" 
          style={{ 
            position: 'relative', 
            height: '550px', // Tăng chiều cao widget để bản đồ rộng rãi phóng khoáng hơn
            width: '100%', 
            borderRadius: '12px', 
            overflow: 'hidden',
            border: '1px solid var(--border-color)',
            background: '#f3f4f6'
          }}
        >
          {carsWithGPS.length === 0 ? (
            <div 
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'var(--text-muted)',
                gap: '8px'
              }}
            >
              <MapPinned size={36} strokeWidth={1.5} />
              <p>Chưa có dữ liệu GPS.</p>
            </div>
          ) : (
            <div ref={mapRef} style={{ height: '100%', width: '100%', zIndex: 1 }} />
          )}
        </div>

        {carsWithGPS.length > 0 && (
          <div 
            className="map-legend" 
            style={{ 
              display: 'flex', 
              gap: '1rem', 
              marginTop: '10px', 
              fontSize: '11.5px', 
              flexWrap: 'wrap', 
              padding: '0 4px',
              fontWeight: 600,
              color: '#475569'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: getColor('Chưa ghép') }} />
              <span>Chưa ghép</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: getColor('Đang giữ') }} />
              <span>Đang giữ xe</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: getColor('Đã ghép') }} />
              <span>Đã ghép / Xuất HĐ</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <section className="panel inventory-map-panel" style={{ overflow: 'hidden' }}>
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Giám sát GPS Live</p>
          <h2>Bản đồ vị trí xe trong kho</h2>
        </div>
        <div className="inventory-map-stats" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span className="badge success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <MapPinned size={14} />
            <strong>{carsWithGPS.length}</strong> xe có vị trí
          </span>
          {latestUpdatedAt ? (
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Info size={14} />
              Cập nhật: {new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(latestUpdatedAt))}
            </span>
          ) : null}
        </div>
      </div>

      <div 
        className="interactive-map-wrapper" 
        style={{ 
          position: 'relative', 
          height: '400px', 
          width: '100%', 
          borderRadius: '12px', 
          overflow: 'hidden',
          border: '1px solid var(--border-color)',
          background: '#f3f4f6'
        }}
      >
        {carsWithGPS.length === 0 ? (
          <div 
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--text-muted)',
              gap: '8px'
            }}
          >
            <MapPinned size={36} strokeWidth={1.5} />
            <p>Chưa có dữ liệu GPS. Dùng Bookmarklet trên trang nguồn dữ liệu để quét tọa độ.</p>
          </div>
        ) : (
          <div ref={mapRef} style={{ height: '100%', width: '100%', zIndex: 1 }} />
        )}
      </div>

      {carsWithGPS.length > 0 && (
        <div 
          className="map-legend" 
          style={{ 
            display: 'flex', 
            gap: '1.5rem', 
            marginTop: '1rem', 
            fontSize: '0.85rem', 
            flexWrap: 'wrap', 
            padding: '0 4px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: getColor('Chưa ghép') }} />
            <span>Chưa ghép</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: getColor('Đang giữ') }} />
            <span>Đang giữ xe</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: getColor('Đã ghép') }} />
            <span>Đã ghép / Xuất HĐ</span>
          </div>
        </div>
      )}
    </section>
  );
};
