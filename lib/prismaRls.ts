// Prisma middleware that sets PostgreSQL session variables for Row Level Security.
// It expects a global "currentUser" object (e.g., set per request) with
// { role: string, businessId?: string, branchId?: string }.
// The middleware runs before every query and issues SET statements so that
// the policies defined in the migration can use `current_setting('app.role')`,
// `current_setting('app.business_id')`, and `current_setting('app.branch_id')`.

import { PrismaClient } from '@prisma/client';

export function attachRlsMiddleware(prisma: PrismaClient) {
  // Prisma <5 uses `$use`, Prisma 5+ prefers `$extends`. Provide a fallback for both.
  const middleware = async (params: any, next: any) => {
    // Retrieve the user context – adjust this according to your actual request handling.
    const user = (globalThis as any).currentUser as
      | undefined
      | { role: string; businessId?: string; branchId?: string };

    if (user?.role) {
      await prisma.$executeRawUnsafe(`SET app.role = $1`, user.role);
    }
    if (user?.businessId) {
      await prisma.$executeRawUnsafe(`SET app.business_id = $1`, user.businessId);
    }
    if (user?.branchId) {
      await prisma.$executeRawUnsafe(`SET app.branch_id = $1`, user.branchId);
    }
    return next(params);
  };

  // @ts-ignore – `$use` may not exist on older client versions.
  if (typeof (prisma as any).$use === 'function') {
    (prisma as any).$use(middleware);
  } else if (typeof (prisma as any).$extends === 'function') {
    (prisma as any).$extends({
      query: { $allOperations: middleware },
    });
  } else {
    // If neither API exists, throw a clear error.
    throw new Error('Prisma client does not support middleware extensions');
  }
}
