# Synapse Dashboard — UX Copy

**Style:** Technical but friendly (Linear.app tone)  
**Language:** English  
**Principles:** Concise, no buzzwords, every word matters

---

## 1. Login Screen

### Headlines
**Primary:** `Connect to Synapse`
**Subheadline:** `Monitor your AI agents and shared memory in real-time.`

### Form Elements
**Workspace field:** `Workspace name`
**API Key field:** `API key`
**Connect button:** `Connect`
**Remember checkbox:** `Remember this workspace`

### Help Text
**Below form:** `Enter your read or write key to access your workspace.`

### Error States
**Invalid key:** `Invalid API key. Check your credentials.`
**Connection failed:** `Can't connect to workspace. Try again.`
**Rate limit:** `Too many attempts. Wait a moment.`
**Workspace not found:** `Workspace doesn't exist. Check the name.`
**Network error:** `Connection failed. Check your internet.`

---

## 2. Empty States

### No Entries Yet
**Headline:** `No activity yet`
**Description:** `Entries will appear here as your agents write to shared memory.`
**Action:** `Write first entry`

### No Agents Registered
**Headline:** `No agents connected`
**Description:** `Add agents to start monitoring their activity and shared knowledge.`
**Action:** `Add your first agent`

### Empty Workspace
**Headline:** `Welcome to your workspace`
**Description:** `Start by adding agents or writing your first entry. Everything will sync in real-time.`
**Actions:** `Add agent` / `Write entry`

### No Search Results
**Headline:** `Nothing found`
**Description:** `Try different keywords or clear your filters.`
**Action:** `Clear filters`

### Empty Namespace
**Headline:** `No entries in [namespace]`
**Description:** `This namespace will collect entries as agents write to it.`

### No Documents
**Headline:** `No shared documents`
**Description:** `Shared knowledge will organize here by namespace.`
**Action:** `Create namespace`

---

## 3. Page Titles & Descriptions

### Network Graph (`/`)
**Title:** `Network Graph`
**Description:** `Interactive view of agent connections and shared memory flow. See who's active and how your agents collaborate.`

### Activity Feed (`/feed`)
**Title:** `Activity Feed`
**Description:** `Real-time stream of all agent activity. Filter by agent, namespace, or priority to focus on what matters.`

### Shared Documents (`/docs`)
**Title:** `Shared Documents`
**Description:** `Knowledge organized by namespace. Browse shared entries and create new collaborative spaces.`

### Agents (`/agents`)
**Title:** `Agents`
**Description:** `Manage workspace participants and monitor their activity. Add new agents or edit existing ones.`

### Settings (`/settings`)
**Title:** `Settings`
**Description:** `Configure your workspace, manage API keys, and set collaboration rules. Review audit logs and security settings.`

---

## 4. Tooltips

### Agent Status Indicators
**🟢 Online:** `Active in last 5 minutes`
**🟡 Idle:** `Active in last hour`
**🔴 Offline:** `Not seen recently`
**⚪ Unknown:** `Status unavailable`

### Priority Badges
**🔴 Critical:** `Urgent issue requiring attention`
**🟡 Warning:** `Important but not critical`
**🟢 Info:** `General information or update`

### Namespace Concept
**Namespace:** `Shared topic space where agents collaborate`
**Shared namespace:** `Multiple agents can read and write here`
**Private namespace:** `Only specific agents have access`

### API Keys
**Read key:** `View-only access to workspace data`
**Write key:** `Full access including adding agents and entries`
**Key visibility:** `Click to reveal full key`

### Graph Connections
**Connection line:** `Agents share entries in common namespaces`
**Thick line:** `High collaboration activity`
**Animated particles:** `Recent data exchange between agents`
**Node size:** `Bigger means more entries written`

### Workspace Stats
**Agents count:** `Connected agents in this workspace`
**Entries today:** `New entries since midnight`
**Last activity:** `Most recent agent activity`

---

## 5. Onboarding (First Visit Flow)

### Step 1: Welcome
**Headline:** `Welcome to Synapse`
**Description:** `Your real-time dashboard for AI agent collaboration. Monitor activity, explore connections, and manage shared knowledge.`
**Action:** `Get started`

### Step 2: What is This?
**Headline:** `Monitor Your Agents`
**Description:** `See what your AI agents are doing in real-time. Track their collaboration through shared memory entries.`
**Action:** `Show me around`

### Step 3: How to Use
**Headline:** `Three Main Views`
**Description:** `Network Graph shows connections, Activity Feed shows updates, Documents organizes shared knowledge.`
**Action:** `Explore network`

### Step 4: Next Steps
**Headline:** `Start Monitoring`
**Description:** `Your agents will appear here automatically as they connect. Add new ones anytime from the Agents page.`
**Action:** `View my workspace`

---

## 6. Call-to-Actions (CTAs)

### Primary Actions
**Add agent:** `Add agent`
**Write entry:** `Write entry`
**Create namespace:** `Create namespace`
**Connect workspace:** `Connect workspace`
**View all entries:** `View all entries`

### Secondary Actions
**Edit agent:** `Edit`
**Remove agent:** `Remove`
**View details:** `View details`
**Expand entry:** `Expand`
**Reply to entry:** `Reply`
**Pin entry:** `Pin`
**Copy API key:** `Copy key`
**Regenerate key:** `Regenerate`

### Navigation
**Switch to feed:** `Switch to feed`
**Back to graph:** `Back to graph`
**View documentation:** `View docs`
**Open settings:** `Settings`

### Workspace Management
**Invite member:** `Invite member`
**Export data:** `Export workspace`
**Delete workspace:** `Delete workspace`

---

## 7. Notifications & Toasts

### Success Messages
**Entry created:** `Entry created successfully`
**Agent added:** `Agent added to workspace`
**Namespace created:** `Namespace created`
**Settings saved:** `Settings updated`
**Key regenerated:** `New API key generated`
**Entry pinned:** `Entry pinned`

### Connection Status
**Connected:** `Connected to workspace`
**Reconnected:** `Connection restored`
**Connection lost:** `Connection lost. Trying to reconnect...`
**Syncing:** `Syncing latest changes...`

### Error Notifications
**Save failed:** `Save failed. Try again.`
**Agent exists:** `Agent already in workspace`
**Permission denied:** `Insufficient permissions`
**Rate limited:** `Rate limit exceeded. Wait a moment.`
**Invalid data:** `Invalid input. Check your data.`

### Loading States
**Loading entries:** `Loading entries...`
**Connecting:** `Connecting to workspace...`
**Saving:** `Saving changes...`
**Adding agent:** `Adding agent...`

---

## 8. Form Labels & Placeholders

### Agent Form
**Agent ID:** `Enter agent identifier`
**Agent Role:** `e.g., backend, frontend, qa`
**Capabilities:** `Add capability tags`

### Entry Form
**Namespace:** `Select or create namespace`
**Title:** `Entry title`
**Content:** `Write your entry content...`
**Tags:** `Add tags (optional)`
**Priority:** `Select priority level`

### Settings Form
**Workspace name:** `Your workspace name`
**Owner:** `Workspace owner`
**Rules:** `Add collaboration rules...`

### Search & Filters
**Search entries:** `Search entries and agents...`
**Filter by agent:** `All agents`
**Filter by namespace:** `All namespaces`
**Filter by priority:** `All priorities`
**Date range:** `Select date range`

---

## 9. Confirmations & Warnings

### Delete Confirmations
**Delete entry:** `Delete this entry? This action cannot be undone.`
**Remove agent:** `Remove [agent] from workspace? They'll lose access immediately.`
**Delete workspace:** `Delete entire workspace? All data will be permanently lost.`
**Delete namespace:** `Delete [namespace]? All entries inside will be removed.`

### Permission Warnings
**Read-only mode:** `Read-only mode. Upgrade to write key for full access.`
**Agent limit:** `Workspace agent limit reached. Upgrade or remove inactive agents.`
**Rate limit warning:** `Approaching rate limit. Consider reducing request frequency.`

### Action Confirmations
**Regenerate key:** `Regenerate API key? The old key will stop working immediately.`
**Leave workspace:** `Leave this workspace? You'll need a new invitation to rejoin.`

---

## 10. Status & Progress

### Loading States
**Initial load:** `Loading workspace...`
**Refreshing:** `Checking for updates...`
**Processing:** `Processing request...`

### Empty Progress
**No activity:** `Waiting for agent activity...`
**Connecting agents:** `Agents will appear when they connect...`
**Building graph:** `Graph will populate as agents interact...`

### Success States
**All synced:** `Everything is up to date`
**Connected:** `All agents connected`
**Healthy:** `Workspace running smoothly`

---

## 11. Help & Support

### Contextual Help
**Graph navigation:** `Drag nodes, click connections, zoom to explore`
**Entry formatting:** `Markdown supported for rich text formatting`
**API key usage:** `Use read keys for monitoring, write keys for full control`

### Quick Tips
**Tip 1:** `Pin important entries to keep them visible`
**Tip 2:** `Use namespaces to organize agent collaboration`
**Tip 3:** `Monitor the graph to spot collaboration patterns`

### Error Recovery
**Connection lost:** `Check your internet connection and API key`
**Data not loading:** `Refresh the page or check workspace status`
**Permission errors:** `Verify you have the right access level`