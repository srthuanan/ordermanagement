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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <form className="order-form-inline-table" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', border: '1px solid #cbd5e1', tableLayout: 'fixed' }}>
          <tbody>
            <tr>
              <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569', width: '18%' }}>Khách hàng *</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '4px 8px', width: '32%' }}>
                <input value={customer} onChange={(e) => setCustomer(e.target.value)} required style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px 8px', outline: 'none' }} />
              </td>
              <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569', width: '18%' }}>Tư vấn viên *</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '4px 8px', width: '32%' }}>
                <select value={staff} onChange={(e) => setStaff(e.target.value)} required style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px 8px', outline: 'none' }}>
                  {staffNames.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </td>
            </tr>
            <tr>
              <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Dòng xe *</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '4px 8px' }}>
                <select value={line} onChange={(e) => setLine(e.target.value)} style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px 8px', outline: 'none' }}>
                  {vehicleLines.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </td>
              <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Màu (Ngoại/Nội) *</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '4px 8px' }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <select value={exterior} onChange={(e) => setExterior(e.target.value)} style={{ width: '50%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px 8px', outline: 'none' }}>
                    {defaultExteriors.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                  <select value={interior} onChange={(e) => setInterior(e.target.value)} style={{ width: '50%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px 8px', outline: 'none' }}>
                    {interiorOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>
              </td>
            </tr>
            <tr>
              <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Số VIN định danh</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px', color: '#0f172a', fontWeight: 700 }}>
                {order.vin || <span style={{ color: '#94a3b8', fontStyle: 'italic', fontWeight: 400 }}>Chưa cấp</span>}
              </td>
              <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Ngày cần xe *</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '4px 8px' }}>
                <input type="date" value={needDate} onChange={(e) => setNeedDate(e.target.value)} required style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px 8px', outline: 'none' }} />
              </td>
            </tr>
            <tr>
              <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Ngày đặt cọc *</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '4px 8px' }}>
                <input type="date" value={depositDate} onChange={(e) => setDepositDate(e.target.value)} required style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px 8px', outline: 'none' }} />
              </td>
              <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Tiền đã cọc</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '4px 8px' }}>
                <input type="number" value={depositAmount !== null && depositAmount !== undefined ? depositAmount : ''} placeholder="VD: 50000000" onChange={(e) => setDepositAmount(e.target.value ? Number(e.target.value) : null)} style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px 8px', outline: 'none' }} />
              </td>
            </tr>
            <tr>
              <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Thanh toán</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '4px 8px' }}>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px 8px', outline: 'none' }}>
                  <option value="Tiền mặt">Tiền mặt</option>
                  <option value="Vay ngân hàng">Vay ngân hàng</option>
                </select>
              </td>
              <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Nguồn khách</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '4px 8px' }}>
                <input value={nguonKhach} placeholder="VD: Marketing" onChange={(e) => setNguonKhach(e.target.value)} style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px 8px', outline: 'none' }} />
              </td>
            </tr>
            <tr>
              <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Mã Hợp Đồng</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '4px 8px' }}>
                <input value={contractCode} placeholder="Nhập mã HĐ..." onChange={(e) => setContractCode(e.target.value)} style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px 8px', outline: 'none' }} />
              </td>
              <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Mã Amis</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '4px 8px' }}>
                <input value={maAmis} placeholder="Nhập mã Amis..." onChange={(e) => setMaAmis(e.target.value)} style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px 8px', outline: 'none' }} />
              </td>
            </tr>
            <tr>
              <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Ngày ký HĐ</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '4px 8px' }}>
                <input type="date" value={ngayKyHopDong} onChange={(e) => setNgayKyHopDong(e.target.value)} style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px 8px', outline: 'none' }} />
              </td>
              <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Giá công bố</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '4px 8px' }}>
                <input type="number" value={giaCongBo !== null && giaCongBo !== undefined ? giaCongBo : ''} placeholder="VD: 599000000" onChange={(e) => setGiaCongBo(e.target.value ? Number(e.target.value) : null)} style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px 8px', outline: 'none' }} />
              </td>
            </tr>
            <tr>
              <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Đăng ký xe</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '4px 8px' }}>
                <select value={dangKyXe === null ? '' : dangKyXe ? 'true' : 'false'} onChange={(e) => setDangKyXe(e.target.value === '' ? null : e.target.value === 'true')} style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px 8px', outline: 'none' }}>
                  <option value="">Chưa chọn</option><option value="true">Có</option><option value="false">Không</option>
                </select>
              </td>
              <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Mua bảo hiểm</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '4px 8px' }}>
                <select value={muaBaoHiem === null ? '' : muaBaoHiem ? 'true' : 'false'} onChange={(e) => setMuaBaoHiem(e.target.value === '' ? null : e.target.value === 'true')} style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px 8px', outline: 'none' }}>
                  <option value="">Chưa chọn</option><option value="true">Có</option><option value="false">Không</option>
                </select>
              </td>
            </tr>
            {isGasToElectricPolicy ? (
              <tr>
                <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Xe xăng thu cũ</td>
                <td colSpan={3} style={{ border: '1px solid #cbd5e1', padding: '4px 8px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input value={xeXangVin} placeholder="VIN xe xăng" onChange={(e) => setXeXangVin(e.target.value.toUpperCase())} style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px 8px', outline: 'none', minWidth: 0 }} />
                    <input value={xeXangHang} placeholder="Hãng (VD: Toyota)" onChange={(e) => setXeXangHang(e.target.value)} style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px 8px', outline: 'none', minWidth: 0 }} />
                    <input value={xeXangModel} placeholder="Model (VD: Vios 1.5G)" onChange={(e) => setXeXangModel(e.target.value)} style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px 8px', outline: 'none', minWidth: 0 }} />
                  </div>
                </td>
              </tr>
            ) : null}
            <tr>
              <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Chính sách</td>
              <td colSpan={3} style={{ border: '1px solid #cbd5e1', padding: '4px 8px', position: 'relative' }}>
                <div className={`multi-select ${policyOpen ? 'open' : ''}`} ref={policySelectRef} style={{ width: '100%', position: 'static' }}>
                  <div className="select-box" onClick={policyLoading ? undefined : togglePolicyDropdown} style={{ border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px 8px', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1 }}>
                      <div className="selected-main" style={{ fontSize: '13px' }}>
                        {selectedPolicyCount > 0 ? (selectedPolicyPreview || 'Đã chọn chính sách') : 'Chọn chính sách...'}
                      </div>
                      <div className="selected-more" style={{ fontSize: '12px', color: '#64748b' }}>
                        {selectedPolicyCount > 1 ? `+${selectedPolicyCount - 1}` : ''}
                      </div>
                    </div>
                    <span className="select-caret" />
                  </div>

                  <div className="dropdown-list" id="dropdownList" style={{ left: 0, right: 0, marginTop: '4px', position: 'absolute', zIndex: 50, border: '1px solid #cbd5e1', borderRadius: '6px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
                    {policyLoading ? (
                      <div className="policy-picker-empty" style={{ padding: '8px 12px' }}>Đang tải danh sách chính sách...</div>
                    ) : filteredPolicyOptions.length === 0 ? (
                      <div className="policy-picker-empty" style={{ padding: '8px 12px' }}>Không có chính sách phù hợp.</div>
                    ) : (
                      <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        {filteredPolicyOptions.map((p) => {
                          const checked = policy.includes(p.ten_chinh_sach);
                          return (
                            <label key={p.ten_chinh_sach} style={{ padding: '6px 12px', display: 'flex', gap: '8px', cursor: 'pointer', margin: 0, alignItems: 'center', backgroundColor: checked ? '#f0fdf4' : 'transparent' }}>
                              <input type="checkbox" value={p.ten_chinh_sach} checked={checked} onChange={() => togglePolicy(p.ten_chinh_sach)} style={{ margin: 0 }} />
                              <span style={{ fontSize: '13px', lineHeight: 1.4 }}>{p.ten_chinh_sach}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </td>
            </tr>
            <tr>
              <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Địa chỉ XHD</td>
              <td colSpan={3} style={{ border: '1px solid #cbd5e1', padding: '4px 8px' }}>
                <input value={invoiceAddress} placeholder="Nhập địa chỉ đầy đủ để xuất hóa đơn..." onChange={(e) => setInvoiceAddress(e.target.value)} style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px 8px', outline: 'none' }} />
              </td>
            </tr>
            <tr>
              <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Ghi chú</td>
              <td colSpan={3} style={{ border: '1px solid #cbd5e1', padding: '4px 8px' }}>
                <textarea value={ghiChu} placeholder="Ghi chú cho bộ phận xuất hóa đơn..." onChange={(e) => setGhiChu(e.target.value)} rows={2} style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px 8px', resize: 'vertical', outline: 'none', fontFamily: 'inherit', fontSize: '13px' }} />
              </td>
            </tr>
          </tbody>
        </table>
        {error ? (
          <div className="form-error" style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#b91c1c', background: '#fef2f2', padding: '12px', borderRadius: '6px', border: '1px solid #fecaca' }}>
            <AlertTriangle size={17} />
            <span style={{ fontSize: '13px', fontWeight: 500 }}>{error}</span>
          </div>
        ) : null}

        <div style={{ paddingTop: '16px', display: 'flex', gap: '8px', marginTop: 'auto' }}>
          <button type="button" onClick={onCancel} disabled={isSubmitting} style={{ flex: 1, padding: '10px', fontSize: '13px', fontWeight: 600, border: '1px solid #cbd5e1', background: '#ffffff', color: '#64748b', cursor: 'pointer', borderRadius: 0 }}>Hủy</button>
          <button type="submit" disabled={isSubmitting} style={{ flex: 2, padding: '10px', fontSize: '13px', fontWeight: 600, border: '1px solid #1d4ed8', background: '#1d4ed8', color: '#ffffff', cursor: 'pointer', borderRadius: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Save size={16} />
            <span>{isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
