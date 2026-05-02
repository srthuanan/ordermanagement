import React, { useState, useEffect, useRef, useCallback } from 'react';
import moment from 'moment';
import * as apiService from '../../services/apiService';
import { supabase } from '../../services/supabaseClient';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import FilePreviewModal from '../modals/FilePreviewModal';

interface ChatMessage {
    id: string;
    timestamp: string;
    senderName: string;
    senderRole: string;
    message: string;
    mentions: string[];
    reactions?: Record<string, string[]>;
    replyTo?: string; // timestamp of the message being replied to
    isPinned?: boolean;
    fileId?: string;
    isSending?: boolean;
    recipient?: string;
}

interface UserInfo {
    username: string;
    fullName: string;
    role: string;
}

interface InternalChatProps {
    currentUser: string;
    currentUserName: string;
    userRole: string;
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    setUnreadCount: React.Dispatch<React.SetStateAction<number>>;
}

const InternalChat: React.FC<InternalChatProps> = ({
    currentUser,
    currentUserName,
    userRole,
    isOpen,
    setIsOpen,
    setUnreadCount
}) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [pinnedMessages, setPinnedMessages] = useState<ChatMessage[]>([]);
    const [users, setUsers] = useState<UserInfo[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [isFetching, setIsFetching] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [showMentionPanel, setShowMentionPanel] = useState(false);
    const [mentionQuery, setMentionQuery] = useState('');
    const [activeReactionId, setActiveReactionId] = useState<string | null>(null);
    const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
    const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    // Mở rộng tính năng
    const [msgLimit, setMsgLimit] = useState(300);
    const [activeChatUser, setActiveChatUser] = useState<string | null>(null);
    const [currentView, setCurrentView] = useState<'list' | 'chat'>('list');

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Filter messages for current tab
    const filteredMessages = React.useMemo(() => {
        if (!activeChatUser) {
            return messages.filter(m => !m.recipient);
        }

        const activeUserObj = users.find(u => u.username === activeChatUser);
        const activeUserFullName = activeUserObj?.fullName || activeChatUser;

        return messages.filter(m =>
            (m.senderName === currentUser && m.recipient === activeChatUser) ||
            (m.recipient === currentUserName && m.senderName === activeUserFullName) ||
            (m.recipient === currentUserName && m.senderName === activeChatUser) // fallback just in case senderName was logged as username
        );
    }, [messages, activeChatUser, currentUser, currentUserName, users]);

    // Tính năng kéo thả (Drag and Drop)
    const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
    const isDragging = useRef(false);
    const dragStart = useRef({ x: 0, y: 0 });

    const handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
        if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).tagName === 'INPUT') return;
        isDragging.current = true;
        dragStart.current = {
            x: e.clientX - dragPos.x,
            y: e.clientY - dragPos.y
        };
    };

    useEffect(() => {
        const handleDragMove = (e: MouseEvent) => {
            if (!isDragging.current) return;
            setDragPos({
                x: e.clientX - dragStart.current.x,
                y: e.clientY - dragStart.current.y
            });
        };
        const handleDragEnd = () => {
            isDragging.current = false;
        };

        if (isOpen) {
            window.addEventListener('mousemove', handleDragMove);
            window.addEventListener('mouseup', handleDragEnd);
        }

        return () => {
            window.removeEventListener('mousemove', handleDragMove);
            window.removeEventListener('mouseup', handleDragEnd);
        };
    }, [isOpen]);

    // Debounce search input
    useEffect(() => {
        const handler = setTimeout(() => {
            setSearchQuery(searchInput);
        }, 500);
        return () => clearTimeout(handler);
    }, [searchInput]);

    const markAsRead = async () => {
        try {
            await apiService.postApi({
                action: 'markChatAsRead',
                updatedBy: currentUser // Quan trọng: Phải gửi ai là người đang xem
            });
        } catch (error) {
            console.error('Failed to mark chat as read:', error);
        }
    };

    const fetchUsers = async () => {
        try {
            const result = await apiService.getUsers();
            if (result && result.status === 'SUCCESS' && Array.isArray(result.users)) {
                setUsers(result.users.map((u: any) => ({
                    username: u.username,
                    fullName: u.name || u.fullName,
                    role: u.role
                })));
            }
        } catch (e) {
            console.error("Failed to fetch users for mentions", e);
        }
    };

    // Map Supabase record to ChatMessage interface
    const mapToChatMessage = (m: any): ChatMessage => ({
        id: m.id,
        timestamp: m.created_at,
        senderName: m.actor_name || m.sender_name,
        senderRole: m.metadata?.sender_role || m.sender_role,
        message: m.message,
        mentions: m.metadata?.mentions || m.mentions || [],
        reactions: m.metadata?.reactions || m.reactions || {},
        replyTo: m.metadata?.reply_to || m.reply_to,
        isPinned: m.metadata?.is_pinned || m.is_pinned,
        fileId: m.metadata?.file_id || m.file_id,
        recipient: m.recipient
    });

    // Initial load & Polling
    const fetchMessages = useCallback(async (isSilent = true) => {
        if (!isSilent) setIsFetching(true);
        try {
            const result = await apiService.getSupabaseChatMessages(msgLimit, searchQuery);
            if (result.status === 'SUCCESS' && Array.isArray(result.messages)) {
                setMessages(prev => {
                    // Combine server messages with local-only messages (still sending)
                    const serverMessages = result.messages;
                    const sendingMessages = prev.filter(msg => msg.id.startsWith('local_'));

                    // Filter out local messages that have been confirmed by server
                    const confirmedLocal = sendingMessages.filter(local =>
                        !serverMessages.some((server: ChatMessage) =>
                            server.senderName === local.senderName &&
                            server.message === local.message &&
                            Math.abs(new Date(server.timestamp).getTime() - new Date(local.timestamp).getTime()) < 60000
                        )
                    );

                    const combined = [...serverMessages, ...confirmedLocal];
                    combined.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

                    return combined;
                });
            }
        } catch (error) {
            console.error('Failed to fetch chat messages:', error);
        } finally {
            if (!isSilent) setIsFetching(false);
        }
    }, [searchQuery, msgLimit]);

    const fetchPinnedMessages = async () => {
        try {
            const result = await apiService.getSupabasePinnedMessages();
            if (result.status === 'SUCCESS' && Array.isArray(result.messages)) {
                setPinnedMessages(result.messages.map(mapToChatMessage));
            } else if (result.status === 'SUCCESS') {
                setPinnedMessages([]);
            }
        } catch (e) {
            console.error("Failed to fetch pinned messages", e);
        }
    };

    // SETUP REALTIME SUBSCRIPTION
    useEffect(() => {
        const channel = supabase
            .channel('internal-chat')
            .on(
                'postgres_changes',
                { event: '*', table: 'interactions', schema: 'public' },
                (payload) => {
                    const changedItem = (payload.new as any) || (payload.old as any);
                    if (changedItem && changedItem.category !== 'MESSAGE') return;

                    console.log('Realtime chat interaction:', payload);

                    if (payload.eventType === 'INSERT') {
                        const newMsg = mapToChatMessage(payload.new);

                        setMessages(prev => {
                            // Avoid duplicates
                            if (prev.some(m => m.id === newMsg.id)) return prev;

                            // Remove matching local sending message
                            const filtered = prev.filter(m =>
                                !(m.id.startsWith('local_') &&
                                    m.senderName === newMsg.senderName &&
                                    m.message === newMsg.message)
                            );

                            const updated = [...filtered, newMsg].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

                            // Unread count logic
                            if (!isOpen && newMsg.senderName !== currentUser && newMsg.senderName !== currentUserName) {
                                if (!newMsg.recipient || newMsg.recipient === currentUser || newMsg.recipient === currentUserName) {
                                    setUnreadCount(c => c + 1);
                                }
                            }

                            return updated;
                        });

                        if (isOpen && currentView === 'chat') {
                            setTimeout(scrollToBottom, 100);
                        }
                    } else if (payload.eventType === 'UPDATE') {
                        const updatedMsg = mapToChatMessage(payload.new);
                        setMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));

                        if (updatedMsg.isPinned) {
                            fetchPinnedMessages();
                        }
                    } else if (payload.eventType === 'DELETE') {
                        setMessages(prev => prev.filter(m => m.id !== payload.old.id));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [isOpen, currentUser, currentUserName, setUnreadCount, currentView]);

    useEffect(() => {
        // Initial fetch
        fetchMessages(false);
        fetchUsers();
        fetchPinnedMessages();
    }, [fetchMessages]);

    // Scroll to bottom when new messages arrive or when opened
    useEffect(() => {
        if (isOpen && currentView === 'chat') {
            // Using a short timeout to ensure the DOM has updated and images started loading
            const timer = setTimeout(() => {
                scrollToBottom();
            }, 100);

            // Clear unread count khi hộp chat đang mở
            if (activeChatUser === null && messages.filter(m => !m.recipient).length > 0) {
                setUnreadCount(0);
                markAsRead(); // Cập nhật trạng thái đã xem của chính mình
            } else if (activeChatUser) {
                // Update local read timestamp for private chat
                const lsKey = `chatReadTimestamps_${currentUser}`;
                const readTimestampsStr = localStorage.getItem(lsKey);
                const readTimestamps = readTimestampsStr ? JSON.parse(readTimestampsStr) : {};
                readTimestamps[activeChatUser] = Date.now();
                localStorage.setItem(lsKey, JSON.stringify(readTimestamps));
            }
            return () => clearTimeout(timer);
        }
    }, [messages.length, filteredMessages.length, isOpen, activeChatUser, currentView]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setInputValue(value);

        // Xử lý @mention
        const atIndex = value.lastIndexOf('@');

        if (!activeChatUser && atIndex !== -1 && atIndex >= value.lastIndexOf(' ')) {
            const query = value.substring(atIndex + 1);
            setMentionQuery(query);
            setShowMentionPanel(true);
        } else {
            setShowMentionPanel(false);
        }
    };

    const handleEmojiClick = (emoji: string) => {
        setInputValue(prev => prev + emoji);
        setShowEmojiPicker(false);
        inputRef.current?.focus();
    };

    const selectUser = (fullName: string) => {
        const atIndex = inputValue.lastIndexOf('@');
        const newValue = inputValue.substring(0, atIndex) + '@' + fullName + ' ';
        setInputValue(newValue);
        setShowMentionPanel(false);
        inputRef.current?.focus();
    };

    const handleToggleReaction = async (msg: ChatMessage, emoji: string) => {
        if (msg.message === 'Tin nhắn đã bị thu hồi') return;
        setActiveReactionId(null); // Close picker

        // Optimistic UI update
        setMessages(prev => prev.map(m => {
            if (m.id === msg.id) {
                const newReactions = { ...(m.reactions || {}) };
                if (!newReactions[emoji]) {
                    newReactions[emoji] = [currentUser];
                } else {
                    const existing = newReactions[emoji];
                    const userIdx = existing.indexOf(currentUser);
                    if (userIdx > -1) {
                        newReactions[emoji] = existing.filter(u => u !== currentUser);
                        if (newReactions[emoji].length === 0) delete newReactions[emoji];
                    } else {
                        newReactions[emoji] = [...existing, currentUser];
                    }
                }
                return { ...m, reactions: newReactions };
            }
            return m;
        }));

        try {
            await apiService.toggleSupabaseMessageReaction({
                id: msg.id,
                timestamp: msg.timestamp,
                senderName: msg.senderName,
                emoji: emoji,
                updatedBy: currentUser
            });
        } catch (e) {
            console.error("Failed to toggle reaction", e);
        }
    };

    const handleRevokeMessage = async (msg: ChatMessage) => {
        // Optimistic UI update
        setMessages(prev => prev.map(m =>
            m.id === msg.id ? { ...m, message: 'Tin nhắn đã bị thu hồi', mentions: [], reactions: {} } : m
        ));

        try {
            const result = await apiService.revokeSupabaseChatMessage({
                id: msg.id,
                timestamp: msg.timestamp,
                senderName: msg.senderName
            });

            if (result.status !== 'SUCCESS') {
                alert(result.message || "Không thể thu hồi tin nhắn.");
            }
        } catch (e) {
            console.error("Failed to revoke message", e);
        }
    };

    const handleTogglePin = async (msg: ChatMessage) => {
        try {
            const result = await apiService.toggleSupabasePinMessage({
                id: msg.id,
                timestamp: msg.timestamp,
                senderName: msg.senderName
            });
            if (result.status === 'SUCCESS') {
                fetchPinnedMessages();
            }
        } catch (e) {
            console.error("Failed to pin message", e);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const reader = new FileReader();
        reader.onload = async () => {
            const base64 = reader.result as string;
            try {
                const result = await apiService.postApi({
                    action: 'uploadChatFile',
                    base64Data: base64,
                    fileName: file.name,
                    mimeType: file.type
                });

                if (result.status === 'SUCCESS') {
                    handleSendMessage(undefined, result.fileId);
                } else {
                    alert("Lỗi upload: " + result.message);
                }
            } catch (error) {
                console.error("File upload failed", error);
            } finally {
                setIsUploading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsDataURL(file);
    };

    const handleSendMessage = async (text?: string, fileId?: string) => {
        const messageText = text || inputValue;
        if (!messageText.trim() && !fileId) return;

        setInputValue('');
        setShowMentionPanel(false);
        setReplyingTo(null);

        // Extract mentions
        const mentionsMatch = messageText.match(/@([\w\sà-ỹÀ-Ỳ]+)/g);
        const mentions = mentionsMatch ? mentionsMatch.map(m => m.substring(1).trim()) : [];

        // Optimistic UI update
        const optimisticId = 'local_' + Date.now().toString();
        const optimisticMsg: ChatMessage = {
            id: optimisticId,
            timestamp: new Date().toISOString(),
            senderName: currentUser,
            senderRole: userRole || 'Tư vấn bán hàng',
            message: messageText,
            mentions: mentions,
            reactions: {},
            replyTo: replyingTo?.id, // Use ID for Supabase
            fileId: fileId,
            isSending: true,
            recipient: activeChatUser || undefined
        };

        setMessages(prev => [...prev, optimisticMsg]);
        setTimeout(scrollToBottom, 50);

        try {
            const result = await apiService.addSupabaseChatMessage({
                message: messageText,
                mentionedUsers: mentions,
                replyToId: replyingTo?.id,
                fileId: fileId,
                updatedBy: currentUser,
                userRole: userRole,
                recipient: activeChatUser || ''
            });

            if (result.status !== 'SUCCESS') {
                console.error("Failed to send message:", result.message);
                setMessages(prev => prev.filter(m => m.id !== optimisticId));
            }
        } catch (error) {
            console.error("Error sending message:", error);
            setMessages(prev => prev.filter(m => m.id !== optimisticId));
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };



    const recentPrivateChats = React.useMemo(() => {
        const chatMap = new Map<string, { lastMessage: ChatMessage, unread: boolean, userFullName: string }>();
        const myNames = [currentUser.toLowerCase(), currentUserName.toLowerCase()];

        const readTimestampsStr = localStorage.getItem(`chatReadTimestamps_${currentUser}`);
        const readTimestamps = readTimestampsStr ? JSON.parse(readTimestampsStr) : {};

        messages.forEach(m => {
            if (m.recipient) {
                let otherUserName = '';
                if (myNames.includes(m.senderName.toLowerCase())) {
                    otherUserName = m.recipient;
                } else if (myNames.includes(m.recipient.toLowerCase())) {
                    otherUserName = m.senderName;
                }

                if (otherUserName && !myNames.includes(otherUserName.toLowerCase())) {
                    const userObj = users.find(u => u.username.toLowerCase() === otherUserName.toLowerCase() || u.fullName.toLowerCase() === otherUserName.toLowerCase());
                    if (userObj) {
                        const targetUsername = userObj.username;

                        // Use string comparisons for timestamps or convert to Date. We use Date object for safety.
                        const currentLast = chatMap.get(targetUsername)?.lastMessage;
                        const isNewer = !currentLast || new Date(m.timestamp).getTime() > new Date(currentLast.timestamp).getTime();

                        if (isNewer) {
                            const lastRead = readTimestamps[targetUsername] || 0;
                            const msgTime = new Date(m.timestamp).getTime();
                            // If we didn't send it, and it's newer than our last read time, it's unread
                            const isUnread = !myNames.includes(m.senderName.toLowerCase()) && msgTime > lastRead;

                            chatMap.set(targetUsername, { lastMessage: m, unread: isUnread, userFullName: userObj.fullName });
                        }
                    }
                }
            }
        });

        return Array.from(chatMap.entries())
            .map(([username, data]) => ({ username, ...data }))
            .sort((a, b) => new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime());
    }, [messages, currentUser, currentUserName, users]);

    const renderedMessages = React.useMemo(() => {
        return filteredMessages && filteredMessages.map((msg, idx) => {
            const msgKey = msg.id || `${msg.timestamp}_${msg.senderName}`;
            const isMe = msg.senderName === currentUser;
            const prevItem = idx > 0 ? filteredMessages[idx - 1] : null;
            const showAvatar = !prevItem || prevItem.senderName !== msg.senderName;
            const isAdmin = msg.senderRole?.toLowerCase().includes('admin');

            const repliedMsg = msg.replyTo ? (messages.find(m => m.id === msg.replyTo) || messages.find(m => m.timestamp === msg.replyTo)) : null;

            return (
                <div key={msgKey} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-fade-in group ${idx === 0 ? '' : showAvatar ? 'mt-4 sm:mt-5' : 'mt-1 sm:mt-1.5'}`}>
                    {!isMe && (
                        <div className="w-6 sm:w-8 flex-shrink-0 mr-2 flex justify-center">
                            {showAvatar ? (
                                <Avatar name={msg.senderName} size="sm" />
                            ) : (
                                <div className="w-6 sm:w-8"></div>
                            )}
                        </div>
                    )}

                    <div className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                        {!isMe && showAvatar && (
                            <div className="flex items-center gap-1.5 mb-0.5 ml-1">
                                <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 tracking-tight">{msg.senderName.toUpperCase()}</span>
                                {isAdmin && (
                                    <span className="bg-indigo-100 text-indigo-600 text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-widest">Admin</span>
                                )}
                            </div>
                        )}

                        <div className={`flex items-center gap-2 max-w-full ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                            <div className="relative group/msg max-w-full min-w-0">
                                {/* Replied Message Preview */}
                                {repliedMsg && (
                                    <div className={`mb-1 p-2 rounded-lg text-[10px] border-l-[3px] opacity-90 truncate max-w-full backdrop-blur-sm shadow-sm ${isMe ? 'bg-slate-800 border-amber-400 text-slate-200 shadow-slate-900/20' : 'bg-white border-indigo-400 text-slate-600 shadow-sm ring-1 ring-slate-200/60'}`}>
                                        <div className="font-bold flex items-center gap-1.5">
                                            <i className="fas fa-reply text-[8px] opacity-70"></i> {repliedMsg.senderName}
                                        </div>
                                        <div className="truncate mt-0.5">{repliedMsg.message || (repliedMsg.fileId ? "[Hình/Tệp đính kèm]" : "")}</div>
                                    </div>
                                )}

                                <div
                                    className={`relative px-3 py-2 shadow-sm text-sm sm:text-[14px] leading-relaxed break-words break-all transition-all duration-300 ${isMe
                                        ? (msg.isSending ? 'bg-indigo-400/80 opacity-70' : 'bg-gradient-to-br from-indigo-600 to-purple-600') + ' text-white rounded-[16px] rounded-tr-[4px] shadow-[0_4px_15px_-3px_rgba(79,70,229,0.3)] hover:shadow-[0_6px_20px_-3px_rgba(79,70,229,0.4)] hover:-translate-y-0.5'
                                        : 'bg-white/95 backdrop-blur-md text-slate-800 rounded-[16px] rounded-tl-[4px] shadow-[0_4px_15px_-3px_rgba(0,0,0,0.05)] border border-white hover:shadow-[0_8px_20px_-3px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 ring-1 ring-inset ring-slate-100/50'
                                        } ${msg.message === 'Tin nhắn đã bị thu hồi' ? '!bg-slate-50 border !border-slate-200/50 !text-slate-400 italic !shadow-none !ring-transparent hover:translate-y-0' : ''}`}
                                >
                                    {/* File Attachment */}
                                    {msg.fileId && (
                                        <div className={`relative rounded-lg overflow-hidden border group/file cursor-pointer ${(msg.message || '').trim() ? 'mb-2' : 'mb-0'} ${isMe ? 'border-white/20 bg-white/5' : 'border-slate-200 bg-slate-50'}`}>
                                            <img
                                                src={`https://drive.google.com/thumbnail?id=${msg.fileId}&sz=w1000`}
                                                alt="Chat attachment"
                                                className="max-w-full max-h-[200px] object-cover transition-transform duration-300 group-hover/file:scale-105"
                                                onError={(e) => {
                                                    const target = e.target as HTMLImageElement;
                                                    target.style.display = 'none';
                                                    const parent = target.parentElement;
                                                    if (parent && !parent.querySelector('.file-placeholder')) {
                                                        const placeholder = document.createElement('div');
                                                        placeholder.className = `file-placeholder p-4 flex flex-col items-center justify-center gap-2 text-xs font-bold h-[100px] transition-colors ${isMe ? 'hover:bg-white/10 text-white/90' : 'hover:bg-slate-200/50 text-slate-600'}`;
                                                        placeholder.innerHTML = `
                                                        <i class="fas fa-file-alt text-2xl mb-1 ${isMe ? 'text-amber-400' : 'text-indigo-500'}"></i>
                                                        <span class="text-center">Tập tin đính kèm</span>
                                                    `;
                                                        parent.appendChild(placeholder);
                                                        parent.onclick = () => setPreviewFile({ url: `https://docs.google.com/uc?id=${msg.fileId}`, name: msg.message || 'Tập tin đính kèm' });
                                                    }
                                                }}
                                                onClick={() => setPreviewFile({ url: `https://docs.google.com/uc?id=${msg.fileId}`, name: msg.message || 'Hình ảnh đính kèm' })}
                                            />

                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/file:opacity-100 transition-opacity pointer-events-none">
                                                <i className="fas fa-search-plus text-white text-2xl drop-shadow-md"></i>
                                            </div>

                                            {/* Nút tải về */}
                                            <button
                                                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white opacity-0 group-hover/file:opacity-100 transition-all hover:bg-white/40 hover:scale-110 shadow-lg pointer-events-auto z-10"
                                                title="Tải về"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    window.open(`https://docs.google.com/uc?id=${msg.fileId}&export=download`, '_blank');
                                                }}
                                            >
                                                <i className="fas fa-download text-xs drop-shadow-sm"></i>
                                            </button>
                                        </div>
                                    )}

                                    {(msg.message || '').trim() && (
                                        <div className="whitespace-pre-wrap font-medium">
                                            {msg.message === 'Tin nhắn đã bị thu hồi' && <i className="fas fa-ban text-[10px] mr-1.5 opacity-70"></i>}
                                            {msg.message === 'Tin nhắn đã bị thu hồi'
                                                ? msg.message
                                                : msg.message.split(/(@[\w\sà-ỹÀ-Ỳ]+)/g).map((part, i) =>
                                                    part.startsWith('@') ? <span key={i} className={`text-[12px] sm:text-[13px] font-bold ${isMe ? 'text-amber-300' : 'text-indigo-600'}`}>{part}</span> : part
                                                )
                                            }
                                        </div>
                                    )}

                                    {/* Actions Triggers (Reaction & Revoke & Pin & Reply) */}
                                    {!msg.isSending && msg.message !== 'Tin nhắn đã bị thu hồi' && (
                                        <div className={`absolute -bottom-3 ${isMe ? 'right-2' : 'left-2'} flex gap-1.5 w-max opacity-0 group-hover/msg:opacity-100 transition-all duration-300 z-10 translate-y-1 group-hover/msg:translate-y-0`}>
                                            <button
                                                onClick={() => setActiveReactionId(activeReactionId === msgKey ? null : msgKey)}
                                                className="bg-white/95 backdrop-blur shadow-md rounded-full w-7 h-7 flex items-center justify-center border border-slate-200/50 text-slate-400 hover:text-amber-500 hover:border-amber-200 transition-colors"
                                                title="Thả cảm xúc"
                                            >
                                                <i className="far fa-smile-wink text-xs"></i>
                                            </button>

                                            <button
                                                onClick={() => { setReplyingTo(msg); inputRef.current?.focus(); }}
                                                className="bg-white/95 backdrop-blur shadow-md rounded-full w-7 h-7 flex items-center justify-center border border-slate-200/50 text-slate-400 hover:text-indigo-500 hover:border-indigo-200 transition-colors"
                                                title="Trả lời"
                                            >
                                                <i className="fas fa-reply text-[8px]"></i>
                                            </button>

                                            <button
                                                onClick={() => handleTogglePin(msg)}
                                                className={`bg-white shadow-md rounded-full w-6 h-6 flex items-center justify-center border border-gray-100 ${msg.isPinned ? 'text-blue-500' : 'text-gray-400'} hover:text-blue-500`}
                                                title={msg.isPinned ? "Bỏ ghim" : "Ghim tin nhắn"}
                                            >
                                                <i className="fas fa-thumbtack text-[8px] transform -rotate-45"></i>
                                            </button>

                                            {isMe && (new Date().getTime() - new Date(msg.timestamp).getTime()) < 3600000 && (
                                                <button
                                                    onClick={() => handleRevokeMessage(msg)}
                                                    className="bg-white shadow-md rounded-full w-6 h-6 flex items-center justify-center border border-gray-100 text-gray-400 hover:text-red-500"
                                                    title="Thu hồi tin nhắn (trong 60p)"
                                                >
                                                    <i className="fas fa-undo-alt text-[10px]"></i>
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {/* Emoji Picker Popover */}
                                    {activeReactionId === msgKey && (
                                        <div className={`absolute -top-10 ${isMe ? 'right-0' : 'left-0'} bg-white shadow-2xl rounded-full px-2 py-1 flex gap-2 border border-blue-100 z-[100] animate-bounce-short whitespace-nowrap min-w-max`}>
                                            {['👍', '❤️', '😂', '😮', '👏', '🔥'].map(emoji => (
                                                <button
                                                    key={emoji}
                                                    onClick={() => handleToggleReaction(msg, emoji)}
                                                    className="hover:scale-125 transition-transform text-lg"
                                                >
                                                    {emoji}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Reactions Display */}
                                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                                    <div className={`flex flex-wrap gap-0.5 -mt-2 relative z-10 ${isMe ? 'justify-end pr-2' : 'justify-start pl-2'}`}>
                                        {Object.entries(msg.reactions).map(([emoji, users]) => (
                                            <div
                                                key={emoji}
                                                onClick={() => handleToggleReaction(msg, emoji)}
                                                className={`flex items-center gap-0.5 px-1.5 py-[2px] rounded-full border shadow-sm text-[9px] font-medium leading-none cursor-pointer hover:scale-105 transition-all ${users.includes(currentUser)
                                                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                                                    : 'bg-white/95 border-gray-200 text-gray-500 hover:bg-white'
                                                    }`}
                                                title={users.join(', ')}
                                            >
                                                <span>{emoji}</span>
                                                {users.length > 1 && <span className="font-bold opacity-80">{users.length}</span>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {msg.isPinned && <i className="fas fa-thumbtack text-[8px] text-blue-400 -rotate-45"></i>}
                                <span className="text-[9px] sm:text-[10px] text-gray-400">
                                    {moment(msg.timestamp).format('HH:mm')}
                                </span>
                                {isMe && (
                                    msg.isSending
                                        ? <i className="fas fa-spinner fa-spin text-[9px] sm:text-[10px] text-blue-300"></i>
                                        : <i className="fas fa-check-double text-[9px] sm:text-[10px] text-blue-400"></i>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            );
        });
    }, [messages, currentUser, activeReactionId]);

    // Load more messages on scroll
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (e.currentTarget.scrollTop === 0 && !isFetching) {
            setMsgLimit(prev => prev + 50);
        }
    };

    // Removed filteredMessages from here
    // Render logic
    return (
        <div
            className={`fixed bottom-0 right-4 lg:right-8 z-[100] transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none delay-100'}`}
            style={{ transform: `translate(${dragPos.x}px, ${dragPos.y}px)` }}
        >
            {/* Chat Window */}
            <div className="bg-gradient-to-b from-slate-50/95 to-white/95 backdrop-blur-xl rounded-t-2xl shadow-[0_0_40px_rgba(0,0,0,0.15)] ring-1 ring-slate-200/50 w-[90vw] sm:w-[320px] md:w-[360px] h-[450px] md:h-[550px] max-h-[80vh] flex flex-col overflow-hidden relative pb-16 lg:pb-0 transition-all duration-300 border-0">

                {/* Header */}
                <div
                    className="cursor-move bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-amber-500/20 text-white flex flex-col shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] z-20 flex-shrink-0 relative overflow-hidden"
                    onMouseDown={handleDragStart}
                >
                    {/* Elegant glowing effects behind header */}
                    <div className="absolute top-0 left-1/4 w-40 h-40 bg-indigo-500/20 blur-[50px] rounded-full pointer-events-none"></div>
                    <div className="absolute bottom-0 right-1/4 w-32 h-32 bg-amber-500/20 blur-[40px] rounded-full pointer-events-none"></div>
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 pointer-events-none mix-blend-overlay"></div>

                    <div className="px-3 py-2 sm:px-4 sm:py-2.5 flex justify-between items-center relative z-10">
                        {currentView === 'chat' && (
                            <button onClick={() => setCurrentView('list')} className="text-white hover:text-amber-200 transition-colors mr-2.5 w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full hover:bg-white/10 active:scale-95">
                                <i className="fas fa-arrow-left text-sm sm:text-base"></i>
                            </button>
                        )}
                        <div className="flex items-center gap-2 flex-1">
                            <div className="w-7 sm:w-8 h-7 sm:h-8 rounded-full bg-gradient-to-br from-amber-400/20 to-amber-600/20 flex items-center justify-center border border-amber-500/30 backdrop-blur-md shadow-[0_0_15px_rgba(245,158,11,0.15)] relative">
                                <i className={`fas ${currentView === 'list' ? 'fa-address-book' : (activeChatUser ? 'fa-user-lock' : 'fa-users')} text-amber-400 text-xs sm:text-sm drop-shadow-sm`}></i>
                                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-slate-900 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.5)]"></span>
                            </div>
                            <div className="flex flex-col justify-center transition-colors">
                                <h3 className="font-bold text-xs sm:text-[13px] leading-tight tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-100 to-white truncate max-w-[150px] sm:max-w-xs mt-0.5">
                                    {currentView === 'list' ? "Danh Sách Trò Chuyện" : (activeChatUser ? (users.find(u => u.username === activeChatUser)?.fullName || activeChatUser) : "Trò Chuyện Nội Bộ")}
                                </h3>
                            </div>
                        </div>

                        <div className="flex items-center gap-1 sm:gap-2">
                            <button
                                onClick={() => {
                                    if (isSearching) {
                                        setSearchInput('');
                                        setSearchQuery('');
                                    }
                                    setIsSearching(!isSearching);
                                }}
                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isSearching ? 'bg-white/30' : 'hover:bg-white/10'}`}
                            >
                                <i className="fas fa-search text-xs"></i>
                            </button>
                            <Button
                                variant="outline"
                                className="!p-1.5 sm:!p-2 !border-white/30 !text-white hover:!bg-white/10 !rounded-full transition-transform active:scale-90"
                                onClick={() => setIsOpen(false)}
                            >
                                <i className={`fas ${isOpen ? 'fa-chevron-down' : 'fa-chevron-up'} text-xs sm:text-sm`}></i>
                            </Button>
                        </div>
                    </div>

                    {/* Search Bar */}
                    {isSearching && (
                        <div className="px-4 pb-3 animate-slide-down">
                            <div className="relative">
                                <input
                                    autoFocus
                                    type="text"
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    placeholder={currentView === 'list' ? "Tìm kiếm nhân sự..." : "Tìm tin nhắn hoặc người gửi..."}
                                    className="w-full bg-white/10 border border-white/20 rounded-lg py-1.5 pl-8 pr-3 text-xs text-white placeholder-white/50 focus:bg-white/20 focus:outline-none transition-all"
                                />
                                <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-white/50"></i>
                                {searchInput && (
                                    <button onClick={() => setSearchInput('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <i className="fas fa-times text-[10px] text-white/50 hover:text-white"></i>
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Pinned Messages Bar */}
                    {currentView === 'chat' && pinnedMessages && pinnedMessages.length > 0 && (
                        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent backdrop-blur-md px-4 py-2 flex items-start gap-2.5 border-t border-amber-500/20 animate-fade-in text-[11px] group relative shadow-inner">
                            <div className="mt-0.5 p-1 rounded-full bg-amber-500/20 border border-amber-500/30">
                                <i className="fas fa-thumbtack text-amber-500 transform -rotate-45 text-[10px]"></i>
                            </div>
                            <div className="flex-1 truncate overflow-hidden">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                    <span className="font-bold text-amber-400">{pinnedMessages[pinnedMessages.length - 1]?.senderName}</span>
                                    <span className="text-amber-200/60 text-[9px] font-medium">{moment(pinnedMessages[pinnedMessages.length - 1]?.timestamp).format('HH:mm DD/MM')}</span>
                                </div>
                                <div className="text-slate-300 truncate font-medium">{pinnedMessages[pinnedMessages.length - 1]?.message}</div>
                            </div>
                            <button
                                onClick={() => handleTogglePin(pinnedMessages[pinnedMessages.length - 1])}
                                className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10 text-white/70 hover:text-white"
                                title="Gỡ ghim"
                            >
                                <i className="fas fa-times text-[10px]"></i>
                            </button>
                        </div>
                    )}
                </div>

                {currentView === 'list' ? (
                    <div className="flex-1 overflow-y-auto bg-slate-50 flex flex-col pt-1 scrollbar-thin scrollbar-thumb-gray-200">
                        <button
                            className="w-full text-left px-4 py-3 hover:bg-slate-100 transition-colors border-b border-slate-200 shadow-sm flex items-center gap-3 group"
                            onClick={() => { setActiveChatUser(null); setCurrentView('chat'); setSearchInput(''); }}
                        >
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform shrink-0">
                                <i className="fas fa-users text-base sm:text-lg"></i>
                            </div>
                            <div className="flex-1">
                                <span className="text-slate-800 font-bold text-[13px] sm:text-sm flex-1">Trò chuyện Công Ty (All)</span>
                                <div className="text-slate-500 text-[10px] sm:text-[11px] mt-0.5 line-clamp-1">Kênh chung dành cho mọi người</div>
                            </div>
                        </button>

                        {recentPrivateChats.length > 0 && !searchInput && (
                            <>
                                <div className="px-5 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100/50 mt-2 flex items-center justify-between">
                                    <span>Gần Đây</span>
                                    <i className="fas fa-history opacity-50"></i>
                                </div>
                                {recentPrivateChats.map((chat, i) => (
                                    <button
                                        key={`recent_${i}`}
                                        className="w-full text-left px-4 py-2.5 hover:bg-slate-100 transition-colors border-b border-slate-100 flex items-center gap-3 group relative"
                                        onClick={() => { setActiveChatUser(chat.username); setCurrentView('chat'); setSearchInput(''); }}
                                    >
                                        <div className="group-hover:scale-105 transition-transform relative">
                                            <Avatar name={chat.username} size="sm" />
                                            {chat.unread && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-rose-500 border-2 border-white rounded-full animate-pulse"></span>}
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <div className={`text-xs sm:text-[13px] leading-tight truncate ${chat.unread ? 'text-slate-900 font-bold' : 'text-slate-800 font-semibold'}`}>{chat.userFullName || chat.username}</div>
                                            <div className={`text-[10px] sm:text-[11px] mt-0.5 truncate ${chat.unread ? 'text-slate-700 font-semibold' : 'text-slate-500'}`}>{chat.lastMessage.senderName === currentUser || chat.lastMessage.senderName === currentUserName ? 'Bạn: ' : ''}{chat.lastMessage.message || '[Hình ảnh/File]'}</div>
                                        </div>
                                        <div className="text-[9px] text-slate-400 font-medium absolute right-4 top-2.5 pt-0.5">
                                            {moment(chat.lastMessage.timestamp).format('HH:mm')}
                                        </div>
                                    </button>
                                ))}
                            </>
                        )}

                        <div className="px-5 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100/50 mt-2 flex items-center justify-between">
                            <span>Danh Bạ Nhân Viên</span>
                            <i className="fas fa-address-book opacity-50"></i>
                        </div>

                        {users.filter(u => u.username !== currentUser && u.fullName !== currentUserName && u.fullName !== currentUser && u.username !== currentUserName && (u.fullName?.toLowerCase().includes(searchInput.toLowerCase()) || u.username?.toLowerCase().includes(searchInput.toLowerCase()))).map((u, i) => (
                            <button
                                key={i}
                                className="w-full text-left px-4 py-2.5 hover:bg-slate-100 transition-colors border-b border-slate-100 flex items-center gap-3 group"
                                onClick={() => { setActiveChatUser(u.username); setCurrentView('chat'); setSearchInput(''); }}
                            >
                                <div className="group-hover:scale-105 transition-transform relative">
                                    <Avatar name={u.username} size="sm" />
                                    <span className="absolute bottom-0 right-0 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                                </div>
                                <div className="flex-1">
                                    <div className="text-slate-800 font-bold text-xs sm:text-[13px] leading-tight">{u.fullName || u.username}</div>
                                    <div className="text-slate-500 text-[10px] mt-0.5">{u.role}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                ) : (
                    <>
                        {/* Messages Panel */}
                        <div
                            ref={chatContainerRef}
                            className="flex-1 overflow-y-auto p-3 sm:p-5 flex flex-col scrollbar-thin scrollbar-thumb-indigo-200 scroll-smooth bg-gradient-to-br from-[#f8faff] via-indigo-50/30 to-purple-50/30 relative"
                            onScroll={handleScroll}
                        >
                            {/* Subtle premium abstract background */}
                            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-100/40 via-transparent to-transparent pointer-events-none"></div>
                            {isFetching && (!filteredMessages || !filteredMessages.length) ? (
                                <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
                                    <i className="fas fa-circle-notch fa-spin text-2xl"></i>
                                    <p className="text-xs font-medium uppercase tracking-widest">Đang tải cuộc trò chuyện...</p>
                                </div>
                            ) : (!filteredMessages || filteredMessages.length === 0) ? (
                                <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-10">
                                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-2">
                                        <i className="far fa-comments text-3xl text-blue-200"></i>
                                    </div>
                                    <div>
                                        <h4 className="text-gray-500 font-bold mb-1">Chưa có tin nhắn</h4>
                                        <p className="text-xs text-gray-400 leading-relaxed">Hãy bắt đầu câu chuyện với đồng nghiệp của bạn ngay bây giờ!</p>
                                    </div>
                                </div>
                            ) : (
                                renderedMessages
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {showMentionPanel && users && users.length > 0 && (
                            <div className="absolute bottom-[80px] left-4 right-4 bg-white shadow-2xl border border-slate-100 rounded-xl max-h-[150px] overflow-y-auto z-[60] py-2 animate-slide-up">
                                <div className="px-3 py-1 text-[10px] text-indigo-500 font-bold uppercase tracking-wider border-b border-slate-50 mb-1">Nhắc tên thành viên</div>
                                {users
                                    .filter(u => u && (u.fullName?.toLowerCase().includes(mentionQuery.toLowerCase()) || u.username?.toLowerCase().includes(mentionQuery.toLowerCase())))
                                    .map(u => (
                                        <button
                                            key={u.username}
                                            onClick={() => selectUser(u.fullName)}
                                            className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-3 transition-colors border-b border-slate-50 last:border-0"
                                        >
                                            <Avatar name={u.fullName} size="sm" />
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-slate-800">{u.fullName}</span>
                                                <span className="text-[10px] text-slate-400">{u.role}</span>
                                            </div>
                                        </button>
                                    ))}
                            </div>
                        )}

                        {/* Reply Indicator Bar */}
                        {replyingTo && (
                            <div className="bg-slate-50/95 backdrop-blur-md px-4 py-2 border-t border-slate-200/80 flex justify-between items-center shadow-[0_-5px_15px_rgba(0,0,0,0.02)] relative z-20">
                                <div className="flex-1 truncate text-xs">
                                    <span className="font-bold text-indigo-600 mr-2 flex items-center gap-1.5 inline-flex mb-0.5"><i className="fas fa-reply text-[9px] opacity-70"></i> Trả lời {replyingTo.senderName}:</span>
                                    <span className="text-slate-500 opacity-90 truncate">{replyingTo.message || "[Tệp Đính Kèm]"}</span>
                                </div>
                                <button
                                    onClick={() => setReplyingTo(null)}
                                    className="w-6 h-6 rounded-full hover:bg-slate-200/70 text-slate-400 hover:text-slate-600 flex justify-center items-center transition-colors shadow-sm bg-white border border-slate-200"
                                >
                                    <i className="fas fa-times text-[10px]"></i>
                                </button>
                            </div>
                        )}

                        {/* Input Area */}
                        <div className={`p-2 sm:p-3 bg-white/80 backdrop-blur-2xl border-t border-indigo-100/50 z-20 flex-shrink-0 transition-all shadow-[0_-10px_40px_rgba(79,70,229,0.05)] ${replyingTo ? 'border-none pt-2' : ''}`}>
                            <div className="relative">
                                <div className="flex items-center gap-1 sm:gap-2 bg-white/90 border border-indigo-100 rounded-full px-1.5 sm:px-2 py-1.5 shadow-sm transition-all hover:shadow-md focus-within:shadow-md focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-300">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        onChange={handleFileUpload}
                                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                                    />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-8 sm:w-10 h-8 sm:h-10 rounded-full flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-slate-200/80 transition-all flex-shrink-0 active:scale-95 bg-white shadow-sm border border-slate-200/50"
                                        title="Gửi file hồ sơ/ảnh"
                                    >
                                        <i className={`fas ${isUploading ? 'fa-spinner fa-spin' : 'fa-paperclip'} text-base`}></i>
                                    </button>

                                    <button
                                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                        className={`w-8 sm:w-10 h-8 sm:h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0 active:scale-95 shadow-sm border ${showEmojiPicker ? 'bg-amber-100 text-amber-600 border-amber-300' : 'bg-white text-slate-500 hover:text-amber-500 hover:bg-slate-200/80 border-slate-200/50'}`}
                                        title="Biểu tượng cảm xúc"
                                    >
                                        <i className="far fa-smile text-base"></i>
                                    </button>

                                    {/* Main Input Emoji Picker Popover */}
                                    {showEmojiPicker && (
                                        <div className="absolute bottom-[110%] left-10 bg-white shadow-2xl rounded-2xl p-3 flex flex-wrap gap-2 border border-slate-200 w-[240px] z-[100] animate-fade-in-up">
                                            {['😀', '😂', '😍', '🥰', '😎', '👍', '🙏', '❤️', '🔥', '🎉', '💡', '✅', '🤔', '😭', '🤯', '💯', '✨', '👋'].map(emoji => (
                                                <button
                                                    key={emoji}
                                                    onClick={() => handleEmojiClick(emoji)}
                                                    className="w-8 h-8 flex items-center justify-center text-xl hover:bg-slate-100 rounded-lg hover:scale-110 transition-all"
                                                >
                                                    {emoji}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={inputValue}
                                        onChange={handleInputChange}
                                        onKeyDown={handleKeyDown}
                                        placeholder={replyingTo ? "Gõ nội dung trả lời..." : (activeChatUser ? "Nhập tin nhắn..." : "Gõ @ để tag đồng nghiệp...")}
                                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm sm:text-[14px] px-2 sm:px-3 h-8 text-slate-700 placeholder-slate-400 focus:outline-none"
                                        disabled={isUploading}
                                    />

                                    <button
                                        onClick={() => handleSendMessage()}
                                        disabled={(!inputValue.trim() && !isUploading)}
                                        className={`w-8 sm:w-10 h-8 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 mr-0.5 transition-all duration-300 shadow-sm ${inputValue.trim() || isUploading ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white scale-100 hover:from-indigo-600 hover:to-purple-700 hover:shadow-lg hover:shadow-indigo-500/30 active:scale-95' : 'bg-slate-100 text-slate-400 scale-95 opacity-70 cursor-not-allowed border border-slate-200'}`}
                                    >
                                        <i className="fas fa-paper-plane text-xs sm:text-sm -ml-0.5 relative top-px"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* App Standard File Preview Modal */}
            {previewFile && (
                <FilePreviewModal
                    isOpen={!!previewFile}
                    onClose={() => setPreviewFile(null)}
                    fileUrl={previewFile.url}
                    fileLabel={previewFile.name}
                />
            )}
        </div>
    );
};

export default InternalChat;
