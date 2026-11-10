import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { toRlsRole, withRls } from '@/lib/rls'
import { getDashboardScope } from '@/lib/dashboard'
import { InvoiceStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

export interface InAppNotification {
  id: string
  title: string
  message: string
  category: 'STOCK' | 'FINANCE' | 'PAYROLL' | 'SECURITY'
  severity: 'CRITICAL' | 'WARNING' | 'INFO'
  createdAt: string
  link: string
  branchName?: string
}

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const branchParam = searchParams.get('branch') || undefined

  try {
    const rlsRole = toRlsRole(session.role)
    const notifications = await withRls(
      {
        role: rlsRole,
        businessId: session.businessId,
        userId: session.userId,
      },
      async (tx) => {
        const business = await tx.business.findUnique({
          where: { id: session.businessId },
          select: { name: true, currency: true },
        })
        const currency = business?.currency ?? 'NGN'

        const scope = await getDashboardScope(tx, {
          userId: session.userId,
          businessId: session.businessId,
          role: session.role,
          branchParam,
        })

        const itemsList: InAppNotification[] = []

        // 1. Stock Alerts (Out of Stock & Low Stock)
        const stockItems = await tx.stockItem.findMany({
          where: {
            branchId: { in: scope.branchIds },
          },
          select: {
            id: true,
            name: true,
            quantity: true,
            reorderThreshold: true,
            branch: { select: { name: true } },
            updatedAt: true,
          },
          orderBy: { quantity: 'asc' },
        })

        for (const item of stockItems) {
          if (item.quantity === 0) {
            itemsList.push({
              id: `stock-out-${item.id}`,
              title: `Out of Stock: ${item.name}`,
              message: `0 units remaining on shelves in ${item.branch.name}. Immediate restocking required.`,
              category: 'STOCK',
              severity: 'CRITICAL',
              createdAt: item.updatedAt.toISOString(),
              link: '/app/stock?tab=out',
              branchName: item.branch.name,
            })
          } else if (item.quantity <= item.reorderThreshold) {
            itemsList.push({
              id: `stock-low-${item.id}`,
              title: `Low Stock Alert: ${item.name}`,
              message: `Only ${item.quantity} units left in ${item.branch.name} (reorder threshold is ${item.reorderThreshold}).`,
              category: 'STOCK',
              severity: 'WARNING',
              createdAt: item.updatedAt.toISOString(),
              link: '/app/stock?tab=low',
              branchName: item.branch.name,
            })
          }
        }

        // 2. Overdue / Outstanding Invoices
        const unpaidInvoices = await tx.invoice.findMany({
          where: {
            branchId: { in: scope.branchIds },
            status: { in: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIAL] },
          },
          include: {
            branch: { select: { name: true } },
            customer: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        })

        for (const inv of unpaidInvoices) {
          const balanceDue = Number(inv.total) - Number(inv.paymentAmount ?? 0)
          const customerLabel = inv.customer?.name ? `from ${inv.customer.name}` : 'for walk-in client'
          const invCode = `INV-${inv.id.slice(-6).toUpperCase()}`

          itemsList.push({
            id: `inv-${inv.id}`,
            title: `Unpaid Invoice #${invCode}`,
            message: `${currency} ${balanceDue.toLocaleString('en-NG', { minimumFractionDigits: 2 })} outstanding ${customerLabel} (${inv.branch.name}).`,
            category: 'FINANCE',
            severity: inv.status === InvoiceStatus.UNPAID ? 'WARNING' : 'INFO',
            createdAt: inv.createdAt.toISOString(),
            link: '/app/sales',
            branchName: inv.branch.name,
          })
        }

        // 3. Confidential Payroll (Owner Only)
        if (session.role === 'OWNER') {
          const unpaidPayroll = await tx.payrollEntry.findMany({
            where: {
              status: { in: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIAL] },
              user: {
                businessId: session.businessId,
              },
            },
            include: {
              user: {
                select: {
                  email: true,
                  branchAccess: {
                    include: { branch: { select: { name: true } } },
                  },
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
          })

          for (const p of unpaidPayroll) {
            const branchName = p.user?.branchAccess[0]?.branch.name
            const userEmail = p.user?.email ?? 'Staff member'
            itemsList.push({
              id: `payroll-${p.id}`,
              title: `Pending Payroll: ${p.payPeriod}`,
              message: `Recorded accrual of ${currency} ${Number(p.salaryAmount).toLocaleString('en-NG', { minimumFractionDigits: 2 })} for ${userEmail} is pending disbursement.`,
              category: 'PAYROLL',
              severity: 'INFO',
              createdAt: p.createdAt.toISOString(),
              link: '/app/staff',
              branchName,
            })
          }
        }

        // 4. System & Security Operational Notices
        itemsList.push({
          id: `security-welcome-${session.businessId}`,
          title: `Operating System Active: ${business?.name ?? 'Operafrika'}`,
          message: `Your SME business profile is configured with currency locked to ${currency}. PostgreSQL Row Level Security is active.`,
          category: 'SECURITY',
          severity: 'INFO',
          createdAt: new Date().toISOString(),
          link: '/app/settings',
        })

        return itemsList
      },
    )

    return NextResponse.json({
      notifications,
      totalCount: notifications.length,
    })
  } catch (err: unknown) {
    const error = err as Error
    return NextResponse.json({ error: error.message || 'Failed to load notifications' }, { status: 500 })
  }
}
