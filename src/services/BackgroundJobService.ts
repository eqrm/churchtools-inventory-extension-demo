export type BackgroundJob = () => Promise<void> | void;

export interface BackgroundJobConfig {
  id: string;
  description?: string;
  job: BackgroundJob;
}

class BackgroundJobService {
  private jobs = new Map<string, BackgroundJobConfig>();

  public register(config: BackgroundJobConfig): void {
    if (this.jobs.has(config.id)) {
      throw new Error(`Background job with id "${config.id}" is already registered.`);
    }

    this.jobs.set(config.id, config);
  }

  public unregister(id: string): void {
    this.jobs.delete(id);
  }

  public async run(id: string): Promise<void> {
    const config = this.jobs.get(id);

    if (!config) {
      throw new Error(`Background job with id "${id}" is not registered.`);
    }

    await config.job();
  }

  public async runAll(): Promise<void> {
    for (const config of this.jobs.values()) {
      await config.job();
    }
  }
}

export const backgroundJobService = new BackgroundJobService();

// Register work order auto-generation job
import { MaintenanceService } from './MaintenanceService';

backgroundJobService.register({
  id: 'work-order-auto-generation',
  description: 'Auto-generate work orders from maintenance rules (runs daily at 00:05)',
  job: async () => {
    const storageProvider = await import('../types/storage').then(m => m.storageProvider);
    const maintenanceService = new MaintenanceService(storageProvider);
    await maintenanceService.autoGenerateWorkOrders();
  },
});
