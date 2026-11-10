import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { toRlsRole, withRls } from '@/lib/rls'
import { updateStaffMember, deleteStaffMember, StaffError } from '@/lib/staff'
import { Role } from '@prisma/client'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const updateStaffSchema = z.object({
  role: z.enum(['MANAGER', 'STAFF']).optional(),
  branchId: z.string().optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only Owner can edit staff roles or branch assignments
  if (session.role !== 'OWNER') {
    return NextResponse.json({ error: 'Only business owners can update staff assignments.' }, { status: 403 })
  }

  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = updateStaffSchema.safeParse(body)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message || 'Validation error'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    const rlsRole = toRlsRole(session.role)
    const updated = await withRls(
      {
        role: rlsRole,
        businessId: session.businessId,
        userId: session.userId,
      },
      async (tx) => {
        return updateStaffMember(
          tx,
          {
            userId: session.userId,
            role: session.role,
            businessId: session.businessId,
            email: session.email,
          },
          {
            userId: id,
            role: parsed.data.role as Role | undefined,
            branchId: parsed.data.branchId,
          },
        )
      },
    )

    return NextResponse.json({ success: true, staff: updated })
  } catch (error: any) {
    if (error instanceof StaffError || error?.name === 'StaffError') {
      return NextResponse.json({ error: error.message }, { status: error.status || 400 })
    }
    console.error('Failed to update staff member:', error)
    return NextResponse.json({ error: 'Failed to update staff assignment.' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only Owner can delete/remove staff
  if (session.role !== 'OWNER') {
    return NextResponse.json({ error: 'Only business owners can remove team members.' }, { status: 403 })
  }

  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
  }

  try {
    const rlsRole = toRlsRole(session.role)
    const result = await withRls(
      {
        role: rlsRole,
        businessId: session.businessId,
        userId: session.userId,
      },
      async (tx) => {
        return deleteStaffMember(
          tx,
          {
            userId: session.userId,
            role: session.role,
            businessId: session.businessId,
            email: session.email,
          },
          { userId: id },
        )
      },
    )

    return NextResponse.json(result)
  } catch (error: any) {
    if (error instanceof StaffError || error?.name === 'StaffError') {
      return NextResponse.json({ error: error.message }, { status: error.status || 400 })
    }
    console.error('Failed to delete staff member:', error)
    return NextResponse.json({ error: 'Failed to remove team member.' }, { status: 500 })
  }
}

