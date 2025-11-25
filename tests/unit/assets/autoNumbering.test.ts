import { describe, expect, it } from 'vitest';
import {
    formatNextAssetNumber,
    resolveAutoNumberingPreview,
    resolvePrefixForAutoNumbering,
    type AutoNumberingPreview,
} from '../../../src/services/assets/autoNumbering';
import type { AssetPrefix } from '../../../src/types/entities';

function createPrefix(partial: Partial<AssetPrefix> & { id: string; prefix: string; sequence?: number }): AssetPrefix {
    const now = new Date('2024-01-01T00:00:00.000Z').toISOString();
    return {
        id: partial.id,
        prefix: partial.prefix,
        description: partial.description ?? `${partial.prefix} equipment`,
        color: partial.color ?? '#3B82F6',
        sequence: partial.sequence ?? 0,
        createdBy: partial.createdBy ?? 'user-1',
        createdByName: partial.createdByName ?? 'Alice Example',
        createdAt: partial.createdAt ?? now,
        lastModifiedBy: partial.lastModifiedBy ?? 'user-1',
        lastModifiedByName: partial.lastModifiedByName ?? 'Alice Example',
        lastModifiedAt: partial.lastModifiedAt ?? now,
    };
}

describe('resolvePrefixForAutoNumbering', () => {
    const prefixes = [
        createPrefix({ id: 'cam', prefix: 'CAM', sequence: 12 }),
        createPrefix({ id: 'aud', prefix: 'AUD', sequence: 4 }),
        createPrefix({ id: 'lig', prefix: 'LIG', sequence: 29 }),
    ];

    it('prefers an explicitly selected prefix when provided', () => {
        const result = resolvePrefixForAutoNumbering({
            prefixes,
            selectedPrefixId: 'aud',
            personDefaultPrefixId: 'cam',
            moduleDefaultPrefixId: 'lig',
        });

        expect(result.prefixId).toBe('aud');
        expect(result.source).toBe('explicit');
    });

    it('falls back to person default when no explicit selection exists', () => {
        const result = resolvePrefixForAutoNumbering({
            prefixes,
            personDefaultPrefixId: 'lig',
            moduleDefaultPrefixId: 'cam',
        });

        expect(result.prefixId).toBe('lig');
        expect(result.source).toBe('person-default');
    });

    it('uses module default when person preference is missing', () => {
        const result = resolvePrefixForAutoNumbering({
            prefixes,
            moduleDefaultPrefixId: 'cam',
        });

        expect(result.prefixId).toBe('cam');
        expect(result.source).toBe('module-default');
    });

    it('falls back to the first available prefix when no defaults resolve', () => {
        const result = resolvePrefixForAutoNumbering({
            prefixes,
            personDefaultPrefixId: 'missing',
            moduleDefaultPrefixId: 'also-missing',
        });

        expect(result.prefixId).toBe('cam');
        expect(result.source).toBe('collection-first');
    });

    it('returns null resolution when no prefixes exist', () => {
        const result = resolvePrefixForAutoNumbering({ prefixes: [] });

        expect(result.prefix).toBeNull();
        expect(result.prefixId).toBeNull();
        expect(result.source).toBe('none');
    });
});

describe('formatNextAssetNumber', () => {
    it('increments sequence and pads to three digits for prefixes', () => {
        const prefix = createPrefix({ id: 'cam', prefix: 'CAM', sequence: 5 });
        expect(formatNextAssetNumber(prefix)).toBe('CAM-006');
    });

    it('supports overriding the next sequence value', () => {
        const prefix = createPrefix({ id: 'aud', prefix: 'AUD', sequence: 9 });
        expect(formatNextAssetNumber(prefix, 42)).toBe('AUD-042');
    });
});

describe('resolveAutoNumberingPreview', () => {
    const prefixes = [
        createPrefix({ id: 'cam', prefix: 'CAM', sequence: 12 }),
        createPrefix({ id: 'aud', prefix: 'AUD', sequence: 4 }),
    ];

    function resolve(options: Parameters<typeof resolveAutoNumberingPreview>[0]): AutoNumberingPreview {
        return resolveAutoNumberingPreview(options);
    }

    it('produces preview using selected prefix sequence', () => {
        const result = resolve({ prefixes, selectedPrefixId: 'aud' });
        expect(result.nextAssetNumber).toBe('AUD-005');
        expect(result.source).toBe('explicit');
    });

    it('applies sequence override when provided', () => {
        const result = resolve({
            prefixes,
            personDefaultPrefixId: 'cam',
            sequenceOverrides: { cam: 30 },
        });

        expect(result.nextAssetNumber).toBe('CAM-030');
        expect(result.source).toBe('person-default');
    });

    it('returns null preview when no prefixes are available', () => {
        const result = resolve({ prefixes: [] });
        expect(result.nextAssetNumber).toBeNull();
        expect(result.source).toBe('none');
    });
});
