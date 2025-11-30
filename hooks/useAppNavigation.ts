import { useState, useEffect, useCallback } from 'react';
import { Order, AdminSubView } from '../types';

export type ActiveView = 'orders' | 'stock' | 'sold' | 'admin' | 'laithu';

export const useAppNavigation = () => {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [activeView, setActiveView] = useState<ActiveView>('orders');
    const [initialAdminState, setInitialAdminState] = useState<{ targetTab?: AdminSubView; orderToShow?: Order } | null>(null);

    useEffect(() => {
        const savedState = localStorage.getItem('sidebarState');
        setIsSidebarCollapsed(savedState === 'collapsed');
    }, []);

    const toggleSidebar = useCallback(() => {
        setIsSidebarCollapsed(prev => {
            const newState = !prev;
            localStorage.setItem('sidebarState', newState ? 'collapsed' : 'expanded');
            return newState;
        });
    }, []);

    const showOrderInAdmin = useCallback((order: Order, targetTab: AdminSubView) => {
        setActiveView('admin');
        setInitialAdminState({ orderToShow: order, targetTab });
    }, []);

    const showAdminTab = useCallback((targetTab: AdminSubView) => {
        setActiveView('admin');
        setInitialAdminState({ targetTab });
    }, []);

    const clearInitialState = useCallback(() => {
        setInitialAdminState(null);
    }, []);

    return {
        isSidebarCollapsed,
        isMobileMenuOpen,
        setIsMobileMenuOpen,
        activeView,
        setActiveView,
        initialAdminState,
        toggleSidebar,
        showOrderInAdmin,
        showAdminTab,
        clearInitialState
    };
};
