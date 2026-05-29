import React, { useState, useMemo } from 'react';
import {
  CalendarDays, Clock, CheckCircle2, XCircle, Clock3,
  Plus, ChevronDown, Trash2, RefreshCw, User,
  FileCheck, AlertCircle, Filter, Search, Info
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
  pending: { label: 'Chờ duyệt', color: '#d97706', bg: '#fffbeb', border: '#fde68a', icon: <Clock3 size={11} /> },
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

// ─── Review Modal ─────────────────────────────────────────────────────────────

interface ReviewModalProps {
  request: HrLeaveRequestRow;
  reviewerName: string;
  onClose: () => void;
  onSuccess: () => void;
}

const ReviewModal: React.FC<ReviewModalProps> = ({ request, reviewerName, onClose, onSuccess }) => {
  const [decision, setDecision] = useState<'approved' | 'rejected'>('approved');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    await apiService.reviewHrLeaveRequest(request.id, decision, note, reviewerName);
    // Notify the requester via interactions table
    try {
      const { supabase } = await import('../services/supabaseClient');
      if (supabase) {
        await supabase.from('interactions').insert({
          category: 'NOTIFICATION',
          type: decision === 'approved' ? 'success' : 'warning',
          recipient: request.requester_username,
          message: decision === 'approved'
            ? `✅ Yêu cầu ${TYPE_LABEL[request.type]} của bạn đã được ${reviewerName} phê duyệt.${note ? ' Ghi chú: ' + note : ''}`
            : `❌ Yêu cầu ${TYPE_LABEL[request.type]} của bạn bị ${reviewerName} từ chối.${note ? ' Lý do: ' + note : ''}`,
          actor_name: reviewerName,
          target_view: 'hr',
          target_id: request.id
        });
      }
    } catch (_) {}
    setLoading(false);
    onSuccess();
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '440px', boxShadow: '0 24px 64px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f1f5f9', background: 'linear-gradient(135deg, #fdf4ff, #ede9fe)' }}>
          <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Phê duyệt</p>
          <h2 style={{ margin: '4px 0 0', fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>Xử lý yêu cầu</h2>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>
            <strong>{request.requester_name}</strong> — {TYPE_LABEL[request.type]} — {fmtDate(request.start_date)}
          </p>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {(['approved', 'rejected'] as const).map(d => (
              <button key={d} onClick={() => setDecision(d)} style={{
                padding: '12px', borderRadius: '12px',
                border: `2px solid ${decision === d ? (d === 'approved' ? '#059669' : '#dc2626') : '#e2e8f0'}`,
                background: decision === d ? (d === 'approved' ? '#ecfdf5' : '#fef2f2') : '#f8fafc',
                color: decision === d ? (d === 'approved' ? '#059669' : '#dc2626') : '#64748b',
                fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
              }}>
                {d === 'approved' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                {d === 'approved' ? 'Phê duyệt' : 'Từ chối'}
              </button>
            ))}
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Ghi chú (tuỳ chọn)</span>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
              placeholder="Thêm ghi chú cho nhân viên..."
              style={{ padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '13px', outline: 'none', resize: 'vertical', fontFamily: 'inherit', background: '#f8fafc' }} />
          </label>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
              Hủy
            </button>
            <button onClick={handleSubmit} disabled={loading}
              style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', background: decision === 'approved' ? '#059669' : '#dc2626', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', opacity: loading ? 0.7 : 1 }}>
              {loading ? <RefreshCw size={13} className="spin" /> : <FileCheck size={14} />}
              {loading ? 'Đang xử lý...' : 'Xác nhận'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── RequestCard ──────────────────────────────────────────────────────────────

interface RequestCardProps {
  req: HrLeaveRequestRow;
  isAdmin: boolean;
  onReview: (req: HrLeaveRequestRow) => void;
  onDelete: (req: HrLeaveRequestRow) => void;
}

const RequestCard: React.FC<RequestCardProps> = ({ req, isAdmin, onReview, onDelete }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      background: '#fff', borderRadius: '14px',
      border: `1px solid ${req.status === 'pending' ? '#fde68a' : req.status === 'approved' ? '#a7f3d0' : '#fecaca'}`,
      overflow: 'hidden', transition: 'box-shadow 0.2s',
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)'
    }}>
      {/* Card header */}
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
        onClick={() => setExpanded(p => !p)}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
          background: req.type === 'nghi_phep' ? '#eff6ff' : '#fff7ed',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '18px'
        }}>
          {req.type === 'nghi_phep' ? '🏖️' : '⏰'}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
              {req.type === 'nghi_phep' ? 'Nghỉ phép' : 'Đi trễ'}
            </span>
            <StatusBadge status={req.status} />
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {isAdmin && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><User size={11} /> {req.requester_name}</span>
            )}
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <CalendarDays size={11} />
              {fmtDate(req.start_date)}
              {req.end_date && req.end_date !== req.start_date ? ` → ${fmtDate(req.end_date)}` : ''}
              {req.type === 'nghi_phep' && req.session ? ` (${SESSION_LABEL[req.session]})` : ''}
              {req.type === 'di_tre' && req.late_time ? ` — đến lúc ${req.late_time}` : ''}
            </span>
            {req.type === 'nghi_phep' && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <Clock size={11} /> {daysBetween(req.start_date, req.end_date)} ngày
              </span>
            )}
          </div>
        </div>

        <ChevronDown size={16} style={{ color: '#94a3b8', transform: expanded ? 'rotate(180deg)' : 'none', transition: '0.2s', flexShrink: 0 }} />
      </div>

      {/* Expanded body */}
      {expanded && (
        <div style={{ padding: '0 16px 14px', borderTop: '1px solid #f1f5f9', background: '#fafafa' }}>
          <div style={{ paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>
              <p style={{ margin: '0 0 3px', fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Lý do</p>
              <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: 1.5 }}>{req.reason}</p>
            </div>

            {req.reviewer_note && (
              <div style={{ padding: '10px 12px', borderRadius: '10px', background: req.status === 'approved' ? '#ecfdf5' : '#fef2f2', border: `1px solid ${req.status === 'approved' ? '#a7f3d0' : '#fecaca'}` }}>
                <p style={{ margin: '0 0 2px', fontSize: '10px', fontWeight: 700, color: req.status === 'approved' ? '#059669' : '#dc2626', textTransform: 'uppercase' }}>
                  Ghi chú từ Admin
                </p>
                <p style={{ margin: 0, fontSize: '12px', color: '#334155' }}>{req.reviewer_note}</p>
              </div>
            )}

            {req.reviewed_at && (
              <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>
                Xử lý lúc: {fmtDateTime(req.reviewed_at)} {req.reviewed_by ? `bởi ${req.reviewed_by}` : ''}
              </p>
            )}

            {!req.reviewed_at && (
              <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>
                Gửi lúc: {fmtDateTime(req.created_at)}
              </p>
            )}

            <div style={{ display: 'flex', gap: '8px', marginTop: '4px', justifyContent: 'flex-end' }}>
              {req.status === 'pending' && !isAdmin && (
                <button onClick={() => onDelete(req)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '8px', border: '1px solid #fecaca', background: '#fff', color: '#dc2626', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                  <Trash2 size={12} /> Rút yêu cầu
                </button>
              )}
              {isAdmin && req.status === 'pending' && (
                <button onClick={() => onReview(req)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 14px', borderRadius: '8px', border: 'none', background: '#7c3aed', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                  <FileCheck size={12} /> Xử lý
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Panel ───────────────────────────────────────────────────────────────

export const HRPanel: React.FC<HRPanelProps> = ({ requests, currentProfile, currentUsername, onReload }) => {
  const isAdmin = currentProfile?.role === 'admin';
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'nghi_phep' | 'di_tre'>('all');
  const [searchQ, setSearchQ] = useState('');
  const [showSubmit, setShowSubmit] = useState(false);
  const [reviewing, setReviewing] = useState<HrLeaveRequestRow | null>(null);

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  const handleDelete = async (req: HrLeaveRequestRow) => {
    if (!confirm('Bạn có chắc muốn rút yêu cầu này không?')) return;
    await apiService.deleteHrLeaveRequest(req.id);
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

  const FILTER_TABS = [
    { key: 'all', label: 'Tất cả', count: requests.length },
    { key: 'pending', label: 'Chờ duyệt', count: requests.filter(r => r.status === 'pending').length },
    { key: 'approved', label: 'Đã duyệt', count: requests.filter(r => r.status === 'approved').length },
    { key: 'rejected', label: 'Từ chối', count: requests.filter(r => r.status === 'rejected').length },
  ] as const;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>

      {/* ── Top bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px',
        padding: '12px 16px', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #0284c7, #0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CalendarDays size={18} color="#fff" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>Quản lý Nhân sự</h2>
            <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>Nghỉ phép · Đi trễ · Phê duyệt</p>
          </div>
          {isAdmin && pendingCount > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '999px', background: '#fef3c7', color: '#d97706', fontSize: '11px', fontWeight: 800, border: '1px solid #fde68a' }}>
              <Clock3 size={11} /> {pendingCount} chờ duyệt
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={onReload} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
            <RefreshCw size={13} /> Làm mới
          </button>
          {!isAdmin && (
            <button onClick={() => setShowSubmit(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #0284c7, #0ea5e9)', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(2,132,199,0.3)' }}>
              <Plus size={14} /> Gửi yêu cầu
            </button>
          )}
        </div>
      </div>

      {/* ── Stats row (Admin only) ── */}
      {isAdmin && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
          {[
            { label: 'Tổng yêu cầu', value: requests.length, color: '#0284c7', bg: '#eff6ff' },
            { label: 'Chờ duyệt', value: requests.filter(r => r.status === 'pending').length, color: '#d97706', bg: '#fffbeb' },
            { label: 'Đã duyệt', value: requests.filter(r => r.status === 'approved').length, color: '#059669', bg: '#ecfdf5' },
            { label: 'Từ chối', value: requests.filter(r => r.status === 'rejected').length, color: '#dc2626', bg: '#fef2f2' },
          ].map(stat => (
            <div key={stat.label} style={{ background: stat.bg, borderRadius: '12px', padding: '12px 16px', border: `1px solid ${stat.color}20` }}>
              <p style={{ margin: '0 0 2px', fontSize: '10px', fontWeight: 700, color: stat.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</p>
              <p style={{ margin: 0, fontSize: '22px', fontWeight: 900, color: stat.color }}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Filters ── */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', padding: '10px 14px', background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
        {/* Status tabs */}
        <div style={{ display: 'flex', gap: '4px', flex: 1, flexWrap: 'wrap' }}>
          {FILTER_TABS.map(tab => (
            <button key={tab.key} onClick={() => setFilter(tab.key)} style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '5px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
              border: filter === tab.key ? '1px solid #0284c7' : '1px solid #e2e8f0',
              background: filter === tab.key ? '#eff6ff' : '#f8fafc',
              color: filter === tab.key ? '#0284c7' : '#64748b'
            }}>
              {tab.label}
              <span style={{ background: filter === tab.key ? '#0284c7' : '#e2e8f0', color: filter === tab.key ? '#fff' : '#64748b', borderRadius: '99px', padding: '0 5px', fontSize: '10px', fontWeight: 800 }}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Type filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: '1px solid #e2e8f0', paddingLeft: '10px' }}>
          <Filter size={12} style={{ color: '#94a3b8' }} />
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as any)}
            style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '4px 8px', fontSize: '11px', fontWeight: 600, background: '#f8fafc', color: '#475569', outline: 'none' }}>
            <option value="all">Tất cả loại</option>
            <option value="nghi_phep">Nghỉ phép</option>
            <option value="di_tre">Đi trễ</option>
          </select>
        </div>

        {/* Search (admin only) */}
        {isAdmin && (
          <div style={{ position: 'relative' }}>
            <Search size={12} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Tìm nhân viên..." style={{ paddingLeft: '26px', paddingRight: '10px', height: '30px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px', background: '#f8fafc', outline: 'none', width: '150px' }} />
          </div>
        )}
      </div>

      {/* ── List ── */}
      <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filtered.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', color: '#94a3b8', gap: '12px' }}>
            <Info size={40} style={{ opacity: 0.3 }} />
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Không có yêu cầu nào</p>
            {!isAdmin && <p style={{ margin: 0, fontSize: '12px' }}>Nhấn "Gửi yêu cầu" để tạo mới.</p>}
          </div>
        ) : (
          filtered.map(req => (
            <RequestCard key={req.id} req={req} isAdmin={isAdmin} onReview={setReviewing} onDelete={handleDelete} />
          ))
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
      {reviewing && (
        <ReviewModal
          request={reviewing}
          reviewerName={currentProfile?.full_name || 'Admin'}
          onClose={() => setReviewing(null)}
          onSuccess={onReload}
        />
      )}
    </div>
  );
};
