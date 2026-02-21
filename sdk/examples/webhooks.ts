/**
 * webhooks.ts — Register a webhook and verify incoming signatures
 *
 * This example shows:
 *  1. Registering a webhook to receive real-time entry notifications
 *  2. Verifying the HMAC-SHA256 signature on incoming webhook payloads
 *  3. A minimal HTTP server to receive deliveries (Node 18+ built-ins only)
 *
 * Run:
 *   SYNAPSE_API_KEY=syn_w_xxx WEBHOOK_SECRET=my-secret npx tsx examples/webhooks.ts
 */

import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { SynapseClient, WebhookPayload, SynapseError } from '../src/index.js';

const API_KEY = process.env.SYNAPSE_API_KEY ?? 'syn_w_your_write_key';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? 'change-me-to-something-random';
// Public URL where Synapse can reach your server (use ngrok/localtunnel for local dev)
const WEBHOOK_URL = process.env.WEBHOOK_URL ?? 'https://your-server.com/hooks/synapse';
const PORT = Number(process.env.PORT ?? 3456);

// ── Webhook receiver ──────────────────────────────────────────────────────────

/**
 * Collect the raw request body as a string.
 * Always parse the signature BEFORE JSON.parse() so we verify the exact bytes
 * the server sent.
 */
function rawBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function handleWebhook(req: IncomingMessage, res: ServerResponse) {
  rawBody(req).then((body) => {
    const signature = req.headers['x-synapse-signature'] as string | undefined;

    // ── Signature verification ─────────────────────────────────────────────
    if (signature) {
      const valid = SynapseClient.verifyWebhookSignature(body, signature, WEBHOOK_SECRET);
      if (!valid) {
        console.warn('❌ Signature mismatch — rejecting webhook delivery');
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid signature' }));
        return;
      }
      console.log('✅ Signature verified');
    } else {
      console.warn('⚠️  No signature header — continuing (not recommended in production)');
    }

    // ── Handle the event ───────────────────────────────────────────────────
    const payload = JSON.parse(body) as WebhookPayload;

    console.log(`\n🔔 Webhook event: ${payload.event}`);
    console.log(`   Workspace : ${payload.workspace_id}`);
    console.log(`   Entry     : ${payload.entry.id}`);
    console.log(`   Namespace : ${payload.entry.namespace}`);
    console.log(`   From      : ${payload.entry.from_agent}`);
    console.log(`   Priority  : ${payload.entry.priority}${payload.urgent ? ' 🚨 URGENT' : ''}`);
    console.log(`   Content   : ${payload.entry.content.slice(0, 80)}`);

    // ── Your business logic here ───────────────────────────────────────────
    if (payload.urgent) {
      // e.g. page on-call, send Telegram alert, etc.
      console.log('   → Escalating urgent entry to on-call');
    }

    if (payload.entry.tags.includes('deploy')) {
      console.log('   → Triggering smoke tests');
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ received: true }));
  }).catch((err: unknown) => {
    console.error('Webhook handler error:', err);
    res.writeHead(500);
    res.end();
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const synapse = new SynapseClient({ apiKey: API_KEY });

  // ── 1. Start the HTTP receiver ────────────────────────────────────────────
  const server = createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/hooks/synapse') {
      handleWebhook(req, res);
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  await new Promise<void>((resolve) => server.listen(PORT, resolve));
  console.log(`🌐 Webhook receiver listening on port ${PORT}`);
  console.log(`   POST http://localhost:${PORT}/hooks/synapse\n`);

  // ── 2. Register the webhook with Synapse ──────────────────────────────────
  let webhook;
  try {
    webhook = await synapse.createWebhook(WEBHOOK_URL, {
      namespaces: ['status', 'alerts', 'blockers'],  // watch these namespaces
      events: ['entry.created'],
      secret: WEBHOOK_SECRET,
    });
    console.log('✅ Webhook registered:', webhook.webhookId);
    console.log('   URL       :', webhook.url);
    console.log('   Namespaces:', webhook.namespaces.join(', ') || '(all)');
  } catch (err) {
    if (err instanceof SynapseError) {
      console.error('Failed to register webhook:', err.code, err.message);
    }
    throw err;
  }

  // ── 3. Test the webhook ───────────────────────────────────────────────────
  try {
    const result = await synapse.testWebhook(webhook.webhookId);
    console.log('🧪 Webhook test:', result.success ? 'PASSED ✅' : 'FAILED ❌');
  } catch (err) {
    console.warn('Webhook test failed (endpoint may not be publicly reachable):', err);
  }

  // ── 4. Write a test entry — this should trigger the webhook ───────────────
  await synapse.write('status', 'Test entry from webhooks.ts example', {
    priority: 'info',
    tags: ['demo'],
  });
  console.log('\n📝 Test entry written — you should receive a webhook delivery shortly\n');

  // ── 5. List webhooks ──────────────────────────────────────────────────────
  const hooks = await synapse.listWebhooks();
  console.log(`📋 Active webhooks: ${hooks.length}`);
  for (const h of hooks) {
    console.log(`   ${h.webhookId}  ${h.status}  failures=${h.failureCount ?? 0}`);
  }

  // Keep the server running to receive deliveries
  console.log('\n⏳ Waiting for webhook deliveries (Ctrl+C to stop)...');

  // Clean up on exit
  process.on('SIGINT', async () => {
    console.log('\n🧹 Cleaning up webhook...');
    try {
      await synapse.deleteWebhook(webhook.webhookId);
      console.log('   Webhook deleted');
    } catch (_) { /* ignore */ }
    server.close();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
