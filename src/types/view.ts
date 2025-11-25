import type { ISOTimestamp, UUID } from './entities';

export type ViewType = 'table' | 'gallery' | 'kanban' | 'calendar';

export type FilterOperator =
  | 'equals'
  | 'not-equals'
  | 'contains'
  | 'starts-with'
  | 'ends-with'
  | 'greater-than'
  | 'less-than'
  | 'between'
  | 'in'
  | 'not-in'
  | 'empty'
  | 'not-empty'
  | 'relative-date';

export type FilterValue = string | number | boolean | null | undefined | string[] | number[];

export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value?: FilterValue;
  values?: FilterValue[];
  relativeRange?: {
    unit: 'days' | 'weeks' | 'months';
    amount: number;
    direction: 'past' | 'future';
  };
}

export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

export interface GroupingConfig {
  field: string;
  order?: string[];
}

export interface DataView {
  id: UUID;
  name: string;
  viewType: ViewType;
  filters: FilterCondition[];
  sorts: SortConfig[];
  grouping?: GroupingConfig;
  ownerId: UUID;
  ownerName?: string;
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
}
