import React, { useState } from 'react';
import { supabase } from '../services/apiService';
import { ProfileRow } from '../types';

interface Props {
  profile: ProfileRow;
  onComplete: () => void;
  onLogout: () => void;
}

export function CompleteProfileScreen({ profile, onComplete, onLogout }: Props) {
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '24px' }}>
          <div className="input-field">
            <label>Số điện thoại *</label>
            <input 
              type="tel" 
              value={phone} 
              onChange={e => setPhone(e.target.value)} 
              placeholder="VD: 0987654321" 
              required 
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="input-field">
              <label>Ngày sinh *</label>
              <input 
                type="date" 
                value={dob} 
                onChange={e => setDob(e.target.value)} 
                required 
              />
            </div>
            
            <div className="input-field">
              <label>Giới tính *</label>
              <select value={gender} onChange={e => setGender(e.target.value)} required>
                <option value="">Chọn giới tính...</option>
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
                <option value="Khác">Khác</option>
              </select>
            </div>
          </div>

          <div className="input-field">
            <label>Địa chỉ hiện tại *</label>
            <input 
              type="text" 
              value={address} 
              onChange={e => setAddress(e.target.value)} 
              placeholder="Nhập địa chỉ của bạn" 
              required 
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <button 
              type="button" 
              className="secondary-button" 
              onClick={onLogout}
              style={{ flex: 1 }}
            >
              Đăng xuất
            </button>
            <button 
              type="submit" 
              className="primary-button" 
              disabled={saving}
              style={{ flex: 2 }}
            >
              {saving ? 'Đang lưu...' : 'Lưu và Tiếp tục'}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
