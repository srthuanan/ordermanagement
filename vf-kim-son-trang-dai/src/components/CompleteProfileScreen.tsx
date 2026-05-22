import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { ProfileRow } from '../types';

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
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          phone: phone.trim(),
          dob: dob.trim(),
          gender: gender.trim(),
          address: address.trim()
        })
        .eq('id', profile.id);
        
      if (updateError) throw updateError;
      onComplete();
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi lưu thông tin. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-card" style={{ maxWidth: '500px', width: '100%' }}>
        <div>
          <p className="eyebrow">CHÀO MỪNG NHÂN SỰ MỚI</p>
          <h1>Bổ sung Hồ sơ</h1>
          <p className="auth-note">Vui lòng điền đầy đủ thông tin cá nhân bắt buộc trước khi truy cập hệ thống.</p>
        </div>
        
        {error && <div className="error-message">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gap: '20px' }}>
            <label>
              <span>Số điện thoại *</span>
              <div style={{ position: 'relative' }}>
                <input 
                  type="tel" 
                  value={phone} 
                  onChange={e => setPhone(e.target.value)} 
                  placeholder="VD: 0987654321" 
                  required 
                />
              </div>
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <label>
                <span>Ngày sinh *</span>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="date" 
                    value={dob} 
                    onChange={e => setDob(e.target.value)} 
                    required 
                  />
                </div>
              </label>
              
              <label>
                <span>Giới tính *</span>
                <div style={{ position: 'relative' }}>
                  <select 
                    value={gender} 
                    onChange={e => setGender(e.target.value)} 
                    required
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#f8fafc', color: '#334155', appearance: 'none', fontWeight: 600 }}
                  >
                    <option value="">Chọn giới tính...</option>
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>
              </label>
            </div>

            <label>
              <span>Địa chỉ hiện tại *</span>
              <div style={{ position: 'relative' }}>
                <input 
                  type="text" 
                  value={address} 
                  onChange={e => setAddress(e.target.value)} 
                  placeholder="Nhập địa chỉ của bạn" 
                  required 
                />
              </div>
            </label>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            {onLogout && (
              <button 
                type="button" 
                className="secondary-button" 
                onClick={onLogout}
                style={{ flex: 1 }}
              >
                Đăng xuất
              </button>
            )}
            {onCancel && (
              <button 
                type="button" 
                className="secondary-button" 
                onClick={onCancel}
                style={{ flex: 1 }}
              >
                Hủy bỏ
              </button>
            )}
            <button 
              type="submit" 
              className="primary-button" 
              disabled={saving}
              style={{ flex: 2 }}
            >
              {saving ? 'Đang lưu...' : 'Lưu Hồ Sơ'}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
