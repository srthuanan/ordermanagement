import React, { useState, useMemo, useEffect } from 'react';
import {
  CalendarDays, Clock, CheckCircle2, XCircle, Clock3,
  Plus, ChevronDown, Trash2, RefreshCw, User,
  FileCheck, AlertCircle, Filter, Search, Info, X
} from 'lucide-react';
import { HrLeaveRequestRow, ProfileRow } from '../types';
import * as apiService from '../services/apiService';

// ─── Constants ──────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<string, string> = {
  nghi_phep: '🏖️ Nghỉ phép',
  di_tre: '⏰ Đi trễ'
};

const SESSION_LABEL: Record<string, string> = {
  sang: 'Buổi sáng',
  chieu: 'Buổi chiều',
  ca_ngay: 'Cả ngày'
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  pending: { label: 'Chờ thẩm định', color: '#d97706', bg: '#fffbeb', border: '#fde68a', icon: <Clock3 size={11} /> },
  pending_director: { label: 'Chờ GĐ duyệt', color: '#6d28d9', bg: '#f5f3ff', border: '#ddd6fe', icon: <Clock3 size={11} /> },
  approved: { label: 'Đã duyệt', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', icon: <CheckCircle2 size={11} /> },
  rejected: { label: 'Từ chối', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: <XCircle size={11} /> }
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtDate = (d: string | null | undefined) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const fmtDateTime = (d: string | null | undefined) => {
  if (!d) return '—';
  return new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const daysBetween = (start: string, end: string | null) => {
  if (!end) return 1;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return Math.max(1, Math.round((e - s) / 86400000) + 1);
};

// ─── Props ───────────────────────────────────────────────────────────────────

interface HRPanelProps {
  requests: HrLeaveRequestRow[];
  currentProfile: ProfileRow | null;
  currentUsername: string;
  onReload: () => void;
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: string }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '2px 8px', borderRadius: '6px',
      fontSize: '10px', fontWeight: 800,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
      textTransform: 'uppercase', letterSpacing: '0.04em'
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
};

// ─── Submit Modal ─────────────────────────────────────────────────────────────

interface SubmitModalProps {
  profile: ProfileRow;
  username: string;
  onClose: () => void;
  onSuccess: () => void;
}

const SubmitModal: React.FC<SubmitModalProps> = ({ profile, username, onClose, onSuccess }) => {
  const [type, setType] = useState<'nghi_phep' | 'di_tre'>('nghi_phep');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [session, setSession] = useState<'sang' | 'chieu' | 'ca_ngay'>('ca_ngay');
  const [lateTime, setLateTime] = useState('09:00');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!startDate) return setError('Vui lòng chọn ngày.');
    if (!reason.trim()) return setError('Vui lòng nhập lý do.');
    setLoading(true); setError('');
    const { error: err } = await apiService.submitHrLeaveRequest({
      requester_name: profile.full_name,
      requester_username: username,
      requester_id: profile.id || null,
      type,
      start_date: startDate,
      end_date: type === 'nghi_phep' ? (endDate || startDate) : null,
      late_time: type === 'di_tre' ? lateTime : null,
      session: type === 'nghi_phep' ? session : null,
      reason: reason.trim()
    });
    setLoading(false);
    if (err) return setError('Lỗi gửi yêu cầu: ' + err.message);
    onSuccess();
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '480px', boxShadow: '0 24px 64px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f1f5f9', background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)' }}>
          <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Nhân sự</p>
          <h2 style={{ margin: '4px 0 0', fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>Gửi yêu cầu</h2>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Type selector */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {(['nghi_phep', 'di_tre'] as const).map(t => (
              <button key={t} onClick={() => setType(t)} style={{
                padding: '12px', borderRadius: '12px', border: `2px solid ${type === t ? '#0284c7' : '#e2e8f0'}`,
                background: type === t ? '#eff6ff' : '#f8fafc', color: type === t ? '#0284c7' : '#64748b',
                fontWeight: 700, fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s'
              }}>
                {TYPE_LABEL[t]}
              </button>
            ))}
          </div>

          {/* Date(s) */}
          <div style={{ display: 'grid', gridTemplateColumns: type === 'nghi_phep' ? '1fr 1fr' : '1fr', gap: '12px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                {type === 'di_tre' ? 'Ngày đi trễ' : 'Ngày bắt đầu'}
              </span>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                style={{ padding: '9px 12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '13px', outline: 'none', background: '#f8fafc' }} />
            </label>
            {type === 'nghi_phep' && (
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Ngày kết thúc</span>
                <input type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)}
                  style={{ padding: '9px 12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '13px', outline: 'none', background: '#f8fafc' }} />
              </label>
            )}
          </div>

          {/* Session / Late time */}
          {type === 'nghi_phep' ? (
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Buổi nghỉ</span>
              <select value={session} onChange={e => setSession(e.target.value as any)}
                style={{ padding: '9px 12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '13px', outline: 'none', background: '#f8fafc' }}>
                <option value="ca_ngay">Cả ngày</option>
                <option value="sang">Buổi sáng</option>
                <option value="chieu">Buổi chiều</option>
              </select>
            </label>
          ) : (
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Giờ đến dự kiến</span>
              <input type="time" value={lateTime} onChange={e => setLateTime(e.target.value)}
                style={{ padding: '9px 12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '13px', outline: 'none', background: '#f8fafc' }} />
            </label>
          )}

          {/* Reason */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Lý do</span>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
              placeholder="Nhập lý do xin nghỉ phép hoặc đi trễ..."
              style={{ padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '13px', outline: 'none', resize: 'vertical', fontFamily: 'inherit', background: '#f8fafc' }} />
          </label>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: '#fef2f2', borderRadius: '10px', color: '#dc2626', fontSize: '13px' }}>
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
              Hủy
            </button>
            <button onClick={handleSubmit} disabled={loading}
              style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', background: '#0284c7', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', opacity: loading ? 0.7 : 1 }}>
              {loading ? <RefreshCw size={13} className="spin" /> : <FileCheck size={14} />}
              {loading ? 'Đang gửi...' : 'Gửi yêu cầu'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Master-Detail Components ──────────────────────────────────────────────────

interface RequestListItemProps {
  req: HrLeaveRequestRow;
  isSelected: boolean;
  onClick: () => void;
  isAdmin: boolean;
}

const RequestListItem: React.FC<RequestListItemProps> = ({ req, isSelected, onClick, isAdmin }) => {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '12px', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s',
        background: isSelected ? '#eff6ff' : '#fff',
        border: `1px solid ${isSelected ? '#bae6fd' : '#f1f5f9'}`,
        boxShadow: isSelected ? '0 2px 8px rgba(2,132,199,0.1)' : 'none',
        display: 'flex', gap: '12px', alignItems: 'flex-start'
      }}
    >
      <div style={{
        width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
        background: req.type === 'nghi_phep' ? '#e0f2fe' : '#ffedd5',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px'
      }}>
        {req.type === 'nghi_phep' ? '🏖️' : '⏰'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {isAdmin ? req.requester_name : (req.type === 'nghi_phep' ? 'Nghỉ phép' : 'Đi trễ')}
          </span>
          <StatusBadge status={req.status} />
        </div>
        <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <CalendarDays size={12} />
          {fmtDate(req.start_date)}
        </div>
        <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {req.reason}
        </p>
      </div>
    </div>
  );
};

// ─── Main Panel ───────────────────────────────────────────────────────────────

export const HRPanel: React.FC<HRPanelProps> = ({ requests, currentProfile, currentUsername, onReload }) => {
  const isAdmin = currentProfile?.role === 'admin';
  const isDirector = isAdmin || (currentProfile?.role === 'manager' && currentProfile?.department === 'Ban Giám Đốc');
  const isTPKD = isAdmin || (currentProfile?.role === 'manager' && currentProfile?.department !== 'Ban Giám Đốc');
  const hasPrivilege = isAdmin || isDirector || isTPKD;
  const [filter, setFilter] = useState<'all' | 'pending' | 'pending_director' | 'approved' | 'rejected'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'nghi_phep' | 'di_tre'>('all');
  const [searchQ, setSearchQ] = useState('');
  const [showSubmit, setShowSubmit] = useState(false);
  
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [processing, setProcessing] = useState(false);

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 760px)');
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  const [isReloading, setIsReloading] = useState(false);
  const handleReload = () => {
    setIsReloading(true);
    onReload();
    setTimeout(() => setIsReloading(false), 800);
  };
  const handleDelete = async (reqId: string) => {
    if (!confirm('Bạn có chắc muốn rút yêu cầu này không?')) return;
    await apiService.deleteHrLeaveRequest(reqId);
    if (selectedId === reqId) setSelectedId(null);
    onReload();
  };

  const handleReview = async (req: HrLeaveRequestRow, decision: 'pending_director' | 'approved' | 'rejected') => {
    if (!currentProfile) return;
    setProcessing(true);
    const { error } = await apiService.reviewHrLeaveRequest(req.id, decision, reviewNote, currentProfile.full_name);
    
    if (error) {
      alert('Có lỗi xảy ra khi thẩm định/phê duyệt: ' + (error.message || JSON.stringify(error)));
      setProcessing(false);
      return;
    }

    setProcessing(false);
    setReviewNote('');
    onReload();
  };

  const filtered = useMemo(() => {
    return requests.filter(r => {
      if (filter !== 'all' && r.status !== filter) return false;
      if (typeFilter !== 'all' && r.type !== typeFilter) return false;
      if (searchQ.trim()) {
        const q = searchQ.toLowerCase();
        return r.requester_name.toLowerCase().includes(q) || r.reason.toLowerCase().includes(q);
      }
      return true;
    });
  }, [requests, filter, typeFilter, searchQ]);

  const selectedReq = useMemo(() => filtered.find(r => r.id === selectedId) || null, [filtered, selectedId]);

  const FILTER_TABS = [
    { key: 'all', label: 'Tất cả', count: requests.length },
    { key: 'pending', label: 'Chờ TPKD', count: requests.filter(r => r.status === 'pending').length },
    { key: 'pending_director', label: 'Chờ GĐ', count: requests.filter(r => r.status === 'pending_director').length },
    { key: 'approved', label: 'Đã duyệt', count: requests.filter(r => r.status === 'approved').length },
    { key: 'rejected', label: 'Từ chối', count: requests.filter(r => r.status === 'rejected').length },
  ] as const;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── Split Layout ── */}
      <div style={{ display: 'flex', gap: isMobile ? 0 : '16px', flex: 1, minHeight: 0 }}>
        
        {/* LEFT PANE: List */}
        <div style={{
          width: isMobile ? '100%' : '380px', display: 'flex', flexDirection: 'column', gap: '12px',
          background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)', overflow: 'hidden'
        }}>
          {/* List Header / Filters */}
          <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            {/* Actions */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleReload} disabled={isReloading} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', background: isReloading ? '#e2e8f0' : '#f8fafc', color: '#475569', fontSize: '12px', fontWeight: 700, cursor: isReloading ? 'wait' : 'pointer', transition: 'all 0.2s', opacity: isReloading ? 0.7 : 1 }}>
                <RefreshCw size={14} className={isReloading ? "spin-animation" : ""} style={{ transform: isReloading ? 'rotate(180deg)' : 'none', transition: 'transform 0.5s ease-in-out' }} /> 
                {isReloading ? 'Đang tải...' : 'Làm mới'}
              </button>
              {!isAdmin && (
                <button onClick={() => setShowSubmit(true)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px 12px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #0284c7, #0ea5e9)', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(2,132,199,0.3)', transition: 'all 0.2s' }}>
                  <Plus size={14} /> Gửi yêu cầu
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '4px' }} className="custom-scrollbar">
              {FILTER_TABS.map(tab => (
                <button key={tab.key} onClick={() => setFilter(tab.key)} style={{
                  display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap',
                  padding: '6px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                  border: filter === tab.key ? '1px solid transparent' : '1px solid #e2e8f0',
                  background: filter === tab.key ? '#eff6ff' : '#fff',
                  color: filter === tab.key ? '#0284c7' : '#64748b'
                }}>
                  {tab.label}
                  <span style={{ background: filter === tab.key ? '#0284c7' : '#f1f5f9', color: filter === tab.key ? '#fff' : '#64748b', borderRadius: '99px', padding: '0 6px', fontSize: '10px' }}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as any)}
                style={{ flex: 1, padding: '8px 10px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: 600, background: '#f8fafc', color: '#475569', outline: 'none' }}>
                <option value="all">Tất cả loại</option>
                <option value="nghi_phep">🏖️ Nghỉ phép</option>
                <option value="di_tre">⏰ Đi trễ</option>
              </select>
              {hasPrivilege && (
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Tìm nhân viên..." style={{ width: '100%', padding: '8px 10px 8px 30px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '12px', background: '#f8fafc', outline: 'none' }} />
                </div>
              )}
            </div>
          </div>

          <div style={{ height: '1px', background: '#f1f5f9', margin: '0 16px' }} />

          {/* List Content */}
          <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filtered.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', color: '#94a3b8', gap: '10px' }}>
                <Info size={32} style={{ opacity: 0.3 }} />
                <p style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>Không tìm thấy yêu cầu</p>
              </div>
            ) : (
              filtered.map(req => (
                <RequestListItem
                  key={req.id}
                  req={req}
                  isAdmin={hasPrivilege}
                  isSelected={selectedId === req.id}
                  onClick={() => setSelectedId(req.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* RIGHT PANE: Detail */}
        {(!isMobile || selectedReq) && (
          <div 
            className={isMobile ? "slide-over-overlay" : ""} 
            onClick={() => isMobile && setSelectedId(null)}
          >
            <div 
              className={isMobile ? "slide-over-panel" : ""} 
              onClick={(e) => e.stopPropagation()}
              style={!isMobile ? {
                flex: 1, display: 'flex', flexDirection: 'column',
                background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0',
                boxShadow: '0 4px 20px rgba(0,0,0,0.03)', overflow: 'hidden'
              } : { display: 'flex', flexDirection: 'column', background: '#fff', height: '100%' }}
            >
              {isMobile && selectedReq && (
                <button 
                  onClick={() => setSelectedId(null)} 
                  style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 10, background: '#e2e8f0', border: 'none', borderRadius: '50%', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}
                >
                  <X size={20} />
                </button>
              )}
          {!selectedReq ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', gap: '16px' }}>
              <FileCheck size={64} style={{ opacity: 0.1 }} />
              <p style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Chọn một yêu cầu để xem chi tiết</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {/* Detail Header */}
              <div style={{ padding: '24px 30px', borderBottom: '1px solid #f1f5f9', background: '#fafafa', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 800, color: '#0284c7', background: '#e0f2fe', padding: '4px 10px', borderRadius: '8px', textTransform: 'uppercase' }}>
                      {selectedReq.type === 'nghi_phep' ? '🏖️ Nghỉ phép' : '⏰ Đi trễ'}
                    </div>
                    <StatusBadge status={selectedReq.status} />
                  </div>
                  <h3 style={{ margin: '0 0 6px', fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>{selectedReq.requester_name}</h3>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <User size={14} /> {selectedReq.requester_username}
                  </p>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
                  <div>
                    <p style={{ margin: '0 0 4px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Ngày tạo</p>
                    <p style={{ margin: 0, fontSize: '13px', color: '#334155', fontWeight: 600 }}>{fmtDateTime(selectedReq.created_at)}</p>
                  </div>
                  {(isAdmin || (selectedReq.requester_username === currentUsername && selectedReq.status === 'pending')) && (
                    <button onClick={() => handleDelete(selectedReq.id)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: '12px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>
                      <Trash2 size={14} /> {isAdmin ? 'Xoá yêu cầu' : 'Rút yêu cầu'}
                    </button>
                  )}
                </div>
              </div>

              {/* Detail Body */}
              <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '30px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* Info Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', background: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                  <div>
                    <p style={{ margin: '0 0 6px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Thời gian</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', fontWeight: 700, fontSize: '15px' }}>
                      <CalendarDays size={18} color="#0284c7" />
                      {fmtDate(selectedReq.start_date)}
                      {selectedReq.end_date && selectedReq.end_date !== selectedReq.start_date ? ` → ${fmtDate(selectedReq.end_date)}` : ''}
                    </div>
                  </div>
                  <div>
                    <p style={{ margin: '0 0 6px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Chi tiết</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', fontWeight: 700, fontSize: '15px' }}>
                      <Clock size={18} color="#0284c7" />
                      {selectedReq.type === 'nghi_phep' ? (
                        <>
                          {selectedReq.session ? SESSION_LABEL[selectedReq.session] : ''}
                          <span style={{ color: '#94a3b8', fontWeight: 500 }}>•</span>
                          {daysBetween(selectedReq.start_date, selectedReq.end_date)} ngày
                        </>
                      ) : (
                        `Dự kiến đến lúc ${selectedReq.late_time}`
                      )}
                    </div>
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <p style={{ margin: '0 0 10px', fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lý do chi tiết</p>
                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '16px 20px', borderRadius: '12px', fontSize: '14px', color: '#334155', lineHeight: 1.6 }}>
                    {selectedReq.reason}
                  </div>
                </div>

                {/* Admin Note / Review Actions */}
                {selectedReq.status === 'pending' || selectedReq.status === 'pending_director' ? (
                  ((isTPKD && selectedReq.status === 'pending') || (isDirector && (selectedReq.status === 'pending_director' || selectedReq.status === 'pending'))) && (
                    <div style={{ marginTop: 'auto', background: '#fdf4ff', border: '1px solid #e9d5ff', padding: '20px', borderRadius: '16px' }}>
                      <p style={{ margin: '0 0 10px', fontSize: '12px', fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FileCheck size={16} /> Khu vực phê duyệt
                      </p>
                      <textarea
                        value={reviewNote} onChange={e => setReviewNote(e.target.value)}
                        placeholder="Thêm ghi chú cho nhân viên (tuỳ chọn)..."
                        rows={2}
                        style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #d8b4fe', fontSize: '13px', outline: 'none', resize: 'vertical', fontFamily: 'inherit', background: '#fff', marginBottom: '16px' }}
                      />
                      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <button onClick={() => handleReview(selectedReq, 'rejected')} disabled={processing} style={{ padding: '12px 24px', borderRadius: '10px', border: 'none', background: '#fef2f2', color: '#dc2626', fontWeight: 800, fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s', opacity: processing ? 0.7 : 1 }}>
                          ❌ Từ chối
                        </button>
                        <button onClick={() => handleReview(selectedReq, (isTPKD && selectedReq.status === 'pending') ? 'pending_director' : 'approved')} disabled={processing} style={{ padding: '12px 32px', borderRadius: '10px', border: 'none', background: '#059669', color: '#fff', fontWeight: 800, fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s', opacity: processing ? 0.7 : 1, boxShadow: '0 4px 12px rgba(5,150,105,0.3)' }}>
                          ✅ {(isTPKD && selectedReq.status === 'pending') ? 'Thẩm định' : 'Phê duyệt'}
                        </button>
                      </div>
                    </div>
                  )
                ) : (
                  <div>
                    <p style={{ margin: '0 0 10px', fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Kết quả xử lý</p>
                    <div style={{ background: selectedReq.status === 'approved' ? '#ecfdf5' : '#fef2f2', border: `1px solid ${selectedReq.status === 'approved' ? '#a7f3d0' : '#fecaca'}`, padding: '16px 20px', borderRadius: '12px' }}>
                      <p style={{ margin: '0 0 4px', fontSize: '11px', fontWeight: 700, color: selectedReq.status === 'approved' ? '#059669' : '#dc2626', textTransform: 'uppercase' }}>
                        Bởi {selectedReq.reviewed_by} vào lúc {fmtDateTime(selectedReq.reviewed_at)}
                      </p>
                      <p style={{ margin: 0, fontSize: '14px', color: '#334155', fontWeight: 500 }}>
                        {selectedReq.reviewer_note || '(Không có ghi chú)'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {showSubmit && currentProfile && (
        <SubmitModal
          profile={currentProfile}
          username={currentUsername}
          onClose={() => setShowSubmit(false)}
          onSuccess={onReload}
        />
      )}
    </div>
  );
};
