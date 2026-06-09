import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://jwvgxqrkjlbewvpkvucj.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dmd4cXJramxiZXd2cGt2dWNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUyNTUyNywiZXhwIjoyMDg4MTAxNTI3fQ.R8XaLf9RuB9ICMM3Uti4faIOgN0Beui9pxh-Vy-t4rU');
async function test() {
  const { data, error } = await supabase.from('hr_leave_requests').select('*').limit(1);
  if (data && data.length > 0) {
    const id = data[0].id;
    const res = await supabase.from('hr_leave_requests').update({status: 'pending_director'}).eq('id', id);
    console.log('UPDATE hr:', res.error);
    const res2 = await supabase.from('interactions').insert({category: 'NOTIFICATION', type: 'info', recipient: 'dummy', message: 'test', actor_name: 'test', target_view: 'hr', target_id: id});
    console.log('INSERT interaction:', res2.error);
  } else {
    console.log('No HR requests found', error);
  }
}
test();
