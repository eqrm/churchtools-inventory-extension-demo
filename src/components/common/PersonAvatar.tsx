import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Avatar, Group, Skeleton, Stack, Text, Tooltip } from '@mantine/core'
import { IconUser } from '@tabler/icons-react'
import { personSearchService, type PersonSearchResult } from '../../services/person/PersonSearchService'

const avatarSizeMap: Record<'xs' | 'sm' | 'md' | 'lg' | 'xl', number> = {
  xs: 18,
  sm: 28,
  md: 36,
  lg: 44,
  xl: 52,
}

const iconSizeMap: Record<'xs' | 'sm' | 'md' | 'lg' | 'xl', number> = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
}

export interface PersonAvatarProps {
  personId?: string
  name?: string | null
  avatarUrl?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  withName?: boolean
  description?: string
  tooltip?: boolean | string
  textSize?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  textWeight?: number
  align?: 'horizontal' | 'vertical'
  maxWidth?: number | string
  fallbackLabel?: string
}

function deriveInitials(source?: string | null): string {
  if (!source) return ''
  const trimmed = source.trim()
  if (!trimmed) return ''
  const segments = trimmed.split(/\s+/)
  const initials = segments.slice(0, 2).map((segment) => segment[0]).filter(Boolean)
  return initials.join('').toUpperCase()
}

export function PersonAvatar({
  personId,
  name,
  avatarUrl,
  size = 'sm',
  withName = true,
  description,
  tooltip,
  textSize = 'sm',
  textWeight,
  align = 'horizontal',
  maxWidth,
  fallbackLabel = '—',
}: PersonAvatarProps) {
  const [person, setPerson] = useState<PersonSearchResult | null>(null)
  const [loading, setLoading] = useState(false)

  const shouldFetch = Boolean(personId && (!name || !avatarUrl))

  useEffect(() => {
    let cancelled = false

    if (!shouldFetch) {
      setPerson(null)
      setLoading(false)
      return () => {
        cancelled = true
      }
    }

    setLoading(true)
    personSearchService
      .getPersonById(personId as string)
      .then((result) => {
        if (!cancelled) {
          setPerson(result)
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('Failed to load person information', error)
          setPerson(null)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [personId, shouldFetch])

  const displayName = useMemo(() => {
    if (name && name.trim()) return name.trim()
    if (person?.displayName) return person.displayName
    const combined = [person?.firstName, person?.lastName].filter(Boolean).join(' ').trim()
    return combined || ''
  }, [name, person?.displayName, person?.firstName, person?.lastName])

  const avatarSource = avatarUrl ?? person?.avatarUrl ?? undefined
  const initials = deriveInitials(displayName)
  const tooltipContent = useMemo(() => {
    if (tooltip === false) {
      return null
    }
    if (typeof tooltip === 'string') {
      return tooltip
    }
    return displayName || (fallbackLabel ?? '—')
  }, [tooltip, displayName, fallbackLabel])

  const textStyle: CSSProperties | undefined = maxWidth
    ? {
        maxWidth,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }
    : undefined

  if (loading && !displayName && withName) {
    return (
      <Group gap="xs" wrap="nowrap">
        <Skeleton height={avatarSizeMap[size]} width={avatarSizeMap[size]} circle />
        <Skeleton height={14} width={120} radius="sm" />
      </Group>
    )
  }

  if (loading && !displayName && !withName) {
    return <Skeleton height={avatarSizeMap[size]} width={avatarSizeMap[size]} circle />
  }

  const avatar = (
    <Avatar src={avatarSource} size={size} radius="xl" color="blue">
      {initials || <IconUser size={iconSizeMap[size]} />}
    </Avatar>
  )

  const avatarWithTooltip = tooltipContent ? <Tooltip label={tooltipContent}>{avatar}</Tooltip> : avatar

  if (!withName) {
    return avatarWithTooltip
  }

  const effectiveName = displayName || fallbackLabel

  if (align === 'vertical') {
    return (
      <Stack gap={description ? 2 : 0} align="center">
        {avatarWithTooltip}
        <Text
          size={textSize}
          fw={textWeight}
          c={displayName ? undefined : 'dimmed'}
          ta="center"
          style={textStyle}
        >
          {effectiveName}
        </Text>
        {description ? (
          <Text size="xs" c="dimmed" ta="center">
            {description}
          </Text>
        ) : null}
      </Stack>
    )
  }

  return (
    <Group gap="xs" wrap="nowrap" align="center">
      {avatarWithTooltip}
      <Stack gap={description ? 2 : 0} justify="center" style={{ minWidth: 0 }}>
        <Text
          size={textSize}
          fw={textWeight}
          c={displayName ? undefined : 'dimmed'}
          style={textStyle}
        >
          {effectiveName}
        </Text>
        {description ? (
          <Text size="xs" c="dimmed">
            {description}
          </Text>
        ) : null}
      </Stack>
    </Group>
  )
}
