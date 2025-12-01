import React, { useState, useMemo, useEffect } from 'react';
import { useModalBackground } from '../../utils/styleUtils';
import MultiSelectDropdown from '../ui/MultiSelectDropdown';
import { User } from '../../types';

interface TeamManagementProps {
    teamData: Record<string, string[]>;
    onEditTeam: (leader: string, members: string[]) => void;
    onAddNewTeam: () => void;
    onDeleteTeam: (leader: string) => void;
}

export const TeamManagementComponent: React.FC<TeamManagementProps> = ({ teamData, onEditTeam, onAddNewTeam, onDeleteTeam }) => {
    const [selectedFolder, setSelectedFolder] = useState<'all' | 'empty'>('all');
    const [selectedLeader, setSelectedLeader] = useState<string | null>(null);

    const sortedTeams = useMemo(() => Object.entries(teamData).sort(([leaderA], [leaderB]) => leaderA.localeCompare(leaderB)), [teamData]);

    const filteredTeams = useMemo(() => {
        return sortedTeams.filter(([_, members]) => {
            if (selectedFolder === 'empty') return members.length === 0;
            return true;
        });
    }, [sortedTeams, selectedFolder]);

    // Auto-select first team
    useEffect(() => {
        if (!selectedLeader && filteredTeams.length > 0) {
            setSelectedLeader(filteredTeams[0][0]);
        }
    }, [filteredTeams, selectedLeader]);

    const selectedTeam = useMemo(() => selectedLeader ? teamData[selectedLeader] : null, [teamData, selectedLeader]);

    const folders = [
        { id: 'all', label: 'Tất Cả', icon: 'fa-users', count: sortedTeams.length },
        { id: 'empty', label: 'Trống', icon: 'fa-user-slash', count: sortedTeams.filter(([_, m]) => m.length === 0).length },
    ];

    return (
        <div className="flex h-full bg-surface-card rounded-xl shadow-md border border-border-primary overflow-hidden animate-fade-in">
            {/* Column 1: Folders */}
            <div className="w-64 flex-shrink-0 border-r border-border-primary bg-surface-ground flex flex-col">
                <div className="p-4 border-b border-border-primary">
                    <button onClick={onAddNewTeam} className="w-full btn-primary flex items-center justify-center gap-2">
                        <i className="fas fa-plus"></i>
                        <span>Tạo Phòng Mới</span>
                    </button>
                </div>
                <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
                    {folders.map(folder => (
                        <button
                            key={folder.id}
                            onClick={() => setSelectedFolder(folder.id as any)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${selectedFolder === folder.id ? 'bg-accent-primary/10 text-accent-primary' : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'}`}
                        >
                            <div className="flex items-center gap-3">
                                <i className={`fas ${folder.icon} w-5 text-center`}></i>
                                <span>{folder.label}</span>
                            </div>
                            {folder.count > 0 && <span className={`text-xs px-2 py-0.5 rounded-full ${selectedFolder === folder.id ? 'bg-accent-primary text-white' : 'bg-surface-hover text-text-secondary'}`}>{folder.count}</span>}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Column 2: List */}
            <div className="w-80 flex-shrink-0 border-r border-border-primary flex flex-col bg-white">
                <div className="p-3 border-b border-border-secondary bg-surface-ground">
                    <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Danh Sách Phòng</h3>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {filteredTeams.length === 0 ? (
                        <div className="p-8 text-center text-text-placeholder text-sm">Không tìm thấy phòng nào.</div>
                    ) : (
                        <div className="divide-y divide-border-secondary">
                            {filteredTeams.map(([leader, members]) => (
                                <div
                                    key={leader}
                                    onClick={() => setSelectedLeader(leader)}
                                    className={`p-3 cursor-pointer hover:bg-surface-hover transition-colors ${selectedLeader === leader ? 'bg-accent-primary/5 border-l-4 border-accent-primary' : 'border-l-4 border-transparent'}`}
                                >
                                    <div className="font-semibold text-text-primary text-sm truncate mb-1">{leader}</div>
                                    <div className="text-xs text-text-secondary flex items-center gap-2">
                                        <i className="fas fa-user-friends text-[10px]"></i>
                                        <span>{members.length} thành viên</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Column 3: Detail */}
            <div className="flex-1 flex flex-col bg-surface-ground min-w-0">
                {selectedLeader && selectedTeam ? (
                    <>
                        {/* Header */}
                        <div className="px-6 py-4 bg-white border-b border-border-primary flex justify-between items-center shadow-sm z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-accent-primary/10 flex items-center justify-center text-accent-primary font-bold text-xl">
                                    {selectedLeader.charAt(0)}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-text-primary leading-tight">{selectedLeader}</h2>
                                    <div className="text-sm text-text-secondary mt-1">Trưởng Phòng Kinh Doanh</div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => onEditTeam(selectedLeader, selectedTeam)}
                                    className="btn btn-secondary px-3 py-1.5 text-sm flex items-center gap-2 rounded-lg"
                                >
                                    <i className="fas fa-pen"></i>
                                    <span>Chỉnh Sửa</span>
                                </button>
                                <button
                                    onClick={() => onDeleteTeam(selectedLeader)}
                                    className="btn btn-danger px-3 py-1.5 text-sm flex items-center gap-2 rounded-lg"
                                >
                                    <i className="fas fa-trash"></i>
                                    <span>Xóa Phòng</span>
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 flex flex-col bg-surface-ground overflow-hidden">
                            <div className="px-4 py-3 bg-white border-b border-border-primary flex justify-between items-center flex-shrink-0 shadow-sm z-10">
                                <h3 className="font-bold text-text-primary text-sm uppercase tracking-wider">Danh Sách Thành Viên</h3>
                                <span className="text-xs font-medium px-2 py-0.5 bg-surface-ground border border-border-secondary text-text-secondary rounded-full shadow-sm">
                                    Tổng: <span className="text-accent-primary font-bold ml-1">{selectedTeam.length}</span>
                                </span>
                            </div>

                            <div className="flex-1 p-4 overflow-hidden flex flex-col">
                                {selectedTeam.length > 0 ? (
                                    <div className="bg-white rounded-lg border border-border-primary shadow-sm flex-1 flex flex-col overflow-hidden">
                                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                                            <table className="w-full text-left border-collapse relative">
                                                <thead className="sticky top-0 z-10 shadow-sm bg-surface-ground">
                                                    <tr className="text-xs text-text-secondary border-b border-border-secondary uppercase tracking-wider">
                                                        <th className="font-semibold py-2 px-3 w-12 text-center bg-surface-ground">#</th>
                                                        <th className="font-semibold py-2 px-3 bg-surface-ground">Họ và tên</th>
                                                        <th className="font-semibold py-2 px-3 w-24 text-center bg-surface-ground">Chức vụ</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="text-sm divide-y divide-border-secondary">
                                                    {selectedTeam.map((member, idx) => (
                                                        <tr key={idx} className="hover:bg-surface-hover transition-colors group">
                                                            <td className="py-1.5 px-3 text-text-secondary text-center text-xs">{idx + 1}</td>
                                                            <td className="py-1.5 px-3 font-medium text-text-primary">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-6 h-6 rounded-full bg-accent-primary/10 text-accent-primary flex items-center justify-center text-[10px] font-bold group-hover:bg-accent-primary group-hover:text-white transition-colors">
                                                                        {member.charAt(0).toUpperCase()}
                                                                    </div>
                                                                    <span className="text-sm">{member}</span>
                                                                </div>
                                                            </td>
                                                            <td className="py-1.5 px-3 text-center">
                                                                <span className="px-1.5 py-0.5 rounded bg-gray-100 text-text-secondary text-[10px] font-medium border border-gray-200">TVBH</span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-text-placeholder bg-white rounded-lg border border-border-dashed border-border-secondary">
                                        <div className="w-16 h-16 rounded-full bg-surface-ground flex items-center justify-center mb-3">
                                            <i className="fas fa-user-plus text-2xl opacity-20"></i>
                                        </div>
                                        <p>Chưa có thành viên nào.</p>
                                        <button onClick={() => onEditTeam(selectedLeader, selectedTeam)} className="mt-4 text-sm text-accent-primary hover:underline">
                                            Thêm thành viên ngay
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-text-placeholder">
                        <i className="fas fa-users text-6xl mb-4 opacity-20"></i>
                        <p>Chọn một phòng để xem chi tiết</p>
                    </div>
                )}
            </div>
        </div>
    );
};

interface TeamEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (newTeamData: Record<string, string[]>) => void;
    teamData: Record<string, string[]>;
    allUsers: User[];
    editingTeam: { leader: string; members: string[] } | null;
}

export const TeamEditorModal: React.FC<TeamEditorModalProps> = ({ isOpen, onClose, onSave, teamData, allUsers, editingTeam }) => {
    const [selectedLeader, setSelectedLeader] = useState(editingTeam ? editingTeam.leader : '');
    const [selectedMembers, setSelectedMembers] = useState(editingTeam ? editingTeam.members : []);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const bgStyle = useModalBackground();

    useEffect(() => {
        if (isOpen) {
            setSelectedLeader(editingTeam ? editingTeam.leader : '');
            setSelectedMembers(editingTeam ? editingTeam.members : []);
        }
    }, [isOpen, editingTeam]);

    const isNewTeam = !editingTeam;

    const { potentialLeaders, availableMembers } = useMemo(() => {
        const allLeaders = new Set(Object.keys(teamData));
        const allMembers = new Set(Object.values(teamData).flat());

        const leaders = allUsers.filter(u => u.role === 'Trưởng Phòng Kinh Doanh' && (!allLeaders.has(u.name) || u.name === editingTeam?.leader));
        const members = allUsers.filter(u => u.role === 'Tư vấn bán hàng' && (!allMembers.has(u.name) || editingTeam?.members.includes(u.name)));

        return { potentialLeaders: leaders.map(u => u.name), availableMembers: members.map(u => u.name) };
    }, [allUsers, teamData, editingTeam]);

    const handleSave = async () => {
        if (!selectedLeader) {
            alert('Vui lòng chọn trưởng phòng.');
            return;
        }
        setIsSubmitting(true);
        const newTeamData = { ...teamData };
        if (isNewTeam) {
            newTeamData[selectedLeader] = selectedMembers;
        } else {
            if (editingTeam.leader !== selectedLeader) {
                delete newTeamData[editingTeam.leader];
            }
            newTeamData[selectedLeader] = selectedMembers;
        }
        await onSave(newTeamData);
        setIsSubmitting(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2" onClick={onClose}>
            <div className="bg-surface-card w-full max-w-2xl rounded-2xl shadow-xl animate-fade-in-scale-up flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()} style={bgStyle}>
                <header className="p-2.5 border-b"><h2 className="text-xl font-bold text-text-primary">{isNewTeam ? 'Tạo Phòng Mới' : `Chỉnh Sửa Phòng: ${editingTeam.leader}`}</h2></header>
                <main className="p-3 space-y-2 overflow-y-auto hidden-scrollbar">
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">Trưởng Phòng</label>
                        {isNewTeam ? (
                            <select value={selectedLeader} onChange={e => setSelectedLeader(e.target.value)} className="w-full bg-surface-ground border border-border-primary rounded-lg p-2.5 futuristic-input">
                                <option value="" disabled>Chọn một trưởng phòng</option>
                                {potentialLeaders.map(name => <option key={name} value={name}>{name}</option>)}
                            </select>
                        ) : (
                            <input type="text" value={selectedLeader} readOnly className="w-full bg-surface-input border border-border-primary rounded-lg p-2.5 futuristic-input cursor-not-allowed" />
                        )}
                    </div>
                    <div>
                        <MultiSelectDropdown
                            id="team-member-select"
                            label="Thành viên"
                            options={availableMembers}
                            selectedOptions={selectedMembers}
                            onChange={setSelectedMembers}
                            icon="fa-users"
                            displayMode="selection"
                        />
                    </div>
                </main>
                <footer className="p-2 border-t flex justify-end gap-2 bg-surface-ground rounded-b-2xl">
                    <button onClick={onClose} disabled={isSubmitting} className="btn-secondary">Hủy</button>
                    <button onClick={handleSave} disabled={isSubmitting || !selectedLeader} className="btn-primary">
                        {isSubmitting ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                    </button>
                </footer>
            </div>
        </div>
    );
};
