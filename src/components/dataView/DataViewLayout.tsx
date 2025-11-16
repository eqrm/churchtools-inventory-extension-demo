import { useMemo } from 'react';
import type { ReactNode } from 'react';
import {
    ActionIcon,
    Badge,
    Button,
    Card,
    Group,
    MultiSelect,
    NumberInput,
    Pagination,
    Select,
    Stack,
    Text,
    TextInput,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import {
    IconChevronDown,
    IconChevronUp,
    IconPlus,
    IconRestore,
    IconTrash,
} from '@tabler/icons-react';
import type {
    AppliedGroup,
    BooleanFilterCondition,
    BooleanFilterOperator,
    DataViewMode,
    DateFilterCondition,
    DateFilterOperator,
    DateRange,
    EmptyFilterCondition,
    EmptyFilterOperator,
    FilterCondition,
    FilterFieldDefinition,
    BooleanFilterFieldDefinition,
    DateFilterFieldDefinition,
    GroupConfig,
    GroupFieldDefinition,
    NumberFilterFieldDefinition,
    NumberFilterCondition,
    NumberFilterOperator,
    RelativeDateRange,
    TagFilterFieldDefinition,
    TagFilterCondition,
    TagFilterOperator,
    TextFilterFieldDefinition,
    TextFilterCondition,
    TextFilterOperator,
} from '../../types/dataView';
import { DataViewHeader, type SavedViewsConfig } from './DataViewHeader';
import { DataViewGallery, type DataViewGalleryProps } from './DataViewGallery';
import { DataViewKanban, type DataViewKanbanProps } from './DataViewKanban';
import { DataViewCalendar, type DataViewCalendarProps } from './DataViewCalendar';
import type { ViewRecord } from './types';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

type ViewsTranslationFn = TFunction<'views'>;

const DEFAULT_TEXT_OPERATORS: readonly [TextFilterOperator, ...TextFilterOperator[]] = [
    'contains',
    'equals',
    'startsWith',
    'endsWith',
    'notContains',
    'notEquals',
];

const DEFAULT_NUMBER_OPERATORS: readonly [NumberFilterOperator, ...NumberFilterOperator[]] = [
    'equals',
    'notEquals',
    'greaterThan',
    'greaterThanOrEqual',
    'lessThan',
    'lessThanOrEqual',
    'between',
];

const DEFAULT_DATE_OPERATORS: readonly [DateFilterOperator, ...DateFilterOperator[]] = ['between', 'before', 'after'];

const DEFAULT_TAG_OPERATORS: readonly [TagFilterOperator, ...TagFilterOperator[]] = ['includesAny', 'includesAll', 'excludes'];

const DEFAULT_EMPTY_OPERATORS: readonly [EmptyFilterOperator, ...EmptyFilterOperator[]] = ['isEmpty', 'isNotEmpty'];

const DEFAULT_BOOLEAN_OPERATORS: readonly [BooleanFilterOperator, ...BooleanFilterOperator[]] = ['is', 'isNot'];

export interface FilterBuilderConfig {
    fields: FilterFieldDefinition[];
    filters: FilterCondition[];
    onChange: (filters: FilterCondition[]) => void;
    onApply?: (filters: FilterCondition[]) => void;
    onReset?: () => void;
    isLoading?: boolean;
    allowEmptyFilters?: boolean;
}

export interface GroupingControlsConfig {
    fields: GroupFieldDefinition[];
    value?: GroupConfig;
    groups?: AppliedGroup[];
    collapsedKeys?: string[];
    onChange: (value?: GroupConfig) => void;
    onOrderChange?: (order: string[]) => void;
    onToggleCollapse?: (groupKey: string) => void;
    onResetCollapse?: () => void;
}

export interface DataViewPaginationConfig {
    page: number;
    total: number;
    pageSize: number;
    currentCount?: number;
    pageSizeOptions?: number[];
    onPageChange: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
    isDisabled?: boolean;
    label?: string;
}

export interface DataViewLayoutProps<TRecord extends ViewRecord = ViewRecord> {
    title: string;
    mode: DataViewMode;
    availableModes?: DataViewMode[];
    onModeChange?: (mode: DataViewMode) => void;
    filtersOpen: boolean;
    onToggleFilters: () => void;
    hasActiveFilters?: boolean;
    activeFilterCount?: number;
    showFilterButton?: boolean;
    primaryAction?: {
        label: string;
        icon?: ReactNode;
        onClick: () => void;
        disabled?: boolean;
    };
    actions?: ReactNode;
    toolbarContent?: ReactNode;
    filterContent?: ReactNode;
    tableView?: ReactNode;
    galleryView?: DataViewGalleryProps<TRecord>;
    kanbanView?: DataViewKanbanProps<TRecord>;
    calendarView?: DataViewCalendarProps<TRecord>;
    calendarViewContent?: ReactNode;
    missingViewContent?: ReactNode;
    children?: ReactNode;
    savedViewsConfig?: SavedViewsConfig;
    filterBuilderConfig?: FilterBuilderConfig;
    groupingConfig?: GroupingControlsConfig;
    pagination?: DataViewPaginationConfig;
}

export function DataViewLayout<TRecord extends ViewRecord = ViewRecord>({
    title,
    mode,
    availableModes,
    onModeChange,
    filtersOpen,
    onToggleFilters,
    hasActiveFilters,
    activeFilterCount,
    showFilterButton,
    primaryAction,
    actions,
    toolbarContent,
    filterContent,
    tableView,
    galleryView,
    kanbanView,
    calendarView,
    calendarViewContent,
    missingViewContent,
    children,
    savedViewsConfig,
    filterBuilderConfig,
    groupingConfig,
    pagination,
}: DataViewLayoutProps<TRecord>) {
    const { t } = useTranslation('views');
    const tableContent = tableView ?? children;

    const renderedContent = useMemo((): ReactNode => {
        switch (mode) {
            case 'gallery':
                if (galleryView) {
                    return <DataViewGallery<TRecord> {...galleryView} />;
                }
                break;
            case 'kanban':
                if (kanbanView) {
                    return <DataViewKanban<TRecord> {...kanbanView} />;
                }
                break;
            case 'calendar':
                if (calendarViewContent) {
                    return calendarViewContent;
                }
                if (calendarView) {
                    return <DataViewCalendar<TRecord> {...calendarView} />;
                }
                break;
            case 'table':
            default:
                if (tableContent) {
                    return tableContent;
                }
                break;
        }

        if (tableContent) {
            return tableContent;
        }

        return (
            missingViewContent ?? (
                <Card withBorder>
                    <Text c="dimmed" ta="center">
                        No renderer configured for this view.
                    </Text>
                </Card>
            )
        );
    }, [calendarView, calendarViewContent, galleryView, kanbanView, missingViewContent, mode, tableContent]);

    const shouldRenderFilterPanel = filtersOpen && (filterBuilderConfig || filterContent);

    return (
        <Stack gap="md">
            <DataViewHeader
                title={title}
                mode={mode}
                availableModes={availableModes}
                onModeChange={onModeChange}
                filtersOpen={filtersOpen}
                onToggleFilters={onToggleFilters}
                hasActiveFilters={hasActiveFilters}
                activeFilterCount={activeFilterCount}
                showFilterButton={showFilterButton}
                primaryAction={primaryAction}
                actions={actions}
                savedViewsConfig={savedViewsConfig}
            />


            {shouldRenderFilterPanel && (
                filterBuilderConfig ? (
                    <FilterBuilderPanel config={filterBuilderConfig} t={t} />
                ) : (
                    <Card withBorder>{filterContent}</Card>
                )
            )}

            {groupingConfig && <GroupingControlsPanel config={groupingConfig} t={t} />}

            {toolbarContent}

            {renderedContent}

            {pagination && <PaginationControls config={pagination} t={t} />}
        </Stack>
    );
}

interface FilterBuilderPanelProps {
    config: FilterBuilderConfig;
    t: ViewsTranslationFn;
}

function FilterBuilderPanel({ config, t }: FilterBuilderPanelProps) {
    const { fields, filters } = config;

    const fieldMap = useMemo(() => {
        const map = new Map<string, FilterFieldDefinition>();
        for (const field of fields) {
            map.set(field.field, field);
        }
        return map;
    }, [fields]);

    const handleAddFilter = () => {
        const firstField = fields[0];
        if (!firstField) {
            return;
        }
        const nextFilter = createDefaultCondition(firstField);
        config.onChange([...filters, nextFilter]);
    };

    const replaceFilter = (index: number, next: FilterCondition) => {
        const updated = filters.map((filter, idx) => (idx === index ? next : filter));
        config.onChange(updated);
    };

    const removeFilter = (index: number) => {
        const updated = filters.filter((_, idx) => idx !== index);
        config.onChange(updated);
    };

    const handleFieldChange = (index: number, fieldName: string | null) => {
        if (!fieldName) {
            return;
        }
        const field = fieldMap.get(fieldName);
        if (!field) {
            return;
        }
        replaceFilter(index, createDefaultCondition(field));
    };

    const handleOperatorChange = (index: number, operator: string | null) => {
        if (!operator) {
            return;
        }
        const current = filters[index];
        if (!current) {
            return;
        }
        const field = fieldMap.get(current.field);
        if (!field) {
            return;
        }
        const updated = updateConditionOperator(current, operator);
        replaceFilter(index, updated);
    };

    const handleValueChange = (index: number, next: FilterCondition) => {
        replaceFilter(index, next);
    };

    const canAddFilter = fields.length > 0;

    return (
        <Card withBorder>
            <Stack gap="sm">
                <Group justify="space-between" align="center">
                    <Group gap="xs">
                        <Text fw={600}>{t('filterPanel.title')}</Text>
                        <Badge color="gray" variant="light" size="sm">
                            {t('filterPanel.badgeLabel', { count: filters.length })}
                        </Badge>
                    </Group>
                    <Group gap="xs">
                        {config.onReset && (
                            <Button
                                size="xs"
                                variant="subtle"
                                leftSection={<IconRestore size={14} />}
                                onClick={() => config.onReset?.()}
                                disabled={config.isLoading}
                            >
                                {t('filterPanel.reset')}
                            </Button>
                        )}
                        <Button
                            size="xs"
                            leftSection={<IconPlus size={14} />}
                            onClick={handleAddFilter}
                            disabled={!canAddFilter || config.isLoading}
                        >
                            {t('filterPanel.add')}
                        </Button>
                    </Group>
                </Group>

                {filters.length === 0 ? (
                    <Text size="sm" c="dimmed">
                        {t('filterPanel.empty')}
                    </Text>
                ) : (
                    <Stack gap="xs">
                        {filters.map((filter, index) => {
                            const field = fieldMap.get(filter.field) ?? fields[0];
                            const operatorOptions = getOperatorsForField(field);

                            return (
                                <Card key={`${filter.field}-${index}`} withBorder radius="sm" padding="sm">
                                    <Stack gap="xs">
                                        <Group align="flex-start" gap="xs" wrap="nowrap">
                                            <Select
                                                data={fields.map((item) => ({ value: item.field, label: item.label }))}
                                                value={field?.field ?? ''}
                                                onChange={(value) => handleFieldChange(index, value)}
                                                placeholder={t('filterPanel.fieldPlaceholder')}
                                                size="xs"
                                                maw={220}
                                            />
                                            <Select
                                                data={operatorOptions.map((item) => ({ value: item, label: operatorLabel(item) }))}
                                                value={filter.operator}
                                                onChange={(value) => handleOperatorChange(index, value)}
                                                placeholder={t('filterPanel.operatorPlaceholder')}
                                                size="xs"
                                                maw={220}
                                            />
                                            <Stack flex={1} gap="xs">
                                                {field && (
                                                    <FilterValueEditor
                                                        condition={filter}
                                                        field={field}
                                                        onChange={(next) => handleValueChange(index, next)}
                                                        t={t}
                                                    />
                                                )}
                                                {field?.description && (
                                                    <Text size="xs" c="dimmed">
                                                        {field.description}
                                                    </Text>
                                                )}
                                            </Stack>
                                            <ActionIcon
                                                variant="subtle"
                                                color="red"
                                                size="sm"
                                                onClick={() => removeFilter(index)}
                                                aria-label={t('filterPanel.remove')}
                                                disabled={config.isLoading}
                                            >
                                                <IconTrash size={14} />
                                            </ActionIcon>
                                        </Group>
                                    </Stack>
                                </Card>
                            );
                        })}
                    </Stack>
                )}

                {config.onApply && (
                    <Group justify="flex-end">
                        <Button
                            size="xs"
                            variant="filled"
                            onClick={() => config.onApply?.(filters)}
                            disabled={config.isLoading || (!config.allowEmptyFilters && filters.length === 0)}
                        >
                            {t('filterPanel.apply')}
                        </Button>
                    </Group>
                )}
            </Stack>
        </Card>
    );
}

interface FilterValueEditorProps {
    condition: FilterCondition;
    field: FilterFieldDefinition;
    onChange: (condition: FilterCondition) => void;
    t: ViewsTranslationFn;
}

function FilterValueEditor({ condition, field, onChange, t }: FilterValueEditorProps) {
    switch (condition.type) {
        case 'text': {
            if (field.type !== 'text') {
                return (
                    <Text size="xs" c="dimmed">
                        {t('filterPanel.unsupported')}
                    </Text>
                );
            }
            const textField = field as TextFilterFieldDefinition;
            const textCondition = condition as TextFilterCondition;
            return (
                <TextInput
                    size="xs"
                    value={textCondition.value}
                    onChange={(event) =>
                        onChange({
                            ...textCondition,
                            value: event.currentTarget.value,
                        })
                    }
                    placeholder={textField.placeholder ?? t('filterPanel.textPlaceholder')}
                />
            );
        }
        case 'number': {
            if (field.type !== 'number') {
                return (
                    <Text size="xs" c="dimmed">
                        {t('filterPanel.unsupportedNumber')}
                    </Text>
                );
            }
            const numberField = field as NumberFilterFieldDefinition;
            const numberCondition = condition as NumberFilterCondition;
            if (numberCondition.operator === 'between') {
                const range = ensureNumberRange(numberCondition.value);
                return (
                    <Group gap="xs" wrap="nowrap">
                        <NumberInput
                            size="xs"
                            value={range.min}
                            onChange={(value) =>
                                onChange({
                                    ...numberCondition,
                                    value: { min: Number(value) || 0, max: range.max },
                                })
                            }
                            placeholder={t('filterPanel.numberMinPlaceholder')}
                            min={numberField.min}
                            max={numberField.max}
                            step={numberField.step}
                        />
                        <NumberInput
                            size="xs"
                            value={range.max}
                            onChange={(value) =>
                                onChange({
                                    ...numberCondition,
                                    value: { min: range.min, max: Number(value) || 0 },
                                })
                            }
                            placeholder={t('filterPanel.numberMaxPlaceholder')}
                            min={numberField.min}
                            max={numberField.max}
                            step={numberField.step}
                        />
                    </Group>
                );
            }
            return (
                <NumberInput
                    size="xs"
                    value={Number(numberCondition.value) || 0}
                    onChange={(value) =>
                        onChange({
                            ...numberCondition,
                            value: Number(value) || 0,
                        })
                    }
                    min={numberField.min}
                    max={numberField.max}
                    step={numberField.step}
                />
            );
        }
        case 'date': {
            if (field.type !== 'date') {
                return (
                    <Text size="xs" c="dimmed">
                        {t('filterPanel.unsupportedDate')}
                    </Text>
                );
            }
            const dateField = field as DateFilterFieldDefinition;
            const dateCondition = condition as DateFilterCondition;
            const isRelative = isRelativeRange(dateCondition.value);
            const modeOptions = [
                { value: 'absolute', label: t('filterPanel.dateAbsolute') },
                ...(dateField.allowRelativeRanges ? [{ value: 'relative', label: t('filterPanel.dateRelative') }] : []),
            ];

            return (
                <Stack gap="xs">
                    {modeOptions.length > 1 && (
                        <Select
                            size="xs"
                            data={modeOptions}
                            value={isRelative ? 'relative' : 'absolute'}
                            onChange={(value) => {
                                if (value === 'relative') {
                                    onChange({
                                        ...dateCondition,
                                        value: {
                                            direction: 'last',
                                            unit: 'days',
                                            amount: 7,
                                        },
                                    });
                                } else {
                                    const nextRange = ensureDateRange(dateCondition.value);
                                    onChange({
                                        ...dateCondition,
                                        value: nextRange,
                                    });
                                }
                            }}
                        />
                    )}

                    {isRelative ? (
                        <Group gap="xs" grow>
                            <Select
                                size="xs"
                                data={[
                                    { value: 'last', label: t('filterPanel.dateLast') },
                                    { value: 'next', label: t('filterPanel.dateNext') },
                                ]}
                                value={(dateCondition.value as RelativeDateRange).direction}
                                onChange={(value) => {
                                    if (!value) {
                                        return;
                                    }
                                    const current = dateCondition.value as RelativeDateRange;
                                    onChange({
                                        ...dateCondition,
                                        value: {
                                            ...current,
                                            direction: value as RelativeDateRange['direction'],
                                        },
                                    });
                                }}
                                maw={150}
                            />
                            <NumberInput
                                size="xs"
                                value={(dateCondition.value as RelativeDateRange).amount}
                                onChange={(value) => {
                                    const current = dateCondition.value as RelativeDateRange;
                                    onChange({
                                        ...dateCondition,
                                        value: {
                                            ...current,
                                            amount: Math.max(1, Number(value) || 1),
                                        },
                                    });
                                }}
                                min={1}
                                maw={120}
                            />
                            <Select
                                size="xs"
                                data={[
                                    { value: 'days', label: t('filterPanel.dateUnitDays') },
                                    { value: 'weeks', label: t('filterPanel.dateUnitWeeks') },
                                    { value: 'months', label: t('filterPanel.dateUnitMonths') },
                                ]}
                                value={(dateCondition.value as RelativeDateRange).unit}
                                onChange={(value) => {
                                    if (!value) {
                                        return;
                                    }
                                    const current = dateCondition.value as RelativeDateRange;
                                    onChange({
                                        ...dateCondition,
                                        value: {
                                            ...current,
                                            unit: value as RelativeDateRange['unit'],
                                        },
                                    });
                                }}
                                maw={150}
                            />
                        </Group>
                    ) : (
                        <DatePickerInput
                            type={dateCondition.operator === 'between' ? 'range' : 'default'}
                            value={convertConditionValueToPickerValue(dateCondition)}
                            onChange={(value) =>
                                onChange({
                                    ...dateCondition,
                                    value: convertPickerValueToConditionValue(value, dateCondition),
                                })
                            }
                            allowSingleDateInRange
                            size="xs"
                        />
                    )}
                </Stack>
            );
        }
        case 'tag': {
            if (field.type !== 'tag') {
                return (
                    <Text size="xs" c="dimmed">
                        {t('filterPanel.unsupportedTag')}
                    </Text>
                );
            }
            const tagField = field as TagFilterFieldDefinition;
            const tagCondition = condition as TagFilterCondition;
            return (
                <MultiSelect
                    size="xs"
                    data={tagField.options}
                    value={tagCondition.value.map(String)}
                    onChange={(values) =>
                        onChange({
                            ...tagCondition,
                            value: values,
                        })
                    }
                    searchable
                    nothingFoundMessage={t('filterPanel.noOptions')}
                />
            );
        }
        case 'boolean': {
            if (field.type !== 'boolean') {
                return (
                    <Text size="xs" c="dimmed">
                        {t('filterPanel.unsupportedBoolean')}
                    </Text>
                );
            }
            const booleanField = field as BooleanFilterFieldDefinition;
            const booleanCondition = condition as BooleanFilterCondition;
            return (
                <Select
                    size="xs"
                    data={[
                        { value: 'true', label: booleanField.trueLabel ?? t('filterPanel.booleanTrue') },
                        { value: 'false', label: booleanField.falseLabel ?? t('filterPanel.booleanFalse') },
                    ]}
                    value={booleanCondition.value ? 'true' : 'false'}
                    onChange={(value) =>
                        onChange({
                            ...booleanCondition,
                            value: value === 'true',
                        })
                    }
                />
            );
        }
        case 'empty':
        default:
            return (
                <Text size="xs" c="dimmed">
                    {t('filterPanel.noAdditionalValue')}
                </Text>
            );
    }
}

interface GroupingControlsPanelProps {
    config: GroupingControlsConfig;
    t: ViewsTranslationFn;
}

function GroupingControlsPanel({ config, t }: GroupingControlsPanelProps) {
    const { fields, value, groups, collapsedKeys = [] } = config;
    const currentField = value ? fields.find((field) => field.field === value.field) : undefined;

    const handleFieldChange = (fieldName: string | null) => {
        if (!fieldName) {
            config.onChange(undefined);
            return;
        }
        const definition = fields.find((field) => field.field === fieldName);
        if (!definition) {
            return;
        }
        config.onChange({
            field: definition.field,
            order: definition.order ? [...definition.order] : undefined,
            emptyLabel: definition.emptyLabel,
        });
    };

    const handleOrderChange = (order: string[]) => {
        if (config.onOrderChange) {
            config.onOrderChange(order);
            return;
        }
        if (value) {
            config.onChange({ ...value, order });
        }
    };

    return (
        <Card withBorder>
            <Stack gap="sm">
                <Group justify="space-between" align="center">
                    <Text fw={600}>{t('grouping.title')}</Text>
                    <Group gap="xs">
                        <Button
                            size="xs"
                            variant="subtle"
                            leftSection={<IconRestore size={14} />}
                            onClick={() => config.onChange(undefined)}
                            disabled={!value}
                        >
                            {t('grouping.clear')}
                        </Button>
                    </Group>
                </Group>

                <Group gap="xs" align="flex-start" wrap="wrap">
                    <Select
                        size="xs"
                        data={fields.map((field) => ({ value: field.field, label: field.label }))}
                        value={currentField?.field ?? ''}
                        onChange={handleFieldChange}
                        placeholder={t('grouping.fieldPlaceholder')}
                        maw={240}
                    />

                    {currentField?.order && currentField.order.length > 0 && (
                        <MultiSelect
                            size="xs"
                            data={currentField.order.map((key) => ({ value: key, label: key }))}
                            value={value?.order ?? currentField.order}
                            onChange={handleOrderChange}
                            searchable
                            maw={320}
                        />
                    )}
                </Group>

                {groups && groups.length > 0 && config.onToggleCollapse && (
                    <Stack gap="xs">
                        <Text size="sm" fw={500}>
                            {t('grouping.groupsTitle')}
                        </Text>
                        <Stack gap="xs">
                            {groups.map((group) => {
                                const collapsed = collapsedKeys.includes(group.key);
                                return (
                                    <Card key={group.key} withBorder padding="xs" radius="sm">
                                        <Group justify="space-between" align="center">
                                            <Group gap="xs" align="center">
                                                <ActionIcon
                                                    variant="subtle"
                                                    size="sm"
                                                    onClick={() => config.onToggleCollapse?.(group.key)}
                                                    aria-label={collapsed ? t('grouping.expandGroup') : t('grouping.collapseGroup')}
                                                >
                                                    {collapsed ? (
                                                        <IconChevronDown size={14} />
                                                    ) : (
                                                        <IconChevronUp size={14} />
                                                    )}
                                                </ActionIcon>
                                                <Text size="sm">{group.label}</Text>
                                            </Group>
                                            <Badge size="sm" variant="light" color="gray">
                                                {group.records.length}
                                            </Badge>
                                        </Group>
                                    </Card>
                                );
                            })}
                        </Stack>
                        {config.onResetCollapse && (
                            <Button
                                size="xs"
                                variant="subtle"
                                leftSection={<IconRestore size={14} />}
                                onClick={() => config.onResetCollapse?.()}
                            >
                                {t('grouping.resetCollapsed')}
                            </Button>
                        )}
                    </Stack>
                )}
            </Stack>
        </Card>
    );
}

interface PaginationControlsProps {
    config: DataViewPaginationConfig;
    t: ViewsTranslationFn;
}

function PaginationControls({ config, t }: PaginationControlsProps) {
    const totalPages = Math.max(1, Math.ceil(Math.max(config.total, 0) / Math.max(config.pageSize, 1)));
    const start = config.total === 0 ? 0 : (config.page - 1) * config.pageSize + 1;
    const end = config.total === 0 ? 0 : Math.min(config.total, config.page * config.pageSize);
    const currentCount = config.currentCount ?? (config.total === 0 ? 0 : end - start + 1);

    return (
        <Card withBorder>
            <Group justify="space-between" align="center">
                <Text size="sm" c="dimmed">
                    {(config.label ?? t('pagination.label'))}
                    {': '}
                    {config.total === 0
                        ? t('pagination.none')
                        : t('pagination.summary', { start, end, total: config.total })}
                    {' '}
                    ({t('pagination.currentCount', { count: currentCount })})
                </Text>
                <Group gap="sm" align="center">
                    {config.pageSizeOptions && config.pageSizeOptions.length > 0 && (
                        <Select
                            size="xs"
                            data={config.pageSizeOptions.map((option) => ({ value: String(option), label: t('pagination.perPage', { count: option }) }))}
                            value={String(config.pageSize)}
                            onChange={(value) => {
                                if (!value) {
                                    return;
                                }
                                config.onPageSizeChange?.(Number(value));
                            }}
                            maw={150}
                            disabled={config.isDisabled}
                        />
                    )}
                    <Pagination
                        total={totalPages}
                        value={Math.min(config.page, totalPages)}
                        onChange={config.onPageChange}
                        size="sm"
                        disabled={config.isDisabled || config.total === 0}
                    />
                </Group>
            </Group>
        </Card>
    );
}

function getOperatorsForField(field?: FilterFieldDefinition) {
    if (!field) {
        return DEFAULT_TEXT_OPERATORS;
    }

    switch (field.type) {
        case 'text':
            return field.operators ?? DEFAULT_TEXT_OPERATORS;
        case 'number':
            return field.operators ?? DEFAULT_NUMBER_OPERATORS;
        case 'date':
            return field.operators ?? DEFAULT_DATE_OPERATORS;
        case 'tag':
            return field.operators ?? DEFAULT_TAG_OPERATORS;
        case 'empty':
            return field.operators ?? DEFAULT_EMPTY_OPERATORS;
        case 'boolean':
            return field.operators ?? DEFAULT_BOOLEAN_OPERATORS;
        default:
            return DEFAULT_TEXT_OPERATORS;
    }
}

function createDefaultCondition(field: FilterFieldDefinition): FilterCondition {
    switch (field.type) {
        case 'text': {
            const textField = field as TextFilterFieldDefinition;
            const operator = textField.operators?.[0] ?? DEFAULT_TEXT_OPERATORS[0];
            return {
                type: 'text',
                field: textField.field,
                operator,
                value: '',
            } satisfies TextFilterCondition;
        }
        case 'number': {
            const numberField = field as NumberFilterFieldDefinition;
            const operator = numberField.operators?.[0] ?? DEFAULT_NUMBER_OPERATORS[0];
            return {
                type: 'number',
                field: numberField.field,
                operator,
                value: operator === 'between'
                    ? { min: numberField.min ?? 0, max: numberField.max ?? 0 }
                    : numberField.min ?? 0,
            } satisfies NumberFilterCondition;
        }
        case 'date': {
            const dateField = field as DateFilterFieldDefinition;
            const operator = dateField.operators?.[0] ?? DEFAULT_DATE_OPERATORS[0];
            return {
                type: 'date',
                field: dateField.field,
                operator,
                value: operator === 'between'
                    ? ensureDateRange(undefined)
                    : ensureDateRange(undefined),
            } satisfies DateFilterCondition;
        }
        case 'tag': {
            const tagField = field as TagFilterFieldDefinition;
            const operator = tagField.operators?.[0] ?? DEFAULT_TAG_OPERATORS[0];
            return {
                type: 'tag',
                field: tagField.field,
                operator,
                value: [],
            } satisfies TagFilterCondition;
        }
        case 'boolean': {
            const booleanField = field as BooleanFilterFieldDefinition;
            const operator = booleanField.operators?.[0] ?? DEFAULT_BOOLEAN_OPERATORS[0];
            return {
                type: 'boolean',
                field: booleanField.field,
                operator,
                value: true,
            } satisfies BooleanFilterCondition;
        }
        case 'empty':
        default: {
            const operator = field.operators?.[0] ?? DEFAULT_EMPTY_OPERATORS[0];
            return {
                type: 'empty',
                field: field.field,
                operator,
            } satisfies EmptyFilterCondition;
        }
    }
}

function updateConditionOperator(
    condition: FilterCondition,
    operator: string,
): FilterCondition {
    switch (condition.type) {
        case 'text':
            return {
                ...condition,
                operator: operator as TextFilterOperator,
            } satisfies TextFilterCondition;
        case 'number': {
            const numberCondition = condition as NumberFilterCondition;
            if (operator === 'between') {
                return {
                    ...numberCondition,
                    operator: operator as NumberFilterOperator,
                    value: ensureNumberRange(numberCondition.value),
                } satisfies NumberFilterCondition;
            }
            return {
                ...numberCondition,
                operator: operator as NumberFilterOperator,
                value: typeof numberCondition.value === 'number' ? numberCondition.value : numberCondition.value.min,
            } satisfies NumberFilterCondition;
        }
        case 'date':
            return {
                ...condition,
                operator: operator as DateFilterOperator,
                value: operator === 'between'
                    ? ensureDateRange((condition as DateFilterCondition).value)
                    : ensureDateRange((condition as DateFilterCondition).value),
            } satisfies DateFilterCondition;
        case 'tag':
            return {
                ...condition,
                operator: operator as TagFilterOperator,
            } satisfies TagFilterCondition;
        case 'boolean':
            return {
                ...condition,
                operator: operator as BooleanFilterOperator,
            } satisfies BooleanFilterCondition;
        case 'empty':
        default:
            return {
                ...condition,
                operator: operator as EmptyFilterOperator,
            } satisfies EmptyFilterCondition;
    }
}

function operatorLabel(operator: string): string {
    switch (operator) {
        case 'contains':
            return 'contains';
        case 'equals':
            return 'equals';
        case 'startsWith':
            return 'starts with';
        case 'endsWith':
            return 'ends with';
        case 'notContains':
            return 'does not contain';
        case 'notEquals':
            return 'does not equal';
        case 'greaterThan':
            return 'greater than';
        case 'greaterThanOrEqual':
            return 'greater than or equal';
        case 'lessThan':
            return 'less than';
        case 'lessThanOrEqual':
            return 'less than or equal';
        case 'between':
            return 'between';
        case 'before':
            return 'before';
        case 'after':
            return 'after';
        case 'includesAny':
            return 'includes any';
        case 'includesAll':
            return 'includes all';
        case 'excludes':
            return 'excludes';
        case 'isEmpty':
            return 'is empty';
        case 'isNotEmpty':
            return 'is not empty';
        case 'is':
            return 'is';
        case 'isNot':
            return 'is not';
        default:
            return operator;
    }
}

function ensureNumberRange(value: NumberFilterCondition['value']): { min: number; max: number } {
    if (value && typeof value === 'object' && 'min' in value && 'max' in value) {
        return { min: Number(value.min) || 0, max: Number(value.max) || 0 };
    }
    const numeric = Number(value) || 0;
    return { min: numeric, max: numeric };
}

function ensureDateRange(value: DateFilterCondition['value'] | undefined): DateRange {
    if (value && !isRelativeRange(value)) {
        const start = parseDateSafe(value.start) ?? new Date();
        const end = parseDateSafe(value.end) ?? start;
        return {
            start: start.toISOString(),
            end: end.toISOString(),
        };
    }
    const now = new Date();
    return {
        start: now.toISOString(),
        end: now.toISOString(),
    } satisfies DateRange;
}

function isRelativeRange(value: DateFilterCondition['value']): value is RelativeDateRange {
    return Boolean(value) && typeof value === 'object' && 'direction' in value;
}

function parseDateSafe(value: string | undefined): Date | undefined {
    if (!value) {
        return undefined;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function convertConditionValueToPickerValue(condition: DateFilterCondition): Date | [Date | null, Date | null] | null {
    const value = condition.value;
    if (isRelativeRange(value)) {
        return null;
    }

    if (condition.operator === 'between') {
        const start = parseDateSafe(value.start) ?? new Date();
        const end = parseDateSafe(value.end) ?? start;
        return [start, end] as [Date | null, Date | null];
    }

    const single = parseDateSafe(value.start) ?? new Date();
    return single;
}

function convertPickerValueToConditionValue(
    pickerValue: Date | [Date | null, Date | null] | null,
    condition: DateFilterCondition,
): DateFilterCondition['value'] {
    if (condition.operator === 'between') {
        const [start, end] = Array.isArray(pickerValue) ? pickerValue : [null, null];
        const safeStart = start ?? new Date();
        const safeEnd = end ?? safeStart;
        return {
            start: safeStart.toISOString(),
            end: safeEnd.toISOString(),
        } satisfies DateRange;
    }

    const single = (pickerValue as Date | null) ?? new Date();
    const iso = single.toISOString();
    return {
        start: iso,
        end: iso,
    } satisfies DateRange;
}
