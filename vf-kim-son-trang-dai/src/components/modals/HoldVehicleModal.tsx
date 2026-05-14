import React from 'react';
import { X, PackageCheck, AlertTriangle } from 'lucide-react';
import { InventoryItem } from '../../types';

interface HoldVehicleModalProps {
  error: string;
  isHolding: boolean;
  item: InventoryItem;
  onClose: () => void;
  onSubmit: (vin: string) => void;
}

export const HoldVehicleModal: React.FC<HoldVehicleModalProps> = ({
  error,
  isHolding,
  item,
  onClose,
  onSubmit
}) => {
  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    onSubmit(item.vin);
  }

  return (
    <div className="modal-layer" role="presentation">
      <section className="order-modal" role="dialog" aria-modal="true" aria-labelledby="hold-vehicle-title">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Đăng ký giữ xe</p>
            <h2 id="hold-vehicle-title">{item.vin}</h2>
          </div>
          <button className="icon-button" onClick={onClose} title="Đóng" disabled={isHolding}>
            <X size={18} />
          </button>
        </div>

        <form className="order-form" onSubmit={handleSubmit}>
          <label className="full-span">
            <span>Thông số cấu hình xe</span>
            <input
              value={`${item.line} / ${item.version} · Màu: ${item.exterior} / Nội thất: ${item.interior}`}
              readOnly
            />
          </label>
          <label className="full-span">
            <span>Vị trí bãi xe</span>
            <input value={item.location || 'Chưa khai báo'} readOnly />
          </label>
          <label className="full-span">
            <span>GPS xe</span>
            <input
              value={
                item.latitude !== null && item.longitude !== null
                  ? `${item.latitude.toFixed(6)}, ${item.longitude.toFixed(6)}`
                  : 'Chưa quét GPS'
              }
              readOnly
            />
          </label>
          <div className="full-span" style={{ background: 'var(--bg-muted)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Thời gian giữ xe do hệ thống tự động tính theo quy định hiện hành.
          </div>

          {error ? (
            <div className="form-error">
              <AlertTriangle size={17} />
              <span>{error}</span>
            </div>
          ) : null}

          <div className="modal-actions">
            <button type="button" className="ghost-button" onClick={onClose} disabled={isHolding}>
              Hủy
            </button>
            <button type="submit" className="primary-button" disabled={isHolding}>
              <PackageCheck size={18} />
              <span>{isHolding ? 'Đang đăng ký...' : 'Đăng ký giữ xe'}</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
