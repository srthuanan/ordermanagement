/**
 * Website Visit Counter Service
 * Uses Abacus Hit Counter API with session-awareness and localStorage cache
 */

const NAMESPACE = 'srthuanan';
const KEY = 'ordermanagement';
const CACHE_KEY = 'site_total_visits';
const SESSION_FLAG = 'site_visit_hit_recorded';

export const recordAndGetVisitCount = async (): Promise<number> => {
  // 1. Try reading from localStorage first
  let currentCount = 0;
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) currentCount = parseInt(cached, 10) || 0;
  } catch (e) {}

  // 2. Check if we should increment (only once per browser session)
  const hasHitInSession = sessionStorage.getItem(SESSION_FLAG) === 'true';

  try {
    const endpoint = hasHitInSession
      ? `https://abacus.jasoncameron.dev/get/${NAMESPACE}/${KEY}`
      : `https://abacus.jasoncameron.dev/hit/${NAMESPACE}/${KEY}`;

    const res = await fetch(endpoint);
    if (res.ok) {
      const data = await res.json();
      if (typeof data?.value === 'number') {
        sessionStorage.setItem(SESSION_FLAG, 'true');
        localStorage.setItem(CACHE_KEY, String(data.value));
        return data.value;
      }
    }
  } catch (err) {
    console.warn('[VisitCounter] Lỗi tải lượt truy cập:', err);
  }

  return currentCount > 0 ? currentCount : 1;
};

export const getCachedVisitCount = (): number => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? parseInt(cached, 10) || 1 : 1;
  } catch (e) {
    return 1;
  }
};
