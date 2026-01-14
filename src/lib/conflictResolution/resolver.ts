/**
 * Conflict Resolver
 * Resolves conflicts using different strategies
 */

import type {
  ConflictResolution,
  VersionedData,
  ResolutionStrategy,
  MergeStrategy,
  Conflict,
} from './types';
import { detectFieldConflicts, canAutoMerge } from './detector';

/**
 * Last Write Wins strategy
 * The most recent update wins
 */
export function lastWriteWins<T>(
  local: VersionedData<T>,
  remote: VersionedData<T>
): ConflictResolution<T> {
  const localTime = new Date(local.updatedAt).getTime();
  const remoteTime = new Date(remote.updatedAt).getTime();

  return {
    resolved: true,
    strategy: 'last_write_wins',
    result: remoteTime > localTime ? remote.data : local.data,
  };
}

/**
 * First Write Wins strategy
 * The first update wins (reject later updates)
 */
export function firstWriteWins<T>(
  local: VersionedData<T>,
  remote: VersionedData<T>
): ConflictResolution<T> {
  const localTime = new Date(local.updatedAt).getTime();
  const remoteTime = new Date(remote.updatedAt).getTime();

  return {
    resolved: true,
    strategy: 'first_write_wins',
    result: localTime < remoteTime ? local.data : remote.data,
  };
}

/**
 * Merge strategy
 * Attempt to merge both updates intelligently
 */
export function mergeUpdates<T extends Record<string, unknown>>(
  local: VersionedData<T>,
  remote: VersionedData<T>
): ConflictResolution<T> {
  // If can auto-merge, merge non-conflicting fields
  if (canAutoMerge(local, remote)) {
    const merged = { ...local.data };

    // Take remote values for changed fields
    for (const key in remote.data) {
      if (Object.prototype.hasOwnProperty.call(remote.data, key)) {
        const localValue = local.data[key];
        const remoteValue = remote.data[key];

        // If remote changed this field, take remote value
        if (JSON.stringify(localValue) !== JSON.stringify(remoteValue)) {
          merged[key] = remoteValue;
        }
      }
    }

    return {
      resolved: true,
      strategy: 'merge',
      result: merged as T,
    };
  }

  // Can't auto-merge, needs manual resolution
  const fieldConflicts = detectFieldConflicts(local, remote);

  return {
    resolved: false,
    strategy: 'manual',
    result: local.data, // Keep local for now
    conflicts: fieldConflicts.map((fc) => fc.conflict as Conflict<T>),
  };
}

/**
 * Merge arrays (for tags, etc.)
 */
export function mergeArrays<T>(local: T[], remote: T[]): T[] {
  // Union of both arrays (remove duplicates)
  const merged = [...local];

  for (const item of remote) {
    if (!merged.some((m) => JSON.stringify(m) === JSON.stringify(item))) {
      merged.push(item);
    }
  }

  return merged;
}

/**
 * Merge objects deeply
 */
export function deepMerge<T extends Record<string, unknown>>(local: T, remote: T): T {
  const result = { ...local };

  for (const key in remote) {
    if (Object.prototype.hasOwnProperty.call(remote, key)) {
      const localValue = local[key];
      const remoteValue = remote[key];

      // If both are arrays, merge them
      if (Array.isArray(localValue) && Array.isArray(remoteValue)) {
        result[key] = mergeArrays(localValue, remoteValue) as T[Extract<keyof T, string>];
      }
      // If both are objects, merge recursively
      else if (
        typeof localValue === 'object' &&
        localValue !== null &&
        typeof remoteValue === 'object' &&
        remoteValue !== null &&
        !Array.isArray(localValue) &&
        !Array.isArray(remoteValue)
      ) {
        result[key] = deepMerge(
          localValue as Record<string, unknown>,
          remoteValue as Record<string, unknown>
        ) as T[Extract<keyof T, string>];
      }
      // Otherwise, take remote value
      else {
        result[key] = remoteValue;
      }
    }
  }

  return result;
}

/**
 * Resolve conflict with given strategy
 */
export function resolveConflict<T extends Record<string, unknown>>(
  local: VersionedData<T>,
  remote: VersionedData<T>,
  strategy: ResolutionStrategy = 'last_write_wins'
): ConflictResolution<T> {
  switch (strategy) {
    case 'last_write_wins':
      return lastWriteWins(local, remote);

    case 'first_write_wins':
      return firstWriteWins(local, remote);

    case 'merge':
      return mergeUpdates(local, remote);

    case 'manual':
      return {
        resolved: false,
        strategy: 'manual',
        result: local.data,
        conflicts: detectFieldConflicts(local, remote).map((fc) => fc.conflict as Conflict<T>),
      };

    default:
      return lastWriteWins(local, remote);
  }
}

/**
 * Create custom merge strategy
 */
export function createMergeStrategy<T extends Record<string, unknown>>(
  customMerge: (local: T, remote: T) => T
): MergeStrategy<T> {
  return (local, remote) => {
    try {
      const result = customMerge(local.data, remote.data);

      return {
        resolved: true,
        strategy: 'merge',
        result,
      };
    } catch {
      // Fallback to last write wins on error
      return lastWriteWins(local, remote);
    }
  };
}
