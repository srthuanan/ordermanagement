import React from 'react';
import { X, Plus, AlertTriangle } from 'lucide-react';
import * as apiService from '../../services/apiService';
import { InventoryItem, NewOrderInput, SalesPolicyRow, VehicleConfigRow } from '../../types';
import {
  interiorColorRules,
  defaultSalesPolicies
} from '../../constants';
import { parseVehicleConfigs } from '../../utils/vehicleConfigUtils';

interface CreateOrderModalProps {
  error: string;
  isCreating: boolean;
  initialVehicle?: InventoryItem | null;
  currentStaffName: string;
  onClose: () => void;
  onSubmit: (input: NewOrderInput) => void;
  vehicleConfigs: VehicleConfigRow[];
}

export const CreateOrderModal: React.FC<CreateOrderModalProps> = ({
  error,
  isCreating,
  initialVehicle,
  currentStaffName,
  onClose,
  onSubmit,
  vehicleConfigs
}) => {
  const { vehicleLines, versionsMap, defaultExteriors, defaultInteriors } = React.useMemo(
    () => parseVehicleConfigs(vehicleConfigs),
    [vehicleConfigs]
  );
  
  const resolvedStaffName = currentStaffName.trim() || 'Nhân viên';
  const [form, setForm] = React.useState<NewOrderInput>({
    orderId: '',
    customer: '',
    line: initialVehicle?.line || vehicleLines[0],
    version: initialVehicle?.version || versionsMap[vehicleLines[0]]?.[0] || '',
    exterior: initialVehicle?.exterior || defaultExteriors[0],
    interior: initialVehicle?.interior || defaultInteriors[0],
    staff: resolvedStaffName,
    policy: [],
    depositDate: '',
    needDate: new Date().toISOString().slice(0, 10),
    pairedVin: initialVehicle?.vin,
    depositAmount: null,
    ngayKyHopDong: '',
    invoiceAddress: '',
    contractCode: '',
    paymentMethod: 'Tiền mặt',
    nguonKhach: '',
    muaBaoHiem: null,
    dangKyXe: null,
    xeXangVin: '',
    xeXangHang: '',
    xeXangModel: '',
    giaCongBo: null,
    ghiChu: ''
  });
  const [policyRows, setPolicyRows] = React.useState<SalesPolicyRow[]>([]);
  const [policyLoading, setPolicyLoading] = React.useState(true);
  const [policyOpen, setPolicyOpen] = React.useState(false);
  const [validationError, setValidationError] = React.useState('');
  const policySelectRef = React.useRef<HTMLDivElement | null>(null);
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
      if (!rule.versions || rule.versions.includes(versionNorm)) {
        // Only return rules if they match the newly fetched dynamic interiors, or just return the rule colors directly
        return rule.colors;
      }
    }
    return defaultInteriors;
  }, [form.line, form.version, defaultInteriors]);

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
    updateField('staff', resolvedStaffName);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedStaffName]);

  React.useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await apiService.getSalesPolicies();
      if (!active) return;
      setPolicyRows(data || defaultSalesPolicies.map((name) => ({ ten_chinh_sach: name, dong_xe: 'Tất cả các dòng xe' })));
      setPolicyLoading(false);
    })();

    return () => {
      active = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const policyOptions = React.useMemo(() => {
    const lineNorm = form.line.toLowerCase().trim();
    return policyRows.filter((item) => {
      const name = (item.ten_chinh_sach || '').toLowerCase();
      const line = (item.dong_xe || '').toLowerCase();
      if (!name) return false;
      if (!line || line.includes('tất cả') || line.includes('all')) return true;
      return line.includes(lineNorm) || lineNorm.includes(line);
    });
  }, [form.line, policyRows]);

  const filteredPolicyOptions = React.useMemo(() => {
    return policyOptions;
  }, [policyOptions]);

  React.useEffect(() => {
    if (form.policy.length === 0) return;
    const allowed = new Set(policyOptions.map((item) => item.ten_chinh_sach));
    const filtered = form.policy.filter((policy) => allowed.has(policy));
    if (filtered.length !== form.policy.length) {
      updateField('policy', filtered);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.line, policyOptions]);

  const selectedPolicyCount = form.policy.length;
  const selectedPolicyPreview = form.policy[0] || '';
  const isGasToElectricPolicy = form.policy.some((name) => name.toLowerCase().includes('thu cũ'));
  const isFormValid = Boolean(
    form.orderId.trim() &&
    form.customer.trim() &&
    form.line.trim() &&
    form.version.trim() &&
    form.exterior.trim() &&
    form.interior.trim() &&
    form.staff.trim() &&
    form.policy.length > 0 &&
    form.depositAmount !== null &&
    form.depositAmount !== undefined &&
    form.invoiceAddress?.trim() &&
    form.contractCode?.trim() &&
    form.paymentMethod?.trim() &&
    form.depositDate &&
    form.needDate &&
    !policyLoading
  );

  function updateField<K extends keyof NewOrderInput>(key: K, value: NewOrderInput[K]) {
    if (validationError) setValidationError('');
    setForm((current) => ({ ...current, [key]: value }));
  }

  function togglePolicy(name: string) {
    setForm((current) => {
      const currentPolicies = current.policy || [];
      return {
        ...current,
        policy: currentPolicies.includes(name)
          ? currentPolicies.filter((item) => item !== name)
          : [...currentPolicies, name]
      };
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

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!isFormValid) {
      setValidationError('Vui lòng điền đầy đủ tất cả trường thông tin trước khi tạo đơn.');
      return;
    }
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
            <X size={20} />
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
            <select value={form.line} onChange={(event) => updateField('line', event.target.value)} disabled={isVehicleLocked} required>
              {vehicleLines.map((line) => (
                <option key={line} value={line}>{line}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Phiên bản *</span>
            <select value={form.version} onChange={(event) => updateField('version', event.target.value)} disabled={isVehicleLocked} required>
              {versionOptions.map((version) => (
                <option key={version} value={version}>{version}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Ngoại thất *</span>
            <select value={form.exterior} onChange={(event) => updateField('exterior', event.target.value)} disabled={isVehicleLocked} required>
              {defaultExteriors.map((color) => (
                <option key={color} value={color}>{color}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Nội thất *</span>
            <select value={form.interior} onChange={(event) => updateField('interior', event.target.value)} disabled={isVehicleLocked} required>
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
              required
            />
          </label>
          <label>
            <span>Hình thức thanh toán</span>
            <select value={form.paymentMethod || 'Tiền mặt'} onChange={(event) => updateField('paymentMethod', event.target.value)} required>
              <option value="Tiền mặt">Tiền mặt</option>
              <option value="Vay ngân hàng">Vay ngân hàng</option>
              <option value="Chuyển khoản">Chuyển khoản</option>
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
                  filteredPolicyOptions.map((policy) => {
                    const checked = form.policy.includes(policy.ten_chinh_sach);
                    return (
                      <label key={policy.ten_chinh_sach}>
                        <input
                          type="checkbox"
                          value={policy.ten_chinh_sach}
                          checked={checked}
                          onChange={() => togglePolicy(policy.ten_chinh_sach)}
                        />
                        <span>{policy.ten_chinh_sach}</span>
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
              value={form.contractCode || ''}
              placeholder="Nhập mã HĐ..."
              onChange={(event) => updateField('contractCode', event.target.value)}
              required
            />
          </label>
          <label className="full-span">
            <span>Địa chỉ xuất hóa đơn (XHD)</span>
            <input
              value={form.invoiceAddress || ''}
              placeholder="Nhập địa chỉ đầy đủ để xuất hóa đơn..."
              onChange={(event) => updateField('invoiceAddress', event.target.value)}
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
                  value={form.ngayKyHopDong || ''}
                  onChange={(event) => updateField('ngayKyHopDong', event.target.value)}
                />
              </label>
              <label>
                <span>Nguồn khách</span>
                <input
                  value={form.nguonKhach || ''}
                  placeholder="Giới thiệu, Marketing..."
                  onChange={(event) => updateField('nguonKhach', event.target.value)}
                />
              </label>
              <label>
                <span>Giá công bố (VNĐ)</span>
                <input
                  type="number"
                  value={form.giaCongBo !== null && form.giaCongBo !== undefined ? form.giaCongBo : ''}
                  placeholder="VD: 599000000"
                  onChange={(event) => updateField('giaCongBo', event.target.value ? Number(event.target.value) : null)}
                />
              </label>
              <label>
                <span>Mua bảo hiểm</span>
                <select
                  value={form.muaBaoHiem === null ? '' : form.muaBaoHiem ? 'true' : 'false'}
                  onChange={(event) => updateField('muaBaoHiem', event.target.value === '' ? null : event.target.value === 'true')}
                >
                  <option value="">Chưa chọn</option>
                  <option value="true">Có</option>
                  <option value="false">Không</option>
                </select>
              </label>
              <label>
                <span>Đăng ký xe</span>
                <select
                  value={form.dangKyXe === null ? '' : form.dangKyXe ? 'true' : 'false'}
                  onChange={(event) => updateField('dangKyXe', event.target.value === '' ? null : event.target.value === 'true')}
                >
                  <option value="">Chưa chọn</option>
                  <option value="true">Có</option>
                  <option value="false">Không</option>
                </select>
              </label>
              <label className="full-span">
                <span>Ghi chú</span>
                <textarea
                  value={form.ghiChu || ''}
                  placeholder="Ghi chú cho bộ phận xuất hóa đơn..."
                  onChange={(event) => updateField('ghiChu', event.target.value)}
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
                      value={form.xeXangVin || ''}
                      placeholder="Nhập VIN xe xăng..."
                      onChange={(event) => updateField('xeXangVin', event.target.value.toUpperCase())}
                    />
                  </label>
                  <label>
                    <span>Hãng xe</span>
                    <input
                      value={form.xeXangHang || ''}
                      placeholder="VD: Toyota"
                      onChange={(event) => updateField('xeXangHang', event.target.value)}
                    />
                  </label>
                  <label className="full-span">
                    <span>Model xe</span>
                    <input
                      value={form.xeXangModel || ''}
                      placeholder="VD: Vios 1.5G"
                      onChange={(event) => updateField('xeXangModel', event.target.value)}
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
              value={form.depositDate}
              onChange={(event) => updateField('depositDate', event.target.value)}
              required
              />
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
          {validationError ? (
            <div className="form-error">
              <AlertTriangle size={17} />
              <span>{validationError}</span>
            </div>
          ) : null}

          <div className="modal-actions">
            <button type="button" className="ghost-button" onClick={onClose} disabled={isCreating}>
              Hủy
            </button>
            <button type="submit" className="primary-button" disabled={isCreating || !isFormValid}>
              <Plus size={18} />
              <span>{isCreating ? 'Đang tạo...' : initialVehicle ? 'Tạo đơn & ghép xe' : 'Tạo đơn'}</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
