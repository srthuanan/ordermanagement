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
        const { data: rawData, error } = await supabase
            .from('yeucauxhd')
            .select('*')
            .order('ngay_yeu_cau', { ascending: false });
        if (error) throw new Error(error.message);

        // Fetch corresponding statuses from 'donhang' to ensure a Single Source of Truth
        const orderNumbers = (rawData || []).map((row: any) => row.so_don_hang).filter(Boolean);
        const statusMap = new Map();

        if (orderNumbers.length > 0) {
            const { data: dhData } = await supabase
                .from('donhang')
                .select('so_don_hang, ket_qua, vin')
                .in('so_don_hang', orderNumbers);
            if (dhData) dhData.forEach((d: any) => statusMap.set(d.so_don_hang, { ket_qua: d.ket_qua, vin: d.vin }));
        }

        // Map sang cấu trúc Order để AdminView dùng được
        return (rawData || []).map((row: any) => ({
            'Tên khách hàng': row.ten_khach_hang,
            'Số đơn hàng': row.so_don_hang,
            'Dòng xe': row.dong_xe,
            'Phiên bản': row.phien_ban,
            'Ngoại thất': row.ngoai_that,
            'Nội thất': row.noi_that,
            'Tên tư vấn bán hàng': row.tvbh,
            'VIN': statusMap.has(row.so_don_hang) ? statusMap.get(row.so_don_hang).vin : row.vin,
            'Ngày cọc': row.ngay_coc,
            'Thời gian nhập': row.ngay_yeu_cau,
            'Kết quả': statusMap.has(row.so_don_hang) ? statusMap.get(row.so_don_hang).ket_qua : row.trang_thai, // Unified column
            'CHÍNH SÁCH': row.chinh_sach,
            'Hoa hồng ứng': row.hoa_hong_ung,
            'Điểm Vpoint sử dụng': row.vpoint,
            'LinkHopDong': row.url_hop_dong,
            'LinkDeNghiXHD': row.url_de_nghi_xhd,
            'Ngày xuất hóa đơn': row.ngay_xuat_hoa_don,
            'SỐ ĐƠN HÀNG': row.so_don_hang,
            'TÊN KHÁCH HÀNG': row.ten_khach_hang,
            'TƯ VẤN BÁN HÀNG': row.tvbh,
            'SỐ VIN': statusMap.has(row.so_don_hang) ? statusMap.get(row.so_don_hang).vin : row.vin,
            'Số động cơ': row.so_may,
            'SỐ ĐỘNG CƠ': row.so_may,
            'NGÀY YÊU CẦU XHĐ': row.ngay_yeu_cau,
            'NGÀY XUẤT HÓA ĐƠN': row.ngay_xuat_hoa_don,
            'Trạng thái VC': row.trang_thai_vc || '',
            '_sourceId': row.id,
        }));
    }, { refreshInterval: 10000, revalidateOnFocus: true });

    const { data: vehicleInfoRes } = useSWR('thongtinxeData', async () => {
        const { supabase: s } = await import('../services/supabaseClient');
        const mapRes: Record<string, { engine?: string; dms?: string }> = {};
        let stepSize = 1000;
        for (let i = 0; i < 20; i++) {
            const { data, error } = await s.from('thongtinxe').select('vin, so_may').range(i * stepSize, (i + 1) * stepSize - 1);
            if (error || !data || data.length === 0) break;
            data.forEach(row => {
                if (row.vin) {
                    mapRes[row.vin.trim().toUpperCase()] = {
                        engine: row.so_may?.trim()
                    };
                }
            });
            if (data.length < stepSize) break;
        }
        return mapRes;
    }, { refreshInterval: 600000 }); // Re-fetch master data rarely (10 mins)

    const xuathoadonData = xuathoadonRes || [];
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
                if (row['Số đơn hàng'] && row['Số động cơ']) {
                    engineMapByOrder.set(row['Số đơn hàng'], row['Số động cơ']);
                }
            });
        }

        const vinMap: Record<string, { engine?: string; dms?: string }> = {};

        // 1. Map from master data (thongtinxe)
        if (vehicleInfoRes) {
            Object.entries(vehicleInfoRes).forEach(([vin, info]: [string, any]) => {
                vinMap[vin] = typeof info === 'string' ? { engine: info } : info;
            });
        }

        // 2. Overlay from stock data (more accurate for current inventory)
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
                    'Số động cơ': engineNum || order['Số động cơ'],
                    'SỐ ĐỘNG CƠ': engineNum || order['Số động cơ'],
                    'Mã DMS': dmsCode || order['Mã DMS']
                };
            }
            return order;
        });
    }, [allHistoryData, xuathoadonRes, vehicleInfoRes, stockData]);

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
