import { z } from 'zod';

export const LocationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  area: z.string().min(1).max(255),
  code: z.string().min(1).max(50),
  description: z.string().max(1000).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateLocationSchema = z.object({
  name: z.string().min(1).max(255),
  area: z.string().min(1).max(255),
  code: z.string().min(1).max(50),
  description: z.string().max(1000).nullable(),
});

export const UpdateLocationSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  area: z.string().min(1).max(255).optional(),
  code: z.string().min(1).max(50).optional(),
  description: z.string().max(1000).nullable().optional(),
});

export type Location = z.infer<typeof LocationSchema>;
export type CreateLocation = z.infer<typeof CreateLocationSchema>;
export type UpdateLocation = z.infer<typeof UpdateLocationSchema>;

// Default areas for common usage
export const DEFAULT_AREAS = [
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