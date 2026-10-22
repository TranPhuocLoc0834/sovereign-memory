/** Windows-friendly implementation of Tide's documented bootstrap sequence.
 * No fabricated adapter, admin bypass, or automatic MultiAdmin approvals.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname, delimiter } from "node:path";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";

const command=process.argv[2]||"check";
const root=process.cwd();
const base=(process.env.TIDECLOAK_URL||"http://localhost:8080").replace(/\/+$/,"");
const realm=process.env.REALM_NAME||"sovereign-memory";
const client=process.env.CLIENT_NAME||"sovereign-memory-client";
const app=process.env.APP_URL||"http://localhost:3000";
const adminUser=process.env.KC_BOOTSTRAP_ADMIN_USERNAME||"admin";
const password=process.env.KC_BOOTSTRAP_ADMIN_PASSWORD;
const realmPath=`/admin/realms/${encodeURIComponent(realm)}`;
const statePath=join(root,"data/setup-state.json");
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function fail(message){throw new Error(message);}
function dockerPath(){
  const candidates=["C:/Program Files/Docker/Docker/resources/bin/docker.exe",join(process.env.LOCALAPPDATA||"","Programs/DockerDesktop/resources/bin/docker.exe")];
  return candidates.find(path=>existsSync(path))||"docker";
}
function checkDocker(){
  const docker=dockerPath();
  // A per-user Docker install may not be in this already-running terminal's PATH.
  // Docker itself launches docker-credential-desktop by name, so expose its sibling tools too.
  if(docker!=="docker")process.env.PATH=`${dirname(docker)}${delimiter}${process.env.PATH||""}`;
  const version=spawnSync(docker,["version","--format","{{.Server.Version}}"],{encoding:"utf8",timeout:20000,windowsHide:true});
  if(version.error?.code==="ENOENT")fail("Docker Desktop is not installed or is missing from PATH. Install https://docs.docker.com/desktop/setup/install/windows-install/ , choose WSL 2, restart if requested, then launch Docker Desktop.");
  if(version.status!==0)fail("Docker daemon is not ready. Open Docker Desktop and wait for the engine. Verify: docker version; docker info.");
  const compose=spawnSync(docker,["compose","version","--short"],{encoding:"utf8",timeout:15000,windowsHide:true});
  if(compose.status!==0)fail("Docker Compose v2 is unavailable. Update Docker Desktop and verify: docker compose version.");
  console.log(`Docker engine ${version.stdout.trim()}; Compose ${compose.stdout.trim()}`);return docker;
}
function consent(){
  const email=process.env.TIDE_LICENSE_EMAIL||"";
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail("Set TIDE_LICENSE_EMAIL to the licence owner's real address in .env.");
  if(process.env.TIDE_TERMS_ACCEPTED!=="yes")fail("The owner must read https://tide.org/legal and explicitly agree before setting TIDE_TERMS_ACCEPTED=yes. Nothing was created.");
  if(!password)fail("Missing KC_BOOTSTRAP_ADMIN_PASSWORD. Run npm run setup:prepare.");
  return email;
}
async function masterToken(){
  const response=await fetch(`${base}/realms/master/protocol/openid-connect/token`,{method:"POST",body:new URLSearchParams({grant_type:"password",client_id:"admin-cli",username:adminUser,password:password||""}),signal:AbortSignal.timeout(15000)});
  if(!response.ok)fail(`Master authentication failed (HTTP ${response.status}). Check the local credentials; secrets were not printed.`);
  const result=await response.json();if(!result.access_token)fail("No master token in response");return result.access_token;
}
async function request(path,{method="GET",body,form}={},retry=true){
  const token=await masterToken();
  const headers={Authorization:`Bearer ${token}`};
  if(body!==undefined)headers["Content-Type"]="application/json";
  const response=await fetch(`${base}${path}`,{method,headers,...(form?{body:new URLSearchParams(form)}:body!==undefined?{body:JSON.stringify(body)}:{}),redirect:"manual",signal:AbortSignal.timeout(60000)});
  if(response.status===401&&retry)return request(path,{method,body,form},false);
  const text=await response.text();let data=null;try{data=text?JSON.parse(text):null;}catch{data={message:text.slice(0,200)};}
  if(!response.ok)fail(`TideCloak ${method} ${path.split("?")[0]} returned HTTP ${response.status}${data?.error?`: ${data.error}`:""}. No credentials were printed.`);
  return {data,status:response.status,headers:response.headers};
}
async function drainFirstAdmin(){
  for(let pass=0;pass<8;pass++){
    const {data:pending}=await request(`${realmPath}/iga/change-requests?status=PENDING`);
    if(!Array.isArray(pending))fail("Unexpected IGA list response");
    const dangerous=pending.filter(change=>["DISABLE_IGA","DELETE_REALM","OFFBOARD_REALM"].includes(change.actionType));
    if(dangerous.length)fail("Destructive governance request is pending. Review it manually in the Tide console.");
    if(!pending.length)return;
    let committed=0;
    for(const change of pending){
      const {data}=await request(`${realmPath}/iga/change-requests/${encodeURIComponent(change.id)}/approve`,{method:"POST",body:{}});
      if(data?.mode==="needs-approval")fail("Realm requires an independent approval enclave. Continue in the Tide console; automation will not sign as another administrator.");
      if(data?.committed||data?.status==="APPROVED")committed++;
    }
    const {data:remaining}=await request(`${realmPath}/iga/change-requests?status=PENDING`);
    for(const change of remaining.filter(item=>item.readyToCommit)){
      await request(`${realmPath}/iga/change-requests/${encodeURIComponent(change.id)}/commit`,{method:"POST"});committed++;
    }
    if(!committed&&remaining.length)fail("Bootstrap dependencies remain pending. Inspect the real change requests in Tide's console.");
  }
  fail("Bootstrap governance did not settle in eight passes");
}
async function exportAdapter(){
  const {data:clients}=await request(`${realmPath}/clients?clientId=${encodeURIComponent(client)}`);
  if(!clients?.[0]?.id)fail("Application client not found");
  const {data:adapter}=await request(`${realmPath}/vendorResources/get-installations-provider?clientId=${encodeURIComponent(clients[0].id)}&providerId=keycloak-oidc-keycloak-json`);
  if(!adapter?.jwk?.keys?.length||!adapter.vendorId||!adapter.homeOrkUrl||adapter["public-client"]!==true||adapter.credentials)fail("Tide adapter is incomplete or confidential. No adapter was saved.");
  mkdirSync(join(root,"data"),{recursive:true});
  writeFileSync(join(root,"data/tidecloak.json"),`${JSON.stringify(adapter,null,2)}\n`,{mode:0o600});
  console.log("Saved real Tide adapter to data/tidecloak.json. Restart the app. Login still requires a user's interactive Tide enrollment.");
}
async function initialize(){
  const email=consent();const docker=checkDocker();
  if(base!=="http://localhost:8080")fail("Local setup expects http://localhost:8080. Use the official hosted playbook for another server.");
  const up=spawnSync(docker,["compose","up","-d"],{stdio:"inherit",cwd:root,windowsHide:true});if(up.status!==0)fail("Docker Compose could not start TideCloak");
  let ready=false;
  for(let attempt=0;attempt<60;attempt++){try{const response=await fetch(base,{signal:AbortSignal.timeout(2000)});if(response.status<500){ready=true;break;}}catch{}await delay(2000);}
  if(!ready)fail("TideCloak did not become ready. Run docker compose logs tidecloak.");
  const token=await masterToken();
  const existing=await fetch(`${base}${realmPath}`,{headers:{Authorization:`Bearer ${token}`}});
  if(existing.status===200){
    if(existsSync(statePath)){
      const state=JSON.parse(readFileSync(statePath,"utf8"));
      if(state.realm===realm&&state.phase==="enrollment"){console.log("Resuming first-admin enrollment; existing realm preserved.");await finishBootstrap(state);return;}
    }
    fail("Realm already exists. No setup changes were made. Inspect its actual activation state before enrollment or adapter export; see TIDE_SETUP_BLOCKER.md. Never destroy an existing realm or rerun initial setup to retry licensing.");
  }
  if(existing.status!==404)fail(`Realm existence check returned HTTP ${existing.status}`);
  let template=readFileSync(join(root,"scripts/realm.json.template"),"utf8");
  template=template.replaceAll("REALM_NAME",realm).replaceAll("CLIENT_NAME",client).replaceAll("CLIENT_APP_URL",app);
  await request("/admin/realms",{method:"POST",body:JSON.parse(template)});
  await request(`${realmPath}/vendorResources/setUpTideRealm`,{method:"POST",form:{email,isRagnarokEnabled:"true"}});
  const {data:representation}=await request(realmPath);
  representation.attributes={...representation.attributes,"iga.attestor":"tide"};
  await request(realmPath,{method:"PUT",body:representation});
  // Current builds flip state regardless of the form parameter. Call only when off.
  if(representation.attributes.isIGAEnabled!=="true")await request(`${realmPath}/tide-admin/toggle-iga`,{method:"POST",form:{isIGAEnabled:"true"}});
  const {data:verified}=await request(realmPath);
  if(verified.attributes?.["iga.attestor"]!=="tide"||verified.attributes?.isIGAEnabled!=="true")fail("Realm did not report Tide-mode IGA enabled. Inspect before proceeding.");
  await drainFirstAdmin();
  // Create named synthetic test accounts with no invented personal name/email.
  // All governed configuration is completed before the first tide-realm-admin grant.
  const accountSpecs=[{username:"memory-owner",role:"memory-owner"},{username:"study-agent",role:"study-agent"},{username:"finance-agent",role:"finance-agent"},{username:"governance-admin-a"},{username:"governance-admin-b"},{username:"governance-admin-c"}];
  for(const spec of accountSpecs){
    await request(`${realmPath}/users`,{method:"POST",body:{username:spec.username,enabled:true,firstName:"Synthetic",lastName:spec.username,requiredActions:["link-tide-account-action"]}});await drainFirstAdmin();
  }
  const {data:users}=await request(`${realmPath}/users?max=100`);
  for(const spec of accountSpecs.filter(item=>item.role)){
    const user=users.find(item=>item.username===spec.username);const {data:role}=await request(`${realmPath}/roles/${spec.role}`);
    if(!user)fail(`Created test account ${spec.username} not found`);
    await request(`${realmPath}/users/${user.id}/role-mappings/realm`,{method:"POST",body:[{id:role.id,name:role.name}]});await drainFirstAdmin();
  }
  // Keep approvals in Tide's shipped console rather than granting this app a signing bypass.
  const {data:idp}=await request(`${realmPath}/identity-provider/instances/tide`);
  idp.config={...idp.config,CustomAdminUIDomain:`${base}/realms/${realm}/tide-console/`};
  await request(`${realmPath}/identity-provider/instances/tide`,{method:"PUT",body:idp});await drainFirstAdmin();
  // Enrollment must precede signed settings and the first admin-role grant.
  const first=users.find(user=>user.username==="governance-admin-a");
  if(!first)fail("First admin account was not created");
  const {data:link}=await request(`${realmPath}/tideAdminResources/get-required-action-link?userId=${encodeURIComponent(first.id)}&lifespan=43200`,{method:"POST",body:["link-tide-account-action"]});
  const state={realm,phase:"enrollment",firstAdminId:first.id,accounts:users.filter(user=>accountSpecs.some(spec=>spec.username===user.username)).map(user=>({id:user.id,username:user.username}))};
  writeFileSync(statePath,`${JSON.stringify(state,null,2)}\n`,{mode:0o600});
  console.log("\nACTION REQUIRED: open this private first-admin invitation and complete Tide account linking:");
  console.log(typeof link==="string"?link:JSON.stringify(link));
  console.log("\nWhile linking: choose whether to brand the login screen, and which profile fields to collect. Tide accounts do not require name or email by default.");
  await finishBootstrap(state);
}

async function finishBootstrap(state){
  console.log("Waiting for first-admin Tide enrollment (up to 15 minutes). Re-run setup:tide to resume if interrupted.");
  let linked=false;
  for(let attempt=0;attempt<180;attempt++){
    const {data:user}=await request(`${realmPath}/users/${state.firstAdminId}`);
    if(user.attributes?.tideUserKey?.[0]){linked=true;break;}
    await delay(5000);
  }
  if(!linked)fail("First-admin linking is incomplete. Open the invitation, complete enrollment, then rerun npm run setup:tide.");
  await request(`${realmPath}/vendorResources/sign-idp-settings`,{method:"POST"});
  const {data:management}=await request(`${realmPath}/clients?clientId=realm-management`);
  const managementId=management?.[0]?.id;if(!managementId)fail("realm-management client unavailable");
  const {data:adminRole}=await request(`${realmPath}/clients/${managementId}/roles/tide-realm-admin`);
  await request(`${realmPath}/users/${state.firstAdminId}/role-mappings/clients/${managementId}`,{method:"POST",body:[{id:adminRole.id,name:adminRole.name}]});
  await drainFirstAdmin();
  await exportAdapter();
  console.log("\nINTERACTIVE ENROLLMENT REQUIRED. Do not open these private invitation links in a recording or commit them.");
  for(const user of state.accounts.filter(account=>account.id!==state.firstAdminId)){
    const {data:link}=await request(`${realmPath}/tideAdminResources/get-required-action-link?userId=${encodeURIComponent(user.id)}&lifespan=43200`,{method:"POST",body:["link-tide-account-action"]});
    console.log(`${user.username}: ${typeof link==="string"?link:JSON.stringify(link)}`);
  }
  console.log("\nBefore enrollment completes, choose login branding and which profile fields to collect. The app does not require or invent email addresses.");
  console.log(`\nConsole: ${base}/realms/${realm}/tide-console/`);
  console.log("Link admin A first. From Tide's console, invite/grant tide-realm-admin to independently controlled admin B and C, approving each governed request in the enclave. Confirm a protected request reports threshold >= 2; never infer quorum from headcount.");
  writeFileSync(statePath,`${JSON.stringify({...state,phase:"complete"},null,2)}\n`,{mode:0o600});
}

try{
  if(command==="prepare"){
    if(existsSync(join(root,".env"))){console.log(".env already exists; preserved. Edit it locally if necessary.");}
    else{
      const example=readFileSync(join(root,".env.example"),"utf8");
      let env=example.replace(/^KC_BOOTSTRAP_ADMIN_PASSWORD=$/m,`KC_BOOTSTRAP_ADMIN_PASSWORD=${randomBytes(32).toString("hex")}`);
      // Only persist explicit answers supplied by the human operator via the environment.
      if(process.env.TIDE_LICENSE_EMAIL)env=env.replace(/^TIDE_LICENSE_EMAIL=$/m,`TIDE_LICENSE_EMAIL=${process.env.TIDE_LICENSE_EMAIL}`);
      if(process.env.TIDE_TERMS_ACCEPTED==="yes")env=env.replace(/^TIDE_TERMS_ACCEPTED=$/m,"TIDE_TERMS_ACCEPTED=yes");
      writeFileSync(join(root,".env"),env,{flag:"wx",mode:0o600});console.log("Created ignored .env with a cryptographically random admin password. No secrets were printed.");
    }
  }else if(command==="inspect"){
    const {data:realmInfo}=await request(realmPath);
    console.log(JSON.stringify({realm:realmInfo.realm,enabled:realmInfo.enabled,igaEnabled:realmInfo.attributes?.isIGAEnabled,attestor:realmInfo.attributes?.["iga.attestor"],signatureAlgorithm:realmInfo.defaultSignatureAlgorithm},null,2));
    const {data:keyInfo}=await request(`${realmPath}/keys`);
    console.log(JSON.stringify({keyMetadata:keyInfo.keys?.map(key=>({algorithm:key.algorithm,status:key.status,type:key.type,providerId:key.providerId}))},null,2));
    const {data:components}=await request(`${realmPath}/components`);
    const vendor=components.find(item=>item.providerId==="tide-vendor-key");
    if(vendor)console.log(JSON.stringify({exposedVendorFieldPresence:Object.fromEntries(["gVRK","gVRKCertificate","pendingGVRK","pendingGVRKCertificate","obfGVVK"].map(key=>[key,!!vendor.config?.[key]?.[0]])),note:"Provider-hidden fields omitted by this API cannot be assumed absent."},null,2));
    for(const path of ["/identity-provider/instances","/components","/iga/change-requests?status=PENDING","/vendorResources/getLicenseDetails","/vendorResources/isPendingLicenseActive","/vendorResources/latest-rotation-error"]){
      try{const {data,status}=await request(`${realmPath}${path}`);console.log(JSON.stringify({path,status,summary:Array.isArray(data)?data.map(item=>({id:item.id,providerId:item.providerId,alias:item.alias,status:item.status,actionType:item.actionType,configKeys:item.providerId==="tide-vendor-key"?Object.keys(item.config||{}):undefined})):data&&typeof data==="object"?{fields:Object.keys(data),status:data.status,error:data.error}:data},null,2));}
      catch(error){console.log(error.message);}
    }
  }else if(command==="recover-license"){
    const email=consent();
    const {data:users}=await request(`${realmPath}/users?max=1`);
    const {data:components}=await request(`${realmPath}/components`);
    const vendor=components.find(item=>item.providerId==="tide-vendor-key");
    if(users.length||!vendor||vendor.config?.gVRK?.[0])fail("Recovery is limited to the existing incomplete realm with no users and no active vendor key.");
    // Verified in this installed VendorResource: this resumes the existing vendor lifecycle
    // without calling CreateTideIdp again. Explicitly request only the already-authorized free tier.
    const {data,status}=await request(`${realmPath}/vendorResources/CreateTideVendorKey`,{method:"POST",form:{licensingTier:"free",email}});
    const outcome=typeof data==="string"?data:data?.message;
    if(outcome!=="CREATED")fail("Tide has not confirmed a completed free-tier activation. No payment was authorized.");
    console.log(JSON.stringify({operation:"resume existing free-tier vendor licence",status,result:outcome}));
  }else if(command==="check")checkDocker();
  else if(command==="init")await initialize();
  else if(command==="export"){consent();await exportAdapter();}
  else fail(`Unknown command: ${command}`);
}catch(error){console.error(`SETUP STOPPED: ${error.message}`);process.exitCode=2;}
