"""Run against disposable, pre-provisioned accounts; never uses a service-role key.
Usage: python scripts/test-live-api.py /private/path/test-accounts.json
Config: {base, key, run, accounts:{admin:{id,email,password},technician:{...},other_admin:{...}}}
"""
import base64,concurrent.futures,json,pathlib,sys,urllib.request,urllib.error,uuid
cfg=json.loads(pathlib.Path(sys.argv[1]).read_text()); base=cfg['base']; key=cfg['key']; acc=cfg['accounts']; passed=[]
def req(role,method,path,body=None,headers=None):
 h={'apikey':key,'Content-Type':'application/json','Prefer':'return=representation'}
 if role:h['Authorization']='Bearer '+acc[role]['access_token']
 if headers:h.update(headers)
 data=body if isinstance(body,bytes) else None if body is None else json.dumps(body).encode()
 r=urllib.request.Request(base+path,data=data,headers=h,method=method)
 try:
  with urllib.request.urlopen(r,timeout=30) as res:
   b=res.read(); return res.status,json.loads(b) if b and 'json' in res.headers.get('Content-Type','') else b
 except urllib.error.HTTPError as e:
  b=e.read()
  try:d=json.loads(b)
  except:d=b.decode(errors='replace')
  return e.code,d
def ok(label,result):
 status,data=result
 assert 200<=status<300,(label,status,data)
 passed.append(label);print('PASS',label,flush=True);return data
def denied(label,result):
 status,data=result
 assert status>=400 or data==[],(label,status,data)
 passed.append(label);print('PASS',label,flush=True)
def rpc(role,name,args=None):return req(role,'POST','/rest/v1/rpc/'+name,args or {})
def rows(role,table,query=''):return req(role,'GET','/rest/v1/'+table+'?select=*'+query)
for role,a in acc.items():
 d=ok('password sign in '+role,req(None,'POST','/auth/v1/token?grant_type=password',{'email':a['email'],'password':a['password']}));a['access_token']=d['access_token']
# Test-only users are isolated in newly created organizations.
def workspace(role,name,label):
 profile=ok('read '+role+' profile',rows(role,'profiles','&id=eq.'+acc[role]['id']))[0]
 return profile['organization_id'] or ok(label,rpc(role,'create_organization',{'p_name':name}))
org=workspace('admin','Via Lock QA '+cfg['run'],'create organization as signed-in user');other=workspace('other_admin','Via Lock QA isolation '+cfg['run'],'create separate organization')
assert ok('organization creation refreshes admin profile',rows('admin','profiles','&id=eq.'+acc['admin']['id']))[0]['role']=='admin'
token=ok('valid email invitation accepted',rpc('admin','create_employee_invite',{'p_email':acc['technician']['email'],'p_role':'technician'}))
denied('different user cannot accept employee invitation',rpc('other_admin','accept_employee_invite',{'p_token':token}))
assert ok('technician joins invited organization',rpc('technician','accept_employee_invite',{'p_token':token}))==org
denied('invitation cannot be replayed',rpc('technician','accept_employee_invite',{'p_token':token}))
denied('technician cannot invite administrators',rpc('technician','create_employee_invite',{'p_email':'unclaimed@example.com','p_role':'admin'}))
denied('technician cannot promote self',rpc('technician','change_employee_role',{'p_user':acc['technician']['id'],'p_role':'admin'}))
denied('last administrator cannot be demoted',rpc('admin','change_employee_role',{'p_user':acc['admin']['id'],'p_role':'technician'}))
assert ok('other organization cannot read team profiles',rows('other_admin','profiles','&id=eq.'+acc['technician']['id']))==[]
denied('anonymous organization creation blocked',rpc(None,'create_organization',{'p_name':'Anonymous'}))
tech=acc['technician']['id'];actor=acc['admin']['id']
job=ok('administrator creates assigned customer work order',req('admin','POST','/rest/v1/jobs',{'title':'QA equipment service','customer_name':'QA test customer','address':'Test address','scheduled_at':'2027-01-04T14:00:00Z','duration_minutes':60,'assigned_to':tech,'created_by':actor,'customer_phone':'5555550100','equipment_model':'KM1340'}))[0];jid=job['id']
cfg['test_org']=org;cfg['other_org']=other;cfg['job_id']=jid
pathlib.Path(sys.argv[1]).write_text(json.dumps(cfg))
assert len(ok('assigned technician reads work order',rows('technician','jobs','&id=eq.'+jid)))==1
assert ok('cross-organization work order hidden',rows('other_admin','jobs','&id=eq.'+jid))==[]
denied('technician cannot create work order',req('technician','POST','/rest/v1/jobs',{'title':'Forbidden','customer_name':'QA','address':'QA'}))
denied('technician cannot alter customer details',req('technician','PATCH','/rest/v1/jobs?id=eq.'+jid,{'customer_name':'Tampered'}))
denied('cross-organization work order update blocked',req('other_admin','PATCH','/rest/v1/jobs?id=eq.'+jid,{'title':'Tampered'}))
conflict={'title':'Conflict','customer_name':'QA','address':'QA','assigned_to':tech,'scheduled_at':'2027-01-04T14:30:00Z','duration_minutes':60}
denied('overlapping appointment rejected',req('admin','POST','/rest/v1/jobs',conflict))
ok('administrator reschedules appointment',req('admin','PATCH','/rest/v1/jobs?id=eq.'+jid,{'scheduled_at':'2027-01-04T16:00:00Z','duration_minutes':90}))
part=ok('administrator creates catalog part',req('admin','POST','/rest/v1/parts',{'sku':'QA-'+uuid.uuid4().hex[:8],'name':'QA filter','unit':'each'}))[0];pid=part['id'];cfg['part_id']=pid;pathlib.Path(sys.argv[1]).write_text(json.dumps(cfg))
def trans(role,kind,qty,op=None,order=None):return rpc(role,'transact_part',{'op_id':op or str(uuid.uuid4()),'tech_id':tech,'item_id':pid,'order_id':order,'action':kind,'qty':qty,'memo':'Disposable QA transaction'})
op=str(uuid.uuid4());ok('administrator restocks van',trans('admin','restock',10,op));ok('retry does not duplicate restock',trans('admin','restock',10,op))
assert ok('restock balance is exactly 10',rows('admin','van_stock','&technician_id=eq.'+tech+'&part_id=eq.'+pid))[0]['quantity']==10
denied('technician cannot restock own van',trans('technician','restock',1))
denied('part usage blocked before arriving on site',trans('technician','use',1,order=jid))
ok('technician changes status to on site',req('technician','PATCH','/rest/v1/jobs?id=eq.'+jid,{'status':'On site'}))
ok('technician records part usage',trans('technician','use',3,order=jid));ok('technician returns unused part',trans('technician','return',1,order=jid))
denied('return cannot exceed net usage',trans('technician','return',10,order=jid));denied('van stock cannot become negative',trans('technician','use',999,order=jid))
op=str(uuid.uuid4())
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
 result=list(pool.map(lambda _:trans('admin','restock',2,op),range(2)))
for i,r in enumerate(result):ok('concurrent identical retry '+str(i+1),r)
assert ok('concurrent retry changes balance only once',rows('admin','van_stock','&technician_id=eq.'+tech+'&part_id=eq.'+pid))[0]['quantity']==10
assert ok('cross-organization inventory hidden',rows('other_admin','parts','&id=eq.'+pid))==[]
denied('cross-organization stock transaction blocked',trans('other_admin','restock',1))
location={'technician_id':tech,'latitude':0,'longitude':0,'accuracy_m':100}
ok('technician first location upsert',req('technician','POST','/rest/v1/technician_locations?on_conflict=technician_id',location,{'Prefer':'resolution=merge-duplicates,return=representation'}))
location['latitude']=1
ok('technician subsequent location upsert',req('technician','POST','/rest/v1/technician_locations?on_conflict=technician_id',location,{'Prefer':'resolution=merge-duplicates,return=representation'}))
assert ok('dispatcher reads latest location',rows('admin','technician_locations','&technician_id=eq.'+tech))[0]['latitude']==1
assert ok('cross-organization location hidden',rows('other_admin','technician_locations','&technician_id=eq.'+tech))==[]
ok('stop location sharing deletes position',req('technician','DELETE','/rest/v1/technician_locations?technician_id=eq.'+tech))
image=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5bQAAAAASUVORK5CYII=')
for kind in ['photo','signature']:
 path=jid+'/'+tech+'/'+str(uuid.uuid4())+'.png'
 ok(kind+' uploads to private evidence bucket',req('technician','POST','/storage/v1/object/work-order-evidence/'+path,image,{'Content-Type':'image/png'}))
 record={'job_id':jid,'kind':kind,'path':path,'original_name':'QA '+kind+'.png','created_by':tech}
 if kind=='signature':record['signer_name']='QA synthetic signature - not a customer'
 ok(kind+' metadata saved',req('technician','POST','/rest/v1/work_order_files',record))
 ok(kind+' signed URL generated',req('admin','POST','/storage/v1/object/sign/work-order-evidence/'+path,{'expiresIn':60}))
 denied(kind+' cross-organization access blocked',req('other_admin','POST','/storage/v1/object/sign/work-order-evidence/'+path,{'expiresIn':60}))
assert ok('cross-organization evidence records hidden',rows('other_admin','work_order_files','&job_id=eq.'+jid))==[]
ok('technician completes work order',req('technician','PATCH','/rest/v1/jobs?id=eq.'+jid,{'status':'Completed'}))
denied('technician cannot use parts after completion',trans('technician','use',1,order=jid))
ok('signed in users can sign out',req('technician','POST','/auth/v1/logout'))
result={'passed':len(passed),'tests':passed,'organization_id':org,'other_organization_id':other,'job_id':jid}
pathlib.Path('/workspace/scratch/a1e1b7cf0a4a/api-test-results.json').write_text(json.dumps(result,indent=2))
print('ALL',len(passed),'CHECKS PASSED',flush=True)
