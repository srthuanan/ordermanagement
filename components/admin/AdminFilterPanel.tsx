import React from 'react';
import Filters, { DropdownFilterConfig } from '../ui/Filters';
import { AdminSubView, Order, VcRequest } from '../../types';

interface AdminFilterPanelProps {
    adminView: AdminSubView;
    invoiceFilters: any;
    pendingFilters: any;
    pairedFilters: any;
    vcFilters: any;
    matchingFilters: any;
    handleFilterChange: (newFilters: any) => void;
    handleReset: () => void;
    filterOptions: {
        invoices: Record<string, string[]>;
        pending: Record<string, string[]>;
        paired: Record<string, string[]>;
        vc: Record<string, string[]>;
    };
    invoiceRequests: Order[];
    pendingData: Order[];
    pairedData: Order[];
    vcRequests: VcRequest[];
    refetchXuathoadon: () => void;
    refetchHistory: () => void;
    fetchVcData: () => void;
    isLoadingXuathoadon: boolean;
    isLoadingHistory: boolean;
    isLoadingVc: boolean;
}

const AdminFilterPanel: React.FC<AdminFilterPanelProps> = ({
    adminView, invoiceFilters, pendingFilters, pairedFilters, vcFilters, matchingFilters,
    handleFilterChange, handleReset, filterOptions,
    invoiceRequests, pendingData, pairedData, vcRequests,
    refetchXuathoadon, refetchHistory, fetchVcData,
    isLoadingXuathoadon, isLoadingHistory, isLoadingVc
}) => {
    if (['dashboard', 'phongkd', 'activityLog', 'activeUsers'].includes(adminView)) {
        return null;
    }

    let currentFilters: any;
    let dropdownConfigs: DropdownFilterConfig[] = [];
    let searchPlaceholder = "Tìm kiếm...";
    let totalCount = 0;
    let onRefresh = () => { };
    let isLoading = false;

    switch (adminView) {
        case 'invoices':
            currentFilters = invoiceFilters;
            dropdownConfigs = [
                { id: 'admin-filter-tvbh', key: 'tvbh', label: 'TVBH', options: filterOptions.invoices['Tên tư vấn bán hàng'], icon: 'fa-user-tie' },
                { id: 'admin-filter-dongxe', key: 'dongXe', label: 'Dòng Xe', options: filterOptions.invoices['Dòng xe'], icon: 'fa-car' },
                { id: 'admin-filter-version', key: 'version', label: 'Phiên Bản', options: filterOptions.invoices['Phiên bản'], icon: 'fa-cogs' },
                { id: 'admin-filter-exterior', key: 'exterior', label: 'Ngoại Thất', options: filterOptions.invoices['Ngoại thất'], icon: 'fa-palette' },

                { id: 'admin-filter-status', key: 'trangThai', label: 'Trạng Thái', options: filterOptions.invoices['Kết quả'], icon: 'fa-tag' }
            ];
            searchPlaceholder = "Tìm SĐH, Tên KH, VIN...";
            totalCount = invoiceRequests.length;
            onRefresh = () => refetchXuathoadon();
            isLoading = isLoadingXuathoadon;
            break;
        case 'pending':
            currentFilters = pendingFilters;
            dropdownConfigs = [
                { id: 'admin-filter-tvbh-pending', key: 'tvbh', label: 'TVBH', options: filterOptions.pending['Tên tư vấn bán hàng'], icon: 'fa-user-tie' },
                { id: 'admin-filter-dongxe-pending', key: 'dongXe', label: 'Dòng Xe', options: filterOptions.pending['Dòng xe'], icon: 'fa-car' },
                { id: 'admin-filter-version-pending', key: 'version', label: 'Phiên Bản', options: filterOptions.pending['Phiên bản'], icon: 'fa-cogs' },
                { id: 'admin-filter-exterior-pending', key: 'exterior', label: 'Ngoại Thất', options: filterOptions.pending['Ngoại thất'], icon: 'fa-palette' },

            ];
            searchPlaceholder = "Tìm SĐH, Tên KH...";
            totalCount = pendingData.length;
            onRefresh = () => refetchHistory();
            isLoading = isLoadingHistory;
            break;
        case 'paired':
            currentFilters = pairedFilters;
            dropdownConfigs = [
                { id: 'admin-filter-tvbh-paired', key: 'tvbh', label: 'TVBH', options: filterOptions.paired['Tên tư vấn bán hàng'], icon: 'fa-user-tie' },
                { id: 'admin-filter-dongxe-paired', key: 'dongXe', label: 'Dòng Xe', options: filterOptions.paired['Dòng xe'], icon: 'fa-car' },
                { id: 'admin-filter-version-paired', key: 'version', label: 'Phiên Bản', options: filterOptions.paired['Phiên bản'], icon: 'fa-cogs' },
                { id: 'admin-filter-exterior-paired', key: 'exterior', label: 'Ngoại Thất', options: filterOptions.paired['Ngoại thất'], icon: 'fa-palette' },

            ];
            searchPlaceholder = "Tìm SĐH, Tên KH, VIN...";
            totalCount = pairedData.length;
            onRefresh = () => refetchHistory();
            isLoading = isLoadingHistory;
            break;
        case 'matching':
            currentFilters = matchingFilters;
            dropdownConfigs = [
                { id: 'admin-filter-tvbh-matching', key: 'tvbh', label: 'TVBH', options: filterOptions.pending['Tên tư vấn bán hàng'], icon: 'fa-user-tie' },
                { id: 'admin-filter-dongxe-matching', key: 'dongXe', label: 'Dòng Xe', options: filterOptions.pending['Dòng xe'], icon: 'fa-car' },
                { id: 'admin-filter-version-matching', key: 'version', label: 'Phiên Bản', options: filterOptions.pending['Phiên bản'], icon: 'fa-cogs' },
                { id: 'admin-filter-ngoaithat-matching', key: 'ngoaiThat', label: 'Ngoại Thất', options: filterOptions.pending['Ngoại thất'], icon: 'fa-palette' },


            ];
            searchPlaceholder = "Tìm SĐH, Tên KH...";
            totalCount = pendingData.length; // Or combined count if needed
            onRefresh = () => refetchHistory();
            isLoading = isLoadingHistory;
            break;
        case 'vc':
            currentFilters = vcFilters;
            dropdownConfigs = [
                { id: 'admin-filter-nguoiyc-vc', key: 'nguoiyc', label: 'Người YC', options: filterOptions.vc['Người YC'], icon: 'fa-user-tie' },
                { id: 'admin-filter-trangthai-vc', key: 'trangthai', label: 'Trạng Thái', options: filterOptions.vc['Trạng thái xử lý'], icon: 'fa-tag' }
            ];
            searchPlaceholder = "Tìm SĐH, Tên KH, VIN, Mã DMS...";
            totalCount = vcRequests.length;
            onRefresh = () => fetchVcData();
            isLoading = isLoadingVc;
            break;
        default:
            return null;
    }

    return (
        <Filters
            filters={currentFilters}
            onFilterChange={handleFilterChange}
            onReset={handleReset}
            dropdowns={dropdownConfigs}
            searchPlaceholder={searchPlaceholder}
            totalCount={totalCount}
            onRefresh={onRefresh}
            isLoading={isLoading}
            hideSearch={false}
            size="compact"

            dropdownClassName="w-16 md:w-20 lg:w-24"
            searchable={false}
        />
    );
};

export default AdminFilterPanel;
