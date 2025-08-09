import { z } from "zod";

const rfc3339 = z.string().regex(
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+\-]\d{2}:\d{2})$/,
  "Must be RFC3339 with timezone"
);

export const CreateEventSchema = z.object({
  summary: z.string().min(1),
  description: z.string().optional(),
  start: rfc3339,
  end: rfc3339,
  timeZone: z.string().default("America/New_York"),
  attendees: z.array(z.object({ email: z.string().email() })).optional(),
  location: z.string().optional(),
  allDay: z.boolean().optional().default(false),
}).refine(v => new Date(v.end).getTime() > new Date(v.start).getTime(), {
  path: ["end"], 
  message: "End must be after start"
});

export type CreateEventInput = z.infer<typeof CreateEventSchema>;
