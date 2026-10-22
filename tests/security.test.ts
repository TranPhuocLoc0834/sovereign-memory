/** Application security tests. Locally generated signing keys; NOT live Tide integration. */
import { before, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { generateKeyPair, exportJWK, SignJWT, calculateJwkThumbprint, type JWK } from "jose";
import { NextRequest } from "next/server";
import { GET, POST } from "../src/app/api/[...path]/route";
import { loadTideConfig } from "../src/lib/auth/tidecloakConfig";

let realmKey: CryptoKey, attackerKey: CryptoKey, proofKey: CryptoKey, proofPublic:JWK, thumbprint:string;
let studyMemory:string, financeMemory:string, studyAgent:string, financeAgent:string;
const actors={owner:["memory-owner"],study:["study-agent"],finance:["finance-agent"],outsider:[],otherOwner:["memory-owner"],admin:[]} as const;
type Actor=keyof typeof actors;
const issuer="https://test-issuer.invalid/realms/unit-tests";

before(async()=>{
  process.env.DATABASE_PATH=":memory:";
  process.env.APP_URL="http://localhost:3000";
  const realm=await generateKeyPair("EdDSA");realmKey=realm.privateKey;
  attackerKey=(await generateKeyPair("EdDSA")).privateKey;
  const proof=await generateKeyPair("ES256");proofKey=proof.privateKey;proofPublic=await exportJWK(proof.publicKey);thumbprint=await calculateJwkThumbprint(proofPublic);
  process.env.CLIENT_ADAPTER=JSON.stringify({realm:"unit-tests","auth-server-url":"https://test-issuer.invalid",resource:"test-client","public-client":true,jwk:{keys:[{...await exportJWK(realm.publicKey),kid:"unit-test"}]},vendorId:"UNIT-TEST-ONLY",homeOrkUrl:"https://test-ork.invalid"});
});

async function token(actor:Actor,extra:Record<string,unknown>={},key=realmKey){
  return new SignJWT({azp:"test-client",realm_access:{roles:actors[actor]},cnf:{jkt:thumbprint},...(actor==="admin"?{resource_access:{"realm-management":{roles:["tide-realm-admin"]}}}:{}),...extra}).setProtectedHeader({alg:"EdDSA",kid:"unit-test"}).setSubject(actor).setIssuer(issuer).setIssuedAt().setExpirationTime("5m").sign(key);
}
async function signedRequest(method:string,path:string,actor:Actor,body?:unknown,options:{token?:string;noProof?:boolean;scheme?:string;proofMethod?:string;proofPath?:string;jti?:string;extraHeaders?:Record<string,string>}={}){
  const access=options.token||await token(actor);const url=`http://localhost:3000${path}`;
  const proof=await new SignJWT({htm:options.proofMethod||method,htu:`http://localhost:3000${options.proofPath||path.split("?")[0]}`,ath:createHash("sha256").update(access).digest("base64url")}).setProtectedHeader({alg:"ES256",typ:"dpop+jwt",jwk:proofPublic}).setJti(options.jti||randomUUID()).setIssuedAt().sign(proofKey);
  const headers:Record<string,string>={authorization:`${options.scheme||"DPoP"} ${access}`,"content-type":"application/json",...options.extraHeaders};if(!options.noProof)headers.dpop=proof;
  return new NextRequest(url,{method,headers,...(body===undefined?{}:{body:JSON.stringify(body)})});
}
async function call(method:string,path:string,actor:Actor,body?:unknown,options?:Parameters<typeof signedRequest>[4]){
  return (method==="GET"?GET:POST)(await signedRequest(method,path,actor,body,options));
}

test("unauthenticated and malformed tokens are rejected",async()=>{
  const noAuth=await GET(new NextRequest("http://localhost:3000/api/session"));assert.equal(noAuth.status,401);
  const invalid=await GET(new NextRequest("http://localhost:3000/api/session",{headers:{authorization:"DPoP invalid"}}));assert.equal(invalid.status,401);
});
test("a token signed by an untrusted key is rejected",async()=>{
  const response=await call("GET","/api/session","owner",undefined,{token:await token("owner",{},attackerKey)});assert.equal(response.status,401);
});
test("wrong issuer/client, expired token and future issued-at are rejected",async()=>{
  for(const extra of [{iss:"https://wrong.invalid"},{azp:"another-client"},{exp:1}]){
    let value;
    if(extra.iss)value=await new SignJWT({azp:"test-client",cnf:{jkt:thumbprint}}).setProtectedHeader({alg:"EdDSA",kid:"unit-test"}).setIssuer(extra.iss).setSubject("owner").setIssuedAt().setExpirationTime("5m").sign(realmKey);
    else if(extra.exp)value=await new SignJWT({azp:"test-client",cnf:{jkt:thumbprint}}).setProtectedHeader({alg:"EdDSA",kid:"unit-test"}).setIssuer(issuer).setSubject("owner").setIssuedAt().setExpirationTime(1).sign(realmKey);
    else value=await token("owner",extra);
    assert.equal((await call("GET","/api/session","owner",undefined,{token:value})).status,401);
  }
  const future=await new SignJWT({azp:"test-client",cnf:{jkt:thumbprint}}).setProtectedHeader({alg:"EdDSA",kid:"unit-test"}).setIssuer(issuer).setSubject("owner").setIssuedAt(Math.floor(Date.now()/1000)+600).setExpirationTime("20m").sign(realmKey);
  assert.equal((await call("GET","/api/session","owner",undefined,{token:future})).status,401);
});
test("Bearer replay, unbound tokens and missing proofs are rejected",async()=>{
  assert.equal((await call("GET","/api/session","owner",undefined,{scheme:"Bearer"})).status,401);
  assert.equal((await call("GET","/api/session","owner",undefined,{noProof:true})).status,401);
  assert.equal((await call("GET","/api/session","owner",undefined,{token:await token("owner",{cnf:{}})})).status,401);
});
test("proof is bound to method, URL, token and key; forwarded-host is not trusted",async()=>{
  assert.equal((await call("GET","/api/session","owner",undefined,{proofMethod:"POST"})).status,401);
  assert.equal((await call("GET","/api/session","owner",undefined,{proofPath:"/api/access"})).status,401);
  const wrongBinding=await token("owner",{cnf:{jkt:"wrong-key"}});
  assert.equal((await call("GET","/api/session","owner",undefined,{token:wrongBinding})).status,401);
  const forged=await signedRequest("GET","/api/session","owner",undefined,{extraHeaders:{"x-forwarded-host":"evil.invalid","x-forwarded-proto":"https"}});
  assert.equal((await GET(forged)).status,200);
  const first=await signedRequest("GET","/api/session","owner");
  const changedToken=await token("study");first.headers.set("authorization",`DPoP ${changedToken}`);
  assert.equal((await GET(first)).status,401);
});
test("the same DPoP proof cannot be replayed",async()=>{
  const request=await signedRequest("GET","/api/session","owner");
  assert.equal((await GET(new NextRequest(request))).status,200);
  assert.equal((await GET(new NextRequest(request))).status,401);
});
test("verified agent subjects register; demo seeding creates isolated synthetic memories",async()=>{
  studyAgent=(await (await call("GET","/api/session","study")).json()).agent.id;
  financeAgent=(await (await call("GET","/api/session","finance")).json()).agent.id;
  const response=await call("POST","/api/seed","owner",{});assert.equal(response.status,200);
  const data=await response.json();assert.equal(data.memories.length,2);
  studyMemory=data.memories.find((m:{category:string})=>m.category==="Study").id;
  financeMemory=data.memories.find((m:{category:string})=>m.category==="Finance").id;
  assert.equal((await (await call("GET","/api/session","otherOwner")).json()).memories.length,0);
});
test("Study and Finance agents can read their respective grants",async()=>{
  const study=await call("POST","/api/access","study",{memoryId:studyMemory});assert.equal(study.status,200);assert.equal((await study.json()).memory.content,"Project Alpha has a presentation scheduled for Friday.");
  const finance=await call("POST","/api/access","finance",{memoryId:financeMemory});assert.equal(finance.status,200);assert.equal((await finance.json()).memory.content,"Monthly project budget: 5,000 USD.");
});
test("cross-category and unauthorized actors receive 403 with no memory content",async()=>{
  for(const [actor,id] of [["study",financeMemory],["finance",studyMemory],["outsider",studyMemory],["admin",studyMemory]] as const){
    const response=await call("POST","/api/access",actor,{memoryId:id});assert.equal(response.status,403);
    const text=await response.text();assert.ok(!text.includes("5,000"));assert.ok(!text.includes("Project Alpha"));assert.ok(!text.includes('"content"'));
  }
});
test("a forged agent ID cannot change the signed-in principal",async()=>{
  const response=await call("POST","/api/access","study",{memoryId:financeMemory,agentId:financeAgent});assert.equal(response.status,403);
});
test("another owner or an administrator cannot modify the owner's grants",async()=>{
  assert.equal((await call("POST",`/api/memories/${studyMemory}/permissions`,"otherOwner",{agentId:studyAgent,revoke:true})).status,404);
  assert.equal((await call("POST",`/api/memories/${studyMemory}/permissions`,"admin",{agentId:studyAgent,revoke:true})).status,403);
});
test("revocation blocks future reads and repeated seeding never restores the grant",async()=>{
  assert.equal((await call("POST",`/api/memories/${studyMemory}/permissions`,"owner",{agentId:studyAgent,revoke:true})).status,200);
  assert.equal((await call("POST","/api/access","study",{memoryId:studyMemory})).status,403);
  assert.equal((await call("POST","/api/seed","owner",{})).status,200);
  assert.equal((await call("POST","/api/access","study",{memoryId:studyMemory})).status,403);
});
test("an owner can explicitly restore a grant",async()=>{
  assert.equal((await call("POST",`/api/memories/${studyMemory}/permissions`,"owner",{agentId:studyAgent,revoke:false})).status,200);
  assert.equal((await call("POST","/api/access","study",{memoryId:studyMemory})).status,200);
});
test("agent role removal or ambiguous agent roles deny existing grants",async()=>{
  assert.equal((await call("POST","/api/access","study",{memoryId:studyMemory},{token:await token("study",{realm_access:{roles:[]}})})).status,403);
  assert.equal((await call("POST","/api/access","study",{memoryId:studyMemory},{token:await token("study",{realm_access:{roles:["study-agent","finance-agent"]}})})).status,403);
});
test("removed owner role cannot read owned plaintext through the session endpoint",async()=>{
  const data=await (await call("GET","/api/session","owner",undefined,{token:await token("owner",{realm_access:{roles:[]}})})).json();assert.deepEqual(data.memories,[]);
});
test("logs are scoped and contain neither memory plaintext nor tokens",async()=>{
  const owner=await (await call("GET","/api/logs","owner")).json();
  assert.ok(owner.logs.some((l:{result:string})=>l.result==="DENIED"));assert.ok(owner.logs.some((l:{action:string})=>l.action==="permission.revoke"));
  const text=JSON.stringify(owner);assert.ok(!text.includes("5,000"));assert.ok(!text.includes("scheduled for Friday"));assert.ok(!text.includes("eyJ"));
  assert.deepEqual((await (await call("GET","/api/logs","otherOwner")).json()).logs.filter((l:{action:string})=>l.action==="memory.read"),[]);
  assert.equal((await (await call("GET","/api/session","admin")).json()).memories.length,0);
});
test("input validation rejects unknown fields, SQL fragments and malformed identifiers",async()=>{
  assert.equal((await call("POST","/api/memories","owner",{title:"x",content:"x",category:"Study",owner_id:"otherOwner"})).status,400);
  assert.equal((await call("POST","/api/access","study",{memoryId:"' OR 1=1 --"})).status,400);
  assert.equal((await call("POST","/api/memories","owner",{title:"",content:"x",category:"Study"})).status,400);
});
test("cross-origin mutation fails closed",async()=>{
  assert.equal((await call("POST","/api/seed","owner",{},{extraHeaders:{origin:"https://evil.invalid"}})).status,403);
});
test("public adapter preserves Tide origin proofs while rejecting confidential/private material",()=>{
  const original=process.env.CLIENT_ADAPTER!;
  try{
    const config=JSON.parse(original);
    const originField="client-origin-auth-http://localhost:3000";
    process.env.CLIENT_ADAPTER=JSON.stringify({...config,[originField]:"UNIT-TEST-ORIGIN-PROOF",unrelatedServerSetting:"do-not-publish"});
    const exposed=loadTideConfig() as unknown as Record<string,unknown>;
    assert.equal(exposed[originField],"UNIT-TEST-ORIGIN-PROOF");assert.equal(exposed.unrelatedServerSetting,undefined);
    process.env.CLIENT_ADAPTER=JSON.stringify({...config,credentials:{secret:"UNIT-TEST-ONLY"}});
    assert.throws(()=>loadTideConfig());
    process.env.CLIENT_ADAPTER=JSON.stringify({...config,jwk:{keys:[{...config.jwk.keys[0],d:"UNIT-TEST-ONLY"}]}});
    assert.throws(()=>loadTideConfig());
    process.env.CLIENT_ADAPTER=JSON.stringify({...config,"public-client":false});assert.throws(()=>loadTideConfig());
  }finally{process.env.CLIENT_ADAPTER=original;}
});
