---
phase: quick
plan: 007
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/index.css
autonomous: true

must_haves:
  truths:
    - "Chat bubbles display with background-color, border-radius, padding, and width:fit-content"
    - "AI messages render as chat-start with primary bubble styling"
    - "User messages render as chat-end with secondary bubble styling"
  artifacts:
    - path: "frontend/src/index.css"
      provides: "DaisyUI chat class source hint for Tailwind CSS v4 tree-shaker"
      contains: "@source inline"
  key_links:
    - from: "frontend/src/index.css"
      to: "node_modules/daisyui/components/chat/object.js"
      via: "@source inline directive forces Tailwind to include standalone .chat-bubble base class"
      pattern: "@source inline.*chat-bubble"
---

<objective>
Fix DaisyUI chat component styling not loading in Tailwind CSS v4 build.

Purpose: The standalone `.chat-bubble` base class (background-color, border-radius, padding, width:fit-content) is being tree-shaken by Tailwind CSS v4 because the content scanner only finds `.chat-bubble` nested inside `.chat-start`/`.chat-end` selectors but misses the standalone base class. Adding a `@source inline(...)` directive forces inclusion.

Output: Chat bubbles in ChatMessage.tsx render with proper DaisyUI styling.
</objective>

<execution_context>
@/home/laudes/.claude/get-shit-done/workflows/execute-plan.md
@/home/laudes/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@frontend/src/index.css
@frontend/src/features/will/components/ChatMessage.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add @source inline directive for DaisyUI chat classes</name>
  <files>frontend/src/index.css</files>
  <action>
Add a `@source inline(...)` directive to `frontend/src/index.css` after the `@plugin "daisyui"` block.

The directive must include all DaisyUI chat component classes used in the project:
```
@source inline("chat chat-start chat-end chat-bubble chat-bubble-secondary chat-image chat-header chat-footer");
```

This tells Tailwind CSS v4's content scanner to treat these class names as "used" so it includes the corresponding DaisyUI component CSS (including the standalone `.chat-bubble` base class that was being dropped).

The final file should be:
```css
@import "tailwindcss";
@plugin "daisyui" {
  themes: nord --default, business --prefersdark;
}
@source inline("chat chat-start chat-end chat-bubble chat-bubble-secondary chat-image chat-header chat-footer");
```

Do NOT add any custom CSS rules -- only the @source inline directive.
  </action>
  <verify>
1. Run `npx @tailwindcss/cli -i src/index.css -o /tmp/test-output.css --cwd /opt/lampp/htdocs/wdi/frontend` and confirm the output contains standalone `.chat-bubble` with `background-color`, `border-radius`, `padding`, and `width: fit-content` properties (not just nested inside `.chat-start`/`.chat-end`).
2. Run `npm run build` from frontend directory to confirm Vite build succeeds with no errors.
  </verify>
  <done>
DaisyUI chat bubble styling loads correctly: standalone .chat-bubble base class present in built CSS with background-color, border-radius, padding, and width:fit-content. Vite build passes.
  </done>
</task>

</tasks>

<verification>
- Built CSS output includes standalone `.chat-bubble` class with full styling properties
- `npm run build` completes without errors
- ChatMessage.tsx chat bubbles will render with visible background, rounded corners, and padding
</verification>

<success_criteria>
1. `frontend/src/index.css` contains `@source inline(...)` with chat component classes
2. Tailwind CSS v4 build output includes the standalone `.chat-bubble` base class
3. Vite production build succeeds
</success_criteria>

<output>
After completion, create `.planning/quick/007-fix-daisyui-chat-styling/007-SUMMARY.md`
</output>
