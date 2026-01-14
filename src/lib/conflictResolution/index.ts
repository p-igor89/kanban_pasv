/**
 * Conflict Resolution System
 * Exports for conflict detection and resolution
 */

// Types
export type {
  ConflictType,
  ResolutionStrategy,
  VersionedData,
  Conflict,
  ConflictResolution,
  MergeStrategy,
} from './types';

// Detector
export {
  hasConflict,
  detectConflictType,
  detectFieldConflicts,
  isStaleUpdate,
  canAutoMerge,
  createConflict,
} from './detector';

// Resolver
export {
  lastWriteWins,
  firstWriteWins,
  mergeUpdates,
  mergeArrays,
  deepMerge,
  resolveConflict,
  createMergeStrategy,
} from './resolver';
