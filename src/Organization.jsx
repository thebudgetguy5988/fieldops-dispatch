import React,{useEffect,useState} from 'react';
import {supabase} from './supabase';
import './organization.css';
export default function Organization({profile,onChanged}){
 const [name,N]=useState(''),[email,E]=useState(''),[role,R]=useState('technician'),[token,T]=useState(''),[join,J]=useState('');
 const [org,O]=useState(null),[members,M]=useState([]),[invites,I]=useState([]),[error,X]=useState(''),[notice,S]=useState(''),[busy,B]=useState(false);
 const admin=profile?.role==='admin',manager=['admin','dispatcher'].includes(profile?.role);
 async function load(){
  if(!profile?.organization_id)return;
  const [o,m,i]=await Promise.all([
   supabase.from('organizations').select('id,name').eq('id',profile.organization_id).single(),
   supabase.from('profiles').select('id,full_name,email,role').eq('organization_id',profile.organization_id).order('full_name'),
   admin?supabase.rpc('list_employee_invites'):Promise.resolve({data:[]})
  ]);
  X(o.error?.message||m.error?.message||i.error?.message||'');
  O(o.data);M(m.data||[]);I(i.data||[]);
 }
 useEffect(()=>{load()},[profile?.organization_id,profile?.role]);
 async function execute(call,success){
  B(true);X('');S('');
  try{const {data,error}=await call();if(error)throw error;S(success);await load();onChanged?.();return data}
  catch(e){X(e.message||'Request failed');return null}finally{B(false)}
 }
 async function create(e){e.preventDefault();await execute(()=>supabase.rpc('create_organization',{p_name:name.trim()}),'Organization created. Sign out and back in to refresh your profile.')}
 async function invite(e){e.preventDefault();const result=await execute(()=>supabase.rpc('create_employee_invite',{p_email:email.trim(),p_role:role}),'Invitation generated. Share the token securely.');if(result)T(result)}
 async function accept(e){e.preventDefault();await execute(()=>supabase.rpc('accept_employee_invite',{p_token:join.trim()}),'Invitation accepted. Sign out and back in to refresh your profile.')}
 async function change(member,next){if(!window.confirm('Change this employee role?'))return;await execute(()=>supabase.rpc('change_employee_role',{p_user:member.id,p_role:next}),'Employee role updated.')}
 async function revoke(id){if(!window.confirm('Revoke this invitation?'))return;await execute(()=>supabase.rpc('revoke_employee_invite',{p_id:id}),'Invitation revoked.')}
 return <main className="content organizationPage"><section className="panel"><h1>{org?.name||'Organization'}</h1>
 {error&&<p className="error" role="alert">{error}</p>}{notice&&<p className="success" role="status">{notice}</p>}
 {!profile?.organization_id&&<><form className="detailForm" onSubmit={accept}><h2>Join an organization</h2><label>Invitation token<input required value={join} onChange={e=>J(e.target.value)}/></label><button disabled={busy}>Accept invitation</button></form>
 <form className="detailForm" onSubmit={create}><h2>Create an organization</h2><label>Company name<input required minLength="2" maxLength="120" value={name} onChange={e=>N(e.target.value)}/></label><button disabled={busy}>Create organization</button></form></>}
 {profile?.organization_id&&manager&&<><h2>Employees</h2><div className="organizationTableWrap"><table className="organizationTable"><thead><tr><th>Name</th><th>Email</th><th>Role</th></tr></thead><tbody>{members.map(m=><tr key={m.id}><td>{m.full_name||'—'}</td><td>{m.email||'—'}</td><td>{admin&&m.id!==profile.id?<select aria-label={'Role for '+(m.full_name||m.email)} value={m.role} disabled={busy} onChange={e=>change(m,e.target.value)}>{['admin','dispatcher','technician'].map(r=><option key={r}>{r}</option>)}</select>:m.role}</td></tr>)}</tbody></table></div></>}
 {profile?.organization_id&&admin&&<><form className="detailForm" onSubmit={invite}><h2>Invite an employee</h2><label>Employee email<input required type="email" value={email} onChange={e=>E(e.target.value)}/></label><label>Role<select value={role} onChange={e=>R(e.target.value)}>{['technician','dispatcher','admin'].map(r=><option key={r}>{r}</option>)}</select></label><button disabled={busy}>Create invitation</button></form>
 {token&&<div className="panel"><b>One-time invitation token</b><p>Share privately. It will not be shown again.</p><code className="inviteToken">{token}</code><button type="button" className="secondary" onClick={()=>navigator.clipboard?.writeText(token)}>Copy token</button></div>}
 <h2>Invitations</h2><div className="organizationTableWrap"><table className="organizationTable"><thead><tr><th>Email</th><th>Role</th><th>Expires</th><th>Action</th></tr></thead><tbody>{invites.map(i=><tr key={i.id}><td>{i.email}</td><td>{i.role}</td><td>{new Date(i.expires_at).toLocaleDateString()}</td><td>{!i.revoked_at&&!i.accepted_at&&<button className="secondary" disabled={busy} onClick={()=>revoke(i.id)}>Revoke</button>}</td></tr>)}</tbody></table></div></>}
 </section></main>
}