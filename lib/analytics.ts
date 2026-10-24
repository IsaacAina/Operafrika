import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/db'

/**
 * Strict union of allowed analytics events defined in rules/analytics-events.md.
 * Do not add an unlisted event without product owner instruction.
 */
export type AnalyticsEventType =
  // Authentication
  | 'user_signed_up'
  | 'user_logged_in'
  | 'user_logged_out'
  | 'password_reset_requested'
  | 'password_reset_completed'
  // Business and onboarding
  | 'business_created'
  | 'business_profile_updated'
  | 'branch_created'
  | 'branch_updated'
  | 'onboarding_started'
  | 'onboarding_completed'
  | 'onboarding_abandoned'
  // Sales
  | 'sale_created'
  | 'sale_updated'
  | 'sale_cancelled'
  // Invoices
  | 'invoice_created'
  | 'invoice_updated'
  | 'invoice_sent'
  | 'invoice_paid'
  | 'invoice_partially_paid'
  | 'invoice_cancelled'
  | 'invoice_status_changed'
  // Income and expenses
  | 'income_recorded'
  | 'income_updated'
  | 'income_cancelled'
  | 'expense_created'
  | 'expense_updated'
  | 'expense_cancelled'
  // Inventory
  | 'product_created'
  | 'product_updated'
  | 'product_archived'
  | 'stock_added'
  | 'stock_removed'
  | 'stock_adjusted'
  | 'low_stock_triggered'
  // Customers
  | 'customer_created'
  | 'customer_updated'
  | 'customer_archived'
  | 'customer_import_started'
  | 'customer_import_completed'
  | 'customer_import_failed'
  // Staff
  | 'staff_added'
  | 'staff_updated'
  | 'staff_deactivated'
  // Payroll
  | 'payroll_record_created'
  | 'payroll_record_updated'
  | 'payroll_status_changed'
  // Reports and exports
  | 'report_viewed'
  | 'report_exported'
  | 'data_export_requested'
  | 'data_export_completed'
  // AI
  | 'ai_question_asked'
  | 'ai_response_generated'
  | 'ai_response_failed'
  | 'ai_feature_used'
  | 'ai_prediction_generated'
  // Subscription
  | 'trial_started'
  | 'subscription_started'
  | 'subscription_upgraded'
  | 'subscription_downgraded'
  | 'subscription_cancelled'
  | 'subscription_expired'
  // Engagement
  | 'dashboard_viewed'
  | 'notification_viewed'
  | 'notification_clicked'

export type AnalyticsClient = Pick<Prisma.TransactionClient, 'analyticsEvent'>

export interface AnalyticsEventData {
  eventType: AnalyticsEventType
  userId?: string | null
  businessId?: string | null
  branchId?: string | null
  sessionId?: string | null
  metadata?: Prisma.InputJsonValue | undefined
}

/**
 * Writes an analytics event inside a database transaction or with a given client.
 * Never stores financial amounts or customer names in metadata.
 */
export async function trackAnalyticsEvent(
  client: AnalyticsClient,
  event: AnalyticsEventData,
): Promise<void> {
  await client.analyticsEvent.create({
    data: {
      eventType: event.eventType,
      userId: event.userId ?? null,
      businessId: event.businessId ?? null,
      branchId: event.branchId ?? null,
      sessionId: event.sessionId ?? null,
      metadata: event.metadata,
    },
  })
}

/**
 * Writes an analytics event outside an explicit transaction using the primary DB client.
 * Swallows unexpected errors gracefully to avoid breaking user flows for tracking.
 */
export async function trackAnalyticsEventNow(
  event: AnalyticsEventData,
): Promise<void> {
  try {
    await trackAnalyticsEvent(prisma, event)
  } catch (error) {
    console.error('Failed to log analytics event:', event.eventType, error)
  }
}
