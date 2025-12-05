import React, { useState, useEffect, useMemo } from 'react';
import { Order } from '../../types';
import SimpleFileUpload from '../ui/SimpleFileUpload';
import Button from '../ui/Button';
import * as apiService from '../../services/apiService';
import { versionsMap } from '../../constants';
import { useModalBackground } from '../../utils/styleUtils';

interface RequestInvoiceModalProps {
    order: Order;
    onClose: () => void;
    onConfirm: (order: Order, contractFile: File, proposalFile: File, policy: string[], commission: string, vpoint: string) => Promise<any>;
}



const Stepper: React.FC<{ currentStep: number }> = ({ currentStep }) => {
    const steps = ["Thông tin BH", "Tải chứng từ", "Xác nhận"];
    return (
        <div className="flex items-center justify-center mb-6">
            {steps.map((label, index) => {
                const stepNumber = index + 1;
                const isActive = stepNumber === currentStep;
                const isCompleted = stepNumber < currentStep;

                return (
                    <React.Fragment key={stepNumber}>
                        <div className="flex flex-col items-center text-center w-24">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 font-bold ${isCompleted ? 'bg-success text-white' : isActive ? 'bg-accent-primary text-white' : 'bg-surface-ground border-2 border-border-primary text-text-secondary'}`}>
                                {isCompleted ? <i className="fas fa-check"></i> : stepNumber}
                            </div>
                            <p className={`mt-2 text-xs font-semibold transition-colors ${isActive || isCompleted ? 'text-text-primary' : 'text-text-secondary'}`}>{label}</p>
                        </div>
                        {index < steps.length - 1 && (
                            <div className={`flex-1 h-0.5 mx-4 transition-colors duration-300 ${isCompleted ? 'bg-success' : 'bg-border-primary'}`}></div>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

const RequestInvoiceModal: React.FC<RequestInvoiceModalProps> = ({ order, onClose, onConfirm }) => {
    const [step, setStep] = useState(1);
    const [contractFile, setContractFile] = useState<File | null>(null);
    const [proposalFile, setProposalFile] = useState<File | null>(null);
    const [vinClubConfirmed, setVinClubConfirmed] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [policy, setPolicy] = useState<string[]>([]);
    const [commission, setCommission] = useState('');
    const [vpoint, setVpoint] = useState('');

    const [salesPoliciesOptions, setSalesPoliciesOptions] = useState<string[]>([]);
    const [isLoadingPolicies, setIsLoadingPolicies] = useState(true);
    const bgStyle = useModalBackground();

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
            return salesPoliciesOptions.sort();
        }

        const carModels = Object.keys(versionsMap).map(m => m.replace(/\s+/g, '').toLowerCase());
        const currentCarModel = order["Dòng xe"].replace(/\s+/g, '').toLowerCase();

        const specificPolicies = salesPoliciesOptions.filter(policy => {
            const lowerPolicy = policy.toLowerCase().replace(/\s+/g, '');
            return lowerPolicy.includes(currentCarModel);
        });

        const genericPolicies = salesPoliciesOptions.filter(policy => {
            const lowerPolicy = policy.toLowerCase().replace(/\s+/g, '');
            // A policy is generic if it does NOT contain ANY of the main car model names.
            return !carModels.some(model => lowerPolicy.includes(model));
        });

        const result = [...new Set([...specificPolicies, ...genericPolicies])];

        // If filtering provides at least one result, use it. Otherwise, fallback to all policies.
        if (result.length > 0) {
            return result.sort();
        }

        return salesPoliciesOptions.sort();
    }, [order, salesPoliciesOptions]);

    useEffect(() => {
        // When filtered policies change, remove any selected policies that are no longer in the list.
        if (filteredSalesPolicies.length > 0) {
            setPolicy(currentSelection => currentSelection.filter(p => filteredSalesPolicies.includes(p)));
        }
    }, [filteredSalesPolicies]);


    const [processingStage, setProcessingStage] = useState(0); // 0: Idle, 1: Contract, 2: Proposal, 3: Sending

    const isStep1Valid = policy.length > 0 && commission && parseFloat(commission) >= 0 && vpoint && parseFloat(vpoint) >= 0;
    const isStep2Valid = contractFile && proposalFile;
    const isStep3Valid = vinClubConfirmed;
    const isFormValid = isStep1Valid && isStep2Valid && isStep3Valid;

    const handleNext = () => setStep(prev => Math.min(prev + 1, 3));
    const handleBack = () => setStep(prev => Math.max(prev - 1, 1));

    const handleSubmit = async () => {
        if (!isFormValid || !contractFile || !proposalFile) {
            alert("Vui lòng hoàn thành tất cả các bước.");
            return;
        }
        setIsSubmitting(true);

        try {
            // Simulate detailed steps
            setProcessingStage(1); // Processing Contract
            await new Promise(r => setTimeout(r, 800));

            setProcessingStage(2); // Processing Proposal
            await new Promise(r => setTimeout(r, 800));

            setProcessingStage(3); // Sending
            await onConfirm(order, contractFile, proposalFile, policy, commission, vpoint);

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
            <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
                <div className="bg-surface-card w-full max-w-md rounded-2xl shadow-xl p-6 flex flex-col items-center animate-fade-in-scale-up" style={bgStyle}>
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
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-0 md:p-4" onClick={onClose}>
            <div className="bg-surface-card w-full md:max-w-4xl h-[100dvh] md:h-[700px] md:max-h-[90vh] rounded-none md:rounded-2xl shadow-xl animate-fade-in-scale-up flex flex-col" onClick={e => e.stopPropagation()} style={bgStyle}>
                <header className="relative flex-shrink-0 flex flex-col items-center justify-center p-4 text-center border-b border-border-primary">
                    <div className="animate-fade-in-down">
                        <h2 className="text-lg font-bold text-gradient uppercase">YÊU CẦU XUẤT HÓA ĐƠN</h2>
                        <p className="text-xs text-text-secondary mt-0.5">Cung cấp chứng từ để tiến hành xuất hóa đơn.</p>
                    </div>
                    <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:bg-surface-hover">
                        <i className="fas fa-times"></i>
                    </button>
                </header>

                <main className="flex-grow min-h-0 flex flex-col overflow-hidden">
                    <div className="flex-grow overflow-y-auto p-4 md:p-6 custom-scrollbar">
                        <Stepper currentStep={step} />

                        <div className="bg-surface-accent/50 rounded-xl border border-accent-primary/20 p-2.5 mb-4 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                                <i className="fas fa-file-invoice-dollar text-5xl text-accent-primary transform rotate-12"></i>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 relative z-10">
                                <div className="flex flex-col">
                                    <span className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold mb-0.5">Số đơn hàng</span>
                                    <div className="flex items-center gap-1.5 text-accent-primary">
                                        <i className="fas fa-barcode text-base opacity-70"></i>
                                        <span className="text-base font-bold font-mono tracking-tight">{order["Số đơn hàng"]}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col md:border-l md:border-accent-primary/20 md:pl-3">
                                    <span className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold mb-0.5">Khách hàng</span>
                                    <div className="flex items-center gap-1.5 text-text-primary">
                                        <i className="fas fa-user text-base text-accent-secondary opacity-70"></i>
                                        <span className="text-base font-bold truncate" title={order["Tên khách hàng"]}>{order["Tên khách hàng"]}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col md:border-l md:border-accent-primary/20 md:pl-3">
                                    <span className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold mb-0.5">Số VIN</span>
                                    <div className="flex items-center gap-1.5 text-text-primary">
                                        <i className="fas fa-car text-base text-accent-secondary opacity-70"></i>
                                        <span className="text-base font-bold font-mono tracking-tight">{order.VIN || '---'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: step === 1 ? 'block' : 'none' }}>
                            <h3 className="font-semibold text-text-primary text-base mb-3">1. Thông tin Bán hàng</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-primary mb-2">
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
                                        <label htmlFor="commission-amount" className="block text-sm font-medium text-text-primary mb-2">
                                            Hoa hồng ứng trước (VND) <span className="text-danger">*</span>
                                        </label>
                                        <input id="commission-amount" type="number" value={commission} onChange={(e) => setCommission(e.target.value)}
                                            className="w-full bg-surface-ground border border-border-primary rounded-lg p-2.5 futuristic-input"
                                            placeholder="Nhập số tiền" min="0" required
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="vpoint-amount" className="block text-sm font-medium text-text-primary mb-2">
                                            Số điểm Vpoint sử dụng (Điểm) <span className="text-danger">*</span>
                                        </label>
                                        <input id="vpoint-amount" type="number" value={vpoint} onChange={(e) => setVpoint(e.target.value)}
                                            className="w-full bg-surface-ground border border-border-primary rounded-lg p-2.5 futuristic-input"
                                            placeholder="Nhập số điểm" min="0" required
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: step === 2 ? 'block' : 'none' }}>
                            <h3 className="font-semibold text-text-primary text-base mb-3">2. Tải lên chứng từ</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <SimpleFileUpload id="hop_dong_file_input" label="Hợp đồng mua bán" onFileSelect={setContractFile} required accept=".pdf" />
                                <SimpleFileUpload id="denghi_xhd_file_input" label="Đề nghị xuất hóa đơn" onFileSelect={setProposalFile} required accept=".pdf" />
                            </div>
                        </div>

                        <div style={{ display: step === 3 ? 'block' : 'none' }}>
                            <h3 className="font-semibold text-text-primary text-base mb-3">3. Xác nhận cuối cùng</h3>
                            <div className="p-4 bg-surface-ground rounded-lg border border-border-primary mb-4">
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
                                                    <span className="font-bold text-text-primary">{commission ? `${parseInt(commission).toLocaleString('vi-VN')} VND` : 'Chưa nhập'}</span>
                                                </div>
                                                {vpoint && (
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-text-secondary">Vpoint sử dụng:</span>
                                                        <span className="font-bold text-purple-600">{`${parseInt(vpoint).toLocaleString('vi-VN')} điểm`}</span>
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

                <footer className="flex-shrink-0 p-4 border-t border-border-primary flex justify-between items-center bg-surface-card relative z-10">
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
    );
};

export default RequestInvoiceModal;