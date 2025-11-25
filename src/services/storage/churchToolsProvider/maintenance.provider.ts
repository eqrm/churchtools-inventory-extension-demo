import type {
  Asset,
  MaintenanceCalendarHold,
  MaintenanceRecord,
  MaintenanceRecordCreate,
  MaintenanceSchedule,
  MaintenanceScheduleCreate,
} from '../../../types/entities'
import type { MaintenanceDependencies } from './maintenance'
import {
  createMaintenanceHold as createMaintenanceHoldHandler,
  createMaintenanceRecord as createMaintenanceRecordHandler,
  createMaintenanceSchedule as createMaintenanceScheduleHandler,
  deleteMaintenanceRecord as deleteMaintenanceRecordHandler,
  deleteMaintenanceSchedule as deleteMaintenanceScheduleHandler,
  getMaintenanceHolds as getMaintenanceHoldsHandler,
  getMaintenanceRecord as getMaintenanceRecordHandler,
  getMaintenanceRecords as getMaintenanceRecordsHandler,
  getMaintenanceSchedule as getMaintenanceScheduleHandler,
  getMaintenanceSchedules as getMaintenanceSchedulesHandler,
  getOverdueMaintenance as getOverdueMaintenanceHandler,
  getOverdueMaintenanceSchedules as getOverdueMaintenanceSchedulesHandler,
  getUpcomingMaintenance as getUpcomingMaintenanceHandler,
  releaseMaintenanceHold as releaseMaintenanceHoldHandler,
  updateMaintenanceRecord as updateMaintenanceRecordHandler,
  updateMaintenanceSchedule as updateMaintenanceScheduleHandler,
} from './maintenance'
import { ChurchToolsStorageProvider } from './core'

declare module './core' {
  interface ChurchToolsStorageProvider {
    getMaintenanceRecords(assetId?: string): Promise<MaintenanceRecord[]>
    getMaintenanceRecord(id: string): Promise<MaintenanceRecord | null>
    createMaintenanceRecord(record: MaintenanceRecordCreate): Promise<MaintenanceRecord>
    updateMaintenanceRecord(id: string, updates: Partial<MaintenanceRecord>): Promise<MaintenanceRecord>
    deleteMaintenanceRecord(id: string): Promise<void>
    getMaintenanceSchedules(assetId?: string): Promise<MaintenanceSchedule[]>
    getMaintenanceSchedule(assetId: string): Promise<MaintenanceSchedule | null>
    createMaintenanceSchedule(schedule: MaintenanceScheduleCreate): Promise<MaintenanceSchedule>
    updateMaintenanceSchedule(id: string, updates: Partial<MaintenanceSchedule>): Promise<MaintenanceSchedule>
    deleteMaintenanceSchedule(id: string): Promise<void>
    getOverdueMaintenanceSchedules(): Promise<MaintenanceSchedule[]>
    getOverdueMaintenance(): Promise<Asset[]>
    getUpcomingMaintenance(daysAhead: number): Promise<Asset[]>
    getMaintenanceHolds(filters?: {
      planId?: string
      assetId?: string
      status?: 'active' | 'released'
    }): Promise<MaintenanceCalendarHold[]>
    createMaintenanceHold(
      hold: Omit<MaintenanceCalendarHold, 'id' | 'status' | 'createdAt' | 'releasedAt'> & {
        status?: 'active' | 'released'
      },
    ): Promise<MaintenanceCalendarHold>
    releaseMaintenanceHold(
      holdId: string,
      updates?: Partial<
        Omit<MaintenanceCalendarHold, 'id' | 'planId' | 'assetId' | 'startDate' | 'endDate' | 'createdAt'>
      >,
    ): Promise<MaintenanceCalendarHold>
  }
}

type ProviderWithMaintenanceSupport = ChurchToolsStorageProvider & {
  getAsset: (id: string) => Promise<Asset>
}

function getMaintenanceDependencies(provider: ProviderWithMaintenanceSupport): MaintenanceDependencies {
  return {
    moduleId: provider.moduleId,
    apiClient: provider.apiClient,
    getAllCategoriesIncludingHistory: provider.getAllCategoriesIncludingHistory.bind(provider),
    mapToAssetType: provider.mapToAssetType.bind(provider),
    recordChange: provider.recordChange.bind(provider),
    getAsset: provider.getAsset.bind(provider),
  }
}

ChurchToolsStorageProvider.prototype.getMaintenanceRecords = async function getMaintenanceRecords(
  this: ProviderWithMaintenanceSupport,
  assetId?: string,
): Promise<MaintenanceRecord[]> {
  return getMaintenanceRecordsHandler(getMaintenanceDependencies(this), assetId)
}

ChurchToolsStorageProvider.prototype.getMaintenanceRecord = async function getMaintenanceRecord(
  this: ProviderWithMaintenanceSupport,
  id: string,
): Promise<MaintenanceRecord | null> {
  return getMaintenanceRecordHandler(getMaintenanceDependencies(this), id)
}

ChurchToolsStorageProvider.prototype.createMaintenanceRecord = async function createMaintenanceRecord(
  this: ProviderWithMaintenanceSupport,
  recordData: MaintenanceRecordCreate,
): Promise<MaintenanceRecord> {
  return createMaintenanceRecordHandler(getMaintenanceDependencies(this), recordData)
}

ChurchToolsStorageProvider.prototype.updateMaintenanceRecord = async function updateMaintenanceRecord(
  this: ProviderWithMaintenanceSupport,
  id: string,
  updates: Partial<MaintenanceRecord>,
): Promise<MaintenanceRecord> {
  return updateMaintenanceRecordHandler(getMaintenanceDependencies(this), id, updates)
}

ChurchToolsStorageProvider.prototype.deleteMaintenanceRecord = async function deleteMaintenanceRecord(
  this: ProviderWithMaintenanceSupport,
  id: string,
): Promise<void> {
  await deleteMaintenanceRecordHandler(getMaintenanceDependencies(this), id)
}

ChurchToolsStorageProvider.prototype.getMaintenanceSchedules = async function getMaintenanceSchedules(
  this: ProviderWithMaintenanceSupport,
  assetId?: string,
): Promise<MaintenanceSchedule[]> {
  return getMaintenanceSchedulesHandler(getMaintenanceDependencies(this), assetId)
}

ChurchToolsStorageProvider.prototype.getMaintenanceSchedule = async function getMaintenanceSchedule(
  this: ProviderWithMaintenanceSupport,
  assetId: string,
): Promise<MaintenanceSchedule | null> {
  return getMaintenanceScheduleHandler(getMaintenanceDependencies(this), assetId)
}

ChurchToolsStorageProvider.prototype.createMaintenanceSchedule = async function createMaintenanceSchedule(
  this: ProviderWithMaintenanceSupport,
  scheduleData: MaintenanceScheduleCreate,
): Promise<MaintenanceSchedule> {
  return createMaintenanceScheduleHandler(getMaintenanceDependencies(this), scheduleData)
}

ChurchToolsStorageProvider.prototype.updateMaintenanceSchedule = async function updateMaintenanceSchedule(
  this: ProviderWithMaintenanceSupport,
  id: string,
  updates: Partial<MaintenanceSchedule>,
): Promise<MaintenanceSchedule> {
  return updateMaintenanceScheduleHandler(getMaintenanceDependencies(this), id, updates)
}

ChurchToolsStorageProvider.prototype.deleteMaintenanceSchedule = async function deleteMaintenanceSchedule(
  this: ProviderWithMaintenanceSupport,
  id: string,
): Promise<void> {
  await deleteMaintenanceScheduleHandler(getMaintenanceDependencies(this), id)
}

ChurchToolsStorageProvider.prototype.getOverdueMaintenanceSchedules = async function getOverdueMaintenanceSchedules(
  this: ProviderWithMaintenanceSupport,
): Promise<MaintenanceSchedule[]> {
  return getOverdueMaintenanceSchedulesHandler(getMaintenanceDependencies(this))
}

ChurchToolsStorageProvider.prototype.getOverdueMaintenance = async function getOverdueMaintenance(
  this: ProviderWithMaintenanceSupport,
): Promise<Asset[]> {
  return getOverdueMaintenanceHandler(getMaintenanceDependencies(this))
}

ChurchToolsStorageProvider.prototype.getUpcomingMaintenance = async function getUpcomingMaintenance(
  this: ProviderWithMaintenanceSupport,
  daysAhead: number,
): Promise<Asset[]> {
  return getUpcomingMaintenanceHandler(getMaintenanceDependencies(this), daysAhead)
}

ChurchToolsStorageProvider.prototype.getMaintenanceHolds = async function getMaintenanceHolds(
  this: ProviderWithMaintenanceSupport,
  filters?: { planId?: string; assetId?: string; status?: 'active' | 'released' },
): Promise<MaintenanceCalendarHold[]> {
  return getMaintenanceHoldsHandler(getMaintenanceDependencies(this), filters)
}

ChurchToolsStorageProvider.prototype.createMaintenanceHold = async function createMaintenanceHold(
  this: ProviderWithMaintenanceSupport,
  hold,
): Promise<MaintenanceCalendarHold> {
  return createMaintenanceHoldHandler(getMaintenanceDependencies(this), hold)
}

ChurchToolsStorageProvider.prototype.releaseMaintenanceHold = async function releaseMaintenanceHold(
  this: ProviderWithMaintenanceSupport,
  holdId: string,
  updates?: Partial<
    Omit<MaintenanceCalendarHold, 'id' | 'planId' | 'assetId' | 'startDate' | 'endDate' | 'createdAt'>
  >,
): Promise<MaintenanceCalendarHold> {
  return releaseMaintenanceHoldHandler(getMaintenanceDependencies(this), holdId, updates)
}
