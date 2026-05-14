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
  Banknote
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
    commission: string;
    vpoint: string;
    aiNote?: string;
    xeXangVin?: string;
    xeXangHang?: string;
    xeXangModel?: string;
  }) => Promise<boolean>;
}

const Stepper: React.FC<{ currentStep: number }> = ({ currentStep }) => {
  const steps = ['Thông tin', 'Chứng từ', 'Xác nhận'];
  const progressWidth = `${((currentStep - 1) / 2) * 100}%`;

  return (
    <div className="stepper-container">
      <div className="stepper-track">
        <div className="stepper-progress" style={{ width: progressWidth }} />
      </div>
      {steps.map((label, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === currentStep;
        const isCompleted = stepNumber < currentStep;

        return (
          <div
            key={stepNumber}
            className={`step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
          >
            <div className="step-circle">
              {isCompleted ? <Check size={13} strokeWidth={3} /> : stepNumber}
            </div>
            <span className="step-label">{label}</span>
          </div>
        );
      })}
    </div>
  );
};

export const InvoiceRequestModal: React.FC<InvoiceRequestModalProps> = ({
  order,
  isSubmitting,
  onClose,
  onSubmit
}) => {
  const [step, setStep] = useState(1);
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [proposalFile, setProposalFile] = useState<File | null>(null);
  const [vinClubConfirmed, setVinClubConfirmed] = useState(false);

  const [policy, setPolicy] = useState<string[]>([]);
  const [policyOptions, setPolicyOptions] = useState<string[]>(defaultSalesPolicies);
  const [isLoadingPolicies, setIsLoadingPolicies] = useState(false);

  const [commission, setCommission] = useState('');
  const [vpoint, setVpoint] = useState('');
  const [aiNote, setAiNote] = useState('');

  const [xeXangVin, setXeXangVin] = useState('');
  const [xeXangHang, setXeXangHang] = useState('');
  const [xeXangModel, setXeXangModel] = useState('');

  const [vinCheckError, setVinCheckError] = useState('');
  const [isCheckingVin, setIsCheckingVin] = useState(false);
  const [error, setError] = useState('');

  const [processingStage, setProcessingStage] = useState(0);
  const submittingRef = useRef(false);

  // File Input Refs
  const contractRef = useRef<HTMLInputElement>(null);
  const proposalRef = useRef<HTMLInputElement>(null);

  // Fetch Policies
  useEffect(() => {
    let active = true;
    const fetchPolicies = async () => {
      try {
        setIsLoadingPolicies(true);
        const { data } = await apiService.getSalesPolicies();
        if (!active) return;
        const options = Array.from(new Set((data || []).map((item) => item.ten_chinh_sach).filter(Boolean)));
        if (options.length > 0) {
          setPolicyOptions(options);
        }
      } catch (err) {
        console.error('Lỗi tải chính sách:', err);
      } finally {
        if (active) setIsLoadingPolicies(false);
      }
    };
    fetchPolicies();
    return () => {
      active = false;
    };
  }, []);

  // Auto filter policy based on Order's Line
  const filteredPolicies = useMemo(() => {
    if (!order.line || policyOptions.length === 0) return policyOptions.sort();
    const currentCarModel = order.line.replace(/\s+/g, '').toLowerCase();
    const specificPolicies = policyOptions.filter((p) => {
      const pLower = p.toLowerCase().replace(/\s+/g, '');
      return pLower.includes(currentCarModel) || currentCarModel.includes(pLower);
    });
    return specificPolicies.length > 0 ? specificPolicies.sort() : policyOptions.sort();
  }, [order.line, policyOptions]);

  // Format numbers
  const formatNumber = (value: string) => {
    const cleanValue = value.replace(/\D/g, '');
    return cleanValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleNumberChange = (setter: (value: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(formatNumber(e.target.value));
  };

  const getRawValue = (value: string) => value.replace(/\./g, '');

  // Check Policy Condition
  const isGasToElectricPolicy = useMemo(() => {
    return policy.some((p) => {
      const low = p.toLowerCase();
      return (low.includes('xăng') && low.includes('điện')) || low.includes('thu cũ đổi mới');
    });
  }, [policy]);

  // VIN Checker Live Effect
  useEffect(() => {
    if (!isGasToElectricPolicy || !xeXangVin.trim()) {
      setVinCheckError('');
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        setIsCheckingVin(true);
        setVinCheckError('');
        const cleanGasVin = xeXangVin.trim().toUpperCase();

        if (!supabase) return;
        const { data: existingGasCar } = await supabase
          .from('yeucauxhd')
          .select('xe_xang_vin, so_don_hang')
          .ilike('xe_xang_vin', cleanGasVin)
          .limit(1);

        if (existingGasCar && existingGasCar.length > 0) {
          setVinCheckError(`VIN xe xăng ${cleanGasVin} đã được khai báo tại yêu cầu ${existingGasCar[0].so_don_hang}.`);
        }
      } catch (err) {
        console.error('Lỗi kiểm tra số VIN xe xăng:', err);
      } finally {
        setIsCheckingVin(false);
      }
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [xeXangVin, isGasToElectricPolicy]);

  // Session Draft Loading
  useEffect(() => {
    const savedData = sessionStorage.getItem(`invoice_draft_${order.id}`);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.policy) setPolicy(parsed.policy);
        if (parsed.commission) setCommission(parsed.commission);
        if (parsed.vpoint) setVpoint(parsed.vpoint);
      } catch (e) {
        console.error('Draft restore failed:', e);
      }
    }
  }, [order.id]);

  // Session Draft Saving
  useEffect(() => {
    if (policy.length > 0 || commission || vpoint) {
      const dataToSave = { policy, commission, vpoint };
      sessionStorage.setItem(`invoice_draft_${order.id}`, JSON.stringify(dataToSave));
    }
  }, [policy, commission, vpoint, order.id]);

  // Toggle policy
  const handleTogglePolicy = (opt: string) => {
    setPolicy((prev) => (prev.includes(opt) ? prev.filter((p) => p !== opt) : [...prev, opt]));
  };

  // Validations
  const isStep1Valid =
    policy.length > 0 &&
    commission.trim() !== '' &&
    vpoint.trim() !== '' &&
    (!isGasToElectricPolicy ||
      (xeXangVin.trim() !== '' && xeXangHang.trim() !== '' && xeXangModel.trim() !== '' && !vinCheckError));
  const isStep2Valid = !!contractFile && !!proposalFile;
  const isStep3Valid = vinClubConfirmed;
  const isFormValid = isStep1Valid && isStep2Valid && isStep3Valid;

  // Nav Handlers
  const handleNext = () => setStep((prev) => Math.min(prev + 1, 3));
  const handleBack = () => setStep((prev) => Math.max(prev - 1, 1));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submittingRef.current || !isFormValid || !contractFile || !proposalFile) return;

    submittingRef.current = true;
    setError('');

    try {
      // Trigger Staging Animation for 100% Parity
      setProcessingStage(1);
      await new Promise((r) => setTimeout(r, 650));
      setProcessingStage(2);
      await new Promise((r) => setTimeout(r, 650));
      setProcessingStage(3);

      const success = await onSubmit({
        order,
        contractFile,
        proposalFile,
        policy: policy.join('; '),
        commission: getRawValue(commission),
        vpoint: getRawValue(vpoint),
        aiNote,
        xeXangVin: isGasToElectricPolicy ? xeXangVin.trim().toUpperCase() : '',
        xeXangHang: isGasToElectricPolicy ? xeXangHang.trim() : '',
        xeXangModel: isGasToElectricPolicy ? xeXangModel.trim() : ''
      });

      if (success) {
        sessionStorage.removeItem(`invoice_draft_${order.id}`);
        setProcessingStage(4);
        await new Promise((r) => setTimeout(r, 1000));
        onClose();
      } else {
        submittingRef.current = false;
        setProcessingStage(0);
        setError('Không thể hoàn tất yêu cầu. Vui lòng kiểm tra lại đường truyền hoặc thử lại.');
      }
    } catch (err) {
      submittingRef.current = false;
      setProcessingStage(0);
      setError('Có lỗi xảy ra trong quá trình xử lý hồ sơ.');
    }
  }

  return (
    <div className="modal-layer" role="presentation">
      <section className="order-modal detail-modal invoice-modal-large" role="dialog" aria-modal="true" style={{ position: 'relative' }}>
        
        {/* Processing Animations Overlay */}
        {(isSubmitting || processingStage > 0) && (
          <div className="processing-overlay">
            <div className="processing-card">
              <div className={`processing-spinner-wrap ${processingStage === 4 ? 'completed' : ''}`}>
                {processingStage === 4 ? <Check size={32} strokeWidth={3} /> : <Loader2 size={30} />}
              </div>
              <h3>{processingStage === 4 ? 'Thành công!' : 'Đang xử lý hồ sơ'}</h3>
              <p>{processingStage === 4 ? 'Hệ thống đã ghi nhận yêu cầu.' : 'Vui lòng không tắt trình duyệt...'}</p>
              
              <div className="stage-list">
                <div className={`stage-item ${processingStage > 1 ? 'completed' : processingStage === 1 ? 'active' : ''}`}>
                  {processingStage > 1 ? <Check size={16} /> : <Loader2 size={16} />}
                  <span>Xử lý Hợp đồng mua bán</span>
                </div>
                <div className={`stage-item ${processingStage > 2 ? 'completed' : processingStage === 2 ? 'active' : ''}`}>
                  {processingStage > 2 ? <Check size={16} /> : <Loader2 size={16} />}
                  <span>Xử lý Đề nghị xuất hóa đơn</span>
                </div>
                <div className={`stage-item ${processingStage > 3 ? 'completed' : processingStage === 3 ? 'active' : ''}`}>
                  {processingStage > 3 ? <Check size={16} /> : <Loader2 size={16} />}
                  <span>Đang truyền gửi dữ liệu...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="panel-heading">
          <div>
            <p className="eyebrow">Phân hệ xuất hóa đơn</p>
            <h2>Yêu Cầu Xuất Hóa Đơn ({order.id})</h2>
          </div>
          <button className="icon-button" onClick={onClose} title="Đóng" disabled={isSubmitting}>
            <X size={18} />
          </button>
        </div>

        <div className="detail-body" style={{ gap: '16px', paddingBottom: '10px' }}>
          {/* Dynamic Stepper */}
          <Stepper currentStep={step} />

          {/* Mini Order Reference Banner */}
          <div className="detail-summary" style={{ padding: '14px 20px', gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <div>
              <span style={{ fontSize: '9px', letterSpacing: '0.1em' }}>Số đơn hàng</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                <Barcode size={13} color="#2563eb" />
                <strong style={{ fontSize: '13px' }}>{order.id}</strong>
              </div>
            </div>
            <div>
              <span style={{ fontSize: '9px', letterSpacing: '0.1em' }}>Khách hàng</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                <User size={13} color="#2563eb" />
                <strong style={{ fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {order.customer}
                </strong>
              </div>
            </div>
            <div>
              <span style={{ fontSize: '9px', letterSpacing: '0.1em' }}>Số VIN</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                <Tag size={13} color="#2563eb" />
                <strong style={{ fontSize: '13px' }}>{order.vin || '---'}</strong>
              </div>
            </div>
            <div>
              <span style={{ fontSize: '9px', letterSpacing: '0.1em' }}>Số máy</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                <Cog size={13} color="#2563eb" />
                <strong style={{ fontSize: '13px' }}>{order.engineNo || '---'}</strong>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          
          {/* STEP 1: INFORMATION */}
          {step === 1 && (
            <div className="order-form" style={{ paddingBottom: '24px', gridTemplateColumns: '1.3fr 1fr' }}>
              
              {/* Left Column: Policy */}
              <div className="invoice-form-flex" style={{ height: '100%' }}>
                <span className="field-label-alt">Chính sách bán hàng áp dụng *</span>
                <div className="policy-tag-grid" style={{ flex: 1, maxHeight: 'none', minHeight: '200px' }}>
                  {isLoadingPolicies ? (
                    <div style={{ padding: '12px', fontSize: '12px', color: '#64748b', display: 'flex', gap: '8px' }}>
                      <Loader2 size={14} className="vin-spinner-wrap" style={{ position: 'static', transform: 'none' }} />
                      Đang tải danh sách...
                    </div>
                  ) : filteredPolicies.length > 0 ? (
                    filteredPolicies.map((opt) => (
                      <div
                        key={opt}
                        className={`policy-tag ${policy.includes(opt) ? 'selected' : ''}`}
                        onClick={() => handleTogglePolicy(opt)}
                      >
                        <Check size={12} strokeWidth={policy.includes(opt) ? 3 : 1} style={{ opacity: policy.includes(opt) ? 1 : 0.2 }} />
                        {opt}
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '12px', fontSize: '12px', color: '#64748b' }}>Không có chính sách tương ứng.</div>
                  )}
                </div>
              </div>

              {/* Right Column: Financial Inputs */}
              <div className="invoice-form-flex">
                <span className="field-label-alt">Chi tiết hoa hồng & điểm</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <label>
                    <span>Hoa hồng ứng trước *</span>
                    <div className="input-suffix-wrap">
                      <input
                        value={commission}
                        onChange={handleNumberChange(setCommission)}
                        placeholder="VD: 5.000.000"
                        required
                        style={{ paddingRight: '46px' }}
                      />
                      <span className="suffix-badge">VNĐ</span>
                    </div>
                  </label>

                  <label>
                    <span>Số điểm VPoint sử dụng *</span>
                    <div className="input-suffix-wrap">
                      <input
                        value={vpoint}
                        onChange={handleNumberChange(setVpoint)}
                        placeholder="VD: 10.000"
                        required
                        style={{ paddingRight: '56px' }}
                      />
                      <span className="suffix-badge">ĐIỂM</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Full Width Row for Gas to Electric */}
              {isGasToElectricPolicy && (
                <div className="full-span" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '12px', padding: '20px', border: '1px solid #fed7aa', background: '#fff7ed', borderRadius: '20px', animation: 'modalSpringEnter 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
                  <div className="full-span" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '-4px' }}>
                    <AlertTriangle size={15} color="#ea580c" />
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#9a3412', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Khai báo thông tin xe xăng trao đổi</span>
                  </div>

                  <label className="vin-input-wrapper">
                    <span>Số VIN xe xăng *</span>
                    <input
                      value={xeXangVin}
                      onChange={(e) => setXeXangVin(e.target.value.toUpperCase())}
                      placeholder="VIN123..."
                      required
                      style={{ border: vinCheckError ? '1.5px solid #dc2626' : undefined }}
                    />
                    {isCheckingVin && (
                      <div className="vin-spinner-wrap">
                        <Loader2 size={14} />
                      </div>
                    )}
                    {vinCheckError && (
                      <div className="vin-error-text">
                        <AlertTriangle size={12} />
                        {vinCheckError}
                      </div>
                    )}
                  </label>

                  <label>
                    <span>Hãng xe xăng *</span>
                    <input
                      value={xeXangHang}
                      onChange={(e) => setXeXangHang(e.target.value)}
                      placeholder="VD: Toyota"
                      required
                    />
                  </label>

                  <label>
                    <span>Model xe xăng *</span>
                    <input
                      value={xeXangModel}
                      onChange={(e) => setXeXangModel(e.target.value)}
                      placeholder="VD: Camry"
                      required
                    />
                  </label>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: DOCUMENTS */}
          {step === 2 && (
            <div className="order-form" style={{ paddingBottom: '24px' }}>
              <div className="full-span file-uploader-grid">
                {/* Hợp đồng mua bán */}
                <input
                  type="file"
                  accept=".pdf,image/*"
                  ref={contractRef}
                  style={{ display: 'none' }}
                  onChange={(e) => setContractFile(e.target.files?.[0] || null)}
                />
                {!contractFile ? (
                  <div className="file-uploader-card" onClick={() => contractRef.current?.click()}>
                    <UploadCloud size={32} strokeWidth={1.5} />
                    <strong>Hợp đồng mua bán *</strong>
                    <p>Hỗ trợ file Ảnh hoặc PDF</p>
                  </div>
                ) : (
                  <div className="file-uploaded-state">
                    <div className="file-info-left">
                      <FileText size={24} />
                      <div>
                        <div className="file-title" title={contractFile.name}>{contractFile.name}</div>
                        <div className="file-size">{(contractFile.size / 1024).toFixed(1)} KB</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="icon-button"
                      style={{ background: '#fee2e2', color: '#ef4444', width: '28px', height: '28px' }}
                      onClick={() => setContractFile(null)}
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                {/* Đề nghị xuất hóa đơn */}
                <input
                  type="file"
                  accept=".pdf,image/*"
                  ref={proposalRef}
                  style={{ display: 'none' }}
                  onChange={(e) => setProposalFile(e.target.files?.[0] || null)}
                />
                {!proposalFile ? (
                  <div className="file-uploader-card" onClick={() => proposalRef.current?.click()}>
                    <UploadCloud size={32} strokeWidth={1.5} />
                    <strong>Đề nghị xuất hóa đơn *</strong>
                    <p>Hỗ trợ file Ảnh hoặc PDF</p>
                  </div>
                ) : (
                  <div className="file-uploaded-state">
                    <div className="file-info-left">
                      <FileText size={24} />
                      <div>
                        <div className="file-title" title={proposalFile.name}>{proposalFile.name}</div>
                        <div className="file-size">{(proposalFile.size / 1024).toFixed(1)} KB</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="icon-button"
                      style={{ background: '#fee2e2', color: '#ef4444', width: '28px', height: '28px' }}
                      onClick={() => setProposalFile(null)}
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>

              <div className="full-span" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#eff6ff', padding: '16px', borderRadius: '12px', color: '#1e40af', border: '1px solid #bfdbfe', fontSize: '13px', fontWeight: 500, marginTop: '12px' }}>
                <Info size={18} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                <span>Anh/Chị vui lòng tải bản scan hoặc ảnh chụp đầy đủ 4 góc, sắc nét của HĐMB và Đề nghị xuất hóa đơn.</span>
              </div>
            </div>
          )}

          {/* STEP 3: CONFIRMATION */}
          {step === 3 && (
            <div className="order-form" style={{ paddingBottom: '24px', gap: '16px' }}>
              <div className="full-span" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Financials Summary */}
                <div className="detail-summary" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '12px', height: '100%', background: '#f8fafc' }}>
                  <span style={{ borderBottom: '1px dashed #cbd5e1', paddingBottom: '6px', marginBottom: '2px' }}>Chi tiết tài chính</span>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ textTransform: 'none', fontWeight: 500 }}>Hoa hồng ứng:</span>
                    <strong style={{ fontSize: '14px', color: '#1e293b' }}>{commission ? `${commission} đ` : '0 đ'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ textTransform: 'none', fontWeight: 500 }}>Điểm VPoint:</span>
                    <strong style={{ fontSize: '14px', color: '#7c3aed' }}>{vpoint ? `${vpoint} điểm` : '0'}</strong>
                  </div>
                  
                  <span style={{ borderBottom: '1px dashed #cbd5e1', paddingBottom: '6px', marginTop: '6px', marginBottom: '2px' }}>Chứng từ đính kèm</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#059669', fontWeight: 600 }}>
                    <Check size={14} /> {contractFile?.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#059669', fontWeight: 600 }}>
                    <Check size={14} /> {proposalFile?.name}
                  </div>
                </div>

                {/* Applied Policies Summary */}
                <div className="detail-summary" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '12px', height: '100%', background: 'linear-gradient(135deg, #eff6ff 0%, #f5f3ff 100%)', borderColor: '#dbeafe' }}>
                  <span style={{ color: '#2563eb', borderBottom: '1px dashed #bfdbfe', paddingBottom: '6px', marginBottom: '4px' }}>Chính sách được chọn</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '130px' }}>
                    {policy.map((p, i) => (
                      <div key={i} style={{ display: 'flex', gap: '8px', padding: '8px 12px', background: '#ffffff', border: '1px solid #e0f2fe', borderRadius: '8px', fontSize: '12px', fontWeight: 600, color: '#1e3a8a' }}>
                        <span style={{ color: '#3b82f6' }}>#{i+1}</span>
                        {p}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <label className="full-span">
                <span>Ghi chú AI / Ghi chú hồ sơ</span>
                <textarea value={aiNote} onChange={(e) => setAiNote(e.target.value)} placeholder="Nhập lưu ý thêm nếu có..." rows={2} />
              </label>

              {/* VinClub Agreement Check */}
              <div
                className={`full-span vinclub-banner ${vinClubConfirmed ? 'confirmed' : ''}`}
                onClick={() => setVinClubConfirmed(!vinClubConfirmed)}
              >
                <div className="vinclub-checkbox">
                  {vinClubConfirmed && <Check size={12} strokeWidth={3} />}
                </div>
                <div>
                  <div className="vinclub-text-title">Tôi xác nhận khách hàng đã tạo tài khoản VinClub.</div>
                  <div className="vinclub-text-desc">Điều kiện bắt buộc trước khi đẩy duyệt hóa đơn.</div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="form-error" style={{ margin: '0 24px 12px' }}>
              <AlertTriangle size={17} />
              <span>{error}</span>
            </div>
          )}

          <div className="modal-actions" style={{ borderTop: '1px solid #f1f5f9', padding: '16px 24px', background: '#f8fafc' }}>
            {step > 1 ? (
              <button type="button" className="ghost-button" onClick={handleBack} disabled={isSubmitting}>
                <ArrowLeft size={16} />
                Quay lại
              </button>
            ) : (
              <button type="button" className="ghost-button" onClick={onClose} disabled={isSubmitting}>
                Hủy bỏ
              </button>
            )}

            {step < 3 ? (
              <button
                type="button"
                className="primary-button"
                onClick={handleNext}
                disabled={(step === 1 && !isStep1Valid) || (step === 2 && !isStep2Valid)}
              >
                <span>Tiếp theo</span>
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="submit"
                className="primary-button"
                disabled={!isFormValid || isSubmitting}
                style={{ background: '#10b981', border: 'none' }}
              >
                {isSubmitting ? <Loader2 size={16} className="vin-spinner-wrap" style={{ position: 'static', transform: 'none', color: '#fff' }} /> : <Send size={16} />}
                <span>{isSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu kế toán'}</span>
              </button>
            )}
          </div>
        </form>
      </section>
    </div>
  );
};
