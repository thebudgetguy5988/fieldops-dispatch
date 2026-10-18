import React, {useEffect,useMemo,useState} from 'react';
import {supabase} from './supabase';
import {orderRef} from './Schedule';
import Icon from './Icon';

export default function Requests({profile,jobs,onOpen,onChanged}){
 const [org,setOrg]=useState(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState('');
 const [filter,setFilter]=useState('New request');
 useEffect(()=>{let active=true;supabase.from('organizations').select('name,request_token').eq('id',profile.organization_id).single().then(({data,error})=>{if(!active)return;setOrg(data||null);if(error)setError(error.message);});return()=>{active=false;};},[profile.organization_id]);
 const link=org?.request_token?`https://vialock.vercel.app/request/${org.request_token}`:'';
 const qr=link?`https://quickchart.io/qr?size=560&margin=3&ecLevel=M&text=${encodeURIComponent(link)}`:'';
 const pending=useMemo(()=>jobs.filter(j=>j.origin==='customer_qr'&&['New request','Ready to schedule'].includes(j.status)),[jobs]);
 const filtered=pending.filter(j=>filter==='All'||j.status===filter);
 async function copy(){
  try{await navigator.clipboard.writeText(link);setNotice('Customer request link copied.');}
  catch{setError('Could not copy automatically. Select the link above to copy it.');}
 }
 async function setStatus(id,status){
  setBusy(id);setError('');setNotice('');
  const {error}=await supabase.from('jobs').update({status,updated_at:new Date().toISOString()}).eq('id',id);
  if(error)setError(error.message);else{setNotice('Request moved to '+status+'.');await onChanged();}
  setBusy('');
 }
 return <main className="content requestInbox">
  <div className="pageTitle"><div><span className="eyebrow">CUSTOMER PORTAL</span><h1>Service requests</h1><p className="muted">Scanned QR requests arrive here, ready for your dispatch team to review.</p></div><button className="secondary" onClick={onChanged}><Icon name="refresh" size={16}/> Refresh</button></div>
  {error&&<div className="alert" role="alert">{error}<button onClick={()=>setError('')}>×</button></div>}
  {notice&&<div className="success" role="status">{notice}<button onClick={()=>setNotice('')}>×</button></div>}
  <section className="panel requestQrPanel">
   <div className="requestQrInfo"><span className="eyebrow">YOUR ORGANIZATION'S QR CODE</span><h2>Let customers request service in seconds.</h2>
   <p className="muted">Print this QR code, place it on equipment, or share the link by email. Customers can submit an unscheduled work order without signing in.</p>
   <label className="requestLinkLabel">Your customer request link<input readOnly aria-label="Customer request link" value={link} onFocus={e=>e.target.select()} placeholder="Loading request link…"/></label>
   <div className="actionRow"><button disabled={!link} onClick={copy}><Icon name="copy" size={16}/> Copy link</button>{qr&&<a className="secondary requestPrintLink" href={qr} target="_blank" rel="noreferrer">Open QR image ↗</a>}{link&&<a className="secondary requestPrintLink" href={link} target="_blank" rel="noreferrer">Preview customer form ↗</a>}</div>
   <p className="muted small">Anyone with this code can submit a request to {org?.name||'your organization'}. Only your authorized team can see requests in Via Lock. Printing or sharing the QR code makes it publicly accessible.</p></div>
   <div className="requestQrArtwork">{qr?<img src={qr} alt="Scannable QR code for your customer service request form"/>:<div>Preparing QR…</div>}<b>SCAN TO REQUEST SERVICE</b><small>{org?.name||'Via Lock'}</small></div>
  </section>
  <section className="panel requestQueue">
   <div className="sectionHead"><div><span className="eyebrow">INCOMING WORK ORDERS</span><h2>Request inbox <span className="countBubble">{pending.length}</span></h2><p className="muted">Review each incoming request and choose when it is ready for dispatch.</p></div></div>
   <div className="requestFilterBar">{['New request','Ready to schedule','All'].map(name=><button key={name} className={filter===name?'active':'secondary'} onClick={()=>setFilter(name)}>{name}{name!=='All'?' ('+pending.filter(j=>j.status===name).length+')':''}</button>)}</div>
   <div className="requestRows">{filtered.map(j=><article key={j.id} className="requestRow"><div className="requestRowMain"><span className="eyebrow">{orderRef(j.id)} · {new Date(j.created_at).toLocaleString()}</span><h3>{j.title}</h3><b>{j.customer_name}</b><p>{j.address}</p><p className="muted">{j.notes||'No additional description provided.'}</p>{j.customer_phone&&<a href={'tel:'+j.customer_phone}>Call {j.customer_phone}</a>}{j.customer_email&&<a href={'mailto:'+j.customer_email}>{j.customer_email}</a>}</div><div className="requestRowActions"><span className={'status '+j.status.toLowerCase().replaceAll(' ','-')}>{j.status}</span>{j.status==='New request'&&<button disabled={busy===j.id} onClick={()=>setStatus(j.id,'Ready to schedule')}>{busy===j.id?'Saving…':'Ready to schedule'}</button>}<button className="secondary" onClick={()=>onOpen(j.id)}>Open work order →</button></div></article>)}
    {!filtered.length&&<div className="emptyState"><Icon name="orders" size={30}/><h3>No {filter==='All'?'pending':filter.toLowerCase()} requests</h3><p>New requests submitted through your QR code will show up here.</p></div>}
   </div>
  </section>
 </main>;
}
