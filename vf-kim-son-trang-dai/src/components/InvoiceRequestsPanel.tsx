import React, { useState, useMemo } from 'react';
import { Search, CheckCircle2, XCircle, Clock, ExternalLink, CheckSquare, FilePlus2, User, Car, CreditCard, FileText, HelpCircle, ArrowLeft } from 'lucide-react';
import { YeucauxhdRow } from '../types';
import { copyToClipboard } from '../utils/clipboard';

interface InvoiceRequestsPanelProps {
  requests: YeucauxhdRow[];
  canApprove: boolean;
  isProcessing?: boolean;
  onApprove: (req: YeucauxhdRow) => void;
  onRequestSupplement: (req: YeucauxhdRow) => void;
  onPendingSignature: (req: YeucauxhdRow) => void;
  onUploadInvoice: (req: YeucauxhdRow) => void;
  onSupplement: (req: YeucauxhdRow) => void;
}

export const InvoiceRequestsPanel: React.FC<InvoiceRequestsPanelProps> = ({
  requests,
  canApprove,
  isProcessing = false,
  onApprove,
  onRequestSupplement,
  onPendingSignature,
  onUploadInvoice,
  onSupplement
}) => {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState<boolean>(false);

  const getWorkflowStatus = (r: YeucauxhdRow) => r.trang_thai_xu_ly || (
    r.status === 'approved' ? 'Đã phê duyệt' : r.status === 'rejected' ? 'Từ chối' : 'Chờ phê duyệt'
  );

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      const matchesStatus = statusFilter === 'all' || getWorkflowStatus(r) === statusFilter;
      if (!matchesStatus) return false;

      const norm = query.toLowerCase().trim();
      if (!norm) return true;

      return (
        r.so_don_hang.toLowerCase().includes(norm) ||
        r.ten_khach_hang.toLowerCase().includes(norm) ||
        (r.vin || '').toLowerCase().includes(norm) ||
        (r.so_may || '').toLowerCase().includes(norm) ||
        (r.xe_xang_vin || '').toLowerCase().includes(norm) ||
        (r.requested_by_name || '').toLowerCase().includes(norm)
      );
    });
  }, [requests, query, statusFilter]);

  // Hàng được chọn
  const selectedRequest = useMemo(() => {
    if (filtered.length === 0) return null;
    const found = filtered.find(r => r.id === selectedRequestId);
    return found || filtered[0];
  }, [filtered, selectedRequestId]);

  const workflowStatus = selectedRequest ? getWorkflowStatus(selectedRequest) : '';

  // Tính toán chỉ số tổng hợp cho đồng bộ với Tab Đơn hàng
  const totalReqs = requests.length;
  const pendingApproval = requests.filter(r => getWorkflowStatus(r) === 'Chờ phê duyệt').length;
  const approvedReqs = requests.filter(r => ['Đã phê duyệt', 'Đã bổ sung'].includes(getWorkflowStatus(r))).length;
  const pendingSign = requests.filter(r => getWorkflowStatus(r) === 'Chờ ký hóa đơn').length;
  const completed = requests.filter(r => getWorkflowStatus(r) === 'Đã xuất hóa đơn').length;
  const supp = requests.filter(r => getWorkflowStatus(r) === 'Yêu cầu bổ sung').length;

  const statusColors: Record<string, string> = {
    'Đã xuất hóa đơn': 'status-live',
    'Từ chối': 'status-error',
    'Yêu cầu bổ sung': 'status-error',
    'Đã phê duyệt': 'status-loading',
    'Chờ ký hóa đơn': 'status-loading',
    'Đã bổ sung': 'status-loading',
    'Chờ phê duyệt': 'status-loading',
  };

  const renderTableStatus = (status: string) => {
    const baseClass = statusColors[status] || 'status-loading';
    let icon = <Clock size={12} />;
    if (status === 'Đã xuất hóa đơn') icon = <CheckCircle2 size={12} />;
    if (status === 'Từ chối' || status === 'Yêu cầu bổ sung') icon = <XCircle size={12} />;

    return (
      <span className={`status-tag ${baseClass}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', padding: '2px 8px', fontWeight: 700 }}>
        {icon} {status}
      </span>
    );
  };

  return (
    <section className="panel invoice-panel">
      <div className={`orders-modular-workspace ${isMobileDetailOpen ? 'mobile-detail-active' : ''}`}>
        
        {/* CÁNH TRÁI: BẢNG DỮ LIỆU YÊU CẦU HÓA ĐƠN */}
        <div className="orders-data-side invoice-data-side">
          {/* 1. Chỉ số tóm tắt nhanh (Story bar) - Đồng bộ 100% với Tab Đơn hàng */}
          <div className="no-scrollbar invoice-summary-strip" style={{ display: 'flex', gap: '6px', overflowX: 'auto', whiteSpace: 'nowrap', paddingBottom: '6px', borderBottom: '1px dashed #e2e8f0', marginBottom: '2px', width: '100%', boxSizing: 'border-box', flexShrink: 0 }}>
            <span className="tag" style={{ fontSize: '10.5px', padding: '3px 8px', background: '#f1f5f9', color: '#475569', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 600 }}>
              Tổng yêu cầu: <strong>{totalReqs}</strong>
            </span>
            <span className="tag" style={{ fontSize: '10.5px', padding: '3px 8px', background: '#fef9c3', color: '#a16207', borderRadius: '6px', border: '1px solid #fef08a', fontWeight: 600 }}>
              Chờ phê duyệt: <strong>{pendingApproval}</strong>
            </span>
            <span className="tag" style={{ fontSize: '10.5px', padding: '3px 8px', background: '#e0f2fe', color: '#0369a1', borderRadius: '6px', border: '1px solid #bae6fd', fontWeight: 600 }}>
              Đã phê duyệt: <strong>{approvedReqs}</strong>
            </span>
            <span className="tag" style={{ fontSize: '10.5px', padding: '3px 8px', background: '#f5f3ff', color: '#6d28d9', borderRadius: '6px', border: '1px solid #ddd6fe', fontWeight: 600 }}>
              Chờ ký HĐ: <strong>{pendingSign}</strong>
            </span>
            <span className="tag" style={{ fontSize: '10.5px', padding: '3px 8px', background: '#f0fdf4', color: '#16a34a', borderRadius: '6px', border: '1px solid #bbf7d0', fontWeight: 600 }}>
              Đã xuất HĐ: <strong>{completed}</strong>
            </span>
            <span className="tag" style={{ fontSize: '10.5px', padding: '3px 8px', background: '#fff1f2', color: '#be123c', borderRadius: '6px', border: '1px solid #fecdd3', fontWeight: 600 }}>
              Cần bổ sung: <strong>{supp}</strong>
            </span>
          </div>

          <label className="search-box invoice-search-box" style={{ flex: 'none', minHeight: '34px', height: '34px', padding: '0 10px', border: '1px solid #cbd5e1', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px', width: '100%', boxSizing: 'border-box' }}>
            <Search size={14} style={{ color: '#64748b' }} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm số đơn, KH, VIN..."
              style={{ fontSize: '12.5px', border: 'none', outline: 'none', width: '100%', color: '#1e293b' }}
            />
          </label>
          
          <div className="no-scrollbar invoice-status-bar" style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '2px', width: '100%', boxSizing: 'border-box', flexShrink: 0 }}>
            {['all', 'Chờ phê duyệt', 'Đã phê duyệt', 'Yêu cầu bổ sung', 'Chờ ký hóa đơn', 'Đã xuất hóa đơn'].map((status) => (
              <button
                key={status}
                className={statusFilter === status ? 'primary-button' : 'ghost-button'}
                style={{ fontSize: '11.5px', height: '34px', padding: '0 10px', borderRadius: '8px', whiteSpace: 'nowrap', fontWeight: 600 }}
                onClick={() => setStatusFilter(status)}
              >
                {status === 'all' ? 'Tất cả' : status}
              </button>
            ))}
          </div>

          {/* HIỂN THỊ DI ĐỘNG: Danh sách Card */}
          <div className="mobile-only no-scrollbar invoice-mobile-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px', overflowY: 'auto', maxHeight: 'calc(100vh - 210px)', paddingBottom: '20px' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontStyle: 'italic', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                Không tìm thấy yêu cầu hóa đơn nào.
              </div>
            ) : (
              filtered.map((r) => {
                const isActive = selectedRequest?.id === r.id;
                const currentStatus = getWorkflowStatus(r);
                return (
                  <div
                    className="invoice-mobile-card"
                    key={r.id}
                    onClick={() => { setSelectedRequestId(r.id); setIsMobileDetailOpen(true); }}
                    style={{
                      background: '#ffffff',
                      border: `1.5px solid ${isActive ? '#0f766e' : '#cbd5e1'}`,
                      borderRadius: '14px',
                      padding: '12px 14px',
                      boxShadow: isActive ? '0 4px 12px rgba(15, 118, 110, 0.08)' : '0 1px 3px rgba(0,0,0,0.02)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed #e2e8f0', paddingBottom: '6px' }}>
                      <strong style={{ fontSize: '12.5px', color: '#0f766e', letterSpacing: '0.01em' }}>{r.so_don_hang}</strong>
                      {renderTableStatus(currentStatus)}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '13.5px' }}>{r.ten_khach_hang}</div>
                        <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '1px' }}>👨‍💼 {r.tvbh || r.requested_by_name || 'Hệ thống'}</div>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '11px', color: '#64748b' }}>
                        <div>📅 {r.ngay_yeu_cau || r.created_at ? new Date(r.ngay_yeu_cau || r.created_at).toLocaleDateString('vi-VN') : 'N/A'}</div>
                      </div>
                    </div>
                    <div style={{ background: '#fafafb', border: '1px solid #f1f5f9', borderRadius: '8px', padding: '6px 10px', fontSize: '11.5px' }}>
                      <div style={{ fontWeight: 600, color: '#475569' }}>🚗 {r.dong_xe || ''} {r.phien_ban || ''}</div>
                      <div style={{ color: '#64748b', fontSize: '11px', marginTop: '1px' }}>🎨 {r.ngoai_that || '---'} · {r.noi_that || '---'}</div>
                    </div>
                    {r.vin && (
                      <div style={{ fontSize: '11px', color: '#0369a1', fontWeight: 700, background: '#e0f2fe', padding: '3px 8px', borderRadius: '6px', display: 'inline-block', alignSelf: 'flex-start' }}>
                        🔑 VIN: {r.vin}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* HIỂN THỊ MÁY TÍNH: Bảng dữ liệu */}
          <div className="table-wrap desktop-only" style={{ marginTop: '4px' }}>
            <table>
              <thead>
                <tr>
                  <th>Số đơn & Khách hàng</th>
                  <th>VIN / Dòng xe</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', padding: '30px', color: '#64748b', fontStyle: 'italic' }}>
                      Không tìm thấy yêu cầu hóa đơn nào.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => {
                    const isActive = selectedRequest?.id === r.id;
                    const currentStatus = getWorkflowStatus(r);
                    return (
                      <tr 
                        key={r.id}
                        onClick={() => { setSelectedRequestId(r.id); setIsMobileDetailOpen(true); }}
                        className={isActive ? 'active-row' : ''}
                        style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                      >
                        <td>
                          <div style={{ fontWeight: 700, color: '#0f766e', fontSize: '12.5px' }}>{r.so_don_hang}</div>
                          <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '12px', marginTop: '1px' }}>{r.ten_khach_hang}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#334155', fontSize: '12px' }}>{r.vin || '---'}</div>
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>{r.dong_xe || ''} {r.phien_ban || ''}</div>
                        </td>
                        <td>
                          {renderTableStatus(currentStatus)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* CÁNH PHẢI: CHI TIẾT YÊU CẦU HÓA ĐƠN WIDGET */}
        <div className="orders-visual-side invoice-visual-side">
          <div className="order-detail-widget-container invoice-detail-container" style={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column', 
            background: '#f8fafc', 
            borderRadius: '20px', 
            border: '1px solid #cbd5e1', 
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', 
            padding: '16px', 
            gap: '12px', 
            minHeight: 0,
            overflowY: 'auto'
          }}>
            {selectedRequest ? (
              <>
                {/* Nút quay lại cho giao diện Mobile */}
                <div className="mobile-only" style={{ paddingBottom: '8px', borderBottom: '1px solid #e2e8f0', marginBottom: '12px' }}>
                  <button 
                    type="button"
                    className="ghost-button" 
                    onClick={() => setIsMobileDetailOpen(false)}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: '#0f766e', padding: '10px 14px', background: '#f0fdfa', border: '1px solid #5eead4', borderRadius: '10px', width: '100%', justifyContent: 'center', fontSize: '13.5px', cursor: 'pointer' }}
                  >
                    <ArrowLeft size={16} strokeWidth={2.5} />
                    <span>Quay lại danh sách yêu cầu</span>
                  </button>
                </div>
                {/* Header Widget */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '10px' }}>
                  <div>
                    <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Chi tiết yêu cầu HĐ</span>
                    <h3 className="clickable-copy-field" title="Click để copy mã đơn" onClick={() => copyToClipboard(selectedRequest.so_don_hang, 'Mã đơn')} style={{ margin: '2px 0 0 0', fontSize: '18px', fontWeight: 800, color: '#0f766e', letterSpacing: '-0.02em' }}>
                      {selectedRequest.so_don_hang}
                    </h3>
                  </div>
                  {renderTableStatus(workflowStatus)}
                </div>

                {/* Modul 1: Nhân sự & Thời gian */}
                <div className="order-detail-card-module" style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minHeight: 0, boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '6px', borderBottom: '1px dashed #cbd5e1', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#0f766e', letterSpacing: '0.04em' }}>
                    <User size={14} />
                    <span>Nhân sự & Thời gian</span>
                  </div>
                  <div className="dynamic-two-column-grid" style={{ gap: '8px 12px', flex: 1, alignContent: 'center' }}>
                    <div className="clickable-copy-field" title="Click để copy tên khách" onClick={() => copyToClipboard(selectedRequest.ten_khach_hang, 'Tên khách')} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '3px 6px', borderRadius: '6px' }}>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Khách hàng</span>
                      <strong style={{ fontSize: '14px', color: '#0f172a', fontWeight: 700 }}>{selectedRequest.ten_khach_hang}</strong>
                    </div>

                    <div className="clickable-copy-field" title="Click để copy tên TVBH" onClick={() => copyToClipboard(selectedRequest.tvbh || selectedRequest.requested_by_name || '', 'Tên TVBH')} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '3px 6px', borderRadius: '6px' }}>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Tư vấn bán hàng</span>
                      <strong style={{ fontSize: '13.5px', color: '#0f172a', fontWeight: 700 }}>{selectedRequest.tvbh || selectedRequest.requested_by_name || 'Hệ thống'}</strong>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '3px 6px' }}>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Ngày gửi yêu cầu</span>
                      <strong style={{ fontSize: '13.5px', color: '#334155', fontWeight: 600 }}>
                        {selectedRequest.ngay_yeu_cau || selectedRequest.created_at ? new Date(selectedRequest.ngay_yeu_cau || selectedRequest.created_at).toLocaleDateString('vi-VN') : 'N/A'}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Modul 2: Xe & Hệ thống */}
                <div className="order-detail-card-module" style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1.5, minHeight: 0, boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '6px', borderBottom: '1px dashed #cbd5e1', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#0f766e', letterSpacing: '0.04em' }}>
                    <Car size={14} />
                    <span>Xe & Hệ thống</span>
                  </div>
                  <div className="dynamic-two-column-grid" style={{ gap: '8px 12px', flex: 1, alignContent: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '3px 6px' }}>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Cấu hình đặt cọc</span>
                      <strong style={{ fontSize: '13.5px', color: '#0f172a', fontWeight: 700 }}>{selectedRequest.dong_xe || '---'} {selectedRequest.phien_ban || ''}</strong>
                      <small style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>🎨 {selectedRequest.ngoai_that || '---'} / {selectedRequest.noi_that || '---'}</small>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '3px 6px' }}>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Chính sách</span>
                      <strong style={{ fontSize: '13px', color: '#0f172a', fontWeight: 700, lineHeight: 1.3 }}>{selectedRequest.chinh_sach || 'Mặc định'}</strong>
                    </div>

                    <div className={selectedRequest.vin ? "clickable-copy-field" : ""} title={selectedRequest.vin ? "Click để copy số VIN" : ""} onClick={() => selectedRequest.vin && copyToClipboard(selectedRequest.vin, 'Số VIN')} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '3px 6px', borderRadius: '6px' }}>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Số VIN ghép</span>
                      <strong style={{ fontSize: '13.5px', color: selectedRequest.vin ? '#0f766e' : '#475569', fontWeight: 700 }}>{selectedRequest.vin || 'Chưa ghép'}</strong>
                    </div>

                    <div className={selectedRequest.so_may ? "clickable-copy-field" : ""} title={selectedRequest.so_may ? "Click để copy số máy" : ""} onClick={() => selectedRequest.so_may && copyToClipboard(selectedRequest.so_may, 'Số máy')} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '3px 6px', borderRadius: '6px' }}>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Số máy</span>
                      <strong style={{ fontSize: '13.5px', color: '#334155', fontWeight: 700 }}>{selectedRequest.so_may || 'Trống'}</strong>
                    </div>


                    {selectedRequest.xe_xang_vin ? (
                      <div className="clickable-copy-field" title="Click để copy VIN xe xăng" onClick={() => copyToClipboard(selectedRequest.xe_xang_vin || '', 'VIN xe xăng')} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '3px 6px', borderRadius: '6px' }}>
                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Xe xăng cũ đổi mới</span>
                        <strong style={{ fontSize: '13.5px', color: '#0284c7', fontWeight: 700 }}>{selectedRequest.xe_xang_vin}</strong>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Modul 3: Tài chính & Tài liệu hồ sơ */}
                <div className="order-detail-card-module" style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1.2, minHeight: 0, boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '6px', borderBottom: '1px dashed #cbd5e1', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#0f766e', letterSpacing: '0.04em' }}>
                    <CreditCard size={14} />
                    <span>Tài chính & Hồ sơ</span>
                  </div>
                  <div className="dynamic-two-column-grid" style={{ gap: '8px 12px', flex: 1, alignContent: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '3px 6px' }}>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Hoa hồng ứng</span>
                      <strong style={{ fontSize: '14px', color: '#0f766e', fontWeight: 700 }}>{selectedRequest.hoa_hong_ung || '---'}</strong>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '3px 6px' }}>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>VPoint tích lũy</span>
                      <strong style={{ fontSize: '13.5px', color: '#334155', fontWeight: 700 }}>{selectedRequest.vpoint || '---'}</strong>
                    </div>

                    {/* Hồ sơ tài liệu */}
                    <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Tài liệu đính kèm</span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {selectedRequest.url_hop_dong ? (
                          <a href={selectedRequest.url_hop_dong} target="_blank" rel="noreferrer" className="ghost-button row-action-button" style={{ height: '30px', padding: '0 10px', borderRadius: '6px', fontSize: '11.5px' }}>
                            <ExternalLink size={13} /> <span>HĐMB</span>
                          </a>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#94a3b8', padding: '4px 8px', border: '1px dashed #e2e8f0', borderRadius: '6px' }}>Chưa có HĐMB</span>
                        )}
                        
                        {(selectedRequest.url_de_nghi_xhd || selectedRequest.link_de_nghi_xhd) ? (
                          <a href={selectedRequest.url_de_nghi_xhd || selectedRequest.link_de_nghi_xhd || '#'} target="_blank" rel="noreferrer" className="ghost-button row-action-button" style={{ height: '30px', padding: '0 10px', borderRadius: '6px', fontSize: '11.5px' }}>
                            <ExternalLink size={13} /> <span>Đề nghị XHĐ</span>
                          </a>
                        ) : null}

                        {selectedRequest.url_hoa_don_da_xuat ? (
                          <a href={selectedRequest.url_hoa_don_da_xuat} target="_blank" rel="noreferrer" className="ghost-button row-action-button" style={{ height: '30px', padding: '0 10px', borderRadius: '6px', fontSize: '11.5px', borderColor: '#059669', color: '#059669' }}>
                            <FileText size={13} /> <span>Hóa đơn gốc</span>
                          </a>
                        ) : null}
                      </div>
                    </div>

                    {/* Ghi chú AI */}
                    {selectedRequest.ghi_chu_ai ? (
                      <div style={{ gridColumn: 'span 2', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '8px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <span style={{ fontSize: '10px', color: '#1d4ed8', display: 'block', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Thông tin hỗ trợ / Ghi chú</span>
                        <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#1e40af', fontStyle: 'italic', lineHeight: 1.4, fontWeight: 500 }}>
                          {selectedRequest.ghi_chu_ai}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* BẢNG HÀNH ĐỘNG (Được đưa từ row xuống widget tuyệt đẹp) */}
                <div className="orders-detail-actions dynamic-two-column-grid" style={{ gap: '6px', marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
                  {canApprove && ['Chờ phê duyệt', 'Đã bổ sung'].includes(workflowStatus) && (
                    <>
                      <button
                        className="primary-button"
                        style={{ background: '#059669', color: '#ffffff' }}
                        disabled={isProcessing}
                        onClick={() => onApprove(selectedRequest)}
                      >
                        <CheckSquare size={16} />
                        <span>Phê duyệt HĐ</span>
                      </button>
                      <button 
                        className="ghost-button" 
                        style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                        disabled={isProcessing} 
                        onClick={() => onRequestSupplement(selectedRequest)}
                      >
                        <XCircle size={16} />
                        <span>Y/C Bổ sung</span>
                      </button>
                    </>
                  )}
                  
                  {canApprove && workflowStatus === 'Đã phê duyệt' && (
                    <button 
                      className="primary-button" 
                      style={{ gridColumn: 'span 2' }}
                      disabled={isProcessing} 
                      onClick={() => onPendingSignature(selectedRequest)}
                    >
                      <CheckSquare size={16} />
                      <span>Chuyển trạng thái: Chờ ký HĐ</span>
                    </button>
                  )}

                  {canApprove && workflowStatus === 'Chờ ký hóa đơn' && (
                    <button 
                      className="primary-button" 
                      style={{ gridColumn: 'span 2', background: '#0f766e' }}
                      disabled={isProcessing} 
                      onClick={() => onUploadInvoice(selectedRequest)}
                    >
                      <FilePlus2 size={16} />
                      <span>Tải Hóa Đơn Lên Hệ Thống</span>
                    </button>
                  )}

                  {workflowStatus === 'Yêu cầu bổ sung' && (
                    <button
                      className="primary-button"
                      style={{ gridColumn: 'span 2', background: '#d97706' }}
                      onClick={() => onSupplement(selectedRequest)}
                    >
                      <FilePlus2 size={16} />
                      <span>Thực hiện bổ sung hồ sơ</span>
                    </button>
                  )}

                  {workflowStatus === 'Đã xuất hóa đơn' && (
                    <div style={{ gridColumn: 'span 2', padding: '10px', textAlign: 'center', background: '#ecfdf5', color: '#047857', borderRadius: '8px', border: '1px solid #a7f3d0', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <CheckCircle2 size={16} />
                      <span>Yêu cầu này đã hoàn tất quy trình</span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', color: '#94a3b8', textAlign: 'center', gap: '12px' }}>
                <HelpCircle size={48} strokeWidth={1.5} />
                <div>
                  <p style={{ fontWeight: 600, fontSize: '14px', color: '#64748b', margin: 0 }}>Chưa chọn yêu cầu hóa đơn</p>
                  <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px', lineHeight: 1.5 }}>Hãy chọn một dòng ở bảng bên trái để xem đầy đủ thông tin hồ sơ, chứng từ và phê duyệt.</p>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </section>
  );
};
