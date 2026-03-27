import React, { useState, useEffect, useCallback } from 'react';

// Dùng đúng key từ env (sb_publishable_ format mới của Supabase)
const SB_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const SB_HEADERS = {
    'apikey': SB_KEY,
    'Authorization': `Bearer ${SB_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
};

async function sbFetch(path: string, options: RequestInit = {}) {
    const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
        ...options,
        headers: { ...SB_HEADERS, ...(options.headers || {}) },
    });
    if (!res.ok) {
        const body = await res.text();
        throw new Error(`${res.status}: ${body}`);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
}

interface TvbhEmail {
    id: number;
    ten_tvbh: string;
    email: string;
    created_at: string;
    updated_at: string;
}

interface TvbhEmailManagerProps {
    isOpen: boolean;
    onClose: () => void;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
}

const TvbhEmailManager: React.FC<TvbhEmailManagerProps> = ({ isOpen, onClose, showToast }) => {
    const [entries, setEntries] = useState<TvbhEmail[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState({ ten_tvbh: '', email: '' });
    const [newForm, setNewForm] = useState({ ten_tvbh: '', email: '' });
    const [isAdding, setIsAdding] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [savingId, setSavingId] = useState<number | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const fetchEntries = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await sbFetch('tvbh_emails?select=*&order=ten_tvbh.asc');
            setEntries(data || []);
        } catch (err: any) {
            showToast('Lỗi', err.message || 'Không thể tải dữ liệu', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        if (isOpen) fetchEntries();
    }, [isOpen, fetchEntries]);

    const handleEdit = (entry: TvbhEmail) => {
        setEditingId(entry.id);
        setEditForm({ ten_tvbh: entry.ten_tvbh, email: entry.email });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditForm({ ten_tvbh: '', email: '' });
    };

    const handleSave = async (id: number) => {
        if (!editForm.ten_tvbh.trim() || !editForm.email.trim()) {
            showToast('Lỗi', 'Tên TVBH và Email không được trống', 'error');
            return;
        }
        setSavingId(id);
        try {
            await sbFetch(`tvbh_emails?id=eq.${id}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    ten_tvbh: editForm.ten_tvbh.trim(),
                    email: editForm.email.trim(),
                    updated_at: new Date().toISOString()
                }),
            });
            showToast('Thành công', 'Đã cập nhật email TVBH', 'success');
            setEditingId(null);
            await fetchEntries();
        } catch (err: any) {
            showToast('Lỗi', err.message || 'Không thể cập nhật', 'error');
        } finally {
            setSavingId(null);
        }
    };

    const handleDelete = async (id: number, name: string) => {
        if (!window.confirm(`Xóa email của "${name}"?`)) return;
        setDeletingId(id);
        try {
            await sbFetch(`tvbh_emails?id=eq.${id}`, { method: 'DELETE' });
            showToast('Thành công', `Đã xóa email của "${name}"`, 'success');
            await fetchEntries();
        } catch (err: any) {
            showToast('Lỗi', err.message || 'Không thể xóa', 'error');
        } finally {
            setDeletingId(null);
        }
    };

    const handleAdd = async () => {
        if (!newForm.ten_tvbh.trim() || !newForm.email.trim()) {
            showToast('Lỗi', 'Vui lòng nhập đầy đủ Tên TVBH và Email', 'error');
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newForm.email.trim())) {
            showToast('Lỗi', 'Định dạng email không hợp lệ', 'error');
            return;
        }
        setIsLoading(true);
        try {
            await sbFetch('tvbh_emails', {
                method: 'POST',
                body: JSON.stringify({ ten_tvbh: newForm.ten_tvbh.trim(), email: newForm.email.trim() }),
            });
            showToast('Thành công', `Đã thêm email cho "${newForm.ten_tvbh}"`, 'success');
            setNewForm({ ten_tvbh: '', email: '' });
            setIsAdding(false);
            await fetchEntries();
        } catch (err: any) {
            showToast('Lỗi', err.message || 'Không thể thêm', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const filteredEntries = entries.filter(e =>
        e.ten_tvbh.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)' }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]" style={{ animation: 'fadeInScaleUp 0.2s ease-out' }}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                            <i className="fas fa-envelope text-blue-600 text-sm"></i>
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-800">Quản Lý Email TVBH</h2>
                            <p className="text-xs text-slate-400">Dữ liệu lưu trên Supabase · {entries.length} nhân viên</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                        <i className="fas fa-times text-sm"></i>
                    </button>
                </div>

                {/* Toolbar */}
                <div className="px-6 py-3 flex items-center gap-3 border-b border-slate-50 bg-slate-50/50">
                    <div className="flex-1 relative">
                        <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-xs"></i>
                        <input
                            type="text"
                            placeholder="Tìm theo tên hoặc email..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-all"
                        />
                    </div>
                    <button
                        onClick={() => setIsAdding(true)}
                        disabled={isAdding}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
                    >
                        <i className="fas fa-plus text-xs"></i>
                        Thêm mới
                    </button>
                    <button onClick={fetchEntries} disabled={isLoading} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-white text-slate-400 hover:text-slate-600 transition-colors" title="Làm mới">
                        <i className={`fas fa-sync-alt text-xs ${isLoading ? 'animate-spin' : ''}`}></i>
                    </button>
                </div>

                {/* Add Form */}
                {isAdding && (
                    <div className="px-6 py-3 bg-blue-50/50 border-b border-blue-100 flex items-center gap-2">
                        <div className="flex-1">
                            <input
                                autoFocus
                                type="text"
                                placeholder="Họ và tên TVBH..."
                                value={newForm.ten_tvbh}
                                onChange={e => setNewForm(f => ({ ...f, ten_tvbh: e.target.value }))}
                                className="w-full px-3 py-1.5 text-sm bg-white border border-blue-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 mb-2"
                            />
                            <input
                                type="email"
                                placeholder="email@example.com"
                                value={newForm.email}
                                onChange={e => setNewForm(f => ({ ...f, email: e.target.value }))}
                                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                                className="w-full px-3 py-1.5 text-sm bg-white border border-blue-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                            />
                        </div>
                        <div className="flex flex-col gap-2 ml-2">
                            <button onClick={handleAdd} disabled={isLoading} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50">
                                {isLoading ? <i className="fas fa-spinner animate-spin"></i> : 'Lưu'}
                            </button>
                            <button onClick={() => { setIsAdding(false); setNewForm({ ten_tvbh: '', email: '' }); }} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-500 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors">
                                Hủy
                            </button>
                        </div>
                    </div>
                )}

                {/* Table */}
                <div className="flex-1 overflow-y-auto">
                    {isLoading && entries.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
                            <p className="text-sm text-slate-400">Đang tải dữ liệu...</p>
                        </div>
                    ) : filteredEntries.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-2">
                            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                                <i className="fas fa-inbox text-slate-300 text-lg"></i>
                            </div>
                            <p className="text-sm text-slate-400">{searchQuery ? 'Không tìm thấy kết quả' : 'Chưa có dữ liệu. Nhấn "Thêm mới" để bắt đầu.'}</p>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead className="sticky top-0 bg-white border-b border-slate-100 z-10">
                                <tr>
                                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider w-8">#</th>
                                    <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Tên TVBH</th>
                                    <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Email</th>
                                    <th className="text-right px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredEntries.map((entry, idx) => (
                                    <tr key={entry.id} className="hover:bg-slate-50/60 transition-colors group">
                                        <td className="px-6 py-3 text-xs text-slate-300 tabular-nums">{idx + 1}</td>
                                        {editingId === entry.id ? (
                                            <>
                                                <td className="px-3 py-2">
                                                    <input
                                                        autoFocus
                                                        value={editForm.ten_tvbh}
                                                        onChange={e => setEditForm(f => ({ ...f, ten_tvbh: e.target.value }))}
                                                        className="w-full px-2.5 py-1 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-200"
                                                    />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <input
                                                        type="email"
                                                        value={editForm.email}
                                                        onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                                                        onKeyDown={e => e.key === 'Enter' && handleSave(entry.id)}
                                                        className="w-full px-2.5 py-1 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-200"
                                                    />
                                                </td>
                                                <td className="px-6 py-2 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handleSave(entry.id)}
                                                            disabled={savingId === entry.id}
                                                            className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-60"
                                                        >
                                                            {savingId === entry.id ? <i className="fas fa-spinner animate-spin"></i> : 'Lưu'}
                                                        </button>
                                                        <button onClick={handleCancelEdit} className="px-3 py-1 bg-white border border-slate-200 text-slate-500 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors">
                                                            Hủy
                                                        </button>
                                                    </div>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="px-3 py-3">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                                                            {entry.ten_tvbh.charAt(0).toUpperCase()}
                                                        </div>
                                                        <span className="text-sm font-medium text-slate-700">{entry.ten_tvbh}</span>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-3">
                                                    <span className="text-sm text-slate-500 font-mono">{entry.email}</span>
                                                </td>
                                                <td className="px-6 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => handleEdit(entry)}
                                                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-500 transition-colors"
                                                            title="Chỉnh sửa"
                                                        >
                                                            <i className="fas fa-edit text-[11px]"></i>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(entry.id, entry.ten_tvbh)}
                                                            disabled={deletingId === entry.id}
                                                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-500 transition-colors disabled:opacity-50"
                                                            title="Xóa"
                                                        >
                                                            {deletingId === entry.id
                                                                ? <i className="fas fa-spinner animate-spin text-[11px]"></i>
                                                                : <i className="fas fa-trash-alt text-[11px]"></i>
                                                            }
                                                        </button>
                                                    </div>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/30 rounded-b-2xl">
                    <p className="text-xs text-slate-400">
                        <i className="fas fa-database mr-1.5 text-green-400"></i>
                        Lưu trên Supabase · Tự động đồng bộ với GAS khi gửi mail
                    </p>
                    <button onClick={onClose} className="px-4 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TvbhEmailManager;
