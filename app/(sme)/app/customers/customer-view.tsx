'use client'

import React, { useState, useEffect } from 'react'
import type { CustomerWithStats } from '@/lib/customers'
import {
  Users,
  UserPlus,
  Clock,
  DollarSign,
  UploadCloud,
  Search,
  Edit3,
  X,
  Lightbulb,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  FileSpreadsheet,
  Store,
  Receipt,
  Phone,
  Mail,
  ArrowRight,
  Trash2,
} from 'lucide-react'

interface CustomerViewProps {
  initialCustomers: CustomerWithStats[]
  totalCount: number
  initialPage: number
  pageSize: number
  totalPages: number
  branches: Array<{ id: string; name: string }>
  currentBranchId: string | null
  userRole: string
  currency: string
}

// Generate consistent avatar color based on customer name
function getAvatarColor(name: string): { bg: string; text: string } {
  const colors = [
    { bg: 'rgba(15, 118, 110, 0.12)', text: '#0f766e' }, // Teal
    { bg: 'rgba(37, 99, 235, 0.12)', text: '#2563eb' }, // Blue
    { bg: 'rgba(124, 58, 237, 0.12)', text: '#7c3aed' }, // Violet
    { bg: 'rgba(217, 119, 6, 0.12)', text: '#d97706' }, // Amber
    { bg: 'rgba(219, 39, 119, 0.12)', text: '#db2777' }, // Pink
    { bg: 'rgba(5, 150, 105, 0.12)', text: '#059669' }, // Emerald
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % colors.length
  return colors[index]!
}

// Extract initials (up to 2 letters)
function getInitials(name: string): string {
  if (!name || !name.trim()) return 'CU'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase()
  }
  return ((parts[0]![0] || '') + (parts[parts.length - 1]![0] || '')).toUpperCase()
}

export default function CustomerView({
  initialCustomers,
  totalCount: initialTotalCount,
  initialPage,
  pageSize,
  totalPages: initialTotalPages,
  branches,
  currentBranchId,
  userRole,
  currency,
}: CustomerViewProps) {
  const [customers, setCustomers] = useState<CustomerWithStats[]>(initialCustomers)
  const [totalCount, setTotalCount] = useState(initialTotalCount)
  const [page, setPage] = useState(initialPage)
  const [totalPages, setTotalPages] = useState(initialTotalPages)
  const [search, setSearch] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    setCustomers(initialCustomers)
    setTotalCount(initialTotalCount)
    setPage(initialPage)
    setTotalPages(initialTotalPages)
  }, [initialCustomers, initialTotalCount, initialPage, initialTotalPages])

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [editCustomer, setEditCustomer] = useState<CustomerWithStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Form states
  const [addForm, setAddForm] = useState({
    branchId: currentBranchId || (branches[0]?.id ?? ''),
    name: '',
    contact: '',
  })

  const [editForm, setEditForm] = useState({
    name: '',
    contact: '',
  })

  // CSV Import state
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvPreview, setCsvPreview] = useState<Array<{ name: string; contact?: string }>>([])
  const [importReport, setImportReport] = useState<{ importedCount: number; errors: string[] } | null>(null)

  const isStaff = userRole === 'STAFF'

  function formatMoney(amount: number): string {
    try {
      return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
      }).format(amount)
    } catch {
      return `${currency} ${amount.toFixed(2)}`
    }
  }

  const handleExportCsv = () => {
    const params = new URLSearchParams()
    if (currentBranchId) params.set('branch', currentBranchId)
    if (search.trim()) params.set('search', search.trim())
    window.location.href = `/api/customers/export?${params.toString()}`
  }

  // Refetch / Search helper
  async function fetchPage(targetPage: number, query = search) {
    setIsSearching(true)
    setErrorMsg(null)

    try {
      const params = new URLSearchParams({
        page: targetPage.toString(),
        pageSize: pageSize.toString(),
      })
      if (currentBranchId) params.set('branch', currentBranchId)
      if (query.trim()) params.set('search', query.trim())

      const res = await fetch(`/api/customers?${params.toString()}`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch customers')
      }

      setCustomers(data.customers)
      setTotalCount(data.totalCount)
      setPage(data.page)
      setTotalPages(data.totalPages)
    } catch (err: unknown) {
      const error = err as Error
      setErrorMsg(error.message)
    } finally {
      setIsSearching(false)
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    await fetchPage(1, search)
  }

  async function handleAddCustomer(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setErrorMsg(null)

    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create customer')
      }

      setSuccessMsg(`Customer "${data.customer.name}" created successfully.`)
      setIsAddOpen(false)

      if (data.customer) {
        const branchObj = branches.find((b) => b.id === data.customer.branchId)
        const now = new Date()
        const newCust: CustomerWithStats = {
          id: data.customer.id,
          name: data.customer.name,
          contact: data.customer.contact ?? null,
          branchId: data.customer.branchId,
          branchName: branchObj?.name ?? 'Branch',
          createdAt: data.customer.createdAt ? new Date(data.customer.createdAt) : now,
          updatedAt: data.customer.updatedAt ? new Date(data.customer.updatedAt) : now,
          invoiceCount: 0,
          totalSpent: 0,
          outstandingBalance: 0,
        }
        setCustomers((prev) => [newCust, ...prev])
        setTotalCount((prev) => prev + 1)
      }

      setAddForm({
        branchId: currentBranchId || (branches[0]?.id ?? ''),
        name: '',
        contact: '',
      })
      await fetchPage(1)
    } catch (err: unknown) {
      const error = err as Error
      setErrorMsg(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleEditCustomer(e: React.FormEvent) {
    e.preventDefault()
    if (!editCustomer) return
    setIsLoading(true)
    setErrorMsg(null)

    try {
      const res = await fetch(`/api/customers/${editCustomer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update customer')
      }

      setSuccessMsg(`Customer "${data.customer.name}" updated successfully.`)
      setEditCustomer(null)
      await fetchPage(page)
    } catch (err: unknown) {
      const error = err as Error
      setErrorMsg(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDeleteCustomer(customer: CustomerWithStats) {
    if (!confirm(`Are you sure you want to delete customer "${customer.name}"? Historical invoices and records will remain preserved.`)) {
      return
    }

    setIsLoading(true)
    setErrorMsg(null)

    try {
      const res = await fetch(`/api/customers/${customer.id}`, {
        method: 'DELETE',
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete customer')
      }

      setCustomers((prev) => prev.filter((c) => c.id !== customer.id))
      setTotalCount((prev) => Math.max(0, prev - 1))
      setSuccessMsg(`Customer "${customer.name}" was successfully removed.`)
    } catch (err: unknown) {
      const error = err as Error
      setErrorMsg(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Parse CSV file in browser
  function handleCsvFileSelect(file: File) {
    setCsvFile(file)
    setImportReport(null)
    const reader = new FileReader()

    reader.onload = (event) => {
      const text = event.target?.result as string
      if (!text) return

      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
      if (lines.length < 2) {
        setErrorMsg('CSV must contain a header row and at least one data row.')
        return
      }

      const headers = lines[0]!.toLowerCase().split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''))
      const nameIndex = headers.findIndex((h) => h.includes('name'))
      const contactIndex = headers.findIndex(
        (h) => h.includes('contact') || h.includes('phone') || h.includes('email') || h.includes('number'),
      )

      if (nameIndex === -1) {
        setErrorMsg('CSV must include a column named "name" or "customer name".')
        return
      }

      const parsedRecords: Array<{ name: string; contact?: string }> = []
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i]!
        const cols = line.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''))
        const name = cols[nameIndex]
        if (name) {
          const contact = contactIndex !== -1 ? cols[contactIndex] : undefined
          parsedRecords.push({ name, contact: contact || undefined })
        }
      }

      setCsvPreview(parsedRecords.slice(0, 50))
    }

    reader.readAsText(file)
  }

  async function handleCsvImportSubmit() {
    if (!csvPreview.length) return
    setIsLoading(true)
    setErrorMsg(null)

    try {
      const targetBranchId = currentBranchId || (branches[0]?.id ?? '')
      const res = await fetch('/api/customers/import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: targetBranchId,
          records: csvPreview,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to import CSV')
      }

      setImportReport(data)
      setSuccessMsg(`Successfully imported ${data.importedCount} customers!`)
      await fetchPage(1)
    } catch (err: unknown) {
      const error = err as Error
      setErrorMsg(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Summary stats
  const totalOutstanding = customers.reduce((sum, c) => sum + c.outstandingBalance, 0)
  const customersWithDebt = customers.filter((c) => c.outstandingBalance > 0).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-6)', width: '100%' }}>
      {/* Walk-in Clarification / A11y Notice */}
      <aside
        aria-label="Walk-in sales guidance"
        style={{
          padding: 'var(--ds-space-4) var(--ds-space-5)',
          backgroundColor: 'var(--ds-color-surface-container-lowest)',
          borderLeft: '4px solid var(--ds-color-primary)',
          borderRadius: 'var(--ds-radius-lg)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          border: '1px solid var(--ds-color-outline-variant)',
          borderLeftWidth: '4px',
          borderLeftColor: 'var(--ds-color-primary)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--ds-space-3)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            borderRadius: 'var(--ds-radius-full)',
            backgroundColor: 'rgba(15, 118, 110, 0.1)',
            color: 'var(--ds-color-primary)',
            flexShrink: 0,
          }}
        >
          <Lightbulb size={20} />
        </div>
        <div>
          <p
            style={{
              margin: 0,
              fontSize: '0.875rem',
              color: 'var(--ds-color-on-surface)',
              fontFamily: 'Inter, sans-serif',
              lineHeight: 1.5,
            }}
          >
            <strong style={{ fontWeight: 700, color: 'var(--ds-color-on-surface)' }}>Optional Customer Profiles:</strong> Walk-in sales in Operafrika do not require creating a customer profile first. Use profiles to track recurring client relationships, contact numbers, and credit balances.
          </p>
        </div>
      </aside>

      {/* Success Notification Banner */}
      {successMsg && (
        <div
          role="status"
          aria-live="polite"
          style={{
            padding: 'var(--ds-space-3) var(--ds-space-4)',
            backgroundColor: '#ecfdf5',
            color: '#065f46',
            border: '1px solid #a7f3d0',
            borderRadius: 'var(--ds-radius-lg)',
            fontWeight: 600,
            fontSize: '0.875rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={18} color="#059669" />
            {successMsg}
          </span>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            aria-label="Dismiss notification"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#065f46',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '2px',
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* KPI Stat Cards with Lucide Icons */}
      <section
        aria-label="Customer statistics"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 'var(--ds-space-4)',
        }}
      >
        {/* Card 1: Total Customers */}
        <div
          style={{
            backgroundColor: 'var(--ds-color-surface-container-lowest)',
            borderRadius: 'var(--ds-radius-xl)',
            border: '1px solid var(--ds-color-outline-variant)',
            borderLeft: '4px solid #7c3aed',
            padding: 'var(--ds-space-5)',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--ds-space-3)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--ds-color-on-surface-variant)',
              }}
            >
              Total Profiles
            </span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--ds-radius-lg)',
                backgroundColor: 'rgba(124, 58, 237, 0.1)',
                color: '#7c3aed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Users size={18} />
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: '2rem',
                fontWeight: 800,
                color: 'var(--ds-color-on-surface)',
                fontFamily: 'Inter, sans-serif',
                letterSpacing: '-0.02em',
                lineHeight: 1,
              }}
            >
              {totalCount}
            </div>
            <p
              style={{
                margin: '6px 0 0 0',
                fontSize: '0.8125rem',
                color: 'var(--ds-color-on-surface-variant)',
              }}
            >
              Registered client profiles on file
            </p>
          </div>
        </div>

        {/* Card 2: Customers with Unpaid Debt */}
        <div
          style={{
            backgroundColor: 'var(--ds-color-surface-container-lowest)',
            borderRadius: 'var(--ds-radius-xl)',
            border: '1px solid var(--ds-color-outline-variant)',
            borderLeft: '4px solid #f59e0b',
            padding: 'var(--ds-space-5)',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--ds-space-3)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--ds-color-on-surface-variant)',
              }}
            >
              Unpaid Balances
            </span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--ds-radius-lg)',
                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                color: '#b45309',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Clock size={18} />
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: '2rem',
                fontWeight: 800,
                color: customersWithDebt > 0 ? '#b45309' : 'var(--ds-color-on-surface)',
                fontFamily: 'Inter, sans-serif',
                letterSpacing: '-0.02em',
                lineHeight: 1,
              }}
            >
              {customersWithDebt}
            </div>
            <p
              style={{
                margin: '6px 0 0 0',
                fontSize: '0.8125rem',
                color: 'var(--ds-color-on-surface-variant)',
              }}
            >
              {customersWithDebt === 1 ? '1 client with overdue amount' : `${customersWithDebt} clients with overdue credit`}
            </p>
          </div>
        </div>

        {/* Card 3: Total Outstanding Debt */}
        <div
          style={{
            backgroundColor: 'var(--ds-color-surface-container-lowest)',
            borderRadius: 'var(--ds-radius-xl)',
            border: '1px solid var(--ds-color-outline-variant)',
            borderLeft: totalOutstanding > 0 ? '4px solid #ef4444' : '4px solid #10b981',
            padding: 'var(--ds-space-5)',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--ds-space-3)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--ds-color-on-surface-variant)',
              }}
            >
              Total Uncollected Credit
            </span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--ds-radius-lg)',
                backgroundColor: totalOutstanding > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                color: totalOutstanding > 0 ? '#b91c1c' : '#047857',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <DollarSign size={18} />
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: '2rem',
                fontWeight: 800,
                color: totalOutstanding > 0 ? '#b91c1c' : '#047857',
                fontFamily: 'Inter, sans-serif',
                letterSpacing: '-0.02em',
                lineHeight: 1,
              }}
            >
              {formatMoney(totalOutstanding)}
            </div>
            <p
              style={{
                margin: '6px 0 0 0',
                fontSize: '0.8125rem',
                color: 'var(--ds-color-on-surface-variant)',
              }}
            >
              {totalOutstanding > 0 ? 'Outstanding invoice receivables' : 'All accounts fully settled'}
            </p>
          </div>
        </div>
      </section>

      {/* Main Interactive Directory Section */}
      <section
        aria-labelledby="customer-directory-heading"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--ds-space-4)',
          width: '100%',
          backgroundColor: 'var(--ds-color-surface-container-lowest)',
          borderRadius: 'var(--ds-radius-xl)',
          border: '1px solid var(--ds-color-outline-variant)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          padding: 'var(--ds-space-5)',
        }}
      >
        {/* Section Header with CTAs */}
        <div
          className="customer-section-header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 'var(--ds-space-3)',
            paddingBottom: 'var(--ds-space-3)',
            borderBottom: '1px solid var(--ds-color-outline-variant)',
          }}
        >
          <div>
            <h2
              id="customer-directory-heading"
              style={{
                margin: 0,
                fontSize: '1.25rem',
                fontWeight: 800,
                color: 'var(--ds-color-on-surface)',
                fontFamily: 'Inter, sans-serif',
                letterSpacing: '-0.01em',
              }}
            >
              Customer Directory
            </h2>
            <p
              style={{
                margin: '2px 0 0 0',
                fontSize: '0.8125rem',
                color: 'var(--ds-color-on-surface-variant)',
              }}
            >
              Showing {customers.length} of {totalCount} total customer accounts
            </p>
          </div>

          <div className="customer-header-actions" style={{ display: 'flex', gap: 'var(--ds-space-2)', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="customer-action-btn customer-export-btn"
              onClick={handleExportCsv}
              title="Download customer directory CSV"
              style={{
                padding: 'var(--ds-space-2) var(--ds-space-3)',
                backgroundColor: 'var(--ds-color-surface-container-lowest)',
                color: 'var(--ds-color-on-surface)',
                border: '1px solid var(--ds-color-outline-variant)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.8125rem',
                borderRadius: 'var(--ds-radius-md)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <FileSpreadsheet size={15} color="var(--ds-color-primary)" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              className="customer-action-btn customer-import-btn"
              onClick={() => setIsImportOpen(true)}
              style={{
                padding: 'var(--ds-space-2) var(--ds-space-3)',
                backgroundColor: 'var(--ds-color-surface-container-lowest)',
                color: 'var(--ds-color-on-surface)',
                border: '1px solid var(--ds-color-outline-variant)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.8125rem',
                borderRadius: 'var(--ds-radius-md)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <UploadCloud size={15} color="var(--ds-color-on-surface-variant)" />
              <span>Import CSV</span>
            </button>

            <button
              type="button"
              className="customer-action-btn customer-add-btn"
              onClick={() => setIsAddOpen(true)}
              style={{
                padding: 'var(--ds-space-2) var(--ds-space-4)',
                backgroundColor: 'var(--ds-color-primary)',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.8125rem',
                borderRadius: 'var(--ds-radius-md)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 2px 4px rgba(15, 118, 110, 0.2)',
                transition: 'all 0.15s ease',
              }}
            >
              <UserPlus size={15} />
              <span>Add Customer</span>
            </button>
          </div>
        </div>

        {/* Search Bar (Auto-filters / submits on Enter, no separate search button) */}
        <form onSubmit={handleSearch} style={{ display: 'flex', width: '100%' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <label htmlFor="customer-search-input" className="sr-only" style={{ display: 'none' }}>
              Search customers by name or contact
            </label>
            <span
              style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--ds-color-on-surface-variant)',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Search size={16} />
            </span>
            <input
              id="customer-search-input"
              type="text"
              placeholder="Search customers by name, phone number, or email (press Enter)..."
              value={search}
              onChange={(e) => {
                const val = e.target.value
                setSearch(val)
                if (val === '') {
                  fetchPage(1, '')
                }
              }}
              style={{
                width: '100%',
                padding: '10px 14px 10px 40px',
                fontSize: '0.875rem',
                borderRadius: 'var(--ds-radius-lg)',
                border: '1px solid var(--ds-color-outline-variant)',
                backgroundColor: 'var(--ds-color-surface-container-low)',
                color: 'var(--ds-color-on-surface)',
                outline: 'none',
                transition: 'border-color 0.15s ease',
                fontFamily: 'Inter, sans-serif',
              }}
            />
            {search && (
              <button
                type="button"
                onClick={async () => {
                  setSearch('')
                  await fetchPage(1, '')
                }}
                aria-label="Clear search query"
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--ds-color-on-surface-variant)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '2px',
                }}
              >
                <X size={15} />
              </button>
            )}
          </div>
        </form>

        {/* Customer Directory Table */}
        {customers.length === 0 ? (
          <div
            style={{
              padding: 'var(--ds-space-10) var(--ds-space-6)',
              textAlign: 'center',
              backgroundColor: 'var(--ds-color-surface-container-low)',
              borderRadius: 'var(--ds-radius-lg)',
              border: '1px dashed var(--ds-color-outline-variant)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'var(--ds-space-3)',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: 'var(--ds-radius-full)',
                backgroundColor: 'rgba(15, 118, 110, 0.1)',
                color: 'var(--ds-color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Users size={28} />
            </div>
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: '1.125rem',
                  fontWeight: 800,
                  color: 'var(--ds-color-on-surface)',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                No customers found
              </h3>
              <p
                style={{
                  margin: '4px 0 0 0',
                  fontSize: '0.875rem',
                  color: 'var(--ds-color-on-surface-variant)',
                  maxWidth: '420px',
                }}
              >
                {search
                  ? 'No customer records match your search criteria. Try a different query or clear the filter.'
                  : 'Start tracking ongoing client profiles, phone numbers, purchase histories, and credit accounts.'}
              </p>
            </div>
            {!search && (
              <div style={{ display: 'flex', gap: 'var(--ds-space-3)', marginTop: 'var(--ds-space-2)' }}>
                <button
                  type="button"
                  onClick={() => setIsAddOpen(true)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: 'var(--ds-color-primary)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 'var(--ds-radius-md)',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <UserPlus size={16} />
                  <span>Add First Customer</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsImportOpen(true)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: 'transparent',
                    color: 'var(--ds-color-on-surface)',
                    border: '1px solid var(--ds-color-outline-variant)',
                    borderRadius: 'var(--ds-radius-md)',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <UploadCloud size={16} />
                  <span>Import CSV List</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <div
              className="desktop-table-container"
              style={{
                overflowX: 'auto',
                borderRadius: 'var(--ds-radius-lg)',
                border: '1px solid var(--ds-color-outline-variant)',
              }}
            >
              <table
                aria-label="Customer list"
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  textAlign: 'left',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                <thead>
                  <tr
                    style={{
                      backgroundColor: 'var(--ds-color-surface-container-low)',
                      borderBottom: '1px solid var(--ds-color-outline-variant)',
                    }}
                  >
                    <th
                      scope="col"
                      style={{
                        padding: '12px 16px',
                        fontSize: '0.6875rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        color: 'var(--ds-color-on-surface-variant)',
                      }}
                    >
                      Customer Profile
                    </th>
                    <th
                      scope="col"
                      style={{
                        padding: '12px 16px',
                        fontSize: '0.6875rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        color: 'var(--ds-color-on-surface-variant)',
                      }}
                    >
                      Contact Info
                    </th>
                    <th
                      scope="col"
                      style={{
                        padding: '12px 16px',
                        fontSize: '0.6875rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        color: 'var(--ds-color-on-surface-variant)',
                      }}
                    >
                      Branch
                    </th>
                    <th
                      scope="col"
                      style={{
                        padding: '12px 16px',
                        fontSize: '0.6875rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        color: 'var(--ds-color-on-surface-variant)',
                      }}
                    >
                      Invoices
                    </th>
                    <th
                      scope="col"
                      style={{
                        padding: '12px 16px',
                        fontSize: '0.6875rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        color: 'var(--ds-color-on-surface-variant)',
                      }}
                    >
                      Total Spent
                    </th>
                    <th
                      scope="col"
                      style={{
                        padding: '12px 16px',
                        fontSize: '0.6875rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        color: 'var(--ds-color-on-surface-variant)',
                      }}
                    >
                      Account Balance
                    </th>
                    {!isStaff && (
                      <th
                        scope="col"
                        style={{
                          padding: '12px 16px',
                          fontSize: '0.6875rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          color: 'var(--ds-color-on-surface-variant)',
                          textAlign: 'right',
                        }}
                      >
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => {
                    const avatarColor = getAvatarColor(c.name)
                    const initials = getInitials(c.name)
                    const owesMoney = c.outstandingBalance > 0

                    return (
                      <tr
                        key={c.id}
                        style={{
                          borderBottom: '1px solid var(--ds-color-outline-variant)',
                          transition: 'background-color 0.12s ease',
                        }}
                      >
                        {/* Customer Name with Avatar */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div
                              style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: 'var(--ds-radius-full)',
                                backgroundColor: avatarColor.bg,
                                color: avatarColor.text,
                                fontWeight: 800,
                                fontSize: '0.8125rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              {initials}
                            </div>
                            <div>
                              <span
                                style={{
                                  display: 'block',
                                  fontWeight: 700,
                                  fontSize: '0.9375rem',
                                  color: 'var(--ds-color-on-surface)',
                                  letterSpacing: '-0.01em',
                                }}
                              >
                                {c.name}
                              </span>
                              <span
                                style={{
                                  display: 'block',
                                  fontSize: '0.75rem',
                                  color: 'var(--ds-color-on-surface-variant)',
                                }}
                              >
                                ID: {c.id.slice(0, 8)}...
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Contact Info */}
                        <td style={{ padding: '14px 16px' }}>
                          {c.contact ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', color: 'var(--ds-color-on-surface)' }}>
                              {c.contact.includes('@') ? (
                                <Mail size={14} color="var(--ds-color-on-surface-variant)" />
                              ) : (
                                <Phone size={14} color="var(--ds-color-on-surface-variant)" />
                              )}
                              <span style={{ fontWeight: 500 }}>{c.contact}</span>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.8125rem', color: 'var(--ds-color-on-surface-variant)', fontStyle: 'italic' }}>
                              None registered
                            </span>
                          )}
                        </td>

                        {/* Branch Badge */}
                        <td style={{ padding: '14px 16px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              padding: '3px 8px',
                              borderRadius: 'var(--ds-radius-md)',
                              backgroundColor: 'var(--ds-color-surface-container-high)',
                              color: 'var(--ds-color-on-surface)',
                            }}
                          >
                            <Store size={12} color="var(--ds-color-on-surface-variant)" />
                            {c.branchName}
                          </span>
                        </td>

                        {/* Invoices Count */}
                        <td style={{ padding: '14px 16px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.8125rem',
                              fontWeight: 600,
                              color: 'var(--ds-color-on-surface)',
                            }}
                          >
                            <Receipt size={13} color="var(--ds-color-on-surface-variant)" />
                            {c.invoiceCount} {c.invoiceCount === 1 ? 'sale' : 'sales'}
                          </span>
                        </td>

                        {/* Total Spent */}
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--ds-color-on-surface)' }}>
                            {formatMoney(c.totalSpent)}
                          </span>
                        </td>

                        {/* Account Balance Badge */}
                        <td style={{ padding: '14px 16px' }}>
                          {owesMoney ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '4px 10px',
                                borderRadius: 'var(--ds-radius-full)',
                                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                                color: '#b91c1c',
                                fontWeight: 700,
                                fontSize: '0.8125rem',
                              }}
                            >
                              <AlertCircle size={14} />
                              <span>Owes {formatMoney(c.outstandingBalance)}</span>
                            </span>
                          ) : (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '4px 10px',
                                borderRadius: 'var(--ds-radius-full)',
                                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                                color: '#047857',
                                fontWeight: 700,
                                fontSize: '0.8125rem',
                              }}
                            >
                              <CheckCircle2 size={14} />
                              <span>Settled</span>
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        {!isStaff && (
                          <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditCustomer(c)
                                  setEditForm({ name: c.name, contact: c.contact || '' })
                                }}
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '0.8125rem',
                                  fontWeight: 600,
                                  backgroundColor: 'transparent',
                                  border: '1px solid var(--ds-color-outline-variant)',
                                  color: 'var(--ds-color-on-surface)',
                                  cursor: 'pointer',
                                  borderRadius: 'var(--ds-radius-md)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                <Edit3 size={14} />
                                <span>Edit</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteCustomer(c)}
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '0.8125rem',
                                  fontWeight: 600,
                                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                                  border: '1px solid rgba(239, 68, 68, 0.25)',
                                  color: '#dc2626',
                                  cursor: 'pointer',
                                  borderRadius: 'var(--ds-radius-md)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  transition: 'all 0.15s ease',
                                }}
                                aria-label={`Delete customer ${c.name}`}
                              >
                                <Trash2 size={14} />
                                <span>Delete</span>
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Customer Cards (Zero Horizontal Scroll on Mobile View) */}
            <div className="mobile-cards-container" style={{ display: 'none', flexDirection: 'column', gap: '12px' }}>
              {customers.map((c) => {
                const avatarColor = getAvatarColor(c.name)
                const initials = getInitials(c.name)
                const owesMoney = c.outstandingBalance > 0
                return (
                  <div
                    key={`mobile-${c.id}`}
                    style={{
                      backgroundColor: 'var(--ds-color-surface-container-lowest)',
                      border: '1px solid var(--ds-color-outline-variant)',
                      borderRadius: 'var(--ds-radius-lg)',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: 'var(--ds-radius-full)',
                            backgroundColor: avatarColor.bg,
                            color: avatarColor.text,
                            fontWeight: 800,
                            fontSize: '0.8125rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {initials}
                        </div>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: 'var(--ds-color-on-surface)' }}>
                            {c.name}
                          </h4>
                          <span style={{ fontSize: '0.75rem', color: 'var(--ds-color-on-surface-variant)' }}>
                            ID: {c.id.slice(0, 8)}...
                          </span>
                        </div>
                      </div>
                      {owesMoney ? (
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: 'var(--ds-radius-full)',
                            backgroundColor: 'rgba(239, 68, 68, 0.12)',
                            color: '#b91c1c',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                          }}
                        >
                          Owes {formatMoney(c.outstandingBalance)}
                        </span>
                      ) : (
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: 'var(--ds-radius-full)',
                            backgroundColor: 'rgba(16, 185, 129, 0.12)',
                            color: '#047857',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                          }}
                        >
                          Settled
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: 'var(--ds-color-on-surface)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--ds-color-on-surface-variant)' }}>
                        <Store size={12} /> {c.branchName}
                      </span>
                      {c.contact && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}>
                          {c.contact.includes('@') ? <Mail size={12} /> : <Phone size={12} />}
                          {c.contact}
                        </span>
                      )}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 10px',
                        borderRadius: 'var(--ds-radius-sm)',
                        background: 'var(--ds-color-surface-container-low)',
                        fontSize: '0.8125rem',
                      }}
                    >
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--ds-color-on-surface-variant)', display: 'block' }}>Total Spent</span>
                        <strong style={{ fontSize: '0.9375rem', color: 'var(--ds-color-on-surface)' }}>{formatMoney(c.totalSpent)}</strong>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--ds-color-on-surface-variant)', display: 'block' }}>Invoices</span>
                        <strong style={{ fontSize: '0.9375rem', color: 'var(--ds-color-on-surface)' }}>{c.invoiceCount} sales</strong>
                      </div>
                    </div>

                    {!isStaff && (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '2px', paddingTop: '8px', borderTop: '1px solid var(--ds-color-outline-variant)' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setEditCustomer(c)
                            setEditForm({ name: c.name, contact: c.contact || '' })
                          }}
                          style={{
                            flex: 1,
                            padding: '8px',
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            backgroundColor: 'transparent',
                            border: '1px solid var(--ds-color-outline-variant)',
                            borderRadius: 'var(--ds-radius-md)',
                            color: 'var(--ds-color-on-surface)',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                          }}
                        >
                          <Edit3 size={13} /> Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteCustomer(c)}
                          style={{
                            flex: 1,
                            padding: '8px',
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            backgroundColor: 'rgba(239, 68, 68, 0.08)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            borderRadius: 'var(--ds-radius-md)',
                            color: '#dc2626',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                          }}
                          aria-label={`Delete customer ${c.name}`}
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <nav
            aria-label="Customer pagination"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: 'var(--ds-space-3)',
              borderTop: '1px solid var(--ds-color-outline-variant)',
              flexWrap: 'wrap',
              gap: 'var(--ds-space-3)',
            }}
          >
            <span style={{ fontSize: '0.8125rem', color: 'var(--ds-color-on-surface-variant)' }}>
              Page <strong>{page}</strong> of <strong>{totalPages}</strong> &middot; ({totalCount} total)
            </span>

            <div style={{ display: 'flex', gap: 'var(--ds-space-2)' }}>
              <button
                type="button"
                disabled={page <= 1 || isSearching}
                onClick={() => fetchPage(page - 1)}
                style={{
                  padding: '6px 14px',
                  backgroundColor: 'var(--ds-color-surface-container-low)',
                  border: '1px solid var(--ds-color-outline-variant)',
                  borderRadius: 'var(--ds-radius-md)',
                  cursor: page <= 1 ? 'not-allowed' : 'pointer',
                  opacity: page <= 1 ? 0.45 : 1,
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: 'var(--ds-color-on-surface)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <ChevronLeft size={16} />
                <span>Previous</span>
              </button>
              <button
                type="button"
                disabled={page >= totalPages || isSearching}
                onClick={() => fetchPage(page + 1)}
                style={{
                  padding: '6px 14px',
                  backgroundColor: 'var(--ds-color-surface-container-low)',
                  border: '1px solid var(--ds-color-outline-variant)',
                  borderRadius: 'var(--ds-radius-md)',
                  cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                  opacity: page >= totalPages ? 0.45 : 1,
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: 'var(--ds-color-on-surface)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>Next</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </nav>
        )}
      </section>

      {/* MODAL: Add Customer (Accessible to Owner, Manager, Staff) */}
      {isAddOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-customer-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 'var(--ds-space-4)',
          }}
        >
          <div
            style={{
              maxWidth: '500px',
              width: '100%',
              backgroundColor: 'var(--ds-color-surface-container-lowest)',
              borderRadius: 'var(--ds-radius-2xl)',
              border: '1px solid var(--ds-color-outline-variant)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              padding: 'var(--ds-space-6)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--ds-space-4)',
              animation: 'fadeIn 0.15s ease-out',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2
                  id="add-customer-modal-title"
                  style={{
                    margin: 0,
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color: 'var(--ds-color-on-surface)',
                    fontFamily: 'Inter, sans-serif',
                    letterSpacing: '-0.01em',
                  }}
                >
                  Add New Customer
                </h2>
                <p
                  style={{
                    margin: '4px 0 0 0',
                    fontSize: '0.8125rem',
                    color: 'var(--ds-color-on-surface-variant)',
                  }}
                >
                  Create a customer profile to track ongoing transactions and balances.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                aria-label="Close modal"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--ds-color-on-surface-variant)',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: 'var(--ds-radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {errorMsg && (
              <div
                role="alert"
                style={{
                  padding: '10px 14px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 'var(--ds-radius-md)',
                  color: '#991b1b',
                  fontSize: '0.8125rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <form
              onSubmit={handleAddCustomer}
              style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-4)' }}
            >
              {branches.length > 1 && (
                <div>
                  <label
                    htmlFor="customer-branch-select"
                    style={{
                      display: 'block',
                      fontSize: '0.8125rem',
                      fontWeight: 700,
                      color: 'var(--ds-color-on-surface)',
                      marginBottom: '6px',
                    }}
                  >
                    Branch Location *
                  </label>
                  <select
                    id="customer-branch-select"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 'var(--ds-radius-md)',
                      border: '1px solid var(--ds-color-outline-variant)',
                      backgroundColor: 'var(--ds-color-surface-container-low)',
                      color: 'var(--ds-color-on-surface)',
                      fontSize: '0.875rem',
                      outline: 'none',
                    }}
                    value={addForm.branchId}
                    onChange={(e) => setAddForm({ ...addForm, branchId: e.target.value })}
                    required
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label
                  htmlFor="customer-name-input"
                  style={{
                    display: 'block',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    color: 'var(--ds-color-on-surface)',
                    marginBottom: '6px',
                  }}
                >
                  Customer or Company Name *
                </label>
                <input
                  id="customer-name-input"
                  type="text"
                  required
                  placeholder="e.g. Aliko Dangote or ABC Enterprises"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 'var(--ds-radius-md)',
                    border: '1px solid var(--ds-color-outline-variant)',
                    backgroundColor: 'var(--ds-color-surface-container-low)',
                    color: 'var(--ds-color-on-surface)',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                />
              </div>

              <div>
                <label
                  htmlFor="customer-contact-input"
                  style={{
                    display: 'block',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    color: 'var(--ds-color-on-surface)',
                    marginBottom: '6px',
                  }}
                >
                  Contact Information (Optional)
                </label>
                <input
                  id="customer-contact-input"
                  type="text"
                  placeholder="e.g. +234 801 234 5678 or client@example.com"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 'var(--ds-radius-md)',
                    border: '1px solid var(--ds-color-outline-variant)',
                    backgroundColor: 'var(--ds-color-surface-container-low)',
                    color: 'var(--ds-color-on-surface)',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                  value={addForm.contact}
                  onChange={(e) => setAddForm({ ...addForm, contact: e.target.value })}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 'var(--ds-space-3)',
                  marginTop: 'var(--ds-space-2)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  style={{
                    backgroundColor: 'transparent',
                    border: '1px solid var(--ds-color-outline-variant)',
                    borderRadius: 'var(--ds-radius-md)',
                    cursor: 'pointer',
                    padding: '8px 16px',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: 'var(--ds-color-on-surface)',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    backgroundColor: 'var(--ds-color-primary)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 'var(--ds-radius-md)',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    padding: '8px 18px',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    boxShadow: '0 2px 4px rgba(15, 118, 110, 0.2)',
                  }}
                >
                  {isLoading ? 'Creating...' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Customer (Owner & Manager only) */}
      {editCustomer && !isStaff && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-customer-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 'var(--ds-space-4)',
          }}
        >
          <div
            style={{
              maxWidth: '500px',
              width: '100%',
              backgroundColor: 'var(--ds-color-surface-container-lowest)',
              borderRadius: 'var(--ds-radius-2xl)',
              border: '1px solid var(--ds-color-outline-variant)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              padding: 'var(--ds-space-6)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--ds-space-4)',
              animation: 'fadeIn 0.15s ease-out',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2
                  id="edit-customer-modal-title"
                  style={{
                    margin: 0,
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color: 'var(--ds-color-on-surface)',
                    fontFamily: 'Inter, sans-serif',
                    letterSpacing: '-0.01em',
                  }}
                >
                  Edit Customer Profile
                </h2>
                <p
                  style={{
                    margin: '4px 0 0 0',
                    fontSize: '0.8125rem',
                    color: 'var(--ds-color-on-surface-variant)',
                  }}
                >
                  Updating details for <strong>{editCustomer.name}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditCustomer(null)}
                aria-label="Close modal"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--ds-color-on-surface-variant)',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: 'var(--ds-radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {errorMsg && (
              <div
                role="alert"
                style={{
                  padding: '10px 14px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 'var(--ds-radius-md)',
                  color: '#991b1b',
                  fontSize: '0.8125rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <form
              onSubmit={handleEditCustomer}
              style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-4)' }}
            >
              <div>
                <label
                  htmlFor="edit-customer-name"
                  style={{
                    display: 'block',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    color: 'var(--ds-color-on-surface)',
                    marginBottom: '6px',
                  }}
                >
                  Customer Name *
                </label>
                <input
                  id="edit-customer-name"
                  type="text"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 'var(--ds-radius-md)',
                    border: '1px solid var(--ds-color-outline-variant)',
                    backgroundColor: 'var(--ds-color-surface-container-low)',
                    color: 'var(--ds-color-on-surface)',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>

              <div>
                <label
                  htmlFor="edit-customer-contact"
                  style={{
                    display: 'block',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    color: 'var(--ds-color-on-surface)',
                    marginBottom: '6px',
                  }}
                >
                  Contact Information
                </label>
                <input
                  id="edit-customer-contact"
                  type="text"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 'var(--ds-radius-md)',
                    border: '1px solid var(--ds-color-outline-variant)',
                    backgroundColor: 'var(--ds-color-surface-container-low)',
                    color: 'var(--ds-color-on-surface)',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                  value={editForm.contact}
                  onChange={(e) => setEditForm({ ...editForm, contact: e.target.value })}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 'var(--ds-space-3)',
                  marginTop: 'var(--ds-space-2)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setEditCustomer(null)}
                  style={{
                    backgroundColor: 'transparent',
                    border: '1px solid var(--ds-color-outline-variant)',
                    borderRadius: 'var(--ds-radius-md)',
                    cursor: 'pointer',
                    padding: '8px 16px',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: 'var(--ds-color-on-surface)',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    backgroundColor: 'var(--ds-color-primary)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 'var(--ds-radius-md)',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    padding: '8px 18px',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    boxShadow: '0 2px 4px rgba(15, 118, 110, 0.2)',
                  }}
                >
                  {isLoading ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Import CSV */}
      {isImportOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="import-csv-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 'var(--ds-space-4)',
          }}
        >
          <div
            style={{
              maxWidth: '540px',
              width: '100%',
              backgroundColor: 'var(--ds-color-surface-container-lowest)',
              borderRadius: 'var(--ds-radius-2xl)',
              border: '1px solid var(--ds-color-outline-variant)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              padding: 'var(--ds-space-6)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--ds-space-4)',
              animation: 'fadeIn 0.15s ease-out',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2
                  id="import-csv-modal-title"
                  style={{
                    margin: 0,
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color: 'var(--ds-color-on-surface)',
                    fontFamily: 'Inter, sans-serif',
                    letterSpacing: '-0.01em',
                  }}
                >
                  Import Customers from CSV
                </h2>
                <p
                  style={{
                    margin: '4px 0 0 0',
                    fontSize: '0.8125rem',
                    color: 'var(--ds-color-on-surface-variant)',
                  }}
                >
                  Upload a comma-separated (.csv) file with columns: <code>name</code> and <code>contact</code>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsImportOpen(false)
                  setCsvFile(null)
                  setCsvPreview([])
                  setImportReport(null)
                }}
                aria-label="Close modal"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--ds-color-on-surface-variant)',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: 'var(--ds-radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {errorMsg && (
              <div
                role="alert"
                style={{
                  padding: '10px 14px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 'var(--ds-radius-md)',
                  color: '#991b1b',
                  fontSize: '0.8125rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {importReport && (
              <div
                style={{
                  padding: 'var(--ds-space-3) var(--ds-space-4)',
                  backgroundColor: importReport.errors.length ? '#fffbeb' : '#ecfdf5',
                  border: `1px solid ${importReport.errors.length ? '#fde68a' : '#a7f3d0'}`,
                  borderRadius: 'var(--ds-radius-md)',
                  fontSize: '0.8125rem',
                }}
              >
                <p style={{ margin: 0, fontWeight: 700, color: importReport.errors.length ? '#92400e' : '#065f46' }}>
                  Result: {importReport.importedCount} customers imported successfully.
                </p>
                {importReport.errors.length > 0 && (
                  <ul style={{ margin: '6px 0 0 16px', color: '#b91c1c' }}>
                    {importReport.errors.slice(0, 5).map((e, idx) => (
                      <li key={idx}>{e}</li>
                    ))}
                    {importReport.errors.length > 5 && (
                      <li>...and {importReport.errors.length - 5} more errors</li>
                    )}
                  </ul>
                )}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-3)' }}>
              <label
                htmlFor="csv-file-upload"
                style={{
                  border: '2px dashed var(--ds-color-outline-variant)',
                  borderRadius: 'var(--ds-radius-xl)',
                  padding: 'var(--ds-space-6)',
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: 'var(--ds-color-surface-container-low)',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 'var(--ds-space-2)',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: 'var(--ds-radius-full)',
                    backgroundColor: 'rgba(15, 118, 110, 0.1)',
                    color: 'var(--ds-color-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <FileSpreadsheet size={24} />
                </div>
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: '0.9375rem',
                    color: 'var(--ds-color-on-surface)',
                  }}
                >
                  {csvFile ? csvFile.name : 'Choose or drop customer CSV file'}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--ds-color-on-surface-variant)' }}>
                  Accepted format: .csv with header row (name, contact)
                </span>
                <input
                  id="csv-file-upload"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleCsvFileSelect(f)
                  }}
                  style={{ display: 'none' }}
                />
              </label>

              {csvPreview.length > 0 && (
                <div>
                  <h3
                    style={{
                      fontSize: '0.8125rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: 'var(--ds-color-on-surface-variant)',
                      margin: '0 0 var(--ds-space-2) 0',
                    }}
                  >
                    Preview ({csvPreview.length} records ready):
                  </h3>
                  <div
                    style={{
                      maxHeight: '160px',
                      overflowY: 'auto',
                      border: '1px solid var(--ds-color-outline-variant)',
                      borderRadius: 'var(--ds-radius-md)',
                      padding: 'var(--ds-space-2)',
                      fontSize: '0.8125rem',
                      backgroundColor: 'var(--ds-color-surface-container-low)',
                    }}
                  >
                    {csvPreview.slice(0, 8).map((r, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '6px 8px',
                          borderBottom: i < 7 ? '1px solid var(--ds-color-outline-variant)' : 'none',
                        }}
                      >
                        <span style={{ fontWeight: 600, color: 'var(--ds-color-on-surface)' }}>{r.name}</span>
                        <span style={{ color: 'var(--ds-color-on-surface-variant)' }}>
                          {r.contact || 'No contact'}
                        </span>
                      </div>
                    ))}
                    {csvPreview.length > 8 && (
                      <div
                        style={{
                          color: 'var(--ds-color-primary)',
                          fontStyle: 'italic',
                          padding: '4px 8px',
                          fontSize: '0.75rem',
                        }}
                      >
                        + {csvPreview.length - 8} more records...
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 'var(--ds-space-3)',
                  marginTop: 'var(--ds-space-3)',
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsImportOpen(false)
                    setCsvFile(null)
                    setCsvPreview([])
                    setImportReport(null)
                  }}
                  style={{
                    backgroundColor: 'transparent',
                    border: '1px solid var(--ds-color-outline-variant)',
                    borderRadius: 'var(--ds-radius-md)',
                    cursor: 'pointer',
                    padding: '8px 16px',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: 'var(--ds-color-on-surface)',
                  }}
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={!csvPreview.length || isLoading}
                  onClick={handleCsvImportSubmit}
                  style={{
                    backgroundColor: 'var(--ds-color-primary)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 'var(--ds-radius-md)',
                    cursor: csvPreview.length && !isLoading ? 'pointer' : 'not-allowed',
                    padding: '8px 18px',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    opacity: csvPreview.length && !isLoading ? 1 : 0.6,
                    boxShadow: '0 2px 4px rgba(15, 118, 110, 0.2)',
                  }}
                >
                  {isLoading ? 'Importing...' : `Import ${csvPreview.length} Customers`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
