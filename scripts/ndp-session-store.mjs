import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
const ACCOUNT = '0925821888';
export function sessionClaims(token) {
    if (typeof token !== 'string' || token.length > 12000 || token.split('.').length !== 3) throw new Error('Mã truy cập NDP không hợp lệ.');
    let claims;
    try { claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8')); } catch { throw new Error('Mã truy cập NDP không hợp lệ.'); }
    if (claims.username !== ACCOUNT || !claims.permissions?.includes('capability:vhkd_01') || !claims.dealerCodes?.includes('N31913')) throw new Error('Cần phiên NDP VHKD_01 của Hoàng Thị Hạnh, đại lý N31913.');
    if (!Number.isFinite(claims.exp) || claims.exp * 1000 < Date.now() + 15000) throw new Error('Mã NDP đã hết hạn hoặc sắp hết hạn; chờ NDP gia hạn.');
    return claims;
}
export function allowedSessionRequest(remote, origin) {
    return ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remote) && /^chrome-extension:\/\/[a-p]{32}$/.test(origin || '');
}
export async function sessionStatus(directory) {
    try {
        const config = JSON.parse(await fs.readFile(path.join(directory,'ndp_token_config.json'),'utf8'));
        const claims = sessionClaims(config.accessToken);
        return {success:true, connected:true, expiresAt:new Date(claims.exp*1000).toISOString(), updatedAt:config.updatedAt || null};
    } catch { return {success:true, connected:false, message:'Mở NDP và giữ tiện ích đồng bộ phiên hoạt động.'}; }
}
let saveQueue = Promise.resolve();
export function saveNdpSession(directory, payload, fetcher = fetch) {
    const save = async () => {
        const token = payload?.accessToken;
        const claims = sessionClaims(token);
        const file = path.join(directory,'ndp_token_config.json');
        let current = {};
        try { current = JSON.parse(await fs.readFile(file,'utf8')); } catch {}
        let previous;
        try { previous = sessionClaims(current.accessToken); } catch {}
        if (previous && previous.exp > claims.exp) return {success:true, synced:true, ignoredOlder:true, expiresAt:new Date(previous.exp*1000).toISOString()};
        if (previous && current.accessToken === token) return {success:true, synced:true, expiresAt:new Date(claims.exp*1000).toISOString()};
        // JWT decoding is not verification: NDP must validate the token before we persist it.
        const response = await fetcher('https://dealer-portal-api.vinfast.com/api/users/profile', {
            headers:{Authorization:'Bearer '+token,'x-market':'VN','x-active-capability':'capability:vhkd_01'}, signal:AbortSignal.timeout(8000)
        });
        if (!response.ok) throw new Error('NDP không xác nhận phiên đăng nhập (HTTP '+response.status+').');
        const body = await response.json();
        const user = body.data || body;
        if (user.username !== ACCOUNT || user.id !== claims.sub) throw new Error('Thông tin tài khoản NDP không khớp; giữ nguyên phiên đã lưu.');
        const temp = file + '.' + crypto.randomUUID() + '.tmp';
        try {
            await fs.writeFile(temp,JSON.stringify({accessToken:token,activeCapability:'capability:vhkd_01',market:'VN',username:ACCOUNT,dealerCodes:['N31913'],updatedAt:new Date().toISOString(),source:'ndp-extension'},null,2),{mode:0o600});
            await fs.rename(temp,file);
        } finally { await fs.unlink(temp).catch(()=>{}); }
        return {success:true,synced:true,expiresAt:new Date(claims.exp*1000).toISOString()};
    };
    const result = saveQueue.then(save,save);
    saveQueue = result.catch(()=>{});
    return result;
}
