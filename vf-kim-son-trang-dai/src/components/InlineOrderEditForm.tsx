import React from 'react';
import { X, Save, AlertTriangle } from 'lucide-react';
import { Order, UpdateOrderInput, VehicleConfigRow, SalesPolicyRow } from '../types';
import {
  staffNames,
  defaultSalesPolicies
} from '../constants';
import * as apiService from '../services/apiService';
import { parseVehicleConfigs } from '../utils/vehicleConfigUtils';

export interface InlineOrderEditFormProps {
  order: Order;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (input: UpdateOrderInput) => Promise<boolean>;
  vehicleConfigs: VehicleConfigRow[];
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

export const InlineOrderEditForm: React.FC<InlineOrderEditFormProps> = ({
  order,
  isSubmitting,
  onCancel,
  onSubmit,
  vehicleConfigs
}) => {
  const { vehicleLines, versionsMap, defaultExteriors, defaultInteriors } = React.useMemo(
    () => parseVehicleConfigs(vehicleConfigs),
    [vehicleConfigs]
  );
  
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

  const [ngayKyHopDong, setNgayKyHopDong] = React.useState(toDateInput(order.ngayKyHopDong || ''));
  const [nguonKhach, setNguonKhach] = React.useState(order.nguonKhach || '');
  const [giaCongBo, setGiaCongBo] = React.useState<number | null>(order.giaCongBo ?? null);
  const [muaBaoHiem, setMuaBaoHiem] = React.useState<boolean | null>(order.muaBaoHiem ?? null);
  const [dangKyXe, setDangKyXe] = React.useState<boolean | null>(order.dangKyXe ?? null);
  const [ghiChu, setGhiChu] = React.useState(order.ghiChu || '');
  const [xeXangVin, setXeXangVin] = React.useState(order.xeXangVin || '');
  const [xeXangHang, setXeXangHang] = React.useState(order.xeXangHang || '');
  const [xeXangModel, setXeXangModel] = React.useState(order.xeXangModel || '');
  const [maAmis, setMaAmis] = React.useState(order.maAmis || '');

  const initialPolicies = order.policy ? order.policy.split(/,(?!\d)/).map(p => p.trim()).filter(Boolean) : [];
  const [policy, setPolicy] = React.useState<string[]>(initialPolicies);
  const [policyRows, setPolicyRows] = React.useState<SalesPolicyRow[]>([]);
  const [policyLoading, setPolicyLoading] = React.useState(true);
  const [policyOpen, setPolicyOpen] = React.useState(false);
  const policySelectRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await apiService.getSalesPolicies();
      if (!active) return;
      setPolicyRows(data || defaultSalesPolicies.map((name) => ({ ten_chinh_sach: name, dong_xe: 'Tất cả các dòng xe' })));
      setPolicyLoading(false);
    })();
    return () => { active = false; };
  }, []);

  const policyOptions = React.useMemo(() => {
    const lineNorm = line.toLowerCase().trim();
    return policyRows.filter((item) => {
      const name = (item.ten_chinh_sach || '').toLowerCase();
      const lineStr = (item.dong_xe || '').toLowerCase();
      if (!name) return false;
      if (!lineStr || lineStr.includes('tất cả') || lineStr.includes('all')) return true;
      return lineStr.includes(lineNorm) || lineNorm.includes(lineStr);
    });
  }, [line, policyRows]);

  React.useEffect(() => {
    if (policy.length === 0) return;
    const allowed = new Set(policyOptions.map((item) => item.ten_chinh_sach));
    const filtered = policy.filter((p) => allowed.has(p));
    if (filtered.length !== policy.length) {
      setPolicy(filtered);
    }
  }, [line, policyOptions]);

  const filteredPolicyOptions = policyOptions;
  const selectedPolicyCount = policy.length;
  const selectedPolicyPreview = policy[0] || '';
  const isGasToElectricPolicy = policy.some((name) => name.toLowerCase().includes('thu cũ'));

  function togglePolicy(name: string) {
    setPolicy((current) => {
      return current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name];
    });
  }

  function togglePolicyDropdown() {
    setPolicyOpen((current) => !current);
  }

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (policySelectRef.current && !policySelectRef.current.contains(event.target as Node)) {
        setPolicyOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const versionOptions = React.useMemo(
    () => versionsMap[line] || [],
    [line, versionsMap]
  );

  const interiorOptions = defaultInteriors;

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
      paymentMethod,
      ngayKyHopDong,
      nguonKhach,
      giaCongBo,
      muaBaoHiem,
      dangKyXe,
      ghiChu,
      xeXangVin,
      xeXangHang,
      xeXangModel,
      policy,
      maAmis
    });

    if (ok) onCancel();
    else setError('Không thể lưu thay đổi đơn hàng.');
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <style>
        {`
          .seamless-input, .seamless-select {
            width: 100%;
            border: 1px solid transparent;
            background: transparent;
            padding: 0;
            margin: 0;
            font-size: inherit;
            font-family: inherit;
            color: inherit;
            font-weight: inherit;
            outline: none;
            box-sizing: border-box;
            transition: all 0.2s;
            border-radius: 4px;
          }
          .seamless-input:hover, .seamless-select:hover {
            border-color: #cbd5e1;
            background: #f8fafc;
            padding: 4px;
            margin: -4px;
          }
          .seamless-input:focus, .seamless-select:focus {
            border-color: #3b82f6;
            background: #fff;
            padding: 4px;
            margin: -4px;
            box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
          }
          td:focus-within {
            position: relative;
            z-index: 10;
          }
        `}
      </style>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <table style={{ width: '100%', boxSizing: 'border-box', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '13px', border: '1px solid #cbd5e1' }}>
          <tbody>
            <tr>
              <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569', width: '18%' }}>Khách hàng</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px', width: '32%' }}>
                <input className="seamless-input" value={customer} onChange={(e) => setCustomer(e.target.value)} required />
              </td>
              <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569', width: '18%' }}>Tư vấn viên</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px', width: '32%' }}>
                <select className="seamless-select" value={staff} onChange={(e) => setStaff(e.target.value)} required>
                  {staffNames.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </td>
            </tr>
            <tr>
              <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Dòng xe</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>
                <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                  <select className="seamless-select" style={{ flex: 1, minWidth: 0, width: '0' }} value={line} onChange={(e) => setLine(e.target.value)} required>
                    {vehicleLines.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                  <select className="seamless-select" style={{ flex: 1, minWidth: 0, width: '0' }} value={version} onChange={(e) => setVersion(e.target.value)} required>
                    {versionOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>
              </td>
              <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Màu (Ngoại/Nội)</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>
                <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                  <select className="seamless-select" style={{ flex: 1, minWidth: 0, width: '0' }} value={exterior} onChange={(e) => setExterior(e.target.value)} required>
                    {defaultExteriors.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                  <select className="seamless-select" style={{ flex: 1, minWidth: 0, width: '0' }} value={interior} onChange={(e) => setInterior(e.target.value)} required>
                    {interiorOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>
              </td>
            </tr>
            <tr>
              <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Số VIN định danh</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px', color: '#0f172a', fontWeight: 700, letterSpacing: '0.05em' }}>
                {order.vin || <span style={{ color: '#94a3b8', fontStyle: 'italic', fontWeight: 400 }}>Chưa cấp</span>}
              </td>
              <td style={{ backgroundColor: '#fef3c7', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 700, color: '#92400e' }}>Ngày ghép xe</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px', color: '#0f172a', fontWeight: 600 }}>
                {order.pairedAt !== 'Chưa ghép' ? order.pairedAt : '—'}
              </td>
            </tr>
            <tr>
              <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Ngày cần xe</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>
                <input className="seamless-input" type="date" value={needDate} onChange={(e) => setNeedDate(e.target.value)} />
              </td>
              <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Ngày đặt cọc</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>
                <input className="seamless-input" type="date" value={depositDate} onChange={(e) => setDepositDate(e.target.value)} required />
              </td>
            </tr>
            <tr>
              <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Tiền đã cọc</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }} colSpan={3}>
                <input className="seamless-input" type="number" value={depositAmount !== null ? depositAmount : ''} placeholder="VD: 50000000" onChange={(e) => setDepositAmount(e.target.value ? Number(e.target.value) : null)} />
              </td>
            </tr>
            <tr>
              <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Thanh toán</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>
                <select className="seamless-select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  <option value="Tiền mặt">Tiền mặt</option>
                  <option value="Vay ngân hàng">Vay ngân hàng</option>
                  <option value="Chuyển khoản">Chuyển khoản</option>
                </select>
              </td>
              <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Nguồn khách</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>
                <input className="seamless-input" value={nguonKhach} placeholder="VD: Marketing" onChange={(e) => setNguonKhach(e.target.value)} />
              </td>
            </tr>
            <tr>
              <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Mã Hợp Đồng</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>
                <input className="seamless-input" value={contractCode} placeholder="Mã HĐ..." onChange={(e) => setContractCode(e.target.value)} />
              </td>
              <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Mã Amis</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>
                <input className="seamless-input" value={maAmis} placeholder="Mã Amis..." onChange={(e) => setMaAmis(e.target.value)} />
              </td>
            </tr>
            <tr>
              <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Ngày ký HĐ</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>
                <input className="seamless-input" type="date" value={ngayKyHopDong} onChange={(e) => setNgayKyHopDong(e.target.value)} />
              </td>
              <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Giá công bố</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>
                <input className="seamless-input" type="number" value={giaCongBo !== null ? giaCongBo : ''} placeholder="VD: 315000000" onChange={(e) => setGiaCongBo(e.target.value ? Number(e.target.value) : null)} />
              </td>
            </tr>
            <tr>
              <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Đăng ký xe</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>
                <select className="seamless-select" value={dangKyXe === true ? 'true' : dangKyXe === false ? 'false' : ''} onChange={(e) => {
                  const val = e.target.value;
                  setDangKyXe(val === 'true' ? true : val === 'false' ? false : null);
                }}>
                  <option value="">Chưa chọn</option>
                  <option value="true">Có</option>
                  <option value="false">Không</option>
                </select>
              </td>
              <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Mua bảo hiểm</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>
                <select className="seamless-select" value={muaBaoHiem === true ? 'true' : muaBaoHiem === false ? 'false' : ''} onChange={(e) => {
                  const val = e.target.value;
                  setMuaBaoHiem(val === 'true' ? true : val === 'false' ? false : null);
                }}>
                  <option value="">Chưa chọn</option>
                  <option value="true">Có</option>
                  <option value="false">Không</option>
                </select>
              </td>
            </tr>
            <tr>
              <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Địa chỉ XHĐ</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }} colSpan={3}>
                <input className="seamless-input" value={invoiceAddress} placeholder="Địa chỉ xuất hóa đơn..." onChange={(e) => setInvoiceAddress(e.target.value)} />
              </td>
            </tr>
            <tr>
              <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Ghi chú</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }} colSpan={3}>
                <input className="seamless-input" value={ghiChu} placeholder="Ghi chú thêm..." onChange={(e) => setGhiChu(e.target.value)} />
              </td>
            </tr>
            {order.status === 'Chờ phê duyệt' || order.status === 'Yêu cầu bổ sung' || order.status === 'Chờ ký hóa đơn' || order.status === 'Đã bổ sung' ? (
              <tr>
                <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }} colSpan={4}>
                  <div style={{ padding: '10px', background: '#fffbeb', borderRadius: '6px', border: '1px solid #fde68a' }}>
                    <strong>Cấu hình thu mua xe cũ (Chỉ hiển thị khi có thu mua):</strong>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '8px', width: '100%' }}>
                      <input className="seamless-input" style={{ flex: 1, minWidth: 0, width: 0, border: '1px solid #fed7aa', padding: '6px' }} value={xeXangVin} placeholder="VIN xe xăng" onChange={(e) => setXeXangVin(e.target.value)} />
                      <input className="seamless-input" style={{ flex: 1, minWidth: 0, width: 0, border: '1px solid #fed7aa', padding: '6px' }} value={xeXangHang} placeholder="Hãng xe" onChange={(e) => setXeXangHang(e.target.value)} />
                      <input className="seamless-input" style={{ flex: 1, minWidth: 0, width: 0, border: '1px solid #fed7aa', padding: '6px' }} value={xeXangModel} placeholder="Model xe" onChange={(e) => setXeXangModel(e.target.value)} />
                    </div>
                  </div>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626', background: '#fef2f2', padding: '14px 16px', borderRadius: '12px', border: '1px solid #fecaca', marginTop: '16px' }}>
            <AlertTriangle size={18} />
            <span style={{ fontSize: '14px', fontWeight: 500 }}>{error}</span>
          </div>
        )}
      </div>

      <div className="premium-footer" style={{ padding: '16px 20px', background: '#fff', borderTop: '1px solid #cbd5e1' }}>
        <button type="button" onClick={onCancel} disabled={isSubmitting} className="premium-btn-secondary">
          Hủy thay đổi
        </button>
        <button type="submit" disabled={isSubmitting} className="premium-btn-primary">
          <Save size={18} />
          <span>{isSubmitting ? 'Đang lưu...' : 'Lưu thông tin'}</span>
        </button>
      </div>
    </form>
  );
}
