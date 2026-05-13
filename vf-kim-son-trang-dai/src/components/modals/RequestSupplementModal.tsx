import React, { useState } from 'react';
import { AlertTriangle, Send, X } from 'lucide-react';
import { YeucauxhdRow } from '../../types';

interface RequestSupplementModalProps {
  request: YeucauxhdRow;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (requestId: string, reason: string) => Promise<boolean>;
}

export const RequestSupplementModal: React.FC<RequestSupplementModalProps> = ({
  request,
  isSubmitting,
  onClose,
  onSubmit
}) => {
  const [reason, setReason] = useState(request.ghi_chu_admin || '');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Vui lòng nhập nội dung cần bổ sung.');
      return;
    }
    setError('');
    const ok = await onSubmit(request.id, reason.trim());
    if (ok) onClose();
    else setError('Không thể gửi yêu cầu bổ sung.');
  }

  return (
    <div className="modal-layer" role="presentation">
      <section className="order-modal" role="dialog" aria-modal="true">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Kế toán yêu cầu bổ sung</p>
            <h2>{request.so_don_hang} - {request.ten_khach_hang}</h2>
          </div>
          <button className="icon-button" onClick={onClose} title="Đóng" disabled={isSubmitting}>
            <X size={18} />
          </button>
        </div>

        <form className="order-form" onSubmit={handleSubmit}>
          <label className="full-span">
            <span>Nội dung cần bổ sung *</span>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={5} required />
          </label>

          {error && (
            <div className="form-error">
              <AlertTriangle size={17} />
              <span>{error}</span>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="ghost-button" onClick={onClose} disabled={isSubmitting}>
              Quay lại
            </button>
            <button type="submit" className="primary-button" disabled={isSubmitting}>
              <Send size={18} />
              <span>{isSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu bổ sung'}</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
