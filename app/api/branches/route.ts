import { NextRequest, NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/request-user'
import { toRlsRole, withRls } from '@/lib/rls'
import {
  listBranches,
  createBranch,
  BranchError,
  type BranchActor,
} from '@/lib/branches'

export async function GET() {
  const user = await getRequestUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rlsRole = toRlsRole(user.role)

  try {
    const branches = await withRls(
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
        return listBranches(tx, actor)
      }
    )

    return NextResponse.json({ branches })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to list branches' },
      { status: err.status || 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  const user = await getRequestUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (user.role !== 'OWNER') {
    return NextResponse.json(
      { error: 'Only Business Owners can create physical branches.' },
      { status: 403 }
    )
  }

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
        return createBranch(tx, actor, { name, address, contactInfo })
      }
    )

    return NextResponse.json({ branch }, { status: 201 })
  } catch (err: any) {
    if (err instanceof BranchError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json(
      { error: err.message || 'Failed to create branch' },
      { status: 500 }
    )
  }
}

