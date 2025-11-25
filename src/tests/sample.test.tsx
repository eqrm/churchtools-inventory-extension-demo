/**
 * Sample Test
 * 
 * This file shows how to write tests with the configured testing infrastructure.
 * It serves as both a test and documentation example.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from './utils/custom-render';
import { createMockInventoryItem } from './utils/test-data-factory';

// Sample component for testing
function TestComponent({ message }: { message: string }) {
    return <div>Hello, {message}!</div>;
}

describe('Testing Infrastructure', () => {
    it('should render components', () => {
        render(<TestComponent message="World" />);
        expect(screen.getByText('Hello, World!')).toBeInTheDocument();
    });

    it('should create mock data', () => {
        const item = createMockInventoryItem({ name: 'Test Item' });
        expect(item.name).toBe('Test Item');
        expect(item.status).toBe('available');
    });

    it('should perform basic assertions', () => {
        expect(1 + 1).toBe(2);
        expect('test').toContain('es');
        expect([1, 2, 3]).toHaveLength(3);
    });
});
