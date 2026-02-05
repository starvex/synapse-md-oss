/**
 * Synapse API client
 */

const DEFAULT_API = 'http://localhost:3210';

interface SynapseConfig {
  apiUrl: string;
  key: string;
}

function getConfig(): SynapseConfig {
  const key = process.env.SYNAPSE_KEY || '';
  const apiUrl = process.env.SYNAPSE_API || DEFAULT_API;
  return { apiUrl, key };
}

async function request(method: string, path: string, body?: any, keyOverride?: string): Promise<any> {
  const config = getConfig();
  const key = keyOverride || config.key;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (key) {
    headers['Authorization'] = `Bearer ${key}`;
  }

  const res = await fetch(`${config.apiUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  
  return data;
}

export async function createWorkspace(name: string): Promise<any> {
  return request('POST', '/api/v1/workspaces', { name });
}

export async function listEntries(opts: {
  since?: string;
  namespace?: string;
  tag?: string;
  limit?: number;
} = {}): Promise<any> {
  const params = new URLSearchParams();
  if (opts.since) params.set('since', opts.since);
  if (opts.namespace) params.set('namespace', opts.namespace);
  if (opts.tag) params.set('tag', opts.tag);
  if (opts.limit) params.set('limit', String(opts.limit));
  
  const qs = params.toString();
  return request('GET', `/api/v1/entries${qs ? '?' + qs : ''}`);
}

export async function writeEntry(entry: {
  from: string;
  namespace?: string;
  content: string;
  tags?: string[];
  priority?: string;
  ttl?: string;
}): Promise<any> {
  return request('POST', '/api/v1/entries', entry);
}

export async function listAgents(): Promise<any> {
  return request('GET', '/api/v1/agents');
}

export async function registerAgent(agent: {
  id: string;
  role?: string;
  capabilities?: string[];
}): Promise<any> {
  return request('POST', '/api/v1/agents', agent);
}

export async function getStatus(): Promise<any> {
  return request('GET', '/api/v1/status');
}

export async function getAudit(opts: { limit?: number; since?: string } = {}): Promise<any> {
  const params = new URLSearchParams();
  if (opts.limit) params.set('limit', String(opts.limit));
  if (opts.since) params.set('since', opts.since);
  
  const qs = params.toString();
  return request('GET', `/api/v1/audit${qs ? '?' + qs : ''}`);
}

export { getConfig };
