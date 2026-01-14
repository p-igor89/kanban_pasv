/**
 * Conflict Resolution Hook
 * React hook for detecting and resolving data conflicts
 */

import { useCallback, useState } from 'react';
import {
  hasConflict,
  resolveConflict,
  type VersionedData,
  type ConflictResolution,
  type ResolutionStrategy,
  type Conflict,
} from '@/lib/conflictResolution';

interface UseConflictResolutionOptions {
  strategy?: ResolutionStrategy;
  onConflictDetected?: (conflict: Conflict) => void;
  onConflictResolved?: (resolution: ConflictResolution<unknown>) => void;
}

/**
 * Hook for handling conflicts in realtime updates
 */
export function useConflictResolution<T extends Record<string, unknown>>(
  options: UseConflictResolutionOptions = {}
) {
  const { strategy = 'last_write_wins', onConflictDetected, onConflictResolved } = options;

  const [pendingConflicts, setPendingConflicts] = useState<Conflict<T>[]>([]);
  const [lastResolution, setLastResolution] = useState<ConflictResolution<T> | null>(null);

  /**
   * Check for conflicts and resolve
   */
  const handleUpdate = useCallback(
    (local: VersionedData<T> | null, remote: VersionedData<T>): T => {
      // No conflict if no local version
      if (!local) {
        return remote.data;
      }

      // Check for conflict
      if (!hasConflict(local, remote)) {
        // No conflict, use remote data
        return remote.data;
      }

      // Conflict detected
      const conflict: Conflict<T> = {
        type: 'concurrent_edit',
        localVersion: local,
        remoteVersion: remote,
        detectedAt: new Date().toISOString(),
      };

      // Notify about conflict
      if (onConflictDetected) {
        onConflictDetected(conflict);
      }

      // Resolve conflict
      const resolution = resolveConflict(local, remote, strategy);

      // Store resolution
      setLastResolution(resolution);

      // If not resolved, add to pending
      if (!resolution.resolved) {
        setPendingConflicts((prev) => [...prev, conflict]);
      }

      // Notify about resolution
      if (onConflictResolved) {
        onConflictResolved(resolution);
      }

      return resolution.result;
    },
    [strategy, onConflictDetected, onConflictResolved]
  );

  /**
   * Manually resolve a pending conflict
   */
  const resolveManually = useCallback((conflictIndex: number, resolvedData: T) => {
    setPendingConflicts((prev) => {
      const newConflicts = [...prev];
      newConflicts.splice(conflictIndex, 1);
      return newConflicts;
    });

    setLastResolution({
      resolved: true,
      strategy: 'manual',
      result: resolvedData,
    });
  }, []);

  /**
   * Clear all pending conflicts
   */
  const clearConflicts = useCallback(() => {
    setPendingConflicts([]);
  }, []);

  /**
   * Create versioned data from current state
   */
  const createVersion = useCallback((data: T, userId: string = 'local'): VersionedData<T> => {
    return {
      data,
      version: Date.now(),
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    };
  }, []);

  return {
    handleUpdate,
    resolveManually,
    clearConflicts,
    createVersion,
    pendingConflicts,
    lastResolution,
    hasPendingConflicts: pendingConflicts.length > 0,
  };
}

/**
 * Hook for tracking data versions
 */
export function useVersionTracking<T extends Record<string, unknown>>(initialData: T) {
  const [versionedData, setVersionedData] = useState<VersionedData<T>>(() => ({
    data: initialData,
    version: 1,
    updatedAt: new Date().toISOString(),
    updatedBy: 'local',
  }));

  /**
   * Update data and increment version
   */
  const updateData = useCallback((newData: T, userId: string = 'local') => {
    setVersionedData((prev) => ({
      data: newData,
      version: prev.version + 1,
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    }));
  }, []);

  /**
   * Set data with specific version (from server)
   */
  const setVersion = useCallback((newVersionedData: VersionedData<T>) => {
    setVersionedData(newVersionedData);
  }, []);

  return {
    versionedData,
    updateData,
    setVersion,
  };
}
