import React, { useEffect, useMemo, useState } from 'react';
import { X, FileSpreadsheet, AlertTriangle, UploadCloud } from 'lucide-react';
import * as apiService from '../../services/apiService';
import { defaultSalesPolicies } from '../../constants';
import { Order } from '../../types';

interface InvoiceRequestModalProps {
  order: Order;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (input: {
    order: Order;
    contractFile: File;
    proposalFile: File;
    policy: string;
    commission: string;
    vpoint: string;
    aiNote?: string;
    xeXangVin?: string;
    xeXangHang?: string;
    xeXangModel?: string;
  }) => Promise<boolean>;
}

export const InvoiceRequestModal: React.FC<InvoiceRequestModalProps> = ({
  order,
  isSubmitting,
  onClose,
  onSubmit
}) => {
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [proposalFile, setProposalFile] = useState<File | null>(null);
  const [policy, setPolicy] = useState(order.policy || defaultSalesPolicies[0] || '');
  const [policyOptions, setPolicyOptions] = useState<string[]>(defaultSalesPolicies);
  const [commission, setCommission] = useState('');
  const [vpoint, setVpoint] = useState('');
  const [aiNote, setAiNote] = useState('');
  const [hasGasExchange, setHasGasExchange] = useState(false);
  const [xeXangVin, setXeXangVin] = useState('');
  const [xeXangHang, setXeXangHang] = useState('');
  const [xeXangModel, setXeXangModel] = useState('');
  const [error, setError] = useState('');

  const filteredPolicies = useMemo(() => {
    const exact = policyOptions.filter((item) => item.toLowerCase().includes(order.line.toLowerCase()));
    return exact.length > 0 ? exact : policyOptions;
  }, [order.line, policyOptions]);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await apiService.getSalesPolicies();
      if (!active) return;
      const options = Array.from(new Set((data || []).map((item) => item.ten_chinh_sach).filter(Boolean)));
      if (options.length > 0) {
        setPolicyOptions(options);
        if (!policy) setPolicy(options[0]);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contractFile || !proposalFile) {
      setError('Vui lòng tải đủ HĐMB và Đề nghị xuất hóa đơn.');
      return;
    }
    if (!policy.trim()) {
      setError('Vui lòng chọn chính sách bán hàng.');
      return;
    }
    if (!commission.trim() || !vpoint.trim()) {
      setError('Vui lòng nhập hoa hồng ứng và VPoint.');
      return;
    }
    if (hasGasExchange && (!xeXangVin.trim() || !xeXangHang.trim() || !xeXangModel.trim())) {
      setError('Vui lòng nhập đủ VIN, hãng và model xe xăng đổi điện.');
      return;
    }

    setError('');
    const ok = await onSubmit({
      order,
      contractFile,
      proposalFile,
      policy: policy.trim(),
      commission: commission.trim(),
      vpoint: vpoint.trim(),
      aiNote,
      xeXangVin: hasGasExchange ? xeXangVin : '',
      xeXangHang: hasGasExchange ? xeXangHang : '',
      xeXangModel: hasGasExchange ? xeXangModel : ''
    });
    if (ok) onClose();
    else setError('Không thể gửi yêu cầu xuất hóa đơn.');
  }

  return (
    <div className="modal-layer" role="presentation">
      <section className="order-modal" role="dialog" aria-modal="true">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Phân hệ kế toán</p>
            <h2>Yêu Cầu Xuất Hóa Đơn ({order.id})</h2>
          </div>
          <button className="icon-button" onClick={onClose} title="Đóng" disabled={isSubmitting}>
            <X size={18} />
          </button>
        </div>

        <form className="order-form" onSubmit={handleSubmit}>
          <div className="full-span" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <label>
              <span>HĐMB đã ký *</span>
              <input type="file" accept=".pdf,image/*" onChange={(e) => setContractFile(e.target.files?.[0] || null)} />
            </label>
            <label>
              <span>Đề nghị xuất hóa đơn *</span>
              <input type="file" accept=".pdf,image/*" onChange={(e) => setProposalFile(e.target.files?.[0] || null)} />
            </label>
          </div>

          <label className="full-span">
            <span>Chính sách bán hàng áp dụng *</span>
            <select value={policy} onChange={(e) => setPolicy(e.target.value)} required>
              {filteredPolicies.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Hoa hồng ứng *</span>
            <input value={commission} onChange={(e) => setCommission(e.target.value)} placeholder="VD: 5.000.000" />
          </label>

          <label>
            <span>VPoint *</span>
            <input value={vpoint} onChange={(e) => setVpoint(e.target.value)} placeholder="VD: 0 / 10.000" />
          </label>

          <label className="full-span">
            <span>Ghi chú AI / ghi chú hồ sơ</span>
            <textarea value={aiNote} onChange={(e) => setAiNote(e.target.value)} rows={3} />
          </label>

          <label className="full-span" style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
            <input
              type="checkbox"
              checked={hasGasExchange}
              onChange={(e) => setHasGasExchange(e.target.checked)}
              style={{ width: 'auto' }}
            />
            <span>Có xe xăng đổi điện</span>
          </label>

          {hasGasExchange && (
            <div className="full-span" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
              <label>
                <span>VIN xe xăng *</span>
                <input value={xeXangVin} onChange={(e) => setXeXangVin(e.target.value.toUpperCase())} />
              </label>
              <label>
                <span>Hãng xe *</span>
                <input value={xeXangHang} onChange={(e) => setXeXangHang(e.target.value)} />
              </label>
              <label>
                <span>Model *</span>
                <input value={xeXangModel} onChange={(e) => setXeXangModel(e.target.value)} />
              </label>
            </div>
          )}

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
              {isSubmitting ? <UploadCloud size={18} /> : <FileSpreadsheet size={18} />}
              <span>{isSubmitting ? 'Đang tải hồ sơ...' : 'Gửi hồ sơ cho kế toán'}</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
