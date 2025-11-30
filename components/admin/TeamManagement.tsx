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
    const sortedTeams = useMemo(() => Object.entries(teamData).sort(([leaderA], [leaderB]) => leaderA.localeCompare(leaderB)), [teamData]);

    return (
        <div className="bg-surface-card rounded-xl shadow-md border border-border-primary p-3">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-bold text-text-primary">Quản lý Phòng Kinh Doanh</h3>
                <button onClick={onAddNewTeam} className="btn-primary"><i className="fas fa-plus mr-2"></i>Tạo Phòng Mới</button>
            </div>
            {sortedTeams.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {sortedTeams.map(([leader, members]) => (
                        <div key={leader} className="bg-surface-ground border border-border-primary rounded-lg p-2 flex flex-col">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs text-text-secondary">Trưởng phòng</p>
                                    <p className="font-bold text-accent-primary">{leader}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => onEditTeam(leader, members)} className="w-8 h-8 rounded-full hover:bg-surface-hover text-text-secondary" title="Chỉnh sửa"><i className="fas fa-pen"></i></button>
                                    <button onClick={() => onDeleteTeam(leader)} className="w-8 h-8 rounded-full hover:bg-danger-bg text-text-secondary hover:text-danger" title="Xóa phòng"><i className="fas fa-trash"></i></button>
                                </div>
                            </div>
                            <div className="border-t border-dashed border-border-secondary my-1.5"></div>
                            <p className="text-xs text-text-secondary mb-2">Thành viên ({members.length})</p>
                            <div className="space-y-1 flex-grow">
                                {members.length > 0 ? members.map(member => (
                                    <div key={member} className="text-sm text-text-primary bg-white p-2 rounded-md shadow-sm">{member}</div>
                                )) : <p className="text-sm text-text-secondary italic">Chưa có thành viên.</p>}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 text-text-secondary">
                    <i className="fas fa-users-slash fa-3x mb-4"></i>
                    <p>Chưa có phòng kinh doanh nào được thiết lập.</p>
                </div>
            )}
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
