/**
 * Conflict Detector
 * Detects conflicts between local and remote data
 */

import type { Conflict, ConflictType, VersionedData } from './types';

/**
 * Compare versions and detect if conflict exists
 */
export function hasConflict<T>(local: VersionedData<T> | null, remote: VersionedData<T>): boolean {
  if (!local) return false;

  // No conflict if versions match
  if (local.version === remote.version) return false;

  // Conflict if local is ahead but different from remote
  // This means concurrent updates happened
  return local.version !== remote.version && local.updatedAt !== remote.updatedAt;
}

/**
 * Detect type of conflict
 */
export function detectConflictType<T extends { id?: string }>(
  local: VersionedData<T> | null,
  remote: VersionedData<T>
): ConflictType {
  if (!local) {
    // Local doesn't have this data, remote added it
    return 'concurrent_edit';
  }

  // Check if deleted on one side
  if (!local.data.id && remote.data.id) {
    return 'delete_edit';
  }

  // Check for move/reorder conflicts (tasks)
  const localData = local.data as { order?: number; status_id?: string };
  const remoteData = remote.data as { order?: number; status_id?: string };

  if (
    localData.order !== undefined &&
    remoteData.order !== undefined &&
    localData.order !== remoteData.order
  ) {
    return 'order_conflict';
  }

  if (
    localData.status_id !== undefined &&
    remoteData.status_id !== undefined &&
    localData.status_id !== remoteData.status_id
  ) {
    return 'move_edit';
  }

  // Default: concurrent edit
  return 'concurrent_edit';
}

/**
 * Detect conflicts in specific fields
 */
export function detectFieldConflicts<T extends Record<string, unknown>>(
  local: VersionedData<T>,
  remote: VersionedData<T>
): Array<{ field: string; conflict: Conflict<unknown> }> {
  const conflicts: Array<{ field: string; conflict: Conflict<unknown> }> = [];

  // Compare each field
  for (const key in remote.data) {
    if (Object.prototype.hasOwnProperty.call(remote.data, key)) {
      const localValue = local.data[key];
      const remoteValue = remote.data[key];

      // Skip if values are the same
      if (JSON.stringify(localValue) === JSON.stringify(remoteValue)) {
        continue;
      }

      // Create conflict for this field
      conflicts.push({
        field: key,
        conflict: {
          type: 'concurrent_edit',
          localVersion: {
            data: localValue,
            version: local.version,
            updatedAt: local.updatedAt,
            updatedBy: local.updatedBy,
          },
          remoteVersion: {
            data: remoteValue,
            version: remote.version,
            updatedAt: remote.updatedAt,
            updatedBy: remote.updatedBy,
          },
          field: key,
          detectedAt: new Date().toISOString(),
        },
      });
    }
  }

  return conflicts;
}

/**
 * Check if update is stale (outdated)
 */
export function isStaleUpdate<T>(
  local: VersionedData<T> | null,
  remote: VersionedData<T>
): boolean {
  if (!local) return false;

  // Remote is stale if its version is older than local
  return remote.version < local.version;
}

/**
 * Check if update can be auto-merged
 */
export function canAutoMerge<T extends Record<string, unknown>>(
  local: VersionedData<T>,
  remote: VersionedData<T>
): boolean {
  const fieldConflicts = detectFieldConflicts(local, remote);

  // Can auto-merge if:
  // 1. No conflicts
  // 2. Conflicts are only in non-critical fields (tags, description)
  if (fieldConflicts.length === 0) return true;

  const nonCriticalFields = ['tags', 'description', 'assignee_color'];
  return fieldConflicts.every((c) => nonCriticalFields.includes(c.field));
}

/**
 * Create conflict object
 */
export function createConflict<T extends { id?: string }>(
  local: VersionedData<T>,
  remote: VersionedData<T>,
  type?: ConflictType,
  field?: string
): Conflict<T> {
  return {
    type: type || detectConflictType(local, remote),
    localVersion: local,
    remoteVersion: remote,
    field,
    detectedAt: new Date().toISOString(),
  };
}
