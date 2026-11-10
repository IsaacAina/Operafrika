'use client'

import React, { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  TrendingUp,
  Receipt,
  Plus,
  Search,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Printer,
  Clock,
  CreditCard,
  Store,
  X,
  FileText,
  ChevronLeft,
  ChevronRight,
  User,
  Package,
  Trash2,
  Ban,
} from 'lucide-react'
import type { InvoiceSummary, InvoiceDetail } from '@/lib/sales'
import type { InvoiceStatus } from '@prisma/client'

interface BranchOption {
  id: string
  name: string
}

interface StockItemOption {
  id: string
  name: string
  sku: string | null
  quantity: number
  sellingPrice: number
  branchId: string
}

interface CustomerOption {
  id: string
  name: string
  contact: string | null
  branchId: string
}

interface SalesMetrics {
  todaySales: number
  todayCount: number
  totalInvoiced: number
  cashCollected: number
  outstandingBalance: number
  totalInvoices: number
}

interface SalesViewProps {
  initialInvoices: InvoiceSummary[]
  totalCount: number
  currentPage: number
  pageSize: number
  totalPages: number
  metrics: SalesMetrics
  branches: BranchOption[]
  selectedBranchId?: string
  currency: string
  userRole: string
  stockItems: StockItemOption[]
  customers: CustomerOption[]
}

interface LineItemDraft {
  stockItemId: string
  quantity: number
  price: number
}

export default function SalesView({
  initialInvoices,
  totalCount,
  currentPage,
  pageSize,
  totalPages,
  metrics,
  branches,
  selectedBranchId,
  currency,
  userRole,
  stockItems,
  customers,
}: SalesViewProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | InvoiceStatus>('ALL')
  const [invoices, setInvoices] = useState<InvoiceSummary[]>(initialInvoices)

  useEffect(() => {
    setInvoices(initialInvoices)
  }, [initialInvoices])

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [activeInvoiceDetail, setActiveInvoiceDetail] = useState<InvoiceDetail | null>(null)
  const [paymentInvoice, setPaymentInvoice] = useState<InvoiceSummary | null>(null)

  // Create form state
  const [formBranchId, setFormBranchId] = useState<string>(
    selectedBranchId || branches[0]?.id || '',
  )
  const [formCustomerId, setFormCustomerId] = useState<string>('')
  const [formLineItems, setFormLineItems] = useState<LineItemDraft[]>([
    { stockItemId: '', quantity: 1, price: 0 },
  ])
  const [formPaymentTerms, setFormPaymentTerms] = useState<'PAID' | 'PARTIAL' | 'UNPAID'>('PAID')
  const [formPaymentMethod, setFormPaymentMethod] = useState<'CASH' | 'TRANSFER' | 'POS'>('CASH')
  const [formPaymentAmount, setFormPaymentAmount] = useState<string>('')
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Payment form state
  const [paymentAmountInput, setPaymentAmountInput] = useState<string>('')
  const [paymentMethodInput, setPaymentMethodInput] = useState<'CASH' | 'TRANSFER' | 'POS'>('CASH')
  const [paymentError, setPaymentError] = useState<string | null>(null)

  // Filter available stock & customers by chosen branch
  const activeStockItems = stockItems.filter((s) => s.branchId === formBranchId)
  const activeCustomers = customers.filter((c) => c.branchId === formBranchId)

  // Calculated Grand Total for modal draft
  const draftTotal = formLineItems.reduce((acc, it) => acc + (it.quantity || 0) * (it.price || 0), 0)

  // Format currency
  const formatMoney = (amount: number) => {
    return `${currency} ${amount.toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  // Branch navigation
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

  // Filter handling
  const filteredInvoices = invoices.filter((inv) => {
    if (statusFilter !== 'ALL' && inv.status !== statusFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      const matchesId = inv.id.toLowerCase().includes(q)
      const matchesCustomer = inv.customerName?.toLowerCase().includes(q)
      if (!matchesId && !matchesCustomer) return false
    }
    return true
  })

  // Line item handlers
  const handleAddLineItem = () => {
    setFormLineItems([...formLineItems, { stockItemId: '', quantity: 1, price: 0 }])
  }

  const handleRemoveLineItem = (index: number) => {
    if (formLineItems.length <= 1) return
    setFormLineItems(formLineItems.filter((_, i) => i !== index))
  }

  const handleItemSelect = (index: number, stockItemId: string) => {
    const item = activeStockItems.find((s) => s.id === stockItemId)
    const updated = [...formLineItems]
    updated[index] = {
      stockItemId,
      quantity: 1,
      price: item ? item.sellingPrice : 0,
    }
    setFormLineItems(updated)
  }

  const handleQuantityChange = (index: number, qty: number) => {
    const updated = [...formLineItems]
    updated[index].quantity = Math.max(1, qty)
    setFormLineItems(updated)
  }

  const handlePriceChange = (index: number, price: number) => {
    const updated = [...formLineItems]
    updated[index].price = Math.max(0, price)
    setFormLineItems(updated)
  }

  // Open Create Modal
  const openCreateModal = () => {
    setFormBranchId(selectedBranchId || branches[0]?.id || '')
    setFormCustomerId('')
    setFormLineItems([{ stockItemId: '', quantity: 1, price: 0 }])
    setFormPaymentTerms('PAID')
    setFormPaymentMethod('CASH')
    setFormPaymentAmount('')
    setFormError(null)
    setShowCreateModal(true)
  }

  // Submit Create Invoice
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!formBranchId) {
      setFormError('Please select a branch.')
      return
    }

    const validItems = formLineItems.filter((it) => it.stockItemId && it.quantity > 0)
    if (validItems.length === 0) {
      setFormError('Please add at least one valid stock item with quantity > 0.')
      return
    }

    // Check stock
    for (const item of validItems) {
      const stock = activeStockItems.find((s) => s.id === item.stockItemId)
      if (stock && stock.quantity < item.quantity) {
        setFormError(
          `Insufficient stock for "${stock.name}". Available: ${stock.quantity}, requested: ${item.quantity}.`,
        )
        return
      }
    }

    let paymentAmount: number | undefined
    if (formPaymentTerms === 'PAID') {
      paymentAmount = draftTotal
    } else if (formPaymentTerms === 'PARTIAL') {
      const parsedAmount = parseFloat(formPaymentAmount)
      if (isNaN(parsedAmount) || parsedAmount <= 0 || parsedAmount >= draftTotal) {
        setFormError(`Partial payment must be between ${currency} 0.01 and ${formatMoney(draftTotal - 0.01)}.`)
        return
      }
      paymentAmount = parsedAmount
    } else {
      paymentAmount = 0
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/sales/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: formBranchId,
          customerId: formCustomerId ? formCustomerId : null,
          items: validItems.map((it) => ({
            stockItemId: it.stockItemId,
            quantity: it.quantity,
            price: it.price,
          })),
          status: formPaymentTerms,
          paymentMethod: formPaymentTerms !== 'UNPAID' ? formPaymentMethod : null,
          paymentAmount,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setFormError(data.error || 'Failed to create sale.')
        setIsSubmitting(false)
        return
      }

      setShowCreateModal(false)
      // Open receipt modal for immediate printing
      setActiveInvoiceDetail(data.invoice)
      setShowReceiptModal(true)

      // Instantly prepend new invoice to local state
      if (data.invoice) {
        const newSummary: InvoiceSummary = {
          id: data.invoice.id,
          branchId: data.invoice.branchId,
          branchName: data.invoice.branchName,
          customerId: data.invoice.customerId,
          customerName: data.invoice.customerName,
          status: data.invoice.status,
          paymentMethod: data.invoice.paymentMethod,
          paymentAmount: data.invoice.paymentAmount ?? 0,
          total: data.invoice.total,
          balanceDue: data.invoice.balanceDue,
          itemCount: data.invoice.items?.length ?? 0,
          createdAt: new Date(data.invoice.createdAt),
        }
        setInvoices((prev) => [newSummary, ...prev])
      }

      router.refresh()
    } catch {
      setFormError('An unexpected network error occurred.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Open Payment Modal
  const openPaymentModal = (inv: InvoiceSummary) => {
    setPaymentInvoice(inv)
    setPaymentAmountInput(inv.balanceDue.toString())
    setPaymentMethodInput('CASH')
    setPaymentError(null)
    setShowPaymentModal(true)
  }

  // Submit Payment
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!paymentInvoice) return

    const amount = parseFloat(paymentAmountInput)
    if (isNaN(amount) || amount <= 0 || amount > paymentInvoice.balanceDue) {
      setPaymentError(`Payment must be greater than 0 and at most ${formatMoney(paymentInvoice.balanceDue)}.`)
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/sales/invoices/${paymentInvoice.id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          paymentMethod: paymentMethodInput,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setPaymentError(data.error || 'Failed to record payment.')
        setIsSubmitting(false)
        return
      }

      setShowPaymentModal(false)

      // Instantly reflect payment in local state
      setInvoices((prev) =>
        prev.map((inv) => {
          if (inv.id === paymentInvoice.id) {
            const newBalance = Math.max(0, inv.balanceDue - amount)
            return {
              ...inv,
              balanceDue: newBalance,
              status: newBalance === 0 ? 'PAID' : 'PARTIAL',
            }
          }
          return inv
        }),
      )

      router.refresh()
    } catch {
      setPaymentError('Failed to record payment.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // View Receipt
  const handleViewReceipt = async (invoiceId: string) => {
    try {
      const res = await fetch(`/api/sales/invoices/${invoiceId}`)
      const data = await res.json()
      if (res.ok && data.invoice) {
        setActiveInvoiceDetail(data.invoice)
        setShowReceiptModal(true)
      }
    } catch {
      alert('Failed to load invoice receipt.')
    }
  }

  // Cancel Invoice
  const handleCancelInvoice = async (invoiceId: string) => {
    if (!confirm('Are you sure you want to cancel this invoice? Stock quantities will be restored.')) {
      return
    }

    try {
      const res = await fetch(`/api/sales/invoices/${invoiceId}/cancel`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Failed to cancel invoice.')
        return
      }
      // Instantly remove cancelled invoice from list
      setInvoices((prev) => prev.filter((inv) => inv.id !== invoiceId))
      alert('Invoice cancelled and items restocked successfully.')
      router.refresh()
    } catch {
      alert('Failed to cancel invoice.')
    }
  }

  const canEditOrCancel = userRole === 'OWNER' || userRole === 'MANAGER'

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
          onClick={openCreateModal}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--ds-primary)',
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
          <Plus size={18} /> New Sale / Issue Invoice
        </button>
      </section>

      {/* KPI Cards Grid */}
      <section
        aria-label="Sales performance summary"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: 'var(--ds-space-4)',
        }}
      >
        {/* Today's Sales */}
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
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ds-text-secondary)' }}>Today's Sales</span>
            <span style={{ padding: '6px', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.1)', color: '#16a34a' }}>
              <TrendingUp size={18} />
            </span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--ds-text)' }}>
            {formatMoney(metrics.todaySales)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--ds-text-secondary)' }}>
            {metrics.todayCount} transactions recorded today
          </div>
        </div>

        {/* Cash Collected */}
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
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ds-text-secondary)' }}>Cash Collected</span>
            <span style={{ padding: '6px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', color: '#2563eb' }}>
              <DollarSign size={18} />
            </span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#16a34a' }}>
            {formatMoney(metrics.cashCollected)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--ds-text-secondary)' }}>
            Paid in full or partial receipts
          </div>
        </div>

        {/* Outstanding Receivables */}
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
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ds-text-secondary)' }}>Outstanding Due</span>
            <span style={{ padding: '6px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: '#dc2626' }}>
              <Clock size={18} />
            </span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: metrics.outstandingBalance > 0 ? '#dc2626' : 'var(--ds-text)' }}>
            {formatMoney(metrics.outstandingBalance)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--ds-text-secondary)' }}>
            Uncollected credit balances
          </div>
        </div>

        {/* Total Invoices */}
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
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ds-text-secondary)' }}>Total Invoices</span>
            <span style={{ padding: '6px', borderRadius: '50%', background: 'rgba(168, 85, 247, 0.1)', color: '#9333ea' }}>
              <Receipt size={18} />
            </span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--ds-text)' }}>
            {metrics.totalInvoices}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--ds-text-secondary)' }}>
            {formatMoney(metrics.totalInvoiced)} cumulative value
          </div>
        </div>
      </section>

      {/* Invoices List Table & Filter Section */}
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
        {/* Table Filters & Search Header */}
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
          {/* Status filter tabs */}
          <div style={{ display: 'flex', gap: 'var(--ds-space-2)', flexWrap: 'wrap' }}>
            {(['ALL', 'PAID', 'PARTIAL', 'UNPAID'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--ds-radius-sm)',
                  fontSize: '13px',
                  fontWeight: statusFilter === st ? 600 : 500,
                  background: statusFilter === st ? 'var(--ds-primary)' : 'var(--ds-surface-secondary, rgba(0,0,0,0.04))',
                  color: statusFilter === st ? '#ffffff' : 'var(--ds-text)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
              >
                {st === 'ALL' ? 'All Invoices' : st.charAt(0) + st.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div style={{ position: 'relative', width: '100%', maxWidth: '320px' }}>
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--ds-text-secondary)' }}>
              <Search size={16} />
            </span>
            <input
              type="text"
              placeholder="Search by invoice # or customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search invoices"
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
            aria-label="Invoices list"
          >
            <thead>
              <tr style={{ background: 'var(--ds-surface-secondary, rgba(0,0,0,0.02))', borderBottom: '1px solid var(--ds-border)' }}>
                <th scope="col" style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--ds-text-secondary)' }}>Invoice #</th>
                <th scope="col" style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--ds-text-secondary)' }}>Date</th>
                <th scope="col" style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--ds-text-secondary)' }}>Customer</th>
                <th scope="col" style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--ds-text-secondary)' }}>Branch</th>
                <th scope="col" style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--ds-text-secondary)', textAlign: 'right' }}>Total</th>
                <th scope="col" style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--ds-text-secondary)', textAlign: 'right' }}>Balance Due</th>
                <th scope="col" style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--ds-text-secondary)' }}>Status</th>
                <th scope="col" style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--ds-text-secondary)', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--ds-text-secondary)' }}>
                    <Receipt size={32} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                    <p style={{ margin: 0, fontWeight: 500 }}>No invoices found matching your filters.</p>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const isPaid = inv.status === 'PAID'
                  const isPartial = inv.status === 'PARTIAL'
                  return (
                    <tr
                      key={inv.id}
                      style={{
                        borderBottom: '1px solid var(--ds-border)',
                        transition: 'background 0.1s ease',
                      }}
                    >
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 600, color: 'var(--ds-text)' }}>
                        #{inv.id.slice(-6).toUpperCase()}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--ds-text-secondary)' }}>
                        {new Date(inv.createdAt).toLocaleDateString('en-NG', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--ds-text)', fontWeight: 500 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <User size={14} style={{ color: 'var(--ds-text-secondary)' }} />
                          {inv.customerName}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--ds-text-secondary)' }}>
                        {inv.branchName}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--ds-text)' }}>
                        {formatMoney(inv.total)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: inv.balanceDue > 0 ? '#dc2626' : '#16a34a' }}>
                        {inv.balanceDue > 0 ? formatMoney(inv.balanceDue) : '₦ 0.00'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 600,
                            background: isPaid
                              ? 'rgba(34, 197, 94, 0.15)'
                              : isPartial
                                ? 'rgba(234, 179, 8, 0.15)'
                                : 'rgba(239, 68, 68, 0.15)',
                            color: isPaid ? '#16a34a' : isPartial ? '#b45309' : '#dc2626',
                          }}
                        >
                          {isPaid ? <CheckCircle2 size={12} /> : isPartial ? <Clock size={12} /> : <AlertCircle size={12} />}
                          {inv.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleViewReceipt(inv.id)}
                            title="View / Print Receipt"
                            style={{
                              padding: '5px 8px',
                              borderRadius: 'var(--ds-radius-sm)',
                              border: '1px solid var(--ds-border)',
                              background: 'transparent',
                              color: 'var(--ds-text)',
                              fontSize: '12px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Printer size={13} /> View
                          </button>

                          {canEditOrCancel && !isPaid && (
                            <button
                              type="button"
                              onClick={() => openPaymentModal(inv)}
                              title="Record Payment"
                              style={{
                                padding: '5px 8px',
                                borderRadius: 'var(--ds-radius-sm)',
                                border: '1px solid var(--ds-primary)',
                                background: 'var(--ds-primary)',
                                color: '#ffffff',
                                fontSize: '12px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <CreditCard size={13} /> Pay
                            </button>
                          )}

                          {canEditOrCancel && (
                            <button
                              type="button"
                              onClick={() => handleCancelInvoice(inv.id)}
                              title="Cancel & Restock"
                              style={{
                                padding: '5px 8px',
                                borderRadius: 'var(--ds-radius-sm)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                background: 'transparent',
                                color: '#dc2626',
                                fontSize: '12px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                              }}
                            >
                              <Ban size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Invoices Cards (Zero Horizontal Scroll on Mobile View) */}
        <div className="mobile-cards-container" style={{ display: 'none', flexDirection: 'column', gap: '12px', padding: '12px' }}>
          {filteredInvoices.length === 0 ? (
            <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--ds-text-secondary)', background: 'var(--ds-surface)', borderRadius: 'var(--ds-radius-md)', border: '1px solid var(--ds-border)' }}>
              <Receipt size={32} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
              <p style={{ margin: 0, fontWeight: 500 }}>No invoices found matching your filters.</p>
            </div>
          ) : (
            filteredInvoices.map((inv) => {
              const isPaid = inv.status === 'PAID'
              const isPartial = inv.status === 'PARTIAL'
              return (
                <div
                  key={`mobile-${inv.id}`}
                  style={{
                    backgroundColor: 'var(--ds-surface)',
                    border: '1px solid var(--ds-border)',
                    borderRadius: 'var(--ds-radius-md)',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                  }}
                >
                  {/* Top Bar: Invoice # + Status Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.875rem', color: 'var(--ds-text)' }}>
                      #{inv.id.slice(-6).toUpperCase()}
                    </span>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: isPaid
                          ? 'rgba(34, 197, 94, 0.15)'
                          : isPartial
                            ? 'rgba(234, 179, 8, 0.15)'
                            : 'rgba(239, 68, 68, 0.15)',
                        color: isPaid ? '#16a34a' : isPartial ? '#b45309' : '#dc2626',
                      }}
                    >
                      {isPaid ? <CheckCircle2 size={12} /> : isPartial ? <Clock size={12} /> : <AlertCircle size={12} />}
                      {inv.status}
                    </span>
                  </div>

                  {/* Customer and Date */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', fontWeight: 600, color: 'var(--ds-text)' }}>
                      <User size={14} style={{ color: 'var(--ds-text-secondary)', flexShrink: 0 }} />
                      <span>{inv.customerName}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--ds-text-secondary)' }}>
                      <span>Branch: {inv.branchName}</span>
                      <span>
                        {new Date(inv.createdAt).toLocaleDateString('en-NG', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Financial Breakdown */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 10px',
                      borderRadius: 'var(--ds-radius-sm)',
                      background: 'var(--ds-surface-secondary, rgba(0,0,0,0.02))',
                      fontSize: '0.8125rem',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--ds-text-secondary)', display: 'block' }}>Total</span>
                      <strong style={{ fontSize: '0.9375rem', color: 'var(--ds-text)' }}>{formatMoney(inv.total)}</strong>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--ds-text-secondary)', display: 'block' }}>Balance Due</span>
                      <strong style={{ fontSize: '0.9375rem', color: inv.balanceDue > 0 ? '#dc2626' : '#16a34a' }}>
                        {inv.balanceDue > 0 ? formatMoney(inv.balanceDue) : '₦ 0.00'}
                      </strong>
                    </div>
                  </div>

                  {/* Mobile Actions */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px', paddingTop: '8px', borderTop: '1px solid var(--ds-border)' }}>
                    <button
                      type="button"
                      onClick={() => handleViewReceipt(inv.id)}
                      style={{
                        flex: 1,
                        padding: '8px',
                        borderRadius: 'var(--ds-radius-sm)',
                        border: '1px solid var(--ds-border)',
                        background: 'transparent',
                        color: 'var(--ds-text)',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <Printer size={14} /> View
                    </button>

                    {canEditOrCancel && !isPaid && (
                      <button
                        type="button"
                        onClick={() => openPaymentModal(inv)}
                        style={{
                          flex: 1,
                          padding: '8px',
                          borderRadius: 'var(--ds-radius-sm)',
                          border: '1px solid var(--ds-primary)',
                          background: 'var(--ds-primary)',
                          color: '#ffffff',
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                      >
                        <CreditCard size={14} /> Pay
                      </button>
                    )}

                    {canEditOrCancel && (
                      <button
                        type="button"
                        onClick={() => handleCancelInvoice(inv.id)}
                        title="Cancel & Restock"
                        aria-label="Cancel invoice"
                        style={{
                          padding: '8px 12px',
                          borderRadius: 'var(--ds-radius-sm)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          background: 'transparent',
                          color: '#dc2626',
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Ban size={14} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
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
              Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} invoices
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

      {/* MODAL 1: Create Sale / Issue Invoice */}
      {showCreateModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-invoice-title"
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
            className="route-card responsive-modal-content"
            style={{
              width: '100%',
              maxWidth: '720px',
              maxHeight: '92dvh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
              display: 'flex',
              flexDirection: 'column',
              padding: 0,
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: 'var(--ds-space-4) var(--ds-space-5)',
                borderBottom: '1px solid var(--ds-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h2 id="create-invoice-title" style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--ds-text)' }}>
                New Sale &amp; Invoice
              </h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ds-text-secondary)', padding: '4px' }}
                aria-label="Close dialog"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateSubmit} style={{ padding: 'var(--ds-space-4) var(--ds-space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-4)' }}>
              {formError && (
                <div
                  role="alert"
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--ds-radius-sm)',
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#dc2626',
                    fontSize: '13px',
                    fontWeight: 500,
                  }}
                >
                  {formError}
                </div>
              )}

              {/* Branch & Customer Selector Row (Responsive Columns) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--ds-space-3)' }}>
                <div>
                  <label htmlFor="sale-branch" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    Branch *
                  </label>
                  <select
                    id="sale-branch"
                    value={formBranchId}
                    onChange={(e) => {
                      setFormBranchId(e.target.value)
                      setFormLineItems([{ stockItemId: '', quantity: 1, price: 0 }])
                    }}
                    required
                    style={{
                      width: '100%',
                      padding: '9px 12px',
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
                  <label htmlFor="sale-customer" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    Customer (Optional / Walk-in)
                  </label>
                  <select
                    id="sale-customer"
                    value={formCustomerId}
                    onChange={(e) => setFormCustomerId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 'var(--ds-radius-sm)',
                      border: '1px solid var(--ds-border)',
                      background: 'var(--ds-background)',
                      fontSize: '13px',
                      color: 'var(--ds-text)',
                    }}
                  >
                    <option value="">Walk-in Customer (No Profile)</option>
                    {activeCustomers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.contact ? `(${c.contact})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Line Items Editor */}
              <div style={{ marginTop: 'var(--ds-space-2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ds-text)' }}>
                    Line Items *
                  </label>
                  <button
                    type="button"
                    onClick={handleAddLineItem}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 'var(--ds-radius-sm)',
                      background: 'transparent',
                      border: '1px solid var(--ds-border)',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--ds-primary)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Plus size={14} /> Add Item
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {formLineItems.map((line, idx) => {
                    const selectedStock = activeStockItems.find((s) => s.id === line.stockItemId)
                    const lineTotal = line.quantity * line.price
                    return (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          padding: '12px',
                          background: 'var(--ds-surface-secondary, rgba(0,0,0,0.02))',
                          borderRadius: 'var(--ds-radius-md)',
                          border: '1px solid var(--ds-border)',
                        }}
                      >
                        {/* Stock Item Dropdown */}
                        <div style={{ width: '100%' }}>
                          <select
                            value={line.stockItemId}
                            onChange={(e) => handleItemSelect(idx, e.target.value)}
                            required
                            aria-label={`Select item for row ${idx + 1}`}
                            style={{
                              width: '100%',
                              padding: '9px 12px',
                              borderRadius: 'var(--ds-radius-sm)',
                              border: '1px solid var(--ds-border)',
                              background: 'var(--ds-background)',
                              fontSize: '13px',
                              color: 'var(--ds-text)',
                            }}
                          >
                            <option value="">-- Choose Stock Item --</option>
                            {activeStockItems.map((si) => (
                              <option key={si.id} value={si.id} disabled={si.quantity <= 0}>
                                {si.name} {si.sku ? `[${si.sku}]` : ''} - (Stock: {si.quantity})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Controls Bar: Stepper, Price, Subtotal, Remove */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '8px',
                          }}
                        >
                          {/* Quantity Stepper */}
                          <div style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid var(--ds-border)', borderRadius: 'var(--ds-radius-sm)', overflow: 'hidden', height: '36px' }}>
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(idx, Math.max(1, line.quantity - 1))}
                              disabled={line.quantity <= 1}
                              aria-label={`Decrease quantity for item ${idx + 1}`}
                              style={{
                                width: '36px',
                                height: '100%',
                                border: 'none',
                                background: 'var(--ds-surface-secondary, #f3f4f6)',
                                color: 'var(--ds-text)',
                                fontSize: '16px',
                                fontWeight: 700,
                                cursor: line.quantity <= 1 ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: line.quantity <= 1 ? 0.4 : 1,
                              }}
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="1"
                              max={selectedStock ? selectedStock.quantity : 9999}
                              value={line.quantity}
                              onChange={(e) => handleQuantityChange(idx, parseInt(e.target.value, 10) || 1)}
                              required
                              aria-label={`Quantity for row ${idx + 1}`}
                              style={{
                                width: '44px',
                                height: '100%',
                                textAlign: 'center',
                                border: 'none',
                                background: 'var(--ds-background)',
                                fontSize: '13px',
                                fontWeight: 700,
                                color: 'var(--ds-text)',
                                outline: 'none',
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const max = selectedStock ? selectedStock.quantity : 9999
                                handleQuantityChange(idx, Math.min(max, line.quantity + 1))
                              }}
                              disabled={selectedStock ? line.quantity >= selectedStock.quantity : false}
                              aria-label={`Increase quantity for item ${idx + 1}`}
                              style={{
                                width: '36px',
                                height: '100%',
                                border: 'none',
                                background: 'var(--ds-surface-secondary, #f3f4f6)',
                                color: 'var(--ds-text)',
                                fontSize: '16px',
                                fontWeight: 700,
                                cursor: (selectedStock && line.quantity >= selectedStock.quantity) ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: (selectedStock && line.quantity >= selectedStock.quantity) ? 0.4 : 1,
                              }}
                            >
                              +
                            </button>
                          </div>

                          {/* Unit Price */}
                          <div style={{ flex: '1 1 90px', minWidth: '70px', maxWidth: '120px' }}>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.price}
                              onChange={(e) => handlePriceChange(idx, parseFloat(e.target.value) || 0)}
                              required
                              aria-label={`Price for row ${idx + 1}`}
                              placeholder="Price"
                              style={{
                                width: '100%',
                                height: '36px',
                                padding: '0 8px',
                                borderRadius: 'var(--ds-radius-sm)',
                                border: '1px solid var(--ds-border)',
                                background: 'var(--ds-background)',
                                fontSize: '13px',
                                color: 'var(--ds-text)',
                              }}
                            />
                          </div>

                          {/* Subtotal & Remove Button */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ds-text)' }}>
                              {formatMoney(lineTotal)}
                            </span>

                            <button
                              type="button"
                              onClick={() => handleRemoveLineItem(idx)}
                              disabled={formLineItems.length <= 1}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: formLineItems.length <= 1 ? 'var(--ds-border)' : '#dc2626',
                                cursor: formLineItems.length <= 1 ? 'not-allowed' : 'pointer',
                                padding: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              aria-label={`Remove row ${idx + 1}`}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Total Summary Callout */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  background: 'var(--ds-surface-secondary, rgba(0,0,0,0.03))',
                  borderRadius: 'var(--ds-radius-md)',
                  border: '1px solid var(--ds-border)',
                }}
              >
                <span style={{ fontSize: '14px', fontWeight: 600 }}>Grand Total</span>
                <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--ds-primary)' }}>
                  {formatMoney(draftTotal)}
                </span>
              </div>

              {/* Payment Terms Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Payment Terms *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {(['PAID', 'PARTIAL', 'UNPAID'] as const).map((terms) => (
                    <button
                      key={terms}
                      type="button"
                      onClick={() => setFormPaymentTerms(terms)}
                      style={{
                        padding: '8px',
                        borderRadius: 'var(--ds-radius-sm)',
                        border: '1px solid',
                        borderColor: formPaymentTerms === terms ? 'var(--ds-primary)' : 'var(--ds-border)',
                        background: formPaymentTerms === terms ? 'rgba(34, 197, 94, 0.1)' : 'transparent',
                        color: formPaymentTerms === terms ? '#16a34a' : 'var(--ds-text)',
                        fontSize: '13px',
                        fontWeight: formPaymentTerms === terms ? 600 : 400,
                        cursor: 'pointer',
                      }}
                    >
                      {terms === 'PAID' ? 'Paid in Full' : terms === 'PARTIAL' ? 'Partial Down Payment' : 'Unpaid / On Credit'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Additional payment inputs if paid or partial */}
              {formPaymentTerms !== 'UNPAID' && (
                <div style={{ display: 'grid', gridTemplateColumns: formPaymentTerms === 'PARTIAL' ? '1fr 1fr' : '1fr', gap: 'var(--ds-space-4)' }}>
                  <div>
                    <label htmlFor="sale-paymethod" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                      Payment Method *
                    </label>
                    <select
                      id="sale-paymethod"
                      value={formPaymentMethod}
                      onChange={(e) => setFormPaymentMethod(e.target.value as any)}
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
                      <option value="CASH">Cash</option>
                      <option value="TRANSFER">Bank Transfer</option>
                      <option value="POS">POS / Card</option>
                    </select>
                  </div>

                  {formPaymentTerms === 'PARTIAL' && (
                    <div>
                      <label htmlFor="sale-payamount" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                        Amount Collected Now ({currency}) *
                      </label>
                      <input
                        id="sale-payamount"
                        type="number"
                        min="0.01"
                        max={draftTotal - 0.01}
                        step="0.01"
                        value={formPaymentAmount}
                        onChange={(e) => setFormPaymentAmount(e.target.value)}
                        placeholder="0.00"
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
                  )}
                </div>
              )}

              {/* Modal Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--ds-space-3)', marginTop: 'var(--ds-space-4)' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    padding: '8px 16px',
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
                    padding: '8px 20px',
                    borderRadius: 'var(--ds-radius-sm)',
                    border: 'none',
                    background: 'var(--ds-primary)',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    opacity: isSubmitting ? 0.7 : 1,
                  }}
                >
                  {isSubmitting ? 'Processing...' : 'Complete Sale & Issue Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Record Payment */}
      {showPaymentModal && paymentInvoice && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="record-payment-title"
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
              maxWidth: '440px',
              padding: 'var(--ds-space-6)',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 id="record-payment-title" style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>
                Record Payment
              </h2>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ds-text-secondary)' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--ds-text-secondary)', margin: '0 0 16px' }}>
              Invoice #{paymentInvoice.id.slice(-6).toUpperCase()} for {paymentInvoice.customerName}
            </p>

            <div
              style={{
                padding: '12px',
                background: 'var(--ds-surface-secondary, rgba(0,0,0,0.03))',
                borderRadius: 'var(--ds-radius-sm)',
                marginBottom: '16px',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: 600 }}>Balance Due:</span>
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#dc2626' }}>
                {formatMoney(paymentInvoice.balanceDue)}
              </span>
            </div>

            {paymentError && (
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
                {paymentError}
              </div>
            )}

            <form onSubmit={handlePaymentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label htmlFor="pay-amount-input" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Amount ({currency}) *
                </label>
                <input
                  id="pay-amount-input"
                  type="number"
                  min="0.01"
                  max={paymentInvoice.balanceDue}
                  step="0.01"
                  value={paymentAmountInput}
                  onChange={(e) => setPaymentAmountInput(e.target.value)}
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
                <label htmlFor="pay-method-input" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Payment Method *
                </label>
                <select
                  id="pay-method-input"
                  value={paymentMethodInput}
                  onChange={(e) => setPaymentMethodInput(e.target.value as any)}
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
                  <option value="CASH">Cash</option>
                  <option value="TRANSFER">Bank Transfer</option>
                  <option value="POS">POS / Card</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
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
                    background: 'var(--ds-primary)',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isSubmitting ? 'Recording...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Printable Invoice Receipt */}
      {showReceiptModal && activeInvoiceDetail && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="receipt-modal-title"
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
              background: '#ffffff',
              color: '#0f172a',
              borderRadius: 'var(--ds-radius-lg)',
              width: '100%',
              maxWidth: '560px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              display: 'flex',
              flexDirection: 'column',
              padding: '28px',
            }}
          >
            {/* Action Bar (Not printed) */}
            <div
              className="no-print"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '20px',
                borderBottom: '1px solid #e2e8f0',
                paddingBottom: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Receipt size={20} color="#0f172a" />
                <h3 id="receipt-modal-title" style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
                  Invoice Receipt
                </h3>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '4px',
                    background: '#0f172a',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Printer size={14} /> Print Receipt
                </button>
                <button
                  type="button"
                  onClick={() => setShowReceiptModal(false)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '4px',
                    background: '#e2e8f0',
                    color: '#0f172a',
                    border: 'none',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
              </div>
            </div>

            {/* Printable Receipt Content */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ textAlign: 'center', borderBottom: '1px dashed #cbd5e1', paddingBottom: '16px' }}>
                <h2 style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: 800 }}>OPERAFRIKA SME</h2>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Branch: {activeInvoiceDetail.branchName}</p>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>
                  {new Date(activeInvoiceDetail.createdAt).toLocaleString('en-NG', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', borderBottom: '1px dashed #cbd5e1', paddingBottom: '12px' }}>
                <div>
                  <span style={{ color: '#64748b' }}>Invoice #: </span>
                  <strong>{activeInvoiceDetail.id.slice(-8).toUpperCase()}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Customer: </span>
                  <strong>{activeInvoiceDetail.customerName}</strong>
                </div>
              </div>

              {/* Items Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #0f172a', textAlign: 'left' }}>
                    <th style={{ padding: '6px 0' }}>Item</th>
                    <th style={{ padding: '6px 0', textAlign: 'center' }}>Qty</th>
                    <th style={{ padding: '6px 0', textAlign: 'right' }}>Price</th>
                    <th style={{ padding: '6px 0', textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {activeInvoiceDetail.items.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 0' }}>
                        <div>{item.stockItemName}</div>
                        {item.sku && <small style={{ color: '#64748b' }}>[{item.sku}]</small>}
                      </td>
                      <td style={{ padding: '8px 0', textAlign: 'center' }}>{item.quantity}</td>
                      <td style={{ padding: '8px 0', textAlign: 'right' }}>{formatMoney(item.price)}</td>
                      <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600 }}>{formatMoney(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Summary Totals */}
              <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Subtotal:</span>
                  <span>{formatMoney(activeInvoiceDetail.total)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                  <span>Total Amount:</span>
                  <span>{formatMoney(activeInvoiceDetail.total)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}>
                  <span>Amount Paid ({activeInvoiceDetail.paymentMethod || 'N/A'}):</span>
                  <span>{formatMoney(activeInvoiceDetail.paymentAmount || 0)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '14px', color: activeInvoiceDetail.balanceDue > 0 ? '#dc2626' : '#16a34a' }}>
                  <span>Balance Due:</span>
                  <span>{formatMoney(activeInvoiceDetail.balanceDue)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                  <span style={{ color: '#64748b' }}>Status:</span>
                  <strong>{activeInvoiceDetail.status}</strong>
                </div>
              </div>

              <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '12px', color: '#94a3b8' }}>
                Thank you for your business! Powered by Operafrika.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

