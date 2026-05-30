---
name: Express 5 req.params typing
description: req.params destructuring gives string | string[] in Express 5 TypeScript — must cast explicitly.
---

In Express 5 with TypeScript, `const { id } = req.params` produces `id: string | string[]`, not `string`.

**Why:** Express 5's `@types/express` changed `ParamsDictionary` to include `string[]`.

**How to apply:** Always use `const id = req.params.id as string;` in all route handlers that use path params.
