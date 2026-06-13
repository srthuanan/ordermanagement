import sys

file_path = "c:\\Users\\USER\\Documents\\ordermanagement\\vf-kim-son-trang-dai\\src\\components\\OrdersPanel.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

old_block = """                              <tr>
                                <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Số VIN định danh</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px', color: '#0f172a', fontWeight: 700, letterSpacing: '0.05em' }} className="clickable-copy-field" onClick={() => copyToClipboard(selectedOrder.vin || '', 'Số VIN')}>{selectedOrder.vin || <span style={{ color: '#94a3b8', fontStyle: 'italic', fontWeight: 400 }}>Chưa cấp</span>}</td>
                                <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Ngày cần xe</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px', color: '#0f172a', fontWeight: 500 }}>{formatDetailDate(selectedOrder.needDateIso || selectedOrder.needDate) || '—'}</td>
                              </tr>
                              <tr>
                                <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Ngày đặt cọc</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px', color: '#0f172a', fontWeight: 500 }}>{selectedOrder.depositDate || '—'}</td>
                                <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Tiền đã cọc</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px', color: '#b91c1c', fontWeight: 700 }}>{selectedOrder.depositAmount ? new Intl.NumberFormat('vi-VN').format(selectedOrder.depositAmount) + ' ₫' : '—'}</td>
                              </tr>"""

new_block = """                              <tr>
                                <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Số VIN định danh</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px', color: '#0f172a', fontWeight: 700, letterSpacing: '0.05em' }} className="clickable-copy-field" onClick={() => copyToClipboard(selectedOrder.vin || '', 'Số VIN')}>{selectedOrder.vin || <span style={{ color: '#94a3b8', fontStyle: 'italic', fontWeight: 400 }}>Chưa cấp</span>}</td>
                                <td style={{ backgroundColor: '#fef3c7', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 700, color: '#92400e' }}>Ngày ghép xe</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px', color: '#0f172a', fontWeight: 600 }}>{selectedOrder.pairedAt !== 'Chưa ghép' ? selectedOrder.pairedAt : '—'}</td>
                              </tr>
                              <tr>
                                <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Ngày cần xe</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px', color: '#0f172a', fontWeight: 500 }}>{formatDetailDate(selectedOrder.needDateIso || selectedOrder.needDate) || '—'}</td>
                                <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Ngày đặt cọc</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px', color: '#0f172a', fontWeight: 500 }}>{selectedOrder.depositDate || '—'}</td>
                              </tr>
                              <tr>
                                <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Tiền đã cọc</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px', color: '#b91c1c', fontWeight: 700 }}>{selectedOrder.depositAmount ? new Intl.NumberFormat('vi-VN').format(selectedOrder.depositAmount) + ' ₫' : '—'}</td>
                                <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Thanh toán</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px', color: '#0f172a', fontWeight: 500 }}>{selectedOrder.paymentMethod || 'Tiền mặt'}</td>
                              </tr>"""

# wait, "Thanh toán" was in the next row, I should just shift "Thanh toán" if I override it, 
# let's just use python replace carefully

# We will just replace old_block with new_block. 
# But wait, the original next row is:
#                               <tr>
#                                 <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Thanh toán</td>
#                                 ...
# So if I add "Thanh toán" in new_block, there will be two "Thanh toán" rows!
# Let me look at lines 825-830
old_full = """                              <tr>
                                <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Số VIN định danh</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px', color: '#0f172a', fontWeight: 700, letterSpacing: '0.05em' }} className="clickable-copy-field" onClick={() => copyToClipboard(selectedOrder.vin || '', 'Số VIN')}>{selectedOrder.vin || <span style={{ color: '#94a3b8', fontStyle: 'italic', fontWeight: 400 }}>Chưa cấp</span>}</td>
                                <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Ngày cần xe</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px', color: '#0f172a', fontWeight: 500 }}>{formatDetailDate(selectedOrder.needDateIso || selectedOrder.needDate) || '—'}</td>
                              </tr>
                              <tr>
                                <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Ngày đặt cọc</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px', color: '#0f172a', fontWeight: 500 }}>{selectedOrder.depositDate || '—'}</td>
                                <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Tiền đã cọc</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px', color: '#b91c1c', fontWeight: 700 }}>{selectedOrder.depositAmount ? new Intl.NumberFormat('vi-VN').format(selectedOrder.depositAmount) + ' ₫' : '—'}</td>
                              </tr>"""

new_full = """                              <tr>
                                <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Số VIN định danh</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px', color: '#0f172a', fontWeight: 700, letterSpacing: '0.05em' }} className="clickable-copy-field" onClick={() => copyToClipboard(selectedOrder.vin || '', 'Số VIN')}>{selectedOrder.vin || <span style={{ color: '#94a3b8', fontStyle: 'italic', fontWeight: 400 }}>Chưa cấp</span>}</td>
                                <td style={{ backgroundColor: '#fef3c7', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 700, color: '#92400e' }}>Ngày ghép xe</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px', color: '#0f172a', fontWeight: 600 }}>{selectedOrder.pairedAt !== 'Chưa ghép' ? selectedOrder.pairedAt : '—'}</td>
                              </tr>
                              <tr>
                                <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Ngày cần xe</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px', color: '#0f172a', fontWeight: 500 }}>{formatDetailDate(selectedOrder.needDateIso || selectedOrder.needDate) || '—'}</td>
                                <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Ngày đặt cọc</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px', color: '#0f172a', fontWeight: 500 }}>{selectedOrder.depositDate || '—'}</td>
                              </tr>
                              <tr>
                                <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Tiền đã cọc</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px', color: '#b91c1c', fontWeight: 700 }} colSpan={3}>{selectedOrder.depositAmount ? new Intl.NumberFormat('vi-VN').format(selectedOrder.depositAmount) + ' ₫' : '—'}</td>
                              </tr>"""

if old_full in content:
    content = content.replace(old_full, new_full)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("OrdersPanel updated successfully.")
else:
    print("Could not find the target block.")
