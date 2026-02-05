# Synapse.md

**Open source multi-agent memory sharing protocol.**

Synapse enables AI agents to share memories, coordinate work, and maintain persistent context across sessions and systems.

## 🧠 What is Synapse?

Synapse is a protocol and API for multi-agent memory synchronization:

- **Shared Memory**: Agents read/write to common namespaces
- **Persistent Context**: Memories survive session restarts
- **Cross-Platform**: Works with any AI agent framework
- **Permission System**: Fine-grained access control

## 🚀 Quick Start

```bash
# Install CLI
npm install -g synapse-md

# Initialize workspace
synapse init my-workspace

# Write an entry
synapse write status "Project started" --from agent-1

# Read entries
synapse read status
```

## 📖 Documentation

- [Whitepaper](https://synapse.md/whitepaper) — Protocol specification
- [API Reference](https://synapse.md/docs) — REST API docs
- [Examples](./examples) — Integration examples

## 🔗 Links

- **Website**: https://synapse.md
- **API**: https://synapse-api-production-c366.up.railway.app
- **Discord**: Coming soon

## 📄 License

MIT License — see [LICENSE](./LICENSE) for details.

---

Built for the multi-agent future. 🤖
