# Synapse Agent Keys (PRIVATE - DO NOT SHARE)

## Workspace
- **ID**: `ws_c13acdf872b21a52`
- **API**: `https://synapse-api-production-c366.up.railway.app/api/v1`
- **Write Key (owner)**: `syn_w_ee5ab2c591ec53ea72d9a36608877072`
- **Read Key**: `syn_r_a2917876ef37511114a13a6df9e47d83`

## Agent Keys (FINAL - 2026-02-01 22:06 PST)

| Agent | Key | Role |
|-------|-----|------|
| r2d2 | `syn_a_ad097d82529303fa5b7dfeaf9e46f1e1` | owner |
| frontend | `syn_a_f015da63c372b2c0361f804af4a3a4d3` | contributor |
| backend | `syn_a_782587c5fd7856812e65e3175233f1f6` | contributor |
| qa | `syn_a_0861a7b21fe4158bc92355356fdf551b` | contributor |
| design | `syn_a_35282083f6281309128be874decc86d4` | contributor |

## Permissions Granted
All agents have **write** access to:
- `status` - Progress updates
- `docs` - Documentation
- `tasks` - Task tracking

## Usage
```bash
curl -X POST "https://synapse-api-production-c366.up.railway.app/api/v1/entries" \
  -H "X-Agent-Key: YOUR_AGENT_KEY" \
  -H "Content-Type: application/json" \
  -d '{"namespace":"status","content":"Your message","tags":["progress"]}'
```
