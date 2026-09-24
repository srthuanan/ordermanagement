import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as xlsx from 'xlsx';
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

export const CrmLeadImporterView: React.FC<CrmLeadImporterViewProps> = ({
    currentUser = '',
    currentUserName = '',
    isAdmin = false,
    showToast
}) => {
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
    const [sePayPaidSuccess, setSePayPaidSuccess] = useState<boolean>(false);
    const isPaidHandledRef = useRef<boolean>(false);

    // CyberSoft Replica Grid States
    const [cyberSelectedRowIdx, setCyberSelectedRowIdx] = useState<number>(0);
    const [cyberSearchContact, setCyberSearchContact] = useState<string>('');

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
        if (savedAccount && users.some(u => u.userName === savedAccount)) {
            setSelectedUser(savedAccount);
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
        setSelectedUser(userName);
        const storageKey = `cyber_crm_account_${currentUserName || currentUser || 'default'}`;
        localStorage.setItem(storageKey, userName);
        setIsManualUserSelection(false);
        setUserSearchQuery('');
        showToast?.('Đã lưu tài khoản CRM', `Khách hàng sẽ được nhập trực tiếp cho TVBH: ${userName}`, 'success');
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
        return metadata?.users.find(u => u.userName === selectedUser);
    }, [metadata?.users, selectedUser]);

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

            setLeadRows(parsed);
            showToast?.('Nhập file thành công', `Đã nhập ${parsed.length} khách hàng từ file ${file.name}. Đang kiểm tra trùng...`, 'success', 3000);
            runDuplicateCheck(parsed);
        } catch (err: any) {
            console.error('File upload error:', err);
            showToast?.('Lỗi đọc file', `Không thể đọc file Excel: ${err.message}`, 'error');
        }
    };

    // Xử lý dán văn bản nhanh từ Zalo / Notes
    const handleExecutePaste = () => {
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

        const combined = [...leadRows, ...parsed];
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

    // Phân bổ ngẫu nhiên Dòng xe, Màu xe, Nguồn, Hình thức thanh toán & Ngày tiếp cận chia đều trong tháng cho toàn bộ danh sách
    const handleRandomizeAllRows = () => {
        if (leadRows.length === 0) {
            showToast?.('Thông báo', 'Chưa có danh sách khách hàng để xáo trộn.', 'info');
            return;
        }

        const mainstreamModelKeys = [
            'VF301', 'VF302', 'VF305',
            'VF501', 'VF503',
            'VF603', 'VF604', 'VF605',
            'VF701', 'VF704', 'VF705',
            'PD1U01', 'PD1U02',
            'PE1U01', 'PE1U02',
            'EB15'
        ];
        const modelPool = metadata?.models?.filter(m => mainstreamModelKeys.includes(m.maKx)) || [];
        const activeModelPool = modelPool.length > 0 ? modelPool : (metadata?.models || []);

        const popularColorCodes = [
            'CE18', 'TRANG',       // Trắng
            'CE11', 'DEN',         // Đen
            'CE14', 'XAM',         // Xám
            'CE16', 'DO',          // Đỏ
            'CE17', 'BAC',         // Bạc
            'CE1K', '181Y',        // Xanh dương
            '181U',                // Vàng nóc trắng
            '1823',                // Be nóc trắng
            'CE1H', '111H',        // Xanh rêu
            'CE1A',                // Cam
            '1821'                 // Hồng phấn
        ];
        const colorPool = metadata?.colors?.filter(c => popularColorCodes.includes(c.maMau)) || [];
        const activeColorPool = colorPool.length > 0 ? colorPool : (metadata?.colors || []);
        const activeSourcePool = metadata?.sources || [];

        setLeadRows(prev => prev.map((row, idx) => {
            const mObj = activeModelPool.length > 0 ? activeModelPool[(idx * 3 + Math.floor(Math.random() * 5)) % activeModelPool.length] : null;
            const cObj = activeColorPool.length > 0 ? activeColorPool[(idx * 7 + Math.floor(Math.random() * 7)) % activeColorPool.length] : null;
            const sObj = activeSourcePool.length > 0 ? activeSourcePool[(idx * 2 + Math.floor(Math.random() * 3)) % activeSourcePool.length] : null;
            const pay = Math.random() > 0.4 ? '02' : '01'; // 60% trả góp, 40% trả thẳng

            // Phân bổ ngày tiếp cận chia đều ngẫu nhiên trong tháng nhập
            const { dateStr, timeStr } = getRandomDistributedDate(idx, prev.length, selectedMonth);

            return {
                ...row,
                model: mObj ? mObj.maKx : row.model,
                color: cObj ? cObj.maMau : row.color,
                source: sObj ? sObj.maPtlh : row.source,
                paymentMethod: pay,
                createdDate: dateStr,
                createdTime: timeStr
            };
        }));

        showToast?.(
            'Đã xáo trộn ngẫu nhiên',
            `Đã phân bổ ngẫu nhiên dòng xe, màu sắc và ngày tiếp cận chia đều trong tháng cho ${leadRows.length} khách hàng!`,
            'success',
            3000
        );
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
        const selected = leadRows.filter(r => r.isSelected && !r.isImported).length;
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

            showToast?.('Ting-Ting SePay!', `Đã nhận ${price.toLocaleString('vi-VN')}₫ thành công! Đang tự động import KHTN...`, 'success', 3500);

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
        <div className="flex flex-col h-[calc(100vh-64px)] max-h-[calc(100vh-64px)] bg-slate-100 overflow-hidden font-sans select-text p-2 sm:p-3 gap-2">
            {/* Success Banner if present */}
            {lastImportStats && (
                <div className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-lg shadow-sm flex items-center justify-between text-xs animate-fade-in shrink-0">
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
            <div className="bg-white rounded-lg border border-slate-200 p-2 sm:p-2.5 shadow-xs shrink-0 flex flex-col gap-2 relative">
                {/* Hidden File Input for Excel Upload */}
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                />

                {/* Line 1: Title + TVBH + Admin Switch + Quick Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="w-6 h-6 rounded bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white text-xs shadow-xs">
                            <i className="fas fa-file-excel"></i>
                        </span>
                        <h1 className="text-xs sm:text-sm font-black text-slate-800 tracking-tight flex items-center gap-1.5">
                            Dịch Vụ Hỗ Trợ Nhập Liệu KHTN
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold uppercase">Hỗ Trợ TVBH</span>
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
                    <div className="flex items-center gap-2 ml-auto">
                        <div className="flex items-center gap-1.5 bg-blue-50/80 border border-blue-200 px-2 py-0.5 rounded text-xs">
                            <span className="text-slate-500 text-[11px]">TVBH:</span>
                            <strong className="text-blue-700 font-bold">
                                {selectedUserInfo?.fullName || currentUser || currentUserName || selectedUser}
                            </strong>
                            <span className="font-mono text-[10px] text-blue-800 bg-blue-100/80 px-1 rounded">
                                {selectedUserInfo?.userName || selectedUser}
                            </span>
                        </div>

                        {isAdmin && (
                            <button
                                type="button"
                                onClick={() => setIsManualUserSelection(!isManualUserSelection)}
                                className="px-2 py-0.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded transition-all cursor-pointer"
                                title="Admin đổi TVBH cần nạp thay"
                            >
                                <i className="fas fa-user-gear text-[10px] mr-1"></i>
                                <span>{isManualUserSelection ? 'Đóng' : 'Đổi TVBH'}</span>
                            </button>
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
                            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded border border-slate-200 transition-colors cursor-pointer"
                            title="Làm mới danh mục"
                        >
                            <i className={`fas fa-rotate-right text-xs ${isLoadingMeta ? 'animate-spin text-blue-600' : ''}`}></i>
                        </button>
                    </div>
                </div>

                {/* Line 2: Fast Data Import Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-100">
                    <div className="flex flex-wrap items-center gap-1.5">
                        {/* 1. Tải File Excel */}
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="h-7 px-2.5 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                            title="Tải lên file Excel (.xlsx, .xls, .csv) danh sách khách hàng của bạn"
                        >
                            <i className="fas fa-file-arrow-up text-[11px]"></i>
                            <span>Tải File Excel</span>
                        </button>

                        {/* 2. Dán Danh Sách Nhanh */}
                        <button
                            type="button"
                            onClick={() => setShowPasteModal(true)}
                            className="h-7 px-2.5 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                            title="Dán nhanh danh sách khách hàng từ Zalo hoặc Ghi chú"
                        >
                            <i className="fas fa-paste text-[11px]"></i>
                            <span>Dán Nhanh (Zalo/Note)</span>
                        </button>

                        {/* 3. Tải File Mẫu Excel */}
                        <button
                            type="button"
                            onClick={handleDownloadTemplate}
                            className="h-7 px-2 text-[11px] font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded shadow-2xs flex items-center gap-1 cursor-pointer"
                            title="Tải tệp Excel mẫu chuẩn để điền thông tin"
                        >
                            <i className="fas fa-file-excel text-emerald-600"></i>
                            <span className="hidden sm:inline">Mẫu Excel</span>
                        </button>



                        <div className="h-4 w-[1px] bg-slate-200 mx-0.5 hidden sm:block"></div>

                        {/* Month picker */}
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={e => {
                                const val = e.target.value;
                                setSelectedMonth(val);
                                if (leadRows.length > 0 && val) handleApplyMonthToAll(val);
                            }}
                            className="h-7 px-2 bg-white border border-slate-300 rounded text-[11px] font-semibold text-slate-700 outline-none cursor-pointer"
                            title="Tháng tiếp cận"
                        />
                    </div>

                    {/* Submit Button */}
                    <div className="flex items-center gap-2 ml-auto">
                        <button
                            type="button"
                            onClick={handleImport}
                            disabled={counts.selected === 0 || isImporting || !selectedUser}
                            className="h-7 px-3.5 text-[11px] font-bold text-white bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 disabled:opacity-50 rounded shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shrink-0"
                            title="Thanh toán phí dịch vụ và import KHTN"
                        >
                            <i className={`fas ${isImporting ? 'fa-spinner fa-spin' : 'fa-qrcode'} text-[10px]`}></i>
                            <span>Import ({counts.selected} Khách - {calculateLeadPrice(counts.selected).toLocaleString('vi-VN')}₫)</span>
                        </button>
                    </div>
                </div>

                {/* Floating Admin TVBH Switcher Overlay */}
                {isManualUserSelection && isAdmin && (
                    <div className="absolute top-10 right-2 z-50 w-80 bg-white border-2 border-amber-300 rounded-xl p-3 shadow-2xl space-y-2 animate-fade-in" ref={userDropdownRef}>
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-amber-900">Chọn TVBH nhận dữ liệu (Admin):</span>
                            <button onClick={() => setIsManualUserSelection(false)} className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer">✕</button>
                        </div>
                        <input
                            type="text"
                            placeholder="Tìm TVBH..."
                            value={userSearchQuery}
                            onChange={e => setUserSearchQuery(e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-slate-300 rounded outline-none"
                            autoFocus
                        />
                        <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded">
                            {filteredUsers.map(u => (
                                <button
                                    key={u.userName}
                                    type="button"
                                    onClick={() => handleSelectUser(u.userName)}
                                    className={`w-full px-2.5 py-1.5 text-left text-xs flex items-center justify-between hover:bg-blue-50 cursor-pointer ${selectedUser === u.userName ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-700'}`}
                                >
                                    <span>{u.fullName} <span className="text-[10px] text-slate-400 font-mono">({u.userName})</span></span>
                                    {selectedUser === u.userName && <i className="fas fa-check text-emerald-600 text-xs"></i>}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Main Area: 100% CyberSoft Desktop Window (Fills all remaining height!) */}
            <div className="flex-1 flex flex-col min-h-0 bg-[#ECE9D8] rounded border-2 border-[#0055EA] shadow-xl overflow-hidden font-sans select-none">
                {/* Title Bar */}
                <div className="h-7 bg-gradient-to-r from-[#0058EE] via-[#3593FF] to-[#288EFF] px-2 flex items-center justify-between text-white shrink-0">
                    <div className="flex items-center gap-1.5">
                        <span className="w-3.5 h-3.5 bg-gradient-to-br from-amber-400 to-red-500 rounded-xs flex items-center justify-center text-[9px] font-black text-slate-900 shadow-xs border border-white/40">
                            <i className="fas fa-users text-[7px] text-white"></i>
                        </span>
                        <span className="font-bold text-[11px] text-white tracking-tight drop-shadow-xs">
                            Quản lý khách hàng tiềm năng - Ô tô VinFast Thuận An
                        </span>
                    </div>
                    <div className="flex items-center gap-0.5">
                        <button type="button" className="w-4 h-3.5 bg-[#0058EE] text-white text-[10px] font-bold flex items-center justify-center border border-white/30 rounded-xs">_</button>
                        <button type="button" className="w-4 h-3.5 bg-[#0058EE] text-white text-[9px] font-bold flex items-center justify-center border border-white/30 rounded-xs">□</button>
                        <button type="button" className="w-4 h-3.5 bg-[#E81123] text-white text-[10px] font-bold flex items-center justify-center border border-white/30 rounded-xs">✕</button>
                    </div>
                </div>

                {/* CyberSoft Toolbar (Ribbon) */}
                <div className="bg-[#F0F0F0] border-b border-[#CCCCCC] px-2 py-0.5 flex flex-wrap items-center justify-between gap-1 text-[11px] text-slate-800 shrink-0">
                    <div className="flex items-center gap-1 flex-wrap">
                        <button 
                            type="button" 
                            onClick={() => fileInputRef.current?.click()}
                            className="px-2 py-0.5 bg-white hover:bg-slate-100 border border-[#B5B5B5] rounded-xs shadow-2xs flex items-center gap-1 font-semibold text-slate-800 active:translate-y-px cursor-pointer"
                            title="Tải lên file Excel để thêm khách hàng"
                        >
                            <span className="text-emerald-600 font-bold text-xs">+</span> Thêm
                        </button>
                        <button 
                            type="button" 
                            onClick={() => {
                                const row = cyberFilteredRows[cyberSelectedRowIdx];
                                if (row) {
                                    const newPhone = prompt('Nhập số điện thoại mới:', row.phone);
                                    if (newPhone) handleRowChange(row.id, 'phone', newPhone);
                                }
                            }}
                            className="px-2 py-0.5 bg-white hover:bg-slate-100 border border-[#B5B5B5] rounded-xs shadow-2xs flex items-center gap-1 font-semibold text-slate-800 active:translate-y-px cursor-pointer"
                            title="Sửa khách hàng đang chọn"
                        >
                            <i className="fas fa-pencil text-amber-500 text-[10px]"></i> Sửa
                        </button>
                        <button 
                            type="button" 
                            onClick={handleRandomizeAllRows}
                            className="px-2 py-0.5 bg-white hover:bg-slate-100 border border-[#B5B5B5] rounded-xs shadow-2xs flex items-center gap-1 font-semibold text-indigo-700 active:translate-y-px cursor-pointer"
                            title="Xáo trộn đa dạng dòng xe & màu sắc"
                        >
                            <i className="fas fa-shuffle text-indigo-500 text-[10px]"></i> Xáo xe
                        </button>
                        {(counts.duplicate > 0 || counts.invalid > 0) && (
                            <button 
                                type="button" 
                                onClick={handleAutoFixDuplicates}
                                className="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 border border-amber-400 rounded-xs shadow-2xs flex items-center gap-1 font-bold text-amber-900 active:translate-y-px cursor-pointer"
                                title="Tự động sửa các số điện thoại trùng hoặc lỗi"
                            >
                                <i className="fas fa-wand-magic-sparkles text-amber-600 text-[10px]"></i> Sửa trùng ({counts.duplicate + counts.invalid})
                            </button>
                        )}
                        <button 
                            type="button" 
                            className="px-2 py-0.5 bg-white hover:bg-slate-100 border border-[#B5B5B5] rounded-xs shadow-2xs flex items-center gap-1 font-semibold text-slate-800 active:translate-y-px cursor-pointer"
                        >
                            <i className="fas fa-code-fork text-purple-500 text-[10px]"></i> Đổi mã
                        </button>
                        <button 
                            type="button" 
                            onClick={() => {
                                const row = cyberFilteredRows[cyberSelectedRowIdx];
                                if (row) handleDeleteRow(row.id);
                            }}
                            className="px-2 py-0.5 bg-white hover:bg-rose-50 border border-[#B5B5B5] rounded-xs shadow-2xs flex items-center gap-1 font-semibold text-rose-700 active:translate-y-px cursor-pointer"
                            title="Xóa dòng đang chọn"
                        >
                            <i className="fas fa-trash-can text-rose-500 text-[10px]"></i> Xóa
                        </button>
                        <button 
                            type="button" 
                            onClick={handleClearAll}
                            className="p-1 hover:bg-rose-100 text-rose-600 border border-transparent hover:border-rose-300 rounded-xs cursor-pointer"
                            title="Xóa toàn bộ danh sách"
                        >
                            <i className="fas fa-trash text-[10px]"></i>
                        </button>

                        <div className="h-3.5 w-[1px] bg-slate-300 mx-0.5"></div>

                        <button 
                            type="button" 
                            onClick={() => window.print()}
                            className="p-1 hover:bg-slate-200 border border-transparent hover:border-slate-300 rounded-xs text-slate-600 cursor-pointer"
                            title="In danh sách"
                        >
                            <i className="fas fa-print text-[11px]"></i>
                        </button>
                        <button 
                            type="button" 
                            onClick={handleExportResultExcel}
                            className="p-1 hover:bg-slate-200 border border-transparent hover:border-slate-300 rounded-xs text-emerald-700 cursor-pointer"
                            title="Xuất file Excel"
                        >
                            <i className="fas fa-file-excel text-[11px]"></i>
                        </button>

                        <div className="h-3.5 w-[1px] bg-slate-300 mx-0.5"></div>

                        {/* Navigation buttons */}
                        <div className="flex items-center gap-0.5">
                            <button type="button" onClick={() => setCyberSelectedRowIdx(0)} className="w-4 h-4 bg-white hover:bg-slate-100 border border-[#B5B5B5] rounded-xs text-[8px] flex items-center justify-center font-bold cursor-pointer">|◀</button>
                            <button type="button" onClick={() => setCyberSelectedRowIdx(prev => Math.max(0, prev - 1))} className="w-4 h-4 bg-white hover:bg-slate-100 border border-[#B5B5B5] rounded-xs text-[8px] flex items-center justify-center font-bold cursor-pointer">◀</button>
                            <button type="button" onClick={() => setCyberSelectedRowIdx(prev => Math.min(cyberFilteredRows.length - 1, prev + 1))} className="w-4 h-4 bg-white hover:bg-slate-100 border border-[#B5B5B5] rounded-xs text-[8px] flex items-center justify-center font-bold cursor-pointer">▶</button>
                            <button type="button" onClick={() => setCyberSelectedRowIdx(Math.max(0, cyberFilteredRows.length - 1))} className="w-4 h-4 bg-white hover:bg-slate-100 border border-[#B5B5B5] rounded-xs text-[8px] flex items-center justify-center font-bold cursor-pointer">▶|</button>
                        </div>

                        <div className="h-3.5 w-[1px] bg-slate-300 mx-0.5"></div>

                        <button 
                            type="button"
                            onClick={() => runDuplicateCheck()}
                            className="px-2 py-0.5 bg-white hover:bg-slate-100 border border-[#B5B5B5] rounded-xs shadow-2xs flex items-center gap-1 font-semibold text-blue-700 cursor-pointer"
                            title="Kiểm tra trùng số điện thoại"
                        >
                            <i className={`fas fa-rotate text-[9px] ${isCheckingDuplicates ? 'animate-spin' : ''}`}></i>
                            <span>Kiểm tra</span>
                        </button>
                    </div>

                    {/* Filter input Người liên hệ */}
                    <div className="flex items-center gap-1 ml-auto">
                        <span className="font-semibold text-slate-700 text-[11px]">Người liên hệ:</span>
                        <input 
                            type="text"
                            value={cyberSearchContact}
                            onChange={e => setCyberSearchContact(e.target.value)}
                            placeholder="Tìm tên, SĐT..."
                            className="w-36 sm:w-48 h-5 px-1.5 bg-white border border-[#7F9DB9] rounded-xs text-[11px] text-slate-800 outline-none focus:border-blue-600 shadow-inner"
                        />
                        {cyberSearchContact && (
                            <button type="button" onClick={() => setCyberSearchContact('')} className="text-slate-400 hover:text-slate-600 text-[10px] cursor-pointer">
                                ✕
                            </button>
                        )}
                    </div>
                </div>

                {/* DataGrid Body (Pink rows, fills all remaining height!) */}
                <div className="flex-1 overflow-auto bg-white">
                    {cyberFilteredRows.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-[#FCE7EA]">
                            <div className="w-12 h-12 rounded-xl bg-white/80 border border-[#F8B4BD] text-rose-500 flex items-center justify-center text-xl mb-2 shadow-xs">
                                <i className="fas fa-file-arrow-up"></i>
                            </div>
                            <p className="text-xs font-bold text-slate-700">Chưa có khách hàng nào trong danh sách</p>
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
                        <table className="w-full border-collapse text-[11px] font-sans" style={{ fontFamily: 'Tahoma, Arial, Segoe UI, sans-serif' }}>
                            <thead className="bg-[#EDF2F8] sticky top-0 z-20 shadow-xs border-b border-[#C4D3E3]">
                                <tr className="text-slate-700 text-center font-bold text-[11px] h-7">
                                    <th 
                                        onClick={() => handleToggleSelectAll(counts.selected < counts.valid)}
                                        className="w-9 border-r border-[#C4D3E3] bg-[#E2EAF2] text-[10px] text-slate-600 font-bold p-0 text-center cursor-pointer hover:bg-slate-300"
                                        title="Bấm để chọn hoặc bỏ chọn tất cả khách hàng hợp lệ"
                                    >
                                        {counts.selected > 0 && counts.selected === counts.valid ? '✓' : '▼'}
                                    </th>
                                    <th className="px-2 border-r border-[#C4D3E3] min-w-[75px] text-left">Mã điểm KD</th>
                                    <th className="px-2 border-r border-[#C4D3E3] min-w-[150px] text-left">Tên điểm KD</th>
                                    <th className="px-2 border-r border-[#C4D3E3] min-w-[85px] text-center">Ngày tạo</th>
                                    <th className="px-2 border-r border-[#C4D3E3] min-w-[75px] text-center">Trạng thái</th>
                                    <th className="px-2 border-r border-[#C4D3E3] min-w-[125px] text-left">Id KH</th>
                                    <th className="px-2 border-r border-[#C4D3E3] min-w-[130px] text-left">Tên TVBH</th>
                                    <th className="px-2 border-r border-[#C4D3E3] min-w-[140px] text-left">Tên đối tượng</th>
                                    <th className="px-2 border-r border-[#C4D3E3] min-w-[140px] text-left">Người liên hệ</th>
                                    <th className="px-2 border-r border-[#C4D3E3] min-w-[200px] text-left">Địa chỉ</th>
                                    <th className="px-2 border-r border-[#C4D3E3] min-w-[95px] text-left">Điện thoại 1</th>
                                    <th className="px-2 border-r border-[#C4D3E3] min-w-[95px] text-left">Điện thoại 2</th>
                                    <th className="px-2 border-r border-[#C4D3E3] min-w-[95px] text-left">Điện thoại 3</th>
                                    <th className="px-2 border-r border-[#C4D3E3] min-w-[85px] text-left">Dòng xe</th>
                                    <th className="px-2 border-r border-[#C4D3E3] min-w-[85px] text-left">Màu xe</th>
                                    <th className="px-2 min-w-[140px] text-left">Nguồn tiếp cận</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cyberFilteredRows.map((row, idx) => {
                                    const isSelected = idx === cyberSelectedRowIdx;
                                    const parts = (row.createdDate || '').split('-');
                                    const displayDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : row.createdDate;
                                    const mObj = metadata?.models.find(m => m.maKx === row.model);
                                    const cObj = metadata?.colors?.find(c => c.maMau === row.color);
                                    const sObj = metadata?.sources.find(s => s.maPtlh === row.source);

                                    return (
                                        <tr
                                            key={row.id}
                                            onClick={() => setCyberSelectedRowIdx(idx)}
                                            className={`h-6 cursor-pointer border-b border-[#F8B4BD] text-[11px] leading-tight transition-colors ${
                                                isSelected 
                                                    ? 'bg-[#FBCFE8] font-bold text-slate-900 outline outline-1 outline-blue-600 z-10' 
                                                    : 'bg-[#FCE7EA] hover:bg-[#FDDDE1] text-slate-800'
                                            }`}
                                            style={{ backgroundColor: isSelected ? '#FBCFE8' : '#FCE7EA' }}
                                        >
                                            <td className="w-9 border-r border-[#C4D3E3] bg-[#EDF2F8] text-[10px] text-center font-mono text-slate-600 p-0 select-none">
                                                <span className="flex items-center justify-center gap-0.5">
                                                    {isSelected ? <span className="text-[8px] text-slate-900 font-black">▶</span> : null}
                                                    <span>{idx + 1}</span>
                                                </span>
                                            </td>
                                            <td className="px-1.5 border-r border-[#F8B4BD] whitespace-nowrap font-mono text-slate-700">02.01.08</td>
                                            <td className="px-1.5 border-r border-[#F8B4BD] whitespace-nowrap">Ô tô VinFast Thuận An</td>
                                            <td className="px-1.5 border-r border-[#F8B4BD] text-center whitespace-nowrap font-mono">{displayDate}</td>
                                            <td className="px-1.5 border-r border-[#F8B4BD] text-center whitespace-nowrap">Warm</td>
                                            <td className="px-1.5 border-r border-[#F8B4BD] whitespace-nowrap font-mono font-bold">
                                                {row.cyberId ? (
                                                    <span className="text-emerald-700 font-extrabold">{row.cyberId}</span>
                                                ) : (
                                                    <span className="text-slate-400 italic font-normal">Chờ cấp mã...</span>
                                                )}
                                            </td>
                                            <td className="px-1.5 border-r border-[#F8B4BD] whitespace-nowrap">{selectedUserInfo?.fullName || 'Phạm Thành Nhân'}</td>
                                            <td className="px-1.5 border-r border-[#F8B4BD] whitespace-nowrap font-semibold">{row.fullName}</td>
                                            <td className="px-1.5 border-r border-[#F8B4BD] whitespace-nowrap font-semibold">{row.fullName}</td>
                                            <td className="px-1.5 border-r border-[#F8B4BD] truncate max-w-[220px]" title={row.address}>{row.address}</td>
                                            <td className="px-1.5 border-r border-[#F8B4BD] whitespace-nowrap font-mono text-slate-900">{row.phone}</td>
                                            <td className="px-1.5 border-r border-[#F8B4BD] whitespace-nowrap font-mono text-slate-600">{row.phone2 || row.phone}</td>
                                            <td className="px-1.5 border-r border-[#F8B4BD] whitespace-nowrap font-mono text-slate-600">{row.phone}</td>
                                            <td className="px-1.5 border-r border-[#F8B4BD] whitespace-nowrap">{mObj?.tenKx || row.model}</td>
                                            <td className="px-1.5 border-r border-[#F8B4BD] whitespace-nowrap">{cObj?.tenMau || row.color}</td>
                                            <td className="px-1.5 whitespace-nowrap truncate max-w-[150px]" title={sObj?.tenPtlh}>{sObj?.tenPtlh || 'Khách vãng lai'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* CyberSoft Status & Execution Bar */}
                <div className="bg-[#ECE9D8] border-t border-[#CCCCCC] px-3 py-1 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs select-none shrink-0">
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
                            onClick={handleImport}
                            disabled={counts.selected === 0 || isImporting || !selectedUser}
                            className="px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white font-bold rounded text-xs shadow-md shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                            <i className={`fas ${isImporting ? 'fa-spinner fa-spin' : 'fa-qrcode'}`}></i>
                            <span>
                                {isImporting
                                    ? 'Đang import...'
                                    : `Thanh Toán & Import ${counts.selected} Khách (${calculateLeadPrice(counts.selected).toLocaleString('vi-VN')}₫)`}
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal: Dán Danh Sách Nhanh Từ Zalo / Note */}
            {showPasteModal && (
                <div className="fixed inset-0 z-[1250] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
                    <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4 animate-fade-in-up">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2.5">
                                <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm shadow-2xs">
                                    <i className="fas fa-paste"></i>
                                </span>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800">
                                        Dán Danh Sách Khách Hàng Nhanh
                                    </h3>
                                    <p className="text-[11px] text-slate-500">
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
                                rows={8}
                                value={rawPasteText}
                                onChange={e => setRawPasteText(e.target.value)}
                                placeholder="Ví dụ:&#10;Nguyễn Văn An, 0903123456, VF 5, Trắng, Thuận An&#10;Trần Thị Mai - 0918654321 - VF 3 - Dĩ An&#10;0988112233 - Lê Văn Cường - VF 7 - Thủ Dầu Một"
                                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white resize-y leading-relaxed"
                                autoFocus
                            />
                        </div>

                        <div className="flex items-center justify-between pt-1">
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
            {showPaymentModal && (
                <div className="fixed inset-0 z-[1200] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
                    <div className="w-full max-w-[460px] animate-fade-in-up relative my-auto shadow-2xl">
                        {/* Top Section - Alert & Amount */}
                        <div className="bg-white rounded-t-3xl pt-5 pb-4 px-6 relative flex flex-col">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center ring-4 ring-emerald-50/60 shadow-sm shrink-0">
                                        <i className="fas fa-file-invoice-dollar text-xl"></i>
                                    </div>
                                    <div className="text-left">
                                        <h2 className="text-[17px] font-extrabold text-slate-800 tracking-tight leading-tight">
                                            Thanh Toán Phí Dịch Vụ Nhập Liệu
                                        </h2>
                                        <p className="text-slate-500 text-[11px] leading-relaxed">
                                            Hỗ trợ chuẩn hóa, kiểm tra trùng và import KHTN
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowPaymentModal(false)}
                                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                                >
                                    <i className="fas fa-times text-xs"></i>
                                </button>
                            </div>

                            <div className="w-full flex items-center justify-between bg-gradient-to-r from-slate-50 to-emerald-50/40 rounded-2xl p-3.5 border border-slate-100 mb-1">
                                <div>
                                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-0.5">TVBH Thụ Hưởng Dịch Vụ</p>
                                    <p className="text-slate-800 text-[13px] font-bold">{selectedUserInfo?.fullName || selectedUser}</p>
                                    <p className="text-slate-500 text-[11px] font-medium">({selectedUser}) • {counts.selected} khách hàng</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-0.5">Cần thanh toán</p>
                                    <p className="font-extrabold text-emerald-600 text-[22px] tracking-tight font-mono">
                                        {calculateLeadPrice(counts.selected).toLocaleString('vi-VN')} <span className="text-[14px] text-emerald-500 font-bold">₫</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Divider with Ticket Cutouts */}
                        <div className="relative h-5 bg-white flex items-center justify-center overflow-hidden">
                            <div className="absolute left-[-12px] w-6 h-6 bg-slate-900 rounded-full"></div>
                            <div className="absolute right-[-12px] w-6 h-6 bg-slate-900 rounded-full"></div>
                            <div className="w-full border-t-[2px] border-dashed border-slate-200 mx-5"></div>
                        </div>

                        {/* Bottom Section - QR & Actions */}
                        <div className="bg-white rounded-b-3xl pt-3 pb-5 px-6 flex flex-col">
                            {sePayPaidSuccess ? (
                                <div className="py-10 flex flex-col items-center justify-center text-center space-y-3 animate-fade-in">
                                    <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl shadow-inner">
                                        <i className="fas fa-check-circle animate-bounce"></i>
                                    </div>
                                    <div>
                                        <h4 className="text-base font-black text-slate-800 tracking-tight">
                                            Đã Nhận Tiền Thành Công!
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
                                    <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-stretch mb-4">
                                        {/* QR Code */}
                                        <div className="p-2 bg-white rounded-2xl shadow-[0_4px_15px_rgb(0,0,0,0.06)] border border-slate-100 w-44 h-44 shrink-0 relative group flex items-center justify-center">
                                            <img 
                                                src={`https://img.vietqr.io/image/${(bankInfo?.bankId || 'ICB')}-${(bankInfo?.accountNo || '108874916326')}-compact2.png?amount=${calculateLeadPrice(counts.selected)}&accountName=${encodeURIComponent(bankInfo?.accountName || 'PHAM THANH NHAN')}&addInfo=${encodeURIComponent(`SEVQR NAPCRM ${selectedUser.replace(/^02\./i, '').toUpperCase()} ${counts.selected}K`)}`}
                                                alt="VietQR"
                                                className="w-full h-full object-contain rounded-lg transition-transform duration-300 group-hover:scale-105"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/png?text=Loi+QR';
                                                }}
                                            />
                                        </div>
                                        
                                        {/* Bank Details */}
                                        <div className="flex flex-col w-full justify-between text-xs">
                                            <div className="text-left w-full bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1.5">
                                                <div>
                                                    <span className="text-slate-400 text-[10px] font-bold uppercase block">Số tài khoản</span>
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-mono font-extrabold text-slate-800 text-sm tracking-wider">
                                                            {bankInfo?.accountNo || 'Chưa cài đặt STK'}
                                                        </span>
                                                        {bankInfo?.accountNo && (
                                                            <button 
                                                                type="button" 
                                                                onClick={() => handleCopy(bankInfo.accountNo, 'Số tài khoản')}
                                                                className="text-[10px] text-blue-600 hover:text-blue-700 font-bold ml-1 hover:underline cursor-pointer"
                                                            >
                                                                <i className="fas fa-copy mr-0.5"></i> Chép
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                <div>
                                                    <span className="text-slate-400 text-[10px] font-bold uppercase block">Chủ tài khoản</span>
                                                    <span className="font-bold text-slate-700 uppercase">
                                                        {bankInfo?.accountName || 'Quản trị viên'}
                                                    </span>
                                                </div>

                                                <div>
                                                    <span className="text-slate-400 text-[10px] font-bold uppercase block">Ngân hàng</span>
                                                    <span className="font-semibold text-slate-600">
                                                        {bankInfo?.bankId || 'VietinBank'}
                                                    </span>
                                                </div>

                                                <div className="pt-1 border-t border-slate-200/60">
                                                    <span className="text-slate-400 text-[10px] font-bold uppercase block">Nội dung chuyển khoản (bắt buộc)</span>
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-mono font-bold text-indigo-700 text-xs">
                                                            {`SEVQR NAPCRM ${selectedUser.replace(/^02\./i, '').toUpperCase()} ${counts.selected}K`}
                                                        </span>
                                                        <button 
                                                            type="button" 
                                                            onClick={() => handleCopy(`SEVQR NAPCRM ${selectedUser.replace(/^02\./i, '').toUpperCase()} ${counts.selected}K`, 'Nội dung')}
                                                            className="text-[10px] text-indigo-600 hover:text-indigo-700 font-bold ml-1 hover:underline cursor-pointer"
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
                                        <div className="flex items-center justify-center gap-2 py-2.5 px-3 bg-slate-50 border border-slate-200/80 rounded-xl text-[11px] text-slate-500 font-medium mb-2">
                                            <i className="fas fa-satellite-dish text-blue-500 animate-pulse"></i>
                                            <span>Hệ thống tự động phát hiện chuyển khoản SePay & nạp ngay</span>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => setShowPaymentModal(false)}
                                            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                                        >
                                            Đóng / Để sau
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CrmLeadImporterView;
