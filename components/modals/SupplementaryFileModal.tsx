import React from 'react';
import { Order } from '../../types';
import RequestInvoiceModal from './RequestInvoiceModal';

export interface SupplementaryFileModalProps {
    order: Order;
    onClose: () => void;
    onConfirm: (
        order: Order,
        contractFile: File | null,
        proposalFile: File | null,
        policy?: string[],
        commission?: string,
        vpoint?: string,
        aiNote?: string,
        preProcessedPayloads?: any,
        xeXangVin?: string,
        xeXangHang?: string,
        xeXangModel?: string,
        maVc?: string,
        vtlxData?: {
            hangXe?: string;
            soKhung?: string;
            camKetFile?: File | null;
            cavetFile?: File | null;
        }
    ) => Promise<any> | void;
    showToast?: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    inline?: boolean;
    compact?: boolean;
    stockData?: any[];
}

const SupplementaryFileModal: React.FC<SupplementaryFileModalProps> = ({
    order,
    onClose,
    onConfirm,
    showToast,
    inline = false,
    compact = false,
    stockData
}) => {
    return (
        <RequestInvoiceModal
            order={order}
            onClose={onClose}
            onConfirm={onConfirm as any}
            showToast={showToast || ((t, m, type) => console.log(t, m, type))}
            inline={inline}
            compact={compact}
            stockData={stockData}
            mode="supplement"
        />
    );
};

export default SupplementaryFileModal;
