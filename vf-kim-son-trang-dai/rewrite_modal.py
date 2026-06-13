import sys

file_path = "c:\\Users\\USER\\Documents\\ordermanagement\\vf-kim-son-trang-dai\\src\\components\\modals\\CreateOrderModal.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

start_idx = content.find('<form onSubmit={handleSubmit}')
end_idx = content.find('</form>', start_idx) + len('</form>')

if start_idx == -1 or end_idx == -1:
    print("Could not find form")
    sys.exit(1)

new_form = """<form onSubmit={handleSubmit} className="premium-form-layout" style={{ flex: 1, overflowY: 'auto' }}>
          
          {/* CARD: THÔNG TIN CHUNG */}
          <div className="premium-card">
            <div className="premium-card-header">
              <h3 className="premium-card-title">
                <span style={{color: '#3b82f6'}}>●</span> Thông tin chung
              </h3>
            </div>
            
            {initialVehicle && (
              <div style={{ padding: '16px 20px', background: '#f0fdf4', borderBottom: '1px solid #bbf7d0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#166534', textTransform: 'uppercase' }}>Ghép xe có sẵn</span>
                <span style={{ color: '#15803d', fontWeight: 600, fontSize: '14px' }}>
                  {initialVehicle.vin} · {initialVehicle.line} / {initialVehicle.version} · {initialVehicle.exterior} / {initialVehicle.interior}
                </span>
              </div>
            )}
            
            <div className="premium-card-body">
              <div className="premium-form-group">
                <label className="premium-label">Mã ĐH / VSO <span className="required">*</span></label>
                <div className="premium-input-wrapper">
                  <input className="premium-input" value={form.orderId} placeholder="G401xx-VSO..." onChange={(e) => updateField('orderId', e.target.value.trim().toUpperCase())} required />
                </div>
              </div>
              <div className="premium-form-group">
                <label className="premium-label">Khách hàng <span className="required">*</span></label>
                <div className="premium-input-wrapper">
                  <input className="premium-input" value={form.customer} placeholder="Tên khách hàng" onChange={(e) => updateField('customer', e.target.value)} required />
                </div>
              </div>
              
              <div className="premium-form-group">
                <label className="premium-label">Dòng xe <span className="required">*</span></label>
                <select className="premium-select" value={form.line} onChange={(e) => updateField('line', e.target.value)} disabled={isVehicleLocked} required>
                  {vehicleLines.map((line) => <option key={line} value={line}>{line}</option>)}
                </select>
              </div>
              <div className="premium-form-group">
                <label className="premium-label">Phiên bản <span className="required">*</span></label>
                <select className="premium-select" value={form.version} onChange={(e) => updateField('version', e.target.value)} disabled={isVehicleLocked} required>
                  {versionOptions.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              
              <div className="premium-form-group">
                <label className="premium-label">Màu ngoại thất <span className="required">*</span></label>
                <select className="premium-select" value={form.exterior} onChange={(e) => updateField('exterior', e.target.value)} disabled={isVehicleLocked} required>
                  {defaultExteriors.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="premium-form-group">
                <label className="premium-label">Màu nội thất <span className="required">*</span></label>
                <select className="premium-select" value={form.interior} onChange={(e) => updateField('interior', e.target.value)} disabled={isVehicleLocked} required>
                  {interiorOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="premium-form-group">
                <label className="premium-label">Ngày cọc <span className="required">*</span></label>
                <input className="premium-input" type="date" value={form.depositDate} onChange={(e) => updateField('depositDate', e.target.value)} required />
              </div>
              <div className="premium-form-group">
                <label className="premium-label">Tiền cọc (VNĐ) <span className="required">*</span></label>
                <input className="premium-input" type="number" value={form.depositAmount !== null && form.depositAmount !== undefined ? form.depositAmount : ''} placeholder="VD: 50000000" onChange={(e) => updateField('depositAmount', e.target.value ? Number(e.target.value) : null)} required />
              </div>

              <div className="premium-form-group">
                <label className="premium-label">Phương thức thanh toán <span className="required">*</span></label>
                <select className="premium-select" value={form.paymentMethod || 'Tiền mặt'} onChange={(e) => updateField('paymentMethod', e.target.value)} required>
                  <option value="Tiền mặt">Tiền mặt</option>
                  <option value="Vay ngân hàng">Vay ngân hàng</option>
                  <option value="Chuyển khoản">Chuyển khoản</option>
                </select>
              </div>
              <div className="premium-form-group">
                <label className="premium-label">Nguồn khách <span className="required">*</span></label>
                <input className="premium-input" value={form.nguonKhach || ''} placeholder="VD: Marketing" onChange={(e) => updateField('nguonKhach', e.target.value)} required />
              </div>
              
              <div className="premium-form-group">
                <label className="premium-label">Ngày cần xe <span className="required">*</span></label>
                <input className="premium-input" type="date" value={form.needDate} onChange={(e) => updateField('needDate', e.target.value)} required />
              </div>
            </div>
          </div>

          {/* CARD: XUẤT HÓA ĐƠN */}
          <div className="premium-card">
            <div className="premium-card-header">
              <h3 className="premium-card-title">
                <span style={{color: '#8b5cf6'}}>●</span> Hợp đồng & Xuất hóa đơn
              </h3>
            </div>
            <div className="premium-card-body">
              <div className="premium-form-group">
                <label className="premium-label">Mã Hợp Đồng <span className="required">*</span></label>
                <input className="premium-input" value={form.contractCode || ''} placeholder="Nhập mã HĐ..." onChange={(e) => updateField('contractCode', e.target.value)} required />
              </div>
              <div className="premium-form-group">
                <label className="premium-label">Mã Amis <span className="required">*</span></label>
                <input className="premium-input" value={form.maAmis || ''} placeholder="Nhập mã Amis..." onChange={(e) => updateField('maAmis', e.target.value)} required />
              </div>

              <div className="premium-form-group">
                <label className="premium-label">Ngày ký HĐ <span className="required">*</span></label>
                <input className="premium-input" type="date" value={form.ngayKyHopDong || ''} onChange={(e) => updateField('ngayKyHopDong', e.target.value)} required />
              </div>
              <div className="premium-form-group">
                <label className="premium-label">Giá công bố <span className="required">*</span></label>
                <input className="premium-input" type="number" value={form.giaCongBo !== null && form.giaCongBo !== undefined ? form.giaCongBo : ''} placeholder="VD: 599000000" onChange={(e) => updateField('giaCongBo', e.target.value ? Number(e.target.value) : null)} required />
              </div>

              <div className="premium-form-group">
                <label className="premium-label">Đăng ký xe <span className="required">*</span></label>
                <select className="premium-select" value={form.dangKyXe === null ? '' : form.dangKyXe ? 'true' : 'false'} onChange={(e) => updateField('dangKyXe', e.target.value === '' ? null : e.target.value === 'true')} required>
                  <option value="">Chưa chọn</option><option value="true">Có</option><option value="false">Không</option>
                </select>
              </div>
              <div className="premium-form-group">
                <label className="premium-label">Mua bảo hiểm <span className="required">*</span></label>
                <select className="premium-select" value={form.muaBaoHiem === null ? '' : form.muaBaoHiem ? 'true' : 'false'} onChange={(e) => updateField('muaBaoHiem', e.target.value === '' ? null : e.target.value === 'true')} required>
                  <option value="">Chưa chọn</option><option value="true">Có</option><option value="false">Không</option>
                </select>
              </div>

              <div className="premium-form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="premium-label">Chính sách <span className="required">*</span></label>
                <div className={`premium-multi-select ${policyOpen ? 'open' : ''}`} ref={policySelectRef}>
                  <div className="select-box" onClick={policyLoading ? undefined : togglePolicyDropdown}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1 }}>
                      <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: 500 }}>
                        {selectedPolicyCount > 0 ? (selectedPolicyPreview || 'Đã chọn chính sách') : 'Chọn chính sách...'}
                      </span>
                      {selectedPolicyCount > 1 && (
                        <span style={{ background: '#e2e8f0', color: '#475569', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>
                          +{selectedPolicyCount - 1}
                        </span>
                      )}
                    </div>
                    <span className="select-caret" />
                  </div>

                  <div className="dropdown-list">
                    {policyLoading ? (
                      <div style={{ padding: '12px' }}>Đang tải danh sách chính sách...</div>
                    ) : filteredPolicyOptions.length === 0 ? (
                      <div style={{ padding: '12px' }}>Không có chính sách phù hợp.</div>
                    ) : (
                      filteredPolicyOptions.map((p) => {
                        const checked = form.policy.includes(p.ten_chinh_sach);
                        return (
                          <label key={p.ten_chinh_sach} style={{ padding: '10px 14px', display: 'flex', gap: '10px', cursor: 'pointer', margin: 0, alignItems: 'center', backgroundColor: checked ? '#f0fdf4' : 'transparent', borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s' }}>
                            <input type="checkbox" value={p.ten_chinh_sach} checked={checked} onChange={() => togglePolicy(p.ten_chinh_sach)} style={{ margin: 0, width: '16px', height: '16px', accentColor: '#3b82f6' }} />
                            <span style={{ fontSize: '14px', color: checked ? '#0f172a' : '#475569', fontWeight: checked ? 500 : 400 }}>{p.ten_chinh_sach}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              <div className="premium-form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="premium-label">Địa chỉ XHD <span className="required">*</span></label>
                <input className="premium-input" value={form.invoiceAddress || ''} placeholder="Nhập địa chỉ đầy đủ để xuất hóa đơn..." onChange={(e) => updateField('invoiceAddress', e.target.value)} required />
              </div>
              <div className="premium-form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="premium-label">Ghi chú XHĐ</label>
                <textarea className="premium-textarea" value={form.ghiChu || ''} placeholder="Nhập ghi chú cho bộ phận XHĐ..." onChange={(e) => updateField('ghiChu', e.target.value)} />
              </div>
            </div>
          </div>

          {/* CARD: THU CŨ ĐỔI MỚI */}
          {isGasToElectricPolicy && (
            <div className="premium-card" style={{ borderColor: '#fed7aa', boxShadow: '0 4px 6px -1px rgba(234, 88, 12, 0.1)' }}>
              <div className="premium-card-header" style={{ background: 'linear-gradient(to right, #fff7ed, #ffffff)', borderBottomColor: '#fed7aa' }}>
                <h3 className="premium-card-title">
                  <span style={{color: '#ea580c'}}>●</span> Thu cũ đổi mới (Xe xăng)
                </h3>
              </div>
              <div className="premium-card-body">
                <div className="premium-form-group">
                  <label className="premium-label">VIN xe xăng <span className="required">*</span></label>
                  <input className="premium-input" value={form.xeXangVin || ''} placeholder="Nhập VIN..." onChange={(e) => updateField('xeXangVin', e.target.value.toUpperCase())} required style={{ borderColor: '#fed7aa' }} />
                </div>
                <div className="premium-form-group">
                  <label className="premium-label">Hãng xe <span className="required">*</span></label>
                  <input className="premium-input" value={form.xeXangHang || ''} placeholder="VD: Toyota" onChange={(e) => updateField('xeXangHang', e.target.value)} required style={{ borderColor: '#fed7aa' }} />
                </div>
                <div className="premium-form-group">
                  <label className="premium-label">Model <span className="required">*</span></label>
                  <input className="premium-input" value={form.xeXangModel || ''} placeholder="VD: Vios 1.5G" onChange={(e) => updateField('xeXangModel', e.target.value)} required style={{ borderColor: '#fed7aa' }} />
                </div>
              </div>
            </div>
          )}

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626', background: '#fef2f2', padding: '14px 16px', borderRadius: '12px', border: '1px solid #fecaca' }}>
              <AlertTriangle size={18} />
              <span style={{ fontSize: '14px', fontWeight: 500 }}>{error}</span>
            </div>
          )}
          {validationError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626', background: '#fef2f2', padding: '14px 16px', borderRadius: '12px', border: '1px solid #fecaca' }}>
              <AlertTriangle size={18} />
              <span style={{ fontSize: '14px', fontWeight: 500 }}>{validationError}</span>
            </div>
          )}

          <div className="premium-footer">
            <button type="button" onClick={onClose} disabled={isCreating} className="premium-btn-secondary">
              Hủy bỏ
            </button>
            <button type="submit" disabled={isCreating || !isFormValid} className="premium-btn-primary">
              <Plus size={18} />
              <span>{isCreating ? 'Đang xử lý...' : initialVehicle ? 'Tạo đơn & ghép xe' : 'Hoàn tất Tạo đơn'}</span>
            </button>
          </div>
        </form>"""

new_content = content[:start_idx] + new_form + content[end_idx:]
with open(file_path, "w", encoding="utf-8") as f:
    f.write(new_content)

print("CreateOrderModal rewritten successfully.")
