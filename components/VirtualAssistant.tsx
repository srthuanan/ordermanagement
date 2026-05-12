import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { supabaseAdmin } from '../services/supabaseClient';
import { X, Send, Copy, Check, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    thought?: string; // Bổ sung trường thought để chứa nội dung suy nghĩ
}

// Memoized Markdown components defined outside to avoid recreation on each render
const MARKDOWN_COMPONENTS: any = {
    table: ({ children }: any) => (
        <div className="overflow-x-auto my-2 border rounded-xl border-slate-100 bg-white shadow-sm">
            <table className="w-full text-[11px] text-left">
                {children}
            </table>
        </div>
    ),
    thead: ({ children }: any) => <thead className="bg-slate-50 text-slate-600 uppercase font-bold">{children}</thead>,
    th: ({ children }: any) => <th className="px-2 py-2 border-b border-slate-100">{children}</th>,
    td: ({ children }: any) => <td className="px-2 py-2 border-b border-slate-50">{children}</td>,
    strong: ({ children }: any) => <strong className="text-blue-700 font-bold">{children}</strong>,
    p: ({ children }: any) => <p className="mb-1 last:mb-0">{children}</p>,
    ul: ({ children }: any) => <ul className="pl-4 space-y-0.5 mb-1 list-disc">{children}</ul>,
    li: ({ children }: any) => <li>{children}</li>
};

// Memoized Message Item component
const MessageItem = memo(({ m, i, copiedIndex, handleCopy }: any) => {
    const [showThought, setShowThought] = useState(false);
    
    // Tách phần thought nếu có trong content (đề phòng backend chưa tách)
    const thoughtMatch = m.content.match(/<thought>([\s\S]*?)<\/thought>/);
    const displayContent = m.content.replace(/<thought>[\s\S]*?<\/thought>/, '').trim();
    const thoughtContent = m.thought || (thoughtMatch ? thoughtMatch[1] : null);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={i}
            className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} group mb-4`}
        >
            {/* Thought Block (Nếu là Assistant và có nội dung suy nghĩ) */}
            {m.role === 'assistant' && thoughtContent && (
                <div className="mb-2 ml-4 max-w-[85%]">
                    <button 
                        onClick={() => setShowThought(!showThought)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full text-[10px] font-bold transition-all border border-slate-200"
                    >
                        <Sparkles size={10} className={showThought ? "text-amber-500" : ""} />
                        {showThought ? "ẨN LUỒNG SUY NGHĨ" : "XEM CÁCH AI SUY NGHĨ..."}
                    </button>
                    
                    <AnimatePresence>
                        {showThought && (
                            <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="mt-2 p-3 bg-slate-50/80 border-l-2 border-slate-300 rounded-r-xl text-[11px] text-slate-500 italic leading-relaxed font-mono">
                                    {thoughtContent}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            <div className={`relative max-w-[92%] group/msg`}>
                <div className={`px-4 py-3 rounded-[22px] shadow-sm ${m.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-none shadow-blue-100'
                    : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none ring-1 ring-slate-900/5'
                    }`}>
                    <div className="text-[13px] leading-relaxed prose prose-sm max-w-none">
                        {m.role === 'assistant' ? (
                            <div className="markdown-content">
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={MARKDOWN_COMPONENTS}
                                >
                                    {displayContent}
                                </ReactMarkdown>
                            </div>
                        ) : (
                            displayContent
                        )}
                    </div>
                </div>

                {/* Interaction Tools */}
                {m.role === 'assistant' && (
                    <div className="absolute top-2 -right-10 opacity-0 group-hover/msg:opacity-100 transition-opacity flex flex-col gap-1">
                        <button
                            onClick={() => handleCopy(displayContent, i)}
                            className="p-1.5 bg-white shadow-md border border-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-all active:scale-95"
                            title="Sao chép"
                        >
                            {copiedIndex === i ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );
});

export const VirtualAssistant: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const [imgError, setImgError] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Get user info and load history
    useEffect(() => {
        const consultantName = sessionStorage.getItem("currentConsultant") || "";
        const currentUser = sessionStorage.getItem("currentUser") || "";
        const username = currentUser || consultantName || "";
        const fullName = consultantName || currentUser || "";
        const namePartsInit = (fullName || "").split(' ');
        const lastPartInit = namePartsInit.pop() || "";
        const shortName = lastPartInit ? lastPartInit.charAt(0).toUpperCase() + lastPartInit.slice(1).toLowerCase() : "";

        const fetchHistory = async () => {
            if (!username) return;
            try {
                const { data, error } = await supabaseAdmin.functions.invoke('ai-chat', {
                    body: { action: 'history', username }
                });

                if (error) throw error;

                if (data?.messages && data.messages.length > 0) {
                    setMessages(data.messages);
                } else {
                    const greeting = shortName
                        ? `Chào anh **${shortName}**! ✨ Em có thể hỗ trợ gì cho anh hôm nay ạ?`
                        : `Chào anh! ✨ Em có thể hỗ trợ gì cho anh hôm nay ạ?`;
                    setMessages([{ role: 'assistant', content: greeting }]);
                }
            } catch (err) {
                console.error("Failed to fetch history:", err);
                const greeting = shortName
                    ? `Chào anh **${shortName}**! ✨ Em có thể hỗ trợ gì cho anh hôm nay ạ?`
                    : `Chào anh! ✨ Em có thể hỗ trợ gì cho anh hôm nay ạ?`;
                setMessages([{ role: 'assistant', content: greeting }]);
            }
        };

        fetchHistory();
    }, []);

    const QUICK_ACTIONS = [
        { label: '📊 Tổng quan kho', prompt: 'Báo cáo nhanh tình hình xe rảnh trong kho cho anh' },
        { label: '📦 Đơn hàng mới', prompt: 'Liệt kê 5 đơn hàng mới nhất và trạng thái của chúng' },
        { label: '⚠️ Cấu hình lỗi', prompt: 'Có đơn hàng nào đang bị lỗi hoặc thiếu thông tin không?' }
    ];

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: messages.length <= 1 ? 'auto' : 'smooth'
            });
        }
    }, [messages, isLoading]);

    // Fast scroll when opened
    useEffect(() => {
        if (isOpen && scrollRef.current) {
            // Instant scroll on open to show latest content
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            // Backup with a tiny delay to ensure render is complete
            const timer = setTimeout(() => {
                if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    const handleCopy = useCallback((text: string, index: number) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    }, []);

    const handleSend = async (overrideMsg?: string) => {
        const userMsg = (overrideMsg || input).trim();
        if (!userMsg || isLoading) return;

        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsLoading(true);

        try {
            const consultantName = sessionStorage.getItem("currentConsultant") || "";
            const currentUser = sessionStorage.getItem("currentUser") || "";
            const username = currentUser || consultantName || "anonymous";
            const fullName = consultantName || currentUser || "Quản trị viên";
            const contextData = {
                systemTime: new Date().toLocaleString('vi-VN'),
                userContext: {
                    username: username,
                    fullName: fullName,
                    role: sessionStorage.getItem("userRole") || "Thành viên"
                }
            };

            const { data, error } = await supabaseAdmin.functions.invoke('ai-chat', {
                body: { messages: [...messages, { role: 'user', content: userMsg }], contextData }
            });

            if (error) throw error;
            
            // Tách thought (Nếu backend có trả về thought riêng hoặc gộp trong content)
            const thought = data.thought || (data.content?.match(/<thought>([\s\S]*?)<\/thought>/)?.[1]);
            const cleanContent = data.content?.replace(/<thought>[\s\S]*?<\/thought>/, '').trim();

            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: cleanContent || data.error || "Không nhận được phản hồi.",
                thought: thought
            }]);
        } catch (err: any) {
            setMessages(prev => [...prev, { role: 'assistant', content: `Dạ, có lỗi xảy ra: ${err.message || JSON.stringify(err)}. Anh thử lại sau nhé! 🛠️` }]);
        } finally {
            setIsLoading(false);
        }
    };

    const renderedMessages = useMemo(() => messages.map((m, i) => (
        <MessageItem 
            key={i} 
            m={m} 
            i={i} 
            copiedIndex={copiedIndex} 
            handleCopy={handleCopy} 
        />
    )), [messages, copiedIndex, handleCopy]);

    return (
        <div className="fixed bottom-[100px] sm:bottom-6 right-6 z-[9999] flex flex-col items-end font-sans">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, scale: 0.9, y: 20, filter: 'blur(10px)' }}
                        className="mb-4 w-[400px] h-[600px] bg-white/95 backdrop-blur-2xl rounded-[28px] shadow-[0_30px_100px_rgba(0,0,0,0.18)] border border-white/50 flex flex-col overflow-hidden origin-bottom-right"
                    >
                        {/* Header */}
                        <div className="relative bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 px-5 py-3.5 flex items-center justify-between text-white shrink-0 shadow-lg">
                            <div className="flex items-center gap-3 relative z-10">
                                <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 flex items-center justify-center shadow-inner">
                                    <Sparkles size={20} className="text-white" />
                                </div>
                                <div className="flex flex-col">
                                    <h3 className="font-bold text-[15px] tracking-tight leading-tight uppercase">TRỢ LÝ</h3>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
                                        <span className="text-[9px] text-white/70 font-bold tracking-widest uppercase">AI Hoạt Động</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setIsOpen(false)}
                                className="z-10 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-all active:scale-95"
                            >
                                <X size={18} strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* Chat Area */}
                        <div
                            ref={scrollRef}
                            className="flex-1 overflow-y-auto px-5 py-5 space-y-5 no-scrollbar bg-slate-50/30"
                        >
                            {renderedMessages}

                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-white px-4 py-3 rounded-[20px] rounded-tl-none border border-slate-100 flex gap-2 items-center shadow-sm">
                                        <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                                        <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                                        <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Quick Actions */}
                        {!isLoading && (
                            <div className="px-5 py-2.5 flex gap-2 overflow-x-auto no-scrollbar bg-white border-t border-slate-50 shadow-[0_-5px_15px_rgba(0,0,0,0.02)]">
                                {QUICK_ACTIONS.map((action, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleSend(action.prompt)}
                                        className="whitespace-nowrap px-4 py-2 bg-slate-50 border border-slate-200 text-slate-600 text-[11px] font-bold rounded-xl hover:border-blue-300 hover:text-blue-600 hover:bg-white transition-all shadow-sm"
                                    >
                                        {action.label}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Input Area */}
                        <div className="px-5 py-4 bg-white border-t border-slate-100 shadow-[0_-10px_20px_rgba(0,0,0,0.03)]">
                            <div className="relative flex items-center bg-slate-50 rounded-2xl ring-1 ring-slate-100 focus-within:ring-2 focus-within:ring-blue-500/30 focus-within:bg-white focus-within:shadow-md transition-all">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                    placeholder="Hỗ trợ thông tin công việc..."
                                    className="flex-1 bg-transparent border-none px-4 py-3.5 text-[14px] outline-none placeholder:text-slate-400"
                                />
                                <button
                                    onClick={() => handleSend()}
                                    disabled={!input.trim() || isLoading}
                                    className="mr-2 w-9 h-9 flex items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:bg-slate-200 disabled:shadow-none transition-all active:scale-90"
                                >
                                    {isLoading ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <Send size={16} fill="currentColor" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {!isOpen && (
                <motion.button
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsOpen(true)}
                    className="group p-0 w-16 h-16 bg-white/60 backdrop-blur-xl rounded-full border border-white/40 shadow-[0_15px_40px_rgba(0,0,0,0.15)] flex items-center justify-center overflow-hidden touch-none"
                >
                    <div className="relative z-10 w-full h-full flex items-center justify-center p-2">
                        {!imgError ? (
                            <motion.img 
                                src="https://jwvgxqrkjlbewvpkvucj.supabase.co/storage/v1/object/public/car-images/logoai.png"
                                alt="AI"
                                onError={() => setImgError(true)}
                                animate={{ 
                                    y: [0, -4, 0],
                                }}
                                transition={{ 
                                    duration: 3, 
                                    repeat: Infinity, 
                                    ease: "easeInOut" 
                                }}
                                className="w-14 h-14 object-contain drop-shadow-[0_10px_15px_rgba(0,0,0,0.1)] group-hover:scale-110 transition-transform duration-500"
                            />
                        ) : (
                            <Sparkles size={28} className="text-[#3b82f6] group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 ease-out" />
                        )}
                    </div>

                    {/* Pulsing online indicator */}
                    <span className="absolute top-3 right-3 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white shadow-[0_0_10px_#34d399]" />
                </motion.button>
            )}
        </div>
    );
};
