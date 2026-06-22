import { z } from "zod";

export const UserProfileSchema = z.object({
  height: z.number().nullable().optional(),
  weight: z.number().nullable().optional(),
  budget: z.number().nullable().optional(),
  dailyHours: z.number().nullable().optional(),
  material: z.enum(['mesh', 'leather']).nullable().optional(),
  usage: z.enum(['gaming', 'programming', 'office']).nullable().optional()
});

// DATABASE_URL = "postgresql://neondb_owner:npg_XcSVwd5KZ2Ag@ep-solitary-night-afm6vxbu-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=verify-full&channel_binding=require"
// JWT_SECRET = "g9F2d8JmsL0aeXzQ6pWvNr9uK1tY4cE3bA7hV"
// OPENAI_API_KEY = ""
// GLM_API_KEY = "524a8fab05f04c309c844ca3c215796b.Z0GZjOdUZKbwhoqB"
// SENSENOVA_API_KEY = "sk-W79dQYVX9GKqrcVow86qG8DOJjqcjReC"

export type UserProfile = z.infer<typeof UserProfileSchema>;