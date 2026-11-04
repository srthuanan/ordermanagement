import React from 'react';
import { TestDriveBooking } from '../../types';
import moment from 'moment';
import logoMd from '../../pictures/logomd.webp';

interface PreviewProps {
    data: TestDriveBooking;
    hideOnMobile?: boolean;
}

const DottedLineText: React.FC<{ value?: string, className?: string, placeholder?: string }> = ({ value, className = '', placeholder }) => (
    <span className={`flex-grow border-b border-gray-400 print:border-gray-300 mx-1 text-center font-semibold uppercase ${value ? '' : 'text-gray-400'} ${className}`}>
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
    // Handle full ISO/Date string from Google Sheets
    const time = moment(timeStr);
    if (time.isValid()) {
        return time.format('HH:mm');
    }
    return timeStr; // Fallback
};

const PhieuLaiThuPreview: React.FC<PreviewProps> = ({ data }) => {
    const mDate = moment(data.ngayThuXe, ["YYYY-MM-DD", "DD/MM/YYYY"]);
    const [year, month, day] = mDate.isValid() ? [mDate.year().toString(), (mDate.month() + 1).toString().padStart(2, '0'), mDate.date().toString().padStart(2, '0')] : ['', '', ''];
    const hieuLucGPLXFormatted = data.hieuLucGPLX ? moment(data.hieuLucGPLX, ["YYYY-MM-DD", "DD/MM/YYYY"]).format('DD/MM/YYYY') : "";

    return (
        <div className="print-area document-preview bg-white p-[12.5px] border border-gray-800 shadow-lg w-full font-serif text-black flex flex-col" style={{ fontFamily: '"Times New Roman", Times, serif', minHeight: '270mm' }}>
            <header className="flex justify-between items-center mb-3">
                <div className="w-12">
                    <img src={logoMd} alt="Logo Minh Dao" className="w-full object-contain" />
                </div>
                <h1 className="font-bold text-lg flex-grow text-center">PHIẾU YÊU CẦU LÁI THỬ</h1>
                <div className="w-12"></div> {/* Spacer to keep title centered */}
            </header>

            <div className="flex justify-between items-center mb-3 text-sm">
                <div className="flex items-center">
                    <span>Tên showroom:</span>
                    <span className="font-bold pl-2">VF Minh Đạo Thuận An</span>
                </div>
                <div className="flex items-center">
                    <span>Số phiếu:</span>
                    <DottedLineText value={data.soPhieu} className="max-w-[150px]" />
                </div>
            </div>

            <div className="space-y-2.5 text-sm">
                <div className="flex items-center">
                    <span>Ngày thử xe:</span>
                    <DottedLineText value={day} className="max-w-[50px]" /> / <DottedLineText value={month} className="max-w-[50px]" /> / <DottedLineText value={year} className="max-w-[80px]" />
                    <span className="ml-8">Loại xe:</span>
                    <DottedLineText value={data.loaiXe} className="max-w-[150px]" />
                    <span className="ml-8">Biển số:</span>
                    <DottedLineText value={data.bienSo} className="max-w-[120px]" />
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
                    <div className="flex items-center gap-2 ml-4">Có <Checkbox checked={data.tuLai === 'co'} /></div>
                    <div className="flex items-center gap-2 ml-4">Không <Checkbox checked={data.tuLai === 'khong'} /></div>
                </div>
                <div className="flex items-center">
                    <span>Giấy phép lái xe của khách hàng số:</span>
                    <DottedLineText value={data.gplxSo} />
                    <span className="ml-8">Hạng:</span>
                    <DottedLineText value={data.gplxHang} className="max-w-[80px]" />
                    <span className="ml-8">Hiệu lực đến:</span>
                    <DottedLineText value={hieuLucGPLXFormatted} className="max-w-[120px]" />
                </div>
                <p className="text-xs italic">(TVBH photo/chụp ảnh và lưu lại 01 bản bằng lái xe của khách hàng)</p>
            </div>

            <table className="w-full border border-gray-800 print:border-gray-400 mt-3 text-sm text-center">
                <thead>
                    <tr className="border-b border-gray-800 print:border-gray-400">
                        <th className="font-normal p-1.5 border-r border-gray-800 print:border-gray-400">Người lập phiếu</th>
                        <th className="font-normal p-1.5 border-r border-gray-800 print:border-gray-400">Người phê duyệt</th>
                        <th className="font-normal p-1.5">Quản lý xe Demo</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style={{ height: '90px' }}>
                        <td className="border-r border-gray-800 print:border-gray-400 align-bottom pb-2 font-semibold"></td>
                        <td className="border-r border-gray-800 print:border-gray-400 align-bottom pb-2 font-semibold"></td>
                        <td className="align-bottom pb-2 font-semibold"></td>
                    </tr>
                </tbody>
            </table>

            {/* This section grows to fill remaining A4 page height */}
            <div className="mt-4 flex-grow flex flex-col">
                <h2 className="font-bold text-center bg-gray-200 print:bg-gray-100 py-1 mb-2">Ý KIẾN KHÁCH HÀNG SAU LÁI THỬ</h2>
                <div className="text-sm flex-grow flex flex-col">
                    <p className="font-bold mb-1.5">Câu hỏi khảo sát</p>
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <span>1. Anh/chị có hài lòng với việc tổ chức lái thử không?</span>
                            <div className="flex gap-4"><div className="flex items-center gap-1"><Checkbox /> Rất hài lòng</div><div className="flex items-center gap-1"><Checkbox /> Hài lòng</div><div className="flex items-center gap-1"><Checkbox /> Không hài lòng</div></div>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>2. Anh/chị có hài lòng với chiếc xe lái thử?</span>
                            <div className="flex gap-4"><div className="flex items-center gap-1"><Checkbox /> Rất hài lòng</div><div className="flex items-center gap-1"><Checkbox /> Hài lòng</div><div className="flex items-center gap-1"><Checkbox /> Không hài lòng</div></div>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>3. Anh/chị có hài lòng với Nhân viên hướng dẫn lái thử xe không?</span>
                            <div className="flex gap-4"><div className="flex items-center gap-1"><Checkbox /> Rất hài lòng</div><div className="flex items-center gap-1"><Checkbox /> Hài lòng</div><div className="flex items-center gap-1"><Checkbox /> Không hài lòng</div></div>
                        </div>
                        <div>
                            <span>4. Những điểm Anh/chị thích ở chiếc xe lái thử:</span>
                            <DottedLineText />
                            <DottedLineText className="block mt-4" />
                        </div>
                        <div>
                            <span>5. Những điểm Anh/chị không thích ở chiếc xe lái thử:</span>
                            <DottedLineText />
                            <DottedLineText className="block mt-4" />
                        </div>
                    </div>

                    <p className="font-bold mt-3 mb-1.5">Thông tin khác</p>
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <span>* Loại xe mà Anh/chị quan tâm:</span>
                            <div className="flex gap-4"><div className="flex items-center gap-1"><Checkbox /> Loại cỡ nhỏ</div><div className="flex items-center gap-1"><Checkbox /> Loại 4 chỗ</div><div className="flex items-center gap-1"><Checkbox /> Loại 7 chỗ</div></div>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>* Thời gian mà Anh/chị muốn sở hữu:</span>
                            <div className="flex gap-4"><div className="flex items-center gap-1"><Checkbox /> Ngay bây giờ</div><div className="flex items-center gap-1"><Checkbox /> Trong 3 tháng tới</div><div className="flex items-center gap-1"><Checkbox /> 6 tháng tới</div><div className="flex items-center gap-1"><Checkbox /> Có thể là năm sau</div></div>
                        </div>
                        <div className="mt-1">
                            <span>* Khoảng tài chính nào theo Anh/chị là hợp lý để đầu tư chiếc xe sắp tới:</span>
                            <div className="flex flex-wrap gap-x-6 gap-y-1 mt-1.5 ml-4">
                                <div className="flex items-center gap-1"><Checkbox /> Từ 300tr-400tr</div>
                                <div className="flex items-center gap-1"><Checkbox /> Từ 400-700tr</div>
                                <div className="flex items-center gap-1"><Checkbox /> Từ 700- 1 tỷ</div>
                                <div className="flex items-center gap-1"><Checkbox /> Từ 1 tỷ - 1,5 tỷ</div>
                                <div className="flex items-center gap-1"><Checkbox /> Từ trên 1,5 tỷ</div>
                            </div>
                        </div>
                    </div>

                    {/* Signature pushed to bottom */}
                    <div className="flex justify-between mt-auto pt-4 text-sm text-center">
                        <div className="w-1/2">
                            <p className="font-bold">Nhân viên hướng dẫn</p>
                            <p className="italic text-xs">(Ký và ghi rõ họ tên)</p>
                            <div className="h-16"></div>
                            <p className="font-bold">{data.tenTuVan}</p>
                        </div>
                        <div className="w-1/2">
                            <p className="font-bold">Khách hàng</p>
                            <p className="italic text-xs">(Ký và ghi rõ họ tên)</p>
                            <div className="h-16"></div>
                            <p className="font-bold uppercase">{data.tenKhachHang}</p>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};

const GiayCamKetPreview: React.FC<PreviewProps> = ({ data }) => {
    const mCamKet = moment(data.ngayCamKet, ["YYYY-MM-DD", "DD/MM/YYYY"]);
    const [year, month, day] = mCamKet.isValid() ? [mCamKet.year().toString(), (mCamKet.month() + 1).toString().padStart(2, '0'), mCamKet.date().toString().padStart(2, '0')] : ['', '', ''];
    return (
        <div className="print-area document-preview is-cam-ket bg-white p-8 border border-gray-400 shadow-lg w-full font-serif text-black" style={{ fontFamily: '"Times New Roman", Times, serif', lineHeight: '1.5' }}>
            <div className="text-center font-bold">
                <p>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                <p>Độc lập - Tự do - Hạnh phúc</p>
            </div>

            <h1 className="text-center font-bold text-base my-3">ĐƠN CHẤP NHẬN MIỄN KHIẾU NẠI & CAM KẾT</h1>
            <p className="text-center font-bold">Kính gửi: Công ty TNHH Minh Đạo Phát</p>

            <div className="grid grid-cols-1 gap-y-3 gap-x-8 text-sm mt-4">
                <div className="flex items-end"><span className="shrink-0">Tôi tên là:</span><DottedLineText value={data.tenKhachHang} /></div>
                <div className="flex items-end"><span className="shrink-0">Địa chỉ:</span><DottedLineText value={data.diaChi} /></div>
                <div className="flex items-end flex-wrap sm:flex-nowrap gap-y-2">
                    <span className="shrink-0">CMND/CCCD:</span><DottedLineText value={data.cmndO} className="max-w-[150px]" />
                    <span className="shrink-0 ml-2">Do:</span><DottedLineText value={data.cmndNoiCap} />
                    <span className="shrink-0 ml-2">Cấp ngày:</span>
                    <DottedLineText value={data.cmndNgayCap ? moment(data.cmndNgayCap).format('DD') : ''} className="max-w-[40px]" /> /
                    <DottedLineText value={data.cmndNgayCap ? moment(data.cmndNgayCap).format('MM') : ''} className="max-w-[40px]" /> /
                    <DottedLineText value={data.cmndNgayCap ? moment(data.cmndNgayCap).format('YYYY') : ''} className="max-w-[60px]" />
                </div>
                <div className="flex items-end flex-wrap sm:flex-nowrap gap-y-2">
                    <span className="shrink-0">Giấy phép lái xe:</span><DottedLineText value={data.gplxSo} />
                    <span className="shrink-0 ml-4">Hiệu lực đến:</span>
                    <DottedLineText value={data.hieuLucGPLX ? moment(data.hieuLucGPLX).format('DD') : ''} className="max-w-[40px]" /> /
                    <DottedLineText value={data.hieuLucGPLX ? moment(data.hieuLucGPLX).format('MM') : ''} className="max-w-[40px]" /> /
                    <DottedLineText value={data.hieuLucGPLX ? moment(data.hieuLucGPLX).format('YYYY') : ''} className="max-w-[60px]" />
                </div>
            </div>

            <p className="text-sm mt-4">Bằng đơn này, tôi tự nguyện đăng ký tham gia lái thử xe: <DottedLineText value={data.loaiXe} className="inline-block min-w-[200px]" /> do Công ty tổ chức tại cơ sở <DottedLineText value={data.coSo || 'VF Minh Đạo Thuận An'} className="inline-block min-w-[150px]" /> và tuân thủ theo những điều khoản sau:</p>

            <div className="space-y-2 text-sm text-justify mt-3 leading-relaxed">
                <p>1. Cung cấp đầy đủ và chịu hoàn toàn mọi trách nhiệm pháp lý về các thông tin, giấy tờ cá nhân theo yêu cầu của công ty và các bên liên quan trong thời gian tham gia chương trình.</p>
                <p>2. Tuyệt đối tuân thủ các điều lệ, nguyên tắc của Luật giao thông đường bộ và xe cơ giới. Đồng thời tuân thủ theo các hướng dẫn của nhân viên hướng dẫn lái thử xe trong khi tham gia lái thử xe, cũng như không được thực hiện bất kỳ hoạt động nào khác không nằm trong chương trình.</p>
                <p>3. Sau khi xem xét và nhận thấy chương trình lái thử xe là an toàn và phù hợp với mục đích của bản thân. Tôi tự nguyện tham gia lái thử xe và chấp nhận mọi nguy cơ gây thương tích có thể xảy ra trong quá trình lái thử xe. Đồng thời, tôi xin chịu trách nhiệm về các tổn thất, hư hỏng gây ra cho xe lái thử cũng như mọi tổn thất về con người và xe của bên thứ 3 có liên quan trong quá trình lái thử xe</p>
                <p>4. Đồng ý miễn truy cứu trách nhiệm cũng như yêu cầu đòi bồi thường từ Công ty và nhân viên trực thuộc Công ty, của các vấn đề có thể phát sinh trực tiếp hoặc gián tiếp trong quá trình diễn ra chương trình lái thử xe, kể cả phát sinh trong trường hợp bất khả kháng (bao gồm nhưng không giới hạn: thiên tai, hỏa hoạn, lũ lụt, khủng bố hay chiến tranh...)</p>
                <p>5. Đơn chấp nhận miễn khiếu nại này sẽ chịu sự ràng buộc của pháp luật Việt Nam và nếu có bất kỳ vấn đề nảy sinh nào thì "Đơn chấp nhận miễn khiếu nại" này sẽ được trình lên cơ quan có thẩm quyền.</p>
            </div>

            <p className="text-center font-bold my-4 text-sm leading-relaxed uppercase">TÔI ĐÃ ĐỌC VÀ HIỂU RÕ NỘI DUNG CỦA "ĐƠN CHẤP NHẬN MIỄN KHIẾU NẠI & CAM KẾT" NÊU TRÊN VÀ TỰ NGUYỆN ĐỒNG Ý RẰNG NHỮNG ĐIỀU KHOẢN NÀY PHÙ HỢP VỚI Ý MUỐN CỦA BẢN THÂN.</p>

            <div className="flex justify-end mt-6">
                <div className="text-center w-64">
                    <p className="italic text-sm">..........., Ngày {day || '.....'} tháng {month || '.....'} năm {year || '.......'}</p>
                    <p className="font-bold mt-2 text-sm">Người Cam Kết</p>
                    <p className="italic text-xs">(ký và ghi rõ họ tên)</p>
                    <div className="h-20"></div>
                    <p className="font-bold text-sm">{data.tenKhachHang}</p>
                </div>
            </div>
        </div>
    );
};

const TestDrivePreview: React.FC<PreviewProps> & {
    PhieuLaiThu: React.FC<PreviewProps>;
    GiayCamKet: React.FC<PreviewProps>;
} = ({ data, hideOnMobile }) => {
    return (
        <main id="print-area-wrapper" className={`print-hidden lg:col-span-3 bg-slate-100 p-4 rounded-lg overflow-y-auto flex-col items-center gap-4 ${hideOnMobile ? 'hidden lg:flex' : 'flex'}`}>
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