---
phase: quick-13
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/components/ui/Navbar.tsx
  - frontend/src/components/ui/Layout.tsx
  - frontend/src/App.tsx
  - frontend/src/features/will/components/WillDashboard.tsx
  - frontend/src/features/additional-documents/components/AdditionalDocumentsDashboard.tsx
autonomous: true

must_haves:
  truths:
    - "Every authenticated page shows the same navbar with brand, nav links, ThemeToggle, and UserButton"
    - "Active nav link is visually highlighted based on current route"
    - "Mobile users see a hamburger menu that opens a dropdown with nav links"
    - "LandingPage (signed out) shows simpler navbar with brand + ThemeToggle only"
    - "WillDashboard and AdditionalDocumentsDashboard no longer render their own navbar"
  artifacts:
    - path: "frontend/src/components/ui/Navbar.tsx"
      provides: "Shared responsive navbar component"
    - path: "frontend/src/components/ui/Layout.tsx"
      provides: "Shared layout wrapper (Navbar + content area)"
    - path: "frontend/src/App.tsx"
      provides: "Updated routing using Layout wrapper"
  key_links:
    - from: "frontend/src/components/ui/Navbar.tsx"
      to: "react-router-dom"
      via: "useLocation for active link highlighting"
      pattern: "useLocation"
    - from: "frontend/src/components/ui/Layout.tsx"
      to: "frontend/src/components/ui/Navbar.tsx"
      via: "renders Navbar above children"
      pattern: "<Navbar"
    - from: "frontend/src/App.tsx"
      to: "frontend/src/components/ui/Layout.tsx"
      via: "wraps authenticated route content"
      pattern: "<Layout"
---

<objective>
Create a shared responsive Navbar and Layout component, then refactor App.tsx and page components to use them -- eliminating duplicated navbar code across WillDashboard and AdditionalDocumentsDashboard.

Purpose: Consistent navigation between pages, DRY layout, mobile-friendly hamburger menu.
Output: Navbar.tsx, Layout.tsx, updated App.tsx, cleaned WillDashboard, cleaned AdditionalDocumentsDashboard.
</objective>

<execution_context>
@/home/laudes/.claude/get-shit-done/workflows/execute-plan.md
@/home/laudes/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@frontend/src/App.tsx
@frontend/src/components/ui/ThemeToggle.tsx
@frontend/src/features/will/components/WillDashboard.tsx
@frontend/src/features/additional-documents/components/AdditionalDocumentsDashboard.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create Navbar and Layout components</name>
  <files>
    frontend/src/components/ui/Navbar.tsx
    frontend/src/components/ui/Layout.tsx
  </files>
  <action>
**Navbar.tsx** -- Create a responsive DaisyUI navbar component:

- Accept an optional prop `variant?: 'full' | 'minimal'` (default `'full'`).
- **navbar-start:** DaisyUI hamburger dropdown for mobile (`dropdown` + `btn btn-ghost lg:hidden` + menu icon SVG). The dropdown menu contains the same nav links as desktop. Brand text "WillCraft SA" as a `<Link to="/">` with classes `text-xl font-bold`.
- **navbar-center (desktop only, hidden on mobile):** Horizontal nav links using `<Link>` from react-router-dom:
  - "My Wills" -> `/`
  - "Documents" -> `/documents`
  - Use `useLocation()` to determine active link. Apply `active` class on the `<a>`/`<Link>` inside a DaisyUI `menu menu-horizontal px-1` for desktop. Active detection: for "/" use exact match (`pathname === '/'`), for "/documents" use startsWith (`pathname.startsWith('/documents')`).
- **navbar-end:** `<ThemeToggle />` + `<UserButton />` (from @clerk/clerk-react) with `gap-2`.
- **Minimal variant:** When `variant="minimal"`, render ONLY navbar-start (brand as plain `<span>`, no Link) + navbar-end (`<ThemeToggle />` only, no UserButton, no nav links, no hamburger). This is for LandingPage (signed-out state).
- Use DaisyUI classes exclusively: `navbar bg-base-100 shadow-sm`, `dropdown`, `menu`, `btn btn-ghost`. No custom CSS.
- Mobile dropdown menu items must match the desktop links (My Wills, Documents) and also highlight the active route.

**Layout.tsx** -- Create a simple layout wrapper:

```tsx
import { Navbar } from './Navbar'

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-base-200">
      <Navbar />
      {children}
    </div>
  )
}
```

This eliminates the repeated `min-h-screen bg-base-200` + navbar pattern from every page.
  </action>
  <verify>
    - `npx tsc --noEmit` passes with no errors
    - Both files export their named components
  </verify>
  <done>
    Navbar.tsx renders responsive navbar with brand link, nav links (active highlighting), hamburger on mobile, ThemeToggle + UserButton. Layout.tsx wraps Navbar + children in min-h-screen bg-base-200. Both compile without errors.
  </done>
</task>

<task type="auto">
  <name>Task 2: Integrate Layout into App.tsx and clean up page components</name>
  <files>
    frontend/src/App.tsx
    frontend/src/features/will/components/WillDashboard.tsx
    frontend/src/features/additional-documents/components/AdditionalDocumentsDashboard.tsx
  </files>
  <action>
**App.tsx changes:**

1. Import `Layout` from `./components/ui/Layout` and `Navbar` from `./components/ui/Navbar`.
2. Update `LandingPage` to use `<Navbar variant="minimal" />` instead of its inline navbar. Keep the rest of LandingPage (hero content with sign-in/sign-up buttons) unchanged. Keep the outer `<div className="min-h-screen bg-base-200 flex flex-col">` but replace the inline navbar div with `<Navbar variant="minimal" />`.
3. Wrap each authenticated route's content with `<Layout>`. The simplest approach: update `AuthGatedContent` or wrap each route element. Since `AuthGatedContent` handles `SignedOut` vs `SignedIn`, the cleanest approach is:
   - Create a new wrapper component `AuthenticatedLayout` that composes `AuthGatedContent` + `Layout`:
     ```tsx
     function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
       return (
         <AuthGatedContent>
           <Layout>{children}</Layout>
         </AuthGatedContent>
       )
     }
     ```
   - Use `<AuthenticatedLayout>` for routes that need both auth + navbar: `/`, `/documents`, `/documents/:docId/edit`, `/documents/:docId/preview`, `/payment/return`, `/payment/cancel`, `/download/:token`.
   - Keep `/will` route using `<AuthGatedContent>` WITHOUT Layout (WillWizard has its own full-screen layout with step indicator -- adding a navbar would be disruptive). Same pattern: `<AuthGatedContent><WillPage /></AuthGatedContent>`.
   - Keep `/privacy-policy` and `/info-officer` routes as-is (public, no auth, no navbar).
4. Remove the `ThemeToggle` import from App.tsx if it's no longer used directly (LandingPage now uses Navbar which imports ThemeToggle internally). Check: LandingPage uses `<Navbar variant="minimal" />` which handles ThemeToggle, so the direct import can be removed.

**WillDashboard.tsx changes:**

1. Remove the `import { ThemeToggle }` and `import { UserButton }` lines -- no longer needed.
2. Remove ALL inline navbar `<div className="navbar ...">...</div>` blocks. There are THREE instances: one in the loading state (lines ~150-163), one in the error state (lines ~172-181), one in the main render (lines ~196-209).
3. Remove the outer `<div className="min-h-screen bg-base-200">` wrapper from all three render paths -- `Layout` now provides this.
4. The component should now return just the `<main>` content directly. For the loading state, return just the spinner. For the error state, return the alert inside a main tag. For the normal state, return the main tag with the will cards.
5. Keep the `Link` import (still used for "Create Your Will" and "View Documents" buttons).
6. Remove the "Back to Dashboard" link concept -- the navbar now handles navigation.

**AdditionalDocumentsDashboard.tsx changes:**

1. Remove `import { ThemeToggle }` and `import { UserButton }` -- no longer needed.
2. Remove the entire `const navbar = (...)` block (lines ~172-185).
3. Remove all `{navbar}` usages in the three render paths (loading, error, main).
4. Remove the outer `<div className="min-h-screen bg-base-200">` wrappers from all render paths.
5. Remove the "Back to Dashboard" `<Link to="/">` button (line ~216) -- navbar now provides navigation to dashboard.
6. The component should return just the `<main>` content for each state.
  </action>
  <verify>
    - `npx tsc --noEmit` passes
    - `npm run build` succeeds with no errors
    - Start dev server: navbar appears on `/` with "My Wills" highlighted, navigate to `/documents` and "Documents" is highlighted, hamburger menu works on narrow viewport, LandingPage (signed out) shows brand + ThemeToggle only
  </verify>
  <done>
    All authenticated pages render inside Layout with shared Navbar. WillDashboard and AdditionalDocumentsDashboard have zero navbar code. Active link highlighting works. Mobile hamburger menu works. LandingPage uses minimal navbar variant. WillWizard (/will) remains full-screen without navbar. Build passes clean.
  </done>
</task>

</tasks>

<verification>
1. `cd frontend && npx tsc --noEmit` -- zero type errors
2. `cd frontend && npm run build` -- production build succeeds
3. Visual check: navigate between `/` and `/documents`, active link changes
4. Visual check: resize browser to mobile width, hamburger appears, dropdown shows links
5. Visual check: signed-out state shows minimal navbar (brand + theme toggle only)
6. Visual check: `/will` route has NO navbar (WillWizard full-screen)
7. Grep confirm: `WillDashboard.tsx` and `AdditionalDocumentsDashboard.tsx` contain zero `<div className="navbar` instances
</verification>

<success_criteria>
- Shared Navbar component with responsive hamburger menu renders on all authenticated pages
- Active route highlighting works for "/" (exact) and "/documents" (prefix)
- WillDashboard and AdditionalDocumentsDashboard contain no navbar/ThemeToggle/UserButton code
- LandingPage uses minimal navbar variant (brand + ThemeToggle only)
- WillWizard route excluded from Layout (no navbar)
- TypeScript compiles, production build succeeds
</success_criteria>

<output>
After completion, create `.planning/quick/13-add-shared-responsive-navbar-with-naviga/13-SUMMARY.md`
</output>
