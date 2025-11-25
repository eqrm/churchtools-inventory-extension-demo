import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '../utils/custom-render';
import type { UndoAction } from '../../types/undo';
import { UndoHistory } from '../../components/undo/UndoHistory';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options: Record<string, unknown> = {}) => {
      switch (key) {
        case 'readOnlyHint':
          return `Read-only hint (limit: ${options.limit}, shortcut: ${options.shortcut})`;
        case 'actionLabel':
          return `${options.actionType} ${options.entityType}`;
        case 'labels.available':
          return `Undo via ${options.shortcut}`;
        case 'labels.pending':
          return 'Undo available';
        case 'labels.undone':
          return 'Undo applied';
        case 'labels.expired':
          return 'Expired (cannot undo)';
        case 'emptyState.title':
          return 'No recent actions';
        case 'shortcuts.generic':
          return 'your undo shortcut';
        default:
          return key;
      }
    },
  }),
}));

const baseAction: UndoAction = {
  actionId: 'action-1',
  actorId: 'user-123',
  actorName: 'Test User',
  entityType: 'asset',
  entityId: 'asset-1',
  actionType: 'update',
  beforeState: { status: 'available' },
  afterState: { status: 'in-use' },
  createdAt: new Date('2025-01-01T00:00:00.000Z').toISOString(),
  expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  undoStatus: 'pending',
};

describe('UndoHistory component', () => {
  it('renders read-only hint and shortcut availability badge', () => {
    render(<UndoHistory actions={[baseAction]} shortcutHint="Cmd+Z" />);

    expect(screen.getByText('Read-only hint (limit: 20, shortcut: Cmd+Z)')).toBeTruthy();
    expect(screen.getByText('Undo via Cmd+Z')).toBeTruthy();
  });

  it('falls back to generic shortcut label when hint missing', () => {
    render(<UndoHistory actions={[baseAction]} />);

    expect(screen.getByText('Read-only hint (limit: 20, shortcut: your undo shortcut)')).toBeTruthy();
  });
});
