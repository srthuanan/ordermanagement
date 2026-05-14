import React from 'react';
import { AlertTriangle, LocateFixed, MapPin, X } from 'lucide-react';
import { InventoryItem } from '../../types';

type VehicleGpsModalProps = {
  item: InventoryItem;
  isSaving: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (input: { vi_tri: string; latitude: number | null; longitude: number | null }) => Promise<boolean>;
};

export const VehicleGpsModal: React.FC<VehicleGpsModalProps> = ({
  item,
  isSaving,
  error,
  onClose,
  onSubmit
}) => {
  const [locationLabel, setLocationLabel] = React.useState(item.location || '');
  const [latitude, setLatitude] = React.useState<number | null>(item.latitude);
  const [longitude, setLongitude] = React.useState<number | null>(item.longitude);
  const [scanError, setScanError] = React.useState('');
  const [isScanning, setIsScanning] = React.useState(false);

  React.useEffect(() => {
    setLocationLabel(item.location || '');
    setLatitude(item.latitude);
    setLongitude(item.longitude);
    setScanError('');
  }, [item]);

  async function handleScanGps() {
    setScanError('');
    if (!navigator.geolocation) {
      setScanError('Trình duyệt này không hỗ trợ quét GPS.');
      return;
    }

    setIsScanning(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        if (!locationLabel.trim()) {
          setLocationLabel('GPS hiện tại');
        }
        setIsScanning(false);
      },
      (geoError) => {
        setScanError(geoError.message || 'Không lấy được vị trí GPS.');
        setIsScanning(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const ok = await onSubmit({
      vi_tri: locationLabel.trim(),
      latitude,
      longitude
    });
    if (ok) {
      onClose();
    }
  }

  const mapLink =
    latitude !== null && longitude !== null
      ? `https://www.google.com/maps?q=${latitude},${longitude}`
      : '';

  return (
    <div className="modal-layer" role="presentation">
      <section className="order-modal" role="dialog" aria-modal="true" aria-labelledby="vehicle-gps-title">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">GPS xe</p>
            <h2 id="vehicle-gps-title">{item.vin}</h2>
          </div>
          <button className="icon-button" onClick={onClose} title="Đóng" disabled={isSaving || isScanning}>
            <X size={18} />
          </button>
        </div>

        <form className="order-form" onSubmit={handleSubmit}>
          <label className="full-span">
            <span>Thông tin xe</span>
            <input value={`${item.line} / ${item.version} · ${item.exterior} · ${item.interior}`} readOnly />
          </label>

          <div className="gps-scan-card full-span">
            <div>
              <span>Vị trí đã lưu</span>
              <strong>{item.location || 'Chưa khai báo'}</strong>
            </div>
            <div>
              <span>Tọa độ hiện tại</span>
              <strong>
                {latitude !== null && longitude !== null ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` : 'Chưa quét'}
              </strong>
            </div>
            {mapLink ? (
              <a href={mapLink} target="_blank" rel="noreferrer">
                Mở Google Maps
              </a>
            ) : null}
          </div>

          <label className="full-span">
            <span>Tên vị trí</span>
            <input
              value={locationLabel}
              onChange={(event) => setLocationLabel(event.target.value)}
              placeholder="Kho A, bãi giao xe, tầng 2..."
            />
          </label>

          <div className="gps-scan-actions full-span">
            <button type="button" className="ghost-button" onClick={handleScanGps} disabled={isScanning || isSaving}>
              <LocateFixed size={16} />
              <span>{isScanning ? 'Đang quét GPS...' : 'Quét GPS hiện tại'}</span>
            </button>
            <button type="button" className="ghost-button" onClick={() => setLocationLabel(item.location || '')} disabled={isSaving || isScanning}>
              Khôi phục vị trí cũ
            </button>
          </div>

          {scanError ? (
            <div className="form-error">
              <AlertTriangle size={17} />
              <span>{scanError}</span>
            </div>
          ) : null}

          {error ? (
            <div className="form-error">
              <AlertTriangle size={17} />
              <span>{error}</span>
            </div>
          ) : null}

          <div className="modal-actions">
            <button type="button" className="ghost-button" onClick={onClose} disabled={isSaving || isScanning}>
              Hủy
            </button>
            <button type="submit" className="primary-button" disabled={isSaving || isScanning}>
              <MapPin size={18} />
              <span>{isSaving ? 'Đang lưu...' : 'Lưu vị trí GPS'}</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
