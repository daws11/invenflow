import { z } from 'zod';

export const PersonSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  departmentId: z.string().uuid(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreatePersonSchema = z.object({
  name: z.string().min(1).max(255),
  departmentId: z.string().uuid(),
  isActive: z.boolean().default(true).optional(),
});

export const UpdatePersonSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  departmentId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
});

export type Person = z.infer<typeof PersonSchema>;
export type CreatePerson = z.infer<typeof CreatePersonSchema>;
export type UpdatePerson = z.infer<typeof UpdatePersonSchema>;

// Helper function to generate person display name
export function getPersonDisplayName(person: Person, departmentName?: string): string {
  return departmentName ? `${person.name} (${departmentName})` : person.name;
}

// Helper function to check if person is active
export function isPersonActive(person: Person): boolean {
  return person.isActive;
}

