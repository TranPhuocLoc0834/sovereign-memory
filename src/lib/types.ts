export type Category = "Study" | "Finance" | "General";
export type AgentKind = "study-agent" | "finance-agent";
export interface Principal { subject: string; displayName: string; roles: string[]; isAdmin: boolean }
export interface Agent { id: string; name: string; identity_subject: string; description: string; kind: AgentKind }
export interface Grant { agent_id: string; agent_name: string; revoked_at: string | null }
export interface Memory { id: string; owner_id: string; owner_name: string; title: string; content: string; category: Category; created_at: string; permissions: Grant[] }
export interface AccessLog { id: string; actor_id: string; actor_name: string; memory_id: string | null; action: string; result: string; reason: string; timestamp: string }
export interface SessionData { principal: Principal; agent: Agent | null; agents: Agent[]; memories: Memory[]; targets: {id:string; title:string; category:Category}[]; logs: AccessLog[]; stats: { memories: number; agents: number; allowed: number; denied: number } }
export interface TidePublicConfig { realm: string; "auth-server-url": string; resource: string; "public-client": boolean; "ssl-required": string; "confidential-port": number; jwk: { keys: import("jose").JWK[] }; vendorId: string; homeOrkUrl: string }
