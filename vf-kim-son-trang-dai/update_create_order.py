import sys

file_path = "c:\\Users\\USER\\Documents\\ordermanagement\\vf-kim-son-trang-dai\\src\\components\\modals\\CreateOrderModal.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

start_idx = content.find('<form onSubmit={handleSubmit}')
end_idx = content.find('</form>', start_idx) + len('</form>')

if start_idx == -1 or end_idx == -1:
    print("Could not find form")
    sys.exit(1)

new_form = """<form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', paddingBottom: '24px', overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* THONG TIN CHUNG */}
            <div style={{ overflow: 'hidden', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff' }}>
              <div style={{ backgroundColor: '#f1f5f9', padding: '8px 12px', fontWeight: 700, color: '#334155', borderBottom: '1px solid #cbd5e1' }}>Thông tin chung</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <tbody>
                  <tr>
                    <td style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', padding: '10px 12px', fontWeight: 600, color: '#475569', width: '20%' }}>Mã ĐH / VSO <span style={{color: '#ef4444'}}>*</span></td>
                    <td style={{ borderBottom: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', padding: '6px 8px', width: '30%' }}>
                      <input value={form.orderId} placeholder="G401xx-VSO..." onChange={(e) => updateField('orderId', e.target.value.trim().toUpperCase())} required style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent' }} />
                    </td>
                    <td style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', padding: '10px 12px', fontWeight: 600, color: '#475569', width: '20%' }}>Khách hàng <span style={{color: '#ef4444'}}>*</span></td>
                    <td style={{ borderBottom: '1px solid #cbd5e1', padding: '6px 8px', width: '30%' }}>
                      <input value={form.customer} placeholder="Tên khách hàng" onChange={(e) => updateField('customer', e.target.value)} required style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent' }} />
                    </td>
                  </tr>
                  {initialVehicle ? (
                  <tr>
                    <td style={{ backgroundColor: '#f0fdf4', borderBottom: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', padding: '10px 12px', fontWeight: 600, color: '#166534' }}>Ghép xe có sẵn</td>
                    <td colSpan={3} style={{ borderBottom: '1px solid #cbd5e1', padding: '6px 8px', color: '#15803d', fontWeight: 500 }}>
                      {initialVehicle.vin} · {initialVehicle.line} / {initialVehicle.version} · {initialVehicle.exterior} / {initialVehicle.interior}
                    </td>
                  </tr>
                  ) : null}
                  <tr>
                    <td style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', padding: '10px 12px', fontWeight: 600, color: '#475569' }}>Dòng xe <span style={{color: '#ef4444'}}>*</span></td>
                    <td style={{ borderBottom: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', padding: '6px 8px' }}>
                      <select value={form.line} onChange={(e) => updateField('line', e.target.value)} disabled={isVehicleLocked} required style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent' }}>
                        {vehicleLines.map((line) => <option key={line} value={line}>{line}</option>)}
                      </select>
                    </td>
                    <td style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', padding: '10px 12px', fontWeight: 600, color: '#475569' }}>Phiên bản <span style={{color: '#ef4444'}}>*</span></td>
                    <td style={{ borderBottom: '1px solid #cbd5e1', padding: '6px 8px' }}>
                      <select value={form.version} onChange={(e) => updateField('version', e.target.value)} disabled={isVehicleLocked} required style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent' }}>
                        {versionOptions.map((v) => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', padding: '10px 12px', fontWeight: 600, color: '#475569' }}>Màu ngoại thất <span style={{color: '#ef4444'}}>*</span></td>
                    <td style={{ borderBottom: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', padding: '6px 8px' }}>
                      <select value={form.exterior} onChange={(e) => updateField('exterior', e.target.value)} disabled={isVehicleLocked} required style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent' }}>
                        {defaultExteriors.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </td>
                    <td style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', padding: '10px 12px', fontWeight: 600, color: '#475569' }}>Màu nội thất <span style={{color: '#ef4444'}}>*</span></td>
                    <td style={{ borderBottom: '1px solid #cbd5e1', padding: '6px 8px' }}>
                      <select value={form.interior} onChange={(e) => updateField('interior', e.target.value)} disabled={isVehicleLocked} required style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent' }}>
                        {interiorOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', padding: '10px 12px', fontWeight: 600, color: '#475569' }}>Tiền cọc (VNĐ) <span style={{color: '#ef4444'}}>*</span></td>
                    <td style={{ borderBottom: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', padding: '6px 8px' }}>
                      <input type="number" value={form.depositAmount !== null && form.depositAmount !== undefined ? form.depositAmount : ''} placeholder="VD: 50000000" onChange={(e) => updateField('depositAmount', e.target.value ? Number(e.target.value) : null)} required style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent' }} />
                    </td>
                    <td style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', padding: '10px 12px', fontWeight: 600, color: '#475569' }}>Thanh toán <span style={{color: '#ef4444'}}>*</span></td>
                    <td style={{ borderBottom: '1px solid #cbd5e1', padding: '6px 8px' }}>
                      <select value={form.paymentMethod || 'Tiền mặt'} onChange={(e) => updateField('paymentMethod', e.target.value)} required style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent' }}>
                        <option value="Tiền mặt">Tiền mặt</option>
                        <option value="Vay ngân hàng">Vay ngân hàng</option>
                        <option value="Chuyển khoản">Chuyển khoản</option>
                      </select>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', padding: '10px 12px', fontWeight: 600, color: '#475569' }}>Ngày cọc <span style={{color: '#ef4444'}}>*</span></td>
                    <td style={{ borderBottom: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', padding: '6px 8px' }}>
                      <input type="date" value={form.depositDate} onChange={(e) => updateField('depositDate', e.target.value)} required style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent' }} />
                    </td>
                    <td style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', padding: '10px 12px', fontWeight: 600, color: '#475569' }}>Ngày cần xe <span style={{color: '#ef4444'}}>*</span></td>
                    <td style={{ borderBottom: '1px solid #cbd5e1', padding: '6px 8px' }}>
                      <input type="date" value={form.needDate} onChange={(e) => updateField('needDate', e.target.value)} required style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent' }} />
                    </td>
                  </tr>
                  <tr>
                    <td style={{ backgroundColor: '#f8fafc', borderRight: '1px solid #cbd5e1', padding: '10px 12px', fontWeight: 600, color: '#475569' }}>Chính sách BH <span style={{color: '#ef4444'}}>*</span></td>
                    <td colSpan={3} style={{ padding: '6px 8px' }}>
                      <div className={`multi-select ${policyOpen ? 'open' : ''}`} ref={policySelectRef} style={{ border: 'none', padding: 0 }}>
                        <div className="select-box" onClick={policyLoading ? undefined : togglePolicyDropdown} style={{ border: '1px solid #e2e8f0', background: '#f8fafc', minHeight: '34px' }}>
                          <div>
                            <div className="selected-main">{selectedPolicyCount > 0 ? (selectedPolicyPreview || 'Đã chọn chính sách') : 'Chọn chính sách...'}</div>
                            <div className="selected-more">{selectedPolicyCount > 1 ? `+${selectedPolicyCount - 1}` : ''}</div>
                          </div>
                          <span className="select-caret" />
                        </div>
                        <div className="dropdown-list" id="dropdownList">
                          {policyLoading ? <div className="policy-picker-empty">Đang tải...</div> : filteredPolicyOptions.length === 0 ? <div className="policy-picker-empty">Không có chính sách</div> : filteredPolicyOptions.map(p => (
                            <label key={p.ten_chinh_sach}>
                              <input type="checkbox" value={p.ten_chinh_sach} checked={form.policy.includes(p.ten_chinh_sach)} onChange={() => togglePolicy(p.ten_chinh_sach)} />
                              <span>{p.ten_chinh_sach}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* THONG TIN XUAT HOA DON */}
            <div style={{ overflow: 'hidden', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff' }}>
              <div style={{ backgroundColor: '#f1f5f9', padding: '8px 12px', fontWeight: 700, color: '#334155', borderBottom: '1px solid #cbd5e1' }}>Thông tin Xuất Hóa Đơn (Bắt buộc)</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <tbody>
                  <tr>
                    <td style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', padding: '10px 12px', fontWeight: 600, color: '#475569', width: '20%' }}>Mã Hợp Đồng <span style={{color: '#ef4444'}}>*</span></td>
                    <td style={{ borderBottom: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', padding: '6px 8px', width: '30%' }}>
                      <input value={form.contractCode || ''} placeholder="Nhập mã HĐ..." onChange={(e) => updateField('contractCode', e.target.value)} required style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent' }} />
                    </td>
                    <td style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', padding: '10px 12px', fontWeight: 600, color: '#475569', width: '20%' }}>Mã Amis <span style={{color: '#ef4444'}}>*</span></td>
                    <td style={{ borderBottom: '1px solid #cbd5e1', padding: '6px 8px', width: '30%' }}>
                      <input value={form.maAmis || ''} placeholder="Nhập mã Amis..." onChange={(e) => updateField('maAmis', e.target.value)} required style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent' }} />
                    </td>
                  </tr>
                  <tr>
                    <td style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', padding: '10px 12px', fontWeight: 600, color: '#475569' }}>Địa chỉ XHĐ <span style={{color: '#ef4444'}}>*</span></td>
                    <td colSpan={3} style={{ borderBottom: '1px solid #cbd5e1', padding: '6px 8px' }}>
                      <input value={form.invoiceAddress || ''} placeholder="Nhập địa chỉ đầy đủ để xuất hóa đơn..." onChange={(e) => updateField('invoiceAddress', e.target.value)} required style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent' }} />
                    </td>
                  </tr>
                  <tr>
                    <td style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', padding: '10px 12px', fontWeight: 600, color: '#475569' }}>Ngày ký HĐ <span style={{color: '#ef4444'}}>*</span></td>
                    <td style={{ borderBottom: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', padding: '6px 8px' }}>
                      <input type="date" value={form.ngayKyHopDong || ''} onChange={(e) => updateField('ngayKyHopDong', e.target.value)} required style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent' }} />
                    </td>
                    <td style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', padding: '10px 12px', fontWeight: 600, color: '#475569' }}>Nguồn khách <span style={{color: '#ef4444'}}>*</span></td>
                    <td style={{ borderBottom: '1px solid #cbd5e1', padding: '6px 8px' }}>
                      <input value={form.nguonKhach || ''} placeholder="Giới thiệu, Marketing..." onChange={(e) => updateField('nguonKhach', e.target.value)} required style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent' }} />
                    </td>
                  </tr>
                  <tr>
                    <td style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', padding: '10px 12px', fontWeight: 600, color: '#475569' }}>Giá công bố <span style={{color: '#ef4444'}}>*</span></td>
                    <td style={{ borderBottom: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', padding: '6px 8px' }}>
                      <input type="number" value={form.giaCongBo !== null && form.giaCongBo !== undefined ? form.giaCongBo : ''} placeholder="VD: 599000000" onChange={(e) => updateField('giaCongBo', e.target.value ? Number(e.target.value) : null)} required style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent' }} />
                    </td>
                    <td style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', padding: '10px 12px', fontWeight: 600, color: '#475569' }}>Bảo hiểm / ĐK <span style={{color: '#ef4444'}}>*</span></td>
                    <td style={{ borderBottom: '1px solid #cbd5e1', padding: '6px 8px', display: 'flex', gap: '8px' }}>
                      <select value={form.muaBaoHiem === null ? '' : form.muaBaoHiem ? 'true' : 'false'} onChange={(e) => updateField('muaBaoHiem', e.target.value === '' ? null : e.target.value === 'true')} required style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: '4px', outline: 'none' }}>
                        <option value="">BH: Chưa chọn</option>
                        <option value="true">BH: Có</option>
                        <option value="false">BH: Không</option>
                      </select>
                      <select value={form.dangKyXe === null ? '' : form.dangKyXe ? 'true' : 'false'} onChange={(e) => updateField('dangKyXe', e.target.value === '' ? null : e.target.value === 'true')} required style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: '4px', outline: 'none' }}>
                        <option value="">ĐK: Chưa chọn</option>
                        <option value="true">ĐK: Có</option>
                        <option value="false">ĐK: Không</option>
                      </select>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ backgroundColor: '#f8fafc', borderRight: '1px solid #cbd5e1', padding: '10px 12px', fontWeight: 600, color: '#475569' }}>Ghi chú XHĐ</td>
                    <td colSpan={3} style={{ padding: '6px 8px' }}>
                      <textarea value={form.ghiChu || ''} placeholder="Ghi chú cho bộ phận XHĐ..." onChange={(e) => updateField('ghiChu', e.target.value)} rows={2} style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', resize: 'vertical' }} />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* THU CU XE XANG */}
            {isGasToElectricPolicy && (
            <div style={{ overflow: 'hidden', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff' }}>
              <div style={{ backgroundColor: '#fff7ed', padding: '8px 12px', fontWeight: 700, color: '#9a3412', borderBottom: '1px solid #cbd5e1' }}>Thu cũ đổi mới (Xe xăng)</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <tbody>
                  <tr>
                    <td style={{ backgroundColor: '#fff7ed', borderRight: '1px solid #cbd5e1', padding: '10px 12px', fontWeight: 600, color: '#9a3412', width: '20%' }}>Thông tin xe <span style={{color: '#ef4444'}}>*</span></td>
                    <td colSpan={3} style={{ padding: '6px 8px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input value={form.xeXangVin || ''} placeholder="VIN xe xăng" onChange={(e) => updateField('xeXangVin', e.target.value.toUpperCase())} required style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px 8px', outline: 'none' }} />
                        <input value={form.xeXangHang || ''} placeholder="Hãng (VD: Toyota)" onChange={(e) => updateField('xeXangHang', e.target.value)} required style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px 8px', outline: 'none' }} />
                        <input value={form.xeXangModel || ''} placeholder="Model (VD: Vios 1.5G)" onChange={(e) => updateField('xeXangModel', e.target.value)} required style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px 8px', outline: 'none' }} />
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            )}
          </div>

          {error ? (
            <div className="form-error" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626', background: '#fef2f2', padding: '12px', borderRadius: '8px', border: '1px solid #fecaca', marginTop: '20px' }}>
              <AlertTriangle size={17} />
              <span>{error}</span>
            </div>
          ) : null}
          {validationError ? (
            <div className="form-error" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626', background: '#fef2f2', padding: '12px', borderRadius: '8px', border: '1px solid #fecaca', marginTop: '20px' }}>
              <AlertTriangle size={17} />
              <span>{validationError}</span>
            </div>
          ) : null}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
            <button type="button" onClick={onClose} disabled={isCreating} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>
              Hủy
            </button>
            <button type="submit" disabled={isCreating || !isFormValid} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: (!isFormValid || isCreating) ? '#94a3b8' : '#0f172a', color: '#fff', fontWeight: 600, cursor: (!isFormValid || isCreating) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={18} />
              <span>{isCreating ? 'Đang tạo...' : initialVehicle ? 'Tạo đơn & ghép xe' : 'Tạo đơn'}</span>
            </button>
          </div>
        </form>"""

new_content = content[:start_idx] + new_form + content[end_idx:]
with open(file_path, "w", encoding="utf-8") as f:
    f.write(new_content)
