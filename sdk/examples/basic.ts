/**
 * basic.ts — Read and write entries with @synapse-md/client
 *
 * Run:
 *   npx tsx examples/basic.ts
 *
 * Or compile first:
 *   npx tsc && node dist/esm/examples/basic.js
 */

import { SynapseClient, SynapseError } from '../src/index.js';

const API_KEY = process.env.SYNAPSE_API_KEY ?? 'syn_a_your_key_here';
const SYNAPSE_URL = process.env.SYNAPSE_URL; // optional — defaults to hosted instance

async function main() {
  // ── 1. Create the client ──────────────────────────────────────────────────
  const synapse = new SynapseClient({
    apiKey: API_KEY,
    url: SYNAPSE_URL,
    agentId: 'demo-agent',   // stamped on entries written with a workspace key
    timeout: 10_000,
  });

  // ── 2. Check who we are ───────────────────────────────────────────────────
  const me = await synapse.whoami();
  console.log('✅ Connected to workspace:', me.workspaceName, `(${me.workspaceId})`);
  if (me.agent) {
    console.log('   Agent:', me.agent.agentId, '/', me.agent.role);
  } else {
    console.log('   Auth: workspace key');
  }

  // ── 3. Write an entry ─────────────────────────────────────────────────────
  const entry = await synapse.write('status', 'Demo agent online — all systems nominal', {
    priority: 'info',
    tags: ['demo', 'startup'],
    ttl: '1h',
  });
  console.log('\n📝 Entry written:', entry.id);
  console.log('   Namespace:', entry.namespace);
  console.log('   Priority:', entry.priority);

  // ── 4. Write a warning ────────────────────────────────────────────────────
  await synapse.write('alerts', 'Memory usage above 80% threshold', {
    priority: 'warn',
    tags: ['memory', 'performance'],
  });
  console.log('⚠️  Alert written');

  // ── 5. Read the status namespace ──────────────────────────────────────────
  const statusEntries = await synapse.read('status', { limit: 5, since: '1h' });
  console.log(`\n📖 Last ${statusEntries.length} status entries:`);
  for (const e of statusEntries) {
    console.log(`   [${e.priority.toUpperCase()}] ${e.from_agent}: ${e.content.slice(0, 60)}`);
  }

  // ── 6. Read with tag filter ───────────────────────────────────────────────
  const tagged = await synapse.read('status', { tag: 'demo' });
  console.log(`\n🏷  Entries tagged "demo": ${tagged.length}`);

  // ── 7. Fetch a single entry by ID ─────────────────────────────────────────
  if (statusEntries.length > 0) {
    const single = await synapse.getEntry(statusEntries[0].id);
    console.log('\n🔍 Fetched single entry:', single.id);
  }

  // ── 8. List namespaces ────────────────────────────────────────────────────
  const namespaces = await synapse.list();
  console.log('\n📂 Namespaces:');
  for (const ns of namespaces) {
    console.log(`   ${ns.namespace}: ${ns.count} entries`);
  }

  // ── 9. Error handling ─────────────────────────────────────────────────────
  try {
    await synapse.getEntry('syn-does-not-exist');
  } catch (err) {
    if (err instanceof SynapseError) {
      console.log(`\n✔  Error handled: ${err.name} [${err.code}] ${err.message}`);
    }
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
