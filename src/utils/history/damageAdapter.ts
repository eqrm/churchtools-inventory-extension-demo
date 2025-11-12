import type { DamageReport } from '../../types/damage';
import type { HistoryEvent, HistoryEventAdapter } from './types';

/**
 * Adapts a DamageReport to a HistoryEvent
 * Creates two events per damage report: one for the initial report and one for the repair (if repaired)
 */
export const damageReportToEvents: HistoryEventAdapter<DamageReport> = (report: DamageReport): HistoryEvent => {
    const isRepaired = report.status === 'repaired';
    
    return {
        id: report.id,
        entityId: report.assetId,
        entityType: 'asset',
        occurredAt: isRepaired && report.repairedAt ? report.repairedAt : report.reportedAt,
        kind: isRepaired ? 'status-change' : 'status-change',
        title: isRepaired ? 'Asset Repaired' : 'Damage Reported',
        description: isRepaired ? report.repairNotes : report.description,
        actor: {
            id: isRepaired && report.repairedBy ? report.repairedBy : report.reportedBy,
            name: (isRepaired && report.repairedByName ? report.repairedByName : report.reportedByName) ?? 'Unknown User',
        },
        tags: [
            {
                id: `status-${report.status}`,
                label: isRepaired ? 'Repaired' : 'Broken',
                color: isRepaired ? 'green' : 'red',
            },
        ],
        metadata: {
            reportId: report.id,
            status: report.status,
            hasPhotos: report.photos && report.photos.length > 0,
            photoCount: report.photos?.length ?? 0,
            description: report.description,
            repairNotes: report.repairNotes,
            reportedAt: report.reportedAt,
            repairedAt: report.repairedAt,
        },
    };
};

/**
 * Converts multiple damage reports to history events
 * Flattens damage reports into individual events (one for report, one for repair)
 */
export function damageReportsToEvents(reports: DamageReport[]): HistoryEvent[] {
    const events: HistoryEvent[] = [];
    
    for (const report of reports) {
        // Always add the initial damage report event
        events.push({
            id: `${report.id}-reported`,
            entityId: report.assetId,
            entityType: 'asset',
            occurredAt: report.reportedAt,
            kind: 'status-change',
            title: 'Damage Reported',
            description: report.description,
            actor: {
                id: report.reportedBy,
                name: report.reportedByName ?? 'Unknown User',
            },
            tags: [
                {
                    id: 'status-broken',
                    label: 'Broken',
                    color: 'red',
                },
            ],
            metadata: {
                reportId: report.id,
                status: report.status,
                hasPhotos: report.photos && report.photos.length > 0,
                photoCount: report.photos?.length ?? 0,
                description: report.description,
            },
        });
        
        // If repaired, add a separate repair event
        if (report.status === 'repaired' && report.repairedAt) {
            events.push({
                id: `${report.id}-repaired`,
                entityId: report.assetId,
                entityType: 'asset',
                occurredAt: report.repairedAt,
                kind: 'status-change',
                title: 'Asset Repaired',
                description: report.repairNotes ?? 'No repair notes provided',
                actor: report.repairedBy && report.repairedByName ? {
                    id: report.repairedBy,
                    name: report.repairedByName,
                } : {
                    id: report.reportedBy,
                    name: report.reportedByName ?? 'Unknown User',
                },
                tags: [
                    {
                        id: 'status-repaired',
                        label: 'Repaired',
                        color: 'green',
                    },
                ],
                metadata: {
                    reportId: report.id,
                    status: 'repaired',
                    repairNotes: report.repairNotes,
                },
            });
        }
    }
    
    return events;
}
