import type {
  DataViewDefinition,
  FilterCondition,
  GroupConfig,
  RelativeDateRange,
  SortConfig,
} from '../types/dataView';

export interface DataViewServiceOptions {
  now?: () => Date;
  collator?: Intl.Collator;
}

export type CreateDataViewInput = Omit<DataViewDefinition, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateDataViewInput = Partial<Omit<DataViewDefinition, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>>;

const DEFAULT_EMPTY_GROUP_LABEL = 'Ungrouped';

function generateId(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return cryptoApi.randomUUID();
  }

  const randomSegment = Math.random().toString(36).slice(2, 10);
  return `data-view-${randomSegment}-${Date.now()}`;
}

export class DataViewService {
  private readonly now: () => Date;
  private readonly collator: Intl.Collator;
  private readonly inMemoryViews = new Map<string, DataViewDefinition>();

  constructor(options: DataViewServiceOptions = {}) {
    this.now = options.now ?? (() => new Date());
    this.collator = options.collator ?? new Intl.Collator(undefined, { numeric: true, sensitivity: 'accent' });
  }

  async createView(input: CreateDataViewInput): Promise<DataViewDefinition> {
    const timestamp = this.now().toISOString();
    const view: DataViewDefinition = {
      ...input,
      id: generateId(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.inMemoryViews.set(view.id, view);
    return view;
  }

  async updateView(id: string, updates: UpdateDataViewInput): Promise<DataViewDefinition> {
    const existing = this.inMemoryViews.get(id);
    if (!existing) {
      throw new Error(`Data view with id "${id}" not found`);
    }

    const updated: DataViewDefinition = {
      ...existing,
      ...updates,
      id,
      updatedAt: this.now().toISOString(),
    };
    this.inMemoryViews.set(id, updated);
    return updated;
  }

  async deleteView(id: string): Promise<void> {
    this.inMemoryViews.delete(id);
  }

  async getUserViews(ownerId: string): Promise<DataViewDefinition[]> {
    return Array.from(this.inMemoryViews.values()).filter((view) => view.ownerId === ownerId);
  }

  applyFilters<TRecord extends Record<string, unknown>>(records: TRecord[], filters: FilterCondition[]): TRecord[] {
    if (filters.length === 0) {
      return [...records];
    }

    return records.filter((record) => filters.every((filter) => this.matchesFilter(record, filter)));
  }

  applySorts<TRecord extends Record<string, unknown>>(records: TRecord[], sorts: SortConfig[]): TRecord[] {
    if (sorts.length === 0) {
      return [...records];
    }

    const copy = [...records];
    copy.sort((a, b) => {
      for (const sort of sorts) {
        const aValue = this.getFieldValue(a, sort.field);
        const bValue = this.getFieldValue(b, sort.field);
        const comparison = this.compareValues(aValue, bValue);

        if (comparison !== 0) {
          return sort.direction === 'desc' ? comparison * -1 : comparison;
        }
      }

      return 0;
    });

    return copy;
  }

  groupRecords<TRecord extends Record<string, unknown>>(records: TRecord[], config: GroupConfig): Map<string, TRecord[]> {
    const ordered = new Map<string, TRecord[]>();
    const fallbackLabel = config.emptyLabel ?? DEFAULT_EMPTY_GROUP_LABEL;

    if (config.order) {
      for (const key of config.order) {
        if (!ordered.has(key)) {
          ordered.set(key, []);
        }
      }
    }

    const unordered = new Map<string, TRecord[]>();

    for (const record of records) {
      const rawKey = this.getFieldValue(record, config.field);
      let key: string;

      if (rawKey === null || rawKey === undefined || rawKey === '') {
        key = fallbackLabel;
      } else if (typeof rawKey === 'string') {
        key = rawKey;
      } else {
        key = String(rawKey);
      }

      const target = config.order?.includes(key) ? ordered : unordered;
      if (!target.has(key)) {
        target.set(key, []);
      }

      target.get(key)?.push(record);
    }

    if (unordered.size > 0) {
      const sortedKeys = [...unordered.keys()].sort((a, b) => this.collator.compare(a.toLowerCase(), b.toLowerCase()));
      for (const key of sortedKeys) {
        ordered.set(key, unordered.get(key) ?? []);
      }
    }

    return ordered;
  }

  resolveRelativeDateRange(range: RelativeDateRange): { start: Date; end: Date } {
    const now = this.truncateToStartOfDay(this.now());

    if (range.direction === 'last') {
      const start = this.truncateToStartOfDay(this.addToDate(now, -range.amount, range.unit));
      const end = this.truncateToEndOfDay(now);
      return { start, end };
    }

    const start = this.truncateToStartOfDay(now);
    const end = this.truncateToEndOfDay(this.addToDate(now, range.amount, range.unit));
    return { start, end };
  }

  private matchesFilter(record: Record<string, unknown>, filter: FilterCondition): boolean {
    const value = this.getFieldValue(record, filter.field);

    switch (filter.type) {
      case 'text':
        return this.evaluateTextFilter(value, filter);
      case 'number':
        return this.evaluateNumberFilter(value, filter);
      case 'date':
        return this.evaluateDateFilter(value, filter);
      case 'tag':
        return this.evaluateTagFilter(value, filter);
      case 'empty':
        return this.evaluateEmptyFilter(value, filter);
      case 'boolean':
        return this.evaluateBooleanFilter(value, filter);
      default:
        return true;
    }
  }

  private evaluateTextFilter(value: unknown, filter: Extract<FilterCondition, { type: 'text' }>): boolean {
    const candidate = this.toLowerCaseString(value);
    const target = filter.value.toLowerCase();

    switch (filter.operator) {
      case 'contains':
        return candidate.includes(target);
      case 'equals':
        return candidate === target;
      case 'startsWith':
        return candidate.startsWith(target);
      case 'endsWith':
        return candidate.endsWith(target);
      case 'notContains':
        return !candidate.includes(target);
      case 'notEquals':
        return candidate !== target;
      default:
        return true;
    }
  }

  private evaluateNumberFilter(value: unknown, filter: Extract<FilterCondition, { type: 'number' }>): boolean {
    const numericValue = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(numericValue)) {
      return false;
    }

    if (filter.operator === 'between') {
      if (!filter.value || typeof filter.value !== 'object') {
        return false;
      }
      const { min, max } = filter.value as { min: number; max: number };
      return numericValue >= min && numericValue <= max;
    }

    const comparisonValue = typeof filter.value === 'number' ? filter.value : Number(filter.value);
    if (!Number.isFinite(comparisonValue)) {
      return false;
    }

    switch (filter.operator) {
      case 'equals':
        return numericValue === comparisonValue;
      case 'notEquals':
        return numericValue !== comparisonValue;
      case 'greaterThan':
        return numericValue > comparisonValue;
      case 'greaterThanOrEqual':
        return numericValue >= comparisonValue;
      case 'lessThan':
        return numericValue < comparisonValue;
      case 'lessThanOrEqual':
        return numericValue <= comparisonValue;
      default:
        return true;
    }
  }

  private evaluateDateFilter(value: unknown, filter: Extract<FilterCondition, { type: 'date' }>): boolean {
    if (!value) {
      return false;
    }

    const candidate = this.toDate(value);
    if (!candidate) {
      return false;
    }

    const range = this.resolveDateFilterRange(filter.value);

    if (filter.operator === 'between') {
      return candidate.getTime() >= range.start.getTime() && candidate.getTime() <= range.end.getTime();
    }

    if (filter.operator === 'before') {
      return candidate.getTime() <= range.end.getTime();
    }

    if (filter.operator === 'after') {
      return candidate.getTime() >= range.start.getTime();
    }

    return true;
  }

  private evaluateTagFilter(value: unknown, filter: Extract<FilterCondition, { type: 'tag' }>): boolean {
    const candidateValues = Array.isArray(value) ? value.map((item) => String(item)) : [];
    const targetValues = filter.value.map((item) => String(item));

    if (targetValues.length === 0) {
      return true;
    }

    switch (filter.operator) {
      case 'includesAny':
        return targetValues.some((target) => candidateValues.includes(target));
      case 'includesAll':
        return targetValues.every((target) => candidateValues.includes(target));
      case 'excludes':
        return targetValues.every((target) => !candidateValues.includes(target));
      default:
        return true;
    }
  }

  private evaluateEmptyFilter(value: unknown, filter: Extract<FilterCondition, { type: 'empty' }>): boolean {
    const isEmpty = value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);

    if (filter.operator === 'isEmpty') {
      return isEmpty;
    }

    if (filter.operator === 'isNotEmpty') {
      return !isEmpty;
    }

    return true;
  }

  private evaluateBooleanFilter(value: unknown, filter: Extract<FilterCondition, { type: 'boolean' }>): boolean {
    if (typeof value !== 'boolean') {
      return false;
    }

    if (filter.operator === 'is') {
      return value === filter.value;
    }

    if (filter.operator === 'isNot') {
      return value !== filter.value;
    }

    return true;
  }

  private resolveDateFilterRange(value: Extract<FilterCondition, { type: 'date' }>['value']): { start: Date; end: Date } {
    if (this.isRelativeRange(value)) {
      return this.resolveRelativeDateRange(value);
    }

    const start = this.truncateToStartOfDay(this.toDate((value as { start: string }).start) ?? new Date(NaN));
    const end = this.truncateToEndOfDay(this.toDate((value as { end: string }).end) ?? new Date(NaN));
    return { start, end };
  }

  private isRelativeRange(value: unknown): value is RelativeDateRange {
    return Boolean(value) && typeof value === 'object' && 'direction' in (value as Record<string, unknown>);
  }

  private compareValues(a: unknown, b: unknown): number {
    if (a === b) {
      return 0;
    }

    if (a === undefined || a === null) {
      return 1;
    }

    if (b === undefined || b === null) {
      return -1;
    }

    if (typeof a === 'number' && typeof b === 'number') {
      return a - b;
    }

    const dateA = this.toDate(a);
    const dateB = this.toDate(b);
    if (dateA && dateB) {
      return dateA.getTime() - dateB.getTime();
    }

    if (typeof a === 'string' && typeof b === 'string') {
      const normalizedA = a.toLowerCase();
      const normalizedB = b.toLowerCase();
      const aStartsWithDigit = /^\d/.test(normalizedA);
      const bStartsWithDigit = /^\d/.test(normalizedB);

      if (aStartsWithDigit !== bStartsWithDigit) {
        return aStartsWithDigit ? 1 : -1;
      }

      return this.collator.compare(normalizedA, normalizedB);
    }

    return this.collator.compare(this.toLowerCaseString(a), this.toLowerCaseString(b));
  }

  private getFieldValue(record: Record<string, unknown>, field: string): unknown {
    const segments = field.split('.');
    let current: unknown = record;

    for (const segment of segments) {
      if (current === null || current === undefined) {
        return undefined;
      }

      if (Array.isArray(current)) {
        const index = Number(segment);
        current = Number.isInteger(index) ? current[index] : undefined;
      } else if (typeof current === 'object') {
        current = (current as Record<string, unknown>)[segment];
      } else {
        return undefined;
      }
    }

    return current;
  }

  private toDate(value: unknown): Date | undefined {
    if (value instanceof Date) {
      return value;
    }

    if (typeof value === 'number') {
      const fromNumber = new Date(value);
      return Number.isNaN(fromNumber.getTime()) ? undefined : fromNumber;
    }

    if (typeof value === 'string') {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? undefined : parsed;
    }

    return undefined;
  }

  private toLowerCaseString(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    return String(value).toLowerCase();
  }

  private addToDate(date: Date, amount: number, unit: RelativeDateRange['unit']): Date {
    const result = new Date(date.getTime());

    if (unit === 'days') {
      result.setUTCDate(result.getUTCDate() + amount);
      return result;
    }

    if (unit === 'weeks') {
      result.setUTCDate(result.getUTCDate() + amount * 7);
      return result;
    }

    const dayOfMonth = result.getUTCDate();
    result.setUTCDate(1);
    result.setUTCMonth(result.getUTCMonth() + amount);
    const monthLength = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
    result.setUTCDate(Math.min(dayOfMonth, monthLength));
    return result;
  }

  private truncateToStartOfDay(date: Date): Date {
    const clone = new Date(date.getTime());
    clone.setUTCHours(0, 0, 0, 0);
    return clone;
  }

  private truncateToEndOfDay(date: Date): Date {
    const clone = new Date(date.getTime());
    clone.setUTCHours(23, 59, 59, 999);
    return clone;
  }
}
