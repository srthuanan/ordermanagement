import React from 'react';
import { TestDriveBooking } from '../../types';
import moment from 'moment';

interface PreviewProps {
    data: TestDriveBooking;
}

const DottedLineText: React.FC<{ value?: string, className?: string, placeholder?: string }> = ({ value, className = '', placeholder }) => (
    <span className={`flex-grow border-b border-gray-400 print:border-gray-300 mx-1 text-center font-semibold ${value ? '' : 'text-gray-400'} ${className}`}>
        {value || placeholder || ''}
    </span>
);

const Checkbox: React.FC<{ checked?: boolean }> = ({ checked }) => (
    <div className="w-4 h-4 border border-gray-800 print:border-gray-400 flex items-center justify-center">
        {checked && <span className="font-bold text-sm">✓</span>}
    </div>
);

const formatTime = (timeStr?: string): string => {
    if (!timeStr) return '';
    // Handle HH:mm format directly
    if (/^\d{2}:\d{2}$/.test(timeStr)) {
        return timeStr;
    }
    // Handle full ISO/Date string from Google Sheets by interpreting it as UTC
    const time = moment.utc(timeStr);
    if (time.isValid()) {
        return time.format('HH:mm');
    }
    return timeStr; // Fallback
};

const PhieuLaiThuPreview: React.FC<PreviewProps> = ({ data }) => {
    const [year, month, day] = data.ngayThuXe ? data.ngayThuXe.split('-') : ['', '', ''];
    const hieuLucGPLXFormatted = data.hieuLucGPLX ? new Date(data.hieuLucGPLX).toLocaleDateString('vi-VN') : "";

    return (
        <div className="print-area document-preview bg-white p-[12.5px] border border-gray-800 shadow-lg w-full font-serif text-black" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
            <header className="flex justify-between items-center mb-4">
                <div className="w-12">
                    <img src="pictures/logomd.jpg" alt="Logo Minh Dao" className="w-full object-contain" />
                </div>
                <h1 className="font-bold text-lg flex-grow text-center">PHIẾU YÊU CẦU LÁI THỬ</h1>
                <div className="w-12"></div> {/* Spacer to keep title centered */}
            </header>
            
            <div className="flex justify-between items-center mb-4 text-sm">
                <div className="flex items-center">
                    <span>Tên showroom:</span>
                    <span className="font-bold pl-2">VF Minh Đạo Thuận An</span>
                </div>
                <div className="flex items-center">
                    <span>Số phiếu:</span>
                    <DottedLineText value={data.soPhieu} className="max-w-[150px]" />
                </div>
            </div>

            <div className="space-y-3 text-sm">
                <div className="flex items-center">
                    <span>Ngày thử xe:</span>
                    <DottedLineText value={day} className="max-w-[50px]" /> / <DottedLineText value={month} className="max-w-[50px]" /> / <DottedLineText value={year} className="max-w-[80px]" />
                    <span className="ml-8">Loại xe:</span>
                    <DottedLineText value={data.loaiXe} />
                </div>
                 <div className="flex items-center">
                    <span>Thời gian khởi hành:</span>
                    <DottedLineText value={formatTime(data.thoiGianKhoiHanh)} />
                    <span className="ml-8">Thời gian trở về:</span>
                    <DottedLineText value={formatTime(data.thoiGianTroVe)} />
                </div>
                 <div className="flex items-center">
                    <span>Lộ trình:</span>
                    <DottedLineText value={data.loTrinh} />
                </div>
                <div className="flex items-center">
                    <span>Tên khách hàng:</span>
                    <DottedLineText value={data.tenKhachHang} />
                    <span className="ml-8">Điện thoại:</span>
                    <DottedLineText value={data.dienThoai} />
                </div>
                <div className="flex items-center">
                    <span>Địa chỉ hiện tại:</span>
                    <DottedLineText value={data.diaChi} />
                </div>
                <div className="flex items-center">
                    <span>Khách hàng muốn tự lái thử xe:</span>
                    <div className="flex-grow"></div>
                    <div className="flex items-center gap-2 ml-4">Có <Checkbox checked={data.tuLai === 'co'}/></div>
                    <div className="flex items-center gap-2 ml-4">Không <Checkbox checked={data.tuLai === 'khong'}/></div>
                </div>
                 <div className="flex items-center">
                    <span>Đặc điểm khách hàng quan tâm:</span>
                    <DottedLineText value={data.dacDiem} />
                </div>
                <div className="flex items-center">
                    <span>Giấy phép lái xe của khách hàng số:</span>
                    <DottedLineText value={data.gplxSo} />
                    <span className="ml-8">Hiệu lực đến ngày:</span>
                    <DottedLineText value={hieuLucGPLXFormatted} />
                </div>
                <p className="text-xs italic">(TVBH phô tô và lưu lại 01 bản bằng lái xe của khách hàng)</p>
            </div>

            <table className="w-full border border-gray-800 print:border-gray-400 mt-4 text-sm text-center">
                <thead>
                    <tr className="border-b border-gray-800 print:border-gray-400">
                        <th className="font-normal p-2 border-r border-gray-800 print:border-gray-400">Người đề nghị</th>
                        <th className="font-normal p-2 border-r border-gray-800 print:border-gray-400">Người lập phiếu</th>
                        <th className="font-normal p-2">Người phê duyệt</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td className="border-r border-gray-800 print:border-gray-400 italic pt-1 pb-2">Khách hàng ký tên</td>
                        <td className="border-r border-gray-800 print:border-gray-400"></td>
                        <td></td>
                    </tr>
                    <tr style={{ height: '60px' }}>
                        <td className="border-r border-gray-800 print:border-gray-400 align-bottom pb-2 font-semibold"></td>
                        <td className="border-r border-gray-800 print:border-gray-400 align-bottom pb-2 font-semibold">{data.tenTuVan || ''}</td>
                        <td></td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
};

const GiayCamKetPreview: React.FC<PreviewProps> = ({ data }) => {
    const hieuLucGPLXFormatted = data.hieuLucGPLX ? new Date(data.hieuLucGPLX).toLocaleDateString('vi-VN') : "";
    const [year, month, day] = data.ngayCamKet ? data.ngayCamKet.split('-') : ['', '', ''];
    return (
        <div className="print-area document-preview is-cam-ket bg-white p-8 border border-gray-400 shadow-lg w-full font-serif text-black" style={{ fontFamily: '"Times New Roman", Times, serif', lineHeight: '1.5' }}>
            <div className="text-center font-bold">
                <p>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                <p>Độc lập - Tự do - Hạnh phúc</p>
            </div>
            
            <h1 className="text-center font-bold text-base my-3">GIẤY CAM KẾT</h1>
            <p className="text-center font-bold">Kính gửi: CÔNG TY TNHH MINH ĐẠO PHÁT</p>
            <p className="text-center italic mb-4">(Sau đây được gọi chung là “Công ty”)</p>

            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                <div className="flex items-end"><span className="shrink-0">Tôi tên là:</span><DottedLineText value={data.tenKhachHang} /></div>
                <div className="flex items-end"><span className="shrink-0">Số điện thoại:</span><DottedLineText value={data.dienThoai} /></div>
                <div className="flex items-end"><span className="shrink-0">Địa chỉ:</span><DottedLineText value={data.diaChi} /></div>
                <div className="flex items-end"><span className="shrink-0">Email:</span><DottedLineText value={data.email} /></div>
                <div className="flex items-end"><span className="shrink-0">Số Giấy phép lái xe:</span><DottedLineText value={data.gplxSo} /></div>
                <div className="flex items-end"><span className="shrink-0">Hiệu lực đến:</span><DottedLineText value={hieuLucGPLXFormatted} /></div>
            </div>
            
            <div className="flex items-center my-2 text-sm">
                <span className="shrink-0">Khách hàng muốn tự lái thử xe:</span>
                <div className="flex items-center gap-2 ml-4">Có <Checkbox checked={data.tuLai === 'co'}/></div>
                <div className="flex items-center gap-2 ml-4">Không <Checkbox checked={data.tuLai === 'khong'}/></div>
            </div>

            <p className="text-sm">Bằng Giấy Cam Kết này, tôi tự nguyện đăng ký tham gia lái thử xe: <DottedLineText value={data.loaiXe} /> do Công ty tổ chức tại cơ sở và cam kết tuân thủ theo những điều khoản sau:</p>
            
            <ol className="list-decimal list-inside space-y-2 text-[12.5px] text-justify mt-2" style={{ textIndent: '-1.5em', marginLeft: '1.5em' }}>
                <li>Cung cấp đầy đủ và chịu hoàn toàn mọi trách nhiệm pháp lý về các thông tin, giấy tờ cá nhân theo yêu cầu của Công ty và các bên liên quan trong thời gian tham gia chương trình.</li>
                <li>Tuyệt đối tuân thủ các điều lệ, nguyên tắc của Luật giao thông đường bộ và xe cơ giới. Đồng thời tuân thủ theo các hướng dẫn của nhân viên hướng dẫn lái thử xe trong khi tham gia lái thử xe, cũng như không được thực hiện bất kỳ hoạt động nào khác không nằm trong chương trình.</li>
                <li>Tôi đảm bảo rằng quyết định tham gia của mình trong việc tham gia lái thử xe này được đưa ra sau khi tôi đã xem xét, cân nhắc kỹ lưỡng. Tôi hiểu rằng việc lái thử xe ô tô này có thể bao gồm nguy cơ xảy ra những thương tích, tai nạn hoặc thương vong (những nguy cơ này có thể xảy ra do bất kỳ lý do gì, bao gồm nhưng không giới hạn do sự hỏng hóc, sự cố, hoặc lỗi kỹ thuật của xe, những hành động cố tình hoặc vô ý của tôi hoặc của những thành viên tham gia chương trình, v.v...). Tuy nhiên, tôi tình nguyện tham lái thử xe như vậy và chấp nhận những nguy cơ có thể xảy ra nêu trên trong suốt quá trình lái thử xe. Đồng thời, tôi xin chịu trách nhiệm về các tổn thất, hư hỏng cho xe cũng như mọi tổn thất về người hoặc về tài sản do tôi gây ra cho người thứ ba trong quá trình lái thử xe.</li>
                <li>Tôi đồng ý và cam kết miễn truy cứu trách nhiệm, cũng như miễn việc yêu cầu Công ty, chi nhánh, các công ty liên quan và nhân viên trực thuộc các Công ty bồi thường thiệt hại xảy ra (nếu có) trong mọi trường hợp trong quá trình hoặc có liên quan đến việc chạy thử xe này và dù vì bất kỳ nguyên nhân nào. Tôi thừa nhận rằng Công ty và các đơn vị và cá nhân nêu trên không có nghĩa vụ bồi thường nào liên quan đến bất kỳ trách nhiệm, nguyên nhân gây thiệt hại nào (bao gồm nhưng không giới hạn, thiệt hại trực tiếp và thực tế) ) trong mọi trường hợp trong quá trình hoặc có liên quan đến việc chạy thử xe này. Tôi cam kết và từ bỏ mọi quyền yêu cầu bồi thường, khiếu nại, kiện tụng (bao gồm nhưng không giới hạn, thương tích cá nhân, tai nạn về thương vong, thiệt hại về tài sản hoặc các vấn đề tương tự cho người và tài sản của tôi hoặc của bất kỳ bên thứ ba nào khác) có thể phát sinh trực tiếp hoặc gián tiếp từ việc tham gia lái thử xe này, kể cả phát sinh trong các trường hợp bất khả kháng (bao gồm nhưng không giới hạn: thiên tai, hỏa hoạn, lũ lụt, khủng bố hay chiến tranh ...) đối với Công ty, chi nhánh, các công ty liên quan và nhân viên trực thuộc các Công ty trong mọi trường hợp và dù vì bất kỳ nguyên nhân nào.</li>
                <li>Tôi đồng ý và ủng hộ hoàn toàn việc Công ty thu thập, sử dụng miễn phí các thông tin cá nhân, hình ảnh, video về tôi và/ hoặc do tôi tạo ra và/ hoặc được tạo ra từ trong chương trình lái thử xe này để sử dụng nội bộ và/ hoặc quảng cáo, đăng tải trên các phương tiện thông tin đại chúng. Bên cạnh đó, Công ty được phép gửi các thông tin cá nhân, tư liệu, hình ảnh, video nêu trên cho công ty mẹ của mình, các công ty thành viên trong tập đoàn Vingroup và các công ty khác cung cấp dịch vụ quảng cáo cho Công ty tại Việt Nam hoặc trên thế giới.</li>
                <li>Giấy Cam Kết này chịu sự điều chỉnh của Pháp luật Việt Nam. Trong trường hợp có bất kì vấn đề, tranh chấp nảy sinh thì tranh chấp đó sẽ được đưa ra giải quyết tại cơ quan Tòa án có thẩm quyền tại Việt Nam.</li>
                <li>Giấy Cam Kết này sẽ có hiệu lực ràng buộc với bất kỳ bên thứ ba nào là người thừa kế và/ hoặc người được ủy quyền từ tôi.</li>
            </ol>
            
            <p className="text-center font-bold my-3">TÔI ĐÃ ĐỌC VÀ HIỂU RÕ MỌI NỘI DUNG NÊU TRÊN CỦA "GIẤY CAM KẾT" VÀ TỰ NGUYỆN ĐỒNG Ý VỚI NHỮNG CAM KẾT NÊU TRÊN.</p>
            
            <div className="flex justify-end">
                <div className="text-center w-64">
                    <p className="italic">..........., Ngày {day || '.....'} tháng {month || '.....'} năm {year || '.......'}</p>
                    <p className="font-bold mt-2">Người đề nghị</p>
                    <p className="italic text-xs">(Ký và ghi rõ họ tên)</p>
                    <div className="h-16"></div>
                    <p className="font-bold">{data.tenKhachHang}</p>
                </div>
            </div>
        </div>
    );
};

const TestDrivePreview: React.FC<PreviewProps> & {
    PhieuLaiThu: React.FC<PreviewProps>;
    GiayCamKet: React.FC<PreviewProps>;
} = ({ data }) => {
    return (
        <main id="print-area-wrapper" className="print-hidden lg:col-span-3 bg-slate-100 p-4 rounded-lg overflow-y-auto flex flex-col items-center gap-4">
            <div className="w-full max-w-[210mm]">
                <PhieuLaiThuPreview data={data} />
            </div>
            <div className="w-full max-w-[210mm] mt-4">
                <GiayCamKetPreview data={data} />
            </div>
        </main>
    );
};

TestDrivePreview.PhieuLaiThu = PhieuLaiThuPreview;
TestDrivePreview.GiayCamKet = GiayCamKetPreview;

export default TestDrivePreview;