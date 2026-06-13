import sys

file_path = "c:\\Users\\USER\\Documents\\ordermanagement\\vf-kim-son-trang-dai\\src\\components\\InlineOrderEditForm.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

start_idx = content.find('<form className="order-form-inline-table"')
if start_idx == -1:
    start_idx = content.find('<form ')
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
            
            <div className="premium-card-body">
              <div className="premium-form-group">
                <label className="premium-label">Khách hàng <span className="required">*</span></label>
                <input className="premium-input" value={customer} onChange={(e) => setCustomer(e.target.value)} required />
              </div>
              <div className="premium-form-group">
                <label className="premium-label">Tư vấn viên <span className="required">*</span></label>
                <select className="premium-select" value={staff} onChange={(e) => setStaff(e.target.value)} required>
                  {staffNames.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              
              <div className="premium-form-group">
                <label className="premium-label">Dòng xe <span className="required">*</span></label>
                <select className="premium-select" value={line} onChange={(e) => setLine(e.target.value)} required>
                  {vehicleLines.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
              <div className="premium-form-group">
                <label className="premium-label">Phiên bản <span className="required">*</span></label>
                <select className="premium-select" value={version} onChange={(e) => setVersion(e.target.value)} required>
                  {versionOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
              
              <div className="premium-form-group">
                <label className="premium-label">Màu ngoại thất <span className="required">*</span></label>
                <select className="premium-select" value={exterior} onChange={(e) => setExterior(e.target.value)} required>
                  {defaultExteriors.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
              <div className="premium-form-group">
                <label className="premium-label">Màu nội thất <span className="required">*</span></label>
                <select className="premium-select" value={interior} onChange={(e) => setInterior(e.target.value)} required>
                  {interiorOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>

              <div className="premium-form-group">
                <label className="premium-label">Số VIN định danh</label>
                <div style={{ padding: '10px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', color: order.vin ? '#0f172a' : '#94a3b8', fontWeight: order.vin ? 700 : 400 }}>
                  {order.vin || 'Chưa cấp'}
                </div>
              </div>
              <div className="premium-form-group">
                <label className="premium-label">Ngày cần xe <span className="required">*</span></label>
                <input className="premium-input" type="date" value={needDate} onChange={(e) => setNeedDate(e.target.value)} required />
              </div>

              <div className="premium-form-group">
                <label className="premium-label">Ngày đặt cọc <span className="required">*</span></label>
                <input className="premium-input" type="date" value={depositDate} onChange={(e) => setDepositDate(e.target.value)} required />
              </div>
              <div className="premium-form-group">
                <label className="premium-label">Tiền đã cọc</label>
                <input className="premium-input" type="number" value={depositAmount !== null && depositAmount !== undefined ? depositAmount : ''} placeholder="VD: 50000000" onChange={(e) => setDepositAmount(e.target.value ? Number(e.target.value) : null)} />
              </div>

              <div className="premium-form-group">
                <label className="premium-label">Thanh toán</label>
                <select className="premium-select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  <option value="Tiền mặt">Tiền mặt</option>
                  <option value="Vay ngân hàng">Vay ngân hàng</option>
                  <option value="Chuyển khoản">Chuyển khoản</option>
                </select>
              </div>
              <div className="premium-form-group">
                <label className="premium-label">Nguồn khách</label>
                <input className="premium-input" value={nguonKhach} placeholder="VD: Marketing" onChange={(e) => setNguonKhach(e.target.value)} />
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
                <label className="premium-label">Mã Hợp Đồng</label>
                <input className="premium-input" value={contractCode} placeholder="Nhập mã HĐ..." onChange={(e) => setContractCode(e.target.value)} />
              </div>
              <div className="premium-form-group">
                <label className="premium-label">Mã Amis</label>
                <input className="premium-input" value={maAmis} placeholder="Nhập mã Amis..." onChange={(e) => setMaAmis(e.target.value)} />
              </div>

              <div className="premium-form-group">
                <label className="premium-label">Ngày ký HĐ</label>
                <input className="premium-input" type="date" value={ngayKyHopDong} onChange={(e) => setNgayKyHopDong(e.target.value)} />
              </div>
              <div className="premium-form-group">
                <label className="premium-label">Giá công bố</label>
                <input className="premium-input" type="number" value={giaCongBo !== null && giaCongBo !== undefined ? giaCongBo : ''} placeholder="VD: 599000000" onChange={(e) => setGiaCongBo(e.target.value ? Number(e.target.value) : null)} />
              </div>

              <div className="premium-form-group">
                <label className="premium-label">Đăng ký xe</label>
                <select className="premium-select" value={dangKyXe === null ? '' : dangKyXe ? 'true' : 'false'} onChange={(e) => setDangKyXe(e.target.value === '' ? null : e.target.value === 'true')}>
                  <option value="">Chưa chọn</option><option value="true">Có</option><option value="false">Không</option>
                </select>
              </div>
              <div className="premium-form-group">
                <label className="premium-label">Mua bảo hiểm</label>
                <select className="premium-select" value={muaBaoHiem === null ? '' : muaBaoHiem ? 'true' : 'false'} onChange={(e) => setMuaBaoHiem(e.target.value === '' ? null : e.target.value === 'true')}>
                  <option value="">Chưa chọn</option><option value="true">Có</option><option value="false">Không</option>
                </select>
              </div>

              <div className="premium-form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="premium-label">Chính sách</label>
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
                        const checked = policy.includes(p.ten_chinh_sach);
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
                <label className="premium-label">Địa chỉ XHD</label>
                <input className="premium-input" value={invoiceAddress} placeholder="Nhập địa chỉ đầy đủ để xuất hóa đơn..." onChange={(e) => setInvoiceAddress(e.target.value)} />
              </div>
              <div className="premium-form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="premium-label">Ghi chú XHĐ</label>
                <textarea className="premium-textarea" value={ghiChu} placeholder="Nhập ghi chú cho bộ phận XHĐ..." onChange={(e) => setGhiChu(e.target.value)} />
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
                  <input className="premium-input" value={xeXangVin} placeholder="Nhập VIN..." onChange={(e) => setXeXangVin(e.target.value.toUpperCase())} style={{ borderColor: '#fed7aa' }} />
                </div>
                <div className="premium-form-group">
                  <label className="premium-label">Hãng xe <span className="required">*</span></label>
                  <input className="premium-input" value={xeXangHang} placeholder="VD: Toyota" onChange={(e) => setXeXangHang(e.target.value)} style={{ borderColor: '#fed7aa' }} />
                </div>
                <div className="premium-form-group">
                  <label className="premium-label">Model <span className="required">*</span></label>
                  <input className="premium-input" value={xeXangModel} placeholder="VD: Vios 1.5G" onChange={(e) => setXeXangModel(e.target.value)} style={{ borderColor: '#fed7aa' }} />
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

          <div className="premium-footer">
            <button type="button" onClick={onCancel} disabled={isSubmitting} className="premium-btn-secondary">
              Hủy thay đổi
            </button>
            <button type="submit" disabled={isSubmitting} className="premium-btn-primary">
              <Save size={18} />
              <span>{isSubmitting ? 'Đang lưu...' : 'Lưu thông tin'}</span>
            </button>
          </div>
        </form>"""

new_content = content[:start_idx] + new_form + content[end_idx:]
with open(file_path, "w", encoding="utf-8") as f:
    f.write(new_content)

print("InlineOrderEditForm rewritten successfully.")
