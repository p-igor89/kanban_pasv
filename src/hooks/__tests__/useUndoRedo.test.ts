import { renderHook, act, waitFor } from '@testing-library/react';
import { useUndoRedo, createCommand } from '../useUndoRedo';

describe('useUndoRedo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with empty history', () => {
    const { result } = renderHook(() => useUndoRedo());

    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.historyLength).toBe(0);
    expect(result.current.futureLength).toBe(0);
  });

  it('should execute a command and add to history', async () => {
    const { result } = renderHook(() => useUndoRedo());

    const executeMock = jest.fn().mockResolvedValue('executed');
    const undoMock = jest.fn().mockResolvedValue('undone');

    const command = createCommand({
      type: 'TEST',
      description: 'Test command',
      execute: executeMock,
      undo: undoMock,
    });

    await act(async () => {
      await result.current.execute(command);
    });

    expect(executeMock).toHaveBeenCalled();
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.historyLength).toBe(1);
  });

  it('should undo a command', async () => {
    const { result } = renderHook(() => useUndoRedo());

    const executeMock = jest.fn().mockResolvedValue('executed');
    const undoMock = jest.fn().mockResolvedValue('undone');

    const command = createCommand({
      type: 'TEST',
      description: 'Test command',
      execute: executeMock,
      undo: undoMock,
    });

    await act(async () => {
      await result.current.execute(command);
    });

    await act(async () => {
      await result.current.undo();
    });

    await waitFor(() => {
      expect(undoMock).toHaveBeenCalled();
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(true);
      expect(result.current.historyLength).toBe(0);
      expect(result.current.futureLength).toBe(1);
    });
  });

  it('should redo a command', async () => {
    const { result } = renderHook(() => useUndoRedo());

    const executeMock = jest.fn().mockResolvedValue('executed');
    const undoMock = jest.fn().mockResolvedValue('undone');

    const command = createCommand({
      type: 'TEST',
      description: 'Test command',
      execute: executeMock,
      undo: undoMock,
    });

    await act(async () => {
      await result.current.execute(command);
    });

    await act(async () => {
      await result.current.undo();
    });

    await act(async () => {
      await result.current.redo();
    });

    await waitFor(() => {
      expect(executeMock).toHaveBeenCalledTimes(2); // Once for execute, once for redo
      expect(result.current.canUndo).toBe(true);
      expect(result.current.canRedo).toBe(false);
    });
  });

  it('should respect maxHistory limit', async () => {
    const { result } = renderHook(() => useUndoRedo({ maxHistory: 3 }));

    for (let i = 0; i < 5; i++) {
      const command = createCommand({
        type: 'TEST',
        description: `Command ${i}`,
        execute: jest.fn().mockResolvedValue(i),
        undo: jest.fn().mockResolvedValue(i),
      });

      await act(async () => {
        await result.current.execute(command);
      });
    }

    expect(result.current.historyLength).toBe(3);
  });

  it('should clear future on new action', async () => {
    const { result } = renderHook(() => useUndoRedo());

    const command1 = createCommand({
      type: 'TEST',
      description: 'Command 1',
      execute: jest.fn().mockResolvedValue(1),
      undo: jest.fn().mockResolvedValue(1),
    });

    const command2 = createCommand({
      type: 'TEST',
      description: 'Command 2',
      execute: jest.fn().mockResolvedValue(2),
      undo: jest.fn().mockResolvedValue(2),
    });

    await act(async () => {
      await result.current.execute(command1);
    });

    await act(async () => {
      await result.current.undo();
    });

    expect(result.current.futureLength).toBe(1);

    await act(async () => {
      await result.current.execute(command2);
    });

    expect(result.current.futureLength).toBe(0);
  });

  it('should clear all history', async () => {
    const { result } = renderHook(() => useUndoRedo());

    const command = createCommand({
      type: 'TEST',
      description: 'Test command',
      execute: jest.fn().mockResolvedValue('executed'),
      undo: jest.fn().mockResolvedValue('undone'),
    });

    await act(async () => {
      await result.current.execute(command);
    });

    act(() => {
      result.current.clear();
    });

    expect(result.current.historyLength).toBe(0);
    expect(result.current.futureLength).toBe(0);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('should not undo when disabled', async () => {
    const { result } = renderHook(() => useUndoRedo({ enabled: false }));

    const undoMock = jest.fn().mockResolvedValue('undone');
    const command = createCommand({
      type: 'TEST',
      description: 'Test command',
      execute: jest.fn().mockResolvedValue('executed'),
      undo: undoMock,
    });

    await act(async () => {
      await result.current.execute(command);
    });

    // History should be empty when disabled
    expect(result.current.historyLength).toBe(0);
  });

  it('should call onUndo callback', async () => {
    const onUndo = jest.fn();
    const { result } = renderHook(() => useUndoRedo({ onUndo }));

    const command = createCommand({
      type: 'TEST',
      description: 'Test command',
      execute: jest.fn().mockResolvedValue('executed'),
      undo: jest.fn().mockResolvedValue('undone'),
    });

    await act(async () => {
      await result.current.execute(command);
    });

    await act(async () => {
      await result.current.undo();
    });

    await waitFor(() => {
      expect(onUndo).toHaveBeenCalledWith(expect.objectContaining({ type: 'TEST' }));
    });
  });

  it('should call onRedo callback', async () => {
    const onRedo = jest.fn();
    const { result } = renderHook(() => useUndoRedo({ onRedo }));

    const command = createCommand({
      type: 'TEST',
      description: 'Test command',
      execute: jest.fn().mockResolvedValue('executed'),
      undo: jest.fn().mockResolvedValue('undone'),
    });

    await act(async () => {
      await result.current.execute(command);
    });

    await act(async () => {
      await result.current.undo();
    });

    await act(async () => {
      await result.current.redo();
    });

    await waitFor(() => {
      expect(onRedo).toHaveBeenCalledWith(expect.objectContaining({ type: 'TEST' }));
    });
  });
});

describe('createCommand', () => {
  it('should create a command with unique id', () => {
    const command1 = createCommand({
      type: 'TEST',
      description: 'Test',
      execute: jest.fn(),
      undo: jest.fn(),
    });

    const command2 = createCommand({
      type: 'TEST',
      description: 'Test',
      execute: jest.fn(),
      undo: jest.fn(),
    });

    expect(command1.id).toBeDefined();
    expect(command2.id).toBeDefined();
    expect(command1.id).not.toBe(command2.id);
  });

  it('should include timestamp', () => {
    const before = Date.now();
    const command = createCommand({
      type: 'TEST',
      description: 'Test',
      execute: jest.fn(),
      undo: jest.fn(),
    });
    const after = Date.now();

    expect(command.timestamp).toBeGreaterThanOrEqual(before);
    expect(command.timestamp).toBeLessThanOrEqual(after);
  });
});
