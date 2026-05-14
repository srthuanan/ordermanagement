import React, { useEffect, useState, useMemo } from 'react';
import { Search, CheckCircle2, XCircle, Clock, ExternalLink, CheckSquare, FilePlus2, User, Car, CreditCard, FileText, HelpCircle, ArrowLeft } from 'lucide-react';
import { YeucauxhdRow } from '../types';
import { copyToClipboard } from '../utils/clipboard';

const formatMobileDate = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

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
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');
  const [isMobile, setIsMobile] = useState(false);

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

  useEffect(() => {
    const media = window.matchMedia('(max-width: 760px)');
    const update = () => setIsMobile(media.matches);
    update();
    if (media.addEventListener) {
      media.addEventListener('change', update);
      return () => media.removeEventListener('change', update);
    }
    media.addListener(update);
    return () => media.removeListener(update);
  }, []);

  useEffect(() => {
    if (!filtered.length) {
      if (selectedRequestId) setSelectedRequestId(null);
      setMobileView('list');
      return;
    }
    if (!selectedRequestId || !filtered.some((r) => r.id === selectedRequestId)) {
      setSelectedRequestId(filtered[0].id);
    }
  }, [filtered, selectedRequestId]);

  useEffect(() => {
    if (!isMobile) setMobileView('list');
  }, [isMobile]);

  const workflowStatus = selectedRequest ? getWorkflowStatus(selectedRequest) : '';

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
    <section className={isMobile ? `panel invoice-panel ${mobileView === 'detail' ? 'invoice-mobile-detail' : 'invoice-mobile-list'}` : 'panel invoice-panel'}>
      <div className="orders-modular-workspace">
        
        {/* CÁNH TRÁI: BẢNG DỮ LIỆU YÊU CẦU HÓA ĐƠN */}
        <div className="orders-data-side">
          <div style={{ 
            padding: '4px 0', 
            background: '#ffffff', 
            display: 'flex', 
            flexWrap: 'wrap', 
            alignItems: 'center', 
            gap: '8px' 
          }}>
            <label className="search-box" style={{ flex: '1 1 220px', minHeight: '34px', height: '34px', padding: '0 10px', border: '1px solid #cbd5e1', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Search size={14} style={{ color: '#64748b' }} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm số đơn, KH, VIN..."
                style={{ fontSize: '12.5px', border: 'none', outline: 'none', width: '100%', color: '#1e293b' }}
              />
            </label>
            
            <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '2px', flex: '2 1 auto' }} className="no-scrollbar">
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
          </div>

          <div className="table-wrap" style={{ marginTop: '4px' }}>
            {isMobile ? (
              <div className="invoice-mobile-card-list">
                {filtered.length === 0 ? (
                  <div className="empty-state" style={{ padding: '24px 16px', textAlign: 'center' }}>
                    Không tìm thấy yêu cầu hóa đơn nào.
                  </div>
                ) : (
                  filtered.map((r) => {
                    const isActive = selectedRequest?.id === r.id;
                    const currentStatus = getWorkflowStatus(r);
                    return (
                      <button
                        key={r.id}
                        type="button"
                        className={isActive ? 'invoice-mobile-card active' : 'invoice-mobile-card'}
                        onClick={() => {
                          setSelectedRequestId(r.id);
                          setMobileView('detail');
                        }}
                      >
                        <div className="invoice-mobile-card-header">
                          <div className="invoice-mobile-card-headings">
                            <p className="invoice-mobile-card-title">{r.so_don_hang}</p>
                            <p className="invoice-mobile-card-subtitle">{r.ten_khach_hang}</p>
                          </div>
                          {renderTableStatus(currentStatus)}
                        </div>

                        <div className="invoice-mobile-card-divider" />

                        <div className="invoice-mobile-card-bottom">
                          <div className="invoice-mobile-card-meta">
                            <span>VIN</span>
                            <strong>{r.vin || '---'}</strong>
                          </div>
                          <div className="invoice-mobile-card-meta invoice-mobile-card-meta-right">
                            <span>Tư vấn bán hàng</span>
                            <strong>{r.tvbh || r.requested_by_name || 'Hệ thống'}</strong>
                          </div>
                        </div>

                        <div className="invoice-mobile-card-footer">
                          <span>{r.dong_xe || '---'}</span>
                          <strong>{r.phien_ban || '---'}</strong>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            ) : (
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
                          onClick={() => setSelectedRequestId(r.id)}
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
            )}
          </div>
        </div>

        {/* CÁNH PHẢI: CHI TIẾT YÊU CẦU HÓA ĐƠN WIDGET */}
        <div className="orders-visual-side">
          <div className="order-detail-widget-container" style={{ 
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
                {isMobile ? (
                  <div className="invoice-mobile-detail-view" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button
                      type="button"
                      className="ghost-button orders-mobile-back"
                      onClick={() => setMobileView('list')}
                      style={{ alignSelf: 'flex-start', height: '32px', padding: '0 10px', fontSize: '12px' }}
                    >
                      <ArrowLeft size={14} />
                      <span>Danh sách</span>
                    </button>

                    <div className="invoice-mobile-detail-shell" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                        <div className="clickable-copy-field" title="Click để copy mã đơn" onClick={() => copyToClipboard(selectedRequest.so_don_hang, 'Mã đơn')} style={{ minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', fontWeight: 700 }}>CHI TIẾT YÊU CẦU HĐ</p>
                          <h3 style={{ margin: '2px 0 0', fontSize: '18px', lineHeight: 1.15, fontWeight: 700, color: '#0f172a' }}>{selectedRequest.so_don_hang}</h3>
                          <p style={{ margin: '2px 0 0', fontSize: '12px', fontWeight: 500, color: '#475569' }}>{selectedRequest.ten_khach_hang}</p>
                        </div>
                        {renderTableStatus(workflowStatus)}
                      </div>

                      <div style={{ height: '1px', width: '100%', background: '#f1f5f9' }} />

                      <div className="invoice-mobile-section" style={{ background: '#ffffff', border: '1px solid #f1f5f9', borderRadius: '18px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '8px', borderBottom: '1px dashed #e2e8f0', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#b45309', letterSpacing: '0.04em' }}>
                          <User size={14} />
                          <span>Nhân sự & Thời gian</span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 12px' }}>
                          <div className="clickable-copy-field" title="Click để copy tên khách" onClick={() => copyToClipboard(selectedRequest.ten_khach_hang, 'Tên khách')} style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                            <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Khách hàng</span>
                            <strong style={{ fontSize: '13px', color: '#0f172a', fontWeight: 600, lineHeight: 1.35, wordBreak: 'break-word' }}>{selectedRequest.ten_khach_hang}</strong>
                          </div>

                          <div className="clickable-copy-field" title="Click để copy tên TVBH" onClick={() => copyToClipboard(selectedRequest.tvbh || selectedRequest.requested_by_name || '', 'Tên TVBH')} style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, textAlign: 'right', alignItems: 'flex-end' }}>
                            <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tư vấn bán hàng</span>
                            <strong style={{ fontSize: '13px', color: '#0f172a', fontWeight: 600, lineHeight: 1.35, wordBreak: 'break-word' }}>{selectedRequest.tvbh || selectedRequest.requested_by_name || 'Hệ thống'}</strong>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Ngày gửi yêu cầu</span>
                            <strong style={{ fontSize: '13px', color: '#334155', fontWeight: 600, lineHeight: 1.35 }}>{formatMobileDate(selectedRequest.ngay_yeu_cau || selectedRequest.created_at)}</strong>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'right', alignItems: 'flex-end' }}>
                            <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Trạng thái</span>
                            <strong style={{ fontSize: '13px', color: '#334155', fontWeight: 600, lineHeight: 1.35 }}>{workflowStatus}</strong>
                          </div>
                        </div>
                      </div>

                      <div className="invoice-mobile-section" style={{ background: '#ffffff', border: '1px solid #f1f5f9', borderRadius: '18px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '8px', borderBottom: '1px dashed #e2e8f0', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#b45309', letterSpacing: '0.04em' }}>
                          <Car size={14} />
                          <span>Xe & Hệ thống</span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 12px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', gridColumn: 'span 2' }}>
                            <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Cấu hình đặt cọc</span>
                            <strong style={{ fontSize: '13px', color: '#0f172a', fontWeight: 600, lineHeight: 1.35 }}>{selectedRequest.dong_xe || '---'} {selectedRequest.phien_ban || ''}</strong>
                            <small style={{ fontSize: '11px', color: '#64748b' }}>🎨 {selectedRequest.ngoai_that || '---'} / {selectedRequest.noi_that || '---'}</small>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Chính sách</span>
                            <strong style={{ fontSize: '13px', color: '#334155', fontWeight: 600, lineHeight: 1.35 }}>{selectedRequest.chinh_sach || 'Mặc định'}</strong>
                          </div>

                          <div className={selectedRequest.vin ? 'clickable-copy-field' : ''} title={selectedRequest.vin ? 'Click để copy số VIN' : ''} onClick={() => selectedRequest.vin && copyToClipboard(selectedRequest.vin, 'Số VIN')} style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'right', alignItems: 'flex-end' }}>
                            <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Số VIN</span>
                            <strong style={{ fontSize: '13px', color: selectedRequest.vin ? '#0f766e' : '#475569', fontWeight: 600, lineHeight: 1.35, wordBreak: 'break-word' }}>{selectedRequest.vin || 'Chưa ghép'}</strong>
                          </div>

                          <div className={selectedRequest.so_may ? 'clickable-copy-field' : ''} title={selectedRequest.so_may ? 'Click để copy số máy' : ''} onClick={() => selectedRequest.so_may && copyToClipboard(selectedRequest.so_may, 'Số máy')} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Số máy</span>
                            <strong style={{ fontSize: '13px', color: '#0f172a', fontWeight: 600, lineHeight: 1.35, wordBreak: 'break-word' }}>{selectedRequest.so_may || 'Trống'}</strong>
                          </div>

                          {selectedRequest.xe_xang_vin ? (
                            <div className="clickable-copy-field" title="Click để copy VIN xe xăng" onClick={() => copyToClipboard(selectedRequest.xe_xang_vin || '', 'VIN xe xăng')} style={{ display: 'flex', flexDirection: 'column', gap: '2px', gridColumn: 'span 2' }}>
                              <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Xe xăng cũ đổi mới</span>
                              <strong style={{ fontSize: '13px', color: '#0284c7', fontWeight: 600, lineHeight: 1.35, wordBreak: 'break-word' }}>{selectedRequest.xe_xang_vin}</strong>
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="invoice-mobile-section" style={{ background: '#ffffff', border: '1px solid #f1f5f9', borderRadius: '18px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '8px', borderBottom: '1px dashed #e2e8f0', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#b45309', letterSpacing: '0.04em' }}>
                          <CreditCard size={14} />
                          <span>Tài chính & Hồ sơ</span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 12px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Hoa hồng ứng</span>
                            <strong style={{ fontSize: '13px', color: '#0f766e', fontWeight: 600, lineHeight: 1.35 }}>{selectedRequest.hoa_hong_ung || '---'}</strong>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'right', alignItems: 'flex-end' }}>
                            <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>VPoint</span>
                            <strong style={{ fontSize: '13px', color: '#334155', fontWeight: 600, lineHeight: 1.35 }}>{selectedRequest.vpoint || '---'}</strong>
                          </div>

                          <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tài liệu đính kèm</span>
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

                          {selectedRequest.ghi_chu_ai ? (
                            <div style={{ gridColumn: 'span 2', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '10px 12px' }}>
                              <span style={{ fontSize: '10px', color: '#1d4ed8', display: 'block', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Thông tin hỗ trợ / Ghi chú</span>
                              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#1e40af', fontStyle: 'italic', lineHeight: 1.4, fontWeight: 500 }}>{selectedRequest.ghi_chu_ai}</p>
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="invoice-mobile-actions" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        {canApprove && ['Chờ phê duyệt', 'Đã bổ sung'].includes(workflowStatus) && (
                          <>
                            <button className="primary-button" style={{ background: '#059669', color: '#ffffff', height: '34px', fontSize: '11.5px' }} disabled={isProcessing} onClick={() => onApprove(selectedRequest)}>
                              <CheckSquare size={16} />
                              <span>Phê duyệt HĐ</span>
                            </button>
                            <button className="ghost-button" style={{ color: '#dc2626', borderColor: '#fca5a5', height: '34px', fontSize: '11.5px' }} disabled={isProcessing} onClick={() => onRequestSupplement(selectedRequest)}>
                              <XCircle size={16} />
                              <span>Y/C Bổ sung</span>
                            </button>
                          </>
                        )}

                        {canApprove && workflowStatus === 'Đã phê duyệt' && (
                          <button className="primary-button" style={{ gridColumn: 'span 2', height: '34px', fontSize: '11.5px' }} disabled={isProcessing} onClick={() => onPendingSignature(selectedRequest)}>
                            <CheckSquare size={16} />
                            <span>Chuyển trạng thái: Chờ ký HĐ</span>
                          </button>
                        )}

                        {canApprove && workflowStatus === 'Chờ ký hóa đơn' && (
                          <button className="primary-button" style={{ gridColumn: 'span 2', background: '#0f766e', height: '34px', fontSize: '11.5px' }} disabled={isProcessing} onClick={() => onUploadInvoice(selectedRequest)}>
                            <FilePlus2 size={16} />
                            <span>Tải Hóa Đơn Lên Hệ Thống</span>
                          </button>
                        )}

                        {workflowStatus === 'Yêu cầu bổ sung' && (
                          <button className="primary-button" style={{ gridColumn: 'span 2', background: '#d97706', height: '34px', fontSize: '11.5px' }} onClick={() => onSupplement(selectedRequest)}>
                            <FilePlus2 size={16} />
                            <span>Thực hiện bổ sung hồ sơ</span>
                          </button>
                        )}

                        {workflowStatus === 'Đã xuất hóa đơn' && (
                          <div style={{ gridColumn: 'span 2', padding: '10px', textAlign: 'center', background: '#ecfdf5', color: '#047857', borderRadius: '12px', border: '1px solid #a7f3d0', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            <CheckCircle2 size={16} />
                            <span>Yêu cầu này đã hoàn tất quy trình</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}

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
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px', flex: 1, alignContent: 'center' }}>
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
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px', flex: 1, alignContent: 'center' }}>
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
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px', flex: 1, alignContent: 'center' }}>
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
                <div className="orders-detail-actions" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
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
