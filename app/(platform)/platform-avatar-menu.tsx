'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogOut, ShieldCheck, User, TrendingUp, Building2 } from 'lucide-react'

interface PlatformAvatarMenuProps {
  email: string
  canAccessAdmin?: boolean
  canAccessFounder?: boolean
  currentArea?: 'admin' | 'founder'
}

export default function PlatformAvatarMenu({
  email,
  canAccessAdmin = false,
  canAccessFounder = false,
  currentArea,
}: PlatformAvatarMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const initial = email ? email.charAt(0).toUpperCase() : 'P'

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

  const handleLogout = async () => {
    try {
      await fetch('/api/platform/auth/logout', { method: 'POST' })
      router.push('/platform/auth')
      router.refresh()
    } catch {
      router.push('/platform/auth')
    }
  }

  return (
    <div
      ref={menuRef}
      className="header-avatar-wrapper"
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
      {/* Round Avatar Icon Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Platform account menu"
        aria-expanded={isOpen}
        className="header-round-btn header-avatar-btn"
        style={{
          width: '40px',
          height: '40px',
          minWidth: '40px',
          minHeight: '40px',
          maxWidth: '40px',
          maxHeight: '40px',
          aspectRatio: '1 / 1',
          borderRadius: '50%',
          backgroundColor: 'var(--ds-color-primary)',
          color: '#ffffff',
          fontWeight: 800,
          fontSize: '0.9375rem',
          lineHeight: 1,
          border: '2px solid rgba(255, 255, 255, 0.9)',
          boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          padding: 0,
          margin: 0,
          boxSizing: 'border-box',
          outline: 'none',
          transition: 'all 0.15s ease',
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        {initial}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="menu"
          aria-label="Platform user options"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '260px',
            backgroundColor: 'var(--ds-color-surface-container-lowest)',
            borderRadius: 'var(--ds-radius-xl)',
            border: '1px solid var(--ds-color-outline-variant)',
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.12)',
            zIndex: 1000,
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            animation: 'fadeIn 0.12s ease-out',
          }}
        >
          {/* User Identity Header */}
          <div
            style={{
              paddingBottom: '10px',
              borderBottom: '1px solid var(--ds-color-outline-variant)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={14} color="var(--ds-color-primary)" />
              <span
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--ds-color-on-surface-variant)',
                }}
              >
                Signed in as
              </span>
            </div>
            <span
              title={email}
              style={{
                fontSize: '0.8125rem',
                fontWeight: 700,
                color: 'var(--ds-color-on-surface)',
                overflowWrap: 'break-word',
                lineHeight: 1.3,
              }}
            >
              {email}
            </span>
          </div>

          {/* Area Navigation Links */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {canAccessAdmin && currentArea !== 'admin' && (
              <Link
                href="/admin"
                onClick={() => setIsOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 10px',
                  borderRadius: 'var(--ds-radius-md)',
                  color: 'var(--ds-color-on-surface)',
                  textDecoration: 'none',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--ds-color-surface-container-low)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                <Building2 size={15} color="var(--ds-color-primary)" />
                <span>Admin Console</span>
              </Link>
            )}

            {canAccessFounder && currentArea !== 'founder' && (
              <Link
                href="/founder"
                onClick={() => setIsOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 10px',
                  borderRadius: 'var(--ds-radius-md)',
                  color: 'var(--ds-color-on-surface)',
                  textDecoration: 'none',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--ds-color-surface-container-low)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                <TrendingUp size={15} color="#059669" />
                <span>Founder Dashboard</span>
              </Link>
            )}
          </div>

          {/* Logout Button */}
          <div style={{ paddingTop: '6px', borderTop: '1px solid var(--ds-color-outline-variant)' }}>
            <button
              type="button"
              onClick={handleLogout}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 10px',
                borderRadius: 'var(--ds-radius-md)',
                backgroundColor: 'transparent',
                border: 'none',
                color: '#b91c1c',
                fontSize: '0.8125rem',
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              <LogOut size={15} />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

