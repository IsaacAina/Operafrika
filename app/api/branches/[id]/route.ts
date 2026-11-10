import { NextRequest, NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/request-user'
import { toRlsRole, withRls } from '@/lib/rls'
import {
  updateBranch,
  BranchError,
  type BranchActor,
} from '@/lib/branches'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getRequestUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (user.role !== 'OWNER') {
    return NextResponse.json(
      { error: 'Only Business Owners can modify branch records.' },
      { status: 403 }
    )
  }

  const { id: branchId } = await params

  try {
    const body = await req.json()
    const { name, address, contactInfo } = body

    const rlsRole = toRlsRole(user.role)

    const branch = await withRls(
      {
        role: rlsRole,
        businessId: user.businessId,
        userId: user.userId,
      },
      async (tx) => {
        const actor: BranchActor = {
          userId: user.userId,
          role: user.role,
          businessId: user.businessId,
          email: user.email,
        }
        return updateBranch(tx, actor, branchId, { name, address, contactInfo })
      }
    )

    return NextResponse.json({ branch })
  } catch (err: any) {
    if (err instanceof BranchError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json(
      { error: err.message || 'Failed to update branch' },
      { status: 500 }
    )
  }
}

