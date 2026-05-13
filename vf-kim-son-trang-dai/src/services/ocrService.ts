declare global {
  interface Window {
    Tesseract?: any;
  }
}

const parseAndValidateDate = (
  dayStr: string,
  monthStr: string,
  yearStr: string,
  hourStr?: string,
  minuteStr?: string,
  secondStr?: string
): string | null => {
  const day = parseInt(dayStr?.trim(), 10);
  let month = -1;
  let year = parseInt(yearStr?.trim(), 10);
  const hour = parseInt(hourStr?.trim() || '00', 10);
  const minute = parseInt(minuteStr?.trim() || '00', 10);
  const second = parseInt(secondStr?.trim() || '00', 10);

  if (Number.isNaN(day) || Number.isNaN(year) || Number.isNaN(hour) || Number.isNaN(minute) || Number.isNaN(second)) {
    return null;
  }

  const monthText = monthStr?.trim().toLowerCase().replace(/[.,]/g, '');
  const monthMap: Record<string, number> = {
    '1': 1, 'tháng 1': 1, 'thg 1': 1, 't1': 1, jan: 1, january: 1,
    '2': 2, 'tháng 2': 2, 'thg 2': 2, 't2': 2, feb: 2, february: 2,
    '3': 3, 'tháng 3': 3, 'thg 3': 3, 't3': 3, mar: 3, march: 3,
    '4': 4, 'tháng 4': 4, 'thg 4': 4, 't4': 4, apr: 4, april: 4,
    '5': 5, 'tháng 5': 5, 'thg 5': 5, 't5': 5, may: 5,
    '6': 6, 'tháng 6': 6, 'thg 6': 6, 't6': 6, jun: 6, june: 6,
    '7': 7, 'tháng 7': 7, 'thg 7': 7, 't7': 7, jul: 7, july: 7,
    '8': 8, 'tháng 8': 8, 'thg 8': 8, 't8': 8, aug: 8, august: 8,
    '9': 9, 'tháng 9': 9, 'thg 9': 9, 't9': 9, sep: 9, september: 9,
    '10': 10, 'tháng 10': 10, 'thg 10': 10, 't10': 10, oct: 10, october: 10,
    '11': 11, 'tháng 11': 11, 'thg 11': 11, 't11': 11, nov: 11, november: 11,
    '12': 12, 'tháng 12': 12, 'thg 12': 12, 't12': 12, dec: 12, december: 12
  };

  const sortedKeys = Object.keys(monthMap).sort((a, b) => b.length - a.length);
  const foundMonthKey = sortedKeys.find((key) => monthText.includes(key));

  if (foundMonthKey) {
    month = monthMap[foundMonthKey];
  } else {
    const monthNum = parseInt(monthText, 10);
    if (!Number.isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
      month = monthNum;
    } else {
      return null;
    }
  }

  if (year < 100) {
    const currentYear = new Date().getFullYear();
    const currentCentury = Math.floor(currentYear / 100) * 100;
    year += currentCentury;
    if (year > currentYear + 5) year -= 100;
  }

  if (
    year < 2000 ||
    year > new Date().getFullYear() + 5 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    second < 0 ||
    second > 59
  ) {
    return null;
  }

  const testDate = new Date(year, month - 1, day, hour, minute, second);
  if (testDate.getFullYear() !== year || testDate.getMonth() !== month - 1 || testDate.getDate() !== day) {
    return null;
  }

  const pad = (num: number) => num.toString().padStart(2, '0');
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}`;
};

export const extractDepositDateFromImage = async (
  file: File,
  onProgress: (status: string) => void
): Promise<string | null> => {
  if (!window.Tesseract) {
    throw new Error('Thư viện Tesseract OCR chưa tải xong. Vui lòng refresh trang rồi thử lại.');
  }

  try {
    onProgress('Đang xử lý OCR...');
    const { data: { text } } = await window.Tesseract.recognize(file, 'vie+eng', {
      logger: (message: any) => {
        if (message.status === 'recognizing text') {
          onProgress(`Đang xử lý OCR... ${Math.round((message.progress || 0) * 100)}%`);
        }
      }
    });
    onProgress('Đang đọc ngày cọc...');

    let cleanedText = text.replace(/\n+/g, ' ');
    cleanedText = cleanedText.replace(/(\d{1,2})\s*(giờ|h|hr|g)\s*(\d{1,2})\s*(?:phút|phut|ph|p|min|m)?\s*(?:(\d{1,2})\s*(?:giây|giay|s|sec)?)?/gi, (_match: string, h: string, _hourWord: string, m: string, s: string) => `${h}:${m}${s ? ':' + s : ''}`);
    cleanedText = cleanedText.replace(/(\d{1,2})\s*(?:giờ|h|hr|g)\s*(\d{1,2})(?!\s*(?:phút|phut|ph|p|min|m))/gi, '$1:$2');
    cleanedText = cleanedText.replace(/(\d{1,2})\s*(phút|phut|ph|p|min|m)\s*(\d{1,2})/gi, '$1:$2');
    cleanedText = cleanedText.replace(/(\d{1,2})\s*:\s*(\d{1,2})\s*(?:phút|phut|ph|p|min|m)/gi, '$1:$2');
    cleanedText = cleanedText.replace(/\s*:\s*/g, ':').replace(/\s*-\s*/g, '-').replace(/\s*\/\s*/g, '/').replace(/\s*\.\s*/g, '.');
    cleanedText = cleanedText.replace(/[\u200B-\u200D\uFEFF]/g, '');

    let extractedDateTime: string | null = null;
    let bestMatchScore = -1;

    const monthTextRegexPart = `(?:tháng|thg|t|Tháng|Thg\\.?|T\\.)?\\s*\\d{1,2}[\\.,]{0,2}|[A-Za-zÀ-ỹ]{3,}`;
    const dateSeparatorRegexPart = `[\\s\\/\\.-]+`;

    const patternsWithParsers = [
      {
        regex: new RegExp(`(\\d{1,2})\\/(\\d{1,2})\\/(\\d{4})\\s+(\\d{1,2}):(\\d{1,2}):(\\d{1,2})`, 'i'),
        parser: (m: RegExpMatchArray) => ({ day: m[1], month: m[2], year: m[3], hour: m[4], minute: m[5], second: m[6] }),
        score: 20
      },
      {
        regex: new RegExp(`(\\d{1,2})\\/(\\d{1,2})\\/(\\d{4})\\s+(\\d{1,2}):(\\d{1,2})`, 'i'),
        parser: (m: RegExpMatchArray) => ({ day: m[1], month: m[2], year: m[3], hour: m[4], minute: m[5], second: '00' }),
        score: 15
      },
      {
        regex: new RegExp(`(\\d{1,2})${dateSeparatorRegexPart}(${monthTextRegexPart})${dateSeparatorRegexPart}(\\d{2,4})`, 'i'),
        parser: (m: RegExpMatchArray) => ({ day: m[1], month: m[2], year: m[3], hour: '00', minute: '00', second: '00' }),
        score: 10
      }
    ];

    for (const item of patternsWithParsers) {
      let match;
      const globalRegex = new RegExp(item.regex.source, item.regex.flags + (item.regex.flags.includes('g') ? '' : 'g'));
      while ((match = globalRegex.exec(cleanedText)) !== null) {
        const components = item.parser(match);
        const candidate = parseAndValidateDate(
          components.day,
          components.month,
          components.year,
          components.hour,
          components.minute,
          components.second
        );
        if (candidate && item.score > bestMatchScore) {
          bestMatchScore = item.score;
          extractedDateTime = candidate;
        }
      }
    }

    return extractedDateTime ? extractedDateTime.slice(0, 10) : null;
  } catch (error) {
    console.error('Lỗi OCR:', error);
    throw new Error('Xử lý ảnh OCR thất bại.');
  }
};
