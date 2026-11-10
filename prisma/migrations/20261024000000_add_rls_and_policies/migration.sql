-- Row Level Security for every table that holds business data.
--
-- The application sets four transaction-local settings before touching these
-- tables: app.role (OWNER, MANAGER, STAFF or SYSTEM), app.business_id,
-- app.branch_id and app.user_id. The policies below use those settings. IDs in
-- this schema are cuid strings, not UUIDs, so every identifier comparison is
-- text-to-text.

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Business" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Branch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BranchAccess" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InvoiceItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StockItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StockMovement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExpenseEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "IncomeEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PayrollEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AnalyticsEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SupportMessage" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "User" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Business" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Branch" FORCE ROW LEVEL SECURITY;
ALTER TABLE "BranchAccess" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Customer" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Invoice" FORCE ROW LEVEL SECURITY;
ALTER TABLE "InvoiceItem" FORCE ROW LEVEL SECURITY;
ALTER TABLE "StockItem" FORCE ROW LEVEL SECURITY;
ALTER TABLE "StockMovement" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ExpenseEntry" FORCE ROW LEVEL SECURITY;
ALTER TABLE "IncomeEntry" FORCE ROW LEVEL SECURITY;
ALTER TABLE "PayrollEntry" FORCE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" FORCE ROW LEVEL SECURITY;
ALTER TABLE "AnalyticsEvent" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Subscription" FORCE ROW LEVEL SECURITY;
ALTER TABLE "SupportMessage" FORCE ROW LEVEL SECURITY;

-- Remove the first draft of these policies if it was ever applied.
DROP POLICY IF EXISTS user_owner_policy ON "User";
DROP POLICY IF EXISTS user_manager_policy ON "User";
DROP POLICY IF EXISTS user_staff_policy ON "User";
DROP POLICY IF EXISTS business_owner_policy ON "Business";
DROP POLICY IF EXISTS business_non_owner_policy ON "Business";
DROP POLICY IF EXISTS branch_owner_policy ON "Branch";
DROP POLICY IF EXISTS branch_manager_staff_policy ON "Branch";
DROP POLICY IF EXISTS customer_owner_policy ON "Customer";
DROP POLICY IF EXISTS customer_branch_policy ON "Customer";
DROP POLICY IF EXISTS invoice_owner_policy ON "Invoice";
DROP POLICY IF EXISTS invoice_branch_policy ON "Invoice";
DROP POLICY IF EXISTS stockitem_owner_policy ON "StockItem";
DROP POLICY IF EXISTS stockitem_branch_policy ON "StockItem";
DROP POLICY IF EXISTS expense_owner_policy ON "ExpenseEntry";
DROP POLICY IF EXISTS expense_branch_policy ON "ExpenseEntry";
DROP POLICY IF EXISTS income_owner_policy ON "IncomeEntry";
DROP POLICY IF EXISTS income_branch_policy ON "IncomeEntry";
DROP POLICY IF EXISTS payroll_owner_policy ON "PayrollEntry";
DROP FUNCTION IF EXISTS current_setting_or_null(text);

-- A SECURITY DEFINER helper avoids recursive RLS evaluation when a branch
-- policy needs to confirm the current user's own branch access. It only
-- returns a boolean and checks the current user and business from the
-- transaction context.
CREATE OR REPLACE FUNCTION has_branch_access(p_branch_id text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM "BranchAccess" ba
    JOIN "Branch" b ON b.id = ba."branchId"
    WHERE ba."userId" = current_setting('app.user_id', true)
      AND ba."branchId" = p_branch_id
      AND b."businessId" = current_setting('app.business_id', true)
  );
$$;

GRANT EXECUTE ON FUNCTION has_branch_access(text) TO PUBLIC;

-- User ---------------------------------------------------------------------
CREATE POLICY "user_system_all" ON "User"
  FOR ALL
  USING (current_setting('app.role', true) = 'SYSTEM')
  WITH CHECK (current_setting('app.role', true) = 'SYSTEM');

CREATE POLICY "user_self_select" ON "User"
  FOR SELECT
  USING (id = current_setting('app.user_id', true));

CREATE POLICY "user_owner_all" ON "User"
  FOR ALL
  USING (
    current_setting('app.role', true) = 'OWNER'
    AND "businessId" = current_setting('app.business_id', true)
  )
  WITH CHECK (
    current_setting('app.role', true) = 'OWNER'
    AND "businessId" = current_setting('app.business_id', true)
  );

CREATE POLICY "user_manager_staff_select" ON "User"
  FOR SELECT
  USING (
    current_setting('app.role', true) IN ('MANAGER', 'STAFF')
    AND "businessId" = current_setting('app.business_id', true)
    AND (
      id = current_setting('app.user_id', true)
      OR (
        current_setting('app.branch_id', true) <> ''
        AND has_branch_access(current_setting('app.branch_id', true))
        AND EXISTS (
          SELECT 1 FROM "BranchAccess" ba
          WHERE ba."userId" = "User".id
            AND ba."branchId" = current_setting('app.branch_id', true)
        )
      )
    )
  );

-- Business ----------------------------------------------------------------
CREATE POLICY "business_system_all" ON "Business"
  FOR ALL
  USING (current_setting('app.role', true) = 'SYSTEM')
  WITH CHECK (current_setting('app.role', true) = 'SYSTEM');

CREATE POLICY "business_select_scope" ON "Business"
  FOR SELECT
  USING (id = current_setting('app.business_id', true));

CREATE POLICY "business_owner_update" ON "Business"
  FOR UPDATE
  USING (
    current_setting('app.role', true) = 'OWNER'
    AND id = current_setting('app.business_id', true)
  )
  WITH CHECK (
    current_setting('app.role', true) = 'OWNER'
    AND id = current_setting('app.business_id', true)
  );

-- Branch ------------------------------------------------------------------
CREATE POLICY "branch_system_all" ON "Branch"
  FOR ALL
  USING (current_setting('app.role', true) = 'SYSTEM')
  WITH CHECK (current_setting('app.role', true) = 'SYSTEM');

CREATE POLICY "branch_select_scope" ON "Branch"
  FOR SELECT
  USING (
    "businessId" = current_setting('app.business_id', true)
    AND (
      current_setting('app.role', true) = 'OWNER'
      OR (
        current_setting('app.role', true) IN ('MANAGER', 'STAFF')
        AND has_branch_access("Branch".id)
      )
    )
  );

CREATE POLICY "branch_owner_write" ON "Branch"
  FOR ALL
  USING (
    current_setting('app.role', true) = 'OWNER'
    AND "businessId" = current_setting('app.business_id', true)
  )
  WITH CHECK (
    current_setting('app.role', true) = 'OWNER'
    AND "businessId" = current_setting('app.business_id', true)
  );

-- BranchAccess ------------------------------------------------------------
CREATE POLICY "branch_access_system_all" ON "BranchAccess"
  FOR ALL
  USING (current_setting('app.role', true) = 'SYSTEM')
  WITH CHECK (current_setting('app.role', true) = 'SYSTEM');

CREATE POLICY "branch_access_owner_all" ON "BranchAccess"
  FOR ALL
  USING (
    current_setting('app.role', true) = 'OWNER'
    AND EXISTS (
      SELECT 1 FROM "Branch" b
      WHERE b.id = "BranchAccess"."branchId"
        AND b."businessId" = current_setting('app.business_id', true)
    )
  )
  WITH CHECK (
    current_setting('app.role', true) = 'OWNER'
    AND EXISTS (
      SELECT 1 FROM "Branch" b
      WHERE b.id = "BranchAccess"."branchId"
        AND b."businessId" = current_setting('app.business_id', true)
    )
  );

CREATE POLICY "branch_access_manager_staff_select" ON "BranchAccess"
  FOR SELECT
  USING (
    current_setting('app.role', true) IN ('MANAGER', 'STAFF')
    AND (
      "userId" = current_setting('app.user_id', true)
      OR (
        current_setting('app.branch_id', true) <> ''
        AND "branchId" = current_setting('app.branch_id', true)
        AND has_branch_access(current_setting('app.branch_id', true))
      )
    )
  );

-- Customer ----------------------------------------------------------------
CREATE POLICY "customer_system_all" ON "Customer"
  FOR ALL
  USING (current_setting('app.role', true) = 'SYSTEM')
  WITH CHECK (current_setting('app.role', true) = 'SYSTEM');

CREATE POLICY "customer_owner_all" ON "Customer"
  FOR ALL
  USING (
    current_setting('app.role', true) = 'OWNER'
    AND EXISTS (
      SELECT 1 FROM "Branch" b
      WHERE b.id = "Customer"."branchId"
        AND b."businessId" = current_setting('app.business_id', true)
    )
  )
  WITH CHECK (
    current_setting('app.role', true) = 'OWNER'
    AND EXISTS (
      SELECT 1 FROM "Branch" b
      WHERE b.id = "Customer"."branchId"
        AND b."businessId" = current_setting('app.business_id', true)
    )
  );

CREATE POLICY "customer_manager_all" ON "Customer"
  FOR ALL
  USING (
    current_setting('app.role', true) = 'MANAGER'
    AND has_branch_access("Customer"."branchId")
  )
  WITH CHECK (
    current_setting('app.role', true) = 'MANAGER'
    AND has_branch_access("Customer"."branchId")
  );

CREATE POLICY "customer_staff_select" ON "Customer"
  FOR SELECT
  USING (
    current_setting('app.role', true) = 'STAFF'
    AND has_branch_access("Customer"."branchId")
  );

CREATE POLICY "customer_staff_insert" ON "Customer"
  FOR INSERT
  WITH CHECK (
    current_setting('app.role', true) = 'STAFF'
    AND has_branch_access("Customer"."branchId")
  );

-- Invoice -----------------------------------------------------------------
CREATE POLICY "invoice_system_all" ON "Invoice"
  FOR ALL
  USING (current_setting('app.role', true) = 'SYSTEM')
  WITH CHECK (current_setting('app.role', true) = 'SYSTEM');

CREATE POLICY "invoice_owner_all" ON "Invoice"
  FOR ALL
  USING (
    current_setting('app.role', true) = 'OWNER'
    AND EXISTS (
      SELECT 1 FROM "Branch" b
      WHERE b.id = "Invoice"."branchId"
        AND b."businessId" = current_setting('app.business_id', true)
    )
  )
  WITH CHECK (
    current_setting('app.role', true) = 'OWNER'
    AND EXISTS (
      SELECT 1 FROM "Branch" b
      WHERE b.id = "Invoice"."branchId"
        AND b."businessId" = current_setting('app.business_id', true)
    )
  );

CREATE POLICY "invoice_manager_all" ON "Invoice"
  FOR ALL
  USING (
    current_setting('app.role', true) = 'MANAGER'
    AND has_branch_access("Invoice"."branchId")
  )
  WITH CHECK (
    current_setting('app.role', true) = 'MANAGER'
    AND has_branch_access("Invoice"."branchId")
  );

CREATE POLICY "invoice_staff_select" ON "Invoice"
  FOR SELECT
  USING (
    current_setting('app.role', true) = 'STAFF'
    AND has_branch_access("Invoice"."branchId")
  );

CREATE POLICY "invoice_staff_insert" ON "Invoice"
  FOR INSERT
  WITH CHECK (
    current_setting('app.role', true) = 'STAFF'
    AND has_branch_access("Invoice"."branchId")
  );

-- InvoiceItem -------------------------------------------------------------
CREATE POLICY "invoice_item_system_all" ON "InvoiceItem"
  FOR ALL
  USING (current_setting('app.role', true) = 'SYSTEM')
  WITH CHECK (current_setting('app.role', true) = 'SYSTEM');

CREATE POLICY "invoice_item_owner_all" ON "InvoiceItem"
  FOR ALL
  USING (
    current_setting('app.role', true) = 'OWNER'
    AND EXISTS (
      SELECT 1 FROM "Invoice" i
      JOIN "Branch" b ON b.id = i."branchId"
      WHERE i.id = "InvoiceItem"."invoiceId"
        AND b."businessId" = current_setting('app.business_id', true)
    )
  )
  WITH CHECK (
    current_setting('app.role', true) = 'OWNER'
    AND EXISTS (
      SELECT 1 FROM "Invoice" i
      JOIN "Branch" b ON b.id = i."branchId"
      WHERE i.id = "InvoiceItem"."invoiceId"
        AND b."businessId" = current_setting('app.business_id', true)
    )
  );

CREATE POLICY "invoice_item_manager_all" ON "InvoiceItem"
  FOR ALL
  USING (
    current_setting('app.role', true) = 'MANAGER'
    AND EXISTS (
      SELECT 1 FROM "Invoice" i
      WHERE i.id = "InvoiceItem"."invoiceId"
        AND has_branch_access(i."branchId")
    )
  )
  WITH CHECK (
    current_setting('app.role', true) = 'MANAGER'
    AND EXISTS (
      SELECT 1 FROM "Invoice" i
      WHERE i.id = "InvoiceItem"."invoiceId"
        AND has_branch_access(i."branchId")
    )
  );

CREATE POLICY "invoice_item_staff_select" ON "InvoiceItem"
  FOR SELECT
  USING (
    current_setting('app.role', true) = 'STAFF'
    AND EXISTS (
      SELECT 1 FROM "Invoice" i
      WHERE i.id = "InvoiceItem"."invoiceId"
        AND has_branch_access(i."branchId")
    )
  );

CREATE POLICY "invoice_item_staff_insert" ON "InvoiceItem"
  FOR INSERT
  WITH CHECK (
    current_setting('app.role', true) = 'STAFF'
    AND EXISTS (
      SELECT 1 FROM "Invoice" i
      WHERE i.id = "InvoiceItem"."invoiceId"
        AND has_branch_access(i."branchId")
    )
  );

-- StockItem ---------------------------------------------------------------
CREATE POLICY "stock_item_system_all" ON "StockItem"
  FOR ALL
  USING (current_setting('app.role', true) = 'SYSTEM')
  WITH CHECK (current_setting('app.role', true) = 'SYSTEM');

CREATE POLICY "stock_item_owner_all" ON "StockItem"
  FOR ALL
  USING (
    current_setting('app.role', true) = 'OWNER'
    AND EXISTS (
      SELECT 1 FROM "Branch" b
      WHERE b.id = "StockItem"."branchId"
        AND b."businessId" = current_setting('app.business_id', true)
    )
  )
  WITH CHECK (
    current_setting('app.role', true) = 'OWNER'
    AND EXISTS (
      SELECT 1 FROM "Branch" b
      WHERE b.id = "StockItem"."branchId"
        AND b."businessId" = current_setting('app.business_id', true)
    )
  );

CREATE POLICY "stock_item_manager_all" ON "StockItem"
  FOR ALL
  USING (
    current_setting('app.role', true) = 'MANAGER'
    AND has_branch_access("StockItem"."branchId")
  )
  WITH CHECK (
    current_setting('app.role', true) = 'MANAGER'
    AND has_branch_access("StockItem"."branchId")
  );

CREATE POLICY "stock_item_staff_select" ON "StockItem"
  FOR SELECT
  USING (
    current_setting('app.role', true) = 'STAFF'
    AND has_branch_access("StockItem"."branchId")
  );

-- StockMovement -----------------------------------------------------------
CREATE POLICY "stock_movement_system_all" ON "StockMovement"
  FOR ALL
  USING (current_setting('app.role', true) = 'SYSTEM')
  WITH CHECK (current_setting('app.role', true) = 'SYSTEM');

CREATE POLICY "stock_movement_owner_all" ON "StockMovement"
  FOR ALL
  USING (
    current_setting('app.role', true) = 'OWNER'
    AND EXISTS (
      SELECT 1 FROM "StockItem" si
      JOIN "Branch" b ON b.id = si."branchId"
      WHERE si.id = "StockMovement"."stockItemId"
        AND b."businessId" = current_setting('app.business_id', true)
    )
  )
  WITH CHECK (
    current_setting('app.role', true) = 'OWNER'
    AND EXISTS (
      SELECT 1 FROM "StockItem" si
      JOIN "Branch" b ON b.id = si."branchId"
      WHERE si.id = "StockMovement"."stockItemId"
        AND b."businessId" = current_setting('app.business_id', true)
    )
  );

CREATE POLICY "stock_movement_manager_all" ON "StockMovement"
  FOR ALL
  USING (
    current_setting('app.role', true) = 'MANAGER'
    AND EXISTS (
      SELECT 1 FROM "StockItem" si
      WHERE si.id = "StockMovement"."stockItemId"
        AND has_branch_access(si."branchId")
    )
  )
  WITH CHECK (
    current_setting('app.role', true) = 'MANAGER'
    AND EXISTS (
      SELECT 1 FROM "StockItem" si
      WHERE si.id = "StockMovement"."stockItemId"
        AND has_branch_access(si."branchId")
    )
  );

CREATE POLICY "stock_movement_staff_select" ON "StockMovement"
  FOR SELECT
  USING (
    current_setting('app.role', true) = 'STAFF'
    AND EXISTS (
      SELECT 1 FROM "StockItem" si
      WHERE si.id = "StockMovement"."stockItemId"
        AND has_branch_access(si."branchId")
    )
  );

-- ExpenseEntry ------------------------------------------------------------
CREATE POLICY "expense_entry_system_all" ON "ExpenseEntry"
  FOR ALL
  USING (current_setting('app.role', true) = 'SYSTEM')
  WITH CHECK (current_setting('app.role', true) = 'SYSTEM');

CREATE POLICY "expense_entry_owner_all" ON "ExpenseEntry"
  FOR ALL
  USING (
    current_setting('app.role', true) = 'OWNER'
    AND EXISTS (
      SELECT 1 FROM "Branch" b
      WHERE b.id = "ExpenseEntry"."branchId"
        AND b."businessId" = current_setting('app.business_id', true)
    )
  )
  WITH CHECK (
    current_setting('app.role', true) = 'OWNER'
    AND EXISTS (
      SELECT 1 FROM "Branch" b
      WHERE b.id = "ExpenseEntry"."branchId"
        AND b."businessId" = current_setting('app.business_id', true)
    )
  );

CREATE POLICY "expense_entry_manager_all" ON "ExpenseEntry"
  FOR ALL
  USING (
    current_setting('app.role', true) = 'MANAGER'
    AND has_branch_access("ExpenseEntry"."branchId")
  )
  WITH CHECK (
    current_setting('app.role', true) = 'MANAGER'
    AND has_branch_access("ExpenseEntry"."branchId")
  );

-- IncomeEntry -------------------------------------------------------------
CREATE POLICY "income_entry_system_all" ON "IncomeEntry"
  FOR ALL
  USING (current_setting('app.role', true) = 'SYSTEM')
  WITH CHECK (current_setting('app.role', true) = 'SYSTEM');

CREATE POLICY "income_entry_owner_all" ON "IncomeEntry"
  FOR ALL
  USING (
    current_setting('app.role', true) = 'OWNER'
    AND EXISTS (
      SELECT 1 FROM "Branch" b
      WHERE b.id = "IncomeEntry"."branchId"
        AND b."businessId" = current_setting('app.business_id', true)
    )
  )
  WITH CHECK (
    current_setting('app.role', true) = 'OWNER'
    AND EXISTS (
      SELECT 1 FROM "Branch" b
      WHERE b.id = "IncomeEntry"."branchId"
        AND b."businessId" = current_setting('app.business_id', true)
    )
  );

CREATE POLICY "income_entry_manager_all" ON "IncomeEntry"
  FOR ALL
  USING (
    current_setting('app.role', true) = 'MANAGER'
    AND has_branch_access("IncomeEntry"."branchId")
  )
  WITH CHECK (
    current_setting('app.role', true) = 'MANAGER'
    AND has_branch_access("IncomeEntry"."branchId")
  );

-- PayrollEntry (Owner records and totals only; Managers get the aggregate
-- through payroll_total_for_scope) ---------------------------------------
CREATE POLICY "payroll_entry_system_all" ON "PayrollEntry"
  FOR ALL
  USING (current_setting('app.role', true) = 'SYSTEM')
  WITH CHECK (current_setting('app.role', true) = 'SYSTEM');

CREATE POLICY "payroll_entry_owner_all" ON "PayrollEntry"
  FOR ALL
  USING (
    current_setting('app.role', true) = 'OWNER'
    AND EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = "PayrollEntry"."userId"
        AND u."businessId" = current_setting('app.business_id', true)
    )
  )
  WITH CHECK (
    current_setting('app.role', true) = 'OWNER'
    AND EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = "PayrollEntry"."userId"
        AND u."businessId" = current_setting('app.business_id', true)
    )
  );

-- AuditLog ----------------------------------------------------------------
CREATE POLICY "audit_log_system_all" ON "AuditLog"
  FOR ALL
  USING (current_setting('app.role', true) = 'SYSTEM')
  WITH CHECK (current_setting('app.role', true) = 'SYSTEM');

CREATE POLICY "audit_log_owner_select" ON "AuditLog"
  FOR SELECT
  USING (
    current_setting('app.role', true) = 'OWNER'
    AND "businessId" = current_setting('app.business_id', true)
  );

CREATE POLICY "audit_log_insert_scope" ON "AuditLog"
  FOR INSERT
  WITH CHECK (
    current_setting('app.role', true) IN ('OWNER', 'MANAGER', 'STAFF')
    AND "businessId" = current_setting('app.business_id', true)
  );

-- AnalyticsEvent ----------------------------------------------------------
CREATE POLICY "analytics_event_system_all" ON "AnalyticsEvent"
  FOR ALL
  USING (current_setting('app.role', true) = 'SYSTEM')
  WITH CHECK (current_setting('app.role', true) = 'SYSTEM');

CREATE POLICY "analytics_event_select_scope" ON "AnalyticsEvent"
  FOR SELECT
  USING (
    current_setting('app.role', true) IN ('OWNER', 'MANAGER', 'STAFF')
    AND "businessId" = current_setting('app.business_id', true)
  );

CREATE POLICY "analytics_event_insert_scope" ON "AnalyticsEvent"
  FOR INSERT
  WITH CHECK (
    current_setting('app.role', true) IN ('OWNER', 'MANAGER', 'STAFF')
    AND "businessId" = current_setting('app.business_id', true)
  );

-- Subscription ------------------------------------------------------------
CREATE POLICY "subscription_system_all" ON "Subscription"
  FOR ALL
  USING (current_setting('app.role', true) = 'SYSTEM')
  WITH CHECK (current_setting('app.role', true) = 'SYSTEM');

CREATE POLICY "subscription_select_scope" ON "Subscription"
  FOR SELECT
  USING (
    current_setting('app.role', true) IN ('OWNER', 'MANAGER', 'STAFF')
    AND "businessId" = current_setting('app.business_id', true)
  );

CREATE POLICY "subscription_owner_update" ON "Subscription"
  FOR UPDATE
  USING (
    current_setting('app.role', true) = 'OWNER'
    AND "businessId" = current_setting('app.business_id', true)
  )
  WITH CHECK (
    current_setting('app.role', true) = 'OWNER'
    AND "businessId" = current_setting('app.business_id', true)
  );

-- SupportMessage ----------------------------------------------------------
CREATE POLICY "support_message_system_all" ON "SupportMessage"
  FOR ALL
  USING (current_setting('app.role', true) = 'SYSTEM')
  WITH CHECK (current_setting('app.role', true) = 'SYSTEM');

CREATE POLICY "support_message_self_select" ON "SupportMessage"
  FOR SELECT
  USING ("userId" = current_setting('app.user_id', true));

CREATE POLICY "support_message_self_insert" ON "SupportMessage"
  FOR INSERT
  WITH CHECK ("userId" = current_setting('app.user_id', true));

-- Manager P&L needs payroll totals without exposing payroll rows. The
-- function checks the caller's branch access and returns only a sum.
CREATE OR REPLACE FUNCTION payroll_total_for_scope(
  p_branch_ids text[],
  p_from timestamp without time zone,
  p_to timestamp without time zone
) RETURNS numeric
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(pe."salaryAmount"), 0)::numeric
  FROM "PayrollEntry" pe
  JOIN "User" u ON u.id = pe."userId"
  WHERE u."businessId" = current_setting('app.business_id', true)
    AND (
      current_setting('app.role', true) = 'OWNER'
      OR (
        current_setting('app.role', true) = 'MANAGER'
        AND EXISTS (
          SELECT 1
          FROM "BranchAccess" manager_access
          WHERE manager_access."userId" = current_setting('app.user_id', true)
            AND manager_access."branchId" = ANY(p_branch_ids)
        )
      )
    )
    AND EXISTS (
      SELECT 1
      FROM "BranchAccess" payroll_access
      WHERE payroll_access."userId" = u.id
        AND payroll_access."branchId" = ANY(p_branch_ids)
    )
    AND (
      (pe."datePaid" >= p_from AND pe."datePaid" < p_to)
      OR (
        pe."datePaid" IS NULL
        AND pe."createdAt" >= p_from
        AND pe."createdAt" < p_to
      )
    );
$$;

GRANT EXECUTE ON FUNCTION payroll_total_for_scope(text[], timestamp, timestamp) TO PUBLIC;
