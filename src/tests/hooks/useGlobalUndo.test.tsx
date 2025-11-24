import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useGlobalUndo } from '../../hooks/useGlobalUndo';
import { useUndoStore } from '../../state/undoStore';

// Mock the store
vi.mock('../../state/undoStore', () => ({
  useUndoStore: vi.fn(),
}));

describe('useGlobalUndo', () => {
  const undo = vi.fn();
  const redo = vi.fn();

  beforeEach(() => {
    (useUndoStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      undo,
      redo,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  function TestComponent() {
    useGlobalUndo();
    return <div>Test</div>;
  }

  it('calls undo on Ctrl+Z', () => {
    render(<TestComponent />);
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    expect(undo).toHaveBeenCalled();
  });

  it('calls redo on Ctrl+Shift+Z', () => {
    render(<TestComponent />);
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: true });
    expect(redo).toHaveBeenCalled();
  });

  it('calls redo on Ctrl+Y', () => {
    render(<TestComponent />);
    fireEvent.keyDown(window, { key: 'y', ctrlKey: true });
    expect(redo).toHaveBeenCalled();
  });

  it('does not call undo/redo when input is focused', () => {
    const { getByRole } = render(
      <div>
        <TestComponent />
        <input type="text" />
      </div>
    );
    const input = getByRole('textbox');
    input.focus();

    fireEvent.keyDown(input, { key: 'z', ctrlKey: true });
    expect(undo).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: 'y', ctrlKey: true });
    expect(redo).not.toHaveBeenCalled();
  });
});
