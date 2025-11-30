import React, { useState, useEffect, useMemo } from 'react';
import { Order } from '../../types';
import SimpleFileUpload from '../ui/SimpleFileUpload';
import * as apiService from '../../services/apiService';
import { versionsMap } from '../../constants';
import { useModalBackground } from '../../utils/styleUtils';

interface RequestInvoiceModalProps {
    order: Order;
    onClose: () => void;
    onConfirm: (order: Order, contractFile: File, proposalFile: File, policy: string[], commission: string, vpoint: string) => void;
}

const InfoRow: React.FC<{ label: string; value: string; icon: string; isMono?: boolean }> = ({ label, value, icon, isMono = false }) => (
    <div className="flex items-center gap-3 text-sm">
        <i className={`fas ${icon} fa-fw w-4 text-center text-accent-secondary`}></i>
        <span className="text-text-secondary">{label}:</span>
        <span className={`font-semibold text-text-primary ${isMono ? 'font-mono' : ''}`}>{value}</span>
    </div>
);

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


    const isStep1Valid = policy.length > 0 && commission && parseFloat(commission) >= 0;
    const isStep2Valid = contractFile && proposalFile;
    const isStep3Valid = vinClubConfirmed;
    const isFormValid = isStep1Valid && isStep2Valid && isStep3Valid;

    const handleNext = () => setStep(prev => Math.min(prev + 1, 3));
    const handleBack = () => setStep(prev => Math.max(prev - 1, 1));

    const handleSubmit = () => {
        if (!isFormValid || !contractFile || !proposalFile) {
            alert("Vui lòng hoàn thành tất cả các bước.");
            return;
        }
        setIsSubmitting(true);
        onConfirm(order, contractFile, proposalFile, policy, commission, vpoint);
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-surface-card w-full max-w-2xl rounded-2xl shadow-xl animate-fade-in-scale-up flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()} style={bgStyle}>
                <header className="relative flex-shrink-0 flex flex-col items-center justify-center p-6 text-center border-b border-border-primary">
                    <div className="animate-fade-in-down">
                        <h2 className="text-xl font-bold text-gradient">Yêu Cầu Xuất Hóa Đơn</h2>
                        <p className="text-sm text-text-secondary mt-1">Cung cấp chứng từ để tiến hành xuất hóa đơn.</p>
                    </div>
                    <button onClick={onClose} className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:bg-surface-hover">
                        <i className="fas fa-times"></i>
                    </button>
                </header>
                
                <main className="p-6 flex-grow overflow-y-auto">
                    <Stepper currentStep={step} />
                    
                    <div className="p-3 bg-surface-ground rounded-lg border border-border-primary space-y-2 mb-6">
                        <InfoRow label="Số đơn hàng" value={order["Số đơn hàng"]} icon="fa-barcode" isMono />
                        <InfoRow label="Khách hàng" value={order["Tên khách hàng"]} icon="fa-user" />
                        <InfoRow label="Số VIN" value={order.VIN || 'N/A'} icon="fa-car" isMono />
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
                                    Số điểm Vpoint sử dụng (Điểm)
                                </label>
                                <input id="vpoint-amount" type="number" value={vpoint} onChange={(e) => setVpoint(e.target.value)}
                                    className="w-full bg-surface-ground border border-border-primary rounded-lg p-2.5 futuristic-input"
                                    placeholder="Nhập số điểm (nếu có)" min="0"
                                />
                            </div>
                        </div>
                    </div>

                    <div style={{ display: step === 2 ? 'block' : 'none' }}>
                         <h3 className="font-semibold text-text-primary text-base mb-3">2. Tải lên chứng từ</h3>
                        <div className="space-y-4">
                            <SimpleFileUpload id="hop_dong_file_input" label="Hợp đồng mua bán" onFileSelect={setContractFile} required accept=".pdf" />
                            <SimpleFileUpload id="denghi_xhd_file_input" label="Đề nghị xuất hóa đơn" onFileSelect={setProposalFile} required accept=".pdf" />
                        </div>
                    </div>

                    <div style={{ display: step === 3 ? 'block' : 'none' }}>
                        <h3 className="font-semibold text-text-primary text-base mb-3">3. Xác nhận cuối cùng</h3>
                        <div className="p-4 bg-surface-ground rounded-lg border border-border-primary space-y-3 mb-4">
                            <div>
                                <p className="text-xs text-text-secondary">Chính sách bán hàng</p>
                                <p className="font-semibold text-text-primary">{policy.join(', ') || 'Chưa chọn'}</p>
                            </div>
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs text-text-secondary">Hoa hồng ứng trước</p>
                                    <p className="font-semibold text-text-primary">{commission ? `${parseInt(commission).toLocaleString('vi-VN')} VND` : 'Chưa nhập'}</p>
                                </div>
                                {vpoint && (
                                    <div className="text-right">
                                        <p className="text-xs text-text-secondary">Vpoint sử dụng</p>
                                        <p className="font-semibold text-purple-600">{`${parseInt(vpoint).toLocaleString('vi-VN')} điểm`}</p>
                                    </div>
                                )}
                            </div>
                            <div>
                                <p className="text-xs text-text-secondary">Tệp đã tải lên</p>
                                <ul className="list-none text-sm text-text-primary space-y-1 mt-1">
                                    <li className={contractFile ? 'text-success' : 'text-danger'}>
                                        <i className={`fas ${contractFile ? 'fa-check-circle' : 'fa-times-circle'} mr-2`}></i>
                                        Hợp đồng: {contractFile?.name || 'Chưa có'}
                                    </li>
                                    <li className={proposalFile ? 'text-success' : 'text-danger'}>
                                        <i className={`fas ${proposalFile ? 'fa-check-circle' : 'fa-times-circle'} mr-2`}></i>
                                        Đề nghị XHD: {proposalFile?.name || 'Chưa có'}
                                    </li>
                                </ul>
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
                </main>
                
                <footer className="flex-shrink-0 p-4 border-t border-border-primary flex justify-between items-center bg-surface-ground rounded-b-2xl">
                    {step > 1 ? (
                        <button onClick={handleBack} disabled={isSubmitting} className="btn-secondary">
                            <i className="fas fa-arrow-left mr-2"></i> Quay lại
                        </button>
                    ) : (
                        <button onClick={onClose} disabled={isSubmitting} className="btn-secondary">
                            Hủy
                        </button>
                    )}

                    {step < 3 ? (
                        <button onClick={handleNext} disabled={isSubmitting || (step === 1 && !isStep1Valid) || (step === 2 && !isStep2Valid)} className="btn-primary">
                            Tiếp theo <i className="fas fa-arrow-right ml-2"></i>
                        </button>
                    ) : (
                        <button onClick={handleSubmit} disabled={isSubmitting || !isFormValid} className="btn-primary bg-success text-white hover:bg-green-700">
                            {isSubmitting ? (
                                <><i className="fas fa-spinner fa-spin mr-2"></i> Đang gửi...</>
                            ) : (
                                <><i className="fas fa-paper-plane mr-2"></i> Gửi Yêu Cầu</>
                            )}
                        </button>
                    )}
                </footer>
            </div>
        </div>
    );
};

export default RequestInvoiceModal;