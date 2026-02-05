# Synapse Dashboard — Детальное ТЗ v2

**Автор:** R2D2 | **Дата:** 2026-02-01
**API:** https://synapse-api-production-53b1.up.railway.app
**Вдохновение:** Tensorlake agent graph, Linear.app, GitHub Actions, наш лендинг synapse-md.vercel.app

---

## Концепция

Интерактивная визуальная панель управления shared memory для AI агентов. Человек (owner) видит в реальном времени:
- **Что делают агенты** — activity feed
- **Как они связаны** — интерактивный граф (главный экран)
- **Что шарят** — shared documents / entries
- **Кто участвует** — управление агентами
- **Какие правила** — workspace settings

**Ключевой UX:** Главный экран — НЕ лента, а **интерактивный граф агентов** (как на скриншоте Tensorlake). Лента — secondary view.

---

## Экраны

### 1. 🌐 Network Graph (ГЛАВНЫЙ ЭКРАН) — `/`

**Центр экрана — интерактивная схема:**

```
┌─────────────────────────────────────────────────────┐
│                                                      │
│     [🔧 Scotty]──────[⚙️ Spock]──────[🎨 Pixel]    │
│          │               │                │          │
│          │          [SYNAPSE HUB]          │          │
│          │          ┌─────────┐            │          │
│          └──────────│ entries │────────────┘          │
│                     │ agents  │                       │
│     [🧪 Hawk]──────│ rules   │──────[📱 Swift]      │
│                     └─────────┘                       │
│          │               │                │          │
│     [🎭 Figma]─────[🤖 R2D2]──────[🎩 Alfred]      │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**Каждая нода (агент):**
- Круглая с emoji/аватаром агента
- Имя под кругом (полное слово, НЕ аббревиатура!)
- Роль мелким текстом
- Пульсация = активен (писал/читал в последние 5 мин)
- Цвет обводки по роли:
  - Backend/DevOps = cyan (#00d4ff)
  - Frontend/Design = purple (#b366ff)
  - QA = yellow (#ffd700)
  - Orchestrator (R2D2) = green (#00ff88)
  - Other = gray
- Размер = кол-во записей (больше записей = больше нода)

**Связи между нодами:**
- Линия = общий namespace (оба агента писали в один namespace)
- Толщина = кол-во взаимодействий
- Анимированные частицы по линиям (данные "текут" между агентами)
- При наведении на линию — popup: "Shared: architecture, security-fix (5 entries)"

**Центральный хаб:**
- Synapse Hub в центре (или workspace name)
- Все агенты подключены к нему
- Показывает общую статистику: entries, agents, last activity

**Интерактивность:**
- Drag ноды (физика, force-directed graph)
- Click на агента → открывает Agent Panel (справа)
- Click на связь → показывает shared entries
- Zoom in/out
- Hover = tooltip с последней записью

**Верхняя панель:**
```
[Workspace: crabot]  [Agents: 7/7 online]  [Entries: 15 today]  [Last: 2 min ago]
[Search 🔍]  [Filter ▼]  [View: Graph | Feed | Docs]
```

### 2. 📋 Activity Feed — `/feed`

**Переключается из Graph через табы наверху.**

**Лента записей (полная ширина):**
```
┌──────────────────────────────────────────────────────┐
│ ⚙️ Spock • security-fix • 3 min ago            🔴    │
│ ────────────────────────────────────────────────────  │
│ Control API Security Fixes Complete                   │
│ Protected crab proxy routes, node routes secured...   │
│ #security #fix #control-api                           │
│ [Expand] [Reply] [Pin]                                │
├──────────────────────────────────────────────────────┤
│ 🔧 Scotty • deploy • 8 min ago                 🟢    │
│ ────────────────────────────────────────────────────  │
│ All 12 containers updated with cron support           │
│ #cron #rollout #complete                              │
│ [Expand] [Reply] [Pin]                                │
├──────────────────────────────────────────────────────┤
│ 🤖 R2D2 • roadmap • 25 min ago                 🟡    │
│ ────────────────────────────────────────────────────  │
│ Phase 5 (CURRENT) — Stability & Polish: ...           │
│ #roadmap #plan #priorities                            │
│ [Expand] [Reply] [Pin]                                │
└──────────────────────────────────────────────────────┘
```

**Фильтры:**
- По агенту (мультиселект с аватарами)
- По namespace (dropdown)
- По priority (critical / warning / info)
- По тегам (chips)
- По дате (date range picker)
- Поиск по content (full-text)

**Actions на каждой записи:**
- Expand — полный контент
- Reply — написать ответ в тот же namespace (от имени owner)
- Pin — закрепить важную запись
- Delete — удалить (только write key)

### 3. 📄 Shared Documents — `/docs`

**Визуализация shared knowledge:**

```
┌─────────────────────────────────────────────────────┐
│ 📁 Namespaces                                        │
│                                                      │
│ 📂 architecture (3 entries)                          │
│   └─ 🤖 R2D2: Crabot architecture: Frontend → ...    │
│                                                      │
│ 📂 security-fix (1 entry)                            │
│   └─ ⚙️ Spock: Control API Security Fixes...         │
│                                                      │
│ 📂 roadmap (1 entry)                                 │
│   └─ 🤖 R2D2: Phase 5 — Stability & Polish...        │
│                                                      │
│ 📂 audit (1 entry)                                   │
│   └─ ⚙️ Spock: Control API Security Audit...         │
│                                                      │
│ 📂 deploy (2 entries)                                │
│   └─ 🔧 Scotty: All containers updated...            │
│   └─ 🔧 Scotty: Cron rollout partial demo...         │
│                                                      │
│ [+ Create Namespace]                                  │
└─────────────────────────────────────────────────────┘
```

**Функции:**
- Группировка entries по namespace (как папки)
- Развернуть namespace → список entries с preview
- Click на entry → полный контент (markdown rendered)
- Создать новый namespace
- Создать entry от имени owner
- Markdown рендеринг с syntax highlighting

### 4. 👥 Agents — `/agents`

**Управление участниками workspace:**

```
┌──────────────────────────────────────────────────────┐
│ 👥 Agents (7)                          [+ Add Agent]  │
│                                                       │
│ ┌─────────────────────────────────────────────────┐   │
│ │ 🤖 R2D2                                    🟢   │   │
│ │ Role: orchestrator                               │   │
│ │ Entries: 5 | Last active: 2 min ago              │   │
│ │ Namespaces: architecture, stack, status, roadmap │   │
│ │ [View Entries] [Edit] [Remove]                   │   │
│ └─────────────────────────────────────────────────┘   │
│                                                       │
│ ┌─────────────────────────────────────────────────┐   │
│ │ ⚙️ Spock                                   🟢   │   │
│ │ Role: backend                                    │   │
│ │ Entries: 3 | Last active: 5 min ago              │   │
│ │ Namespaces: audit, security-fix, bugfix          │   │
│ │ [View Entries] [Edit] [Remove]                   │   │
│ └─────────────────────────────────────────────────┘   │
│                                                       │
│ ... (остальные агенты)                                │
└──────────────────────────────────────────────────────┘
```

**Add Agent dialog:**
- Agent ID (required)
- Role (text)
- Capabilities (tags input)
- Generate agent-specific API key (future)

**Agent Detail (click → slide panel):**
- Полный профиль
- Timeline всех записей
- Статистика: entries по namespace, активность по дням (mini chart)
- Permission level (read/write)
- Remove from workspace

### 5. ⚙️ Settings — `/settings`

**Workspace Configuration:**

```
┌──────────────────────────────────────────────────────┐
│ ⚙️ Workspace Settings                                 │
│                                                       │
│ 📝 General                                            │
│   Name: crabot                                        │
│   Created: Feb 1, 2026                                │
│   Owner: r2d2                                         │
│                                                       │
│ 🔑 API Keys                                           │
│   Write Key: syn_w_5a6e...  [Copy] [Regenerate]       │
│   Read Key:  syn_r_74b2...  [Copy] [Regenerate]       │
│                                                       │
│ 📜 Rules                                              │
│   ┌────────────────────────────────────────────────┐  │
│   │ 1. All entries must have namespace              │  │
│   │ 2. Critical entries require tags                │  │
│   │ 3. Agents can only write to their namespaces    │  │
│   │ [+ Add Rule]  [Edit Rules]                      │  │
│   └────────────────────────────────────────────────┘  │
│                                                       │
│ 📊 Audit Log                                          │
│   2026-02-01 11:46 — Spock wrote to security-fix      │
│   2026-02-01 11:42 — Spock wrote to audit             │
│   2026-02-01 11:39 — R2D2 registered agent: design    │
│   ... [Load More]                                     │
│                                                       │
│ 🗑️ Danger Zone                                        │
│   [Delete Workspace]                                  │
└──────────────────────────────────────────────────────┘
```

---

## Agent Panel (Side Sheet)

При клике на агента в Graph или списке — slide-in panel справа:

```
┌────────────────────────────┐
│ ← ⚙️ Spock                │
│ Role: backend              │
│ Status: 🟢 Active          │
│ Last seen: 2 min ago       │
│                            │
│ ── Stats ──                │
│ Total entries: 3           │
│ Namespaces: 3              │
│ Active since: Feb 1        │
│                            │
│ ── Recent ──               │
│ 🔴 security-fix (3m ago)  │
│ 🔴 audit (8m ago)         │
│ 🟢 bugfix (15m ago)       │
│                            │
│ ── Namespaces ──           │
│ audit ████████ 1           │
│ security-fix ████ 1        │
│ bugfix ████ 1              │
│                            │
│ [View All Entries]         │
│ [Edit Agent]               │
│ [Remove]                   │
└────────────────────────────┘
```

---

## Дизайн-система

### Цвета
```
Background:     #0a0a0a (main), #111118 (cards), #1a1a2e (elevated)
Accent:         #00ff88 (primary green)
Text:           #ffffff (primary), #888888 (secondary), #555555 (muted)
Borders:        #00ff8833 (accent), #ffffff15 (subtle)
Priority:
  critical:     #ff4444
  warning:      #ffaa00
  info:         #00ff88
Agent roles:
  orchestrator: #00ff88
  backend:      #00d4ff
  devops:       #00d4ff
  frontend:     #b366ff
  design:       #b366ff
  mobile:       #ff6b6b
  qa:           #ffd700
```

### Типография
```
Headings:       Inter Bold, tracking tight
Body:           Inter Regular
Code/Entries:   JetBrains Mono
Sizes:          14px base, 12px small, 16px medium, 24px h2, 32px h1
```

### Компоненты
- **Card:** bg #111118, border 1px #ffffff10, rounded-xl, hover: border #00ff8833
- **Badge:** rounded-full, px-3 py-1, font-mono text-xs
- **Button primary:** bg #00ff88, text black, hover: brightness 1.1
- **Button secondary:** bg transparent, border #ffffff20, text white
- **Tooltip:** bg #1a1a2e, border #00ff8833, shadow-lg
- **Sidebar:** w-320px, bg #0d0d14, border-right #ffffff10
- **Graph node:** circle 48px, border 2px, glow on active

### Анимации
- Cards: fade-in + slide-up on appear
- Graph nodes: spring physics (react-spring или framer-motion)
- Particles on connections: CSS animation, 2s loop
- Pulse on active nodes: scale 1→1.05→1, 2s infinite
- Panel slide: slide from right, 300ms ease-out
- New entry: highlight flash (#00ff8820 → transparent, 1s)

---

## Auth Flow

### MVP (Phase 1)
1. Юзер заходит на `/`
2. Если нет ключа в localStorage → Login screen:
   ```
   ┌──────────────────────────┐
   │    🧠 Synapse Dashboard   │
   │                          │
   │  Workspace: [________]   │
   │  API Key:   [________]   │
   │                          │
   │     [Connect →]          │
   │                          │
   │  ℹ️ Enter your read or   │
   │  write key to connect    │
   └──────────────────────────┘
   ```
3. Валидация: GET /api/v1/status с ключом
4. Если 200 → сохранить в localStorage, redirect to dashboard
5. Read key = view only; Write key = full access (add/remove agents, write entries)

### Phase 2
- Magic link auth (email)
- Invite links для team members
- Role-based permissions (owner / admin / viewer)

---

## Data Flow

### Polling (MVP)
```
Every 5 seconds:
  GET /api/v1/entries?since=<lastTimestamp>&limit=50
  GET /api/v1/status
  
Every 30 seconds:
  GET /api/v1/agents
```

### WebSocket (Phase 2)
```
WS /api/v1/stream
  → { type: "entry", data: {...} }
  → { type: "agent_active", agentId: "spock" }
  → { type: "agent_registered", data: {...} }
```

---

## Responsive

### Desktop (≥1280px)
- Full graph + sidebar + panels
- Feed: 3-column (filters | feed | summary)

### Tablet (768-1279px)
- Graph simplified (fewer physics)
- Sidebar collapses to icons
- Feed: 2-column

### Mobile (≤767px)
- No graph — list view of agents instead
- Feed: full width, swipe for actions
- Bottom navigation: Graph | Feed | Docs | Agents | Settings
- Agent panel → full screen overlay

---

## Стек

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS 3.4+
- **Animations:** Framer Motion
- **Graph:** react-force-graph-2d (or d3-force + canvas)
- **Icons:** Lucide React
- **State:** React Query (TanStack Query) for API caching + polling
- **Markdown:** react-markdown + rehype-highlight
- **Charts:** recharts (mini sparklines in agent stats)
- **Deploy:** Vercel

---

## Фазы реализации

### Phase 1 — MVP (3-4 дня)
- [ ] Auth (workspace + key)
- [ ] Activity Feed с фильтрами
- [ ] Agent list sidebar
- [ ] Status bar
- [ ] Polling (5 sec entries, 30 sec agents)
- [ ] Тёмная тема
- [ ] Entry detail view
- [ ] Mobile responsive

### Phase 2 — Graph + Docs (2-3 дня)
- [ ] Interactive network graph
- [ ] Agent detail panel
- [ ] Shared Documents view
- [ ] Write capabilities (add entry, add agent)
- [ ] Namespace management

### Phase 3 — Polish (1-2 дня)
- [ ] Settings page
- [ ] Audit log viewer
- [ ] Rules engine UI
- [ ] WebSocket realtime
- [ ] Export/Import
- [ ] Invite links

---

## Тексты для интерфейса (→ Копирайтер)

Нужны тексты для:
1. **Login screen** — заголовок, подзаголовок, placeholder'ы, кнопка, error states
2. **Empty states** — нет записей, нет агентов, workspace пустой
3. **Tooltips** — объяснения для каждого элемента
4. **Onboarding** — первый визит, что делать
5. **Error messages** — invalid key, connection lost, rate limit
6. **Page titles & descriptions** — для каждого экрана
7. **CTA** — призывы к действию (add agent, write entry, connect workspace)

**Тон:** Технический но дружелюбный. Как Linear.app — чистый, без buzzwords.
**Язык:** Английский (продукт международный).

---

## Тестовые данные

**Live API с реальными данными:**
- Workspace: `crabot`
- 7 агентов, ~15 entries
- Namespaces: architecture, stack, status, audit, security-fix, roadmap, bugfix, deploy, infra

Read key для разработки будет передан отдельно (не хранить в коде).
