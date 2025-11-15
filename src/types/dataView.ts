import type { ReactNode } from 'react';

export type DataViewMode = 'table' | 'gallery' | 'kanban' | 'calendar';

export interface DateRange {
    start: string;
    end: string;
}

export interface RelativeDateRange {
    direction: 'last' | 'next';
    unit: 'days' | 'weeks' | 'months';
    amount: number;
}

export type TextFilterOperator = 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'notContains' | 'notEquals';
export type NumberFilterOperator = 'equals' | 'notEquals' | 'greaterThan' | 'greaterThanOrEqual' | 'lessThan' | 'lessThanOrEqual' | 'between';
export type DateFilterOperator = 'before' | 'after' | 'between';
export type TagFilterOperator = 'includesAny' | 'includesAll' | 'excludes';
export type EmptyFilterOperator = 'isEmpty' | 'isNotEmpty';
export type BooleanFilterOperator = 'is' | 'isNot';

export interface TextFilterCondition {
    type: 'text';
    field: string;
    operator: TextFilterOperator;
    value: string;
}

export interface NumberFilterCondition {
    type: 'number';
    field: string;
    operator: NumberFilterOperator;
    value: number | { min: number; max: number };
}

export interface DateFilterCondition {
    type: 'date';
    field: string;
    operator: DateFilterOperator;
    value: DateRange | RelativeDateRange;
}

export interface TagFilterCondition {
    type: 'tag';
    field: string;
    operator: TagFilterOperator;
    value: string[];
}

export interface EmptyFilterCondition {
    type: 'empty';
    field: string;
    operator: EmptyFilterOperator;
}

export interface BooleanFilterCondition {
    type: 'boolean';
    field: string;
    operator: BooleanFilterOperator;
    value: boolean;
}

export type FilterCondition =
    | TextFilterCondition
    | NumberFilterCondition
    | DateFilterCondition
    | TagFilterCondition
    | EmptyFilterCondition
    | BooleanFilterCondition;

export interface SortConfig {
    field: string;
    direction: 'asc' | 'desc';
}

export interface GroupConfig {
    field: string;
    order?: string[];
    emptyLabel?: string;
}

export interface DataViewRecord extends Record<string, unknown> {
    id: string;
    title?: string;
    subtitle?: string;
    description?: string;
    status?: {
        label: string;
        color?: string;
        variant?: 'light' | 'filled' | 'outline';
        icon?: ReactNode;
    };
    tags?: Array<{ label: string; color?: string; icon?: ReactNode }>;
    source?: unknown;
}

export interface DataViewDefinition {
    id: string;
    name: string;
    viewType: DataViewMode;
    filters: FilterCondition[];
    sorts: SortConfig[];
    grouping?: GroupConfig;
    ownerId: string;
    createdAt: string;
    updatedAt: string;
}

export interface AppliedGroup {
    key: string;
    label: string;
    records: DataViewRecord[];
}

export type FilterFieldType = FilterCondition['type'];

export interface BaseFilterFieldDefinition<TType extends FilterFieldType> {
    field: string;
    label: string;
    description?: string;
    type: TType;
}

export interface TextFilterFieldDefinition extends BaseFilterFieldDefinition<'text'> {
    placeholder?: string;
    operators?: TextFilterOperator[];
}

export interface NumberFilterFieldDefinition extends BaseFilterFieldDefinition<'number'> {
    operators?: NumberFilterOperator[];
    min?: number;
    max?: number;
    step?: number;
    precision?: number;
}

export interface DateFilterFieldDefinition extends BaseFilterFieldDefinition<'date'> {
    operators?: DateFilterOperator[];
    allowRelativeRanges?: boolean;
}

export interface TagFilterFieldDefinition extends BaseFilterFieldDefinition<'tag'> {
    operators?: TagFilterOperator[];
    options: Array<{ value: string; label: string }>;
}

export interface EmptyFilterFieldDefinition extends BaseFilterFieldDefinition<'empty'> {
    operators?: EmptyFilterOperator[];
}

export interface BooleanFilterFieldDefinition extends BaseFilterFieldDefinition<'boolean'> {
    operators?: BooleanFilterOperator[];
    trueLabel?: string;
    falseLabel?: string;
}

export type FilterFieldDefinition =
    | TextFilterFieldDefinition
    | NumberFilterFieldDefinition
    | DateFilterFieldDefinition
    | TagFilterFieldDefinition
    | EmptyFilterFieldDefinition
    | BooleanFilterFieldDefinition;

export interface GroupFieldDefinition {
    field: string;
    label: string;
    description?: string;
    order?: string[];
    emptyLabel?: string;
}

export interface SavedViewSummary {
    id: string;
    name: string;
    updatedAt?: string;
    viewType?: DataViewMode;
}
