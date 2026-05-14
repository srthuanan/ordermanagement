import React from 'react';
import { X, Plus, AlertTriangle, UploadCloud, CheckCircle2 } from 'lucide-react';
import { InventoryItem, NewOrderInput } from '../../types';
import { extractDepositDateFromImage } from '../../services/ocrService';
import {
  defaultExteriors,
  defaultInteriors,
  interiorColorRules,
  vehicleLines,
  versionsMap,
  staffNames
} from '../../constants';

interface CreateOrderModalProps {
  error: string;
  isCreating: boolean;
  initialVehicle?: InventoryItem | null;
  defaultStaffName?: string;
  lockStaffName?: boolean;
  onClose: () => void;
  onSubmit: (input: NewOrderInput) => void;
}

export const CreateOrderModal: React.FC<CreateOrderModalProps> = ({
  error,
  isCreating,
  initialVehicle,
  defaultStaffName,
  lockStaffName = false,
  onClose,
  onSubmit
}) => {
  const [form, setForm] = React.useState<NewOrderInput>({
    orderId: '',
    customer: '',
    line: initialVehicle?.line || vehicleLines[0],
    version: initialVehicle?.version || versionsMap[vehicleLines[0]]?.[0] || '',
    exterior: initialVehicle?.exterior || defaultExteriors[0],
    interior: initialVehicle?.interior || defaultInteriors[0],
    staff: defaultStaffName || staffNames[0],
    depositDate: '',
    needDate: new Date().toISOString().slice(0, 10),
    pairedVin: initialVehicle?.vin,
    pairedDmsCode: initialVehicle?.dmsCode,
    depositAmount: null,
    invoiceAddress: '',
    contractCode: '',
    paymentMethod: 'Tiền mặt'
  });
  const [depositFile, setDepositFile] = React.useState<File | null>(null);
  const [depositPreview, setDepositPreview] = React.useState('');
  const [isScanningDeposit, setIsScanningDeposit] = React.useState(false);
  const [ocrStatus, setOcrStatus] = React.useState('');
  const isVehicleLocked = !!initialVehicle;

  const versionOptions = React.useMemo(
    () => versionsMap[form.line] || [],
    [form.line]
  );

  const interiorOptions = React.useMemo(() => {
    const lineNorm = form.line.toLowerCase();
    const versionNorm = form.version.toLowerCase();
    for (const rule of interiorColorRules) {
      if (!rule.models.includes(lineNorm)) continue;
      if (!rule.versions || rule.versions.includes(versionNorm)) return rule.colors;
    }
    return defaultInteriors;
  }, [form.line, form.version]);

  React.useEffect(() => {
    if (!versionOptions.includes(form.version)) {
      updateField('version', versionOptions[0] || '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versionOptions]);

  React.useEffect(() => {
    if (!interiorOptions.includes(form.interior)) {
      updateField('interior', interiorOptions[0] || '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interiorOptions]);

  React.useEffect(() => {
    if (lockStaffName && defaultStaffName) {
      updateField('staff', defaultStaffName);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultStaffName, lockStaffName]);

  function updateField<K extends keyof NewOrderInput>(key: K, value: NewOrderInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleDepositFile(file: File | null) {
    setDepositFile(file);
    setDepositPreview('');
    updateField('depositDate', '');
    setOcrStatus('');

    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setOcrStatus('Vui lòng chọn file ảnh UNC.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setDepositPreview(String(reader.result || ''));
    reader.readAsDataURL(file);

    setIsScanningDeposit(true);
    try {
      const date = await extractDepositDateFromImage(file, setOcrStatus);
      if (!date) {
        setOcrStatus('Không nhận diện được ngày cọc. Vui lòng chụp rõ phần ngày giao dịch.');
        return;
      }
      updateField('depositDate', date);
      setOcrStatus(`Đã nhận diện ngày cọc: ${new Intl.DateTimeFormat('vi-VN').format(new Date(date))}`);
    } catch (err: any) {
      setOcrStatus(err.message || 'Quét ảnh UNC thất bại.');
    } finally {
      setIsScanningDeposit(false);
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!depositFile || !form.depositDate) return;
    onSubmit(form);
  }

  return (
    <div className="modal-layer" role="presentation">
      <section className="order-modal" role="dialog" aria-modal="true" aria-labelledby="create-order-title">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Đơn hàng mới</p>
            <h2 id="create-order-title">{initialVehicle ? `Tạo đơn ghép VIN ${initialVehicle.vin}` : 'Tạo đơn xe VinFast'}</h2>
          </div>
          <button className="icon-button" onClick={onClose} title="Đóng" disabled={isCreating}>
            <X size={18} />
          </button>
        </div>

        <form className="order-form" onSubmit={handleSubmit}>
          <label className="full-span">
            <span>Số đơn hàng *</span>
            <input
              value={form.orderId}
              placeholder="Nxxxxx-XXX-yy-mm-zzzz"
              onChange={(event) => updateField('orderId', event.target.value.trim().toUpperCase())}
              required
            />
          </label>
          {initialVehicle ? (
            <label className="full-span">
              <span>Xe đang giữ sẽ ghép</span>
              <input
                value={`${initialVehicle.vin} · ${initialVehicle.line} / ${initialVehicle.version} · ${initialVehicle.exterior} / ${initialVehicle.interior}`}
                readOnly
              />
            </label>
          ) : null}
          <label>
            <span>Khách hàng *</span>
            <input
              value={form.customer}
              placeholder="Nguyễn Văn A"
              onChange={(event) => updateField('customer', event.target.value)}
              required
            />
          </label>
          <label>
            <span>Dòng xe *</span>
            <select value={form.line} onChange={(event) => updateField('line', event.target.value)} disabled={isVehicleLocked}>
              {vehicleLines.map((line) => (
                <option key={line} value={line}>{line}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Phiên bản *</span>
            <select value={form.version} onChange={(event) => updateField('version', event.target.value)} disabled={isVehicleLocked}>
              {versionOptions.map((version) => (
                <option key={version} value={version}>{version}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Ngoại thất *</span>
            <select value={form.exterior} onChange={(event) => updateField('exterior', event.target.value)} disabled={isVehicleLocked}>
              {defaultExteriors.map((color) => (
                <option key={color} value={color}>{color}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Nội thất *</span>
            <select value={form.interior} onChange={(event) => updateField('interior', event.target.value)} disabled={isVehicleLocked}>
              {interiorOptions.map((interior) => (
                <option key={interior} value={interior}>{interior}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Số tiền đã cọc (VNĐ)</span>
            <input
              type="number"
              value={form.depositAmount !== null && form.depositAmount !== undefined ? form.depositAmount : ''}
              placeholder="VD: 50000000"
              onChange={(event) => updateField('depositAmount', event.target.value ? Number(event.target.value) : null)}
            />
          </label>
          <label>
            <span>Hình thức thanh toán</span>
            <select value={form.paymentMethod || 'Tiền mặt'} onChange={(event) => updateField('paymentMethod', event.target.value)}>
              <option value="Tiền mặt">Tiền mặt</option>
              <option value="Vay ngân hàng">Vay ngân hàng</option>
            </select>
          </label>
          <label>
            <span>Mã hợp đồng</span>
            <input
              value={form.contractCode || ''}
              placeholder="Nhập mã HĐ..."
              onChange={(event) => updateField('contractCode', event.target.value)}
            />
          </label>
          <label className="full-span">
            <span>Địa chỉ xuất hóa đơn (XHD)</span>
            <input
              value={form.invoiceAddress || ''}
              placeholder="Nhập địa chỉ đầy đủ để xuất hóa đơn..."
              onChange={(event) => updateField('invoiceAddress', event.target.value)}
            />
          </label>

          <label>
            <span>Ảnh UNC / chứng từ cọc *</span>
            <div className="file-drop">
              <input
                type="file"
                accept="image/*"
                onChange={(event) => handleDepositFile(event.target.files?.[0] || null)}
                required
              />
              {depositPreview ? (
                <img src={depositPreview} alt="UNC" />
              ) : (
                <div>
                  <UploadCloud size={20} />
                  <strong>Chọn ảnh UNC</strong>
                  <small>Hệ thống tự quét ngày cọc</small>
                </div>
              )}
            </div>
          </label>
          <label>
            <span>Ngày cọc nhận diện</span>
            <input
              value={form.depositDate ? new Intl.DateTimeFormat('vi-VN').format(new Date(form.depositDate)) : 'Chưa nhận diện'}
              readOnly
            />
            {ocrStatus ? (
              <small className={form.depositDate ? 'scan-success' : 'scan-warning'}>
                {form.depositDate ? <CheckCircle2 size={13} /> : null}
                {ocrStatus}
              </small>
            ) : null}
          </label>
          <label>
            <span>Ngày cần xe *</span>
            <input
              type="date"
              value={form.needDate}
              onChange={(event) => updateField('needDate', event.target.value)}
              required
            />
          </label>

          {error ? (
            <div className="form-error">
              <AlertTriangle size={17} />
              <span>{error}</span>
            </div>
          ) : null}

          <div className="modal-actions">
            <button type="button" className="ghost-button" onClick={onClose} disabled={isCreating}>
              Hủy
            </button>
            <button type="submit" className="primary-button" disabled={isCreating || isScanningDeposit || !form.depositDate}>
              <Plus size={18} />
              <span>{isCreating ? 'Đang tạo...' : isScanningDeposit ? 'Đang quét ảnh...' : initialVehicle ? 'Tạo đơn & ghép xe' : 'Tạo đơn'}</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
