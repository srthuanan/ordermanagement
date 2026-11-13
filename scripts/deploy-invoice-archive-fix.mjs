// Surgical Apps Script release; preserves both the active version and newer editor changes.
// Default prepares only. --apply publishes the verified candidate to the existing deployment.
import fs from 'node:fs/promises';
import os from 'node:os';
import vm from 'node:vm';

const directory = 'output/gas-before-fix';
const { project, active } = JSON.parse(await fs.readFile(`${directory}/active-deployment.json`, 'utf8'));
const originalHead = JSON.parse(await fs.readFile(`${directory}/content.json`, 'utf8'));
const originalActive = JSON.parse(await fs.readFile(`${directory}/active-content.json`, 'utf8'));
const maintenance = await fs.readFile('backend-gas/04_maintenance.js', 'utf8');
const main = await fs.readFile('backend-gas/01_main.js', 'utf8');
function patch(content) {
    const files = content.files.map(file => ({ ...file }));
    const target = files.find(file => file.name === '04_maintenance');
    const start = target.source.indexOf('function _processSingleOrder(');
    const end = target.source.indexOf('function _getOrCreateSubFolder(', start);
    if (start < 0 || end < 0) throw new Error('Unknown archive function boundaries');
    target.source = target.source.slice(0, start) + maintenance.slice(maintenance.indexOf('function _processSingleOrder('), maintenance.indexOf('function _getOrCreateSubFolder(')) + target.source.slice(end);
    const router = files.find(file => file.name === '01_main');
    const from = router.source.indexOf("      case 'archiveOrderNow':");
    const to = router.source.indexOf("      case 'performOcr':", from);
    if (from < 0 || to < 0) throw new Error('Unknown router boundaries');
    router.source = router.source.slice(0, from) + main.slice(main.indexOf("      case 'archiveOrderNow':"), main.indexOf("      case 'performOcr':")) + router.source.slice(to);
    for (const file of files) if (file.type === 'SERVER_JS') new vm.Script(file.source, { filename: file.name });
    return { files: files.map(({ name, type, source }) => ({ name, type, source })) };
}
const candidate = patch(originalActive);
const patchedHead = patch(originalHead);
await fs.writeFile(`${directory}/release-candidate.json`, JSON.stringify(candidate, null, 2));
if (!process.argv.includes('--apply')) {
    console.log('Prepared syntax-checked archive fix. Only 01_main and 04_maintenance change in production.');
    process.exit(0);
}
const token = JSON.parse(await fs.readFile(`${os.homedir()}/.clasprc.json`, 'utf8')).tokens.default;
const authResponse = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body: new URLSearchParams({ client_id: token.client_id,
    client_secret: token.client_secret, refresh_token: token.refresh_token, grant_type: 'refresh_token' }) });
if (!authResponse.ok) throw new Error(`Authentication failed (${authResponse.status})`);
const auth = await authResponse.json();
const headers = { Authorization: `Bearer ${auth.access_token}`, 'Content-Type': 'application/json' };
async function api(path, method = 'GET', body) {
    const response = await fetch(`https://script.googleapis.com/v1/projects/${project.id}/${path}`, { method, headers, body: body && JSON.stringify(body) });
    if (!response.ok) throw new Error(`Apps Script ${method} ${path}: HTTP ${response.status}`);
    return response.json();
}
const fingerprint = content => JSON.stringify(content.files.map(({ name, type, source }) => ({ name, type, source })).sort((a, b) => a.name.localeCompare(b.name)));
const currentHead = fingerprint(await api('content'));
if (currentHead !== fingerprint(originalHead) && currentHead !== fingerprint(patchedHead)) throw new Error('Editor changed since backup; refresh backup before deploying.');
const deployed = await api(`deployments/${active.deploymentId}`);
if (deployed.deploymentConfig.versionNumber !== active.deploymentConfig.versionNumber) throw new Error('Active deployment changed; refresh backup.');
let version;
try {
    await api('content', 'PUT', candidate);
    if (fingerprint(await api('content')) !== fingerprint(candidate)) throw new Error('Candidate read-back mismatch');
    version = await api('versions', 'POST', { description: 'Prevent invoice/VTLX source deletion and verify archive writes' });
} finally {
    // Keep newer editor-only work (e.g. 05_sync) out of this production version.
    await api('content', 'PUT', patchedHead);
}
await api(`deployments/${active.deploymentId}`, 'PUT', { deploymentConfig: {
    ...active.deploymentConfig, versionNumber: version.versionNumber, description: 'Fix invoice/VTLX archive data loss; retain source files'
} });
const verified = await api(`deployments/${active.deploymentId}`);
if (verified.deploymentConfig.versionNumber !== version.versionNumber) throw new Error('Deployment verification failed');
await fs.writeFile(`${directory}/deployed-fix.json`, JSON.stringify({ previousVersion: active.deploymentConfig.versionNumber, version: version.versionNumber, verified }, null, 2));
console.log(`Verified archive fix deployed: version ${active.deploymentConfig.versionNumber} -> ${version.versionNumber}. Previous version backed up.`);
