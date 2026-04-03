const fs = require('fs');
const content = fs.readFileSync('supabase/migrations/00000000000000_squashed_schema.sql', 'utf8');
const lines = content.split('\n');
const triggers = lines.filter(line => line.includes('CREATE TRIGGER'));
console.log("Triggers found:");
triggers.forEach(t => console.log(t));
