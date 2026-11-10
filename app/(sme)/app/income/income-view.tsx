'use client'

import React, { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  TrendingUp,
  Plus,
  Search,
  DollarSign,
  Calendar,
  Store,
  X,
  FileText,
  ChevronLeft,
  ChevronRight,
  User,
  Trash2,
  ShieldAlert,
} from 'lucide-react'
import type { IncomeEntryDetail } from '@/lib/financials'

interface BranchOption {
  id: string
  name: string
}

interface CustomerOption {
  id: string
  name: string
  contact: string | null
  branchId: string
}

interface IncomeMetrics {
  totalAmount: number
  todayAmount: number
  monthAmount: number
  totalEntries: number
}

interface IncomeViewProps {
  initialEntries: IncomeEntryDetail[]
  totalCount: number
  currentPage: number
  pageSize: number
  totalPages: number
  metrics: IncomeMetrics
  branches: BranchOption[]
  selectedBranchId?: string
  currency: string
  userRole: string
  customers: CustomerOption[]
}

export default function IncomeView({
  initialEntries,
  totalCount,
  currentPage,
  pageSize,
  totalPages,
  metrics,
  branches,
  selectedBranchId,
  currency,
  userRole,
  customers,
}: IncomeViewProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // State
  const [entries, setEntries] = useState<IncomeEntryDetail[]>(initialEntries)

  useEffect(() => {
    setEntries(initialEntries)
  }, [initialEntries])
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Form State
  const [formBranchId, setFormBranchId] = useState<string>(
    selectedBranchId || branches[0]?.id || '',
  )
  const [formCustomerId, setFormCustomerId] = useState<string>('')
  const [formAmount, setFormAmount] = useState<string>('')
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [formNote, setFormNote] = useState<string>('')

  const isStaff = userRole === 'STAFF'

  const formatMoney = (amount: number) => {
    return `${currency} ${amount.toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  // Branch scope switch
  const handleBranchChange = (branchId?: string) => {
    startTransition(() => {
      const url = new URL(window.location.href)
      if (branchId) {
        url.searchParams.set('branch', branchId)
      } else {
        url.searchParams.delete('branch')
      }
      url.searchParams.set('page', '1')
      router.push(url.pathname + url.search)
    })
  }

  // Filter available customers for chosen branch
  const activeCustomers = customers.filter((c) => c.branchId === formBranchId)

  // Filtered entries by local search
  const filteredEntries = entries.filter((item) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase().trim()
    const matchesNote = item.note?.toLowerCase().includes(q)
    const matchesCustomer = item.customerName?.toLowerCase().includes(q)
    return matchesNote || matchesCustomer
  })

  // Open Add Modal
  const openAddModal = () => {
    setFormBranchId(selectedBranchId || branches[0]?.id || '')
    setFormCustomerId('')
    setFormAmount('')
    setFormDate(new Date().toISOString().split('T')[0])
    setFormNote('')
    setFormError(null)
    setShowAddModal(true)
  }

  // Submit Add Income
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const amount = parseFloat(formAmount)
    if (isNaN(amount) || amount <= 0) {
      setFormError('Income amount must be greater than zero.')
      return
    }

    if (!formBranchId) {
      setFormError('Please select an active branch.')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/income', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: formBranchId,
          customerId: formCustomerId ? formCustomerId : null,
          amount,
          date: formDate,
          note: formNote.trim() || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setFormError(data.error || 'Failed to record income.')
        setIsSubmitting(false)
        return
      }

      setShowAddModal(false)

      if (data.entry) {
        setEntries((prev) => [data.entry, ...prev])
      }

      router.refresh()
    } catch {
      setFormError('An unexpected network error occurred.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Delete Income Entry
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this income record?')) return

    try {
      const res = await fetch(`/api/income/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Failed to delete record.')
        return
      }
      setEntries(entries.filter((e) => e.id !== id))
      router.refresh()
    } catch {
      alert('Failed to delete income record.')
    }
  }

  if (isStaff) {
    return (
      <div
        role="alert"
        style={{
          padding: 'var(--ds-space-6)',
          background: 'var(--ds-surface)',
          border: '1px solid #ef4444',
          borderRadius: 'var(--ds-radius-lg)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 'var(--ds-space-3)',
        }}
      >
        <ShieldAlert size={48} color="#ef4444" />
        <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#dc2626' }}>
          Access Restricted
        </h2>
        <p style={{ margin: 0, color: 'var(--ds-text-secondary)', maxWidth: '480px', fontSize: '14px' }}>
          According to the Operafrika Permission Matrix, Staff accounts do not have access to Income and Expense records. These financial tools are strictly accessible to Business Owners and Branch Managers.
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-6)', width: '100%' }}>
      {/* Scope Navigation Bar */}
      <section
        aria-label="Branch selector"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--ds-space-4)',
          background: 'var(--ds-surface)',
          padding: 'var(--ds-space-3) var(--ds-space-4)',
          borderRadius: 'var(--ds-radius-md)',
          border: '1px solid var(--ds-border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ds-space-3)', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ds-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Store size={16} /> Branch Scope:
          </span>
          {branches.length > 1 ? (
            <div style={{ display: 'flex', gap: 'var(--ds-space-2)', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => handleBranchChange(undefined)}
                aria-current={!selectedBranchId ? 'page' : undefined}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--ds-radius-sm)',
                  fontSize: '13px',
                  fontWeight: !selectedBranchId ? 600 : 400,
                  background: !selectedBranchId ? 'var(--ds-primary)' : 'transparent',
                  color: !selectedBranchId ? '#fff' : 'var(--ds-text)',
                  border: '1px solid',
                  borderColor: !selectedBranchId ? 'var(--ds-primary)' : 'var(--ds-border)',
                  cursor: 'pointer',
                }}
              >
                All Branches
              </button>
              {branches.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => handleBranchChange(b.id)}
                  aria-current={selectedBranchId === b.id ? 'page' : undefined}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--ds-radius-sm)',
                    fontSize: '13px',
                    fontWeight: selectedBranchId === b.id ? 600 : 400,
                    background: selectedBranchId === b.id ? 'var(--ds-primary)' : 'transparent',
                    color: selectedBranchId === b.id ? '#fff' : 'var(--ds-text)',
                    border: '1px solid',
                    borderColor: selectedBranchId === b.id ? 'var(--ds-primary)' : 'var(--ds-border)',
                    cursor: 'pointer',
                  }}
                >
                  {b.name}
                </button>
              ))}
            </div>
          ) : (
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ds-text)' }}>
              {branches[0]?.name || 'Single Branch'}
            </span>
          )}
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={openAddModal}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: '#16a34a',
            color: '#ffffff',
            padding: '9px 18px',
            borderRadius: 'var(--ds-radius-sm)',
            fontSize: '14px',
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          <Plus size={18} /> Record Direct Income
        </button>
      </section>

      {/* KPI Cards Grid */}
      <section
        aria-label="Income performance metrics"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: 'var(--ds-space-4)',
        }}
      >
        {/* Total Income */}
        <div
          style={{
            background: 'var(--ds-surface)',
            border: '1px solid var(--ds-border)',
            borderRadius: 'var(--ds-radius-md)',
            padding: 'var(--ds-space-4)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--ds-space-2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ds-text-secondary)' }}>Total Direct Income</span>
            <span style={{ padding: '6px', borderRadius: '50%', background: 'rgba(22, 163, 74, 0.1)', color: '#16a34a' }}>
              <TrendingUp size={18} />
            </span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#16a34a' }}>
            {formatMoney(metrics.totalAmount)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--ds-text-secondary)' }}>
            Cumulative non-invoice income
          </div>
        </div>

        {/* Month-to-date Income */}
        <div
          style={{
            background: 'var(--ds-surface)',
            border: '1px solid var(--ds-border)',
            borderRadius: 'var(--ds-radius-md)',
            padding: 'var(--ds-space-4)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--ds-space-2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ds-text-secondary)' }}>Month-to-Date</span>
            <span style={{ padding: '6px', borderRadius: '50%', background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb' }}>
              <DollarSign size={18} />
            </span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--ds-text)' }}>
            {formatMoney(metrics.monthAmount)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--ds-text-secondary)' }}>
            Current calendar month entries
          </div>
        </div>

        {/* Today's Income */}
        <div
          style={{
            background: 'var(--ds-surface)',
            border: '1px solid var(--ds-border)',
            borderRadius: 'var(--ds-radius-md)',
            padding: 'var(--ds-space-4)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--ds-space-2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ds-text-secondary)' }}>Today's Income</span>
            <span style={{ padding: '6px', borderRadius: '50%', background: 'rgba(234, 179, 8, 0.1)', color: '#ca8a04' }}>
              <Calendar size={18} />
            </span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--ds-text)' }}>
            {formatMoney(metrics.todayAmount)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--ds-text-secondary)' }}>
            Recorded today
          </div>
        </div>

        {/* Total Entries Count */}
        <div
          style={{
            background: 'var(--ds-surface)',
            border: '1px solid var(--ds-border)',
            borderRadius: 'var(--ds-radius-md)',
            padding: 'var(--ds-space-4)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--ds-space-2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ds-text-secondary)' }}>Total Records</span>
            <span style={{ padding: '6px', borderRadius: '50%', background: 'rgba(147, 51, 234, 0.1)', color: '#9333ea' }}>
              <FileText size={18} />
            </span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--ds-text)' }}>
            {metrics.totalEntries}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--ds-text-secondary)' }}>
            Active direct income logs
          </div>
        </div>
      </section>

      {/* Income Records Table Section */}
      <section
        style={{
          background: 'var(--ds-surface)',
          border: '1px solid var(--ds-border)',
          borderRadius: 'var(--ds-radius-md)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Table Search Header */}
        <div
          style={{
            padding: 'var(--ds-space-4)',
            borderBottom: '1px solid var(--ds-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 'var(--ds-space-3)',
          }}
        >
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--ds-text)' }}>
              Direct Income Records
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--ds-text-secondary)' }}>
              Miscellaneous collections, cash deposits, grants, and refunds
            </p>
          </div>

          <div style={{ position: 'relative', width: '100%', maxWidth: '320px' }}>
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--ds-text-secondary)' }}>
              <Search size={16} />
            </span>
            <input
              type="text"
              placeholder="Search description or customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search income"
              style={{
                width: '100%',
                padding: '7px 10px 7px 34px',
                borderRadius: 'var(--ds-radius-sm)',
                border: '1px solid var(--ds-border)',
                background: 'var(--ds-background)',
                fontSize: '13px',
                color: 'var(--ds-text)',
              }}
            />
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="desktop-table-container" style={{ overflowX: 'auto', width: '100%' }}>
          <table
            style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}
            aria-label="Income entries table"
          >
            <thead>
              <tr style={{ background: 'var(--ds-surface-secondary, rgba(0,0,0,0.02))', borderBottom: '1px solid var(--ds-border)' }}>
                <th scope="col" style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--ds-text-secondary)' }}>Date</th>
                <th scope="col" style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--ds-text-secondary)' }}>Description / Note</th>
                <th scope="col" style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--ds-text-secondary)' }}>Customer / Source</th>
                <th scope="col" style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--ds-text-secondary)' }}>Branch</th>
                <th scope="col" style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--ds-text-secondary)', textAlign: 'right' }}>Amount</th>
                <th scope="col" style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--ds-text-secondary)', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--ds-text-secondary)' }}>
                    <TrendingUp size={32} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
                    <p style={{ margin: 0, fontWeight: 500 }}>No income records found matching your filters.</p>
                  </td>
                </tr>
              ) : (
                filteredEntries.map((row) => (
                  <tr
                    key={row.id}
                    style={{
                      borderBottom: '1px solid var(--ds-border)',
                      transition: 'background 0.1s ease',
                    }}
                  >
                    <td style={{ padding: '12px 16px', color: 'var(--ds-text-secondary)' }}>
                      {new Date(row.date).toLocaleDateString('en-NG', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 500, color: 'var(--ds-text)' }}>
                      {row.note || <span style={{ color: 'var(--ds-text-secondary)', fontStyle: 'italic' }}>No description</span>}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--ds-text)' }}>
                      {row.customerName ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <User size={14} style={{ color: 'var(--ds-text-secondary)' }} />
                          {row.customerName}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--ds-text-secondary)' }}>Direct / Walk-in</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--ds-text-secondary)' }}>
                      {row.branchName}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>
                      +{formatMoney(row.amount)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => handleDelete(row.id)}
                        title="Delete record"
                        style={{
                          padding: '5px 8px',
                          borderRadius: 'var(--ds-radius-sm)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          background: 'transparent',
                          color: '#dc2626',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Income Cards (Zero Horizontal Scroll on Mobile View) */}
        <div className="mobile-cards-container" style={{ display: 'none', flexDirection: 'column', gap: '12px', padding: '12px' }}>
          {filteredEntries.length === 0 ? (
            <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--ds-text-secondary)', background: 'var(--ds-surface)', borderRadius: 'var(--ds-radius-md)', border: '1px solid var(--ds-border)' }}>
              <TrendingUp size={32} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
              <p style={{ margin: 0, fontWeight: 500 }}>No income records found matching your filters.</p>
            </div>
          ) : (
            filteredEntries.map((row) => (
              <div
                key={`mobile-${row.id}`}
                style={{
                  backgroundColor: 'var(--ds-surface)',
                  border: '1px solid var(--ds-border)',
                  borderRadius: 'var(--ds-radius-md)',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ds-text)' }}>
                    {row.note || <span style={{ color: 'var(--ds-text-secondary)', fontStyle: 'italic' }}>Direct Income</span>}
                  </span>
                  <span style={{ fontSize: '1rem', fontWeight: 700, color: '#16a34a' }}>
                    +{formatMoney(row.amount)}
                  </span>
                </div>

                {row.customerName && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', color: 'var(--ds-text-secondary)' }}>
                    <User size={13} />
                    <span>{row.customerName}</span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--ds-text-secondary)', marginTop: '4px' }}>
                  <span>Branch: {row.branchName}</span>
                  <span>
                    {new Date(row.date).toLocaleDateString('en-NG', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px', paddingTop: '8px', borderTop: '1px solid var(--ds-border)' }}>
                  <button
                    type="button"
                    onClick={() => handleDelete(row.id)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 'var(--ds-radius-sm)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      background: 'transparent',
                      color: '#dc2626',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div
            style={{
              padding: 'var(--ds-space-3) var(--ds-space-4)',
              borderTop: '1px solid var(--ds-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '13px',
              color: 'var(--ds-text-secondary)',
            }}
          >
            <span>
              Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} records
            </span>
            <div style={{ display: 'flex', gap: 'var(--ds-space-2)' }}>
              <button
                type="button"
                disabled={currentPage <= 1 || isPending}
                onClick={() => {
                  const url = new URL(window.location.href)
                  url.searchParams.set('page', String(currentPage - 1))
                  router.push(url.pathname + url.search)
                }}
                style={{
                  padding: '5px 10px',
                  borderRadius: 'var(--ds-radius-sm)',
                  border: '1px solid var(--ds-border)',
                  background: 'transparent',
                  color: 'var(--ds-text)',
                  cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                  opacity: currentPage <= 1 ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages || isPending}
                onClick={() => {
                  const url = new URL(window.location.href)
                  url.searchParams.set('page', String(currentPage + 1))
                  router.push(url.pathname + url.search)
                }}
                style={{
                  padding: '5px 10px',
                  borderRadius: 'var(--ds-radius-sm)',
                  border: '1px solid var(--ds-border)',
                  background: 'transparent',
                  color: 'var(--ds-text)',
                  cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                  opacity: currentPage >= totalPages ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* MODAL: Record Direct Income */}
      {showAddModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-income-title"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 'var(--ds-space-4)',
          }}
        >
          <div
            style={{
              background: 'var(--ds-surface)',
              border: '1px solid var(--ds-border)',
              borderRadius: 'var(--ds-radius-lg)',
              width: '100%',
              maxWidth: '480px',
              padding: 'var(--ds-space-6)',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 id="add-income-title" style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>
                Record Direct Income
              </h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ds-text-secondary)' }}
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div
                role="alert"
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--ds-radius-sm)',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#dc2626',
                  fontSize: '13px',
                  marginBottom: '14px',
                }}
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label htmlFor="income-branch" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Branch *
                </label>
                <select
                  id="income-branch"
                  value={formBranchId}
                  onChange={(e) => setFormBranchId(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--ds-radius-sm)',
                    border: '1px solid var(--ds-border)',
                    background: 'var(--ds-background)',
                    fontSize: '13px',
                    color: 'var(--ds-text)',
                  }}
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="income-amount" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Amount ({currency}) *
                </label>
                <input
                  id="income-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--ds-radius-sm)',
                    border: '1px solid var(--ds-border)',
                    background: 'var(--ds-background)',
                    fontSize: '13px',
                    color: 'var(--ds-text)',
                  }}
                />
              </div>

              <div>
                <label htmlFor="income-date" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Date *
                </label>
                <input
                  id="income-date"
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--ds-radius-sm)',
                    border: '1px solid var(--ds-border)',
                    background: 'var(--ds-background)',
                    fontSize: '13px',
                    color: 'var(--ds-text)',
                  }}
                />
              </div>

              <div>
                <label htmlFor="income-customer" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Source / Customer (Optional)
                </label>
                <select
                  id="income-customer"
                  value={formCustomerId}
                  onChange={(e) => setFormCustomerId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--ds-radius-sm)',
                    border: '1px solid var(--ds-border)',
                    background: 'var(--ds-background)',
                    fontSize: '13px',
                    color: 'var(--ds-text)',
                  }}
                >
                  <option value="">Direct Cash / External Source</option>
                  {activeCustomers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.contact ? `(${c.contact})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="income-note" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Description / Note
                </label>
                <textarea
                  id="income-note"
                  rows={2}
                  placeholder="e.g. Scrap sales, deposit interest, consulting fee..."
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--ds-radius-sm)',
                    border: '1px solid var(--ds-border)',
                    background: 'var(--ds-background)',
                    fontSize: '13px',
                    color: 'var(--ds-text)',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 'var(--ds-radius-sm)',
                    border: '1px solid var(--ds-border)',
                    background: 'transparent',
                    color: 'var(--ds-text)',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 'var(--ds-radius-sm)',
                    border: 'none',
                    background: '#16a34a',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isSubmitting ? 'Saving...' : 'Record Income'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

