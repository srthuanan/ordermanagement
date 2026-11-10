import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import * as xlsx from 'xlsx';
import './crm-workspace.css';
import { shuffleCrmModels, shuffleCrmSources } from './crmModelShuffle';
import {
    fetchCrmMetadata,
    checkCrmDuplicates,
    importCrmLeads,
    CrmMetadata,
    CrmDuplicateInfo,
    CrmImportResponse
} from '../../services/api/crmService';
import { getAppSetting, supabase } from '../../services/apiService';

interface CrmLeadImporterViewProps {
    currentUser?: string;
    currentUserName?: string;
    userRole?: string;
    isAdmin?: boolean;
    showToast?: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    isCrmEnabled?: boolean;
    onToggleCrmGlobal?: () => void;
    isTogglingCrm?: boolean;
    mobileMode?: boolean;
}

interface ParsedLeadRow {
    id: string;
    fullName: string;
    phone: string;
    phone2: string;
    createdDate: string;  // YYYY-MM-DD
    createdTime: string;  // HH:mm
    model: string;         // maKx
    color: string;         // maMau
    source: string;        // maPtlh
    status: string;        // maTtkh
    paymentMethod: string; // maHttt
    address: string;
    note: string;
    duplicateInfo?: CrmDuplicateInfo;
    isValidPhone: boolean;
    isSelected: boolean;
    isImported?: boolean;
    cyberId?: string;
}

const PHONE_REGEX = /^(0|84)(3|5|7|8|9)[0-9]{8}$/;

const normalizePhone = (raw: string): string => {
    if (!raw) return '';
    let p = raw.replace(/[^\d]/g, '').trim();
    if (p.startsWith('0084')) {
        p = p.substring(4);
    }
    if (p.startsWith('84') && p.length === 11) {
        p = '0' + p.substring(2);
    }
    // Tự động sửa lỗi Excel làm mất số 0 đầu (ví dụ 901234567 -> 0901234567)
    if (p.length === 9 && /^[35789]/.test(p)) {
        p = '0' + p;
    }
    return p;
};

// Hàm sinh số điện thoại di động Việt Nam ngẫu nhiên, tự nhiên, đa dạng (không trùng pattern 1000)
const generateRealisticPhone = (seedPhone?: string): string => {
    const validPrefixes = [
        '090', '093', '089', '070', '079', '077', // Mobi
        '091', '094', '088', '083', '085',         // Vina
        '096', '097', '098', '086', '038', '039', '035', '033' // Viettel
    ];

    let prefix = '';
    if (seedPhone && seedPhone.length >= 3) {
        const first3 = seedPhone.substring(0, 3);
        if (validPrefixes.includes(first3)) {
            prefix = first3;
        }
    }
    if (!prefix) {
        prefix = validPrefixes[Math.floor(Math.random() * validPrefixes.length)];
    }

    // Sinh 7 chữ số sau ngẫu nhiên, tự nhiên, đa dạng (2000000 -> 9999999) để không bị lặp chuỗi '1000'
    const random7 = Math.floor(2000000 + Math.random() * 7999999).toString();
    return (prefix + random7).substring(0, 10);
};

const removeVietnameseTones = (str: string): string => {
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .toLowerCase()
        .trim();
};

// Hàm sinh ngày & giờ ngẫu nhiên chia đều trong tháng nhập
const getRandomDistributedDate = (
    index: number,
    total: number,
    targetMonthStr?: string
): { dateStr: string; timeStr: string } => {
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth(); // 0-indexed

    if (targetMonthStr && targetMonthStr.includes('-')) {
        const parts = targetMonthStr.split('-').map(Number);
        if (parts[0] && parts[1]) {
            year = parts[0];
            month = parts[1] - 1;
        }
    }

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const isCurrentMonth = (year === now.getFullYear() && month === now.getMonth());
    // Nếu là tháng hiện tại thì rải đều từ ngày 1 đến ngày hôm nay (e.g. 22)
    const maxDay = isCurrentMonth ? Math.max(now.getDate(), 1) : daysInMonth;

    let finalDay = 1;
    if (total <= 1) {
        // Nếu chỉ có 1 dòng, chọn ngẫu nhiên 1 ngày trong tháng
        finalDay = Math.floor(Math.random() * maxDay) + 1;
    } else {
        // Phân bổ đều từ ngày 1 đến maxDay kèm độ lệch ngẫu nhiên (jitter) để ngày xuất hiện tự nhiên
        const step = (maxDay - 1) / Math.max(total - 1, 1);
        const baseDay = 1 + (index * step);
        const jitter = (Math.random() - 0.5) * 1.8;
        finalDay = Math.max(1, Math.min(maxDay, Math.round(baseDay + jitter)));
    }

    const dObj = new Date(year, month, finalDay);
    const dateStr = `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, '0')}-${String(dObj.getDate()).padStart(2, '0')}`;

    // Giờ tạo ngẫu nhiên trong giờ làm việc (08:00 -> 19:45)
    const hours = [8, 9, 10, 11, 13, 14, 15, 16, 17, 18, 19];
    const mins = [5, 12, 18, 24, 30, 35, 42, 48, 55];
    const h = hours[(index * 3 + Math.floor(Math.random() * hours.length)) % hours.length];
    const m = mins[(index * 7 + Math.floor(Math.random() * mins.length)) % mins.length];
    const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

    return { dateStr, timeStr };
};

export const CRM_LEAD_PRICES = [
    { count: 15, label: '15 hồ sơ', price: 29000, priceStr: '29k', desc: 'Gói nhập nhanh' },
    { count: 30, label: '30 hồ sơ', price: 49000, priceStr: '49k', desc: 'Gói sự kiện nhỏ' },
    { count: 45, label: '45 hồ sơ', price: 69000, priceStr: '69k', desc: 'Gói showroom' },
    { count: 60, label: '⭐ 60 hồ sơ (Phổ biến)', price: 89000, priceStr: '89k', desc: 'Gói chuẩn hóa tháng', isHot: true },
    { count: 75, label: '75 hồ sơ', price: 109000, priceStr: '109k', desc: 'Gói sự kiện lái thử' },
    { count: 100, label: '100 hồ sơ', price: 139000, priceStr: '139k', desc: 'Gói số hóa lớn' }
];

export const calculateLeadPrice = (count: number): number => {
    if (count <= 0) return 0;
    const exact = CRM_LEAD_PRICES.find(p => p.count === count);
    if (exact) return exact.price;
    if (count <= 15) return 29000;
    if (count <= 30) return 49000;
    if (count <= 45) return 69000;
    if (count <= 60) return 89000;
    if (count <= 75) return 109000;
    if (count <= 100) return 139000;
    return Math.round(count * 1500);
};

export interface CrmLeadOrder {
    id: string;
    ten_tvbh: string;
    lead_count: number;
    amount: number;
    status: 'pending' | 'paid' | 'completed';
    sepay_transaction_id?: string | null;
    paid_at?: string | null;
    created_at: string;
    updated_at: string;
}

export interface TvbhUsageStats {
    tenTvbh: string;
    fullName: string;
    userCyber: string;
    totalOrders: number;
    completedOrdersCount: number;
    pendingOrdersCount: number;
    totalLeads: number;
    totalSpent: number;
    lastUsedAt: string | null;
    orders: CrmLeadOrder[];
}

export const CrmLeadImporterView: React.FC<CrmLeadImporterViewProps> = ({
    currentUser = '',
    currentUserName = '',
    isAdmin = false,
    showToast,
    isCrmEnabled = true,
    onToggleCrmGlobal,
    isTogglingCrm = false,
    mobileMode = false
}) => {
    // Modal Admin xem danh sách TVBH đã sử dụng dịch vụ (chỉ dành cho Admin)
    const [showAdminTvbhModal, setShowAdminTvbhModal] = useState<boolean>(false);
    const [selectedTvbhDetail, setSelectedTvbhDetail] = useState<TvbhUsageStats | null>(null);
    const [ordersList, setOrdersList] = useState<CrmLeadOrder[]>([]);
    const [isLoadingOrders, setIsLoadingOrders] = useState<boolean>(false);
    const [ordersSearchQuery, setOrdersSearchQuery] = useState<string>('');

    // Metadata state
    const [metadata, setMetadata] = useState<CrmMetadata | null>(null);
    const [isLoadingMeta, setIsLoadingMeta] = useState<boolean>(true);
    const [metaError, setMetaError] = useState<string>('');

    // TVBH selection (Tự động gán cho Sale đang đăng nhập)
    const [selectedUser, setSelectedUser] = useState<string>('');
    const [userSearchQuery, setUserSearchQuery] = useState<string>('');
    const [isManualUserSelection, setIsManualUserSelection] = useState<boolean>(false);
    const userDropdownRef = useRef<HTMLDivElement>(null);

    // File input ref & Paste modal state
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showPasteModal, setShowPasteModal] = useState<boolean>(false);
    const [rawPasteText, setRawPasteText] = useState<string>('');

    // Global Defaults for fast applying
    const [defaultModel, setDefaultModel] = useState<string>('');
    const [defaultColor, setDefaultColor] = useState<string>('');
    const defaultSource = '04'; // Facebook
    const [selectedMonth, setSelectedMonth] = useState<string>(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });

    const [autoShuffleModels, setAutoShuffleModels] = useState(true);
    const [leadRows, setLeadRows] = useState<ParsedLeadRow[]>([]);
    const leadRowsRef = useRef<ParsedLeadRow[]>([]);
    leadRowsRef.current = leadRows;
    const [isCheckingDuplicates, setIsCheckingDuplicates] = useState<boolean>(false);
    const [filterTab, setFilterTab] = useState<'all' | 'imported' | 'valid' | 'duplicate' | 'invalid'>('all');

    // Execution & Progress
    const [isImporting, setIsImporting] = useState<boolean>(false);
    const [importResult, setImportResult] = useState<CrmImportResponse['data'] | null>(null);
    const [lastImportStats, setLastImportStats] = useState<{
        count: number;
        time: string;
        user: string;
    } | null>(null);

    // Payment Mode & Bank Info
    const [bankInfo, setBankInfo] = useState<{
        bankId: string;
        accountNo: string;
        accountName: string;
    } | null>(null);
    const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
    const paymentTriggerRef = useRef<HTMLButtonElement>(null);
    const paymentSheetRef = useRef<HTMLDivElement>(null);
    const [paymentSheetStyle, setPaymentSheetStyle] = useState<React.CSSProperties>({});
    const [sePayPaidSuccess, setSePayPaidSuccess] = useState<boolean>(false);
    const isPaidHandledRef = useRef<boolean>(false);

    useLayoutEffect(() => {
        if (!showPaymentModal) return;
        const positionSheet = () => {
            const trigger = paymentTriggerRef.current;
            const sheet = paymentSheetRef.current;
            if (!trigger || !sheet) return;
            const rect = trigger.getBoundingClientRect();
            const viewport = window.visualViewport;
            const width = viewport?.width || window.innerWidth;
            const height = viewport?.height || window.innerHeight;
            const offsetLeft = viewport?.offsetLeft || 0;
            const offsetTop = viewport?.offsetTop || 0;
            const sheetWidth = Math.min(380, width - 16);
            const sheetHeight = Math.min(sheet.scrollHeight, height - 24);
            const left = Math.max(offsetLeft + 8, Math.min(rect.right - sheetWidth, offsetLeft + width - sheetWidth - 8));
            const above = rect.top - sheetHeight - 8;
            const top = above >= offsetTop + 8 ? above : Math.max(offsetTop + 8, Math.min(rect.bottom + 8, offsetTop + height - sheetHeight - 8));
            setPaymentSheetStyle({ left, top, right: 'auto', bottom: 'auto', width: sheetWidth, maxHeight: height - 24 });
        };
        positionSheet();
        const observer = new ResizeObserver(positionSheet);
        if (paymentSheetRef.current) observer.observe(paymentSheetRef.current);
        window.addEventListener('resize', positionSheet);
        window.addEventListener('scroll', positionSheet, true);
        window.visualViewport?.addEventListener('resize', positionSheet);
        window.visualViewport?.addEventListener('scroll', positionSheet);
        return () => {
            observer.disconnect();
            window.removeEventListener('resize', positionSheet);
            window.removeEventListener('scroll', positionSheet, true);
            window.visualViewport?.removeEventListener('resize', positionSheet);
            window.visualViewport?.removeEventListener('scroll', positionSheet);
        };
    }, [showPaymentModal]);

    useEffect(() => {
        if (!showPaymentModal) return;
        paymentSheetRef.current?.focus({ preventScroll: true });
        const outside = (event: PointerEvent) => {
            if (event.target instanceof Node && !paymentSheetRef.current?.contains(event.target) && !paymentTriggerRef.current?.contains(event.target)) setShowPaymentModal(false);
        };
        const escape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                setShowPaymentModal(false);
                paymentTriggerRef.current?.focus({ preventScroll: true });
            }
        };
        document.addEventListener('pointerdown', outside, true);
        document.addEventListener('keydown', escape, true);
        return () => {
            document.removeEventListener('pointerdown', outside, true);
            document.removeEventListener('keydown', escape, true);
        };
    }, [showPaymentModal]);

    useEffect(() => {
        if (!showAdminTvbhModal) return;
        const escape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                if (selectedTvbhDetail) {
                    setSelectedTvbhDetail(null);
                } else {
                    setShowAdminTvbhModal(false);
                }
            }
        };
        document.addEventListener('keydown', escape, true);
        return () => {
            document.removeEventListener('keydown', escape, true);
        };
    }, [showAdminTvbhModal, selectedTvbhDetail]);

    // CyberSoft Replica Grid States
    const [cyberSelectedRowIdx, setCyberSelectedRowIdx] = useState<number>(0);
    const [cyberSearchContact, setCyberSearchContact] = useState<string>('');
    const [isMobileToolsOpen, setIsMobileToolsOpen] = useState(false);
    const [mobileEditingLeadId, setMobileEditingLeadId] = useState<string | null>(null);

    // Load bank info from admin_bank_info setting
    useEffect(() => {
        const loadBankInfo = async () => {
            try {
                const res = await getAppSetting('admin_bank_info');
                if (res.data && res.data.bankId) {
                    setBankInfo(res.data);
                }
            } catch (err) {
                console.error('Error fetching admin_bank_info:', err);
            }
        };
        loadBankInfo();
    }, []);

    // Load orders history from crm_lead_orders (chỉ khi là Admin)
    const loadOrders = async () => {
        if (!isAdmin) return;
        setIsLoadingOrders(true);
        try {
            const { data, error } = await supabase
                .from('crm_lead_orders')
                .select('*')
                .order('created_at', { ascending: false });
            if (data && !error) {
                setOrdersList(data as CrmLeadOrder[]);
            }
        } catch (err) {
            console.error('Error fetching crm_lead_orders:', err);
        } finally {
            setIsLoadingOrders(false);
        }
    };

    useEffect(() => {
        if (!isAdmin) return;
        loadOrders();
        const channel = supabase
            .channel('crm_lead_orders_admin_sub')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'crm_lead_orders' },
                () => {
                    loadOrders();
                }
            )
            .subscribe();
        return () => {
            supabase.removeChannel(channel);
        };
    }, [isAdmin]);

    const handleCopy = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        showToast?.('Đã sao chép', `Đã sao chép ${label} vào bộ nhớ tạm.`, 'info', 1500);
    };

    // Fetch Metadata on mount
    useEffect(() => {
        let isMounted = true;
        const loadMeta = async () => {
            setIsLoadingMeta(true);
            setMetaError('');
            const res = await fetchCrmMetadata();
            if (!isMounted) return;
            setIsLoadingMeta(false);
            if (res.success && res.data) {
                setMetadata(res.data);
                // Set default model if available (e.g. VF 3 or VF 5)
                const vf3 = res.data.models.find(m => m.maKx.startsWith('VF3'));
                const firstModel = vf3 ? vf3.maKx : (res.data.models[0]?.maKx || '');
                setDefaultModel(firstModel);

                // Auto-set default color (e.g. TRANG / Trắng or first color)
                const whiteColor = res.data.colors?.find(c => removeVietnameseTones(c.tenMau).toLowerCase() === 'trang');
                const firstColor = whiteColor ? whiteColor.maMau : (res.data.colors?.[0]?.maMau || '');
                setDefaultColor(firstColor);

                // Auto-match current TVBH user
                autoMatchUser(res.data.users);
            } else {
                setMetaError(res.error || 'Không thể tải danh mục CRM');
            }
        };
        loadMeta();
        return () => { isMounted = false; };
    }, []);

    // Auto-match current TVBH from logged in session & localStorage
    const autoMatchUser = (users: CrmMetadata['users']) => {
        if (!users || users.length === 0) return;

        // 1. Kiểm tra tài khoản đã lưu trước đó trong trình duyệt cho user này
        const storageKey = `cyber_crm_account_${currentUserName || currentUser || 'default'}`;
        const savedAccount = localStorage.getItem(storageKey);
        if (savedAccount) {
            setSelectedUser(savedAccount.trim().toUpperCase());
            return;
        }

        const loginUserClean = (currentUserName || '').replace(/^02\./i, '').toLowerCase().trim();
        const consultantClean = removeVietnameseTones(currentUser || '');

        // 2. Khớp theo username đăng nhập (ví dụ: "tiendtt" -> "02.TIENDTT")
        if (loginUserClean) {
            const byUsername = users.find(u => {
                const rawU = u.userName.replace(/^02\./i, '').toLowerCase().trim();
                return rawU === loginUserClean || rawU.includes(loginUserClean) || loginUserClean.includes(rawU);
            });
            if (byUsername) {
                setSelectedUser(byUsername.userName);
                localStorage.setItem(storageKey, byUsername.userName);
                return;
            }
        }

        // 3. Khớp theo họ tên tiếng Việt (ví dụ: "Đoàn Thị Tiến" -> "02.TIENDTT" hoặc khớp họ tên trong Cyber)
        if (consultantClean) {
            const byFullName = users.find(u => {
                const uNameClean = removeVietnameseTones(u.fullName);
                return uNameClean === consultantClean || uNameClean.includes(consultantClean) || consultantClean.includes(uNameClean);
            });
            if (byFullName) {
                setSelectedUser(byFullName.userName);
                localStorage.setItem(storageKey, byFullName.userName);
                return;
            }

            // Thử khớp theo từ viết tắt (ví dụ: "Đoàn Thị Tiến" -> "TIENDTT")
            const parts = consultantClean.split(' ').filter(Boolean);
            if (parts.length >= 2) {
                const lastName = parts[parts.length - 1]; // "tien"
                const firstInitials = parts.slice(0, -1).map(p => p[0]).join(''); // "dt"
                const acronym = (lastName + firstInitials).toLowerCase(); // "tiendt"
                const byAcronym = users.find(u => {
                    const rawU = u.userName.replace(/^02\./i, '').toLowerCase().trim();
                    return rawU.startsWith(acronym) || rawU.includes(lastName);
                });
                if (byAcronym) {
                    setSelectedUser(byAcronym.userName);
                    localStorage.setItem(storageKey, byAcronym.userName);
                    return;
                }
            }
        }

        // 4. Mặc định user đầu tiên nếu không khớp
        if (users.length > 0) {
            setSelectedUser(users[0].userName);
        }
    };

    const handleSelectUser = (userName: string) => {
        const clean = (userName || '').trim().toUpperCase();
        setSelectedUser(clean);
        const storageKey = `cyber_crm_account_${currentUserName || currentUser || 'default'}`;
        if (clean) {
            localStorage.setItem(storageKey, clean);
        }
        setIsManualUserSelection(false);
        setUserSearchQuery('');
        showToast?.('Đã lưu tài khoản CRM', `Khách hàng sẽ được nhập trực tiếp cho TVBH: ${clean}`, 'success');
    };

    const handleDirectUserCodeChange = (newCode: string) => {
        const val = (newCode || '').trim().toUpperCase();
        setSelectedUser(val);
        const storageKey = `cyber_crm_account_${currentUserName || currentUser || 'default'}`;
        if (val) {
            localStorage.setItem(storageKey, val);
        }
    };

    // Close user dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
                setIsManualUserSelection(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filtered TVBH list for dropdown
    const filteredUsers = useMemo(() => {
        if (!metadata?.users) return [];
        if (!userSearchQuery.trim()) return metadata.users;
        const q = removeVietnameseTones(userSearchQuery);
        return metadata.users.filter(u =>
            removeVietnameseTones(u.fullName).includes(q) ||
            u.userName.toLowerCase().includes(userSearchQuery.toLowerCase())
        );
    }, [metadata?.users, userSearchQuery]);

    // Active selected TVBH info
    const selectedUserInfo = useMemo(() => {
        if (!selectedUser) return null;
        const clean = selectedUser.replace(/^02\./i, '').toUpperCase().trim();
        return metadata?.users.find(u => {
            const uClean = u.userName.replace(/^02\./i, '').toUpperCase().trim();
            return u.userName.toUpperCase() === selectedUser.toUpperCase() || uClean === clean;
        });
    }, [metadata?.users, selectedUser]);

    // Helper: Định dạng thời gian tương đối tiếng Việt
    const formatRelativeTime = (dateStr?: string | null): string => {
        if (!dateStr) return 'Chưa có';
        const d = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffMins = Math.floor(diffMs / (60 * 1000));
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Vừa xong';
        if (diffMins < 60) return `${diffMins} phút trước`;
        if (diffHours < 24) return `${diffHours} giờ trước`;
        if (diffDays < 30) return `${diffDays} ngày trước`;
        return d.toLocaleDateString('vi-VN');
    };

    // Helper: Lấy 2 chữ cái viết tắt cho avatar
    const getInitials = (name: string): string => {
        if (!name) return 'TV';
        const words = name.trim().split(/\s+/).filter(Boolean);
        if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
        return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    };



    // Thống kê sử dụng dịch vụ gom nhóm theo từng TVBH
    const tvbhUsageStatsList = useMemo<TvbhUsageStats[]>(() => {
        const userMap = new Map<string, {
            tenTvbh: string;
            fullName: string;
            userCyber: string;
            orders: CrmLeadOrder[];
        }>();

        ordersList.forEach(order => {
            const rawCode = (order.ten_tvbh || '').replace(/^02\./i, '').toUpperCase().trim();
            if (!rawCode) return;

            if (!userMap.has(rawCode)) {
                // Khớp họ tên từ danh mục Cyber users
                const matchedUser = metadata?.users.find(u => {
                    const cleanU = u.userName.replace(/^02\./i, '').toUpperCase().trim();
                    return cleanU === rawCode;
                });

                userMap.set(rawCode, {
                    tenTvbh: rawCode,
                    fullName: matchedUser?.fullName || rawCode,
                    userCyber: matchedUser?.userName || `02.${rawCode}`,
                    orders: []
                });
            }

            userMap.get(rawCode)!.orders.push(order);
        });

        const list = Array.from(userMap.values()).map(item => {
            const completedOrders = item.orders.filter(o => o.status === 'completed' || o.status === 'paid');
            const pendingOrders = item.orders.filter(o => o.status === 'pending');
            const totalLeads = completedOrders.reduce((sum, o) => sum + (o.lead_count || 0), 0);
            const totalSpent = completedOrders.reduce((sum, o) => sum + Number(o.amount || 0), 0);

            const sortedOrders = [...item.orders].sort((a, b) => 
                new Date(b.paid_at || b.created_at).getTime() - new Date(a.paid_at || a.created_at).getTime()
            );
            const lastOrder = sortedOrders[0];
            const lastUsedAt = lastOrder ? (lastOrder.paid_at || lastOrder.created_at) : null;

            return {
                tenTvbh: item.tenTvbh,
                fullName: item.fullName,
                userCyber: item.userCyber,
                totalOrders: item.orders.length,
                completedOrdersCount: completedOrders.length,
                pendingOrdersCount: pendingOrders.length,
                totalLeads,
                totalSpent,
                lastUsedAt,
                orders: sortedOrders
            };
        });

        // Sắp xếp ưu tiên: Tổng số khách nạp nhiều nhất -> Lượt nạp nhiều nhất -> Thời gian mới nhất
        return list.sort((a, b) => {
            if (b.totalLeads !== a.totalLeads) return b.totalLeads - a.totalLeads;
            if (b.completedOrdersCount !== a.completedOrdersCount) return b.completedOrdersCount - a.completedOrdersCount;
            return (new Date(b.lastUsedAt || 0).getTime()) - (new Date(a.lastUsedAt || 0).getTime());
        });
    }, [ordersList, metadata?.users]);

    // Tổng hợp KPI toàn hệ thống
    const overallStats = useMemo(() => {
        const completedList = tvbhUsageStatsList.filter(s => s.completedOrdersCount > 0);
        const totalTvbhUsed = completedList.length;
        const totalLeadsImported = completedList.reduce((sum, s) => sum + s.totalLeads, 0);
        const totalRevenue = completedList.reduce((sum, s) => sum + s.totalSpent, 0);

        const allCompletedOrders = ordersList
            .filter(o => o.status === 'completed' || o.status === 'paid')
            .sort((a, b) => new Date(b.paid_at || b.created_at).getTime() - new Date(a.paid_at || a.created_at).getTime());

        const latestOrder = allCompletedOrders[0] || null;

        return {
            totalTvbhUsed,
            totalLeadsImported,
            totalRevenue,
            latestOrder
        };
    }, [tvbhUsageStatsList, ordersList]);

    // Lọc danh sách TVBH đã sử dụng dịch vụ thành công
    const filteredTvbhList = useMemo(() => {
        return tvbhUsageStatsList.filter(item => {
            if (item.completedOrdersCount === 0) return false;
            if (ordersSearchQuery.trim()) {
                const q = removeVietnameseTones(ordersSearchQuery.toLowerCase());
                const matchName = removeVietnameseTones(item.fullName.toLowerCase()).includes(q);
                const matchCode = item.tenTvbh.toLowerCase().includes(q);
                const matchCyber = item.userCyber.toLowerCase().includes(q);
                if (!matchName && !matchCode && !matchCyber) return false;
            }
            return true;
        });
    }, [tvbhUsageStatsList, ordersSearchQuery]);

    // Xuất báo cáo danh sách TVBH đã sử dụng dịch vụ ra Excel
    const handleExportTvbhUsageExcel = () => {
        if (filteredTvbhList.length === 0) {
            showToast?.('Chưa có dữ liệu', 'Chưa có TVBH nào phù hợp điều kiện để xuất báo cáo!', 'info');
            return;
        }

        const exportData = filteredTvbhList.map((item, idx) => ({
            'STT': idx + 1,
            'Họ và Tên TVBH': item.fullName,
            'Tài khoản Cyber': item.userCyber,
            'Mã TVBH': item.tenTvbh,
            'Lượt nạp thành công': item.completedOrdersCount,
            'Tổng hồ sơ KHTN đã nạp': item.totalLeads,
            'Tổng phí dịch vụ (VNĐ)': item.totalSpent,
            'Lần nạp gần nhất': item.lastUsedAt ? new Date(item.lastUsedAt).toLocaleString('vi-VN') : '—'
        }));

        const ws = xlsx.utils.json_to_sheet(exportData);
        ws['!cols'] = [
            { wch: 6 },
            { wch: 28 },
            { wch: 18 },
            { wch: 14 },
            { wch: 20 },
            { wch: 24 },
            { wch: 24 },
            { wch: 24 }
        ];
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, 'DS_TVBH_SuDungDichVu');
        xlsx.writeFile(wb, `DS_TVBH_Su_Dung_Dich_Vu_${new Date().toISOString().slice(0, 10)}.xlsx`);
        showToast?.('Đã xuất Excel', 'Đã tải xuống danh sách TVBH đã sử dụng dịch vụ thành công.', 'success');
    };

    // Chọn TVBH từ danh sách để Admin nạp thay
    const handleSelectTvbhForImport = (userCyber: string) => {
        setSelectedUser(userCyber);
        const storageKey = `cyber_crm_account_${currentUserName || currentUser || 'default'}`;
        localStorage.setItem(storageKey, userCyber);
        setShowAdminTvbhModal(false);
        showToast?.('Đã chọn TVBH', `Đã chọn TVBH: ${userCyber} để import KHTN`, 'info');
    };

    // Xử lý chọn tệp Excel từ máy tính
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileUpload(file);
            e.target.value = '';
        }
    };

    // Đọc và bóc tách dữ liệu từ file Excel
    const handleFileUpload = async (file: File) => {
        if (autoShuffleModels && !metadata?.models.length) { showToast?.("Chưa có danh mục xe", "Đợi tải xong danh mục hoặc tắt Tự xáo dòng xe rồi tải lại file.", "warning"); return; }
        try {
            const data = await file.arrayBuffer();
            const workbook = xlsx.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const rawJson: any[] = xlsx.utils.sheet_to_json(worksheet, { defval: '' });

            if (!rawJson || rawJson.length === 0) {
                showToast?.('File trống', 'Tệp Excel không có dữ liệu hàng nào.', 'warning');
                return;
            }

            const activeModels = metadata?.models || [];
            const activeColors = metadata?.colors || [];

            const parsed: ParsedLeadRow[] = [];

            rawJson.forEach((row, idx) => {
                let fullName = '';
                let phone = '';
                let phone2 = '';
                let address = '';
                let modelStr = '';
                let colorStr = '';
                let sourceStr = '';
                let note = '';
                let dateVal = '';

                for (const key of Object.keys(row)) {
                    const k = removeVietnameseTones(key.toLowerCase().trim());
                    const v = String(row[key] || '').trim();
                    if (!v) continue;

                    if (!fullName && (k.includes('ho ten') || k.includes('ho va ten') || k.includes('ten kh') || k.includes('khach hang') || k.includes('nguoi lien he') || k === 'ten' || k === 'name')) {
                        fullName = v;
                    } else if (!phone && (k.includes('dien thoai 1') || k.includes('so dien thoai') || k.includes('dien thoai') || k.includes('sdt') || k.includes('phone') || k.includes('mobile'))) {
                        phone = normalizePhone(v);
                    } else if (!phone2 && (k.includes('dien thoai 2') || k.includes('sdt 2') || k.includes('phone 2'))) {
                        phone2 = normalizePhone(v);
                    } else if (!address && (k.includes('dia chi') || k.includes('address') || k.includes('tinh') || k.includes('thanh pho') || k.includes('khu vuc'))) {
                        address = v;
                    } else if (!modelStr && (k.includes('dong xe') || k.includes('mau xe') || k.includes('model') || k.includes('xe quan tam') || k.includes('loai xe'))) {
                        modelStr = v;
                    } else if (!colorStr && (k.includes('mau') || k.includes('color'))) {
                        colorStr = v;
                    } else if (!sourceStr && (k.includes('nguon') || k.includes('source'))) {
                        sourceStr = v;
                    } else if (!note && (k.includes('ghi chu') || k.includes('note') || k.includes('nhu cau'))) {
                        note = v;
                    } else if (!dateVal && (k.includes('ngay tao') || k.includes('ngay tiep can') || k.includes('ngay') || k.includes('date'))) {
                        dateVal = v;
                    }
                }

                // Nếu chưa thấy phone trong tên cột, tìm trong giá trị
                if (!phone) {
                    for (const key of Object.keys(row)) {
                        const v = normalizePhone(String(row[key] || ''));
                        if (PHONE_REGEX.test(v)) {
                            phone = v;
                            break;
                        }
                    }
                }

                if (!fullName && !phone) return;

                if (!fullName) fullName = `Khách hàng ${phone.slice(-4)}`;
                if (!address) address = 'Bình Dương';

                // Khớp dòng xe
                let matchedModel = defaultModel;
                if (modelStr) {
                    const cleanM = removeVietnameseTones(modelStr).toUpperCase();
                    const found = activeModels.find(m => cleanM.includes(m.maKx.toUpperCase()) || cleanM.includes(removeVietnameseTones(m.tenKx).toUpperCase()));
                    if (found) matchedModel = found.maKx;
                }
                if (!matchedModel && activeModels.length > 0) {
                    matchedModel = activeModels[idx % activeModels.length].maKx;
                }

                // Khớp màu xe
                let matchedColor = defaultColor;
                if (colorStr) {
                    const cleanC = removeVietnameseTones(colorStr).toUpperCase();
                    const found = activeColors.find(c => cleanC.includes(c.maMau.toUpperCase()) || cleanC.includes(removeVietnameseTones(c.tenMau).toUpperCase()));
                    if (found) matchedColor = found.maMau;
                }
                if (!matchedColor && activeColors.length > 0) {
                    matchedColor = activeColors[idx % activeColors.length].maMau;
                }

                const { dateStr, timeStr } = getRandomDistributedDate(idx, rawJson.length, selectedMonth);
                const finalDate = dateVal && dateVal.includes('-') ? dateVal : dateStr;

                parsed.push({
                    id: `lead-excel-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
                    fullName,
                    phone,
                    phone2: phone2 || '',
                    createdDate: finalDate,
                    createdTime: timeStr,
                    model: matchedModel,
                    color: matchedColor,
                    source: defaultSource || '02',
                    status: '02',
                    paymentMethod: '02',
                    address,
                    note: note || 'Khách hàng sự kiện/lái thử',
                    isValidPhone: PHONE_REGEX.test(phone),
                    isSelected: true
                });
            });

            if (parsed.length === 0) {
                showToast?.('Không đọc được dữ liệu', 'Không tìm thấy thông tin họ tên hoặc số điện thoại trong file Excel.', 'error');
                return;
            }

            const sourced = shuffleCrmSources(parsed, metadata?.sources || []);
            const prepared = autoShuffleModels ? shuffleCrmModels(sourced, metadata?.models || []) : sourced;
            setLeadRows(prepared);
            showToast?.('Nhập file thành công', `Đã nhập ${parsed.length} khách hàng từ file ${file.name}. Đang kiểm tra trùng...`, 'success', 3000);
            runDuplicateCheck(prepared);
        } catch (err: any) {
            console.error('File upload error:', err);
            showToast?.('Lỗi đọc file', `Không thể đọc file Excel: ${err.message}`, 'error');
        }
    };

    // Xử lý dán văn bản nhanh từ Zalo / Notes
    const handleExecutePaste = () => {
        if (autoShuffleModels && !metadata?.models.length) { showToast?.('Chưa có danh mục xe', 'Đợi tải xong danh mục hoặc tắt Tự xáo dòng xe rồi dán lại.', 'warning'); return; }
        if (!rawPasteText.trim()) {
            showToast?.('Chưa nhập văn bản', 'Vui lòng dán danh sách khách hàng vào ô bên dưới!', 'warning');
            return;
        }

        const lines = rawPasteText.split('\n').map(l => l.trim()).filter(Boolean);
        const activeModels = metadata?.models || [];
        const activeColors = metadata?.colors || [];

        const parsed: ParsedLeadRow[] = [];

        lines.forEach((line, idx) => {
            const tokens = line.split(/[,;\t]|\s+-\s+/).map(t => t.trim()).filter(Boolean);
            let phone = '';
            let fullName = '';
            let model = '';
            let address = '';

            tokens.forEach(tok => {
                const cleanTok = normalizePhone(tok);
                if (!phone && PHONE_REGEX.test(cleanTok)) {
                    phone = cleanTok;
                } else if (!fullName && isNaN(Number(tok)) && tok.length >= 2) {
                    fullName = tok;
                } else if (!model && (tok.toLowerCase().includes('vf') || tok.toLowerCase().includes('vinfast'))) {
                    model = tok;
                } else if (!address && tok.length > 2) {
                    address = tok;
                }
            });

            if (!phone) {
                const match = line.match(/(0|84|\+84)[35789][0-9]{8}/);
                if (match) {
                    phone = normalizePhone(match[0]);
                }
            }

            if (phone || fullName) {
                if (!fullName) fullName = `Khách hàng ${phone.slice(-4)}`;
                if (!address) address = 'Bình Dương';

                let matchedModel = defaultModel;
                if (model) {
                    const cleanM = removeVietnameseTones(model).toUpperCase();
                    const found = activeModels.find(m => cleanM.includes(m.maKx.toUpperCase()) || cleanM.includes(removeVietnameseTones(m.tenKx).toUpperCase()));
                    if (found) matchedModel = found.maKx;
                }
                if (!matchedModel && activeModels.length > 0) {
                    matchedModel = activeModels[idx % activeModels.length].maKx;
                }

                const { dateStr, timeStr } = getRandomDistributedDate(idx, lines.length, selectedMonth);

                parsed.push({
                    id: `lead-paste-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
                    fullName,
                    phone,
                    phone2: '',
                    createdDate: dateStr,
                    createdTime: timeStr,
                    model: matchedModel,
                    color: defaultColor || (activeColors[idx % (activeColors.length || 1)]?.maMau || 'TRANG'),
                    source: defaultSource || '02',
                    status: '02',
                    paymentMethod: '02',
                    address,
                    note: 'Khách dán nhanh từ Zalo/Note',
                    isValidPhone: PHONE_REGEX.test(phone),
                    isSelected: true
                });
            }
        });

        if (parsed.length === 0) {
            showToast?.('Không đọc được', 'Không tìm thấy số điện thoại hợp lệ trong nội dung vừa dán!', 'warning');
            return;
        }

        const sourced = shuffleCrmSources(parsed, metadata?.sources || []);
        const prepared = autoShuffleModels ? shuffleCrmModels(sourced, metadata?.models || []) : sourced;
        const combined = [...leadRows, ...prepared];
        setLeadRows(combined);
        setShowPasteModal(false);
        setRawPasteText('');
        showToast?.('Đã thêm thành công', `Đã thêm ${parsed.length} khách hàng vào danh sách. Đang kiểm tra trùng...`, 'success', 3000);
        runDuplicateCheck(combined);
    };



    // Run Duplicate Check against CyberSoft CRM
    const runDuplicateCheck = async (rowsToCheck = leadRows) => {
        const validPhones = rowsToCheck
            .filter(r => r.isValidPhone && r.phone)
            .map(r => r.phone);

        if (validPhones.length === 0) return;

        setIsCheckingDuplicates(true);
        try {
            const res = await checkCrmDuplicates(validPhones);
            if (res.success && res.duplicates) {
                const dups = res.duplicates;
                setLeadRows(prev => prev.map(row => {
                    const dupInfo = dups[row.phone];
                    if (dupInfo) {
                        return {
                            ...row,
                            duplicateInfo: dupInfo,
                            // Tự động bỏ chọn khách hàng bị trùng để an toàn
                            isSelected: false
                        };
                    }
                    return {
                        ...row,
                        duplicateInfo: undefined
                    };
                }));

                const dupCount = Object.keys(dups).length;
                if (dupCount > 0) {
                    showToast?.('Kiểm tra trùng', `Phát hiện ${dupCount} số điện thoại đã tồn tại trên hệ thống. Đã tự động bỏ chọn các số này.`, 'warning', 4000);
                } else {
                    showToast?.('Kiểm tra trùng', 'Tuyệt vời! Toàn bộ số điện thoại đều mới, không trùng trên hệ thống.', 'success', 3000);
                }
            } else if (res.error) {
                showToast?.('Cảnh báo', `Lỗi kiểm tra trùng SĐT: ${res.error}`, 'warning');
            }
        } catch (e: any) {
            console.error('Error checking duplicates:', e);
        } finally {
            setIsCheckingDuplicates(false);
        }
    };

    // Download Sample Excel Template
    const handleDownloadTemplate = () => {
        const templateData = [
            {
                'Họ và tên': 'Nguyễn Văn An',
                'Số điện thoại': '0981112233',
                'Dòng xe': 'VF 3',
                'Màu xe': 'Vàng nóc trắng',
                'Nguồn tiếp cận': 'Khách qua Facebook',
                'Hình thức thanh toán': 'Trả góp',
                'Số ĐT 2': '0988776655',
                'Địa chỉ': 'Thuận An, Bình Dương',
                'Ghi chú': 'Quan tâm xe màu Vàng nóc Trắng, giao xe tháng này'
            },
            {
                'Họ và tên': 'Trần Thị Bích',
                'Số điện thoại': '0982223344',
                'Dòng xe': 'VF 5',
                'Màu xe': 'Trắng',
                'Nguồn tiếp cận': 'Khách đến Showroom',
                'Hình thức thanh toán': 'Trả thẳng',
                'Số ĐT 2': '',
                'Địa chỉ': 'Dĩ An, Bình Dương',
                'Ghi chú': 'Đã lái thử, chuẩn bị đặt cọc'
            },
            {
                'Họ và tên': 'Lê Hoàng Nam',
                'Số điện thoại': '0983334455',
                'Dòng xe': 'VF 6',
                'Màu xe': 'Đỏ',
                'Nguồn tiếp cận': 'Khách từ Hotline công ty',
                'Hình thức thanh toán': 'Trả góp',
                'Số ĐT 2': '',
                'Địa chỉ': 'TP. Thủ Đức, TP.HCM',
                'Ghi chú': 'Cần tư vấn gói vay ngân hàng 80%'
            },
            {
                'Họ và tên': 'Phạm Minh Đức',
                'Số điện thoại': '0984445566',
                'Dòng xe': 'VF 7',
                'Màu xe': 'Xám',
                'Nguồn tiếp cận': 'Khách qua mối quan hệ cá nhân',
                'Hình thức thanh toán': 'Trả thẳng',
                'Số ĐT 2': '',
                'Địa chỉ': 'Thuận Giao, Thuận An',
                'Ghi chú': 'Khách quen hẹn thứ 7 ghé ký cọc'
            },
            {
                'Họ và tên': 'Hoàng Thu Trang',
                'Số điện thoại': '0985556677',
                'Dòng xe': 'VF 8',
                'Màu xe': 'Đen',
                'Nguồn tiếp cận': 'Khách kênh Online khác',
                'Hình thức thanh toán': 'Trả góp',
                'Số ĐT 2': '',
                'Địa chỉ': 'Thủ Dầu Một, Bình Dương',
                'Ghi chú': 'Tư vấn xe bản Plus'
            }
        ];

        // Sheet 1: Bảng dữ liệu mẫu để TVBH nhập
        const wsData = xlsx.utils.json_to_sheet(templateData);
        wsData['!cols'] = [
            { wch: 22 }, // Họ và tên
            { wch: 16 }, // Số điện thoại
            { wch: 12 }, // Dòng xe
            { wch: 18 }, // Màu xe
            { wch: 28 }, // Nguồn tiếp cận
            { wch: 22 }, // Hình thức thanh toán
            { wch: 16 }, // Số ĐT 2
            { wch: 26 }, // Địa chỉ
            { wch: 45 }, // Ghi chú
        ];

        // Sheet 2: Bảng Hướng dẫn & Danh mục chuẩn
        const guideRows = [
            { 'HƯỚNG DẪN DÀNH CHO TVBH': 'QUY TẮC NHẬP DỮ LIỆU KHTN THUẬN AN' },
            { 'HƯỚNG DẪN DÀNH CHO TVBH': '1. Hai cột bắt buộc phải có thông tin: [Họ và tên] và [Số điện thoại].' },
            { 'HƯỚNG DẪN DÀNH CHO TVBH': '2. Số điện thoại có thể để 9 số (ví dụ: 981112233) hoặc 10 số (0981112233), web sẽ tự động chuẩn hóa.' },
            { 'HƯỚNG DẪN DÀNH CHO TVBH': '3. Các cột còn lại (Dòng xe, Màu xe, Nguồn, Hình thức TT) nếu để trống hệ thống sẽ tự động áp dụng giá trị mặc định trên web.' },
            { 'HƯỚNG DẪN DÀNH CHO TVBH': '4. Bạn có thể copy các cột từ file này rồi dán trực tiếp vào tab "Dán Từ Excel", hoặc tải file này lên tab "Tải Lên File Excel".' },
            { 'HƯỚNG DẪN DÀNH CHO TVBH': '5. Dữ liệu khi nhập sẽ được cấp mã KHTN và ghi trực tiếp vào tài khoản của TVBH đang đăng nhập.' },
            { 'HƯỚNG DẪN DÀNH CHO TVBH': '' },
            { 'HƯỚNG DẪN DÀNH CHO TVBH': '--- DANH MỤC DÒNG XE THAM KHẢO ---' },
            ...(metadata?.models.slice(0, 10).map(m => ({ 'HƯỚNG DẪN DÀNH CHO TVBH': `• ${m.tenKx} (${m.maKx})` })) || []),
            { 'HƯỚNG DẪN DÀNH CHO TVBH': '' },
            { 'HƯỚNG DẪN DÀNH CHO TVBH': '--- DANH MỤC NGUỒN KHÁCH THAM KHẢO ---' },
            ...(metadata?.sources.map(s => ({ 'HƯỚNG DẪN DÀNH CHO TVBH': `• ${s.tenPtlh}` })) || []),
            { 'HƯỚNG DẪN DÀNH CHO TVBH': '' },
            { 'HƯỚNG DẪN DÀNH CHO TVBH': '--- MÀU XE PHỔ BIẾN ---' },
            { 'HƯỚNG DẪN DÀNH CHO TVBH': '• Trắng, Xám, Đen, Đỏ, Vàng, Bạc, Xanh dương, Xanh lá, Vàng nóc trắng, Be, Hồng...' },
        ];
        const wsGuide = xlsx.utils.json_to_sheet(guideRows);
        wsGuide['!cols'] = [{ wch: 90 }];

        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, wsData, 'Nhap_Khach_Hang');
        xlsx.utils.book_append_sheet(wb, wsGuide, 'Huong_Dan_Va_Danh_Muc');
        xlsx.writeFile(wb, 'Mau_Nhap_KHTN_ThuanAn.xlsx');
        showToast?.('Tải mẫu thành công', 'File mẫu Excel chuẩn đã được tải xuống máy của bạn.', 'success');
    };


    // Phân bổ ngày tiếp cận chia đều trong tháng cho toàn bộ danh sách
    const handleApplyMonthToAll = (monthStr: string) => {
        if (!monthStr) return;
        setSelectedMonth(monthStr);
        if (leadRows.length === 0) return;

        setLeadRows(prev => prev.map((row, idx) => {
            const { dateStr, timeStr } = getRandomDistributedDate(idx, prev.length, monthStr);
            return {
                ...row,
                createdDate: dateStr,
                createdTime: timeStr
            };
        }));
        showToast?.('Đã chia đều ngày', `Đã phân bổ ngẫu nhiên ngày tiếp cận trong tháng ${monthStr} cho toàn bộ ${leadRows.length} khách hàng!`, 'info', 2500);
    };

    // Row manipulations
    const handleRowChange = (id: string, field: keyof ParsedLeadRow, value: any) => {
        setLeadRows(prev => prev.map(row => {
            if (row.id !== id) return row;
            const updated = { ...row, [field]: value };
            if (field === 'phone') {
                updated.phone = normalizePhone(value);
                updated.isValidPhone = PHONE_REGEX.test(updated.phone);
                // Xóa trạng thái trùng cũ khi người dùng sửa số điện thoại
                updated.duplicateInfo = undefined;
                if (updated.isValidPhone) {
                    updated.isSelected = true;
                }
            }
            return updated;
        }));
    };

    // Tự động thay đổi các SĐT bị trùng hoặc sai định dạng thành số hợp lệ để nạp ngay (random tự nhiên, đa dạng, không dính pattern)
    const handleAutoFixDuplicates = () => {
        let fixedCount = 0;
        setLeadRows(prev => prev.map(r => {
            if (r.duplicateInfo || !r.isValidPhone) {
                fixedCount++;
                const originalPhone = r.phone;
                const newPhone = generateRealisticPhone(r.phone);

                // Tự động lưu lại SĐT gốc của khách vào phần ghi chú để TVBH vẫn nắm được số thật
                const noteTag = `[SĐT gốc: ${originalPhone}]`;
                const updatedNote = r.note
                    ? (r.note.includes('SĐT gốc') ? r.note : `${noteTag} ${r.note}`)
                    : noteTag;

                return {
                    ...r,
                    phone: newPhone,
                    note: updatedNote,
                    isValidPhone: true,
                    duplicateInfo: undefined,
                    isSelected: true
                };
            }
            return r;
        }));

        if (fixedCount > 0) {
            showToast?.(
                'Đã đổi SĐT thành công',
                `Đã tự động đổi ${fixedCount} số điện thoại sang số mới hợp lệ đa dạng (SĐT gốc đã được lưu vào ô Ghi Chú)!`,
                'success',
                4000
            );
        } else {
            showToast?.('Thông báo', 'Tất cả các số điện thoại hiện tại đều đã hợp lệ.', 'info');
        }
    };

    const handleRandomizeAllRows = () => {
        const selected = leadRows.filter(row => row.isSelected && !row.isImported);
        if (!selected.length) { showToast?.('Chưa chọn khách', 'Chọn khách hàng chưa nhập để xáo dòng xe.', 'info'); return; }
        if (!metadata?.models.length) { showToast?.('Chưa có danh mục xe', 'Vui lòng tải lại danh mục trước khi xáo dòng xe.', 'warning'); return; }
        setLeadRows(prev => shuffleCrmModels(prev, metadata.models));
        showToast?.('Đã xáo dòng xe', 'Đã phân bổ dòng xe cho ' + selected.length + ' khách được chọn. Màu xe và thông tin khách được giữ nguyên.', 'success', 4000);
    };

    const handleDeleteRow = (id: string) => {
        setLeadRows(prev => prev.filter(r => r.id !== id));
    };

    const handleToggleSelectAll = (checked: boolean) => {
        setLeadRows(prev => prev.map(r => {
            // Chỉ chọn nếu số điện thoại hợp lệ
            if (r.isValidPhone) {
                return { ...r, isSelected: checked };
            }
            return r;
        }));
    };

    const handleClearAll = () => {
        if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ danh sách khách hàng đang xem?')) {
            setLeadRows([]);
        }
    };

    // Filtered Rows for preview table
    const displayedRows = useMemo(() => {
        return leadRows.filter(r => {
            if (filterTab === 'imported') return !!r.isImported;
            if (filterTab === 'valid') return r.isValidPhone && !r.duplicateInfo && !r.isImported;
            if (filterTab === 'duplicate') return !!r.duplicateInfo && !r.isImported;
            if (filterTab === 'invalid') return !r.isValidPhone && !r.isImported;
            return true;
        });
    }, [leadRows, filterTab]);

    // Rows filtered by Cyber Search input
    const cyberFilteredRows = useMemo(() => {
        if (!cyberSearchContact.trim()) return displayedRows;
        const q = cyberSearchContact.toLowerCase().trim();
        return displayedRows.filter(r =>
            (r.fullName && r.fullName.toLowerCase().includes(q)) ||
            (r.phone && r.phone.includes(q)) ||
            (r.address && r.address.toLowerCase().includes(q))
        );
    }, [displayedRows, cyberSearchContact]);

    // Summary counts
    const counts = useMemo(() => {
        const total = leadRows.length;
        const imported = leadRows.filter(r => r.isImported).length;
        const valid = leadRows.filter(r => r.isValidPhone && !r.duplicateInfo && !r.isImported).length;
        const duplicate = leadRows.filter(r => !!r.duplicateInfo && !r.isImported).length;
        const invalid = leadRows.filter(r => !r.isValidPhone && !r.isImported).length;
        const selected = leadRows.filter(r => r.isSelected && r.isValidPhone && !r.isImported).length;
        return { total, imported, valid, duplicate, invalid, selected };
    }, [leadRows]);

    // Handle Bulk Import to Cyber CRM: Mở Ticket Thanh Toán VietQR
    const handleImport = async () => {
        if (!selectedUser) {
            showToast?.('Chưa chọn TVBH', 'Vui lòng chọn tài khoản TVBH nhận danh sách khách hàng!', 'warning');
            return;
        }

        const selectedToImport = leadRows.filter(r => r.isSelected && r.isValidPhone);

        if (selectedToImport.length === 0) {
            showToast?.('Không có khách hàng', 'Vui lòng tích chọn ít nhất 1 khách hàng hợp lệ để nạp!', 'warning');
            return;
        }

        // Cảnh báo nếu có khách hàng trùng số điện thoại
        const selectedDups = selectedToImport.filter(r => !!r.duplicateInfo);
        if (selectedDups.length > 0) {
            const confirmed = window.confirm(
                `Cảnh báo: Bạn đang chọn ${selectedDups.length} khách hàng TRÙNG SỐ ĐIỆN THOẠI trên hệ thống!\n\n` +
                `Bạn có chắc chắn vẫn muốn import thêm các khách hàng này cho tài khoản [${selectedUser}] không?`
            );
            if (!confirmed) return;
        }

        // Mở Modal Thanh toán VietQR (style phí web hàng tháng)
        isPaidHandledRef.current = false;
        setSePayPaidSuccess(false);
        setShowPaymentModal(true);
    };

    // Thực thi nạp khách hàng vào Cyber CRM
    const executeImportLeads = async () => {
        const currentRows = leadRowsRef.current.length > 0 ? leadRowsRef.current : leadRows;
        let selectedToImport = currentRows.filter(r => r.isSelected && r.isValidPhone && !r.isImported);
        
        // Fallback: nếu chưa kịp tích chọn nhưng có khách hàng hợp lệ
        if (selectedToImport.length === 0) {
            selectedToImport = currentRows.filter(r => r.isValidPhone && !r.isImported).slice(0, 15);
        }

        if (selectedToImport.length === 0) {
            showToast?.('Không có khách hàng', 'Vui lòng kiểm tra lại danh sách khách hàng cần import!', 'warning');
            return;
        }

        setIsImporting(true);
        showToast?.('Đang import KHTN...', `Đang xử lý ${selectedToImport.length} khách hàng, vui lòng không tắt trang...`, 'loading');

        try {
            const payloadLeads = selectedToImport.map(r => ({
                fullName: r.fullName,
                customerName: r.fullName,
                tenKh: r.fullName,
                phone: r.phone,
                dt1: r.phone,
                phone2: r.phone2,
                createdDate: r.createdDate,
                ngayTao: r.createdDate,
                createdTime: r.createdTime,
                gioTao: r.createdTime,
                model: r.model,
                maKx: r.model,
                color: r.color,
                maMau: r.color,
                source: r.source,
                maPtlh: r.source,
                status: r.status,
                maTtkh: r.status,
                paymentMethod: r.paymentMethod,
                maHttt: r.paymentMethod,
                address: r.address,
                diaChi: r.address,
                maTtcp: '02.01.08',
                businessLocation: '02.01.08',
                note: r.note,
                ghiChu: r.note
            }));

            const res = await importCrmLeads(selectedUser, payloadLeads, '02', '02.01.08');

            if (res.success && res.data) {
                setImportResult(res.data);
                const createdMap = new Map(res.data.created.map(c => [c.phone, c.idKh]));

                // Cập nhật trạng thái từng dòng trực tiếp trong bảng giao diện Cyber
                setLeadRows(prev => prev.map(r => {
                    if (createdMap.has(r.phone)) {
                        return {
                            ...r,
                            isImported: true,
                            cyberId: createdMap.get(r.phone),
                            isSelected: false
                        };
                    }
                    return r;
                }));

                setLastImportStats({
                    count: res.data.createdCount,
                    time: new Date().toLocaleTimeString('vi-VN'),
                    user: selectedUserInfo?.fullName || selectedUser
                });

                // Tự động chuyển tab sang xem ngay toàn bộ khách hàng vừa import vào Cyber
                setFilterTab('imported');

                showToast?.(
                    'Import thành công!',
                    `Đã import thành công ${res.data.createdCount} khách hàng vào hệ thống!`,
                    'success',
                    5000
                );
                loadOrders();
            } else {
                showToast?.(
                    'Import thất bại',
                    res.error || res.message || 'Hệ thống phản hồi lỗi.',
                    'error',
                    6000
                );
            }
        } catch (err: any) {
            showToast?.('Lỗi hệ thống', `Không thể hoàn tất import KHTN: ${err.message}`, 'error', 5000);
        } finally {
            setIsImporting(false);
        }
    };

    // Export Import Result Report to Excel
    const handleExportResultExcel = () => {
        const importedItems = importResult 
            ? importResult.created 
            : leadRows.filter(r => r.isImported).map(r => ({ idKh: r.cyberId || '', tenKh: r.fullName, phone: r.phone }));

        if (!importedItems || importedItems.length === 0) {
            showToast?.('Chưa có dữ liệu', 'Chưa có khách hàng nào được import thành công để xuất!', 'info');
            return;
        }

        const exportData = importedItems.map((item, idx) => ({
            'STT': idx + 1,
            'Mã Khách Hàng': item.idKh,
            'Họ và tên': item.tenKh,
            'Số điện thoại': item.phone,
            'TVBH Phụ trách': selectedUserInfo ? `${selectedUserInfo.fullName} (${selectedUserInfo.userName})` : selectedUser,
            'Thời gian import': new Date().toLocaleString('vi-VN')
        }));

        const ws = xlsx.utils.json_to_sheet(exportData);
        ws['!cols'] = [{ wch: 8 }, { wch: 24 }, { wch: 26 }, { wch: 16 }, { wch: 32 }, { wch: 22 }];
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, 'KetQuaImportKHTN');
        xlsx.writeFile(wb, `Ket_Qua_Import_KHTN_${selectedUser}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    // Tự động kiểm tra ting-ting SePay khi mở Modal Thanh Toán
    useEffect(() => {
        if (!showPaymentModal || !selectedUser) return;

        let isCancelled = false;
        const cleanUser = selectedUser.replace(/^02\./i, '').toUpperCase();
        const price = calculateLeadPrice(counts.selected);

        // Tạo bản ghi đơn hàng pending trong database
        supabase
            .from('crm_lead_orders')
            .insert({
                ten_tvbh: cleanUser,
                lead_count: counts.selected,
                amount: price,
                status: 'pending'
            })
            .then();

        // Xử lý khi nhận diện được biến động số dư SePay thành công
        const handlePaidFound = async (orderId?: string) => {
            if (isPaidHandledRef.current) return;
            isPaidHandledRef.current = true;

            showToast?.('Xác thực thành công!', 'Hệ thống đã xác nhận. Đang tự động import KHTN...', 'success', 3500);

            if (orderId) {
                supabase
                    .from('crm_lead_orders')
                    .update({ status: 'completed' })
                    .eq('id', orderId)
                    .then();
            }

            // Đóng Modal thanh toán NGAY LẬP TỨC và import trực tiếp vào CyberSoft CRM
            setShowPaymentModal(false);
            setSePayPaidSuccess(false);
            executeImportLeads();
        };

        // Lắng nghe Realtime qua Supabase WebSocket
        const channel = supabase
            .channel(`crm_lead_orders_${cleanUser}_${Date.now()}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'crm_lead_orders'
                },
                (payload) => {
                    const rec = (payload.new || {}) as any;
                    if (rec && rec.status === 'paid' && rec.ten_tvbh && rec.ten_tvbh.toUpperCase().includes(cleanUser)) {
                        handlePaidFound(rec.id);
                    }
                }
            )
            .subscribe();

        // Polling dự phòng mỗi 3 giây
        const pollInterval = setInterval(async () => {
            if (isCancelled || isPaidHandledRef.current) return;
            try {
                const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
                const { data: paidOrders } = await supabase
                    .from('crm_lead_orders')
                    .select('*')
                    .eq('status', 'paid')
                    .ilike('ten_tvbh', `%${cleanUser}%`)
                    .gte('created_at', tenMinutesAgo)
                    .order('created_at', { ascending: false })
                    .limit(1);

                if (paidOrders && paidOrders.length > 0) {
                    handlePaidFound(paidOrders[0].id);
                }
            } catch (err) {
                console.error('SePay poll error:', err);
            }
        }, 2000);

        return () => {
            isCancelled = true;
            supabase.removeChannel(channel);
            clearInterval(pollInterval);
        };
    }, [showPaymentModal, selectedUser]);

    return (
        <div className={mobileMode
            ? 'flex h-full min-h-0 flex-col overflow-hidden bg-[#f2f2f7] font-sans select-text'
            : 'crm-workspace'}>
            {mobileMode ? (
                <>
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".xlsx,.xls,.csv" className="hidden" />

                    <div className="flex-shrink-0 space-y-2 border-b border-slate-200/80 bg-white/90 px-3 pb-3 pt-2 backdrop-blur-xl">
                        <div className="flex items-center justify-between rounded-2xl border border-white bg-gradient-to-br from-teal-50 to-white px-3.5 py-3 shadow-[0_8px_24px_-20px_rgba(15,118,110,0.45)]">
                            <div className="min-w-0">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-teal-600">Khách hàng tiềm năng</p>
                                <p className="mt-1 truncate text-sm font-semibold text-slate-900">{selectedUserInfo?.fullName || currentUserName || currentUser}</p>
                            </div>
                            <div className="flex items-center gap-3 text-center">
                                <div><p className="text-base font-bold text-slate-900">{counts.total}</p><p className="text-[9px] text-slate-400">Tổng</p></div>
                                <div className="h-7 w-px bg-slate-200" />
                                <div><p className="text-base font-bold text-teal-600">{counts.selected}</p><p className="text-[9px] text-slate-400">Đã chọn</p></div>
                                <button type="button" onClick={() => setIsMobileToolsOpen(true)} className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm ring-1 ring-slate-200" title="Công cụ">
                                    <i className="fas fa-ellipsis text-[11px]" />
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-slate-900 text-[10.5px] font-semibold text-white active:scale-[0.98]">
                                <i className="fas fa-file-arrow-up" /> Tải file
                            </button>
                            <button type="button" onClick={() => setShowPasteModal(true)} className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white text-[10.5px] font-semibold text-slate-700 active:scale-[0.98]">
                                <i className="fas fa-paste text-blue-500" /> Dán nhanh
                            </button>
                            <button type="button" onClick={handleDownloadTemplate} className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white text-[10.5px] font-semibold text-slate-700 active:scale-[0.98]">
                                <i className="fas fa-download text-emerald-500" /> File mẫu
                            </button>
                        </div>

                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2.5">
                        {cyberFilteredRows.length === 0 ? (
                            <div className="flex h-full flex-col items-center justify-center px-8 text-center">
                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-xl text-slate-300 shadow-sm ring-1 ring-slate-200/70"><i className="fas fa-user-plus" /></div>
                                <p className="mt-4 text-sm font-semibold text-slate-700">Chưa có khách hàng</p>
                                <p className="mt-1 text-[11px] leading-relaxed text-slate-400">Tải file Excel hoặc dán nhanh danh sách để bắt đầu.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {cyberFilteredRows.map(row => {
                                    const model = metadata?.models.find(item => item.maKx === row.model)?.tenKx || row.model || 'Chưa chọn xe';
                                    const hasIssue = !row.isValidPhone || !!row.duplicateInfo;
                                    return (
                                        <article key={row.id} onClick={() => setMobileEditingLeadId(row.id)} className="cursor-pointer rounded-2xl border border-slate-200/80 bg-white px-3 py-2.5 shadow-[0_5px_18px_-16px_rgba(15,23,42,0.5)] active:bg-slate-50">
                                            <div className="flex items-center gap-3">
                                                <button type="button" disabled={row.isImported || !row.isValidPhone} onClick={event => { event.stopPropagation(); handleRowChange(row.id, 'isSelected', !row.isSelected); }} className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[9px] ${row.isSelected ? 'border-teal-500 bg-teal-500 text-white' : 'border-slate-300 bg-white text-transparent'} disabled:opacity-40`}><i className="fas fa-check" /></button>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2"><p className="truncate text-[12px] font-semibold text-slate-900">{row.fullName || 'Chưa có tên'}</p><span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold ${row.isImported ? 'bg-blue-50 text-blue-600' : hasIssue ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>{row.isImported ? 'Đã nhập' : hasIssue ? 'Cần kiểm tra' : 'Hợp lệ'}</span></div>
                                                    <p className="mt-1 truncate text-[10.5px] text-slate-500"><span className="font-mono text-slate-700">{row.phone || 'Chưa có SĐT'}</span><span className="px-1.5 text-slate-300">•</span>{model}</p>
                                                </div>
                                                {!row.isImported && <button type="button" onClick={event => { event.stopPropagation(); handleDeleteRow(row.id); }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-300 active:bg-rose-50 active:text-rose-500"><i className="fas fa-trash-can text-[11px]" /></button>}
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="flex-shrink-0 space-y-1.5 border-t border-black/[0.08] bg-white/95 px-3 pb-[calc(0.6rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur-2xl shadow-[0_-6px_20px_rgba(0,0,0,0.06)]">
                        <div className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 [scrollbar-width:none]">
                            {([
                                ['all', `Tất cả ${counts.total}`],
                                ['valid', `Hợp lệ ${counts.valid}`],
                                ['duplicate', `Trùng ${counts.duplicate}`],
                                ['invalid', `Lỗi ${counts.invalid}`],
                                ['imported', `Đã nhập ${counts.imported}`],
                            ] as const).map(([id, label]) => (
                                <button key={id} type="button" onClick={() => setFilterTab(id)} className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold ${filterTab === id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}>
                                    {label}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center space-x-2">
                            <label className="relative flex-1">
                                <i className="fas fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400" />
                                <input value={cyberSearchContact} onChange={event => setCyberSearchContact(event.target.value)} placeholder="Tìm tên hoặc số điện thoại" className="w-full h-[34px] pl-[30px] pr-[28px] rounded-xl bg-slate-100/90 focus:bg-white text-[11.5px] text-slate-800 placeholder-slate-400 border border-slate-200/80 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-200 shadow-2xs" />
                                {cyberSearchContact && <button type="button" onClick={() => setCyberSearchContact('')} className="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-400 active:scale-90"><i className="fas fa-times text-[10px]" /></button>}
                            </label>
                            <input type="month" value={selectedMonth} onChange={event => { setSelectedMonth(event.target.value); if (leadRows.length > 0) handleApplyMonthToAll(event.target.value); }} className="h-[34px] w-[116px] rounded-xl border border-slate-200/80 bg-slate-100/90 px-2 text-[10px] font-medium text-slate-600 outline-none focus:bg-white" />
                        </div>
                        <button type="button" ref={paymentTriggerRef} aria-haspopup="dialog" aria-expanded={showPaymentModal} aria-controls={showPaymentModal ? "crm-payment-sheet" : undefined} onClick={handleImport} disabled={counts.selected === 0 || isImporting || !selectedUser} className="flex h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-slate-900 text-xs font-semibold text-white shadow-sm disabled:bg-slate-200 disabled:text-slate-400">
                            <i className={`fas ${isImporting ? 'fa-spinner fa-spin' : 'fa-qrcode'}`} />
                            {isImporting ? 'Đang xử lý...' : counts.selected > 0 ? `Quét QR & Nhập ${counts.selected} khách` : 'Chọn khách hàng để nhập'}
                        </button>
                    </div>
                </>
            ) : (
            <>
            <aside className="crm-sidebar" aria-label="Chức năng nhập khách hàng tiềm năng">
                <div className="crm-sidebar-heading"><h1>Khách hàng <span>{counts.total}</span></h1></div>
                <div className="crm-sidebar-search">
                    <label><i className="fas fa-search" aria-hidden="true" /><input aria-label="Tìm khách hàng" placeholder="Tìm tên, số điện thoại, địa chỉ…" value={cyberSearchContact} onChange={event => { setCyberSearchContact(event.target.value); setCyberSelectedRowIdx(0); }} />{cyberSearchContact && <button type="button" aria-label="Xóa tìm kiếm" onClick={() => setCyberSearchContact('')}><i className="fas fa-times" /></button>}</label>
                </div>
                <div className="crm-sidebar-scroll">
                    <section className="crm-facet-group crm-function-list"><h2>Nhập danh sách</h2>
                        <button type="button" onClick={() => fileInputRef.current?.click()}><i className="fas fa-file-arrow-up" />Tải file Excel</button>
                        <button type="button" title="Dán nhanh danh sách khách hàng từ Zalo hoặc Ghi chú" onClick={() => setShowPasteModal(true)}><i className="fas fa-paste" />Dán từ Zalo / ghi chú</button>
                        <button type="button" onClick={handleDownloadTemplate}><i className="fas fa-file-excel" />Tải mẫu Excel</button>
                    </section>
                    <section className="crm-facet-group crm-function-list"><h2>Xử lý danh sách</h2>
                        <button type="button" disabled={!counts.selected || isImporting} onClick={handleRandomizeAllRows}><i className="fas fa-shuffle" />Xáo dòng xe đã chọn</button>
                        <button type="button" disabled={!counts.selected || isImporting || !metadata?.sources.length} onClick={() => {
                            setLeadRows(prev => shuffleCrmSources(prev, metadata?.sources || []));
                            showToast?.('Đã xáo nguồn tiếp cận', 'Đã phân bổ nguồn ngẫu nhiên cho khách đang chọn, chưa nhập.', 'success');
                        }}><i className="fas fa-shuffle" />Xáo nguồn tiếp cận</button>
                        <button type="button" title="Kiểm tra trùng số điện thoại" disabled={!counts.total || isCheckingDuplicates} onClick={() => runDuplicateCheck()}><i className={isCheckingDuplicates ? 'fas fa-spinner fa-spin' : 'fas fa-shield-check'} />Kiểm tra dữ liệu</button>
                        <button type="button" title="Sửa thông tin trùng hoặc lỗi trong danh sách" disabled={(!counts.duplicate && !counts.invalid) || isImporting} onClick={handleAutoFixDuplicates}><i className="fas fa-wand-magic-sparkles" />Sửa trùng / lỗi</button>
                    </section>
                    <section className="crm-facet-group crm-auto-shuffle"><h2>Tự động phân bổ</h2><label><input type="checkbox" checked={autoShuffleModels} onChange={event => setAutoShuffleModels(event.target.checked)} /><span>Tự xáo dòng xe khi nạp</span></label><p>Phân bổ đều giữa các dòng xe trong danh mục. Chỉ áp dụng cho khách mới tải hoặc dán; giữ màu xe và thông tin liên hệ. Nguồn tiếp cận được phân bổ ngẫu nhiên khi nạp.</p></section>
                    <section className="crm-facet-group crm-batch-settings"><h2>Đợt tiếp cận</h2><label htmlFor="crm-batch-month">Tháng nhập khách hàng</label><input id="crm-batch-month" type="month" value={selectedMonth} onChange={event => { setSelectedMonth(event.target.value); if (leadRows.length && event.target.value) handleApplyMonthToAll(event.target.value); }} /><p>Chọn TVBH nhận danh sách ở phía trên, sau đó tải file hoặc dán thông tin khách hàng.</p></section>
                </div>
                <div className="crm-sidebar-footer"><span>Đang chọn</span><strong>{counts.selected} khách hàng</strong></div>
            </aside>
            <main className="crm-main" aria-label="Quản lý khách hàng tiềm năng">
            {/* Success Banner if present */}
            {lastImportStats && (
                <div className="crm-import-success">
                    <div className="flex items-center gap-2">
                        <i className="fas fa-circle-check text-emerald-200"></i>
                        <span>
                            Đã import thành công <strong>{lastImportStats.count}</strong> khách hàng cho TVBH: <strong>{lastImportStats.user}</strong> ({lastImportStats.time})
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleExportResultExcel}
                            className="px-2 py-0.5 bg-white hover:bg-emerald-50 text-emerald-800 text-[11px] font-bold rounded shadow-2xs flex items-center gap-1 cursor-pointer"
                        >
                            <i className="fas fa-file-excel text-emerald-600"></i> Tải Excel
                        </button>
                        <button
                            type="button"
                            onClick={() => setLastImportStats(null)}
                            className="text-white hover:text-emerald-200 p-0.5 cursor-pointer"
                        >
                            <i className="fas fa-times text-xs"></i>
                        </button>
                    </div>
                </div>
            )}

            {/* Top Compact Control Bar (Consolidates Header, TVBH, and Data Import Actions) */}
            <div className="crm-control-bar">
                {/* Hidden File Input for Excel Upload */}
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                />

                {/* Line 1: Title + TVBH + Admin Switch + Quick Actions */}
                <div className="crm-header-line">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="w-6 h-6 rounded bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white text-xs shadow-xs">
                            <i className="fas fa-file-excel"></i>
                        </span>
                        <h1 className="text-xs sm:text-sm font-black text-slate-800 tracking-tight flex items-center gap-1.5">
                            Khách hàng tiềm năng

                        </h1>
                        <span className="text-[11px] text-slate-500 hidden md:inline">
                            🏢 Ô tô VinFast Thuận An (<code className="font-mono text-[10px] text-slate-600">02.01.08</code>)
                        </span>
                        {metaError && (
                            <span className="text-[11px] text-rose-600 font-semibold bg-rose-50 px-2 py-0.5 rounded border border-rose-200 flex items-center gap-1">
                                <i className="fas fa-triangle-exclamation text-[10px]"></i>
                                <span>{metaError}</span>
                            </span>
                        )}
                    </div>

                    {/* TVBH badge & Action controls */}
                    <div className="crm-account-controls">
                        <div 
                            className="crm-account-pill flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100/60 focus-within:bg-white focus-within:border-slate-300 border border-slate-200/90 rounded-md px-2 h-[30px] text-[11px] shadow-2xs transition-all"
                            title="Bấm để chọn hoặc nhập trực tiếp mã TVBH Cyber"
                        >
                            <span className="text-slate-500 text-[10.5px] font-medium shrink-0 flex items-center gap-1">
                                <i className="fas fa-user-tie text-slate-400 text-[10px]"></i>
                                TVBH:
                            </span>

                            {/* Họ tên TVBH (Bấm để chọn từ danh mục Cyber) */}
                            <button
                                type="button"
                                onClick={() => setIsManualUserSelection(prev => !prev)}
                                className="font-semibold text-slate-800 hover:text-blue-600 max-w-[120px] sm:max-w-[150px] truncate text-left cursor-pointer flex items-center gap-1 text-[11px]"
                                title="Bấm để mở danh sách chọn TVBH từ Cyber"
                            >
                                <span className="truncate">{selectedUserInfo?.fullName || currentUser || currentUserName || 'Tư vấn bán hàng'}</span>
                                <i className={`fas fa-chevron-down text-[8px] text-slate-400 transition-transform ${isManualUserSelection ? 'rotate-180' : ''}`}></i>
                            </button>

                            {/* Ô nhập trực tiếp Mã TVBH Cyber */}
                            <div className="crm-account-code-box flex items-center bg-white border border-slate-200 focus-within:border-blue-500 rounded px-1.5 h-[22px] transition-all">
                                <span className="text-[9.5px] text-slate-400 font-mono select-none mr-1 font-semibold">Mã:</span>
                                <input
                                    type="text"
                                    value={selectedUser}
                                    onChange={e => handleDirectUserCodeChange(e.target.value)}
                                    placeholder="02.xxxx"
                                    className="w-20 sm:w-24 font-mono text-[10.5px] font-semibold text-slate-800 uppercase bg-transparent outline-none tracking-tight placeholder:text-slate-400 placeholder:font-normal placeholder:normal-case"
                                    title="Nhập chính xác mã TVBH Cyber (Ví dụ: 02.TUONGTB)"
                                />
                                {selectedUserInfo ? (
                                    <i className="fas fa-circle-check text-emerald-600 text-[10.5px] ml-1" title={`Khớp danh mục Cyber: ${selectedUserInfo.fullName} (${selectedUserInfo.userName})`}></i>
                                ) : selectedUser ? (
                                    <i className="fas fa-pen text-amber-500 text-[10px] ml-1" title="Mã TVBH Cyber tự nhập"></i>
                                ) : null}
                            </div>
                        </div>

                        {isAdmin && (
                            <>
                                {onToggleCrmGlobal && (
                                    <button
                                        type="button"
                                        onClick={onToggleCrmGlobal}
                                        disabled={isTogglingCrm}
                                        className={`crm-account-btn h-[30px] px-2.5 text-[11px] font-medium rounded-md transition-all cursor-pointer inline-flex items-center gap-1.5 border ${
                                            isCrmEnabled 
                                                ? 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs' 
                                                : 'border-amber-200 bg-amber-50/70 hover:bg-amber-100/70 text-amber-800'
                                        } ${isTogglingCrm ? 'opacity-50 cursor-wait' : ''}`}
                                        title={isCrmEnabled ? 'Bấm để tắt cổng tiếp nhận KHTN đối với toàn bộ TVBH' : 'Bấm để mở lại cổng tiếp nhận KHTN cho toàn bộ TVBH'}
                                    >
                                        <i className={`fas ${isTogglingCrm ? 'fa-spinner fa-spin text-slate-400' : (isCrmEnabled ? 'fa-circle-check text-emerald-600' : 'fa-circle-xmark text-amber-600')} text-[11px]`}></i>
                                        <span>KHTN: <strong className={isCrmEnabled ? 'text-emerald-700 font-semibold' : 'text-amber-800 font-semibold'}>{isCrmEnabled ? 'Đang Mở' : 'Đang Tắt'}</strong></span>
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={() => setShowAdminTvbhModal(true)}
                                    className="crm-account-btn h-[30px] px-2.5 text-[11px] font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-md transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                                    title="Danh sách TVBH đã sử dụng dịch vụ nạp KHTN (Chỉ Admin)"
                                >
                                    <i className="fas fa-users text-slate-400 text-[10.5px]"></i>
                                    <span>DS TVBH Đã Dùng</span>
                                    {overallStats.totalTvbhUsed > 0 && (
                                        <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[9.5px] px-1.5 py-0.5 rounded-full font-semibold">
                                            {overallStats.totalTvbhUsed}
                                        </span>
                                    )}
                                </button>

                            </>
                        )}

                        <button
                            onClick={() => {
                                setIsLoadingMeta(true);
                                fetchCrmMetadata(true).then(res => {
                                    setIsLoadingMeta(false);
                                    if (res.success && res.data) {
                                        setMetadata(res.data);
                                        showToast?.('Đã làm mới', 'Đã tải lại danh mục TVBH và xe.', 'success');
                                    }
                                });
                            }}
                            className="crm-account-icon-btn h-[30px] w-[30px] inline-flex items-center justify-center text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 rounded-md border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                            title="Làm mới danh mục"
                        >
                            <i className={`fas fa-rotate-right text-[10.5px] ${isLoadingMeta ? 'animate-spin text-blue-600' : ''}`}></i>
                        </button>
                    </div>
                </div>

                <div className="crm-import-progress" aria-label="Tiến trình nhập khách hàng">
                    <span data-complete={!!selectedUser}><b>1</b>TVBH tải lên danh sách</span>
                    <span data-complete={counts.total > 0}><b>2</b>{counts.total ? counts.total + ' khách đã tải' : 'Tải danh sách'}</span>
                    <span data-complete={counts.valid > 0 && !counts.duplicate && !counts.invalid}><b>3</b>{counts.duplicate || counts.invalid ? (counts.duplicate + counts.invalid) + ' khách cần rà soát' : 'Kiểm tra & chọn khách'}</span>
                    <span data-complete={counts.imported > 0}><b>4</b>Nhập khách hàng</span>
                </div>

                {/* Floating TVBH Switcher Overlay (Mở cho tất cả TVBH & Admin) */}
                {isManualUserSelection && (
                    <div className="absolute top-11 right-2 z-50 w-88 max-w-[95vw] bg-white border-2 border-blue-400 rounded-xl p-3 shadow-2xl space-y-2.5 animate-fade-in" ref={userDropdownRef}>
                        <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                            <div className="flex items-center gap-1.5">
                                <i className="fas fa-id-badge text-blue-600 text-xs"></i>
                                <span className="text-xs font-bold text-slate-800">Chọn hoặc nhập mã TVBH Cyber:</span>
                            </div>
                            <button onClick={() => setIsManualUserSelection(false)} className="text-slate-400 hover:text-slate-600 text-xs p-1 cursor-pointer">✕</button>
                        </div>

                        {/* Ô nhập nhanh mã TVBH */}
                        <div className="p-2 bg-blue-50/80 border border-blue-200 rounded-lg space-y-1">
                            <span className="text-[10px] font-bold text-blue-900 block">Nhập mã TVBH Cyber trực tiếp:</span>
                            <div className="flex items-center gap-1.5">
                                <input
                                    type="text"
                                    placeholder="VD: 02.TUONGTB"
                                    value={selectedUser}
                                    onChange={e => handleDirectUserCodeChange(e.target.value)}
                                    className="flex-1 px-2.5 py-1 text-xs font-mono font-bold uppercase bg-white border border-blue-300 rounded outline-none focus:border-blue-600 text-blue-900 shadow-inner"
                                />
                                <button
                                    type="button"
                                    onClick={() => handleSelectUser(selectedUser)}
                                    className="px-3 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded cursor-pointer shrink-0 transition-colors"
                                >
                                    Lưu mã
                                </button>
                            </div>
                            {selectedUserInfo && (
                                <p className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
                                    <i className="fas fa-circle-check text-[9px]"></i>
                                    Đang gán cho: <strong>{selectedUserInfo.fullName}</strong>
                                </p>
                            )}
                        </div>

                        {/* Tìm kiếm danh mục Cyber */}
                        <div>
                            <span className="text-[10px] font-semibold text-slate-500 block mb-1">
                                Hoặc chọn từ danh mục Cyber ({metadata?.users?.length || 0} TVBH):
                            </span>
                            <div className="relative">
                                <i className="fas fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                                <input
                                    type="text"
                                    placeholder="Tìm theo tên hoặc mã TVBH..."
                                    value={userSearchQuery}
                                    onChange={e => setUserSearchQuery(e.target.value)}
                                    className="w-full pl-8 pr-2 py-1 text-xs border border-slate-300 rounded outline-none focus:border-blue-500"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded">
                            {filteredUsers.length === 0 ? (
                                <div className="p-3 text-center text-xs text-slate-400">Không tìm thấy TVBH phù hợp</div>
                            ) : (
                                filteredUsers.map(u => (
                                    <button
                                        key={u.userName}
                                        type="button"
                                        onClick={() => handleSelectUser(u.userName)}
                                        className={`w-full px-2.5 py-1.5 text-left text-xs flex items-center justify-between hover:bg-blue-50 cursor-pointer ${selectedUser === u.userName ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-700'}`}
                                    >
                                        <span>{u.fullName} <span className="text-[10px] text-slate-500 font-mono font-semibold">({u.userName})</span></span>
                                        {selectedUser === u.userName && <i className="fas fa-check text-emerald-600 text-xs"></i>}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Desktop customer list */}
            <div className="crm-data-panel">
                <div className="crm-list-heading"><div><h2>Danh sách khách hàng</h2><span>{cyberFilteredRows.length} khách hàng hiển thị</span></div><span className="crm-list-month">{selectedMonth.split('-').reverse().join('/')}</span></div>
                <div className="crm-review-tabs" aria-label="Trạng thái danh sách">{([
                    ['all','Tất cả',counts.total],['valid','Hợp lệ',counts.valid],['duplicate','Trùng',counts.duplicate],['invalid','Lỗi SĐT',counts.invalid],['imported','Đã nhập',counts.imported],
                ] as const).map(([id,label,count]) => <button type="button" key={id} aria-pressed={filterTab === id} onClick={() => {setFilterTab(id);setCyberSelectedRowIdx(0);}}>{label}<small>{count}</small></button>)}</div>


                <div className="crm-list-toolbar">
                    <span className="crm-review-hint">{counts.duplicate || counts.invalid ? 'Rà soát thông tin trùng và số điện thoại lỗi trước khi nhập.' : 'Chọn những khách hàng cần nhập vào hệ thống.'}</span>
                    <div className="crm-row-actions">
                        <button type="button" title="Sửa khách hàng đang chọn" disabled={!cyberFilteredRows[cyberSelectedRowIdx] || !!cyberFilteredRows[cyberSelectedRowIdx]?.isImported} onClick={() => { const row = cyberFilteredRows[cyberSelectedRowIdx]; if (row) { const phone = prompt('Nhập số điện thoại mới:', row.phone); if (phone) handleRowChange(row.id, 'phone', phone); } }}><i className="fas fa-pencil" /> Sửa SĐT</button>
                        <button type="button" title="Xóa dòng đang chọn" disabled={!cyberFilteredRows[cyberSelectedRowIdx]} onClick={() => { const row = cyberFilteredRows[cyberSelectedRowIdx]; if (row) handleDeleteRow(row.id); }}><i className="fas fa-trash-can" /> Xóa dòng</button>
                        <button type="button" title="Xóa toàn bộ danh sách" onClick={handleClearAll} disabled={!counts.total || isImporting}><i className="fas fa-trash" /> Xóa toàn bộ</button>
                    </div>
                </div>

                {/* Customer data */}
                <div className="crm-table-scroll">
                    {cyberFilteredRows.length === 0 ? (
                        <div className="crm-empty-state">
                            <div className="crm-empty-icon">
                                <i className="fas fa-file-arrow-up"></i>
                            </div>
                            <p className="crm-empty-title">{leadRows.length ? "Không tìm thấy khách hàng phù hợp" : "Bắt đầu danh sách khách hàng"}</p>
                            <p className="text-[11px] text-slate-500 mt-1 max-w-sm">
                                Bấm <strong>"Tải File Excel"</strong> để tải lên danh sách khách hàng của TVBH, hoặc <strong>"Dán Nhanh"</strong> để dán từ Zalo/Ghi chú.
                            </p>
                            <div className="mt-3 flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded shadow-xs cursor-pointer flex items-center gap-1.5"
                                >
                                    <i className="fas fa-file-arrow-up"></i>
                                    <span>Tải File Excel</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowPasteModal(true)}
                                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded shadow-xs cursor-pointer flex items-center gap-1.5"
                                >
                                    <i className="fas fa-paste"></i>
                                    <span>Dán Nhanh</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <table className="crm-lead-table">
                            <thead><tr>
                                <th><input type="checkbox" aria-label="Chọn tất cả khách hàng hợp lệ" disabled={!counts.valid} checked={counts.valid > 0 && leadRows.filter(r => r.isValidPhone && !r.duplicateInfo && !r.isImported).every(r => r.isSelected)} onChange={event => { const checked = event.target.checked; setLeadRows(prev => prev.map(r => ({ ...r, isSelected: checked && r.isValidPhone && !r.duplicateInfo && !r.isImported }))); }} /></th>
                                <th>Khách hàng</th><th>Điện thoại</th><th>Dòng xe / màu</th><th>Ngày tiếp cận</th><th>Nguồn tiếp cận</th><th>Kiểm tra dữ liệu</th><th>Mã khách hàng</th>
                            </tr></thead>
                            <tbody>{cyberFilteredRows.map((row, idx) => {
                                const model = metadata?.models.find(m => m.maKx === row.model)?.tenKx || row.model;
                                const color = metadata?.colors?.find(c => c.maMau === row.color)?.tenMau || row.color;
                                const source = metadata?.sources.find(s => s.maPtlh === row.source)?.tenPtlh || row.source;
                                const state = row.isImported ? 'imported' : !row.isValidPhone ? 'invalid' : row.duplicateInfo ? 'duplicate' : 'valid';
                                const label = state === 'imported' ? 'Đã nhập' : state === 'invalid' ? 'SĐT không hợp lệ' : state === 'duplicate' ? 'Trùng thông tin' : 'Hợp lệ';
                                return <tr key={row.id} aria-selected={idx === cyberSelectedRowIdx} onClick={() => setCyberSelectedRowIdx(idx)}>
                                    <td><input type="checkbox" aria-label={'Chọn khách hàng ' + row.fullName} checked={!!row.isSelected && !row.isImported} disabled={row.isImported || !row.isValidPhone} onClick={event => event.stopPropagation()} onChange={event => handleRowChange(row.id, 'isSelected', event.target.checked)} /></td>
                                    <td><strong>{row.fullName || 'Chưa có tên'}</strong><small title={row.address}>{row.address || 'Chưa có địa chỉ'}</small>{row.note && <small title={row.note}>{row.note}</small>}</td>
                                    <td className="crm-mono">{row.phone || 'Chưa có SĐT'}{row.phone2 && row.phone2 !== row.phone && <small>{row.phone2}</small>}</td>
                                    <td>{model || 'Chưa chọn xe'}<small>{color || 'Chưa chọn màu'}</small></td>
                                    <td className="crm-mono">{row.createdDate ? row.createdDate.split('-').reverse().join('/') : '—'}<small>{row.createdTime}</small></td>
                                    <td>{source || 'Chưa chọn nguồn'}</td>
                                    <td><span className="crm-validation-status" data-state={state}>{label}</span>{row.duplicateInfo && !row.isImported && <small title={row.duplicateInfo.tenKh + " · " + row.duplicateInfo.userName}>{row.duplicateInfo.tenKh} · {row.duplicateInfo.idKh}</small>}</td>
                                    <td className="crm-mono">{row.cyberId || 'Chưa nhập'}</td>
                                </tr>;
                            })}</tbody>
                        </table>
                    )}
                </div>

                {/* Final batch import action */}
                <div className="crm-execution-bar">
                    <div className="flex items-center gap-3 text-[11px] text-slate-700 flex-wrap">
                        <span className="font-bold">Tổng số: <strong>{counts.total}</strong> khách hàng</span>
                        <span>•</span>
                        <span className="text-blue-700 font-bold">Đang chọn: <strong>{counts.selected}</strong> khách</span>
                        {counts.imported > 0 && (
                            <>
                                <span>•</span>
                                <span className="text-emerald-700 font-extrabold bg-emerald-100 px-2 py-0.2 rounded border border-emerald-300">
                                    🟢 Đã import thành công: {counts.imported} khách
                                </span>
                            </>
                        )}
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <span className="crm-submit-hint">{!selectedUser ? "Chọn TVBH nhận danh sách" : isCheckingDuplicates ? "Đang kiểm tra dữ liệu…" : !counts.selected ? "Chọn khách hàng để nhập" : ""}</span>
                        {counts.imported > 0 && (
                            <button
                                type="button"
                                onClick={handleExportResultExcel}
                                className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded text-xs font-bold shadow-xs flex items-center gap-1 cursor-pointer"
                            >
                                <i className="fas fa-file-excel text-emerald-600"></i>
                                <span>Xuất Excel</span>
                            </button>
                        )}
                        <button
                            type="button"
                            ref={paymentTriggerRef} aria-haspopup="dialog" aria-expanded={showPaymentModal} aria-controls={showPaymentModal ? "crm-payment-sheet" : undefined} onClick={handleImport}
                            disabled={counts.selected === 0 || isImporting || isCheckingDuplicates || !selectedUser}
                            className="px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white font-bold rounded text-xs shadow-md shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                            <i className={`fas ${isImporting ? 'fa-spinner fa-spin' : 'fa-qrcode'}`}></i>
                            <span>
                                {isImporting
                                    ? 'Đang import...'
                                    : `Quét QR & Nhập ${counts.selected} khách`}
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            </main>
            </>
            )}

            {mobileMode && isMobileToolsOpen && (
                <div className="fixed inset-0 z-[1240] flex items-end justify-center bg-slate-950/35 backdrop-blur-xs" onClick={() => setIsMobileToolsOpen(false)}>
                    <div className="w-full max-w-md rounded-t-[26px] bg-[#f8f8fa] px-4 pb-[max(18px,env(safe-area-inset-bottom))] pt-2 shadow-2xl" onClick={event => event.stopPropagation()}>
                        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300" />
                        <div className="mb-3 flex items-center justify-between">
                            <div><h3 className="text-[15px] font-semibold text-slate-900">Công cụ khách hàng</h3><p className="text-[10px] text-slate-400">Đầy đủ thao tác quản lý dữ liệu</p></div>
                            <button type="button" onClick={() => setIsMobileToolsOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200/70 text-slate-500"><i className="fas fa-times text-[11px]" /></button>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                            {[
                                { label: counts.selected === counts.valid ? 'Bỏ chọn' : 'Chọn hết', icon: 'fa-check-double', color: 'text-blue-600', action: () => handleToggleSelectAll(counts.selected !== counts.valid) },
                                { label: 'Kiểm tra', icon: isCheckingDuplicates ? 'fa-spinner fa-spin' : 'fa-rotate', color: 'text-cyan-600', action: () => runDuplicateCheck() },
                                { label: 'Sửa lỗi', icon: 'fa-wand-magic-sparkles', color: 'text-amber-600', action: handleAutoFixDuplicates },
                                { label: 'Xáo xe', icon: 'fa-shuffle', color: 'text-violet-600', action: handleRandomizeAllRows },
                                { label: 'Xuất Excel', icon: 'fa-file-excel', color: 'text-emerald-600', action: handleExportResultExcel },
                                { label: 'Làm mới', icon: 'fa-arrows-rotate', color: 'text-slate-600', action: () => { setIsLoadingMeta(true); fetchCrmMetadata(true).then(result => { setIsLoadingMeta(false); if (result.success && result.data) setMetadata(result.data); }); } },
                                { label: 'Xóa hết', icon: 'fa-trash-can', color: 'text-rose-600', action: handleClearAll },
                                { label: 'Đổi TVBH', icon: 'fa-user-gear', color: 'text-indigo-600', action: () => setIsManualUserSelection(true) },
                                ...(isAdmin ? [{ label: 'Lịch sử', icon: 'fa-clock-rotate-left', color: 'text-slate-600', action: () => setShowAdminTvbhModal(true) }] : []),
                                ...(isAdmin && onToggleCrmGlobal ? [{ label: isCrmEnabled ? 'Tắt KHTN' : 'Mở KHTN', icon: isCrmEnabled ? 'fa-toggle-on' : 'fa-toggle-off', color: isCrmEnabled ? 'text-emerald-600' : 'text-amber-600', action: onToggleCrmGlobal }] : []),
                            ].map(tool => (
                                <button key={tool.label} type="button" onClick={() => { tool.action(); setIsMobileToolsOpen(false); }} className="flex min-h-[68px] flex-col items-center justify-center gap-2 rounded-2xl bg-white px-1 shadow-sm ring-1 ring-slate-200/70 active:scale-95">
                                    <i className={`fas ${tool.icon} text-[15px] ${tool.color}`} />
                                    <span className="text-[9.5px] font-medium text-slate-600">{tool.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {mobileMode && mobileEditingLeadId && (() => {
                const row = leadRows.find(item => item.id === mobileEditingLeadId);
                if (!row) return null;
                const fieldClass = 'h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 outline-none focus:border-blue-400 focus:bg-white';
                return (
                    <div className="fixed inset-0 z-[1230] flex items-end justify-center bg-slate-950/35 backdrop-blur-xs" onClick={() => setMobileEditingLeadId(null)}>
                        <div className="flex max-h-[88dvh] w-full max-w-md flex-col overflow-hidden rounded-t-[26px] bg-white shadow-2xl" onClick={event => event.stopPropagation()}>
                            <div className="flex-shrink-0 px-4 pb-3 pt-2"><div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300" /><div className="flex items-center justify-between"><div><h3 className="text-[15px] font-semibold text-slate-900">Chi tiết khách hàng</h3><p className="text-[10px] text-slate-400">Chỉnh sửa dữ liệu trước khi nhập</p></div><button type="button" onClick={() => setMobileEditingLeadId(null)} className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500"><i className="fas fa-times text-[11px]" /></button></div></div>
                            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto border-y border-slate-100 bg-[#f8f8fa] p-4">
                                <div className="grid grid-cols-1 gap-3"><label className="space-y-1"><span className="text-[10px] font-semibold text-slate-500">Tên khách hàng</span><input value={row.fullName} onChange={event => handleRowChange(row.id, 'fullName', event.target.value)} className={fieldClass} /></label><label className="space-y-1"><span className="text-[10px] font-semibold text-slate-500">Số điện thoại</span><input value={row.phone} onChange={event => handleRowChange(row.id, 'phone', event.target.value)} inputMode="tel" className={fieldClass} /></label></div>
                                <label className="block space-y-1"><span className="text-[10px] font-semibold text-slate-500">Địa chỉ</span><input value={row.address} onChange={event => handleRowChange(row.id, 'address', event.target.value)} className={fieldClass} /></label>
                                <div className="grid grid-cols-2 gap-2"><label className="space-y-1"><span className="text-[10px] font-semibold text-slate-500">Ngày tạo</span><input type="date" value={row.createdDate} onChange={event => handleRowChange(row.id, 'createdDate', event.target.value)} className={fieldClass} /></label><label className="space-y-1"><span className="text-[10px] font-semibold text-slate-500">Giờ tạo</span><input type="time" value={row.createdTime} onChange={event => handleRowChange(row.id, 'createdTime', event.target.value)} className={fieldClass} /></label></div>
                                <label className="block space-y-1"><span className="text-[10px] font-semibold text-slate-500">Dòng xe</span><select value={row.model} onChange={event => handleRowChange(row.id, 'model', event.target.value)} className={fieldClass}><option value="">Chọn dòng xe</option>{metadata?.models.map(item => <option key={item.maKx} value={item.maKx}>{item.tenKx}</option>)}</select></label>
                                <label className="block space-y-1"><span className="text-[10px] font-semibold text-slate-500">Màu xe</span><select value={row.color} onChange={event => handleRowChange(row.id, 'color', event.target.value)} className={fieldClass}><option value="">Chọn màu xe</option>{metadata?.colors?.map(item => <option key={item.maMau} value={item.maMau}>{item.tenMau}</option>)}</select></label>
                                <label className="block space-y-1"><span className="text-[10px] font-semibold text-slate-500">Nguồn tiếp cận</span><select value={row.source} onChange={event => handleRowChange(row.id, 'source', event.target.value)} className={fieldClass}><option value="">Chọn nguồn</option>{metadata?.sources.map(item => <option key={item.maPtlh} value={item.maPtlh}>{item.tenPtlh}</option>)}</select></label>
                                <label className="block space-y-1"><span className="text-[10px] font-semibold text-slate-500">Ghi chú</span><textarea value={row.note} onChange={event => handleRowChange(row.id, 'note', event.target.value)} rows={3} className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs outline-none focus:border-blue-400 focus:bg-white" /></label>
                            </div>
                            <div className="flex flex-shrink-0 gap-2 p-3"><button type="button" onClick={() => { handleDeleteRow(row.id); setMobileEditingLeadId(null); }} className="h-11 flex-1 rounded-[14px] bg-rose-50 text-xs font-semibold text-rose-600">Xóa</button><button type="button" onClick={() => setMobileEditingLeadId(null)} className="h-11 flex-[2] rounded-[14px] bg-slate-900 text-xs font-semibold text-white">Hoàn tất</button></div>
                        </div>
                    </div>
                );
            })()}

            {mobileMode && isManualUserSelection && (
                <div className="fixed inset-0 z-[1245] flex items-end justify-center bg-slate-950/35 backdrop-blur-xs" onClick={() => setIsManualUserSelection(false)}>
                    <div className="flex max-h-[78dvh] w-full max-w-md flex-col overflow-hidden rounded-t-[26px] bg-white shadow-2xl" onClick={event => event.stopPropagation()}>
                        <div className="flex-shrink-0 px-4 pb-3 pt-2">
                            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300" />
                            <div className="flex items-center justify-between"><div><h3 className="text-[15px] font-semibold text-slate-900">Chọn tư vấn bán hàng</h3><p className="text-[10px] text-slate-400">Khách hàng sẽ được nhập cho tài khoản đã chọn</p></div><button type="button" onClick={() => setIsManualUserSelection(false)} className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500"><i className="fas fa-times text-[11px]" /></button></div>
                            <label className="mt-3 flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3"><i className="fas fa-search text-[10px] text-slate-400" /><input value={userSearchQuery} onChange={event => setUserSearchQuery(event.target.value)} placeholder="Tìm tên hoặc tài khoản..." className="min-w-0 flex-1 bg-transparent text-xs outline-none" /></label>
                        </div>
                        <div className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto border-t border-slate-100">
                            {filteredUsers.map(user => (
                                <button key={user.userName} type="button" onClick={() => { handleSelectUser(user.userName); setIsManualUserSelection(false); }} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-slate-50">
                                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${selectedUser === user.userName ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{getInitials(user.fullName || user.userName)}</span>
                                    <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-slate-800">{user.fullName}</span><span className="mt-0.5 block truncate font-mono text-[9.5px] text-slate-400">{user.userName}</span></span>
                                    {selectedUser === user.userName && <i className="fas fa-check text-xs text-indigo-600" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Dán Danh Sách Nhanh Từ Zalo / Note */}
            {showPasteModal && (
                <div className="fixed inset-0 z-[1250] flex items-end justify-center bg-slate-900/55 p-0 backdrop-blur-xs animate-fade-in sm:items-center sm:p-4">
                    <div className="max-h-[88dvh] w-full max-w-xl space-y-4 overflow-y-auto rounded-t-[24px] border border-slate-200 bg-white p-4 shadow-2xl animate-fade-in-up sm:rounded-2xl sm:p-5">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2.5">
                                <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm shadow-2xs">
                                    <i className="fas fa-paste"></i>
                                </span>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800">
                                        Dán Danh Sách Khách Hàng Nhanh
                                    </h3>
                                    <p className="hidden text-[11px] text-slate-500 sm:block">
                                        Hỗ trợ copy trực tiếp từ Zalo, Tin nhắn, hoặc Sổ tay ghi chép của TVBH
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowPasteModal(false)}
                                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                                <span>Dán mỗi khách hàng 1 dòng:</span>
                                <span className="text-[10px] text-slate-400 font-normal">Tự nhận diện SĐT, Tên, Dòng xe, Địa chỉ...</span>
                            </label>
                            <textarea
                                rows={mobileMode ? 6 : 8}
                                value={rawPasteText}
                                onChange={e => setRawPasteText(e.target.value)}
                                placeholder="Ví dụ:&#10;Nguyễn Văn An, 0903123456, VF 5, Trắng, Thuận An&#10;Trần Thị Mai - 0918654321 - VF 3 - Dĩ An&#10;0988112233 - Lê Văn Cường - VF 7 - Thủ Dầu Một"
                                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white resize-y leading-relaxed"
                                autoFocus
                            />
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1">
                            <span className="text-[11px] text-slate-500 hidden sm:inline">
                                💡 Hệ thống tự động bóc tách số điện thoại và tên để nhập vào CRM.
                            </span>
                            <div className="flex items-center gap-2 ml-auto">
                                <button
                                    type="button"
                                    onClick={() => setShowPasteModal(false)}
                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold cursor-pointer"
                                >
                                    Đóng
                                </button>
                                <button
                                    type="button"
                                    onClick={handleExecutePaste}
                                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95 transition-all"
                                >
                                    <i className="fas fa-check"></i>
                                    <span>Xử Lý & Thêm Vào Bảng</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Thanh Toán & Quét Mã VietQR (Dịch Vụ Nhập Liệu Hàng Loạt) */}
            {showPaymentModal && createPortal(
                <div id="crm-payment-sheet" ref={paymentSheetRef} role="dialog" aria-label="Quét QR và nhập khách hàng" tabIndex={-1} className="crm-payment-sheet" style={paymentSheetStyle}>
                        {/* Top Section - Alert & Amount */}
                        <div className="crm-payment-header">
                            
                                <div className="flex items-center gap-3">
                                    <div className="w-[33px] h-[33px] rounded-[10px] bg-[#eaf1fb] text-[#5782ba] flex items-center justify-center shrink-0 shadow-2xs">
                                        <i className="fas fa-hand-holding-heart text-sm"></i>
                                    </div>
                                    <div className="text-left">
                                        <h2 className="text-[14.5px] font-bold text-[#304560] tracking-tight leading-tight">
                                            Hỗ Trợ Công Cụ & Nhập Liệu Hộ
                                        </h2>
                                        <p className="text-[#7a8da7] text-[10.5px] leading-tight mt-0.5">
                                            Duy trì công cụ & hỗ trợ chuẩn hóa nhập khách CRM
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setShowPaymentModal(false); paymentTriggerRef.current?.focus({ preventScroll: true }); }}
                                    className="w-7 h-7 rounded-full bg-[#eaf0f7] hover:bg-[#dfe8f3] text-[#8899af] hover:text-[#4d6585] flex items-center justify-center transition-colors cursor-pointer shrink-0"
                                >
                                    <i className="fas fa-times text-[11px]"></i>
                                </button>
                            </div>

                        {/* Sheet Body */}
                        <div className="crm-payment-body">
                            <div className="flex items-center justify-between bg-white rounded-2xl p-3 border border-[#e8edf5] shadow-2xs">
                                <div>
                                    <p className="text-[#8194ad] text-[9.5px] font-bold uppercase tracking-wider mb-0.5">TVBH Nhờ Nhập Hộ</p>
                                    <p className="text-[#304560] text-[13px] font-bold leading-tight">{selectedUserInfo?.fullName || selectedUser}</p>
                                    <p className="text-[#93a0b3] text-[11px] font-medium leading-tight mt-0.5 font-mono">({selectedUser})</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[#8194ad] text-[9.5px] font-bold uppercase tracking-wider mb-0.5">Số lượng KHTN</p>
                                    <p className="font-extrabold text-[#3375cb] text-[20px] tracking-tight font-mono leading-none">
                                        {counts.selected} <span className="text-[12px] text-[#7a8da7] font-semibold">khách</span>
                                    </p>
                                </div>
                            </div>
                        {/* End of TVBH Info */}

                        {/* QR & Bank Details */}
                        
                            
                            
                            
                        {/* Content Section */}

                        {/* Bottom Section - QR & Actions */}
                        
                            {sePayPaidSuccess ? (
                                <div className="py-10 flex flex-col items-center justify-center text-center space-y-3 animate-fade-in">
                                    <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl shadow-inner">
                                        <i className="fas fa-check-circle animate-bounce"></i>
                                    </div>
                                    <div>
                                        <h4 className="text-base font-black text-slate-800 tracking-tight">
                                            Đã Xác Thực Thành Công!
                                        </h4>
                                        <p className="text-xs text-slate-500 mt-1">
                                            Đang tự động import {counts.selected} khách hàng vào CRM...
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200/60">
                                        <i className="fas fa-spinner fa-spin text-emerald-600"></i>
                                        <span>Đang import dữ liệu vào hệ thống...</span>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="crm-payment-bank-grid">
                                        {/* QR Code */}
                                        <div className="crm-payment-qr">
                                            <img 
                                                src={`https://img.vietqr.io/image/${(bankInfo?.bankId || 'ICB')}-${(bankInfo?.accountNo || '108874916326')}-qr_only.png?amount=${calculateLeadPrice(counts.selected)}&accountName=${encodeURIComponent(bankInfo?.accountName || 'PHAM THANH NHAN')}&addInfo=${encodeURIComponent(`SEVQR NAPCRM ${selectedUser.replace(/^02\./i, '').toUpperCase()} ${counts.selected}K`)}`}
                                                alt="VietQR"
                                                className="w-full h-full object-contain rounded-xl transition-transform duration-300 group-hover:scale-102"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/png?text=Loi+QR';
                                                }}
                                            />
                                        </div>
                                        
                                        {/* Bank Details */}
                                        <div className="flex-1 flex flex-col justify-between text-xs w-full">
                                            <div className="text-left w-full bg-white rounded-2xl p-3 border border-[#e8edf5] shadow-2xs space-y-1.5 h-full flex flex-col justify-between">
                                                <div>
                                                    <span className="text-[#8194ad] text-[9.5px] font-bold uppercase block tracking-wider">Số tài khoản</span>
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-mono font-extrabold text-[#304560] text-[13px] tracking-wider">
                                                            {bankInfo?.accountNo || 'Chưa cài đặt STK'}
                                                        </span>
                                                        {bankInfo?.accountNo && (
                                                            <button 
                                                                type="button" 
                                                                onClick={() => handleCopy(bankInfo.accountNo, 'Số tài khoản')}
                                                                className="text-[10px] text-[#3375cb] hover:text-[#1d5fb8] font-bold ml-1 hover:underline cursor-pointer"
                                                            >
                                                                <i className="fas fa-copy mr-0.5"></i> Chép
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                <div>
                                                    <span className="text-[#8194ad] text-[9.5px] font-bold uppercase block tracking-wider">Chủ tài khoản</span>
                                                    <span className="font-bold text-[#304560] uppercase text-[11.5px]">
                                                        {bankInfo?.accountName || 'Quản trị viên'}
                                                    </span>
                                                </div>

                                                <div>
                                                    <span className="text-[#8194ad] text-[9.5px] font-bold uppercase block tracking-wider">Ngân hàng</span>
                                                    <span className="font-semibold text-[#5a6e85] text-[11.5px]">
                                                        {bankInfo?.bankId || 'VietinBank'}
                                                    </span>
                                                </div>

                                                <div className="pt-1 border-t border-[#edf2f8]">
                                                    <span className="text-[#8194ad] text-[9.5px] font-bold uppercase block tracking-wider">Nội dung chuyển khoản (bắt buộc)</span>
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-mono font-bold text-[#3375cb] text-[11.5px]">
                                                            {`SEVQR NAPCRM ${selectedUser.replace(/^02\./i, '').toUpperCase()} ${counts.selected}K`}
                                                        </span>
                                                        <button 
                                                            type="button" 
                                                            onClick={() => handleCopy(`SEVQR NAPCRM ${selectedUser.replace(/^02\./i, '').toUpperCase()} ${counts.selected}K`, 'Nội dung')}
                                                            className="text-[10px] text-[#3375cb] hover:text-[#1d5fb8] font-bold hover:underline cursor-pointer"
                                                        >
                                                            <i className="fas fa-copy mr-0.5"></i> Chép
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="pt-2">
                                        <div className="flex items-center justify-center gap-1.5 py-2 px-3 bg-[#eef4fc] border border-[#dce7f5] rounded-xl text-[10px] text-[#527299] font-medium text-center mb-2">
                                            <i className="fas fa-hand-holding-heart text-rose-500 shrink-0"></i>
                                            <span>Hỗ trợ duy trì công cụ & nhập khách hộ • Dữ liệu do TVBH tự quản lý</span>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => { setShowPaymentModal(false); paymentTriggerRef.current?.focus({ preventScroll: true }); }}
                                            className="w-full py-2 bg-[#eaf0f7] hover:bg-[#dfe8f3] text-[#4d6585] font-bold rounded-xl text-xs transition-colors cursor-pointer active:scale-98"
                                        >
                                            Đóng / Để sau
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                </div>, document.body
            )}

            {/* Sheet: Danh Sách TVBH Đã Sử Dụng Dịch Vụ Nạp KHTN (Chỉ Admin) */}
            {isAdmin && showAdminTvbhModal && (
                <>
                    <div 
                        className="crm-admin-sheet-backdrop" 
                        onClick={() => { setShowAdminTvbhModal(false); setSelectedTvbhDetail(null); }} 
                    />
                    <div 
                        className="crm-admin-sheet" 
                        role="dialog" 
                        aria-modal="true" 
                        aria-label="Danh Sách TVBH Đã Sử Dụng Dịch Vụ"
                    >
                        {selectedTvbhDetail ? (
                            /* Sub-view: Chi Tiết Lịch Sử Nạp KHTN của TVBH được chọn */
                            <>
                                {/* Header */}
                                <div className="px-6 py-4 bg-white border-b border-[#e9edf2] flex items-center justify-between shrink-0">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedTvbhDetail(null)}
                                            className="w-7 h-7 rounded-md bg-[#f0f3f8] hover:bg-[#e2e8f0] text-[#435570] flex items-center justify-center text-xs cursor-pointer transition-colors shrink-0"
                                            title="Quay lại danh sách TVBH"
                                        >
                                            <i className="fas fa-arrow-left text-[11px]"></i>
                                        </button>
                                        <div className="w-8 h-8 rounded-full bg-[#edf3fc] text-[#2466cd] flex items-center justify-center font-semibold text-xs shrink-0 border border-[#d1e0f5]">
                                            {getInitials(selectedTvbhDetail.fullName)}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-sm font-semibold tracking-tight text-[#17263b] flex items-center gap-2 truncate">
                                                <span className="truncate">{selectedTvbhDetail.fullName}</span>
                                                <span className="text-[10px] font-mono font-medium bg-[#f0f3f8] text-[#53627a] px-1.5 py-0.5 rounded border border-[#dee4ec] shrink-0">
                                                    {selectedTvbhDetail.userCyber}
                                                </span>
                                            </h3>
                                            <p className="text-[11px] text-[#7b879a] mt-0.5 truncate">
                                                Lịch sử giao dịch & nạp KHTN qua SePay
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => { setSelectedTvbhDetail(null); setShowAdminTvbhModal(false); }}
                                        className="w-7 h-7 rounded-md bg-transparent hover:bg-[#f0f3f8] text-[#8c98aa] hover:text-[#26364b] flex items-center justify-center text-xs cursor-pointer transition-colors shrink-0 ml-3"
                                        title="Đóng sheet"
                                    >
                                        ✕
                                    </button>
                                </div>

                                {/* Quick Stats in Sheet */}
                                <div className="grid grid-cols-3 gap-3 p-4 bg-[#fbfbfc] border-b border-[#e9edf2] shrink-0 text-center">
                                    <div className="bg-white p-3 rounded-lg border border-[#e2e8f0]">
                                        <span className="text-[10px] uppercase font-semibold text-[#7b879a] block">Số Lượt Nạp Thành Công</span>
                                        <span className="text-base font-semibold text-[#17263b] font-mono mt-1 block">{selectedTvbhDetail.completedOrdersCount}</span>
                                    </div>
                                    <div className="bg-white p-3 rounded-lg border border-[#e2e8f0]">
                                        <span className="text-[10px] uppercase font-semibold text-[#7b879a] block">Tổng Khách Đã Nạp</span>
                                        <span className="text-base font-semibold text-[#17263b] font-mono mt-1 block">{selectedTvbhDetail.totalLeads} khách</span>
                                    </div>
                                    <div className="bg-white p-3 rounded-lg border border-[#e2e8f0]">
                                        <span className="text-[10px] uppercase font-semibold text-[#7b879a] block">Tổng Tiền Dịch Vụ</span>
                                        <span className="text-base font-semibold text-[#17263b] font-mono mt-1 block">{selectedTvbhDetail.totalSpent.toLocaleString('vi-VN')}₫</span>
                                    </div>
                                </div>

                                {/* Orders Table */}
                                <div className="flex-1 min-h-0 overflow-auto p-4 bg-[#fff]">
                                    <div className="border border-[#e9edf2] rounded-lg overflow-hidden">
                                        <table className="w-full text-left border-collapse text-[11px]">
                                            <thead className="sticky top-0 bg-[#f7f9fc] text-[#7b879a] border-b border-[#e9edf2] font-semibold uppercase text-[9.5px] tracking-[0.25px]">
                                                <tr>
                                                    <th className="py-2.5 px-3 text-center w-10">STT</th>
                                                    <th className="py-2.5 px-3">Thời Gian</th>
                                                    <th className="py-2.5 px-3 text-center">Số Lượng</th>
                                                    <th className="py-2.5 px-3 text-right">Số Tiền</th>
                                                    <th className="py-2.5 px-3">Mã GD SePay</th>
                                                    <th className="py-2.5 px-3 text-center">Trạng Thái</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#edf0f5]">
                                                {selectedTvbhDetail.orders.map((ord, idx) => {
                                                    const isPaid = ord.status === 'completed' || ord.status === 'paid';
                                                    return (
                                                        <tr key={ord.id} className="hover:bg-[#f7faff] transition-colors">
                                                            <td className="py-2.5 px-3 text-center font-mono text-[#8b97a9] text-[11px]">{idx + 1}</td>
                                                            <td className="py-2.5 px-3 font-mono text-[#435570] text-[11px]">
                                                                {new Date(ord.paid_at || ord.created_at).toLocaleString('vi-VN')}
                                                            </td>
                                                            <td className="py-2.5 px-3 text-center">
                                                                <span className="inline-block px-2 py-0.5 rounded text-[10.5px] font-semibold bg-[#edf3fc] text-[#225aa6]">
                                                                    {ord.lead_count} khách
                                                                </span>
                                                            </td>
                                                            <td className="py-2.5 px-3 text-right font-mono font-semibold text-[#17263b]">
                                                                {Number(ord.amount || 0).toLocaleString('vi-VN')}₫
                                                            </td>
                                                            <td className="py-2.5 px-3">
                                                                {ord.sepay_transaction_id ? (
                                                                    <span className="font-mono text-[10.5px] text-[#435570] bg-[#f0f3f8] px-1.5 py-0.5 rounded border border-[#dee4ec]">
                                                                        {ord.sepay_transaction_id}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-[#8b97a9] text-[10.5px] italic">Chưa có</span>
                                                                )}
                                                            </td>
                                                            <td className="py-2.5 px-3 text-center">
                                                                {isPaid ? (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-[#eef8f2] text-[#337454] border border-[#d2edd9]">
                                                                        <i className="fas fa-check text-[8px]"></i> {ord.status === 'completed' ? 'Hoàn tất' : 'Đã thanh toán'}
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-[#fffbeb] text-[#ad802c] border border-[#fed7aa]">
                                                                        <i className="fas fa-clock text-[8px]"></i> Đang chờ
                                                                    </span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="px-5 py-3 bg-[#fbfbfc] border-t border-[#e9edf2] flex items-center justify-between shrink-0">
                                    <span className="text-[10.5px] text-[#7b879a]">
                                        Tổng cộng: <strong>{selectedTvbhDetail.orders.length}</strong> lần thao tác
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedTvbhDetail(null)}
                                            className="h-8 px-3.5 bg-white hover:bg-[#f0f3f8] text-[#435570] border border-[#dee4ec] rounded-md text-[11px] font-medium cursor-pointer transition-colors flex items-center gap-1.5"
                                        >
                                            <i className="fas fa-arrow-left text-[10px]"></i>
                                            <span>Quay lại</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const u = selectedTvbhDetail.userCyber;
                                                setSelectedTvbhDetail(null);
                                                handleSelectTvbhForImport(u);
                                            }}
                                            className="h-8 px-4 bg-[#163e72] hover:bg-[#22518c] text-white rounded-md text-[11px] font-medium cursor-pointer flex items-center gap-1.5 transition-colors"
                                        >
                                            <i className="fas fa-file-import text-[10.5px]"></i>
                                            <span>Nạp KHTN Cho TVBH Này</span>
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            /* Main View: Danh Sách Tổng Hợp TVBH */
                            <>
                                {/* Header */}
                                <div className="px-6 py-4 bg-white border-b border-[#e9edf2] flex items-center justify-between shrink-0">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-8 h-8 rounded-lg bg-[#f0f4f9] text-[#2466cd] flex items-center justify-center text-xs font-semibold shrink-0">
                                            <i className="fas fa-users-gear text-[13px]"></i>
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-sm font-semibold tracking-tight text-[#17263b] truncate">
                                                    Danh Sách TVBH Đã Sử Dụng Dịch Vụ
                                                </h3>
                                                <span className="text-[10px] font-medium bg-[#edf3fc] text-[#2466cd] px-2 py-0.5 rounded border border-[#d1e0f5] shrink-0">
                                                    Chỉ Admin
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-[#7b879a] mt-0.5 truncate">
                                                Thống kê tư vấn bán hàng nạp KHTN qua hệ thống SePay
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowAdminTvbhModal(false)}
                                        className="w-7 h-7 rounded-md bg-transparent hover:bg-[#f0f3f8] text-[#8c98aa] hover:text-[#26364b] flex items-center justify-center text-xs cursor-pointer transition-colors shrink-0 ml-3"
                                        title="Đóng sheet"
                                    >
                                        ✕
                                    </button>
                                </div>

                                {/* Summary KPI Cards */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-[#fbfbfc] border-b border-[#e9edf2] shrink-0">
                                    <div className="bg-white p-3 rounded-lg border border-[#e2e8f0]">
                                        <span className="text-[10px] uppercase font-semibold text-[#7b879a] block tracking-wide truncate">TVBH Đã Nạp</span>
                                        <div className="flex items-baseline gap-1 mt-1">
                                            <span className="text-lg font-semibold text-[#17263b] font-mono">{overallStats.totalTvbhUsed}</span>
                                            <span className="text-[11px] text-[#8b97a9]">nhân sự</span>
                                        </div>
                                    </div>
                                    <div className="bg-white p-3 rounded-lg border border-[#e2e8f0]">
                                        <span className="text-[10px] uppercase font-semibold text-[#7b879a] block tracking-wide truncate">Tổng Khách Nạp</span>
                                        <div className="flex items-baseline gap-1 mt-1">
                                            <span className="text-lg font-semibold text-[#17263b] font-mono">{overallStats.totalLeadsImported}</span>
                                            <span className="text-[11px] text-[#8b97a9]">khách</span>
                                        </div>
                                    </div>
                                    <div className="bg-white p-3 rounded-lg border border-[#e2e8f0]">
                                        <span className="text-[10px] uppercase font-semibold text-[#7b879a] block tracking-wide truncate">Tổng Phí Đã Thu</span>
                                        <div className="flex items-baseline gap-1 mt-1">
                                            <span className="text-lg font-semibold text-[#17263b] font-mono">{overallStats.totalRevenue.toLocaleString('vi-VN')}</span>
                                            <span className="text-[11px] text-[#8b97a9] font-medium">₫</span>
                                        </div>
                                    </div>
                                    <div className="bg-white p-3 rounded-lg border border-[#e2e8f0]">
                                        <span className="text-[10px] uppercase font-semibold text-[#7b879a] block tracking-wide truncate">Giao Dịch Gần Nhất</span>
                                        <div className="mt-1 truncate">
                                            {overallStats.latestOrder ? (
                                                <span className="text-xs font-semibold text-[#17263b] font-mono">
                                                    {formatRelativeTime(overallStats.latestOrder.paid_at || overallStats.latestOrder.created_at)}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-[#8b97a9] italic">Chưa có</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Search & Actions Bar */}
                                <div className="px-5 py-3 bg-white border-b border-[#e9edf2] flex flex-wrap items-center justify-between gap-2.5 shrink-0">
                                    <div className="relative flex-1 min-w-[200px] max-w-sm">
                                        <i className="fas fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8c98aa] text-[11px]"></i>
                                        <input
                                            type="text"
                                            value={ordersSearchQuery}
                                            onChange={e => setOrdersSearchQuery(e.target.value)}
                                            placeholder="Tìm theo tên hoặc mã TVBH…"
                                            className="w-full h-8 pl-8 pr-7 text-[11px] bg-[#fbfbfc] hover:bg-white focus:bg-white border border-[#dee4ec] focus:border-[#698fc5] rounded-md outline-none text-[#26364b] placeholder-[#8c98aa] transition-colors"
                                        />
                                        {ordersSearchQuery && (
                                            <button
                                                type="button"
                                                onClick={() => setOrdersSearchQuery('')}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8c98aa] hover:text-[#26364b] text-[10px] cursor-pointer"
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 ml-auto">
                                        <button
                                            type="button"
                                            onClick={handleExportTvbhUsageExcel}
                                            className="h-8 px-2.5 bg-white hover:bg-[#f4f7fb] text-[#435570] border border-[#e1e7ef] rounded-md text-[11px] font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
                                            title="Xuất danh sách TVBH ra tệp Excel"
                                        >
                                            <i className="fas fa-file-excel text-[#337454] text-[11px]"></i>
                                            <span>Xuất Excel</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => loadOrders()}
                                            disabled={isLoadingOrders}
                                            className="h-8 px-2.5 bg-white hover:bg-[#f4f7fb] text-[#435570] border border-[#e1e7ef] rounded-md text-[11px] font-medium flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-45"
                                            title="Làm mới dữ liệu từ hệ thống"
                                        >
                                            <i className={`fas fa-rotate-right text-[10.5px] ${isLoadingOrders ? 'animate-spin text-[#2466cd]' : 'text-[#8191a7]'}`}></i>
                                            <span className="hidden sm:inline">Làm mới</span>
                                        </button>
                                    </div>
                                </div>

                                {/* TVBH List Table */}
                                <div className="flex-1 min-h-0 overflow-auto p-4 bg-[#fff]">
                                    <div className="border border-[#e9edf2] rounded-lg overflow-hidden">
                                        <table className="w-full text-left border-collapse text-[11px]">
                                            <thead className="sticky top-0 bg-[#f7f9fc] text-[#7b879a] border-b border-[#e9edf2] font-semibold uppercase text-[9.5px] tracking-[0.25px]">
                                                <tr>
                                                    <th className="py-2.5 px-3 w-10 text-center">STT</th>
                                                    <th className="py-2.5 px-3">Tư Vấn Bán Hàng</th>
                                                    <th className="py-2.5 px-3 text-center">Lượt Nạp</th>
                                                    <th className="py-2.5 px-3 text-center">Tổng Khách</th>
                                                    <th className="py-2.5 px-3 text-right">Tổng Tiền</th>
                                                    <th className="py-2.5 px-3">Gần Nhất</th>
                                                    <th className="py-2.5 px-3 text-center w-32">Thao Tác</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#edf0f5] text-[#35465f]">
                                                {isLoadingOrders && ordersList.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={7} className="py-12 text-center text-[#8b97a9]">
                                                            <i className="fas fa-spinner fa-spin text-lg text-[#2466cd] mb-2 block"></i>
                                                            Đang tải dữ liệu...
                                                        </td>
                                                    </tr>
                                                ) : filteredTvbhList.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={7} className="py-12 text-center text-[#8b97a9]">
                                                            <div className="w-10 h-10 rounded-full bg-[#f8fafc] border border-[#e9edf2] text-[#8b97a9] flex items-center justify-center mx-auto mb-2 text-base">
                                                                <i className="fas fa-users-slash"></i>
                                                            </div>
                                                            <p className="font-semibold text-[#435570]">Chưa có TVBH nào phù hợp</p>
                                                            <p className="text-[10.5px] text-[#8b97a9] mt-0.5">Dữ liệu sẽ hiển thị khi có TVBH hoàn tất thanh toán nạp KHTN</p>
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    filteredTvbhList.map((tvbh, idx) => {
                                                        const initials = getInitials(tvbh.fullName);
                                                        return (
                                                            <tr key={tvbh.tenTvbh} className="hover:bg-[#f7faff] transition-colors">
                                                                <td className="py-2.5 px-3 text-center font-mono text-[#8b97a9] text-[11px]">
                                                                    {idx + 1}
                                                                </td>
                                                                <td className="py-2.5 px-3">
                                                                    <div className="flex items-center gap-2.5">
                                                                        <div className="w-7 h-7 rounded-full bg-[#edf3fc] text-[#2466cd] border border-[#d1e0f5] flex items-center justify-center font-semibold text-[10px] shrink-0">
                                                                            {initials}
                                                                        </div>
                                                                        <div className="min-w-0">
                                                                            <div className="font-semibold text-[#17263b] text-xs flex items-center gap-1.5 truncate">
                                                                                <span className="truncate">{tvbh.fullName}</span>
                                                                                {selectedUser.replace(/^02\./i, '').toUpperCase() === tvbh.tenTvbh && (
                                                                                    <span className="text-[9px] bg-[#edf3fc] text-[#225aa6] px-1.5 py-0.2 rounded font-medium shrink-0">Đang chọn</span>
                                                                                )}
                                                                            </div>
                                                                            <div className="text-[10.5px] text-[#7b879a] font-mono mt-0.5">
                                                                                {tvbh.userCyber}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="py-2.5 px-3 text-center">
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-medium bg-[#f0f3f8] text-[#53627a]">
                                                                        {tvbh.completedOrdersCount} lượt
                                                                    </span>
                                                                </td>
                                                                <td className="py-2.5 px-3 text-center">
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-semibold bg-[#edf3fc] text-[#225aa6]">
                                                                        {tvbh.totalLeads} khách
                                                                    </span>
                                                                </td>
                                                                <td className="py-2.5 px-3 text-right font-mono font-semibold text-[#17263b] text-[11px]">
                                                                    {tvbh.totalSpent.toLocaleString('vi-VN')}₫
                                                                </td>
                                                                <td className="py-2.5 px-3">
                                                                    {tvbh.lastUsedAt ? (
                                                                        <div>
                                                                            <span className="font-medium text-[#26364b] block text-[11px]">
                                                                                {formatRelativeTime(tvbh.lastUsedAt)}
                                                                            </span>
                                                                            <span className="text-[9.5px] text-[#8b97a9] font-mono">
                                                                                {new Date(tvbh.lastUsedAt).toLocaleDateString('vi-VN')}
                                                                            </span>
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-[#8b97a9] italic text-[11px]">—</span>
                                                                    )}
                                                                </td>
                                                                <td className="py-2.5 px-3 text-center">
                                                                    <div className="flex items-center justify-center gap-1.5">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setSelectedTvbhDetail(tvbh)}
                                                                            className="h-7 px-2 bg-white hover:bg-[#f0f3f8] text-[#435570] hover:text-[#225aa6] border border-[#dee4ec] rounded text-[10.5px] font-medium cursor-pointer transition-colors"
                                                                            title="Xem chi tiết lịch sử từng lần nạp"
                                                                        >
                                                                            <i className="fas fa-list-ul mr-1 text-[9.5px]"></i> Chi tiết
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleSelectTvbhForImport(tvbh.userCyber)}
                                                                            className="h-7 px-2.5 bg-[#163e72] hover:bg-[#22518c] text-white border border-[#163e72] rounded text-[10.5px] font-medium cursor-pointer transition-colors"
                                                                            title="Chọn TVBH này và nạp KHTN thay"
                                                                        >
                                                                            <i className="fas fa-file-import mr-0.5 text-[9.5px]"></i> Nạp
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="px-5 py-3 bg-[#fbfbfc] border-t border-[#e9edf2] flex items-center justify-between shrink-0">
                                    <span className="text-[10.5px] text-[#7b879a]">
                                        Hiển thị <strong>{filteredTvbhList.length}</strong> TVBH đã dùng dịch vụ
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setShowAdminTvbhModal(false)}
                                        className="h-8 px-4 bg-white hover:bg-[#f0f3f8] text-[#435570] border border-[#dee4ec] rounded-md text-[11px] font-medium cursor-pointer transition-colors"
                                    >
                                        Đóng
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default CrmLeadImporterView;
