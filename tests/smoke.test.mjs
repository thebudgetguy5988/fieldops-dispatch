import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const file = name => readFileSync(new URL('../'+name, import.meta.url), 'utf8');
test('account registration and profile bootstrap are wired',()=>{
 const app=file('src/App.jsx');
 assert.match(app,/supabase\.auth\.signUp\(/);
 assert.match(app,/supabase\.auth\.signInWithPassword\(/);
 assert.match(app,/if\(!profile\.organization_id\)/);
});
test('organization management uses server-authorized RPCs',()=>{
 const org=file('src/Organization.jsx');
 for(const rpc of ['create_organization','accept_employee_invite','create_employee_invite','change_employee_role','revoke_employee_invite'])
  assert.ok(org.includes("supabase.rpc('"+rpc+"'"),'Missing '+rpc);
});
test('work orders and inventory use backend operations',()=>{
 const app=file('src/App.jsx'),inventory=file('src/Inventory.jsx');
 assert.match(app,/supabase\.from\('jobs'\)\.insert\(/);
 assert.match(app,/supabase\.from\('jobs'\)\.update\(/);
 assert.match(inventory,/supabase\.rpc\('transact_part'/);
 assert.match(inventory,/op_id:crypto\.randomUUID\(\)/);
});
test('frontend does not reference a privileged Supabase service key',()=>{
 const src=['src/App.jsx','src/Inventory.jsx','src/Organization.jsx','src/supabase.js'].map(file).join('\n');
 assert.doesNotMatch(src,/service_role|SUPABASE_SERVICE_ROLE_KEY|sb_secret_/i);
});
