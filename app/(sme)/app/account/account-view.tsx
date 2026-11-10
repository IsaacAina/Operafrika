'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  User,
  Shield,
  KeyRound,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  X,
  Building,
  Store,
  Clock,
  Lock,
} from 'lucide-react'

interface AccountViewProps {
  user: {
    id: string
    email: string
    role: string
    isEmailVerified: boolean
    createdAt: Date
    assignedBranchName: string | null
    businessName: string
    isLastOwner: boolean
  }
}

export default function AccountView({ user }: AccountViewProps) {
  const router = useRouter()

  // Change password state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  // Account deletion modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('')
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(null)

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.')
      return
    }

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.')
      return
    }

    setIsChangingPassword(true)

    try {
      const res = await fetch('/api/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update password')
      }

      setPasswordSuccess('Password updated successfully.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setPasswordError(err.message || 'Error updating password')
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleDeleteAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setDeleteError(null)

    if (deleteConfirmationInput.trim() !== 'DELETE') {
      setDeleteError('Please type "DELETE" exactly to confirm account closure.')
      return
    }

    setIsDeleting(true)

    try {
      const res = await fetch('/api/account/deletion', {
        method: 'POST',
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to schedule account deletion')
      }

      // Session revoked, redirect to login with notification
      window.location.href = '/app/auth?view=login&deletion=scheduled'
    } catch (err: any) {
      setDeleteError(err.message || 'Error scheduling account deletion')
      setIsDeleting(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-6)', width: '100%' }}>
      {/* 2-Column Responsive Layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 'var(--ds-space-6)',
        }}
      >
        {/* Left Column: Identity & Password */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-6)' }}>
          {/* Profile Overview Card */}
          <section
            className="route-card"
            style={{
              padding: 'var(--ds-space-6)',
              boxShadow: 'none',
              backgroundColor: 'var(--ds-color-surface-container-lowest)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: 'var(--ds-space-4)' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: 'var(--ds-radius-full)',
                  backgroundColor: 'rgba(15, 118, 110, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--ds-color-primary)',
                }}
              >
                <User size={22} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 800, margin: 0, color: 'var(--ds-color-on-surface)' }}>
                  User Profile
                </h2>
                <span style={{ fontSize: '13px', color: 'var(--ds-color-on-surface-variant)' }}>
                  Personal account credentials and branch assignments
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--ds-color-on-surface-variant)' }}>Email Address:</span>
                <span style={{ fontWeight: 600 }}>{user.email}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                <span style={{ color: 'var(--ds-color-on-surface-variant)' }}>System Role:</span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    padding: '2px 8px',
                    borderRadius: 'var(--ds-radius-full)',
                    backgroundColor:
                      user.role === 'OWNER'
                        ? 'rgba(15, 118, 110, 0.12)'
                        : user.role === 'MANAGER'
                        ? 'rgba(37, 99, 235, 0.12)'
                        : 'rgba(107, 114, 128, 0.12)',
                    color:
                      user.role === 'OWNER'
                        ? 'var(--ds-color-primary)'
                        : user.role === 'MANAGER'
                        ? '#2563eb'
                        : '#4b5563',
                  }}
                >
                  {user.role}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--ds-color-on-surface-variant)' }}>Assigned Branch:</span>
                <span style={{ fontWeight: 600 }}>
                  {user.role === 'OWNER' ? 'All Branches (Owner)' : user.assignedBranchName || 'Unassigned'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--ds-color-on-surface-variant)' }}>Business:</span>
                <span style={{ fontWeight: 600 }}>{user.businessName}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                <span style={{ color: 'var(--ds-color-on-surface-variant)' }}>Email Status:</span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontWeight: 600,
                    color: user.isEmailVerified ? '#16a34a' : '#ea580c',
                  }}
                >
                  {user.isEmailVerified ? (
                    <>
                      <CheckCircle2 size={14} /> Verified
                    </>
                  ) : (
                    <>
                      <AlertCircle size={14} /> Unverified
                    </>
                  )}
                </span>
              </div>
            </div>
          </section>

          {/* Change Password Card */}
          <section
            className="route-card"
            style={{
              padding: 'var(--ds-space-6)',
              boxShadow: 'none',
              backgroundColor: 'var(--ds-color-surface-container-lowest)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: 'var(--ds-space-4)' }}>
              <KeyRound size={20} color="var(--ds-color-primary)" />
              <h2 style={{ fontSize: '1.0625rem', fontWeight: 800, margin: 0 }}>Change Password</h2>
            </div>

            {passwordError && (
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--ds-radius-sm)',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: '#dc2626',
                  fontSize: '13px',
                  marginBottom: 'var(--ds-space-3)',
                }}
              >
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--ds-radius-sm)',
                  backgroundColor: 'rgba(34, 197, 94, 0.1)',
                  color: '#16a34a',
                  fontSize: '13px',
                  marginBottom: 'var(--ds-space-3)',
                }}
              >
                {passwordSuccess}
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-3)' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                  Current Password *
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--ds-radius-sm)',
                    border: '1px solid var(--ds-color-outline-variant)',
                    backgroundColor: 'var(--ds-color-background)',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                  New Password * (Min 8 characters)
                </label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--ds-radius-sm)',
                    border: '1px solid var(--ds-color-outline-variant)',
                    backgroundColor: 'var(--ds-color-background)',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--ds-radius-sm)',
                    border: '1px solid var(--ds-color-outline-variant)',
                    backgroundColor: 'var(--ds-color-background)',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--ds-space-2)' }}>
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 'var(--ds-radius-md)',
                    border: 'none',
                    backgroundColor: 'var(--ds-color-primary)',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: isChangingPassword ? 'wait' : 'pointer',
                  }}
                >
                  {isChangingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </section>
        </div>

        {/* Right Column: Account Deletion (30-day grace period rule) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-6)' }}>
          <section
            className="route-card"
            style={{
              padding: 'var(--ds-space-6)',
              boxShadow: 'none',
              backgroundColor: 'rgba(239, 68, 68, 0.03)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 'var(--ds-space-4)',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <Trash2 size={20} color="#dc2626" />
                <h2 style={{ fontSize: '1.125rem', fontWeight: 800, margin: 0, color: '#dc2626' }}>
                  Account Deletion &amp; Data Erasure
                </h2>
              </div>

              <p style={{ margin: '4px 0 12px 0', fontSize: '13px', lineHeight: 1.6, color: 'var(--ds-color-on-surface-variant)' }}>
                Operafrika complies strictly with Nigerian data privacy rights (NDPA). You can request account closure and permanent erasure at any time.
              </p>

              <div
                style={{
                  padding: '12px',
                  borderRadius: 'var(--ds-radius-md)',
                  backgroundColor: 'var(--ds-color-surface-container-lowest)',
                  border: '1px solid var(--ds-color-outline-variant)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  fontSize: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#d97706' }}>
                  <Clock size={15} />
                  <span>30-Day Reversible Grace Period</span>
                </div>
                <p style={{ margin: 0, color: 'var(--ds-color-on-surface-variant)', lineHeight: 1.5 }}>
                  Once scheduled, your sessions are immediately terminated and your account is closed. A cancellation link is emailed to you allowing you to reverse the deletion within <strong>30 days</strong>. If not cancelled, all database rows are permanently purged.
                </p>
              </div>

              {user.isLastOwner && (
                <div
                  style={{
                    padding: '12px',
                    borderRadius: 'var(--ds-radius-md)',
                    backgroundColor: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    marginTop: '12px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    fontSize: '12px',
                    color: '#b91c1c',
                  }}
                >
                  <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong>Sole Business Owner Warning:</strong> You are the only Owner account registered for <strong>{user.businessName}</strong>. Deleting this account will also schedule the entire business and all branch data for permanent purge at the end of the grace period.
                  </div>
                </div>
              )}
            </div>

            <div style={{ paddingTop: 'var(--ds-space-3)', borderTop: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmationInput('')
                  setDeleteError(null)
                  setShowDeleteModal(true)
                }}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  borderRadius: 'var(--ds-radius-md)',
                  border: '1px solid #dc2626',
                  backgroundColor: 'transparent',
                  color: '#dc2626',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <Trash2 size={16} />
                <span>Request Account Deletion</span>
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* ==================================================== */}
      {/* MODAL: ACCOUNT DELETION CONFIRMATION (WITH CLOSE X)  */}
      {/* ==================================================== */}
      {showDeleteModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
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
              maxWidth: '480px',
              backgroundColor: 'var(--ds-color-surface-container-lowest)',
              padding: 'var(--ds-space-6)',
              boxShadow: '0 25px 30px -5px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--ds-space-3)' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 800, margin: 0, color: '#dc2626' }}>
                Confirm Account Closure
              </h2>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                aria-label="Close"
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  color: 'var(--ds-color-on-surface-variant)',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ margin: '0 0 14px 0', fontSize: '13px', color: 'var(--ds-color-on-surface-variant)', lineHeight: 1.5 }}>
              Are you sure you want to schedule deletion for <strong>{user.email}</strong>? Your active sessions will be terminated immediately. You will receive an email with a link to cancel the deletion during the 30-day grace period.
            </p>

            {deleteError && (
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--ds-radius-sm)',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: '#dc2626',
                  fontSize: '12px',
                  marginBottom: '12px',
                }}
              >
                {deleteError}
              </div>
            )}

            <form onSubmit={handleDeleteAccountSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                  Type <span style={{ color: '#dc2626' }}>DELETE</span> to confirm:
                </label>
                <input
                  type="text"
                  required
                  placeholder="DELETE"
                  value={deleteConfirmationInput}
                  onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--ds-radius-sm)',
                    border: '1px solid var(--ds-color-outline-variant)',
                    backgroundColor: 'var(--ds-color-background)',
                    fontSize: '13px',
                    fontWeight: 700,
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 'var(--ds-radius-sm)',
                    border: '1px solid var(--ds-color-outline-variant)',
                    backgroundColor: 'transparent',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDeleting}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 'var(--ds-radius-sm)',
                    border: 'none',
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: isDeleting ? 'wait' : 'pointer',
                  }}
                >
                  {isDeleting ? 'Scheduling...' : 'Confirm Closure'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

