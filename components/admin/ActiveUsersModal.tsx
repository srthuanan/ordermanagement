import React, { useState, useEffect } from 'react';
import { ActiveUser } from '../../types';
import { getActiveUsers } from '../../services/apiService';
import Button from '../ui/Button';

interface ActiveUsersModalProps {
    isOpen: boolean;
    onClose: () => void;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
}

const ActiveUsersModal: React.FC<ActiveUsersModalProps> = ({ isOpen, onClose, showToast }) => {
    const [users, setUsers] = useState<ActiveUser[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const response = await getActiveUsers();
            if (response.status === 'SUCCESS' && Array.isArray(response.data)) {
                setUsers(response.data);
            } else {
                setUsers([]); // Fallback
            }
        } catch (error) {
            console.error(error);
            showToast('Lỗi', 'Không thể tải danh sách người dùng online', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchUsers();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    // Helper to format "time ago"
    const timeAgo = (isoString: string) => {
        const date = new Date(isoString);
        const now = new Date();
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (seconds < 60) return `${seconds} giây trước`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes} phút trước`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} giờ trước`;
        return date.toLocaleDateString('vi-VN');
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-scale-up">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
                        Người Dùng Đang Online
                        <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full ml-1">{users.length}</span>
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <i className="fas fa-times text-xl"></i>
                    </button>
                </div>

                <div className="p-0 max-h-[60vh] overflow-y-auto">
                    {isLoading ? (
                        <div className="p-8 text-center text-gray-500">
                            <i className="fas fa-spinner fa-spin text-2xl mb-2"></i>
                            <p>Đang tải...</p>
                        </div>
                    ) : users.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <i className="fas fa-user-slash text-2xl mb-2"></i>
                            <p>Không có người dùng nào trực tuyến.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {users.map((user, idx) => (
                                <div key={idx} className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50 transition-colors">
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm shadow-sm border border-blue-100/50">
                                        {(user.fullName || user.email || '?').charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-grow min-w-0">
                                        <p className="font-medium text-gray-800 truncate text-sm">
                                            {user.fullName || user.email}
                                        </p>
                                        <p className="text-xs text-gray-400 truncate flex items-center gap-1">
                                            {user.fullName ? user.email : ''}
                                        </p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="text-[10px] font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                            Online
                                        </p>
                                        <p className="text-[10px] text-gray-400 mt-1">
                                            {timeAgo(user.lastSeen)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex justify-end gap-3">
                    <Button
                        onClick={fetchUsers}
                        className="!bg-white !text-blue-600 !border !border-blue-200 hover:!bg-blue-50 !px-3 !py-1.5 !text-sm"
                        isLoading={isLoading}
                    >
                        <i className="fas fa-sync-alt mr-1"></i> Làm mới
                    </Button>
                    <Button onClick={onClose} variant="secondary" className="!px-4 !py-1.5 !text-sm">
                        Đóng
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ActiveUsersModal;
