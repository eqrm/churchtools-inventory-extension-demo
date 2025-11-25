# Accessibility Requirements: Advanced Inventory Features

**Feature Branch**: `004-advanced-inventory-features`  
**Created**: 2025-11-12  
**Status**: Approved  
**Compliance Target**: WCAG 2.1 Level AA

## Overview

This document defines accessibility requirements to ensure the inventory management extension is usable by people with disabilities, including those using screen readers, keyboard-only navigation, or requiring high contrast/visual accommodations.

---

## 1. Keyboard Navigation (WCAG 2.1.1, 2.1.2, 2.4.7)

### Requirements

**KBD-001**: All interactive elements (buttons, links, form inputs, dropdowns) must be keyboard accessible using standard keys:
- `Tab` / `Shift+Tab` - Navigate between focusable elements
- `Enter` / `Space` - Activate buttons and links
- `Escape` - Close modals, dropdowns, and cancel operations
- `Arrow keys` - Navigate within component groups (radio buttons, tabs, lists)

**KBD-002**: Focus order must follow logical reading order (left-to-right, top-to-bottom in LTR languages)

**KBD-003**: Keyboard focus must be visible with a clear focus indicator:
- Minimum 2px outline or border
- Color contrast ratio ≥3:1 against background
- Must not be hidden by `outline: none` without alternative indicator

**KBD-004**: Keyboard traps must be avoided:
- Users can navigate into and out of all components using keyboard alone
- Modal dialogs must trap focus within the modal but allow `Escape` to close

**KBD-005**: Skip links must be provided on complex pages:
- "Skip to main content" link at page top (visible on focus)
- "Skip to asset list" or similar for data-heavy views

### Test Scenarios

- [ ] Navigate entire asset creation form using only `Tab` and `Enter`
- [ ] Open and close damage report modal using `Escape` key
- [ ] Navigate kanban board columns using arrow keys
- [ ] Verify focus indicator visible on all interactive elements
- [ ] Test tab order matches visual layout in all views (table, gallery, kanban)

---

## 2. Screen Reader Support (WCAG 1.3.1, 2.4.6, 4.1.2)

### Requirements

**SR-001**: All form inputs must have associated labels:
- Use explicit `<label>` elements with `for` attribute, or
- Use `aria-label` or `aria-labelledby` for custom components
- Labels must describe the purpose clearly (e.g., "Asset Name" not just "Name")

**SR-002**: All images must have descriptive alt text:
- Asset photos: `alt="[Asset Name] photo [X of Y]"`
- Damage report photos: `alt="Damage photo taken on [date]"`
- Icons: Use `aria-label` or `aria-hidden="true"` if decorative

**SR-003**: Dynamic content updates must be announced:
- Use ARIA live regions (`aria-live="polite"` or `assertive`) for:
  - Success/error toast notifications
  - Filter result counts ("Showing 23 assets")
  - Status changes ("Asset marked as broken")
  - Loading state changes

**SR-004**: Interactive components must use semantic HTML or ARIA roles:
- Buttons: `<button>` or `role="button"`
- Links: `<a href>` with valid href
- Tabs: `role="tablist"`, `role="tab"`, `role="tabpanel"`
- Modals: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`

**SR-005**: Form validation errors must be associated with inputs:
- Use `aria-describedby` to link error messages to inputs
- Error messages must be programmatically determinable
- Use `aria-invalid="true"` on invalid fields

**SR-006**: Status information must be communicated:
- Asset status badges: Include `aria-label="Status: Available"` or use `<span>` with visible text
- Progress indicators: Use `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`

### Test Scenarios

- [ ] Navigate asset list with NVDA/JAWS and verify all elements announced correctly
- [ ] Create damage report with screen reader and verify form labels/errors
- [ ] Test toast notifications announced without visual focus
- [ ] Verify inherited tags announce source (e.g., "Production Equipment, inherited from Kit: Camera Setup")
- [ ] Test modal dialogs announce title and close instructions

---

## 3. Color Contrast & Visual Design (WCAG 1.4.3, 1.4.11)

### Requirements

**VIS-001**: Text color contrast ratios must meet WCAG AA standards:
- Normal text (14-18px): ≥4.5:1 contrast ratio
- Large text (≥18px or ≥14px bold): ≥3:1 contrast ratio
- UI components (borders, icons, focus indicators): ≥3:1 contrast ratio

**VIS-002**: Color must not be the only means of conveying information:
- Asset status badges: Use icon + text + color (e.g., ✓ Available, ⚠ Broken)
- Required form fields: Use `*` or "(required)" in addition to red color
- Validation errors: Use icon + red color for error state
- Tag categories: Use icon or pattern in addition to color

**VIS-003**: High contrast mode compatibility:
- All components must remain visible and functional in Windows High Contrast Mode
- Custom backgrounds must not hide text
- Focus indicators must remain visible

**VIS-004**: Text resizing must not break layout:
- Layout must remain usable at 200% zoom
- Text must not overlap or get cut off
- Horizontal scrolling acceptable, but vertical content must remain accessible

### Test Scenarios

- [ ] Verify all text meets 4.5:1 contrast using browser DevTools or WebAIM Contrast Checker
- [ ] Test status indicators with color blindness simulators (Deuteranopia, Protanopia, Tritanopia)
- [ ] Enable Windows High Contrast Mode and verify all components visible
- [ ] Zoom browser to 200% and verify forms remain usable
- [ ] Test with grayscale filter to ensure color is not sole differentiator

---

## 4. Complex Component Accessibility

### Data Views (Table, Gallery, Kanban, Calendar)

**COMP-001**: **Table View** (WCAG 1.3.1)
- Use semantic `<table>`, `<thead>`, `<tbody>`, `<th>`, `<td>` elements
- Column headers: `<th scope="col">`
- Row headers (if applicable): `<th scope="row">`
- Sortable columns: Include `aria-sort="ascending|descending|none"` on headers
- Row selection: Use `aria-selected="true"` on selected rows

**COMP-002**: **Gallery View** (WCAG 2.4.4)
- Each card must be a focusable link or button
- Card titles must be clear and descriptive
- Card images must have alt text
- Use `aria-label` for interactive elements (e.g., "View details for [Asset Name]")

**COMP-003**: **Kanban View** (WCAG 2.1.1, 4.1.2)
- Use `@dnd-kit/core` v6 with keyboard sensor support
- Columns: `role="region"` with `aria-label="[Status] column"`
- Cards: Draggable with keyboard using `@dnd-kit` keyboard sensor (`Space` to pick up/drop, arrows to move)
- Provide alternative: Context menu or dropdown to change status for users preferring non-drag interaction
- Announce moves: "Asset moved from Available to In Use" via `aria-live="assertive"`
- Screen reader instructions: Include `aria-describedby` with drag instructions on first card

**COMP-004**: **Calendar View** (WCAG 2.1.1, 4.1.3)
- Use `react-day-picker` v8 or v9 (WCAG 2.1 Level AA compliant)
- Keyboard navigation: Arrow keys to navigate dates, Enter to select, Escape to close
- Screen reader: Announce selected date and maintenance events on that date
- Support manual date entry via text input as alternative to visual picker
- Configure `react-day-picker` with proper ARIA labels and caption formatting

### Modals & Dialogs

**COMP-005**: **Modal Dialogs** (WCAG 2.4.3)
- Use `role="dialog"` and `aria-modal="true"`
- Set `aria-labelledby` to modal title
- Focus management: 
  - Auto-focus first interactive element or close button on open
  - Trap focus within modal (Tab cycles through modal elements only)
  - Return focus to trigger element on close
- Keyboard: `Escape` key closes modal

### Forms & Input Components

**COMP-006**: **Autocomplete/Search** (WCAG 4.1.2)
- Use `role="combobox"` with `aria-expanded`, `aria-autocomplete="list"`
- Results list: `role="listbox"` with `role="option"` items
- Announce result count: "5 results available"
- Keyboard: Arrow keys to navigate, Enter to select, Escape to close

**COMP-007**: **Multi-Select/Tags** (WCAG 2.4.6)
- Selected tags must be focusable and removable via keyboard
- Each tag: Include visible label + remove button with `aria-label="Remove [tag name]"`
- Announce additions/removals via `aria-live="polite"`

**COMP-008**: **Photo Galleries** (WCAG 2.1.1)
- Use simple next/previous buttons instead of carousel keyboard navigation
- Buttons: `aria-label="Next photo"` and `aria-label="Previous photo"`
- Current photo indicator: `aria-label="Photo 2 of 3"`
- Image alt text: Damage report photo descriptions
- Keyboard: Tab to buttons, Enter to activate

---

## 5. Mobile & Touch Accessibility (WCAG 2.5.5)

### Requirements

**TOUCH-001**: Touch targets should be at least 44x44 CSS pixels (WCAG 2.5.5 Level AAA - aspirational goal)
- Buttons, links, and interactive elements
- Exception: Inline text links can be smaller if adequate spacing
- Note: Level AA does not mandate specific sizes; this is a best practice recommendation

**TOUCH-002**: Gestures must have alternatives:
- Drag-and-drop must have button-based alternative (e.g., "Move to..." dropdown in kanban)
- Swipe actions must have visible button alternatives
- Pinch-to-zoom must not be disabled

---

## Implementation Guidelines

### Mantine UI Component Usage

Mantine v7 provides good accessibility defaults. Follow these practices:

1. **Use Mantine components as intended**: 
   - `<Button>`, `<TextInput>`, `<Select>`, `<Modal>` have built-in ARIA attributes
   - Don't override ARIA attributes unless necessary

2. **Custom components must match Mantine patterns**:
   - Inherit `className` and `aria-*` props
   - Use Mantine hooks like `useFocusTrap` for modals

3. **Test with Mantine's accessibility tools**:
   - Use `@mantine/hooks` `useId` for unique IDs
   - Leverage `@mantine/core` `VisuallyHidden` for screen-reader-only text

### Testing Tools

**Automated Testing** (Required in CI/CD):
- **ESLint**: `eslint-plugin-jsx-a11y` (already in project) - run on every commit
- **Axe Core**: `@axe-core/react` or `jest-axe` - automated tests run on every PR
  - Install: `npm install --save-dev @axe-core/react jest-axe`
  - Target: Zero violations in unit tests
- **Lighthouse CI**: Accessibility audit in GitHub Actions
  - Target score: ≥90 for all pages
  - Run on every PR to main branch

**Manual Testing** (Weekly or per feature):
- Keyboard-only navigation (unplug mouse)
- Screen readers: NVDA (Windows), JAWS (Windows), VoiceOver (macOS)
- Browser zoom: 200% scaling
- Windows High Contrast Mode
- Color blindness simulators: Chrome DevTools, Colorblind Web Page Filter

**Testing Workflow**:
1. Developer writes component → runs ESLint (auto)
2. Developer adds `jest-axe` test to component test file
3. PR opened → GitHub Actions runs Lighthouse accessibility audit
4. PR requires: ESLint passing, jest-axe passing, Lighthouse ≥90
5. Feature complete → manual screen reader testing before release

### Continuous Compliance

- **PR Checklist**: Include accessibility review item ("Keyboard navigation tested, Axe tests passing")
- **CI/CD Gates**: ESLint jsx-a11y + jest-axe + Lighthouse ≥90 must pass before merge
- **Storybook**: Document keyboard interactions and ARIA usage for components
- **User Testing**: Include users with disabilities in UAT (if possible)

---

## Acceptance Criteria Summary

**Must-Have (Blockers for Release)**:
- [x] KBD-001 to KBD-005: Full keyboard navigation support
- [x] SR-001, SR-002, SR-004, SR-005: Form labels, image alt text, semantic HTML, validation errors
- [x] VIS-001, VIS-002: Color contrast ≥4.5:1, color not sole indicator
- [x] COMP-005: Modal focus management and keyboard close
- [x] ESLint `jsx-a11y` rules passing with no warnings
- [x] `jest-axe` automated tests passing on all components
- [x] Lighthouse accessibility score ≥90

**Should-Have (High Priority)**:
- [x] SR-003, SR-006: ARIA live regions for dynamic updates and status info
- [x] VIS-003, VIS-004: High contrast mode support, 200% zoom usability
- [x] COMP-001 to COMP-004: Semantic table markup, accessible data views
- [ ] TOUCH-001: 44x44px touch targets (aspirational - Level AAA)

**Nice-to-Have (Future Enhancements)**:
- [ ] User testing with assistive technology users
- [ ] Accessibility regression testing dashboard

---

## Implementation Decisions (Approved)

✅ **Kanban Drag-and-Drop**: Use `@dnd-kit/core` v6 with keyboard sensor support  
✅ **Calendar Component**: Use `react-day-picker` v8/v9 (WCAG 2.1 AA compliant)  
✅ **Photo Galleries**: Simple next/previous buttons (not carousel arrows)  
✅ **Compliance Target**: WCAG 2.1 Level AA  
✅ **Testing Frequency**: Automated Axe tests on every PR via CI/CD

---

## Dependencies to Install

Add to `package.json`:

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
npm install react-day-picker
npm install --save-dev @axe-core/react jest-axe
```

**Versions**:
- `@dnd-kit/core`: ^6.0.0
- `react-day-picker`: ^9.0.0 (or latest v8 stable)
- `@axe-core/react`: ^4.8.0
- `jest-axe`: ^8.0.0

---

## Open Questions for Review

~~1. **Kanban drag-and-drop**: Should we use a library like `@dnd-kit` (has a11y support) or provide dropdown-only status changes?~~  
**RESOLVED**: Use `@dnd-kit/core` v6

~~2. **Calendar component**: Should we build custom with full a11y or use third-party like `react-day-picker` v8 (WCAG compliant)?~~  
**RESOLVED**: Use `react-day-picker` v8/v9

~~3. **Photo gallery**: Should damage report photo galleries have carousel keyboard nav (left/right arrows) or simple next/prev buttons?~~  
**RESOLVED**: Simple next/prev buttons

~~4. **Target score**: Should we aim for WCAG 2.1 Level AA (standard) or Level AAA (stricter, includes 44px touch targets)?~~  
**RESOLVED**: WCAG 2.1 Level AA (44px targets aspirational)

~~5. **Testing frequency**: Should accessibility audits run on every PR (automated Axe tests) or weekly manual reviews?~~  
**RESOLVED**: Automated tests every PR + manual testing per feature

