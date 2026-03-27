import React, { useState, useEffect, useMemo } from 'react';
import { Order } from '../../types';
import SimpleFileUpload from '../ui/SimpleFileUpload';
import Button from '../ui/Button';
import * as apiService from '../../services/apiService';
import { extractDocumentWithGemini, compareDocumentWithOrder } from '../../utils/aiGeminiPdfScanner';

interface RequestInvoiceModalProps {
    order: Order;
    onClose: () => void;
    onConfirm: (order: Order, contractFile: File, proposalFile: File, policy: string[], commission: string, vpoint: string, aiNote?: string) => Promise<any>;
    stockData?: any[]; // Optional to avoid strict type breaking if not passed immediately, but aimed for StockVehicle[]
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
}



const Stepper: React.FC<{ currentStep: number }> = ({ currentStep }) => {
    const steps = ["Thông tin BH", "Tải chứng từ", "Xác nhận"];
    return (
        <div className="flex justify-between items-center mb-1 relative px-4 md:px-12 opacity-80 hover:opacity-100 transition-opacity">
            {/* Background line */}
            <div className="absolute left-12 md:left-20 right-12 md:right-20 top-[10px] transform -translate-y-1/2 h-[1px] bg-gray-200 -z-10"></div>
            {/* Active line */}
            <div className="absolute left-12 md:left-20 top-[10px] transform -translate-y-1/2 h-[1.5px] bg-blue-500 transition-all duration-700 ease-in-out -z-10" style={{ width: `calc(${((currentStep - 1) / (steps.length - 1)) * 100}% - ${0}px)` }}></div>
            
            {steps.map((label, index) => {
                const stepNumber = index + 1;
                const isActive = stepNumber === currentStep;
                const isCompleted = stepNumber < currentStep;
                
                return (
                    <div key={stepNumber} className="flex flex-col items-center relative z-10 w-16 md:w-20">
                        <div className={`w-5 h-5 flex items-center justify-center font-bold text-[9px] rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-all duration-500 ${isCompleted ? 'bg-emerald-500 text-white' : isActive ? 'bg-blue-600 text-white scale-110 shadow-blue-500/20' : 'bg-gray-100 text-gray-400 border border-gray-200'}`}>
                            {isCompleted ? <i className="fas fa-check text-[8px]"></i> : stepNumber}
                        </div>
                        <span className={`mt-1 font-semibold text-[8px] md:text-[9px] uppercase tracking-wider text-center transition-colors duration-300 ${isActive ? 'text-blue-700 font-bold' : isCompleted ? 'text-emerald-600' : 'text-gray-400'}`}>{label}</span>
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
    
    // AI Scanner state
    const [isScanning, setIsScanning] = useState(false);
    const [scanResult, setScanResult] = useState<{ isValid: boolean, mismatches: string[], rawData: any } | null>(null);

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
                    console.error("Failed to fetch sales policies:", result.message);
                    setSalesPoliciesOptions([]);
                }
            } catch (error) {
                console.error("Error fetching sales policies:", error);
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
            // Áp dụng cho tất cả dòng xe
            const dxLower = policy.dong_xe.toLowerCase().trim();
            return dxLower.includes('tất cả') || dxLower === 'all';
        });

        const result = [...new Set([...specificPolicies, ...genericPolicies].map(p => p.ten_chinh_sach))];

        if (result.length > 0) {
            return result.sort();
        }

        return salesPoliciesOptions.map(p => p.ten_chinh_sach).sort();
    }, [order, salesPoliciesOptions]);

    useEffect(() => {
        // When filtered policies change, remove any selected policies that are no longer in the list.
        if (filteredSalesPolicies.length > 0) {
            setPolicy(currentSelection => currentSelection.filter(p => filteredSalesPolicies.includes(p)));
        }
    }, [filteredSalesPolicies]);


    const [processingStage, setProcessingStage] = useState(0); // 0: Idle, 1: Contract, 2: Proposal, 3: Sending

    const formatNumber = (value: string) => {
        // Remove non-digit characters
        const cleanValue = value.replace(/\D/g, '');
        // Format with dots
        return cleanValue.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    };

    const handleNumberChange = (setter: (value: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        // Allow only numbers and control keys (handled by input type text but good to enforce)
        // We format the input value
        setter(formatNumber(value));
    };

    const getRawValue = (value: string) => {
        return value.replace(/\./g, '');
    };

    const isStep1Valid = policy.length > 0 && commission && parseFloat(getRawValue(commission)) >= 0 && vpoint && parseFloat(getRawValue(vpoint)) >= 0;
    const isStep2Valid = contractFile && proposalFile;
    const isStep3Valid = vinClubConfirmed;
    const isFormValid = isStep1Valid && isStep2Valid && isStep3Valid;
    const hasErrors = !!(scanResult && !scanResult.isValid && (scanResult.mismatches || []).length > 0);

    // Load saved data on mount
    useEffect(() => {
        const savedData = sessionStorage.getItem(`invoice_draft_${order["Số đơn hàng"]}`);
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                if (parsed.policy) setPolicy(parsed.policy);
                if (parsed.commission) setCommission(parsed.commission);
                if (parsed.vpoint) setVpoint(parsed.vpoint);
            } catch (e) {
                console.error("Failed to parse saved invoice draft", e);
            }
        }
    }, [order]);

    // Save data on change
    useEffect(() => {
        const dataToSave = { policy, commission, vpoint };
        sessionStorage.setItem(`invoice_draft_${order["Số đơn hàng"]}`, JSON.stringify(dataToSave));
    }, [policy, commission, vpoint, order]);

    const scanSingleFile = async (file: File, fileLabel: string) => {
        setIsScanning(true);
        try {
            const data = await extractDocumentWithGemini(file);
            const { isValid: docValid, mismatches } = compareDocumentWithOrder(data, order);
            
            // Gắn thêm tên file để nhận diện lỗi trên file nào và tránh trùng lặp
            const prefixedMismatches = mismatches.map(m => `[${fileLabel}] ${m}`);
            
            setScanResult(prev => {
                const prevMismatches = prev ? (prev.mismatches || []) : [];
                // Filter out previous mismatches for THIS specific file label to avoid accumulation
                const filteredOtherFileMismatches = prevMismatches.filter(m => !m.startsWith(`[${fileLabel}]`));
                const prevRawData = prev ? (prev.rawData || {}) : {};
                
                return {
                    isValid: docValid, // This will be improved by a full check if needed, but for now simple
                    mismatches: [...new Set([...filteredOtherFileMismatches, ...prefixedMismatches])],
                    rawData: { ...prevRawData, ...data }
                };
            });
            
        } catch (e: any) {
            showToast('Lỗi tự động quét', e.message || 'Quét thất bại', 'error');
        } finally {
            setIsScanning(false);
        }
    };

    const handleContractFileSelect = async (file: File | null) => {
        setContractFile(file);
        if (file) {
            scanSingleFile(file, 'HĐMB');
        } else {
            // Remove HĐMB errors if file is cleared
            setScanResult(prev => prev ? {
                ...prev,
                mismatches: (prev.mismatches || []).filter(m => !m.startsWith('[HĐMB]'))
            } : null);
        }
    };

    const handleProposalFileSelect = async (file: File | null) => {
        setProposalFile(file);
        if (file) {
            scanSingleFile(file, 'ĐNXHĐ');
        } else {
            // Remove ĐNXHĐ errors if file is cleared
            setScanResult(prev => prev ? {
                ...prev,
                mismatches: (prev.mismatches || []).filter(m => !m.startsWith('[ĐNXHĐ]'))
            } : null);
        }
    };

    const handleNext = () => setStep(prev => Math.min(prev + 1, 3));
    const handleBack = () => setStep(prev => Math.max(prev - 1, 1));

    const handleSubmit = async () => {
        if (!isFormValid || !contractFile || !proposalFile) {
            showToast('Thiếu Thông Tin', "Vui lòng hoàn thành tất cả các bước.", 'warning');
            return;
        }

        // DMS Validation Logic
        if (stockData && stockData.length > 0 && order.VIN) {
            const vehicle = stockData.find(v => v.VIN === order.VIN);
            if (vehicle) {
                // Try to find DMS Code field - handling potential naming variations
                const dmsCode = vehicle['Mã DMS'] || vehicle['Mã DMS'] || vehicle['DMS Code'] || vehicle['Mã đơn hàng'] || '';
                // Getting the first 6 characters of the order number
                const orderPrefix = order["Số đơn hàng"] ? order["Số đơn hàng"].trim().substring(0, 6) : '';

                if (dmsCode && orderPrefix) {
                    if (dmsCode.trim().toUpperCase() !== orderPrefix.toUpperCase()) {
                        showToast('Sai Mã DMS', `Anh chị vui lòng tạo lại đơn hàng đúng đầu DMS (${dmsCode})`, 'error', 10000); // 10s duration for visibility
                        return; // Block submission
                    }
                } else if (!dmsCode) {
                    // Warn if DMS code is missing on vehicle but proceed? Or strict?
                    // User request implies strict check "nếu sai thì chặn". 
                    // If DMS is missing, we can't verify. I'll log warning but maybe let it pass or block?
                    // Let's assume strictness only on mismatch. If missing, maybe it's old data. 
                    // But safer to alert "Check carefully".
                    // For now, only block on EXPLICIT mismatch.
                    console.warn("Could not find DMS Code for vehicle", order.VIN);
                }
            } else {
                console.warn("Could not find vehicle in stock data", order.VIN);
            }
        }

        setIsSubmitting(true);

        try {
            // Simulate detailed steps
            setProcessingStage(1); // Processing Contract
            await new Promise(r => setTimeout(r, 800));

            setProcessingStage(2); // Processing Proposal
            await new Promise(r => setTimeout(r, 800));

            setProcessingStage(3); // Sending
            
            // Nếu có cảnh báo tự động mà TVBH vẫn cố gửi, đính kèm cảnh báo vào cuối trường chính sách (làm bằng chứng/note cho Admin)
            let aiNote = '';
            if (scanResult) {
                if (scanResult.mismatches && scanResult.mismatches.length > 0) {
                    aiNote = '⚠️ ' + scanResult.mismatches.join(' | ');
                } else if (scanResult.isValid) {
                    aiNote = '✅ Khớp 100% chứng từ, không phát hiện sai lệch.';
                }
            }
            const policyToSubmit = policy;

            // Send raw values (without dots) to API
            await onConfirm(order, contractFile, proposalFile, policyToSubmit, getRawValue(commission), getRawValue(vpoint), aiNote);

            // Clear saved draft on success
            sessionStorage.removeItem(`invoice_draft_${order["Số đơn hàng"]}`);

            setProcessingStage(4); // Done
            await new Promise(r => setTimeout(r, 2000)); // Wait 2 seconds
            onClose();
        } catch (error) {
            console.error("Submission failed", error);
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
                <div className="w-8 flex justify-center mr-3">
                    <i className={`fas ${icon} text-lg transition-all duration-300`}></i>
                </div>
                <span className={`${textClass} transition-all duration-300`}>{label}</span>
            </div>
        );
    };

    if (isSubmitting) {
        return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center animate-fade-in overflow-hidden">
                {/* Full-Screen Animated Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900/40 via-blue-900/30 to-slate-800/40">
                    <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-gradient-to-br from-blue-500/15 to-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
                    <div className="absolute bottom-0 right-0 w-[700px] h-[700px] bg-gradient-to-tl from-purple-500/15 to-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '12s', animationDelay: '4s' }} />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/20" />
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
                        <ProcessingStep
                            label="Xử lý Hợp đồng mua bán"
                            status={processingStage > 1 ? 'completed' : processingStage === 1 ? 'active' : 'pending'}
                        />
                        <ProcessingStep
                            label="Xử lý Đề nghị xuất hóa đơn"
                            status={processingStage > 2 ? 'completed' : processingStage === 2 ? 'active' : 'pending'}
                        />
                        <ProcessingStep
                            label="Đang gửi dữ liệu..."
                            status={processingStage > 3 ? 'completed' : processingStage === 3 ? 'active' : 'pending'}
                        />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center animate-fade-in overflow-hidden"
            onClick={onClose}
        >
            {/* Full-Screen Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900/40 via-blue-900/30 to-slate-800/40">
                {/* Animated Gradient Orbs */}
                <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-gradient-to-br from-blue-500/15 to-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
                <div className="absolute bottom-0 right-0 w-[700px] h-[700px] bg-gradient-to-tl from-purple-500/15 to-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '12s', animationDelay: '4s' }} />

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/20" />
            </div>

            {/* Floating Content Container */}
            <div
                className="relative z-10 w-full max-w-7xl mx-auto px-2 md:px-4 py-8 flex flex-col justify-center min-h-[100dvh] pointer-events-none"
            >
                <div
                    className="flex flex-col w-full h-[90vh] animate-fade-in-scale-up pointer-events-auto border border-white/20 rounded-2xl overflow-hidden shadow-2xl bg-white/95 backdrop-blur-3xl relative"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Grid Background */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000005_1px,transparent_1px),linear-gradient(to_bottom,#00000005_1px,transparent_1px)] bg-[size:128px_128px] pointer-events-none"></div>
                    <header className="flex-shrink-0">
                        <div className="bg-gradient-to-r from-blue-50 via-white to-blue-50 p-4 md:p-5 border-b border-blue-200/30 shadow-sm relative overflow-hidden group">
                            {/* Decorative background element */}
                            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-blue-400/10 rounded-full blur-2xl pointer-events-none group-hover:bg-blue-400/20 transition-all duration-700"></div>

                            <div className="flex items-center justify-between relative z-10">
                                {/* Branding Layout from Details Modal */}
                                <div className="flex items-center gap-4">
                                    <div className="w-1.5 h-10 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full shadow-sm"></div>
                                    <div className="flex flex-col">
                                        <h1 className="text-xl md:text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                                            YÊU CẦU <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-800">XUẤT HÓA ĐƠN</span>
                                        </h1>
                                        <p className="text-[10px] md:text-xs text-text-secondary font-bold uppercase tracking-wider mt-0.5">Cung cấp chứng từ để tiến hành xuất hóa đơn</p>
                                    </div>
                                </div>

                                {/* Close Button Style from Details Modal */}
                                <button
                                    onClick={onClose}
                                    className="w-10 h-10 rounded-full flex items-center justify-center bg-white/50 hover:bg-white text-gray-400 hover:text-gray-900 transition-all hover:rotate-90 hover:scale-110 shadow-sm border border-gray-100"
                                >
                                    <i className="fas fa-times text-xl"></i>
                                </button>
                            </div>
                        </div>
                    </header>

                    <main className="flex-grow min-h-0 flex flex-col overflow-hidden relative z-10">
                        <div className="flex-grow flex flex-col overflow-hidden p-3 md:p-5">
                            <div className="flex flex-col mb-3 space-y-1.5 md:space-y-2">
                                <Stepper currentStep={step} />

                                <div className="bg-white rounded-[10px] border-l-4 border-l-blue-500 border-y border-r border-gray-200 p-2.5 md:p-3 relative overflow-hidden shadow-sm flex-shrink-0 bg-gradient-to-r from-blue-50/40 to-white">
                                    <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none">
                                        <i className="fas fa-file-invoice-dollar text-5xl text-blue-600 transform rotate-12"></i>
                                    </div>
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
                                                <span className="font-semibold truncate text-[13px]" title={order["Tên khách hàng"]}>{order["Tên khách hàng"]}</span>
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

                            <div style={{ display: step === 1 ? 'flex' : 'none' }} className="flex-col overflow-y-auto custom-scrollbar h-full">
                                <h3 className="font-semibold text-text-primary text-sm md:text-base mb-2 md:mb-3">1. Thông tin Bán hàng</h3>
                                <div className="space-y-3 md:space-y-4">
                                    <div>
                                        <label className="block text-xs md:text-sm font-medium text-text-primary mb-1.5 md:mb-2">
                                            Chính sách bán hàng <span className="text-danger">*</span>
                                        </label>
                                        {isLoadingPolicies ? (
                                            <div className="flex items-center gap-2 text-sm text-text-secondary p-2 bg-surface-ground rounded-lg">
                                                <i className="fas fa-spinner fa-spin"></i>
                                                <span>Đang tải danh sách chính sách...</span>
                                            </div>
                                        ) : (
                                            <div className="flex flex-wrap gap-2 p-2 bg-surface-ground rounded-lg border border-border-primary">
                                                {filteredSalesPolicies.length > 0 ? filteredSalesPolicies.map(option => {
                                                    const isSelected = policy.includes(option);
                                                    return (
                                                        <button
                                                            type="button"
                                                            key={option}
                                                            onClick={() => {
                                                                const newSelection = isSelected
                                                                    ? policy.filter(p => p !== option)
                                                                    : [...policy, option];
                                                                setPolicy(newSelection);
                                                            }}
                                                            className={`group inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-full border cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-primary
                                                            ${isSelected
                                                                    ? 'bg-accent-primary border-accent-primary text-white shadow-sm hover:bg-accent-primary-hover'
                                                                    : 'bg-white border-border-secondary text-text-secondary hover:border-accent-primary hover:text-accent-primary'
                                                                }
                                                        `}
                                                        >
                                                            <i className={`fas ${isSelected ? 'fa-check-circle' : 'fa-plus-circle'} transition-transform duration-200 ${!isSelected ? 'group-hover:rotate-90' : ''}`}></i>
                                                            {option}
                                                        </button>
                                                    )
                                                }) : (
                                                    <p className="text-xs text-text-secondary">Không tìm thấy chính sách nào phù hợp.</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="commission-amount" className="block text-sm font-medium text-text-primary mb-1.5 md:mb-2">
                                                Hoa hồng ứng trước (VND) <span className="text-danger">*</span>
                                            </label>
                                            <input id="commission-amount" type="text" value={commission} onChange={handleNumberChange(setCommission)}
                                                className="w-full bg-surface-ground border border-border-primary rounded-lg p-2.5 futuristic-input"
                                                placeholder="Nhập số tiền" required
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="vpoint-amount" className="block text-sm font-medium text-text-primary mb-1.5 md:mb-2">
                                                Số điểm Vpoint sử dụng (Điểm) <span className="text-danger">*</span>
                                            </label>
                                            <input id="vpoint-amount" type="text" value={vpoint} onChange={handleNumberChange(setVpoint)}
                                                className="w-full bg-surface-ground border border-border-primary rounded-lg p-2.5 futuristic-input"
                                                placeholder="Nhập số điểm" required
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: step === 2 ? 'flex' : 'none' }} className="flex-col h-full overflow-hidden gap-3">
                                <div className={`flex flex-col bg-white/60 ${hasErrors ? 'p-2' : 'p-4 md:p-5'} rounded-xl border border-gray-200/60 shadow-sm transition-all duration-300`}>
                                    <div className={`flex items-center justify-between ${hasErrors ? 'mb-1 items-end' : 'mb-3'}`}>
                                        <h3 className={`font-bold text-gray-800 flex items-center gap-2 ${hasErrors ? 'text-xs' : 'text-base'}`}>
                                            <i className="fas fa-cloud-upload-alt text-blue-500"></i> {hasErrors ? 'Tải tệp thay thế' : '2. Khu vực tải chứng từ'}
                                        </h3>
                                        {isScanning && (
                                            <div className="flex items-center text-accent-primary text-xs font-semibold animate-pulse bg-purple-50/80 px-2 py-0.5 rounded-full border border-purple-100">
                                                <i className="fas fa-microchip fa-spin text-purple-500 mr-1.5"></i>
                                                Đang đối chiếu...
                                            </div>
                                        )}
                                    </div>

                                    <div className={`grid grid-cols-1 md:grid-cols-2 ${hasErrors ? 'gap-2' : 'gap-4 md:gap-6'}`}>
                                        <div>
                                            <SimpleFileUpload id="hop_dong_file_input" label="Hợp đồng mua bán" onFileSelect={handleContractFileSelect} required accept=".pdf" disableCompression={true} showPreview={false} compact={hasErrors} />
                                        </div>
                                        <div>
                                            <SimpleFileUpload id="denghi_xhd_file_input" label="Đề nghị xuất hóa đơn" onFileSelect={handleProposalFileSelect} required accept=".pdf" disableCompression={true} showPreview={false} compact={hasErrors} />
                                        </div>
                                    </div>
                                </div>

                                 {!isScanning && scanResult && !scanResult.isValid && (
                                    <div className="p-3 rounded-xl border shadow-sm animate-fade-in-up flex flex-col min-h-0 flex-grow bg-red-50/90 border-red-200 text-red-800 overflow-hidden">
                                        {hasErrors && scanResult.mismatches && scanResult.mismatches.length > 0 && (
                                            <div className="flex-grow flex flex-col bg-white/60 p-2 md:p-3 rounded-lg border border-red-100/50 overflow-hidden">
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2 content-start">
                                                {scanResult.mismatches.map((m, idx) => {
                                                    const isInfo = m.startsWith('Ngân hàng') || m.startsWith('Số tiền');
                                                    const isWarning = m.startsWith('⚠️') || m.includes('Cảnh báo');
                                                    return (
                                                        <div key={idx} className="flex items-start gap-1.5 leading-tight">
                                                            <i className={`fas mt-0.5 text-[0.65rem] shadow-sm rounded-full bg-white flex-shrink-0 ${isInfo ? 'fa-info-circle text-blue-500' : isWarning ? 'fa-exclamation-triangle text-amber-500' : 'fa-times-circle text-red-500'}`}></i>
                                                            <span className={`text-[0.8rem] ${isInfo ? 'text-blue-800 font-medium' : isWarning ? 'text-amber-800 font-medium' : 'font-medium'}`}>{m.replace(/^(🚨|⚠️|ℹ️)\s*/, '')}</span>
                                                        </div>
                                                    );
                                                })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div style={{ display: step === 3 ? 'block' : 'none' }} className="overflow-y-auto custom-scrollbar h-full pr-1">
                                <h3 className="font-semibold text-text-primary text-sm md:text-base mb-2 md:mb-3">3. Xác nhận cuối cùng</h3>
                                <div className="p-3 md:p-4 bg-surface-ground rounded-lg border border-border-primary mb-3 md:mb-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Left Column: Policy */}
                                        <div className="flex flex-col h-full">
                                            <p className="text-xs text-text-secondary mb-1.5 font-semibold uppercase">Chính sách bán hàng</p>
                                            {policy.length > 0 ? (
                                                <div className="bg-surface-card rounded-md border border-border-secondary divide-y divide-border-secondary/50 flex-grow overflow-y-auto custom-scrollbar shadow-sm min-h-[120px]">
                                                    {policy.map((p, idx) => (
                                                        <div key={idx} className="p-2.5 text-sm font-medium text-text-primary flex items-start hover:bg-surface-hover transition-colors">
                                                            <i className="fas fa-check-circle text-success mt-0.5 mr-2.5 flex-shrink-0"></i>
                                                            <span className="leading-tight">{p}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="bg-surface-card rounded-md border border-border-secondary flex items-center justify-center flex-grow min-h-[120px]">
                                                    <p className="font-semibold text-text-placeholder italic">Chưa chọn chính sách nào</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Right Column: Financials & Files */}
                                        <div className="flex flex-col gap-4">
                                            {/* Financials */}
                                            <div className="bg-surface-card p-3 rounded-md border border-border-secondary shadow-sm">
                                                <p className="text-xs text-text-secondary mb-2 font-semibold uppercase border-b border-border-secondary pb-1">Thông tin thanh toán</p>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-text-secondary">Hoa hồng ứng:</span>
                                                        <span className="font-bold text-text-primary">{commission ? `${parseInt(getRawValue(commission)).toLocaleString('vi-VN')} VND` : 'Chưa nhập'}</span>
                                                    </div>
                                                    {vpoint && (
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-sm text-text-secondary">Vpoint sử dụng:</span>
                                                            <span className="font-bold text-purple-600">{`${parseInt(getRawValue(vpoint)).toLocaleString('vi-VN')} điểm`}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Files */}
                                            <div className="bg-surface-card p-3 rounded-md border border-border-secondary shadow-sm flex-grow">
                                                <p className="text-xs text-text-secondary mb-2 font-semibold uppercase border-b border-border-secondary pb-1">Tệp đính kèm</p>
                                                <ul className="list-none text-sm text-text-primary space-y-2">
                                                    <li className={`flex items-center ${contractFile ? 'text-text-primary' : 'text-danger'}`}>
                                                        <i className={`fas ${contractFile ? 'fa-file-contract text-success' : 'fa-times-circle'} mr-2 w-4 text-center`}></i>
                                                        <span className="truncate flex-1" title={contractFile?.name}>{contractFile?.name || 'Thiếu Hợp đồng'}</span>
                                                    </li>
                                                    <li className={`flex items-center ${proposalFile ? 'text-text-primary' : 'text-danger'}`}>
                                                        <i className={`fas ${proposalFile ? 'fa-file-invoice text-success' : 'fa-times-circle'} mr-2 w-4 text-center`}></i>
                                                        <span className="truncate flex-1" title={proposalFile?.name}>{proposalFile?.name || 'Thiếu Đề nghị XHD'}</span>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="relative p-4 rounded-lg border border-accent-primary/20 bg-surface-accent">
                                    <div className="flex items-start">
                                        <div className="flex items-center h-6">
                                            <input
                                                id="vinclub-confirm" type="checkbox" checked={vinClubConfirmed}
                                                onChange={(e) => setVinClubConfirmed(e.target.checked)}
                                                className="focus:ring-accent-primary h-5 w-5 text-accent-primary border-border-secondary rounded-md cursor-pointer"
                                            />
                                        </div>
                                        <div className="ml-3 text-sm">
                                            <label htmlFor="vinclub-confirm" className="font-medium text-text-primary cursor-pointer">
                                                Tôi xác nhận khách hàng đã tạo tài khoản Vinclub.
                                            </label>
                                            <p className="text-accent-primary/80">Đây là điều kiện bắt buộc để tiếp tục.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </main>

                    <footer className="flex-shrink-0 p-3 md:p-4 border-t border-blue-200/30 bg-gradient-to-r from-blue-50/95 via-white/95 to-blue-50/95 backdrop-blur-xl flex justify-between items-center relative z-10 shadow-inner">
                        {step > 1 ? (
                            <Button onClick={handleBack} disabled={isSubmitting} variant="secondary" size="sm" leftIcon={<i className="fas fa-arrow-left"></i>}>
                                Quay lại
                            </Button>
                        ) : (
                            <Button onClick={onClose} disabled={isSubmitting} variant="secondary" size="sm">
                                Hủy
                            </Button>
                        )}

                        {step < 3 ? (
                            <Button onClick={handleNext} disabled={isSubmitting || (step === 1 && !isStep1Valid) || (step === 2 && !isStep2Valid)} variant="primary" size="sm" rightIcon={<i className="fas fa-arrow-right"></i>}>
                                Tiếp theo
                            </Button>
                        ) : (
                            <Button onClick={handleSubmit} disabled={isSubmitting || !isFormValid} variant="success" size="sm" isLoading={isSubmitting} leftIcon={!isSubmitting ? <i className="fas fa-paper-plane"></i> : undefined}>
                                Gửi Yêu Cầu
                            </Button>
                        )}
                    </footer>
                </div>
            </div>
        </div>
    );
};

export default RequestInvoiceModal;