import { db } from '../db';
import { locations } from '../db/schema';
import { and, eq } from 'drizzle-orm';
import { DEFAULT_AREAS } from '@invenflow/shared';

// Generic executor type (can be the global db instance or a transaction client)
type DbExecutor = typeof db | any;

/**
 * Ensure a \"General\" location exists for the given area and return its ID.
 * Uses the provided executor (db or transaction) for all queries.
 */
export async function getOrCreateGeneralLocation(
  executor: DbExecutor,
  area: string
): Promise<string> {
  const normalizedArea = area.trim();

  // 1. Try to find existing \"General\" location for this area
  const existing = await executor
    .select()
    .from(locations)
    .where(
      and(
        eq(locations.area, normalizedArea),
        eq(locations.name, 'General')
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return existing[0]!.id;
  }

  // 2. Generate a unique code for the general location
  const baseCode =
    `${normalizedArea.toUpperCase().replace(/\s+/g, '-')}-GENERAL`;

  let code = baseCode;
  let suffix = 1;

  // Ensure code uniqueness (defensive against concurrent usage / legacy data)
  // Loop is expected to be very small since collisions are unlikely
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const [conflict] = await executor
      .select()
      .from(locations)
      .where(eq(locations.code, code))
      .limit(1);

    if (!conflict) {
      break;
    }

    code = `${baseCode}-${suffix++}`;
  }

  // 3. Create the general location
  const [created] = await executor
    .insert(locations)
    .values({
      name: 'General',
      area: normalizedArea,
      code,
      isActive: true,
      description: `Default general location for area ${normalizedArea}`,
    })
    .returning();

  return created.id;
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


