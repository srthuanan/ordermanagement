import React from 'react';
import { X, Save, AlertTriangle } from 'lucide-react';
import { Order, UpdateOrderInput } from '../../types';
import {
  versionsMap,
  allPossibleVersions,
  defaultExteriors,
  defaultInteriors,
  interiorColorRules,
  staffNames
} from '../../constants';

interface EditOrderModalProps {
  order: Order;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (input: UpdateOrderInput) => Promise<boolean>;
}

function toDateInput(value: string | null | undefined) {
  if (!value) return '';

  if (value.includes('/')) {
    const [day, month, year] = value.split('/');
    if (day && month && year) {
      return `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

export const EditOrderModal: React.FC<EditOrderModalProps> = ({
  order,
  isSubmitting,
  onClose,
  onSubmit
}) => {
  const [error, setError] = React.useState('');
  const [customer, setCustomer] = React.useState(order.customer);
  const [line, setLine] = React.useState(order.line);
  const [version, setVersion] = React.useState(order.version);
  const [exterior, setExterior] = React.useState(order.exterior);
  const [interior, setInterior] = React.useState(order.interior);
  const [staff, setStaff] = React.useState(order.staff);
  const [depositDate, setDepositDate] = React.useState(toDateInput(order.depositDate));
  const [needDate, setNeedDate] = React.useState(toDateInput(order.needDateIso || order.needDate));
  const [depositAmount, setDepositAmount] = React.useState<number | null>(order.depositAmount ?? null);
  const [invoiceAddress, setInvoiceAddress] = React.useState(order.invoiceAddress || '');
  const [contractCode, setContractCode] = React.useState(order.contractCode || '');
  const [paymentMethod, setPaymentMethod] = React.useState(order.paymentMethod || 'Tiền mặt');

  const versionOptions = React.useMemo(
    () => versionsMap[line] || allPossibleVersions,
    [line]
  );

  const interiorOptions = React.useMemo(() => {
    const lineNorm = line.toLowerCase();
    const versionNorm = version.toLowerCase();

    for (const rule of interiorColorRules) {
      if (!rule.models.includes(lineNorm)) continue;
      if (!rule.versions || rule.versions.includes(versionNorm)) {
        return rule.colors;
      }
    }
    return defaultInteriors;
  }, [line, version]);

  React.useEffect(() => {
    if (!versionOptions.includes(version)) {
      setVersion(versionOptions[0] || '');
    }
  }, [versionOptions, version]);

  React.useEffect(() => {
    if (!interiorOptions.includes(interior)) {
      setInterior(interiorOptions[0] || '');
    }
  }, [interiorOptions, interior]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customer.trim() || !line || !version || !exterior || !interior || !staff || !depositDate) {
      setError('Vui lòng nhập đầy đủ thông tin bắt buộc.');
      return;
    }
    setError('');

    const ok = await onSubmit({
      orderId: order.id,
      customer: customer.trim(),
      line,
      version,
      exterior,
      interior,
      staff,
      depositDate,
      needDate,
      depositAmount,
      invoiceAddress,
      contractCode,
      paymentMethod
    });

    if (ok) onClose();
    else setError('Không thể lưu thay đổi đơn hàng.');
  }

  return (
    <div className="modal-layer" role="presentation">
      <section className="order-modal" role="dialog" aria-modal="true">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Cập nhật đơn hàng</p>
            <h2>Sửa đơn {order.id}</h2>
          </div>
          <button className="icon-button" onClick={onClose} title="Đóng" disabled={isSubmitting}>
            <X size={18} />
          </button>
        </div>

        <form className="order-form" onSubmit={handleSubmit}>
          <label>
            <span>Khách hàng *</span>
            <input value={customer} onChange={(e) => setCustomer(e.target.value)} required />
          </label>

          <label>
            <span>Tư vấn bán hàng *</span>
            <select value={staff} onChange={(e) => setStaff(e.target.value)}>
              {staffNames.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Dòng xe *</span>
            <select value={line} onChange={(e) => setLine(e.target.value)}>
              {Object.keys(versionsMap).map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Phiên bản *</span>
            <select value={version} onChange={(e) => setVersion(e.target.value)}>
              {versionOptions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Ngoại thất *</span>
            <select value={exterior} onChange={(e) => setExterior(e.target.value)}>
              {defaultExteriors.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Nội thất *</span>
            <select value={interior} onChange={(e) => setInterior(e.target.value)}>
              {interiorOptions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Ngày cọc *</span>
            <input type="date" value={depositDate} onChange={(e) => setDepositDate(e.target.value)} required />
          </label>

          <label>
            <span>Ngày cần xe</span>
            <input type="date" value={needDate} onChange={(e) => setNeedDate(e.target.value)} />
          </label>

          <label>
            <span>Số tiền đã cọc (VNĐ)</span>
            <input
              type="number"
              value={depositAmount !== null && depositAmount !== undefined ? depositAmount : ''}
              placeholder="VD: 50000000"
              onChange={(e) => setDepositAmount(e.target.value ? Number(e.target.value) : null)}
            />
          </label>

          <label>
            <span>Hình thức thanh toán</span>
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <option value="Tiền mặt">Tiền mặt</option>
              <option value="Vay ngân hàng">Vay ngân hàng</option>
            </select>
          </label>

          <label>
            <span>Mã hợp đồng</span>
            <input value={contractCode} placeholder="Nhập mã HĐ..." onChange={(e) => setContractCode(e.target.value)} />
          </label>

          <label className="full-span">
            <span>Địa chỉ xuất hóa đơn (XHD)</span>
            <input value={invoiceAddress} placeholder="Nhập địa chỉ xuất hóa đơn..." onChange={(e) => setInvoiceAddress(e.target.value)} />
          </label>

          {error ? (
            <div className="form-error">
              <AlertTriangle size={17} />
              <span>{error}</span>
            </div>
          ) : null}

          <div className="modal-actions">
            <button type="button" className="ghost-button" onClick={onClose} disabled={isSubmitting}>
              Hủy
            </button>
            <button type="submit" className="primary-button" disabled={isSubmitting}>
              <Save size={18} />
              <span>{isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
