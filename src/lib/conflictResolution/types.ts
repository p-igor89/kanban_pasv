/**
 * Conflict Resolution Types
 * Types for detecting and resolving data conflicts in realtime updates
 */

/**
 * Conflict types
 */
export type ConflictType =
  | 'concurrent_edit' // Two users edited same field
  | 'delete_edit' // One user deleted, another edited
  | 'move_edit' // One user moved, another edited
  | 'order_conflict'; // Reordering conflicts

/**
 * Conflict resolution strategy
 */
export type ResolutionStrategy =
  | 'last_write_wins' // Latest update wins (default)
  | 'first_write_wins' // First update wins
  | 'merge' // Merge both updates
  | 'manual'; // User must resolve manually

/**
 * Data version tracking
 */
export interface VersionedData<T> {
  data: T;
  version: number;
  updatedAt: string;
  updatedBy: string;
}

/**
 * Conflict detection result
 */
export interface Conflict<T = unknown> {
  type: ConflictType;
  localVersion: VersionedData<T>;
  remoteVersion: VersionedData<T>;
  field?: string; // Which field has conflict
  detectedAt: string;
}

/**
 * Conflict resolution result
 */
export interface ConflictResolution<T> {
  resolved: boolean;
  strategy: ResolutionStrategy;
  result: T;
  conflicts?: Conflict<T>[];
}

/**
 * Merge strategy function
 */
export type MergeStrategy<T> = (
  local: VersionedData<T>,
  remote: VersionedData<T>
) => ConflictResolution<T>;
