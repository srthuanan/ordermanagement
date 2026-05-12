import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Order } from '../../types';
import SimpleFileUpload from '../ui/SimpleFileUpload';
import Button from '../ui/Button';
import * as apiService from '../../services/apiService';

interface RequestInvoiceModalProps {
    order: Order;
    onClose: () => void;
    onConfirm: (
        order: Order, 
        contractFile: File, 
        proposalFile: File, 
        policy: string[], 
        commission: string, 
        vpoint: string, 
        aiNote?: string, 
        preProcessedPayloads?: any,
        xeXangVin?: string,
        xeXangHang?: string,
        xeXangModel?: string
    ) => Promise<any>;
    stockData?: any[]; 
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
}

const Stepper: React.FC<{ currentStep: number, hasVinClub?: boolean }> = ({ currentStep, hasVinClub }) => {
    const steps = ["Thông tin", "Chứng từ", "Xác nhận"];
    return (
        <div className="flex justify-between items-center mb-6 relative px-10 md:px-24">
            {/* Connection Segments Container */}
            <div className="absolute left-[calc(2.5rem+32px)] right-[calc(2.5rem+32px)] md:left-[calc(6rem+40px)] md:right-[calc(6rem+40px)] top-[12px] transform -translate-y-1/2 h-3 -z-10 flex justify-between gap-2">
                {steps.slice(0, -1).map((_, idx) => {
                    const isFilled = currentStep > idx + 1 || (currentStep === 3 && idx === 1 && hasVinClub);
                    const isActive = currentStep === idx + 1 && !isFilled;
                    
                    return (
                        <div key={idx} className="flex-1 h-full flex items-center justify-around px-2">
                            {/* Energy Chevrons Trail with Vibrant Color Range */}
                            {[...Array(10)].map((_, i) => {
                                const colors = isFilled 
                                    ? ['#34d399', '#10b981', '#059669', '#0d9488', '#065f46', '#0f766e', '#115e59', '#134e4a'] // Emerald/Teal range
                                    : ['#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a', '#172554', '#0f172a']; // Blue/Indigo range
                                
                                const isFuture = !isFilled && !isActive;
                                
                                return (
                                    <div 
                                        key={i} 
                                        className={`w-1 h-1 border-t-[1px] border-r-[1px] rotate-45 transition-all duration-700 ${
                                            isActive ? 'animate-pulse' : ''
                                        }`}
                                        style={{ 
                                            borderColor: isFuture ? '#e5e7eb' : colors[i % colors.length],
                                            animationDelay: isActive ? `${i * 0.12}s` : '0s',
                                            opacity: isFilled ? 0.9 : isActive ? 0.5 : 0.05,
                                            filter: (isFilled || isActive) ? `drop-shadow(0 0 2px ${colors[i % colors.length]}60)` : 'none'
                                        }}
                                    />
                                );
                            })}
                        </div>
                    );
                })}
            </div>
            
            {steps.map((label, index) => {
                const stepNumber = index + 1;
                const isActive = stepNumber === currentStep && !(stepNumber === 3 && hasVinClub);
                const isCompleted = stepNumber < currentStep || (stepNumber === 3 && hasVinClub);
                
                return (
                    <div key={stepNumber} className="flex flex-col items-center relative z-10 w-16 md:w-20 group">
                        {/* Halo Effect for Active Step */}
                        {isActive && (
                            <div className="absolute top-[12px] left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-blue-500/10 rounded-full animate-ping -z-10"></div>
                        )}
                        
                        <div className={`w-6 h-6 flex items-center justify-center font-black text-[9px] rounded-full border-2 transition-all duration-500 relative ${
                            isCompleted 
                                ? 'bg-emerald-500 border-emerald-400 text-white shadow-[0_0_8px_rgba(16,185,129,0.3)]' 
                                : isActive 
                                    ? 'bg-white border-blue-600 text-blue-600 scale-125 shadow-[0_0_12px_rgba(37,99,235,0.2)] ring-2 ring-blue-50' 
                                    : 'bg-white border-gray-200 text-gray-300'
                        }`}>
                            {isCompleted ? <i className="fas fa-check text-[8px]"></i> : stepNumber}
                            
                            {/* Inner Shine for that Pearl Look */}
                            <div className="absolute top-0.5 left-1 w-1 h-1 bg-white/40 rounded-full"></div>
                        </div>
                        <span className={`mt-2 font-black text-[8px] md:text-[9px] uppercase tracking-[0.12em] text-center transition-all duration-300 ${
                            isCompleted ? 'text-emerald-600' : isActive ? 'text-blue-700 font-black' : 'text-gray-400'
                        }`}>{label}</span>
                    </div>
                );
            })}
        </div>
    );
};

const RequestInvoiceModal: React.FC<RequestInvoiceModalProps> = ({ order, onClose, onConfirm, stockData, showToast }) => {
    const [step, setStep] = useState(1);
    const [contractFile, setContractFile] = useState<File | null>(null);
    const [proposalFile, setProposalFile] = useState<File | null>(null);
    const [vinClubConfirmed, setVinClubConfirmed] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [policy, setPolicy] = useState<string[]>([]);
    const [commission, setCommission] = useState('');
    const [vpoint, setVpoint] = useState('');
    const [xeXangVin, setXeXangVin] = useState('');
    const [xeXangHang, setXeXangHang] = useState('');
    const [xeXangModel, setXeXangModel] = useState('');
    const [vinCheckError, setVinCheckError] = useState('');
    const [isCheckingVin, setIsCheckingVin] = useState(false);
    
    // Background tracking for Google Drive
    const [capturedImages, setCapturedImages] = useState<any[]>([]);
    const [fileOrigins, setFileOrigins] = useState<number[]>([]);

    const [salesPoliciesOptions, setSalesPoliciesOptions] = useState<{ten_chinh_sach: string, dong_xe: string}[]>([]);
    const [isLoadingPolicies, setIsLoadingPolicies] = useState(true);

    useEffect(() => {
        const fetchPolicies = async () => {
            try {
                setIsLoadingPolicies(true);
                const result = await apiService.getSalesPolicies();
                if (result.status === 'SUCCESS' && Array.isArray(result.data)) {
                    setSalesPoliciesOptions(result.data);
                } else {
                    setSalesPoliciesOptions([]);
                }
            } catch (error) {
                setSalesPoliciesOptions([]);
            } finally {
                setIsLoadingPolicies(false);
            }
        };
        fetchPolicies();
    }, []);

    const filteredSalesPolicies = useMemo(() => {
        if (!order || !order["Dòng xe"] || salesPoliciesOptions.length === 0) {
            return salesPoliciesOptions.map(p => p.ten_chinh_sach).sort();
        }
        const currentCarModel = order["Dòng xe"].replace(/\s+/g, '').toLowerCase();
        const specificPolicies = salesPoliciesOptions.filter(policy => {
            if (policy.dong_xe) {
                const dongXeArr = policy.dong_xe.toLowerCase().split(',').map(s => s.replace(/\s+/g, ''));
                return dongXeArr.some(dx => dx === currentCarModel || currentCarModel.includes(dx));
            }
            return false;
        });
        const genericPolicies = salesPoliciesOptions.filter(policy => {
            if (!policy.dong_xe || policy.dong_xe.trim() === '') return true;
            const dxLower = policy.dong_xe.toLowerCase().trim();
            return dxLower.includes('tất cả') || dxLower === 'all';
        });
        const result = [...new Set([...specificPolicies, ...genericPolicies].map(p => p.ten_chinh_sach))];
        return result.length > 0 ? result.sort() : salesPoliciesOptions.map(p => p.ten_chinh_sach).sort();
    }, [order, salesPoliciesOptions]);

    useEffect(() => {
        if (filteredSalesPolicies.length > 0) {
            setPolicy(currentSelection => currentSelection.filter(p => filteredSalesPolicies.includes(p)));
        }
    }, [filteredSalesPolicies]);

    const [processingStage, setProcessingStage] = useState(0); 

    const formatNumber = (value: string) => {
        const cleanValue = value.replace(/\D/g, '');
        return cleanValue.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    };

    const handleNumberChange = (setter: (value: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setter(formatNumber(e.target.value));
    };

    const getRawValue = (value: string) => value.replace(/\./g, '');

    const isGasToElectricPolicy = useMemo(() => {
        return policy.some(p => {
            const low = p.toLowerCase();
            return (low.includes('xăng') && low.includes('điện')) ||
                   low.includes('thu cũ đổi mới');
        });
    }, [policy]);

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

                const { data: existingGasCar } = await apiService.supabase.from('yeucauxhd')
                    .select('xe_xang_vin, so_don_hang')
                    .ilike('xe_xang_vin', cleanGasVin);

                const { data: existingArchivedGasCar } = await apiService.supabase.from('archived_orders')
                    .select('xe_xang_vin, so_don_hang')
                    .ilike('xe_xang_vin', cleanGasVin);

                const matchY = !!(existingGasCar && existingGasCar.length > 0);
                const matchA = !!(existingArchivedGasCar && existingArchivedGasCar.length > 0);

                if (matchY || matchA) {
                    const matched = matchY && existingGasCar ? existingGasCar[0] : (existingArchivedGasCar ? existingArchivedGasCar[0] : null);
                    if (matched) {
                        setVinCheckError(`Xe xăng có số VIN ${cleanGasVin} đã được sử dụng trong yêu cầu ${matched.so_don_hang}.`);
                    }
                }
            } catch (err) {
                console.error('Error checking duplicate old gas car VIN:', err);
            } finally {
                setIsCheckingVin(false);
            }
        }, 400);

        return () => clearTimeout(timeoutId);
    }, [xeXangVin, isGasToElectricPolicy]);

    const isStep1Valid = policy.length > 0 && commission && parseFloat(getRawValue(commission)) >= 0 && vpoint && parseFloat(getRawValue(vpoint)) >= 0 && (!isGasToElectricPolicy || (xeXangVin.trim() !== '' && xeXangHang.trim() !== '' && xeXangModel.trim() !== '' && !vinCheckError));
    const isStep2Valid = contractFile && proposalFile;
    const isStep3Valid = vinClubConfirmed;
    const isFormValid = isStep1Valid && isStep2Valid && isStep3Valid;

    useEffect(() => {
        const savedData = sessionStorage.getItem(`invoice_draft_${order["Số đơn hàng"]}`);
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                if (parsed.policy) setPolicy(parsed.policy);
                if (parsed.commission) setCommission(parsed.commission);
                if (parsed.vpoint) setVpoint(parsed.vpoint);
            } catch (e) { console.error(e); }
        }
    }, [order]);

    useEffect(() => {
        const dataToSave = { policy, commission, vpoint };
        sessionStorage.setItem(`invoice_draft_${order["Số đơn hàng"]}`, JSON.stringify(dataToSave));
    }, [policy, commission, vpoint, order]);

    const payloadsRef = useRef<{ contract: any, proposal: any }>({ contract: null, proposal: null });

    useEffect(() => {
        const handleContractProcessed = (e: any) => {
            payloadsRef.current.contract = e.detail;
            if (e.detail?.payload) {
                setFileOrigins(prev => {
                    const next = [...prev];
                    next[0] = e.detail.count;
                    return next;
                });
                setCapturedImages(prev => [...prev, ...e.detail.payload]);
            }
        };
        const handleProposalProcessed = (e: any) => {
            payloadsRef.current.proposal = e.detail;
            if (e.detail?.payload) {
                setFileOrigins(prev => {
                    const next = [...prev];
                    next[1] = e.detail.count;
                    return next;
                });
                setCapturedImages(prev => [...prev, ...e.detail.payload]);
            }
        };
        window.addEventListener('file_processed_hop_dong_file_input', handleContractProcessed);
        window.addEventListener('file_processed_denghi_xhd_file_input', handleProposalProcessed);
        return () => {
            window.removeEventListener('file_processed_hop_dong_file_input', handleContractProcessed);
            window.removeEventListener('file_processed_denghi_xhd_file_input', handleProposalProcessed);
        };
    }, []);

    const handleContractFileSelect = (file: File | null) => {
        setContractFile(file);
        if (!file) {
            payloadsRef.current.contract = null;
        }
    };

    const handleProposalFileSelect = (file: File | null) => {
        setProposalFile(file);
        if (!file) {
            payloadsRef.current.proposal = null;
        }
    };

    const handleNext = () => setStep((prev: any) => Math.min(prev + 1, 3));
    const handleBack = () => setStep((prev: any) => Math.max(prev - 1, 1));

    const handleSubmit = async () => {
        if (!isFormValid || !contractFile || !proposalFile) {
            showToast('Thiếu Thông Tin', "Vui lòng hoàn thành tất cả các bước.", 'warning');
            return;
        }

        if (stockData && stockData.length > 0 && order.VIN) {
            const vehicle = stockData.find(v => v.VIN === order.VIN);
            if (vehicle) {
                const dmsCode = vehicle['Mã DMS'] || vehicle['Mã DMS'] || vehicle['DMS Code'] || vehicle['Mã đơn hàng'] || '';
                const orderPrefix = order["Số đơn hàng"] ? order["Số đơn hàng"].trim().substring(0, 6) : '';
                if (dmsCode && orderPrefix && dmsCode.trim().toUpperCase() !== orderPrefix.toUpperCase()) {
                    showToast('Sai Mã DMS', `Anh chị vui lòng tạo lại đơn hàng đúng đầu DMS (${dmsCode})`, 'error', 10000);
                    return;
                }
            }
        }

        setIsSubmitting(true);
        try {
            setProcessingStage(1);
            await new Promise(r => setTimeout(r, 600));
            setProcessingStage(2);
            await new Promise(r => setTimeout(r, 600));
            setProcessingStage(3);
            
            // Save split images to Supabase in background for Re-Scan functionality
            if (capturedImages.length > 0 && fileOrigins.length > 0) {
                const triggerArchival = async () => {
                    try {
                        const orderNumber = order["Số đơn hàng"];
                        const customerName = order["Tên khách hàng"] || "KH vãng lai";
                        const contractImgCount = fileOrigins[0] || 0;
                        
                        // 1. Lưu bộ HĐMB trước
                        if (contractImgCount > 0) {
                            const contractImgs = capturedImages.slice(0, contractImgCount);
                            console.log(`[Supabase] Archiving ${contractImgCount} HĐMB images for re-scan...`);
                            await apiService.saveSplitImagesToSupabase(orderNumber, customerName, contractImgs, "HĐMB");
                        }
                        
                        // 2. Sau đó lưu bộ ĐNXHĐ
                        const proposalImgCount = fileOrigins[1] || 0;
                        if (proposalImgCount > 0) {
                            const proposalImgs = capturedImages.slice(contractImgCount, contractImgCount + proposalImgCount);
                            console.log(`[Supabase] Archiving ${proposalImgCount} ĐNXHĐ images for re-scan...`);
                            await apiService.saveSplitImagesToSupabase(orderNumber, customerName, proposalImgs, "ĐNXHĐ");
                        }
                        
                        console.log(`✅ [Supabase] Toàn bộ ảnh đã được lưu vào Storage cho đơn hàng ${orderNumber}`);
                    } catch (err) {
                        console.error("❌ [Supabase] Lỗi lưu trữ ảnh quét lại:", err);
                    }
                };
                
                // Gọi mà không await để không làm chậm UI chính
                triggerArchival();
            }

            await onConfirm(
                order, 
                contractFile, 
                proposalFile, 
                policy, 
                getRawValue(commission), 
                getRawValue(vpoint), 
                '', 
                payloadsRef.current,
                xeXangVin.trim() || undefined,
                xeXangHang.trim() || undefined,
                xeXangModel.trim() || undefined
            );
            sessionStorage.removeItem(`invoice_draft_${order["Số đơn hàng"]}`);
            setProcessingStage(4);
            await new Promise(r => setTimeout(r, 1500));
            onClose();
        } catch (error) {
            setIsSubmitting(false);
            setProcessingStage(0);
        }
    };

    const ProcessingStep = ({ label, status }: { label: string, status: 'pending' | 'active' | 'completed' }) => {
        let icon = "fa-circle text-border-secondary";
        let textClass = "text-text-secondary";
        let bgClass = "bg-surface-ground";
        if (status === 'active') {
            icon = "fa-spinner fa-spin text-accent-primary";
            textClass = "text-accent-primary font-semibold";
            bgClass = "bg-accent-primary/5 border-accent-primary/20";
        } else if (status === 'completed') {
            icon = "fa-check-circle text-success";
            textClass = "text-text-primary font-medium";
            bgClass = "bg-success/5 border-success/20";
        }
        return (
            <div className={`flex items-center p-3 rounded-lg border ${status === 'pending' ? 'border-transparent' : 'border-border-secondary'} ${bgClass} transition-all duration-300`}>
                <div className="w-8 flex justify-center mr-3"><i className={`fas ${icon} text-lg`}></i></div>
                <span className={`${textClass}`}>{label}</span>
            </div>
        );
    };

    if (isSubmitting) {
        return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center animate-fade-in overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900/40 via-blue-900/30 to-slate-800/40">
                    <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-gradient-to-br from-blue-500/15 to-cyan-500/10 rounded-full blur-3xl animate-pulse" />
                    <div className="absolute bottom-0 right-0 w-[700px] h-[700px] bg-gradient-to-tl from-purple-500/15 to-pink-500/10 rounded-full blur-3xl animate-pulse" />
                </div>
                <div className="relative z-10 bg-white/95 backdrop-blur-3xl w-full max-w-md rounded-2xl shadow-2xl p-6 flex flex-col items-center animate-fade-in-scale-up border border-white/20">
                    <div className="w-16 h-16 mb-4 relative">
                        <div className="absolute inset-0 rounded-full border-4 border-border-primary"></div>
                        <div className={`absolute inset-0 rounded-full border-4 ${processingStage === 4 ? 'border-success' : 'border-accent-primary border-t-transparent animate-spin'}`}></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <i className={`fas ${processingStage === 4 ? 'fa-check text-success' : 'fa-paper-plane text-accent-primary'} text-xl`}></i>
                        </div>
                    </div>
                    <h3 className="text-lg font-bold text-text-primary mb-1">{processingStage === 4 ? 'Hoàn tất!' : 'Đang xử lý hồ sơ'}</h3>
                    <p className="text-sm text-text-secondary mb-6">{processingStage === 4 ? 'Yêu cầu đã được gửi thành công.' : 'Vui lòng không tắt trình duyệt...'}</p>
                    <div className="w-full space-y-3">
                        <ProcessingStep label="Xử lý Hợp đồng mua bán" status={processingStage > 1 ? 'completed' : processingStage === 1 ? 'active' : 'pending'} />
                        <ProcessingStep label="Xử lý Đề nghị xuất hóa đơn" status={processingStage > 2 ? 'completed' : processingStage === 2 ? 'active' : 'pending'} />
                        <ProcessingStep label="Đang gửi dữ liệu..." status={processingStage > 3 ? 'completed' : processingStage === 3 ? 'active' : 'pending'} />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center animate-fade-in overflow-hidden" onClick={onClose}>
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900/40 via-blue-900/30 to-slate-800/40">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/20" />
            </div>

            <div className="relative z-10 w-full max-w-7xl mx-auto px-2 md:px-4 py-8 flex flex-col justify-center min-h-[100dvh] pointer-events-none">
                <div className="flex flex-col w-full h-[90vh] animate-fade-in-scale-up pointer-events-auto border border-white/20 rounded-2xl overflow-hidden shadow-2xl bg-white/95 backdrop-blur-3xl relative" onClick={e => e.stopPropagation()}>
                    <header className="flex-shrink-0">
                        <div className="bg-gradient-to-r from-blue-50 via-white to-blue-50 p-4 md:p-5 border-b border-blue-200/30 shadow-sm relative overflow-hidden group">
                            <div className="flex items-center justify-between relative z-10">
                                <div className="flex items-center gap-4">
                                    <div className="w-1.5 h-10 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full shadow-sm"></div>
                                    <div className="flex flex-col">
                                        <h1 className="text-xl md:text-2xl font-extrabold text-slate-800 tracking-tight">
                                            YÊU CẦU <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-800">XUẤT HÓA ĐƠN</span>
                                        </h1>
                                        <p className="text-[10px] md:text-xs text-text-secondary font-bold uppercase tracking-wider mt-0.5">Cung cấp chứng từ để tiến hành xuất hóa đơn</p>
                                    </div>
                                </div>
                                <button onClick={onClose} className="w-10 h-10 rounded-full flex items-center justify-center bg-white/50 hover:bg-white text-gray-400 hover:text-gray-900 transition-all hover:rotate-90 hover:scale-110 shadow-sm border border-gray-100">
                                    <i className="fas fa-times text-xl"></i>
                                </button>
                            </div>
                        </div>
                    </header>

                    <main className="flex-grow min-h-0 flex flex-col overflow-hidden relative z-10 p-3 md:p-5">
                        <div className="flex flex-col mb-3 space-y-1.5 md:space-y-2">
                            <Stepper currentStep={step} hasVinClub={vinClubConfirmed} />
                            <div className="bg-white rounded-[10px] border-l-4 border-l-blue-500 border-y border-r border-gray-200 p-2.5 md:p-3 shadow-sm flex-shrink-0 bg-gradient-to-r from-blue-50/40 to-white">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-3 relative z-10 items-center">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] uppercase tracking-wider text-text-secondary/80 font-semibold mb-0.5">Số đơn hàng</span>
                                        <div className="flex items-center gap-1.5 text-blue-700">
                                            <i className="fas fa-barcode opacity-60 text-[10px]"></i>
                                            <span className="font-bold font-mono tracking-tight text-[13px]">{order["Số đơn hàng"]}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col md:border-l md:border-gray-200 md:pl-3">
                                        <span className="text-[9px] uppercase tracking-wider text-text-secondary/80 font-semibold mb-0.5">Khách hàng</span>
                                        <div className="flex items-center gap-1.5 text-text-primary">
                                            <i className="fas fa-user text-blue-600 opacity-60 text-[10px]"></i>
                                            <span className="font-semibold truncate text-[13px]">{order["Tên khách hàng"]}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col md:border-l md:border-gray-200 md:pl-3">
                                        <span className="text-[9px] uppercase tracking-wider text-text-secondary/80 font-semibold mb-0.5">Số VIN</span>
                                        <div className="flex items-center gap-1.5 text-text-primary">
                                            <i className="fas fa-car text-blue-600 opacity-60 text-[10px]"></i>
                                            <span className="font-semibold font-mono tracking-tight text-[13px]">{order.VIN || '---'}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col md:border-l md:border-gray-200 md:pl-3">
                                        <span className="text-[9px] uppercase tracking-wider text-text-secondary/80 font-semibold mb-0.5">Số máy</span>
                                        <div className="flex items-center gap-1.5 text-text-primary">
                                            <i className="fas fa-cog text-blue-600 opacity-60 text-[10px]"></i>
                                            <span className="font-semibold tracking-tight font-mono text-[13px]">{order["Số máy"] || '---'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex-grow overflow-hidden flex flex-col">
                            {/* STEP 1 */}
                            <div style={{ display: step === 1 ? 'flex' : 'none' }} className="flex-col h-full overflow-hidden">
                                <div className="flex flex-col bg-white/60 p-5 md:p-8 rounded-2xl border border-gray-200/60 shadow-sm flex-grow overflow-y-auto custom-scrollbar">
                                    <div className="flex flex-col min-h-full gap-8">
                                        <div className="flex flex-col">
                                            <label className="block text-sm font-bold text-text-primary mb-3 uppercase tracking-wider">
                                                Chính sách bán hàng áp dụng <span className="text-danger">*</span>
                                            </label>
                                            <div className="p-3 bg-surface-ground rounded-xl border border-border-primary shadow-inner max-h-[220px] overflow-y-auto custom-scrollbar">
                                                {isLoadingPolicies ? (
                                                    <div className="flex items-center justify-center py-6 text-text-secondary">
                                                        <i className="fas fa-spinner fa-spin mr-3 text-xl"></i>
                                                        <span className="font-medium">Đang tải danh sách chính sách...</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-wrap gap-2">
                                                        {filteredSalesPolicies.map(option => (
                                                            <button 
                                                                key={option} 
                                                                type="button" 
                                                                onClick={() => {
                                                                    setPolicy(prev => prev.includes(option) ? prev.filter(p => p !== option) : [...prev, option]);
                                                                }} 
                                                                className={`px-3 py-1.5 text-[11px] font-bold rounded-lg border-2 transition-all duration-300 shadow-sm flex items-center gap-2 ${
                                                                    policy.includes(option) 
                                                                        ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-[0_0_10px_rgba(59,130,246,0.15)] scale-[1.02]' 
                                                                        : 'bg-white border-border-secondary text-text-secondary hover:border-blue-300 hover:text-blue-600'
                                                                }`}
                                                            >
                                                                <i className={`fas ${policy.includes(option) ? 'fa-check-circle text-blue-600' : 'fa-plus-circle opacity-30'}`}></i>
                                                                {option}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 pt-2 border-t border-gray-100">
                                            <div className="group">
                                                <label className="block text-[10px] font-bold text-text-primary mb-1 uppercase tracking-wider flex items-center gap-2">
                                                    <i className="fas fa-money-bill-wave text-emerald-500"></i>
                                                    Hoa hồng ứng trước (VND) *
                                                </label>
                                                <div className="relative">
                                                    <input 
                                                        type="text" 
                                                        value={commission} 
                                                        onChange={handleNumberChange(setCommission)} 
                                                        className="w-full bg-surface-ground border border-border-primary rounded-lg p-1.5 px-3 text-sm font-bold text-blue-700 focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/10 transition-all outline-none" 
                                                        placeholder="0" 
                                                    />
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 font-black text-gray-400 pointer-events-none uppercase text-[9px]">VNĐ</div>
                                                </div>
                                            </div>
                                            <div className="group">
                                                <label className="block text-[10px] font-bold text-text-primary mb-1 uppercase tracking-wider flex items-center gap-2">
                                                    <i className="fas fa-star text-purple-500"></i>
                                                    Số điểm Vpoint sử dụng *
                                                </label>
                                                <div className="relative">
                                                    <input 
                                                        type="text" 
                                                        value={vpoint} 
                                                        onChange={handleNumberChange(setVpoint)} 
                                                        className="w-full bg-surface-ground border border-border-primary rounded-lg p-1.5 px-3 text-sm font-bold text-purple-700 focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/10 transition-all outline-none" 
                                                        placeholder="0" 
                                                    />
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 font-black text-gray-400 pointer-events-none uppercase text-[9px]">ĐIỂM</div>
                                                </div>
                                            </div>
                                        </div>

                                        {isGasToElectricPolicy && (
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-gray-100 mt-1 animate-fade-in">
                                                <div className="group relative">
                                                    <label className="block text-[10px] font-bold text-text-primary mb-1 uppercase tracking-wider">
                                                        <i className="fas fa-barcode text-amber-500 mr-1"></i> Số VIN xe xăng *
                                                        {isCheckingVin && <i className="fas fa-spinner fa-spin ml-2 text-blue-500"></i>}
                                                    </label>
                                                    <input 
                                                        type="text" 
                                                        value={xeXangVin} 
                                                        onChange={(e) => setXeXangVin(e.target.value.toUpperCase())} 
                                                        className={`w-full bg-surface-ground border rounded-lg p-2 text-sm font-bold text-slate-800 outline-none focus:ring-1 transition-all font-mono tracking-tight placeholder:italic placeholder:font-normal placeholder:text-[11px] placeholder:text-slate-400 ${
                                                            vinCheckError 
                                                                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' 
                                                                : 'border-border-primary focus:border-amber-500 focus:ring-amber-500/30'
                                                        }`}
                                                        placeholder="VD: VIN123..." 
                                                    />
                                                    {vinCheckError && (
                                                        <p className="text-[10px] text-red-600 font-bold mt-1 leading-normal flex items-start gap-1">
                                                            <i className="fas fa-exclamation-triangle mt-0.5 flex-shrink-0"></i>
                                                            <span>{vinCheckError}</span>
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="group">
                                                    <label className="block text-[10px] font-bold text-text-primary mb-1 uppercase tracking-wider">
                                                        <i className="fas fa-car text-amber-500 mr-1"></i> Hãng xe xăng *
                                                    </label>
                                                    <input 
                                                        type="text" 
                                                        value={xeXangHang} 
                                                        onChange={(e) => setXeXangHang(e.target.value)} 
                                                        className="w-full bg-surface-ground border border-border-primary rounded-lg p-2 text-sm font-semibold text-slate-800 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all placeholder:italic placeholder:font-normal placeholder:text-[11px] placeholder:text-slate-400" 
                                                        placeholder="VD: Toyota" 
                                                    />
                                                </div>
                                                <div className="group">
                                                    <label className="block text-[10px] font-bold text-text-primary mb-1 uppercase tracking-wider">
                                                        <i className="fas fa-cog text-amber-500 mr-1"></i> Model xe xăng *
                                                    </label>
                                                    <input 
                                                        type="text" 
                                                        value={xeXangModel} 
                                                        onChange={(e) => setXeXangModel(e.target.value)} 
                                                        className="w-full bg-surface-ground border border-border-primary rounded-lg p-2 text-sm font-semibold text-slate-800 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all placeholder:italic placeholder:font-normal placeholder:text-[11px] placeholder:text-slate-400" 
                                                        placeholder="VD: Camry" 
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* STEP 2 */}
                            <div style={{ display: step === 2 ? 'flex' : 'none' }} className="flex-col h-full overflow-hidden">
                                <div className="flex flex-col bg-white/60 p-5 md:p-8 rounded-2xl border border-gray-200/60 shadow-sm flex-grow overflow-hidden">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-grow">
                                        <SimpleFileUpload 
                                            id="hop_dong_file_input" 
                                            label="Hợp đồng mua bán" 
                                            onFileSelect={handleContractFileSelect} 
                                            required 
                                            accept=".pdf,image/*" 
                                            disableCompression={true} 
                                            showPreview={false}
                                            className="flex flex-col h-full"
                                        />
                                        <SimpleFileUpload 
                                            id="denghi_xhd_file_input" 
                                            label="Đề nghị xuất hóa đơn" 
                                            onFileSelect={handleProposalFileSelect} 
                                            required 
                                            accept=".pdf,image/*" 
                                            disableCompression={true} 
                                            showPreview={false}
                                            className="flex flex-col h-full"
                                        />
                                    </div>
                                    <div className="mt-8 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 text-[13px] text-blue-700 shadow-sm flex-shrink-0">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                                                <i className="fas fa-info-circle text-lg"></i>
                                            </div>
                                            <p className="font-medium leading-relaxed">
                                                Vui lòng tải lên bản scan hoặc ảnh chụp rõ nét của HĐMB và Đề nghị xuất hóa đơn. <br/>
                                                Hệ thống sẽ tự động đối soát thông tin sau khi anh chị nhấn gửi yêu cầu.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* STEP 3 */}
                            <div style={{ display: step === 3 ? 'flex' : 'none' }} className="flex-col h-full overflow-hidden">
                                <div className="flex flex-col bg-white/60 p-5 md:p-6 rounded-2xl border border-gray-200/60 shadow-sm flex-grow overflow-hidden">
                                    <div className="flex flex-col h-full gap-5">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 flex-grow overflow-hidden">
                                            {/* Left Card: Documents & Financials */}
                                            <div className="flex flex-col h-full gap-4">
                                                <div className="bg-surface-ground p-5 rounded-2xl border border-border-primary flex-grow flex flex-col overflow-hidden">
                                                    <p className="text-[10px] text-text-secondary mb-3 font-black uppercase tracking-[0.2em] border-b border-border-secondary pb-2">Hồ sơ & Tài chính</p>
                                                    
                                                    <div className="space-y-3 mb-6">
                                                        <div className="flex items-center gap-3 p-2.5 bg-white rounded-xl border border-border-secondary shadow-sm">
                                                            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600">
                                                                <i className="fas fa-file-contract text-sm"></i>
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-[9px] font-black text-gray-400 uppercase">Hợp đồng mua bán</p>
                                                                <p className="text-[11px] font-bold text-text-primary truncate">{contractFile?.name || 'Chưa tải lên'}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3 p-2.5 bg-white rounded-xl border border-border-secondary shadow-sm">
                                                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                                                                <i className="fas fa-file-invoice text-sm"></i>
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-[9px] font-black text-gray-400 uppercase">Đề nghị xuất hóa đơn</p>
                                                                <p className="text-[11px] font-bold text-text-primary truncate">{proposalFile?.name || 'Chưa tải lên'}</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="mt-auto pt-4 border-t border-dashed border-gray-200">
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Hoa hồng ứng</p>
                                                                <p className="text-sm font-black text-blue-600">{commission ? `${parseInt(getRawValue(commission)).toLocaleString('vi-VN')} đ` : '0 đ'}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Vpoint</p>
                                                                <p className="text-sm font-black text-purple-600">{vpoint ? `${parseInt(getRawValue(vpoint)).toLocaleString('vi-VN')} điểm` : '0 điểm'}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Right Card: Policies List */}
                                            <div className="flex flex-col h-full gap-4">
                                                <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 p-5 rounded-2xl border border-blue-100 flex-grow flex flex-col overflow-hidden shadow-sm">
                                                    <p className="text-[10px] text-blue-500 mb-3 font-black uppercase tracking-[0.2em] border-b border-blue-200/30 pb-2">Danh sách chính sách áp dụng</p>
                                                    <div className="flex-grow overflow-y-auto custom-scrollbar pr-2">
                                                        <div className="space-y-2">
                                                            {policy.length > 0 ? policy.map((p, idx) => (
                                                                <div key={idx} className="flex items-start gap-3 p-3 bg-white/80 rounded-xl border border-blue-50 shadow-sm group hover:border-blue-300 transition-colors">
                                                                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0 mt-0.5">
                                                                        <span className="text-[10px] font-black">{idx + 1}</span>
                                                                    </div>
                                                                    <p className="text-[11px] font-bold text-slate-700 leading-relaxed">{p}</p>
                                                                </div>
                                                            )) : (
                                                                <div className="flex flex-col items-center justify-center h-full py-10 text-gray-400 opacity-50">
                                                                    <i className="fas fa-clipboard-list text-4xl mb-2"></i>
                                                                    <p className="text-xs font-bold uppercase tracking-widest">Chưa chọn chính sách</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Vinclub Confirm */}
                                        <div className="relative p-4 rounded-xl border-2 border-accent-primary/20 bg-accent-primary/5 hover:bg-accent-primary/10 transition-colors cursor-pointer group flex-shrink-0" onClick={() => setVinClubConfirmed(!vinClubConfirmed)}>
                                            <div className="flex items-center gap-4">
                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${vinClubConfirmed ? 'bg-accent-primary border-accent-primary text-white scale-110' : 'bg-white border-gray-300'}`}>
                                                    {vinClubConfirmed && <i className="fas fa-check text-[10px]"></i>}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-text-primary uppercase tracking-wider text-[11px]">Tôi xác nhận khách hàng đã tạo tài khoản Vinclub.</p>
                                                    <p className="text-[9px] text-accent-primary font-bold opacity-80">Điều kiện bắt buộc để tiếp tục xử lý hồ sơ.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </main>

                    <footer className="flex-shrink-0 p-4 border-t border-gray-100 bg-white flex justify-between items-center">
                        {step > 1 ? (
                            <Button onClick={handleBack} disabled={isSubmitting} variant="secondary" size="sm" leftIcon={<i className="fas fa-arrow-left"></i>}>Quay lại</Button>
                        ) : (
                            <Button onClick={onClose} disabled={isSubmitting} variant="secondary" size="sm">Hủy</Button>
                        )}

                        {step < 3 ? (
                            <Button onClick={handleNext} disabled={isSubmitting || (step === 1 && !isStep1Valid) || (step === 2 && !isStep2Valid)} variant="primary" size="sm" rightIcon={<i className="fas fa-arrow-right"></i>}>Tiếp theo</Button>
                        ) : (
                            <Button onClick={handleSubmit} disabled={isSubmitting || !isFormValid} variant="success" size="sm" isLoading={isSubmitting} leftIcon={<i className="fas fa-paper-plane"></i>}>Gửi Yêu Cầu</Button>
                        )}
                    </footer>
                </div>
            </div>
        </div>
    );
};

export default RequestInvoiceModal;