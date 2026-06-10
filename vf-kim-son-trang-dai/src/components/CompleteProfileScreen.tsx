import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { ProfileRow } from '../types';
import { Phone, Calendar, User, MapPin, ShieldCheck, LogOut, X as CloseIcon, ArrowRight } from 'lucide-react';

interface Props {
  profile: ProfileRow;
  onComplete: () => void;
  onLogout?: () => void;
  onCancel?: () => void;
}

export function CompleteProfileScreen({ profile, onComplete, onLogout, onCancel }: Props) {
  const [phone, setPhone] = useState(profile.phone || '');
  const [dob, setDob] = useState(profile.dob || '');
  const [gender, setGender] = useState(profile.gender || '');
  const [address, setAddress] = useState(profile.address || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !dob.trim() || !gender.trim() || !address.trim()) {
      setError('Vui lòng điền đầy đủ tất cả các trường.');
      return;
    }
    
    setSaving(true);
    setError(null);
    try {
      if (!supabase) {
        throw new Error('Supabase chưa được cấu hình.');
      }

      const updatePayload = {
        phone: phone.trim(),
        dob: dob.trim(),
        gender: gender.trim(),
        address: address.trim()
      };

      const { data: updatedRows, error: updateError } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', profile.id)
        .select();

      if (updateError) throw updateError;

      if (!updatedRows || updatedRows.length === 0) {
        throw new Error('Không thể cập nhật hồ sơ. Có thể do chính sách bảo mật chặn.');
      }

      const saved = updatedRows[0];
      if (!saved.phone || !saved.dob || !saved.gender || !saved.address) {
        throw new Error('Dữ liệu chưa được lưu đầy đủ. Vui lòng thử lại.');
      }

      onComplete();
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi lưu thông tin. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', background: '#f1f5f9', fontFamily: "'Inter', sans-serif" }}>
      
      {/* Left Branding Side */}
      <div style={{ flex: '1 1 50%', background: 'linear-gradient(135deg, #022c22 0%, #0f766e 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '10%', color: '#fff', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(20,184,166,0.15) 0%, transparent 70%)', borderRadius: '50%' }}></div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(255,255,255,0.1)', borderRadius: '999px', backdropFilter: 'blur(10px)', marginBottom: '32px' }}>
            <ShieldCheck size={18} color="#5eead4" />
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#ccfbf1', letterSpacing: '0.5px' }}>HỆ THỐNG QUẢN TRỊ NỘI BỘ</span>
          </div>
          <h1 style={{ fontSize: '48px', fontWeight: 800, lineHeight: 1.2, marginBottom: '24px', color: '#f0fdfa' }}>
            Chào mừng<br/>nhân sự mới.
          </h1>
          <p style={{ fontSize: '18px', color: '#99f6e4', lineHeight: 1.6, maxWidth: '400px' }}>
            Vui lòng hoàn thiện hồ sơ cá nhân để kích hoạt tài khoản và bắt đầu trải nghiệm hệ thống quản trị chuyên nghiệp.
          </p>
        </div>
      </div>

      {/* Right Form Side */}
      <div style={{ flex: '1 1 50%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '5% 10%', background: '#fff', overflowY: 'auto' }}>
        <div style={{ maxWidth: '440px', width: '100%', margin: '0 auto' }}>
          <div style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>Bổ sung hồ sơ</h2>
            <p style={{ color: '#64748b', fontSize: '15px' }}>Điền các thông tin bắt buộc dưới đây để tiếp tục.</p>
          </div>

          {error && (
            <div style={{ padding: '16px', background: '#fef2f2', borderLeft: '4px solid #ef4444', borderRadius: '8px', color: '#991b1b', fontSize: '14px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CloseIcon size={16} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Phone */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Số điện thoại *</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', top: '50%', left: '16px', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                  <Phone size={18} />
                </div>
                <input 
                  type="tel" 
                  value={phone} 
                  onChange={e => setPhone(e.target.value)} 
                  placeholder="0987 654 321" 
                  required 
                  style={{ width: '100%', padding: '14px 16px 14px 44px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '15px', color: '#0f172a', transition: 'all 0.2s', outline: 'none' }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#0f766e'; e.currentTarget.style.background = '#fff'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(15,118,110,0.1)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {/* DOB */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ngày sinh *</label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '50%', left: '16px', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                    <Calendar size={18} />
                  </div>
                  <input 
                    type="date" 
                    value={dob} 
                    onChange={e => setDob(e.target.value)} 
                    required 
                    style={{ width: '100%', padding: '14px 16px 14px 44px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '15px', color: '#0f172a', transition: 'all 0.2s', outline: 'none' }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#0f766e'; e.currentTarget.style.background = '#fff'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(15,118,110,0.1)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>
              
              {/* Gender */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Giới tính *</label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '50%', left: '16px', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                    <User size={18} />
                  </div>
                  <select 
                    value={gender} 
                    onChange={e => setGender(e.target.value)} 
                    required
                    style={{ width: '100%', padding: '14px 16px 14px 44px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '15px', color: '#0f172a', transition: 'all 0.2s', outline: 'none', appearance: 'none', cursor: 'pointer' }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#0f766e'; e.currentTarget.style.background = '#fff'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(15,118,110,0.1)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    <option value="" disabled hidden>Chọn</option>
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Địa chỉ hiện tại *</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', top: '50%', left: '16px', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                  <MapPin size={18} />
                </div>
                <input 
                  type="text" 
                  value={address} 
                  onChange={e => setAddress(e.target.value)} 
                  placeholder="Nhập địa chỉ của bạn" 
                  required 
                  style={{ width: '100%', padding: '14px 16px 14px 44px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '15px', color: '#0f172a', transition: 'all 0.2s', outline: 'none' }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#0f766e'; e.currentTarget.style.background = '#fff'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(15,118,110,0.1)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '24px' }}>
              <button 
                type="submit" 
                disabled={saving}
                style={{ width: '100%', padding: '16px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)', color: '#fff', fontSize: '16px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.3s', boxShadow: '0 4px 12px rgba(13,148,136,0.3)' }}
                onMouseEnter={e => { if(!saving) e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(13,148,136,0.4)'; }}
                onMouseLeave={e => { if(!saving) e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(13,148,136,0.3)'; }}
              >
                {saving ? 'Đang lưu hồ sơ...' : <>Lưu Hồ Sơ <ArrowRight size={18} /></>}
              </button>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                {onLogout && (
                  <button 
                    type="button" 
                    onClick={onLogout}
                    style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#0f172a'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#64748b'; }}
                  >
                    <LogOut size={16} /> Đăng xuất
                  </button>
                )}
                {onCancel && (
                  <button 
                    type="button" 
                    onClick={onCancel}
                    style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#0f172a'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#64748b'; }}
                  >
                    <CloseIcon size={16} /> Hủy bỏ
                  </button>
                )}
              </div>
            </div>

          </form>
        </div>
      </div>
      
    </div>
  );
}
