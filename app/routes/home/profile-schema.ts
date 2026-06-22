import { z } from "zod";

export const UserProfileSchema = z.object({
  height: z.union([z.number(), z.string()]).nullable().optional(),
  weight: z.union([z.number(), z.string()]).nullable().optional(),
  budget: z.union([z.number(), z.string()]).nullable().optional(),
  dailyHours: z.number().nullable().optional(),
  material: z.enum(['mesh', 'leather']).nullable().optional(),
  usage: z.enum(['gaming', 'programming', 'office']).nullable().optional()
});

export type UserProfile = z.infer<typeof UserProfileSchema>;