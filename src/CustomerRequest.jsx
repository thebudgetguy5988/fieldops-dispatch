import React, {useState} from 'react';
import {supabase} from './supabase';

const blank = {
 customer_name:'',contact_name:'',customer_phone:'',customer_email:'',
 address:'',title:'',order_type:'Service',equipment_model:'',asset_number:'',
 unit_location:'',details:'',preferred_time:'',website:''
};
export default function CustomerRequest({token}){
 const [form,setForm]=useState(blank),[busy,setBusy]=useState(false),[error,setError]=useState(''),[reference,setReference]=useState('');
 const edit=(name,value)=>setForm(f=>({...f,[name]:value}));
 async function submit(event){
  event.preventDefault();
  if(busy)return;
  setBusy(true);setError('');
  try{
   if(!supabase)throw new Error('Service requests are temporarily unavailable.');
   const response=await fetch(`${supabase.supabaseUrl}/functions/v1/customer-work-order`,{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({...form,token})
   });
   const result=await response.json();
   if(!response.ok||!result.success)throw new Error(result.error||'Unable to send your request.');
   setReference(result.reference||'Submitted');setForm(blank);
  }catch(e){setError(e.message||'Unable to send your request. Try again.');}
  finally{setBusy(false);}
 }
 if(!/^[a-f0-9]{48}$/.test(token))return <main className="customerPublic"><section className="customerFormPanel"><h1>Request link unavailable</h1><p>Please ask your service provider for a new QR code.</p></section></main>;
 return <main className="customerPublic">
  <header className="customerPublicHeader"><img src="/via-lock-logo.svg" alt="" className="logo"/><span><b>Via Lock</b><small>Customer service request</small></span></header>
  {reference?<section className="customerFormPanel customerSuccess" role="status">
   <div className="customerSuccessIcon">✓</div><h1>Request received!</h1>
   <p>Thank you. The service team has received your request and will review it for scheduling.</p>
   <div className="customerConfirmation">Confirmation number <strong>{reference}</strong></div>
   <p className="muted small">Submitting a request does not confirm an appointment. The service provider will contact you to arrange service.</p>
   <button type="button" className="secondary" onClick={()=>setReference('')}>Submit another request</button>
  </section>:<section className="customerFormPanel">
   <span className="eyebrow">SERVICE MADE SIMPLE</span><h1>Request a service visit</h1>
   <p className="muted">Tell us what you need. Your request will go directly to the service team for review—no account needed.</p>
   <form className="customerRequestForm" onSubmit={submit}>
    <h2>Your information</h2>
    <label>Business / customer name <span>*</span><input value={form.customer_name} onChange={e=>edit('customer_name',e.target.value)} maxLength="150" minLength="2" required autoComplete="organization" placeholder="Business or full name"/></label>
    <label>On-site contact<input value={form.contact_name} onChange={e=>edit('contact_name',e.target.value)} maxLength="150" autoComplete="name" placeholder="Person we should ask for"/></label>
    <div className="customerFormGrid">
     <label>Phone number<input type="tel" value={form.customer_phone} onChange={e=>edit('customer_phone',e.target.value)} maxLength="45" autoComplete="tel" placeholder="(555) 555-0123"/></label>
     <label>Email<input type="email" value={form.customer_email} onChange={e=>edit('customer_email',e.target.value)} maxLength="254" autoComplete="email" placeholder="contact@company.com"/></label>
    </div><p className="muted small">Please provide at least a phone number or email so we can contact you.</p>
    <label>Service location <span>*</span><input value={form.address} onChange={e=>edit('address',e.target.value)} maxLength="350" minLength="6" required autoComplete="street-address" placeholder="Street address, city, state, ZIP"/></label>
    <h2>Service details</h2>
    <label>What do you need help with? <span>*</span><input value={form.title} onChange={e=>edit('title',e.target.value)} maxLength="180" minLength="5" required placeholder="Example: Ice machine not making ice"/></label>
    <div className="customerFormGrid">
     <label>Service type<select value={form.order_type} onChange={e=>edit('order_type',e.target.value)}>{['Service','Repair','PM','Installation','Delivery'].map(v=><option key={v}>{v}</option>)}</select></label>
     <label>Equipment model<input value={form.equipment_model} onChange={e=>edit('equipment_model',e.target.value)} maxLength="180" placeholder="Example: Hoshizaki KM1340"/></label>
     <label>Unit / asset number<input value={form.asset_number} onChange={e=>edit('asset_number',e.target.value)} maxLength="100" placeholder="If known"/></label>
     <label>Location inside building<input value={form.unit_location} onChange={e=>edit('unit_location',e.target.value)} maxLength="180" placeholder="Example: Break room"/></label>
    </div>
    <label>Describe the issue<textarea value={form.details} onChange={e=>edit('details',e.target.value)} maxLength="3000" rows="4" placeholder="What is happening? When did the issue start? Any access instructions?"/></label>
    <label>Preferred availability<input value={form.preferred_time} onChange={e=>edit('preferred_time',e.target.value)} maxLength="200" placeholder="Example: Weekdays after 2 PM"/></label>
    <div className="customerTrap" aria-hidden="true"><label>Website<input tabIndex="-1" autoComplete="off" value={form.website} onChange={e=>edit('website',e.target.value)}/></label></div>
    {error&&<p className="error" role="alert">{error}</p>}
    <button type="submit" className="customerSubmit" disabled={busy||(!form.customer_phone.trim()&&!form.customer_email.trim())}>{busy?'Submitting request…':'Send service request →'}</button>
    <p className="muted small">Only share service details relevant to your request. Your information is sent to the service provider for scheduling and follow-up.</p>
   </form>
  </section>}
  <footer>Powered by Via Lock · Service scheduling made easier</footer>
 </main>;
}
