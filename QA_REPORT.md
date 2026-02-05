# Synapse API + Dashboard — QA Report
**Date:** 2026-02-01  
**Tester:** R2D2 (manual, curl-based)  
**API:** https://synapse-api-production-53b1.up.railway.app  
**Dashboard:** https://synapse-md.vercel.app  

## API Tests — 18/18 PASSED ✅

| # | Test | Expected | Actual | Status |
|---|------|----------|--------|--------|
| 1 | Health check | 200, status ok | ✅ ok | PASS |
| 2 | Auth write key | workspace stats | ✅ 7 agents, 1 entry | PASS |
| 3 | Auth read key | workspace stats | ✅ same data | PASS |
| 4 | Auth invalid key | 401 | ✅ AUTH_INVALID | PASS |
| 5 | Auth agent key | workspace stats | ✅ works | PASS |
| 6 | List agents | array of agents | ✅ 7 agents returned | PASS |
| 7 | Write entry (write key) | entry created | ✅ id returned | PASS |
| 8 | Write entry (agent key) | auto-set agentId=r2d2 | ✅ from_agent=r2d2 | PASS |
| 9 | Write entry (read key) | 403 forbidden | ✅ INSUFFICIENT_PERMISSIONS | PASS |
| 10 | Read entries (read key) | entries list | ✅ 3 entries returned | PASS |
| 11 | Create agent key | key returned | ✅ syn_a_spock_... | PASS |
| 12 | List agent keys | key list | ✅ 1 key, prefix masked | PASS |
| 13 | List all keys | all workspace keys | ✅ 2 keys (r2d2 + spock) | PASS |
| 14 | Revoke key | success | ✅ revoked | PASS |
| 15 | Use revoked key | 401 | ✅ AUTH_INVALID | PASS |
| 16 | Audit log | recent events | ✅ 5 events with agent/keyType | PASS |
| 17 | Unicode/emoji | entry created | ✅ 🤖🧪🚀 stored fine | PASS |
| 18 | Duplicate agent | handle gracefully | ✅ upsert, no error | PASS |

## Dashboard HTML Tests — 6/6 PASSED ✅

All pages return HTTP 200 with valid HTML content (verified via SSR curl).

## Critical Issues

### 🔴 SQLite on Railway Ephemeral FS
- **Severity:** CRITICAL
- **Impact:** Every redeploy wipes all data (workspaces, entries, agents, keys)
- **Fix:** Use Railway Volume, PostgreSQL, or Turso

## Minor Issues

### 🟡 Agent role not preserved on key-based auto-register
- When creating a per-agent key, agent is auto-registered but `role` is null
- Previously registered agents (with role) keep their role via upsert

### 🟡 Audit log doesn't show agent name for workspace key operations
- `agent` field is null when using workspace write key
- Only populated when using agent keys

### 🟢 Entries response uses `from_agent` instead of `agentId`
- Dashboard hooks expect `agentId` but API returns `from_agent`
- Needs mapping in hooks or API field rename

## Recommendations
1. **Priority 1:** Persistent storage (Railway Volume or PostgreSQL)
2. **Priority 2:** Rename `from_agent` → `agentId` in API response for consistency
3. **Priority 3:** Add rate limiting on key creation endpoints
4. **Priority 4:** Add key expiration enforcement in auth middleware

## Summary
**18/18 API tests passed.** Per-agent keys work correctly — creation, auth, auto-identity, permissions, revocation all functioning. Main risk is data loss on redeploy.
