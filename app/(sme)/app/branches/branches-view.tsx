'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Store,
  Plus,
  MapPin,
  Phone,
  Users,
  Package,
  Receipt,
  Edit2,
  X,
  CheckCircle2,
  AlertCircle,
  Building,
  ShieldCheck,
} from 'lucide-react'
import type { BranchSummary } from '@/lib/branches'

interface BranchesViewProps {
  initialBranches: BranchSummary[]
  userRole: string
  userEmail: string
  businessName: string
}

export default function BranchesView({
  initialBranches,
  userRole,
  userEmail,
  businessName,
}: BranchesViewProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [branches, setBranches] = useState<BranchSummary[]>(initialBranches)

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editBranch, setEditBranch] = useState<BranchSummary | null>(null)

  // Add Form state
  const [addName, setAddName] = useState('')
  const [addAddress, setAddAddress] = useState('')
  const [addContact, setAddContact] = useState('')

  // Edit Form state
  const [editName, setEditName] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editContact, setEditContact] = useState('')

  // Status and error states
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isOwner = userRole === 'OWNER'

  const handleOpenAdd = () => {
    setAddName('')
    setAddAddress('')
    setAddContact('')
    setFormError(null)
    setIsAddOpen(true)
  }

  const handleOpenEdit = (branch: BranchSummary) => {
    setEditBranch(branch)
    setEditName(branch.name)
    setEditAddress(branch.address || '')
    setEditContact(branch.contactInfo || '')
    setFormError(null)
  }

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setIsSubmitting(true)

    try {
      const res = await fetch('/api/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addName,
          address: addAddress,
          contactInfo: addContact,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create branch')
      }

      setBranches((prev) => [...prev, data.branch])
      setIsAddOpen(false)
      startTransition(() => {
        router.refresh()
      })
    } catch (err: any) {
      setFormError(err.message || 'Error creating branch')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editBranch) return

    setFormError(null)
    setIsSubmitting(true)

    try {
      const res = await fetch(`/api/branches/${editBranch.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          address: editAddress,
          contactInfo: editContact,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update branch')
      }

      setBranches((prev) =>
        prev.map((b) => (b.id === editBranch.id ? { ...b, ...data.branch } : b))
      )
      setEditBranch(null)
      startTransition(() => {
        router.refresh()
      })
    } catch (err: any) {
      setFormError(err.message || 'Error updating branch')
    } finally {
      setIsSubmitting(false)
    }
  }

  const totalStaff = branches.reduce((sum, b) => sum + b.staffCount, 0)
  const totalStock = branches.reduce((sum, b) => sum + b.stockCount, 0)
  const assignedManagers = branches.filter((b) => b.assignedManagerName).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-6)', width: '100%' }}>
      {/* KPI Cards Row */}
      <section
        aria-label="Branch Metrics"
        className="responsive-kpi-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 'var(--ds-space-4)',
        }}
      >
        <article
          className="route-card"
          style={{
            boxShadow: 'none',
            padding: 'var(--ds-space-5)',
            borderLeft: '4px solid #d97706',
            backgroundColor: 'var(--ds-color-surface-container-lowest)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 800, textTransform: 'uppercase', color: '#d97706' }}>
              Active Locations
            </span>
            <span style={{ padding: '6px', borderRadius: '50%', background: 'rgba(217, 119, 6, 0.1)' }}>
              <Store size={18} color="#d97706" />
            </span>
          </div>
          <h3 style={{ margin: '8px 0 2px 0', fontSize: '1.75rem', fontWeight: 800 }}>
            {branches.length}
          </h3>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--ds-color-on-surface-variant)' }}>
            Physical business branches
          </p>
        </article>

        <article
          className="route-card"
          style={{
            boxShadow: 'none',
            padding: 'var(--ds-space-5)',
            borderLeft: '4px solid #2563eb',
            backgroundColor: 'var(--ds-color-surface-container-lowest)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 800, textTransform: 'uppercase', color: '#2563eb' }}>
              Branch Managers
            </span>
            <span style={{ padding: '6px', borderRadius: '50%', background: 'rgba(37, 99, 235, 0.1)' }}>
              <Building size={18} color="#2563eb" />
            </span>
          </div>
          <h3 style={{ margin: '8px 0 2px 0', fontSize: '1.75rem', fontWeight: 800 }}>
            {assignedManagers} / {branches.length}
          </h3>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--ds-color-on-surface-variant)' }}>
            Branches with assigned leadership
          </p>
        </article>

        <article
          className="route-card"
          style={{
            boxShadow: 'none',
            padding: 'var(--ds-space-5)',
            borderLeft: '4px solid #16a34a',
            backgroundColor: 'var(--ds-color-surface-container-lowest)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 800, textTransform: 'uppercase', color: '#16a34a' }}>
              Deployed Staff
            </span>
            <span style={{ padding: '6px', borderRadius: '50%', background: 'rgba(22, 163, 74, 0.1)' }}>
              <Users size={18} color="#16a34a" />
            </span>
          </div>
          <h3 style={{ margin: '8px 0 2px 0', fontSize: '1.75rem', fontWeight: 800 }}>
            {totalStaff}
          </h3>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--ds-color-on-surface-variant)' }}>
            Total branch access assignments
          </p>
        </article>

        <article
          className="route-card"
          style={{
            boxShadow: 'none',
            padding: 'var(--ds-space-5)',
            borderLeft: '4px solid #9333ea',
            backgroundColor: 'var(--ds-color-surface-container-lowest)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 800, textTransform: 'uppercase', color: '#9333ea' }}>
              Inventory Tracked
            </span>
            <span style={{ padding: '6px', borderRadius: '50%', background: 'rgba(147, 51, 234, 0.1)' }}>
              <Package size={18} color="#9333ea" />
            </span>
          </div>
          <h3 style={{ margin: '8px 0 2px 0', fontSize: '1.75rem', fontWeight: 800 }}>
            {totalStock}
          </h3>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--ds-color-on-surface-variant)' }}>
            Distinct stock item records
          </p>
        </article>
      </section>

      {/* Main Action Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--ds-space-3)',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 800, margin: 0, color: 'var(--ds-color-on-surface)' }}>
            Physical Store Locations
          </h2>
          <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: 'var(--ds-color-on-surface-variant)' }}>
            {isOwner
              ? 'Manage branch storefronts, configure addresses, and monitor branch capacity'
              : 'Details for your assigned physical branch location'}
          </p>
        </div>

        {isOwner && (
          <button
            type="button"
            onClick={handleOpenAdd}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: 'var(--ds-radius-md)',
              backgroundColor: 'var(--ds-color-primary)',
              color: '#ffffff',
              fontSize: '0.8125rem',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
            }}
          >
            <Plus size={16} />
            <span>Add New Branch</span>
          </button>
        )}
      </div>

      {/* Branches Grid */}
      <section
        aria-label="Branches List"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 'var(--ds-space-4)',
        }}
      >
        {branches.map((b) => (
          <article
            key={b.id}
            className="route-card"
            style={{
              boxShadow: 'none',
              padding: 'var(--ds-space-5)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 'var(--ds-space-4)',
              backgroundColor: 'var(--ds-color-surface-container-lowest)',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      padding: '8px',
                      borderRadius: 'var(--ds-radius-md)',
                      backgroundColor: 'rgba(217, 119, 6, 0.1)',
                      color: '#d97706',
                    }}
                  >
                    <Store size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 800, color: 'var(--ds-color-on-surface)' }}>
                      {b.name}
                    </h3>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--ds-color-on-surface-variant)' }}>
                      Added {new Date(b.createdAt).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                {isOwner && (
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(b)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '5px 10px',
                      borderRadius: 'var(--ds-radius-sm)',
                      border: '1px solid var(--ds-color-outline-variant)',
                      backgroundColor: 'var(--ds-color-surface-container-low)',
                      color: 'var(--ds-color-on-surface)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <Edit2 size={13} />
                    <span>Edit</span>
                  </button>
                )}
              </div>

              {/* Branch Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: 'var(--ds-space-3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', color: 'var(--ds-color-on-surface-variant)' }}>
                  <MapPin size={15} color="var(--ds-color-primary)" style={{ flexShrink: 0 }} />
                  <span>{b.address || 'No physical address configured'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', color: 'var(--ds-color-on-surface-variant)' }}>
                  <Phone size={15} color="var(--ds-color-primary)" style={{ flexShrink: 0 }} />
                  <span>{b.contactInfo || 'No phone or email configured'}</span>
                </div>
              </div>
            </div>

            {/* Manager and Operational Stats */}
            <div
              style={{
                paddingTop: 'var(--ds-space-3)',
                borderTop: '1px solid var(--ds-color-outline-variant)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--ds-space-2)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                <span style={{ color: 'var(--ds-color-on-surface-variant)' }}>Assigned Manager:</span>
                <span
                  style={{
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 'var(--ds-radius-sm)',
                    backgroundColor: b.assignedManagerName ? 'rgba(37, 99, 235, 0.1)' : 'var(--ds-color-surface-container-low)',
                    color: b.assignedManagerName ? '#2563eb' : 'var(--ds-color-on-surface-variant)',
                  }}
                >
                  {b.assignedManagerName ? b.assignedManagerEmail : 'Unassigned'}
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 'var(--ds-space-2)',
                  backgroundColor: 'var(--ds-color-surface-container-low)',
                  padding: '8px',
                  borderRadius: 'var(--ds-radius-md)',
                  textAlign: 'center',
                }}
              >
                <div>
                  <span style={{ display: 'block', fontSize: '0.9375rem', fontWeight: 800 }}>{b.staffCount}</span>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--ds-color-on-surface-variant)' }}>Staff</span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.9375rem', fontWeight: 800 }}>{b.stockCount}</span>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--ds-color-on-surface-variant)' }}>Items</span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.9375rem', fontWeight: 800 }}>{b.invoiceCount}</span>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--ds-color-on-surface-variant)' }}>Invoices</span>
                </div>
              </div>
            </div>
          </article>
        ))}
      </section>

      {/* ==================================================== */}
      {/* MODAL 1: ADD NEW BRANCH (WITH CLOSE X ICON)          */}
      {/* ==================================================== */}
      {isAddOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
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
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--ds-space-3)' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 800, margin: 0, color: 'var(--ds-color-on-surface)' }}>
                Add Physical Branch
              </h2>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
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

            {formError && (
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--ds-radius-sm)',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: '#dc2626',
                  fontSize: '0.8125rem',
                  marginBottom: 'var(--ds-space-3)',
                }}
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-3)' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>
                  Branch Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ikeja Central Store"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--ds-radius-sm)',
                    border: '1px solid var(--ds-color-outline-variant)',
                    backgroundColor: 'var(--ds-color-background)',
                    fontSize: '0.8125rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>
                  Physical Address
                </label>
                <input
                  type="text"
                  placeholder="Street, City, State"
                  value={addAddress}
                  onChange={(e) => setAddAddress(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--ds-radius-sm)',
                    border: '1px solid var(--ds-color-outline-variant)',
                    backgroundColor: 'var(--ds-color-background)',
                    fontSize: '0.8125rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>
                  Contact Information
                </label>
                <input
                  type="text"
                  placeholder="Phone number, branch email"
                  value={addContact}
                  onChange={(e) => setAddContact(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--ds-radius-sm)',
                    border: '1px solid var(--ds-color-outline-variant)',
                    backgroundColor: 'var(--ds-color-background)',
                    fontSize: '0.8125rem',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: 'var(--ds-space-2)' }}>
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 'var(--ds-radius-sm)',
                    border: '1px solid var(--ds-color-outline-variant)',
                    backgroundColor: 'transparent',
                    fontSize: '0.8125rem',
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
                    backgroundColor: 'var(--ds-color-primary)',
                    color: '#ffffff',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    cursor: isSubmitting ? 'wait' : 'pointer',
                  }}
                >
                  {isSubmitting ? 'Creating...' : 'Create Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 2: EDIT BRANCH (WITH CLOSE X ICON)             */}
      {/* ==================================================== */}
      {editBranch && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
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
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--ds-space-3)' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 800, margin: 0, color: 'var(--ds-color-on-surface)' }}>
                Edit Branch: {editBranch.name}
              </h2>
              <button
                type="button"
                onClick={() => setEditBranch(null)}
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

            {formError && (
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--ds-radius-sm)',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: '#dc2626',
                  fontSize: '0.8125rem',
                  marginBottom: 'var(--ds-space-3)',
                }}
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-3)' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>
                  Branch Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--ds-radius-sm)',
                    border: '1px solid var(--ds-color-outline-variant)',
                    backgroundColor: 'var(--ds-color-background)',
                    fontSize: '0.8125rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>
                  Physical Address
                </label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--ds-radius-sm)',
                    border: '1px solid var(--ds-color-outline-variant)',
                    backgroundColor: 'var(--ds-color-background)',
                    fontSize: '0.8125rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>
                  Contact Information
                </label>
                <input
                  type="text"
                  value={editContact}
                  onChange={(e) => setEditContact(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--ds-radius-sm)',
                    border: '1px solid var(--ds-color-outline-variant)',
                    backgroundColor: 'var(--ds-color-background)',
                    fontSize: '0.8125rem',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: 'var(--ds-space-2)' }}>
                <button
                  type="button"
                  onClick={() => setEditBranch(null)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 'var(--ds-radius-sm)',
                    border: '1px solid var(--ds-color-outline-variant)',
                    backgroundColor: 'transparent',
                    fontSize: '0.8125rem',
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
                    backgroundColor: 'var(--ds-color-primary)',
                    color: '#ffffff',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    cursor: isSubmitting ? 'wait' : 'pointer',
                  }}
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

