import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  X,
  AlertTriangle,
  UploadCloud,
  Check,
  FileText,
  ArrowLeft,
  ArrowRight,
  Send,
  Loader2,
  User,
  Barcode,
  Cog,
  Info,
  Tag,
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
    contractFile: File;
    proposalFile: File;
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

  const [step, setStep] = useState(1);
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
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [proposalFile, setProposalFile] = useState<File | null>(null);
  const [aiNote, setAiNote] = useState('');
  const [vinClubConfirmed, setVinClubConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [processingStage, setProcessingStage] = useState(0);
  const [isCheckingVin, setIsCheckingVin] = useState(false);
  const [vinCheckError, setVinCheckError] = useState('');
  const [isLoadingPolicies, setIsLoadingPolicies] = useState(true);
  const [availablePolicies, setAvailablePolicies] = useState<string[]>([]);

  const contractRef = useRef<HTMLInputElement>(null);
  const proposalRef = useRef<HTMLInputElement>(null);

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
  const isStep2Valid = contractFile !== null && proposalFile !== null;
  const isFormValid = isStep1Valid && isStep2Valid;

  const handleNext = () => {
    if (step === 1 && !isStep1Valid) { setError('Vui lòng điền đầy đủ thông tin bắt buộc.'); return; }
    if (step === 2 && !isStep2Valid) { setError('Vui lòng tải lên đầy đủ chứng từ.'); return; }
    setError('');
    setStep(s => s + 1);
  };

  const handleBack = () => { setError(''); setStep(s => s - 1); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || !contractFile || !proposalFile) return;
    setError('');
    setProcessingStage(1);
    
    const t1 = setTimeout(() => setProcessingStage(2), 1200);
    const t2 = setTimeout(() => setProcessingStage(3), 2400);
    
    const raw = (s: string) => s.replace(/[^0-9]/g, '');
    const ok = await onSubmit({
      order, contractFile, proposalFile,
      policy: policy.join(', '),
      soTienKhachDaDong: soTienKhachDaDong ? Number(raw(soTienKhachDaDong)) : null,
      ngayKyHopDong,
      soHopDong,
      hinhThucTT,
      diaChi, aiNote,
      xeXangVin: isGasToElectricPolicy ? xeXangVin : undefined,
      xeXangHang: isGasToElectricPolicy ? xeXangHang : undefined,
      xeXangModel: isGasToElectricPolicy ? xeXangModel : undefined,
      nguonKhach, maVso: order.id,
      muaBaoHiem, dangKyXe,
      giaCongBo: raw(giaCongBo),
      ghiChu,
    });
    if (ok) { setProcessingStage(4); setTimeout(onClose, 1800); }
    else { 
      clearTimeout(t1);
      clearTimeout(t2);
      setProcessingStage(0); 
      setError('Có lỗi xảy ra. Vui lòng thử lại.'); 
    }
  };

  const iS = { display:'flex', flexDirection:'column' as const, gap:'4px' };
  const lS: React.CSSProperties = { fontSize:'12px', fontWeight:600, color:'#64748b', marginBottom:'4px' };
  const inputS: React.CSSProperties = { width:'100%', border:'1px solid #e2e8f0', borderRadius:'10px', padding:'12px 14px', fontSize:'14px', color:'#1e293b', background:'#f8fafc', outline:'none', transition:'all 0.2s', boxSizing:'border-box' };
  
  return (
    <div className="modal-layer" role="presentation">
      <section role="dialog" aria-modal="true" style={{ position:'relative', display:'flex', flexDirection:'column', width:'940px', height:'100vh', background:'#fff', boxShadow:'-20px 0 60px rgba(0,0,0,0.1)', overflow:'hidden', fontFamily:'inherit', marginLeft:'auto' }}>
        
        {(isSubmitting || processingStage > 0) && (
          <div className="processing-overlay" style={{ background:'rgba(255,255,255,0.9)', backdropFilter:'blur(8px)' }}>
            <div className="processing-card" style={{ border:'none', boxShadow:'0 25px 50px -12px rgba(0,0,0,0.1)' }}>
              <div className={processingStage === 4 ? 'processing-spinner-wrap completed' : 'processing-spinner-wrap'}>
                {processingStage === 4 ? <Check size={40} strokeWidth={3} /> : <Loader2 size={38} />}
              </div>
              <h3 style={{ fontSize:'20px', fontWeight:800 }}>{processingStage === 4 ? 'Thành công!' : 'Đang xử lý hồ sơ'}</h3>
              <p style={{ color:'#64748b' }}>{processingStage === 4 ? 'Yêu cầu của bạn đã được ghi nhận.' : 'Vui lòng giữ kết nối Internet...'}</p>
              <div className="stage-list" style={{ marginTop:'20px' }}>
                <div className={processingStage > 1 ? 'stage-item completed' : processingStage === 1 ? 'stage-item active' : 'stage-item'} style={{ padding:'10px' }}>
                  {processingStage > 1 ? <Check size={18} /> : <Loader2 size={18} />}
                  <span style={{ fontSize:'14px' }}>Tạo Hợp đồng mua bán</span>
                </div>
                <div className={processingStage > 2 ? 'stage-item completed' : processingStage === 2 ? 'stage-item active' : 'stage-item'} style={{ padding:'10px' }}>
                  {processingStage > 2 ? <Check size={18} /> : <Loader2 size={18} />}
                  <span style={{ fontSize:'14px' }}>Lập Đề nghị xuất hóa đơn</span>
                </div>
                <div className={processingStage > 3 ? 'stage-item completed' : processingStage === 3 ? 'stage-item active' : 'stage-item'} style={{ padding:'10px' }}>
                  {processingStage > 3 ? <Check size={18} /> : <Loader2 size={18} />}
                  <span style={{ fontSize:'14px' }}>Đồng bộ dữ liệu hệ thống...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* HEADER AREA - SIMPLIFIED */}
        <div style={{ padding:'16px 32px', background:'#fff', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
            <div style={{ width:'4px', height:'20px', background:'#0d9488', borderRadius:'2px' }} />
            <h1 style={{ fontSize:'16px', fontWeight:800, color:'#0f172a', margin:0, letterSpacing:'-0.01em' }}>YÊU CẦU XUẤT HÓA ĐƠN</h1>
          </div>
          <button type="button" onClick={onClose} style={{ width:'28px', height:'28px', borderRadius:'6px', border:'none', background:'#f1f5f9', color:'#64748b', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <X size={16} />
          </button>
        </div>

        {/* CONTENT */}
        <form onSubmit={handleSubmit} style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
            
            {/* LEFT: MAIN FORM (70%) */}
            <div style={{ flex:1, overflowY:'auto', padding:'24px 32px', display:'flex', flexDirection:'column', gap:'32px' }}>
              
              {step === 1 && (
                <>
                  {/* NEW SUMMARY SECTION */}
                  <section style={{ background:'#f8fafc', borderRadius:'16px', padding:'20px', border:'1px solid #e2e8f0', display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:'20px' }}>
                    <div style={iS}><label style={{...lS, fontSize:'10px'}}>Khách hàng</label><div style={{ fontSize:'14px', fontWeight:700, color:'#0f172a' }}>{order.customer}</div></div>
                    <div style={iS}><label style={{...lS, fontSize:'10px'}}>Mã đơn hàng</label><div style={{ fontSize:'14px', fontWeight:700, color:'#0d9488' }}>{order.id}</div></div>
                    <div style={iS}><label style={{...lS, fontSize:'10px'}}>Số VIN</label><div style={{ fontSize:'14px', fontWeight:700, color:'#0f172a' }}>{order.vin || '---'}</div></div>
                    <div style={iS}><label style={{...lS, fontSize:'10px'}}>Số Máy</label><div style={{ fontSize:'14px', fontWeight:700, color:'#0f172a' }}>{order.engineNo || '---'}</div></div>
                  </section>
                  <section>
                    <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'20px' }}>
                       <span style={{ width:'24px', height:'24px', borderRadius:'50%', background:'#0d9488', color:'#fff', fontSize:'12px', fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center' }}>1</span>
                       <h2 style={{ fontSize:'16px', fontWeight:700, color:'#0f172a', margin:0 }}>Thông tin khách hàng & Tài chính</h2>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'24px' }}>
                      <div style={iS}><label style={lS}>Số tiền khách đã đóng *</label>
                        <div style={{ position:'relative' }}>
                          <input value={soTienKhachDaDong} onChange={handleNumberChange(setSoTienKhachDaDong)} placeholder="0" required style={{ ...inputS, border:'2px solid #0d9488', fontSize:'18px', fontWeight:800, color:'#0d9488' }} />
                          <span style={{ position:'absolute', right:'16px', top:'50%', transform:'translateY(-50%)', fontWeight:700, color:'#94a3b8' }}>VNĐ</span>
                        </div>
                      </div>
                      <div style={iS}><label style={lS}>Giá công bố *</label>
                        <div style={{ position:'relative' }}>
                          <input value={giaCongBo} onChange={handleNumberChange(setGiaCongBo)} placeholder="0" required style={inputS} />
                          <span style={{ position:'absolute', right:'16px', top:'50%', transform:'translateY(-50%)', fontWeight:600, color:'#94a3b8' }}>VNĐ</span>
                        </div>
                      </div>
                      <div style={iS}><label style={lS}>Ngày ký hợp đồng *</label><input type="date" value={ngayKyHopDong} onChange={e=>setNgayKyHopDong(e.target.value)} required style={inputS} /></div>
                      <div style={iS}><label style={lS}>Số hợp đồng *</label><input value={soHopDong} onChange={e=>setSoHopDong(e.target.value)} required style={inputS} /></div>
                      <div style={{...iS, gridColumn:'1/-1'}}><label style={lS}>Địa chỉ xuất hóa đơn *</label><input value={diaChi} onChange={e=>setDiaChi(e.target.value)} placeholder="Theo CCCD hoặc Giấy phép kinh doanh" required style={inputS} /></div>
                    </div>
                  </section>

                  <section>
                    <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'20px' }}>
                       <span style={{ width:'24px', height:'24px', borderRadius:'50%', background:'#0d9488', color:'#fff', fontSize:'12px', fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center' }}>2</span>
                       <h2 style={{ fontSize:'16px', fontWeight:700, color:'#0f172a', margin:0 }}>Hình thức & Nguồn khách</h2>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'24px' }}>
                      <div style={iS}>
                        <label style={lS}>Hình thức thanh toán *</label>
                        <select value={hinhThucTT} onChange={e=>setHinhThucTT(e.target.value)} required style={{...inputS, appearance:'none'}}>
                          <option value="Tiền mặt">Tiền mặt</option>
                          <option value="Vay ngân hàng">Vay ngân hàng</option>
                          <option value="Chuyển khoản">Chuyển khoản</option>
                        </select>
                      </div>
                      <div style={iS}><label style={lS}>Nguồn khách *</label><input value={nguonKhach} onChange={e=>setNguonKhach(e.target.value)} placeholder="Giới thiệu, Marketing..." required style={inputS} /></div>
                    </div>
                  </section>

                  <section>
                    <div style={{ display:'flex', gap:'16px' }}>
                      {[{l:'Mua bảo hiểm',v:muaBaoHiem,s:setMuaBaoHiem},{l:'Làm đăng ký xe',v:dangKyXe,s:setDangKyXe}].map(x => (
                        <div key={x.l} onClick={()=>x.s(!x.v)} style={{ flex:1, padding:'18px', borderRadius:'16px', border: x.v ? '2px solid #0d9488' : '1px solid #e2e8f0', background: x.v ? '#f0fdfa' : '#fff', cursor:'pointer', display:'flex', alignItems:'center', gap:'12px', transition:'0.2s' }}>
                          <div style={{ width:'20px', height:'20px', borderRadius:'6px', border: x.v ? 'none' : '2px solid #cbd5e1', background: x.v ? '#0d9488' : '#fff', display:'flex', alignItems:'center', justifyContent:'center' }}>
                            {x.v && <Check size={14} color="#fff" strokeWidth={4} />}
                          </div>
                          <span style={{ fontSize:'14px', fontWeight:700, color: x.v ? '#0d9488' : '#475569' }}>{x.l}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                </>
              )}

              {step === 2 && (
                <div style={{ display:'flex', flexDirection:'column', gap:'32px' }}>
                   <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                       <span style={{ width:'24px', height:'24px', borderRadius:'50%', background:'#0d9488', color:'#fff', fontSize:'12px', fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center' }}>3</span>
                       <h2 style={{ fontSize:'16px', fontWeight:700, color:'#0f172a', margin:0 }}>Tải lên chứng từ gốc</h2>
                   </div>
                   <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'24px' }}>
                      {[ {r:contractRef, f:contractFile, sf:setContractFile, t:'Hợp đồng mua bán'}, {r:proposalRef, f:proposalFile, sf:setProposalFile, t:'Đề nghị xuất hóa đơn'} ].map((x,i) => (
                        <div key={i} onClick={()=>!x.f && x.r.current?.click()} style={{ height:'280px', background:'#f8fafc', borderRadius:'24px', border:'2px dashed #cbd5e1', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'24px', cursor:'pointer', transition:'all 0.3s' }}>
                          <input type="file" accept=".pdf,image/*" ref={x.r} style={{ display:'none' }} onChange={e=>x.sf(e.target.files?.[0]||null)} />
                          {x.f ? (
                            <>
                              <div style={{ width:'72px', height:'72px', borderRadius:'20px', background:'#fff', boxShadow:'0 10px 25px rgba(0,0,0,0.05)', display:'flex', alignItems:'center', justifyContent:'center', color:'#0d9488', marginBottom:'20px' }}><FileText size={40} /></div>
                              <div style={{ fontSize:'15px', fontWeight:700, textAlign:'center', color:'#0f172a', maxWidth:'220px', overflow:'hidden', textOverflow:'ellipsis' }}>{x.f.name}</div>
                              <button type="button" onClick={(e)=>{e.stopPropagation(); x.sf(null);}} style={{ marginTop:'16px', border:'none', background:'#fff', color:'#e11d48', fontSize:'13px', fontWeight:700, padding:'8px 16px', borderRadius:'10px', boxShadow:'0 2px 4px rgba(0,0,0,0.05)' }}>Xóa file</button>
                            </>
                          ) : (
                            <>
                              <div style={{ width:'72px', height:'72px', background:'#fff', borderRadius:'20px', display:'flex', alignItems:'center', justifyContent:'center', color:'#94a3b8', marginBottom:'20px', boxShadow:'0 4px 6px rgba(0,0,0,0.02)' }}><UploadCloud size={40} /></div>
                              <div style={{ fontSize:'16px', fontWeight:700, color:'#1e293b' }}>{x.t}</div>
                              <div style={{ fontSize:'13px', color:'#64748b', marginTop:'6px' }}>Hỗ trợ PDF hoặc Ảnh (JPG, PNG)</div>
                            </>
                          )}
                        </div>
                      ))}
                   </div>
                </div>
              )}

              {step === 3 && (
                <div style={{ display:'flex', flexDirection:'column', gap:'32px' }}>
                   <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:'20px', padding:'32px' }}>
                      <h2 style={{ fontSize:'16px', fontWeight:800, color:'#166534', marginBottom:'20px', letterSpacing:'0.05em' }}>XÁC NHẬN YÊU CẦU</h2>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px 48px' }}>
                         {([['Họ tên', order.customer],['Mã đơn', order.id],['Số tiền đóng', soTienKhachDaDong+' VNĐ'],['Hình thức', hinhThucTT],['Ngày ký', ngayKyHopDong],['Địa chỉ XHĐ', diaChi]] as [string,string][]).map(([k,v])=>(
                           <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'12px 0', borderBottom:'1px solid rgba(22,101,52,0.1)' }}>
                             <span style={{ fontSize:'14px', color:'#166534', opacity:0.8 }}>{k}</span>
                             <span style={{ fontSize:'14px', fontWeight:700, color:'#166534' }}>{v}</span>
                           </div>
                         ))}
                      </div>
                   </div>
                   <div style={iS}>
                     <label style={lS}>Ghi chú cho bộ phận kế toán</label>
                     <textarea value={aiNote} onChange={e=>setAiNote(e.target.value)} placeholder="Nhập thêm lưu ý nếu có..." style={{ ...inputS, height:'140px', resize:'none', background:'#fff' }} />
                   </div>
                </div>
              )}
            </div>

            {/* RIGHT: SIDEBAR (30%) */}
            <div style={{ width:'320px', background:'#f8fafc', borderLeft:'1px solid #f1f5f9', display:'flex', flexDirection:'column' }}>
               <div style={{ flex:1, padding:'32px 24px', display:'flex', flexDirection:'column', gap:'24px', overflowY:'auto' }}>
                  
                  <div>
                    <h3 style={{ fontSize:'11px', fontWeight:800, color:'#64748b', letterSpacing:'0.1em', marginBottom:'16px' }}>CHÍNH SÁCH BÁN HÀNG</h3>
                    <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                      {isLoadingPolicies ? <Loader2 size={24} className="vin-spinner-wrap" /> : filteredPolicies.map(opt => {
                        const sel = policy.includes(opt);
                        return (
                          <div key={opt} onClick={()=>handleTogglePolicy(opt)} style={{ padding:'14px', borderRadius:'14px', background: sel ? '#0d9488' : '#fff', border: sel ? 'none' : '1px solid #e2e8f0', color: sel ? '#fff' : '#475569', cursor:'pointer', transition:'0.2s', boxShadow: sel ? '0 4px 15px rgba(13,148,136,0.2)' : 'none' }}>
                            <div style={{ fontSize:'13.5px', fontWeight: sel ? 700 : 500, lineHeight:1.4 }}>{opt}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {isGasToElectricPolicy && (
                    <div style={{ background:'#fff7ed', borderRadius:'20px', border:'1.5px solid #fed7aa', padding:'20px' }}>
                      <div style={{ fontSize:'11px', fontWeight:800, color:'#9a3412', marginBottom:'16px' }}>THU CŨ ĐỔI MỚI</div>
                      <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
                        <div style={iS}><label style={{...lS, fontSize:'10px'}}>Số VIN xe xăng</label><input value={xeXangVin} onChange={e=>setXeXangVin(e.target.value.toUpperCase())} style={{...inputS, padding:'10px', fontSize:'13px'}} /></div>
                        <div style={iS}><label style={{...lS, fontSize:'10px'}}>Hãng / Model</label><input value={xeXangHang+' '+xeXangModel} readOnly style={{...inputS, padding:'10px', fontSize:'13px', background:'#fff'}} /></div>
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop:'auto' }}>
                    <div onClick={()=>setVinClubConfirmed(!vinClubConfirmed)} style={{ padding:'20px', borderRadius:'20px', background: vinClubConfirmed ? '#0d9488' : '#fff', border: vinClubConfirmed ? 'none' : '1px solid #e2e8f0', color: vinClubConfirmed ? '#fff' : '#475569', cursor:'pointer', display:'flex', gap:'16px', alignItems:'center', transition:'0.2s', boxShadow: vinClubConfirmed ? '0 12px 25px rgba(13,148,136,0.2)' : 'none' }}>
                       <div style={{ width:'24px', height:'24px', borderRadius:'8px', background: vinClubConfirmed ? 'rgba(255,255,255,0.2)' : '#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center' }}>
                         {vinClubConfirmed && <Check size={16} strokeWidth={4} />}
                       </div>
                       <div style={{ fontSize:'14px', fontWeight:700 }}>Xác nhận VinClub</div>
                    </div>
                  </div>
               </div>
            </div>
          </div>

          {/* FOOTER */}
          <div style={{ padding:'24px 40px', background:'#fff', borderTop:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
             <div style={{ display:'flex', gap:'10px' }}>
               {[1,2,3].map(n => (
                 <div key={n} style={{ width:'12px', height:'12px', borderRadius:'50%', background: step === n ? '#0d9488' : '#e2e8f0', transition:'0.3s' }} />
               ))}
             </div>
             <div style={{ display:'flex', gap:'16px' }}>
               {step > 1 && <button type="button" onClick={handleBack} style={{ padding:'14px 28px', borderRadius:'14px', border:'1px solid #e2e8f0', background:'#fff', color:'#64748b', fontSize:'15px', fontWeight:700, cursor:'pointer' }}>Quay lại</button>}
               {step < 3 ? (
                 <button type="button" onClick={handleNext} disabled={ (step===1 && !isStep1Valid) || (step===2 && !isStep2Valid) } style={{ padding:'14px 40px', borderRadius:'14px', border:'none', background:'#0f172a', color:'#fff', fontSize:'15px', fontWeight:800, cursor:'pointer', boxShadow:'0 10px 25px rgba(15,23,42,0.2)' }}>
                   Tiếp theo
                 </button>
               ) : (
                 <button type="submit" disabled={!isFormValid || isSubmitting} style={{ padding:'14px 48px', borderRadius:'14px', border:'none', background:'#10b981', color:'#fff', fontSize:'15px', fontWeight:800, cursor:'pointer', boxShadow:'0 10px 25px rgba(16,185,129,0.2)' }}>
                   {isSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu ngay'}
                 </button>
               )}
             </div>
          </div>
        </form>
      </section>
    </div>
  );
};
