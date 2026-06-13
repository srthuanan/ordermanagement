import sys

file_path = "c:\\Users\\USER\\Documents\\ordermanagement\\vf-kim-son-trang-dai\\src\\components\\InlineOrderEditForm.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

start_idx = content.find("    <form onSubmit={handleSubmit} style={{ display: 'flex'")
end_idx = content.rfind("  );")

if start_idx == -1 or end_idx == -1:
    print("Could not find block to replace")
    sys.exit(1)

new_jsx = """    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px 20px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <tbody>
            <tr>
              <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569', width: '18%' }}>Khách hàng</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px', width: '32%' }}>
                <input className="premium-input" style={{ padding: '6px 10px', height: 'auto', fontSize: '13px' }} value={customer} onChange={(e) => setCustomer(e.target.value)} required />
              </td>
              <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569', width: '18%' }}>Tư vấn viên</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px', width: '32%' }}>
                <select className="premium-select" style={{ padding: '6px 10px', height: 'auto', fontSize: '13px' }} value={staff} onChange={(e) => setStaff(e.target.value)} required>
                  {staffNames.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </td>
            </tr>
            <tr>
              <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Dòng xe</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select className="premium-select" style={{ padding: '6px 10px', height: 'auto', fontSize: '13px', flex: 1 }} value={line} onChange={(e) => setLine(e.target.value)} required>
                    {vehicleLines.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                  <select className="premium-select" style={{ padding: '6px 10px', height: 'auto', fontSize: '13px', flex: 1 }} value={version} onChange={(e) => setVersion(e.target.value)} required>
                    {versionOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>
              </td>
              <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Màu (Ngoại/Nội)</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select className="premium-select" style={{ padding: '6px 10px', height: 'auto', fontSize: '13px', flex: 1 }} value={exterior} onChange={(e) => setExterior(e.target.value)} required>
                    {defaultExteriors.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                  <select className="premium-select" style={{ padding: '6px 10px', height: 'auto', fontSize: '13px', flex: 1 }} value={interior} onChange={(e) => setInterior(e.target.value)} required>
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
                <input className="premium-input" style={{ padding: '6px 10px', height: 'auto', fontSize: '13px' }} type="date" value={needDate} onChange={(e) => setNeedDate(e.target.value)} />
              </td>
              <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Ngày đặt cọc</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>
                <input className="premium-input" style={{ padding: '6px 10px', height: 'auto', fontSize: '13px' }} type="date" value={depositDate} onChange={(e) => setDepositDate(e.target.value)} required />
              </td>
            </tr>
            <tr>
              <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Tiền đã cọc</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }} colSpan={3}>
                <input className="premium-input" style={{ padding: '6px 10px', height: 'auto', fontSize: '13px', width: '50%' }} type="number" value={depositAmount !== null ? depositAmount : ''} placeholder="VD: 50000000" onChange={(e) => setDepositAmount(e.target.value ? Number(e.target.value) : null)} />
              </td>
            </tr>
            <tr>
              <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Thanh toán</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>
                <select className="premium-select" style={{ padding: '6px 10px', height: 'auto', fontSize: '13px' }} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  <option value="Tiền mặt">Tiền mặt</option>
                  <option value="Vay ngân hàng">Vay ngân hàng</option>
                  <option value="Chuyển khoản">Chuyển khoản</option>
                </select>
              </td>
              <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Nguồn khách</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>
                <input className="premium-input" style={{ padding: '6px 10px', height: 'auto', fontSize: '13px' }} value={nguonKhach} placeholder="VD: Marketing" onChange={(e) => setNguonKhach(e.target.value)} />
              </td>
            </tr>
            <tr>
              <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Mã Hợp Đồng</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>
                <input className="premium-input" style={{ padding: '6px 10px', height: 'auto', fontSize: '13px' }} value={contractCode} placeholder="Mã HĐ..." onChange={(e) => setContractCode(e.target.value)} />
              </td>
              <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Mã Amis</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>
                <input className="premium-input" style={{ padding: '6px 10px', height: 'auto', fontSize: '13px' }} value={maAmis} placeholder="Mã Amis..." onChange={(e) => setMaAmis(e.target.value)} />
              </td>
            </tr>
            <tr>
              <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Ngày ký HĐ</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>
                <input className="premium-input" style={{ padding: '6px 10px', height: 'auto', fontSize: '13px' }} type="date" value={ngayKyHopDong} onChange={(e) => setNgayKyHopDong(e.target.value)} />
              </td>
              <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Giá công bố</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>
                <input className="premium-input" style={{ padding: '6px 10px', height: 'auto', fontSize: '13px' }} type="number" value={giaCongBo !== null ? giaCongBo : ''} placeholder="VD: 315000000" onChange={(e) => setGiaCongBo(e.target.value ? Number(e.target.value) : null)} />
              </td>
            </tr>
            <tr>
              <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Đăng ký xe</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>
                <select className="premium-select" style={{ padding: '6px 10px', height: 'auto', fontSize: '13px' }} value={dangKyXe === true ? 'true' : dangKyXe === false ? 'false' : ''} onChange={(e) => {
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
                <select className="premium-select" style={{ padding: '6px 10px', height: 'auto', fontSize: '13px' }} value={muaBaoHiem === true ? 'true' : muaBaoHiem === false ? 'false' : ''} onChange={(e) => {
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
                <input className="premium-input" style={{ padding: '6px 10px', height: 'auto', fontSize: '13px' }} value={invoiceAddress} placeholder="Địa chỉ xuất hóa đơn..." onChange={(e) => setInvoiceAddress(e.target.value)} />
              </td>
            </tr>
            <tr>
              <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Ghi chú</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }} colSpan={3}>
                <input className="premium-input" style={{ padding: '6px 10px', height: 'auto', fontSize: '13px' }} value={ghiChu} placeholder="Ghi chú thêm..." onChange={(e) => setGhiChu(e.target.value)} />
              </td>
            </tr>
            {order.status === 'Chờ phê duyệt' || order.status === 'Yêu cầu bổ sung' || order.status === 'Chờ ký hóa đơn' || order.status === 'Đã bổ sung' ? (
              <tr>
                <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }} colSpan={4}>
                  <div style={{ padding: '10px', background: '#fffbeb', borderRadius: '6px', border: '1px solid #fde68a' }}>
                    <strong>Cấu hình thu mua xe cũ (Chỉ hiển thị khi có thu mua):</strong>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                      <input className="premium-input" style={{ padding: '6px 10px', height: 'auto', fontSize: '13px', flex: 1, borderColor: '#fed7aa' }} value={xeXangVin} placeholder="VIN xe xăng" onChange={(e) => setXeXangVin(e.target.value)} />
                      <input className="premium-input" style={{ padding: '6px 10px', height: 'auto', fontSize: '13px', flex: 1, borderColor: '#fed7aa' }} value={xeXangHang} placeholder="Hãng xe" onChange={(e) => setXeXangHang(e.target.value)} />
                      <input className="premium-input" style={{ padding: '6px 10px', height: 'auto', fontSize: '13px', flex: 1, borderColor: '#fed7aa' }} value={xeXangModel} placeholder="Model xe" onChange={(e) => setXeXangModel(e.target.value)} />
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
    </form>"""

new_content = content[:start_idx] + new_jsx + "\n"

with open(file_path, "w", encoding="utf-8") as f:
    f.write(new_content)

print("InlineOrderEditForm table layout rewritten successfully.")
