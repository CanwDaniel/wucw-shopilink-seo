import { z } from "zod";

export type AIAction = "continue" | "recommend" | "compare";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type AIResponse = {
  message: string;
  action: AIAction;
  products?: any[];
  comparison?: any;
  profile?: any;
};

export const UserProfileSchema = z.object({
  height: z.union([z.number(), z.string()]).nullable().optional(),
  weight: z.union([z.number(), z.string()]).nullable().optional(),
  budget: z.union([z.number(), z.string()]).nullable().optional(),
  dailyHours: z.union([z.number(), z.string()]).nullable().optional(),
  material: z.string().nullable().optional(),
  usage: z.enum(["gaming", "programming", "office"]).nullable().optional(),
  // material: z.enum(['mesh', 'leather', '']).nullable().optional(),
  // usage: z.enum(['gaming', 'programming', 'office', '']).nullable().optional()
});

export type UserProfile = z.infer<typeof UserProfileSchema>;
