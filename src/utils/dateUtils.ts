export type RelativeDateUnit = 'days' | 'weeks' | 'months';
export type RelativeDateDirection = 'past' | 'future';

export interface RelativeDateRangeInput {
  unit: RelativeDateUnit;
  amount: number;
  direction: RelativeDateDirection;
  referenceDate?: Date;
}

export interface DateRange {
  start: Date;
  end: Date;
}

const startOfDay = (date: Date): Date => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

const endOfDay = (date: Date): Date => {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
};

const addRelative = (date: Date, unit: RelativeDateUnit, amount: number): Date => {
  const result = new Date(date);

  switch (unit) {
    case 'days':
      result.setDate(result.getDate() + amount);
      break;
    case 'weeks':
      result.setDate(result.getDate() + amount * 7);
      break;
    case 'months':
      result.setMonth(result.getMonth() + amount);
      break;
    default: {
      const exhaustiveCheck: never = unit;
      throw new Error(`Unsupported unit: ${exhaustiveCheck}`);
    }
  }

  return result;
};

export const resolveRelativeDateRange = ({
  unit,
  amount,
  direction,
  referenceDate = new Date(),
}: RelativeDateRangeInput): DateRange => {
  const sanitizedAmount = Math.max(0, amount);
  const normalizedReference = startOfDay(referenceDate);

  if (direction === 'past') {
    const start = startOfDay(addRelative(normalizedReference, unit, -sanitizedAmount));
    const end = endOfDay(referenceDate);
    return { start, end };
  }

  const start = startOfDay(referenceDate);
  const end = endOfDay(addRelative(normalizedReference, unit, sanitizedAmount));

  return { start, end };
};

export const toISODate = (date: Date): string => {
  const tzOffset = date.getTimezoneOffset();
  const adjusted = new Date(date.getTime() - tzOffset * 60 * 1000);
  return adjusted.toISOString().slice(0, 10);
};

export const resolveRelativeDateRangeISO = (input: RelativeDateRangeInput): { start: string; end: string } => {
  const range = resolveRelativeDateRange(input);
  return {
    start: toISODate(range.start),
    end: toISODate(range.end),
  };
};
