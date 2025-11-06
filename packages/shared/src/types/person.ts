import { z } from 'zod';

export const PersonSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  department: z.string().min(1).max(255),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreatePersonSchema = z.object({
  name: z.string().min(1).max(255),
  department: z.string().min(1).max(255),
  isActive: z.boolean().default(true).optional(),
});

export const UpdatePersonSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  department: z.string().min(1).max(255).optional(),
  isActive: z.boolean().optional(),
});

export type Person = z.infer<typeof PersonSchema>;
export type CreatePerson = z.infer<typeof CreatePersonSchema>;
export type UpdatePerson = z.infer<typeof UpdatePersonSchema>;

// Default departments
export const DEFAULT_DEPARTMENTS = [
  'Operations',
  'Finance',
  'HR',
  'IT',
  'Sales',
  'Marketing',
  'Engineering',
  'Support',
  'Management',
  'Warehouse',
  'Logistics',
  'Quality Assurance',
  'Research & Development',
  'Administration',
  'Other'
] as const;

export type Department = typeof DEFAULT_DEPARTMENTS[number];

// Helper function to generate person display name
export function getPersonDisplayName(person: Person): string {
  return `${person.name} (${person.department})`;
}

// Helper function to check if person is active
export function isPersonActive(person: Person): boolean {
  return person.isActive;
}

