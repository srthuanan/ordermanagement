import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase, supabaseAdmin } from '../../services/supabaseClient';
import AnimatedBackground from '../ui/AnimatedBackground';
import Button from '../ui/Button';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Memoized Markdown components for premium look
const MARKDOWN_COMPONENTS: any = {
    table: ({ children }: any) => (
        <div className="overflow-x-auto my-4 border rounded-xl border-slate-200 bg-white shadow-sm ring-1 ring-slate-900/5">
            <table className="w-full text-xs text-left border-collapse">
                {children}
            </table>
        </div>
    ),
    thead: ({ children }: any) => <thead className="bg-slate-50/80 backdrop-blur-sm text-slate-600 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">{children}</thead>,
    th: ({ children }: any) => <th className="px-4 py-3 font-black text-slate-700">{children}</th>,
    td: ({ children }: any) => <td className="px-4 py-3 border-b border-slate-100 text-slate-600 font-medium">{children}</td>,
    strong: ({ children }: any) => <strong className="text-blue-700 font-bold decoration-blue-200/50 decoration-2">{children}</strong>,
    p: ({ children }: any) => <p className="mb-4 last:mb-0 leading-relaxed text-slate-600 font-medium">{children}</p>,
    ul: ({ children }: any) => <ul className="mb-6 border-t border-slate-100">{children}</ul>,
    li: ({ children }: any) => (
        <li className="py-3 px-4 border-b border-slate-50 flex items-start gap-3 hover:bg-slate-50/50 transition-colors">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0"></span>
            <div className="text-sm text-slate-700 font-semibold leading-relaxed">{children}</div>
        </li>
    ),
    h3: ({ children }: any) => <h3 className="text-lg font-black text-slate-800 mt-6 mb-3 flex items-center gap-2">
        <span className="w-1 h-6 bg-blue-600 rounded-full"></span>
        {children}
    </h3>,
    h4: ({ children }: any) => <h4 className="text-sm font-black text-slate-700 mt-4 mb-2 uppercase tracking-wide">{children}</h4>,
};

interface Lesson {
    id: string;
    category: string;
    lesson_key: string;
    content: string;
    importance: number;
    visibility: 'public' | 'admin';
    status?: 'PENDING' | 'ACTIVE';
    created_at: string;
}

const AIKnowledgeManagement: React.FC = () => {
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedFolder, setSelectedFolder] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    const [editData, setEditData] = useState<Partial<Lesson>>({ category: '', content: '', importance: 3, visibility: 'public' });
    const [mobileView, setMobileView] = useState<'folders' | 'list' | 'detail'>('folders');

    // Auto-resize textarea effect
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [isEditing, editData.content]);

    // AI Scanning States
    const [isAiScanning, setIsAiScanning] = useState(false);
    const [aiReviewMode, setAiReviewMode] = useState(false);
    const [pendingAiLessons, setPendingAiLessons] = useState<any[]>([]);
    const [selectedAiIndices, setSelectedAiIndices] = useState<Set<number>>(new Set());
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchLessons = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('ai_knowledge_base')
            .select('id, category, lesson_key, content, importance, visibility, status, created_at')
            .order('importance', { ascending: false });
        // Handle case where status doesn't exist yet gracefully
        if (!error && data) {
            setLessons(data.map(d => ({ ...d, status: d.status || 'ACTIVE' })));
            if (data.length > 0 && !selectedLessonId) {
                setSelectedLessonId(data[0].id);
            }
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchLessons();
    }, []);

    const categories = useMemo(() => {
        const cats = Array.from(new Set(lessons.map(l => l.category)));
        return cats.sort();
    }, [lessons]);

    const folders = [
        { id: 'pending', label: 'Chờ Kiểm Duyệt', icon: 'fa-user-clock text-orange-500', count: lessons.filter(l => l.status === 'PENDING').length },
        { id: 'all', label: 'Tất Cả Bài Học', icon: 'fa-brain', count: lessons.length },
        ...categories.map(cat => ({
            id: cat,
            label: cat,
            icon: 'fa-folder',
            count: lessons.filter(l => l.category === cat).length
        }))
    ];

    const filteredLessons = useMemo(() => {
        return lessons.filter(l => {
            if (selectedFolder === 'pending' && l.status !== 'PENDING') return false;
            if (selectedFolder !== 'all' && selectedFolder !== 'pending' && l.category !== selectedFolder) return false;
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                return l.content.toLowerCase().includes(q) || l.category.toLowerCase().includes(q);
            }
            return true;
        });
    }, [lessons, selectedFolder, searchQuery]);

    const selectedLesson = lessons.find(l => l.id === selectedLessonId) || null;

    const handleStartCreate = () => {
        setEditData({ category: '', content: '', importance: 3, visibility: 'public' });
        setSelectedLessonId(null);
        setIsEditing(true);
        setAiReviewMode(false);
        setMobileView('detail');
    };

    const handleStartEdit = () => {
        if (selectedLesson) {
            setEditData({ ...selectedLesson });
            setIsEditing(true);
            setAiReviewMode(false);
        }
    };

    const handleSave = async () => {
        if (!editData.category?.trim() || !editData.content?.trim()) return;

        let error;
        if (editData.id) {
            const { error: err } = await supabase.from('ai_knowledge_base').update({
                category: editData.category,
                content: editData.content,
                importance: editData.importance,
                visibility: editData.visibility,
                updated_at: new Date().toISOString()
            }).eq('id', editData.id);
            error = err;
        } else {
            const lessonKey = `AUTO_${Date.now()}`;
            const { error: err } = await supabase.from('ai_knowledge_base').insert([{
                category: editData.category,
                content: editData.content,
                importance: editData.importance,
                visibility: editData.visibility,
                lesson_key: lessonKey
            }]);
            error = err;
        }

        if (!error) {
            setIsEditing(false);
            fetchLessons();
            // Tự động đồng bộ ngay sau khi lưu
            handleSyncEmbeddings();
        }
    };

    const handleApprove = async (id: string) => {
        const { error } = await supabase.from('ai_knowledge_base').update({ status: 'ACTIVE' }).eq('id', id);
        if (!error) fetchLessons();
        else alert('Lỗi duyệt bài: ' + error.message);
    };

    const handleDelete = async (id: string) => {
        const { error } = await supabase.from('ai_knowledge_base').delete().eq('id', id);
        if (!error) {
            setSelectedLessonId(null);
            fetchLessons();
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'message/rfc822', 'text/plain', ''];
        const isEml = file.name.toLowerCase().endsWith('.eml');

        if (!validTypes.includes(file.type) && !isEml) {
            alert('Chỉ hỗ trợ file PDF, Hình ảnh (JPG, PNG, WebP) hoặc Email (.eml)');
            return;
        }

        setIsAiScanning(true);

        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                try {
                    const base64String = (reader.result as string).split(',')[1];

                    const { data: result, error: invokeError } = await supabaseAdmin.functions.invoke('scan-knowledge', {
                        body: { base64Data: base64String, mimeType: file.type }
                    });

                    if (invokeError) throw invokeError;

                    if (result && result.success && result.data) {
                        const points = result.data.knowledge_points;
                        if (Array.isArray(points) && points.length > 0) {
                            setPendingAiLessons(points);
                            setSelectedAiIndices(new Set(points.keys()));
                            setAiReviewMode(true);
                            setIsEditing(false);
                            setSelectedLessonId(null);
                            setMobileView('detail');
                        } else {
                            alert('AI không tìm thấy kiến thức nào trong tài liệu này.');
                        }
                    } else {
                        alert('Lỗi AI: ' + (result?.error || 'Lỗi không xác định'));
                    }
                } catch (e: any) {
                    alert('Lỗi kết nối tới AI: ' + e.message);
                } finally {
                    setIsAiScanning(false);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                }
            };
        } catch (error) {
            alert('Lỗi đọc file');
            setIsAiScanning(false);
        }
    };

    const handleSyncEmbeddings = async () => {
        setIsAiScanning(true);
        try {
            const { data, error } = await supabaseAdmin.functions.invoke('sync-embeddings');
            if (error) throw error;
            if (data?.success) {
                if (data.lastError && data.updated === 0) {
                    alert('Lỗi đồng bộ: ' + data.lastError);
                } else {
                    alert(`Đã đồng bộ thành công ${data.updated}/${data.processed} vector kiến thức.`);
                }
                fetchLessons();
            } else {
                alert('Lỗi hệ thống: ' + (data?.error || 'Không xác định'));
            }
        } catch (e: any) {
            console.error('Sync error:', e);
            alert('Lỗi khi gọi hàm đồng bộ: ' + e.message);
        } finally {
            setIsAiScanning(false);
        }
    };

    const handleSaveAiLessons = async () => {
        const toSave = pendingAiLessons.filter((_, i) => selectedAiIndices.has(i));
        if (toSave.length === 0) return;

        const entries = toSave.map(p => ({
            category: p.category,
            content: p.content,
            importance: p.importance,
            lesson_key: `AI_SCAN_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
        }));

        const { error } = await supabase.from('ai_knowledge_base').insert(entries);

        if (!error) {
            setAiReviewMode(false);
            setPendingAiLessons([]);
            fetchLessons();
            // Tự động kích hoạt đồng bộ sau khi nạp xong
            handleSyncEmbeddings();
        } else {
            alert('Lỗi khi lưu kiến thức: ' + error.message);
        }
    };

    const getImportanceColor = (val: number) => {
        if (val >= 5) return 'text-red-500 bg-red-50 border-red-100';
        if (val >= 3) return 'text-orange-500 bg-orange-50 border-orange-100';
        return 'text-blue-500 bg-blue-50 border-blue-100';
    };

    return (
        <div className="flex h-full bg-slate-50 md:rounded-xl shadow-md border-0 md:border border-border-primary overflow-hidden animate-fade-in relative z-0">
            <AnimatedBackground />

            {/* Cột 1: Thư mục (Categories) */}
            <div className={`w-full md:w-64 flex-shrink-0 border-r border-border-primary bg-surface-ground/90 flex flex-col relative z-10 ${mobileView !== 'folders' ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 border-b border-border-secondary bg-white flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
                        <i className="fas fa-brain text-sm"></i>
                    </div>
                    <span className="font-black text-sm text-slate-800 tracking-tight uppercase">Trí Tuệ AI</span>
                </div>
                <nav className="flex-1 p-2 space-y-1 overflow-y-auto no-scrollbar">
                    {folders.map(folder => (
                        <button
                            key={folder.id}
                            onClick={() => { setSelectedFolder(folder.id); setMobileView('list'); }}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${selectedFolder === folder.id ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'text-slate-500 hover:bg-white hover:text-blue-600 hover:shadow-sm'}`}
                        >
                            <div className="flex items-center gap-3">
                                <i className={`fas ${folder.icon} w-5 text-center opacity-70`}></i>
                                <span>{folder.label}</span>
                            </div>
                            {folder.count > 0 && <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${selectedFolder === folder.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'}`}>{folder.count}</span>}
                        </button>
                    ))}
                </nav>

                <div className="p-3 border-t border-border-secondary bg-slate-50 relative z-20">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                        accept=".pdf,image/png,image/jpeg,image/webp,.eml"
                    />
                    <Button
                        onClick={() => fileInputRef.current?.click()}
                        variant="primary"
                        className="w-full font-bold shadow-lg shadow-blue-100 py-3 text-xs flex items-center justify-center gap-2 mb-2"
                        leftIcon={<i className={`fas fa-magic ${isAiScanning ? 'animate-pulse' : ''}`}></i>}
                        disabled={isAiScanning}
                        isLoading={isAiScanning}
                    >
                        {isAiScanning ? 'Đang phân tích...' : 'Nạp Kiến Thức (AI)'}
                    </Button>
                    <Button
                        onClick={handleSyncEmbeddings}
                        variant="secondary"
                        className="w-full font-bold py-2 text-[10px] flex items-center justify-center gap-2 border-dashed border-blue-200"
                        leftIcon={<i className={`fas fa-sync-alt ${isAiScanning ? 'animate-spin' : ''}`}></i>}
                        disabled={isAiScanning}
                    >
                        Đồng bộ Vector
                    </Button>
                </div>
            </div>

            {/* Cột 2: Danh sách Bài học */}
            <div className={`w-full md:w-[400px] lg:w-[450px] flex-shrink-0 border-r border-border-primary flex flex-col bg-white/90 relative z-10 ${mobileView !== 'list' ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-3 bg-white border-b border-border-secondary flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setMobileView('folders')} className="md:hidden p-2 hover:bg-slate-100 rounded-lg">
                            <i className="fas fa-arrow-left text-slate-400"></i>
                        </button>
                        <span className="font-black text-[11px] text-slate-400 uppercase tracking-widest pl-1">
                            {selectedFolder === 'all' ? 'Tất cả bài học' : `Nhóm: ${selectedFolder}`}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={fetchLessons} 
                            disabled={loading} 
                            className="p-1.5 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 text-[10px] font-black uppercase transition-all flex items-center gap-2 border border-slate-100 shadow-sm"
                            title="Làm mới danh sách"
                        >
                            <i className={`fas fa-sync-alt ${loading ? 'animate-spin' : ''}`}></i> {loading ? 'Đang tải...' : 'Làm mới'}
                        </button>
                        <button onClick={handleStartCreate} className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 text-[10px] font-black uppercase transition-all flex items-center gap-2 border border-blue-100 shadow-sm">
                            <i className="fas fa-plus"></i> Thêm mới
                        </button>
                    </div>
                </div>

                <div className="p-3 bg-white border-b border-border-secondary/60">
                    <div className="relative group">
                        <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs transition-colors group-focus-within:text-blue-600"></i>
                        <input
                            type="text"
                            placeholder="Tìm kiếm kiến thức, quy tắc..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-50 border-transparent focus:bg-white focus:border-blue-200 text-xs font-bold pl-9 pr-3 py-2.5 rounded-xl transition-all outline-none"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar divide-y divide-slate-100">
                    {filteredLessons.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 opacity-40">
                            <i className="fas fa-comment-slash text-4xl mb-4 text-slate-300"></i>
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Trống nội dung</p>
                        </div>
                    ) : (
                        filteredLessons.map(lesson => (
                            <div
                                key={lesson.id}
                                onClick={() => { setSelectedLessonId(lesson.id); setIsEditing(false); setAiReviewMode(false); setMobileView('detail'); }}
                                className={`px-4 py-4 cursor-pointer transition-all border-l-4 ${selectedLessonId === lesson.id && !isEditing && !aiReviewMode ? 'bg-blue-50/50 border-blue-600' : 'border-transparent hover:bg-slate-50'}`}
                            >
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${getImportanceColor(lesson.importance)}`}>
                                        {lesson.category}
                                    </span>
                                    {lesson.status === 'PENDING' && (
                                        <span className="px-1.5 py-0.5 rounded bg-orange-500 text-white text-[8px] font-black uppercase tracking-widest flex items-center gap-1 animate-pulse">
                                            <i className="fas fa-clock text-[7px]"></i> CHỜ DUYỆT
                                        </span>
                                    )}
                                    {lesson.visibility === 'admin' && (
                                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-white text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                                            <i className="fas fa-lock text-[7px]"></i> {lesson.visibility}
                                        </span>
                                    )}
                                </div>
                                <span className="text-[9px] font-bold text-slate-300">#{lesson.importance}/5</span>
                                <p className={`text-[12px] leading-relaxed line-clamp-2 font-bold ${selectedLessonId === lesson.id && !aiReviewMode ? 'text-blue-900' : 'text-slate-600'}`}>
                                    {lesson.content}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Cột 3: Chi tiết / AI Review */}
            <div className={`flex-1 flex flex-col bg-surface-ground/90 min-w-0 relative z-10 ${mobileView !== 'detail' ? 'hidden md:flex' : 'flex'}`}>
                {aiReviewMode ? (
                    <div className="flex flex-col h-full bg-white/50">
                        <div className="px-6 py-4 bg-white border-b border-border-secondary flex items-center justify-between shadow-sm flex-shrink-0">
                            <div className="flex items-center gap-4">
                                <button onClick={() => setMobileView('list')} className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                                    <i className="fas fa-arrow-left"></i>
                                </button>
                                <div>
                                    <h2 className="text-sm font-black text-blue-600 uppercase tracking-tight">
                                        Xác nhận kiến thức từ AI
                                    </h2>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tìm thấy {pendingAiLessons.length} mục kiến thức</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button onClick={() => { setAiReviewMode(false); setPendingAiLessons([]); }} variant="secondary" size="sm" className="font-bold">Hủy</Button>
                                <Button onClick={handleSaveAiLessons} variant="primary" size="sm" className="font-bold shadow-lg shadow-blue-100" leftIcon={<i className="fas fa-check-double"></i>}>
                                    Nạp {selectedAiIndices.size} Kiến Thức
                                </Button>
                            </div>
                        </div>

                        <div className="flex-1 p-4 md:p-6 overflow-y-auto no-scrollbar space-y-4">
                            {pendingAiLessons.map((p, i) => (
                                <div key={i} className={`bg-white border rounded-2xl p-4 shadow-sm transition-all ${selectedAiIndices.has(i) ? 'border-blue-200 ring-2 ring-blue-50' : 'opacity-50 grayscale'}`}>
                                    <div className="flex items-start gap-4">
                                        <div className="pt-1">
                                            <input
                                                type="checkbox"
                                                checked={selectedAiIndices.has(i)}
                                                onChange={() => {
                                                    const next = new Set(selectedAiIndices);
                                                    if (next.has(i)) next.delete(i);
                                                    else next.add(i);
                                                    setSelectedAiIndices(next);
                                                }}
                                                className="w-5 h-5 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                            />
                                        </div>
                                        <div className="flex-1 space-y-3">
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={p.category}
                                                    onChange={e => {
                                                        const next = [...pendingAiLessons];
                                                        next[i] = { ...next[i], category: e.target.value };
                                                        setPendingAiLessons(next);
                                                    }}
                                                    className="w-1/3 text-[10px] font-black uppercase tracking-wider bg-slate-50 border-none rounded-lg px-3 py-1"
                                                />
                                                <div className="flex-1 flex items-center gap-2">
                                                    <span className="text-[9px] font-black text-slate-300 uppercase">Ưu tiên:</span>
                                                    <input
                                                        type="range" min="1" max="5"
                                                        value={p.importance}
                                                        onChange={e => {
                                                            const next = [...pendingAiLessons];
                                                            next[i] = { ...next[i], importance: parseInt(e.target.value) };
                                                            setPendingAiLessons(next);
                                                        }}
                                                        className="h-1 flex-1 accent-blue-600"
                                                    />
                                                </div>
                                            </div>
                                            <textarea
                                                value={p.content}
                                                rows={2}
                                                onChange={e => {
                                                    const next = [...pendingAiLessons];
                                                    next[i] = { ...next[i], content: e.target.value };
                                                    setPendingAiLessons(next);
                                                }}
                                                className="w-full text-xs font-bold text-slate-700 bg-slate-50 border-none rounded-xl px-4 py-3 focus:bg-white transition-colors"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : selectedLesson || isEditing ? (
                    <div className="flex flex-col h-full bg-white/50">
                        <div className="px-6 py-4 bg-white border-b border-border-secondary flex items-center justify-between shadow-sm flex-shrink-0">
                            <div className="flex items-center gap-4">
                                <button onClick={() => setMobileView('list')} className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                                    <i className="fas fa-arrow-left"></i>
                                </button>
                                <div>
                                    <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                                        {isEditing ? (selectedLesson ? 'Chỉnh sửa bài học' : 'Dạy AI kiến thức mới') : 'Chi tiết tri thức'}
                                    </h2>
                                    {!isEditing && selectedLesson && (
                                        <div className="flex flex-wrap items-center gap-3 mt-1.5 animate-fade-in">
                                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[9px] font-black rounded-lg border border-blue-100 uppercase tracking-wide">{selectedLesson.category}</span>
                                            <div className="h-3 w-px bg-slate-200"></div>
                                            <div className="flex gap-0.5">
                                                {[1, 2, 3, 4, 5].map(star => (
                                                    <i key={star} className={`fas fa-bolt text-[9px] ${star <= selectedLesson.importance ? 'text-amber-400' : 'text-slate-200'}`}></i>
                                                ))}
                                            </div>
                                            <div className="h-3 w-px bg-slate-200"></div>
                                            <div className="flex items-center gap-1">
                                                <i className="far fa-calendar-alt text-[9px] text-slate-400"></i>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase">{new Date(selectedLesson.created_at).toLocaleDateString('vi-VN')}</span>
                                            </div>
                                            <div className="h-3 w-px bg-slate-200"></div>
                                            <span className={`text-[9px] font-black uppercase ${selectedLesson.visibility === 'admin' ? 'text-slate-600' : 'text-emerald-500'}`}>
                                                {selectedLesson.visibility === 'admin' ? '🔒 Nội bộ' : '🌍 Công khai'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {isEditing ? (
                                    <>
                                        <Button onClick={() => setIsEditing(false)} variant="secondary" size="sm" className="font-bold border-slate-200">Hủy bỏ</Button>
                                        <Button onClick={handleSave} variant="primary" size="sm" className="font-black px-8 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200">LƯU TRI THỨC</Button>
                                    </>
                                ) : (
                                    <>
                                        {selectedLesson?.status === 'PENDING' && (
                                            <Button 
                                                onClick={() => handleApprove(selectedLesson.id)}
                                                variant="primary" 
                                                size="sm"
                                                className="font-black px-6 bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-100 animate-fade-in"
                                                leftIcon={<i className="fas fa-check-double text-[10px]"></i>}
                                            >
                                                DUYỆT NGAY
                                            </Button>
                                        )}
                                        <Button onClick={handleStartEdit} variant="secondary" size="sm" className="font-bold border-slate-200" leftIcon={<i className="fas fa-edit text-blue-500"></i>}>Chỉnh sửa</Button>
                                        <Button onClick={() => handleDelete(selectedLesson!.id)} variant="secondary" size="sm" className="font-bold text-red-500 border-red-50 hover:bg-red-50" leftIcon={<i className="fas fa-trash-alt"></i>}>Xoá bỏ</Button>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 p-6 md:p-8 lg:p-12 overflow-y-auto no-scrollbar scroll-smooth">
                            <div className="w-full space-y-8 animate-fade-up">
                                {isEditing ? (
                                    <div className="space-y-6 animate-fade-in">
                                        <div className="bg-white p-8 rounded-3xl border border-blue-50 shadow-2xl shadow-blue-50/50">
                                            <div className="space-y-8">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="space-y-2">
                                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Nhóm Chuyên Mục</label>
                                                        <input
                                                            type="text"
                                                            value={editData.category}
                                                            onChange={e => setEditData({ ...editData, category: e.target.value })}
                                                            placeholder="Ví dụ: VINFAST_SPECS, POLICY..."
                                                            className="w-full text-sm font-bold bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl px-5 py-4 transition-all outline-none"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Hiển Thị</label>
                                                        <select
                                                            value={editData.visibility}
                                                            onChange={e => setEditData({ ...editData, visibility: e.target.value as any })}
                                                            className="w-full text-sm font-bold bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl px-5 py-[15px] transition-all outline-none"
                                                        >
                                                            <option value="public">🌍 CÔNG KHAI (TOÀN BÀN)</option>
                                                            <option value="admin">🔒 NỘI BỘ (CHỈ ADMIN)</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Nội dung bài học (Hỗ trợ Markdown)</label>
                                                    <textarea
                                                        ref={textareaRef}
                                                        value={editData.content}
                                                        onChange={e => setEditData({ ...editData, content: e.target.value })}
                                                        placeholder="Nhập nội dung bài học..."
                                                        className="w-full text-base font-medium bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl px-6 py-5 transition-all outline-none leading-relaxed resize-none overflow-hidden"
                                                    />
                                                </div>

                                                <div className="pt-4 border-t border-slate-100">
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 pl-1">Mức độ ưu tiên của kiến thức: {editData.importance}/5</label>
                                                    <div className="flex items-center gap-6">
                                                        <input
                                                            type="range" min="1" max="5"
                                                            value={editData.importance}
                                                            onChange={e => setEditData({ ...editData, importance: parseInt(e.target.value) })}
                                                            className="flex-1 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                                        />
                                                        <div className="flex gap-1">
                                                            {[1, 2, 3, 4, 5].map(star => (
                                                                <i key={star} className={`fas fa-star text-sm ${star <= (editData.importance || 0) ? 'text-amber-400' : 'text-slate-200'}`}></i>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : selectedLesson ? (
                                    <div className="w-full animate-fade-up">
                                        <div className="bg-white p-8 md:p-12 rounded-[40px] border border-slate-100 shadow-2xl shadow-slate-200/10 relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-80 h-80 bg-blue-50/20 rounded-full blur-3xl -mr-40 -mt-40 pointer-events-none"></div>
                                            
                                            <div className="relative z-10 w-full">
                                                <div className="prose prose-slate prose-blue max-w-none w-full markdown-viewer">
                                                    <ReactMarkdown
                                                        remarkPlugins={[remarkGfm]}
                                                        components={MARKDOWN_COMPONENTS}
                                                    >
                                                        {selectedLesson.content}
                                                    </ReactMarkdown>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 opacity-40">
                        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-inner mb-6">
                            <i className="fas fa-mouse-pointer text-4xl text-slate-200"></i>
                        </div>
                        <p className="text-sm font-bold uppercase tracking-widest text-slate-400">Chọn một bài học để xem chi tiết</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AIKnowledgeManagement;
