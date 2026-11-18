import { z } from 'zod';

export const SMOKING = ['no', 'yes', 'flexible'];
export const PETS = ['no', 'yes', 'flexible'];
export const PARTIES = ['no', 'occasionally', 'flexible'];

const optionalText = (max) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

const id = z.coerce.number().int().positive();

const photoUrl = z
  .union([z.url({ protocol: /^https?$/ }).max(500), z.literal(''), z.null()])
  .optional()
  .transform((v) => v || null);

export const profileSchema = z
  .object({
    bio: optionalText(1000),
    age: z.coerce.number().int().min(18, 'You must be 18 or older').max(99),
    gender: optionalText(30),
    occupation: optionalText(100),
    avatarUrl: photoUrl, // photo of the person
    hasRoom: z.boolean().default(false),
    roomPhotoUrl: photoUrl, // photo of the room on offer (only kept when hasRoom)
    cityId: id,
    areaId: id.nullable().optional().transform((v) => v ?? null),
    searchRadiusKm: z.coerce.number().int().min(1).max(25).default(5),
    smoking: z.enum(SMOKING),
    pets: z.enum(PETS),
    parties: z.enum(PARTIES),
    cleanliness: z.coerce.number().int().min(1).max(5),
    budgetMin: z.coerce.number().int().min(0).max(10_000_000),
    budgetMax: z.coerce.number().int().min(0).max(10_000_000),
    moveInDate: z.iso.date('Pick a valid date'),
  })
  .refine((p) => p.budgetMin <= p.budgetMax, {
    path: ['budgetMax'],
    message: 'Max budget must be at least the min budget',
  })
  .transform((p) => (p.hasRoom ? p : { ...p, roomPhotoUrl: null }));

export const userIdParams = z.object({ userId: id });
