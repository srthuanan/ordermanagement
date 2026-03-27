import React, { useState, useMemo, useEffect } from 'react';
import { useModalBackground } from '../../utils/styleUtils';

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

    // Mobile Navigation State
    const [mobileView, setMobileView] = useState<'folders' | 'list' | 'detail'>('folders');

    const sortedTeams = useMemo(() => Object.entries(teamData).sort(([leaderA], [leaderB]) => leaderA.localeCompare(leaderB)), [teamData]);

    const filteredTeams = useMemo(() => {
        return sortedTeams.filter(([_, members]) => {
            if (selectedFolder === 'empty') return members.length === 0;
            return true;
        });
    }, [sortedTeams, selectedFolder]);

    // Auto-select first team on desktop only
    useEffect(() => {
        if (window.innerWidth >= 768 && !selectedLeader && filteredTeams.length > 0) {
            setSelectedLeader(filteredTeams[0][0]);
        }
    }, [filteredTeams, selectedLeader]);

    const selectedTeam = useMemo(() => selectedLeader ? teamData[selectedLeader] : null, [teamData, selectedLeader]);

    const folders = [
        { id: 'all', label: 'Tất Cả', icon: 'fa-users', count: sortedTeams.length },
        { id: 'empty', label: 'Trống', icon: 'fa-user-slash', count: sortedTeams.filter(([_, m]) => m.length === 0).length },
    ];

    const handleFolderClick = (folderId: 'all' | 'empty') => {
        setSelectedFolder(folderId);
        setMobileView('list');
    };

    const handleTeamClick = (leader: string) => {
        setSelectedLeader(leader);
        setMobileView('detail');
    };

    return (
        <div className="flex h-full bg-white/40 backdrop-blur-xl rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white/50 overflow-hidden animate-fade-in relative ring-1 ring-black/5">
            {/* Column 1: Folders / Navigation */}
            <div className={`w-full md:w-56 flex-shrink-0 border-r border-slate-200/50 bg-slate-50/50 backdrop-blur-md flex flex-col absolute md:relative inset-0 z-10 md:z-auto transition-transform duration-300 ${mobileView === 'folders' ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
                <div className="p-4 border-b border-slate-200/50">
                    <button
                        onClick={onAddNewTeam}
                        className="w-full bg-accent-primary hover:bg-accent-primary-hover text-white h-10 rounded-xl flex items-center justify-center gap-2 font-bold text-xs shadow-md shadow-accent-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <i className="fas fa-plus text-[10px]"></i>
                        <span>Tạo Phòng Mới</span>
                    </button>
                </div>
                <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                    <h3 className="px-3 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Danh mục</h3>
                    {folders.map(folder => {
                        const isActive = selectedFolder === folder.id;
                        return (
                            <button
                                key={folder.id}
                                onClick={() => handleFolderClick(folder.id as any)}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-bold transition-all ${isActive ? 'bg-white text-accent-primary shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:bg-white/50 hover:text-slate-800'}`}
                            >
                                <div className="flex items-center gap-2">
                                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${isActive ? 'bg-accent-primary/10 text-accent-primary' : 'bg-slate-200/50 text-slate-400'}`}>
                                        <i className={`fas ${folder.icon} text-[10px]`}></i>
                                    </div>
                                    <span>{folder.label}</span>
                                </div>
                                {folder.count > 0 && (
                                    <span className={`min-w-[1.25rem] h-5 flex items-center justify-center rounded-md text-[9px] px-1 ${isActive ? 'bg-accent-primary text-white' : 'bg-slate-200/50 text-slate-500'}`}>
                                        {folder.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Column 2: Team List */}
            <div className={`w-full md:w-64 flex-shrink-0 border-r border-slate-200/50 flex flex-col bg-white absolute md:relative inset-0 z-20 md:z-auto transition-transform duration-300 ${mobileView === 'list' ? 'translate-x-0' : (mobileView === 'detail' ? '-translate-x-full md:translate-x-0' : 'translate-x-full md:translate-x-0')}`}>
                <div className="p-4 border-b border-slate-100 bg-white flex items-center gap-3">
                    <button onClick={() => setMobileView('folders')} className="md:hidden w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 active:scale-95 transition-transform">
                        <i className="fas fa-arrow-left text-xs"></i>
                    </button>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Danh Sách Phòng</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                    {filteredTeams.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-8 h-full bg-slate-50/50">
                            <div className="w-16 h-16 bg-white border border-gray-100 shadow-sm rounded-2xl flex items-center justify-center mb-4">
                                <i className="fas fa-search text-gray-300 text-2xl"></i>
                            </div>
                            <p className="text-sm font-semibold text-gray-400 text-center">Không có phòng</p>
                        </div>
                    ) : (
                        filteredTeams.map(([leader, members]) => {
                            const isSelected = selectedLeader === leader;
                            return (
                                <div
                                    key={leader}
                                    onClick={() => handleTeamClick(leader)}
                                    className={`p-3 cursor-pointer rounded-xl transition-all duration-300 group ${isSelected ? 'bg-accent-primary text-white shadow-md shadow-accent-primary/10' : 'hover:bg-slate-50 active:scale-98'}`}
                                >
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shadow-sm ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-white group-hover:text-accent-primary'}`}>
                                                {leader.charAt(0).toUpperCase()}
                                            </div>
                                            <div className={`font-bold text-xs truncate ${isSelected ? 'text-white' : 'text-slate-800'}`}>{leader}</div>
                                        </div>
                                        {isSelected && <div className="w-1 h-1 rounded-full bg-white animate-pulse"></div>}
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className={`flex -space-x-1.5 ${isSelected ? 'opacity-80' : ''}`}>
                                            {[...Array(Math.min(members.length, 3))].map((_, i) => (
                                                <div key={i} className={`w-4 h-4 rounded-full border border ${isSelected ? 'border-accent-primary bg-white/30' : 'border-white bg-slate-200'} flex items-center justify-center text-[7px] font-black`}>
                                                    {members[i]?.charAt(0)}
                                                </div>
                                            ))}
                                        </div>
                                        <span className={`text-[9px] font-bold tracking-tight ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                                            {members.length} thành viên
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Column 3: Detail View */}
            <div className={`flex-1 flex flex-col bg-slate-50/50 min-w-0 absolute md:relative inset-0 z-30 md:z-auto transition-transform duration-300 ${mobileView === 'detail' ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
                {selectedLeader && selectedTeam ? (
                    <>
                        {/* Header: Compact Profile Style */}
                        <div className="px-5 md:px-6 py-4 md:py-5 bg-white border-b border-slate-200/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm z-10">
                            <div className="flex items-center gap-4">
                                <button onClick={() => setMobileView('list')} className="md:hidden w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 -ml-1">
                                    <i className="fas fa-arrow-left text-xs"></i>
                                </button>
                                <div className="relative group">
                                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-accent-primary to-blue-600 p-0.5 shadow-lg shadow-accent-primary/10 transition-transform duration-500">
                                        <div className="w-full h-full rounded-[0.9rem] bg-white flex items-center justify-center text-accent-primary font-black text-xl md:text-2xl shadow-inner uppercase">
                                            {selectedLeader.charAt(0)}
                                        </div>
                                    </div>
                                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 md:w-5 md:h-5 rounded-lg bg-green-500 border-2 border-white shadow-sm flex items-center justify-center">
                                        <i className="fas fa-check text-white text-[6px] md:text-[8px]"></i>
                                    </div>
                                </div>
                                <div>
                                    <h2 className="text-xl md:text-2xl font-black text-slate-800 leading-tight truncate max-w-[180px] md:max-w-none">{selectedLeader}</h2>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <span className="px-2 py-0.5 bg-accent-primary/5 text-accent-primary text-[9px] font-black uppercase tracking-widest rounded-md border border-accent-primary/10">Trưởng Phòng KD</span>
                                        <div className="w-1 h-1 rounded-full bg-slate-200"></div>
                                        <span className="text-[10px] font-bold text-slate-400">Team Active</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2 w-full md:w-auto">
                                <button
                                    onClick={() => onEditTeam(selectedLeader, selectedTeam)}
                                    className="flex-1 md:flex-none h-9 px-4 rounded-xl bg-white border border-slate-200 text-slate-600 font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-50 transition-all shadow-sm"
                                >
                                    <i className="fas fa-pen-nib text-[10px]"></i>
                                    <span>Chỉnh Sửa</span>
                                </button>
                                <button
                                    onClick={() => onDeleteTeam(selectedLeader)}
                                    className="h-9 w-9 md:w-auto md:px-4 rounded-xl bg-red-50 text-red-500 font-bold text-xs flex items-center justify-center gap-2 hover:bg-red-500 hover:text-white transition-all shadow-sm group"
                                >
                                    <i className="fas fa-trash-alt text-[10px]"></i>
                                    <span className="hidden md:inline">Xóa Phòng</span>
                                </button>
                            </div>
                        </div>

                        {/* Content: Compact Member List */}
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <div className="px-5 md:px-6 py-3 flex justify-between items-center flex-shrink-0">
                                <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Danh Sách Thành Viên</h3>
                                <span className="text-[9px] font-black text-accent-primary bg-accent-primary/5 px-2 py-0.5 rounded-md border border-accent-primary/10">
                                    {selectedTeam.length} THÀNH VIÊN
                                </span>
                            </div>

                            <div className="flex-1 px-5 md:px-6 pb-6 overflow-y-auto custom-scrollbar">
                                {selectedTeam.length > 0 ? (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 3xl:grid-cols-3 gap-3">
                                        {selectedTeam.map((member, idx) => {
                                            const memberName = typeof member === 'string' ? member : (member as any).name || 'N/A';
                                            return (
                                                <div key={idx} className="bg-white p-3 rounded-2xl border border-slate-200/50 shadow-sm hover:shadow-lg hover:shadow-slate-200/40 hover:-translate-y-0.5 transition-all duration-300 group flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 font-black text-sm group-hover:bg-accent-primary group-hover:text-white transition-all duration-500 uppercase">
                                                            {memberName.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-slate-700 text-xs group-hover:text-accent-primary transition-colors">{memberName}</div>
                                                            <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-0.5">TVBH</div>
                                                        </div>
                                                    </div>
                                                    <i className="fas fa-check-circle text-[10px] text-slate-100 group-hover:text-green-500 transition-colors"></i>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-center bg-white/50 backdrop-blur-sm rounded-[2rem] border border-dashed border-slate-200 p-12">
                                        <div className="w-20 h-20 rounded-[2rem] bg-slate-100 flex items-center justify-center mb-6">
                                            <i className="fas fa-user-plus text-3xl text-slate-300"></i>
                                        </div>
                                        <h4 className="text-lg font-black text-slate-800 mb-2">Chưa có thành viên</h4>
                                        <p className="text-slate-400 text-sm max-w-[240px] mb-8">Phòng này hiện tại chưa được chỉ định thành viên nào.</p>
                                        <button
                                            onClick={() => onEditTeam(selectedLeader, selectedTeam)}
                                            className="h-11 px-8 rounded-2xl bg-accent-primary text-white font-bold text-sm shadow-lg shadow-accent-primary/25 hover:scale-[1.05] transition-transform"
                                        >
                                            Thêm thành viên ngay
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center py-20 px-4 w-full h-full bg-slate-50">
                        <div className="relative w-24 h-24 bg-white border border-gray-100 shadow-sm rounded-full flex items-center justify-center mb-6">
                            <div className="absolute inset-0 border border-gray-200/60 rounded-full transform scale-110"></div>
                            <div className="absolute inset-0 border border-gray-100 rounded-full transform scale-125"></div>
                            <i className="fas fa-users-cog text-gray-300 text-4xl"></i>
                        </div>
                        <h3 className="text-lg font-bold text-gray-600 mb-1 tracking-tight">Quản Lý Phòng Kinh Doanh</h3>
                        <p className="text-sm text-gray-400 max-w-sm text-center">Vui lòng chọn một phòng từ danh sách bên trái để xem và quản lý đội ngũ thành viên.</p>
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
    const [selectedMembers, setSelectedMembers] = useState<string[]>(editingTeam ? editingTeam.members : []);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Search states for the dual list
    const [leftSearch, setLeftSearch] = useState('');
    const [rightSearch, setRightSearch] = useState('');

    const bgStyle = useModalBackground();

    useEffect(() => {
        if (isOpen) {
            setSelectedLeader(editingTeam ? editingTeam.leader : '');
            setSelectedMembers(editingTeam ? editingTeam.members : []);
            setLeftSearch('');
            setRightSearch('');
        }
    }, [isOpen, editingTeam]);

    const isNewTeam = !editingTeam;

    const { potentialLeaders, availableMembers } = useMemo(() => {
        const allLeaders = new Set(Object.keys(teamData));

        const leaders = allUsers.filter(u => u.role === 'Trưởng Phòng Kinh Doanh' && (!allLeaders.has(u.name) || u.name === editingTeam?.leader));

        const validTVBH = allUsers.filter(u => u.role === 'Tư vấn bán hàng');
        const assignedToOtherTeams = new Set(
            Object.entries(teamData)
                .filter(([leader]) => leader !== editingTeam?.leader)
                .flatMap(([_, members]) => members)
        );

        const pool = validTVBH.filter(u => !assignedToOtherTeams.has(u.name)).map(u => u.name);

        return { potentialLeaders: leaders.map(u => u.name), availableMembers: pool };
    }, [allUsers, teamData, editingTeam]);

    // Derived lists for UI
    const leftList = availableMembers.filter(m => !selectedMembers.includes(m) && m.toLowerCase().includes(leftSearch.toLowerCase()));
    const rightList = selectedMembers.filter(m => m.toLowerCase().includes(rightSearch.toLowerCase()));

    const moveToRight = (member: string) => {
        setSelectedMembers(prev => [...prev, member]);
    };

    const moveToLeft = (member: string) => {
        setSelectedMembers(prev => prev.filter(m => m !== member));
    };

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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-hidden" onClick={onClose}>
            {/* Premium Animated Background */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-fade-in">
                <div className="absolute inset-0 overflow-hidden opacity-30 pointer-events-none">
                    <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-accent-primary/40 rounded-full blur-[120px] animate-pulse"></div>
                    <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-blue-500/30 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '1s' }}></div>
                </div>
            </div>

            {/* Modal Container - Max Width 5XL for Dual List */}
            <div
                className="relative z-10 w-full max-w-5xl bg-white/80 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_32px_120px_rgba(0,0,0,0.3)] border border-white/50 flex flex-col max-h-[90vh] animate-fade-in-scale-up overflow-hidden ring-1 ring-black/5"
                onClick={e => e.stopPropagation()}
                style={bgStyle}
            >
                {/* Header */}
                <header className="px-8 py-6 flex-shrink-0 relative overflow-hidden bg-gradient-to-r from-amber-50/50 via-white/50 to-amber-50/50 border-b border-white/50">
                    <div className="flex items-center gap-5 relative z-10">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-primary to-blue-600 p-0.5 shadow-lg shadow-accent-primary/20">
                            <div className="w-full h-full rounded-[0.9rem] bg-white flex items-center justify-center text-accent-primary">
                                <i className={`fas ${isNewTeam ? 'fa-plus' : 'fa-edit'} text-xl`}></i>
                            </div>
                        </div>
                        <div>
                            <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">
                                {isNewTeam ? 'Tạo Phòng Mới' : 'Quản Lý Thành Viên'}
                            </h2>
                            <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
                                {isNewTeam ? 'Thiết lập đội ngũ kinh doanh' : `Phòng: ${editingTeam.leader}`}
                            </p>
                        </div>
                    </div>
                </header>

                {/* Content */}
                <main className="flex-1 overflow-hidden p-6 md:p-8 flex flex-col gap-6">

                    {/* Leader Section */}
                    <div className="bg-white/50 rounded-2xl border border-white/50 p-4 shadow-sm flex items-center gap-4 flex-shrink-0">
                        <div className="w-10 h-10 rounded-xl bg-accent-primary/10 flex items-center justify-center text-accent-primary">
                            <i className="fas fa-user-tie"></i>
                        </div>
                        <div className="flex-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Trưởng Phòng</label>
                            {isNewTeam ? (
                                <select
                                    value={selectedLeader}
                                    onChange={e => setSelectedLeader(e.target.value)}
                                    className="w-full bg-transparent font-bold text-slate-800 outline-none border-b border-dashed border-slate-300 focus:border-accent-primary transition-colors py-1"
                                >
                                    <option value="" disabled>-- Chọn trưởng phòng --</option>
                                    {potentialLeaders.map(name => <option key={name} value={name}>{name}</option>)}
                                </select>
                            ) : (
                                <div className="font-bold text-slate-800">{selectedLeader}</div>
                            )}
                        </div>
                    </div>

                    {/* Dual List Transfer UI */}
                    <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0">
                        {/* Left List: Available */}
                        <div className="flex-1 flex flex-col bg-white/50 rounded-3xl border border-white/60 shadow-inner overflow-hidden">
                            <div className="p-4 border-b border-slate-100 bg-white/30 backdrop-blur-sm">
                                <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3 flex justify-between">
                                    <span>Nhân sự khả dụng</span>
                                    <span className="bg-slate-200 text-slate-500 px-2 rounded-full text-[10px]">{leftList.length}</span>
                                </h4>
                                <div className="relative">
                                    <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                                    <input
                                        type="text"
                                        placeholder="Tìm tên nhân viên..."
                                        value={leftSearch}
                                        onChange={e => setLeftSearch(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-accent-primary/20 outline-none"
                                    />
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                                {leftList.map(member => (
                                    <div
                                        key={member}
                                        onClick={() => moveToRight(member)}
                                        className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm flex items-center justify-between group cursor-pointer hover:border-accent-primary/30 hover:shadow-md transition-all"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-bold uppercase group-hover:bg-accent-primary group-hover:text-white transition-colors">
                                                {member.charAt(0)}
                                            </div>
                                            <span className="text-sm font-medium text-slate-700 group-hover:text-accent-primary transition-colors">{member}</span>
                                        </div>
                                        <div className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-accent-primary group-hover:text-white transition-all">
                                            <i className="fas fa-plus text-[10px]"></i>
                                        </div>
                                    </div>
                                ))}
                                {leftList.length === 0 && (
                                    <div className="text-center p-8 opacity-50">
                                        <i className="fas fa-users-slash text-2xl text-slate-300 mb-2"></i>
                                        <p className="text-xs text-slate-400">Không tìm thấy nhân sự</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Middle Icons (Desktop only) */}
                        <div className="hidden md:flex flex-col justify-center gap-2 text-slate-300">
                            <i className="fas fa-chevron-right"></i>
                            <i className="fas fa-exchange-alt rotate-90 opacity-50"></i>
                            <i className="fas fa-chevron-left"></i>
                        </div>

                        {/* Right List: Selected */}
                        <div className="flex-1 flex flex-col bg-accent-primary/5 rounded-3xl border border-accent-primary/10 shadow-inner overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                                <i className="fas fa-users text-8xl text-accent-primary"></i>
                            </div>
                            <div className="p-4 border-b border-accent-primary/10 bg-white/30 backdrop-blur-sm z-10">
                                <h4 className="text-xs font-black text-accent-primary uppercase tracking-wider mb-3 flex justify-between">
                                    <span>Thành viên đã chọn</span>
                                    <span className="bg-accent-primary text-white px-2 rounded-full text-[10px]">{rightList.length}</span>
                                </h4>
                                <div className="relative">
                                    <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-accent-primary/50 text-xs"></i>
                                    <input
                                        type="text"
                                        placeholder="Lọc danh sách..."
                                        value={rightSearch}
                                        onChange={e => setRightSearch(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-accent-primary/20 text-xs font-medium focus:ring-2 focus:ring-accent-primary/20 outline-none text-accent-primary placeholder-accent-primary/40"
                                    />
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar z-10">
                                {rightList.map(member => (
                                    <div
                                        key={member}
                                        onClick={() => moveToLeft(member)}
                                        className="p-3 bg-white rounded-xl border border-accent-primary/10 shadow-sm flex items-center justify-between group cursor-pointer hover:border-red-200 hover:shadow-md transition-all hover:bg-red-50"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-accent-primary/10 flex items-center justify-center text-accent-primary text-xs font-bold uppercase group-hover:bg-red-100 group-hover:text-red-500 transition-colors">
                                                {member.charAt(0)}
                                            </div>
                                            <span className="text-sm font-bold text-slate-700 group-hover:text-red-600 transition-colors">{member}</span>
                                        </div>
                                        <div className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-red-500 group-hover:text-white transition-all">
                                            <i className="fas fa-minus text-[10px]"></i>
                                        </div>
                                    </div>
                                ))}
                                {rightList.length === 0 && (
                                    <div className="text-center p-8 opacity-50">
                                        <div className="w-12 h-12 rounded-full bg-accent-primary/10 flex items-center justify-center mx-auto mb-2">
                                            <i className="fas fa-inbox text-xl text-accent-primary"></i>
                                        </div>
                                        <p className="text-xs text-accent-primary">Chưa có thành viên nào</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                </main>

                {/* Footer */}
                <footer className="px-8 py-6 flex justify-between items-center bg-transparent shrink-0">
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="h-12 px-8 rounded-2xl text-slate-400 font-bold text-sm hover:text-slate-600 transition-colors"
                    >
                        Đóng
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSubmitting || !selectedLeader}
                        className="h-12 px-10 rounded-2xl bg-accent-primary hover:bg-accent-primary-hover text-white font-bold text-sm shadow-xl shadow-accent-primary/25 disabled:opacity-50 disabled:shadow-none hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-3"
                    >
                        {isSubmitting ? (
                            <><i className="fas fa-spinner fa-spin"></i> Đang xử lý...</>
                        ) : (
                            <>
                                <span>Lưu Cấu Hình</span>
                                <i className="fas fa-check-circle text-xs opacity-50"></i>
                            </>
                        )}
                    </button>
                </footer>
            </div>
        </div>
    );
};
