# Mobile Specification: Synapse Dashboard

**Проект:** synapse-md.vercel.app  
**Дата:** 1 февраля 2026  
**Цель:** Адаптация desktop дашборда для мобильных устройств

## Краткий обзор

Текущий дашборд отлично работает на desktop, но требует значительных изменений для мобиле. Основные проблемы:

- **Header:** workspace info + статистика + search + tabs не помещаются
- **Network Graph:** canvas с 20+ узлами слишком плотный для touch
- **Legend:** статичная легенда перекрывает контент на малых экранах
- **Touch targets:** табы и кнопки недостаточно большие для пальцев

## Breakpoints

Используем стандартные Tailwind CSS breakpoints:

```css
/* Mobile-first approach */
/* xs: до 640px - primary mobile */
/* sm: 640px+ - large mobile/small tablet */
/* md: 768px+ - tablet portrait */
/* lg: 1024px+ - tablet landscape/small desktop */
/* xl: 1280px+ - desktop */
```

**Критические точки:**
- `< 640px` — мобильная оптимизация (приоритет)
- `640px-768px` — большие мобильные/маленькие планшеты
- `768px+` — планшеты и выше (текущий UI работает)

## Компоненты и изменения

### 1. DashboardHeader (`components/dashboard/header.tsx`)

#### Текущие проблемы:
- Два горизонтальных ряда: workspace info + табы
- Поиск и кнопки занимают много места
- Статистика агентов обрезается

#### Мобильная адаптация:

```tsx
// Структура для мобиле (< 640px):
<header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
  {/* Row 1: Workspace + burger menu */}
  <div className="flex items-center justify-between p-4 sm:hidden">
    <div className="flex items-center gap-2 overflow-hidden">
      <span className="text-sm font-medium text-accent-green truncate">
        {displayWorkspace}
      </span>
      {isDemo && (
        <span className="flex items-center gap-1 px-1.5 py-0.5 bg-accent-amber/20 text-accent-amber text-xs rounded">
          Demo
        </span>
      )}
    </div>
    <button className="p-2">☰</button>
  </div>
  
  {/* Row 2: Tab navigation (horizontal scroll) */}
  <div className="px-4 pb-3 sm:hidden">
    <div className="flex gap-2 overflow-x-auto scrollbar-hide">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap min-w-fit ${
            currentTab === tab.id
              ? 'bg-accent-green text-black'
              : 'bg-surface-light text-muted'
          }`}
        >
          <span>{tab.emoji}</span>
          {tab.label}
        </button>
      ))}
    </div>
  </div>
  
  {/* Collapsible stats panel */}
  <div className="border-t border-border bg-surface/50 px-4 py-2 text-xs space-y-1 sm:hidden" 
       style="display: statsExpanded ? 'block' : 'none'">
    <div className="flex items-center justify-between">
      <span className="text-muted">Agents online:</span>
      <span className="text-foreground">{status.agents}</span>
    </div>
    <div className="flex items-center justify-between">
      <span className="text-muted">Entries today:</span>
      <span className="text-foreground">{status.entriesToday}</span>
    </div>
  </div>
  
  {/* Desktop layout unchanged для sm+ */}
  <div className="hidden sm:block">
    {/* Существующий desktop код */}
  </div>
</header>
```

#### Ключевые изменения:
- **Workspace info:** только название + badge, остальное в collapse
- **Tabs:** горизонтальный скролл с touch-friendly размерами  
- **Stats:** убираем в collapsible секцию
- **Search:** перенести в burger menu или отдельную страницу
- **Touch targets:** минимум 44px высота для кнопок

### 2. NetworkGraph (`app/dashboard/network/page.tsx`)

#### Текущие проблемы:
- Canvas 20+ узлов слишком плотный
- Мелкие touch targets
- Legend перекрывает граф
- Zoom/pan неудобны на touch

#### Мобильная адаптация:

**Option A: Упрощенный граф**
```tsx
// Для мобиле - показать только ключевые соединения
const mobileGraphData = useMemo(() => {
  if (isMobile && agents.length > 12) {
    // Показать только orchestrator + топ-6 агентов по активности
    const topAgents = agents
      .filter(a => a.id !== orchestratorId)
      .sort((a, b) => getEntryCount(b.id) - getEntryCount(a.id))
      .slice(0, 6)
    
    const filteredAgents = orchestratorId 
      ? [agents.find(a => a.id === orchestratorId), ...topAgents].filter(Boolean)
      : topAgents
      
    return buildGraphData(filteredAgents, entries)
  }
  return buildGraphData(agents, entries)
}, [agents, entries, isMobile])
```

**Option B: List View для мобиле**
```tsx
// Полная замена на список при < 640px
{isMobile ? (
  <AgentListView agents={agents} entries={entries} />
) : (
  <ForceGraphComponent />
)}
```

**AgentListView компонент:**
```tsx
const AgentListView = ({ agents, entries }) => {
  return (
    <div className="flex-1 p-4 space-y-4">
      <div className="grid grid-cols-1 gap-3">
        {agents.map(agent => (
          <div key={agent.id} className="bg-surface border border-border rounded-lg p-4 active:bg-surface-light transition-colors">
            <div className="flex items-center gap-3">
              <div className="text-2xl">{getAgentEmoji(agent.id)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-foreground truncate">{agent.id}</h3>
                  <StatusDot status={getAgentStatus(agent.lastActive)} />
                </div>
                <p className="text-sm text-muted capitalize">{agent.role || 'Agent'}</p>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-accent-green">
                  {getEntryCount(agent.id)}
                </div>
                <div className="text-xs text-muted">entries</div>
              </div>
            </div>
            
            {/* Namespaces chips */}
            <div className="flex flex-wrap gap-1 mt-3">
              {getAgentNamespaces(agent.id).map(ns => (
                <span key={ns} className="px-2 py-1 bg-accent-green/10 text-accent-green rounded text-xs">
                  {ns}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

#### Граф-specific изменения:
- **Размер узлов:** увеличить на 20-30% для touch
- **Zoom limits:** `minZoom: 0.3, maxZoom: 2.5` для мобиле
- **Initial zoom:** `zoomToFit(400, 80)` с большим padding
- **Touch sensitivity:** увеличить hitbox для onClick detection

### 3. Legend Component

#### Создать отдельный компонент:
```tsx
const GraphLegend = ({ isCollapsed, onToggle, className = "" }) => {
  return (
    <>
      {/* Mobile: floating toggle button */}
      <button 
        onClick={onToggle}
        className="fixed bottom-4 right-4 z-20 bg-accent-green text-black p-3 rounded-full shadow-lg sm:hidden"
      >
        ℹ️
      </button>
      
      {/* Mobile: full-screen overlay */}
      {!isCollapsed && (
        <div className="fixed inset-0 bg-black/50 z-30 sm:hidden" onClick={onToggle}>
          <div className="absolute bottom-0 left-0 right-0 bg-surface border-t border-border rounded-t-xl p-4 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Legend</h3>
              <button onClick={onToggle}>✕</button>
            </div>
            <LegendContent />
          </div>
        </div>
      )}
      
      {/* Desktop: unchanged */}
      <div className="hidden sm:block absolute top-4 left-4 z-10 bg-surface/90 border border-border rounded-lg p-3 text-xs space-y-2 backdrop-blur-sm">
        <LegendContent />
      </div>
    </>
  )
}
```

### 4. Tab Navigation

#### Touch-friendly табы:
```css
/* Минимальные размеры для touch */
.tab-button {
  min-height: 44px; /* iOS HIG standard */
  min-width: 44px;
  padding: 12px 16px;
  touch-action: manipulation; /* Prevent zoom on double-tap */
}

/* Horizontal scroll для табов */
.tabs-container {
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
}
.tabs-container::-webkit-scrollbar {
  display: none; /* Chrome/Safari */
}
```

### 5. AgentPanel (боковая панель)

#### Мобильная адаптация:
```tsx
// Заменить sidebar на bottom sheet
const AgentPanel = ({ node, onClose, entries }) => {
  if (!node) return null

  return (
    <>
      {/* Mobile: bottom sheet */}
      <div className="fixed inset-0 bg-black/50 z-40 sm:hidden" onClick={onClose}>
        <div className="absolute bottom-0 left-0 right-0 bg-surface border-t border-border rounded-t-xl max-h-[80vh] overflow-y-auto">
          <div className="sticky top-0 bg-surface border-b border-border p-4 flex items-center justify-between">
            <h3 className="text-lg font-bold">{node.name}</h3>
            <button onClick={onClose} className="p-2 text-muted hover:text-foreground">✕</button>
          </div>
          <div className="p-4">
            <AgentPanelContent node={node} entries={entries} />
          </div>
        </div>
      </div>
      
      {/* Desktop: unchanged */}
      <div className="hidden sm:block fixed right-0 top-0 h-full w-80 bg-surface border-l border-border z-50 overflow-y-auto">
        {/* Existing desktop code */}
      </div>
    </>
  )
}
```

## CSS Utils для мобиле

```css
/* Добавить в globals.css */
@media (max-width: 640px) {
  /* Prevent zoom on inputs */
  input, select, textarea {
    font-size: 16px;
  }
  
  /* Hide scrollbars on mobile */
  .scrollbar-hide {
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  
  /* Safe areas для notch devices */
  .mobile-safe-top {
    padding-top: env(safe-area-inset-top);
  }
  .mobile-safe-bottom {
    padding-bottom: env(safe-area-inset-bottom);
  }
}

/* Touch improvements */
.touch-target {
  min-height: 44px;
  min-width: 44px;
  touch-action: manipulation;
}

.mobile-scroll {
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}
```

## Performance оптимизации

### Canvas graph:
```tsx
// Reduce node/link count on mobile
const isMobile = window.innerWidth < 640
const maxNodes = isMobile ? 15 : 50
const maxLinks = isMobile ? 25 : 100

// Lower canvas resolution on mobile  
const pixelRatio = isMobile ? 1 : window.devicePixelRatio

// Debounce resize events
const debouncedResize = useMemo(
  () => debounce(() => setDimensions({ ... }), 150),
  []
)
```

## Конкретные изменения по файлам

### `components/dashboard/header.tsx`
- [ ] Добавить mobile-first responsive layout
- [ ] Переработать tab navigation с horizontal scroll
- [ ] Добавить burger menu для search/filters
- [ ] Collapse статистику в expandable секцию

### `app/dashboard/network/page.tsx`
- [ ] Добавить `isMobile` detection hook
- [ ] Создать `AgentListView` компонент
- [ ] Условный рендеринг: список vs граф
- [ ] Увеличить touch targets для узлов
- [ ] Оптимизировать количество узлов для мобиле

### `components/dashboard/legend.tsx` (новый файл)
- [ ] Вынести legend в отдельный компонент
- [ ] Floating action button для мобиле
- [ ] Bottom sheet overlay layout
- [ ] Desktop sidebar layout

### `styles/globals.css`
- [ ] Добавить mobile utility classes  
- [ ] Touch-friendly sizing
- [ ] Safe area handling
- [ ] Scrollbar hiding

## Testing Checklist

### Устройства:
- [ ] iPhone 12/13/14 (390x844)
- [ ] iPhone SE (375x667) 
- [ ] Android phones (360-430px wide)
- [ ] iPad mini (768x1024)

### Функции:
- [ ] Tab navigation работает на touch
- [ ] Network graph читается и управляется
- [ ] Legend accessible на мобиле  
- [ ] Agent details открываются корректно
- [ ] Header не обрезается на узких экранах
- [ ] Smooth scrolling и transitions
- [ ] No horizontal overflow

### Performance:
- [ ] Canvas rendering 60fps
- [ ] Smooth touch interactions
- [ ] Fast tab switching
- [ ] Memory usage reasonable

## Rollout план

1. **Phase 1:** Header адаптация (безопасно)
2. **Phase 2:** Legend компонент (изолировано)  
3. **Phase 3:** AgentPanel bottom sheet
4. **Phase 4:** Network Graph mobile version/list view
5. **Phase 5:** Polish и optimization

---

**Note для Pixel:** Этот спек покрывает все ключевые UX изменения для мобиле. Приоритет на usability — пользователи должны легко взаимодействовать с дашбордом на телефоне. Canvas graph — самая сложная часть, может понадобиться A/B тест: упрощенный граф vs список агентов.