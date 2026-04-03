import * as fs from 'fs';
import * as path from 'path';

const content = fs.readFileSync(path.join(process.cwd(), 'supabase', 'migrations', '00000000000000_squashed_schema.sql'), 'utf8');

const lines = content.split('\n');
const triggers = [];
const webhookLines = [];

for(let i=0; i<lines.length; i++) {
   if (lines[i].includes('CREATE TRIGGER')) {
       triggers.push(lines[i].trim());
   }
   if (lines[i].includes('pg_net') || lines[i].includes('https://script.google.com') || lines[i].includes('net.http_post')) {
       webhookLines.push({line: i+1, content: lines[i].trim()});
   }
}

console.log("Triggers:", triggers);
console.log("Webhook logic:", webhookLines);
