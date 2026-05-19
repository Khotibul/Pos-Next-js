import { z } from "zod";

export const announcementStatusSchema = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);

export const upsertAnnouncementSchema = z.object({
  id: z.string().min(5).optional(),
  title: z.string().trim().min(2).max(160),
  message: z.string().trim().min(2).max(4000),
  status: announcementStatusSchema.default("DRAFT"),
  startsAt: z.string().optional().or(z.literal("")),
  endsAt: z.string().optional().or(z.literal("")),
});

export type UpsertAnnouncementInput = z.infer<typeof upsertAnnouncementSchema>;

