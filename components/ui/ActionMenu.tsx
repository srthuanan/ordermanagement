import React, { useState, useRef, useEffect } from 'react';
import { Order } from '../../types';

interface ActionMenuProps {
  order: Order;
  onViewDetails: (order: Order) => void;
  onCancel: (order: Order) => void;
  onRequestInvoice: (order: Order) => void;
  onSupplement: (order: Order) => void;
  // FIX: Added optional props for VinClub actions.
  onRequestVC?: (order: Order) => void;
  onConfirmVC?: (order: Order) => void;
  onToggle?: (isOpen: boolean) => void;
}

const ActionMenu: React.FC<ActionMenuProps> = ({ order, onViewDetails, onCancel, onRequestInvoice, onSupplement, onRequestVC, onConfirmVC, onToggle }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const setOpenState = (newIsOpen: boolean) => {
    setIsOpen(newIsOpen);
    onToggle?.(newIsOpen);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenState(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onToggle]);

  // FIX: Read status from 'Trạng thái VC' first for more accurate state.
  const generalStatus = (order["Kết quả"] || "chưa ghép").toLowerCase().trim().normalize('NFC');
  const vcStatus = (order["Trạng thái VC"] || "").toLowerCase().trim().normalize('NFC');
  const status = vcStatus || generalStatus;
  
  const canCancel = ['chưa ghép', 'chờ ghép (bulk)', 'đã ghép', 'chờ phê duyệt', 'yêu cầu bổ sung'].includes(generalStatus);
  const canRequestInvoice = generalStatus === 'đã ghép';
  const canAddSupplement = generalStatus === 'yêu cầu bổ sung';
  // FIX: Added conditions for new VinClub actions.
  const canRequestVC = generalStatus === 'đã xuất hóa đơn' && !vcStatus;
  const canConfirmVC = status === 'chờ xác thực vc (tvbh)';


  const handleAction = (action: (order: Order) => void, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    action(order);
    setOpenState(false);
  };

  // FIX: Added new menu items for VinClub actions.
  const menuItems = [
    { label: 'Xem chi tiết', icon: 'fa-eye text-accent-primary', action: onViewDetails, condition: true, title: 'Xem chi tiết đơn hàng' },
    { label: 'Yêu cầu Xuất Hóa Đơn', icon: 'fa-file-invoice-dollar text-green-500', action: onRequestInvoice, condition: canRequestInvoice, title: 'Tải lên hợp đồng và đề nghị để xuất hóa đơn' },
    { label: 'Bổ Sung File', icon: 'fa-edit text-orange-500', action: onSupplement, condition: canAddSupplement, title: 'Bổ sung hoặc thay thế tệp đã gửi' },
    { label: 'Yêu Cầu Cấp VC', icon: 'fa-id-card text-blue-500', action: onRequestVC!, condition: !!onRequestVC && canRequestVC, title: 'Yêu cầu cấp tài khoản VinClub' },
    { label: 'Xác Thực UNC VC', icon: 'fa-check text-teal-500', action: onConfirmVC!, condition: !!onConfirmVC && canConfirmVC, title: 'Xác thực đã nhận UNC cho VinClub' },
    { label: 'Tải Hóa Đơn', icon: 'fa-download text-sky-500', action: (o: Order) => { if(o.LinkHoaDonDaXuat) window.open(o.LinkHoaDonDaXuat, '_blank'); }, condition: !!order.LinkHoaDonDaXuat, title: 'Tải về hóa đơn đã xuất' },
    { label: 'Hủy Yêu Cầu', icon: 'fa-trash-alt text-danger', action: onCancel, condition: canCancel, isDanger: true, title: 'Hủy yêu cầu ghép xe này' }
  ].filter(item => item.condition);


  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpenState(!isOpen); }}
        className={`group w-9 h-9 flex items-center justify-center rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50
                   ${isOpen 
                     ? 'bg-accent-primary/10 text-accent-primary' 
                     : 'text-text-secondary bg-transparent hover:bg-surface-hover hover:text-text-primary'}`}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-controls="action-menu"
        title="Tùy chọn"
      >
        <i className={`fas fa-cog text-lg transform transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`}></i>
      </button>

      {isOpen && (
        <div 
            id="action-menu"
            className="origin-top-right absolute right-0 mt-2 w-56 rounded-lg shadow-2xl bg-surface-overlay border border-border-primary/70 z-30 focus:outline-none animate-fade-in-scale-up" 
            style={{animationDuration: '0.15s'}}
        >
          <div className="p-1.5" role="menu" aria-orientation="vertical">
            {menuItems.map((item) => (
                <React.Fragment key={item.label}>
                    {item.isDanger && menuItems.some(i => !i.isDanger && i.condition) && <div className="border-t border-border-primary/70 my-1 mx-1.5"></div>}
                    <button
                      // FIX: Corrected function name from `handleActionClick` to `handleAction`.
                      onClick={(e) => handleAction(item.action, e)}
                      title={item.title}
                      className={`flex items-center w-full text-left px-3 py-2.5 text-sm font-medium rounded-md transition-colors duration-150 
                                ${item.isDanger ? 'text-danger hover:bg-danger-bg' : 'text-text-primary hover:bg-surface-hover'}`}
                      role="menuitem"
                    >
                        <i className={`fas ${item.icon} fa-fw mr-3 w-5 text-center text-base`}></i>
                        <span>{item.label}</span>
                    </button>
                </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ActionMenu;