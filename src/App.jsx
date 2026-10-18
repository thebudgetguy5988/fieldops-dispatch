import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { supabase, getPublicAuthSettings } from './supabase';
import Inventory from './Inventory';
import Organization from './Organization';
import WorkOrder from './WorkOrder';
import Requests from './Requests';
import CustomerRequest from './CustomerRequest';
import Schedule,{OrderCard} from './Schedule';
import Icon from './Icon';

const pin = new L.Icon({ iconUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png', iconRetinaUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png', shadowUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png', iconSize:[25,41], iconAnchor:[12,41] });
const emptyJob = { title:'', customer_name:'', address:'', scheduled_at:'', priority:'Normal', notes:'', assigned_to:'', contact_name:'', customer_phone:'', customer_email:'', order_type:'Service', equipment_model:'', asset_number:'', unit_location:'', duration_minutes:60 };
const fmt = value => value ? new Date(value).toLocaleString() : 'Not scheduled';

function WorkspaceApp(){
  const [openJob,setOpenJob]=useState(null),[showCreate,setShowCreate]=useState(false),[search,setSearch]=useState('');
  const [session,setSession]=useState(null), [profile,setProfile]=useState(null), [email,setEmail]=useState(''), [password,setPassword]=useState('');
  const [authMode,setAuthMode]=useState('signin'),[fullName,setFullName]=useState(''),[githubEnabled,setGithubEnabled]=useState(false),[googleEnabled,setGoogleEnabled]=useState(false);
  const [jobs,setJobs]=useState([]), [techs,setTechs]=useState([]), [locations,setLocations]=useState([]), [job,setJob]=useState(emptyJob), [error,setError]=useState(''), [notice,setNotice]=useState(''), [tab,setTab]=useState('schedule'), [loading,setLoading]=useState(false), [tracking,setTracking]=useState(false);

  useEffect(()=>{
    let active=true;
    getPublicAuthSettings().then(settings=>{if(active){setGithubEnabled(settings?.external?.github===true);setGoogleEnabled(settings?.external?.google===true);}}).catch(()=>{});
    return()=>{active=false;};
  },[]);
  useEffect(()=>{ if(!supabase)return; supabase.auth.getSession().then(({data,error})=>{setSession(data.session);if(error)setError('Unable to complete sign-in. Please try again.');}); const {data:{subscription}}=supabase.auth.onAuthStateChange((event,s)=>{setSession(s);if(event==='PASSWORD_RECOVERY')setAuthMode('reset');}); return ()=>subscription.unsubscribe(); },[]);
  useEffect(()=>{
    let active=true;
    setProfile(null);setJobs([]);setTechs([]);setLocations([]);setOpenJob(null);setTracking(false);
    if(session)(async()=>{const {data,error}=await supabase.from('profiles').select('*').eq('id',session.user.id).single();if(!active)return;if(error)setError('Unable to load your profile. Refresh the page or try signing in again.');else setProfile(data);})();
    return()=>{active=false;};
  },[session?.user?.id]);

  const loadData=useCallback(async()=>{ if(!supabase||!profile)return; setError('');
    const [j,t,l]=await Promise.all([
      supabase.from('jobs').select('*').order('scheduled_at',{ascending:true}),
      supabase.from('profiles').select('id,full_name,email,role').eq('role','technician').order('full_name'),
      profile.role==='dispatcher'||profile.role==='admin' ? supabase.from('technician_locations').select('*').order('updated_at',{ascending:false}) : Promise.resolve({data:[]})
    ]);
    if(j.error)setError(j.error.message); else setJobs(j.data||[]);
    if(t.error)setError(t.error.message); else setTechs(t.data||[]);
    if(l.error)setError(l.error.message); else { const seen=new Set(); setLocations((l.data||[]).filter(x=>{if(seen.has(x.technician_id))return false;seen.add(x.technician_id);return true;})); }
  },[profile]);
  useEffect(()=>{loadData(); if(!supabase||!profile)return; const channel=supabase.channel('fieldops-live').on('postgres_changes',{event:'*',schema:'public',table:'jobs'},loadData).on('postgres_changes',{event:'*',schema:'public',table:'technician_locations'},loadData).subscribe(); const timer=setInterval(loadData,30000); return()=>{supabase.removeChannel(channel);clearInterval(timer);};},[loadData,profile]);

  async function signInWithProvider(provider){
    if(!['google','github'].includes(provider))return;
    setError('');setNotice('');setLoading(true);
    try{
      const {error}=await supabase.auth.signInWithOAuth({provider,options:{redirectTo:window.location.origin,...(provider==='github'?{scopes:'user:email'}:{queryParams:{prompt:'select_account'}})}});
      if(error)throw error;
    }catch(err){setError(err.message||'Sign-in could not start. Please try again.');}finally{setLoading(false);}
  }
  async function authenticate(e){
    e.preventDefault();if(authMode==='signup'&&(googleEnabled||githubEnabled))return;setError('');setNotice('');setLoading(true);
    try{
      let result;
      if(authMode==='signup'){
        result=await supabase.auth.signUp({email:email.trim(),password,options:{emailRedirectTo:window.location.origin,data:{full_name:fullName.trim()}}});
        if(!result.error){setNotice(result.data.session?'Account created. Create or join an organization to begin.':'Check your email for a confirmation link, then sign in.');if(!result.data.session)setAuthMode('signin');}
      }else if(authMode==='forgot'){
        result=await supabase.auth.resetPasswordForEmail(email.trim(),{redirectTo:window.location.origin});
        if(!result.error)setNotice('If an account exists for this email, a password reset link has been sent.');
      }else if(authMode==='reset'){
        result=await supabase.auth.updateUser({password});
        if(!result.error){setAuthMode('signin');setPassword('');setNotice('Password updated.');}
      }else result=await supabase.auth.signInWithPassword({email:email.trim(),password});
      if(result.error)throw result.error;
    }catch(err){setError(err.message||'Unable to connect. Please try again.');}finally{setLoading(false);}
  }
  async function signOut(){
    if(tracking && profile?.role==='technician') {
      setTracking(false);
      await supabase.from('technician_locations').delete().eq('technician_id',session.user.id);
    }
    await supabase.auth.signOut();setProfile(null);setJobs([]);
  }
  async function toggleTracking(){
    if(tracking){
      setTracking(false);
      const {error}=await supabase.from('technician_locations').delete().eq('technician_id',session.user.id);
      if(error)setError('Location sharing stopped, but could not remove last position: '+error.message);
    }else setTracking(true);
  }
  async function createJob(e){e.preventDefault();setError('');setNotice('');const payload={...job,assigned_to:job.assigned_to||null,scheduled_at:job.scheduled_at?new Date(job.scheduled_at).toISOString():null,created_by:session.user.id};const {error}=await supabase.from('jobs').insert(payload);if(error)setError(error.message);else{setJob(emptyJob);setNotice('Call created and added to the board.');setShowCreate(false);loadData();}}
  async function updateStatus(id,status){setError('');const {error}=await supabase.from('jobs').update({status,updated_at:new Date().toISOString()}).eq('id',id);if(error)setError(`Unable to update work order: ${error.message}. Check your connection and retry.`);else loadData();}
  async function assignJob(id,assigned_to){setError('');const {error}=await supabase.from('jobs').update({assigned_to:assigned_to||null,updated_at:new Date().toISOString()}).eq('id',id);if(error)setError(`Unable to assign technician: ${error.message}. Check your connection and retry.`);else loadData();}
  async function deleteJob(id){if(!confirm('Delete this service call?'))return;const {error}=await supabase.from('jobs').delete().eq('id',id);if(error)setError(error.message);else loadData();}

  useEffect(()=>{if(!session||profile?.role!=='technician'||!tracking)return;if(!('geolocation'in navigator)){setError('This device/browser does not support location.');setTracking(false);return;}const watch=navigator.geolocation.watchPosition(async pos=>{const {latitude,longitude,accuracy}=pos.coords;const {error}=await supabase.from('technician_locations').upsert({technician_id:session.user.id,latitude,longitude,accuracy_m:Math.round(accuracy),updated_at:new Date().toISOString()},{onConflict:'technician_id'});if(error)setError('Location update failed: '+error.message);},err=>setError('Location error: '+err.message),{enableHighAccuracy:true,maximumAge:15000,timeout:20000});return()=>navigator.geolocation.clearWatch(watch);},[session,profile,tracking]);

  const myJobs=useMemo(()=>profile?.role==='technician'?jobs.filter(j=>j.assigned_to===session?.user?.id):jobs,[jobs,profile,session]);
  if(!supabase)return <main className="center"><section className="panel setup"><img className="logo" src="/via-lock-logo.svg" alt="Via Lock"/><h1>Via Lock</h1><p>Connect your free Supabase project to start the app.</p><ol><li>Copy <code>.env.example</code> to <code>.env</code>.</li><li>Paste your Supabase project URL and publishable/anon key.</li><li>Run the SQL in <code>supabase/schema.sql</code>.</li><li>Restart the development server.</li></ol><p className="muted">Setup instructions are in README.md.</p></section></main>;
  if(!session||authMode==='reset'){
    const socialSignup=(googleEnabled||githubEnabled)&&authMode==='signup';
    return <main className="center"><form className="panel login" onSubmit={authenticate}>
      <img className="logo" src="/via-lock-logo.svg" alt="Via Lock"/><h1>Via Lock</h1>
      <p className="muted">{authMode==='signup'?'Create your service workspace account':authMode==='forgot'?'Reset your password':authMode==='reset'?'Choose a new password':'Sign in to your service board'}</p>
      {(googleEnabled||githubEnabled)&&['signin','signup'].includes(authMode)&&<>
        {googleEnabled&&<button type="button" className="googleSignIn" disabled={loading} onClick={()=>signInWithProvider('google')}>
          <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.2h6.7c3.9-3.6 6-8.9 6-15.1Z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.7-5.2a12.3 12.3 0 0 1-18.3-6.5H5.6v5.3A20.4 20.4 0 0 0 24 44Z"/><path fill="#FBBC05" d="M12.5 27.4a12 12 0 0 1 0-7.7v-5.3H5.6a20 20 0 0 0 0 18.3l6.9-5.3Z"/><path fill="#EA4335" d="M24 11.6c3 0 5.6 1 7.7 3l5.8-5.8A19.4 19.4 0 0 0 24 4 20.4 20.4 0 0 0 5.6 14.4l6.9 5.3A12.2 12.2 0 0 1 24 11.6Z"/></svg>
          {loading?'Please wait…':'Continue with Google'}
        </button>}
        {githubEnabled&&<button type="button" className="githubSignIn" disabled={loading} onClick={()=>signInWithProvider('github')}>
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M12 .8a11.2 11.2 0 0 0-3.54 21.82c.56.1.77-.24.77-.54v-2.08c-3.13.68-3.79-1.33-3.79-1.33-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.69.08-.69 1.13.08 1.72 1.16 1.72 1.16 1 1.72 2.62 1.22 3.26.94.1-.73.39-1.22.71-1.5-2.5-.28-5.13-1.25-5.13-5.57 0-1.23.44-2.23 1.16-3.01-.12-.29-.5-1.43.11-2.98 0 0 .94-.3 3.08 1.15a10.7 10.7 0 0 1 5.61 0c2.14-1.45 3.08-1.15 3.08-1.15.61 1.55.23 2.69.11 2.98.72.78 1.15 1.78 1.15 3.01 0 4.33-2.63 5.28-5.14 5.56.4.35.76 1.03.76 2.08v3.08c0 .3.2.65.78.54A11.2 11.2 0 0 0 12 .8Z"/></svg>
          {loading?'Please wait…':'Continue with GitHub'}
        </button>}
        {socialSignup?<p className="muted small">Use your {googleEnabled&&githubEnabled?'Google or GitHub':googleEnabled?'Google':'GitHub'} account to verify your identity and create your organization. Team members can join with an invitation.</p>:<div className="authDivider"><span>or sign in with email</span></div>}
      </>}
      {!socialSignup&&<>
        {authMode==='signup'&&<label>Full name<input type="text" required maxLength="200" value={fullName} onChange={e=>setFullName(e.target.value)} autoComplete="name"/></label>}
        {authMode!=='reset'&&<label>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/></label>}
        {authMode!=='forgot'&&<label>Password<input type="password" minLength={authMode==='signin'?6:12} required value={password} onChange={e=>setPassword(e.target.value)} autoComplete={authMode==='signin'?'current-password':'new-password'}/>{authMode!=='signin'&&<small>Use at least 12 characters and a unique password.</small>}</label>}
        <button disabled={loading}>{loading?'Please wait…':authMode==='signup'?'Create account':authMode==='forgot'?'Send reset link':authMode==='reset'?'Save new password':'Sign in'}</button>
      </>}
      <button className="secondary" type="button" onClick={()=>{setAuthMode(authMode==='signin'?'signup':'signin');setError('');setNotice('');}}>{authMode==='signin'?'New here? Sign up':'Back to sign in'}</button>
      {authMode==='signin'&&<button type="button" className="secondary" onClick={()=>{setAuthMode('forgot');setError('');setNotice('');}}>Forgot password?</button>}
      {error&&<p className="error" role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
      <p className="creatorCredit">Created by: Misael Jimenez</p>
    </form></main>;
  }
  if(!profile)return <main className="center"><section className="panel"><h2>Loading your profile…</h2>{error&&<p className="error">{error}</p>}<button className="secondary" onClick={signOut}>Sign out</button></section></main>;
  if(!profile.organization_id)return <div className="app"><header className="topbar"><div className="brand"><img className="logo smallLogo" src="/via-lock-logo.svg" alt="Via Lock"/><div><b>Via Lock</b><span>Organization setup</span></div></div><button className="secondary compact" onClick={signOut}>Sign out</button></header><Organization profile={profile} onChanged={async()=>{const {data,error}=await supabase.from('profiles').select('*').eq('id',session.user.id).single();if(error)setError(error.message);else setProfile(data);}}/></div>;
  const canDispatch=['admin','dispatcher'].includes(profile.role);
  const selectedJob=jobs.find(j=>j.id===openJob);
  const technicianName=id=>techs.find(t=>t.id===id)?.full_name||techs.find(t=>t.id===id)?.email||(id===profile.id?(profile.full_name||profile.email):'Unassigned');
  const filteredJobs=myJobs.filter(j=>(j.title+' '+j.customer_name+' '+j.address+' '+j.id).toLowerCase().includes(search.toLowerCase()));
  const go=next=>{setTab(next);setOpenJob(null);setShowCreate(false);};
  return <div className="app"><header className="topbar"><button className="brand brandButton" onClick={()=>go('schedule')} aria-label="Via Lock home"><img className="logo smallLogo" src="/via-lock-logo.svg" alt=""/><div><b>Via Lock</b><span>Service workspace</span></div></button><div className="userbox"><span>{profile.full_name||session.user.email}</span><em>{profile.role}</em><button className="secondary compact" onClick={signOut}>Sign out</button></div></header>
    <nav className="tabs appNavigation" aria-label="Main navigation">{[{id:'schedule',icon:'calendar',label:'Schedule'},{id:'jobs',icon:'orders',label:'Work orders'},...(canDispatch?[{id:'requests',icon:'orders',label:'Requests'}]:[]),{id:'inventory',icon:'box',label:canDispatch?'Inventory':'My van'},{id:'organization',icon:'user',label:'Organization'},...(canDispatch?[{id:'map',icon:'map',label:'Team map'}]:[])].map(n=><button key={n.id} aria-current={tab===n.id&&!selectedJob?'page':undefined} className={tab===n.id?'active':''} onClick={()=>go(n.id)}><Icon name={n.icon}/><span>{n.label}</span></button>)}</nav>
    {selectedJob?<WorkOrder key={selectedJob.id} job={selectedJob} profile={profile} technicians={techs} technicianName={technicianName(selectedJob.assigned_to)} onClose={()=>setOpenJob(null)} onChanged={async()=>{const {data}=await supabase.from('profiles').select('*').eq('id',session.user.id).single();if(data)setProfile(data);await loadData();}}/>:tab==='requests'&&canDispatch?<Requests profile={profile} jobs={jobs} onOpen={setOpenJob} onChanged={loadData}/>:tab==='inventory'?<Inventory profile={profile}/>:tab==='organization'?<Organization profile={profile} onChanged={async()=>{const {data,error}=await supabase.from('profiles').select('*').eq('id',session.user.id).single();if(error){setError(error.message);return;}setProfile(data);}}/>:tab==='schedule'?<Schedule jobs={myJobs} onOpen={setOpenJob} technicianName={technicianName} dispatch={canDispatch} onCreate={()=>{go('jobs');setShowCreate(true);}}/>:<main className="content">{error&&<div className="alert">{error}<button onClick={()=>setError('')}>×</button></div>}{notice&&<div className="success">{notice}<button onClick={()=>setNotice('')}>×</button></div>}
      {tab==='map'&&canDispatch&&<section className="panel"><div className="sectionHead"><div><h2>Technician locations</h2><p className="muted">Latest reported positions; technicians must explicitly enable sharing. A last-reported location can remain if the app closes without stopping sharing.</p></div><button className="secondary" onClick={loadData}>Refresh</button></div><div className="mapWrap"><MapContainer center={[27.95,-82.46]} zoom={9} scrollWheelZoom style={{height:'100%',width:'100%'}}><TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>{locations.map(loc=><Marker key={loc.technician_id} position={[loc.latitude,loc.longitude]} icon={pin}><Popup><b>{techs.find(t=>t.id===loc.technician_id)?.full_name||'Technician'}</b><br/>Updated: {fmt(loc.updated_at)}<br/>Accuracy: {loc.accuracy_m??'—'} m</Popup></Marker>)}</MapContainer></div><p className="muted small">No marker means no location has been reported yet. Location sharing runs while the technician has the app open and has granted browser location permission.</p><div className="locationList">{locations.map(loc=><div className="locationRow" key={loc.technician_id}><span><b>{techs.find(t=>t.id===loc.technician_id)?.full_name||'Technician'}</b><small>{loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}</small></span><small>{fmt(loc.updated_at)}</small></div>)}</div></section>}
      {tab==='jobs'&&<><div className="pageTitle"><div><span className="eyebrow">SERVICE OPERATIONS</span><h1>{canDispatch?'Work orders':'My work orders'}</h1></div>{canDispatch&&<button className="createButton" onClick={()=>setShowCreate(!showCreate)}><Icon name="plus" size={18}/>{showCreate?'Close form':'New work order'}</button>}</div><label className="orderSearch"><Icon name="search"/><input aria-label="Search work orders" type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search customer, work order or address"/></label>{canDispatch&&showCreate&&<section className="panel"><div className="sectionHead"><div><h2>Create a service call</h2><p className="muted">Add a job and optionally assign it now.</p></div></div><form className="jobForm" onSubmit={createJob}><label>Call / job title<input required value={job.title} onChange={e=>setJob({...job,title:e.target.value})} placeholder="e.g. KM1340 PM service"/></label><label>Customer<input required value={job.customer_name} onChange={e=>setJob({...job,customer_name:e.target.value})} placeholder="Customer or site name"/></label><label>Order type<select value={job.order_type} onChange={e=>setJob({...job,order_type:e.target.value})}>{['Service','PM','Installation','Delivery','Repair'].map(v=><option key={v}>{v}</option>)}</select></label><label>Equipment / model<input value={job.equipment_model} onChange={e=>setJob({...job,equipment_model:e.target.value})} placeholder="e.g. Bevi 2.0"/></label><label>Asset / unit number<input value={job.asset_number} onChange={e=>setJob({...job,asset_number:e.target.value})}/></label><label>Unit location<input value={job.unit_location} onChange={e=>setJob({...job,unit_location:e.target.value})} placeholder="e.g. Break room"/></label><label>Customer contact name<input value={job.contact_name} onChange={e=>setJob({...job,contact_name:e.target.value})} placeholder="On-site contact"/></label><label>Customer phone<input type="tel" value={job.customer_phone} onChange={e=>setJob({...job,customer_phone:e.target.value})} placeholder="Phone number"/></label><label>Customer email<input type="email" value={job.customer_email} onChange={e=>setJob({...job,customer_email:e.target.value})} placeholder="Email (optional)"/></label><label>Service address<input required value={job.address} onChange={e=>setJob({...job,address:e.target.value})} placeholder="Street, city, state"/></label><label>Appointment date & time<input type="datetime-local" value={job.scheduled_at} onChange={e=>setJob({...job,scheduled_at:e.target.value})}/></label><label>Duration (minutes)<input type="number" min="15" max="720" step="15" required value={job.duration_minutes} onChange={e=>setJob({...job,duration_minutes:Number(e.target.value)})}/></label><label>Priority<select value={job.priority} onChange={e=>setJob({...job,priority:e.target.value})}><option>Low</option><option>Normal</option><option>High</option><option>Urgent</option></select></label><label>Assign technician<select value={job.assigned_to} onChange={e=>setJob({...job,assigned_to:e.target.value})}><option value="">Unassigned</option>{techs.map(t=><option key={t.id} value={t.id}>{t.full_name||t.email}</option>)}</select></label><label className="wide">Work notes<textarea rows="2" value={job.notes} onChange={e=>setJob({...job,notes:e.target.value})} placeholder="Reported issue, equipment model, access instructions…"/></label><div className="wide"><button type="submit">Create service call</button></div></form></section>}
      {profile.role==='technician'&&<section className="panel trackingPanel"><div><b>Location sharing</b><p className="muted small">Share your location with dispatch while this board is open. You can stop sharing any time.</p></div><button className={tracking?'danger':'primary'} onClick={toggleTracking}>{tracking?'Stop sharing':'Start sharing location'}</button></section>}
      <section className="orderListSection"><div className="sectionHead"><p className="muted">{filteredJobs.length} work order{filteredJobs.length!==1?'s':''}</p><button className="plainIcon" aria-label="Refresh work orders" onClick={loadData}><Icon name="refresh"/></button></div><div className="jobList">{filteredJobs.map(j=><OrderCard key={j.id} job={j} onOpen={setOpenJob} technician={technicianName(j.assigned_to)}/>)}{!filteredJobs.length&&<div className="emptyState"><Icon name="orders" size={34}/><h3>No work orders found</h3><p>Try a different search or create a new work order.</p></div>}</div></section></>}
    </main>}<footer>Via Lock · Created by: Misael Jimenez</footer></div>;
}

// Public customer intake is a separate, unauthenticated route.
export default function App(){
 const route=window.location.pathname.match(/^\/request\/([a-f0-9]{48})\/?$/);
 if(window.location.pathname.startsWith('/request/'))return <CustomerRequest token={route?.[1]||''}/>;
 return <WorkspaceApp/>;
}
