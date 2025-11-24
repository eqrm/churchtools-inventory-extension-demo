import { describe, expect, it } from 'vitest';
import { evaluateCondition, getFieldValue, groupAssets, sortAssets } from '../../utils/filterEvaluation';
import type { Asset } from '../../types/entities';

describe('filterEvaluation standard operators', () => {
    describe('evaluateCondition', () => {
        it('handles is-empty', () => {
            expect(evaluateCondition(null, 'is-empty', null)).toBe(true);
            expect(evaluateCondition(undefined, 'is-empty', null)).toBe(true);
            expect(evaluateCondition('', 'is-empty', null)).toBe(true);
            expect(evaluateCondition('foo', 'is-empty', null)).toBe(false);
            expect(evaluateCondition(0, 'is-empty', null)).toBe(false);
        });

        it('handles is-not-empty', () => {
            expect(evaluateCondition(null, 'is-not-empty', null)).toBe(false);
            expect(evaluateCondition(undefined, 'is-not-empty', null)).toBe(false);
            expect(evaluateCondition('', 'is-not-empty', null)).toBe(false);
            expect(evaluateCondition('foo', 'is-not-empty', null)).toBe(true);
            expect(evaluateCondition(0, 'is-not-empty', null)).toBe(true);
        });

        it('handles equals', () => {
            expect(evaluateCondition('foo', 'equals', 'foo')).toBe(true);
            expect(evaluateCondition('Foo', 'equals', 'foo')).toBe(true); // Case insensitive
            expect(evaluateCondition('foo', 'equals', 'bar')).toBe(false);
        });

        it('handles not-equals', () => {
            expect(evaluateCondition('foo', 'not-equals', 'bar')).toBe(true);
            expect(evaluateCondition('foo', 'not-equals', 'foo')).toBe(false);
        });

        it('handles contains', () => {
            expect(evaluateCondition('foobar', 'contains', 'oba')).toBe(true);
            expect(evaluateCondition('foobar', 'contains', 'baz')).toBe(false);
            expect(evaluateCondition('FooBar', 'contains', 'oba')).toBe(true); // Case insensitive
        });

        it('handles not-contains', () => {
            expect(evaluateCondition('foobar', 'not-contains', 'baz')).toBe(true);
            expect(evaluateCondition('foobar', 'not-contains', 'oba')).toBe(false);
        });

        it('handles starts-with', () => {
            expect(evaluateCondition('foobar', 'starts-with', 'foo')).toBe(true);
            expect(evaluateCondition('foobar', 'starts-with', 'bar')).toBe(false);
        });

        it('handles ends-with', () => {
            expect(evaluateCondition('foobar', 'ends-with', 'bar')).toBe(true);
            expect(evaluateCondition('foobar', 'ends-with', 'foo')).toBe(false);
        });

        it('handles greater-than', () => {
            expect(evaluateCondition(10, 'greater-than', 5)).toBe(true);
            expect(evaluateCondition(5, 'greater-than', 10)).toBe(false);
            expect(evaluateCondition(5, 'greater-than', 5)).toBe(false);
            expect(evaluateCondition('10', 'greater-than', '5')).toBe(true);
        });

        it('handles less-than', () => {
            expect(evaluateCondition(5, 'less-than', 10)).toBe(true);
            expect(evaluateCondition(10, 'less-than', 5)).toBe(false);
            expect(evaluateCondition(5, 'less-than', 5)).toBe(false);
        });

        it('handles in', () => {
            expect(evaluateCondition('foo', 'in', 'foo,bar,baz')).toBe(true);
            expect(evaluateCondition('qux', 'in', 'foo,bar,baz')).toBe(false);
            expect(evaluateCondition('Foo', 'in', 'foo, bar')).toBe(true); // Case insensitive and trimmed
        });

        it('handles not-in', () => {
            expect(evaluateCondition('qux', 'not-in', 'foo,bar,baz')).toBe(true);
            expect(evaluateCondition('foo', 'not-in', 'foo,bar,baz')).toBe(false);
        });

        it('returns false for unknown operator', () => {
            // @ts-expect-error Testing invalid operator
            expect(evaluateCondition('foo', 'unknown-op', 'bar')).toBe(false);
        });
    });

    describe('getFieldValue', () => {
        const obj = {
            a: {
                b: {
                    c: 'value',
                },
            },
            x: 123,
        };

        it('retrieves nested values', () => {
            expect(getFieldValue(obj, 'a.b.c')).toBe('value');
        });

        it('retrieves top-level values', () => {
            expect(getFieldValue(obj, 'x')).toBe(123);
        });

        it('returns undefined for non-existent paths', () => {
            expect(getFieldValue(obj, 'a.b.d')).toBe(undefined);
            expect(getFieldValue(obj, 'y')).toBe(undefined);
        });

        it('returns undefined for invalid objects', () => {
            expect(getFieldValue(null, 'a')).toBe(undefined);
            expect(getFieldValue('string', 'a')).toBe(undefined);
        });
    });

    describe('groupAssets', () => {
        const assets = [
            { id: '1', name: 'A', category: { name: 'Cat1' } },
            { id: '2', name: 'B', category: { name: 'Cat2' } },
            { id: '3', name: 'C', category: { name: 'Cat1' } },
            { id: '4', name: 'D' }, // No category
        ] as Asset[];

        it('groups assets by field', () => {
            const groups = groupAssets(assets, 'category.name');
            expect(Object.keys(groups)).toHaveLength(3);
            expect(groups['Cat1']).toHaveLength(2);
            expect(groups['Cat2']).toHaveLength(1);
            expect(groups['Ungrouped']).toHaveLength(1);
        });
    });

    describe('sortAssets', () => {
        const assets = [
            { id: '1', name: 'B' },
            { id: '2', name: 'A' },
            { id: '3', name: 'C' },
            { id: '4', name: null },
        ] as Asset[];

        it('sorts assets ascending', () => {
            const sorted = sortAssets(assets, 'name', 'asc');
            expect(sorted[0].name).toBe('A');
            expect(sorted[1].name).toBe('B');
            expect(sorted[2].name).toBe('C');
            expect(sorted[3].name).toBe(null); // Nulls last in asc? Implementation says: null > value in asc?
            // Implementation:
            // if (aValue == null) return sortDirection === 'asc' ? 1 : -1; -> a is greater -> a goes to end
            // So nulls are at the end in asc.
        });

        it('sorts assets descending', () => {
            const sorted = sortAssets(assets, 'name', 'desc');
            // Implementation:
            // if (aValue == null) return sortDirection === 'asc' ? 1 : -1; -> desc -> -1 -> a is smaller -> a goes to start?
            // Wait. sort(a,b) returning -1 means a comes first.
            // if a is null, return -1 (in desc). So null comes first in desc.
            expect(sorted[0].name).toBe(null);
            expect(sorted[1].name).toBe('C');
            expect(sorted[2].name).toBe('B');
            expect(sorted[3].name).toBe('A');
        });
    });
});
