# Frontend Best Practices

This document outlines **React-specific best practices** for building maintainable,
performant frontend applications. It is intended for students working on real-world
full‑stack projects.

## 🎯 Core Responsibilities of the Frontend

The frontend is responsible for:

- Rendering UI
- Handling user interaction
- Managing client-side state
- Communicating with backend APIs
- Displaying loading and error states

The frontend **is not** responsible for:

- Business rules
- Data persistence
- Security logic
- Database access

## 🧱 React Architecture Best Practices

### 1️⃣ Keep Components Small and Focused

Each component should ideally:

- do **one thing**
- be easy to read
- be reusable

❌ Too much responsibility:

```jsx
function Dashboard() {
  // fetch data
  // handle form logic
  // render UI
}
```

✅ Better:

```text
Dashboard
├── DashboardLayout
├── StatsPanel
└── ActivityList
```

### 2️⃣ Separate Data Fetching from UI

Avoid putting fetch logic directly in UI-heavy components.

❌ Bad:

```jsx
function Hello() {
  useEffect(() => {
    fetch('/api/hello').then(...)
  }, []);
}
```

✅ Better:

```js
// services/helloApi.js
export const getHello = async () => {
  const res = await fetch('/api/hello');
  return res.json();
};
```

```jsx
function Hello() {
  useEffect(() => {
    getHello().then(setMessage);
  }, []);
}
```

## ⚡ Performance Best Practices

### 3️⃣ Minimize Unnecessary Re-Renders

React re-renders when:

- state changes
- props change
- parent re-renders

Avoid unnecessary state.

❌ Bad:

```jsx
const [count, setCount] = useState(0);
const doubled = count * 2;
```

✅ Better:

```jsx
const doubled = count * 2;
```

Derived values should not be state.

### 4️⃣ Use `useMemo` and `useCallback` When Needed

Only optimize **when necessary**, not everywhere.

```jsx
const expensiveValue = useMemo(() => {
  return heavyCalculation(data);
}, [data]);
```

```jsx
const handleClick = useCallback(() => {
  setCount((c) => c + 1);
}, []);
```

These prevent unnecessary recalculations and re-renders.

### 5️⃣ Avoid Inline Functions in Props (When It Matters)

❌ Can cause re-renders:

```jsx
<Button onClick={() => handleSave()} />
```

✅ Better:

```jsx
const onSave = useCallback(handleSave, []);
<Button onClick={onSave} />;
```

## 🧯 Prevent Memory Leaks

### 6️⃣ Clean Up Side Effects

Always clean up:

- timers
- intervals
- event listeners

```jsx
useEffect(() => {
  const id = setInterval(() => {
    console.log('tick');
  }, 1000);

  return () => clearInterval(id);
}, []);
```

Without cleanup, memory leaks occur.

### 7️⃣ Abort Fetch Requests on Unmount

```jsx
useEffect(() => {
  const controller = new AbortController();

  fetch('/api/data', { signal: controller.signal })
    .then((res) => res.json())
    .then(setData)
    .catch(() => {});

  return () => controller.abort();
}, []);
```

Prevents state updates on unmounted components.

## 🧠 State Management Best Practices

### 8️⃣ Lift State Only When Necessary

State should live:

- as low as possible
- as high as necessary

Avoid global state too early.

### 9️⃣ Avoid Overusing `useEffect`

`useEffect` is for **side effects**, not regular logic.

❌ Bad:

```jsx
useEffect(() => {
  setTotal(price * qty);
}, [price, qty]);
```

✅ Better:

```jsx
const total = price * qty;
```

## 🧪 Rendering & Lists

### 🔟 Always Use Stable Keys

❌ Bad:

```jsx
items.map((item, index) => <Item key={index} />);
```

✅ Good:

```jsx
items.map((item) => <Item key={item.id} />);
```

Stable keys prevent UI bugs and re-renders.

## 🌍 Environment & Configuration

### 1️⃣1️⃣ Use Environment Variables

```js
const API_URL = import.meta.env.VITE_API_URL;
```

Never hardcode production URLs.

## 🧠 Recommended Mindset

> React performance comes from **good structure first**, not premature optimization.

Build readable code first.
Optimize when you see real issues.

## 📋 Quick Checklist (Before MVP Review)

- [ ] Components are small and focused
- [ ] API logic lives in services
- [ ] No unnecessary state
- [ ] Side effects are cleaned up
- [ ] Lists use stable keys
- [ ] Environment variables are used correctly
- [ ] `npm run lint && npm run typecheck && npm run format:check && npm test` passes

## 🧪 Testing

Tests use **Vitest** (Jest-like, reuses `vite.config.ts`) with **React Testing
Library**. They run in a fake browser (jsdom) and need no backend: **MSW**
answers API requests instead.

```bash
npm test              # run all tests once
npm run test:watch    # re-run on every save
npm run test:cov      # with a coverage table (writes coverage/, gitignored)
npx vitest run src/pages/LoginPage.test.tsx   # one file
```

- Put a test next to the file it tests: `LoginPage.tsx` → `LoginPage.test.tsx`.
- Find elements the way a user would: `getByRole('button', { name: /sign in/i })`,
  `getByLabelText(/email/i)`. Avoid CSS classes and test ids.
- Interact with `user-event` (`await user.type(...)`, `await user.click(...)`).
- `renderApp('/some/path')` from `src/test/renderApp.tsx` renders the whole app
  (auth context + routes) at that URL.

### Faking the backend

`src/test/server.ts` holds the default fake API: signed out, and login succeeds
only for `testUser` / `testPassword`. Override a response in one test with
`server.use(...)`; overrides are reset after each test:

```tsx
import { http, HttpResponse } from 'msw';
import { API, errorResponse, server, signedIn } from '../test/server';

signedIn(); // GET /api/auth/me returns testUser

server.use(
  http.post(`${API}/api/auth/login`, () =>
    errorResponse(500, 'INTERNAL_ERROR'),
  ),
);
server.use(http.get(`${API}/api/reports`, () => HttpResponse.error())); // network failure
```

A request with no handler fails, so add a handler for every new endpoint a test
calls.

## 📄 License

Educational use only.
