---
name: state-management
description: "CoreAI Sandbox's simplified TanStack Query + mock-JSON data layer. USE WHEN: editing data-fetching hooks (`app/hooks/use*.ts`), adding mock data in `app/data/`, or wiring a component to query state."
---

# State Management Instructions — CoreAI Sandbox Demo

## Overview

This document describes the data fetching and state management implementation in the CoreAI Sandbox demo application. This is a **simplified, mock-based implementation** designed for prototyping and design exploration, not production use.

## Key Differences from Production

CoreAI Sandbox uses a **simplified subset** of the production state management architecture:

- ✅ **TanStack Query** - For consistent data fetching patterns
- ❌ **No Jotai** - Not needed for this demo
- ❌ **No Axios** - Direct JSON imports instead of HTTP calls
- ❌ **No Redis** - No server-side caching
- ❌ **No SSR/Loaders** - Client-side only rendering
- ❌ **No Resolvers** - Simplified to direct data imports

## Data Fetching Library

### Primary Library

- **@tanstack/react-query** (TanStack Query v5) - Core data fetching and caching library

## Architecture

### 1. QueryProvider Setup

The app is wrapped with `QueryProvider` in `app/root.tsx`:

```tsx
import { QueryProvider } from './core/datafetching/QueryProvider';

export default function App() {
  return (
    <QueryProvider>
      <AppContent>
        <Outlet />
      </AppContent>
    </QueryProvider>
  );
}
```

**Configuration** (`app/core/datafetching/QueryProvider.tsx`):

- `staleTime: 5 minutes` - Data is considered fresh
- `gcTime: 10 minutes` - Garbage collection time
- `retry: false` - Don't retry failed requests
- `refetchOnWindowFocus: false` - Don't refetch on focus

### 2. Mock Data Layer

**Location**: `app/data/`

**Files**:

- `agents.json` - 50 agents with varied lifecycle statuses
- `tools.json` - 35 tools with categories and publish status
- `index.ts` - TypeScript interfaces and utility functions

**Data Types**:

```typescript
export interface Agent {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'published' | 'deployed';
  tags: string[];
  owner: string;
  createdDate: string; // ISO 8601
  updatedDate: string; // ISO 8601
  version: string; // Semantic version
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  isPublished: boolean;
}
```

**Utility Functions**:

```typescript
// Filter agents by status
filterAgentsByStatus(agents: Agent[], status: AgentStatus): Agent[]

// Filter tools by category
filterToolsByCategory(tools: Tool[], category: ToolCategory): Tool[]

// Filter tools by published status
filterToolsByPublished(tools: Tool[], isPublished: boolean): Tool[]
```

### 3. Custom Hooks Pattern

**Location**: `app/hooks/`

Custom hooks wrap TanStack Query's `useQuery` and import JSON data directly.

**Example — `useAgents.ts`**:

```typescript
import { useQuery } from '@tanstack/react-query';
import { agents, filterAgentsByStatus } from '~/data';

export interface UseAgentsOptions {
  status?: AgentStatus;
}

export function useAgents(options?: UseAgentsOptions) {
  return useQuery({
    queryKey: ['agents', options?.status],
    queryFn: async (): Promise<Agent[]> => {
      // Simulate network delay (400ms)
      await delay(400);

      // Return filtered or all agents
      if (options?.status) {
        return filterAgentsByStatus(agents, options.status);
      }
      return agents;
    },
  });
}
```

**Available Hooks**:

- `useAgents(options?)` - Fetch agents, optionally filtered by status
- `useTools(options?)` - Fetch tools, optionally filtered by category/publish status

**Query Keys**:

```typescript
['agents', status?]           // e.g., ['agents', 'draft']
['tools', category?, isPublished?]  // e.g., ['tools', 'Data', true]
```

### 4. Component Usage Pattern

Components use custom hooks directly in route components:

```tsx
import { useAgents } from '~/hooks/useAgents';
import { CollectionPage } from '~/components/common';

export default function BuildAgents() {
  const { data: agents, isLoading } = useAgents({ status: 'draft' });

  return (
    <CollectionPage
      headerProps={{ title: 'Agents' }}
      dataGridProps={{
        items: agents ?? [],
        isLoading,
        columns,
        getRowId: (agent) => agent.id,
      }}
    />
  );
}
```

### 5. Route-Specific Filtering

Different routes show different subsets of the same data:

| Route              | Hook Usage                           | Filter                |
| ------------------ | ------------------------------------ | --------------------- |
| `/build/agents`    | `useAgents({ status: 'draft' })`     | Draft agents (10)     |
| `/discover/agents` | `useAgents({ status: 'published' })` | Published agents (16) |
| `/operate/agents`  | `useAgents({ status: 'deployed' })`  | Deployed agents (24)  |
| `/build/tools`     | `useTools()`                         | All tools (35)        |
| `/discover/tools`  | `useTools({ isPublished: true })`    | Published tools (28)  |

### 6. Loading States

TanStack Query provides automatic loading state management:

```tsx
const { data, isLoading, error } = useAgents();

// DataGrid handles loading state
<DataGrid isLoading={isLoading} items={data ?? []} />;
```

**States Available**:

- `isLoading` - Initial fetch in progress
- `isFetching` - Any fetch in progress (including background refetch)
- `isError` - Query failed
- `error` - Error object if query failed
- `data` - Query result data

## Best Practices

### DO:

- ✅ Use TanStack Query for ALL data fetching
- ✅ Use custom hooks (`useAgents`, `useTools`) in components
- ✅ Pass query results to DataGrid with `isLoading` prop
- ✅ Provide sensible empty states
- ✅ Use consistent query keys for caching
- ✅ Filter data via hook options when possible

### DON'T:

- ❌ Don't fetch data in `useEffect`
- ❌ Don't use `useState` for server data
- ❌ Don't call TanStack Query's `useQuery` directly - use custom hooks
- ❌ Don't mutate imported JSON data
- ❌ Don't add SSR/loader patterns (this is client-only)
- ❌ Don't add real API calls or authentication

## Simulated Delays

All queries include a 400ms simulated delay:

```typescript
async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

This creates realistic loading states without actual network requests.

## Adding New Data

### 1. Create JSON File

```json
// app/data/newentity.json
[
  { "id": "entity-001", "name": "Example", ... }
]
```

### 2. Add Type to `app/data/index.ts`

```typescript
export interface NewEntity {
  id: string;
  name: string;
  // ...
}

import newEntityData from './newentity.json';
export const newEntities: NewEntity[] = newEntityData as NewEntity[];
```

### 3. Create Custom Hook

```typescript
// app/hooks/useNewEntity.ts
import { useQuery } from '@tanstack/react-query';
import { newEntities } from '~/data';

export function useNewEntity() {
  return useQuery({
    queryKey: ['newEntity'],
    queryFn: async () => {
      await delay(400);
      return newEntities;
    },
  });
}
```

### 4. Use in Component

```tsx
import { useNewEntity } from '~/hooks/useNewEntity';

const { data, isLoading } = useNewEntity();
```

## Architecture Benefits

This simplified architecture provides:

1. **Consistent Patterns** - Easy to port components to production
2. **Realistic UX** - Loading states, caching behavior
3. **Type Safety** - TypeScript throughout
4. **Low Complexity** - No backend needed
5. **Fast Iteration** - Change JSON, see results immediately

## Migration to Production

When moving components to production:

1. Custom hooks stay similar but fetch from real APIs
2. Add resolver pattern and authentication
3. Add SSR/loader prefetching
4. Replace JSON imports with HTTP calls
5. Add proper error handling and retry logic
6. Configure appropriate `staleTime` per query

## Related Files

- `app/core/datafetching/QueryProvider.tsx` - TanStack Query provider
- `app/data/index.ts` - Type definitions and exports
- `app/data/agents.json` - Mock agent data
- `app/data/tools.json` - Mock tool data
- `app/hooks/useAgents.ts` - Agents data hook
- `app/hooks/useTools.ts` - Tools data hook
