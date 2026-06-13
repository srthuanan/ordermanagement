import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  X,
  UploadCloud,
  Check,
  FileText,
  Loader2,
  Copy,
} from 'lucide-react';
import * as apiService from '../../services/apiService';
import { supabase } from '../../services/supabaseClient';
import { defaultSalesPolicies } from '../../constants';
import { Order } from '../../types';

interface InvoiceRequestModalProps {
  order: Order;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (input: {
    order: Order;
    hsXhdFile: File;
    cdxFile: File | null;
    transactionImages: File[];
    policy: string;
    soTienKhachDaDong?: number | null;
    ngayKyHopDong?: string;
    soHopDong?: string;
    hinhThucTT?: string;
    diaChi?: string;
    aiNote?: string;
    xeXangVin?: string;
    xeXangHang?: string;
    xeXangModel?: string;
    nguonKhach?: string;
    maVso?: string;
    muaBaoHiem?: boolean;
    dangKyXe?: boolean;
    giaCongBo?: string;
    ghiChu?: string;
  }) => Promise<boolean>;
}

export const InvoiceRequestModal: React.FC<InvoiceRequestModalProps> = ({ order, isSubmitting, onClose, onSubmit }) => {
  const splitPolicies = (value: string) =>
    value
      .split(/[;,]/)
      .map((item) => item.trim())
      .filter(Boolean);

  const [isPolicyDropdownOpen, setIsPolicyDropdownOpen] = useState(false);
  const [policy, setPolicy] = useState<string[]>(() => splitPolicies(order.policy));
  const [soTienKhachDaDong, setSoTienKhachDaDong] = useState(() => (order.soTienKhachDaDong ?? order.depositAmount ?? '').toString());
  const [ngayKyHopDong, setNgayKyHopDong] = useState(() => order.ngayKyHopDong || order.needDateIso || order.depositDate || new Date().toISOString().split('T')[0]);
  const [diaChi, setDiaChi] = useState(() => order.invoiceAddress || '');
  const [soHopDong, setSoHopDong] = useState(() => order.contractCode || order.id || '');
  const [hinhThucTT, setHinhThucTT] = useState(() => order.paymentMethod || 'Tiền mặt');
  const [nguonKhach, setNguonKhach] = useState(() => order.nguonKhach || '');
  const [giaCongBo, setGiaCongBo] = useState(() => (order.giaCongBo ?? '').toString());
  const [muaBaoHiem, setMuaBaoHiem] = useState(() => Boolean(order.muaBaoHiem));
  const [dangKyXe, setDangKyXe] = useState(() => Boolean(order.dangKyXe));
  const [ghiChu, setGhiChu] = useState(() => order.ghiChu || '');
  const [xeXangVin, setXeXangVin] = useState(() => order.xeXangVin || '');
  const [xeXangHang, setXeXangHang] = useState(() => order.xeXangHang || '');
  const [xeXangModel, setXeXangModel] = useState(() => order.xeXangModel || '');
  const [hsXhdFile, setHsXhdFile] = useState<File | null>(null);
  const [cdxFile, setCdxFile] = useState<File | null>(null);
  const [transactionImages, setTransactionImages] = useState<File[]>([]);
  const [aiNote, setAiNote] = useState('');
  const [vinClubConfirmed, setVinClubConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [processingStage, setProcessingStage] = useState(0);
  const [isCheckingVin, setIsCheckingVin] = useState(false);
  const [vinCheckError, setVinCheckError] = useState('');
  const [isLoadingPolicies, setIsLoadingPolicies] = useState(true);
  const [availablePolicies, setAvailablePolicies] = useState<string[]>([]);

  const hsXhdRef = useRef<HTMLInputElement>(null);
  const cdxRef = useRef<HTMLInputElement>(null);
  const transImgRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await apiService.getSalesPolicies();
        setAvailablePolicies(data?.map((r) => r.ten_chinh_sach) ?? defaultSalesPolicies);
      } catch {
        setAvailablePolicies(defaultSalesPolicies);
      } finally {
        setIsLoadingPolicies(false);
      }
    };
    load();
  }, []);

  const filteredPolicies = useMemo(() => {
    const model = order.line?.toLowerCase() ?? '';
    return availablePolicies.filter(p => {
      const pl = p.toLowerCase();
      if (pl.includes('thu cũ') && !model.includes('vf3') && !model.includes('vf5') && !model.includes('vf6') && !model.includes('vf7') && !model.includes('vf8') && !model.includes('vf9')) return true;
      return true;
    });
  }, [availablePolicies, order.line]);

  const isGasToElectricPolicy = policy.some(p => p.toLowerCase().includes('thu cũ'));

  useEffect(() => {
    if (!isGasToElectricPolicy) { setXeXangVin(''); setXeXangHang(''); setXeXangModel(''); setVinCheckError(''); }
  }, [isGasToElectricPolicy]);

  useEffect(() => {
    if (!xeXangVin || xeXangVin.length < 5) { setVinCheckError(''); return; }
    const timer = setTimeout(async () => {
      setIsCheckingVin(true);
      try {
        const { data } = await supabase!.from('donhang').select('so_don_hang').eq('vin', xeXangVin).limit(1);
        if (data && data.length > 0) setVinCheckError('VIN này đã tồn tại trong hệ thống.');
        else setVinCheckError('');
      } catch { setVinCheckError(''); }
      finally { setIsCheckingVin(false); }
    }, 600);
    return () => clearTimeout(timer);
  }, [xeXangVin]);

  const handleTogglePolicy = (opt: string) => {
    setPolicy(prev => prev.includes(opt) ? prev.filter(p => p !== opt) : [...prev, opt]);
  };

  const handleNumberChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setter(raw ? Number(raw).toLocaleString('vi-VN') : '');
  };

  const isStep1Valid = policy.length > 0 && soTienKhachDaDong && ngayKyHopDong && diaChi && soHopDong && hinhThucTT && nguonKhach && giaCongBo && (!isGasToElectricPolicy || (xeXangVin && xeXangHang && xeXangModel && !vinCheckError));
  const isStep2Valid = hsXhdFile !== null && transactionImages.length > 0;
  const isFormValid = isStep1Valid && isStep2Valid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || !hsXhdFile) {
      setError('Vui lòng điền đầy đủ thông tin bắt buộc và tải lên chứng từ gốc.');
      return;
    }
    setError('');
    setProcessingStage(1);
    
    const t1 = setTimeout(() => setProcessingStage(2), 1200);
    const t2 = setTimeout(() => setProcessingStage(3), 2400);
    
    const raw = (s: string) => s.replace(/[^0-9]/g, '');
    const ok = await onSubmit({
      order, hsXhdFile, cdxFile, transactionImages,
      policy: policy.join(', '),
      soTienKhachDaDong: soTienKhachDaDong ? Number(raw(soTienKhachDaDong)) : null,
      ngayKyHopDong,
      soHopDong,
      hinhThucTT,
      diaChi, aiNote: aiNote || ghiChu,
      xeXangVin: isGasToElectricPolicy ? xeXangVin : undefined,
      xeXangHang: isGasToElectricPolicy ? xeXangHang : undefined,
      xeXangModel: isGasToElectricPolicy ? xeXangModel : undefined,
      nguonKhach, maVso: order.id,
      muaBaoHiem, dangKyXe,
      giaCongBo: raw(giaCongBo),
      ghiChu: ghiChu || aiNote,
    });
    if (ok) { setProcessingStage(4); setTimeout(onClose, 1800); }
    else { 
      clearTimeout(t1);
      clearTimeout(t2);
      setProcessingStage(0); 
      setError('Có lỗi xảy ra. Vui lòng thử lại.'); 
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="slide-over-overlay" role="presentation" onClick={onClose}>
      <section className="slide-over-panel" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} style={{ position: 'relative', overflow: 'hidden', fontFamily: 'inherit' }}>
        <div className="orders-visual-side" style={{ height: '100%', overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
          <div className="order-details-card" style={{ background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        
        {(isSubmitting || processingStage > 0) && (
          <div className="processing-overlay" style={{ background:'rgba(255,255,255,0.9)', backdropFilter:'blur(8px)', zIndex: 50, position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="processing-card" style={{ border:'none', boxShadow:'0 25px 50px -12px rgba(0,0,0,0.1)', background: '#fff', padding: '32px', borderRadius: '16px', textAlign: 'center' }}>
              <div className={processingStage === 4 ? 'processing-spinner-wrap completed' : 'processing-spinner-wrap'} style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                {processingStage === 4 ? <Check size={40} strokeWidth={3} color="#10b981" /> : <Loader2 size={38} className="spin" color="#0ea5e9" />}
              </div>
              <h3 style={{ fontSize:'20px', fontWeight:800 }}>{processingStage === 4 ? 'Thành công!' : 'Đang xử lý hồ sơ'}</h3>
              <p style={{ color:'#64748b' }}>{processingStage === 4 ? 'Yêu cầu của bạn đã được ghi nhận.' : 'Vui lòng giữ kết nối Internet...'}</p>
            </div>
          </div>
        )}

        {/* HEADER AREA */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexShrink: 0 }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Hồ sơ: {order.id} 
            <Copy className="clickable-copy-icon" onClick={() => copyToClipboard(order.id)} size={14} style={{ display: 'inline', marginLeft: '6px', cursor: 'pointer', color: '#64748b' }} />
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ padding: '4px 8px', border: '1px solid currentColor', fontSize: '12px', fontWeight: 600, borderRadius: '20px', color: '#0369a1', backgroundColor: '#e0f2fe' }}>
              Yêu cầu Xuất Hóa Đơn
            </span>
            <button type="button" onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* CONTENT */}
        <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', paddingRight: '4px' }}>
          {error && (
             <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', padding: '8px 12px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', fontWeight: 600 }}>
               {error}
             </div>
          )}

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', border: '1px solid #cbd5e1', tableLayout: 'fixed' }}>
            <tbody>
              <tr>
                <td style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569', width: '20%' }}>Khách hàng</td>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px', color: '#0f172a', fontWeight: 600, width: '30%' }}>{order.customer}</td>
                <td style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569', width: '20%' }}>Tư vấn viên</td>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px', color: '#0f172a', fontWeight: 500, width: '30%' }}>{order.staff}</td>
              </tr>
              <tr>
                <td style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Dòng xe</td>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px', color: '#0f172a', fontWeight: 600 }}>{order.line} / {order.version}</td>
                <td style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Màu (Ngoại/Nội)</td>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px', color: '#0f172a', fontWeight: 500 }}>{order.exterior} · {order.interior}</td>
              </tr>
              <tr>
                <td style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Số VIN định danh</td>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px', color: '#0f172a', fontWeight: 700, letterSpacing: '0.05em' }}>{order.vin || '—'}</td>
                <td style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Ngày cần xe</td>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px', color: '#0f172a', fontWeight: 500 }}>{order.needDate || order.needDateIso || '—'}</td>
              </tr>
              <tr>
                <td style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Ngày đặt cọc</td>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px', color: '#0f172a', fontWeight: 500 }}>{order.depositDate || '—'}</td>
                <td style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Tiền đã cọc *</td>
                <td style={{ border: '1px solid #cbd5e1', padding: 0 }}>
                   <input required value={soTienKhachDaDong} onChange={handleNumberChange(setSoTienKhachDaDong)} style={{ width: '100%', border: 'none', padding: '8px 12px', outline: 'none', background: 'transparent', color: '#dc2626', fontWeight: 700, fontSize: '13px', boxSizing: 'border-box' }} placeholder="VD: 5.000.000 đ" />
                </td>
              </tr>
              <tr>
                <td style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Thanh toán *</td>
                <td style={{ border: '1px solid #cbd5e1', padding: 0 }}>
                  <select value={hinhThucTT} onChange={e=>setHinhThucTT(e.target.value)} required style={{ width: '100%', border: 'none', padding: '8px 12px', outline: 'none', background: 'transparent', fontSize: '13px', color: '#0f172a', boxSizing: 'border-box' }}>
                     <option value="Tiền mặt">Tiền mặt</option>
                     <option value="Vay ngân hàng">Vay ngân hàng</option>
                     <option value="Chuyển khoản">Chuyển khoản</option>
                  </select>
                </td>
                <td style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Nguồn khách *</td>
                <td style={{ border: '1px solid #cbd5e1', padding: 0 }}>
                   <input required value={nguonKhach} onChange={e=>setNguonKhach(e.target.value)} style={{ width: '100%', border: 'none', padding: '8px 12px', outline: 'none', background: 'transparent', fontSize: '13px', boxSizing: 'border-box' }} placeholder="VD: marketing" />
                </td>
              </tr>
              <tr>
                <td style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Mã Hợp Đồng *</td>
                <td style={{ border: '1px solid #cbd5e1', padding: 0 }}>
                   <input required value={soHopDong} onChange={e=>setSoHopDong(e.target.value)} style={{ width: '100%', border: 'none', padding: '8px 12px', outline: 'none', background: 'transparent', fontSize: '13px', boxSizing: 'border-box' }} />
                </td>
                <td style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Mã Amis</td>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px', color: '#0f172a', fontWeight: 500 }}>—</td>
              </tr>
              <tr>
                <td style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Ngày ký HĐ *</td>
                <td style={{ border: '1px solid #cbd5e1', padding: 0 }}>
                   <input type="date" required value={ngayKyHopDong} onChange={e=>setNgayKyHopDong(e.target.value)} style={{ width: '100%', border: 'none', padding: '8px 12px', outline: 'none', background: 'transparent', fontSize: '13px', boxSizing: 'border-box' }} />
                </td>
                <td style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Giá công bố *</td>
                <td style={{ border: '1px solid #cbd5e1', padding: 0 }}>
                   <input required value={giaCongBo} onChange={handleNumberChange(setGiaCongBo)} style={{ width: '100%', border: 'none', padding: '8px 12px', outline: 'none', background: 'transparent', fontSize: '13px', fontWeight: 600, boxSizing: 'border-box' }} placeholder="315.000.000 đ" />
                </td>
              </tr>
              <tr>
                <td style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Đăng ký xe</td>
                <td style={{ border: '1px solid #cbd5e1', padding: 0 }}>
                   <select value={dangKyXe ? 'Có' : 'Không'} onChange={e=>setDangKyXe(e.target.value === 'Có')} style={{ width: '100%', border: 'none', padding: '8px 12px', outline: 'none', background: 'transparent', fontSize: '13px', boxSizing: 'border-box' }}>
                     <option value="Có">Có</option>
                     <option value="Không">Không</option>
                   </select>
                </td>
                <td style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Mua bảo hiểm</td>
                <td style={{ border: '1px solid #cbd5e1', padding: 0 }}>
                   <select value={muaBaoHiem ? 'Có' : 'Không'} onChange={e=>setMuaBaoHiem(e.target.value === 'Có')} style={{ width: '100%', border: 'none', padding: '8px 12px', outline: 'none', background: 'transparent', fontSize: '13px', boxSizing: 'border-box' }}>
                     <option value="Có">Có</option>
                     <option value="Không">Không</option>
                   </select>
                </td>
              </tr>
              <tr>
                <td style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Chính sách *</td>
                <td colSpan={3} style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>
                   <div style={{ position: 'relative' }}>
                     {isPolicyDropdownOpen && <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setIsPolicyDropdownOpen(false)} />}
                     <div 
                       onClick={() => setIsPolicyDropdownOpen(!isPolicyDropdownOpen)} 
                       style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', fontSize: '13px', position: 'relative', zIndex: 41 }}
                     >
                       <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '95%', color: policy.length > 0 ? '#0f172a' : '#94a3b8', fontWeight: policy.length > 0 ? 500 : 400 }}>
                         {policy.length > 0 ? policy.join('; ') : '— Chọn chính sách —'}
                       </div>
                       <span style={{ fontSize: '10px', color: '#64748b' }}>▼</span>
                     </div>
                     {isPolicyDropdownOpen && (
                       <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 50, maxHeight: '300px', overflowY: 'auto', padding: '12px' }}>
                         {isLoadingPolicies ? <Loader2 size={16} className="vin-spinner-wrap" /> : (
                           <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                             {filteredPolicies.map(opt => (
                               <label key={opt} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#0f172a', padding: '4px 0' }}>
                                 <input type="checkbox" checked={policy.includes(opt)} onChange={() => handleTogglePolicy(opt)} style={{ cursor: 'pointer', width: '14px', height: '14px', marginTop: '2px' }} />
                                 <span style={{ flex: 1, lineHeight: '1.4' }}>{opt}</span>
                               </label>
                             ))}
                           </div>
                         )}
                       </div>
                     )}
                   </div>
                   {policy.length === 0 && <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '6px' }}>Vui lòng chọn ít nhất 1 chính sách.</div>}
                </td>
              </tr>
              <tr>
                <td style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Địa chỉ XHĐ *</td>
                <td colSpan={3} style={{ border: '1px solid #cbd5e1', padding: 0 }}>
                   <input required value={diaChi} onChange={e=>setDiaChi(e.target.value)} style={{ width: '100%', border: 'none', padding: '8px 12px', outline: 'none', background: 'transparent', fontSize: '13px', boxSizing: 'border-box' }} placeholder="Địa chỉ chi tiết..." />
                </td>
              </tr>
              <tr>
                <td style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Ghi chú</td>
                <td colSpan={3} style={{ border: '1px solid #cbd5e1', padding: 0 }}>
                   <input value={ghiChu || aiNote} onChange={e=>{setAiNote(e.target.value); setGhiChu(e.target.value);}} style={{ width: '100%', border: 'none', padding: '8px 12px', outline: 'none', background: 'transparent', fontSize: '13px', boxSizing: 'border-box' }} placeholder="—" />
                </td>
              </tr>
              {isGasToElectricPolicy && (
                <tr>
                  <td style={{ backgroundColor: '#fff7ed', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#9a3412' }}>Thu cũ (VIN/Hãng)</td>
                  <td colSpan={3} style={{ border: '1px solid #cbd5e1', padding: 0, backgroundColor: '#fff7ed' }}>
                     <div style={{ display: 'flex', gap: '12px', padding: '8px 16px' }}>
                       <input value={xeXangVin} onChange={e=>setXeXangVin(e.target.value.toUpperCase())} placeholder="VIN xe xăng" style={{ border: '1px solid #fdba74', padding: '6px 12px', borderRadius: '4px', background: '#fff', outline: 'none', fontSize: '13px', width: '200px' }} />
                       <input value={xeXangHang} onChange={e=>setXeXangHang(e.target.value)} placeholder="Hãng" style={{ border: '1px solid #fdba74', padding: '6px 12px', borderRadius: '4px', background: '#fff', outline: 'none', fontSize: '13px', width: '120px' }} />
                       <input value={xeXangModel} onChange={e=>setXeXangModel(e.target.value)} placeholder="Model" style={{ border: '1px solid #fdba74', padding: '6px 12px', borderRadius: '4px', background: '#fff', outline: 'none', fontSize: '13px', width: '120px' }} />
                       {vinCheckError && <span style={{ color: '#ef4444', fontSize: '12px', alignSelf: 'center' }}>{vinCheckError}</span>}
                     </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* UPLOAD SECTION */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '16px' }}>
            <div onClick={()=>!hsXhdFile && hsXhdRef.current?.click()} style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#f8fafc', minHeight: '80px' }}>
              <input type="file" accept=".pdf,image/*" ref={hsXhdRef} style={{ display:'none' }} onChange={e=>setHsXhdFile(e.target.files?.[0]||null)} />
              {hsXhdFile ? (
                <>
                  <FileText size={24} color="#0d9488" style={{ marginBottom: '8px' }} />
                  <div style={{ fontSize: '12px', fontWeight: 600, textAlign: 'center', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hsXhdFile.name}</div>
                  <button type="button" onClick={(e)=>{e.stopPropagation(); setHsXhdFile(null);}} style={{ marginTop: '8px', border: 'none', background: 'transparent', color: '#e11d48', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Xóa</button>
                </>
              ) : (
                <>
                  <UploadCloud size={24} color="#64748b" style={{ marginBottom: '8px' }} />
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Bộ HS XHĐ *</div>
                </>
              )}
            </div>
            
            <div onClick={()=>!cdxFile && cdxRef.current?.click()} style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#f8fafc', minHeight: '80px' }}>
              <input type="file" accept=".pdf,image/*" ref={cdxRef} style={{ display:'none' }} onChange={e=>setCdxFile(e.target.files?.[0]||null)} />
              {cdxFile ? (
                <>
                  <FileText size={24} color="#0d9488" style={{ marginBottom: '8px' }} />
                  <div style={{ fontSize: '12px', fontWeight: 600, textAlign: 'center', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cdxFile.name}</div>
                  <button type="button" onClick={(e)=>{e.stopPropagation(); setCdxFile(null);}} style={{ marginTop: '8px', border: 'none', background: 'transparent', color: '#e11d48', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Xóa</button>
                </>
              ) : (
                <>
                  <UploadCloud size={24} color="#64748b" style={{ marginBottom: '8px' }} />
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Chuyển Đổi Xanh</div>
                </>
              )}
            </div>

            <div onClick={()=>transImgRef.current?.click()} style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#f8fafc', minHeight: '80px' }}>
              <input type="file" accept="image/*" multiple ref={transImgRef} style={{ display:'none' }} onClick={(e) => { e.stopPropagation(); (e.target as HTMLInputElement).value = ''; }} onChange={e=>{
                const files = e.target.files;
                if (files && files.length > 0) {
                  const newFiles = Array.from(files);
                  setTransactionImages(prev => [...prev, ...newFiles]);
                }
              }} />
              {transactionImages.length > 0 ? (
                <>
                  <FileText size={24} color="#0d9488" style={{ marginBottom: '8px' }} />
                  <div style={{ fontSize: '12px', fontWeight: 600, textAlign: 'center' }}>Đã tải {transactionImages.length} ảnh</div>
                  <button type="button" onClick={(e)=>{e.stopPropagation(); setTransactionImages([]);}} style={{ marginTop: '8px', border: 'none', background: 'transparent', color: '#e11d48', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Xóa tất cả</button>
                </>
              ) : (
                <>
                  <UploadCloud size={24} color="#64748b" style={{ marginBottom: '8px' }} />
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Ảnh giao dịch *</div>
                </>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
             <input type="checkbox" id="vinclub" checked={vinClubConfirmed} onChange={(e) => setVinClubConfirmed(e.target.checked)} style={{ cursor: 'pointer' }} />
             <label htmlFor="vinclub" style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', cursor: 'pointer' }}>Xác nhận khách hàng đã tham gia VinClub</label>
          </div>

          {/* FOOTER ACTIONS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginTop: 'auto', borderTop: '1px solid #f1f5f9', paddingTop: '24px' }}>
            <button type="button" onClick={onClose} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Đóng</button>
            <div style={{ gridColumn: 'span 2' }}></div>
            <button type="submit" disabled={!isFormValid || isSubmitting} style={{ gridColumn: 'span 2', padding: '10px', borderRadius: '6px', border: '1px solid #10b981', background: '#f0fdf4', color: '#166534', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
              {isSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu XHĐ'}
            </button>
          </div>

        </form>
          </div>
        </div>
      </section>
    </div>
  );
};
