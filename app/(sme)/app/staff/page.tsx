import type { Metadata } from 'next'
import { getRequestUser } from '@/lib/request-user'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { toRlsRole, withRls } from '@/lib/rls'
import { getDashboardScope } from '@/lib/dashboard'
import {
  listStaffMembers,
  listPayrollRecords,
  type StaffActor,
  type PayrollRecordDetail,
} from '@/lib/staff'
import UserAvatarMenu from '../user-avatar-menu'
import NotificationCenter from '../notification-center'
import StaffView from './staff-view'
import { ShieldAlert, Users, ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Staff & Payroll | Operafrika',
  description: 'Manage branch team roster, roles, and confidential record-only payroll',
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ branch?: string | string[] }>
}) {
  const user = await getRequestUser()
  if (!user) redirect('/app/auth?view=login')
  if (!user.emailVerified) redirect('/app/auth/verify-email')

  const params = await searchParams
  const branchParam = typeof params.branch === 'string' ? params.branch : undefined

  const rlsRole = toRlsRole(user.role)

  const data = await withRls(
    {
      role: rlsRole,
      businessId: user.businessId,
      userId: user.userId,
    },
    async (tx) => {
      const dbUser = await tx.user.findUnique({
        where: { id: user.userId },
        select: { onboardingCompletedAt: true },
      })

      if (!dbUser?.onboardingCompletedAt) {
        return { onboarding: true as const }
      }

      const business = await tx.business.findUnique({
        where: { id: user.businessId },
        select: { name: true, currency: true },
      })

      const scope = await getDashboardScope(tx, {
        userId: user.userId,
        businessId: user.businessId,
        role: user.role,
        branchParam,
      })

      if (user.role === 'STAFF') {
        return {
          onboarding: false as const,
          business,
          scope,
          staffList: [],
          payrollList: {
            records: [] as PayrollRecordDetail[],
            totalAmount: 0,
            totalPaid: 0,
            totalUnpaid: 0,
            totalCount: 0,
          },
        }
      }

      const actor: StaffActor = {
        userId: user.userId,
        role: user.role,
        businessId: user.businessId,
        email: user.email,
      }

      // 1. Staff Members List
      const staffList = await listStaffMembers(tx, actor, {
        businessId: user.businessId,
        branchId: scope.selectedBranch?.id,
      })

      // 2. Payroll Records (Owner Only)
      let payrollList = {
        records: [] as PayrollRecordDetail[],
        totalAmount: 0,
        totalPaid: 0,
        totalUnpaid: 0,
        totalCount: 0,
      }

      if (user.role === 'OWNER') {
        const pRes = await listPayrollRecords(tx, actor, {
          businessId: user.businessId,
          branchId: scope.selectedBranch?.id,
        })
        payrollList = {
          records: pRes.records,
          totalAmount: pRes.totalAmount,
          totalPaid: pRes.totalPaid,
          totalUnpaid: pRes.totalUnpaid,
          totalCount: pRes.totalCount,
        }
      }

      return {
        onboarding: false as const,
        business,
        scope,
        staffList,
        payrollList,
      }
    }
  )

  if (data.onboarding) {
    redirect('/app/onboarding')
  }

  const branches = data.scope.branches.map((b) => ({
    id: b.id,
    name: b.name,
  }))

  return (
    <main
      className="route-page-container"
      style={{
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        textAlign: 'left',
        padding: 'var(--ds-space-6) var(--ds-space-10)',
        backgroundColor: 'var(--ds-color-surface)',
        minHeight: '100vh',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1240px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--ds-space-6)',
        }}
      >
        {/* Global SME Header */}
        <header role="banner" style={{ width: '100%' }}>
          {/* Desktop Header */}
          <div className="subpage-desktop-header">
            {/* Brand Logo & Back to Dashboard */}
            <div className="subpage-header-left">
              <Link
                href="/app"
                aria-label="Back to dashboard"
                title="Back to dashboard"
                className="subpage-header-btn"
              >
                <ArrowLeft size={18} />
              </Link>
              <div className="subpage-header-logo-box">
                <Image src="/icon.svg" alt="Operafrika" width={28} height={28} priority />
              </div>
              <div style={{ minWidth: 0 }}>
                <span className="subpage-header-title-text">
                  {data.business?.name || 'Operafrika Business'}
                </span>
                <span className="subpage-header-subtitle-text">
                  <Users size={13} color="var(--ds-color-primary)" />
                  <span>Team &amp; Confidential Payroll &middot; <strong>{data.business?.currency ?? 'NGN'}</strong></span>
                </span>
              </div>
            </div>

            {/* Right Side Header: Notifications & Round Avatar Menu */}
            <div className="subpage-header-right">
              <NotificationCenter />
              <UserAvatarMenu
                name={data.business?.name ?? 'Operafrika Business'}
                email={user.email}
                role={user.role}
              />
            </div>
          </div>

          {/* Mobile Subpage Header: Back button and only the title of the rendered page */}
          <div className="subpage-mobile-header">
            <Link
              href="/app"
              aria-label="Back to dashboard"
              title="Back to dashboard"
              className="subpage-header-btn"
            >
              <ArrowLeft size={18} />
            </Link>
            <h1 className="subpage-mobile-title">Staff &amp; Payroll</h1>
          </div>
        </header>

        {/* Staff Role Access Barrier (Permission Matrix rule) */}
        {user.role === 'STAFF' ? (
          <div
            style={{
              padding: 'var(--ds-space-8)',
              borderRadius: 'var(--ds-radius-xl)',
              backgroundColor: 'rgba(239, 68, 68, 0.05)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: 'var(--ds-space-4)',
              marginTop: 'var(--ds-space-4)',
            }}
          >
            <ShieldAlert size={48} style={{ color: '#dc2626' }} />
            <h2
              style={{
                margin: 0,
                fontSize: 'var(--ds-font-size-xl)',
                fontWeight: 700,
                color: 'var(--ds-color-on-surface)',
              }}
            >
              Access Restricted
            </h2>
            <p
              style={{
                margin: 0,
                maxWidth: '560px',
                fontSize: 'var(--ds-font-size-sm)',
                lineHeight: 1.6,
                color: 'var(--ds-color-on-surface-variant)',
              }}
            >
              Under Operafrika&apos;s authorization policy, Staff accounts are not permitted to view or manage staff
              records and payroll compensation. Please contact your Branch Manager or Business Owner if you require
              assistance.
            </p>
            <Link
              href="/app"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--ds-space-2)',
                padding: 'var(--ds-space-3) var(--ds-space-5)',
                borderRadius: 'var(--ds-radius-lg)',
                backgroundColor: 'var(--ds-color-primary)',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: 'var(--ds-font-size-sm)',
                textDecoration: 'none',
                marginTop: 'var(--ds-space-2)',
              }}
            >
              &larr; Return to Dashboard
            </Link>
          </div>
        ) : (
          <StaffView
            initialStaff={data.staffList}
            initialPayroll={data.payrollList.records}
            payrollMetrics={{
              totalAmount: data.payrollList.totalAmount,
              totalPaid: data.payrollList.totalPaid,
              totalUnpaid: data.payrollList.totalUnpaid,
              totalRecords: data.payrollList.totalCount,
            }}
            branches={branches}
            selectedBranchId={data.scope.selectedBranch?.id}
            currency={data.business?.currency || 'NGN'}
            userRole={user.role}
            userEmail={user.email}
          />
        )}
      </div>
    </main>
  )
}
