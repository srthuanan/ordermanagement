import React, { useMemo } from 'react';
import ribbon29Img from '../../pictures/ribbon_2_9.webp';
import ribbonTetImg from '../../pictures/ribbon_tet.webp';
import ribbonChristmasImg from '../../pictures/ribbon_christmas.webp';
import ribbon304Img from '../../pictures/ribbon_30_4.webp';
import ribbonNewYearImg from '../../pictures/ribbon_new_year.webp';
import ribbonWomenDayImg from '../../pictures/ribbon_women_day.webp';
import ribbonTrungThuImg from '../../pictures/ribbon_trung_thu.webp';

export type HolidaySeason = 
  | 'NONE'
  | 'NATIONAL_DAY'      // Quốc Khánh 2/9 (từ 15/08 đến 10/09)
  | 'LUNAR_NEW_YEAR'    // Tết Nguyên Đán (từ 15/01 đến 15/02)
  | 'CHRISTMAS'         // Giáng Sinh (từ 15/12 đến 26/12)
  | 'NEW_YEAR'          // Tết Dương Lịch (từ 27/12 đến 05/01)
  | 'REUNIFICATION_DAY' // 30/4 & 1/5 (từ 24/04 đến 04/05)
  | 'WOMEN_DAY'         // 8/3 & 20/10
  | 'MID_AUTUMN';       // Trung Thu

interface HolidayConfig {
  season: HolidaySeason;
  ribbonText: string;
  imgSrc: string;
  altText: string;
}

const HOLIDAY_CONFIGS: Record<HolidaySeason, HolidayConfig | null> = {
  NONE: null,
  NATIONAL_DAY: {
    season: 'NATIONAL_DAY',
    ribbonText: '★ 2/9 QUỐC KHÁNH • ĐỘC LẬP & TỰ DO ★',
    imgSrc: ribbon29Img,
    altText: '2/9 Quốc Khánh'
  },
  LUNAR_NEW_YEAR: {
    season: 'LUNAR_NEW_YEAR',
    ribbonText: '🧧 CHÚC MỪNG NĂM MỚI 🧧',
    imgSrc: ribbonTetImg,
    altText: 'Chúc Mừng Năm Mới'
  },
  CHRISTMAS: {
    season: 'CHRISTMAS',
    ribbonText: '🎄 MERRY CHRISTMAS 🎄',
    imgSrc: ribbonChristmasImg,
    altText: 'Giáng Sinh Merry Christmas'
  },
  NEW_YEAR: {
    season: 'NEW_YEAR',
    ribbonText: '✨ HAPPY NEW YEAR ✨',
    imgSrc: ribbonNewYearImg,
    altText: 'Happy New Year'
  },
  REUNIFICATION_DAY: {
    season: 'REUNIFICATION_DAY',
    ribbonText: '★ 30/4 & 1/5 ★',
    imgSrc: ribbon304Img,
    altText: '30/4 & 1/5 Giải Phóng'
  },
  WOMEN_DAY: {
    season: 'WOMEN_DAY',
    ribbonText: '🌸 8/3 & 20/10 🌸',
    imgSrc: ribbonWomenDayImg,
    altText: 'Chúc Mừng Ngày Phụ Nữ'
  },
  MID_AUTUMN: {
    season: 'MID_AUTUMN',
    ribbonText: '🥮 TẾT TRUNG THU 🥮',
    imgSrc: ribbonTrungThuImg,
    altText: 'Tết Trung Thu'
  }
};

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

  // 7. Trung Thu (tháng 9 dương lịch từ 15/09 đến 25/09)
  if (m === 8 && d >= 15 && d <= 25) {
    return 'MID_AUTUMN';
  }

  return 'NONE';
};

interface HolidayThemeDecoratorProps {
  isLoggedIn?: boolean;
  position?: 'left' | 'right';
}

export const HolidayThemeDecorator: React.FC<HolidayThemeDecoratorProps> = ({ isLoggedIn = false, position }) => {
  const currentSeason = useMemo(() => detectCurrentHolidaySeason(), []);
  const activeConfig = useMemo(() => HOLIDAY_CONFIGS[currentSeason], [currentSeason]);

  const side = position || (isLoggedIn ? 'right' : 'left');

  if (!activeConfig) return null;

  const isLeft = side === 'left';

  return (
    <div
      className={`fixed top-0 ${isLeft ? 'left-0' : 'right-0'} w-[195px] sm:w-[220px] md:w-[245px] h-[155px] sm:h-[175px] md:h-[195px] overflow-hidden z-[99999] select-none pointer-events-none`}
    >
      <div
        title={activeConfig.ribbonText}
        className={`absolute top-[26px] sm:top-[30px] md:top-[34px] ${
          isLeft 
            ? '-left-[44px] sm:-left-[50px] md:-left-[56px] -rotate-[37deg]' 
            : '-right-[44px] sm:-right-[50px] md:-right-[56px] rotate-[37deg]'
        } w-[245px] sm:w-[275px] md:w-[305px] flex items-center justify-center transition-transform hover:scale-105 active:scale-95 duration-200 pointer-events-auto select-none`}
      >
        <img
          src={activeConfig.imgSrc}
          alt={activeConfig.altText}
          className="w-full h-auto drop-shadow-md select-none pointer-events-none"
        />
      </div>
    </div>
  );
};

export default HolidayThemeDecorator;
