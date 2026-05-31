import React, { useState, useEffect } from 'react';

interface GenerateMonthlyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGenerate: (selectedTvbhs: string[]) => void;
    availableTvbhs: string[];
    month: number;
    year: number;
    defaultAmount: number;
}

const GenerateMonthlyModal: React.FC<GenerateMonthlyModalProps> = ({ 
    isOpen, 
    onClose, 
    onGenerate, 
    availableTvbhs,
    month,
    year,
    defaultAmount
}) => {
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (isOpen) {
            // Select all by default when modal opens
            setSelected(new Set(availableTvbhs));
            setSearchTerm('');
        }
    }, [isOpen, availableTvbhs]);

    if (!isOpen) return null;

    const filteredTvbhs = availableTvbhs.filter(name => name.toLowerCase().includes(searchTerm.toLowerCase()));

    const handleToggleAll = () => {
        if (selected.size === availableTvbhs.length) {
            setSelected(new Set()); // Deselect all
        } else {
            setSelected(new Set(availableTvbhs)); // Select all
        }
    };

    const handleToggleOne = (name: string) => {
        const newSelected = new Set(selected);
        if (newSelected.has(name)) {
            newSelected.delete(name);
        } else {
            newSelected.add(name);
        }
        setSelected(newSelected);
    };

    const handleSubmit = () => {
        onGenerate(Array.from(selected));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh] animate-fade-in-up">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Tạo danh sách thu tiền</h3>
                        <p className="text-sm text-slate-500 mt-1">Kinh phí tháng {month}/{year} ({defaultAmount.toLocaleString()} đ/người)</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <i className="fas fa-times text-xl"></i>
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1">
                    <div className="mb-4 relative">
                        <i className="fas fa-search absolute left-3 top-3 text-slate-400"></i>
                        <input
                            type="text"
                            placeholder="Tìm kiếm tên TVBH..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                    
                    <div className="flex justify-between items-center mb-3 px-1">
                        <span className="text-sm font-semibold text-slate-700">Chọn người cần thu ({selected.size}/{availableTvbhs.length})</span>
                        <button 
                            onClick={handleToggleAll}
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                            {selected.size === availableTvbhs.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                        </button>
                    </div>

                    <div className="border border-slate-200 rounded-lg overflow-hidden max-h-[40vh] overflow-y-auto">
                        {filteredTvbhs.length === 0 ? (
                            <div className="p-4 text-center text-slate-500 text-sm">Không tìm thấy kết quả.</div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {filteredTvbhs.map(name => (
                                    <label key={name} className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={selected.has(name)}
                                            onChange={() => handleToggleOne(name)}
                                            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                                        />
                                        <span className="text-sm font-medium text-slate-700">{name}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3 bg-slate-50 rounded-b-xl">
                    <button onClick={onClose} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50">
                        Hủy
                    </button>
                    <button 
                        onClick={handleSubmit} 
                        disabled={selected.size === 0}
                        className={`px-6 py-2 rounded-lg text-sm font-semibold text-white shadow-md ${selected.size === 0 ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-900 shadow-slate-800/20'}`}
                    >
                        Tiến hành tạo ({selected.size})
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GenerateMonthlyModal;
