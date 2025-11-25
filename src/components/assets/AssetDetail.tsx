 
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
} from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { useAsset, useAssets, useRegenerateBarcode } from '../../hooks/useAssets';
import { useChangeHistory } from '../../hooks/useChangeHistory';
import { useMaintenanceRecords, useMaintenanceSchedule } from '../../hooks/useMaintenance';
import { useCategories } from '../../hooks/useCategories';
import { AssetStatusBadge } from './AssetStatusBadge';
import { personSearchService } from '../../services/person/PersonSearchService';
import type { PersonSearchResult } from '../../services/person/PersonSearchService';
import { BarcodeDisplay } from '../scanner/BarcodeDisplay';
import { QRCodeDisplay } from '../scanner/QRCodeDisplay';
import { ChangeHistoryList } from './ChangeHistoryList';
import { ParentAssetLink } from './ParentAssetLink';
import { ChildAssetsList } from './ChildAssetsList';
import { ParentSummaryStatistics } from './ParentSummaryStatistics';
import { ConvertToParentModal } from './ConvertToParentModal';
import { AssetMaintenanceHistory } from './AssetMaintenanceHistory';
import { MaintenanceRecordList } from '../maintenance/MaintenanceRecordList';
import { MaintenanceRecordForm } from '../maintenance/MaintenanceRecordForm';
import { MaintenanceReminderBadge } from '../maintenance/MaintenanceReminderBadge';
import { formatScheduleDescription } from '../../utils/maintenanceCalculations';
import type { Asset, AssetGroupFieldSource } from '../../types/entities';
import { AssetAssignmentList } from './AssetAssignmentList';
import { AssetGroupBadge } from '../asset-groups/AssetGroupBadge';
import { AssetGroupDetail } from '../asset-groups/AssetGroupDetail';
import { ConvertAssetToGroupModal } from '../asset-groups/ConvertAssetToGroupModal';
import { JoinAssetGroupModal } from '../asset-groups/JoinAssetGroupModal';
import { useAssetGroup, useRemoveAssetFromGroup } from '../../hooks/useAssetGroups';
import { useFeatureSettingsStore } from '../../stores';

interface AssetDetailProps {
  assetId: string;
  onEdit?: () => void;
  onClose?: () => void;
}

export function AssetDetail({ assetId, onEdit, onClose }: AssetDetailProps) {
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
  const [convertToParentOpened, setConvertToParentOpened] = useState(false);
  const [maintenanceFormOpened, setMaintenanceFormOpened] = useState(false);
  const [groupDetailOpened, setGroupDetailOpened] = useState(false);
  const [convertGroupOpened, setConvertGroupOpened] = useState(false);
  const [joinGroupOpened, setJoinGroupOpened] = useState(false);
  const maintenanceHistoryCount = history.filter(entry => entry.action === 'maintenance-performed').length;
  const removeAssetFromGroup = useRemoveAssetFromGroup();
  const { data: assetGroupDetail } = useAssetGroup(asset?.assetGroup?.id);
  const maintenanceEnabled = useFeatureSettingsStore((state) => state.maintenanceEnabled);
  const [searchParams, setSearchParams] = useSearchParams();
  const routeGroupId = searchParams.get('groupId');
  const routeShowGroup = searchParams.get('showGroup');
  const assetGroupId = asset?.assetGroup?.id ?? null;

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

  const InfoRow = ({ icon, label, value, fieldKey }: { icon: React.ReactNode; label: string; value: React.ReactNode; fieldKey?: string }) => (
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
      <ConvertToParentModal
        opened={convertToParentOpened}
        onClose={() => setConvertToParentOpened(false)}
        asset={asset}
      />
      {maintenanceEnabled && (
        <Modal
          opened={maintenanceFormOpened}
          onClose={() => setMaintenanceFormOpened(false)}
          title="Record Maintenance"
          size="lg"
        >
          <MaintenanceRecordForm
            assetId={assetId}
            assetNumber={asset.assetNumber}
            assetName={asset.name}
            onSuccess={() => setMaintenanceFormOpened(false)}
          />
        </Modal>
      )}
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
      <Stack gap="md">
        <Group justify="space-between">
          <Group>
            <Group align="center">
              <Title order={2}>{asset.name}</Title>
              <Tooltip label="This asset name is autogenerated using the category template but can be edited here." withArrow>
                <ActionIcon variant="subtle">
                  <IconInfoCircle size={16} />
                </ActionIcon>
              </Tooltip>
            </Group>
            <AssetStatusBadge status={asset.status} size="md" />
          </Group>
          <Group>
            {!asset.isParent && !asset.parentAssetId && (
              <Button
                variant="light"
                size="sm"
                onClick={() => setConvertToParentOpened(true)}
              >
                Convert to Parent
              </Button>
            )}
            {onEdit && (
              <Button
                variant="default"
                leftSection={<IconEdit size={16} />}
                onClick={onEdit}
              >
                Edit
              </Button>
            )}
            {onClose && (
              <Button variant="subtle" onClick={onClose}>
                Close
              </Button>
            )}
          </Group>
        </Group>

      {/* T260 - E3: Tabbed interface with Overview and History tabs */}
      <Tabs defaultValue="overview">
        <Tabs.List>
          <Tabs.Tab value="overview" leftSection={<IconInfoCircle size={16} />}>
            Overview
          </Tabs.Tab>
          {maintenanceEnabled && (
            <Tabs.Tab value="maintenance" leftSection={<IconTools size={16} />}>
              Maintenance History
              {maintenanceHistoryCount > 0 && (
                <Badge size="sm" circle ml="xs">
                  {maintenanceHistoryCount}
                </Badge>
              )}
            </Tabs.Tab>
          )}
          <Tabs.Tab value="history" leftSection={<IconHistory size={16} />}>
            History
            {history.length > 0 && (
              <Badge size="sm" circle ml="xs">
                {history.length}
              </Badge>
            )}
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview" pt="md">
          <Grid>
            <Grid.Col span={{ base: 12, md: 8 }}>
              <Stack gap="md">
                {/* Parent Asset Link - Show on child assets */}
                {asset.parentAssetId && (
                  <ParentAssetLink parentAssetId={asset.parentAssetId} />
                )}

                {/* Parent Summary Statistics - Show on parent assets */}
                {asset.isParent && (
                  <ParentSummaryStatistics 
                    childAssets={allAssets.filter(a => a.parentAssetId === asset.id)} 
                  />
                )}

                {/* Child Assets List - Show on parent assets */}
                {asset.isParent && <ChildAssetsList parentAsset={asset} />}

                {asset.assetGroup ? (
                  <Card withBorder>
                    <Stack gap="md">
                      <Group justify="space-between" align="flex-start">
                        <Group gap="xs" align="center">
                          <IconUsers size={18} />
                          <Text fw={600}>Asset Model</Text>
                        </Group>
                        <Group gap="xs">
                          <Button
                            variant="light"
                            size="sm"
                            leftSection={<IconUsersGroup size={16} />}
                            onClick={openGroupDetail}
                          >
                            View Model
                          </Button>
                          <Button
                            variant="subtle"
                            color="red"
                            size="sm"
                            leftSection={<IconUsers size={16} />}
                            loading={removeAssetFromGroup.isPending}
                            onClick={() => {
                              void handleLeaveGroup();
                            }}
                          >
                            Leave Model
                          </Button>
                        </Group>
                      </Group>

                      <Group gap="xs" wrap="wrap">
                        <AssetGroupBadge group={asset.assetGroup} withName />
                        {assetGroupDetail && (
                          <>
                            <Badge variant="light" color="gray" leftSection={<IconUsers size={14} />}
                            >
                              {assetGroupDetail.memberCount} members
                            </Badge>
                            <Badge variant="light" color="grape">
                              {inheritedFieldCount} inherited fields
                            </Badge>
                          </>
                        )}
                      </Group>

                      <Text size="sm" c="dimmed">
                        {assetGroupDetail
                          ? 'This asset inherits shared fields from the model. Updates to the model will cascade to its members.'
                          : 'Loading model details...'}
                      </Text>
                    </Stack>
                  </Card>
                ) : (
                  <Card withBorder>
                    <Stack gap="sm">
                      <Group gap="xs" align="center">
                        <IconUsersGroup size={18} />
                        <Text fw={600}>Asset Model</Text>
                      </Group>
                      <Text size="sm" c="dimmed">
                        This asset is not part of an asset model. Create a model to share fields across similar assets or join an existing model.
                      </Text>
                      <Group gap="xs">
                        <Button
                          leftSection={<IconUsersPlus size={16} />}
                          onClick={() => setConvertGroupOpened(true)}
                        >
                          Create Asset Model
                        </Button>
                        <Button
                          variant="light"
                          leftSection={<IconUsersGroup size={16} />}
                          onClick={() => setJoinGroupOpened(true)}
                        >
                          Join Existing Model
                        </Button>
                      </Group>
                    </Stack>
                  </Card>
                )}

                {/* Basic Information */}
                <Card withBorder>
                  {asset.mainImage && (
                    <Card.Section>
                      <AspectRatio ratio={16 / 9}>
                        <Image
                          src={asset.mainImage}
                          alt={`${asset.name} main image`}
                          fit="cover"
                        />
                      </AspectRatio>
                    </Card.Section>
                  )}
                  <Card.Section inheritPadding>
                    <Stack gap="md">
                      <Title order={4}>Basic Information</Title>
                      <Divider />
                      
                      <Grid>
                        <Grid.Col span={6}>
                          <InfoRow
                            icon={<IconHash size={16} />}
                            label="Asset Number"
                            value={<Text fw={600}>{asset.assetNumber}</Text>}
                          />
                        </Grid.Col>
                        <Grid.Col span={6}>
                          <InfoRow
                            icon={<IconTag size={16} />}
                            label="Type"
                            value={<Badge variant="light">{asset.assetType.name}</Badge>}
                            fieldKey="category"
                          />
                        </Grid.Col>
                        <Grid.Col span={6}>
                          <InfoRow
                            icon={<IconLocation size={16} />}
                            label="Location"
                            value={asset.location}
                          />
                        </Grid.Col>
                        {asset.barcode && (
                          <Grid.Col span={6}>
                            <InfoRow
                              icon={<IconPackage size={16} />}
                              label="Barcode"
                              value={asset.barcode}
                            />
                          </Grid.Col>
                        )}
                      </Grid>

                      {asset.description && (
                        <Box>
                          <Group gap={4} align="center" mb="xs">
                            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                              Description
                            </Text>
                            {renderFieldSourceIndicator('description')}
                          </Group>
                          <Text size="sm">{asset.description}</Text>
                        </Box>
                      )}
                    </Stack>
                  </Card.Section>
                </Card>

                <AssetAssignmentList asset={asset} />

                {/* Product Information */}
                {(asset.manufacturer || asset.model) && (
                  <Card withBorder>
                    <Stack gap="md">
                      <Title order={4}>Product Information</Title>
                      <Divider />
                      
                      <Grid>
                        {asset.manufacturer && (
                          <Grid.Col span={6}>
                            <InfoRow
                              icon={<IconPackage size={16} />}
                              label="Manufacturer"
                              value={asset.manufacturer}
                              fieldKey="manufacturer"
                            />
                          </Grid.Col>
                        )}
                        {asset.model && (
                          <Grid.Col span={6}>
                            <InfoRow
                              icon={<IconPackage size={16} />}
                              label="Model"
                              value={asset.model}
                              fieldKey="model"
                            />
                          </Grid.Col>
                        )}
                      </Grid>
                    </Stack>
                  </Card>
                )}

                {/* Custom Fields */}
                {Object.keys(asset.customFieldValues).length > 0 && (
                  <Card withBorder>
                    <Stack gap="md">
                      <Title order={4}>Custom Fields</Title>
                      <Divider />
                      
                      <Grid>
                        {Object.entries(asset.customFieldValues).map(([fieldKey, value]) => {
                          const fieldDef = categoryDefinition?.customFields.find((f) => f.id === fieldKey || f.name === fieldKey);
                          const fieldId = fieldDef?.id ?? fieldKey;
                          const sourceKey = `customFieldValues.${fieldId}`;
                          const displayLabel = fieldDef?.name ?? fieldKey;
                          return (
                            <Grid.Col key={fieldKey} span={6}>
                              <CustomFieldDisplay
                                icon={<IconTag size={16} />}
                                label={displayLabel}
                                value={value}
                                fieldType={fieldDef?.type}
                                fieldSource={fieldSources[sourceKey]}
                                groupName={groupName}
                              />
                            </Grid.Col>
                          );
                        })}
                      </Grid>
                    </Stack>
                  </Card>
                )}

                {maintenanceEnabled && (
                  <Card withBorder>
                    <Stack gap="md">
                      <Group justify="space-between">
                        <Group gap="xs">
                          <Title order={4}>Maintenance</Title>
                          {maintenanceSchedule && (
                            <MaintenanceReminderBadge schedule={maintenanceSchedule} />
                          )}
                        </Group>
                        <Button
                          size="sm"
                          variant="light"
                          onClick={() => setMaintenanceFormOpened(true)}
                        >
                          Record Maintenance
                        </Button>
                      </Group>
                      <Divider />

                      {maintenanceSchedule && (
                        <Box>
                          <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb="xs">
                            Schedule
                          </Text>
                          <Text size="sm">{formatScheduleDescription(maintenanceSchedule)}</Text>
                          {maintenanceSchedule.nextDue && (
                            <Text size="xs" c="dimmed" mt="xs">
                              Next due: {new Date(maintenanceSchedule.nextDue).toLocaleDateString()}
                            </Text>
                          )}
                        </Box>
                      )}

                      {maintenanceRecords.length > 0 ? (
                        <Box>
                          <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb="xs">
                            Recent Maintenance
                          </Text>
                          <MaintenanceRecordList records={maintenanceRecords.slice(0, 5)} />
                          {maintenanceRecords.length > 5 && (
                            <Text size="xs" c="dimmed" mt="xs">
                              Showing 5 of {maintenanceRecords.length} records
                            </Text>
                          )}
                        </Box>
                      ) : (
                        <Text size="sm" c="dimmed">No maintenance records yet</Text>
                      )}
                    </Stack>
                  </Card>
                )}
              </Stack>
            </Grid.Col>

            {/* Sidebar */}
            <Grid.Col span={{ base: 12, md: 4 }}>
              <AssetDetailSidebar asset={asset} allAssets={allAssets} formatDate={formatDate} InfoRow={InfoRow} />
            </Grid.Col>
          </Grid>
        </Tabs.Panel>

        {maintenanceEnabled && (
          <Tabs.Panel value="maintenance" pt="md">
            <AssetMaintenanceHistory assetId={assetId} assetName={asset.name} />
          </Tabs.Panel>
        )}

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
    <Stack gap="md">
      {/* Barcode */}
      <Card withBorder>
        <Stack gap="md" align="center">
          <Title order={5}>Barcode</Title>
          <Box style={{ border: '1px solid #e9ecef', padding: '12px', borderRadius: '8px', backgroundColor: '#fff' }}>
            <BarcodeDisplay 
              value={asset.barcode}
              alt={`Barcode for ${asset.barcode}`}
              width={200}
            />
          </Box>
          <Text size="xs" c="dimmed" ta="center">
            Barcode: {asset.barcode}
          </Text>
          <Text size="xs" c="dimmed" ta="center">
            Asset Number: {asset.assetNumber}
          </Text>
          <Group gap="xs" wrap="wrap" justify="center">
            <Button
              size="xs"
              variant="light"
              leftSection={<IconDownload size={14} />}
              onClick={() => {
                const promise = import('../../services/barcode/BarcodeService').then(m => {
                  const barcodeUrl = m.generateBarcode(asset.barcode);
                  m.downloadImage(barcodeUrl, `barcode-${asset.assetNumber}.png`);
                }).catch((err: unknown) => {
                  console.error('Failed to download barcode:', err);
                });
                void promise;
              }}
            >
              Download
            </Button>
            <Button
              size="xs"
              variant="light"
              leftSection={<IconPrinter size={14} />}
              onClick={() => {
                const promise = import('../../services/barcode/BarcodeService').then(m => {
                  const barcodeUrl = m.generateBarcode(asset.barcode);
                  m.printImage(barcodeUrl, `Barcode - ${asset.name}`);
                }).catch((err: unknown) => {
                  console.error('Failed to print barcode:', err);
                });
                void promise;
              }}
            >
              Print
            </Button>
            {/* T284 - E2: Reassign Barcode Button */}
            <Button
              size="xs"
              variant="light"
              color="orange"
              leftSection={<IconRefresh size={14} />}
              onClick={() => setRegenerateModalOpen(true)}
            >
              Reassign Barcode
            </Button>
          </Group>
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

      {/* QR Code */}
      <Card withBorder>
        <Stack gap="md" align="center">
          <Title order={5}>QR Code</Title>
          <Tooltip label="Scan to view this asset in ChurchTools">
            <Box style={{ border: '1px solid #e9ecef', padding: '12px', borderRadius: '8px', backgroundColor: '#fff' }}>
              <QRCodeDisplay
                value={`${window.location.origin}${window.location.pathname}#/assets/${asset.id}`}
                alt={`QR Code for ${asset.assetNumber}`}
                size={180}
              />
            </Box>
          </Tooltip>
          <Text size="xs" c="dimmed" ta="center">
            Scan to view asset details
          </Text>
          <Group gap="xs">
            <Button
              size="xs"
              variant="light"
              leftSection={<IconDownload size={14} />}
              onClick={() => {
                const promise = import('../../services/barcode/BarcodeService').then(async m => {
                  const qrUrl = await m.generateQRCode(`${window.location.origin}${window.location.pathname}#/assets/${asset.id}`);
                  m.downloadImage(qrUrl, `qrcode-${asset.assetNumber}.png`);
                }).catch((err: unknown) => {
                  console.error('Failed to download QR code:', err);
                });
                void promise;
              }}
            >
              Download
            </Button>
            <Button
              size="xs"
              variant="light"
              leftSection={<IconPrinter size={14} />}
              onClick={() => {
                const promise = import('../../services/barcode/BarcodeService').then(async m => {
                  const qrUrl = await m.generateQRCode(`${window.location.origin}${window.location.pathname}#/assets/${asset.id}`);
                  m.printImage(qrUrl, `QR Code - ${asset.name}`);
                }).catch((err: unknown) => {
                  console.error('Failed to print QR code:', err);
                });
                void promise;
              }}
            >
              Print
            </Button>
          </Group>
        </Stack>
      </Card>

      {/* Images - Coming in Phase 5 */}
      {/* Images functionality will be added in Phase 5: Media Management */}

      {/* Metadata */}
      <Card withBorder>
        <Stack gap="md">
          <Title order={5}>Metadata</Title>
          <Divider />
          
          <InfoRow
            icon={<IconCalendar size={16} />}
            label="Created"
            value={formatDate(asset.createdAt)}
          />
          <InfoRow
            icon={<IconCalendar size={16} />}
            label="Last Updated"
            value={formatDate(asset.lastModifiedAt)}
          />
          <InfoRow
            icon={<IconUser size={16} />}
            label="Created By"
            value={asset.createdByName}
          />
        </Stack>
      </Card>
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
