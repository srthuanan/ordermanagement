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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      <form className="order-form" onSubmit={handleSubmit} style={{ padding: '24px' }}>
          <label>
            <span>Khách hàng *</span>
            <input value={customer} onChange={(e) => setCustomer(e.target.value)} required />
          </label>

          <label>
            <span>Mã Amis</span>
            <input value={maAmis} placeholder="Nhập mã Amis (nếu có)..." onChange={(e) => setMaAmis(e.target.value)} />
          </label>



          <label>
            <span>Dòng xe *</span>
            <select value={line} onChange={(e) => setLine(e.target.value)}>
              {vehicleLines.map((item) => (
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
<div className="full-span policy-picker">
            <label className="field-label">
              Chính sách bán hàng *
            </label>

            <div className={`multi-select ${policyOpen ? 'open' : ''}`} ref={policySelectRef}>
              <div className="select-box" onClick={policyLoading ? undefined : togglePolicyDropdown}>
                <div>
                  <div className="selected-main">
                    {selectedPolicyCount > 0 ? (selectedPolicyPreview || 'Đã chọn chính sách') : 'Chọn chính sách...'}
                  </div>
                  <div className="selected-more">
                    {selectedPolicyCount > 1 ? `+${selectedPolicyCount - 1}` : ''}
                  </div>
                </div>
                <span className="select-caret" />
              </div>

              <div className="dropdown-list" id="dropdownList">
                {policyLoading ? (
                  <div className="policy-picker-empty">Đang tải danh sách chính sách...</div>
                ) : filteredPolicyOptions.length === 0 ? (
                  <div className="policy-picker-empty">Không có chính sách phù hợp.</div>
                ) : (
                  filteredPolicyOptions.map((p) => {
                    const checked = policy.includes(p.ten_chinh_sach);
                    return (
                      <label key={p.ten_chinh_sach}>
                        <input
                          type="checkbox"
                          value={p.ten_chinh_sach}
                          checked={checked}
                          onChange={() => togglePolicy(p.ten_chinh_sach)}
                        />
                        <span>{p.ten_chinh_sach}</span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          </div>
          <label>
            <span>Mã hợp đồng</span>
            <input
              value={contractCode || ''}
              placeholder="Nhập mã HĐ..."
              onChange={(event) => setContractCode(event.target.value)}
              required
            />
          </label>
          <label className="full-span">
            <span>Địa chỉ xuất hóa đơn (XHD)</span>
            <input
              value={invoiceAddress || ''}
              placeholder="Nhập địa chỉ đầy đủ để xuất hóa đơn..."
              onChange={(event) => setInvoiceAddress(event.target.value)}
              required
            />
          </label>

          <div className="full-span order-extra-card">
            <div className="order-extra-title">
              <span>Thông tin XHĐ</span>
              <small>Đồng bộ với form yêu cầu hóa đơn</small>
            </div>
            <div className="order-extra-grid">
              <label>
                <span>Ngày ký hợp đồng</span>
                <input
                  type="date"
                  value={ngayKyHopDong || ''}
                  onChange={(event) => setNgayKyHopDong(event.target.value)}
                />
              </label>
              <label>
                <span>Nguồn khách</span>
                <input
                  value={nguonKhach || ''}
                  placeholder="Giới thiệu, Marketing..."
                  onChange={(event) => setNguonKhach(event.target.value)}
                />
              </label>
              <label>
                <span>Giá công bố (VNĐ)</span>
                <input
                  type="number"
                  value={giaCongBo !== null && giaCongBo !== undefined ? giaCongBo : ''}
                  placeholder="VD: 599000000"
                  onChange={(event) => setGiaCongBo(event.target.value ? Number(event.target.value) : null)}
                />
              </label>
              <label>
                <span>Mua bảo hiểm</span>
                <select
                  value={muaBaoHiem === null ? '' : muaBaoHiem ? 'true' : 'false'}
                  onChange={(event) => setMuaBaoHiem(event.target.value === '' ? null : event.target.value === 'true')}
                >
                  <option value="">Chưa chọn</option>
                  <option value="true">Có</option>
                  <option value="false">Không</option>
                </select>
              </label>
              <label>
                <span>Đăng ký xe</span>
                <select
                  value={dangKyXe === null ? '' : dangKyXe ? 'true' : 'false'}
                  onChange={(event) => setDangKyXe(event.target.value === '' ? null : event.target.value === 'true')}
                >
                  <option value="">Chưa chọn</option>
                  <option value="true">Có</option>
                  <option value="false">Không</option>
                </select>
              </label>
              <label className="full-span">
                <span>Ghi chú</span>
                <textarea
                  value={ghiChu || ''}
                  placeholder="Ghi chú cho bộ phận xuất hóa đơn..."
                  onChange={(event) => setGhiChu(event.target.value)}
                  rows={3}
                />
              </label>
            </div>
            {isGasToElectricPolicy ? (
              <div className="order-extra-gas">
                <div className="order-extra-title order-extra-title--sub">
                  <span>Thông tin xe xăng</span>
                  <small>Áp dụng cho chính sách thu cũ đổi mới</small>
                </div>
                <div className="order-extra-grid order-extra-grid--compact">
                  <label>
                    <span>VIN xe xăng</span>
                    <input
                      value={xeXangVin || ''}
                      placeholder="Nhập VIN xe xăng..."
                      onChange={(event) => setXeXangVin(event.target.value.toUpperCase())}
                    />
                  </label>
                  <label>
                    <span>Hãng xe</span>
                    <input
                      value={xeXangHang || ''}
                      placeholder="VD: Toyota"
                      onChange={(event) => setXeXangHang(event.target.value)}
                    />
                  </label>
                  <label className="full-span">
                    <span>Model xe</span>
                    <input
                      value={xeXangModel || ''}
                      placeholder="VD: Vios 1.5G"
                      onChange={(event) => setXeXangModel(event.target.value)}
                    />
                  </label>
                </div>
              </div>
            ) : null}
          </div>

          <label>
            <span>Ngày cọc *</span>
            <input
              type="date"
              value={depositDate}
              onChange={(event) => setDepositDate(event.target.value)}
              required
              />
            </label>
          <label>
            <span>Ngày cần xe *</span>
            <input
              type="date"
              value={needDate}
              onChange={(event) => setNeedDate(event.target.value)}
              required
            />
          </label>

          
          

          
        

          {error ? (
            <div className="form-error">
              <AlertTriangle size={17} />
              <span>{error}</span>
            </div>
          ) : null}

          <div className="modal-actions" style={{ position: 'sticky', bottom: '-24px', background: 'white', padding: '16px 0', marginTop: '24px', borderTop: '1px solid #e2e8f0', zIndex: 10 }}>
            <button type="button" className="ghost-button" onClick={onCancel} disabled={isSubmitting}>
              Hủy
            </button>
            <button type="submit" className="primary-button" disabled={isSubmitting}>
              <Save size={18} />
              <span>{isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
            </button>
          </div>
        </form>
    </div>
  );
};
