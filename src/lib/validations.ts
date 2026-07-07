import { z } from 'zod'
import { Role, Priority, CampaignStatus, ProgressCampaignStatus } from '@prisma/client'

// Auth validation
export const loginSchema = z.object({
  email: z.string().email({ message: 'Email tidak valid' }),
  password: z.string().min(6, { message: 'Password minimal 6 karakter' }),
})

export const registerSchema = z.object({
  email: z.string().email({ message: 'Email tidak valid' }),
  password: z.string().min(6, { message: 'Password minimal 6 karakter' }),
  name: z.string().min(2, { message: 'Nama minimal 2 karakter' }),
  role: z.nativeEnum(Role).default(Role.STAFF),
})

// Affiliate validation
export const affiliateSchema = z.object({
  listingDate: z.string().optional().or(z.date()).transform((val) => val ? new Date(val) : null),
  username: z.string().min(1, { message: 'Username TikTok wajib diisi' }),
  name: z.string().optional().nullable(),
  niche: z.string().optional().nullable(),
  profileLink: z.string().optional().nullable(),
  waContact: z.string().optional().nullable(),
  followers: z.string().optional().nullable(),
  followersCount: z.coerce.number().int().default(0),
  gmv: z.string().optional().nullable(),
  gmvCount: z.coerce.number().default(0.0),
  period: z.string().optional().nullable(),
  activation: z.string().optional().nullable(),
  curated: z.boolean().optional(),
  contactConfirmation: z.string().optional().nullable(),
  affiliateConfirmation: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
  email: z.string().email({ message: 'Email tidak valid' }).optional().or(z.literal('')).nullable(),
  instagram: z.string().optional().nullable(),
  status: z.string().default('Belum Dihubungi'),
  priority: z.nativeEnum(Priority).default(Priority.MEDIUM),
  source: z.string().optional().nullable(),
  picId: z.string().optional().nullable(),
  campaignId: z.string().optional().nullable(),
})

// Campaign validation
export const campaignSchema = z.object({
  name: z.string().min(3, { message: 'Nama campaign minimal 3 karakter' }),
  status: z.nativeEnum(CampaignStatus).default(CampaignStatus.UPCOMING),
  budget: z.coerce.number().nonnegative().default(0.0),
  targetCreator: z.coerce.number().int().nonnegative().default(0),
  targetVideo: z.coerce.number().int().nonnegative().default(0),
  targetLive: z.coerce.number().int().nonnegative().default(0),
})

// Deal validation
export const dealSchema = z.object({
  dealDate: z.string().or(z.date()).transform((val) => new Date(val)),
  affiliateId: z.string().min(1, { message: 'Pilih affiliate' }),
  campaignId: z.string().min(1, { message: 'Pilih campaign' }),
  nominal: z.coerce.number().nonnegative().default(0.0),
  product: z.string().min(1, { message: 'Nama produk wajib diisi' }),
  picId: z.string().optional().nullable(),
  statusCampaign: z.string().default('Not Started'),
  targetVideo: z.coerce.number().int().nonnegative().default(0),
  targetLive: z.coerce.number().int().nonnegative().default(0),
  deadline: z.string().optional().or(z.date()).transform((val) => val ? new Date(val) : null),
  completionRate: z.coerce.number().min(0).max(100).default(0.0),
  progressCampaign: z.nativeEnum(ProgressCampaignStatus).default(ProgressCampaignStatus.NOT_STARTED),
})

// Chat Template validation
export const chatTemplateSchema = z.object({
  name: z.string().min(3, { message: 'Nama template minimal 3 karakter' }),
  type: z.string().min(1, { message: 'Tipe template wajib dipilih' }),
  content: z.string().min(10, { message: 'Konten template minimal 10 karakter' }),
})
