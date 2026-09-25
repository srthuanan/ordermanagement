#!/usr/bin/env node
/**
 * Stimulsoft MRT Cross-Platform Report Renderer
 * Chạy trên cả Linux (Render Cloud) và Windows (máy văn phòng)
 * Sử dụng thư viện stimulsoft-reports-js để kết xuất PDF từ file template .mrt gốc CyberSoft
 */

const Stimulsoft = require('stimulsoft-reports-js');
const fs = require('fs');
const path = require('path');

function parseArgs() {
    const args = process.argv.slice(2);
    const params = {};
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg.startsWith('--')) {
            const key = arg.slice(2);
            const val = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true;
            params[key] = val;
        }
    }
    return params;
}

async function main() {
    const params = parseArgs();
    const mrtFile = params.mrt;
    const dataInput = params.data;
    const voucherType = (params['voucher-type'] || 'DNX').toUpperCase();
    const paperSize = (params['paper-size'] || 'A4').toUpperCase();
    const includeSignatures = String(params.signatures).toLowerCase() === 'true' || params.signatures === true || params.signatures === '1';
    const outFile = params.out;

    if (!mrtFile || !outFile) {
        console.error(JSON.stringify({ success: false, error: 'Thiếu tham số --mrt hoặc --out' }));
        process.exit(1);
    }

    if (!fs.existsSync(mrtFile)) {
        console.error(JSON.stringify({ success: false, error: `Không tìm thấy file template MRT tại ${mrtFile}` }));
        process.exit(1);
    }

    // Đọc dữ liệu JSON
    let jsonData = {};
    if (dataInput) {
        if (fs.existsSync(dataInput)) {
            jsonData = JSON.parse(fs.readFileSync(dataInput, 'utf8'));
        } else {
            try {
                jsonData = JSON.parse(dataInput);
            } catch (e) {
                console.error(JSON.stringify({ success: false, error: `Lỗi đọc dữ liệu JSON: ${e.message}` }));
                process.exit(1);
            }
        }
    }

    // 1. Khởi tạo StiReport
    const report = new Stimulsoft.Report.StiReport();
    const mrtContent = fs.readFileSync(mrtFile, 'utf8');
    report.load(mrtContent);

    // 2. Cài đặt các biến doanh nghiệp mặc định
    const setVar = (name, val) => {
        try {
            const v = report.dictionary.variables.getByName(name);
            if (v) v.valueObject = val;
        } catch (_) {}
    };

    setVar("M_TEN_CTY", "CÔNG TY TNHH MINH ĐẠO PHÁT");
    setVar("M_DIA_CHI", "Tổ dân phố Cam Giá 2, Phường Gia Sàng, Tỉnh Thái Nguyên, Việt Nam");

    // 3. Tiêu đề riêng cho DNX
    if (voucherType === 'DNX') {
        const titleComp = report.getComponentByName("Text2");
        if (titleComp && titleComp.text) {
            titleComp.text.value = "ĐỀ NGHỊ XUẤT XE";
        }
    }

    // 4. Khổ giấy A5 nếu được chỉ định
    if (paperSize === 'A5' && report.pages.count > 0) {
        const page = report.pages.getByIndex(0);
        page.paperSize = Stimulsoft.Report.Components.StiPaperKind.A5;
        page.pageWidth = 148;
        page.pageHeight = 210;
    }

    // 5. Chèn chữ ký nếu có yêu cầu
    if (includeSignatures && voucherType === 'DNX') {
        const footer = report.getComponentByName("FooterBand");
        if (footer) {
            footer.height = 2.7;
            const projectRoot = path.resolve(__dirname, '..');
            const sig1Path = path.join(projectRoot, 'public', 'pictures', 'chu_ky_nguoi_de_nghi.png');
            const sig2Path = path.join(projectRoot, 'public', 'pictures', 'chu_ky_phu_trach.png');

            if (fs.existsSync(sig1Path)) {
                try {
                    const img1 = new Stimulsoft.Report.Components.StiImage();
                    img1.name = "SigImageNguoiDeNghi";
                    img1.left = 0.3;
                    img1.top = 0.88;
                    img1.width = 2.8;
                    img1.height = 1.35;
                    const b64_1 = fs.readFileSync(sig1Path).toString('base64');
                    img1.imageURL = "data:image/png;base64," + b64_1;
                    img1.stretch = true;
                    img1.aspectRatio = true;
                    img1.horAlignment = Stimulsoft.Base.Drawing.StiHorAlignment.Center;
                    img1.vertAlignment = Stimulsoft.Base.Drawing.StiVertAlignment.Top;
                    footer.components.add(img1);
                } catch (e1) {
                    console.warn("[Stimulsoft Sig1 Warning]:", e1.message);
                }
            }

            if (fs.existsSync(sig2Path)) {
                try {
                    const img2 = new Stimulsoft.Report.Components.StiImage();
                    img2.name = "SigImagePhuTrach";
                    img2.left = 6.9;
                    img2.top = 0.85;
                    img2.width = 3.8;
                    img2.height = 1.70;
                    const b64_2 = fs.readFileSync(sig2Path).toString('base64');
                    img2.imageURL = "data:image/png;base64," + b64_2;
                    img2.stretch = true;
                    img2.aspectRatio = true;
                    img2.horAlignment = Stimulsoft.Base.Drawing.StiHorAlignment.Center;
                    img2.vertAlignment = Stimulsoft.Base.Drawing.StiVertAlignment.Top;
                    footer.components.add(img2);
                } catch (e2) {
                    console.warn("[Stimulsoft Sig2 Warning]:", e2.message);
                }
            }
        }
    }

    // 6. Gán DataSet dữ liệu
    const dataSet = new Stimulsoft.System.Data.DataSet("CyberDataSource");
    dataSet.readJson(jsonData);
    report.regData("CyberDataSource", "CyberDataSource", dataSet);
    report.dictionary.synchronize();

    // 7. Render & Export Document
    report.renderAsync(() => {
        report.exportDocumentAsync((pdfBytes) => {
            try {
                const dir = path.dirname(outFile);
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                fs.writeFileSync(outFile, Buffer.from(pdfBytes));
                const size = fs.statSync(outFile).size;
                console.log(JSON.stringify({ success: true, outFile, size }));
                process.exit(0);
            } catch (errWrite) {
                console.error(JSON.stringify({ success: false, error: errWrite.message }));
                process.exit(1);
            }
        }, Stimulsoft.Report.StiExportFormat.Pdf);
    });
}

main().catch(err => {
    console.error(JSON.stringify({ success: false, error: err.message }));
    process.exit(1);
});
