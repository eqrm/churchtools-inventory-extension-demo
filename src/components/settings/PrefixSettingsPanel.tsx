import { useEffect, useMemo, useState } from 'react';
import { Badge, Card, Group, Loader, Select, Stack, Text } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useAssetPrefixes } from '../../hooks/useAssetPrefixes';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { AssetPrefixList } from './AssetPrefixList';
import {
  getStoredModuleDefaultPrefixId,
  getStoredPersonDefaultPrefixId,
  setStoredModuleDefaultPrefixId,
  setStoredPersonDefaultPrefixId,
} from '../../services/assets/autoNumbering';
import type { AssetPrefix } from '../../types/entities';

interface PreferenceState {
  moduleDefaultId: string | null;
  personDefaultId: string | null;
  loading: boolean;
}

export function PrefixSettingsPanel(): JSX.Element {
  const { data: prefixes = [], isLoading: prefixesLoading } = useAssetPrefixes();
  const { data: currentUser } = useCurrentUser();
  const [state, setState] = useState<PreferenceState>({ moduleDefaultId: null, personDefaultId: null, loading: true });

  const options = useMemo(() => mapPrefixesToOptions(prefixes), [prefixes]);

  useEffect(() => {
    let cancelled = false;

    const loadPreferences = async () => {
      const moduleDefaultId = getStoredModuleDefaultPrefixId();
      const personDefaultId = currentUser ? await getStoredPersonDefaultPrefixId(currentUser.id) : null;

      if (!cancelled) {
        setState({ moduleDefaultId, personDefaultId, loading: false });
      }
    };

    void loadPreferences();

    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  useEffect(() => {
    if (state.loading) {
      return;
    }

    if (state.moduleDefaultId && !prefixes.some(prefix => prefix.id === state.moduleDefaultId)) {
      setStoredModuleDefaultPrefixId(null);
      setState(prev => ({ ...prev, moduleDefaultId: null }));
    }

    if (state.personDefaultId && !prefixes.some(prefix => prefix.id === state.personDefaultId)) {
      if (currentUser) {
        void setStoredPersonDefaultPrefixId(currentUser, null);
      }
      setState(prev => ({ ...prev, personDefaultId: null }));
    }
  }, [prefixes, state.loading, state.moduleDefaultId, state.personDefaultId, currentUser]);

  const handleModuleDefaultChange = (value: string | null) => {
    setStoredModuleDefaultPrefixId(value);
    setState(prev => ({ ...prev, moduleDefaultId: value ?? null }));

    if (value) {
      const selected = prefixes.find(prefix => prefix.id === value);
      notifications.show({
        title: 'Module default saved',
        message: selected ? `${selected.prefix} will be used when no other preference is available.` : 'Default prefix updated.',
        color: 'green',
      });
    } else {
      notifications.show({
        title: 'Module default cleared',
        message: 'Assets will fall back to personal preferences or the first available prefix.',
        color: 'green',
      });
    }
  };

  const handlePersonDefaultChange = async (value: string | null) => {
    if (!currentUser) {
      return;
    }

    await setStoredPersonDefaultPrefixId(currentUser, value ?? null);
    setState(prev => ({ ...prev, personDefaultId: value ?? null }));

    if (value) {
      const selected = prefixes.find(prefix => prefix.id === value);
      notifications.show({
        title: 'Personal default saved',
        message: selected ? `${selected.prefix} will appear first when you create assets.` : 'Personal default updated.',
        color: 'green',
      });
    } else {
      notifications.show({
        title: 'Personal default cleared',
        message: 'Your next asset will use the module default or first available prefix.',
        color: 'green',
      });
    }
  };

  return (
    <Stack gap="xl">
      <Card withBorder padding="lg" radius="md">
        <Stack gap="md">
          <Group align="flex-start" gap="xs">
            <IconInfoCircle size={18} color="var(--mantine-color-blue-6)" />
            <Stack gap={4}>
              <Text fw={600}>Default prefix preferences</Text>
              <Text size="sm" c="dimmed">
                Pick a module-wide default and optionally store your personal preference. Personal defaults are stored locally so they follow you across sessions.
              </Text>
            </Stack>
          </Group>

          <Stack gap={4}>
            <Text size="sm" fw={500}>Module default prefix</Text>
            <Select
              placeholder={prefixesLoading ? 'Loading prefixes...' : prefixes.length === 0 ? 'Add a prefix to enable automatic numbering' : 'Select a default prefix'}
              data={options}
              value={state.moduleDefaultId}
              disabled={prefixesLoading || prefixes.length === 0 || state.loading}
              clearable
              onChange={handleModuleDefaultChange}
            />
            <Text size="xs" c="dimmed">
              Used when no personal preference is stored. Applies to everyone in this module.
            </Text>
          </Stack>

          <Stack gap={4}>
            <Group gap="xs">
              <Text size="sm" fw={500}>My default prefix</Text>
              {currentUser && <Badge variant="light" color="blue">{`${currentUser.firstName} ${currentUser.lastName}`.trim() || currentUser.name}</Badge>}
            </Group>
            <Select
              placeholder={prefixesLoading ? 'Loading prefixes...' : prefixes.length === 0 ? 'Add a prefix to store your preference' : 'Select your preferred prefix'}
              data={options}
              value={state.personDefaultId}
              disabled={prefixesLoading || prefixes.length === 0 || state.loading || !currentUser}
              clearable
              onChange={handlePersonDefaultChange}
            />
            <Text size="xs" c="dimmed">
              Visible only to you. New assets you create will start with this prefix when available.
            </Text>
            {state.loading && (
              <Group gap="xs" mt="xs">
                <Loader size="sm" />
                <Text size="xs" c="dimmed">Loading saved preferences…</Text>
              </Group>
            )}
          </Stack>
        </Stack>
      </Card>

      <AssetPrefixList />
    </Stack>
  );
}

function mapPrefixesToOptions(prefixes: AssetPrefix[]): Array<{ value: string; label: string }> {
  return prefixes.map(prefix => ({
    value: prefix.id,
    label: prefix.description ? `${prefix.prefix} — ${prefix.description}` : prefix.prefix,
  }));
}
