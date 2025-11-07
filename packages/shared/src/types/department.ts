import { z } from 'zod';

export const DepartmentSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).nullable(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateDepartmentSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).nullable().optional(),
  isActive: z.boolean().default(true).optional(),
});

export const UpdateDepartmentSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).nullable().optional(),
  isActive: z.boolean().optional(),
});

export type Department = z.infer<typeof DepartmentSchema>;
export type CreateDepartment = z.infer<typeof CreateDepartmentSchema>;
export type UpdateDepartment = z.infer<typeof UpdateDepartmentSchema>;

