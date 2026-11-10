require('dotenv').config()
const assert = require('assert')
const { Client } = require('pg')

const c = new Client({ connectionString: process.env.DATABASE_URL })

async function setContext(role, businessId = '', branchId = '', userId = '') {
  await c.query(
    `select
       set_config('app.role', $1, true),
       set_config('app.business_id', $2, true),
       set_config('app.branch_id', $3, true),
       set_config('app.user_id', $4, true)`,
    [role, businessId, branchId, userId],
  )
}

async function ids(sql, params = []) {
  const result = await c.query(sql, params)
  return result.rows.map((row) => row.id).sort()
}

async function scalar(sql, params = []) {
  const result = await c.query(sql, params)
  return Number(result.rows[0].n)
}

async function expectRlsError(label, fn) {
  await c.query('SAVEPOINT rls_sp')
  let succeeded = false
  try {
    await fn()
    succeeded = true
  } catch (error) {
    if (!/row-level security/i.test(error.message)) {
      await c.query('ROLLBACK TO SAVEPOINT rls_sp')
      await c.query('RELEASE SAVEPOINT rls_sp')
      throw new Error(`${label}: unexpected error: ${error.message}`)
    }
  }
  await c.query('ROLLBACK TO SAVEPOINT rls_sp')
  await c.query('RELEASE SAVEPOINT rls_sp')
  if (succeeded) throw new Error(`${label}: expected RLS to reject the write`)
  console.log(`PASS ${label}`)
}

async function main() {
  await c.connect()
  const suffix = Date.now().toString(36)
  const role = `rls_verify_${suffix}`
  const bizA = `biz_a_${suffix}`
  const bizB = `biz_b_${suffix}`
  const branchA1 = `branch_a1_${suffix}`
  const branchA2 = `branch_a2_${suffix}`
  const branchB1 = `branch_b1_${suffix}`
  const ownerA = `owner_a_${suffix}`
  const managerA = `manager_a_${suffix}`
  const staffA = `staff_a_${suffix}`
  const ownerB = `owner_b_${suffix}`
  const customerA1 = `customer_a1_${suffix}`
  const customerA2 = `customer_a2_${suffix}`
  const customerB1 = `customer_b1_${suffix}`
  const invoiceA1 = `invoice_a1_${suffix}`
  const invoiceA2 = `invoice_a2_${suffix}`
  const invoiceB1 = `invoice_b1_${suffix}`
  const stockA1 = `stock_a1_${suffix}`
  const stockA2 = `stock_a2_${suffix}`
  const stockB1 = `stock_b1_${suffix}`

  try {
    await c.query('BEGIN')
    await c.query(`CREATE ROLE ${role} NOLOGIN NOSUPERUSER NOBYPASSRLS`)
    await c.query(`GRANT USAGE ON SCHEMA public TO ${role}`)
    await c.query(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${role}`,
    )

    await c.query(
      `INSERT INTO "Business" (id, name, "businessType", currency, "updatedAt")
       VALUES ($1, 'RLS A', 'Retail', 'NGN', now()), ($2, 'RLS B', 'Retail', 'NGN', now())`,
      [bizA, bizB],
    )
    await c.query(
      `INSERT INTO "Branch" (id, "businessId", name, "updatedAt")
       VALUES ($1, $2, 'A1', now()), ($3, $2, 'A2', now()), ($4, $5, 'B1', now())`,
      [branchA1, bizA, branchA2, branchB1, bizB],
    )
    await c.query(
      `INSERT INTO "User" (id, email, "passwordHash", role, "businessId", "updatedAt")
       VALUES
         ($1, $1 || '@test.local', 'x', 'OWNER'::"Role", $5, now()),
         ($2, $2 || '@test.local', 'x', 'MANAGER'::"Role", $5, now()),
         ($3, $3 || '@test.local', 'x', 'STAFF'::"Role", $5, now()),
         ($4, $4 || '@test.local', 'x', 'OWNER'::"Role", $6, now())`,
      [ownerA, managerA, staffA, ownerB, bizA, bizB],
    )
    await c.query(
      `INSERT INTO "BranchAccess" (id, "userId", "branchId")
       VALUES ($1, $2, $4), ($3, $5, $4)`,
      [`ba_mgr_${suffix}`, managerA, `ba_staff_${suffix}`, branchA1, staffA],
    )
    await c.query(
      `INSERT INTO "Customer" (id, "branchId", name, "updatedAt")
       VALUES ($1, $4, 'C A1', now()), ($2, $5, 'C A2', now()), ($3, $6, 'C B1', now())`,
      [customerA1, customerA2, customerB1, branchA1, branchA2, branchB1],
    )
    await c.query(
      `INSERT INTO "Invoice" (id, "branchId", total, "updatedAt")
       VALUES ($1, $4, 100, now()), ($2, $5, 200, now()), ($3, $6, 300, now())`,
      [invoiceA1, invoiceA2, invoiceB1, branchA1, branchA2, branchB1],
    )
    await c.query(
      `INSERT INTO "StockItem"
         (id, "branchId", name, quantity, "costPrice", "sellingPrice", "reorderThreshold", "updatedAt")
       VALUES
         ($1, $4, 'S A1', 5, 1, 2, 1, now()),
         ($2, $5, 'S A2', 5, 1, 2, 1, now()),
         ($3, $6, 'S B1', 5, 1, 2, 1, now())`,
      [stockA1, stockA2, stockB1, branchA1, branchA2, branchB1],
    )
    await c.query(
      `INSERT INTO "IncomeEntry" (id, "branchId", amount, date, "updatedAt")
       VALUES ($1, $4, 100, now(), now()), ($2, $5, 200, now(), now()), ($3, $6, 300, now(), now())`,
      [`income_a1_${suffix}`, `income_a2_${suffix}`, `income_b1_${suffix}`, branchA1, branchA2, branchB1],
    )
    await c.query(
      `INSERT INTO "ExpenseEntry" (id, "branchId", category, amount, date, "updatedAt")
       VALUES ($1, $4, 'Rent', 10, now(), now()), ($2, $5, 'Rent', 20, now(), now()), ($3, $6, 'Rent', 30, now(), now())`,
      [`expense_a1_${suffix}`, `expense_a2_${suffix}`, `expense_b1_${suffix}`, branchA1, branchA2, branchB1],
    )
    await c.query(
      `INSERT INTO "PayrollEntry" (id, "userId", "payPeriod", "salaryAmount", "datePaid")
       VALUES ($1, $2, '2026-11', 1000, now())`,
      [`payroll_a_${suffix}`, staffA],
    )
    await c.query(
      `INSERT INTO "Subscription" (id, "businessId", "renewalDate")
       VALUES ($1, $2, now() + interval '30 days'), ($3, $4, now() + interval '30 days')`,
      [`sub_a_${suffix}`, bizA, `sub_b_${suffix}`, bizB],
    )
    await c.query(
      `INSERT INTO "AuditLog" (id, "businessId", action, "resourceType", "resourceId")
       VALUES ($1, $2, 'INVOICE_CREATED'::"AuditAction", 'Invoice', 'x'),
              ($3, $4, 'INVOICE_CREATED'::"AuditAction", 'Invoice', 'x')`,
      [`audit_a_${suffix}`, bizA, `audit_b_${suffix}`, bizB],
    )
    await c.query(
      `INSERT INTO "AnalyticsEvent" (id, "eventType", "businessId")
       VALUES ($1, 'business_created', $2), ($3, 'business_created', $4)`,
      [`analytics_a_${suffix}`, bizA, `analytics_b_${suffix}`, bizB],
    )

    await c.query(`SET LOCAL ROLE ${role}`)

    // No context: every policy evaluates false.
    await setContext('')
    assert.strictEqual(
      await scalar('SELECT count(*)::int AS n FROM "Business"'),
      0,
    )
    assert.strictEqual(await scalar('SELECT count(*)::int AS n FROM "User"'), 0)
    console.log('PASS no context sees nothing')

    // System context can see the test businesses.
    await setContext('SYSTEM')
    assert.deepStrictEqual(
      await ids('SELECT id FROM "Business" WHERE id = ANY($1)', [
        [bizA, bizB],
      ]),
      [bizA, bizB].sort(),
    )
    console.log('PASS system context sees both businesses')

    // Owner A: only business A data.
    await setContext('OWNER', bizA, '', ownerA)
    assert.deepStrictEqual(
      await ids('SELECT id FROM "Business" WHERE id = ANY($1)', [
        [bizA, bizB],
      ]),
      [bizA],
    )
    assert.deepStrictEqual(
      await ids('SELECT id FROM "Branch" WHERE id = ANY($1)', [
        [branchA1, branchA2, branchB1],
      ]),
      [branchA1, branchA2].sort(),
    )
    assert.deepStrictEqual(
      await ids('SELECT id FROM "Customer" WHERE id = ANY($1)', [
        [customerA1, customerA2, customerB1],
      ]),
      [customerA1, customerA2].sort(),
    )
    assert.deepStrictEqual(
      await ids('SELECT id FROM "Invoice" WHERE id = ANY($1)', [
        [invoiceA1, invoiceA2, invoiceB1],
      ]),
      [invoiceA1, invoiceA2].sort(),
    )
    assert.deepStrictEqual(
      await ids('SELECT id FROM "User" WHERE id = ANY($1)', [
        [ownerA, managerA, staffA, ownerB],
      ]),
      [ownerA, managerA, staffA].sort(),
    )
    assert.strictEqual(
      await scalar('SELECT count(*)::int AS n FROM "PayrollEntry"'),
      1,
    )
    assert.deepStrictEqual(
      await ids('SELECT id FROM "AuditLog" WHERE id = ANY($1)', [
        [`audit_a_${suffix}`, `audit_b_${suffix}`],
      ]),
      [`audit_a_${suffix}`],
    )
    console.log('PASS owner A is scoped to business A')

    // Manager A: only branch A1.
    await setContext('MANAGER', bizA, branchA1, managerA)
    assert.deepStrictEqual(
      await ids('SELECT id FROM "Branch" WHERE id = ANY($1)', [
        [branchA1, branchA2, branchB1],
      ]),
      [branchA1],
    )
    assert.deepStrictEqual(
      await ids('SELECT id FROM "Customer" WHERE id = ANY($1)', [
        [customerA1, customerA2, customerB1],
      ]),
      [customerA1],
    )
    assert.deepStrictEqual(
      await ids('SELECT id FROM "Invoice" WHERE id = ANY($1)', [
        [invoiceA1, invoiceA2, invoiceB1],
      ]),
      [invoiceA1],
    )
    assert.deepStrictEqual(
      await ids('SELECT id FROM "StockItem" WHERE id = ANY($1)', [
        [stockA1, stockA2, stockB1],
      ]),
      [stockA1],
    )
    assert.strictEqual(
      await scalar('SELECT count(*)::int AS n FROM "PayrollEntry"'),
      0,
    )
    assert.strictEqual(
      await scalar(
        `SELECT payroll_total_for_scope(
           ARRAY[$1]::text[],
           (now() - interval '1 day')::timestamp,
           (now() + interval '1 day')::timestamp
         ) AS n`,
        [branchA1],
      ),
      1000,
    )
    assert.strictEqual(
      await scalar(
        `SELECT payroll_total_for_scope(
           ARRAY[$1]::text[],
           (now() - interval '1 day')::timestamp,
           (now() + interval '1 day')::timestamp
         ) AS n`,
        [branchA2],
      ),
      0,
    )
    console.log('PASS manager A is scoped to branch A1 and payroll is aggregate only')

    // Manager context cannot be widened by a branch id alone.
    await setContext('MANAGER', bizA, branchA2, managerA)
    assert.deepStrictEqual(
      await ids('SELECT id FROM "Customer" WHERE id = ANY($1)', [
        [customerA1, customerA2, customerB1],
      ]),
      [customerA1],
    )
    assert.strictEqual(
      await scalar(
        'SELECT count(*)::int AS n FROM "Customer" WHERE "branchId" = $1',
        [branchA2],
      ),
      0,
    )
    console.log('PASS manager A cannot read branch A2 by changing branch id')

    // Staff A: branch A1 reads, no payroll, no stock writes.
    await setContext('STAFF', bizA, branchA1, staffA)
    assert.deepStrictEqual(
      await ids('SELECT id FROM "Customer" WHERE id = ANY($1)', [
        [customerA1, customerA2, customerB1],
      ]),
      [customerA1],
    )
    assert.deepStrictEqual(
      await ids('SELECT id FROM "StockItem" WHERE id = ANY($1)', [
        [stockA1, stockA2, stockB1],
      ]),
      [stockA1],
    )
    assert.strictEqual(
      await scalar('SELECT count(*)::int AS n FROM "PayrollEntry"'),
      0,
    )
    assert.strictEqual(
      await scalar(
        `SELECT payroll_total_for_scope(
           ARRAY[$1]::text[],
           (now() - interval '1 day')::timestamp,
           (now() + interval '1 day')::timestamp
         ) AS n`,
        [branchA1],
      ),
      0,
    )
    await expectRlsError('staff cannot write stock', () =>
      c.query(
        `INSERT INTO "StockItem"
           (id, "branchId", name, quantity, "costPrice", "sellingPrice", "reorderThreshold")
         VALUES ($1, $2, 'blocked', 1, 1, 2, 1)`,
        [`stock_staff_${suffix}`, branchA1],
      ),
    )
    console.log('PASS staff A is read only for stock and cannot read payroll')

    // Staff may create a customer and invoice in their own branch.
    await c.query(
      `INSERT INTO "Customer" (id, "branchId", name, "updatedAt")
       VALUES ($1, $2, 'Staff Customer', now())`,
      [`customer_staff_${suffix}`, branchA1],
    )
    await c.query(
      `INSERT INTO "Invoice" (id, "branchId", total, "updatedAt")
       VALUES ($1, $2, 50, now())`,
      [`invoice_staff_${suffix}`, branchA1],
    )
    await c.query(
      `INSERT INTO "InvoiceItem" (id, "invoiceId", "stockItemId", quantity, price)
       VALUES ($1, $2, $3, 1, 2)`,
      [`item_staff_${suffix}`, `invoice_staff_${suffix}`, stockA1],
    )
    console.log('PASS staff A can create branch A1 customer, invoice and invoice item')

    // Staff cannot update an invoice.
    const staffUpdate = await c.query(
      `UPDATE "Invoice" SET total = 999 WHERE id = $1`,
      [invoiceA1],
    )
    assert.strictEqual(staffUpdate.rowCount, 0)
    console.log('PASS staff cannot update an invoice')

    // Staff cannot write to another branch.
    await expectRlsError('staff cannot write customer to branch A2', () =>
      c.query(
        `INSERT INTO "Customer" (id, "branchId", name)
         VALUES ($1, $2, 'blocked')`,
        [`customer_staff_a2_${suffix}`, branchA2],
      ),
    )

    // Manager may write branch A1, but not branch A2 or payroll.
    await setContext('MANAGER', bizA, branchA1, managerA)
    await c.query(
      `INSERT INTO "IncomeEntry" (id, "branchId", amount, date, "updatedAt")
       VALUES ($1, $2, 25, now(), now())`,
      [`income_mgr_${suffix}`, branchA1],
    )
    console.log('PASS manager can record income in branch A1')
    await expectRlsError('manager cannot write income to branch A2', () =>
      c.query(
        `INSERT INTO "IncomeEntry" (id, "branchId", amount, date, "updatedAt")
         VALUES ($1, $2, 25, now(), now())`,
        [`income_mgr_a2_${suffix}`, branchA2],
      ),
    )
    await expectRlsError('manager cannot create payroll', () =>
      c.query(
        `INSERT INTO "PayrollEntry" (id, "userId", "payPeriod", "salaryAmount")
         VALUES ($1, $2, '2026-11', 50)`,
        [`payroll_mgr_${suffix}`, staffA],
      ),
    )

    // Owner may write payroll for a user in the same business, but not another
    // business's user.
    await setContext('OWNER', bizA, '', ownerA)
    await c.query(
      `INSERT INTO "PayrollEntry" (id, "userId", "payPeriod", "salaryAmount")
       VALUES ($1, $2, '2026-11', 50)`,
      [`payroll_owner_${suffix}`, staffA],
    )
    await expectRlsError('owner A cannot create payroll for business B user', () =>
      c.query(
        `INSERT INTO "PayrollEntry" (id, "userId", "payPeriod", "salaryAmount")
         VALUES ($1, $2, '2026-11', 50)`,
        [`payroll_owner_b_${suffix}`, ownerB],
      ),
    )
    await expectRlsError('owner A cannot write an invoice for branch B1', () =>
      c.query(
        `INSERT INTO "Invoice" (id, "branchId", total, "updatedAt")
         VALUES ($1, $2, 10, now())`,
        [`invoice_owner_b_${suffix}`, branchB1],
      ),
    )
    console.log('PASS owner A writes only inside business A')

    // Manager P&L aggregate never exposes another business's payroll.
    await setContext('OWNER', bizB, '', ownerB)
    assert.strictEqual(
      await scalar(
        `SELECT payroll_total_for_scope(
           ARRAY[$1]::text[],
           (now() - interval '1 day')::timestamp,
           (now() + interval '1 day')::timestamp
         ) AS n`,
        [branchA1],
      ),
      0,
    )
    console.log('PASS owner B cannot aggregate business A payroll')

    await c.query('ROLLBACK')
    console.log('ALL RLS CHECKS PASSED')
  } catch (error) {
    await c.query('ROLLBACK').catch(() => undefined)
    throw error
  } finally {
    await c.end()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
