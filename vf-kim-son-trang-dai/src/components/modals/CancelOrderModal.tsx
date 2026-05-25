import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface CancelOrderModalProps {
  orderId: string;
  currentNeedDate: string;
  isCanceling: boolean;
  onClose: () => void;
  onSubmit: (
    orderId: string,
    note: string,
    unmatchType: string,
    needDate?: string
  ) => Promise<{ success: boolean; error?: string }>;
}

export const CancelOrderModal: React.FC<CancelOrderModalProps> = ({
  orderId,
  currentNeedDate,
  isCanceling,
  onClose,
  onSubmit
}) => {
  const [note, setNote] = useState('');
  const [unmatchType, setUnmatchType] = useState<'cancel' | 'wait'>('cancel');
  const [needDate, setNeedDate] = useState(currentNeedDate);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) {
      setError('Bắt buộc nhập lý do hủy để lưu vết hệ thống.');
      return;
    }
    if (unmatchType === 'wait' && !needDate) {
      setError('Vui lòng nhập thời gian cần xe khi chọn chế độ chờ xe.');
      return;
    }
    setError('');
    const result = await onSubmit(
      orderId,
      note.trim(),
      unmatchType === 'wait' ? 'Hủy ghép & Đợi xe khác (Chờ xe)' : 'Hủy luôn đơn hàng (Hủy đơn)',
      unmatchType === 'wait' ? needDate : undefined
    );
    if (result.success) {
      onClose();
    } else {
      setError(result.error || 'Giao dịch không thành công, vui lòng thử lại.');
    }
  }

  return (
    <div className="modal-layer" role="presentation">
      <section className="order-modal" role="dialog" aria-modal="true">
        <div className="panel-heading">
          <div>
            <p className="eyebrow" style={{ color: 'var(--error-color)' }}>Thao tác khẩn cấp</p>
            <h2>Hủy Đơn Hàng {orderId}</h2>
          </div>
          <button className="icon-button" onClick={onClose} title="Đóng" disabled={isCanceling}>
            <X size={18} />
          </button>
        </div>

        <form className="order-form" onSubmit={handleSubmit}>
          <div className="full-span" style={{ background: '#fef2f2', padding: '1rem', borderRadius: '8px', border: '1px solid #fee2e2', display: 'flex', gap: '0.5rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <AlertTriangle size={20} style={{ color: 'var(--error-color)', flexShrink: 0 }} />
            <p style={{ fontSize: '0.875rem', color: '#991b1b', margin: 0 }}>
              Hành động này sẽ giải phóng số khung (VIN) của đơn hàng (nếu đã ghép) về trạng thái trống và hủy kích hoạt quy trình bán hàng. Không thể đảo ngược hành động.
            </p>
          </div>

          <label className="full-span">
            <span>Kiểu hủy *</span>
            <select
              value={unmatchType}
              onChange={(e) => setUnmatchType(e.target.value as 'cancel' | 'wait')}
              disabled={isCanceling}
            >
              <option value="cancel">Hủy luôn đơn hàng (Hủy đơn)</option>
              <option value="wait">Hủy ghép & Đợi xe khác (Chờ xe)</option>
            </select>
          </label>

          {unmatchType === 'wait' ? (
            <label className="full-span">
              <span>Thời gian cần xe *</span>
              <input
                type="date"
                value={needDate}
                onChange={(e) => setNeedDate(e.target.value)}
                required
              />
            </label>
          ) : null}

          <label className="full-span">
            <span>Lý do hủy đơn hàng *</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nhập chi tiết lý do khách trả cọc, đổi nhu cầu..."
              rows={4}
              style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '6px', resize: 'vertical', fontFamily: 'inherit' }}
              required
            />
          </label>

          {error && (
            <div className="form-error">
              <AlertTriangle size={17} />
              <span>{error}</span>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="ghost-button" onClick={onClose} disabled={isCanceling}>
              Quay lại
            </button>
            <button type="submit" className="primary-button" disabled={isCanceling} style={{ background: 'var(--error-color)' }}>
              <span>{isCanceling ? 'Đang thực thi hủy...' : 'Xác nhận hủy đơn'}</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
