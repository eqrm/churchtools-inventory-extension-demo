import type { MaintenanceWorkType } from '../types/maintenance';

export const MAINTENANCE_WORK_TYPES: readonly MaintenanceWorkType[] = [
  'inspection',
  'maintenance',
  'planned-repair',
  'unplanned-repair',
  'improvement',
] as const;
