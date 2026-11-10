import { Prisma, Role, AuditAction } from '@prisma/client'
import { writeAuditEntry } from '@/lib/audit-log'

export interface SettingsActor {
  userId: string
  role: string
  businessId: string
  email?: string | null
}

export class SettingsError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.name = 'SettingsError'
    this.status = status
  }
}

export interface CommercialPlanTier {
  name: string
  priceDisplay: string
  description: string
  features: string[]
  recommended?: boolean
}

export const COMMERCIAL_PLAN_TIERS: CommercialPlanTier[] = [
  {
    name: 'Free',
    priceDisplay: '₦0 / month',
    description: 'Basic single-device operations for sole proprietors',
    features: ['1 physical branch', '1 user account (Owner)', 'Invoicing & receipt generation', 'Basic stock tracking'],
  },
  {
    name: 'Starter',
    priceDisplay: '₦15,000 / month',
    description: 'Essential operating tools for single-branch retail stores',
    features: ['1 physical branch', 'Up to 3 staff accounts', 'Customer directory & CSV import', 'Direct income & expense logging'],
  },
  {
    name: 'Growth',
    priceDisplay: '₦35,000 / month',
    recommended: true,
    description: 'Multi-branch operations and advanced profit & loss intelligence',
    features: [
      'Up to 3 physical branches',
      'Unlimited staff & managers',
      'Consolidated P&L reporting & CSV/PDF exports',
      'Record-only payroll tracking',
      'AI business assistant across branches',
    ],
  },
  {
    name: 'Business',
    priceDisplay: '₦75,000 / month',
    description: 'Comprehensive operations for expanding multi-unit businesses',
    features: [
      'Up to 10 physical branches',
      'Full structured security audit log',
      'Automated low-stock branch transfers',
      'Priority customer onboarding & WhatsApp support',
    ],
  },
  {
    name: 'Enterprise',
    priceDisplay: 'Custom / Annual',
    description: 'Custom corporate infrastructure and dedicated platform account manager',
    features: ['Unlimited branches & warehouses', 'Custom data export & reporting', 'Dedicated Nigerian account manager', 'SLA guaranteed uptime'],
  },
]

export interface BusinessSettingsDetail {
  id: string
  name: string
  businessType: string
  currency: string
  contactInfo: string | null
  createdAt: Date
  subscription: {
    planName: string
    price: number
    renewalDate: Date
    isFreeEarlyAccess: boolean
    earlyAccessNotice: string
  }
}

export interface UpdateBusinessProfileInput {
  name?: string
  businessType?: string
  contactInfo?: string
}

/**
 * Retrieves business settings and subscription status.
 * Owner has full management access.
 * Manager has read-only access.
 * Staff has NO access (Permission Matrix rule).
 */
export async function getBusinessSettings(
  tx: Prisma.TransactionClient,
  actor: SettingsActor,
): Promise<BusinessSettingsDetail> {
  if (actor.role === 'STAFF') {
    throw new SettingsError('Staff accounts are not authorized to view or edit business settings.', 403)
  }

  const business = await tx.business.findUnique({
    where: { id: actor.businessId },
    include: { subscription: true },
  })

  if (!business) {
    throw new SettingsError('Business record not found.', 404)
  }

  const sub = business.subscription

  return {
    id: business.id,
    name: business.name,
    businessType: business.businessType,
    currency: business.currency,
    contactInfo: business.contactInfo,
    createdAt: business.createdAt,
    subscription: {
      planName: sub?.planName || 'Free Early Access (Beta)',
      price: sub ? Number(sub.price) : 0,
      renewalDate: sub?.renewalDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      isFreeEarlyAccess: true,
      earlyAccessNotice:
        'All features are 100% free until V2 commercial launch. When V2 launches with automated Flutterwave billing, your business will transition to your chosen tier with 30 days advance notice.',
    },
  }
}

/**
 * Updates business profile settings (Name, Category, Contact Info).
 * Strictly restricted to Owner accounts.
 * Currency CANNOT be changed (locked at onboarding; Platform Admin only).
 */
export async function updateBusinessProfile(
  tx: Prisma.TransactionClient,
  actor: SettingsActor,
  input: UpdateBusinessProfileInput,
): Promise<BusinessSettingsDetail> {
  if (actor.role !== 'OWNER') {
    throw new SettingsError('Only Business Owners can modify business profile settings.', 403)
  }

  const existing = await tx.business.findUnique({
    where: { id: actor.businessId },
    include: { subscription: true },
  })

  if (!existing) {
    throw new SettingsError('Business record not found.', 404)
  }

  const dataToUpdate: Prisma.BusinessUpdateInput = {}

  if (input.name !== undefined) {
    const t = input.name.trim()
    if (!t) throw new SettingsError('Business name cannot be empty.', 400)
    dataToUpdate.name = t
  }

  if (input.businessType !== undefined) {
    const t = input.businessType.trim()
    if (!t) throw new SettingsError('Business category cannot be empty.', 400)
    dataToUpdate.businessType = t
  }

  if (input.contactInfo !== undefined) {
    dataToUpdate.contactInfo = input.contactInfo.trim() || null
  }

  const updated = await tx.business.update({
    where: { id: actor.businessId },
    data: dataToUpdate,
    include: { subscription: true },
  })

  await writeAuditEntry(tx, {
    businessId: updated.id,
    userId: actor.userId,
    actorEmail: actor.email,
    action: AuditAction.ROLE_PERMISSION_CHANGED,
    resourceType: 'BusinessProfile',
    resourceId: updated.id,
    previousValue: { name: existing.name, businessType: existing.businessType, contactInfo: existing.contactInfo },
    newValue: { name: updated.name, businessType: updated.businessType, contactInfo: updated.contactInfo },
  })

  const sub = updated.subscription

  return {
    id: updated.id,
    name: updated.name,
    businessType: updated.businessType,
    currency: updated.currency,
    contactInfo: updated.contactInfo,
    createdAt: updated.createdAt,
    subscription: {
      planName: sub?.planName || 'Free Early Access (Beta)',
      price: sub ? Number(sub.price) : 0,
      renewalDate: sub?.renewalDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      isFreeEarlyAccess: true,
      earlyAccessNotice:
        'All features are 100% free until V2 commercial launch. When V2 launches with automated Flutterwave billing, your business will transition to your chosen tier with 30 days advance notice.',
    },
  }
}

