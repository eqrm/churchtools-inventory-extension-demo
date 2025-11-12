# Date Validation Requirements

**Status**: Approved  
**References**: CHK059  
**Last Updated**: 2025-01-20

## Overview

This document defines date validation requirements for the advanced inventory system, ensuring consistent timezone handling, sensible date ranges, and proper edge case management.

## 1. Date Validation Rules

### 1.1 Relative Date Filters

**"Last N Days"** (Past Dates):
- **Valid Range**: 0 ≤ N ≤ 730 (2 years)
- **Minimum**: 0 days (today only)
- **Maximum**: 730 days (2 years ago)
- **Exceeds Max**: Cap at 730, show warning

**"Next N Days"** (Future Dates):
- **Valid Range**: 1 ≤ N ≤ 365 (1 year)
- **Minimum**: 1 day (tomorrow onwards)
- **Maximum**: 365 days (1 year from now)
- **Exceeds Max**: Cap at 365, show warning

### 1.2 Absolute Date Filters

**Past Dates**:
- **Minimum**: No limit (allow historical data)
- **Maximum**: Today (current date)
- **Before 1900**: Allow but show info tooltip ("Very old date")

**Future Dates**:
- **Minimum**: Tomorrow (current date + 1 day)
- **Maximum**: 5 years from today
- **After 2100**: Show warning but don't block

## 2. Date Interpretations

### 2.1 "Last 0 Days"

**Interpretation**: Today only (00:00:00 to 23:59:59 in user's local timezone)

**Use Cases**:
- "Assets created today"
- "Maintenance completed today"
- "Work orders due today"

**Implementation**:
```typescript
function getLastNDaysRange(days: number): DateRange {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  
  if (days === 0) {
    // Today only
    return {
      start: startOfToday.toISOString(),
      end: new Date(now).toISOString(),
    };
  }
  
  // Last N days (inclusive of today)
  const start = new Date(startOfToday);
  start.setDate(start.getDate() - days);
  
  return {
    start: start.toISOString(),
    end: new Date(now).toISOString(),
  };
}
```

### 2.2 "Next 1 Day"

**Interpretation**: Tomorrow only (00:00:00 to 23:59:59 tomorrow)

**Use Cases**:
- "Maintenance due tomorrow"
- "Work orders scheduled for tomorrow"

**Implementation**:
```typescript
function getNextNDaysRange(days: number): DateRange {
  if (days < 1) {
    throw new Error('Next N days must be >= 1');
  }
  
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  if (days === 1) {
    // Tomorrow only
    const endOfTomorrow = new Date(tomorrow);
    endOfTomorrow.setHours(23, 59, 59, 999);
    
    return {
      start: tomorrow.toISOString(),
      end: endOfTomorrow.toISOString(),
    };
  }
  
  // Next N days
  const end = new Date(tomorrow);
  end.setDate(end.getDate() + days);
  
  return {
    start: tomorrow.toISOString(),
    end: end.toISOString(),
  };
}
```

### 2.3 Month-End Date Calculations

**Problem**: Adding months to dates near month-end can produce unexpected results.

**Example**:
- January 31 + 1 month = February 28/29 (not March 3)
- March 31 + 1 month = April 30 (not May 1)

**Solution**: Use last day of target month

```typescript
function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const originalDay = result.getDate();
  
  result.setMonth(result.getMonth() + months);
  
  // If day changed (e.g., Jan 31 → Mar 3), set to last day of target month
  if (result.getDate() !== originalDay) {
    result.setDate(0);  // Sets to last day of previous month
  }
  
  return result;
}

// Examples:
// addMonths(new Date('2025-01-31'), 1) → 2025-02-28
// addMonths(new Date('2025-03-31'), 1) → 2025-04-30
// addMonths(new Date('2025-01-15'), 1) → 2025-02-15 (unchanged)
```

## 3. Timezone Handling

### 3.1 Storage Format

**Always store dates in UTC** (ISO 8601 format):
```typescript
// ✅ Correct: ISO 8601 with UTC timezone
"2025-01-20T10:00:00.000Z"

// ❌ Wrong: No timezone indicator
"2025-01-20T10:00:00"

// ❌ Wrong: Local timezone string
"Mon Jan 20 2025 10:00:00 GMT+0100"
```

### 3.2 Display Format

**Always display in user's local timezone**:

```typescript
import { format, formatDistanceToNow } from 'date-fns';
import { useTranslation } from 'react-i18next';

function formatDate(isoString: string): string {
  const { i18n } = useTranslation();
  
  // Parse UTC string
  const date = new Date(isoString);
  
  // Format in user's local timezone
  return format(date, 'PPpp', {
    locale: i18n.language === 'de' ? de : enUS,
  });
}

// Examples (user in Berlin, GMT+1):
// "2025-01-20T10:00:00.000Z" → "Jan 20, 2025, 11:00 AM"
// "2025-01-20T10:00:00.000Z" → "20. Jan. 2025, 11:00" (German)
```

### 3.3 Relative Date Display

```typescript
function formatRelativeDate(isoString: string): string {
  const date = new Date(isoString);
  
  // Show relative time for recent dates
  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
  
  if (diffInHours < 24) {
    return formatDistanceToNow(date, { addSuffix: true });
    // "5 minutes ago", "3 hours ago"
  }
  
  if (diffInHours < 24 * 7) {
    return format(date, 'EEEE p');  // "Monday 3:00 PM"
  }
  
  return format(date, 'PP');  // "Jan 20, 2025"
}
```

### 3.4 Date Input Handling

```typescript
function parseUserInput(input: string | Date): string {
  // User enters date in local timezone
  let date: Date;
  
  if (typeof input === 'string') {
    date = new Date(input);
  } else {
    date = input;
  }
  
  // Validate
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date');
  }
  
  // Convert to UTC for storage
  return date.toISOString();
}

// Example:
// User enters: "2025-01-20 10:00" (local time in Berlin, GMT+1)
// parseUserInput("2025-01-20T10:00") → "2025-01-20T09:00:00.000Z" (UTC)
```

## 4. UI Helpers

### 4.1 Quick Filter Buttons

```tsx
import { Button, Group } from '@mantine/core';

interface QuickDateFiltersProps {
  onSelect: (range: DateRange) => void;
}

function QuickDateFilters({ onSelect }: QuickDateFiltersProps) {
  return (
    <Group spacing="xs">
      <Button 
        variant="default" 
        size="xs"
        onClick={() => onSelect(getLastNDaysRange(0))}
      >
        Today
      </Button>
      
      <Button 
        variant="default" 
        size="xs"
        onClick={() => onSelect(getLastNDaysRange(1))}
      >
        Yesterday
      </Button>
      
      <Button 
        variant="default" 
        size="xs"
        onClick={() => onSelect(getLastNDaysRange(7))}
      >
        Last 7 Days
      </Button>
      
      <Button 
        variant="default" 
        size="xs"
        onClick={() => onSelect(getThisMonthRange())}
      >
        This Month
      </Button>
      
      <Button 
        variant="default" 
        size="xs"
        onClick={() => onSelect(getLastMonthRange())}
      >
        Last Month
      </Button>
      
      <Button 
        variant="default" 
        size="xs"
        onClick={() => onSelect(getThisYearRange())}
      >
        This Year
      </Button>
    </Group>
  );
}
```

### 4.2 Custom Date Range Input

```tsx
import { NumberInput, Select, Text } from '@mantine/core';

function CustomDateRangeInput({ onChange }) {
  const [direction, setDirection] = useState<'last' | 'next'>('last');
  const [days, setDays] = useState(7);
  const [error, setError] = useState('');
  
  function handleChange(newDays: number) {
    setDays(newDays);
    
    // Validate
    if (direction === 'last') {
      if (newDays < 0 || newDays > 730) {
        setError('Must be between 0 and 730');
        return;
      }
    } else {
      if (newDays < 1 || newDays > 365) {
        setError('Must be between 1 and 365');
        return;
      }
    }
    
    setError('');
    
    // Cap if needed
    const cappedDays = direction === 'last' 
      ? Math.min(newDays, 730)
      : Math.min(Math.max(newDays, 1), 365);
    
    if (cappedDays !== newDays) {
      setError(`Capped at ${cappedDays} days`);
      setDays(cappedDays);
    }
    
    // Call onChange
    const range = direction === 'last'
      ? getLastNDaysRange(cappedDays)
      : getNextNDaysRange(cappedDays);
    
    onChange(range);
  }
  
  return (
    <div>
      <Group spacing="xs">
        <Select
          value={direction}
          onChange={setDirection}
          data={[
            { value: 'last', label: 'Last' },
            { value: 'next', label: 'Next' },
          ]}
          style={{ width: 80 }}
        />
        
        <NumberInput
          value={days}
          onChange={handleChange}
          min={direction === 'last' ? 0 : 1}
          max={direction === 'last' ? 730 : 365}
          style={{ width: 100 }}
        />
        
        <Text size="sm">days</Text>
      </Group>
      
      {error && (
        <Text size="xs" color="red" mt="xs">
          {error}
        </Text>
      )}
    </div>
  );
}
```

### 4.3 Date Range Picker

```tsx
import { DateRangePicker } from '@mantine/dates';

function AbsoluteDateRangePicker({ value, onChange }) {
  const maxFutureDate = new Date();
  maxFutureDate.setFullYear(maxFutureDate.getFullYear() + 5);
  
  return (
    <DateRangePicker
      label="Date Range"
      placeholder="Select date range"
      value={value}
      onChange={onChange}
      maxDate={maxFutureDate}
      clearable
    />
  );
}
```

## 5. Validation Rules

### 5.1 Zod Schemas

```typescript
import { z } from 'zod';

// Relative date validation
export const RelativeDateSchema = z.object({
  direction: z.enum(['last', 'next']),
  days: z.number()
    .int('Must be an integer')
    .refine((val, ctx) => {
      if (ctx.parent.direction === 'last') {
        return val >= 0 && val <= 730;
      } else {
        return val >= 1 && val <= 365;
      }
    }, {
      message: 'Last: 0-730 days, Next: 1-365 days',
    }),
});

// Absolute date validation
export const AbsoluteDateSchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime(),
}).refine((data) => {
  const start = new Date(data.start);
  const end = new Date(data.end);
  return start <= end;
}, {
  message: 'Start date must be before end date',
});

// Date range filter (union of relative and absolute)
export const DateRangeFilterSchema = z.union([
  RelativeDateSchema,
  AbsoluteDateSchema,
]);
```

### 5.2 Runtime Validation

```typescript
export function validateDateRange(
  range: { start: string; end: string }
): ValidationResult {
  const errors: string[] = [];
  
  const start = new Date(range.start);
  const end = new Date(range.end);
  
  // Invalid dates
  if (isNaN(start.getTime())) {
    errors.push('Invalid start date');
  }
  if (isNaN(end.getTime())) {
    errors.push('Invalid end date');
  }
  
  // Start after end
  if (start > end) {
    errors.push('Start date must be before end date');
  }
  
  // Very old dates (before 1900)
  const year1900 = new Date('1900-01-01');
  if (start < year1900) {
    errors.push('Start date is very old (before 1900). Is this correct?');
  }
  
  // Very far future (after 2100)
  const year2100 = new Date('2100-01-01');
  if (end > year2100) {
    errors.push('End date is far in the future (after 2100). Is this correct?');
  }
  
  // Range too large (>5 years)
  const diffInYears = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
  if (diffInYears > 5) {
    errors.push('Date range exceeds 5 years. Consider narrowing the range for better performance.');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
```

## 6. Edge Cases

### 6.1 Leap Years

**February 29th handling**:

```typescript
function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

function getLastDayOfMonth(year: number, month: number): number {
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  
  if (month === 1 && isLeapYear(year)) {
    return 29;  // February in leap year
  }
  
  return daysInMonth[month];
}

// Example: Maintenance rule "every 1 month" from Jan 31
// Feb 31 doesn't exist → Use Feb 28/29
const nextDate = addMonths(new Date('2025-01-31'), 1);
// → 2025-02-28 (not leap year)

const nextDate2 = addMonths(new Date('2024-01-31'), 1);
// → 2024-02-29 (leap year)
```

### 6.2 Daylight Saving Time

**DST transitions can cause hour-long gaps or duplicates**:

```typescript
// Problem: Adding 1 day during DST transition
const date = new Date('2025-03-30T12:00:00+01:00');  // Before DST
const nextDay = new Date(date);
nextDay.setDate(nextDay.getDate() + 1);
// → 2025-03-31T12:00:00+02:00 (DST started, +1 hour offset)
// Displayed time still shows 12:00, but underlying UTC changed

// Solution: Use date-fns for consistent date arithmetic
import { addDays } from 'date-fns';

const nextDay = addDays(date, 1);
// Handles DST correctly
```

### 6.3 Midnight Edge Cases

**User selects "today"** - should include items created at 23:59:59:

```typescript
function getTodayRange(): DateRange {
  const now = new Date();
  
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  
  return {
    start: startOfToday.toISOString(),
    end: endOfToday.toISOString(),
  };
}
```

### 6.4 Timezone Conversion Edge Cases

**User crosses timezone boundary**:

```typescript
// User creates asset in New York (EST, UTC-5)
// Asset created at: 2025-01-20T10:00:00-05:00
// Stored as UTC: 2025-01-20T15:00:00.000Z

// User travels to London (GMT, UTC+0)
// Views asset: 2025-01-20T15:00:00.000Z → 15:00 (3 PM London time)
// Correct: UTC is preserved, display adjusts to local timezone
```

## 7. Performance Considerations

### 7.1 Date Range Queries

**Optimize ChurchTools API queries**:

```typescript
// ✅ Good: Single date range query
const assets = await churchtoolsAPI.getCustomDataValues({
  categoryId: ASSET_CATEGORY_ID,
  filter: {
    createdAt: {
      $gte: startDate,
      $lte: endDate,
    },
  },
});

// ❌ Bad: Fetch all, filter in memory
const allAssets = await churchtoolsAPI.getCustomDataValues({
  categoryId: ASSET_CATEGORY_ID,
});
const filtered = allAssets.filter(asset => {
  const createdAt = new Date(asset.createdAt);
  return createdAt >= startDate && createdAt <= endDate;
});
```

### 7.2 Date Parsing Caching

**Cache parsed dates** to avoid repeated parsing:

```typescript
const dateCache = new Map<string, Date>();

function getCachedDate(isoString: string): Date {
  if (!dateCache.has(isoString)) {
    dateCache.set(isoString, new Date(isoString));
  }
  return dateCache.get(isoString)!;
}
```

## 8. Testing Requirements

### 8.1 Date Validation Tests

```typescript
import { describe, test, expect } from 'vitest';

describe('Date Validation', () => {
  test('validates "last 0 days" as today', () => {
    const range = getLastNDaysRange(0);
    const start = new Date(range.start);
    const end = new Date(range.end);
    
    expect(start.getHours()).toBe(0);
    expect(end.getHours()).toBeGreaterThanOrEqual(23);
  });
  
  test('caps "last 1000 days" at 730', () => {
    const result = RelativeDateSchema.safeParse({
      direction: 'last',
      days: 1000,
    });
    
    expect(result.success).toBe(false);
  });
  
  test('rejects "next 0 days"', () => {
    expect(() => getNextNDaysRange(0)).toThrow();
  });
  
  test('handles month-end correctly', () => {
    const jan31 = new Date('2025-01-31');
    const feb = addMonths(jan31, 1);
    
    expect(feb.getMonth()).toBe(1);  // February (0-indexed)
    expect(feb.getDate()).toBe(28);  // Feb 28 (not leap year)
  });
});
```

### 8.2 Timezone Tests

```typescript
test('stores dates in UTC', () => {
  const userInput = '2025-01-20T10:00';  // User's local time
  const stored = parseUserInput(userInput);
  
  expect(stored).toMatch(/Z$/);  // Ends with Z (UTC indicator)
});

test('displays dates in local timezone', () => {
  const utcDate = '2025-01-20T15:00:00.000Z';
  
  // Mock user in Berlin (UTC+1)
  const formatted = formatDate(utcDate);
  
  expect(formatted).toContain('16:00');  // 15:00 UTC + 1 hour = 16:00 local
});
```

## 9. Implementation Checklist

- [ ] Create date utility functions (getLastNDaysRange, getNextNDaysRange, addMonths)
- [ ] Implement quick date filter buttons (Today, Yesterday, Last 7 Days, etc.)
- [ ] Add custom date range input with validation
- [ ] Create Zod schemas for date validation
- [ ] Implement timezone conversion helpers
- [ ] Handle month-end edge cases in date arithmetic
- [ ] Add date validation warnings (very old, far future)
- [ ] Write tests for date calculations and timezone handling
- [ ] Document date handling patterns in developer guide

## References

- CHK059: Relative date requirements
- date-fns: https://date-fns.org/
- @mantine/dates: https://mantine.dev/dates/getting-started/
- comprehensive-requirements.md
