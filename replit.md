# Daily Expense Tracking

واجهة عربية RTL لمتابعة المصاريف اليومية في السعودية، مع ميزانية يومية، حسابات دقيقة بالهللات، وحفظ محلي في المتصفح.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/daily-expense-tracking/src/App.tsx` — تجربة التطبيق وحالة المصروفات والميزانية.
- `artifacts/daily-expense-tracking/src/index.css` — الثيم RTL والاستجابة للشاشات المختلفة.
- `artifacts/daily-expense-tracking` — تطبيق React/Vite القابل للنشر.

## Architecture decisions

- التخزين محلي عبر `localStorage` لأن التطبيق الشخصي لا يحتاج حسابات أو خادمًا في النسخة الأولى.
- كل القيم المالية تُحفظ وتُحسب بوحدة الهللة كأعداد صحيحة لتجنب أخطاء الفواصل العشرية.
- واجهة الاستخدام عربية بالكامل مع `dir="rtl"` وتنسيق `Intl` السعودي للتواريخ والريال.

## Product

- تحديد كوتة إنفاق يومية ومتابعة المتبقي بصريًا.
- إضافة مصروف يدويًا أو عبر اختصارات الكبسة والقهوة والبنزين.
- ملخص اليوم والشهر، توزيع حسب التصنيف، وبحث/تصفية وحذف من السجل.

## User preferences

-

## Gotchas

- أمر `build` المستقل يحتاج `PORT` و`BASE_PATH`؛ سير العمل يحقنهما تلقائيًا.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
