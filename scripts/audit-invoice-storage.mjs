// Read-only audit. No writes to Supabase or deletions; report stays in ignored output/.
import fs from 'node:fs/promises';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const env = dotenv.parse(await fs.readFile('.env', 'utf8'));
const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const references = new Map();
const columns = /^(url_|link_)/;
const counts = {};
for (const table of ['yeucauxhd', 'donhang', 'archived_orders']) {
    let offset = 0;
    counts[table] = 0;
    while (true) {
        const { data, error } = await client.from(table).select('*').order('so_don_hang').range(offset, offset + 499);
        if (error) throw new Error(`${table}: ${error.message}`);
        for (const row of data) {
            counts[table]++;
            for (const [field, url] of Object.entries(row)) {
                if (!columns.test(field) || typeof url !== 'string' || !url.startsWith(`${env.VITE_SUPABASE_URL}/storage/v1/object/public/`)) continue;
                if (!references.has(url)) references.set(url, []);
                references.get(url).push({ table, order: row.so_don_hang, field });
            }
        }
        if (data.length < 500) break;
        offset += data.length;
    }
}
const entries = [...references];
const results = [];
let next = 0;
await Promise.all(Array.from({ length: 6 }, async () => {
    while (next < entries.length) {
        const [url, refs] = entries[next++];
        try {
            const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(15000) });
            results.push({ url, refs, status: response.status, ok: response.ok });
        } catch (error) { results.push({ url, refs, status: null, ok: false, error: error.message }); }
    }
}));
const broken = results.filter(result => !result.ok);
const summary = { checkedAt: new Date().toISOString(), counts, uniqueStorageLinks: entries.length,
    brokenLinks: broken.length, affectedOrders: new Set(broken.flatMap(item => item.refs.map(ref => ref.order))).size };
await fs.mkdir('output', { recursive: true });
await fs.writeFile('output/invoice-storage-audit.json', JSON.stringify({ summary, results }, null, 2));
console.log(JSON.stringify(summary, null, 2));
