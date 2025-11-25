import type {
  FilterLogic,
  FilterOperator,
  LegacyViewFilter,
  ViewFilter,
  ViewFilterCondition,
  ViewFilterGroup,
} from '../types/entities';

const DEFAULT_FIELD = 'name';
const DEFAULT_OPERATOR: FilterOperator = 'contains';

function generateNodeId(): string {
  const cryptoApi = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return cryptoApi.randomUUID();
  }

  const randomSegment = Math.random().toString(36).slice(2, 10);
  return `view-filter-${randomSegment}-${Date.now()}`;
}

export function isFilterGroup(node: ViewFilter): node is ViewFilterGroup {
  return node.type === 'group' || Array.isArray((node as Partial<ViewFilterGroup>).children);
}

export function isFilterCondition(node: ViewFilter): node is ViewFilterCondition {
  return !isFilterGroup(node);
}

export function createFilterCondition(partial?: Partial<ViewFilterCondition>): ViewFilterCondition {
  return {
    id: partial?.id ?? generateNodeId(),
    type: 'condition',
    field: partial?.field ?? DEFAULT_FIELD,
    operator: partial?.operator ?? DEFAULT_OPERATOR,
    value: partial?.value ?? '',
  } satisfies ViewFilterCondition;
}

export function createFilterGroup(logic: FilterLogic = 'AND', children: ViewFilter[] = []): ViewFilterGroup {
  return {
    id: generateNodeId(),
    type: 'group',
    logic,
    children,
  } satisfies ViewFilterGroup;
}

function normalizeCondition(node: ViewFilterCondition): ViewFilterCondition {
  return {
    id: node.id ?? generateNodeId(),
    type: 'condition',
    field: node.field,
    operator: node.operator,
    value: node.value,
  } satisfies ViewFilterCondition;
}

function normalizeGroup(node: ViewFilterGroup): ViewFilterGroup {
  return {
    id: node.id ?? generateNodeId(),
    type: 'group',
    logic: node.logic ?? 'AND',
    children: node.children.map((child) => normalizeFilterNode(child)),
  } satisfies ViewFilterGroup;
}

export function normalizeFilterNode(node: ViewFilter): ViewFilter {
  if (isFilterGroup(node)) {
    return normalizeGroup(node);
  }
  const conditionLike: ViewFilterCondition = {
    id: node.id,
    type: 'condition',
    field: (node as ViewFilterCondition).field,
    operator: (node as ViewFilterCondition).operator,
    value: (node as ViewFilterCondition).value,
  } satisfies ViewFilterCondition;
  return normalizeCondition(conditionLike);
}

export function normalizeFilterGroup(root?: ViewFilter | null): ViewFilterGroup {
  if (!root) {
    return createFilterGroup('AND');
  }

  const normalized = normalizeFilterNode(root);
  if (isFilterGroup(normalized)) {
    return normalized;
  }

  return createFilterGroup('AND', [normalized]);
}

export function cloneFilterGroup(group: ViewFilterGroup): ViewFilterGroup {
  return {
    ...group,
    children: group.children.map((child) =>
      isFilterGroup(child)
        ? cloneFilterGroup(child)
        : { ...child },
    ),
  } satisfies ViewFilterGroup;
}

export function countFilterConditions(group: ViewFilterGroup): number {
  return group.children.reduce((total, child) => {
    if (isFilterGroup(child)) {
      return total + countFilterConditions(child);
    }
    return total + 1;
  }, 0);
}

export function flattenFilterConditions(group: ViewFilterGroup): ViewFilterCondition[] {
  return group.children.flatMap((child) => {
    if (isFilterGroup(child)) {
      return flattenFilterConditions(child);
    }
    return [child];
  });
}

export function convertLegacyFiltersToGroup(filters: LegacyViewFilter[]): ViewFilterGroup {
  if (!Array.isArray(filters) || filters.length === 0) {
    return createFilterGroup('AND');
  }

  const nodes = filters.map((filter) =>
    createFilterCondition({
      field: filter.field,
      operator: filter.operator,
      value: filter.value,
    }),
  );

  const [firstNode, ...remainingNodes] = nodes;
  if (!firstNode) {
    return createFilterGroup('AND');
  }

  let current: ViewFilter = firstNode;

  remainingNodes.forEach((node, index) => {
    if (!node) {
      return;
    }
    const previousLogic = filters[index]?.logic === 'OR' ? 'OR' : 'AND';
    current = {
      id: generateNodeId(),
      type: 'group',
      logic: previousLogic,
      children: [normalizeFilterNode(current), node],
    } satisfies ViewFilterGroup;
  });

  if (isFilterGroup(current)) {
    return normalizeFilterGroup(current);
  }

  return createFilterGroup('AND', [current]);
}

export function ensureFilterGroupIds(group: ViewFilterGroup): ViewFilterGroup {
  return normalizeFilterGroup(group);
}

export function hasActiveFilters(group?: ViewFilterGroup): boolean {
  if (!group) {
    return false;
  }
  return countFilterConditions(group) > 0;
}

export { generateNodeId as generateFilterNodeId };
