import { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';

// Check our own public storage only; third-party previews have different CORS/auth rules.
export function useStorageDocumentStatus(url: string) {
    const [attempt, setAttempt] = useState(0);
    const [result, setResult] = useState({ url: '', attempt: -1, error: '', loading: false });
    const base = supabase.storage.from('yeucauxhd-files').getPublicUrl('').data.publicUrl;
    const isStorage = Boolean(url && url.startsWith(base));
    useEffect(() => {
        if (!isStorage) return;
        const controller = new AbortController();
        let active = true;
        const timeout = setTimeout(() => controller.abort(), 15000);
        setResult({ url, attempt, error: '', loading: true });
        fetch(url, { method: 'HEAD', cache: 'no-store', signal: controller.signal })
            .then(response => {
                if (!response.ok) throw new Error(
                    response.status === 400 || response.status === 404
                        ? 'Không tìm thấy tệp tại đường dẫn đã lưu. Vui lòng kiểm tra bản sao lưu hoặc bổ sung lại hồ sơ.'
                        : 'Không truy cập được tệp. Vui lòng kiểm tra quyền truy cập và thử lại.'
                );
                if (active) setResult({ url, attempt, error: '', loading: false });
            })
            .catch(error => {
                if (active) setResult({ url, attempt, error: error.name === 'AbortError'
                    ? 'Kiểm tra tệp quá thời gian. Vui lòng thử lại.'
                    : error.message || 'Không kiểm tra được tệp. Vui lòng thử lại.', loading: false });
            })
            .finally(() => clearTimeout(timeout));
        return () => { active = false; clearTimeout(timeout); controller.abort(); };
    }, [url, attempt, isStorage]);
    const current = result.url === url && result.attempt === attempt;
    return {
        loading: isStorage && (!current || result.loading),
        error: isStorage && current ? result.error : '',
        retry: () => setAttempt(value => value + 1)
    };
}
