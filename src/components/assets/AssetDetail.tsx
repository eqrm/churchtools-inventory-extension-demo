 
import {
  Badge,
  Box,
  Button,
  Card,
  Divider,
  Grid,
  Group,
  Modal,
  Stack,
  Tabs,
  Text,
  TextInput,
  Textarea,
  Title,
  Tooltip,
  AspectRatio,
  Image,
  Avatar,
  ActionIcon,
  Collapse,
  useMantineTheme,
  Menu,
  HoverCard,
} from '@mantine/core';
import {
  IconCalendar,
  IconChevronDown,
  IconChevronUp,
  IconDownload,
  IconEdit,
  IconHash,
  IconHistory,
  IconInfoCircle,
  IconLocation,
  IconPackage,
  IconPrinter,
  IconRefresh,
  IconTag,
  IconUser,
  IconTools,
  IconUsersGroup,
  IconUsersPlus,
  IconUsers,
  IconTags,
  IconDots,
  IconCopy,
} from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { notifications } from '@mantine/notifications';
import { useAsset, useAssets, useRegenerateBarcode } from '../../hooks/useAssets';
import { useChangeHistory } from '../../hooks/useChangeHistory';
import { useMaintenanceRecords, useMaintenanceSchedule } from '../../hooks/useMaintenance';
import { useCategories } from '../../hooks/useCategories';
import { useAssignments } from '../../hooks/useAssignments';
import { AssetStatusMenu } from './AssetStatusMenu';
import { personSearchService } from '../../services/person/PersonSearchService';
import type { PersonSearchResult } from '../../services/person/PersonSearchService';
import { BarcodeDisplay } from '../scanner/BarcodeDisplay';
import { QRCodeDisplay } from '../scanner/QRCodeDisplay';
import { ChangeHistoryList } from './ChangeHistoryList';
import { ParentAssetLink } from './ParentAssetLink';
import { ChildAssetsList } from './ChildAssetsList';
import { ParentSummaryStatistics } from './ParentSummaryStatistics';
import { AssetMaintenanceHistory } from './AssetMaintenanceHistory';
import { MaintenanceRecordList } from '../maintenance/MaintenanceRecordList';
import { MaintenanceReminderBadge } from '../maintenance/MaintenanceReminderBadge';
import { formatScheduleDescription } from '../../utils/maintenanceCalculations';
import type { Asset, AssetGroupFieldSource, AssetStatus } from '../../types/entities';
import type { Tag, InheritedTag } from '../../types/tag';
import { AssetGroupBadge } from '../asset-groups/AssetGroupBadge';
import { AssetGroupDetail } from '../asset-groups/AssetGroupDetail';
import { ConvertAssetToGroupModal } from '../asset-groups/ConvertAssetToGroupModal';
import { JoinAssetGroupModal } from '../asset-groups/JoinAssetGroupModal';
import { useAssetGroup, useRemoveAssetFromGroup } from '../../hooks/useAssetGroups';
import { useFeatureSettingsStore } from '../../stores';
import { RepairHistoryTab } from '../damage/RepairHistoryTab';
import { DamageReportForm, type DamageReportFormData } from '../damage/DamageReportForm';
import { useDamageReports } from '../../hooks/useDamageReports';
import { AssignmentField } from '../assignment/AssignmentField';
import { AssetAssignmentList } from './AssetAssignmentList';
import type { PersonResult } from '../assignment/PersonSearch';
import type { AssignmentTarget } from '../../types/assignment';
import { useUpdateAsset } from '../../hooks/useAssets';
import { PropertyInheritanceIndicator } from '../kits/PropertyInheritanceIndicator';
import { TagInput } from '../tags/TagInput';
import { TagListWithInheritance } from '../tags/InheritedTagBadge';
import { useTags, useEntityTags } from '../../hooks/useTags';
import { AssetLabelPrint } from './AssetLabelPrint';
import { KitInformationSection } from './KitInformationSection';

interface AssetDetailProps {
  assetId: string;
  onEdit?: () => void;
  onClose?: () => void;
  onDuplicate?: () => void;
}

export function AssetDetail({ assetId, onEdit, onClose, onDuplicate }: AssetDetailProps) {
  const { data: asset, isLoading, error } = useAsset(assetId);
  const { data: history = [] } = useChangeHistory(assetId, 10);
  const { data: allAssets = [] } = useAssets();
  const { data: categories = [] } = useCategories();
  const { data: maintenanceRecords = [] } = useMaintenanceRecords(assetId);
  const { data: maintenanceSchedule } = useMaintenanceSchedule(assetId);
  const [barcodeHistoryExpanded, setBarcodeHistoryExpanded] = useState(() => {
    const saved = localStorage.getItem(`churchtools-inventory-barcode-history-expanded-${assetId}`);
    return saved ? JSON.parse(saved) : false;
  });
  const [groupDetailOpened, setGroupDetailOpened] = useState(false);
  const [convertGroupOpened, setConvertGroupOpened] = useState(false);
  const [joinGroupOpened, setJoinGroupOpened] = useState(false);
  const [damageModalOpened, setDamageModalOpened] = useState(false);
  const removeAssetFromGroup = useRemoveAssetFromGroup();
  const { data: assetGroupDetail } = useAssetGroup(asset?.assetGroup?.id);
  const maintenanceEnabled = useFeatureSettingsStore((state) => state.maintenanceEnabled);
  const { markReportAsRepaired, createDamageReport, isCreatingReport, isRepairing } = useDamageReports(assetId);
  const { t: tDamage } = useTranslation('damage');
  const [searchParams, setSearchParams] = useSearchParams();
  const routeGroupId = searchParams.get('groupId');
  const routeShowGroup = searchParams.get('showGroup');
  const assetGroupId = asset?.assetGroup?.id ?? null;

  // Assignment hooks
  const { currentAssignment, assignToTarget, checkIn, isAssigning, isCheckingIn } = useAssignments(assetId);
  const updateAsset = useUpdateAsset();
  const assignmentFieldRef = useRef<HTMLDivElement>(null);

  // Tags hooks
  const { tags: availableTags = [], isLoading: tagsLoading } = useTags();
  const {
    tags: entityTags,
    applyTag,
    removeTag,
    isApplying,
    isRemoving,
  } = useEntityTags('asset', assetId);
  const { t: tTags } = useTranslation('tags');
  const { t: tAssets } = useTranslation('assets');

  const directTags = entityTags ?? [];
  const inheritedTagEntries = (asset?.inheritedTags ?? [])
    .map((inherited) => {
      const tag = availableTags.find((t) => t.id === inherited.tagId);
      if (!tag) {
        return null;
      }
      return { tag, inheritedFrom: inherited };
    })
    .filter((entry): entry is { tag: Tag; inheritedFrom: InheritedTag } => entry !== null);

  useEffect(() => {
    if (!assetGroupId) {
      if (groupDetailOpened || routeGroupId || routeShowGroup) {
        setGroupDetailOpened(false);
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.delete('groupId');
          next.delete('showGroup');
          return next;
        }, { replace: true });
      }
      return;
    }

    if ((routeGroupId === assetGroupId || routeShowGroup === 'true') && !groupDetailOpened) {
      setGroupDetailOpened(true);
      return;
    }

    if (groupDetailOpened && routeGroupId !== assetGroupId) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('groupId', assetGroupId);
        next.delete('showGroup');
        return next;
      }, { replace: true });
    }
  }, [assetGroupId, groupDetailOpened, routeGroupId, routeShowGroup, setSearchParams]);

  const openGroupDetail = () => {
    const group = asset?.assetGroup;
    if (!group) {
      return;
    }
    setGroupDetailOpened(true);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('groupId', group.id);
      next.delete('showGroup');
      return next;
    }, { replace: true });
  };

  const closeGroupDetail = () => {
    setGroupDetailOpened(false);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('groupId');
      next.delete('showGroup');
      return next;
    }, { replace: true });
  };

  // Persist barcode history expansion state to localStorage
  useEffect(() => {
    localStorage.setItem(`churchtools-inventory-barcode-history-expanded-${assetId}`, JSON.stringify(barcodeHistoryExpanded));
  }, [barcodeHistoryExpanded, assetId]);

  if (isLoading) {
    return (
      <Card withBorder>
        <Text>Loading asset details...</Text>
      </Card>
    );
  }

  if (error || !asset) {
    return (
      <Card withBorder>
        <Text c="red">Error loading asset: {error?.message || 'Asset not found'}</Text>
      </Card>
    );
  }

  const handleLeaveGroup = async () => {
    if (!asset.assetGroup) {
      return;
    }

    const confirmed = window.confirm(`Remove "${asset.name}" from ${asset.assetGroup.name}?`);
    if (!confirmed) {
      return;
    }

    try {
      await removeAssetFromGroup.mutateAsync(asset.id);
      notifications.show({
        title: 'Asset removed from group',
        message: `${asset.name} no longer inherits fields from ${asset.assetGroup.name}.`,
        color: 'green',
      });
    } catch (err) {
      notifications.show({
        title: 'Unable to remove asset',
        message: err instanceof Error ? err.message : 'Unexpected error occurred.',
        color: 'red',
      });
    }
  };

  const inheritedFieldCount = assetGroupDetail
    ? Object.values(assetGroupDetail.inheritanceRules ?? {}).reduce<number>((count, rule) => {
        if (rule && typeof rule === 'object' && 'inherited' in rule) {
          return count + (rule.inherited ? 1 : 0);
        }
        return count;
      }, 0)
    : 0;

  const handleGroupConverted = () => {
    setGroupDetailOpened(true);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('showGroup', 'true');
      return next;
    }, { replace: true });
  };

  const handleGroupJoined = () => {
    setGroupDetailOpened(true);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('showGroup', 'true');
      return next;
    }, { replace: true });
  };

  const fieldSources = asset.fieldSources ?? {};
  const groupName = asset.assetGroup?.name;
  const renderFieldSourceIndicator = (fieldKey: string) => (
    <FieldSourceIndicator source={fieldSources[fieldKey]} groupName={groupName} />
  );
  const categoryDefinition = categories.find((c) => c.id === asset.assetType.id);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const InfoRow = ({ 
    icon, 
    label, 
    value, 
    fieldKey,
    kitInheritanceProperty 
  }: { 
    icon: React.ReactNode; 
    label: string; 
    value: React.ReactNode; 
    fieldKey?: string;
    kitInheritanceProperty?: 'location' | 'status' | 'tags';
  }) => (
    <Group gap="xs" wrap="nowrap">
      <Box c="dimmed" style={{ display: 'flex', alignItems: 'center' }}>
        {icon}
      </Box>
      <Box style={{ flex: 1 }}>
        <Group gap={4} align="center">
          <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
            {label}
          </Text>
          {fieldKey ? renderFieldSourceIndicator(fieldKey) : null}
          {kitInheritanceProperty && asset.kitId ? (
            <PropertyInheritanceIndicator 
              assetId={asset.id} 
              property={kitInheritanceProperty} 
            />
          ) : null}
        </Group>
        <Box>
          {value ? (
            typeof value === 'string' ? (
              <Text size="sm">{value}</Text>
            ) : (
              value
            )
          ) : (
            <Text size="sm" c="dimmed">—</Text>
          )}
        </Box>
      </Box>
    </Group>
  );

  return (
    <>
      {asset.assetGroup && (
        <Modal
          opened={groupDetailOpened}
          onClose={closeGroupDetail}
          title="Asset Model Details"
          size="xl"
        >
          <AssetGroupDetail groupId={asset.assetGroup.id} />
        </Modal>
      )}
      <ConvertAssetToGroupModal
        asset={asset}
        opened={convertGroupOpened}
        onClose={() => setConvertGroupOpened(false)}
        onConverted={handleGroupConverted}
      />
      <JoinAssetGroupModal
        asset={asset}
        opened={joinGroupOpened}
        onClose={() => setJoinGroupOpened(false)}
        onJoined={handleGroupJoined}
      />
      <Modal
        opened={damageModalOpened}
        onClose={() => setDamageModalOpened(false)}
        title={tDamage('modal.title')}
        size="md"
      >
        <DamageReportForm
          assetId={assetId}
          onSubmit={async (data: DamageReportFormData) => {
            try {
              await createDamageReport(data);
              await updateAsset.mutateAsync({
                id: asset.id,
                data: { status: 'broken' },
              });
              setDamageModalOpened(false);
              notifications.show({
                title: tDamage('notifications.reportSuccessTitle'),
                message: tDamage('notifications.reportSuccessMessage'),
                color: 'green',
              });
            } catch (error) {
              const fallbackMessage = tDamage('notifications.reportErrorMessage');
              const message = error instanceof Error && error.message ? error.message : fallbackMessage;
              notifications.show({
                title: tDamage('notifications.reportErrorTitle'),
                message,
                color: 'red',
              });
            }
          }}
          onCancel={() => setDamageModalOpened(false)}
          loading={isCreatingReport}
        />
      </Modal>
      
      <Stack gap="lg">
        {/* Compact Header */}
        <Group justify="space-between" wrap="nowrap">
          <Group gap="md">
            <Title order={2} style={{ fontWeight: 600 }}>{asset.name}</Title>
            <Badge size="lg" variant="light" color="gray">
              {asset.assetNumber}
            </Badge>
            <AssetStatusMenu
              asset={asset}
              size="md"
              onStatusChange={async (newStatus: AssetStatus) => {
                try {
                  await updateAsset.mutateAsync({
                    id: asset.id,
                    data: { status: newStatus },
                  });
                  notifications.show({
                    title: 'Status Updated',
                    message: `Asset status changed to ${newStatus}`,
                    color: 'green',
                  });
                } catch (error) {
                  notifications.show({
                    title: 'Error',
                    message: error instanceof Error ? error.message : 'Failed to update status',
                    color: 'red',
                  });
                }
              }}
              onAssignClick={() => {
                assignmentFieldRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              onBrokenClick={() => {
                setDamageModalOpened(true);
              }}
            />
          </Group>
          
          <Group gap="xs">
            {onEdit && (
              <Tooltip label="Edit asset">
                <ActionIcon variant="default" size="lg" onClick={onEdit}>
                  <IconEdit size={18} />
                </ActionIcon>
              </Tooltip>
            )}
            <Menu shadow="md" width={220} position="bottom-end" withinPortal>
              <Menu.Target>
                <ActionIcon variant="default" size="lg">
                  <IconDots size={18} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                {onDuplicate && (
                  <>
                    <Menu.Item leftSection={<IconCopy size={16} />} onClick={onDuplicate}>
                      Duplicate Asset
                    </Menu.Item>
                    <Menu.Divider />
                  </>
                )}
                {!asset.assetGroup && (
                  <>
                    <Menu.Item
                      leftSection={<IconUsersPlus size={16} />}
                      onClick={() => setConvertGroupOpened(true)}
                    >
                      Create Asset Model
                    </Menu.Item>
                    <Menu.Item
                      leftSection={<IconUsersGroup size={16} />}
                      onClick={() => setJoinGroupOpened(true)}
                    >
                      Join Existing Model
                    </Menu.Item>
                  </>
                )}
                {onClose && (
                  <>
                    <Menu.Divider />
                    <Menu.Item onClick={onClose}>Close</Menu.Item>
                  </>
                )}
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>

      {/* T260 - E3: Tabbed interface with Overview and History tabs */}
      <Tabs defaultValue="overview">
        <Tabs.List>
          <Tabs.Tab value="overview" leftSection={<IconInfoCircle size={16} />}>
            Overview
          </Tabs.Tab>
          <Tabs.Tab value="maintenance-damage" leftSection={<IconTools size={16} />}>
            {maintenanceEnabled ? 'Maintenance & Damage' : 'Damage & Repairs'}
          </Tabs.Tab>
          <Tabs.Tab value="history" leftSection={<IconHistory size={16} />}>
            History {history.length > 0 && <Badge size="xs" circle ml={4}>{history.length}</Badge>}
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview" pt="md">
          <Grid>
            {/* Main Content - 2/3 width */}
            <Grid.Col span={{ base: 12, lg: 8 }}>
              <Stack gap="md">
                {/* Parent/Child Relationships */}
                {asset.parentAssetId && <ParentAssetLink parentAssetId={asset.parentAssetId} />}
                {asset.isParent && (
                  <>
                    <ParentSummaryStatistics childAssets={allAssets.filter(a => a.parentAssetId === asset.id)} />
                    <ChildAssetsList parentAsset={asset} />
                  </>
                )}

                {/* Kit Information */}
                {asset.isKit && <KitInformationSection asset={asset} />}

                {/* Asset Model Card - Compact */}
                {asset.assetGroup && (
                  <Card withBorder p="md">
                    <Group justify="space-between" wrap="nowrap">
                      <Group gap="sm">
                        <IconUsers size={20} style={{ flexShrink: 0 }} />
                        <div>
                          <Text size="sm" fw={600}>{asset.assetGroup.name}</Text>
                          {assetGroupDetail && (
                            <Text size="xs" c="dimmed">
                              {assetGroupDetail.memberCount} members · {inheritedFieldCount} inherited
                            </Text>
                          )}
                        </div>
                      </Group>
                      <Group gap="xs">
                        <Tooltip label="View model">
                          <ActionIcon variant="light" onClick={openGroupDetail}>
                            <IconUsersGroup size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Leave model">
                          <ActionIcon 
                            variant="subtle" 
                            color="red" 
                            loading={removeAssetFromGroup.isPending}
                            onClick={() => void handleLeaveGroup()}
                          >
                            <IconUsers size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Group>
                  </Card>
                )}

                {/* Photo */}
                {asset.mainImage && asset.mainImage.trim() !== '' && (
                  <HoverCard position="right" shadow="md" withinPortal openDelay={200} closeDelay={100}>
                    <HoverCard.Target>
                      <Card
                        withBorder
                        p="sm"
                        radius="md"
                        style={{ overflow: 'hidden', cursor: 'zoom-in', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 120 }}
                      >
                        <Image 
                          src={asset.mainImage} 
                          alt={asset.name} 
                          fit="contain"
                          h={100}
                          w="auto"
                        />
                      </Card>
                    </HoverCard.Target>
                    <HoverCard.Dropdown p={0} style={{ border: 'none', background: 'transparent' }}>
                      <Card withBorder p="sm" radius="md" style={{ overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <Image 
                          src={asset.mainImage} 
                          alt={asset.name} 
                          fit="contain"
                          h={400}
                          w="auto"
                        />
                      </Card>
                    </HoverCard.Dropdown>
                  </HoverCard>
                )}

                {/* Core Info - Compact Grid */}
                <Card withBorder p="md">
                  <Stack gap="md">
                    <Grid gutter="md">
                      <Grid.Col span={6}>
                        <Group gap="xs" wrap="nowrap">
                          <IconTag size={18} style={{ color: 'var(--mantine-color-dimmed)' }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <Text size="xs" c="dimmed" mb={2}>Type</Text>
                            <Group gap={4}>
                              <Badge variant="light" style={{ justifyContent: 'flex-start' }}>
                                {asset.assetType.name}
                              </Badge>
                              {asset.isKit && (
                                <Badge variant="light" color="violet">
                                  KIT
                                </Badge>
                              )}
                            </Group>
                          </div>
                        </Group>
                      </Grid.Col>
                      <Grid.Col span={6}>
                        <Group gap="xs" wrap="nowrap">
                          <IconLocation size={18} style={{ color: 'var(--mantine-color-dimmed)' }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <Group gap={4} mb={2}>
                              <Text size="xs" c="dimmed">Location</Text>
                              {asset.kitId && <PropertyInheritanceIndicator assetId={asset.id} property="location" />}
                            </Group>
                            <Text size="sm" truncate>{asset.location || '—'}</Text>
                          </div>
                        </Group>
                      </Grid.Col>
                      {(asset.manufacturer || asset.model) && (
                        <>
                          <Grid.Col span={6}>
                            <Group gap="xs" wrap="nowrap">
                              <IconPackage size={18} style={{ color: 'var(--mantine-color-dimmed)' }} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <Text size="xs" c="dimmed" mb={2}>Manufacturer</Text>
                                <Text size="sm" truncate>{asset.manufacturer || '—'}</Text>
                              </div>
                            </Group>
                          </Grid.Col>
                          <Grid.Col span={6}>
                            <Group gap="xs" wrap="nowrap">
                              <IconPackage size={18} style={{ color: 'var(--mantine-color-dimmed)' }} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <Text size="xs" c="dimmed" mb={2}>Model</Text>
                                <Text size="sm" truncate>{asset.model || '—'}</Text>
                              </div>
                            </Group>
                          </Grid.Col>
                        </>
                      )}
                    </Grid>

                    {asset.description && (
                      <>
                        <Divider />
                        <Box>
                          <Group gap={4} mb={4}>
                            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Description</Text>
                            {renderFieldSourceIndicator('description')}
                          </Group>
                          <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{asset.description}</Text>
                        </Box>
                      </>
                    )}
                  </Stack>
                </Card>

                {/* Assignment - Compact */}
                <Card withBorder p="md" ref={assignmentFieldRef}>
                  <Stack gap="sm">
                    <Group gap="xs">
                      <IconUser size={18} />
                      <Text size="sm" fw={600}>Assignment</Text>
                    </Group>
                    <AssignmentField
                      currentAssignment={currentAssignment}
                      onSearchPerson={async (query: string): Promise<PersonResult[]> => {
                        const response = await personSearchService.search({ query, limit: 10, domainTypes: ['person'] });
                        return response.results.map((r: PersonSearchResult) => ({
                          id: r.id,
                          firstName: r.firstName,
                          lastName: r.lastName,
                          email: r.email,
                          avatarUrl: r.avatarUrl,
                        }));
                      }}
                      onAssign={async (personId: string, personName: string) => {
                        try {
                          const target: AssignmentTarget = { type: 'person', id: personId, name: personName };
                          await assignToTarget(target);
                          notifications.show({
                            title: 'Asset Assigned',
                            message: `Assigned to ${personName}`,
                            color: 'green',
                          });
                        } catch (error) {
                          notifications.show({
                            title: 'Assignment Failed',
                            message: error instanceof Error ? error.message : 'Unknown error',
                            color: 'red',
                          });
                        }
                      }}
                      onCheckIn={async () => {
                        try {
                          await checkIn();
                          notifications.show({
                            title: 'Checked In',
                            message: 'Asset returned successfully',
                            color: 'green',
                          });
                        } catch (error) {
                          notifications.show({
                            title: 'Check-in Failed',
                            message: error instanceof Error ? error.message : 'Unknown error',
                            color: 'red',
                          });
                        }
                      }}
                      loading={isAssigning || isCheckingIn}
                    />
                  </Stack>
                </Card>

                {/* Tags - Compact */}
                <Card withBorder p="md">
                  <Stack gap="sm">
                    <Group gap="xs">
                      <IconTags size={18} />
                      <Text size="sm" fw={600}>Tags</Text>
                      {asset.kitId && <PropertyInheritanceIndicator assetId={asset.id} property="tags" />}
                    </Group>
                    {(directTags.length > 0 || inheritedTagEntries.length > 0) ? (
                      <TagListWithInheritance
                        directTags={directTags}
                        inheritedTags={inheritedTagEntries}
                        onRemoveDirectTag={async (tagId) => {
                          try {
                            await removeTag(tagId);
                            notifications.show({
                              title: tTags('notifications.removedTitle'),
                              message: tTags('notifications.removedMessage'),
                              color: 'green',
                            });
                          } catch (error) {
                            notifications.show({
                              title: tTags('notifications.removeErrorTitle'),
                              message: error instanceof Error ? error.message : tTags('notifications.removeErrorMessage'),
                              color: 'red',
                            });
                          }
                        }}
                        disabled={isRemoving}
                        size="sm"
                        showLabels
                      />
                    ) : (
                      <Text size="sm" c="dimmed">
                        {tTags('emptyState.description')}
                      </Text>
                    )}
                    <TagInput
                      tags={availableTags}
                      selectedTagIds={directTags.map((t) => t.id)}
                      onChange={async (tagIds) => {
                        const currentIds = directTags.map((t) => t.id);
                        const toAdd = tagIds.filter(id => !currentIds.includes(id));
                        const toRemove = currentIds.filter(id => !tagIds.includes(id));
                        
                        for (const tagId of toAdd) {
                          await applyTag(tagId);
                        }
                        for (const tagId of toRemove) {
                          await removeTag(tagId);
                        }
                      }}
                      disabled={isApplying || isRemoving}
                      isLoading={tagsLoading}
                      placeholder={tTags('selectOrCreate')}
                    />
                  </Stack>
                </Card>

                {/* Custom Fields - Only if exists */}
                {categoryDefinition?.dataFields && categoryDefinition.dataFields.length > 0 && (
                  <Card withBorder p="md">
                    <Stack gap="sm">
                      <Text size="sm" fw={600}>Custom Fields</Text>
                      <Grid gutter="xs">
                        {categoryDefinition.dataFields.map((field) => {
                          const value = asset.customFields?.[field.key];
                          if (!value) return null;
                          return (
                            <Grid.Col span={6} key={field.key}>
                              <Text size="xs" c="dimmed" mb={2}>{field.name}</Text>
                              <Text size="sm">{String(value)}</Text>
                            </Grid.Col>
                          );
                        })}
                      </Grid>
                    </Stack>
                  </Card>
                )}
              </Stack>
            </Grid.Col>

            {/* Sidebar - Compact */}
            <Grid.Col span={{ base: 12, lg: 4 }}>
              <AssetDetailSidebar asset={asset} allAssets={allAssets} formatDate={formatDate} InfoRow={InfoRow} />
            </Grid.Col>
          </Grid>
        </Tabs.Panel>

        <Tabs.Panel value="maintenance-damage" pt="md">
          <Stack gap="lg">
            {/* Maintenance History Section */}
            {maintenanceEnabled && (
              <Card withBorder>
                <Stack gap="md">
                  <Title order={4}>Maintenance History</Title>
                  <Divider />
                  <AssetMaintenanceHistory assetId={assetId} assetName={asset.name} />
                </Stack>
              </Card>
            )}

            {/* Damage & Repairs Section */}
            <Card withBorder>
              <Stack gap="md">
                <Title order={4}>Damage & Repairs</Title>
                <Divider />
                <RepairHistoryTab
                  assetId={assetId}
                  onMarkRepaired={async (reportId, repairNotes) => {
                    await markReportAsRepaired(reportId, { repairNotes });
                    notifications.show({
                      title: 'Asset Repaired',
                      message: 'The damage report has been marked as repaired.',
                      color: 'green',
                    });
                  }}
                  loading={isRepairing}
                />
              </Stack>
            </Card>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="history" pt="md">
          <Stack gap="lg">
            {/* T286 - E2: Barcode History (Collapsible) */}
            {asset.barcodeHistory && asset.barcodeHistory.length > 0 && (
              <Card withBorder>
                <Stack gap="md">
                  <Group
                    justify="space-between"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setBarcodeHistoryExpanded(!barcodeHistoryExpanded)}
                  >
                    <Group gap="sm">
                      <Title order={5}>Barcode History</Title>
                      <Badge size="sm" variant="light">
                        {asset.barcodeHistory.length}
                      </Badge>
                    </Group>
                    {barcodeHistoryExpanded ? (
                      <IconChevronUp size={20} />
                    ) : (
                      <IconChevronDown size={20} />
                    )}
                  </Group>
                  
                  <Collapse in={barcodeHistoryExpanded}>
                    <Box>
                      <Divider />
                      <Text size="xs" c="dimmed">
                        Previous barcodes that were assigned to this asset (newest first)
                      </Text>
                      {[...asset.barcodeHistory].reverse().map((entry, index) => {
                        const historyLength = asset.barcodeHistory?.length ?? 0;
                        return (
                          <Box key={index}>
                            <Group justify="space-between" mb="xs">
                              <Text size="sm" fw={500}>{entry.barcode}</Text>
                              <Badge size="sm" variant="light">
                                Archived
                              </Badge>
                            </Group>
                            <Text size="xs" c="dimmed">
                              Generated: {formatDate(entry.generatedAt)}
                            </Text>
                            <Text size="xs" c="dimmed">
                              By: {entry.generatedByName}
                            </Text>
                            {entry.reason && (
                              <Text size="xs" c="dimmed" mt="xs">
                                Reason: {entry.reason}
                              </Text>
                            )}
                            {index < historyLength - 1 && <Divider mt="sm" />}
                          </Box>
                        );
                      })}
                    </Box>
                  </Collapse>
                </Stack>
              </Card>
            )}
            
            {/* T260 - E3: Change History */}
            <ChangeHistoryList entityType="asset" entityId={assetId} limit={100} />
          </Stack>
        </Tabs.Panel>
      </Tabs>
      </Stack>
    </>
  );
}

// Sidebar Component (extracted for clarity)
function AssetDetailSidebar({
  asset,
  allAssets,
  formatDate,
  InfoRow,
}: {
  asset: Asset;
  allAssets: Asset[];
  formatDate: (date: string) => string;
  InfoRow: ({ icon, label, value, fieldKey }: { icon: React.ReactNode; label: string; value: React.ReactNode; fieldKey?: string }) => JSX.Element;
}) {
  // T284, T285 - E2: Barcode regeneration modal state
  const [regenerateModalOpen, setRegenerateModalOpen] = useState(false);
  const [regenerateReason, setRegenerateReason] = useState('');
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [duplicateAsset, setDuplicateAsset] = useState<Asset | null>(null);
  const regenerateBarcode = useRegenerateBarcode();
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const { t: tAssets } = useTranslation('assets');
  const [labelPreviewOpen, setLabelPreviewOpen] = useState(false);
  
  // Focus the barcode input when modal opens
  useEffect(() => {
    if (regenerateModalOpen && barcodeInputRef.current) {
      // Small delay to ensure modal is fully rendered
      setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 100);
    }
  }, [regenerateModalOpen]);
  
  const handleRegenerateBarcode = () => {
    if (!scannedBarcode) {
      notifications.show({
        title: 'Error',
        message: 'Please enter a barcode',
        color: 'red',
      });
      return;
    }
    
    if (isDuplicate) {
      notifications.show({
        title: 'Error',
        message: 'Cannot use a duplicate barcode',
        color: 'red',
      });
      return;
    }
    
    regenerateBarcode.mutate(
      { 
        id: asset.id, 
        reason: regenerateReason || undefined,
        newBarcode: scannedBarcode
      },
      {
        onSuccess: () => {
          notifications.show({
            title: 'Barcode Reassigned',
            message: 'Barcode has been reassigned successfully',
            color: 'green',
          });
          setRegenerateModalOpen(false);
          setRegenerateReason('');
          setScannedBarcode('');
          setIsDuplicate(false);
          setDuplicateAsset(null);
        },
        onError: (error) => {
          notifications.show({
            title: 'Error',
            message: `Failed to reassign barcode: ${error.message}`,
            color: 'red',
          });
        },
      }
    );
  };
  
  return (
    <Stack gap="sm">
      {/* Barcode - Compact */}
      <Card withBorder p="md">
        <Stack gap="sm" align="center">
          <Box style={{ padding: '8px', backgroundColor: '#fff', borderRadius: '4px' }}>
            <BarcodeDisplay value={asset.barcode} alt={asset.barcode} width={180} />
          </Box>
          <Text size="xs" c="dimmed">{asset.barcode}</Text>
          <Group gap={4} wrap="wrap" justify="center">
            <Tooltip label="Download barcode">
              <ActionIcon
                size="sm"
                variant="light"
                onClick={() => {
                  void import('../../services/barcode/BarcodeService').then(m => {
                    const url = m.generateBarcode(asset.barcode);
                    m.downloadImage(url, `barcode-${asset.assetNumber}.png`);
                  });
                }}
              >
                <IconDownload size={14} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Print barcode">
              <ActionIcon
                size="sm"
                variant="light"
                onClick={() => {
                  void import('../../services/barcode/BarcodeService').then(m => {
                    const url = m.generateBarcode(asset.barcode);
                    m.printImage(url, `Barcode - ${asset.name}`);
                  });
                }}
              >
                <IconPrinter size={14} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Reassign barcode">
              <ActionIcon
                size="sm"
                variant="light"
                color="orange"
                onClick={() => setRegenerateModalOpen(true)}
              >
                <IconRefresh size={14} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Stack>
      </Card>

      {/* QR Code - Compact */}
      <Card withBorder p="md">
        <Stack gap="sm" align="center">
          <Box style={{ padding: '8px', backgroundColor: '#fff', borderRadius: '4px' }}>
            <QRCodeDisplay
              value={`${window.location.origin}${window.location.pathname}#/assets/${asset.id}`}
              size={140}
              alt={`QR for ${asset.assetNumber}`}
            />
          </Box>
          <Text size="xs" c="dimmed" ta="center">Scan to view details</Text>
          <Group gap={4}>
            <Tooltip label="Download QR">
              <ActionIcon
                size="sm"
                variant="light"
                onClick={() => {
                  void import('../../services/barcode/BarcodeService').then(async m => {
                    const qrUrl = await m.generateQRCode(`${window.location.origin}${window.location.pathname}#/assets/${asset.id}`);
                    m.downloadImage(qrUrl, `qr-${asset.assetNumber}.png`);
                  });
                }}
              >
                <IconDownload size={14} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Print QR">
              <ActionIcon
                size="sm"
                variant="light"
                onClick={() => {
                  void import('../../services/barcode/BarcodeService').then(async m => {
                    const qrUrl = await m.generateQRCode(`${window.location.origin}${window.location.pathname}#/assets/${asset.id}`);
                    m.printImage(qrUrl, `QR - ${asset.name}`);
                  });
                }}
              >
                <IconPrinter size={14} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Stack>
      </Card>

      {/* Print Label */}
      <Card withBorder p="md">
        <Button 
          fullWidth 
          leftSection={<IconPrinter size={16} />} 
          onClick={() => setLabelPreviewOpen(true)}
          size="sm"
        >
          Print Label
        </Button>
      </Card>

      {/* Metadata - Compact */}
      <Card withBorder p="md">
        <Stack gap="xs">
          <Group gap="xs" wrap="nowrap">
            <IconCalendar size={16} style={{ color: 'var(--mantine-color-dimmed)', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text size="xs" c="dimmed">Created</Text>
              <Text size="xs" truncate>{formatDate(asset.createdAt)}</Text>
            </div>
          </Group>
          <Group gap="xs" wrap="nowrap">
            <IconUser size={16} style={{ color: 'var(--mantine-color-dimmed)', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text size="xs" c="dimmed">By</Text>
              <Text size="xs" truncate>{asset.createdByName || '—'}</Text>
            </div>
          </Group>
          {asset.lastModifiedAt && (
            <>
              <Divider />
              <Group gap="xs" wrap="nowrap">
                <IconCalendar size={16} style={{ color: 'var(--mantine-color-dimmed)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text size="xs" c="dimmed">Updated</Text>
                  <Text size="xs" truncate>{formatDate(asset.lastModifiedAt)}</Text>
                </div>
              </Group>
              <Group gap="xs" wrap="nowrap">
                <IconUser size={16} style={{ color: 'var(--mantine-color-dimmed)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text size="xs" c="dimmed">By</Text>
                  <Text size="xs" truncate>{asset.lastModifiedByName || '—'}</Text>
                </div>
              </Group>
            </>
          )}
        </Stack>
      </Card>

      {/* T285 - E2: Barcode Reassignment Confirmation Modal */}
      <Modal
        opened={regenerateModalOpen}
        onClose={() => {
          setRegenerateModalOpen(false);
          setRegenerateReason('');
          setScannedBarcode('');
          setIsDuplicate(false);
          setDuplicateAsset(null);
        }}
        title="Reassign Barcode"
        centered
        size="md"
      >
        <Stack gap="md">
          <Text size="sm">
            Scan or type a new barcode for this asset. The system will check for duplicates. Press Enter to confirm.
          </Text>
          
          <Box>
            <Text size="sm" fw={500} mb="xs">Current Barcode:</Text>
            <Box style={{ border: '1px solid #e9ecef', padding: '12px', borderRadius: '8px', backgroundColor: '#f8f9fa', display: 'flex', justifyContent: 'center' }}>
              <BarcodeDisplay 
                value={asset.barcode}
                alt="Current barcode"
                width={150}
              />
            </Box>
          </Box>

          <Box>
            <TextInput
              ref={barcodeInputRef}
              label="New Barcode"
              placeholder="Scan or type new barcode"
              value={scannedBarcode}
              onChange={(e) => {
                const barcode = e.currentTarget.value;
                setScannedBarcode(barcode);
                
                if (barcode) {
                  // Check for duplicates
                  const duplicate = allAssets.find((a: Asset) => a.barcode === barcode && a.id !== asset.id);
                  
                  if (duplicate) {
                    setIsDuplicate(true);
                    setDuplicateAsset(duplicate);
                  } else {
                    setIsDuplicate(false);
                    setDuplicateAsset(null);
                  }
                } else {
                  setIsDuplicate(false);
                  setDuplicateAsset(null);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && scannedBarcode && !isDuplicate) {
                  handleRegenerateBarcode();
                }
              }}
              data-autofocus
              rightSection={
                scannedBarcode && (
                  isDuplicate ? (
                    <Badge color="red" size="sm">Duplicate</Badge>
                  ) : (
                    <Badge color="green" size="sm">Available</Badge>
                  )
                )
              }
              error={isDuplicate && duplicateAsset ? `Already used by ${duplicateAsset.name} (${duplicateAsset.assetNumber})` : undefined}
            />
          </Box>
          
          <Textarea
            label="Reason (optional)"
            placeholder="Why is this barcode being reassigned?"
            value={regenerateReason}
            onChange={(e) => setRegenerateReason(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.ctrlKey && scannedBarcode && !isDuplicate) {
                handleRegenerateBarcode();
              }
            }}
            minRows={2}
          />
          
          <Group justify="flex-end" gap="xs">
            <Button
              variant="default"
              onClick={() => {
                setRegenerateModalOpen(false);
                setRegenerateReason('');
                setScannedBarcode('');
                setIsDuplicate(false);
                setDuplicateAsset(null);
              }}
            >
              Cancel
            </Button>
            <Button
              color="orange"
              leftSection={<IconRefresh size={16} />}
              onClick={handleRegenerateBarcode}
              loading={regenerateBarcode.isPending}
              disabled={!scannedBarcode || isDuplicate}
            >
              Reassign Barcode
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={labelPreviewOpen} onClose={() => setLabelPreviewOpen(false)} title={tAssets('detail.labelPrintCardTitle')} size="lg">
        <AssetLabelPrint asset={asset} onClose={() => setLabelPreviewOpen(false)} />
      </Modal>
    </Stack>
  );
}

function FieldSourceIndicator({
  source,
  groupName,
}: {
  source?: AssetGroupFieldSource;
  groupName?: string;
}) {
  const theme = useMantineTheme();

  if (!source || source === 'local') {
    return null;
  }

  const colorKey: 'grape' | 'yellow' = source === 'group' ? 'grape' : 'yellow';
  const tooltip = source === 'group'
    ? `Inherited from ${groupName ?? 'group'}`
    : `Overrides ${groupName ?? 'group'} value`;
  const color = theme.colors[colorKey][6];

  return (
    <Tooltip label={tooltip} withArrow>
      <IconTags size={14} style={{ color }} aria-hidden="true" />
    </Tooltip>
  );
}

// Custom Field Display Component (handles person-reference fields)
function CustomFieldDisplay({
  icon,
  label,
  value,
  fieldType,
  fieldSource,
  groupName,
}: {
  icon: React.ReactNode;
  label: string;
  value: unknown;
  fieldType?: string;
  fieldSource?: AssetGroupFieldSource;
  groupName?: string;
}) {
  const [personData, setPersonData] = useState<PersonSearchResult | null>(null);
  const [loadingPerson, setLoadingPerson] = useState(false);

  // Fetch person data if this is a person-reference field
  useEffect(() => {
    if (fieldType === 'person-reference' && value && typeof value === 'string') {
      setLoadingPerson(true);
      personSearchService
        .getPersonById(value)
        .then(person => setPersonData(person))
        .catch(err => console.error('Failed to load person data:', err))
        .finally(() => setLoadingPerson(false));
    }
  }, [fieldType, value]);

  const renderValue = () => {
    // Handle person-reference fields
    if (fieldType === 'person-reference') {
      if (loadingPerson) {
        return <Text size="sm">Loading...</Text>;
      }
      if (personData) {
        return (
          <Group gap="xs">
            <Avatar src={personData.avatarUrl} size="sm" radius="xl" />
            <Text size="sm">{personData.displayName}</Text>
          </Group>
        );
      }
      return <Text size="sm" c="dimmed">—</Text>;
    }

    // Handle other field types
    if (!value) {
      return <Text size="sm" c="dimmed">—</Text>;
    }
    if (Array.isArray(value)) {
      return <Text size="sm">{value.join(', ')}</Text>;
    }
    if (typeof value === 'boolean') {
      return <Text size="sm">{value ? 'Yes' : 'No'}</Text>;
    }
    return <Text size="sm">{String(value)}</Text>;
  };

  return (
    <Group gap="xs" wrap="nowrap">
      <Box c="dimmed" style={{ display: 'flex', alignItems: 'center' }}>
        {icon}
      </Box>
      <Box style={{ flex: 1 }}>
        <Group gap={4} align="center">
          <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
            {label}
          </Text>
          <FieldSourceIndicator source={fieldSource} groupName={groupName} />
        </Group>
        <Box>{renderValue()}</Box>
      </Box>
    </Group>
  );
}
