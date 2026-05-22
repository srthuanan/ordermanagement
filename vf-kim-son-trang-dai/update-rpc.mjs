import fetch from 'node-fetch';

const supabaseUrl = 'https://txcivsdgjkmlrjxramos.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4Y2l2c2RnamttbHJqeHJhbW9zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODY1MDYwOCwiZXhwIjoyMDk0MjI2NjA4fQ.zJhHCyEvpJQF3yKoxokYpJlY4dJY96sJBpB3IdQ5WcQ'; 

const sql = `
DROP FUNCTION IF EXISTS get_staff_directory();
CREATE OR REPLACE FUNCTION get_staff_directory()
RETURNS TABLE (
  id uuid,
  full_name text,
  role text,
  department text,
  manager_id uuid,
  phone text,
  dob date,
  gender text,
  address text,
  email varchar,
  invite_status text,
  invited_at timestamptz,
  activated_at timestamptz,
  last_message text,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  select
    p.id,
    p.full_name,
    p.role,
    p.department,
    p.manager_id,
    p.phone,
    p.dob,
    p.gender,
    p.address,
    u.email,
    coalesce(i.invite_status, case when u.email_confirmed_at is not null then 'active' else 'invite_sent' end) as invite_status,
    coalesce(i.invited_at, p.created_at) as invited_at,
    coalesce(i.activated_at, case when u.email_confirmed_at is not null then u.updated_at else null end) as activated_at,
    i.last_message,
    p.created_at
  from public.profiles p
  left join auth.users u on u.id = p.id
  left join lateral (
    select *
    from app_private.staff_invites s
    where lower(s.email) = lower(u.email)
    order by s.updated_at desc
    limit 1
  ) i on true
  order by p.created_at desc;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

NOTIFY pgrst, 'reload schema';
`;

async function main() {
  const response = await fetch(`${supabaseUrl}/functions/v1/run-sql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
    body: JSON.stringify({ sqlString: sql })
  });
  console.log(await response.text());
}

main();
