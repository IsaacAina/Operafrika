'use client'

import React, { useState, useMemo } from 'react'
import {
  MessageSquare,
  Search,
  CheckCircle2,
  Clock,
  Building2,
  Mail,
  ShieldCheck,
  CheckCheck,
  RotateCcw,
  DollarSign,
  AlertCircle,
  Filter,
  Send,
  CornerDownRight,
  Edit3,
  Sparkles,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

export interface AdminSupportTicket {
  id: string
  message: string
  resolved: boolean
  createdAt: string
  adminReply?: string | null
  adminRepliedAt?: string | null
  adminEmail?: string | null
  user: {
    id: string
    email: string
    role: string
    business: {
      id: string
      name: string
      currency: string
      businessType: string
    }
  } | null
}

interface AdminSupportInboxProps {
  tickets: AdminSupportTicket[]
  onToggleResolved: (ticketId: string, currentResolved: boolean) => Promise<void>
  onSendReply: (ticketId: string, replyText: string) => Promise<boolean>
  onOpenCurrencyCorrection?: (businessId: string, currentCurrency: string, businessName: string) => void
  updatingTicketId: string | null
}

const QUICK_REPLY_TEMPLATES = [
  'Your business operating currency has been updated as requested. Please refresh your dashboard.',
  'Thank you for reporting this. We have verified and resolved the issue on your account.',
  'Under Operafrika security policy, Staff roles have read-only stock access. Branch managers or owners can make adjustments.',
  'Your account settings and branch configurations have been verified and are fully operational.',
]

export default function AdminSupportInbox({
  tickets,
  onToggleResolved,
  onSendReply,
  onOpenCurrencyCorrection,
  updatingTicketId,
}: AdminSupportInboxProps) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 5
  const [activeReplyTicketId, setActiveReplyTicketId] = useState<string | null>(null)
  const [replyDraft, setReplyDraft] = useState('')
  const [isSendingReply, setIsSendingReply] = useState(false)
  const [replySuccessMessage, setReplySuccessMessage] = useState<string | null>(null)
  const [replyErrorMessage, setReplyErrorMessage] = useState<string | null>(null)

  const handleFilterChange = (newFilter: 'all' | 'pending' | 'resolved') => {
    setFilter(newFilter)
    setCurrentPage(1)
  }

  const handleSearchChange = (val: string) => {
    setSearchQuery(val)
    setCurrentPage(1)
  }

  const handleOpenReply = (ticket: AdminSupportTicket) => {
    setActiveReplyTicketId(ticket.id)
    setReplyDraft(ticket.adminReply || '')
    setReplySuccessMessage(null)
    setReplyErrorMessage(null)
  }

  const handleCancelReply = () => {
    setActiveReplyTicketId(null)
    setReplyDraft('')
    setReplySuccessMessage(null)
    setReplyErrorMessage(null)
  }

  const handleApplyTemplate = (template: string) => {
    setReplyDraft((prev) => (prev ? `${prev}\n${template}` : template))
  }

  const handleSubmitReply = async (ticketId: string) => {
    const trimmed = replyDraft.trim()
    if (!trimmed) return
    setIsSendingReply(true)
    setReplySuccessMessage(null)
    setReplyErrorMessage(null)
    try {
      const success = await onSendReply(ticketId, trimmed)
      if (success) {
        setReplySuccessMessage('Response sent successfully to the user in-app!')
        setTimeout(() => {
          setActiveReplyTicketId(null)
          setReplyDraft('')
          setReplySuccessMessage(null)
        }, 1200)
      } else {
        setReplyErrorMessage('Failed to send response. Please try again.')
      }
    } catch (err: any) {
      setReplyErrorMessage(err?.message || 'Error sending reply.')
    } finally {
      setIsSendingReply(false)
    }
  }

  const pendingCount = tickets.filter((t) => !t.resolved).length
  const resolvedCount = tickets.filter((t) => t.resolved).length

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      if (filter === 'pending' && ticket.resolved) return false
      if (filter === 'resolved' && !ticket.resolved) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchMsg = ticket.message.toLowerCase().includes(q)
        const matchEmail = ticket.user?.email.toLowerCase().includes(q)
        const matchBiz = ticket.user?.business?.name.toLowerCase().includes(q)
        if (!matchMsg && !matchEmail && !matchBiz) return false
      }

      return true
    })
  }, [tickets, filter, searchQuery])

  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / pageSize))

  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredTickets.slice(start, start + pageSize)
  }, [filteredTickets, currentPage, pageSize])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-4)' }}>
      {/* Header and Filter Toolbar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--ds-space-3)',
          padding: 'var(--ds-space-4) var(--ds-space-6)',
          backgroundColor: 'var(--ds-color-surface-container-lowest)',
          borderRadius: 'var(--ds-radius-xl)',
          border: '1px solid var(--ds-color-outline-variant)',
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800, color: 'var(--ds-color-on-surface)' }}>
            Support Messages &amp; Inquiries
          </h2>
          <p style={{ margin: '3px 0 0 0', fontSize: '0.8125rem', color: 'var(--ds-color-on-surface-variant)' }}>
            Direct questions and requests submitted by SME owners, managers, and staff across all branches.
          </p>
        </div>

        <div className="admin-filter-toolbar">
          {/* Search Box */}
          <div className="admin-search-box">
            <Search
              size={15}
              color="var(--ds-color-on-surface-variant)"
              className="admin-search-icon"
            />
            <input
              type="text"
              placeholder="Search messages, email, business..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="admin-search-input"
            />
          </div>

          {/* Status Filter Buttons */}
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => handleFilterChange('all')}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--ds-radius-md)',
                fontSize: '0.75rem',
                fontWeight: 700,
                border: '1px solid',
                borderColor: filter === 'all' ? 'var(--ds-color-primary)' : 'var(--ds-color-outline-variant)',
                backgroundColor: filter === 'all' ? 'var(--ds-color-primary)' : 'var(--ds-color-surface-container-lowest)',
                color: filter === 'all' ? '#ffffff' : 'var(--ds-color-on-surface-variant)',
                cursor: 'pointer',
              }}
            >
              All ({tickets.length})
            </button>

            <button
              type="button"
              onClick={() => handleFilterChange('pending')}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--ds-radius-md)',
                fontSize: '0.75rem',
                fontWeight: 700,
                border: '1px solid',
                borderColor: filter === 'pending' ? '#d97706' : 'var(--ds-color-outline-variant)',
                backgroundColor: filter === 'pending' ? '#fef3c7' : 'var(--ds-color-surface-container-lowest)',
                color: filter === 'pending' ? '#92400e' : 'var(--ds-color-on-surface-variant)',
                cursor: 'pointer',
              }}
            >
              Pending ({pendingCount})
            </button>

            <button
              type="button"
              onClick={() => handleFilterChange('resolved')}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--ds-radius-md)',
                fontSize: '0.75rem',
                fontWeight: 700,
                border: '1px solid',
                borderColor: filter === 'resolved' ? '#059669' : 'var(--ds-color-outline-variant)',
                backgroundColor: filter === 'resolved' ? '#ecfdf5' : 'var(--ds-color-surface-container-lowest)',
                color: filter === 'resolved' ? '#065f46' : 'var(--ds-color-on-surface-variant)',
                cursor: 'pointer',
              }}
            >
              Resolved ({resolvedCount})
            </button>
          </div>
        </div>
      </div>

      {/* Message Feed */}
      {filteredTickets.length === 0 ? (
        <div
          style={{
            backgroundColor: 'var(--ds-color-surface-container-lowest)',
            borderRadius: 'var(--ds-radius-xl)',
            border: '1px solid var(--ds-color-outline-variant)',
            padding: 'var(--ds-space-10) var(--ds-space-6)',
            textAlign: 'center',
            color: 'var(--ds-color-on-surface-variant)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <MessageSquare size={32} strokeWidth={1.5} color="var(--ds-color-outline-variant)" />
          <p style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>
            No support messages found.
          </p>
          <span style={{ fontSize: '0.8125rem' }}>
            {filter !== 'all' ? 'Try changing the filter or search term.' : 'Inquiries sent from the SME app will appear here.'}
          </span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-3)' }}>
          {paginatedTickets.map((ticket) => {
            const isUpdating = updatingTicketId === ticket.id
            const role = ticket.user?.role ?? 'UNKNOWN'
            const roleBadgeStyle =
              role === 'OWNER'
                ? { bg: 'rgba(15, 118, 110, 0.12)', color: 'var(--ds-color-primary)' }
                : role === 'MANAGER'
                  ? { bg: 'rgba(37, 99, 235, 0.12)', color: '#2563eb' }
                  : { bg: 'rgba(107, 114, 128, 0.12)', color: '#4b5563' }

            const mentionsCurrency =
              ticket.message.toLowerCase().includes('currency') ||
              ticket.message.toLowerCase().includes('naira') ||
              ticket.message.toLowerCase().includes('dollar')

            return (
              <div
                key={ticket.id}
                style={{
                  backgroundColor: 'var(--ds-color-surface-container-lowest)',
                  borderRadius: 'var(--ds-radius-xl)',
                  border: '1px solid var(--ds-color-outline-variant)',
                  borderLeft: `4px solid ${ticket.resolved ? '#059669' : '#d97706'}`,
                  padding: 'var(--ds-space-5)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--ds-space-3)',
                  transition: 'all 0.15s ease',
                }}
              >
                {/* Card Top: Sender & Metadata */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        padding: '2px 8px',
                        borderRadius: 'var(--ds-radius-full)',
                        backgroundColor: roleBadgeStyle.bg,
                        color: roleBadgeStyle.color,
                      }}
                    >
                      <ShieldCheck size={11} />
                      {role}
                    </span>

                    <span style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--ds-color-on-surface)' }}>
                      {ticket.user?.email ?? 'Unknown User'}
                    </span>

                    {ticket.user?.business && (
                      <span
                        style={{
                          fontSize: '0.8125rem',
                          color: 'var(--ds-color-on-surface-variant)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Building2 size={13} />
                        <strong>{ticket.user.business.name}</strong> ({ticket.user.business.currency})
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--ds-color-on-surface-variant)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Clock size={12} />
                      {new Date(ticket.createdAt).toLocaleDateString('en-NG', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>

                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        padding: '3px 10px',
                        borderRadius: 'var(--ds-radius-full)',
                        backgroundColor: ticket.resolved ? '#ecfdf5' : '#fef3c7',
                        color: ticket.resolved ? '#065f46' : '#92400e',
                      }}
                    >
                      {ticket.resolved ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                      {ticket.resolved ? 'Resolved' : 'Pending Review'}
                    </span>
                  </div>
                </div>

                {/* Message Body */}
                <div
                  style={{
                    backgroundColor: 'var(--ds-color-surface-container-low)',
                    padding: '12px 16px',
                    borderRadius: 'var(--ds-radius-lg)',
                    fontSize: '0.875rem',
                    lineHeight: 1.6,
                    color: 'var(--ds-color-on-surface)',
                    whiteSpace: 'pre-wrap',
                    border: '1px solid var(--ds-color-outline-variant)',
                  }}
                >
                  {ticket.message}
                </div>

                {/* Existing Official Response Display */}
                {ticket.adminReply && activeReplyTicketId !== ticket.id && (
                  <div
                    style={{
                      backgroundColor: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: 'var(--ds-radius-lg)',
                      padding: '12px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <ShieldCheck size={14} color="#059669" />
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Official Admin Response {ticket.adminEmail ? `by ${ticket.adminEmail}` : ''}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {ticket.adminRepliedAt && (
                          <span style={{ fontSize: '0.6875rem', color: '#047857' }}>
                            {new Date(ticket.adminRepliedAt).toLocaleDateString('en-NG', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenReply(ticket)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'transparent',
                            border: 'none',
                            color: '#047857',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            padding: '2px 6px',
                            borderRadius: 'var(--ds-radius-sm)',
                          }}
                        >
                          <Edit3 size={12} />
                          <span>Edit</span>
                        </button>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.875rem', lineHeight: 1.6, color: '#064e3b', whiteSpace: 'pre-wrap' }}>
                      {ticket.adminReply}
                    </div>
                  </div>
                )}

                {/* Inline Reply Composer */}
                {activeReplyTicketId === ticket.id && (
                  <div
                    style={{
                      backgroundColor: 'var(--ds-color-surface-container-low)',
                      border: '1px solid var(--ds-color-primary)',
                      borderRadius: 'var(--ds-radius-lg)',
                      padding: '14px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: 'var(--ds-color-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CornerDownRight size={14} />
                        <span>Send Official Response to {ticket.user?.email || 'User'}</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleCancelReply}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--ds-color-on-surface-variant)',
                          cursor: 'pointer',
                          padding: '2px',
                        }}
                      >
                        <X size={16} />
                      </button>
                    </div>

                    {/* Quick Response Templates */}
                    <div>
                      <span style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--ds-color-on-surface-variant)', marginBottom: '4px' }}>
                        Quick Templates:
                      </span>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {QUICK_REPLY_TEMPLATES.map((tpl, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleApplyTemplate(tpl)}
                            style={{
                              padding: '3px 8px',
                              borderRadius: 'var(--ds-radius-full)',
                              border: '1px solid var(--ds-color-outline-variant)',
                              backgroundColor: 'var(--ds-color-surface-container-lowest)',
                              color: 'var(--ds-color-on-surface-variant)',
                              fontSize: '0.6875rem',
                              cursor: 'pointer',
                            }}
                          >
                            + {tpl.slice(0, 32)}...
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Reply Textarea */}
                    <textarea
                      rows={4}
                      placeholder="Type your response to the user. This message will appear directly under their inquiry in the SME app..."
                      value={replyDraft}
                      onChange={(e) => setReplyDraft(e.target.value)}
                      maxLength={3000}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 'var(--ds-radius-md)',
                        border: '1px solid var(--ds-color-outline-variant)',
                        backgroundColor: 'var(--ds-color-surface-container-lowest)',
                        fontSize: '0.875rem',
                        lineHeight: 1.5,
                        color: 'var(--ds-color-on-surface)',
                        fontFamily: 'inherit',
                        outline: 'none',
                        resize: 'vertical',
                      }}
                    />

                    {replySuccessMessage && (
                      <div style={{ fontSize: '0.8125rem', color: '#059669', fontWeight: 700 }}>
                        {replySuccessMessage}
                      </div>
                    )}

                    {replyErrorMessage && (
                      <div style={{ fontSize: '0.8125rem', color: '#dc2626', fontWeight: 700 }}>
                        {replyErrorMessage}
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--ds-color-on-surface-variant)' }}>
                        {replyDraft.length} / 3000 characters
                      </span>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={handleCancelReply}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 'var(--ds-radius-md)',
                            border: '1px solid var(--ds-color-outline-variant)',
                            backgroundColor: 'transparent',
                            color: 'var(--ds-color-on-surface)',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isSendingReply || !replyDraft.trim()}
                          onClick={() => handleSubmitReply(ticket.id)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 14px',
                            borderRadius: 'var(--ds-radius-md)',
                            border: 'none',
                            backgroundColor: 'var(--ds-color-primary)',
                            color: '#ffffff',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: isSendingReply || !replyDraft.trim() ? 'not-allowed' : 'pointer',
                            opacity: isSendingReply || !replyDraft.trim() ? 0.6 : 1,
                          }}
                        >
                          <Send size={12} />
                          <span>{isSendingReply ? 'Sending...' : 'Send Reply & Resolve'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Card Actions */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '8px',
                    paddingTop: '4px',
                  }}
                >
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {activeReplyTicketId !== ticket.id && (
                      <button
                        type="button"
                        onClick={() => handleOpenReply(ticket)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          borderRadius: 'var(--ds-radius-md)',
                          border: '1px solid var(--ds-color-primary)',
                          backgroundColor: 'rgba(15, 118, 110, 0.08)',
                          color: 'var(--ds-color-primary)',
                          cursor: 'pointer',
                        }}
                      >
                        <CornerDownRight size={13} />
                        <span>{ticket.adminReply ? 'Edit In-App Reply' : 'Reply in App'}</span>
                      </button>
                    )}

                    {mentionsCurrency && ticket.user?.business && onOpenCurrencyCorrection && (
                      <button
                        type="button"
                        onClick={() =>
                          onOpenCurrencyCorrection(
                            ticket.user!.business.id,
                            ticket.user!.business.currency,
                            ticket.user!.business.name
                          )
                        }
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          borderRadius: 'var(--ds-radius-md)',
                          border: '1px solid #7c3aed',
                          backgroundColor: '#f5f3ff',
                          color: '#6d28d9',
                          cursor: 'pointer',
                        }}
                      >
                        <DollarSign size={13} />
                        <span>Correct Business Currency</span>
                      </button>
                    )}
                  </div>

                  <div>
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => onToggleResolved(ticket.id, ticket.resolved)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 14px',
                        fontSize: '0.8125rem',
                        fontWeight: 700,
                        borderRadius: 'var(--ds-radius-md)',
                        border: '1px solid',
                        borderColor: ticket.resolved ? 'var(--ds-color-outline-variant)' : '#059669',
                        backgroundColor: ticket.resolved ? 'var(--ds-color-surface-container-lowest)' : '#059669',
                        color: ticket.resolved ? 'var(--ds-color-on-surface)' : '#ffffff',
                        cursor: isUpdating ? 'not-allowed' : 'pointer',
                        opacity: isUpdating ? 0.6 : 1,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {ticket.resolved ? (
                        <>
                          <RotateCcw size={13} />
                          <span>Reopen Ticket</span>
                        </>
                      ) : (
                        <>
                          <CheckCheck size={14} />
                          <span>Mark as Resolved</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Responsive Pagination Bar (Mobile and Desktop) */}
      {filteredTickets.length > 0 && (
        <div
          className="platform-pagination-container"
          style={{
            backgroundColor: 'var(--ds-color-surface-container-lowest)',
            borderRadius: 'var(--ds-radius-xl)',
            border: '1px solid var(--ds-color-outline-variant)',
          }}
        >
          <span className="platform-pagination-summary">
            Showing <strong>{(currentPage - 1) * pageSize + 1}</strong> to{' '}
            <strong>{Math.min(currentPage * pageSize, filteredTickets.length)}</strong> of{' '}
            <strong>{filteredTickets.length}</strong> inquiries
          </span>

          <div className="platform-pagination-controls">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="platform-pagination-btn"
              style={{
                opacity: currentPage <= 1 ? 0.4 : 1,
                cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
              }}
            >
              <ChevronLeft size={14} /> Previous
            </button>

            <span className="platform-pagination-page-indicator">
              Page {currentPage} of {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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
      )}
    </div>
  )
}

