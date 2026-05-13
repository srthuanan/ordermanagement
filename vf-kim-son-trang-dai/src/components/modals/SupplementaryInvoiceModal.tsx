import React, { useState } from 'react';
import { AlertTriangle, FilePlus2, X } from 'lucide-react';
import { YeucauxhdRow } from '../../types';

interface SupplementaryInvoiceModalProps {
  request: YeucauxhdRow;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (orderId: string, contractFile: File | null, proposalFile: File | null, aiNote: string) => Promise<boolean>;
}

export const SupplementaryInvoiceModal: React.FC<SupplementaryInvoiceModalProps> = ({
  request,
  isSubmitting,
  onClose,
  onSubmit
}) => {
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [proposalFile, setProposalFile] = useState<File | null>(null);
  const [aiNote, setAiNote] = useState(request.ghi_chu_ai || '');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contractFile && !proposalFile && !aiNote.trim()) {
      setError('Vui lòng chọn file hoặc nhập ghi chú cần bổ sung.');
      return;
    }
    setError('');
    const ok = await onSubmit(request.so_don_hang, contractFile, proposalFile, aiNote);
    if (ok) onClose();
    else setError('Không thể bổ sung hồ sơ xuất hóa đơn.');
  }

  return (
    <div className="modal-layer" role="presentation">
      <section className="order-modal" role="dialog" aria-modal="true">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Bổ sung hồ sơ</p>
            <h2>{request.so_don_hang} - {request.ten_khach_hang}</h2>
          </div>
          <button className="icon-button" onClick={onClose} title="Đóng" disabled={isSubmitting}>
            <X size={18} />
          </button>
        </div>

        <form className="order-form" onSubmit={handleSubmit}>
          <label>
            <span>Thay HĐMB</span>
            <input type="file" accept=".pdf,image/*" onChange={(e) => setContractFile(e.target.files?.[0] || null)} />
          </label>
          <label>
            <span>Thay Đề nghị XHĐ</span>
            <input type="file" accept=".pdf,image/*" onChange={(e) => setProposalFile(e.target.files?.[0] || null)} />
          </label>
          <label className="full-span">
            <span>Ghi chú bổ sung</span>
            <textarea value={aiNote} onChange={(e) => setAiNote(e.target.value)} rows={4} />
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
              <FilePlus2 size={18} />
              <span>{isSubmitting ? 'Đang cập nhật...' : 'Cập nhật hồ sơ'}</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
