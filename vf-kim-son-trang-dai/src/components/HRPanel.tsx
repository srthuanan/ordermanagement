import React, { useState, useMemo, useEffect } from 'react';
import {
  CalendarDays, Clock, CheckCircle2, XCircle, Clock3,
  Plus, ChevronDown, Trash2, RefreshCw, User,
  FileCheck, AlertCircle, Filter, Search, Info, X, Users, CheckSquare
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
  pending: { label: 'Chờ thẩm định', color: '#d97706', bg: '#fffbeb', border: '#fde68a', icon: <Clock3 size={12} /> },
  pending_director: { label: 'Chờ GĐ duyệt', color: '#6d28d9', bg: '#f5f3ff', border: '#ddd6fe', icon: <Clock3 size={12} /> },
  approved: { label: 'Đã duyệt', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', icon: <CheckCircle2 size={12} /> },
  rejected: { label: 'Từ chối', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: <XCircle size={12} /> }
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
      padding: '4px 10px', borderRadius: '8px',
      fontSize: '11px', fontWeight: 800,
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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', animation: 'fadeIn 0.2s ease-out' }}>
      <div style={{ background: '#fff', borderRadius: '24px', width: '100%', maxWidth: '480px', boxShadow: '0 24px 64px rgba(0,0,0,0.2)', overflow: 'hidden', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
        <div style={{ padding: '24px 30px', borderBottom: '1px solid #f1f5f9', background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)' }}>
          <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Nhân sự</p>
          <h2 style={{ margin: '4px 0 0', fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>Gửi yêu cầu mới</h2>
        </div>

        <div style={{ padding: '24px 30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {(['nghi_phep', 'di_tre'] as const).map(t => (
              <button key={t} onClick={() => setType(t)} style={{
                padding: '14px', borderRadius: '16px', border: `2px solid ${type === t ? '#0284c7' : '#e2e8f0'}`,
                background: type === t ? '#eff6ff' : '#f8fafc', color: type === t ? '#0284c7' : '#64748b',
                fontWeight: 700, fontSize: '14px', cursor: 'pointer', transition: 'all 0.15s'
              }}>
                {TYPE_LABEL[t]}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: type === 'nghi_phep' ? '1fr 1fr' : '1fr', gap: '16px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                {type === 'di_tre' ? 'Ngày đi trễ' : 'Ngày bắt đầu'}
              </span>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                style={{ padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px', outline: 'none', background: '#f8fafc' }} />
            </label>
            {type === 'nghi_phep' && (
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Ngày kết thúc</span>
                <input type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)}
                  style={{ padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px', outline: 'none', background: '#f8fafc' }} />
              </label>
            )}
          </div>

          {type === 'nghi_phep' ? (
            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Buổi nghỉ</span>
              <select value={session} onChange={e => setSession(e.target.value as any)}
                style={{ padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px', outline: 'none', background: '#f8fafc' }}>
                <option value="ca_ngay">Cả ngày</option>
                <option value="sang">Buổi sáng</option>
                <option value="chieu">Buổi chiều</option>
              </select>
            </label>
          ) : (
            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Giờ đến dự kiến</span>
              <input type="time" value={lateTime} onChange={e => setLateTime(e.target.value)}
                style={{ padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px', outline: 'none', background: '#f8fafc' }} />
            </label>
          )}

          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Lý do</span>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
              placeholder="Nhập chi tiết lý do..."
              style={{ padding: '14px 16px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px', outline: 'none', resize: 'vertical', fontFamily: 'inherit', background: '#f8fafc' }} />
          </label>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: '#fef2f2', borderRadius: '12px', color: '#dc2626', fontSize: '13px', fontWeight: 500 }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button onClick={onClose} style={{ padding: '12px 24px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
              Hủy
            </button>
            <button onClick={handleSubmit} disabled={loading}
              style={{ padding: '12px 28px', borderRadius: '12px', border: 'none', background: '#0284c7', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', opacity: loading ? 0.7 : 1, boxShadow: '0 4px 12px rgba(2,132,199,0.3)' }}>
              {loading ? <RefreshCw size={16} className="spin-animation" /> : <FileCheck size={16} />}
              {loading ? 'Đang gửi...' : 'Gửi yêu cầu'}
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
    { label: 'Tổng số đơn', count: viewableRequests.length, color: '#0284c7', bg: '#f0f9ff', icon: <FileCheck size={20} /> },
    { label: 'Chờ xử lý', count: viewableRequests.filter(r => r.status === 'pending' || r.status === 'pending_director').length, color: '#d97706', bg: '#fffbeb', icon: <Clock size={20} /> },
    { label: 'Đã duyệt', count: viewableRequests.filter(r => r.status === 'approved').length, color: '#059669', bg: '#ecfdf5', icon: <CheckSquare size={20} /> },
  ];

  const FILTER_TABS = [
    { key: 'all', label: 'Tất cả' },
    { key: 'pending', label: 'Chờ TPKD' },
    { key: 'pending_director', label: 'Chờ GĐ' },
    { key: 'approved', label: 'Đã duyệt' },
    { key: 'rejected', label: 'Từ chối' },
  ] as const;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, position: 'relative' }}>
      
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
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .hr-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
        }
        .hr-card {
          background: #fff;
          border-radius: 20px;
          border: 1px solid #e2e8f0;
          padding: 24px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 4px 12px rgba(0,0,0,0.02);
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .hr-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 32px rgba(0,0,0,0.08);
          border-color: #cbd5e1;
        }
        .hr-card.active {
          border-color: #0284c7;
          box-shadow: 0 0 0 4px rgba(2, 132, 199, 0.1);
        }
        .slide-over-backdrop {
          position: fixed;
          inset: 0;
          z-index: 100;
          background: rgba(15, 23, 42, 0.3);
          backdrop-filter: blur(8px);
          display: flex;
          justify-content: flex-end;
          animation: fadeIn 0.2s ease-out forwards;
        }
        .slide-over-content {
          width: 100%;
          max-width: 540px;
          height: 100%;
          background: #fff;
          box-shadow: -12px 0 48px rgba(0,0,0,0.15);
          display: flex;
          flex-direction: column;
          animation: slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* ── Top Dashboard ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '0 0 24px' }}>
        
        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          {STATS.map(stat => (
            <div key={stat.label} style={{ background: '#fff', borderRadius: '20px', padding: '20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: stat.bg, color: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {stat.icon}
              </div>
              <div>
                <p style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</p>
                <h3 style={{ margin: 0, fontSize: '28px', fontWeight: 900, color: '#0f172a' }}>{stat.count}</h3>
              </div>
            </div>
          ))}
        </div>

        {/* Toolbar Row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between', background: '#fff', padding: '16px 20px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }} className="custom-scrollbar">
            {FILTER_TABS.map(tab => (
              <button key={tab.key} onClick={() => setFilter(tab.key)} style={{
                display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap',
                padding: '10px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                border: filter === tab.key ? '1px solid transparent' : '1px solid #e2e8f0',
                background: filter === tab.key ? '#eff6ff' : '#f8fafc',
                color: filter === tab.key ? '#0284c7' : '#64748b'
              }}>
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end' }}>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as any)}
              style={{ minWidth: '160px', padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px', fontWeight: 600, background: '#f8fafc', color: '#475569', outline: 'none' }}>
              <option value="all">Tất cả loại đơn</option>
              <option value="nghi_phep">🏖️ Nghỉ phép</option>
              <option value="di_tre">⏰ Đi trễ</option>
            </select>
            
            {hasPrivilege && (
              <div style={{ position: 'relative', width: '220px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Tìm nhân viên..." style={{ width: '100%', padding: '10px 14px 10px 36px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px', background: '#f8fafc', outline: 'none', fontWeight: 500 }} />
              </div>
            )}

            <button onClick={handleReload} disabled={isReloading} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: isReloading ? '#e2e8f0' : '#fff', color: '#475569', fontSize: '13px', fontWeight: 700, cursor: isReloading ? 'wait' : 'pointer', transition: 'all 0.2s' }}>
              <RefreshCw size={16} className={isReloading ? "spin-animation" : ""} style={{ transform: isReloading ? 'rotate(180deg)' : 'none', transition: 'transform 0.5s ease-in-out' }} /> 
              <span className={isMobile ? "mobile-only" : ""}>Làm mới</span>
            </button>

            {!isAdmin && (
              <button onClick={() => setShowSubmit(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #0284c7, #0ea5e9)', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(2,132,199,0.3)', transition: 'all 0.2s' }}>
                <Plus size={16} /> Gửi yêu cầu mới
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Grid ── */}
      <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', paddingBottom: '32px' }}>
        {filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', color: '#94a3b8', gap: '16px' }}>
            <FileCheck size={64} style={{ opacity: 0.2 }} />
            <p style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Không tìm thấy yêu cầu nào phù hợp</p>
          </div>
        ) : (
          <div className="hr-grid">
            {filtered.map(req => (
              <div key={req.id} className={`hr-card ${selectedId === req.id ? 'active' : ''}`} onClick={() => setSelectedId(req.id)}>
                
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: req.type === 'nghi_phep' ? '#e0f2fe' : '#ffedd5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                      {req.type === 'nghi_phep' ? '🏖️' : '⏰'}
                    </div>
                    <div>
                      <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>{isAdmin || isTPKD ? req.requester_name : (req.type === 'nghi_phep' ? 'Đơn Nghỉ Phép' : 'Đơn Đi Trễ')}</h4>
                      <p style={{ margin: 0, fontSize: '12px', color: '#64748b', fontWeight: 500 }}>{fmtDate(req.created_at)}</p>
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#334155', fontSize: '13px', fontWeight: 600 }}>
                    <CalendarDays size={14} color="#0284c7" />
                    {fmtDate(req.start_date)}
                    {req.end_date && req.end_date !== req.start_date ? ` → ${fmtDate(req.end_date)}` : ''}
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {req.reason}
                  </p>
                </div>

                {/* Footer */}
                <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <StatusBadge status={req.status} />
                  {req.reviewed_by && (
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Duyệt bởi: {req.reviewed_by.split(' ').pop()}</span>
                  )}
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
            <div style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9', background: 'linear-gradient(to bottom, #f8fafc, #fff)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#0284c7', background: '#e0f2fe', padding: '6px 12px', borderRadius: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {selectedReq.type === 'nghi_phep' ? '🏖️ Nghỉ phép' : '⏰ Đi trễ'}
                  </span>
                  <StatusBadge status={selectedReq.status} />
                </div>
                <h2 style={{ margin: '0 0 8px', fontSize: '28px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>{selectedReq.requester_name}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: '#64748b', fontSize: '14px', fontWeight: 500 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><User size={16} /> {selectedReq.requester_username}</span>
                </div>
              </div>
              <button onClick={() => setSelectedId(null)} style={{ background: '#f1f5f9', border: 'none', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', cursor: 'pointer', transition: 'all 0.2s' }}>
                <X size={20} />
              </button>
            </div>

            {/* Content Scrollable */}
            <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '32px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
              
              {/* Info Block */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', background: '#f8fafc', padding: '24px', borderRadius: '20px', border: '1px solid #f1f5f9' }}>
                <div>
                  <p style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Thời gian</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#0f172a', fontWeight: 800, fontSize: '16px' }}>
                    <CalendarDays size={20} color="#0284c7" />
                    {fmtDate(selectedReq.start_date)}
                    {selectedReq.end_date && selectedReq.end_date !== selectedReq.start_date ? ` → ${fmtDate(selectedReq.end_date)}` : ''}
                  </div>
                </div>
                <div>
                  <p style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Chi tiết</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#0f172a', fontWeight: 800, fontSize: '16px' }}>
                    <Clock size={20} color="#0284c7" />
                    {selectedReq.type === 'nghi_phep' ? (
                      <>
                        {selectedReq.session ? SESSION_LABEL[selectedReq.session] : ''}
                        <span style={{ color: '#cbd5e1' }}>|</span>
                        {daysBetween(selectedReq.start_date, selectedReq.end_date)} ngày
                      </>
                    ) : (
                      `Đến lúc ${selectedReq.late_time}`
                    )}
                  </div>
                </div>
              </div>

              {/* Reason */}
              <div>
                <p style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lý do chi tiết</p>
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '20px 24px', borderRadius: '16px', fontSize: '15px', color: '#334155', lineHeight: 1.7, boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
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
                    <div style={{ marginTop: 'auto', background: 'linear-gradient(135deg, #fdf4ff, #faf5ff)', border: '1px solid #e9d5ff', padding: '24px', borderRadius: '20px', boxShadow: '0 8px 24px rgba(168, 85, 247, 0.08)' }}>
                      <p style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileCheck size={18} /> Phê duyệt yêu cầu
                      </p>
                      <textarea
                        value={reviewNote} onChange={e => setReviewNote(e.target.value)}
                        placeholder="Thêm ghi chú cho nhân viên (tuỳ chọn)..."
                        rows={3}
                        style={{ width: '100%', padding: '16px 20px', borderRadius: '12px', border: '1px solid #d8b4fe', fontSize: '14px', outline: 'none', resize: 'vertical', fontFamily: 'inherit', background: '#fff', marginBottom: '20px', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}
                      />
                      <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
                        <button onClick={() => handleReview(selectedReq, 'rejected')} disabled={processing} style={{ padding: '14px 28px', borderRadius: '12px', border: 'none', background: '#fef2f2', color: '#dc2626', fontWeight: 800, fontSize: '15px', cursor: 'pointer', transition: 'all 0.2s', opacity: processing ? 0.7 : 1 }}>
                          ❌ Từ chối
                        </button>
                        <button onClick={() => handleReview(selectedReq, canPheduyet ? 'approved' : 'pending_director')} disabled={processing} style={{ padding: '14px 36px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #059669, #10b981)', color: '#fff', fontWeight: 800, fontSize: '15px', cursor: 'pointer', transition: 'all 0.2s', opacity: processing ? 0.7 : 1, boxShadow: '0 8px 16px rgba(5,150,105,0.25)' }}>
                          ✅ {canPheduyet ? 'Phê duyệt' : 'Thẩm định'}
                        </button>
                      </div>
                    </div>
                  );
                }

                if (selectedReq.status === 'approved' || selectedReq.status === 'rejected') {
                  return (
                    <div style={{ marginTop: 'auto' }}>
                      <p style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Kết quả xử lý</p>
                      <div style={{ background: selectedReq.status === 'approved' ? '#f0fdf4' : '#fef2f2', border: `1px solid ${selectedReq.status === 'approved' ? '#86efac' : '#fecaca'}`, padding: '20px 24px', borderRadius: '16px' }}>
                        <p style={{ margin: '0 0 6px', fontSize: '12px', fontWeight: 800, color: selectedReq.status === 'approved' ? '#059669' : '#dc2626', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Bởi {selectedReq.reviewed_by} vào lúc {fmtDateTime(selectedReq.reviewed_at)}
                        </p>
                        <p style={{ margin: 0, fontSize: '15px', color: '#1e293b', fontWeight: 500, lineHeight: 1.6 }}>
                          {selectedReq.reviewer_note || '(Không có ghi chú bổ sung)'}
                        </p>
                      </div>
                    </div>
                  );
                }

                if (selectedReq.status === 'pending' || selectedReq.status === 'pending_director') {
                  return (
                    <div style={{ marginTop: 'auto', padding: '24px', borderRadius: '16px', background: '#f8fafc', border: '2px dashed #cbd5e1', textAlign: 'center' }}>
                      <Clock3 size={32} color="#94a3b8" style={{ marginBottom: '12px', opacity: 0.5 }} />
                      <p style={{ margin: 0, fontSize: '14px', color: '#64748b', fontWeight: 600 }}>
                        {isOwnRequest ? 'Đơn của bạn đang chờ cấp trên phê duyệt.' : 'Đơn đang trong quá trình xử lý.'}
                      </p>
                    </div>
                  );
                }

                return null;
              })()}
            </div>

            {/* Footer Actions */}
            <div style={{ padding: '20px 32px', borderTop: '1px solid #f1f5f9', background: '#fafafa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
                Ngày tạo: <strong style={{ color: '#334155' }}>{fmtDateTime(selectedReq.created_at)}</strong>
              </div>
              {(isAdmin || (selectedReq.requester_username === currentUsername && selectedReq.status === 'pending')) && (
                <button onClick={() => handleDelete(selectedReq.id)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px', border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: '13px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>
                  <Trash2 size={16} /> {isAdmin ? 'Xoá yêu cầu' : 'Rút yêu cầu'}
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
