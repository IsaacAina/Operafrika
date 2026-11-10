'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Building2,
  Users,
  Store,
  ShieldCheck,
  Search,
  DollarSign,
  CheckCircle2,
  Clock,
  X,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Mail,
  Calendar,
  Layers,
  Activity,
  MapPin,
  ExternalLink,
  MessageSquare,
} from 'lucide-react'
import AdminSupportInbox, { type AdminSupportTicket } from './admin-support-inbox'

export interface BranchInfo {
  id: string
  name: string
  address: string | null
}

export interface BusinessSummary {
  id: string
  name: string
  businessType: string
  currency: string
  createdAt: string
  ownerEmail: string
  ownerId: string
  onboardingCompleted: boolean
  branchesCount: number
  usersCount: number
  planName: string
  subscriptionPrice: number
  renewalDate: string | null
  checkinCount: number
  branches: BranchInfo[]
}

interface AdminViewProps {
  businesses: BusinessSummary[]
  businessCount: number
  userCount: number
  branchCount: number
  totalBusinessesCount: number
  currentPage: number
  totalPages: number
  pageSize: number
  userEmail: string
  canAccessFounder: boolean
  initialSupportMessages?: AdminSupportTicket[]
  pendingSupportCount?: number
  totalSupportCount?: number
}

const SUPPORTED_CURRENCIES = [
  { code: 'NGN', label: 'NGN - Nigerian Naira (Default)' },
  { code: 'USD', label: 'USD - United States Dollar' },
  { code: 'GHS', label: 'GHS - Ghanaian Cedi' },
  { code: 'KES', label: 'KES - Kenyan Shilling' },
  { code: 'ZAR', label: 'ZAR - South African Rand' },
  { code: 'EUR', label: 'EUR - Euro' },
  { code: 'GBP', label: 'GBP - British Pound' },
]

export default function AdminView({
  businesses,
  businessCount,
  userCount,
  branchCount,
  totalBusinessesCount,
  currentPage,
  totalPages,
  pageSize,
  userEmail,
  canAccessFounder,
  initialSupportMessages = [],
  pendingSupportCount = 0,
  totalSupportCount = 0,
}: AdminViewProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'businesses' | 'support'>('businesses')
  const [supportTickets, setSupportTickets] = useState<AdminSupportTicket[]>(initialSupportMessages)
  const [updatingTicketId, setUpdatingTicketId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currencyFilter, setCurrencyFilter] = useState('ALL')
  const [activeMemberModal, setActiveMemberModal] = useState<BusinessSummary | null>(null)
  const [currencyModalBusiness, setCurrencyModalBusiness] = useState<BusinessSummary | null>(null)
  const [targetCurrency, setTargetCurrency] = useState('NGN')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const handleToggleResolved = async (ticketId: string, currentResolved: boolean) => {
    setUpdatingTicketId(ticketId)
    try {
      const res = await fetch(`/api/platform/support/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolved: !currentResolved }),
      })
      if (res.ok) {
        setSupportTickets((prev) =>
          prev.map((t) => (t.id === ticketId ? { ...t, resolved: !currentResolved } : t))
        )
      }
    } catch {
      // Ignore network error
    } finally {
      setUpdatingTicketId(null)
    }
  }

  const handleOpenCurrencyCorrectionFromSupport = (
    businessId: string,
    currentCurrency: string,
    businessName: string
  ) => {
    const found = businesses.find((b) => b.id === businessId)
    if (found) {
      setCurrencyModalBusiness(found)
      setTargetCurrency(found.currency)
    } else {
      setCurrencyModalBusiness({
        id: businessId,
        name: businessName,
        currency: currentCurrency,
        businessType: 'SME',
        createdAt: new Date().toISOString(),
        ownerEmail: '',
        ownerId: '',
        onboardingCompleted: true,
        branchesCount: 1,
        usersCount: 1,
        planName: 'Free',
        subscriptionPrice: 0,
        renewalDate: null,
        checkinCount: 1,
        branches: [],
      })
      setTargetCurrency(currentCurrency)
    }
    setActionMessage(null)
  }

  // Client-side quick filter for current page
  const filteredBusinesses = businesses.filter((b) => {
    if (currencyFilter !== 'ALL' && b.currency !== currencyFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      const matchName = b.name.toLowerCase().includes(q)
      const matchEmail = b.ownerEmail.toLowerCase().includes(q)
      const matchType = b.businessType.toLowerCase().includes(q)
      if (!matchName && !matchEmail && !matchType) return false
    }
    return true
  })

  const goToPage = (page: number) => {
    const url = new URL(window.location.href)
    url.searchParams.set('page', String(page))
    router.push(url.pathname + url.search)
  }

  const openCurrencyModal = (e: React.MouseEvent, business: BusinessSummary) => {
    e.stopPropagation()
    setCurrencyModalBusiness(business)
    setTargetCurrency(business.currency)
    setActionMessage(null)
  }

  const handleCurrencySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currencyModalBusiness) return

    setIsSubmitting(true)
    setActionMessage(null)

    try {
      const res = await fetch('/api/platform/business/currency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: currencyModalBusiness.id,
          currency: targetCurrency,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setActionMessage({ text: data.error || 'Failed to correct currency', type: 'error' })
        return
      }

      setActionMessage({ text: data.message, type: 'success' })
      setTimeout(() => {
        setCurrencyModalBusiness(null)
        if (activeMemberModal?.id === currencyModalBusiness.id) {
          setActiveMemberModal({ ...activeMemberModal, currency: targetCurrency })
        }
        router.refresh()
      }, 1200)
    } catch {
      setActionMessage({ text: 'Network error correcting currency', type: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-6)', width: '100%' }}>
      {/* Navigation Switcher between Admin and Founder */}
      {canAccessFounder && (
        <div className="platform-switcher-banner">
          <div className="platform-switcher-text-container">
            <div className="platform-switcher-title-row">
              <TrendingUp size={16} color="var(--ds-color-primary)" />
              <span className="platform-switcher-title">
                Founder View Available
              </span>
            </div>
            <span className="platform-switcher-desc">
              View signup velocity and onboarding drop-off funnel.
            </span>
          </div>
          <Link href="/founder" className="platform-switcher-btn">
            <span>Switch to Founder Dashboard</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* KPI Overview Grid */}
      <section
        className="responsive-kpi-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 'var(--ds-space-4)',
        }}
      >
        <div
          style={{
            backgroundColor: 'var(--ds-color-surface-container-lowest)',
            padding: 'var(--ds-space-5)',
            borderRadius: 'var(--ds-radius-xl)',
            border: '1px solid var(--ds-color-outline-variant)',
            borderLeft: '4px solid var(--ds-color-primary)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--ds-space-2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--ds-color-on-surface-variant)', letterSpacing: '0.05em' }}>
              Businesses
            </span>
            <Building2 size={18} color="var(--ds-color-primary)" />
          </div>
          <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--ds-color-on-surface)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            {businessCount}
          </span>
          <span style={{ fontSize: '0.8125rem', color: 'var(--ds-color-on-surface-variant)' }}>
            Active registered SME businesses
          </span>
        </div>

        <div
          style={{
            backgroundColor: 'var(--ds-color-surface-container-lowest)',
            padding: 'var(--ds-space-5)',
            borderRadius: 'var(--ds-radius-xl)',
            border: '1px solid var(--ds-color-outline-variant)',
            borderLeft: '4px solid #2563eb',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--ds-space-2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--ds-color-on-surface-variant)', letterSpacing: '0.05em' }}>
              SME Users
            </span>
            <Users size={18} color="#2563eb" />
          </div>
          <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--ds-color-on-surface)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            {userCount}
          </span>
          <span style={{ fontSize: '0.8125rem', color: 'var(--ds-color-on-surface-variant)' }}>
            Owners, managers, and staff accounts
          </span>
        </div>

        <div
          style={{
            backgroundColor: 'var(--ds-color-surface-container-lowest)',
            padding: 'var(--ds-space-5)',
            borderRadius: 'var(--ds-radius-xl)',
            border: '1px solid var(--ds-color-outline-variant)',
            borderLeft: '4px solid #7c3aed',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--ds-space-2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--ds-color-on-surface-variant)', letterSpacing: '0.05em' }}>
              Branch Network
            </span>
            <Store size={18} color="#7c3aed" />
          </div>
          <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--ds-color-on-surface)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            {branchCount}
          </span>
          <span style={{ fontSize: '0.8125rem', color: 'var(--ds-color-on-surface-variant)' }}>
            Physical stores & retail outlets
          </span>
        </div>

        <div
          style={{
            backgroundColor: 'var(--ds-color-surface-container-lowest)',
            padding: 'var(--ds-space-5)',
            borderRadius: 'var(--ds-radius-xl)',
            border: '1px solid var(--ds-color-outline-variant)',
            borderLeft: '4px solid #059669',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--ds-space-2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--ds-color-on-surface-variant)', letterSpacing: '0.05em' }}>
              Security Boundary
            </span>
            <ShieldCheck size={18} color="#059669" />
          </div>
          <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#059669', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            RLS Active
          </span>
          <span style={{ fontSize: '0.8125rem', color: 'var(--ds-color-on-surface-variant)' }}>
            PostgreSQL policies strictly enforced
          </span>
        </div>

        <div
          onClick={() => setActiveTab('support')}
          style={{
            backgroundColor: 'var(--ds-color-surface-container-lowest)',
            padding: 'var(--ds-space-5)',
            borderRadius: 'var(--ds-radius-xl)',
            border: '1px solid var(--ds-color-outline-variant)',
            borderLeft: '4px solid #d97706',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--ds-space-2)',
            cursor: 'pointer',
            transition: 'transform 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--ds-color-on-surface-variant)', letterSpacing: '0.05em' }}>
              Support Messages
            </span>
            <MessageSquare size={18} color="#d97706" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--ds-color-on-surface)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              {supportTickets.filter((t) => !t.resolved).length}
            </span>
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#d97706' }}>
              Pending
            </span>
          </div>
          <span style={{ fontSize: '0.8125rem', color: 'var(--ds-color-on-surface-variant)' }}>
            {supportTickets.length} total SME inquiries received
          </span>
        </div>
      </section>

      {/* Primary Section Tab Switcher */}
      <div className="platform-tab-switcher">
        <button
          type="button"
          onClick={() => setActiveTab('businesses')}
          className={`platform-tab-btn ${activeTab === 'businesses' ? 'active' : ''}`}
        >
          <Building2 size={16} />
          <span>SME Businesses ({totalBusinessesCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('support')}
          className={`platform-tab-btn support-btn ${activeTab === 'support' ? 'active' : ''}`}
        >
          <MessageSquare size={16} />
          <span>Support Inbox</span>
          {supportTickets.filter((t) => !t.resolved).length > 0 && (
            <span className="platform-tab-badge">
              {supportTickets.filter((t) => !t.resolved).length} pending
            </span>
          )}
        </button>
      </div>

      {/* Conditional Rendering: Support Messages Inbox */}
      {activeTab === 'support' && (
        <AdminSupportInbox
          tickets={supportTickets}
          onToggleResolved={handleToggleResolved}
          onOpenCurrencyCorrection={handleOpenCurrencyCorrectionFromSupport}
          updatingTicketId={updatingTicketId}
        />
      )}

      {/* Conditional Rendering: Registered Businesses Section */}
      {activeTab === 'businesses' && (
        <section
          style={{
            backgroundColor: 'var(--ds-color-surface-container-lowest)',
            borderRadius: 'var(--ds-radius-xl)',
            border: '1px solid var(--ds-color-outline-variant)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Section Header with Search & Filter */}
          <div
            style={{
              padding: 'var(--ds-space-5) var(--ds-space-6)',
              borderBottom: '1px solid var(--ds-color-outline-variant)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 'var(--ds-space-3)',
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800, color: 'var(--ds-color-on-surface)', letterSpacing: '-0.01em' }}>
                Registered Businesses &amp; Members
              </h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.8125rem', color: 'var(--ds-color-on-surface-variant)' }}>
                Click any member row to view full profile details and check-in history. (5 rows per page)
              </p>
            </div>

            <div className="admin-filter-toolbar">
              {/* Search Input */}
              <div className="admin-search-box">
                <Search
                  size={16}
                  color="var(--ds-color-on-surface-variant)"
                  className="admin-search-icon"
                />
                <input
                  type="text"
                  placeholder="Search name, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="admin-search-input"
                />
              </div>

              {/* Currency Filter Dropdown */}
              <select
                value={currencyFilter}
                onChange={(e) => setCurrencyFilter(e.target.value)}
                className="admin-currency-select"
              >
                <option value="ALL">All Currencies</option>
                <option value="NGN">NGN Only</option>
                <option value="USD">USD Only</option>
                <option value="GHS">GHS Only</option>
                <option value="KES">KES Only</option>
                <option value="ZAR">ZAR Only</option>
              </select>
            </div>
          </div>

          {/* Desktop View Table (Hidden on Mobile) */}
          <div className="desktop-table-container" style={{ width: '100%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--ds-color-surface-container-low)', borderBottom: '1px solid var(--ds-color-outline-variant)' }}>
                  <th style={{ padding: '12px 18px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--ds-color-on-surface-variant)' }}>
                    Business Name
                  </th>
                  <th style={{ padding: '12px 18px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--ds-color-on-surface-variant)' }}>
                    Registered Email
                  </th>
                  <th style={{ padding: '12px 18px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--ds-color-on-surface-variant)' }}>
                    Plan
                  </th>
                  <th style={{ padding: '12px 18px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--ds-color-on-surface-variant)' }}>
                    Branches
                  </th>
                  <th style={{ padding: '12px 18px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--ds-color-on-surface-variant)' }}>
                    Currency
                  </th>
                  <th style={{ padding: '12px 18px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--ds-color-on-surface-variant)' }}>
                    Onboarding
                  </th>
                  <th style={{ padding: '12px 18px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--ds-color-on-surface-variant)', textAlign: 'right' }}>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredBusinesses.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '40px 18px', textAlign: 'center', color: 'var(--ds-color-on-surface-variant)' }}>
                      No businesses matching the selected criteria.
                    </td>
                  </tr>
                ) : (
                  filteredBusinesses.map((b) => (
                    <tr
                      key={b.id}
                      onClick={() => setActiveMemberModal(b)}
                      style={{
                        borderBottom: '1px solid var(--ds-color-outline-variant)',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--ds-color-surface-container-low)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }}
                    >
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--ds-color-on-surface)' }}>
                            {b.name}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--ds-color-on-surface-variant)' }}>
                            {b.businessType}
                          </span>
                        </div>
                      </td>

                      {/* Owner Email with Truncation */}
                      <td style={{ padding: '14px 18px' }}>
                        <div
                          title={b.ownerEmail}
                          style={{
                            maxWidth: '180px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontSize: '0.8125rem',
                            color: 'var(--ds-color-on-surface)',
                            fontWeight: 500,
                          }}
                        >
                          {b.ownerEmail}
                        </div>
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ds-color-on-surface)' }}>
                          {b.planName}
                        </span>
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--ds-color-on-surface)' }}>
                          {b.branchesCount}
                        </span>
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: 'var(--ds-radius-full)',
                            backgroundColor: 'rgba(15, 118, 110, 0.1)',
                            color: 'var(--ds-color-primary)',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                          }}
                        >
                          {b.currency}
                        </span>
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        {b.onboardingCompleted ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 700, color: '#059669' }}>
                            <CheckCircle2 size={13} /> Completed
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 700, color: '#d97706' }}>
                            <Clock size={13} /> In Progress
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={(e) => openCurrencyModal(e, b)}
                          title="Correct locked currency"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 10px',
                            borderRadius: 'var(--ds-radius-md)',
                            border: '1px solid var(--ds-color-outline-variant)',
                            backgroundColor: 'var(--ds-color-surface-container-low)',
                            color: 'var(--ds-color-on-surface)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          <Edit2 size={12} />
                          <span>Currency</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Cards (Zero Horizontal Scroll on Mobile View) */}
          <div className="mobile-cards-container" style={{ display: 'none', flexDirection: 'column', gap: '10px', padding: '12px' }}>
            {filteredBusinesses.map((b) => (
              <div
                key={b.id}
                onClick={() => setActiveMemberModal(b)}
                style={{
                  backgroundColor: 'var(--ds-color-surface-container-lowest)',
                  borderRadius: 'var(--ds-radius-lg)',
                  border: '1px solid var(--ds-color-outline-variant)',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 800, color: 'var(--ds-color-on-surface)' }}>
                      {b.name}
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--ds-color-on-surface-variant)' }}>
                      {b.businessType}
                    </span>
                  </div>
                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: 'var(--ds-radius-full)',
                      backgroundColor: 'rgba(15, 118, 110, 0.1)',
                      color: 'var(--ds-color-primary)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >
                    {b.currency}
                  </span>
                </div>

                {/* Truncated Email */}
                <div
                  title={b.ownerEmail}
                  style={{
                    fontSize: '0.8125rem',
                    color: 'var(--ds-color-on-surface)',
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {b.ownerEmail}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', paddingTop: '4px', borderTop: '1px solid var(--ds-color-outline-variant)' }}>
                  <span style={{ color: 'var(--ds-color-on-surface-variant)' }}>
                    Branches: <strong>{b.branchesCount}</strong> &middot; Plan: <strong>{b.planName}</strong>
                  </span>
                  <span style={{ color: b.onboardingCompleted ? '#059669' : '#d97706', fontWeight: 700 }}>
                    {b.onboardingCompleted ? 'Completed' : 'In Progress'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Database Pagination Bar (5 rows per page) */}
          <div className="platform-pagination-container">
            <span className="platform-pagination-summary">
              Showing <strong>{totalBusinessesCount > 0 ? (currentPage - 1) * pageSize + 1 : 0}</strong> to{' '}
              <strong>{Math.min(currentPage * pageSize, totalBusinessesCount)}</strong> of{' '}
              <strong>{totalBusinessesCount}</strong> businesses
            </span>

            <div className="platform-pagination-controls">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => goToPage(currentPage - 1)}
                className="platform-pagination-btn"
                style={{
                  opacity: currentPage <= 1 ? 0.4 : 1,
                  cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                }}
              >
                <ChevronLeft size={14} /> Previous
              </button>

              <span className="platform-pagination-page-indicator">
                Page {currentPage} of {Math.max(1, totalPages)}
              </span>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => goToPage(currentPage + 1)}
                className="platform-pagination-btn"
                style={{
                  opacity: currentPage >= totalPages ? 0.4 : 1,
                  cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                }}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* POPUP MODAL: Member Details (Minimalistic & Actionable) */}
      {activeMemberModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="member-modal-title"
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
              maxWidth: '520px',
              width: '100%',
              backgroundColor: 'var(--ds-color-surface-container-lowest)',
              borderRadius: 'var(--ds-radius-2xl)',
              border: '1px solid var(--ds-color-outline-variant)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              padding: 'var(--ds-space-6)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--ds-space-4)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: 'var(--ds-radius-lg)',
                    backgroundColor: 'rgba(15, 118, 110, 0.1)',
                    color: 'var(--ds-color-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '1rem',
                  }}
                >
                  {activeMemberModal.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3
                    id="member-modal-title"
                    style={{
                      margin: 0,
                      fontSize: '1.125rem',
                      fontWeight: 800,
                      color: 'var(--ds-color-on-surface)',
                      lineHeight: 1.2,
                    }}
                  >
                    {activeMemberModal.name}
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--ds-color-on-surface-variant)' }}>
                    {activeMemberModal.businessType} &middot; ID: {activeMemberModal.id.slice(-8)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveMemberModal(null)}
                aria-label="Close dialog"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--ds-color-on-surface-variant)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Member Information Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                padding: '14px',
                backgroundColor: 'var(--ds-color-surface-container-low)',
                borderRadius: 'var(--ds-radius-lg)',
                border: '1px solid var(--ds-color-outline-variant)',
              }}
            >
              <div>
                <span style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--ds-color-on-surface-variant)' }}>
                  Registered Owner
                </span>
                <span
                  title={activeMemberModal.ownerEmail}
                  style={{
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    color: 'var(--ds-color-on-surface)',
                    display: 'block',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    marginTop: '2px',
                  }}
                >
                  {activeMemberModal.ownerEmail}
                </span>
              </div>

              <div>
                <span style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--ds-color-on-surface-variant)' }}>
                  Date Registered
                </span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--ds-color-on-surface)', display: 'block', marginTop: '2px' }}>
                  {new Date(activeMemberModal.createdAt).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>

              <div>
                <span style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--ds-color-on-surface-variant)' }}>
                  Subscription Tier
                </span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--ds-color-primary)', display: 'block', marginTop: '2px' }}>
                  {activeMemberModal.planName} (Active Trial)
                </span>
              </div>

              <div>
                <span style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--ds-color-on-surface-variant)' }}>
                  Check-in / Activity
                </span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--ds-color-on-surface)', display: 'block', marginTop: '2px' }}>
                  {activeMemberModal.checkinCount} logged sessions
                </span>
              </div>

              <div>
                <span style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--ds-color-on-surface-variant)' }}>
                  Base Currency
                </span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--ds-color-on-surface)', display: 'block', marginTop: '2px' }}>
                  {activeMemberModal.currency} (Locked)
                </span>
              </div>

              <div>
                <span style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--ds-color-on-surface-variant)' }}>
                  Onboarding Flow
                </span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: activeMemberModal.onboardingCompleted ? '#059669' : '#d97706', display: 'block', marginTop: '2px' }}>
                  {activeMemberModal.onboardingCompleted ? 'Completed' : 'In Progress'}
                </span>
              </div>
            </div>

            {/* Branches List */}
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--ds-color-on-surface-variant)', display: 'block', marginBottom: '6px' }}>
                Configured Branches ({activeMemberModal.branchesCount})
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {activeMemberModal.branches.map((br) => (
                  <div
                    key={br.id}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: 'var(--ds-color-surface-container-low)',
                      borderRadius: 'var(--ds-radius-md)',
                      fontSize: '0.8125rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ fontWeight: 600, color: 'var(--ds-color-on-surface)' }}>{br.name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--ds-color-on-surface-variant)' }}>{br.address || 'No address specified'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid var(--ds-color-outline-variant)' }}>
              <button
                type="button"
                onClick={(e) => openCurrencyModal(e, activeMemberModal)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: 'var(--ds-radius-md)',
                  border: '1px solid var(--ds-color-outline-variant)',
                  backgroundColor: 'var(--ds-color-surface-container-low)',
                  color: 'var(--ds-color-on-surface)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Edit2 size={13} />
                <span>Correct Currency</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMemberModal(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--ds-radius-md)',
                  backgroundColor: 'var(--ds-color-primary)',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP MODAL: Currency Correction Tool */}
      {currencyModalBusiness && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="currency-dialog-title"
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
              maxWidth: '480px',
              width: '100%',
              backgroundColor: 'var(--ds-color-surface-container-lowest)',
              borderRadius: 'var(--ds-radius-2xl)',
              border: '1px solid var(--ds-color-outline-variant)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              padding: 'var(--ds-space-6)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--ds-space-4)',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3
                  id="currency-dialog-title"
                  style={{
                    margin: 0,
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color: 'var(--ds-color-on-surface)',
                    letterSpacing: '-0.01em',
                  }}
                >
                  Correct Business Currency
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8125rem', color: 'var(--ds-color-on-surface-variant)' }}>
                  Platform Admin privilege for <strong>{currencyModalBusiness.name}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCurrencyModalBusiness(null)}
                aria-label="Close dialog"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--ds-color-on-surface-variant)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Policy Alert */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--ds-radius-md)',
                backgroundColor: 'rgba(217, 119, 6, 0.08)',
                border: '1px solid rgba(217, 119, 6, 0.3)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
              }}
            >
              <AlertCircle size={18} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '0.8125rem', color: '#92400e', lineHeight: 1.4 }}>
                <strong>Platform Rule:</strong> SME owners cannot alter currency post-onboarding. Any correction performed here is written directly to the structured <code>AuditLog</code>.
              </div>
            </div>

            {actionMessage && (
              <div
                role="alert"
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--ds-radius-md)',
                  backgroundColor: actionMessage.type === 'success' ? '#ecfdf5' : '#fef2f2',
                  border: `1px solid ${actionMessage.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
                  color: actionMessage.type === 'success' ? '#065f46' : '#991b1b',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                }}
              >
                {actionMessage.text}
              </div>
            )}

            <form onSubmit={handleCurrencySubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-4)' }}>
              <div>
                <label
                  htmlFor="correct-currency-select"
                  style={{
                    display: 'block',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    color: 'var(--ds-color-on-surface)',
                    marginBottom: '6px',
                  }}
                >
                  Select New Standard Currency *
                </label>
                <select
                  id="correct-currency-select"
                  value={targetCurrency}
                  onChange={(e) => setTargetCurrency(e.target.value)}
                  style={{
                    width: '100%',
                    height: '42px',
                    padding: '0 12px',
                    borderRadius: 'var(--ds-radius-md)',
                    border: '1px solid var(--ds-color-outline-variant)',
                    backgroundColor: 'var(--ds-color-surface-container-low)',
                    color: 'var(--ds-color-on-surface)',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    outline: 'none',
                  }}
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--ds-space-3)', marginTop: 'var(--ds-space-2)' }}>
                <button
                  type="button"
                  onClick={() => setCurrencyModalBusiness(null)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--ds-radius-md)',
                    border: '1px solid var(--ds-color-outline-variant)',
                    backgroundColor: 'transparent',
                    color: 'var(--ds-color-on-surface)',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || targetCurrency === currencyModalBusiness.currency}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 'var(--ds-radius-md)',
                    border: 'none',
                    backgroundColor: 'var(--ds-color-primary)',
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    cursor: (isSubmitting || targetCurrency === currencyModalBusiness.currency) ? 'not-allowed' : 'pointer',
                    opacity: (isSubmitting || targetCurrency === currencyModalBusiness.currency) ? 0.6 : 1,
                  }}
                >
                  {isSubmitting ? 'Saving...' : 'Confirm Currency Correction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
