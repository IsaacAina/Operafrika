'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  Bell,
  X,
  CheckCheck,
  AlertCircle,
  AlertTriangle,
  Receipt,
  ShieldCheck,
  Package,
  Store,
  ChevronRight,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import type { InAppNotification } from '@/app/api/notifications/route'

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<InAppNotification[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<'all' | 'alerts' | 'system'>('all')
  const panelRef = useRef<HTMLDivElement>(null)

  // Load read status from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('operafrika_read_notifications')
      if (stored) {
        setReadIds(new Set(JSON.parse(stored)))
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [])

  // Fetch notifications
  const fetchNotifications = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
      }
    } catch {
      // Silently fail if offline or network error
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
    // Poll notifications every 60 seconds
    const interval = setInterval(fetchNotifications, 60000)
    return () => clearInterval(interval)
  }, [])

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  // Mark all as read
  const handleMarkAllAsRead = () => {
    const allIds = new Set(notifications.map((n) => n.id))
    setReadIds(allIds)
    try {
      localStorage.setItem('operafrika_read_notifications', JSON.stringify(Array.from(allIds)))
    } catch {
      // Ignore storage error
    }
  }

  // Mark single as read
  const handleMarkAsRead = (id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev)
      next.add(id)
      try {
        localStorage.setItem('operafrika_read_notifications', JSON.stringify(Array.from(next)))
      } catch {
        // Ignore
      }
      return next
    })
  }

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length
  const hasCritical = notifications.some((n) => n.severity === 'CRITICAL' && !readIds.has(n.id))

  // Filter items by active tab
  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'alerts') {
      return n.category === 'STOCK' || n.category === 'FINANCE'
    }
    if (activeTab === 'system') {
      return n.category === 'SECURITY' || n.category === 'PAYROLL'
    }
    return true
  })

  const alertCount = notifications.filter((n) => n.category === 'STOCK' || n.category === 'FINANCE').length
  const systemCount = notifications.filter((n) => n.category === 'SECURITY' || n.category === 'PAYROLL').length

  const getCategoryIcon = (category: InAppNotification['category'], severity: InAppNotification['severity']) => {
    if (category === 'STOCK') {
      if (severity === 'CRITICAL') {
        return { icon: <AlertCircle size={16} />, bg: 'rgba(239, 68, 68, 0.12)', color: '#b91c1c' }
      }
      return { icon: <AlertTriangle size={16} />, bg: 'rgba(217, 119, 6, 0.12)', color: '#b45309' }
    }
    if (category === 'FINANCE') {
      return { icon: <Receipt size={16} />, bg: 'rgba(37, 99, 235, 0.12)', color: '#2563eb' }
    }
    if (category === 'PAYROLL') {
      return { icon: <Clock size={16} />, bg: 'rgba(124, 58, 237, 0.12)', color: '#7c3aed' }
    }
    return { icon: <ShieldCheck size={16} />, bg: 'rgba(15, 118, 110, 0.12)', color: '#0f766e' }
  }

  return (
    <div
      ref={panelRef}
      className="header-notification-wrapper"
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '40px',
        height: '40px',
        minWidth: '40px',
        minHeight: '40px',
        flexShrink: 0,
      }}
    >
      {/* Bell Trigger Button */}
      <button
        type="button"
        aria-label={`Notification Center, ${unreadCount} unread`}
        aria-haspopup="true"
        aria-expanded={isOpen}
        onClick={() => {
          setIsOpen((prev) => !prev)
          if (!isOpen) fetchNotifications()
        }}
        className="header-round-btn header-notification-btn"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          width: '40px',
          height: '40px',
          minWidth: '40px',
          minHeight: '40px',
          maxWidth: '40px',
          maxHeight: '40px',
          aspectRatio: '1 / 1',
          padding: 0,
          margin: 0,
          boxSizing: 'border-box',
          borderRadius: '50%',
          backgroundColor: isOpen ? 'var(--ds-color-surface-container-high)' : 'var(--ds-color-surface-container-low)',
          border: '1px solid var(--ds-color-outline-variant)',
          color: 'var(--ds-color-on-surface)',
          cursor: 'pointer',
          outline: 'none',
          transition: 'all 0.18s ease',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          flexShrink: 0,
          overflow: 'visible',
        }}
      >
        <Bell size={18} color={hasCritical ? '#dc2626' : 'var(--ds-color-on-surface)'} />

        {/* Unread Badge Indicator */}
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-2px',
              right: '-2px',
              minWidth: '18px',
              height: '19px',
              padding: '0 4px',
              borderRadius: 'var(--ds-radius-full)',
              backgroundColor: hasCritical ? '#dc2626' : 'var(--ds-color-primary)',
              color: '#ffffff',
              fontSize: '0.6875rem',
              fontWeight: 800,
              fontFamily: 'Inter, sans-serif',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid var(--ds-color-surface-container-lowest)',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
              animation: hasCritical ? 'pulse 2s infinite' : 'none',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Floating Notification Popover Drawer (Sheet on Mobile, anchored Popover on Desktop) */}
      {isOpen && (
        <>
          <div
            className="notification-panel-backdrop"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div
            role="region"
            aria-label="Notification panel"
            className="notification-panel-container"
          >
            {/* Mobile Sheet Drag Handle */}
            <div className="notification-mobile-handle" aria-hidden="true" />

            {/* Drawer Header */}
            <div
              style={{
                padding: 'var(--ds-space-4) var(--ds-space-5)',
                borderBottom: '1px solid var(--ds-color-outline-variant)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'var(--ds-color-surface-container-low)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bell size={18} color="var(--ds-color-primary)" />
                <h3
                  style={{
                    margin: 0,
                    fontSize: '0.9375rem',
                    fontWeight: 800,
                    color: 'var(--ds-color-on-surface)',
                    letterSpacing: '-0.01em',
                  }}
                >
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 'var(--ds-radius-full)',
                      backgroundColor: hasCritical ? 'rgba(239, 68, 68, 0.15)' : 'rgba(15, 118, 110, 0.15)',
                      color: hasCritical ? '#dc2626' : 'var(--ds-color-primary)',
                      fontSize: '0.6875rem',
                      fontWeight: 800,
                    }}
                  >
                    {unreadCount} new
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllAsRead}
                    title="Mark all notifications as read"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--ds-color-primary)',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 6px',
                      borderRadius: 'var(--ds-radius-sm)',
                    }}
                  >
                    <CheckCheck size={14} />
                    <span>Mark read</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close notifications"
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
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Segmented Filter Bar */}
            <div
              style={{
                padding: '8px 12px',
                borderBottom: '1px solid var(--ds-color-outline-variant)',
                display: 'flex',
                gap: '4px',
                backgroundColor: 'var(--ds-color-surface-container-lowest)',
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  borderRadius: 'var(--ds-radius-md)',
                  border: 'none',
                  backgroundColor: activeTab === 'all' ? 'var(--ds-color-surface-container-high)' : 'transparent',
                  color: activeTab === 'all' ? 'var(--ds-color-on-surface)' : 'var(--ds-color-on-surface-variant)',
                  fontSize: '0.75rem',
                  fontWeight: activeTab === 'all' ? 700 : 500,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                }}
              >
                <span>All</span>
                <span style={{ fontSize: '0.6875rem', opacity: 0.8 }}>({notifications.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('alerts')}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  borderRadius: 'var(--ds-radius-md)',
                  border: 'none',
                  backgroundColor: activeTab === 'alerts' ? 'var(--ds-color-surface-container-high)' : 'transparent',
                  color: activeTab === 'alerts' ? 'var(--ds-color-on-surface)' : 'var(--ds-color-on-surface-variant)',
                  fontSize: '0.75rem',
                  fontWeight: activeTab === 'alerts' ? 700 : 500,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                }}
              >
                <span>Alerts</span>
                <span style={{ fontSize: '0.6875rem', opacity: 0.8 }}>({alertCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('system')}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  borderRadius: 'var(--ds-radius-md)',
                  border: 'none',
                  backgroundColor: activeTab === 'system' ? 'var(--ds-color-surface-container-high)' : 'transparent',
                  color: activeTab === 'system' ? 'var(--ds-color-on-surface)' : 'var(--ds-color-on-surface-variant)',
                  fontSize: '0.75rem',
                  fontWeight: activeTab === 'system' ? 700 : 500,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                }}
              >
                <span>System</span>
                <span style={{ fontSize: '0.6875rem', opacity: 0.8 }}>({systemCount})</span>
              </button>
            </div>

            {/* Notifications Scroll Area */}
            <div
              style={{
                maxHeight: '380px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {filteredNotifications.length === 0 ? (
                <div
                  style={{
                    padding: 'var(--ds-space-8) var(--ds-space-4)',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 'var(--ds-space-2)',
                  }}
                >
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: 'var(--ds-radius-full)',
                      backgroundColor: 'rgba(16, 185, 129, 0.12)',
                      color: '#047857',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CheckCircle2 size={22} />
                  </div>
                  <h4 style={{ margin: '4px 0 0', fontSize: '0.875rem', fontWeight: 700, color: 'var(--ds-color-on-surface)' }}>
                    All caught up!
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--ds-color-on-surface-variant)', maxWidth: '240px' }}>
                    No active warnings or unread alerts in this category.
                  </p>
                </div>
              ) : (
                filteredNotifications.map((n) => {
                  const isRead = readIds.has(n.id)
                  const styling = getCategoryIcon(n.category, n.severity)

                  return (
                    <Link
                      key={n.id}
                      href={n.link}
                      onClick={() => {
                        handleMarkAsRead(n.id)
                        setIsOpen(false)
                      }}
                      style={{
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        borderBottom: '1px solid var(--ds-color-outline-variant)',
                        backgroundColor: isRead ? 'transparent' : 'rgba(15, 118, 110, 0.04)',
                        textDecoration: 'none',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      {/* Category Icon Badge */}
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: 'var(--ds-radius-lg)',
                          backgroundColor: styling.bg,
                          color: styling.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: '2px',
                        }}
                      >
                        {styling.icon}
                      </div>

                      {/* Content Details */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <span
                            style={{
                              fontWeight: isRead ? 600 : 800,
                              fontSize: '0.8125rem',
                              color: 'var(--ds-color-on-surface)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {n.title}
                          </span>
                          {!isRead && (
                            <span
                              style={{
                                width: '7px',
                                height: '7px',
                                borderRadius: 'var(--ds-radius-full)',
                                backgroundColor: n.severity === 'CRITICAL' ? '#dc2626' : 'var(--ds-color-primary)',
                                flexShrink: 0,
                              }}
                            />
                          )}
                        </div>

                        <p
                          style={{
                            margin: '3px 0 0 0',
                            fontSize: '0.75rem',
                            color: 'var(--ds-color-on-surface-variant)',
                            lineHeight: 1.4,
                          }}
                        >
                          {n.message}
                        </p>

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginTop: '6px',
                            fontSize: '0.6875rem',
                            color: 'var(--ds-color-on-surface-variant)',
                          }}
                        >
                          {n.branchName && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontWeight: 600,
                              }}
                            >
                              <Store size={10} /> {n.branchName}
                            </span>
                          )}
                          <span>&middot;</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: 'var(--ds-color-primary)', fontWeight: 600 }}>
                            View details <ChevronRight size={10} />
                          </span>
                        </div>
                      </div>
                    </Link>
                  )
                })
              )}
            </div>

            {/* Drawer Footer */}
            <div
              style={{
                padding: '10px 16px',
                backgroundColor: 'var(--ds-color-surface-container-low)',
                borderTop: '1px solid var(--ds-color-outline-variant)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.75rem',
              }}
            >
              <span style={{ color: 'var(--ds-color-on-surface-variant)' }}>
                In-app alerts &middot; Operafrika MVP
              </span>
              <Link
                href="/app/settings"
                onClick={() => setIsOpen(false)}
                style={{
                  color: 'var(--ds-color-primary)',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                Preferences &rarr;
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

