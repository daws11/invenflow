import { z } from 'zod';

// Kanban Link schemas
export const KanbanLinkSchema = z.object({
  id: z.string().uuid(),
  orderKanbanId: z.string().uuid(),
  receiveKanbanId: z.string().uuid(),
  createdAt: z.date(),
});

export const CreateKanbanLinkSchema = z.object({
  orderKanbanId: z.string().uuid(),
  receiveKanbanId: z.string().uuid(),
});

export const DeleteKanbanLinkSchema = z.object({
  linkId: z.string().uuid(),
});

// Types
export type KanbanLink = z.infer<typeof KanbanLinkSchema>;
export type CreateKanbanLink = z.infer<typeof CreateKanbanLinkSchema>;
export type DeleteKanbanLink = z.infer<typeof DeleteKanbanLinkSchema>;

// Response types with location info
export const LinkedReceiveKanbanSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  locationId: z.string().uuid().nullable(),
  locationName: z.string().nullable(),
  locationArea: z.string().nullable(),
  locationBuilding: z.string().nullable(),
  locationFloor: z.string().nullable(),
  linkId: z.string().uuid(), // The kanban_link id for easy deletion
});

export type LinkedReceiveKanban = z.infer<typeof LinkedReceiveKanbanSchema>;

