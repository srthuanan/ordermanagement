import { createClient } from '@supabase/supabase-js';

const url = 'https://jwvgxqrkjlbewvpkvucj.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dmd4cXJramxiZXd2cGt2dWNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUyNTUyNywiZXhwIjoyMDg4MTAxNTI3fQ.R8XaLf9RuB9ICMM3Uti4faIOgN0Beui9pxh-Vy-t4rU';

const supabaseAdmin = createClient(url, key);

async function run() {
    const { data: archived } = await supabaseAdmin.from('archived_orders').select('so_don_hang');
    if (!archived || archived.length === 0) {
        console.log("No archived orders to clean.");
        return;
    }

    console.log(`Found ${archived.length} archived orders. Checking folders...`);
    let deletedCount = 0;

    for (let i = 0; i < archived.length; i++) {
        const folderPath = archived[i].so_don_hang;
        const { data: files, error: listErr } = await supabaseAdmin.storage.from('yeucauxhd-files').list(folderPath);

        if (listErr) {
            console.error(`Error listing ${folderPath}:`, listErr.message);
            continue;
        }

        if (files && files.length > 0) {
            // list() often returns a .emptyFolderPlaceholder if it's empty, or actual files
            const toDelete = files.map(f => `${folderPath}/${f.name}`);
            const { error: delErr } = await supabaseAdmin.storage.from('yeucauxhd-files').remove(toDelete);
            if (delErr) {
                console.error(`Error deleting files in ${folderPath}:`, delErr.message);
            } else {
                deletedCount += toDelete.length;
                console.log(`Deleted ${toDelete.length} files from ${folderPath}`);
            }
        }
    }

    console.log(`Cleanup complete. Total files deleted from storage: ${deletedCount}`);
}

run();
