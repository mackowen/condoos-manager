---
name: Drizzle dynamic conditions pattern
description: Building a conditions array and spreading into and() breaks TypeScript inference — use inline conditional expressions.
---

**Wrong pattern:**
```typescript
const conditions = [eq(table.condominiumId, condId)];
if (search) conditions.push(or(ilike(...), ilike(...)) as ReturnType<typeof eq>);
.where(and(...conditions))  // TS2769
```

**Correct pattern:**
```typescript
import { type SQL } from "drizzle-orm";
const searchCond: SQL | undefined = search ? or(ilike(...), ilike(...)) : undefined;
.where(and(
  eq(table.condominiumId, condId),
  searchCond,
  categoryId ? eq(table.categoryId, categoryId) : undefined,
))
```

**Why:** Drizzle `and()` accepts variadic `(SQL | undefined)` args; TypeScript won't infer push()'d array element types well.
