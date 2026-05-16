import React, { useEffect, useState, useMemo } from 'react';
import { Search, CheckCircle2, XCircle, Clock, ExternalLink, CheckSquare, FilePlus2, User, Car, CreditCard, FileText, HelpCircle, ArrowLeft, Eye, ShieldCheck, ClipboardCheck, Info, Mail, RefreshCw } from 'lucide-react';
import { YeucauxhdRow, Order } from '../types';
import { copyToClipboard } from '../utils/clipboard';
import * as apiService from '../services/apiService';
import { supabase } from '../services/supabaseClient';

const toEmbeddableUrl = (url: string) => {
  if (!url) return '';
  if (url.includes('drive.google.com')) {
    const fileId = url.match(/\/d\/([^/]+)/)?.[1] || url.match(/id=([^&]+)/)?.[1];
    if (fileId) return `https://drive.google.com/file/d/${fileId}/preview`;
  }
  return url;
};

const getRequestDocUrl = (request: YeucauxhdRow | null, docKey: 'url_hop_dong' | 'url_de_nghi_xhd' | 'url_hoa_don_da_xuat') => {
  if (!request) return '';

  if (docKey === 'url_hop_dong') {
    return request.url_hop_dong || request.link_hop_dong || '';
  }

  if (docKey === 'url_de_nghi_xhd') {
    return request.url_de_nghi_xhd || request.link_de_nghi_xhd || '';
  }

  return request.url_hoa_don_da_xuat || request.link_hoa_don_da_xuat || '';
};

const formatMobileDate = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatCurrency = (value?: number | null) => {
  if (value === undefined || value === null) return '—';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
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
  onReload?: () => void;
}

export const InvoiceRequestsPanel: React.FC<InvoiceRequestsPanelProps> = ({
  requests,
  canApprove,
  isProcessing = false,
  onApprove,
  onRequestSupplement,
  onPendingSignature,
  onUploadInvoice,
  onSupplement,
  onReload
}) => {
  const [selectedFolder, setSelectedFolder] = useState('pending_approval');
  const [query, setQuery] = useState('');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [isSplitView, setIsSplitView] = useState(true);
  const [activeDocKey, setActiveDocKey] = useState<'url_de_nghi_xhd' | 'url_hop_dong' | 'url_hoa_don_da_xuat'>('url_de_nghi_xhd');
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncFromOrder = async (req: YeucauxhdRow) => {
    if (!supabase) return;
    setIsSyncing(true);
    try {
      const { data: order, error: orderError } = await apiService.getOrderRow(req.so_don_hang);
      if (orderError || !order) {
        alert('Không tìm thấy thông tin đơn hàng tương ứng.');
        return;
      }

      const updateData: any = {
        tvbh: order.ten_tu_van_ban_hang,
        dong_xe: order.dong_xe,
        phien_ban: order.phien_ban,
        ngoai_that: order.ngoai_that,
        noi_that: order.noi_that,
        ngay_coc: order.ngay_coc,
        so_may: order.so_may,
        chinh_sach: order.chinh_sach,
        dia_chi: order.dia_chi_xhd,
        so_hop_dong: order.ma_hop_dong,
        so_tien_khach_da_dong: order.so_tien_coc,
        hinh_thuc_tt: order.tm_vay
      };

      if (!req.url_hop_dong && order.link_hop_dong) {
        updateData.url_hop_dong = order.link_hop_dong;
      }
      if (!req.link_hop_dong && order.link_hop_dong) {
        updateData.link_hop_dong = order.link_hop_dong;
      }
      if (!req.url_de_nghi_xhd && order.link_de_nghi_xhd) {
        updateData.url_de_nghi_xhd = order.link_de_nghi_xhd;
      }
      if (!req.link_de_nghi_xhd && order.link_de_nghi_xhd) {
        updateData.link_de_nghi_xhd = order.link_de_nghi_xhd;
      }
      if (!req.url_hoa_don_da_xuat && order.link_hoa_don_da_xuat) {
        updateData.url_hoa_don_da_xuat = order.link_hoa_don_da_xuat;
      }
      if (!req.link_hoa_don_da_xuat && order.link_hoa_don_da_xuat) {
        updateData.link_hoa_don_da_xuat = order.link_hoa_don_da_xuat;
      }

      const { error: updateError } = await supabase
        .from('yeucauxhd')
        .update(updateData)
        .eq('id', req.id);

      if (updateError) {
        alert('Lỗi cập nhật: ' + updateError.message);
      } else {
        if (onReload) onReload();
      }
    } catch (err: any) {
      alert('Lỗi hệ thống: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const getWorkflowStatus = (r: YeucauxhdRow) => r.trang_thai_xu_ly || (
    r.status === 'approved' ? 'Đã phê duyệt' : r.status === 'rejected' ? 'Từ chối' : 'Chờ phê duyệt'
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = {
      pending_approval: 0,
      approved: 0,
      request_supplement: 0,
      supplemented: 0,
      pending_signature: 0,
      completed: 0,
      all: requests.length
    };

    requests.forEach(r => {
      const s = getWorkflowStatus(r).toLowerCase();
      if (s === 'chờ phê duyệt') c.pending_approval++;
      else if (s === 'đã phê duyệt') c.approved++;
      else if (s === 'yêu cầu bổ sung') c.request_supplement++;
      else if (s === 'đã bổ sung') c.supplemented++;
      else if (s === 'chờ ký hóa đơn') c.pending_signature++;
      else if (s === 'đã xuất hóa đơn') c.completed++;
    });

    return c;
  }, [requests]);

  const folders = [
    { id: 'pending_approval', label: 'Chờ Duyệt', icon: Clock, count: counts.pending_approval, color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
    { id: 'approved', label: 'Đã Duyệt', icon: CheckSquare, count: counts.approved, color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' },
    { id: 'request_supplement', label: 'Cần Bổ Sung', icon: XCircle, count: counts.request_supplement, color: '#ef4444', bg: '#fef2f2', border: '#fecdd3' },
    { id: 'supplemented', label: 'Đã Bổ Sung', icon: FilePlus2, count: counts.supplemented, color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe' },
    { id: 'pending_signature', label: 'Chờ Ký', icon: CheckCircle2, count: counts.pending_signature, color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0' },
    { id: 'completed', label: 'Đã Hoàn Tất', icon: CheckCircle2, count: counts.completed, color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
    { id: 'all', label: 'Tất Cả', icon: Search, count: counts.all, color: '#64748b', bg: '#f1f5f9', border: '#e2e8f0' },
  ];

  const filtered = useMemo(() => {
    return requests.filter(r => {
      const s = getWorkflowStatus(r).toLowerCase();
      const folderMatches = selectedFolder === 'all' || 
        (selectedFolder === 'pending_approval' && s === 'chờ phê duyệt') ||
        (selectedFolder === 'approved' && s === 'đã phê duyệt') ||
        (selectedFolder === 'request_supplement' && s === 'yêu cầu bổ sung') ||
        (selectedFolder === 'supplemented' && s === 'đã bổ sung') ||
        (selectedFolder === 'pending_signature' && s === 'chờ ký hóa đơn') ||
        (selectedFolder === 'completed' && s === 'đã xuất hóa đơn');
      
      if (!folderMatches) return false;

      const norm = query.toLowerCase().trim();
      if (!norm) return true;

      return (
        r.so_don_hang.toLowerCase().includes(norm) ||
        r.ten_khach_hang.toLowerCase().includes(norm) ||
        (r.vin || '').toLowerCase().includes(norm) ||
        (r.tvbh || '').toLowerCase().includes(norm)
      );
    });
  }, [requests, selectedFolder, query]);

  const selectedRequest = useMemo(() => {
    return filtered.find(r => r.id === selectedRequestId) || filtered[0] || null;
  }, [filtered, selectedRequestId]);

  useEffect(() => {
    if (!selectedRequest) return;
    const currentDocUrl = getRequestDocUrl(selectedRequest, activeDocKey);
    if (currentDocUrl) return;

    const nextDocKey = (['url_de_nghi_xhd', 'url_hop_dong', 'url_hoa_don_da_xuat'] as const)
      .find((key) => Boolean(getRequestDocUrl(selectedRequest, key)));

    if (nextDocKey) {
      setActiveDocKey(nextDocKey);
    }
  }, [activeDocKey, selectedRequest]);

  useEffect(() => {
    if (filtered.length > 0 && (!selectedRequestId || !filtered.some(r => r.id === selectedRequestId))) {
      setSelectedRequestId(filtered[0].id);
    }
  }, [filtered, selectedFolder]);

  const statusColors: Record<string, string> = {
    'Chờ phê duyệt': '#f59e0b',
    'Đã phê duyệt': '#3b82f6',
    'Yêu cầu bổ sung': '#ef4444',
    'Đã bổ sung': '#8b5cf6',
    'Chờ ký hóa đơn': '#10b981',
    'Đã xuất hóa đơn': '#059669',
  };

  const renderStatusBadge = (status: string) => {
    const color = statusColors[status] || '#64748b';
    return (
      <span style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '4px', 
        padding: '2px 8px', 
        borderRadius: '6px', 
        fontSize: '10px', 
        fontWeight: 800, 
        background: `${color}15`, 
        color: color,
        border: `1px solid ${color}30`,
        textTransform: 'uppercase'
      }}>
        {status}
      </span>
    );
  };

  return (
    <div className="invoice-modular-workspace" style={{ height: '100%', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
      
      {/* 1. TOP SECTION: METRICS BAR */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', padding: '10px 16px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        {folders.map(folder => (
          <button
            key={folder.id}
            onClick={() => setSelectedFolder(folder.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '8px',
              border: selectedFolder === folder.id ? `1px solid ${folder.color}` : `1px solid ${folder.border}`,
              background: selectedFolder === folder.id ? folder.color : folder.bg,
              color: selectedFolder === folder.id ? '#fff' : folder.color,
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: '0.2s',
              boxShadow: selectedFolder === folder.id ? `0 2px 6px ${folder.color}30` : 'none'
            }}
          >
            <folder.icon size={12} />
            <span>{folder.label}</span>
            <strong style={{ opacity: 0.9 }}>{folder.count}</strong>
          </button>
        ))}
      </div>

      {/* 2. BOTTOM SECTION */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: isSplitView ? '0.35fr 1.65fr' : '1fr 0fr', gap: '8px', minHeight: 0 }}>
        
        {/* COLUMN 2: DATA LIST (Ultra Mini) */}
        <div className={`orders-data-side ${mobileView === 'detail' ? 'hidden-mobile' : ''}`} style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px', background: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0', minHeight: 0 }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input 
              type="text" 
              placeholder="Tìm kiếm..." 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '12px', background: '#f8fafc', outline: 'none' }}
            />
          </div>

          <div className="table-wrap custom-scrollbar" style={{ flex: 1, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0' }}>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>Trống</td>
                  </tr>
                ) : (
                  filtered.map(r => (
                    <tr 
                      key={r.id}
                      onClick={() => {
                        setSelectedRequestId(r.id);
                        setMobileView('detail');
                      }}
                      style={{
                        cursor: 'pointer',
                        background: selectedRequestId === r.id ? '#f0f9ff' : 'transparent',
                        transition: '0.1s'
                      }}
                    >
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ fontSize: '12px', fontWeight: 800, color: '#0284c7', fontFamily: 'monospace' }}>{r.so_don_hang}</div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.ten_khach_hang}</div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* COLUMN 3: DETAIL VIEW (FULL INFO) */}
        <div className={`orders-visual-side ${mobileView !== 'detail' ? 'hidden-mobile' : ''}`} style={{ display: 'flex', flexDirection: 'column', minWidth: 0, background: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          {selectedRequest ? (
            <>
              {/* COMPACT HEADER WITH ACTIONS */}
              <div style={{ 
                background: '#fff', 
                padding: '0 16px', 
                borderBottom: '1px solid #e2e8f0',
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                flexShrink: 0,
                height: '44px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button onClick={() => setMobileView('list')} className="mobile-only" style={{ background: '#f1f5f9', border: 'none', color: '#475569', padding: '4px', borderRadius: '6px' }}><ArrowLeft size={16} /></button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#1e293b', whiteSpace: 'nowrap' }}>{selectedRequest.ten_khach_hang}</h2>
                    {renderStatusBadge(getWorkflowStatus(selectedRequest))}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#64748b', fontSize: '11px', fontWeight: 500, marginLeft: '8px', borderLeft: '1px solid #e2e8f0', paddingLeft: '12px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}><FileText size={12} /> {selectedRequest.so_don_hang}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}><User size={12} /> {selectedRequest.tvbh || selectedRequest.requested_by_name}</span>
                    </div>
                  </div>
                </div>

                {/* ACTION BUTTONS IN HEADER */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {canApprove && ['Chờ phê duyệt', 'Đã bổ sung'].includes(getWorkflowStatus(selectedRequest)) && (
                      <>
                        <button onClick={() => onRequestSupplement(selectedRequest)} disabled={isProcessing} className="ghost-button" style={{ height: '26px', padding: '0 8px', fontSize: '11px', borderRadius: '4px', color: '#dc2626', borderColor: '#fca5a5' }}>
                          {isProcessing ? <RefreshCw size={12} className="spin" style={{ marginRight: '4px' }} /> : <XCircle size={12} style={{ marginRight: '4px' }} />} Yêu cầu BS
                        </button>
                        <button onClick={() => onApprove(selectedRequest)} disabled={isProcessing} className="primary-button" style={{ height: '26px', padding: '0 8px', fontSize: '11px', borderRadius: '4px', background: '#059669', borderColor: '#059669' }}>
                          {isProcessing ? <RefreshCw size={12} className="spin" style={{ marginRight: '4px' }} /> : <CheckSquare size={12} style={{ marginRight: '4px' }} />} Phê duyệt
                        </button>
                      </>
                    )}
                    {canApprove && getWorkflowStatus(selectedRequest) === 'Đã phê duyệt' && (
                      <button onClick={() => onPendingSignature(selectedRequest)} disabled={isProcessing} className="primary-button" style={{ height: '26px', padding: '0 8px', fontSize: '11px', borderRadius: '4px', background: '#3b82f6', borderColor: '#3b82f6' }}>
                        {isProcessing ? <RefreshCw size={12} className="spin" style={{ marginRight: '4px' }} /> : <CheckSquare size={12} style={{ marginRight: '4px' }} />} Chuyển Chờ Ký
                      </button>
                    )}
                    {canApprove && getWorkflowStatus(selectedRequest) === 'Chờ ký hóa đơn' && (
                      <button onClick={() => onUploadInvoice(selectedRequest)} disabled={isProcessing} className="primary-button" style={{ height: '26px', padding: '0 8px', fontSize: '11px', borderRadius: '4px', background: '#0f766e', borderColor: '#0f766e' }}>
                        {isProcessing ? <RefreshCw size={12} className="spin" style={{ marginRight: '4px' }} /> : <FilePlus2 size={12} style={{ marginRight: '4px' }} />} Tải HĐ & Hoàn tất
                      </button>
                    )}
                    {getWorkflowStatus(selectedRequest) === 'Yêu cầu bổ sung' && (
                      <button onClick={() => onSupplement(selectedRequest)} disabled={isProcessing} className="primary-button" style={{ height: '26px', padding: '0 8px', fontSize: '11px', borderRadius: '4px', background: '#d97706', borderColor: '#d97706' }}>
                        {isProcessing ? <RefreshCw size={12} className="spin" style={{ marginRight: '4px' }} /> : <FilePlus2 size={12} style={{ marginRight: '4px' }} />} Bổ sung ngay
                      </button>
                    )}
                </div>
              </div>

              {/* CONTENT AREA */}
              <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                <div className="custom-scrollbar" style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* GRID: 4 COLUMNS FOR DENSE INFO */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px' }}>
                    
                    {/* SECTION: KHÁCH HÀNG & NHÂN SỰ */}
                    <SectionBox title="Khách hàng & Nhân sự" icon={User}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <DetailItem label="Tên khách hàng" value={selectedRequest.ten_khach_hang} copyable />
                        <DetailItem label="Tư vấn bán hàng" value={selectedRequest.tvbh || selectedRequest.requested_by_name || 'N/A'} copyable />
                        <DetailItem label="Nguồn khách" value={selectedRequest.nguon_khach || 'Trực tiếp'} />
                        <DetailItem label="Mã VSO" value={selectedRequest.ma_vso || 'N/A'} copyable />
                        <DetailItem label="Người yêu cầu" value={selectedRequest.requested_by_name || 'N/A'} />
                        <DetailItem label="Ngày yêu cầu" value={formatMobileDate(selectedRequest.ngay_yeu_cau || selectedRequest.created_at)} />
                      </div>
                    </SectionBox>

                    {/* SECTION: THÔNG TIN XE */}
                    <SectionBox title="Thông tin xe" icon={Car}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <DetailItem label="Dòng xe" value={selectedRequest.dong_xe} />
                        <DetailItem label="Phiên bản" value={selectedRequest.phien_ban} />
                        <DetailItem label="Ngoại thất" value={selectedRequest.ngoai_that} />
                        <DetailItem label="Nội thất" value={selectedRequest.noi_that} />
                        <DetailItem label="Số VIN" value={selectedRequest.vin || 'Chưa ghép'} copyable color="#0284c7" isFullWidth />
                        <DetailItem label="Giá công bố" value={formatCurrency(selectedRequest.gia_cong_bo)} color="#b45309" />
                        <DetailItem label="Ngày cọc" value={formatMobileDate(selectedRequest.ngay_coc)} />
                      </div>
                    </SectionBox>

                    {/* SECTION: TÀI CHÍNH & HỢP ĐỒNG */}
                    <SectionBox title="Tài chính & Hợp đồng" icon={CreditCard}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <DetailItem label="Số tiền đã đóng" value={formatCurrency(selectedRequest.so_tien_khach_da_dong)} color="#059669" />
                        <DetailItem label="Hình thức TT" value={selectedRequest.hinh_thuc_tt || 'Tiền mặt'} />
                        <DetailItem label="Số Hợp đồng" value={selectedRequest.so_hop_dong || 'N/A'} copyable />
                        <DetailItem label="Ngày ký HĐ" value={formatMobileDate(selectedRequest.ngay_ky_hop_dong)} />
                        <DetailItem label="Chính sách" value={selectedRequest.chinh_sach || 'Mặc định'} isFullWidth />
                        <DetailItem label="Địa chỉ xuất HĐ" value={selectedRequest.dia_chi || 'N/A'} isFullWidth />
                      </div>
                    </SectionBox>

                    {/* SECTION: DỊCH VỤ & THU CŨ */}
                    <SectionBox title="Dịch vụ & Thu cũ" icon={ShieldCheck}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <DetailItem label="Mua bảo hiểm" value={selectedRequest.mua_bao_hiem ? '✅ Có' : '❌ Không'} />
                        <DetailItem label="Đăng ký xe" value={selectedRequest.dang_ky_xe ? '✅ Có' : '❌ Không'} />
                        <DetailItem label="Xe cũ (Đổi mới)" value={selectedRequest.xe_xang_vin || '❌ Không'} copyable={!!selectedRequest.xe_xang_vin} />
                        <DetailItem label="Hãng xe cũ" value={selectedRequest.xe_xang_hang || '—'} />
                        <DetailItem label="Model xe cũ" value={selectedRequest.xe_xang_model || '—'} isFullWidth />
                      </div>
                    </SectionBox>
                  </div>


                  {/* SECTION: GHI CHÚ */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                    <SectionBox title="Ghi chú từ Tư vấn bán hàng" icon={Info}>
                      <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>{selectedRequest.ghi_chu || 'Không có ghi chú từ TVBH'}</p>
                    </SectionBox>
                  </div>

                  {/* STICKY ACTION FOOTER REMOVED (Actions moved to header) */}
                </div>

                {/* SPLIT PREVIEW */}
                {isSplitView && (
                  <div style={{ flex: '1.4', background: '#fff', borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ height: '44px', padding: '0 12px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px', background: '#fff' }}>
                      <TabButton label="Đề nghị XHĐ" active={activeDocKey === 'url_de_nghi_xhd'} onClick={() => setActiveDocKey('url_de_nghi_xhd')} />
                      <TabButton label="Hợp đồng MB" active={activeDocKey === 'url_hop_dong'} onClick={() => setActiveDocKey('url_hop_dong')} />
                      <TabButton label="Hóa đơn" active={activeDocKey === 'url_hoa_don_da_xuat'} onClick={() => setActiveDocKey('url_hoa_don_da_xuat')} />
                    </div>
                    <div style={{ flex: 1, background: '#f1f5f9' }}>
                      {(() => {
                        const docUrl = getRequestDocUrl(selectedRequest, activeDocKey);

                        if (docUrl) {
                          return <iframe key={docUrl} src={toEmbeddableUrl(docUrl)} style={{ width: '100%', height: '100%', border: 'none' }} title="Doc" />;
                        }

                        return (
                          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                            <FileText size={48} style={{ opacity: 0.1, marginBottom: '16px' }} />
                            <span style={{ fontSize: '13px' }}>Chưa có file chứng từ này</span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Chọn một yêu cầu để xem chi tiết</div>
          )}
        </div>
      </div>
    </div>
  );
};

// COMPONENT HELPERS
const SectionBox = ({ title, icon: Icon, children }: any) => (
  <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', height: '100%' }}>
    <div style={{ padding: '10px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
      <Icon size={13} color="#0284c7" strokeWidth={3} />
      <span style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', color: '#475569', letterSpacing: '0.02em' }}>{title}</span>
    </div>
    <div style={{ padding: '16px' }}>{children}</div>
  </div>
);

const DetailItem = ({ label, value, copyable, color = '#1e293b', isFullWidth = false }: any) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', gridColumn: isFullWidth ? '1 / -1' : 'auto' }}>
    <span style={{ fontSize: '9px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>{label}</span>
    <div 
      onClick={() => copyable && value && copyToClipboard(value, label)}
      style={{ fontSize: '13px', fontWeight: 700, color: color, cursor: copyable ? 'pointer' : 'default', lineHeight: 1.35 }}
      className={copyable ? 'hover-bg-slate' : ''}
    >
      {value || '—'}
    </div>
  </div>
);

const FileDocLink = ({ label, url, isSuccess, onClick }: any) => (
  <button
    onClick={onClick}
    disabled={!url}
    style={{
      display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '12px', border: '1px solid #e2e8f0',
      background: isSuccess ? '#ecfdf5' : '#fff', color: isSuccess ? '#059669' : '#1e293b', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
      opacity: !url ? 0.3 : 1, transition: '0.2s'
    }}
  >
    <ExternalLink size={14} /> {label} {!url && '(N/A)'}
  </button>
);

const ActionButton = ({ label, icon: Icon, color, onClick, loading, isFullWidth }: any) => (
  <button
    disabled={loading}
    onClick={onClick}
    style={{
      flex: isFullWidth ? 1 : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '12px 24px',
      borderRadius: '14px', background: color, color: '#fff', border: 'none', fontSize: '13px', fontWeight: 800, cursor: 'pointer', opacity: loading ? 0.7 : 1,
      boxShadow: `0 4px 12px ${color}40`
    }}
  >
    {loading ? 'Đang xử lý...' : <><Icon size={18} /> {label}</>}
  </button>
);

const TabButton = ({ label, active, onClick }: any) => (
  <button
    onClick={onClick}
    style={{
      padding: '4px 10px', borderRadius: '6px', border: '1px solid', borderColor: active ? '#0284c7' : '#e2e8f0',
      background: active ? '#0284c715' : '#fff', color: active ? '#0284c7' : '#64748b', fontSize: '11px', fontWeight: 800, cursor: 'pointer'
    }}
  >
    {label}
  </button>
);
