# Project Rules

These rules apply to every change in this repo, by a person or by an AI tool (Claude Code, Cursor, …).
If a change breaks a rule, fix it before you move on. When unsure, copy the existing **users** feature: it follows every rule below.

**Contents:**
1. UI consistency
2. Mobile
3. Components
4. API calls
5. Forms (+ 5a. Field validation)
6. State
7. Feedback & states
8. Routing
9. Frontend structure
10. Backend architecture
11. Validation
12. Security
13. Database
14. Logging & background jobs
15. TypeScript & naming
16. Accessibility
17. Git
18. Definition of done
19. Working with AI tools

---

## 1. Consistent UI across the whole project

- Every page uses the same layout: `components/layout/app-layout.tsx`. Don't create a new page shell.
- Every page starts with `<PageHeader title description actions />` (`components/common/page-header.tsx`).
- Put page content inside shadcn `Card`s: `CardHeader` / `CardTitle` for the section title, `CardContent` for the body.
- Use the theme tokens from `src/index.css` for colours (`bg-background`, `text-foreground`, `text-muted-foreground`, `border`, `bg-primary`, `text-destructive`, `bg-accent`, …).
  - **No hard-coded colours.** No `bg-blue-500`, no `#hex`, no inline `style={{ color }}`.
- Spacing and type use Tailwind's scale only. No arbitrary values like `mt-[13px]`.
  - Page padding comes from the layout (`p-4 md:p-6`).
  - The gap between sections is `space-y-6` / `gap-6`, and the gap inside a group is `gap-2` / `gap-4`.
  - Page title: `PageHeader`. Section title: `CardTitle`. Helper text: `text-sm text-muted-foreground`.
- Use `lucide-react` for icons, at size `size-4` (inline, in buttons) or `size-5` (icon-only header buttons).
- **Dark mode is required.** Every screen must look right in light and dark (toggle in the header).
  - Theme tokens handle this automatically. Never write colours that only work in one theme.

## 2. Mobile responsiveness (required)

- Design **mobile-first**: write the base classes for phone widths, then add `sm:` / `md:` / `lg:` for larger screens.
- Every page must work at **360px** width, with **no horizontal page scroll**.
- Layouts:
  - Stacks: `flex flex-col gap-4 md:flex-row`
  - Grids: `grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3`
- Forms are a single column on mobile. Inputs and the submit button are full width on mobile (`w-full sm:w-auto`).
- Navigation: below `md`, the header nav collapses into a `Sheet` (hamburger menu), as in `app-layout.tsx`. Add new links to the `nav` array there; both menus pick it up.
- Dialogs: use `Dialog` on desktop and `Drawer` on mobile for forms (pick with `useIsMobile()` from `hooks/use-mobile.ts`). Use `ConfirmDialog` for confirmations on every screen size.
- Tap targets are at least 40px high. Don't put information or actions behind hover only.
- AG Grid on mobile:
  - give key columns a `minWidth`
  - hide low-priority columns with `hide: isMobile`
  - pin the actions column to the right
  - the grid scrolls horizontally *inside itself*, never the page
- Test every new screen at **360px, 768px and 1280px** before calling it done.

## 3. UI components: shadcn only, AG Grid for tables

- **Only use shadcn/ui components** from `src/components/ui/`. All of them are installed.
  - Don't add MUI, Chakra, Ant Design, Bootstrap, react-select, react-datepicker, react-toastify, etc.
  - Don't hand-build something that already exists in shadcn (buttons, inputs, modals, dropdowns, tabs, toasts, date pickers, …).
- **Don't edit the files in `components/ui/`** to restyle a single screen. Pass `className` / `variant` instead. If a variant really is needed everywhere, add it to the component once.
- These components are built on **Base UI**, not Radix. To render a trigger as another element, use the `render` prop instead of `asChild`:
  `<SheetTrigger render={<Button variant="ghost" size="icon" />}>…</SheetTrigger>`
- When you need a combination of components more than once, build a wrapper in `components/common/`. Use the existing ones first:

  | Need | Use |
  |---|---|
  | Table | `DataGrid` |
  | Server pagination | `PaginationBar` |
  | Page title + actions | `PageHeader` |
  | Form field | `FormInput` |
  | Password field (outside a form) | `PasswordInput` |
  | Delete / confirm | `ConfirmDialog` |
  | Error / empty / page loading | `ErrorState`, `EmptyState`, `PageLoader` |
  | Theme switch | `ThemeToggle` |

- **All tables use AG Grid** through `components/common/data-grid.tsx`.
  - Don't use the shadcn `Table` or a raw `<table>` for data lists.
  - Define columns as `useMemo<ColDef<T>[]>` inside the feature component.
  - Put row actions in a `cellRenderer` that uses shadcn `Button` / `DropdownMenu`.
  - Pass `loading={isLoading}` and `getRowId={(p) => p.data.id}`.
  - The grid theme in `lib/ag-grid.ts` is mapped to the shadcn tokens. Don't override grid colours per table.

## 4. API calls: always use the axios instance

- Every HTTP call goes through the shared instance in `src/services/api/client.ts` (`import { api } from "@/services/api/client"`).
  - **Never** call `fetch()` or `axios.get(...)` directly, and never create another axios instance.
  - The shared instance handles `withCredentials` (cookies), the base URL, error messages and the automatic token refresh on 401.
- All endpoint paths live in `services/api/endpoints.ts`. No URL strings anywhere else.
- All query keys live in `services/api/query-keys.ts`.
- Each feature has its own folder, `services/<feature>/`, with two files:
  - `<feature>.service.ts`: plain async functions that call `api` and return `res.data.data`
  - `<feature>.queries.ts`: TanStack Query hooks (`useQuery` / `useMutation`)
- Components call **hooks only** (`useUsers()`, `useLogin()`). Never call service functions or `api` from a component.
- After a mutation, invalidate the related query keys (`qc.invalidateQueries`). Don't refetch by hand or copy data into state.
- For paginated lists, pass `{ page, limit, search }` and use `placeholderData: keepPreviousData`.
- Never store tokens in JS (localStorage, Zustand, memory). Auth lives in **httpOnly cookies** only.

## 5. Forms

- Every form uses **React Hook Form + zod**. Put the schema in `src/schemas/<feature>.schema.ts` and connect it with `zodResolver`.
- Build fields with `FormInput` (or shadcn `Field` / `FieldLabel` / `FieldError` for other inputs). Show validation errors under the field.
- **Always pass `onInvalidSubmit`** so an invalid submit also shows a toast:
  `form.handleSubmit(onSubmit, onInvalidSubmit)`
- Add `noValidate` to `<form>` so zod shows the messages, not the browser.
- Spread `INPUT_HINTS.<field>` (`lib/input-hints.ts`) onto ID, phone and email inputs. It sets the right mobile keyboard, autofill and max length.
- **Every password field has a show/hide eye toggle.**
  - `FormInput` with `type="password"` (or `{...INPUT_HINTS.password}` / `newPassword`) renders `PasswordInput` automatically.
  - Never render a bare `<Input type="password">`.
  - Confirm-password fields use it too.
- Basic UX every form must have:
  - labels on every field
  - placeholders that show the expected format
  - the right `autoComplete` values
  - pressing Enter submits the form
  - for long forms, focus jumps to the first invalid field (RHF does this by default; don't turn it off)
- Type the form as `useForm<z.input<typeof s>, unknown, z.output<typeof s>>`. The validators clean the value (trim, uppercase, strip `+91`), so the input and output types differ.
- Don't use uncontrolled `<form>`s with `useState` per field, and don't validate by hand.
- Disable the submit button while the mutation is pending, and change its label (e.g. "Saving...").
- Infer types from the schema. Don't write the same type twice.

## 5a. Field validation (mobile, email, Aadhaar, PAN, …)

- **Never write a regex for these fields.** Use the shared validators.
  - The source is `be/src/validators/fields.ts`.
  - The FE copy is `fe/src/schemas/fields.ts`. It is auto-synced before `dev` / `build`, so **don't edit it**.
  - Use the same validator on the FE form **and** the BE route, so both give the same message.

| Field | Validator | Accepts (cleaned to) |
|---|---|---|
| Name | `personName(label?)` | letters, spaces, `. ' -`, 2-100 (extra spaces collapsed) |
| Email | `email()` | trimmed, lowercased, max 254 |
| Mobile (India) | `mobile()` | `+91 98765-43210`, `09876543210` → `9876543210` (starts 6-9) |
| Password | `password()` | 8-72 with upper, lower, number, symbol. **Signup only**; login just checks it's non-empty |
| OTP | `otp(len = 6)` | digits only |
| Date of birth | `dateOfBirth(minAge = 18)` | not in the future, age between minAge and 120 |
| PIN code | `pincode()` | 6 digits, not starting with 0 |
| Aadhaar | `aadhaar()` | `2341 2341 2346` → 12 digits, starts 2-9, **Verhoeff checksum** |
| PAN | `pan()` / `personalPan()` | `ABCPE1234F` (uppercased, valid 4th-letter holder type / must be `P`) |
| GSTIN | `gstin()` | state code + PAN + `Z` + **checksum** |
| IFSC | `ifsc()` | `SBIN0001234` |
| Bank account | `bankAccount()` | 9-18 digits |
| UPI ID | `upiId()` | `name@okaxis` |
| Voter ID | `voterId()` | `ABC1234567` |
| Passport | `passport()` | `A1234567` |
| Driving licence | `drivingLicence()` | `TS09 20110012345` → `TS0920110012345` |
| Vehicle number | `vehicleNumber()` | `TS09AB1234`, `22BH1234AA` |
| Required text / URL | `requiredText(label, max)`, `httpUrl(label)` | |

- Optional fields: wrap with `optional(...)`, e.g. `alternateMobile: optional(mobile())`. An empty input then becomes `undefined` instead of failing.
- Messages must name the field and say how to fix it ("Enter a valid 10-digit mobile number starting with 6-9"), never just "Invalid".
- To add a new field type: add it to `be/src/validators/fields.ts`, test valid and invalid samples, then add an entry to `INPUT_HINTS`.

## 6. State management

- **Server data** (anything from the API) lives in **TanStack Query** only.
- **Zustand** (`src/store/`) is for client-only state: the logged-in user profile, theme, UI preferences.
  - Never copy API lists into Zustand.
- Local UI state (open dialogs, the current tab, input text) stays in `useState` inside the component.

## 7. Feedback & states

- **All user messages are toasts.** No `alert()`, no inline success banners, no `<p className="text-destructive">` for API errors.
  - **API errors** are toasted automatically by the `MutationCache` in `lib/query-client.ts`. The text is the backend's `message`, which for validation errors is the first field's message.
  - **Success:** set `meta: { successMessage: "User deleted" }` on the mutation.
  - **Invalid form submit:** `onInvalidSubmit` toasts "Please fix N highlighted fields" plus the first error. Field errors still show inline under each field.
  - `meta: { silentError: true }` is only for mutations that must never show an error (e.g. logout).
  - For any other toast use `notify.success / error / info` from `lib/notify.ts`. Don't call `toast` directly.
  - Toast text is short and human: "Profile updated", not "200 OK" or a stack trace.
- **Every data view handles all states:**
  - **Loading:** the grid's `loading` prop, or `Skeleton` for cards, or `PageLoader` for a full page
  - **Empty:** `EmptyState`
  - **Error:** `ErrorState` with a retry button (`onRetry={refetch}`)
- Every destructive action (delete, revoke, logout-all) asks for confirmation with `ConfirmDialog`.

## 8. Routing

- Register every route in `src/app/router.tsx`.
- Pages that need login go under `ProtectedRoute` → `AppLayout`. Login/register/404 sit outside it.
- Add new main pages to the `nav` array in `app-layout.tsx` so they show on desktop and mobile.
- Use `Link` / `NavLink` / `useNavigate` from `react-router`. Never use `<a href>` for internal links or `window.location`.

## 9. Frontend folder structure

```
src/
├─ app/           router.tsx + routes/ (routes only)
├─ components/    ui/ (shadcn, don't edit) · common/ (shared wrappers) · layout/ · <feature>/
├─ services/      api/ (client, endpoints, query-keys) · <feature>/ (*.service.ts, *.queries.ts)
├─ schemas/       zod form schemas
├─ store/         zustand stores
├─ types/         shared TS types
├─ hooks/         reusable hooks (use-mobile, use-debounce)
├─ lib/           utils, query client, ag-grid theme, notify
├─ providers/     app/theme providers
└─ constants/
```

- `src/app/` holds **routes only.** Each file in `app/routes/` imports and renders one component. No logic, no hooks, no markup.
- `src/components/<feature>/` holds the real page and feature code.

## 10. Backend architecture

- Each request flows in one direction:
  **route → `validate(zod)` → `authenticate` / `authorize` → controller → service → Prisma**
  - **Routes** (`routes/*.routes.ts`): wiring only. Register them in `routes/index.ts`.
  - **Controllers** (`controllers/`): read `req`, call a service, send the response. **No Prisma, no business logic.**
  - **Services** (`services/`): business logic and all database access.
- Every controller is wrapped in `asyncHandler`. No `try/catch` just to forward errors.
- **Response shape is always** `{ success, data, message? }`. Send success with `sendSuccess(res, data, status?, message?)`.
- Throw errors as `throw new ApiError(status, "message")`. The global `errorHandler` formats them (zod and Prisma errors too). Never call `res.status(500)` by hand.
- Status codes:
  - `200` read/update
  - `201` create
  - `204` delete
  - `400` validation
  - `401` not logged in
  - `403` forbidden
  - `404` not found
  - `409` duplicate
- Config comes only from `config/env.ts`, which is zod-validated. Never read `process.env` anywhere else.
- Add every new env var to **both** `.env` and `.env.example`.

## 11. Validation

- Every route that takes input has a zod schema in `validators/`:
  - body: `validate(schema)`
  - query: `validate(schema, "query")`
  - params: `validate(idParamSchema, "params")`
- Never trust `req.body` / `req.query` / `req.params` without validation.
- Build schemas from the shared validators in `validators/fields.ts` (section 5a), never ad-hoc regexes.
- Lists use `paginationSchema` (`page`, `limit` ≤ 100, `search`).
- A validation error returns `400 { success: false, message: <first error>, errors: [{ field, message }] }`. Keep that shape; the FE toast depends on `message`.

## 12. Security

- **Never return a password hash.** Always `select: publicUserSelect` (or a similar safe select) for user data.
- Protect routes with `authenticate`, and role-restricted ones with `authorize("ADMIN")`.
- Auth uses httpOnly cookies:
  - `access_token`: 15 min
  - `refresh_token`: 7 days, rotated on each refresh
  - Don't change this to localStorage or tokens in the response body.
- Never log secrets, tokens, passwords, cookies or OTPs. The logger redacts `password`, `aadhaar`, `pan`, `accountNumber` and `otp`; keep these field names so redaction works.
- **Aadhaar, PAN and bank account numbers are sensitive:**
  - In the UI and in API list responses, show them masked (`maskAadhaar`, `maskPan`, `maskAccount`, `maskMobile`, `maskEmail` from `fields.ts`).
  - Return the full value only on a dedicated, authorised endpoint.
  - Don't store a full Aadhaar number unless the feature truly needs it. If it must be stored, encrypt it at rest.
- Hash passwords with `bcrypt`. Compare with `bcrypt.compare`.
- Rate-limit public endpoints that can be abused (login, register, OTP, forgot password).
- Never commit `.env`. Never paste real credentials into code, docs or commits.

## 13. Database (Prisma)

- Change the schema **only** through `prisma/schema.prisma`, then:
  `npm run db:migrate -- --name <what_changed>`, then `npm run db:generate`.
  - Never edit the database by hand, and never edit an applied migration.
- Models: PascalCase in the schema, mapped to snake_case plural tables (`@@map("users")`).
- Every model has `id` (uuid), `createdAt`, `updatedAt`.
- **Add an index** (`@@index`) on columns used in `where`, `orderBy` or joins (foreign keys).
- **Paginate every list endpoint** (`skip/take` + `count` in a `$transaction`, returned through `paginated()`). Never return an unbounded `findMany()`.
- Use `select` to return only the fields you need.
- When a query is slow, check it with `EXPLAIN ANALYZE` before guessing.
- Use `$transaction` when several writes must succeed or fail together.

## 14. Logging, caching & background jobs

- Log with `req.log` (inside requests) or `logger` (elsewhere). **Never `console.log`.**
  - Log objects, not strings: `logger.info({ userId, jobId }, "message")`.
- Cache with `cached(key, ttl, loader)` from `utils/cache.ts`.
  - Every write must invalidate its keys (`invalidate` / `invalidatePrefix`).
  - Prefix cache keys by feature (`users:list:`).
  - The app must still work when Redis is down.
- Slow or retryable work (emails, notifications, file processing, third-party calls, AI calls) goes to a **BullMQ job**, not the request:
  - producer in `jobs/queues/`
  - consumer in `jobs/workers/`, registered in `worker.ts`

## 15. TypeScript & naming

- Strict TypeScript: **no `any`**, no `@ts-ignore`, and avoid `as` casts (use zod parsing or type guards).
- Files: **kebab-case** in the FE (`user-form.tsx`), `<name>.<layer>.ts` in the BE (`user.service.ts`).
- Components are PascalCase, hooks start with `use`, constants are `UPPER_SNAKE_CASE`.
- Use named exports everywhere, except route files in `app/routes/` (default export).
- Use the `@/` import alias in the FE. No long `../../..` chains.

## 16. Accessibility

- Every input has a visible label (`FieldLabel`) or an `aria-label`.
- Icon-only buttons always have an `aria-label` (`aria-label="Delete John"`).
- Everything can be reached and used with the keyboard. Never remove focus rings.
- Don't use colour alone to show meaning. Pair it with text or an icon (e.g. `Badge` text).

## 17. Git

- Branch names: `feat/<thing>`, `fix/<thing>`.
- Use Conventional Commits: `feat: add jobs list`, `fix: refresh token loop`, `chore:`, `refactor:`, `docs:`.
- Make small, focused commits that build. Commit after each working feature.
- Never commit `.env`, `node_modules`, `dist` or `src/generated`.

## 18. Definition of done

A feature is done only when all of these are true:

- [ ] `npm run build` passes in **both** `fe/` and `be/` with no TypeScript errors
- [ ] It works at 360px, 768px and 1280px, in light **and** dark mode
- [ ] Loading, empty and error states are handled, and mutations show toasts
- [ ] New endpoints are validated, protected and paginated where needed
- [ ] New endpoints are added to `be/postman_collection.json`
- [ ] New env vars are in `.env.example`, and the README is updated if setup changed
- [ ] It was clicked through once in the browser, end to end

## 19. Working with AI tools

- AI tools must follow this file. If a rule blocks a good solution, say so. Don't quietly break it.
- **Read and understand every AI-written line before committing it.** You must be able to explain any line in review.
- Run it and test it yourself. "It compiles" is not "it works".
- Keep changes small and reviewable. Don't let a tool rewrite unrelated files.
