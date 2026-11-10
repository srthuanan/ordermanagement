export interface NdpOrderEvidence {
    orderNumber: string;
    yanaOrderNumber?: string;
    vin: string;
    dealerCode: string;
    status: string;
    invoiceDate?: string | null;
}
export const normalizeNdpId = (value: unknown): string => String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
export const validNdpInvoiceDate = (value: unknown): string | null => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(value)) return null;
    const date = value.slice(0, 10);
    const parsed = new Date(date + 'T00:00:00Z');
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date && parsed.getTime() <= Date.now() ? date : null;
};
export function evaluateNdpEvidence(records: NdpOrderEvidence[], aliases: string[], vin: string, dealer: string): { record?: NdpOrderEvidence; reason: string } {
    const ids = new Set(aliases.map(normalizeNdpId).filter(Boolean));
    const matches = records.filter(r => [r.orderNumber, r.yanaOrderNumber].some(n => ids.has(normalizeNdpId(n))));
    if (!matches.length) return { reason: 'Không tìm thấy mã NDP/Yana khớp chính xác; giữ nguyên trạng thái.' };
    if (matches.some(r => r.dealerCode !== dealer || normalizeNdpId(r.vin) !== normalizeNdpId(vin)))
        return { reason: 'Mã đơn khớp nhưng VIN/đại lý không khớp; cần kiểm tra ghép xe trên NDP.' };
    if (new Set(matches.map(r => normalizeNdpId(r.orderNumber))).size !== 1)
        return { reason: 'Nhiều đơn NDP cùng khớp mã Yana; cần kiểm tra thủ công.' };
    const invoiced = new Set(['INVOICED', 'DELIVERED', 'ĐÃ XUẤT HÓA ĐƠN', 'ĐÃ GIAO XE']);
    if (matches.some(r => !invoiced.has(String(r.status).normalize('NFC').trim().toUpperCase())))
        return { reason: 'NDP chưa xác nhận xuất hóa đơn. Trạng thái: ' + matches.map(r => r.status).join(', ') };
    return { record: matches[0], reason: '' };
}
