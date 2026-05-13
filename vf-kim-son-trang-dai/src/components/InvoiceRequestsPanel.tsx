import React, { useState, useMemo } from 'react';
import { Search, CheckCircle2, XCircle, Clock, ExternalLink, CheckSquare, FilePlus2 } from 'lucide-react';
import { YeucauxhdRow } from '../types';

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
        (r.ma_dms || '').toLowerCase().includes(norm) ||
        (r.xe_xang_vin || '').toLowerCase().includes(norm) ||
        (r.requested_by_name || '').toLowerCase().includes(norm)
      );
    });
  }, [requests, query, statusFilter]);

  const renderStatus = (status: string) => {
    switch (status) {
      case 'Đã xuất hóa đơn':
        return <span className="status-tag status-live" style={{ display: 'flex', alignItems: 'center', gap: '4px', width: 'fit-content' }}><CheckCircle2 size={14}/> Đã duyệt</span>;
      case 'Từ chối':
        return <span className="status-tag status-error" style={{ display: 'flex', alignItems: 'center', gap: '4px', width: 'fit-content' }}><XCircle size={14}/> Từ chối</span>;
      case 'Yêu cầu bổ sung':
        return <span className="status-tag status-error" style={{ display: 'flex', alignItems: 'center', gap: '4px', width: 'fit-content' }}><XCircle size={14}/> Yêu cầu bổ sung</span>;
      case 'Đã phê duyệt':
      case 'Chờ ký hóa đơn':
      case 'Đã bổ sung':
        return <span className="status-tag status-loading" style={{ display: 'flex', alignItems: 'center', gap: '4px', width: 'fit-content' }}><Clock size={14}/> {status}</span>;
      default:
        return <span className="status-tag status-loading" style={{ display: 'flex', alignItems: 'center', gap: '4px', width: 'fit-content' }}><Clock size={14}/> {status || 'Chờ phê duyệt'}</span>;
    }
  };

  return (
    <section className="panel">
      <div className="panel-heading section-heading">
        <div>
          <p className="eyebrow">Bộ phận Kế toán & Bàn giao</p>
          <h2>Danh Sách Yêu Cầu Xuất Hóa Đơn</h2>
        </div>
      </div>

      <div className="toolbar">
        <label className="search-box">
          <Search size={18} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo mã đơn, tên KH, VIN..."
          />
        </label>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['all', 'Chờ phê duyệt', 'Đã phê duyệt', 'Yêu cầu bổ sung', 'Đã bổ sung', 'Chờ ký hóa đơn', 'Đã xuất hóa đơn'].map((status) => (
            <button
              key={status}
              className={statusFilter === status ? 'primary-button' : 'ghost-button'}
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
              onClick={() => setStatusFilter(status)}
            >
              {status === 'all' ? 'Tất cả' : status}
            </button>
          ))}
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Đơn hàng / Khách hàng</th>
              <th>Xe / Chính sách</th>
              <th>Người yêu cầu</th>
              <th>Hồ sơ</th>
              <th>Thưởng / Ghi chú</th>
              <th>Trạng thái</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="empty-state">Không có yêu cầu hóa đơn nào phù hợp bộ lọc.</div>
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id}>
                  <td>
                    <strong>{r.so_don_hang}</strong>
                    <small>{r.ten_khach_hang}</small>
                    <small>{r.dong_xe || ''} {r.phien_ban || ''}</small>
                  </td>
                  <td>
                    <strong>{r.vin || '---'}</strong>
                    <small>SM: {r.so_may || '---'} | DMS: {r.ma_dms || '---'}</small>
                    <small style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.chinh_sach || 'Mặc định'}
                    </small>
                    {r.xe_xang_vin && <small>Xe xăng: {r.xe_xang_vin}</small>}
                  </td>
                  <td>
                    <strong>{r.tvbh || r.requested_by_name}</strong>
                    <small>{r.ngay_yeu_cau || r.created_at ? new Date(r.ngay_yeu_cau || r.created_at).toLocaleDateString('vi-VN') : ''}</small>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {r.url_hop_dong && (
                        <a href={r.url_hop_dong} target="_blank" rel="noreferrer" className="ghost-button row-action-button" style={{ width: 'fit-content' }}>
                          <ExternalLink size={14} />
                          <span>HĐMB</span>
                        </a>
                      )}
                      {(r.url_de_nghi_xhd || r.link_de_nghi_xhd) && (
                        <a href={r.url_de_nghi_xhd || r.link_de_nghi_xhd || '#'} target="_blank" rel="noreferrer" className="ghost-button row-action-button" style={{ width: 'fit-content' }}>
                          <ExternalLink size={14} />
                          <span>Đề nghị XHĐ</span>
                        </a>
                      )}
                      {r.url_hoa_don_da_xuat && (
                        <a href={r.url_hoa_don_da_xuat} target="_blank" rel="noreferrer" className="ghost-button row-action-button" style={{ width: 'fit-content' }}>
                          <ExternalLink size={14} />
                          <span>Hóa đơn</span>
                        </a>
                      )}
                    </div>
                  </td>
                  <td>
                    <strong>HH: {r.hoa_hong_ung || '---'}</strong>
                    <small>VPoint: {r.vpoint || '---'}</small>
                    {r.ghi_chu_ai && (
                      <small style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.ghi_chu_ai}
                      </small>
                    )}
                  </td>
                  <td>
                    {renderStatus(getWorkflowStatus(r))}
                  </td>
                  <td>
                    <div className="row-actions">
                      {canApprove && ['Chờ phê duyệt', 'Đã bổ sung'].includes(getWorkflowStatus(r)) && (
                        <button
                          className="ghost-button row-action-button"
                          style={{ borderColor: 'var(--success-color)', color: 'var(--success-color)' }}
                          disabled={isProcessing}
                          onClick={() => onApprove(r)}
                        >
                          <CheckSquare size={16} />
                          <span>Phê duyệt</span>
                        </button>
                      )}
                      {canApprove && ['Chờ phê duyệt', 'Đã bổ sung'].includes(getWorkflowStatus(r)) && (
                        <button className="ghost-button row-action-button" disabled={isProcessing} onClick={() => onRequestSupplement(r)}>
                          <XCircle size={16} />
                          <span>Y/C bổ sung</span>
                        </button>
                      )}
                      {canApprove && getWorkflowStatus(r) === 'Đã phê duyệt' && (
                        <button className="ghost-button row-action-button" disabled={isProcessing} onClick={() => onPendingSignature(r)}>
                          <CheckSquare size={16} />
                          <span>Chờ ký</span>
                        </button>
                      )}
                      {canApprove && getWorkflowStatus(r) === 'Chờ ký hóa đơn' && (
                        <button className="ghost-button row-action-button" disabled={isProcessing} onClick={() => onUploadInvoice(r)}>
                          <FilePlus2 size={16} />
                          <span>Tải HĐ</span>
                        </button>
                      )}
                      {['Yêu cầu bổ sung'].includes(getWorkflowStatus(r)) && (
                        <button
                          className="ghost-button row-action-button"
                          onClick={() => onSupplement(r)}
                        >
                          <FilePlus2 size={16} />
                          <span>Bổ sung</span>
                        </button>
                      )}
                      {getWorkflowStatus(r) === 'Đã xuất hóa đơn' && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Đã hoàn tất</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
