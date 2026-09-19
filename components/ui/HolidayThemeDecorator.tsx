import React from 'react';

export type HolidaySeason = 
  | 'NONE'
  | 'NATIONAL_DAY'      // Quốc Khánh 2/9 (từ 15/08 đến 10/09)
  | 'LUNAR_NEW_YEAR'    // Tết Nguyên Đán (từ 15/01 đến 15/02)
  | 'CHRISTMAS'         // Giáng Sinh (từ 15/12 đến 26/12)
  | 'NEW_YEAR'          // Tết Dương Lịch (từ 27/12 đến 05/01)
  | 'REUNIFICATION_DAY' // 30/4 & 1/5 (từ 24/04 đến 04/05)
  | 'WOMEN_DAY'         // 8/3 & 20/10
  | 'MID_AUTUMN';       // Trung Thu

export const detectCurrentHolidaySeason = (): HolidaySeason => {
  const now = new Date();
  const m = now.getMonth(); // 0 = Jan, 1 = Feb, ... 11 = Dec
  const d = now.getDate();

  // 1. Quốc Khánh 2/9: từ 25/08 đến 03/09 (Tháng 8 là m=7, Tháng 9 là m=8)
  if ((m === 7 && d >= 25) || (m === 8 && d <= 3)) {
    return 'NATIONAL_DAY';
  }

  // 2. Giáng Sinh: từ 15/12 đến 26/12
  if (m === 11 && d >= 15 && d <= 26) {
    return 'CHRISTMAS';
  }

  // 3. Tết Dương Lịch: từ 27/12 đến 05/01
  if ((m === 11 && d >= 27) || (m === 0 && d <= 5)) {
    return 'NEW_YEAR';
  }

  // 4. Tết Nguyên Đán: từ 15/01 đến 15/02 (ước lượng theo lịch Dương)
  if ((m === 0 && d >= 15) || (m === 1 && d <= 15)) {
    return 'LUNAR_NEW_YEAR';
  }

  // 5. Giải Phóng 30/4 & 1/5: từ 24/04 đến 04/05
  if ((m === 3 && d >= 24) || (m === 4 && d <= 4)) {
    return 'REUNIFICATION_DAY';
  }

  // 6. Phụ nữ Việt Nam 20/10: từ 15/10 đến 21/10 hoặc 8/3: từ 05/03 đến 09/03
  if ((m === 9 && d >= 15 && d <= 21) || (m === 2 && d >= 5 && d <= 9)) {
    return 'WOMEN_DAY';
  }

  // 7. Trung Thu (từ 04/09 đến 08/10)
  if (isMidAutumnSeason(now)) {
    return 'MID_AUTUMN';
  }

  return 'NONE';
};

/**
 * Kiểm tra xem thời điểm hiện tại có đang trong mùa Tết Trung Thu hay không.
 * Mùa Trung Thu kéo dài từ sau Quốc Khánh (04/09) đến hết rằm tháng Tám âm lịch (khoảng 08/10).
 * Sau thời gian này sẽ tự động kết thúc và hoàn về trạng thái bình thường.
 */
export const isMidAutumnSeason = (customDate?: Date): boolean => {
  const now = customDate || new Date();
  const m = now.getMonth(); // 0 = Jan, 8 = Sep, 9 = Oct
  const d = now.getDate();
  return (m === 8 && d >= 4) || (m === 9 && d <= 8);
};

interface HolidayThemeDecoratorProps {
  isLoggedIn?: boolean;
  position?: 'left' | 'right';
}

export const HolidayThemeDecorator: React.FC<HolidayThemeDecoratorProps> = () => {
  // Đã xóa toàn bộ dải ruy băng theo yêu cầu
  return null;
};

export default HolidayThemeDecorator;
