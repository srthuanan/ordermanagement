import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Order } from '../../types';
import {
    CyberXepXeContract,
    CyberXepXeCandidate,
    getCyberXepXeContracts,
    getCyberXepXeCandidates,
    saveCyberXepXe
} from '../../services/api/stockService';
import { supabase, supabaseAdmin } from '../../services/supabaseClient';

// Hàm chuẩn hóa loại bỏ dấu tiếng Việt
const removeVietnameseTones = (str: string): string => {
    return (str || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'd')
        .toLowerCase()
        .trim();
};

interface CyberAssignVehicleModalProps {
    isOpen: boolean;
    onClose: () => void;
    order?: Order | null;
    contract?: CyberXepXeContract | null;
    initialContracts?: CyberXepXeContract[];
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    onSuccess?: (vin: string, engineNo?: string, contract?: CyberXepXeContract) => void;
}

export const CyberAssignVehicleModal: React.FC<CyberAssignVehicleModalProps> = ({
    isOpen,
    onClose,
    order,
    contract,
    initialContracts,
    showToast,
    onSuccess
}) => {
    // Contract states
    const [activeContract, setActiveContract] = useState<CyberXepXeContract | null>(contract || null);
    const [allCyberContracts, setAllCyberContracts] = useState<CyberXepXeContract[]>([]);
    const [isLoadingContracts, setIsLoadingContracts] = useState<boolean>(false);
    const [contractSearchQuery, setContractSearchQuery] = useState<string>('');

    // Candidates states
    const [candidateCars, setCandidateCars] = useState<CyberXepXeCandidate[]>([]);
    const [isLoadingCandidates, setIsLoadingCandidates] = useState<boolean>(false);
    const [selectedCandidateVin, setSelectedCandidateVin] = useState<string>('');
    const [selectedCandidateCar, setSelectedCandidateCar] = useState<CyberXepXeCandidate | null>(null);
    const [candidateSearchQuery, setCandidateSearchQuery] = useState<string>('');
    const [isSaving, setIsSaving] = useState<boolean>(false);

    // Initial setup on open
    useEffect(() => {
        if (!isOpen) {
            setActiveContract(null);
            setCandidateCars([]);
            setSelectedCandidateVin('');
            setSelectedCandidateCar(null);
            setCandidateSearchQuery('');
            return;
        }

        if (contract) {
            setActiveContract(contract);
            loadCandidates(contract);
        } else if (order) {
            const customerName = order['Tên khách hàng'] || '';
            setContractSearchQuery(customerName);
            searchAndResolveContractForOrder(order);
        }
    }, [isOpen, contract, order]);

    // Lắng nghe phím Escape để đóng modal
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !isSaving) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, isSaving, onClose]);

    // Tìm kiếm hợp đồng Cyber tự động cho đơn hàng
    const searchAndResolveContractForOrder = async (targetOrder: Order) => {
        setIsLoadingContracts(true);
        try {
            let contractsList: CyberXepXeContract[] = (initialContracts && initialContracts.length > 0) ? initialContracts : [];
            
            if (contractsList.length === 0) {
                const now = new Date();
                const currY = now.getFullYear();
                const res = await getCyberXepXeContracts({
                    thang1: 1,
                    nam1: currY,
                    thang2: 12,
                    nam2: currY,
                    ma_dvcs: '02',
                    showroom: 'Ô tô Vinfast Thuận An'
                });

                if (res && res.success && res.contracts) {
                    contractsList = res.contracts;
                } else {
                    throw new Error(res?.error || 'Không thể tải danh sách hợp đồng CyberSoft');
                }
            }

            // Mặc định trong tab Hóa đơn: các hợp đồng cần ghép xe đều là CHƯA XẾP XE trên CyberSoft
            // (Trạng thái 'Chờ duyệt', 'Chờ ghép SK' hoặc chưa có số khung)
            const unassignedContracts = contractsList.filter(c => {
                const s = (c.ten_color || '').trim().toLowerCase();
                return !c.so_khung || s === 'chờ duyệt' || s === 'chờ ghép sk' || s === 'đã ghép sk';
            });

            setAllCyberContracts(unassignedContracts);

                const custNameClean = removeVietnameseTones(targetOrder['Tên khách hàng'] || '');
                const orderNoClean = (targetOrder['Số đơn hàng'] || '').toLowerCase().trim();
                const existingVin = (targetOrder.VIN || '').toLowerCase().trim();

                // Lọc hợp đồng khớp theo tên khách hàng, số đơn hàng hoặc số VIN
                const matched = unassignedContracts.filter(c => {
                    const cCust = removeVietnameseTones(c.ten_kh || '');
                    const cMaHd = (c.ma_hd || '').toLowerCase();
                    const cSoCt = (c.so_ct || '').toLowerCase();
                    const cVin = (c.so_khung || '').toLowerCase();

                    if (existingVin && cVin && cVin === existingVin) return true;
                    if (custNameClean && cCust && (cCust === custNameClean || cCust.includes(custNameClean) || custNameClean.includes(cCust))) return true;
                    if (orderNoClean && (cMaHd.includes(orderNoClean) || cSoCt.includes(orderNoClean))) return true;

                    return false;
                });

                if (matched.length === 1) {
                    // Tự động chọn nếu chỉ có duy nhất 1 hợp đồng khớp
                    setActiveContract(matched[0]);
                    loadCandidates(matched[0]);
                } else if (matched.length > 1) {
                    // Nếu có nhiều hợp đồng, tự động ưu tiên HĐ chưa có số khung
                    const pendingMatch = matched.find(m => !m.so_khung) || matched[0];
                    setActiveContract(pendingMatch);
                    loadCandidates(pendingMatch);
                } else {
                    // Không tìm thấy tự động, để người dùng tự chọn/tìm kiếm
                    setActiveContract(null);
                }
        } catch (err: any) {
            showToast('Tra cứu CyberSoft', err.message || 'Lỗi khi tìm kiếm hợp đồng', 'warning');
        } finally {
            setIsLoadingContracts(false);
        }
    };

    // Tải danh sách xe khả dụng cho hợp đồng
    const loadCandidates = async (c: CyberXepXeContract) => {
        setIsLoadingCandidates(true);
        setSelectedCandidateVin('');
        setSelectedCandidateCar(null);
        try {
            const res = await getCyberXepXeCandidates({
                stt_rec: c.stt_rec,
                stt_rec0: c.stt_rec0,
                ma_dvcs: c.ma_dvcs || '02'
            });

            if (res && res.success) {
                const candidates: CyberXepXeCandidate[] = res.candidates || [];
                setCandidateCars(candidates);

                // Mặc định chọn đúng VIN trong đơn hàng nếu có xe khớp
                const orderVin = (order?.VIN || (order as any)?.vin || order?.['SỐ VIN'] || '').trim().toUpperCase();
                if (orderVin) {
                    const matchedCar = candidates.find(
                        item => (item.so_khung || '').trim().toUpperCase() === orderVin
                    );
                    if (matchedCar) {
                        setSelectedCandidateVin(matchedCar.so_khung);
                        setSelectedCandidateCar(matchedCar);
                    }
                }
            } else {
                setCandidateCars([]);
                showToast('Chưa có xe khả dụng', res?.error || 'Không có xe phù hợp trong kho/kế hoạch', 'warning');
            }
        } catch (err: any) {
            setCandidateCars([]);
            showToast('Lỗi tra cứu xe', err.message || 'Không thể tải danh sách xe khả dụng', 'error');
        } finally {
            setIsLoadingCandidates(false);
        }
    };

    // Kiểm tra xem hợp đồng có đang ở trạng thái Chưa duyệt (Màu xanh) hay không
    const checkIsGreen = (c?: CyberXepXeContract | null) => {
        if (!c) return false;
        const post = (c.ma_post || '').trim();
        const tenColor = (c.ten_color || '').trim().toLowerCase();
        const backColor = (c.back_color || '').trim().toLowerCase();
        const maColor = (c.ma_color || '').trim();
        return post === '2' || tenColor === 'chờ duyệt' || maColor === '04' || backColor === 'greenyellow';
    };

    const isContractPendingGreen = useMemo(() => {
        return checkIsGreen(activeContract);
    }, [activeContract]);

    // Lọc danh sách hợp đồng theo ô tìm kiếm
    const displayedContracts = useMemo(() => {
        const q = removeVietnameseTones(contractSearchQuery);
        if (!q) return allCyberContracts.slice(0, 15);
        return allCyberContracts.filter(c => {
            const full = removeVietnameseTones(`${c.ma_hd} ${c.so_ct} ${c.ten_kh} ${c.dien_thoai} ${c.ten_kx} ${c.ten_mau} ${c.so_khung}`);
            return full.includes(q);
        }).slice(0, 30);
    }, [allCyberContracts, contractSearchQuery]);

    // Lọc danh sách xe khả dụng theo ô tìm kiếm & sắp xếp VIN khớp đơn hàng lên đầu
    const displayedCandidates = useMemo(() => {
        const orderVin = (order?.VIN || (order as any)?.vin || order?.['SỐ VIN'] || '').trim().toUpperCase();
        let list = candidateCars;

        const q = candidateSearchQuery.trim().toLowerCase();
        if (q) {
            list = list.filter(c =>
                (c.so_khung || '').toLowerCase().includes(q) ||
                (c.so_may || '').toLowerCase().includes(q) ||
                (c.dien_giai || '').toLowerCase().includes(q)
            );
        }

        // Sắp xếp: xe có VIN trùng với VIN của đơn hàng lên đầu danh sách
        if (orderVin && list.length > 1) {
            return [...list].sort((a, b) => {
                const aMatch = (a.so_khung || '').trim().toUpperCase() === orderVin ? 1 : 0;
                const bMatch = (b.so_khung || '').trim().toUpperCase() === orderVin ? 1 : 0;
                return bMatch - aMatch;
            });
        }

        return list;
    }, [candidateCars, candidateSearchQuery, order]);

    // Xử lý xác nhận ghép xe
    const handleConfirmAssign = async () => {
        if (!activeContract || !selectedCandidateVin) {
            showToast('Chưa chọn xe', 'Vui lòng chọn một số khung xe từ danh sách để ghép', 'warning');
            return;
        }

        // Báo lỗi và chặn ghép xe nếu hợp đồng đang màu xanh (chưa được Giám đốc duyệt)
        if (isContractPendingGreen) {
            showToast(
                'Quy định ghép xe',
                `Hợp đồng ${activeContract.ma_hd} trên Cyber đang ở trạng thái Chờ duyệt (Màu xanh). Theo quy định, Giám đốc phải duyệt chuyển sang Màu vàng mới được ghép xe!`,
                'warning',
                6000
            );
            return;
        }

        setIsSaving(true);
        try {
            // 1. Lưu vào CyberSoft ERP qua Stored Procedure CP_BeXepXe_SAVE (user_name = SYSTEM để không ghi nhận user cá nhân nào)
            const cyberRes = await saveCyberXepXe({
                ma_hd: activeContract.ma_hd,
                stt_rec: activeContract.stt_rec,
                stt_rec0: activeContract.stt_rec0,
                so_khung: selectedCandidateVin,
                ma_dvcs: activeContract.ma_dvcs || '02',
                user_name: 'SYSTEM'
            });

            if (!cyberRes || !cyberRes.success) {
                throw new Error(cyberRes?.error || cyberRes?.note || 'Không thể lưu xếp xe vào CyberSoft ERP');
            }

            // 2. Đồng bộ số VIN và số máy vào cơ sở dữ liệu (yeucauxhd & donhang)
            const engineNo = selectedCandidateCar?.so_may || '';
            const orderNo = order?.['Số đơn hàng'] || order?.so_don_hang;

            if (orderNo) {
                try {
                    // Cập nhật bảng yeucauxhd: chỉ cập nhật vin và so_may, TUYỆT ĐỐI KHÔNG đổi trang_thai của yêu cầu xuất hóa đơn
                    await supabase
                        .from('yeucauxhd')
                        .update({
                            vin: selectedCandidateVin,
                            ...(engineNo ? { so_may: engineNo } : {})
                        })
                        .eq('so_don_hang', orderNo);

                    // Cập nhật bảng donhang (nếu có đơn hàng tương ứng): chỉ cập nhật VIN và thời gian ghép, không ghi đè nếu đơn đã vào luồng xuất hóa đơn
                    const pairedTime = new Date().toISOString();
                    await supabase
                        .from('donhang')
                        .update({
                            vin: selectedCandidateVin,
                            thoi_gian_ghep: pairedTime
                        })
                        .eq('so_don_hang', orderNo);

                    // Cập nhật trạng thái xe trong khoxe nếu có
                    await (supabaseAdmin || supabase)
                        .from('khoxe')
                        .update({
                            trang_thai: 'Đã ghép',
                            nguoi_giu_xe: order?.['Tên tư vấn bán hàng'] || order?.tvbh || 'Admin',
                            thoi_gian_het_han_giu: 'Vô thời hạn'
                        })
                        .eq('vin', selectedCandidateVin);
                } catch (syncErr: any) {
                    console.warn('Lỗi đồng bộ Supabase sau khi ghép Cyber:', syncErr);
                }
            }

            showToast(
                'Ghép xe thành công',
                `Đã xếp số khung ${selectedCandidateVin} vào HĐ ${activeContract.ma_hd} trên CyberSoft ERP!`,
                'success'
            );

            if (onSuccess) {
                onSuccess(selectedCandidateVin, engineNo, activeContract);
            }

            onClose();
        } catch (err: any) {
            showToast('Lỗi ghép xe', err.message || 'Lỗi khi thực hiện xếp xe trên CyberSoft', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    const modalContent = (
        <div 
            className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in"
            onClick={(e) => {
                if (e.target === e.currentTarget && !isSaving) {
                    onClose();
                }
            }}
        >
            <div 
                className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden animate-scale-in my-auto relative z-10"
                onClick={e => e.stopPropagation()}
            >
                
                {/* Modal Header */}
                <div className="px-5 py-3.5 bg-gradient-to-r from-indigo-700 via-blue-700 to-indigo-800 text-white flex items-center justify-between shrink-0 shadow-sm">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center shadow-inner shrink-0">
                            <i className="fas fa-car-side text-white text-sm"></i>
                        </div>
                        <div>
                            <h3 className="font-bold text-sm flex items-center gap-2">
                                <span>Ghép Xe CyberSoft ERP</span>
                                <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-white/20">
                                    [dbo].[CP_BeXepXe]
                                </span>
                            </h3>
                            <p className="text-[11px] text-white/80">
                                Tra cứu và gán số khung phù hợp từ kế hoạch phân bổ / kho CyberSoft vào HĐ
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSaving}
                        className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer shrink-0"
                        title="Đóng (ESC)"
                    >
                        <i className="fas fa-times text-sm"></i>
                    </button>
                </div>

                {/* Contract Selection Bar (If multiple or changing contract) */}
                {isLoadingContracts ? (
                    <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-center gap-2.5 text-xs text-slate-600">
                        <div className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                        <span>Đang tự động tìm hợp đồng CyberSoft khớp với khách hàng <strong>{order?.['Tên khách hàng']}</strong>...</span>
                    </div>
                ) : !activeContract ? (
                    /* Contract Picker */
                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col gap-2.5 shrink-0">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                <i className="fas fa-clock text-amber-500"></i>
                                <span>Hợp đồng chưa xếp xe trên CyberSoft (Thuận An):</span>
                            </span>
                            <span className="text-[11px] text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                                {allCyberContracts.length} hợp đồng chờ ghép
                            </span>
                        </div>
                        <div className="relative">
                            <i className="fas fa-search text-[11px] text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"></i>
                            <input
                                type="text"
                                placeholder="Tìm theo tên khách hàng, số HĐ, SĐT..."
                                value={contractSearchQuery}
                                onChange={e => setContractSearchQuery(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                            />
                        </div>
                        <div className="max-h-36 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                            {displayedContracts.length === 0 ? (
                                <div className="text-xs text-slate-400 py-3 text-center">
                                    Không tìm thấy hợp đồng CyberSoft nào khớp với từ khóa
                                </div>
                            ) : (
                                displayedContracts.map(c => {
                                    const isCGreen = checkIsGreen(c);
                                    return (
                                        <div
                                            key={`${c.stt_rec}_${c.stt_rec0}`}
                                            onClick={() => {
                                                setActiveContract(c);
                                                loadCandidates(c);
                                            }}
                                            className={`p-2 bg-white hover:bg-indigo-50/70 border rounded-xl text-xs cursor-pointer transition-all flex items-center justify-between ${
                                                isCGreen ? 'border-amber-200 bg-amber-50/20' : 'border-slate-200 hover:border-indigo-300'
                                            }`}
                                        >
                                            <div className="min-w-0 flex-1">
                                                <div className="font-bold text-slate-900 truncate flex items-center gap-1.5 flex-wrap">
                                                    <span>{c.ten_kh}</span>
                                                    <span className="font-mono text-indigo-600 font-normal text-[11px]">({c.ma_hd})</span>
                                                    {isCGreen ? (
                                                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300">
                                                            Màu xanh (Chờ duyệt)
                                                        </span>
                                                    ) : (
                                                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                                                            Màu vàng (Đã duyệt)
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[11px] text-slate-500 truncate mt-0.5">
                                                    {c.ten_kx} - {c.ten_mau || c.ma_mau} | TVBH: {c.ten_hs || '-'}
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg text-[10px] font-bold shrink-0 ml-2 shadow-2xs"
                                            >
                                                Chọn HĐ này
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                ) : (
                    /* Selected Contract Info Card */
                    <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 shrink-0 text-xs">
                        <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-200/60">
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-bold text-[10px]">
                                    Hợp đồng CyberSoft
                                </span>
                                <span className="font-bold text-slate-900 font-mono text-xs">{activeContract.ma_hd}</span>
                                {isContractPendingGreen ? (
                                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                                        <i className="fas fa-exclamation-triangle text-[9px] text-amber-600"></i>
                                        <span>Màu xanh (Chưa duyệt)</span>
                                    </span>
                                ) : (
                                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 border border-yellow-400 flex items-center gap-1">
                                        <i className="fas fa-check-circle text-[9px] text-yellow-600"></i>
                                        <span>Màu vàng (Đã duyệt)</span>
                                    </span>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setActiveContract(null);
                                    setCandidateCars([]);
                                    setSelectedCandidateVin('');
                                    setSelectedCandidateCar(null);
                                }}
                                className="text-[11px] text-indigo-600 hover:underline font-semibold flex items-center gap-1"
                            >
                                <i className="fas fa-arrow-right-arrow-left text-[9px]"></i>
                                <span>Đổi HĐ khác</span>
                            </button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-slate-700">
                            <div>
                                <span className="text-slate-400 text-[11px] block">Khách hàng:</span>
                                <span className="font-bold text-slate-900 truncate block" title={activeContract.ten_kh}>
                                    {activeContract.ten_kh}
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-400 text-[11px] block">Dòng xe / Màu:</span>
                                <span className="font-bold text-indigo-700 block truncate" title={`${activeContract.ten_kx} (${activeContract.ten_mau})`}>
                                    {activeContract.ten_kx} ({activeContract.ten_mau || activeContract.ma_mau})
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-400 text-[11px] block">TVBH / Showroom:</span>
                                <span className="font-medium text-slate-800 block truncate" title={`${activeContract.ten_hs} - ${activeContract.ten_ttcp}`}>
                                    {activeContract.ten_hs || '-'}
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-400 text-[11px] block">VIN hiện tại (Cyber):</span>
                                <span className="font-mono font-bold text-slate-900 block truncate">
                                    {activeContract.so_khung || <span className="text-slate-400 italic font-normal">Chưa ghép</span>}
                                </span>
                                {(order?.VIN || (order as any)?.vin || order?.['SỐ VIN']) && (
                                    <span className="text-[10px] text-indigo-600 font-mono block mt-0.5 truncate" title="VIN trên đơn hàng">
                                        Đơn hàng: <strong>{(order?.VIN || (order as any)?.vin || order?.['SỐ VIN'] || '').trim()}</strong>
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Status / Approval Warning Banner */}
                {activeContract && (
                    <div className="px-5 pt-3 shrink-0">
                        {isContractPendingGreen ? (
                            <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-xl flex items-start gap-2.5 text-amber-900 shadow-xs">
                                <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                                    <i className="fas fa-exclamation-triangle text-xs"></i>
                                </div>
                                <div className="text-xs">
                                    <div className="font-extrabold uppercase tracking-wide text-amber-800 flex items-center gap-2">
                                        <span>Cảnh báo quy định duyệt hợp đồng</span>
                                        <span className="px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900 font-black text-[9px] border border-amber-300">
                                            MÀU XANH (CHỜ DUYỆT)
                                        </span>
                                    </div>
                                    <div className="mt-1 text-slate-700 leading-relaxed text-[11px]">
                                        Hợp đồng <strong>{activeContract.ma_hd}</strong> trên CyberSoft đang ở trạng thái <strong>Chờ duyệt (Màu xanh)</strong>. Theo quy định, hợp đồng phải được <strong>Giám đốc duyệt chuyển sang MÀU VÀNG</strong> thì mới được phép ghép xe!
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs shadow-2xs">
                                <i className="fas fa-check-circle text-emerald-600 text-xs shrink-0"></i>
                                <span className="text-[11px] font-medium">
                                    Hợp đồng đã được Giám đốc duyệt <strong className="text-emerald-900 font-bold">(Màu vàng)</strong> - Đủ điều kiện ghép xe theo quy định.
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {/* Candidate Cars Section */}
                {activeContract && (
                    <>
                        {/* Search in Candidate Cars */}
                        <div className="px-5 py-2.5 bg-white border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
                            <div className="flex-1 relative">
                                <i className="fas fa-search text-[11px] text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"></i>
                                <input
                                    type="text"
                                    placeholder="Lọc số khung (VIN), số máy, ghi chú..."
                                    value={candidateSearchQuery}
                                    onChange={e => setCandidateSearchQuery(e.target.value)}
                                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 hover:bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                                />
                            </div>
                            <div className="text-xs text-slate-500 font-medium whitespace-nowrap">
                                Khả dụng: <strong className="text-indigo-700">{displayedCandidates.length}</strong> xe
                            </div>
                        </div>

                        {/* Candidates Table */}
                        <div className="flex-1 overflow-auto p-4 min-h-[220px]">
                            {isLoadingCandidates ? (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                                    <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-3"></div>
                                    <span className="text-xs font-semibold">Đang tra cứu xe khớp cấu hình từ CyberSoft ([dbo].[CP_BeXepXe_SK])...</span>
                                </div>
                            ) : candidateCars.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-center">
                                    <i className="fas fa-car-tunnel text-4xl text-slate-300 mb-2"></i>
                                    <span className="font-semibold text-slate-600 text-sm">Không có xe phù hợp sẵn sàng ghép!</span>
                                    <p className="text-xs text-slate-400 mt-1 max-w-md">
                                        Hiện không có xe tồn kho hoặc kế hoạch phân bổ nào khớp với mã kiểu xe <strong className="text-slate-600">{activeContract.ma_kx}</strong> và nội/ngoại thất của hợp đồng này trên hệ thống.
                                    </p>
                                </div>
                            ) : displayedCandidates.length === 0 ? (
                                <div className="text-center py-8 text-slate-400 text-xs">
                                    Không khớp với từ khóa tìm kiếm "{candidateSearchQuery}"
                                </div>
                            ) : (
                                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                            <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px] uppercase">
                                                <th className="py-2.5 px-3 text-center w-10 border-r border-slate-200">Chọn</th>
                                                <th className="py-2.5 px-3 border-r border-slate-200">Số khung (VIN)</th>
                                                <th className="py-2.5 px-3 border-r border-slate-200">Số máy</th>
                                                <th className="py-2.5 px-3 text-center border-r border-slate-200">Năm SX</th>
                                                <th className="py-2.5 px-3 border-r border-slate-200">Ngày nhập / PB</th>
                                                <th className="py-2.5 px-3">Ghi chú</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {displayedCandidates.map((car, cIdx) => {
                                                const isSelected = selectedCandidateVin === car.so_khung;
                                                const orderVin = (order?.VIN || (order as any)?.vin || order?.['SỐ VIN'] || '').trim().toUpperCase();
                                                const isMatchedOrderVin = orderVin && (car.so_khung || '').trim().toUpperCase() === orderVin;

                                                return (
                                                    <tr
                                                        key={`${car.so_khung}_${cIdx}`}
                                                        onClick={() => {
                                                            setSelectedCandidateVin(car.so_khung);
                                                            setSelectedCandidateCar(car);
                                                        }}
                                                        className={`cursor-pointer transition-colors ${
                                                            isSelected ? 'bg-indigo-50/90 font-medium' : isMatchedOrderVin ? 'bg-amber-50/50 hover:bg-amber-50' : 'hover:bg-slate-50'
                                                        }`}
                                                    >
                                                        <td className="py-2.5 px-3 text-center border-r border-slate-100">
                                                            <input
                                                                type="radio"
                                                                name="modal_candidate_vin"
                                                                checked={isSelected}
                                                                onChange={() => {
                                                                    setSelectedCandidateVin(car.so_khung);
                                                                    setSelectedCandidateCar(car);
                                                                }}
                                                                className="text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                            />
                                                        </td>
                                                        <td className="py-2.5 px-3 border-r border-slate-100 font-mono font-bold text-indigo-700">
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <span>{car.so_khung}</span>
                                                                {isMatchedOrderVin && (
                                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                                                        <i className="fas fa-check-circle mr-1 text-[9px] text-amber-600"></i>
                                                                        Khớp đơn hàng
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="py-2.5 px-3 border-r border-slate-100 font-mono text-slate-700">
                                                            {car.so_may || '-'}
                                                        </td>
                                                        <td className="py-2.5 px-3 border-r border-slate-100 text-center text-slate-600">
                                                            {car.nam_sx || '-'}
                                                        </td>
                                                        <td className="py-2.5 px-3 border-r border-slate-100 text-slate-600">
                                                            {car.ngay_ct || '-'}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-slate-600 max-w-[200px] truncate" title={car.dien_giai}>
                                                            {car.dien_giai || '-'}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* Modal Footer */}
                <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
                    <div>
                        {selectedCandidateVin ? (
                            <span className="text-xs text-slate-700">
                                Đang chọn VIN: <strong className="font-mono text-indigo-700 font-bold">{selectedCandidateVin}</strong>
                                {selectedCandidateCar?.so_may && (
                                    <span className="text-slate-500 ml-1.5 font-mono text-[11px]">
                                        (Số máy: {selectedCandidateCar.so_may})
                                    </span>
                                )}
                            </span>
                        ) : (
                            <span className="text-xs text-slate-400 italic">
                                {activeContract ? 'Vui lòng click vào 1 xe ở trên để chọn' : 'Vui lòng chọn hợp đồng CyberSoft trước'}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSaving}
                            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-2xs"
                        >
                            Đóng
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirmAssign}
                            disabled={!activeContract || !selectedCandidateVin || isSaving || isContractPendingGreen}
                            className={`px-4 py-2 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 ${
                                isContractPendingGreen 
                                    ? 'bg-amber-500/85 hover:bg-amber-600 cursor-not-allowed opacity-90' 
                                    : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50'
                            }`}
                            title={isContractPendingGreen ? "Hợp đồng trên Cyber chưa được Giám đốc duyệt (đang màu xanh). Vui lòng duyệt trước khi ghép xe!" : "Xác nhận ghép xe vào CyberSoft"}
                        >
                            {isSaving ? (
                                <>
                                    <i className="fas fa-spinner fa-spin text-xs"></i>
                                    <span>Đang lưu Cyber...</span>
                                </>
                            ) : isContractPendingGreen ? (
                                <>
                                    <i className="fas fa-ban text-xs"></i>
                                    <span>Chờ GĐ duyệt (Màu xanh)</span>
                                </>
                            ) : (
                                <>
                                    <i className="fas fa-check text-xs"></i>
                                    <span>Xác nhận ghép xe</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );

    return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};

export default CyberAssignVehicleModal;
