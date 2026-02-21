/**
 * openai-agent.ts — Using Synapse with an OpenAI-powered agent
 *
 * Demonstrates:
 *  1. How an OpenAI tool-calling agent reads Synapse for context
 *  2. Writing decisions and status updates back to Synapse
 *  3. Multi-agent coordination patterns (handoff, decisions, blockers)
 *  4. Fingerprint setup for verified agent identity
 *
 * Prerequisites:
 *   npm i openai                       (not included — this is an example only)
 *   export OPENAI_API_KEY=sk-xxx
 *   export SYNAPSE_API_KEY=syn_a_xxx
 *
 * Run:
 *   npx tsx examples/openai-agent.ts
 */

import { SynapseClient, Entry, SynapseError } from '../src/index.js';

// ─── Synapse setup ────────────────────────────────────────────────────────────

const synapse = new SynapseClient({
  apiKey: process.env.SYNAPSE_API_KEY ?? 'syn_a_your_key',
  agentId: 'planner-agent',

  // Optional: fingerprint to prove this agent is running inside your trusted gateway
  // fingerprint: SynapseClient.generateFingerprint(
  //   'gw-prod-01',
  //   'planner-agent',
  //   process.env.FINGERPRINT_SECRET!,
  // ),
});

// ─── OpenAI tool definitions ──────────────────────────────────────────────────
// These are passed to the OpenAI chat completions API as `tools`.
// The agent calls them when it wants to read/write shared memory.

const SYNAPSE_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'synapse_read',
      description:
        'Read recent entries from a Synapse namespace. Use this to get context from other agents '
        + 'before making decisions — check "status", "decisions", and "handoff" namespaces.',
      parameters: {
        type: 'object',
        properties: {
          namespace: {
            type: 'string',
            description: 'Namespace to read from (e.g. "status", "decisions", "handoff")',
          },
          since: {
            type: 'string',
            enum: ['30m', '1h', '24h', '7d'],
            description: 'Return only entries newer than this',
          },
          limit: { type: 'number', description: 'Max entries to return (default: 10)' },
        },
        required: ['namespace'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'synapse_write',
      description:
        'Write an entry to a Synapse namespace. Use this to share decisions, status updates, '
        + 'or handoff work to another agent.',
      parameters: {
        type: 'object',
        properties: {
          namespace: {
            type: 'string',
            description: 'Target namespace (e.g. "decisions", "status", "handoff", "blockers")',
          },
          content: { type: 'string', description: 'Entry content' },
          priority: {
            type: 'string',
            enum: ['low', 'info', 'warn', 'error', 'critical'],
            description: 'Urgency level (default: info)',
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional searchable labels',
          },
        },
        required: ['namespace', 'content'],
      },
    },
  },
];

// ─── Tool executor ────────────────────────────────────────────────────────────

interface ToolCall {
  id: string;
  function: { name: string; arguments: string };
}

async function executeTool(toolCall: ToolCall): Promise<string> {
  const args = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;

  switch (toolCall.function.name) {
    case 'synapse_read': {
      const namespace = String(args['namespace']);
      const since = args['since'] ? String(args['since']) : undefined;
      const limit = args['limit'] ? Number(args['limit']) : 10;

      console.log(`   📖 [synapse_read] namespace=${namespace} since=${since ?? 'any'}`);

      try {
        const entries = await synapse.read(namespace, { since, limit });
        if (entries.length === 0) {
          return `No entries found in "${namespace}" namespace.`;
        }
        const formatted = entries.map((e: Entry) =>
          `[${e.priority.toUpperCase()}] ${e.from_agent} @ ${e.created_at}: ${e.content}`,
        ).join('\n');
        return `Found ${entries.length} entries in "${namespace}":\n${formatted}`;
      } catch (err) {
        if (err instanceof SynapseError) {
          return `Error reading from Synapse: ${err.message} (${err.code})`;
        }
        throw err;
      }
    }

    case 'synapse_write': {
      const namespace = String(args['namespace']);
      const content = String(args['content']);
      const priority = args['priority'] as 'low' | 'info' | 'warn' | 'error' | 'critical' | undefined;
      const tags = Array.isArray(args['tags']) ? args['tags'] as string[] : [];

      console.log(`   📝 [synapse_write] namespace=${namespace} priority=${priority ?? 'info'}`);

      try {
        const entry = await synapse.write(namespace, content, { priority, tags });
        return `Entry written successfully. ID: ${entry.id}`;
      } catch (err) {
        if (err instanceof SynapseError) {
          return `Error writing to Synapse: ${err.message} (${err.code})`;
        }
        throw err;
      }
    }

    default:
      return `Unknown tool: ${toolCall.function.name}`;
  }
}

// ─── Agent loop ───────────────────────────────────────────────────────────────
// This is the agentic loop pattern for OpenAI tool-calling.
// Replace the mock implementation below with the real openai client.

interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
}

/**
 * Minimal mock of the OpenAI chat completions response.
 * Replace with: `import OpenAI from 'openai'; const openai = new OpenAI();`
 */
async function callOpenAI(messages: Message[]): Promise<{
  finish_reason: string;
  message: { role: 'assistant'; content: string | null; tool_calls?: ToolCall[] };
}> {
  // ── REPLACE THIS with real OpenAI call ────────────────────────────────────
  // const openai = new OpenAI();
  // const completion = await openai.chat.completions.create({
  //   model: 'gpt-4o',
  //   messages,
  //   tools: SYNAPSE_TOOLS,
  //   tool_choice: 'auto',
  // });
  // return completion.choices[0];
  // ── END REPLACE ────────────────────────────────────────────────────────────

  // Mock: first call reads status, second call writes a decision
  const isFirstCall = messages.length <= 2;
  if (isFirstCall) {
    return {
      finish_reason: 'tool_calls',
      message: {
        role: 'assistant',
        content: null,
        tool_calls: [{
          id: 'call_1',
          function: {
            name: 'synapse_read',
            arguments: JSON.stringify({ namespace: 'status', since: '24h', limit: 5 }),
          },
        }],
      },
    };
  }
  // Final response after reading context
  return {
    finish_reason: 'stop',
    message: {
      role: 'assistant',
      content: 'Based on recent status entries, I recommend proceeding with the deployment. '
        + 'I have written this decision to the decisions namespace.',
      tool_calls: undefined,
    },
  };
}

async function runAgent(userPrompt: string) {
  console.log('\n🤖 Agent starting...');
  console.log('   Prompt:', userPrompt);

  const messages: Message[] = [
    {
      role: 'system',
      content:
        'You are a planning agent. Before making any decision, always read the "status" and '
        + '"decisions" namespaces in Synapse to understand what other agents have done. '
        + 'After deciding, write your decision to the "decisions" namespace with appropriate priority. '
        + 'If you are blocked, write to the "blockers" namespace with priority "error".',
    },
    {
      role: 'user',
      content: userPrompt,
    },
  ];

  // Agentic loop — runs until the model returns finish_reason: 'stop'
  for (let step = 0; step < 10; step++) {
    console.log(`\n⚙️  Step ${step + 1}`);
    const response = await callOpenAI(messages);

    messages.push({
      role: 'assistant',
      content: response.message.content ?? '',
      tool_calls: response.message.tool_calls,
    });

    if (response.finish_reason === 'stop') {
      console.log('\n✅ Agent response:', response.message.content);
      break;
    }

    if (response.finish_reason === 'tool_calls' && response.message.tool_calls) {
      for (const toolCall of response.message.tool_calls) {
        const result = await executeTool(toolCall);
        messages.push({
          role: 'tool',
          content: result,
          tool_call_id: toolCall.id,
        });
      }
    }
  }
}

// ─── Multi-agent coordination patterns ───────────────────────────────────────

/**
 * Pattern 1: Agent reads handoffs from previous agents
 */
async function checkForHandoffs(): Promise<Entry[]> {
  console.log('\n📥 Checking for handoffs...');
  const handoffs = await synapse.read('handoff', { since: '24h', limit: 20 });
  const myHandoffs = handoffs.filter(
    (e) => e.tags.includes('planner-agent') || e.tags.includes('all'),
  );
  console.log(`   Found ${myHandoffs.length} handoffs for this agent`);
  return myHandoffs;
}

/**
 * Pattern 2: Write a blocker for human attention
 */
async function raiseBlocker(description: string): Promise<void> {
  console.log('\n🚨 Raising blocker...');
  await synapse.write('blockers', description, {
    priority: 'error',
    tags: ['planner-agent', 'needs-human'],
    ttl: '7d',
  });
  console.log('   Blocker written — humans will be notified via webhook');
}

/**
 * Pattern 3: Write a decision record for audit trail
 */
async function recordDecision(decision: string, rationale: string): Promise<void> {
  const content = `DECISION: ${decision}\n\nRATIONALE: ${rationale}`;
  await synapse.write('decisions', content, {
    priority: 'info',
    tags: ['planner-agent', 'architecture'],
  });
  console.log('   Decision recorded to Synapse');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  try {
    const me = await synapse.whoami();
    console.log(`✅ Connected as ${me.agent?.agentId ?? 'workspace'} to ${me.workspaceName}`);

    // Check for work handed off by other agents
    const handoffs = await checkForHandoffs();
    if (handoffs.length > 0) {
      console.log('\n📋 Pending handoffs:');
      for (const h of handoffs) {
        console.log(`   - ${h.content.slice(0, 80)}`);
      }
    }

    // Run the agent with Synapse tools available
    await runAgent('Should we deploy the new API version? Check what other agents have reported.');

    // Record a decision
    await recordDecision(
      'Proceed with API v2 deployment',
      'All status checks green. No blockers reported in last 24h.',
    );

    // Simulate raising a blocker
    // await raiseBlocker('Database migration requires DBA approval before proceeding.');

  } catch (err) {
    if (err instanceof SynapseError) {
      console.error(`Synapse error [${err.code}]:`, err.message);
    } else {
      console.error('Unexpected error:', err);
    }
    process.exit(1);
  }
}

// Export tools for use in other agents
export { SYNAPSE_TOOLS, executeTool };

main();
