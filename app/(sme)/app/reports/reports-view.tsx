'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Download,
  Printer,
  Calendar,
  Store,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  CheckCircle2,
  Clock,
  Briefcase,
  PieChart,
  FileSpreadsheet,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react'
import type { ProfitLossStatement, StaffSalesStatement } from '@/lib/reports'

interface BranchOption {
  id: string
  name: string
}

interface ReportsViewProps {
  initialPlStatement?: ProfitLossStatement | null
  initialStaffSales?: StaffSalesStatement | null
  branches: BranchOption[]
  selectedBranchId?: string
  currency: string
  userRole: string
  userEmail: string
  businessName: string
  currentFrom: string
  currentTo: string
}

function formatMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value)
  } catch {
    return `${currency} ${value.toFixed(2)}`
  }
}

export default function ReportsView({
  initialPlStatement,
  initialStaffSales,
  branches,
  selectedBranchId,
  currency,
  userRole,
  userEmail,
  businessName,
  currentFrom,
  currentTo,
}: ReportsViewProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [datePreset, setDatePreset] = useState<'month' | 'last_month' | 'quarter' | 'year' | 'custom'>('month')
  const [fromDate, setFromDate] = useState<string>(currentFrom.slice(0, 10))
  const [toDate, setToDate] = useState<string>(currentTo.slice(0, 10))
  const [selectedBranch, setSelectedBranch] = useState<string>(selectedBranchId || '')

  const isStaff = userRole === 'STAFF'

  const handleApplyFilters = (fromVal: string, toVal: string, branchVal: string) => {
    startTransition(() => {
      const q = new URLSearchParams()
      if (fromVal) q.set('from', fromVal)
      if (toVal) q.set('to', toVal)
      if (branchVal) q.set('branch', branchVal)
      router.push(`/app/reports?${q.toString()}`)
    })
  }

  const handleSelectPreset = (preset: 'month' | 'last_month' | 'quarter' | 'year') => {
    setDatePreset(preset)
    const now = new Date()
    let start: Date
    let end: Date

    if (preset === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      end = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    } else if (preset === 'last_month') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      end = new Date(now.getFullYear(), now.getMonth(), 1)
    } else if (preset === 'quarter') {
      const currentQuarter = Math.floor(now.getMonth() / 3)
      start = new Date(now.getFullYear(), currentQuarter * 3, 1)
      end = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 1)
    } else {
      // year
      start = new Date(now.getFullYear(), 0, 1)
      end = new Date(now.getFullYear() + 1, 0, 1)
    }

    const startIso = start.toISOString().slice(0, 10)
    const endIso = end.toISOString().slice(0, 10)
    setFromDate(startIso)
    setToDate(endIso)
    handleApplyFilters(startIso, endIso, selectedBranch)
  }

  const handleBranchChange = (newBranchId: string) => {
    setSelectedBranch(newBranchId)
    handleApplyFilters(fromDate, toDate, newBranchId)
  }

  const handleExportCsv = () => {
    const q = new URLSearchParams()
    q.set('from', fromDate)
    q.set('to', toDate)
    if (selectedBranch) q.set('branch', selectedBranch)
    if (isStaff) q.set('report', 'sales')
    else q.set('report', 'pl')
    window.location.href = `/api/reports/export?${q.toString()}`
  }

  const handlePrintPdf = () => {
    window.print()
  }

  // Statements
  const pl = initialPlStatement
  const sales = initialStaffSales

  const netProfit = pl?.totals.netProfit ?? 0
  const isNetPositive = netProfit >= 0
  const profitMargin = pl && pl.totals.revenue > 0 ? (netProfit / pl.totals.revenue) * 100 : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-6)', width: '100%' }}>
      {/* Printable Report Header (Active only in @media print) */}
      <div className="print-header" style={{ display: 'none' }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800 }}>{businessName}</h1>
        <p style={{ margin: '4px 0', fontSize: '14px', color: '#555555' }}>
          {isStaff ? 'Branch Sales & Invoicing Report' : 'Financial Statement & Profit/Loss Report'}
        </p>
        <p style={{ margin: '4px 0', fontSize: '12px', color: '#777777' }}>
          Period: {fromDate} to {toDate} &middot; Scope:{' '}
          {selectedBranch
            ? branches.find((b) => b.id === selectedBranch)?.name || 'Branch'
            : 'Consolidated (All Branches)'}
        </p>
      </div>

      {/* Top Filter and Actions Toolbar */}
      <section
        className="route-card no-print"
        aria-label="Report configuration filters"
        style={{
          boxShadow: 'none',
          padding: 'var(--ds-space-4)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--ds-space-4)',
        }}
      >
        {/* Period Preset Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--ds-color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Reporting Period:
          </span>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '8px',
              width: '100%',
            }}
          >
            {(['month', 'last_month', 'quarter', 'year'] as const).map((preset) => {
              const labels = {
                month: 'This Month',
                last_month: 'Last Month',
                quarter: 'This Quarter',
                year: 'This Year',
              }
              const isActive = datePreset === preset
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--ds-radius-md)',
                    border: '1px solid',
                    borderColor: isActive ? 'var(--ds-color-primary)' : 'var(--ds-color-outline-variant)',
                    backgroundColor: isActive ? 'var(--ds-color-primary)' : 'var(--ds-color-surface-container-low)',
                    color: isActive ? '#ffffff' : 'var(--ds-color-on-surface)',
                    fontSize: '13px',
                    fontWeight: isActive ? 700 : 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    minHeight: '40px',
                    textAlign: 'center',
                  }}
                >
                  {labels[preset]}
                </button>
              )
            })}
          </div>
        </div>

        {/* Date and Branch Pickers */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 'var(--ds-space-3)',
            paddingTop: 'var(--ds-space-3)',
            borderTop: '1px solid var(--ds-color-outline-variant)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', width: '100%', maxWidth: '580px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={16} color="var(--ds-color-on-surface-variant)" />
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ds-color-on-surface)' }}>Range:</span>
            </div>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value)
                setDatePreset('custom')
              }}
              style={{
                flex: '1 1 130px',
                padding: '8px 10px',
                borderRadius: 'var(--ds-radius-sm)',
                border: '1px solid var(--ds-color-outline-variant)',
                fontSize: '13px',
                backgroundColor: 'var(--ds-color-background)',
                color: 'var(--ds-color-on-surface)',
                minHeight: '38px',
              }}
            />
            <span style={{ fontSize: '13px', color: 'var(--ds-color-on-surface-variant)' }}>to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value)
                setDatePreset('custom')
              }}
              style={{
                flex: '1 1 130px',
                padding: '8px 10px',
                borderRadius: 'var(--ds-radius-sm)',
                border: '1px solid var(--ds-color-outline-variant)',
                fontSize: '13px',
                backgroundColor: 'var(--ds-color-background)',
                color: 'var(--ds-color-on-surface)',
                minHeight: '38px',
              }}
            />
            <button
              type="button"
              onClick={() => handleApplyFilters(fromDate, toDate, selectedBranch)}
              disabled={isPending}
              style={{
                padding: '8px 14px',
                borderRadius: 'var(--ds-radius-sm)',
                border: '1px solid var(--ds-color-outline-variant)',
                backgroundColor: 'var(--ds-color-surface-container)',
                fontSize: '12px',
                fontWeight: 700,
                cursor: isPending ? 'wait' : 'pointer',
                minHeight: '38px',
              }}
            >
              {isPending ? 'Updating...' : 'Apply Date'}
            </button>
          </div>

          {/* Branch Switcher (Owner Only) */}
          {userRole === 'OWNER' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ds-space-2)', flexWrap: 'wrap', width: '100%', maxWidth: '320px' }}>
              <Store size={16} color="var(--ds-color-on-surface-variant)" />
              <label htmlFor="branch-select" style={{ fontSize: '13px', fontWeight: 600 }}>
                Branch:
              </label>
              <select
                id="branch-select"
                value={selectedBranch}
                onChange={(e) => handleBranchChange(e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 'var(--ds-radius-sm)',
                  border: '1px solid var(--ds-color-outline-variant)',
                  backgroundColor: 'var(--ds-color-background)',
                  color: 'var(--ds-color-on-surface)',
                  fontSize: '13px',
                  minHeight: '38px',
                }}
              >
                <option value="">Consolidated (All Branches)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {userRole !== 'OWNER' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--ds-color-on-surface-variant)' }}>
              <Store size={16} color="var(--ds-color-primary)" />
              <span>Assigned Branch: <strong>{branches[0]?.name || 'Current Branch'}</strong></span>
            </div>
          )}
        </div>

        {/* Dedicated Export & Print Toolbar (Separated from Period Presets) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 'var(--ds-space-3)',
            paddingTop: 'var(--ds-space-3)',
            borderTop: '1px solid var(--ds-color-outline-variant)',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={handleExportCsv}
            style={{
              flex: '1 1 160px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: 'var(--ds-radius-md)',
              border: '1px solid var(--ds-color-outline-variant)',
              backgroundColor: 'var(--ds-color-surface-container-lowest)',
              color: 'var(--ds-color-on-surface)',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              minHeight: '44px',
            }}
          >
            <FileSpreadsheet size={16} color="var(--ds-color-primary)" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={handlePrintPdf}
            style={{
              flex: '1 1 160px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: 'var(--ds-radius-md)',
              border: 'none',
              backgroundColor: 'var(--ds-color-primary)',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              minHeight: '44px',
              boxShadow: '0 1px 3px rgba(15, 118, 110, 0.2)',
            }}
          >
            <Printer size={16} />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* VIEW A: OWNER & MANAGER PROFIT & LOSS STATEMENT                           */}
      {/* ========================================================================= */}
      {!isStaff && pl && (
        <>
          {/* Net Profit / Loss Banner */}
          <section
            className="route-card"
            style={{
              padding: 'var(--ds-space-6)',
              backgroundColor: isNetPositive ? 'rgba(15, 118, 110, 0.05)' : 'rgba(220, 38, 38, 0.05)',
              border: `1px solid ${isNetPositive ? 'rgba(15, 118, 110, 0.25)' : 'rgba(220, 38, 38, 0.25)'}`,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 'var(--ds-space-4)',
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: isNetPositive ? 'var(--ds-color-primary)' : '#dc2626',
                  }}
                >
                  Net Financial Performance &middot; {pl.branchName}
                </span>
                <h2
                  style={{
                    margin: '6px 0 0 0',
                    fontSize: '2.25rem',
                    fontWeight: 800,
                    color: isNetPositive ? 'var(--ds-color-primary)' : '#dc2626',
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  {formatMoney(netProfit, currency)}
                </h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--ds-color-on-surface-variant)' }}>
                  {isNetPositive
                    ? `Operating at a ${profitMargin.toFixed(1)}% net profit margin on total recorded collections.`
                    : 'Operating expenses exceeded total collections for this period.'}
                </p>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--ds-space-2)',
                  padding: '8px 16px',
                  borderRadius: 'var(--ds-radius-full)',
                  backgroundColor: isNetPositive ? 'rgba(15, 118, 110, 0.15)' : 'rgba(220, 38, 38, 0.15)',
                  color: isNetPositive ? 'var(--ds-color-primary)' : '#dc2626',
                  fontWeight: 700,
                  fontSize: '14px',
                }}
              >
                {isNetPositive ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                <span>{isNetPositive ? 'Net Profitable' : 'Net Deficit'}</span>
              </div>
            </div>
          </section>

          {/* Core P&L Summary Cards */}
          <section
            aria-label="P&L Summary Indicators"
            className="responsive-kpi-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 'var(--ds-space-4)',
            }}
          >
            {/* Total Revenue */}
            <article
              className="route-card"
              style={{
                boxShadow: 'none',
                borderLeft: '4px solid #16a34a',
                padding: 'var(--ds-space-5)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#16a34a' }}>
                  Total Collections (Revenue)
                </span>
                <span style={{ padding: '6px', borderRadius: '50%', background: 'rgba(22, 163, 74, 0.1)' }}>
                  <TrendingUp size={18} color="#16a34a" />
                </span>
              </div>
              <h3 style={{ margin: '8px 0 2px 0', fontSize: '1.75rem', fontWeight: 800 }}>
                {formatMoney(pl.totals.revenue, currency)}
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--ds-color-on-surface-variant)' }}>
                {formatMoney(pl.totals.invoicePayments, currency)} invoices + {formatMoney(pl.totals.income, currency)} direct income
              </p>
            </article>

            {/* Operating Expenses */}
            <article
              className="route-card"
              style={{
                boxShadow: 'none',
                borderLeft: '4px solid #dc2626',
                padding: 'var(--ds-space-5)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#dc2626' }}>
                  Operating Expenses
                </span>
                <span style={{ padding: '6px', borderRadius: '50%', background: 'rgba(220, 38, 38, 0.1)' }}>
                  <TrendingDown size={18} color="#dc2626" />
                </span>
              </div>
              <h3 style={{ margin: '8px 0 2px 0', fontSize: '1.75rem', fontWeight: 800 }}>
                {formatMoney(pl.totals.expenses, currency)}
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--ds-color-on-surface-variant)' }}>
                Utilities, rent, supplies, logistics, maintenance
              </p>
            </article>

            {/* Salaries & Payroll */}
            <article
              className="route-card"
              style={{
                boxShadow: 'none',
                borderLeft: '4px solid #9333ea',
                padding: 'var(--ds-space-5)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#9333ea' }}>
                  Salaries &amp; Payroll
                </span>
                <span style={{ padding: '6px', borderRadius: '50%', background: 'rgba(147, 51, 234, 0.1)' }}>
                  <Briefcase size={18} color="#9333ea" />
                </span>
              </div>
              <h3 style={{ margin: '8px 0 2px 0', fontSize: '1.75rem', fontWeight: 800 }}>
                {formatMoney(pl.totals.payroll, currency)}
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--ds-color-on-surface-variant)' }}>
                Record-only team compensation
              </p>
            </article>

            {/* Total Deductions */}
            <article
              className="route-card"
              style={{
                boxShadow: 'none',
                borderLeft: '4px solid #475569',
                padding: 'var(--ds-space-5)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#475569' }}>
                  Total Outflow
                </span>
                <span style={{ padding: '6px', borderRadius: '50%', background: 'rgba(71, 85, 105, 0.1)' }}>
                  <DollarSign size={18} color="#475569" />
                </span>
              </div>
              <h3 style={{ margin: '8px 0 2px 0', fontSize: '1.75rem', fontWeight: 800 }}>
                {formatMoney(pl.totals.totalExpenses, currency)}
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--ds-color-on-surface-variant)' }}>
                Combined operational &amp; payroll outlays
              </p>
            </article>
          </section>

          {/* Expense Category Distribution */}
          <section
            className="route-card"
            style={{
              padding: 'var(--ds-space-6)',
              boxShadow: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--ds-space-4)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PieChart size={20} color="var(--ds-color-primary)" />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
                Expense Breakdown by Category
              </h3>
            </div>

            {pl.categoryBreakdown.length === 0 ? (
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--ds-color-on-surface-variant)' }}>
                No expenses recorded for this period.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-3)' }}>
                {pl.categoryBreakdown.map((item) => (
                  <div key={item.category} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ fontWeight: 600 }}>{item.category}</span>
                      <span>
                        <strong>{formatMoney(item.amount, currency)}</strong> ({item.percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div
                      style={{
                        width: '100%',
                        height: '6px',
                        backgroundColor: 'var(--ds-color-surface-container-low)',
                        borderRadius: 'var(--ds-radius-full)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.min(100, Math.max(2, item.percentage))}%`,
                          height: '100%',
                          backgroundColor:
                            item.category === 'Salaries & Payroll'
                              ? '#9333ea'
                              : 'var(--ds-color-primary)',
                          borderRadius: 'var(--ds-radius-full)',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Statement Transaction Ledger */}
          <section
            className="route-card"
            style={{
              padding: 'var(--ds-space-6)',
              boxShadow: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--ds-space-4)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
                Transaction Statement Ledger
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--ds-color-on-surface-variant)' }}>
                Showing recent {pl.recentEntries.length} chronological items
              </span>
            </div>

            <div className="desktop-table-container responsive-table-wrapper">
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '680px' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--ds-color-surface-container-low)', borderBottom: '1px solid var(--ds-color-outline-variant)' }}>
                    <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 700, color: 'var(--ds-color-on-surface-variant)' }}>Date</th>
                    <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 700, color: 'var(--ds-color-on-surface-variant)' }}>Type</th>
                    <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 700, color: 'var(--ds-color-on-surface-variant)' }}>Branch</th>
                    <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 700, color: 'var(--ds-color-on-surface-variant)' }}>Description</th>
                    <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 700, color: 'var(--ds-color-on-surface-variant)', textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {pl.recentEntries.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--ds-color-on-surface-variant)', fontSize: '13px' }}>
                        No transactions recorded in this period.
                      </td>
                    </tr>
                  ) : (
                    pl.recentEntries.map((entry) => (
                      <tr
                        key={`${entry.type}-${entry.id}`}
                        style={{ borderBottom: '1px solid var(--ds-color-outline-variant)', fontSize: '13px' }}
                      >
                        <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                          {new Date(entry.date).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 'var(--ds-radius-sm)',
                              fontSize: '11px',
                              fontWeight: 700,
                              backgroundColor: entry.isCredit ? 'rgba(22, 163, 74, 0.12)' : 'rgba(220, 38, 38, 0.12)',
                              color: entry.isCredit ? '#16a34a' : '#dc2626',
                            }}
                          >
                            {entry.type}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', fontWeight: 500 }}>{entry.branchName}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--ds-color-on-surface-variant)' }}>{entry.description}</td>
                        <td
                          style={{
                            padding: '10px 14px',
                            textAlign: 'right',
                            fontWeight: 700,
                            color: entry.isCredit ? '#16a34a' : '#dc2626',
                          }}
                        >
                          {entry.isCredit ? '+' : '-'}{formatMoney(entry.amount, currency)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Ledger Cards (Zero Horizontal Scroll on Mobile View) */}
            <div className="mobile-cards-container" style={{ display: 'none', flexDirection: 'column', gap: '10px' }}>
              {pl.recentEntries.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--ds-color-on-surface-variant)', fontSize: '13px' }}>
                  No transactions recorded in this period.
                </div>
              ) : (
                pl.recentEntries.map((entry) => (
                  <div
                    key={`mobile-${entry.type}-${entry.id}`}
                    style={{
                      backgroundColor: 'var(--ds-color-surface-container-lowest)',
                      border: '1px solid var(--ds-color-outline-variant)',
                      borderRadius: 'var(--ds-radius-md)',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 'var(--ds-radius-sm)',
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: entry.isCredit ? 'rgba(22, 163, 74, 0.12)' : 'rgba(220, 38, 38, 0.12)',
                          color: entry.isCredit ? '#16a34a' : '#dc2626',
                        }}
                      >
                        {entry.type}
                      </span>
                      <strong style={{ fontSize: '1rem', fontWeight: 700, color: entry.isCredit ? '#16a34a' : '#dc2626' }}>
                        {entry.isCredit ? '+' : '-'}{formatMoney(entry.amount, currency)}
                      </strong>
                    </div>

                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ds-color-on-surface)' }}>
                      {entry.description}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--ds-color-on-surface-variant)' }}>
                      <span>Branch: {entry.branchName}</span>
                      <span>{new Date(entry.date).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </>
      )}

      {/* ========================================================================= */}
      {/* VIEW B: STAFF SALES & INVOICE PERFORMANCE STATEMENT                       */}
      {/* ========================================================================= */}
      {isStaff && sales && (
        <>
          <div
            style={{
              padding: 'var(--ds-space-4)',
              borderRadius: 'var(--ds-radius-lg)',
              backgroundColor: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--ds-space-3)',
            }}
          >
            <ShieldAlert size={24} style={{ color: '#2563eb', flexShrink: 0 }} />
            <div>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#1d4ed8', display: 'block' }}>
                Staff Access Scope: Sales &amp; Invoices Only
              </span>
              <span style={{ fontSize: '12px', color: 'var(--ds-color-on-surface-variant)' }}>
                Per Operafrika permission matrix, staff members view and export branch sales performance and invoice records. Confidential P&amp;L statements and expenses are restricted to managers and owners.
              </span>
            </div>
          </div>

          {/* Staff KPI Cards */}
          <section
            aria-label="Staff Sales Metrics"
            className="responsive-kpi-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 'var(--ds-space-4)',
            }}
          >
            <article className="route-card" style={{ padding: 'var(--ds-space-5)', borderLeft: '4px solid #2563eb' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' }}>
                Total Invoiced
              </span>
              <h3 style={{ margin: '8px 0 0 0', fontSize: '1.75rem', fontWeight: 800 }}>
                {formatMoney(sales.totalInvoiced, currency)}
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--ds-color-on-surface-variant)' }}>
                {sales.invoiceCount} invoices recorded in this branch
              </p>
            </article>

            <article className="route-card" style={{ padding: 'var(--ds-space-5)', borderLeft: '4px solid #16a34a' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>
                Collected Payments
              </span>
              <h3 style={{ margin: '8px 0 0 0', fontSize: '1.75rem', fontWeight: 800 }}>
                {formatMoney(sales.totalCollected, currency)}
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--ds-color-on-surface-variant)' }}>
                Settled in cash, POS, or bank transfer
              </p>
            </article>

            <article className="route-card" style={{ padding: 'var(--ds-space-5)', borderLeft: '4px solid #f59e0b' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase' }}>
                Pending Receivables
              </span>
              <h3 style={{ margin: '8px 0 0 0', fontSize: '1.75rem', fontWeight: 800 }}>
                {formatMoney(sales.totalPending, currency)}
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--ds-color-on-surface-variant)' }}>
                Uncollected customer balance
              </p>
            </article>
          </section>

          {/* Staff Invoices Table */}
          <section className="route-card" style={{ padding: 'var(--ds-space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-4)' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
              Branch Invoices Ledger
            </h3>
            <div className="desktop-table-container responsive-table-wrapper">
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '640px' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--ds-color-surface-container-low)', borderBottom: '1px solid var(--ds-color-outline-variant)' }}>
                    <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 700 }}>Date</th>
                    <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 700 }}>Customer</th>
                    <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 700 }}>Status</th>
                    <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 700 }}>Total</th>
                    <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 700, textAlign: 'right' }}>Collected</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.invoices.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--ds-color-on-surface-variant)', fontSize: '13px' }}>
                        No invoices recorded for this period.
                      </td>
                    </tr>
                  ) : (
                    sales.invoices.map((inv) => (
                      <tr key={inv.id} style={{ borderBottom: '1px solid var(--ds-color-outline-variant)', fontSize: '13px' }}>
                        <td style={{ padding: '10px 14px' }}>
                          {new Date(inv.date).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td style={{ padding: '10px 14px', fontWeight: 600 }}>{inv.customerName}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 'var(--ds-radius-sm)',
                              fontSize: '11px',
                              fontWeight: 700,
                              backgroundColor:
                                inv.status === 'PAID'
                                  ? 'rgba(34, 197, 94, 0.15)'
                                  : inv.status === 'PARTIAL'
                                  ? 'rgba(234, 179, 8, 0.15)'
                                  : 'rgba(239, 68, 68, 0.15)',
                              color:
                                inv.status === 'PAID'
                                  ? '#16a34a'
                                  : inv.status === 'PARTIAL'
                                  ? '#ca8a04'
                                  : '#dc2626',
                            }}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', fontWeight: 600 }}>{formatMoney(inv.total, currency)}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>
                          {formatMoney(inv.paymentAmount, currency)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Invoices Cards (Zero Horizontal Scroll on Mobile View) */}
            <div className="mobile-cards-container" style={{ display: 'none', flexDirection: 'column', gap: '10px' }}>
              {sales.invoices.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--ds-color-on-surface-variant)', fontSize: '13px' }}>
                  No invoices recorded for this period.
                </div>
              ) : (
                sales.invoices.map((inv) => (
                  <div
                    key={`mobile-inv-${inv.id}`}
                    style={{
                      backgroundColor: 'var(--ds-color-surface-container-lowest)',
                      border: '1px solid var(--ds-color-outline-variant)',
                      borderRadius: 'var(--ds-radius-md)',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--ds-color-on-surface)' }}>
                        {inv.customerName}
                      </span>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 'var(--ds-radius-sm)',
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor:
                            inv.status === 'PAID'
                              ? 'rgba(34, 197, 94, 0.15)'
                              : inv.status === 'PARTIAL'
                              ? 'rgba(234, 179, 8, 0.15)'
                              : 'rgba(239, 68, 68, 0.15)',
                          color:
                            inv.status === 'PAID'
                              ? '#16a34a'
                              : inv.status === 'PARTIAL'
                              ? '#ca8a04'
                              : '#dc2626',
                        }}
                      >
                        {inv.status}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                      <span style={{ color: 'var(--ds-color-on-surface-variant)' }}>Total: <strong>{formatMoney(inv.total, currency)}</strong></span>
                      <span style={{ color: '#16a34a' }}>Collected: <strong>{formatMoney(inv.paymentAmount, currency)}</strong></span>
                    </div>

                    <div style={{ fontSize: '0.75rem', color: 'var(--ds-color-on-surface-variant)' }}>
                      Date: {new Date(inv.date).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

