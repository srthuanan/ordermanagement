import React, { useState } from 'react';
import { X, FileCheck, AlertTriangle, UploadCloud } from 'lucide-react';

interface FinalizeInvoiceModalProps {
  requestId: string;
  orderId: string;
  customerName: string;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (requestId: string, orderId: string, customerName: string, invoiceFile: File) => Promise<boolean>;
}

export const FinalizeInvoiceModal: React.FC<FinalizeInvoiceModalProps> = ({
  requestId,
  orderId,
  customerName,
  isSubmitting,
  onClose,
  onSubmit
}) => {
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!invoiceFile) {
      setError('Vui lòng chọn file hóa đơn đã xuất.');
      return;
    }
    setError('');
    const ok = await onSubmit(requestId, orderId, customerName, invoiceFile);
    if (ok) {
      onClose();
    } else {
      setError('Lỗi tải hóa đơn lên hệ thống Supabase.');
    }
  }

  return (
    <div className="modal-layer" role="presentation">
      <section className="order-modal" role="dialog" aria-modal="true">
        <div className="panel-heading">
          <div>
            <p className="eyebrow" style={{ color: 'var(--success-color)' }}>Phê duyệt hồ sơ - Bước 2</p>
            <h2>Tải Lên Hóa Đơn Đã Xuất ({orderId})</h2>
          </div>
          <button className="icon-button" onClick={onClose} title="Đóng" disabled={isSubmitting}>
            <X size={18} />
          </button>
        </div>

        <form className="order-form" onSubmit={handleSubmit}>
          <label className="full-span">
            <span>File hóa đơn điện tử GTGT đã xuất *</span>
            <input type="file" accept=".pdf,image/*" onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)} required />
          </label>

          {error && (
            <div className="form-error">
              <AlertTriangle size={17} />
              <span>{error}</span>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="ghost-button" onClick={onClose} disabled={isSubmitting}>
              Hủy bỏ
            </button>
            <button type="submit" className="primary-button" style={{ background: 'var(--success-color)' }} disabled={isSubmitting}>
              {isSubmitting ? <UploadCloud size={18} /> : <FileCheck size={18} />}
              <span>{isSubmitting ? 'Đang tải hóa đơn...' : 'Hoàn tất xuất HĐ'}</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
