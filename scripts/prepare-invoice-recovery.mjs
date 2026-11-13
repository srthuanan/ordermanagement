// Read-only recovery inventory. Credentials and file bodies are never printed.
import fs from 'node:fs/promises';
import os from 'node:os';
const audit = JSON.parse(await fs.readFile('output/invoice-storage-audit.json', 'utf8'));
const token = JSON.parse(await fs.readFile(`${os.homedir()}/.clasprc.json`, 'utf8')).tokens.default;
const authResponse = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body: new URLSearchParams({
    client_id: token.client_id, client_secret: token.client_secret, refresh_token: token.refresh_token, grant_type: 'refresh_token'
}) });
if (!authResponse.ok) throw new Error(`Google authentication failed: ${authResponse.status}`);
const auth = await authResponse.json();
const headers = { Authorization: `Bearer ${auth.access_token}` };
const missing = audit.results.filter(result => !result.ok);
const orders = [...new Set(missing.flatMap(result => result.refs.map(ref => ref.order)))];
const driveFiles = [];
for (let index = 0; index < orders.length; index += 10) {
    const batch = orders.slice(index, index + 10);
    let pageToken = '';
    do {
        const params = new URLSearchParams({ q: `trashed = false and mimeType != 'application/vnd.google-apps.folder' and (${batch.map(order => `name contains '${order.replace(/'/g, "\\'")}'`).join(' or ')})`,
            pageSize: '1000', fields: 'files(id,name,mimeType,size,createdTime,permissions(type,role)),nextPageToken' });
        if (pageToken) params.set('pageToken', pageToken);
        const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, { headers });
        if (!response.ok) throw new Error(`Drive inventory failed: ${response.status}`);
        const body = await response.json(); driveFiles.push(...body.files); pageToken = body.nextPageToken || '';
    } while (pageToken);
}
const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/Đ/g, 'D').toUpperCase();
const prefixes = { url_hop_dong: 'HDMB - ', url_de_nghi_xhd: 'DNXHD - ', url_hoa_don_da_xuat: 'HOA DON - ', url_cam_ket_vtlx: 'CAM KET VTLX - ', url_cavet_vtlx: 'CA VET XE CU - ' };
const plan = missing.map(result => {
    const ref = result.refs[0];
    const prefix = prefixes[ref.field];
    const candidates = driveFiles.filter(file => prefix && normalize(file.name).startsWith(prefix)
        && (file.name.includes(` - ${ref.order}.`) || file.name.includes(` - ${ref.order} - `)));
    return { ...result, candidates, recoverable: candidates.length === 1 };
});
await fs.writeFile('output/invoice-recovery-plan.json', JSON.stringify({ generatedAt: new Date().toISOString(), plan }, null, 2));
console.log(JSON.stringify({ missing: plan.length, recoverable: plan.filter(item => item.recoverable).length,
    ambiguous: plan.filter(item => item.candidates.length > 1).length, noCopy: plan.filter(item => !item.candidates.length).length }, null, 2));
