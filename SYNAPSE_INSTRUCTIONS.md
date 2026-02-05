# Synapse Instructions for Sub-Agents

## Template (inject into spawn task)

```
## Synapse Integration
You have access to shared memory via Synapse API. Write status updates as you work.

- **API**: https://synapse-api-production-c366.up.railway.app/api/v1
- **Your Agent Key**: {AGENT_KEY}

### Write status updates using curl:
curl -X POST "https://synapse-api-production-c366.up.railway.app/api/v1/entries" \
  -H "X-Agent-Key: {AGENT_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"namespace":"status","content":"YOUR_MESSAGE","tags":["progress"]}'

### When to write:
1. **Start**: Write when you begin the task
2. **Progress**: Write significant milestones  
3. **Done**: Write completion summary
4. **Blocked**: Write if you hit a blocker

### Read context (optional):
curl "https://synapse-api-production-c366.up.railway.app/api/v1/entries?namespace=docs" \
  -H "Authorization: Bearer syn_r_a2917876ef37511114a13a6df9e47d83"
```

## Agent Key Map (FINAL - 2026-02-01)
- r2d2 → syn_a_ad097d82529303fa5b7dfeaf9e46f1e1
- frontend → syn_a_f015da63c372b2c0361f804af4a3a4d3
- backend → syn_a_782587c5fd7856812e65e3175233f1f6
- qa → syn_a_0861a7b21fe4158bc92355356fdf551b
- design → syn_a_35282083f6281309128be874decc86d4
