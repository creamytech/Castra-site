import { z } from "zod";

export const rfc3339 = z.string().datetime({ offset: true });

export const CreateEventSchema = z.object({
  summary: z.string().min(1),
  description: z.string().optional(),
  start: rfc3339,
  end: rfc3339,
  timeZone: z.string().default("America/New_York"),
  attendees: z.array(z.object({ email: z.string().email() })).optional(),
  location: z.string().optional(),
}).refine(v => new Date(v.end) > new Date(v.start), { 
  message: "end must be after start", 
  path: ["end"] 
});

export type CreateEventInput = z.infer<typeof CreateEventSchema>;
