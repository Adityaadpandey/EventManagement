import { z } from "zod";

const ticketTypeSchema = z.object({
  name: z.string().min(1, "Ticket name is required"),
  price: z.number().nonnegative("Price must be a non-negative number"),
  quantity: z.number().positive("Quantity must be a positive number"),
});

const customFieldSchema = z.object({
  label: z.string().min(1, "Custom field label is required"),
  fieldType: z.string().min(1, "Custom fieldType is required"),
  required: z.boolean({
    message: "Custom field 'required' must be a boolean",
  }),
});

export const createEventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  banner_horizontal: z.string().url("Invalid banner_horizontal URL"),
  banner_vertical: z.string().url("Invalid banner_vertical URL"),
  banner_square: z.string().url("Invalid banner_square URL"),
  date: z.string().min(1, "Date is required"),
  tags: z.array(z.string()).optional().nullable(),
  time: z.string().min(1, "Time is required"),
  location: z.string().min(1, "Location is required"),
  capacity: z
    .union([z.string(), z.number()])
    .transform((val) => Number(val))
    .optional(),

  samplePoster: z.string().url("Invalid samplePoster URL").optional(),
  socialMediaGraphic: z
    .string()
    .url("Invalid socialMediaGraphic URL")
    .optional(),
  eventFormat: z.string().optional(),
  requestedVenue: z.string().optional(),
  termsConditions: z.string().optional(),
  rulesRegulations: z.string().optional(),
  policies: z.string().optional(),
  dutyLeavesDetails: z.string().optional(),

  ticketTypes: z
    .array(ticketTypeSchema)
    .min(1, "At least one ticket type is required"),

  customFields: z.array(customFieldSchema).optional(),
});

export const patchEventSchema = createEventSchema.partial();
