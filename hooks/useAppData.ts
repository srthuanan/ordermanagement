import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import useSWR from 'swr';

import { Order, StockVehicle } from '../types';
import * as apiService from '../services/apiService';
import { useVinFastApi } from './useVinFastApi';
import { useStockApi } from './useStockApi';
import { useTestDriveApi } from './useTestDriveApi';
import { normalizeName } from '../services/authService';

interface UseAppDataProps {
    currentUser: string;
    currentUserName: string;
    userRole: string;
    isCurrentUserAdmin: boolean;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
}

export const useAppData = ({ currentUser, userRole, isCurrentUserAdmin, showToast }: UseAppDataProps) => {
    // --- EXISTING HOOKS ---
    // --- NEW LOCAL STATES (Moved up for dependencies) ---
    const [teamData, setTeamData] = useState<Record<string, string[]>>({});
    const [allUsers, setAllUsers] = useState<{ name: string, role: string, username: string }[]>([]);

    // --- PERMISSION / FILTERING LOGIC (Moved up for useVinFastApi dependency) ---
    const usersToView = useMemo(() => {
        if (userRole !== 'Trưởng Phòng Kinh Doanh') {
            return undefined;
        }

        const normalizedCurrentUser = normalizeName(currentUser).toLowerCase();
        const teamMapKey = Object.keys(teamData).find(key => normalizeName(key).toLowerCase() === normalizedCurrentUser);

        if (teamMapKey && teamData[teamMapKey]) {
            const teamMembers = teamData[teamMapKey];
            return [teamMapKey, ...teamMembers].map(name => normalizeName(name));
        }

        return [currentUser]; // Fallback to current user if no team match found
    }, [currentUser, userRole, teamData]);

    const { historyData: allHistoryData, setHistoryData: setAllHistoryData, isLoading: isLoadingHistory, error: errorHistory, refetch: refetchHistory, archivesLoadedFromCache } = useVinFastApi(currentUser, isCurrentUserAdmin, usersToView);
    const { stockData, queuedVins, setStockData, isLoading: isLoadingStock, error: errorStock, refetch: refetchStock } = useStockApi();
    const { testDriveData, setTestDriveData, isLoading: isLoadingTestDrive, refetch: refetchTestDrive } = useTestDriveApi();

    const { data: xuathoadonRes, error: errorXuathoadonRaw, mutate: mutateXuathoadon } = useSWR('xuathoadonData', async () => {
        const { supabase } = await import('../services/supabaseClient');
        
        // Use a limit to keep the 'Inbox' view fast. 300 records is plenty for immediate action.
        const { data: rawData, error } = await supabase
            .from('yeucauxhd')
            .select('*')
            .order('ngay_yeu_cau', { ascending: false })
            .limit(300);
            
        if (error) throw new Error(error.message);
        return rawData || [];
    }, { refreshInterval: 10000, revalidateOnFocus: false }); // Disable revalidateOnFocus to avoid UI flicker on tab switch

    const xuathoadonData = useMemo(() => {
        if (!xuathoadonRes) return [];
        
        return xuathoadonRes.map((row: any) => ({
            'Tên khách hàng': row.ten_khach_hang,
            'Số đơn hàng': row.so_don_hang,
            'Dòng xe': row.dong_xe,
            'Phiên bản': row.phien_ban,
            'Ngoại thất': row.ngoai_that,
            'Nội thất': row.noi_that,
            'Tên tư vấn bán hàng': row.tvbh,
            'VIN': row.vin,
            'Ngày cọc': row.ngay_coc,
            'Thời gian nhập': row.ngay_yeu_cau,
            'Kết quả': row.trang_thai || 'Chờ phê duyệt',
            'CHÍNH SÁCH': row.chinh_sach,
            'Hoa hồng ứng': row.hoa_hong_ung,
            'Điểm Vpoint sử dụng': row.vpoint,
            'LinkHopDong': row.url_hop_dong,
            'LinkDeNghiXHD': row.url_de_nghi_xhd,
            'Ngày xuất hóa đơn': row.ngay_xuat_hoa_don,
            'SỐ ĐƠN HÀNG': row.so_don_hang,
            'TÊN KHÁCH HÀNG': row.ten_khach_hang,
            'TƯ VẤN BÁN HÀNG': row.tvbh,
            'SỐ VIN': row.vin,
            'Số máy': row.so_may,
            'SỐ MÁY': row.so_may,
            'NGÀY YÊU CẦU XHĐ': row.ngay_yeu_cau,
            'NGÀY XUẤT HÓA ĐƠN': row.ngay_xuat_hoa_don,
            'Trạng thái VC': row.trang_thai_vc || '',
            'Ghi chú AI': row.ghi_chu_ai,
            '_sourceId': row.id,
        }));
    }, [xuathoadonRes]);

    const isLoadingXuathoadon = !xuathoadonRes && !errorXuathoadonRaw;
    const errorXuathoadon = errorXuathoadonRaw instanceof Error ? errorXuathoadonRaw.message : (errorXuathoadonRaw ? String(errorXuathoadonRaw) : null);
    const refetchXuathoadon = () => mutateXuathoadon();

    const [highlightedVins] = useState<Set<string>>(new Set());
    const prevStockDataRef = useRef<StockVehicle[]>([]);

    const fetchAdminData = useCallback(async (isSilent = false) => {
        if (!isCurrentUserAdmin && userRole !== 'Trưởng Phòng Kinh Doanh') return;
        try {
            const [teamsResult, usersResult] = await Promise.all([
                apiService.getTeamData(),
                apiService.getUsers()
            ]);

            if (teamsResult.status === 'SUCCESS' && teamsResult.teamData) {
                setTeamData(teamsResult.teamData);
            } else {
                console.error('Failed to fetch team data:', teamsResult.message);
            }

            if (usersResult.status === 'SUCCESS' && usersResult.users) {
                setAllUsers(usersResult.users);
            } else {
                console.error('Failed to fetch user list:', usersResult.message);
            }
        } catch (error) {
            console.error("Failed to fetch admin data:", error);
            if (!isSilent) showToast('Lỗi Tải Dữ Liệu', 'Không thể tải dữ liệu quản trị phòng ban.', 'error');
        }
    }, [isCurrentUserAdmin, userRole, showToast]);

    useEffect(() => {
        fetchAdminData();
    }, [fetchAdminData]);

    const mergedAllHistoryData = useMemo(() => {
        const engineMapByOrder = new Map();
        if (xuathoadonRes) {
            xuathoadonRes.forEach((row: any) => {
                if (row['Số đơn hàng'] && row['Số máy']) {
                    engineMapByOrder.set(row['Số đơn hàng'], row['Số máy']);
                }
            });
        }

        const vinMap: Record<string, { engine?: string; dms?: string }> = {};

        // 1. Overlay from stock data (more accurate for current inventory)
        if (stockData) {
            stockData.forEach((car: any) => {
                if (car.VIN) {
                    const vin = car.VIN.trim().toUpperCase();
                    vinMap[vin] = {
                        engine: car['Số máy'] || vinMap[vin]?.engine,
                        dms: car['Mã DMS'] || vinMap[vin]?.dms
                    };
                }
            });
        }

        return allHistoryData.map((order: Order) => {
            let engineNum = engineMapByOrder.get(order['Số đơn hàng']);
            let dmsCode = order['Mã DMS'];

            if (order.VIN) {
                const vin = order.VIN.trim().toUpperCase();
                const matchedInfo = vinMap[vin];
                if (matchedInfo) {
                    if (!engineNum) engineNum = matchedInfo.engine;
                    if (!dmsCode) dmsCode = matchedInfo.dms;
                }
            }

            if (engineNum || dmsCode) {
                return {
                    ...order,
                    'Số máy': engineNum || order['Số máy'],
                    'SỐ MÁY': engineNum || order['Số máy'],
                    'Mã DMS': dmsCode || order['Mã DMS']
                };
            }
            return order;
        });
    }, [allHistoryData, xuathoadonRes, stockData]);

    const historyData = useMemo(() => {
        if (isCurrentUserAdmin) {
            return mergedAllHistoryData;
        }
        if (userRole === 'Trưởng Phòng Kinh Doanh' && usersToView) {
            const teamNames = new Set(usersToView.map(name => normalizeName(name)));
            return mergedAllHistoryData.filter((order: Order) => teamNames.has(normalizeName(order['Tên tư vấn bán hàng'])));
        }
        // Regular user
        const normalizedCurrentUser = normalizeName(currentUser);
        return mergedAllHistoryData.filter((order: Order) => normalizeName(order['Tên tư vấn bán hàng']) === normalizedCurrentUser);
    }, [mergedAllHistoryData, isCurrentUserAdmin, userRole, usersToView, currentUser]);

    useEffect(() => {
        prevStockDataRef.current = stockData;
    }, [stockData]);

    // SWR takes care of automatic background polling now.

    return {
        allHistoryData: mergedAllHistoryData,
        setAllHistoryData,
        historyData,
        isLoadingHistory,
        errorHistory,
        refetchHistory,
        archivesLoadedFromCache,

        stockData,
        queuedVins,
        setStockData,
        isLoadingStock,
        errorStock,
        refetchStock,
        highlightedVins,

        testDriveData,
        setTestDriveData,
        isLoadingTestDrive,
        refetchTestDrive,

        xuathoadonData,
        isLoadingXuathoadon,
        errorXuathoadon,
        refetchXuathoadon,

        teamData,
        allUsers,
        fetchAdminData,
        usersToView
    };
};
