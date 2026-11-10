'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { LogOut, User, ShieldCheck, HelpCircle } from 'lucide-react'
import { useLogout } from '@/lib/auth-queries'

interface UserAvatarMenuProps {
  name: string
  email: string
  role: string
}

export default function UserAvatarMenu({ name, email, role }: UserAvatarMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const logoutMutation = useLogout()

  // Derive initial from name or email
  const getInitial = (): string => {
    if (name && name.trim()) {
      return name.trim().charAt(0).toUpperCase()
    }
    if (email && email.trim()) {
      return email.trim().charAt(0).toUpperCase()
    }
    return 'U'
  }

  const initial = getInitial()

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
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

  const handleSignOut = async () => {
    try {
      await logoutMutation.mutateAsync()
    } catch {
      // Ignore errors and force navigation
    } finally {
      window.location.href = '/app/auth?view=login'
    }
  }

  const roleBadgeStyle =
    role === 'OWNER'
      ? { bg: 'rgba(15, 118, 110, 0.12)', color: 'var(--ds-color-primary)' }
      : role === 'MANAGER'
        ? { bg: 'rgba(37, 99, 235, 0.12)', color: '#2563eb' }
        : { bg: 'rgba(107, 114, 128, 0.12)', color: '#4b5563' }

  return (
    <div ref={menuRef} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Round Avatar Icon */}
      <button
        type="button"
        aria-label="User account menu"
        aria-haspopup="true"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '40px',
          height: '40px',
          borderRadius: 'var(--ds-radius-full)',
          backgroundColor: 'var(--ds-color-primary)',
          color: '#ffffff',
          fontWeight: 800,
          fontSize: '0.9375rem',
          lineHeight: 1,
          fontFamily: 'Inter, sans-serif',
          border: '2px solid var(--ds-color-surface-container-lowest)',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.12)',
          cursor: 'pointer',
          outline: 'none',
          transition: 'all 0.18s ease',
          transform: isOpen ? 'scale(1.05)' : 'scale(1)',
          flexShrink: 0,
        }}
      >
        {initial}
      </button>

      {/* Popover / Dropdown Menu */}
      {isOpen && (
        <div
          role="menu"
          aria-label="Account options"
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            right: 0,
            zIndex: 100,
            width: '270px',
            backgroundColor: 'var(--ds-color-surface-container-lowest)',
            border: '1px solid var(--ds-color-outline-variant)',
            borderRadius: 'var(--ds-radius-xl)',
            boxShadow: '0 12px 30px -4px rgba(0, 0, 0, 0.12), 0 6px 12px -4px rgba(0, 0, 0, 0.06)',
            padding: 'var(--ds-space-3) 0',
            display: 'flex',
            flexDirection: 'column',
            animation: 'fadeIn 0.15s ease-out',
          }}
        >
          {/* Identity Header */}
          <div
            style={{
              padding: 'var(--ds-space-3) var(--ds-space-4)',
              borderBottom: '1px solid var(--ds-color-outline-variant)',
            }}
          >
            <span
              style={{
                display: 'block',
                fontSize: '0.6875rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--ds-color-on-surface-variant)',
                marginBottom: '2px',
              }}
            >
              Signed in as
            </span>
            <span
              style={{
                display: 'block',
                fontSize: '0.9375rem',
                fontWeight: 800,
                color: 'var(--ds-color-on-surface)',
                letterSpacing: '-0.01em',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={name}
            >
              {name || 'Operafrika Business'}
            </span>
            <span
              style={{
                display: 'block',
                fontSize: '0.75rem',
                color: 'var(--ds-color-on-surface-variant)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                marginTop: '1px',
              }}
              title={email}
            >
              {email}
            </span>

            <div style={{ marginTop: 'var(--ds-space-2)' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.6875rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  padding: '2px 8px',
                  borderRadius: 'var(--ds-radius-full)',
                  backgroundColor: roleBadgeStyle.bg,
                  color: roleBadgeStyle.color,
                }}
              >
                <ShieldCheck size={12} />
                {role}
              </span>
            </div>
          </div>

          {/* Quick Links Section */}
          <div style={{ padding: 'var(--ds-space-1) 0' }}>
            <Link
              href="/app/account"
              onClick={() => setIsOpen(false)}
              role="menuitem"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--ds-space-3)',
                padding: 'var(--ds-space-2) var(--ds-space-4)',
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: 'var(--ds-color-on-surface)',
                textDecoration: 'none',
                transition: 'background-color 0.15s ease',
              }}
            >
              <User size={16} color="var(--ds-color-on-surface-variant)" />
              <span>My Account &amp; Security</span>
            </Link>

            <Link
              href="/app/support"
              onClick={() => setIsOpen(false)}
              role="menuitem"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--ds-space-3)',
                padding: 'var(--ds-space-2) var(--ds-space-4)',
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: 'var(--ds-color-on-surface)',
                textDecoration: 'none',
                transition: 'background-color 0.15s ease',
              }}
            >
              <HelpCircle size={16} color="var(--ds-color-on-surface-variant)" />
              <span>Help &amp; Support (FAQ)</span>
            </Link>
          </div>

          <div
            style={{
              height: '1px',
              backgroundColor: 'var(--ds-color-outline-variant)',
              margin: 'var(--ds-space-1) 0',
            }}
          />

          {/* Logout Section */}
          <div style={{ padding: 'var(--ds-space-1) var(--ds-space-2) 0' }}>
            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              disabled={logoutMutation.isPending}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--ds-space-3)',
                width: '100%',
                padding: 'var(--ds-space-2) var(--ds-space-3)',
                fontSize: '0.8125rem',
                fontWeight: 700,
                color: '#dc2626',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: 'var(--ds-radius-md)',
                cursor: logoutMutation.isPending ? 'not-allowed' : 'pointer',
                textAlign: 'left',
                transition: 'background-color 0.15s ease',
              }}
            >
              <LogOut size={16} color="#dc2626" />
              <span>{logoutMutation.isPending ? 'Signing out...' : 'Logout'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

