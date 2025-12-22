/**
 * BENCHMARK MIGRATION UTILITIES
 * 
 * Handles one-time migration of existing benchmarks
 * to add paramsVersionUsed field for historical preservation.
 */

import type { DayWorkout, WorkoutBlock } from '@/types/outlier';
import { getActiveParams } from '@/config/outlierParams';

const MIGRATION_FLAG_KEY = 'outlier-benchmark-migration-v1';

/**
 * Check if migration has already been run
 */
function hasMigrationRun(): boolean {
  try {
    return localStorage.getItem(MIGRATION_FLAG_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Mark migration as complete
 */
function markMigrationComplete(): void {
  try {
    localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
  } catch {
    console.warn('[benchmarkMigration] Could not save migration flag');
  }
}

/**
 * Migrate a single workout block to add paramsVersionUsed if missing
 * Returns true if the block was modified
 */
export function migrateBlock(block: WorkoutBlock): boolean {
  // Only migrate benchmarks without paramsVersionUsed
  if (!block.isBenchmark || block.paramsVersionUsed) {
    return false;
  }
  
  const currentParams = getActiveParams();
  
  // Set paramsVersionUsed to current version (best effort for historical data)
  block.paramsVersionUsed = currentParams.version;
  block.updatedAt = new Date().toISOString();
  
  // Set createdAt if missing (estimate from now)
  if (!block.createdAt) {
    block.createdAt = new Date().toISOString();
  }
  
  console.log(`[benchmarkMigration] Migrated benchmark ${block.id} to version ${currentParams.version}`);
  return true;
}

/**
 * Migrate all workouts in the store
 * This should be called once when the app loads
 * Returns the migrated workouts if any changes were made, null otherwise
 */
export function migrateWorkouts(workouts: DayWorkout[]): DayWorkout[] | null {
  // Skip if already migrated
  if (hasMigrationRun()) {
    return null;
  }
  
  let hasChanges = false;
  
  for (const workout of workouts) {
    for (const block of workout.blocks) {
      if (migrateBlock(block)) {
        hasChanges = true;
      }
    }
  }
  
  if (hasChanges) {
    markMigrationComplete();
    return workouts;
  }
  
  // Mark as complete even if no changes (no benchmarks to migrate)
  markMigrationComplete();
  return null;
}

/**
 * Force migration for a specific set of workouts (admin use)
 * Useful if migration flag was set but some benchmarks were missed
 */
export function forceMigrateWorkouts(workouts: DayWorkout[]): DayWorkout[] {
  for (const workout of workouts) {
    for (const block of workout.blocks) {
      migrateBlock(block);
    }
  }
  return workouts;
}

/**
 * Reset migration flag (for testing)
 */
export function resetMigrationFlag(): void {
  try {
    localStorage.removeItem(MIGRATION_FLAG_KEY);
  } catch {
    // Ignore
  }
}
