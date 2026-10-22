"use client";
import { useState } from "react";
import { ArrowUpRight, CheckCircle2, CircleHelp, ExternalLink, Fingerprint, RefreshCw, Shield, Users } from "lucide-react";
import { Badge, Empty } from "./memory-app";
import type { SessionData, TidePublicConfig } from "@/lib/types";

type Change = { id:string; actionType:string; entityType:string; status:string; readyToCommit?:boolean; threshold?:number; authorizationCount?:number; authCount?:number; authorizers?:unknown[] };
type Snapshot = { attributes:Record<string,string>; changes:Change[]; capturedAt:string };
type Api = (url:string,init?:RequestInit)=>Promise<Response>;

export function Governance({config,session,api}:{config:TidePublicConfig|null;session:SessionData|null;api?:Api}) {
  const [snapshot,setSnapshot]=useState<Snapshot|null>(null);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const [subject,setSubject]=useState("");
  const [role,setRole]=useState("study-agent");
  const [outcome,setOutcome]=useState<{status:number;body:unknown;timestamp:string;action:string}|null>(null);
  const base=config?`${config["auth-server-url"]}/admin/realms/${encodeURIComponent(config.realm)}`:"";
  const consoleUrl=config?`${config["auth-server-url"]}/realms/${encodeURIComponent(config.realm)}/tide-console/`:"";
  const admin=session?.principal.isAdmin===true;
  const call=async(path:string,init?:RequestInit)=>{
    if(!api||!admin)throw new Error("Sign in as a Tide realm administrator first.");
    return api(`${base}${path}`,init);
  };
  const read=async()=>{
    const realmResponse=await call("");
    if(!realmResponse.ok)throw new Error(`TideCloak realm inspection returned HTTP ${realmResponse.status}`);
    const realm=await realmResponse.json();
    const requests=await call("/iga/change-requests?status=PENDING");
    if(!requests.ok)throw new Error(`TideCloak change requests returned HTTP ${requests.status}`);
    const changes=await requests.json();
    if(!Array.isArray(changes))throw new Error("Unexpected TideCloak change-request response");
    const next={attributes:realm.attributes||{},changes,capturedAt:new Date().toISOString()};setSnapshot(next);return next;
  };
  const run=async(fn:()=>Promise<unknown>)=>{setError("");setBusy(true);try{await fn();}catch(e){setError(e instanceof Error?e.message:"TideCloak request failed");}finally{setBusy(false);}};
  const stage=async()=>{
    const current=await read();
    if(current.attributes["iga.attestor"]!=="tide"||current.attributes.isIGAEnabled!=="true")throw new Error("This realm has not reported both isIGAEnabled=true and iga.attestor=tide. No role change was sent.");
    if(!/^[A-Za-z0-9_-]{1,256}$/.test(subject))throw new Error("Enter a valid existing TideCloak user ID");
    const roleResponse=await call(`/roles/${encodeURIComponent(role)}`);
    if(!roleResponse.ok)throw new Error(`Role lookup returned HTTP ${roleResponse.status}`);
    const representation=await roleResponse.json();
    const response=await call(`/users/${encodeURIComponent(subject)}/role-mappings/realm`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify([{id:representation.id,name:representation.name}])});
    const text=await response.text();let body:unknown=text||{message:"Empty response"};try{body=JSON.parse(text);}catch{}
    setOutcome({action:"Stage role grant",status:response.status,body,timestamp:new Date().toISOString()});
    await read();
    if(response.status!==202)throw new Error(`Expected a governed HTTP 202, received ${response.status}. Do not claim a quorum demonstration.`);
  };
  const commit=async(change:Change)=>{
    const response=await call(`/iga/change-requests/${encodeURIComponent(change.id)}/commit`,{method:"POST"});
    const text=await response.text();let body:unknown=text||{message:"Empty response"};try{body=JSON.parse(text);}catch{}
    setOutcome({action:"Attempt commit",status:response.status,body,timestamp:new Date().toISOString()});
    await read();
  };
  const tideMode=snapshot?.attributes["iga.attestor"]==="tide";
  const enabled=snapshot?.attributes.isIGAEnabled==="true";
  return <>
    <div className="info-strip"><Shield size={19}/><span>Memory grants are enforced by this application. TideCloak separately protects governed realm changes. SQLite remains unencrypted prototype storage.</span></div>
    <div className="governance-grid"><section className="panel"><div className="panel-heading"><div><h2>Authority, with evidence</h2><p>Live values from your TideCloak realm.</p></div><Fingerprint size={22} className="muted"/></div><div className="governance-body"><div className="trust-row"><span>Public verification key</span><Badge tone={config?"blue":"neutral"}>{config?"Adapter configured":"Not configured"}</Badge></div><div className="trust-row"><span>IGA enabled</span><Badge tone={enabled?"green":"neutral"}>{snapshot?String(enabled):"Not inspected"}</Badge></div><div className="trust-row"><span>Attestation mode</span><Badge tone={tideMode?"green":"neutral"}>{snapshot?.attributes["iga.attestor"]||"Unknown"}</Badge></div><div className="trust-row"><span>Protected operation</span><strong className="small-text">Realm role grant</strong></div><div className="trust-row"><span>Independent approval</span><strong className="small-text">Read each request’s threshold</strong></div><button className="button secondary full" disabled={!admin||busy} onClick={()=>void run(read)}><RefreshCw size={16}/>{busy?"Contacting TideCloak…":"Inspect live governance"}</button>{snapshot&&<small className="snapshot-time">Retrieved {new Date(snapshot.capturedAt).toLocaleTimeString()}</small>}{!admin&&<p className="form-note">A server-verified realm-management / tide-realm-admin role is required. Use the administrator’s own Tide session.</p>}{error&&<p className="red-text" role="alert">{error}</p>}</div></section>
    <section className="panel"><div className="panel-heading"><div><h2>Stage a governed change</h2><p>Uses your own token, browser → TideCloak.</p></div><Users size={21} className="muted"/></div><form className="governance-body" onSubmit={event=>{event.preventDefault();void run(stage);}}><label>Existing TideCloak user ID<input value={subject} onChange={event=>setSubject(event.target.value)} placeholder="Target user’s verified subject" required/></label><label>Application realm role<select value={role} onChange={event=>setRole(event.target.value)}><option value="study-agent">study-agent</option><option value="finance-agent">finance-agent</option><option value="memory-owner">memory-owner</option></select></label><button className="button full" disabled={!admin||!config||busy||!subject}><Shield size={16}/> Request role grant</button><p className="form-note">Requires confirmed Tide-mode IGA. HTTP 202 means staged, not applied. Review and sign requests in Tide’s official approval enclave.</p>{consoleUrl&&<a className="console-link" href={consoleUrl} target="_blank" rel="noreferrer">Open Tide governance console <ExternalLink size={14}/></a>}</form></section></div>
    <section className="panel governance-list"><div className="panel-heading"><div><h2>Pending change requests</h2><p>Thresholds and approval state are returned by TideCloak.</p></div><Badge tone={snapshot?"blue":"neutral"}>{snapshot?`${snapshot.changes.length} pending`:"Not loaded"}</Badge></div>{snapshot?.changes.length?<div className="table-scroll"><table><thead><tr><th>PROTECTED CHANGE</th><th>APPROVALS</th><th>STATE</th><th>ACTION</th></tr></thead><tbody>{snapshot.changes.map(change=>{const count=change.authorizationCount??change.authCount??change.authorizers?.length;return <tr key={change.id}><td><strong>{change.actionType}</strong><small className="table-sub">{change.entityType} · {change.id.slice(0,12)}</small></td><td>{count??"Unknown"} / {change.threshold??"Unknown"}</td><td><Badge tone={change.readyToCommit?"green":"amber"}>{change.readyToCommit?"Ready to commit":change.status}</Badge></td><td>{["GRANT_ROLES","REVOKE_ROLES"].includes(change.actionType)&&<button className="button small secondary" disabled={busy} onClick={()=>void run(()=>commit(change))}>Attempt commit</button>}</td></tr>;})}</tbody></table></div>:<Empty title={snapshot?"No pending requests":"Governance has not been verified"} icon={<Users size={26}/>}>{snapshot?"Stage a role grant to observe its actual approval requirements.":"Connect a real realm, sign in as an administrator, then inspect its state."}</Empty>}</section>
    {outcome&&<section className="panel"><div className="panel-heading"><h2>{outcome.action} · HTTP {outcome.status}</h2><Badge tone={outcome.status===412?"amber":outcome.status>=400?"red":"blue"}>Actual TideCloak response</Badge></div><div className="governance-body"><p>{outcome.status===412?"Commit was refused. Inspect the response for an unmet threshold or dependency.":outcome.status===202?"Change staged. It has not been applied yet.":"Inspect this response and refresh the realm before drawing a conclusion."}</p><pre className="governance-output">{JSON.stringify(outcome.body,null,2)}</pre><small>{outcome.timestamp}</small></div></section>}
    <div className="info-strip"><CircleHelp size={18}/><span>To demonstrate that one administrator is insufficient, the actual request must report threshold ≥ 2. Two linked admins can still produce threshold 1. Use enough independent linked admins, confirm Tide mode, and record a refused commit before completing approvals.</span></div>
    <div className="governance-guide"><CheckCircle2 size={18}/><span>Official enclave approvals stay in Tide’s console. No local approval counters or fabricated signatures.</span><a href="https://docs.tide.org/" target="_blank" rel="noreferrer">Integration docs <ArrowUpRight size={13}/></a></div>
  </>;
}
