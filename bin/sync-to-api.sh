#!/bin/bash
# Sync local shared-memory to Synapse API

SHARED_MEMORY="${HOME}/clawd/shared-memory"
API_URL="https://synapse-api-production-c366.up.railway.app/api/v1"
WORKSPACE_NAME="crabot-ai"

# Get or create workspace
echo "🔄 Syncing shared-memory to Synapse API..."

# First, we need to get write key for crabot-ai workspace
# For now, using environment variable or keychain
WRITE_KEY="${SYNAPSE_WRITE_KEY:-}"

if [ -z "$WRITE_KEY" ]; then
  # Try keychain
  WRITE_KEY=$(security find-generic-password -s "synapse/crabot-write-key" -a "shared" -w ~/Library/Keychains/bots.keychain-db 2>/dev/null)
fi

if [ -z "$WRITE_KEY" ]; then
  echo "❌ No write key found. Set SYNAPSE_WRITE_KEY or add to keychain."
  echo "   Keychain: synapse/crabot-write-key"
  exit 1
fi

# Sync agents
echo "📦 Syncing agents..."
for agent_file in "$SHARED_MEMORY/agents/"*.yaml; do
  agent_id=$(basename "$agent_file" .yaml)
  role=$(grep "role:" "$agent_file" | head -1 | awk '{print $2}')
  
  echo "  → $agent_id ($role)"
  
  curl -s -X POST "$API_URL/agents" \
    -H "Authorization: Bearer $WRITE_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"id\": \"$agent_id\", \"role\": \"$role\"}" > /dev/null
done

# Sync entries
echo "📝 Syncing entries..."
find "$SHARED_MEMORY/entries" -name "*.md" -type f | while read entry_file; do
  # Extract frontmatter
  id=$(grep "^id:" "$entry_file" | head -1 | awk '{print $2}')
  from=$(grep "^from:" "$entry_file" | head -1 | awk '{print $2}')
  namespace=$(grep "^namespace:" "$entry_file" | head -1 | awk '{print $2}')
  priority=$(grep "^priority:" "$entry_file" | head -1 | awk '{print $2}')
  
  # Extract content (after frontmatter)
  content=$(awk '/^---$/{p++}p==2{print}' "$entry_file" | tail -n +2)
  
  if [ -n "$id" ] && [ -n "$from" ]; then
    echo "  → $id ($namespace)"
    
    # Escape content for JSON
    escaped_content=$(echo "$content" | jq -Rs .)
    
    curl -s -X POST "$API_URL/entries" \
      -H "Authorization: Bearer $WRITE_KEY" \
      -H "Content-Type: application/json" \
      -d "{\"id\": \"$id\", \"from_agent\": \"$from\", \"namespace\": \"$namespace\", \"priority\": \"$priority\", \"content\": $escaped_content}" > /dev/null
  fi
done

echo "✅ Sync complete!"
