'use client'

import React, { useState, useMemo } from 'react'
import {
  HelpCircle,
  Search,
  MessageSquare,
  Send,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  ShieldCheck,
  Package,
  Receipt,
  Store,
  Sparkles,
  BookOpen,
  Mail,
  User,
  Building2,
  DollarSign,
  Tag,
  Check,
} from 'lucide-react'

export interface UserSupportTicket {
  id: string
  message: string
  resolved: boolean
  createdAt: string
}

interface SupportViewProps {
  initialTickets: UserSupportTicket[]
  userEmail: string
  userRole: string
  businessName: string
}

type SupportTab = 'faq' | 'compose' | 'history'
type FaqCategory = 'ALL' | 'SALES' | 'STOCK' | 'ROLES' | 'AI_REPORTS'

interface FaqItem {
  id: string
  category: FaqCategory
  question: string
  answer: string
}

const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'faq-1',
    category: 'SALES',
    question: 'How do I record a quick cash or walk-in sale?',
    answer:
      'In Operafrika, a walk-in sale is simply an invoice created without selecting a customer. The system automatically defaults payment status to "Paid", registers the transaction, and instantly decrements the sold items from your branch inventory.',
  },
  {
    id: 'faq-2',
    category: 'SALES',
    question: 'How do partial payments and customer debt work?',
    answer:
      'When issuing or updating an invoice, you can choose "Partial" status and enter the amount paid so far. The unpaid balance is automatically attributed to the selected customer\'s profile, making it easy to track outstanding receivables on the Customers screen.',
  },
  {
    id: 'faq-3',
    category: 'SALES',
    question: 'Can Staff members edit or cancel invoices?',
    answer:
      'No. Under Operafrika\'s two-layer permission rules, Staff can create and view sales and invoices for their assigned branch, but only Owners and Managers have permission to edit or cancel invoice records.',
  },
  {
    id: 'faq-4',
    category: 'STOCK',
    question: 'How does automatic inventory deduction work?',
    answer:
      'Whenever an invoice or walk-in sale is confirmed, Operafrika immediately logs a "stock-out" movement record for each item. This reduces your on-hand stock and builds an immutable audit history for that product.',
  },
  {
    id: 'faq-5',
    category: 'STOCK',
    question: 'What is the Reorder Threshold and how do alerts work?',
    answer:
      'The reorder threshold is your minimum stock buffer. When quantity on hand drops to or below this threshold, Operafrika triggers a low-stock alert in your notification center and flags the item in your Inventory table.',
  },
  {
    id: 'faq-6',
    category: 'STOCK',
    question: 'Why can\'t Staff add or adjust stock levels?',
    answer:
      'By design, Staff accounts have read-only visibility into their branch\'s stock levels so they can verify availability before a sale. Adding products, restocking, and adjusting inventory quantities are restricted to Owners and Branch Managers.',
  },
  {
    id: 'faq-7',
    category: 'ROLES',
    question: 'How do I switch between branches as an Owner?',
    answer:
      'Owners can view combined data across the whole business or filter down to a specific branch using the branch selector in the dashboard header or on sales, stock, and reports pages. Managers and Staff are assigned to exactly one branch.',
  },
  {
    id: 'faq-8',
    category: 'ROLES',
    question: 'Why is my operating currency locked and view-only?',
    answer:
      'Your operating currency is set once during onboarding to guarantee consistent accounting across historical transactions, stock valuation, and P&L calculations. If an incorrect currency was selected, reach out below and a Platform Admin will correct it.',
  },
  {
    id: 'faq-9',
    category: 'AI_REPORTS',
    question: 'How does the AI Assistant compute answers?',
    answer:
      'The AI assistant never invents financial figures. It runs direct, verified database calculations over your recorded transactions, stock movements, and payroll, and uses the AI model solely to format the computed facts in plain English.',
  },
  {
    id: 'faq-10',
    category: 'AI_REPORTS',
    question: 'Does recording payroll move real money in the MVP?',
    answer:
      'No. In the MVP, payroll is a record-only log entered by the Owner. It documents pay periods and employee salaries so they accurately flow as expenses into your branch Profit & Loss calculations. Real disbursement is planned for V3.',
  },
]

const INQUIRY_TOPICS = [
  'General Question',
  'Currency Correction Request',
  'Sales & Invoicing',
  'Stock & Inventory',
  'Staff & Permissions',
  'Technical Issue',
]

export default function SupportView({
  initialTickets,
  userEmail,
  userRole,
  businessName,
}: SupportViewProps) {
  const [activeTab, setActiveTab] = useState<SupportTab>('faq')
  const [tickets, setTickets] = useState<UserSupportTicket[]>(initialTickets)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<FaqCategory>('ALL')
  const [openFaqId, setOpenFaqId] = useState<string | null>('faq-1')

  // Form states
  const [selectedTopic, setSelectedTopic] = useState<string>('General Question')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const pendingTicketsCount = tickets.filter((t) => !t.resolved).length

  // Filter FAQs
  const filteredFaqs = useMemo(() => {
    return FAQ_ITEMS.filter((item) => {
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) {
        return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchQ = item.question.toLowerCase().includes(q)
        const matchA = item.answer.toLowerCase().includes(q)
        if (!matchQ && !matchA) return false
      }
      return true
    })
  }, [searchQuery, selectedCategory])

  const toggleFaq = (id: string) => {
    setOpenFaqId((prev) => (prev === id ? null : id))
  }

  const handleSelectTopic = (topic: string) => {
    setSelectedTopic(topic)
    if (topic === 'Currency Correction Request' && !message.includes('currency')) {
      setMessage((prev) =>
        prev ? `[Currency Correction Request]\n${prev}` : 'Hello Operafrika team, I need to correct our business currency to '
      )
    }
  }

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = message.trim()
    if (!trimmed || trimmed.length < 5) {
      setSubmitError('Please write a message with at least 5 characters.')
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)
    setSubmitSuccess(null)

    // Prepend category tag if not present
    const finalMessage = trimmed.startsWith(`[${selectedTopic}]`)
      ? trimmed
      : `[${selectedTopic}] ${trimmed}`

    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: finalMessage }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        setSubmitError(data?.error || `Failed to send message (HTTP ${res.status}). Please try again.`)
        return
      }

      setSubmitSuccess('Your message has been sent to the Operafrika platform team. We will review it shortly.')
      setMessage('')
      if (data?.message) {
        setTickets((prev) => [
          {
            id: data.message.id,
            message: data.message.message,
            resolved: data.message.resolved,
            createdAt: data.message.createdAt,
          },
          ...prev,
        ])
      }
    } catch (err: any) {
      setSubmitError(err?.message || 'Network error sending your message. Please check your connection.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-6)', width: '100%' }}>
      {/* Modern Segmented Navigation Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          borderBottom: '1px solid var(--ds-color-outline-variant)',
          paddingBottom: '12px',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('faq')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: 'var(--ds-radius-lg)',
            border: '1px solid',
            borderColor: activeTab === 'faq' ? 'var(--ds-color-primary)' : 'transparent',
            backgroundColor: activeTab === 'faq' ? 'var(--ds-color-primary)' : 'transparent',
            color: activeTab === 'faq' ? '#ffffff' : 'var(--ds-color-on-surface-variant)',
            fontSize: '0.875rem',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
          }}
        >
          <BookOpen size={16} />
          <span>Knowledgebase &amp; FAQs</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('compose')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: 'var(--ds-radius-lg)',
            border: '1px solid',
            borderColor: activeTab === 'compose' ? 'var(--ds-color-primary)' : 'transparent',
            backgroundColor: activeTab === 'compose' ? 'var(--ds-color-primary)' : 'transparent',
            color: activeTab === 'compose' ? '#ffffff' : 'var(--ds-color-on-surface-variant)',
            fontSize: '0.875rem',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
          }}
        >
          <MessageSquare size={16} />
          <span>Contact Platform Team</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: 'var(--ds-radius-lg)',
            border: '1px solid',
            borderColor: activeTab === 'history' ? 'var(--ds-color-primary)' : 'transparent',
            backgroundColor: activeTab === 'history' ? 'var(--ds-color-primary)' : 'transparent',
            color: activeTab === 'history' ? '#ffffff' : 'var(--ds-color-on-surface-variant)',
            fontSize: '0.875rem',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
          }}
        >
          <Clock size={16} />
          <span>My Tickets</span>
          {tickets.length > 0 && (
            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 800,
                padding: '1px 7px',
                borderRadius: 'var(--ds-radius-full)',
                backgroundColor: activeTab === 'history' ? '#ffffff' : 'var(--ds-color-surface-container-high)',
                color: activeTab === 'history' ? 'var(--ds-color-primary)' : 'var(--ds-color-on-surface)',
              }}
            >
              {tickets.length}
            </span>
          )}
          {pendingTicketsCount > 0 && activeTab !== 'history' && (
            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 800,
                padding: '1px 6px',
                borderRadius: 'var(--ds-radius-full)',
                backgroundColor: '#d97706',
                color: '#ffffff',
              }}
            >
              {pendingTicketsCount} open
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: KNOWLEDGEBASE & FAQS */}
      {activeTab === 'faq' && (
        <section
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--ds-space-5)',
            width: '100%',
          }}
        >
          {/* Search & Topic Bar */}
          <div
            style={{
              backgroundColor: 'var(--ds-color-surface-container-lowest)',
              borderRadius: 'var(--ds-radius-xl)',
              border: '1px solid var(--ds-color-outline-variant)',
              padding: 'var(--ds-space-5)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--ds-space-4)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--ds-color-on-surface)', margin: 0 }}>
                  Search Knowledgebase
                </h2>
                <p style={{ fontSize: '0.8125rem', color: 'var(--ds-color-on-surface-variant)', margin: '2px 0 0 0' }}>
                  Frequently asked questions covering sales, branch permissions, inventory, and AI calculations.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('compose')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: 'var(--ds-radius-md)',
                  border: '1px solid var(--ds-color-primary)',
                  backgroundColor: 'rgba(15, 118, 110, 0.08)',
                  color: 'var(--ds-color-primary)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <MessageSquare size={13} />
                <span>Need Direct Help? Ask Platform Team</span>
              </button>
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', width: '100%' }}>
              <Search
                size={16}
                color="var(--ds-color-on-surface-variant)"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                placeholder="Search questions (e.g. walk-in sale, stock threshold, staff, currency)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 38px',
                  borderRadius: 'var(--ds-radius-lg)',
                  border: '1px solid var(--ds-color-outline-variant)',
                  backgroundColor: 'var(--ds-color-surface-container-low)',
                  fontSize: '0.875rem',
                  color: 'var(--ds-color-on-surface)',
                  outline: 'none',
                }}
              />
            </div>

            {/* Category Filter Pills */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {(
                [
                  { id: 'ALL', label: 'All Topics' },
                  { id: 'SALES', label: 'Sales & Invoicing' },
                  { id: 'STOCK', label: 'Stock & Alerts' },
                  { id: 'ROLES', label: 'Roles & Branches' },
                  { id: 'AI_REPORTS', label: 'AI & Reports' },
                ] as { id: FaqCategory; label: string }[]
              ).map((cat) => {
                const active = selectedCategory === cat.id
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    style={{
                      padding: '5px 12px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      borderRadius: 'var(--ds-radius-full)',
                      border: '1px solid',
                      borderColor: active ? 'var(--ds-color-primary)' : 'var(--ds-color-outline-variant)',
                      backgroundColor: active ? 'var(--ds-color-primary)' : 'var(--ds-color-surface-container-lowest)',
                      color: active ? '#ffffff' : 'var(--ds-color-on-surface-variant)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {cat.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Accordion FAQ Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-2)' }}>
            {filteredFaqs.length === 0 ? (
              <div
                style={{
                  backgroundColor: 'var(--ds-color-surface-container-lowest)',
                  borderRadius: 'var(--ds-radius-xl)',
                  border: '1px solid var(--ds-color-outline-variant)',
                  padding: 'var(--ds-space-8) var(--ds-space-4)',
                  textAlign: 'center',
                  color: 'var(--ds-color-on-surface-variant)',
                  fontSize: '0.875rem',
                }}
              >
                No FAQs matching &quot;{searchQuery}&quot;.
                <div style={{ marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setActiveTab('compose')}
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
                    Send message to platform team
                  </button>
                </div>
              </div>
            ) : (
              filteredFaqs.map((faq) => {
                const isOpen = openFaqId === faq.id
                return (
                  <div
                    key={faq.id}
                    style={{
                      border: '1px solid var(--ds-color-outline-variant)',
                      borderRadius: 'var(--ds-radius-xl)',
                      overflow: 'hidden',
                      backgroundColor: 'var(--ds-color-surface-container-lowest)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleFaq(faq.id)}
                      style={{
                        width: '100%',
                        padding: '14px 18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.9375rem',
                          fontWeight: 700,
                          color: 'var(--ds-color-on-surface)',
                          lineHeight: 1.4,
                        }}
                      >
                        {faq.question}
                      </span>
                      {isOpen ? (
                        <ChevronUp size={18} color="var(--ds-color-primary)" style={{ flexShrink: 0 }} />
                      ) : (
                        <ChevronDown size={18} color="var(--ds-color-on-surface-variant)" style={{ flexShrink: 0 }} />
                      )}
                    </button>

                    {isOpen && (
                      <div
                        style={{
                          padding: '0 18px 16px 18px',
                          fontSize: '0.875rem',
                          lineHeight: 1.65,
                          color: 'var(--ds-color-on-surface-variant)',
                          borderTop: '1px solid var(--ds-color-outline-variant)',
                          backgroundColor: 'var(--ds-color-surface-container-low)',
                          paddingTop: '12px',
                        }}
                      >
                        {faq.answer}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </section>
      )}

      {/* TAB 2: COMPOSE MESSAGE / CONTACT SUPPORT TEAM */}
      {activeTab === 'compose' && (
        <section
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--ds-space-5)',
            width: '100%',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--ds-color-surface-container-lowest)',
              borderRadius: 'var(--ds-radius-xl)',
              border: '1px solid var(--ds-color-outline-variant)',
              padding: 'var(--ds-space-6)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--ds-space-4)',
            }}
          >
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--ds-color-on-surface)', margin: 0 }}>
                Send a Message to Operafrika Platform Team
              </h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--ds-color-on-surface-variant)', margin: '3px 0 0 0' }}>
                Ask a question, request currency correction, or report an operational issue. We reply directly within 24 hours.
              </p>
            </div>

            {/* Topic Chips */}
            <div>
              <span
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: 'var(--ds-color-on-surface-variant)',
                  marginBottom: '8px',
                }}
              >
                Inquiry Topic
              </span>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {INQUIRY_TOPICS.map((topic) => {
                  const isSelected = selectedTopic === topic
                  return (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => handleSelectTopic(topic)}
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        borderRadius: 'var(--ds-radius-full)',
                        border: '1px solid',
                        borderColor: isSelected ? 'var(--ds-color-primary)' : 'var(--ds-color-outline-variant)',
                        backgroundColor: isSelected ? 'rgba(15, 118, 110, 0.12)' : 'var(--ds-color-surface-container-low)',
                        color: isSelected ? 'var(--ds-color-primary)' : 'var(--ds-color-on-surface-variant)',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {isSelected && <Check size={12} />}
                      <span>{topic}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Context Info Box */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
                padding: '10px 14px',
                backgroundColor: 'var(--ds-color-surface-container-low)',
                borderRadius: 'var(--ds-radius-lg)',
                border: '1px solid var(--ds-color-outline-variant)',
                fontSize: '0.75rem',
                color: 'var(--ds-color-on-surface-variant)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Building2 size={13} color="var(--ds-color-primary)" />
                <span>
                  Business: <strong>{businessName}</strong>
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={13} color="var(--ds-color-primary)" />
                <span>
                  Sender: <strong>{userEmail}</strong> ({userRole})
                </span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitTicket} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-3)' }}>
              <div>
                <label
                  htmlFor="support-message-input"
                  style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: 'var(--ds-color-on-surface-variant)',
                    marginBottom: '6px',
                  }}
                >
                  Your Message
                </label>
                <textarea
                  id="support-message-input"
                  rows={5}
                  placeholder="Type your message, details, or questions here..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={3000}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 'var(--ds-radius-lg)',
                    border: '1px solid var(--ds-color-outline-variant)',
                    backgroundColor: 'var(--ds-color-surface-container-low)',
                    fontSize: '0.875rem',
                    color: 'var(--ds-color-on-surface)',
                    fontFamily: 'inherit',
                    lineHeight: 1.6,
                    resize: 'vertical',
                    outline: 'none',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--ds-color-on-surface-variant)' }}>
                    {message.length} / 3000 characters
                  </span>
                </div>
              </div>

              {submitError && (
                <div
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
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{submitError}</span>
                </div>
              )}

              {submitSuccess && (
                <div
                  style={{
                    padding: '12px 16px',
                    backgroundColor: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    borderRadius: 'var(--ds-radius-md)',
                    color: '#065f46',
                    fontSize: '0.8125rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={17} style={{ flexShrink: 0 }} />
                    <span>{submitSuccess}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('history')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 'var(--ds-radius-md)',
                      backgroundColor: '#065f46',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    View in Ticket History &rarr;
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button
                  type="submit"
                  disabled={isSubmitting || message.trim().length < 5}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                    borderRadius: 'var(--ds-radius-lg)',
                    border: 'none',
                    backgroundColor: 'var(--ds-color-primary)',
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    cursor: isSubmitting || message.trim().length < 5 ? 'not-allowed' : 'pointer',
                    opacity: isSubmitting || message.trim().length < 5 ? 0.6 : 1,
                    transition: 'opacity 0.15s ease',
                  }}
                >
                  <Send size={15} />
                  <span>{isSubmitting ? 'Sending Message...' : 'Send to Platform Team'}</span>
                </button>
              </div>
            </form>
          </div>
        </section>
      )}

      {/* TAB 3: TICKET HISTORY */}
      {activeTab === 'history' && (
        <section
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--ds-space-4)',
            width: '100%',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--ds-color-surface-container-lowest)',
              borderRadius: 'var(--ds-radius-xl)',
              border: '1px solid var(--ds-color-outline-variant)',
              padding: 'var(--ds-space-5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--ds-color-on-surface)', margin: 0 }}>
                Your Support Messages ({tickets.length})
              </h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--ds-color-on-surface-variant)', margin: '2px 0 0 0' }}>
                Track responses and status of your submitted inquiries.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('compose')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: 'var(--ds-radius-md)',
                backgroundColor: 'var(--ds-color-primary)',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.8125rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <MessageSquare size={14} />
              <span>New Message</span>
            </button>
          </div>

          {tickets.length === 0 ? (
            <div
              style={{
                backgroundColor: 'var(--ds-color-surface-container-lowest)',
                borderRadius: 'var(--ds-radius-xl)',
                border: '1px solid var(--ds-color-outline-variant)',
                padding: 'var(--ds-space-10) var(--ds-space-4)',
                textAlign: 'center',
                color: 'var(--ds-color-on-surface-variant)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <MessageSquare size={32} strokeWidth={1.5} color="var(--ds-color-outline-variant)" />
              <p style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700 }}>
                No support messages submitted yet.
              </p>
              <span style={{ fontSize: '0.8125rem' }}>
                When you submit an inquiry to the platform team, you can follow its status right here.
              </span>
              <button
                type="button"
                onClick={() => setActiveTab('compose')}
                style={{
                  marginTop: '8px',
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
                Send a Message
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-3)' }}>
              {tickets.map((ticket) => (
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
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--ds-color-on-surface-variant)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <Clock size={13} />
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
                      {ticket.resolved ? 'Resolved by Platform Team' : 'Pending Review'}
                    </span>
                  </div>

                  <div
                    style={{
                      backgroundColor: 'var(--ds-color-surface-container-low)',
                      padding: '12px 14px',
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
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
