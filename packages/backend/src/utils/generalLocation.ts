import { db } from '../db';
import { locations } from '../db/schema';
import { and, eq } from 'drizzle-orm';
import { DEFAULT_AREAS } from '@invenflow/shared';

// Generic executor type (can be the global db instance or a transaction client)
type DbExecutor = typeof db | any;

/**
 * Ensure a \"General\" location exists for the given area and return its ID.
 * Uses the provided executor (db or transaction) for all queries.
 * 
 * This function is now safe against race conditions thanks to the unique constraint
 * on (area, name) in the locations table. It uses an INSERT ... ON CONFLICT pattern
 * to handle concurrent requests gracefully.
 */
export async function getOrCreateGeneralLocation(
  executor: DbExecutor,
  area: string
): Promise<string> {
  const normalizedArea = area.trim();
  const code = `${normalizedArea.toUpperCase().replace(/\s+/g, '-')}-GENERAL`;

  try {
    // Use INSERT ... ON CONFLICT DO NOTHING pattern
    // This is atomic and safe against race conditions
    const inserted = await executor
      .insert(locations)
      .values({
        name: 'General',
        area: normalizedArea,
        code,
        isActive: true,
        description: `Default general location for area ${normalizedArea}`,
      })
      .onConflictDoNothing({
        target: [locations.area, locations.name],
      })
      .returning();

    // If we successfully inserted, return the new ID
    if (inserted.length > 0) {
      return inserted[0]!.id;
    }

    // If insert was skipped due to conflict, fetch the existing location
    const [existing] = await executor
      .select()
      .from(locations)
      .where(
        and(
          eq(locations.area, normalizedArea),
          eq(locations.name, 'General')
        )
      )
      .limit(1);

    if (!existing) {
      throw new Error(
        `Failed to create or find General location for area: ${normalizedArea}`
      );
    }

    return existing.id;
  } catch (error: any) {
    // Handle unique constraint violation on code (different area with conflicting code)
    if (error.code === '23505' && error.constraint === 'locations_code_unique') {
      // Code conflict - try with suffix
      let suffix = 1;
      let alternateCode = `${code}-${suffix}`;
      
      // eslint-disable-next-line no-constant-condition
      while (true) {
        try {
          const inserted = await executor
            .insert(locations)
            .values({
              name: 'General',
              area: normalizedArea,
              code: alternateCode,
              isActive: true,
              description: `Default general location for area ${normalizedArea}`,
            })
            .onConflictDoNothing({
              target: [locations.area, locations.name],
            })
            .returning();

          if (inserted.length > 0) {
            return inserted[0]!.id;
          }

          // If still conflict on (area, name), fetch existing
          const [existing] = await executor
            .select()
            .from(locations)
            .where(
              and(
                eq(locations.area, normalizedArea),
                eq(locations.name, 'General')
              )
            )
            .limit(1);

          if (existing) {
            return existing.id;
          }

          throw new Error(
            `Failed to create or find General location for area: ${normalizedArea}`
          );
        } catch (innerError: any) {
          if (innerError.code === '23505' && innerError.constraint === 'locations_code_unique') {
            suffix++;
            alternateCode = `${code}-${suffix}`;
            continue;
          }
          throw innerError;
        }
      }
    }
    
    throw error;
  }
}

/**
 * Ensure all default areas have a corresponding general location.
 * This uses the global db instance (non-transactional) and is safe to call
 * from scripts or admin endpoints.
 */
export async function ensureGeneralLocationsForDefaultAreas(): Promise<void> {
  for (const area of DEFAULT_AREAS) {
    await getOrCreateGeneralLocation(db, area);
  }
}


