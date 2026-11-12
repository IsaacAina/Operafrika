'use client'

import React, { useState, useRef, useEffect } from 'react'
import {
  Sparkles,
  Send,
  X,
  Bot,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  RotateCcw,
  Package,
  Receipt,
  Coins,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
} from 'lucide-react'

interface MessageItem {
  id: string
  sender: 'user' | 'assistant'
  text: string
  label?: 'Calculated Fact' | 'Estimate' | 'Insufficient Data'
  dataSnapshot?: {
    metric: string
    value: string
    period?: string
    branchName?: string
    items?: Array<{ label: string; value: string }>
  }
  suggestedQuestions?: string[]
  timestamp: string
}

interface AiAssistantWidgetProps {
  userRole?: string
  businessId?: string
}

export default function AiAssistantWidget({
  userRole = 'OWNER',
}: AiAssistantWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      text:
        'Hello! I am your Operafrika AI Business Assistant. I answer questions by running direct calculations across your verified database records.',
      label: 'Calculated Fact',
      suggestedQuestions:
        userRole === 'STAFF'
          ? ['Which items are low on stock?', 'What sales were recorded today?']
          : userRole === 'MANAGER'
            ? ['What was our revenue this week?', 'Which items are low on stock?', 'Who owes us money?']
            : ['What was our revenue this week?', 'What is our net profit this month?', 'Which items are low on stock?', 'Who owes us the most money?'],
      timestamp: 'Just now',
    },
  ])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [isOpen, messages])

  // Load saved chat history from the database on initial mount
  useEffect(() => {
    async function loadSavedChatHistory() {
      try {
        const res = await fetch('/api/chat')
        if (!res.ok) return
        const data = await res.json()
        if (data.success && Array.isArray(data.history) && data.history.length > 0) {
          const loadedMessages: MessageItem[] = []
          for (const item of data.history) {
            loadedMessages.push({
              id: `history-u-${item.id}`,
              sender: 'user',
              text: item.prompt,
              timestamp: new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            })
            loadedMessages.push({
              id: `history-a-${item.id}`,
              sender: 'assistant',
              text: item.response,
              label: (item.label as any) || 'Calculated Fact',
              dataSnapshot: item.dataSnapshot,
              timestamp: new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            })
          }
          setMessages((prev) => [prev[0], ...loadedMessages])
        }
      } catch {
        // Core business records remain usable if chat history fails to load
      }
    }
    loadSavedChatHistory()
  }, [])

  const handleSend = async (questionText?: string) => {
    const textToSend = (questionText || query).trim()
    if (!textToSend || isLoading) return

    const userMessage: MessageItem = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMessage])
    setQuery('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: textToSend }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            sender: 'assistant',
            text: data.error || 'The assistant could not complete your query. Please try again.',
            label: 'Insufficient Data',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ])
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            sender: 'assistant',
            text: data.answer,
            label: data.label,
            dataSnapshot: data.dataSnapshot,
            suggestedQuestions: data.suggestedQuestions,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ])
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          sender: 'assistant',
          text: 'Network error communicating with the AI service. Core business records remain fully operational.',
          label: 'Insufficient Data',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetConversation = () => {
    setMessages([
      {
        id: 'welcome-reset',
        sender: 'assistant',
        text: 'Conversation reset. What business question would you like me to calculate for you?',
        label: 'Calculated Fact',
        suggestedQuestions:
          userRole === 'STAFF'
            ? ['Which items are low on stock?', 'What sales were recorded today?']
            : ['What was our revenue this week?', 'What is our net profit this month?', 'Which items are low on stock?'],
        timestamp: 'Just now',
      },
    ])
  }

  return (
    <>
      {/* ==================================================== */}
      {/* FLOATING TRIGGER BUTTON (BOTTOM RIGHT)               */}
      {/* ==================================================== */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open Operafrika AI Business Assistant"
          className="ai-assistant-floating-btn"
        >
          <span className="ai-assistant-btn-icon-wrapper">
            <Sparkles size={14} />
          </span>
          <span className="ai-assistant-btn-label">Ask AI Assistant</span>
          <span className="ai-assistant-btn-indicator" />
        </button>
      )}

      {/* ==================================================== */}
      {/* AI ASSISTANT SLIDE-OVER DRAWER                       */}
      {/* ==================================================== */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'flex-end',
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(3px)',
            transition: 'opacity 0.25s ease',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false)
          }}
        >
          <aside
            style={{
              width: '100%',
              maxWidth: '460px',
              height: '100%',
              backgroundColor: 'var(--ds-color-surface-container-lowest)',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.2)',
              overflow: 'hidden',
              animation: 'drawerSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* 1. DRAWER HEADER */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--ds-color-outline-variant)',
                backgroundColor: 'var(--ds-color-surface-container-low)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    backgroundColor: '#1d4ed8',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 6px rgba(29, 78, 216, 0.3)',
                  }}
                >
                  <Bot size={20} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 800, color: 'var(--ds-color-on-surface)' }}>
                      Operafrika AI
                    </h3>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(22, 163, 74, 0.12)',
                        color: '#16a34a',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                    >
                      <CheckCircle2 size={10} /> DB Verified
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--ds-color-on-surface-variant)' }}>
                    {userRole === 'OWNER' ? 'Owner Scope (All Branches)' : `${userRole} Scope`}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  type="button"
                  onClick={handleResetConversation}
                  title="Reset Conversation"
                  aria-label="Reset Conversation"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: '6px',
                    borderRadius: 'var(--ds-radius-sm)',
                    color: 'var(--ds-color-on-surface-variant)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <RotateCcw size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  title="Close Assistant"
                  aria-label="Close Assistant"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: '6px',
                    borderRadius: 'var(--ds-radius-sm)',
                    color: 'var(--ds-color-on-surface-variant)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* 2. QUICK STARTER PROMPT PILLS */}
            <div
              style={{
                padding: '10px 16px',
                borderBottom: '1px solid var(--ds-color-outline-variant)',
                backgroundColor: 'var(--ds-color-surface-container-lowest)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                overflowX: 'auto',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ds-color-on-surface-variant)', textTransform: 'uppercase' }}>
                Quick:
              </span>
              {(userRole === 'STAFF'
                ? [
                  { icon: Package, text: 'Low stock items' },
                  { icon: Receipt, text: 'Sales recorded today' },
                ]
                : userRole === 'MANAGER'
                  ? [
                    { icon: TrendingUp, text: 'Revenue this week' },
                    { icon: Package, text: 'Low stock items' },
                    { icon: Coins, text: 'Customer debts' },
                  ]
                  : [
                    { icon: TrendingUp, text: 'Revenue this week' },
                    { icon: Coins, text: 'Net profit this month' },
                    { icon: Package, text: 'Low stock items' },
                    { icon: Receipt, text: 'Who owes us money?' },
                  ]
              ).map((chip) => {
                const ChipIcon = chip.icon
                return (
                  <button
                    key={chip.text}
                    type="button"
                    onClick={() => handleSend(chip.text)}
                    disabled={isLoading}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      backgroundColor: 'var(--ds-color-surface-container-high)',
                      color: 'var(--ds-color-on-surface)',
                      border: '1px solid var(--ds-color-outline-variant)',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    <ChipIcon size={12} color="#1d4ed8" />
                    <span>{chip.text}</span>
                  </button>
                )
              })}
            </div>

            {/* 3. MESSAGE STREAM */}
            <div
              style={{
                flex: 1,
                padding: '16px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '100%',
                  }}
                >
                  {/* Bubble Container */}
                  <div
                    style={{
                      maxWidth: '88%',
                      borderRadius:
                        msg.sender === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      padding: msg.sender === 'user' ? '10px 14px' : '14px 16px',
                      backgroundColor:
                        msg.sender === 'user'
                          ? '#1d4ed8'
                          : 'var(--ds-color-surface-container-low)',
                      color: msg.sender === 'user' ? '#ffffff' : 'var(--ds-color-on-surface)',
                      border:
                        msg.sender === 'user'
                          ? 'none'
                          : '1px solid var(--ds-color-outline-variant)',
                      fontSize: '0.84375rem',
                      lineHeight: '1.45',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                    }}
                  >
                    {/* Assistant Metadata Badges */}
                    {msg.sender === 'assistant' && msg.label && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginBottom: '8px',
                        }}
                      >
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '10px',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            textTransform: 'uppercase',
                            backgroundColor:
                              msg.label === 'Calculated Fact'
                                ? 'rgba(22, 163, 74, 0.12)'
                                : msg.label === 'Estimate'
                                  ? 'rgba(217, 119, 6, 0.12)'
                                  : 'rgba(100, 116, 139, 0.12)',
                            color:
                              msg.label === 'Calculated Fact'
                                ? '#16a34a'
                                : msg.label === 'Estimate'
                                  ? '#d97706'
                                  : '#64748b',
                          }}
                        >
                          {msg.label === 'Calculated Fact' && <CheckCircle2 size={11} />}
                          {msg.label === 'Estimate' && <TrendingUp size={11} />}
                          {msg.label === 'Insufficient Data' && <AlertCircle size={11} />}
                          {msg.label}
                        </span>
                      </div>
                    )}

                    {/* Pre-Calculated Data Highlight Card */}
                    {msg.sender === 'assistant' && msg.dataSnapshot && (
                      <div
                        style={{
                          margin: '8px 0 10px',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          backgroundColor: 'var(--ds-color-surface-container-lowest)',
                          border: '1px solid var(--ds-color-outline-variant)',
                        }}
                      >
                        <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--ds-color-on-surface-variant)' }}>
                          {msg.dataSnapshot.metric} {msg.dataSnapshot.period ? `(${msg.dataSnapshot.period})` : ''}
                        </span>
                        <span style={{ display: 'block', fontSize: '1.25rem', fontWeight: 800, color: '#1d4ed8', margin: '2px 0 4px' }}>
                          {msg.dataSnapshot.value}
                        </span>
                        {msg.dataSnapshot.items && msg.dataSnapshot.items.length > 0 && (
                          <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid var(--ds-color-outline-variant)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            {msg.dataSnapshot.items.map((item) => (
                              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                                <span style={{ color: 'var(--ds-color-on-surface-variant)' }}>{item.label}:</span>
                                <span style={{ fontWeight: 700 }}>{item.value}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Prose Explanation */}
                    <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>

                    {/* Follow-up Prompts */}
                    {msg.sender === 'assistant' && msg.suggestedQuestions && msg.suggestedQuestions.length > 0 && (
                      <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--ds-color-outline-variant)' }}>
                        <span style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--ds-color-on-surface-variant)', textTransform: 'uppercase', marginBottom: '6px' }}>
                          Suggested Follow-ups:
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {msg.suggestedQuestions.map((q) => (
                            <button
                              key={q}
                              type="button"
                              onClick={() => handleSend(q)}
                              disabled={isLoading}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: 'transparent',
                                border: 'none',
                                textAlign: 'left',
                                fontSize: '11px',
                                color: '#1d4ed8',
                                fontWeight: 600,
                                padding: '3px 0',
                                cursor: 'pointer',
                              }}
                            >
                              <span>• {q}</span>
                              <ChevronRight size={12} />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <span
                    style={{
                      fontSize: '10px',
                      color: 'var(--ds-color-on-surface-variant)',
                      marginTop: '3px',
                      padding: '0 4px',
                    }}
                  >
                    {msg.timestamp}
                  </span>
                </div>
              ))}

              {/* Loading Skeleton */}
              {isLoading && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', maxWidth: '85%' }}>
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: '16px 16px 16px 4px',
                      backgroundColor: 'var(--ds-color-surface-container-low)',
                      border: '1px solid var(--ds-color-outline-variant)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '12px',
                      color: 'var(--ds-color-on-surface-variant)',
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#1d4ed8',
                        animation: 'pulse 1s infinite',
                      }}
                    />
                    <span>Querying database &amp; computing verified result...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* 4. CHAT INPUT FOOTER */}
            <div
              style={{
                padding: '12px 16px 16px',
                borderTop: '1px solid var(--ds-color-outline-variant)',
                backgroundColor: 'var(--ds-color-surface-container-lowest)',
              }}
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSend()
                }}
                className="ai-chat-form"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  height: '42px',
                  minHeight: '42px',
                  maxHeight: '42px',
                  gap: '8px',
                  backgroundColor: 'var(--ds-color-surface-container-low)',
                  border: '1px solid var(--ds-color-outline-variant)',
                  borderRadius: '9999px',
                  padding: '0 5px 0 14px',
                  boxSizing: 'border-box',
                }}
              >
                <input
                  ref={inputRef}
                  type="text"
                  className="ai-chat-input"
                  placeholder="Ask about sales, stock, expenses..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  disabled={isLoading}
                  style={{
                    flex: 1,
                    height: '36px',
                    lineHeight: '36px',
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    fontSize: '0.8125rem',
                    color: 'var(--ds-color-on-surface)',
                    padding: 0,
                    margin: 0,
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  type="submit"
                  disabled={!query.trim() || isLoading}
                  aria-label="Send query"
                  className="ai-chat-send-btn"
                  style={{
                    width: '32px',
                    height: '32px',
                    minWidth: '32px',
                    minHeight: '32px',
                    borderRadius: '50%',
                    backgroundColor: query.trim() && !isLoading ? '#1d4ed8' : 'var(--ds-color-surface-container-high)',
                    color: query.trim() && !isLoading ? '#ffffff' : 'var(--ds-color-on-surface-variant)',
                    border: 'none',
                    cursor: query.trim() && !isLoading ? 'pointer' : 'not-allowed',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease',
                    flexShrink: 0,
                    padding: 0,
                    margin: 0,
                  }}
                >
                  <Send size={14} style={{ display: 'block', margin: 'auto' }} />
                </button>
              </form>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '8px' }}>
                <ShieldCheck size={11} color="#16a34a" />
                <span style={{ fontSize: '10px', color: 'var(--ds-color-on-surface-variant)' }}>
                  All figures calculated directly from PostgreSQL records. Zero hallucinations.
                </span>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  )
}

