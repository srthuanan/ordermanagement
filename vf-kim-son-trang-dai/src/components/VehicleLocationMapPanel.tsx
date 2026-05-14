import React from 'react';
import { ExternalLink, MapPinned } from 'lucide-react';
import { VehicleLocationRow } from '../types';

type VehicleLocationMapPanelProps = {
  locations: VehicleLocationRow[];
};

function buildStaticMapUrl(locations: VehicleLocationRow[]) {
  const params = new URLSearchParams();
  params.set('size', '960x420');
  params.set('maptype', 'mapnik');
  locations.forEach((location) => {
    if (location.latitude !== null && location.longitude !== null) {
      params.append('markers', `${location.latitude},${location.longitude},ol-marker-blue`);
    }
  });
  return `https://staticmap.openstreetmap.de/staticmap.php?${params.toString()}`;
}

export const VehicleLocationMapPanel: React.FC<VehicleLocationMapPanelProps> = ({ locations }) => {
  const [imageError, setImageError] = React.useState(false);
  const validLocations = locations.filter(
    (location) => location.latitude !== null && location.longitude !== null
  );
  const mapLocations = validLocations.slice(0, 10);
  const mapUrl = mapLocations.length > 0 ? buildStaticMapUrl(mapLocations) : '';
  const latestUpdatedAt = validLocations.reduce((latest, location) => {
    const value = new Date(location.updated_at).getTime();
    return value > latest ? value : latest;
  }, 0);

  const mapNotes = locations.length > mapLocations.length ? `+${locations.length - mapLocations.length} xe nữa` : '';

  React.useEffect(() => {
    setImageError(false);
  }, [mapUrl]);

  return (
    <section className="panel inventory-map-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Bản đồ GPS xe</p>
          <h2>Vị trí xe trên bản đồ</h2>
        </div>
        <div className="inventory-map-stats">
          <span>{validLocations.length} xe có GPS</span>
          <span>{latestUpdatedAt ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(latestUpdatedAt)) : 'Chưa có cập nhật'}</span>
        </div>
      </div>

      {mapUrl && !imageError ? (
        <div className="inventory-map-image">
          <img src={mapUrl} alt="Bản đồ vị trí xe" loading="lazy" onError={() => setImageError(true)} />
          {mapNotes ? <div className="inventory-map-note">{mapNotes}</div> : null}
        </div>
      ) : (
        <div className="empty-state">
          {validLocations.length === 0
            ? 'Chưa có xe nào được quét GPS để hiển thị bản đồ.'
            : 'Không tải được bản đồ, nhưng danh sách vị trí GPS vẫn ở bên dưới.'}
        </div>
      )}

      {validLocations.length > 0 ? (
        <div className="inventory-map-list">
          {validLocations.slice(0, 6).map((location) => {
            const mapLink =
              location.latitude !== null && location.longitude !== null
                ? `https://www.google.com/maps?q=${location.latitude},${location.longitude}`
                : '';

            return (
              <a
                key={location.vin}
                className="inventory-map-chip"
                href={mapLink}
                target="_blank"
                rel="noreferrer"
              >
                <MapPinned size={14} />
                <strong>{location.vin}</strong>
                <span>{location.vi_tri || 'Chưa đặt tên vị trí'}</span>
                {mapLink ? <ExternalLink size={14} /> : null}
              </a>
            );
          })}
        </div>
      ) : null}
    </section>
  );
};
