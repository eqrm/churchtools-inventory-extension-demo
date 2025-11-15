import type { ReactNode } from 'react';
import {
    ActionIcon,
    Badge,
    Button,
    Group,
    Loader,
    Menu,
    SegmentedControl,
    Select,
    Title,
} from '@mantine/core';
import { IconDots, IconFilter, IconPencil, IconPlus, IconTrash } from '@tabler/icons-react';
import type { SavedViewSummary } from '../../types/dataView';
import type { DataViewMode } from './types';
import { useTranslation } from 'react-i18next';

export interface SavedViewsConfig {
    views: SavedViewSummary[];
    activeViewId?: string;
    isLoading?: boolean;
    onSelectView: (viewId: string) => void;
    onCreateView?: () => void;
    onRenameView?: (viewId: string) => void;
    onDeleteView?: (viewId: string) => void;
}

export interface DataViewHeaderProps {
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
    savedViewsConfig?: SavedViewsConfig;
}

export function DataViewHeader({
    title,
    mode,
    availableModes = ['table'],
    onModeChange,
    filtersOpen,
    onToggleFilters,
    hasActiveFilters,
    activeFilterCount,
    showFilterButton = true,
    primaryAction,
    actions,
    savedViewsConfig,
}: DataViewHeaderProps) {
    const { t } = useTranslation('views');
    const showModeSwitcher = availableModes.length > 1 && typeof onModeChange === 'function';
    const savedViewOptions = savedViewsConfig?.views.map((view) => ({ value: view.id, label: view.name })) ?? [];
    const activeSavedViewId = savedViewsConfig?.activeViewId ?? null;
    const hasSavedViews = savedViewOptions.length > 0;
    const canManageCurrentSavedView = Boolean(
        savedViewsConfig?.activeViewId && (savedViewsConfig.onRenameView || savedViewsConfig.onDeleteView),
    );

    const handleSelectSavedView = (value: string | null) => {
        if (!value || !savedViewsConfig) {
            return;
        }
        savedViewsConfig.onSelectView(value);
    };

    const handleRenameSavedView = () => {
        if (savedViewsConfig?.onRenameView && savedViewsConfig.activeViewId) {
            savedViewsConfig.onRenameView(savedViewsConfig.activeViewId);
        }
    };

    const handleDeleteSavedView = () => {
        if (savedViewsConfig?.onDeleteView && savedViewsConfig.activeViewId) {
            savedViewsConfig.onDeleteView(savedViewsConfig.activeViewId);
        }
    };

    return (
        <Group justify="space-between" align="center">
            <Group gap="md" align="center">
                <Title order={2}>{title}</Title>
                {savedViewsConfig && (
                    <Group gap="xs" align="center">
                        <Select
                            size="xs"
                            data={savedViewOptions}
                            value={activeSavedViewId}
                            onChange={handleSelectSavedView}
                            placeholder={hasSavedViews
                                ? t('header.savedViewsPlaceholder')
                                : t('header.noSavedViewsPlaceholder')}
                            disabled={!hasSavedViews || savedViewsConfig.isLoading}
                            comboboxProps={{ withinPortal: true }}
                            w={220}
                            rightSection={savedViewsConfig.isLoading ? <Loader size="xs" /> : undefined}
                            nothingFoundMessage={t('header.nothingFound')}
                        />
                        {savedViewsConfig.onCreateView && (
                            <ActionIcon
                                size="sm"
                                variant="subtle"
                                onClick={savedViewsConfig.onCreateView}
                                aria-label={t('header.createSavedView')}
                                disabled={Boolean(savedViewsConfig.isLoading)}
                            >
                                <IconPlus size={16} />
                            </ActionIcon>
                        )}
                        {canManageCurrentSavedView && (
                            <Menu withinPortal position="bottom-start" shadow="sm">
                                <Menu.Target>
                                    <ActionIcon
                                        size="sm"
                                        variant="subtle"
                                        aria-label={t('header.manageSavedView')}
                                        disabled={Boolean(savedViewsConfig?.isLoading)}
                                    >
                                        <IconDots size={16} />
                                    </ActionIcon>
                                </Menu.Target>
                                <Menu.Dropdown>
                                    {savedViewsConfig.onRenameView && (
                                        <Menu.Item leftSection={<IconPencil size={14} />} onClick={handleRenameSavedView}>
                                            {t('header.renameSavedView')}
                                        </Menu.Item>
                                    )}
                                    {savedViewsConfig.onDeleteView && (
                                        <Menu.Item
                                            color="red"
                                            leftSection={<IconTrash size={14} />}
                                            onClick={handleDeleteSavedView}
                                        >
                                            {t('header.deleteSavedView')}
                                        </Menu.Item>
                                    )}
                                </Menu.Dropdown>
                            </Menu>
                        )}
                    </Group>
                )}
                {showModeSwitcher && (
                    <SegmentedControl
                        size="xs"
                        value={mode}
                        onChange={(value) => onModeChange(value as DataViewMode)}
                        data={availableModes.map((value) => ({
                            value,
                            label: t(`modes.${value}`),
                        }))}
                    />
                )}
            </Group>

            <Group gap="sm" align="center">
                {showFilterButton && (
                    <Button
                        variant={filtersOpen ? 'filled' : 'default'}
                        leftSection={<IconFilter size={16} />}
                        onClick={onToggleFilters}
                    >
                        {t('header.filter')}
                        {hasActiveFilters && activeFilterCount && activeFilterCount > 0 && (
                            <Badge size="xs" circle ml="xs">
                                {activeFilterCount}
                            </Badge>
                        )}
                    </Button>
                )}

                {actions}

                {primaryAction && (
                    <Button
                        leftSection={primaryAction.icon}
                        onClick={primaryAction.onClick}
                        disabled={primaryAction.disabled}
                    >
                        {primaryAction.label}
                    </Button>
                )}
            </Group>
        </Group>
    );
}
