import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { toRlsRole, withRls } from '@/lib/rls'
import { listStaffMembers, createStaffMember, StaffError } from '@/lib/staff'
import { Role } from '@prisma/client'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const createStaffSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  role: z.enum(['MANAGER', 'STAFF']),
  branchId: z.string().min(1, 'Branch assignment is required'),
})

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Staff has no access to staff lists per Permission Matrix
  if (session.role === 'STAFF') {
    return NextResponse.json({ error: 'Staff accounts are not permitted to view staff lists.' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const branchId = searchParams.get('branch') || undefined

  try {
    const rlsRole = toRlsRole(session.role)
    const staff = await withRls(
      {
        role: rlsRole,
        businessId: session.businessId,
        userId: session.userId,
      },
      async (tx) => {
        return listStaffMembers(
          tx,
          {
            userId: session.userId,
            role: session.role,
            businessId: session.businessId,
            email: session.email,
          },
          {
            businessId: session.businessId,
            branchId,
          },
        )
      },
    )

    return NextResponse.json({ staff })
  } catch (error) {
    if (error instanceof StaffError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Failed to list staff:', error)
    return NextResponse.json({ error: 'Failed to retrieve staff records.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only Owner can add or invite team members
  if (session.role !== 'OWNER') {
    return NextResponse.json({ error: 'Only business owners can add staff members.' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = createStaffSchema.safeParse(body)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message || 'Validation error'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    const rlsRole = toRlsRole(session.role)
    const staffMember = await withRls(
      {
        role: rlsRole,
        businessId: session.businessId,
        branchId: parsed.data.branchId,
        userId: session.userId,
      },
      async (tx) => {
        return createStaffMember(
          tx,
          {
            userId: session.userId,
            role: session.role,
            businessId: session.businessId,
            email: session.email,
          },
          {
            email: parsed.data.email,
            password: parsed.data.password,
            role: parsed.data.role as Role,
            branchId: parsed.data.branchId,
          },
        )
      },
    )

    return NextResponse.json({ success: true, staff: staffMember }, { status: 201 })
  } catch (error) {
    if (error instanceof StaffError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Failed to create staff member:', error)
    return NextResponse.json({ error: 'An unexpected error occurred while adding team member.' }, { status: 500 })
  }
}

