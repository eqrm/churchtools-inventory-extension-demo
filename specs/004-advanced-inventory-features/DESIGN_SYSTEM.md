# Design System Requirements

**Status**: Approved  
**References**: CHK017, CHK020, CHK097  
**Last Updated**: 2025-01-20

## Overview

This document defines the design system requirements for the advanced inventory features, building on Mantine v7 UI framework to ensure visual consistency, accessibility, and maintainable component styling.

## 1. Spacing Scale

### 1.1 Mantine Spacing Units

All spacing must use Mantine's spacing scale (`theme.spacing`):

```typescript
xs: 10px  // Tight spacing (form field gaps, inline elements)
sm: 12px  // Standard spacing (list item padding, button groups)
md: 16px  // Default spacing (card padding, section gaps)
lg: 20px  // Comfortable spacing (page sections, modal padding)
xl: 32px  // Generous spacing (page margins, major sections)
```

### 1.2 Component Spacing Guidelines

- **Forms**: Use `sm` (12px) between related fields, `md` (16px) between field groups
- **Cards**: Use `md` (16px) for internal padding, `lg` (20px) between cards
- **Lists**: Use `xs` (10px) for item internal padding, `sm` (12px) between items
- **Modals**: Use `lg` (20px) for content padding, `xl` (32px) for page-level spacing
- **Buttons**: Use `sm` (12px) between buttons in groups, `md` (16px) for standalone buttons

## 2. Color Semantics

### 2.1 Functional Colors

Use Mantine's color system with semantic meaning:

```typescript
// Status Colors
blue:    Information, neutral states (Available assets)
green:   Success, positive states (Completed work orders)
yellow:  Warning, attention needed (Maintenance due)
red:     Error, critical states (Broken assets, Overdue)
gray:    Disabled, inactive (Archived items)
teal:    In-progress, active work (InRepair, InProgress)
violet:  Special states (OfferPending)

// Theme Colors
primary:   Brand color for primary actions (default: blue)
secondary: Supporting actions (default: gray)
```

### 2.2 Status Indicators

**Asset Status Colors**:
- Available: `blue.6` (information)
- InUse: `teal.6` (in-progress)
- Broken: `red.6` (error)
- InRepair: `yellow.6` (warning)
- Retired: `gray.6` (disabled)

**WorkOrder Status Colors**:
- Draft: `gray.5` (neutral)
- OfferPending: `violet.6` (special)
- InProgress: `teal.6` (active)
- Completed: `green.6` (success)
- Cancelled: `gray.6` (disabled)

### 2.3 Accessibility Requirements

All color combinations must meet **WCAG 2.1 Level AA**:
- Text color contrast: **4.5:1** minimum against background
- UI component contrast: **3:1** minimum against adjacent colors
- Never rely on color alone to convey information (use icons + labels)

## 3. Icon System

### 3.1 Icon Sizing

Use consistent icon sizes across the application:

```typescript
xs: 12px  // Inline text icons, badges
sm: 16px  // Button icons, form field icons
md: 20px  // List item icons, navigation
lg: 24px  // Page headers, prominent actions
xl: 32px  // Empty states, splash screens
```

### 3.2 Icon Library

**Primary Library**: Tabler Icons (Mantine default)

**Icon Usage Guidelines**:
- **Navigation**: Use filled variants for active states, outlined for inactive
- **Actions**: Use outlined icons for buttons, filled for completed states
- **Status**: Match icon style to status color (e.g., `IconAlertCircle` for warnings)
- **Consistency**: Use same icon for same concept across all contexts

### 3.3 Common Icon Mappings

```typescript
// Entity Icons
Asset:         IconBox, IconCube
Kit:           IconBoxMultiple
Model:         IconTemplate
WorkOrder:     IconTool, IconWrench
Assignment:    IconUser, IconUsers
Maintenance:   IconCalendarEvent
Damage:        IconAlertTriangle

// Action Icons
Create:        IconPlus
Edit:          IconPencil
Delete:        IconTrash
Save:          IconDeviceFloppy
Cancel:        IconX
Search:        IconSearch
Filter:        IconFilter
Sort:          IconArrowsSort
Download:      IconDownload
Upload:        IconUpload
```

## 4. Typography

### 4.1 Font Scale

Use Mantine's typography components:

```typescript
<Title order={1}>  // Page titles (32px, bold)
<Title order={2}>  // Section headers (24px, bold)
<Title order={3}>  // Subsection headers (20px, semibold)
<Title order={4}>  // Card titles (18px, semibold)
<Text size="lg">   // Emphasized text (18px, regular)
<Text size="md">   // Body text (16px, regular) - DEFAULT
<Text size="sm">   // Secondary text (14px, regular)
<Text size="xs">   // Captions, metadata (12px, regular)
```

### 4.2 Font Weights

```typescript
normal:  400  // Body text, descriptions
medium:  500  // Labels, emphasized text
semibold: 600 // Headings, important UI elements
bold:    700  // Page titles, critical alerts
```

### 4.3 Line Heights

- Body text: `1.5` (optimal readability)
- Headings: `1.2` (tighter, more impactful)
- Dense lists: `1.4` (balance between compact and readable)

## 5. Component Sizing

### 5.1 Standard Component Sizes

**Buttons**:
```typescript
xs: 30px height  // Inline actions, compact toolbars
sm: 36px height  // Secondary actions, form buttons
md: 42px height  // Primary actions - DEFAULT
lg: 50px height  // Hero actions, prominent CTAs
xl: 60px height  // Full-width actions, modals
```

**Inputs**:
```typescript
xs: 30px height  // Compact forms, filters
sm: 36px height  // Secondary inputs
md: 42px height  // Standard forms - DEFAULT
lg: 50px height  // Emphasized inputs
xl: 60px height  // Large forms, search bars
```

**Badges/Tags**:
```typescript
xs: 18px height  // Inline text badges
sm: 22px height  // List item badges
md: 26px height  // Card badges - DEFAULT
lg: 32px height  // Prominent tags
xl: 40px height  // Hero badges
```

### 5.2 Responsive Sizing

- **Mobile** (<768px): Prefer `md` (42px) for all touch targets (min 44x44px)
- **Tablet** (768-1024px): Use `md` for primary, `sm` for secondary actions
- **Desktop** (>1024px): Mix `sm`/`md`/`lg` based on hierarchy

## 6. Component Patterns

### 6.1 Card Structure

```tsx
<Card padding="md" radius="sm" withBorder>
  <Card.Section>
    <Title order={4}>Card Title</Title>
  </Card.Section>
  
  <Stack spacing="sm">
    {/* Card content with consistent spacing */}
  </Stack>
  
  <Card.Section>
    <Group spacing="sm">
      {/* Actions */}
    </Group>
  </Card.Section>
</Card>
```

### 6.2 Form Layout

```tsx
<Stack spacing="md">
  <TextInput label="Field Label" size="md" />
  <TextInput label="Field Label" size="md" />
  
  <Group spacing="sm" position="right">
    <Button variant="default">Cancel</Button>
    <Button type="submit">Save</Button>
  </Group>
</Stack>
```

### 6.3 List Item Structure

```tsx
<Group spacing="sm" position="apart">
  <Group spacing="sm">
    <ThemeIcon size="md" color="blue">
      <IconBox size={16} />
    </ThemeIcon>
    <div>
      <Text size="sm" weight={500}>Item Title</Text>
      <Text size="xs" color="dimmed">Metadata</Text>
    </div>
  </Group>
  
  <Badge size="sm" color="blue">Status</Badge>
</Group>
```

## 7. Visual Weight Guidelines

### 7.1 Hierarchy Definition

**Visual weight** refers to how much attention a UI element commands:

1. **Heavy Weight**: Primary CTAs, critical alerts
   - Large size (`lg`/`xl`)
   - Bold text (`600`/`700`)
   - Filled backgrounds (primary color)
   - High contrast

2. **Medium Weight**: Secondary actions, section headers
   - Standard size (`md`)
   - Semibold text (`500`/`600`)
   - Outlined or subtle backgrounds
   - Moderate contrast

3. **Light Weight**: Tertiary actions, metadata
   - Small size (`sm`/`xs`)
   - Regular text (`400`)
   - Minimal backgrounds
   - Low contrast (gray tones)

### 7.2 Balanced Layouts

**Form Layouts**:
- Labels: Medium weight (`Text size="sm" weight={500}`)
- Input fields: Medium weight (standard borders)
- Helper text: Light weight (`Text size="xs" color="dimmed"`)
- Submit button: Heavy weight (`Button size="md" variant="filled"`)
- Cancel button: Light weight (`Button size="md" variant="subtle"`)

**Card Layouts**:
- Card title: Medium-heavy weight (`Title order={4}`)
- Body text: Light-medium weight (`Text size="md"`)
- Status badge: Medium weight (`Badge size="sm"`)
- Action buttons: Light weight (icons only, subtle variant)

**Data Tables**:
- Column headers: Medium weight (`Text size="sm" weight={600}`)
- Cell data: Light weight (`Text size="sm"`)
- Row actions: Light weight (icon buttons, on-hover visibility)

## 8. Implementation Guidelines

### 8.1 Mantine Theme Configuration

```typescript
// theme.ts
import { MantineThemeOverride } from '@mantine/core';

export const theme: MantineThemeOverride = {
  spacing: {
    xs: '10px',
    sm: '12px',
    md: '16px',
    lg: '20px',
    xl: '32px',
  },
  
  fontSizes: {
    xs: '12px',
    sm: '14px',
    md: '16px',
    lg: '18px',
    xl: '20px',
  },
  
  radius: {
    xs: '2px',
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
  },
  
  colors: {
    // Use Mantine's default colors
    // Extend only if brand colors needed
  },
  
  primaryColor: 'blue', // ChurchTools brand alignment
  
  components: {
    Button: {
      defaultProps: {
        size: 'md',
      },
    },
    TextInput: {
      defaultProps: {
        size: 'md',
      },
    },
    Card: {
      defaultProps: {
        padding: 'md',
        radius: 'sm',
        withBorder: true,
      },
    },
  },
};
```

### 8.2 ESLint Rules

Enforce design system usage:

```json
{
  "rules": {
    "no-restricted-syntax": [
      "error",
      {
        "selector": "Literal[value=/^\\d+px$/]",
        "message": "Use Mantine spacing units (theme.spacing) instead of hardcoded pixel values"
      }
    ]
  }
}
```

### 8.3 Component Documentation

All custom components must document:
- Which Mantine components they use
- Spacing/sizing rationale
- Color semantic meaning
- Accessibility considerations

## 9. Testing Requirements

### 9.1 Visual Regression Tests

- Snapshot tests for all custom components
- Theme switching tests (light/dark mode support)
- Responsive breakpoint tests

### 9.2 Accessibility Tests

- Color contrast validation (jest-axe)
- Keyboard navigation tests
- Screen reader label verification

## 10. Migration Strategy

### 10.1 Phase 1: Foundation (Week 1)
- Configure Mantine theme with approved spacing/colors
- Set up ESLint rules for design system enforcement
- Document component patterns in Storybook

### 10.2 Phase 2: Core Components (Week 2-3)
- Implement asset list with approved patterns
- Implement work order cards with approved patterns
- Implement form layouts with approved patterns

### 10.3 Phase 3: Validation (Week 4)
- Run accessibility audits (Lighthouse, jest-axe)
- Conduct visual QA review
- Document any approved exceptions

## References

- [Mantine v7 Documentation](https://mantine.dev/)
- [Tabler Icons](https://tabler-icons.io/)
- [WCAG 2.1 Level AA Guidelines](https://www.w3.org/WAI/WCAG21/quickref/?currentsidebar=%23col_customize&levels=aa)
- ACCESSIBILITY_REQUIREMENTS.md
- comprehensive-requirements.md (CHK017, CHK020, CHK097)
