import ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';
import { Order } from '../types';
import moment from 'moment';
import { supabase } from '../services/supabaseClient';

export const exportOrdersToExcel = (data: any[], filename: string) => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Dữ liệu");
    XLSX.writeFile(wb, `${filename}.xlsx`);
};

export const exportAllSavedOrdersToExcel = async (showToast: Function) => {
    try {
        showToast('Đang tải', 'Đang kết xuất dữ liệu Excel...', 'info', 3000);
        
        // Query tables
        const [resArchived, resInvoice] = await Promise.all([
            supabase.from('archived_orders').select('*'),
            supabase.from('yeucauxhd').select('*')
        ]);

        if (resArchived.error) throw resArchived.error;
        if (resInvoice.error) throw resInvoice.error;

        const wb = XLSX.utils.book_new();

        // Append sheets
        const wsArchived = XLSX.utils.json_to_sheet(resArchived.data || []);
        XLSX.utils.book_append_sheet(wb, wsArchived, "Đơn Hàng (Lưu Trữ)");

        const wsInvoices = XLSX.utils.json_to_sheet(resInvoice.data || []);
        XLSX.utils.book_append_sheet(wb, wsInvoices, "Yêu Cầu XHĐ");

        // Trigger download
        XLSX.writeFile(wb, `DataExport_ToanBoDonHang_${moment().format('DDMMYYYY_HHmm')}.xlsx`);
        showToast('Thành công', 'Đã tải xuống file Excel!', 'success');
    } catch (error: any) {
        console.error("Export Error:", error);
        showToast('Lỗi xuất Excel', error.message || 'Có lỗi xảy ra', 'error');
    }
};

export const exportOrderReport = async (pendingOrders: Order[], pairedOrders: Order[]) => {
    // 1. Combine data
    const combinedData = [...pairedOrders, ...pendingOrders];

    // 2. Prepare headers (EXACT strings with spaces as requested)
    const headers = [
        "Showroom  ",
        "Số đơn hàng",
        "Loại xe ",
        "Ngoại thất ",
        "Nội thất ",
        "Số khung (vin)",
        "Tên khách hàng ",
        "Tên TVBH",
        "Ngày ghép ",
        "Số ngày ghép",
        "Ngày dự XHĐ ",
        "Tình trạng "
    ];

    // 3. Create Workbook & Worksheet
    const workbook = new ExcelJS.Workbook();
    const sheetName = `Tháng ${moment().format('M')}`;
    const worksheet = workbook.addWorksheet(sheetName);

    // 4. Set Column Widths (Matches your visual request)
    worksheet.columns = [
        { width: 12 }, // Showroom
        { width: 18 }, // Số đơn hàng
        { width: 25 }, // Loại xe
        { width: 25 }, // Ngoại thất
        { width: 20 }, // Nội thất
        { width: 22 }, // Số khung
        { width: 30 }, // Tên khách hàng
        { width: 20 }, // Tên TVBH
        { width: 15 }, // Ngày ghép
        { width: 12 }, // Số ngày ghép
        { width: 15 }, // Ngày dự XHĐ
        { width: 25 }  // Tình trạng
    ];

    // 5. Build Data with Style
    const today = moment().format('DD/MM/YYYY');
    const titleText = `SR Vinfast Thuận An ngày ${today}`;

    // Add Title Row (Merged)
    const titleRow = worksheet.addRow([titleText]);
    worksheet.mergeCells(`A1:L1`);
    titleRow.height = 30;
    titleRow.getCell(1).font = { bold: true, size: 14, name: 'Arial' };
    titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

    // Add space row
    worksheet.addRow([]);
    worksheet.getRow(2).height = 10;

    // Add Header Row
    const headerRow = worksheet.addRow(headers);
    headerRow.height = 25;
    headerRow.eachCell((cell) => {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'DDEBF7' } // Light Blue as in the photo
        };
        cell.font = { bold: true, name: 'Arial', size: 11 };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };
    });

    // Add Data Rows
    combinedData.forEach(order => {
        const pairingDate = order["Thời gian ghép"] ? moment(order["Thời gian ghép"]) : null;
        const matchingDate = pairingDate ? pairingDate.format('DD/MM/YYYY') : '';
        const daysDiff = pairingDate ? moment().diff(pairingDate, 'days') : '';

        const invoiceDate = order["Ngày xuất hóa đơn"] ? moment(order["Ngày xuất hóa đơn"], ['YYYY-MM-DD', 'DD/MM/YYYY', moment.ISO_8601]).format('DD/MM/YYYY') : '';
        
        const carModel = order["Dòng xe"] || '';
        const carVersion = order["Phiên bản"] || '';
        const fullCarInfo = carVersion && !carModel.includes(carVersion) ? `${carModel} ${carVersion}` : carModel;

        const row = worksheet.addRow([
            "Thuận An",
            order["Số đơn hàng"] || '',
            fullCarInfo,
            order["Ngoại thất"] || '',
            order["Nội thất"] || '',
            order["VIN"] || '',
            (order["Tên khách hàng"] || '').toUpperCase(),
            order["Tên tư vấn bán hàng"] || '',
            matchingDate,
            daysDiff,
            invoiceDate,
            order["Kết quả"] || ''
        ]);

        row.height = 20;
        row.eachCell((cell, colNumber) => {
            cell.font = { name: 'Arial', size: 11 };
            // Center align for Showroom, Loai xe, Ngay ghep, So ngay ghep, Ngay du XHD
            const centerCols = [1, 2, 3, 9, 10, 11];
            cell.alignment = { vertical: 'middle', horizontal: centerCols.includes(colNumber) ? 'center' : 'left' };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });
    });

    // 6. Generate and Download
    const filename = `SR THUẬN AN FM BC GHÉP XHĐ HÀNG NGÀY.xlsx`;
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // Create link for download
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(anchor);
};
