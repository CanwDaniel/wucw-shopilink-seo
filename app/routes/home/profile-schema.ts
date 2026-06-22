import { z } from "zod";

export const UserProfileSchema = z.object({
  height: z.number().nullable().optional(),
  weight: z.number().nullable().optional(),
  budget: z.number().nullable().optional(),
  dailyHours: z.number().nullable().optional(),
  material: z.enum(['mesh', 'leather']).nullable().optional(),
  usage: z.enum(['gaming', 'programming', 'office']).nullable().optional()
});

export type UserProfile = z.infer<typeof UserProfileSchema>;