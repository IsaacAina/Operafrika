-- Enable Row Level Security for core tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Business" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Branch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StockItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExpenseEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "IncomeEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PayrollEntry" ENABLE ROW LEVEL SECURITY;

-- Helper function to get current session settings safely
CREATE OR REPLACE FUNCTION current_setting_or_null(name TEXT) RETURNS TEXT AS $$
  BEGIN
    RETURN current_setting(name);
  EXCEPTION WHEN undefined_object THEN
    RETURN NULL;
  END;
$$ LANGUAGE plpgsql;

-- Policies for User table
CREATE POLICY user_owner_policy ON "User"
  USING (current_setting('app.role') = 'OWNER');

CREATE POLICY user_manager_policy ON "User"
  USING (
    current_setting('app.role') = 'MANAGER' AND
    EXISTS (
      SELECT 1 FROM "BranchAccess" ba
      WHERE ba."userId" = "User".id AND ba."branchId" = current_setting('app.branch_id')::uuid
    )
  );

CREATE POLICY user_staff_policy ON "User"
  USING (
    current_setting('app.role') = 'STAFF' AND
    EXISTS (
      SELECT 1 FROM "BranchAccess" ba
      WHERE ba."userId" = "User".id AND ba."branchId" = current_setting('app.branch_id')::uuid
    )
  );

-- Policies for Business (Owners see all, others see only their business)
CREATE POLICY business_owner_policy ON "Business"
  USING (current_setting('app.role') = 'OWNER');

CREATE POLICY business_non_owner_policy ON "Business"
  USING (
    current_setting('app.role') <> 'OWNER' AND
    id = current_setting('app.business_id')::uuid
  );

-- Policies for Branch (Owners see all, others limited to branch access)
CREATE POLICY branch_owner_policy ON "Branch"
  USING (current_setting('app.role') = 'OWNER');

CREATE POLICY branch_manager_staff_policy ON "Branch"
  USING (
    (current_setting('app.role') = 'MANAGER' OR current_setting('app.role') = 'STAFF') AND
    id = current_setting('app.branch_id')::uuid
  );

-- Customer policies
CREATE POLICY customer_owner_policy ON "Customer"
  USING (current_setting('app.role') = 'OWNER');
CREATE POLICY customer_branch_policy ON "Customer"
  USING (
    (current_setting('app.role') = 'MANAGER' OR current_setting('app.role') = 'STAFF') AND
    "branchId" = current_setting('app.branch_id')::uuid
  );

-- Invoice policies
CREATE POLICY invoice_owner_policy ON "Invoice"
  USING (current_setting('app.role') = 'OWNER');
CREATE POLICY invoice_branch_policy ON "Invoice"
  USING (
    (current_setting('app.role') = 'MANAGER' OR current_setting('app.role') = 'STAFF') AND
    "branchId" = current_setting('app.branch_id')::uuid
  );

-- StockItem policies
CREATE POLICY stockitem_owner_policy ON "StockItem"
  USING (current_setting('app.role') = 'OWNER');
CREATE POLICY stockitem_branch_policy ON "StockItem"
  USING (
    (current_setting('app.role') = 'MANAGER' OR current_setting('app.role') = 'STAFF') AND
    "branchId" = current_setting('app.branch_id')::uuid
  );

-- ExpenseEntry policies
CREATE POLICY expense_owner_policy ON "ExpenseEntry"
  USING (current_setting('app.role') = 'OWNER');
CREATE POLICY expense_branch_policy ON "ExpenseEntry"
  USING (
    (current_setting('app.role') = 'MANAGER' OR current_setting('app.role') = 'STAFF') AND
    "branchId" = current_setting('app.branch_id')::uuid
  );

-- IncomeEntry policies
CREATE POLICY income_owner_policy ON "IncomeEntry"
  USING (current_setting('app.role') = 'OWNER');
CREATE POLICY income_branch_policy ON "IncomeEntry"
  USING (
    (current_setting('app.role') = 'MANAGER' OR current_setting('app.role') = 'STAFF') AND
    "branchId" = current_setting('app.branch_id')::uuid
  );

-- PayrollEntry (Owner only)
CREATE POLICY payroll_owner_policy ON "PayrollEntry"
  USING (current_setting('app.role') = 'OWNER');

-- Ensure policies apply to SELECT, INSERT, UPDATE, DELETE as appropriate
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Business" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Business" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Branch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Branch" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Customer" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invoice" FORCE ROW LEVEL SECURITY;
ALTER TABLE "StockItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StockItem" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ExpenseEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExpenseEntry" FORCE ROW LEVEL SECURITY;
ALTER TABLE "IncomeEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "IncomeEntry" FORCE ROW LEVEL SECURITY;
ALTER TABLE "PayrollEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PayrollEntry" FORCE ROW LEVEL SECURITY;
