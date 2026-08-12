---
name: frontend-conventions
description: Angular 21 + PrimeNG + Tailwind conventions for apps/web — components, forms, validation, responsiveness. Load before implementing/reviewing any apps/web change in GATHERLY.
---

# Frontend conventions (apps/web)

## Stack
Angular 21, standalone components, `OnPush`, signals, `@if`/`@for`, `inject()`. PrimeNG for every interactive element (`p-button`, `p-inputtext`, `p-select`, `p-dialog`, `p-table`, `p-toast`, `p-confirmDialog`) — never a hand-styled native `<button>`/`<input>`/`<select>`. Tailwind for layout only (`flex`, `grid`, `gap-*`, `p-*`/`m-*`, breakpoints) — never a custom `.css`/`.scss` file for spacing. `tailwind.config` tokens reference the PrimeNG theme vars, one system not two. `npm start -w web`; `ng test`.

## Reuse before creating
New interface → check `core/models/models.ts` first. New component → check `shared/ui/` and `features/*` first. Extend, don't duplicate.

## Layout
`core/models`, `core/services/api.service.ts`, `core/auth|guards|interceptors`, `features/<area>/` (+ `.spec.ts`), `layout/`, `shared/ui/`.

## Feedback & destructive actions
Failed API calls → interceptor → `MessageService`/`p-toast`, not per-component catch blocks. Delete/remove → `ConfirmationService`/`p-confirmDialog` first.

## Forms & layout
Every form uses Bootstrap's grid for field arrangement — `bootstrap-grid.min.css` is registered in `angular.json`:
- Wrap all fields in `<div class="row g-3">` and each field in `<div class="col">` (grows) or `<div class="col-auto">` (fixed)
- Submit button lives in its own `<div class="col-auto">` at the row end, or in a separate `<div class="row">` right-aligned for multi-row forms

`ReactiveFormsModule` for multi-field create/edit forms; `[(ngModel)]` for simple inline rows. Rules mirror the backend Zod schema field-for-field.

**Validation errors** — per-field, only after first touch or submit attempt:
```html
<form #myForm="ngForm" (ngSubmit)="submit()">
  <div class="row g-3">
    <div class="col">
      <label style="font-size:0.8rem;font-weight:700;display:grid;gap:0.35rem">
        Field label
        <input name="field" [(ngModel)]="value" required #f="ngModel"
          [class.is-invalid]="f.invalid && (f.touched || myForm.submitted)" />
        @if (f.invalid && (f.touched || myForm.submitted)) {
          <div class="invalid-feedback">Field is required.</div>
        }
      </label>
    </div>
    <div class="col-auto">
      <button class="btn small primary" type="submit">Save</button>
    </div>
  </div>
</form>
```
For numeric fields use `[min]="1"` (Angular validator) alongside `type="number" min="1"` (HTML5 constraint).
Client-side validation is UX only — still handle the API's 4xx response.

## "Looks right + responsive" bar
`max-w-*`/`p-4` container, never edge-to-edge. `flex flex-col gap-4` forms/cards, `gap-1` label→input→error. Action row `flex justify-end gap-2`, stacks full-width below `sm`. No fixed pixel widths — breakpoints only; tables scroll or collapse to cards under `sm`. Real loading/empty/error/success states, never blank. Touch targets ≥44×44px. Icon-only buttons get `aria-label`; every input a real `label`/`inputId` pair; never suppress focus outlines.

## Types
`interface` in `core/models/models.ts`, mirrored from the API's `types.ts`.

## Before done
Sanity-check in dev server if UI-visible (spacing, states, mobile breakpoint, focus) — this is a first pass, `reviewer`/`tester` still verify.