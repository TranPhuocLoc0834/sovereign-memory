"use client";

import { useTideCloak } from "@tidecloak/nextjs";
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Activity, ArrowRight, ArrowUpRight, BookOpen, Bot, CheckCircle2, ChevronRight, CircleHelp, Copy, Database, Fingerprint, FlaskConical, Globe2, LayoutDashboard, LockKeyhole, LogIn, LogOut, Menu, Plus, RefreshCw, Search, Shield, ShieldCheck, Sparkles, Terminal, Users, Wallet, X, XCircle } from "lucide-react";
import { useAuthMode, useConfiguration } from "@/app/providers";
import type { Memory, SessionData, TidePublicConfig } from "@/lib/types";
import { Governance } from "./governance";
import { SimulationGovernance } from "./simulation-governance";

type Tab = "Overview" | "Memory Vault" | "Agent Access Lab" | "Governance" | "Security Logs";
type Api = (path: string, init?: RequestInit) => Promise<Response>;
const navigation = [{ name:"Overview",icon:LayoutDashboard },{name:"Memory Vault",icon:Database},{name:"Agent Access Lab",icon:FlaskConical},{name:"Governance",icon:ShieldCheck},{name:"Security Logs",icon:Activity}] as const;

export function MemoryApp() {
  const config = useConfiguration();
  const mode = useAuthMode();
  if (mode === "simulation") return <Simulated />;
  return config ? <Connected config={config} /> : <Workspace config={null} />;
}
type SimulatedActor = { id: string; name: string; roles: string[]; isAdmin: boolean; description: string };
type SimulationControls = { actor: string | null; actors: SimulatedActor[]; signIn: (actor: string) => Promise<void> };

function Simulated() {
  const [actor, setActor] = useState<string | null>(null);
  const [actors, setActors] = useState<SimulatedActor[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const api = useCallback<Api>(async (path, init) => {
    const response = await fetch(path, { ...init, credentials: "same-origin", cache: "no-store" });
    if (response.status === 401) setActor(null); // Expiry/sign-out clears previously displayed role data.
    return response;
  }, []);
  useEffect(() => {
    let active = true;
    void api("/api/simulation/session").then(async response => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Simulation unavailable");
      if (active) { setActor(body.actor); setActors(body.actors); }
    }).catch(error => { if (active) setAuthError(error.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [api]);
  const signIn = async (identity: string) => {
    setLoading(true); setAuthError("");
    try {
      const response = await api("/api/simulation/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ actor: identity }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Simulated sign-in failed");
      setActor(body.actor);
    } finally { setLoading(false); }
  };
  const logout = async () => {
    const response = await api("/api/simulation/session", { method: "DELETE" });
    if (!response.ok) throw new Error("Simulated sign-out failed");
    setActor(null);
  };
  // Remount on identity change so a previous role's plaintext, modal and API output cannot linger.
  return <Workspace key={actor || "signed-out"} config={null} authenticated={!!actor} initializing={loading} authError={authError} api={api} login={() => signIn("owner")} logout={logout} simulation={{ actor, actors, signIn }} />;
}
function Connected({config}:{config:TidePublicConfig}) {
  const auth = useTideCloak();
  const { secureFetch } = auth;
  const api = useCallback<Api>((path,init) => secureFetch(new URL(path,window.location.origin).href,init),[secureFetch]);
  return <Workspace config={config} authenticated={auth.authenticated} initializing={auth.isInitializing} authError={auth.initError?.message} api={api} login={auth.login} logout={auth.logout} />;
}
export function Badge({children,tone="neutral"}:{children:ReactNode;tone?:"green"|"blue"|"amber"|"red"|"neutral"}) { return <span className={`badge ${tone}`}><span className="badge-dot" />{children}</span>; }
export function Empty({title,children,icon=<LockKeyhole size={24}/>}:{title:string;children:ReactNode;icon?:ReactNode}) { return <div className="empty"><span className="empty-icon">{icon}</span><h3>{title}</h3><p>{children}</p></div>; }
const fmt = (date:string) => new Date(date).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit",second:"2-digit"});

function Workspace({config,authenticated=false,initializing=false,authError,api,login,logout,simulation}:{config:TidePublicConfig|null;authenticated?:boolean;initializing?:boolean;authError?:string;api?:Api;login?:()=>Promise<void>;logout?:()=>Promise<void>;simulation?:SimulationControls}) {
  const [tab,setTab] = useState<Tab>("Overview");
  const [session,setSession] = useState<SessionData|null>(null);
  const [health,setHealth] = useState("checking");
  const [error,setError] = useState("");
  const [busy,setBusy] = useState(false);
  const [newMemory,setNewMemory] = useState(false);
  const [mobile,setMobile] = useState(false);
  const [search,setSearch] = useState("");
  const [notice,setNotice] = useState("");
  const load = useCallback(async()=> {
    if (!authenticated || !api) return;
    const response = await api("/api/session");
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Session could not be verified");
    setSession(body);
  },[authenticated,api]);
  const checkHealth = useCallback(async()=>{
    try { const response=await fetch("/api/health",{cache:"no-store"});const body=await response.json();setHealth(body.broker||body.tidecloak); }
    catch { setHealth("unreachable"); }
  },[]);
  useEffect(()=>{void checkHealth();},[checkHealth]);
  useEffect(()=>{ if(authenticated) void load().catch(e=>setError(e.message));else setSession(null); },[authenticated,load]);
  const run = async(action:()=>Promise<void>)=>{
    setError("");setNotice("");setBusy(true);
    try { await action(); } catch(e) { setError(e instanceof Error ? e.message : "Request failed"); } finally { setBusy(false); }
  };
  const post = async(path:string,body:unknown={})=>{
    if(!api) throw new Error("Connect TideCloak and sign in first.");
    const response=await api(path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    const data=await response.json();if(!response.ok)throw new Error(data.error || data.reason || "Request failed");return data;
  };
  const owner=session?.principal.roles.includes("memory-owner");
  const chooseTab=(value:Tab)=>{setTab(value);setMobile(false);setSearch("");};
  const copy=async(text:string)=>{await navigator.clipboard.writeText(text);setNotice("Memory ID copied. Use it in the agent’s separate browser session.");};
  const seed=()=>run(async()=>{await post("/api/seed");await load();setNotice("Synthetic memories prepared. Grant access to each registered agent in Memory Vault.");});
  const stats=session?.stats;
  return <div className="app-shell">
    <aside className={`sidebar ${mobile?"is-open":""}`}>
      <Link className="brand" href="/"><span className="brand-mark"><Shield size={23}/></span><span>Sovereign<span className="brand-sub">MEMORY</span></span></Link>
      <div className="workspace-tag"><span className="workspace-avatar">SM</span><span>Hackathon workspace<small>RMIT × Tide · 2026</small></span><span className="workspace-dot"/></div>
      <span className="nav-label">WORKSPACE</span>
      <nav aria-label="Main navigation">{navigation.map(({name,icon:Icon})=><button key={name} className={`nav-item ${tab===name?"active":""}`} onClick={()=>chooseTab(name)} aria-current={tab===name?"page":undefined}><Icon size={18}/><span>{name}</span>{name==="Agent Access Lab"&&<span className="tiny-label">LAB</span>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="tide-card"><span className="tide-orbit"><Fingerprint size={24}/></span><strong>{simulation?"Planned: TideCloak":"Powered by TideCloak"}</strong><p>{simulation?<>Local identity simulation.<br/>Real integration preserved.</>:<>Identity and authority,<br/>distributed by design.</>}</p><a href="https://docs.tide.org/" target="_blank" rel="noreferrer">Explore the technology <ArrowUpRight size={13}/></a></div><a className="help-link" href="https://docs.tide.org/" target="_blank" rel="noreferrer"><CircleHelp size={17}/> Documentation <ArrowUpRight size={14}/></a><div className="sidebar-version"><span className="dot"/> {simulation?"Simulation only":"Local prototype"} <span>v0.1</span></div></div>
    </aside>
    <div className="main-shell">
      <header className="topbar"><div className="breadcrumb"><button className="icon-button mobile-toggle" aria-label="Open navigation" onClick={()=>setMobile(!mobile)}><Menu size={20}/></button><span>Workspace</span><ChevronRight size={14}/><strong>{tab}</strong></div><div className="topbar-right"><span className="environment"><span className="dot"/> {simulation?"Simulation":"Development"}</span><div className="topbar-divider"/>{session?<button className="profile-button" disabled={busy||initializing} onClick={()=>void run(async()=>{await logout?.();})} title="Sign out"><span className="avatar">{session.principal.displayName.slice(0,2).toUpperCase()}</span><span>{session.agent?.name || session.principal.displayName}</span><LogOut size={15}/></button>:<button className="button small" disabled={(!config&&!simulation)||initializing||busy} onClick={()=>void run(async()=>{await login?.();})}><LogIn size={15}/>{initializing?"Connecting…":simulation?"Simulate sign-in":"Sign in with Tide"}</button>}</div></header>
      <main>
        {simulation&&<>
          <div className="simulation-banner" role="note"><FlaskConical size={22}/><div><strong>SIMULATION — NOT PROTECTED BY TIDECLOAK</strong><p>Sign-in and roles below are synthetic. Server-side memory access checks are working, but no Tide authentication, DPoP, ORK signatures, encryption or quorum approval occurs. Use synthetic data only.</p></div></div>
          <section className="simulation-picker" aria-label="Simulated sign-in"><div className="simulation-picker-heading"><div><h2>Choose a demo identity</h2><p>Start as Owner → Prepare demo memories → switch to an Agent → test access. Switching roles clears the previous workspace.</p></div><Badge tone="amber">{initializing?"Loading…":simulation.actor?"Simulated session":"Signed out"}</Badge></div><div className="simulation-identities">{simulation.actors.map(actor=><button type="button" key={actor.id} className={`simulation-identity ${actor.id===simulation.actor?"active":""}`} aria-pressed={actor.id===simulation.actor} disabled={busy||initializing||actor.id===simulation.actor} onClick={()=>void run(()=>simulation.signIn(actor.id))}><strong>{actor.isAdmin?<ShieldCheck size={15}/>:actor.roles.includes("memory-owner")?<Users size={15}/>:<Bot size={15}/>} {actor.name}</strong><small><code>{actor.isAdmin?"realm-management / tide-realm-admin":actor.roles.join(", ")}</code></small><small>{actor.description}</small></button>)}</div></section>
        </>}
        <div className="page-heading"><div><div className="eyebrow">SOVEREIGN MEMORY <span>/</span> {tab.toUpperCase()}</div><h1>{tab==="Overview"?"Your memories. Your authority.":tab}</h1><p>{tab==="Overview"?"Give AI agents the context they need. Keep control where it belongs.":tab==="Memory Vault"?"Create shared context and decide exactly who can read it.":tab==="Agent Access Lab"?"Put identity, permissions, and revocation to the test.":tab==="Governance"?(simulation?"Explore the Tide integration plan and simulated administrator role checks.":"Inspect the real authority protecting your TideCloak realm."):"A trace of server-checked requests and permission changes."}</p></div><div className="heading-actions"><button className="button secondary icon-only" title="Refresh status" aria-label="Refresh status" disabled={busy} onClick={()=>void run(async()=>{await checkHealth();await load();})}><RefreshCw size={17}/></button>{owner&&<button className="button" onClick={()=>setNewMemory(true)}><Plus size={17}/> New memory</button>}</div></div>
        {(error||authError)&&<div className="alert error" role="alert"><XCircle size={17}/>{error||authError}<button className="icon-button" aria-label="Dismiss error" onClick={()=>setError("")}><X size={16}/></button></div>}
        {notice&&<div className="alert success" role="status"><CheckCircle2 size={17}/>{notice}<button className="icon-button" aria-label="Dismiss notification" onClick={()=>setNotice("")}><X size={16}/></button></div>}
        {!authenticated&&!simulation&&<div className="connection-banner"><span className="connection-icon"><Fingerprint size={22}/></span><div><strong>{config?"Your vault starts with a verified identity":health==="reachable"?"TideCloak is reachable. Realm setup is incomplete.":"Connect TideCloak to unlock your workspace"}</strong><p>{config?"Sign in to load your private memories and authorized actions.":health==="reachable"?"The server is online, but a real public adapter is not available. Finish realm activation before signing in; authentication and governance are not yet verified.":"The app is running. Check Docker and TideCloak on port 8080, then complete the real realm setup."}</p></div><Badge tone={config?"blue":"amber"}>{config?"Sign-in required":"Setup required"}</Badge></div>}
        {tab==="Overview"&&<>
          <section className="hero-card"><div className="hero-copy"><span className="hero-label"><span className="dot"/> TRUSTLESS MEMORY ACCESS FOR AI AGENTS</span><h2>Shared context.<br/><span>Sovereign control.</span></h2><p>A useful memory should connect your agents.<br/>It shouldn’t hand anyone the keys to everything.</p><button className="button hero-button" onClick={()=>chooseTab("Agent Access Lab")}>Explore the access lab <ArrowRight size={16}/></button></div><div className="hero-visual" aria-hidden="true"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="hero-core"><ShieldCheck size={45} strokeWidth={1.4}/></div><div className="orbit-node node-top"><Bot size={22}/><span>STUDY AGENT</span></div><div className="orbit-node node-bottom"><Wallet size={21}/><span>FINANCE AGENT</span></div><span className="visual-caption"><LockKeyhole size={11}/> IDENTITY · POLICY · AUTHORITY</span></div></section>
          <section className="stats-grid" aria-label="Workspace statistics">{[{label:"Total memories",value:stats?.memories,icon:Database,caption:"In your private vault",tone:"blue"},{label:"Registered agents",value:stats?.agents,icon:Bot,caption:simulation?"Synthetic demo identities":"Bound to Tide identities",tone:"purple"},{label:"Allowed requests",value:stats?.allowed,icon:CheckCircle2,caption:"Server-checked reads",tone:"green"},{label:"Denied requests",value:stats?.denied,icon:Shield,caption:"Blocked by the backend",tone:"orange"}].map(({label,value,icon:Icon,caption,tone})=><article className="stat-card" key={label}><div className="stat-top"><span>{label}</span><span className={`stat-icon ${tone}`}><Icon size={18}/></span></div><strong>{value??"—"}</strong><small>{caption}</small></article>)}</section>
          <div className="overview-grid"><section className="panel"><div className="panel-heading"><div><h2>Memory vault</h2><p>Useful context, intentionally shared.</p></div><button className="text-button" onClick={()=>chooseTab("Memory Vault")}>View all <ArrowRight size={14}/></button></div>{session?.memories.length?<div className="mini-memory-list">{session.memories.slice(0,3).map(memory=><button className="mini-memory" key={memory.id} onClick={()=>chooseTab("Memory Vault")}><span className={`category-icon ${memory.category.toLowerCase()}`}>{memory.category==="Finance"?<Wallet size={19}/>:<BookOpen size={19}/>}</span><span><strong>{memory.title}</strong><small>{memory.category} · {memory.permissions.filter(p=>!p.revoked_at).length} authorized agents</small></span><ChevronRight size={17}/></button>)}</div>:<Empty title={authenticated?"A fresh start for your context":"Your private vault awaits"} icon={<Database size={26}/>}>{authenticated?"Create a memory or prepare the two synthetic examples.":"Sign in with TideCloak to create memories and assign agent access."}</Empty>}{owner&&<div className="panel-footer"><button className="text-button" disabled={busy} onClick={()=>void seed()}><Sparkles size={15}/> Prepare demo memories</button><span>Synthetic data only</span></div>}</section>
          <section className="panel connection-panel"><div className="panel-heading"><div><h2>Trust & connection</h2><p>{simulation?"Demo boundaries, explicitly stated.":"What’s protecting this workspace."}</p></div><ShieldCheck size={20} className="muted"/></div><div className="trust-row"><span><span className="trust-symbol"><Globe2 size={17}/></span>TideCloak server</span><Badge tone={simulation?"neutral":health==="reachable"?"green":"amber"}>{simulation?"Not used in demo":health==="reachable"?"Reachable":health==="not-configured"?"Not configured":health==="checking"?"Checking":"Unreachable"}</Badge></div><div className="trust-row"><span><span className="trust-symbol"><Fingerprint size={17}/></span>Signed-in identity</span><Badge tone={simulation?"amber":session?"green":"neutral"}>{simulation?(session?"Simulated session":"Signed out"):session?"Verified by API":"Not verified"}</Badge></div><div className="trust-row"><span><span className="trust-symbol"><Users size={17}/></span>Quorum governance</span><Badge tone="neutral">{simulation?"Not simulated":"Inspect live"}</Badge></div><div className="storage-note"><Database size={16}/><span>Unencrypted prototype storage.<br/><strong>Use synthetic memories only.</strong></span></div><button className="text-button" onClick={()=>chooseTab("Governance")}>{simulation?"View Tide integration plan":"Inspect governance"} <ArrowRight size={14}/></button></section></div>
          <section className="architecture"><div className="section-label">{simulation?"PLANNED TIDE INTEGRATION · THREE DISTINCT LAYERS":"THREE DISTINCT LAYERS OF TRUST"}</div><div className="architecture-grid">{[{n:"01",title:"Prove the identity",text:simulation?"Now: local simulated sessions. Later: TideCloak-signed identity and DPoP proof verification.":"TideCloak signs identity. Your API verifies the signature and proof of possession.",icon:Fingerprint},{n:"02",title:"Check the permission",text:"The app checks ownership and active grants before a memory leaves the server.",icon:LockKeyhole},{n:"03",title:"Govern the authority",text:simulation?"Planned: Tide IGA protects realm role changes. No cryptographic approval is simulated.":"TideCloak governs realm changes. Actual approval requirements come from the realm.",icon:Users}].map(({n,title,text,icon:Icon})=><div className="architecture-item" key={n}><span className="architecture-number">{n}</span><div><h3><Icon size={16}/>{title}</h3><p>{text}</p></div></div>)}</div></section>
        </>}
        {tab==="Memory Vault"&&<section><div className="section-toolbar"><div className="search"><Search size={17}/><input aria-label="Search memories" placeholder="Search your memories…" value={search} onChange={e=>setSearch(e.target.value)}/></div>{owner&&<button className="button secondary" disabled={busy} onClick={()=>void seed()}><Sparkles size={16}/> Prepare demo</button>}</div>{session?.memories.length?<div className="memory-grid">{session.memories.filter(m=>(m.title+" "+m.category).toLowerCase().includes(search.toLowerCase())).map(memory=><MemoryCard key={memory.id} memory={memory} session={session} busy={busy} copy={()=>void run(()=>copy(memory.id))} grant={(agentId,revoke)=>void run(async()=>{await post(`/api/memories/${memory.id}/permissions`,{agentId,revoke});await load();setNotice(revoke?"Access revoked. Future requests will be denied; previous disclosures cannot be erased.":"Read permission granted.");})}/>)}</div>:<div className="panel"><Empty title={owner?"Add your first memory":"Owner workspace"} icon={<Database size={26}/>}>{owner?"Use New memory or Prepare demo to create synthetic study and finance memories.":"Sign in as a memory owner to manage a vault. Administrative access alone does not grant memory access."}</Empty></div>}</section>}
        {tab==="Agent Access Lab"&&<AgentLab session={session} api={api} refresh={load} report={setError} simulated={!!simulation}/>}
        {tab==="Governance"&&(simulation?<SimulationGovernance session={session} api={api}/>:<Governance config={config} session={session} api={api}/>)}
        {tab==="Security Logs"&&<Logs session={session}/>}
        <footer className="page-footer"><span><Shield size={13}/> Sovereign Memory</span><span>Built for RMIT × Tide UNLOCKED <span className="footer-dot">·</span> Local prototype</span><a href="https://tide.org/unlocked/" target="_blank" rel="noreferrer">The challenge <ArrowUpRight size={13}/></a></footer>
      </main>
    </div>
    {newMemory&&<div className="modal-backdrop" onClick={()=>setNewMemory(false)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="new-title" onClick={e=>e.stopPropagation()}><div className="panel-heading"><h2 id="new-title">Create a memory</h2><button className="icon-button" aria-label="Close form" onClick={()=>setNewMemory(false)}><X size={20}/></button></div><form onSubmit={(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();const data=new FormData(event.currentTarget);void run(async()=>{await post("/api/memories",{title:data.get("title"),content:data.get("content"),category:data.get("category")});await load();setNewMemory(false);});}}><label>Title<input name="title" required maxLength={120} autoFocus placeholder="A little context worth keeping"/></label><label>Category<select name="category"><option>Study</option><option>Finance</option><option>General</option></select></label><label>Memory content<textarea name="content" required maxLength={12000} rows={5} placeholder="Synthetic context for your agents…"/></label><p className="form-note"><LockKeyhole size={14}/> Private until you grant an agent read permission.</p><button className="button full" disabled={busy} type="submit"><Plus size={16}/>{busy?"Saving…":"Create memory"}</button>{error&&<p className="red-text" role="alert">{error}</p>}</form></section></div>}
  </div>;
}

function MemoryCard({memory,session,busy,copy,grant}:{memory:Memory;session:SessionData;busy:boolean;copy:()=>void;grant:(agentId:string,revoke:boolean)=>void}) {
  return <article className="panel memory-card"><div className="memory-card-top"><span className={`category-icon ${memory.category.toLowerCase()}`}>{memory.category==="Finance"?<Wallet size={22}/>:<BookOpen size={22}/>}</span><Badge tone={memory.category==="Finance"?"blue":"neutral"}>{memory.category}</Badge></div><h3>{memory.title}</h3><p className="memory-content">{memory.content}</p><div className="owner-line"><span className="tiny-avatar">{memory.owner_name.slice(0,1)}</span>{memory.owner_name}<span>Owner</span></div><div className="grant-section"><span className="section-label">AGENT PERMISSIONS</span>{!session.agents.length&&<p className="subtle">Agent accounts appear after signing in with a governed agent role.</p>}{session.agents.map(agent=>{const active=memory.permissions.some(p=>p.agent_id===agent.id&&!p.revoked_at);return <div className="grant-row" key={agent.id}><span><Bot size={15}/>{agent.name}<small title={agent.identity_subject}>{agent.identity_subject.slice(0,8)}</small></span><button className={`grant-button ${active?"revoke":""}`} disabled={busy} onClick={()=>grant(agent.id,active)}>{active?"Revoke":"Grant read"}</button></div>;})}</div><button className="copy-id" onClick={copy}><Copy size={13}/><span>{memory.id}</span></button></article>;
}

function AgentLab({session,api,refresh,report,simulated=false}:{session:SessionData|null;api?:Api;refresh:()=>Promise<void>;report:(error:string)=>void;simulated?:boolean}) {
  const [target,setTarget]=useState("");
  const [busy,setBusy]=useState(false);
  const [result,setResult]=useState<{status:number;body:Record<string,unknown>;elapsed:number}|null>(null);
  const active=session?.agent;
  const request=async()=>{
    if(!api||!session)return;setBusy(true);setResult(null);report("");const start=performance.now();
    try {const response=await api("/api/access",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({memoryId:target})});const body=await response.json();setResult({status:response.status,body,elapsed:Math.round(performance.now()-start)});await refresh();}
    catch(error){report(error instanceof Error?error.message:"Access request failed");}finally{setBusy(false);}
  };
  return <>
    <div className="agent-grid">{[{kind:"study-agent",name:"Study Agent",description:"Context for projects, learning, and deadlines.",icon:BookOpen},{kind:"finance-agent",name:"Finance Agent",description:"Context for budgets, planning, and resources.",icon:Wallet}].map(({kind,name,description,icon:Icon})=><article key={kind} className={`panel agent-card ${active?.kind===kind?"selected":""}`}><span className={`category-icon ${kind==="study-agent"?"study":"finance"}`}><Icon size={23}/></span><div><h3>{name}</h3><p>{description}</p><Badge tone={simulated?"amber":active?.kind===kind?"green":"neutral"}>{active?.kind===kind?(simulated?"Current simulated identity":"Current verified identity"):simulated?"Choose this demo identity above":"Separate Tide login required"}</Badge></div>{active?.kind===kind&&<CheckCircle2 size={19} className="green-text"/>}</article>)}</div>
    <div className="lab-grid"><section className="panel request-panel"><div className="panel-heading"><div><h2>Request memory access</h2><p>One real HTTP request. One server-side decision.</p></div><FlaskConical size={21} className="muted"/></div><div className="request-body">
      <label>{simulated?"Simulated caller":"Authenticated caller"}<div className="readonly-field"><Fingerprint size={17}/>{session?active?.name || session.principal.displayName:simulated?"Choose a demo identity above":"Sign in with TideCloak"}</div></label>
      {session&&<p className="subject-line">Subject: {session.principal.subject}</p>}
      <label htmlFor="memory-id">Target memory ID</label><input id="memory-id" placeholder="Paste a memory UUID from the owner’s vault" value={target} onChange={e=>{setTarget(e.target.value);setResult(null);}}/>
      {!!session?.targets.length&&<div className="target-chips">{session.targets.map(m=><button key={m.id} onClick={()=>{setTarget(m.id);setResult(null);}}>{m.title}<ArrowUpRight size={12}/></button>)}</div>}
      <div className="request-route"><span>POST</span><code>/api/access</code><LockKeyhole size={13}/></div><button className="button full" disabled={!session||!target||busy} onClick={()=>void request()}>{busy?<RefreshCw size={16}/>:<ArrowRight size={16}/>} {busy?"Checking permission…":"Request access"}</button>
      <p className="form-note">{simulated?"Identity comes from an opaque, server-managed demo session. The two synthetic sample IDs are shared for testing both allowed and denied requests; memory contents still require an active grant.":"Use separate browser profiles for the owner and each agent. The API derives identity from the signed token."}</p>
    </div></section>
    <section className="panel response-panel"><div className="panel-heading"><h2>API response</h2><span className="terminal-label"><Terminal size={14}/> {simulated?"SIMULATED IDENTITY":"LIVE OUTPUT"}</span></div>{result?<div className="response-body"><div className={`result-banner ${result.status===200?"allowed":"denied"}`}>{result.status===200?<CheckCircle2 size={22}/>:<Shield size={22}/>}<div><strong>{String(result.body.result || "ERROR")}</strong><span>{String(result.body.reason || result.body.error || "")}</span></div></div><div className="response-meta"><span>HTTP <strong>{result.status}</strong></span><span>{result.elapsed} ms</span></div><pre>{JSON.stringify(result.body,null,2)}</pre></div>:<Empty title="Waiting for a request" icon={<Terminal size={25}/>}>The backend response, HTTP status, and timestamp will appear here. No result is precomputed.</Empty>}</section></div>
    <div className="info-strip"><CircleHelp size={17}/><span>Test the same memory before and after revocation. Revocation blocks future reads; it cannot erase content already disclosed.</span></div>
  </>;
}
function Logs({session}:{session:SessionData|null}) {
  return <section className="panel"><div className="panel-heading"><div><h2>Access & permission events</h2><p>Your events and activity on memories you own. Latest 100 entries.</p></div><Badge tone="blue">{session?.logs.length??0} events</Badge></div>{session?.logs.length?<div className="table-scroll"><table><thead><tr><th>ACTOR</th><th>ACTION / TARGET</th><th>RESULT</th><th>TIME</th></tr></thead><tbody>{session.logs.map(event=><tr key={event.id}><td><span className="table-actor"><span className="tiny-avatar">{event.actor_name.slice(0,1)}</span>{event.actor_name}</span><small className="table-sub">{event.actor_id.slice(0,12)}</small></td><td><strong>{event.action}</strong><small className="table-sub">{event.memory_id?.slice(0,12)||"Workspace"} · {event.reason}</small></td><td><Badge tone={event.result==="ALLOWED"?"green":"red"}>{event.result}</Badge></td><td className="timestamp" title={event.timestamp}>{fmt(event.timestamp)}</td></tr>)}</tbody></table></div>:<Empty title="Your audit trail starts here" icon={<Activity size={26}/>}>Verified reads, denied requests, and permission changes are recorded without memory content or tokens.</Empty>}</section>;
}
