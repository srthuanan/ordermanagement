import React, { useState, useMemo, useEffect } from 'react';
import {
  CalendarDays, Clock, CheckCircle2, XCircle, Clock3,
  Plus, Trash2, RefreshCw, User,
  FileText, AlertCircle, Search, Info, X, Users, CheckSquare, FileDigit
} from 'lucide-react';
import { HrLeaveRequestRow, ProfileRow } from '../types';
import * as apiService from '../services/apiService';

// ─── Constants ──────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<string, string> = {
  nghi_phep: 'Nghỉ phép',
  di_tre: 'Đi trễ'
};

const SESSION_LABEL: Record<string, string> = {
  sang: 'Buổi sáng',
  chieu: 'Buổi chiều',
  ca_ngay: 'Cả ngày'
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  pending: { label: 'Chờ thẩm định', color: '#b45309', bg: '#fffbeb', border: '#fde68a', icon: <Clock3 size={11} /> },
  pending_director: { label: 'Chờ GĐ duyệt', color: '#4338ca', bg: '#e0e7ff', border: '#c7d2fe', icon: <Clock3 size={11} /> },
  approved: { label: 'Đã duyệt', color: '#047857', bg: '#d1fae5', border: '#a7f3d0', icon: <CheckCircle2 size={11} /> },
  rejected: { label: 'Từ chối', color: '#b91c1c', bg: '#fee2e2', border: '#fecaca', icon: <XCircle size={11} /> }
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
  staffProfiles: ProfileRow[];
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: string }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '2px 8px', borderRadius: '4px',
      fontSize: '11px', fontWeight: 600,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`
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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(2px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', animation: 'fadeIn 0.2s ease-out' }}>
      <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '440px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', overflow: 'hidden', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)', border: '1px solid #e2e8f0' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', background: '#fff' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em' }}>Tạo yêu cầu mới</h2>
        </div>

        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {(['nghi_phep', 'di_tre'] as const).map(t => (
              <button key={t} onClick={() => setType(t)} style={{
                padding: '10px', borderRadius: '8px', border: `1px solid ${type === t ? '#0f172a' : '#e2e8f0'}`,
                background: type === t ? '#0f172a' : '#fff', color: type === t ? '#fff' : '#475569',
                fontWeight: 600, fontSize: '13px', cursor: 'pointer', transition: 'all 0.1s'
              }}>
                {TYPE_LABEL[t]}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: type === 'nghi_phep' ? '1fr 1fr' : '1fr', gap: '16px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                {type === 'di_tre' ? 'Ngày đi trễ' : 'Ngày bắt đầu'}
              </span>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#fff' }} />
            </label>
            {type === 'nghi_phep' && (
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Ngày kết thúc</span>
                <input type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)}
                  style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#fff' }} />
              </label>
            )}
          </div>

          {type === 'nghi_phep' ? (
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Buổi nghỉ</span>
              <select value={session} onChange={e => setSession(e.target.value as any)}
                style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#fff' }}>
                <option value="ca_ngay">Cả ngày</option>
                <option value="sang">Buổi sáng</option>
                <option value="chieu">Buổi chiều</option>
              </select>
            </label>
          ) : (
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Giờ đến dự kiến</span>
              <input type="time" value={lateTime} onChange={e => setLateTime(e.target.value)}
                style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#fff' }} />
            </label>
          )}

          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Lý do</span>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
              placeholder="Nhập lý do rõ ràng..."
              style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', resize: 'vertical', fontFamily: 'inherit', background: '#fff' }} />
          </label>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', fontSize: '13px', fontWeight: 500 }}>
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '4px' }}>
            <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
              Hủy bỏ
            </button>
            <button onClick={handleSubmit} disabled={loading}
              style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#0f172a', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', opacity: loading ? 0.7 : 1 }}>
              {loading ? <RefreshCw size={14} className="spin-animation" /> : null}
              {loading ? 'Đang gửi...' : 'Xác nhận'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main Panel ───────────────────────────────────────────────────────────────

export const HRPanel: React.FC<HRPanelProps> = ({ requests, currentProfile, currentUsername, staffProfiles, onReload }) => {
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

  const viewableRequests = useMemo(() => {
    if (isAdmin || isDirector) return requests;
    if (isTPKD) {
      const myDept = currentProfile?.department;
      return requests.filter(r => {
        if (r.requester_username === currentUsername) return true;
        const reqProfile = staffProfiles.find(p => p.id === r.requester_id || p.email === r.requester_username);
        return reqProfile?.department === myDept;
      });
    }
    return requests.filter(r => r.requester_username === currentUsername);
  }, [requests, isAdmin, isDirector, isTPKD, currentUsername, currentProfile, staffProfiles]);

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
    return viewableRequests.filter(r => {
      if (filter !== 'all' && r.status !== filter) return false;
      if (typeFilter !== 'all' && r.type !== typeFilter) return false;
      if (searchQ.trim()) {
        const q = searchQ.toLowerCase();
        return r.requester_name.toLowerCase().includes(q) || r.reason.toLowerCase().includes(q);
      }
      return true;
    });
  }, [viewableRequests, filter, typeFilter, searchQ]);

  const selectedReq = useMemo(() => filtered.find(r => r.id === selectedId) || null, [filtered, selectedId]);

  const STATS = [
    { label: 'Tổng Đơn', count: viewableRequests.length },
    { label: 'Chờ Xử Lý', count: viewableRequests.filter(r => r.status === 'pending' || r.status === 'pending_director').length },
    { label: 'Đã Duyệt', count: viewableRequests.filter(r => r.status === 'approved').length },
  ];

  const FILTER_TABS = [
    { key: 'all', label: 'Tất cả' },
    { key: 'pending', label: 'Chờ TPKD' },
    { key: 'pending_director', label: 'Chờ GĐ' },
    { key: 'approved', label: 'Đã duyệt' },
    { key: 'rejected', label: 'Từ chối' },
  ] as const;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, position: 'relative', background: '#fafafa' }}>
      
      {/* ── Component Styles ── */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .hr-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 16px;
        }
        .hr-card {
          background: #fff;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          padding: 16px;
          cursor: pointer;
          transition: all 0.15s ease;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .hr-card:hover {
          border-color: #cbd5e1;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
        }
        .hr-card.active {
          border-color: #0f172a;
          box-shadow: 0 0 0 1px #0f172a;
        }
        .slide-over-backdrop {
          position: fixed;
          inset: 0;
          z-index: 100;
          background: rgba(15, 23, 42, 0.2);
          backdrop-filter: blur(2px);
          display: flex;
          justify-content: flex-end;
          animation: fadeIn 0.15s ease-out forwards;
        }
        .slide-over-content {
          width: 100%;
          max-width: 480px;
          height: 100%;
          background: #fff;
          box-shadow: -4px 0 24px rgba(0,0,0,0.05);
          display: flex;
          flex-direction: column;
          animation: slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          border-left: 1px solid #e2e8f0;
        }
        .filter-btn {
          display: flex;
          align-items: center;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.1s;
          border: 1px solid transparent;
        }
        .filter-btn.active {
          background: #f1f5f9;
          color: #0f172a;
          font-weight: 600;
        }
        .filter-btn:not(.active) {
          color: #64748b;
        }
        .filter-btn:not(.active):hover {
          color: #0f172a;
        }
      `}</style>

      {/* ── Top Dashboard ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px 24px 0' }}>
        
        {/* Stats Row */}
        <div style={{ display: 'flex', gap: '24px', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
          {STATS.map(stat => (
            <div key={stat.label} style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>{stat.label}</span>
              <span style={{ fontSize: '24px', fontWeight: 600, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.2 }}>{stat.count}</span>
            </div>
          ))}
        </div>

        {/* Toolbar Row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '16px' }}>
          
          <div style={{ display: 'flex', gap: '4px', overflowX: 'auto' }} className="custom-scrollbar">
            {FILTER_TABS.map(tab => (
              <button key={tab.key} onClick={() => setFilter(tab.key)} className={`filter-btn ${filter === tab.key ? 'active' : ''}`}>
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as any)}
              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px', background: '#fff', color: '#0f172a', outline: 'none' }}>
              <option value="all">Tất cả loại</option>
              <option value="nghi_phep">Nghỉ phép</option>
              <option value="di_tre">Đi trễ</option>
            </select>
            
            {hasPrivilege && (
              <div style={{ position: 'relative', width: '200px' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Tìm nhân viên..." style={{ width: '100%', padding: '6px 10px 6px 30px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px', background: '#fff', outline: 'none', color: '#0f172a' }} />
              </div>
            )}

            <div style={{ width: '1px', height: '24px', background: '#e2e8f0', margin: '0 4px' }} />

            <button onClick={handleReload} disabled={isReloading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: isReloading ? 'wait' : 'pointer', transition: 'all 0.1s' }}>
              <RefreshCw size={14} className={isReloading ? "spin-animation" : ""} />
            </button>

            {!isAdmin && (
              <button onClick={() => setShowSubmit(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 16px', height: '32px', borderRadius: '6px', border: 'none', background: '#0f172a', color: '#fff', fontSize: '13px', fontWeight: 500, cursor: 'pointer', transition: 'background 0.1s' }}>
                <Plus size={14} /> Gửi yêu cầu
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Grid ── */}
      <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '0 24px 32px' }}>
        {filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', color: '#94a3b8', gap: '12px' }}>
            <FileText size={48} strokeWidth={1} style={{ opacity: 0.5 }} />
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 500 }}>Không tìm thấy yêu cầu</p>
          </div>
        ) : (
          <div className="hr-grid">
            {filtered.map(req => (
              <div key={req.id} className={`hr-card ${selectedId === req.id ? 'active' : ''}`} onClick={() => setSelectedId(req.id)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>{isAdmin || isTPKD ? req.requester_name : (req.type === 'nghi_phep' ? 'Đơn xin nghỉ phép' : 'Đơn xin đi trễ')}</h4>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>{TYPE_LABEL[req.type]} • {fmtDate(req.created_at)}</span>
                  </div>
                </div>

                <div style={{ flex: 1, color: '#334155', fontSize: '13px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.5 }}>
                  {req.reason}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                  <StatusBadge status={req.status} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '12px' }}>
                    <CalendarDays size={12} />
                    {fmtDate(req.start_date)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Slide-Over Detail Panel ── */}
      {selectedReq && (
        <div className="slide-over-backdrop" onClick={() => setSelectedId(null)}>
          <div className="slide-over-content" onClick={e => e.stopPropagation()}>
            
            {/* Header */}
            <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                    {TYPE_LABEL[selectedReq.type]}
                  </span>
                  <span style={{ color: '#cbd5e1' }}>•</span>
                  <StatusBadge status={selectedReq.status} />
                </div>
                <h2 style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: 600, color: '#0f172a', letterSpacing: '-0.01em' }}>{selectedReq.requester_name}</h2>
                <div style={{ color: '#64748b', fontSize: '13px' }}>
                  {selectedReq.requester_username}
                </div>
              </div>
              <button onClick={() => setSelectedId(null)} style={{ background: 'transparent', border: 'none', padding: '4px', color: '#94a3b8', cursor: 'pointer', borderRadius: '4px' }}>
                <X size={20} />
              </button>
            </div>

            {/* Content Scrollable */}
            <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Info Block */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                {selectedReq.type === 'nghi_phep' ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px', fontSize: '13px' }}>
                      <span style={{ color: '#64748b' }}>Ngày xin nghỉ:</span>
                      <span style={{ color: '#0f172a', fontWeight: 600 }}>
                        {fmtDate(selectedReq.start_date)}
                        {selectedReq.end_date && selectedReq.end_date !== selectedReq.start_date ? ` → ${fmtDate(selectedReq.end_date)}` : ''}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px', fontSize: '13px' }}>
                      <span style={{ color: '#64748b' }}>Ca nghỉ:</span>
                      <span style={{ color: '#0f172a', fontWeight: 600 }}>
                        {selectedReq.session ? SESSION_LABEL[selectedReq.session] : 'Cả ngày'} 
                        <span style={{ color: '#94a3b8', margin: '0 6px', fontWeight: 400 }}>•</span>
                        Tổng cộng: {daysBetween(selectedReq.start_date, selectedReq.end_date)} ngày
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px', fontSize: '13px' }}>
                      <span style={{ color: '#64748b' }}>Ngày xin đi trễ:</span>
                      <span style={{ color: '#0f172a', fontWeight: 600 }}>
                        {fmtDate(selectedReq.start_date)}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px', fontSize: '13px' }}>
                      <span style={{ color: '#64748b' }}>Giờ đến công ty:</span>
                      <span style={{ color: '#b45309', fontWeight: 700 }}>
                        {selectedReq.late_time}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Reason */}
              <div>
                <p style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>Lý do</p>
                <div style={{ fontSize: '14px', color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {selectedReq.reason}
                </div>
              </div>

              {/* Review / Result Section */}
              {(() => {
                const isOwnRequest = selectedReq.requester_username === currentUsername;
                const canThamdinh = isTPKD && !isDirector && !isOwnRequest && selectedReq.status === 'pending';
                const canPheduyet = isDirector && !isOwnRequest && (selectedReq.status === 'pending' || selectedReq.status === 'pending_director');
                const showReviewArea = canThamdinh || canPheduyet;

                if (showReviewArea) {
                  return (
                    <div style={{ marginTop: 'auto', borderTop: '1px solid #e2e8f0', paddingTop: '24px' }}>
                      <p style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>Phê duyệt</p>
                      <textarea
                        value={reviewNote} onChange={e => setReviewNote(e.target.value)}
                        placeholder="Ghi chú thêm (tuỳ chọn)..."
                        rows={3}
                        style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', resize: 'vertical', fontFamily: 'inherit', marginBottom: '16px' }}
                      />
                      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <button onClick={() => handleReview(selectedReq, 'rejected')} disabled={processing} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff', color: '#b91c1c', fontWeight: 500, fontSize: '13px', cursor: 'pointer' }}>
                          Từ chối
                        </button>
                        <button onClick={() => handleReview(selectedReq, canPheduyet ? 'approved' : 'pending_director')} disabled={processing} style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#0f172a', color: '#fff', fontWeight: 500, fontSize: '13px', cursor: 'pointer' }}>
                          {canPheduyet ? 'Phê duyệt' : 'Thẩm định'}
                        </button>
                      </div>
                    </div>
                  );
                }

                if (selectedReq.status === 'approved' || selectedReq.status === 'rejected') {
                  return (
                    <div style={{ marginTop: 'auto', borderTop: '1px solid #e2e8f0', paddingTop: '24px' }}>
                      <p style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>Kết quả</p>
                      <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#475569' }}>
                          Được {selectedReq.status === 'approved' ? 'duyệt' : 'từ chối'} bởi <strong>{selectedReq.reviewed_by}</strong> lúc {fmtDateTime(selectedReq.reviewed_at)}
                        </p>
                        <p style={{ margin: 0, fontSize: '13px', color: '#0f172a' }}>
                          {selectedReq.reviewer_note || 'Không có ghi chú.'}
                        </p>
                      </div>
                    </div>
                  );
                }

                if (selectedReq.status === 'pending' || selectedReq.status === 'pending_director') {
                  return (
                    <div style={{ marginTop: 'auto', borderTop: '1px solid #e2e8f0', paddingTop: '24px' }}>
                      <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontStyle: 'italic' }}>
                        {isOwnRequest ? 'Đơn đang chờ cấp trên xử lý.' : 'Đơn đang trong quá trình xử lý.'}
                      </p>
                    </div>
                  );
                }

                return null;
              })()}
            </div>

            {/* Footer Actions */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                Tạo lúc: {fmtDateTime(selectedReq.created_at)}
              </div>
              {(isAdmin || (selectedReq.requester_username === currentUsername && selectedReq.status === 'pending')) && (
                <button onClick={() => handleDelete(selectedReq.id)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '6px', border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}>
                  <Trash2 size={14} /> {isAdmin ? 'Xoá yêu cầu' : 'Rút yêu cầu'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

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
