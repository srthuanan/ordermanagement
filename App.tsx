import React, { useState, useMemo } from 'react';
import moment from 'moment';
import 'moment/locale/vi';
import { DropdownFilterConfig } from './components/ui/Filters';
import HistoryTable from './components/HistoryTable';
import StockView from './components/StockView';
import SoldCarsView from './components/SoldCarsView';
import AdminView from './components/admin/AdminView';
import TestDriveForm from './components/testdrive/TestDriveForm';
import OrderDetailsModal from './components/modals/OrderDetailsModal';
import CancelRequestModal from './components/modals/CancelRequestModal';
import RequestInvoiceModal from './components/modals/RequestInvoiceModal';
import SupplementaryFileModal from './components/modals/SupplementaryFileModal';
import CreateRequestModal from './components/modals/CreateRequestModal';
import EditOrderModal from './components/modals/EditOrderModal';
import ChangePasswordModal from './components/modals/ChangePasswordModal';
import ImagePreviewModal from './components/modals/ImagePreviewModal';
import ActionModal from './components/admin/ActionModal';
import RequestVcModal from './components/modals/RequestVcModal';
import FilePreviewModal from './components/modals/FilePreviewModal';
import PendingStatsModal from './components/modals/PendingStatsModal';
import Filters from './components/ui/Filters';
import Pagination from './components/ui/Pagination';
import OrderGridView from './components/OrderGridView';

import { useAppNavigation } from './hooks/useAppNavigation';
import { useNotification } from './hooks/useNotification';
import { useAppData } from './hooks/useAppData';
import { useOrderOperations } from './hooks/useOrderOperations';
import { useOrderFiltering } from './hooks/useOrderFiltering';

import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import BottomNav from './components/layout/BottomNav';
import { ADMIN_USER } from './constants';
import * as apiService from './services/apiService';
import { AnalyticsData } from './types';
import onggiaGif from './pictures/onggia.gif';

moment.locale('vi');

interface AppProps {
    onLogout: () => void;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    hideToast: () => void;
}

const App: React.FC<AppProps> = ({ onLogout, showToast, hideToast }) => {
    const currentUser = sessionStorage.getItem("currentConsultant") || ADMIN_USER;
    const currentUserName = sessionStorage.getItem("currentUser") || "User";
    const userRole = sessionStorage.getItem("userRole") || (currentUserName.toLowerCase() === 'admin' ? 'Quản trị viên' : 'Tư vấn bán hàng');
    const isCurrentUserAdmin = currentUserName.toLowerCase() === 'admin';

    const {
        isSidebarCollapsed, isMobileMenuOpen, setIsMobileMenuOpen, activeView, setActiveView,
        initialAdminState, toggleSidebar, showOrderInAdmin, showAdminTab, clearInitialState
    } = useAppNavigation();

    const {
        allHistoryData, setAllHistoryData, historyData, isLoadingHistory, errorHistory, refetchHistory, archivesLoadedFromCache,
        stockData, isLoadingStock, errorStock, refetchStock, highlightedVins,
        soldData, isLoadingSold, errorSold, refetchSold,
        testDriveData, setTestDriveData, isLoadingTestDrive, refetchTestDrive,
        xuathoadonData, isLoadingXuathoadon, errorXuathoadon, refetchXuathoadon,
        teamData, allUsers, fetchAdminData
    } = useAppData({ currentUser, currentUserName, userRole, isCurrentUserAdmin, showToast });

    const {
        notifications, unreadCount, isNotificationPanelOpen, notificationContainerRef,
        toggleNotificationPanel, handleMarkAllAsRead, handleNotificationClick
    } = useNotification(showToast);

    const {
        selectedOrder, setSelectedOrder,
        orderToCancel, setOrderToCancel,
        orderToRequestInvoice, setOrderToRequestInvoice,
        orderToSupplement, setOrderToSupplement,
        orderToEdit, setOrderToEdit,
        orderToRequestVC, setOrderToRequestVC,
        orderToConfirmVC, setOrderToConfirmVC,
        createRequestData, setCreateRequestData,
        isChangePasswordModalOpen, setIsChangePasswordModalOpen,
        imagePreview, setImagePreview,
        filePreview, setFilePreview,
        isPendingStatsModalOpen, setIsPendingStatsModalOpen,
        processingOrder, processingVin,
        handleHoldCar, handleReleaseCar, handleViewDetails, handleCancelOrder, handleRequestInvoice,
        handleSupplementFiles, handleEditSuccess, handleConfirmRequestVC, handleConfirmVC,
        handleCreateRequestForVehicle, handleCreateRequestClose, handleFormSuccess,
        openImagePreviewModal, openFilePreviewModal
    } = useOrderOperations({ showToast, hideToast, refetchHistory, refetchStock, setAllHistoryData });

    const [orderView, setOrderView] = useState<'table' | 'grid'>('grid');
    const [isLoadingArchives, setIsLoadingArchives] = useState(false);
    const [isLastArchive, setIsLastArchive] = useState(archivesLoadedFromCache);

    React.useEffect(() => {
        setIsLastArchive(archivesLoadedFromCache);
    }, [archivesLoadedFromCache]);

    // Redirect admin to admin tab on login/load
    React.useEffect(() => {
        if (isCurrentUserAdmin) {
            setActiveView('admin');
        }
    }, [isCurrentUserAdmin, setActiveView]);

    const {
        filters, sortConfig, currentPage, setCurrentPage, handleFilterChange, handleResetFilters, handleSort,
        processedData, paginatedData, totalPages, PAGE_SIZE
    } = useOrderFiltering({ allHistoryData: historyData, isSidebarCollapsed, activeView, orderView });

    const handleLoadMoreArchives = async () => {
        setIsLoadingArchives(true);
        showToast('Đang Tải Lưu Trữ', 'Đang tải dữ liệu cũ, vui lòng chờ.', 'loading');
        try {
            const result = await apiService.fetchAllArchivedData();
            hideToast();
            if (result.data && result.data.length > 0) {
                sessionStorage.setItem('archivedOrdersData', JSON.stringify(result.data));
                setAllHistoryData(prevData => [...prevData, ...result.data]);
                showToast('Tải Thành Công', `Đã tải thêm ${result.data.length} mục từ kho lưu trữ.`, 'success', 3000);
            } else {
                showToast('Hoàn Tất', 'Không tìm thấy thêm dữ liệu nào trong kho lưu trữ.', 'info', 3000);
            }
            setIsLastArchive(true);
        } catch (error) {
            hideToast();
            const message = error instanceof Error ? error.message : "Lỗi không xác định";
            showToast('Tải Thất Bại', message, 'error', 5000);
        } finally {
            setIsLoadingArchives(false);
        }
    };

    const handleOrderNavigation = (direction: 'prev' | 'next') => {
        if (!selectedOrder) return;
        const list = processedData;
        const currentIndex = list.findIndex(o => o['Số đơn hàng'] === selectedOrder['Số đơn hàng']);
        if (currentIndex === -1) return;

        const nextIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;

        if (nextIndex >= 0 && nextIndex < list.length) {
            setSelectedOrder(list[nextIndex]);
        }
    };

    const vehicleAnalyticsData = useMemo((): AnalyticsData => {
        const pendingRequests = allHistoryData.filter(o => o['Kết quả']?.toLowerCase().includes('chưa'));

        const pendingRequestCount: { [key: string]: number } = {};
        pendingRequests.forEach(order => {
            const { 'Dòng xe': dong_xe, 'Phiên bản': phien_ban, 'Ngoại thất': ngoai_that } = order;
            if (dong_xe && phien_ban && ngoai_that) {
                const vehicleKey = `${dong_xe}|${phien_ban}|${ngoai_that}`.trim().toLowerCase();
                pendingRequestCount[vehicleKey] = (pendingRequestCount[vehicleKey] || 0) + 1;
            }
        });

        const stockStatus: { [key: string]: { count: number, isSlowMoving: boolean } } = {};
        stockData.forEach(vehicle => {
            const { 'Dòng xe': dong_xe, 'Phiên bản': phien_ban, 'Ngoại thất': ngoai_that } = vehicle;
            if (dong_xe && phien_ban && ngoai_that) {
                const vehicleKey = `${dong_xe}|${phien_ban}|${ngoai_that}`.trim().toLowerCase();
                const entry = stockStatus[vehicleKey] || { count: 0, isSlowMoving: false };
                entry.count += 1;

                const importDate = vehicle['Thời gian nhập'] ? moment(vehicle['Thời gian nhập']) : null;
                if (importDate && moment().diff(importDate, 'days') > 30) {
                    entry.isSlowMoving = true;
                }
                stockStatus[vehicleKey] = entry;
            }
        });

        return { pendingRequestCount, stockStatus };
    }, [allHistoryData, stockData]);

    const groupedPendingStats = useMemo(() => {
        const dataForStats = allHistoryData;
        const pendingRequests = dataForStats.filter(o => o['Kết quả']?.toLowerCase().includes('chưa'));

        const groupedByModel: Record<string, any[]> = {};
        pendingRequests.forEach(order => {
            const model = order['Dòng xe'] || 'Không xác định';
            if (!groupedByModel[model]) {
                groupedByModel[model] = [];
            }
            groupedByModel[model].push(order);
        });

        const result = Object.entries(groupedByModel).map(([model, orders]) => {
            const total = orders.length;
            const variantsCount: Record<string, number> = {};

            orders.forEach(order => {
                const phienBan = (order['Phiên bản'] && order['Phiên bản'] !== 'N/A') ? `${order['Phiên bản']} - ` : '';
                const variantKey = `${phienBan}${order['Ngoại thất'] || 'N/A'} / ${order['Nội thất'] || 'N/A'}`;
                variantsCount[variantKey] = (variantsCount[variantKey] || 0) + 1;
            });

            const variants = Object.entries(variantsCount)
                .map(([variant, count]) => ({ variant, count }))
                .sort((a, b) => b.count - a.count);

            return { model, total, variants };
        });

        return result.sort((a, b) => b.total - a.total);
    }, [allHistoryData]);

    const uniqueCarModels = useMemo(() => [...new Set(allHistoryData.map(o => o["Dòng xe"]))].sort(), [allHistoryData]);
    const uniqueStatuses = useMemo(() => [...new Set(allHistoryData.map(o => o["Trạng thái VC"] || o["Kết quả"] || "Chưa ghép"))].sort(), [allHistoryData]);

    const renderOrdersContent = () => {
        const animationClass = 'animate-fade-in-up';
        const isLoading = isLoadingHistory;
        const error = errorHistory;

        const dropdownConfigs: DropdownFilterConfig[] = [
            { id: 'order-filter-car-model', key: 'carModel', label: 'Dòng Xe', options: uniqueCarModels, icon: 'fa-car' },
            { id: 'order-filter-status', key: 'status', label: 'Trạng Thái', options: uniqueStatuses, icon: 'fa-tag' }
        ].filter(d => d.options.length > 0);

        const pendingStatsButton = (
            <button
                onClick={() => setIsPendingStatsModalOpen(true)}
                className="btn-filter h-9 px-4 text-sm font-semibold !text-accent-primary active"
                title="Xem thống kê các xe đang có yêu cầu chờ ghép"
            >
                <i className="fas fa-chart-pie mr-2"></i>
                <span>Thống Kê</span>
            </button>
        );

        if (isLoading && allHistoryData.length === 0) {
            const skeletons = Array.from({ length: 7 }, (_, i) => (
                <tr key={i}>
                    <td colSpan={7} className="py-1 px-4 sm:px-6">
                        <div className="flex items-center space-x-4 p-4 w-full">
                            <div className="skeleton-item h-6 w-6 !rounded-full"></div>
                            <div className="flex-1 space-y-2 py-1">
                                <div className="skeleton-item h-4 w-3/4"></div>
                                <div className="skeleton-item h-3 w-1/2"></div>
                            </div>
                            <div className="flex-1 space-y-2 py-1 hidden md:block">
                                <div className="skeleton-item h-4 w-5/6"></div>
                                <div className="skeleton-item h-3 w-1/3"></div>
                            </div>
                            <div className="flex-1 skeleton-item h-4 w-full hidden md:block"></div>
                            <div className="flex-1 skeleton-item h-4 w-full hidden md:block"></div>
                            <div className="flex-1 skeleton-item h-8 w-24 !rounded-full hidden md:block"></div>
                            <div className="flex-1 skeleton-item h-8 w-8 !rounded-lg hidden md:block"></div>
                        </div>
                    </td>
                </tr>
            ));
            return (
                <div className={`flex flex-col h-full ${animationClass}`}>
                    <div className="flex-shrink-0 bg-surface-card rounded-xl shadow-md border border-border-primary p-3 mb-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="skeleton-item h-12 rounded-full" style={{ flexBasis: '320px', flexGrow: 1 }}></div>
                            <div className="skeleton-item h-12 w-32 rounded-full"></div>
                            <div className="skeleton-item h-12 w-32 rounded-full"></div>
                            <div className="skeleton-item h-12 w-12 !rounded-full ml-auto"></div>
                        </div>
                    </div>
                    <div className="flex-1 bg-surface-card rounded-xl shadow-md border border-border-primary flex flex-col min-h-0">
                        <div className="flex-grow overflow-auto">
                            <table className="min-w-full">
                                <tbody className="divide-y divide-border-primary">{skeletons}</tbody>
                            </table>
                        </div>
                    </div>
                </div>
            );
        }

        if (error) {
            return (<div className={`flex items-center justify-center h-96 ${animationClass}`}><div className="text-center p-8 bg-surface-card rounded-lg shadow-xl"><i className="fa-solid fa-exclamation-triangle fa-3x text-danger"></i><p className="mt-4 text-lg font-semibold">Không thể tải dữ liệu</p><p className="mt-2 text-sm text-text-secondary max-w-sm">{error}</p><button onClick={() => refetchHistory()} className="mt-6 btn-primary">Thử lại</button></div></div>);
        }

        return (
            <div className={`flex flex-col h-full ${animationClass}`}>
                <div className="flex-shrink-0 bg-surface-card rounded-xl shadow-md border border-border-primary p-3 mb-2 relative z-20">
                    <Filters
                        filters={filters}
                        onFilterChange={handleFilterChange}
                        onReset={handleResetFilters}
                        dropdowns={dropdownConfigs}
                        searchPlaceholder="Tìm kiếm SĐH, tên khách hàng, số VIN..."
                        totalCount={processedData.length}
                        onRefresh={() => refetchHistory()}
                        isLoading={isLoading}
                        size="compact"
                        plain={true}
                        extraActionButton={pendingStatsButton}
                        viewSwitcherEnabled={true}
                        activeView={orderView}
                        onViewChange={setOrderView}
                    />
                </div>
                <div className="flex-1 flex flex-col min-h-0">
                    {orderView === 'table' ? (
                        <div className="bg-surface-card rounded-xl shadow-md border border-border-primary flex flex-col min-h-0">
                            <div className="overflow-auto relative hidden-scrollbar">
                                <HistoryTable
                                    orders={paginatedData}
                                    onViewDetails={handleViewDetails}
                                    onCancel={setOrderToCancel}
                                    onRequestInvoice={setOrderToRequestInvoice}
                                    onSupplement={setOrderToSupplement}
                                    onEdit={setOrderToEdit}
                                    onRequestVC={setOrderToRequestVC}
                                    onConfirmVC={setOrderToConfirmVC}
                                    sortConfig={sortConfig}
                                    onSort={handleSort}
                                    startIndex={(currentPage - 1) * PAGE_SIZE}
                                    processingOrder={processingOrder}
                                />
                            </div>
                            {(totalPages > 0 || !isLastArchive) && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} onLoadMore={handleLoadMoreArchives} isLoadingArchives={isLoadingArchives} isLastArchive={isLastArchive} />}
                        </div>
                    ) : (
                        <div className="bg-surface-card rounded-xl shadow-md border border-border-primary flex flex-col min-h-0">
                            <div className="overflow-y-auto hidden-scrollbar p-1">
                                <OrderGridView
                                    orders={paginatedData}
                                    onViewDetails={handleViewDetails}
                                    onCancel={setOrderToCancel}
                                    onRequestInvoice={setOrderToRequestInvoice}
                                    onSupplement={setOrderToSupplement}
                                    onEdit={setOrderToEdit}
                                    onRequestVC={setOrderToRequestVC}
                                    onConfirmVC={setOrderToConfirmVC}
                                    processingOrder={processingOrder}
                                />
                            </div>
                            {(totalPages > 0 || !isLastArchive) && (
                                <div className="relative z-20">
                                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} onLoadMore={handleLoadMoreArchives} isLoadingArchives={isLoadingArchives} isLastArchive={isLastArchive} />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const mainContentPadding = isSidebarCollapsed ? 'lg:pl-24' : 'lg:pl-[17.5rem]';

    return (
        <>
            <div className="circuit-background"></div>
            <div className="scanline"></div>
            <div id="sidebar-overlay" onClick={() => setIsMobileMenuOpen(false)} className={`fixed inset-0 bg-black/50 z-30 transition-opacity duration-300 lg:hidden ${isMobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}></div>

            <div className="hidden lg:block">
                <Sidebar
                    isSidebarCollapsed={isSidebarCollapsed}
                    isMobileMenuOpen={isMobileMenuOpen}
                    setIsMobileMenuOpen={setIsMobileMenuOpen}
                    activeView={activeView}
                    setActiveView={setActiveView}
                    toggleSidebar={toggleSidebar}
                    currentUser={currentUser}
                    userRole={userRole}
                    isCurrentUserAdmin={isCurrentUserAdmin}
                    onLogout={onLogout}
                    setIsChangePasswordModalOpen={setIsChangePasswordModalOpen}
                />
            </div>

            <div className={`relative h-screen flex flex-col transition-all duration-300 ease-in-out ${mainContentPadding} ${isMobileMenuOpen ? 'translate-x-64' : ''} pb-16 lg:pb-0`}>
                <Header
                    isSidebarCollapsed={isSidebarCollapsed}
                    setCreateRequestData={setCreateRequestData}
                    toggleNotificationPanel={toggleNotificationPanel}
                    unreadCount={unreadCount}
                    isNotificationPanelOpen={isNotificationPanelOpen}
                    notifications={notifications}
                    handleMarkAllAsRead={handleMarkAllAsRead}
                    handleNotificationClick={(n, e) => handleNotificationClick(n, e, allHistoryData, setSelectedOrder)}
                    onLogout={onLogout}
                    notificationContainerRef={notificationContainerRef}
                />

                <main className={`flex-1 p-2 flex flex-col overflow-y-auto`}>
                    <div hidden={activeView !== 'orders'} className="h-full">
                        {renderOrdersContent()}
                    </div>
                    <div hidden={activeView !== 'stock'} className="h-full">
                        <StockView
                            stockData={stockData}
                            isLoading={isLoadingStock}
                            error={errorStock}
                            refetchStock={refetchStock}
                            highlightedVins={highlightedVins}
                            showToast={showToast}
                            currentUser={currentUser}
                            isAdmin={isCurrentUserAdmin}
                            onCreateRequestForVehicle={handleCreateRequestForVehicle}
                            onHoldCar={handleHoldCar}
                            onReleaseCar={handleReleaseCar}
                            processingVin={processingVin}
                            isSidebarCollapsed={isSidebarCollapsed}
                            allOrders={allHistoryData}
                            showOrderInAdmin={showOrderInAdmin}
                            showAdminTab={showAdminTab}
                        />
                    </div>
                    <div hidden={activeView !== 'sold'} className="h-full">
                        <SoldCarsView
                            showToast={showToast}
                            soldData={soldData}
                            isLoading={isLoadingSold}
                            error={errorSold}
                            refetch={refetchSold}
                            isSidebarCollapsed={isSidebarCollapsed}
                        />
                    </div>
                    <div hidden={activeView !== 'laithu'} className="h-full">
                        <TestDriveForm
                            showToast={showToast}
                            hideToast={hideToast}
                            onOpenImagePreview={openImagePreviewModal}
                            currentUser={currentUser}
                            isAdmin={isCurrentUserAdmin}
                            allTestDrives={testDriveData}
                            setAllTestDrives={setTestDriveData}
                            isLoading={isLoadingTestDrive}
                            refetch={refetchTestDrive}
                        />
                    </div>
                    <div hidden={activeView !== 'admin'} className="h-full">
                        {isCurrentUserAdmin && <AdminView
                            showToast={showToast}
                            hideToast={hideToast}
                            refetchHistory={refetchHistory}
                            refetchStock={refetchStock}
                            allOrders={allHistoryData}
                            xuathoadonData={xuathoadonData}
                            refetchXuathoadon={refetchXuathoadon}
                            stockData={stockData}
                            isLoadingXuathoadon={isLoadingXuathoadon}
                            isLoadingHistory={isLoadingHistory}
                            errorXuathoadon={errorXuathoadon}
                            onOpenImagePreview={openImagePreviewModal}
                            onOpenFilePreview={openFilePreviewModal}
                            teamData={teamData}
                            allUsers={allUsers}
                            refetchAdminData={fetchAdminData}
                            soldData={soldData}
                            isSidebarCollapsed={isSidebarCollapsed}
                            initialState={initialAdminState}
                            clearInitialState={clearInitialState}
                            onNavigateTo={setActiveView}
                            onShowOrderDetails={setSelectedOrder}
                        />}
                    </div>
                </main >
                <footer className="hidden lg:flex flex-shrink-0 h-8 bg-surface-card/70 backdrop-blur-xl border-t border-border-primary/50 items-center justify-center px-4 sm:px-6">
                    <p className="text-xs text-text-secondary">&copy; {new Date().getFullYear()} Order Management</p>
                </footer>
            </div >

            <CreateRequestModal
                isOpen={createRequestData.isOpen}
                onClose={handleCreateRequestClose}
                onSuccess={handleFormSuccess}
                showToast={showToast}
                hideToast={hideToast}
                existingOrderNumbers={allHistoryData.map(o => o["Số đơn hàng"])}
                initialVehicle={createRequestData.initialVehicle}
                currentUser={currentUser}
                vehicleAnalyticsData={vehicleAnalyticsData}
                onOpenImagePreview={openImagePreviewModal}
            />
            <ChangePasswordModal
                isOpen={isChangePasswordModalOpen}
                onClose={() => setIsChangePasswordModalOpen(false)}
                showToast={showToast}
                username={currentUserName}
            />
            <OrderDetailsModal
                order={selectedOrder}
                onClose={() => setSelectedOrder(null)}
                orderList={processedData}
                onNavigate={handleOrderNavigation}
                onCancel={setOrderToCancel}
                onRequestInvoice={setOrderToRequestInvoice}
                onSupplement={setOrderToSupplement}
                onRequestVC={setOrderToRequestVC}
                onConfirmVC={setOrderToConfirmVC}
                onEdit={setOrderToEdit}
            />
            <EditOrderModal
                isOpen={!!orderToEdit}
                onClose={() => setOrderToEdit(null)}
                onSuccess={handleEditSuccess}
                order={orderToEdit}
                showToast={showToast}
                existingOrderNumbers={allHistoryData
                    .map(o => o["Số đơn hàng"])
                    .filter(num => num !== orderToEdit?.["Số đơn hàng"])
                }
            />
            {orderToCancel && <CancelRequestModal order={orderToCancel} onClose={() => setOrderToCancel(null)} onConfirm={handleCancelOrder} />}
            {orderToRequestInvoice && <RequestInvoiceModal order={orderToRequestInvoice} onClose={() => setOrderToRequestInvoice(null)} onConfirm={handleRequestInvoice} />}
            {orderToSupplement && <SupplementaryFileModal order={orderToSupplement} onClose={() => setOrderToSupplement(null)} onConfirm={handleSupplementFiles} />}
            <RequestVcModal
                order={orderToRequestVC}
                onClose={() => setOrderToRequestVC(null)}
                onSubmit={handleConfirmRequestVC}
            />
            {orderToConfirmVC && <ActionModal isOpen={!!orderToConfirmVC} onClose={() => setOrderToConfirmVC(null)} title="Xác Thực UNC VinClub" description="Xác nhận bạn đã nhận được UNC cho yêu cầu VinClub của đơn hàng:" targetId={orderToConfirmVC['Số đơn hàng']} submitText="Đã Nhận UNC" submitColor="success" icon="fa-check-circle" onSubmit={handleConfirmVC} />}
            <ImagePreviewModal
                isOpen={!!imagePreview}
                onClose={() => setImagePreview(null)}
                images={imagePreview?.images || []}
                startIndex={imagePreview?.startIndex}
                customerName={imagePreview?.customerName}
            />
            {
                filePreview && (
                    <FilePreviewModal
                        isOpen={!!filePreview}
                        onClose={() => setFilePreview(null)}
                        fileUrl={filePreview.url}
                        fileLabel={filePreview.label}
                    />
                )
            }
            <PendingStatsModal
                isOpen={isPendingStatsModalOpen}
                onClose={() => setIsPendingStatsModalOpen(false)}
                stats={groupedPendingStats}
            />

            {/* Decorative Image - Global */}
            <img
                src={onggiaGif}
                alt="Ong Gia Noel"
                className="fixed bottom-20 lg:bottom-0 right-0 w-24 md:w-32 z-50 pointer-events-none"
            />
            <BottomNav
                activeView={activeView}
                setActiveView={setActiveView}
                isCurrentUserAdmin={isCurrentUserAdmin}
            />
        </>
    );
};

export default App;