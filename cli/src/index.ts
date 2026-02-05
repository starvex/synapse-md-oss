#!/usr/bin/env node

/**
 * synapse-md — Shared memory for AI agent teams
 * 
 * Usage:
 *   synapse-md init --name "my-team"
 *   synapse-md join --key syn_r_xxx
 *   synapse-md write "message" [--from agent] [--tags tag1,tag2] [--namespace ns] [--priority info|important|critical]
 *   synapse-md read [--since 24h] [--namespace ns] [--tag tag] [--limit 50]
 *   synapse-md status
 *   synapse-md agents
 *   synapse-md register --id agent-id [--role "Role Name"] [--capabilities cap1,cap2]
 *   synapse-md audit [--limit 50] [--since 24h]
 */

import { createWorkspace, listEntries, writeEntry, listAgents, registerAgent, getStatus, getAudit, getConfig } from './api.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const CONFIG_FILE = join(process.env.HOME || '~', '.synapse-md.json');

interface LocalConfig {
  apiUrl?: string;
  key?: string;
  workspaceName?: string;
}

function loadLocalConfig(): LocalConfig {
  if (existsSync(CONFIG_FILE)) {
    return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
  }
  return {};
}

function saveLocalConfig(config: LocalConfig) {
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

function parseArgs(args: string[]): { command: string; positional: string[]; flags: Record<string, string> } {
  const command = args[0] || 'help';
  const positional: string[] = [];
  const flags: Record<string, string> = {};
  
  for (let i = 1; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : 'true';
      flags[key] = value;
    } else {
      positional.push(args[i]);
    }
  }
  
  return { command, positional, flags };
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

async function main() {
  const { command, positional, flags } = parseArgs(process.argv.slice(2));

  // Load local config and set env if not already set
  const localConfig = loadLocalConfig();
  if (localConfig.key && !process.env.SYNAPSE_KEY) {
    process.env.SYNAPSE_KEY = localConfig.key;
  }
  if (localConfig.apiUrl && !process.env.SYNAPSE_API) {
    process.env.SYNAPSE_API = localConfig.apiUrl;
  }

  try {
    switch (command) {
      case 'init': {
        const name = flags.name || positional[0] || 'my-team';
        const result = await createWorkspace(name);
        
        // Save write key locally
        saveLocalConfig({
          ...localConfig,
          key: result.writeKey,
          apiUrl: process.env.SYNAPSE_API || 'http://localhost:3210',
          workspaceName: name,
        });

        console.log(`\n✅ Workspace "${name}" created!\n`);
        console.log(`  Write key: ${result.writeKey}`);
        console.log(`  Read key:  ${result.readKey}`);
        console.log(`\n  Share the read key with other agents.`);
        console.log(`  Write key saved to ${CONFIG_FILE}\n`);
        break;
      }

      case 'join': {
        const key = flags.key || positional[0];
        if (!key) {
          console.error('Usage: synapse-md join --key syn_r_xxx');
          process.exit(1);
        }
        
        // Save key locally
        saveLocalConfig({
          ...localConfig,
          key,
          apiUrl: flags.api || process.env.SYNAPSE_API || 'http://localhost:3210',
        });

        // Verify connection
        process.env.SYNAPSE_KEY = key;
        const status = await getStatus();
        console.log(`\n✅ Joined workspace "${status.workspace}"!`);
        console.log(`  Agents: ${status.agents} | Entries: ${status.entries}`);
        console.log(`  Key saved to ${CONFIG_FILE}\n`);
        break;
      }

      case 'write': {
        const content = positional.join(' ');
        if (!content) {
          console.error('Usage: synapse-md write "your message" [--from agent] [--tags tag1,tag2]');
          process.exit(1);
        }

        const result = await writeEntry({
          from: flags.from || process.env.SYNAPSE_AGENT || 'anonymous',
          namespace: flags.namespace || 'general',
          content,
          tags: flags.tags ? flags.tags.split(',') : [],
          priority: flags.priority || 'info',
          ttl: flags.ttl,
        });

        console.log(`✅ Entry ${result.id} created`);
        break;
      }

      case 'read': {
        const result = await listEntries({
          since: flags.since || '24h',
          namespace: flags.namespace,
          tag: flags.tag,
          limit: flags.limit ? parseInt(flags.limit) : 50,
        });

        if (result.entries.length === 0) {
          console.log('No entries found.');
          break;
        }

        console.log(`\n📋 ${result.total} entries${flags.since ? ` (last ${flags.since})` : ''}:\n`);
        
        for (const entry of result.entries) {
          const priority = entry.priority === 'critical' ? '🔴' : entry.priority === 'important' ? '🟡' : '⚪';
          const tags = entry.tags?.length ? ` [${entry.tags.join(', ')}]` : '';
          const agent = entry.from || entry.from_agent || 'unknown';
          console.log(`${priority} [${agent}] ${entry.content}${tags}`);
          console.log(`   ${entry.namespace} · ${timeAgo(entry.created_at)} · ${entry.id}`);
          console.log();
        }
        break;
      }

      case 'status': {
        const status = await getStatus();
        console.log(`\n📊 Workspace: ${status.workspace}`);
        console.log(`   Agents: ${status.agents} | Entries: ${status.entries}`);
        console.log(`   Last activity: ${status.lastActivity ? timeAgo(status.lastActivity) : 'none'}\n`);
        break;
      }

      case 'agents': {
        const result = await listAgents();
        if (result.agents.length === 0) {
          console.log('No agents registered.');
          break;
        }
        console.log(`\n🤖 ${result.agents.length} agents:\n`);
        for (const agent of result.agents) {
          const caps = agent.capabilities?.length ? ` (${agent.capabilities.join(', ')})` : '';
          console.log(`  ${agent.id} — ${agent.role || 'no role'}${caps}`);
          console.log(`    Last seen: ${agent.last_seen ? timeAgo(agent.last_seen) : 'never'}`);
        }
        console.log();
        break;
      }

      case 'register': {
        const id = flags.id || positional[0];
        if (!id) {
          console.error('Usage: synapse-md register --id agent-id [--role "Role"]');
          process.exit(1);
        }
        await registerAgent({
          id,
          role: flags.role,
          capabilities: flags.capabilities ? flags.capabilities.split(',') : [],
        });
        console.log(`✅ Agent "${id}" registered`);
        break;
      }

      case 'audit': {
        const result = await getAudit({
          limit: flags.limit ? parseInt(flags.limit) : 20,
          since: flags.since,
        });
        if (result.events.length === 0) {
          console.log('No audit events.');
          break;
        }
        console.log(`\n🔍 Audit log (${result.events.length} events):\n`);
        for (const event of result.events) {
          console.log(`  ${timeAgo(event.timestamp)} | ${event.action} | ${event.agent || 'system'} | ${event.details || ''}`);
        }
        console.log();
        break;
      }

      case 'help':
      default:
        console.log(`
synapse-md — Shared memory for AI agent teams

Commands:
  init     --name "team-name"          Create workspace (get keys)
  join     --key syn_r_xxx             Connect to workspace (read-only)
  write    "message" --from agent      Write an entry
  read     [--since 24h] [--tag x]     Read entries
  status                               Workspace overview
  agents                               List registered agents
  register --id agent [--role "Role"]  Register an agent
  audit    [--limit 20]                View audit log

Environment:
  SYNAPSE_KEY    API key (or use ~/.synapse-md.json)
  SYNAPSE_API    API URL (default: http://localhost:3210)
  SYNAPSE_AGENT  Default agent name for writes
`);
    }
  } catch (err: any) {
    console.error(`❌ Error: ${err.message}`);
    process.exit(1);
  }
}

main();
