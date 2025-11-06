import { z } from 'zod';

// Location types
export const LocationTypeEnum = z.enum(['physical', 'person']);
export type LocationType = z.infer<typeof LocationTypeEnum>;

export const LocationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  area: z.string().min(1).max(255),
  code: z.string().min(1).max(50),
  type: LocationTypeEnum,
  description: z.string().max(1000).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateLocationSchema = z.object({
  name: z.string().min(1).max(255),
  area: z.string().min(1).max(255),
  code: z.string().min(1).max(50),
  type: LocationTypeEnum.default('physical'),
  description: z.string().max(1000).nullable(),
});

export const UpdateLocationSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  area: z.string().min(1).max(255).optional(),
  code: z.string().min(1).max(50).optional(),
  type: LocationTypeEnum.optional(),
  description: z.string().max(1000).nullable().optional(),
});

export type Location = z.infer<typeof LocationSchema>;
export type CreateLocation = z.infer<typeof CreateLocationSchema>;
export type UpdateLocation = z.infer<typeof UpdateLocationSchema>;

// Default areas for physical locations
export const DEFAULT_PHYSICAL_AREAS = [
  'Gudang Utama',
  'Gudang A',
  'Gudang B',
  'Gudang C',
  'Workshop',
  'Kantor',
  'Showroom',
  'Ruang Produksi',
  'Area Packaging',
  'Gudang Sementara'
] as const;

// Default areas for person assignments
export const DEFAULT_PERSON_AREAS = [
  'Assigned Personnel',
  'HR Team',
  'IT Team',
  'Finance Team',
  'Operations Team',
  'Management',
  'Sales Team',
  'Marketing Team',
  'Engineering Team',
  'Support Team'
] as const;

// Combined default areas
export const DEFAULT_AREAS = [...DEFAULT_PHYSICAL_AREAS, ...DEFAULT_PERSON_AREAS] as const;

export type Area = typeof DEFAULT_AREAS[number];

// Helper function to generate location code
export function generateLocationCode(area: string, name: string): string {
  const areaCode = area.toUpperCase().replace(/\s+/g, '-').substring(0, 10);
  const nameCode = name.toUpperCase().replace(/\s+/g, '-').substring(0, 15);
  return `${areaCode}-${nameCode}`;
}

// Helper function to validate location code uniqueness
export function isValidLocationCode(code: string, existingCodes: string[]): boolean {
  return !existingCodes.includes(code);
}

// Helper function to get appropriate areas based on location type
export function getAreasByType(type: LocationType): readonly string[] {
  return type === 'person' ? DEFAULT_PERSON_AREAS : DEFAULT_PHYSICAL_AREAS;
}