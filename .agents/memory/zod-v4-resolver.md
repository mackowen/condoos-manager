---
name: Zod v4 zodResolver hookform compatibility
description: @hookform/resolvers/zod expects ZodType<any, any, any> which Zod v4 objects/enums/unions don't satisfy.
---

`ZodObject<..., $strip>` (Zod v4) is not assignable to `ZodType<any, any, any>` (expected by `@hookform/resolvers/zod`).

**Why:** Zod v4 uses branded `$strip` type for the output mode; resolvers package was written for v3.

**How to apply:** Cast the schema: `zodResolver(formSchema as never)`. This is safe at runtime, only suppresses the TS error.

Note: `z.enum`, `z.union([z.literal, z.literal])`, and `z.object` all trigger this issue in Zod v4.
