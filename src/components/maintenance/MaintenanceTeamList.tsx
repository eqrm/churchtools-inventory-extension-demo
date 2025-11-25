import { Badge, Group, Stack, Text } from '@mantine/core'
import { useTranslation } from 'react-i18next'
import { PersonAvatar } from '../common/PersonAvatar'
import type { MaintenancePlanAssetState } from '../../state/maintenance/planStore'
import { formatDateTime } from '../../utils/formatters'

interface MaintenanceTeamListProps {
  assets: MaintenancePlanAssetState[]
}

type TeamSummary = {
  id?: string
  name: string
  count: number
  latest?: string
}

function buildTeamSummary(assets: MaintenancePlanAssetState[]): TeamSummary[] {
  const summary = new Map<string, TeamSummary>()
  let anonymousIndex = 0

  assets.forEach((asset) => {
    if (!asset.completedBy && !asset.completedByName) {
      return
    }

    const key = asset.completedBy || asset.completedByName || `anonymous-${anonymousIndex++}`
    const current = summary.get(key)
    const name = asset.completedByName ?? 'Unknown technician'

    if (current) {
      current.count += 1
      if (asset.completedAt && (!current.latest || asset.completedAt > current.latest)) {
        current.latest = asset.completedAt
      }
      summary.set(key, current)
      return
    }

    summary.set(key, {
      id: asset.completedBy,
      name,
      count: 1,
      latest: asset.completedAt,
    })
  })

  return Array.from(summary.values()).sort((a, b) => a.name.localeCompare(b.name))
}

export function MaintenanceTeamList({ assets }: MaintenanceTeamListProps) {
  const { t } = useTranslation('maintenance')
  if (assets.length === 0) {
    return <Text size="sm" c="dimmed">{t('team.noAssetsSelected')}</Text>
  }

  const team = buildTeamSummary(assets)
  const pendingCount = assets.filter((asset) => asset.status === 'pending').length
  const skippedCount = assets.filter((asset) => asset.status === 'skipped').length

  return (
    <Stack gap="xs">
      {team.length > 0 ? (
        team.map((member) => (
          <Group key={`${member.id ?? member.name}`} gap="sm" wrap="nowrap" align="center">
            <PersonAvatar
              personId={member.id}
              name={member.name}
              size="sm"
              textSize="sm"
              description={member.latest ? t('team.lastUpdate', { date: formatDateTime(member.latest) }) : undefined}
              fallbackLabel={t('team.unknownTechnician')}
            />
            <Badge color="blue" variant="light">
              {member.count} {t('team.asset', { count: member.count })}
            </Badge>
          </Group>
        ))
      ) : (
        <Text size="sm" c="dimmed">{t('team.noTechnicians')}</Text>
      )}

      {pendingCount > 0 ? (
        <Text size="xs" c="dimmed">
          {pendingCount} asset{pendingCount === 1 ? '' : 's'} still pending completion.
        </Text>
      ) : null}

      {skippedCount > 0 ? (
        <Text size="xs" c="dimmed">
          {skippedCount} asset{skippedCount === 1 ? '' : 's'} skipped during maintenance.
        </Text>
      ) : null}
    </Stack>
  )
}
