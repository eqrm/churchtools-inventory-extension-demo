import type { ChangeHistoryEntry } from '../../../types/entities'
import { ChurchToolsStorageProvider } from './core'

declare module './core' {
  interface ChurchToolsStorageProvider {
    getChangeHistory(
      entityType: ChangeHistoryEntry['entityType'],
      entityId: string,
      limit?: number,
    ): Promise<ChangeHistoryEntry[]>
    recordChange(entry: Omit<ChangeHistoryEntry, 'id' | 'changedAt'>): Promise<void>
  }
}

ChurchToolsStorageProvider.prototype.getChangeHistory = async function getChangeHistory(
  this: ChurchToolsStorageProvider,
  entityType,
  entityId,
  limit,
): Promise<ChangeHistoryEntry[]> {
  const historyAssetType = await this.getOrCreateHistoryAssetType()
  const entries = await this.apiClient.getDataValues(this.moduleId, historyAssetType.id)

  const history: ChangeHistoryEntry[] = []

  for (const entry of entries) {
    const raw = entry as Record<string, unknown>
    const rawValue = raw['value']

    if (typeof rawValue !== 'string') {
      continue
    }

    try {
      const parsed = JSON.parse(rawValue) as Record<string, unknown>
      if (parsed['entityType'] === entityType && String(parsed['entityId']) === entityId) {
        history.push({
          id: String(raw['id']),
          entityType: parsed['entityType'] as ChangeHistoryEntry['entityType'],
          entityId,
          entityName: parsed['entityName'] as string | undefined,
          action: parsed['action'] as ChangeHistoryEntry['action'],
          fieldName: parsed['fieldName'] as string | undefined,
          oldValue: parsed['oldValue'] as string | undefined,
          newValue: parsed['newValue'] as string | undefined,
          changes: parsed['changes'] as ChangeHistoryEntry['changes'],
          changedBy: parsed['changedBy'] as string,
          changedByName: parsed['changedByName'] as string,
          changedAt: parsed['changedAt'] as string,
          ipAddress: parsed['ipAddress'] as string | undefined,
          userAgent: parsed['userAgent'] as string | undefined,
        })
      }
    } catch (error) {
      console.error('Error parsing change history entry:', error)
    }
  }

  history.sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime())

  if (limit) {
    return history.slice(0, limit)
  }

  return history
}

ChurchToolsStorageProvider.prototype.recordChange = async function recordChange(
  this: ChurchToolsStorageProvider,
  entry,
): Promise<void> {
  const historyAssetType = await this.getOrCreateHistoryAssetType()
  const changeData = {
    ...entry,
    changedAt: new Date().toISOString(),
  }

  const dataValue = {
    dataCategoryId: Number(historyAssetType.id),
    value: JSON.stringify(changeData),
  }

  await this.apiClient.createDataValue(this.moduleId, historyAssetType.id, dataValue)
}
