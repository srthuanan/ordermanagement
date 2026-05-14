import React, { useState } from 'react';
import { X, Upload, AlertTriangle } from 'lucide-react';

interface ImportInventoryModalProps {
  isSubmitting: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (csvText: string) => Promise<boolean>;
}

const sampleTemplate =
  'vin,vi_tri,latitude,longitude,ngay_nhap\n' +
  'RLV12345678900001,Kho A,10.762622,106.660172,2026-05-13T08:00:00+07:00';

export const ImportInventoryModal: React.FC<ImportInventoryModalProps> = ({
  isSubmitting,
  error,
  onClose,
  onSubmit
}) => {
  const [csvText, setCsvText] = useState(sampleTemplate);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ok = await onSubmit(csvText);
    if (ok) {
      onClose();
    }
  }

  return (
    <div className="modal-layer" role="presentation">
      <section className="order-modal" role="dialog" aria-modal="true">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Kho xe</p>
            <h2>Nhập kho nhanh (CSV)</h2>
          </div>
          <button className="icon-button" onClick={onClose} title="Đóng" disabled={isSubmitting}>
            <X size={18} />
          </button>
        </div>

        <form className="order-form" onSubmit={handleSubmit}>
          <label className="full-span">
            <span>Dán dữ liệu CSV (VIN bắt buộc; dòng xe / phiên bản / ngoại thất / nội thất sẽ tự lấy từ thongtinxe)</span>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              rows={12}
              style={{ resize: 'vertical', minHeight: '220px' }}
              placeholder="vin,vi_tri,latitude,longitude,ngay_nhap"
            />
          </label>

          {error && (
            <div className="form-error">
              <AlertTriangle size={17} />
              <span>{error}</span>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="ghost-button" onClick={onClose} disabled={isSubmitting}>
              Đóng
            </button>
            <button type="submit" className="primary-button" disabled={isSubmitting}>
              <Upload size={18} />
              <span>{isSubmitting ? 'Đang import...' : 'Import vào kho'}</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
