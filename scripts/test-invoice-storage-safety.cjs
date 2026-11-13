const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const fields = ['url_hop_dong', 'url_de_nghi_xhd', 'url_hoa_don_da_xuat', 'url_cam_ket_vtlx', 'url_cavet_vtlx'];
function archive(options = {}) {
    const calls = [], copies = [];
    const record = { so_don_hang: 'ORDER_1', ten_khach_hang: 'Customer', ...Object.fromEntries(fields.map((key, i) => [key, `https://test.supabase.co/storage/v1/object/public/yeucauxhd-files/ORDER_1/${key}.${i === 3 ? 'jpg' : 'pdf'}`])) };
    const response = (code, body) => ({ getResponseCode: () => code, getContentText: () => JSON.stringify(body), getBlob: () => ({ setName(name) { this.name = name; return this; }, getBytes: () => [1, 2, 3] }) });
    const folder = { createFile(blob) { copies.push(blob.name); return { setSharing() { if (options.sharingFailure) throw Error('sharing failed'); }, getSize: () => options.corrupt ? 1 : 3, getId: () => `file-${copies.length}` }; } };
    const context = vm.createContext({ SUPABASE_URL: 'https://test.supabase.co', DriveApp: { Access: { ANYONE_WITH_LINK: 'link' }, Permission: { VIEW: 'view' } }, logAction() {}, UrlFetchApp: { fetch(url, request = {}) {
        calls.push({ url, ...request });
        if (request.method === 'DELETE') throw Error('Unexpected deletion');
        if (request.method === 'PATCH') return response(options.patchFailure ? 500 : 200, options.conflict ? [] : [record]);
        if (url.includes('/rest/v1/yeucauxhd')) return response(200, [record]);
        if (url.includes('/rest/v1/donhang')) return response(200, [{ ket_qua: options.status || 'Chờ ký hóa đơn' }]);
        return response(options.missing && url.includes(options.missing) ? 404 : 200, {});
    } } });
    vm.runInContext(fs.readFileSync('backend-gas/04_maintenance.js', 'utf8'), context);
    context._getOrCreateSubFolder = () => folder;
    return { result: context._processSingleOrder('test-key', 'ORDER_1', folder), calls, copies };
}
test('archive copies all five documents, preserves JPG and never deletes source or versions', () => {
    const { result, calls, copies } = archive();
    assert.equal(result.status, 'SUCCESS');
    assert.equal(copies.length, 5);
    assert.ok(copies.some(name => name.endsWith('.jpg')));
    const patches = calls.filter(call => call.method === 'PATCH');
    assert.equal(patches.length, 6);
    assert.equal(Object.keys(JSON.parse(patches[0].payload)).length, 5);
    assert.ok(patches.every(call => call.url.includes('=eq.https')));
    assert.ok(calls.every(call => call.method !== 'DELETE' && !call.url.includes('/object/list/')));
});
for (const [name, options] of Object.entries({ 'missing VTLX file': { missing: 'url_cam_ket_vtlx' }, 'database write failure': { patchFailure: true }, 'concurrent upload': { conflict: true }, 'sharing failure': { sharingFailure: true }, 'corrupt Drive copy': { corrupt: true } })) {
    test(`archive reports ${name} and retains all sources`, () => {
        const { result, calls } = archive(options);
        assert.equal(result.status, 'ERROR');
        assert.ok(calls.every(call => call.method !== 'DELETE'));
        if (options.sharingFailure || options.corrupt) assert.equal(calls.filter(call => call.method === 'PATCH').length, 0);
    });
}
test('unapproved orders stay in Supabase', () => {
    const { result, copies } = archive({ status: 'Chờ phê duyệt' });
    assert.equal(result.status, 'SKIP'); assert.equal(copies.length, 0);
});

function supplement(options = {}) {
    const writes = [], uploads = [], notices = [];
    const existing = { ten_khach_hang: 'Customer', tvbh: 'Consultant', url_cam_ket_vtlx: 'old.jpg', url_cavet_vtlx: 'old.pdf' };
    const client = { from(table) {
        let writing = false;
        const query = { select() { return query; }, eq() { return query; }, update(data) { writing = true; writes.push({ table, data }); return query; },
            async maybeSingle() { return { data: { ket_qua: 'Chờ ký hóa đơn' }, error: null }; },
            async single() { return { data: writing ? { so_don_hang: 'ORDER' } : existing, error: (writing && options.failTable === table) || (!writing && options.readFailure) ? { message: 'write/read failed' } : null }; }
        }; return query;
    }, storage: { from() { return { remove() { throw Error('Old file deletion'); } }; } }, functions: { invoke: async () => ({ error: null }) } };
    const exports = {};
    const context = vm.createContext({ exports, console: { log() {}, warn() {}, error() {} }, crypto: require('node:crypto').webcrypto, require(path) {
        if (path === '../supabaseClient') return { supabase: client, supabaseAdmin: client };
        if (path === './baseService') return { uploadToSupabase: async (_, path) => { uploads.push(path); if (options.uploadFailure) throw Error('upload failed'); return `https://storage/${path}`; }, logAction: async () => {} };
        if (path === './notificationService') return { createNotification: async (notice) => notices.push(notice) };
        return {};
    } });
    vm.runInContext(ts.transpileModule(fs.readFileSync('services/api/invoiceService.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, context);
    return { run: () => exports.uploadSupplementaryFiles('ORDER', null, null, undefined, { vtlxData: { camKetFile: { name: 'commitment.jpg' }, cavetFile: { name: 'registration.pdf' } } }), writes, uploads, notices };
}
test('supplement publishes both URLs after upload without deleting old files', async () => {
    const fixture = supplement(); const result = await fixture.run();
    assert.equal(result.status, 'SUCCESS'); assert.equal(fixture.uploads.length, 2);
    assert.ok(fixture.uploads.every(path => path.startsWith('invoice-documents/ORDER/')));
    assert.equal(fixture.writes.length, 2);
    for (const write of fixture.writes) assert.ok(write.data.url_cam_ket_vtlx && write.data.url_cavet_vtlx);
});
for (const [name, options] of Object.entries({ 'upload failure': { uploadFailure: true }, 'read failure': { readFailure: true }, 'invoice write failure': { failTable: 'yeucauxhd' }, 'order sync failure': { failTable: 'donhang' } })) {
    test(`supplement does not report success after ${name}`, async () => {
        const fixture = supplement(options);
        await assert.rejects(fixture.run()); assert.equal(fixture.notices.length, 0);
        if (options.uploadFailure || options.readFailure) assert.equal(fixture.writes.length, 0);
        if (options.failTable === 'yeucauxhd') assert.equal(fixture.writes.length, 1);
    });
}
