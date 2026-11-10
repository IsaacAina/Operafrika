'use client'

import React, { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users,
  UserPlus,
  Wallet,
  DollarSign,
  Calendar,
  Store,
  X,
  FileText,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Edit2,
  Lock,
  Briefcase,
  AlertCircle,
  Building,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import type { StaffMemberDetail, PayrollRecordDetail } from '@/lib/staff'
import { Role, InvoiceStatus } from '@prisma/client'

interface BranchOption {
  id: string
  name: string
}

interface PayrollMetrics {
  totalAmount: number
  totalPaid: number
  totalUnpaid: number
  totalRecords: number
}

interface StaffViewProps {
  initialStaff: StaffMemberDetail[]
  initialPayroll: PayrollRecordDetail[]
  payrollMetrics: PayrollMetrics
  branches: BranchOption[]
  selectedBranchId?: string
  currency: string
  userRole: string
  userEmail: string
}

export default function StaffView({
  initialStaff,
  initialPayroll,
  payrollMetrics,
  branches,
  selectedBranchId,
  currency,
  userRole,
  userEmail,
}: StaffViewProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // State
  const [activeTab, setActiveTab] = useState<'roster' | 'payroll'>('roster')
  const [staffList, setStaffList] = useState<StaffMemberDetail[]>(initialStaff)
  const [payrollList, setPayrollList] = useState<PayrollRecordDetail[]>(initialPayroll)

  useEffect(() => {
    setStaffList(initialStaff)
  }, [initialStaff])

  useEffect(() => {
    setPayrollList(initialPayroll)
  }, [initialPayroll])
  const [searchQuery, setSearchQuery] = useState('')

  // Modals
  const [showAddStaffModal, setShowAddStaffModal] = useState(false)
  const [showEditStaffModal, setShowEditStaffModal] = useState(false)
  const [showAddPayrollModal, setShowAddPayrollModal] = useState(false)
  const [deletingMember, setDeletingMember] = useState<StaffMemberDetail | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedStaffToEdit, setSelectedStaffToEdit] = useState<StaffMemberDetail | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Add Staff Form
  const [addEmail, setAddEmail] = useState('')
  const [addPassword, setAddPassword] = useState('')
  const [addRole, setAddRole] = useState<'MANAGER' | 'STAFF'>('STAFF')
  const [addBranchId, setAddBranchId] = useState(selectedBranchId || branches[0]?.id || '')

  // Edit Staff Form
  const [editRole, setEditRole] = useState<'MANAGER' | 'STAFF'>('STAFF')
  const [editBranchId, setEditBranchId] = useState('')

  // Add Payroll Form
  const [payrollUserId, setPayrollUserId] = useState(initialStaff[0]?.id || '')
  const [payrollPeriod, setPayrollPeriod] = useState(new Date().toISOString().slice(0, 7)) // YYYY-MM
  const [payrollAmount, setPayrollAmount] = useState('')
  const [payrollStatus, setPayrollStatus] = useState<'UNPAID' | 'PAID'>('PAID')

  const isOwner = userRole === 'OWNER'
  const isManager = userRole === 'MANAGER'
  const isStaff = userRole === 'STAFF'

  const formatMoney = (amount: number) => {
    return `${currency} ${amount.toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  // Branch Scope navigation
  const handleBranchChange = (branchId?: string) => {
    startTransition(() => {
      const url = new URL(window.location.href)
      if (branchId) {
        url.searchParams.set('branch', branchId)
      } else {
        url.searchParams.delete('branch')
      }
      router.push(url.pathname + url.search)
    })
  }

  // Staff search filter
  const filteredStaff = staffList.filter((s) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase().trim()
    return s.email.toLowerCase().includes(q) || (s.branchName && s.branchName.toLowerCase().includes(q))
  })

  // Submit Add Staff
  const handleAddStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!addEmail || !addEmail.includes('@')) {
      setFormError('Please enter a valid email address.')
      return
    }
    if (addPassword.length < 8) {
      setFormError('Password must be at least 8 characters.')
      return
    }
    if (!addBranchId) {
      setFormError('Please select a branch assignment.')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: addEmail,
          password: addPassword,
          role: addRole,
          branchId: addBranchId,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setFormError(data.error || 'Failed to add staff member.')
        setIsSubmitting(false)
        return
      }

      setShowAddStaffModal(false)
      setAddEmail('')
      setAddPassword('')

      if (data.staff) {
        setStaffList((prev) => [data.staff, ...prev])
      }

      router.refresh()
    } catch {
      setFormError('An unexpected network error occurred.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Open Edit Modal
  const openEditModal = (member: StaffMemberDetail) => {
    setSelectedStaffToEdit(member)
    setEditRole(member.role === 'MANAGER' ? 'MANAGER' : 'STAFF')
    setEditBranchId(member.branchId || branches[0]?.id || '')
    setFormError(null)
    setShowEditStaffModal(true)
  }

  // Submit Edit Staff
  const handleEditStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStaffToEdit) return
    setFormError(null)

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/staff/${selectedStaffToEdit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: editRole,
          branchId: editBranchId,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setFormError(data.error || 'Failed to update staff member.')
        setIsSubmitting(false)
        return
      }

      setShowEditStaffModal(false)

      if (data.staff) {
        setStaffList((prev) => prev.map((s) => (s.id === data.staff.id ? data.staff : s)))
      }

      router.refresh()
    } catch {
      setFormError('An unexpected network error occurred.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Submit Delete / Remove Staff
  const handleDeleteStaff = async () => {
    if (!deletingMember) return
    setIsDeleting(true)
    setFormError(null)
    try {
      const res = await fetch(`/api/staff/${deletingMember.id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 404) {
          // Member was already soft-deleted in database; clean up local view
          setStaffList((prev) => prev.filter((s) => s.id !== deletingMember.id))
          setDeletingMember(null)
          router.refresh()
          return
        }
        alert(data.error || 'Failed to remove team member.')
        setIsDeleting(false)
        return
      }
      setStaffList((prev) => prev.filter((s) => s.id !== deletingMember.id))
      setDeletingMember(null)
      router.refresh()
    } catch {
      alert('Network error while removing team member.')
    } finally {
      setIsDeleting(false)
    }
  }

  // Submit Add Payroll Record
  const handleAddPayrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const amount = parseFloat(payrollAmount)
    if (isNaN(amount) || amount <= 0) {
      setFormError('Salary amount must be greater than zero.')
      return
    }
    if (!payrollUserId) {
      setFormError('Please select a team member.')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: payrollUserId,
          payPeriod: payrollPeriod,
          salaryAmount: amount,
          status: payrollStatus,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setFormError(data.error || 'Failed to record payroll compensation.')
        setIsSubmitting(false)
        return
      }

      setShowAddPayrollModal(false)
      setPayrollAmount('')
      if (data.record) {
        setPayrollList((prev) => [data.record, ...prev])
      }
      router.refresh()
    } catch {
      setFormError('An unexpected network error occurred.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Toggle Payroll Status
  const handleTogglePayrollStatus = async (record: PayrollRecordDetail) => {
    const newStatus = record.status === InvoiceStatus.PAID ? InvoiceStatus.UNPAID : InvoiceStatus.PAID
    try {
      const res = await fetch(`/api/payroll/${record.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Failed to update payroll status.')
        return
      }
      setPayrollList(payrollList.map((p) => (p.id === record.id ? data.record : p)))
      router.refresh()
    } catch {
      alert('Network error while updating status.')
    }
  }

  if (isStaff) {
    return (
      <div
        role="alert"
        style={{
          padding: 'var(--ds-space-6)',
          background: 'var(--ds-surface)',
          border: '1px solid #ef4444',
          borderRadius: 'var(--ds-radius-lg)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 'var(--ds-space-3)',
        }}
      >
        <ShieldAlert size={48} color="#ef4444" />
        <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#dc2626' }}>
          Access Restricted
        </h2>
        <p style={{ margin: 0, color: 'var(--ds-text-secondary)', maxWidth: '480px', fontSize: '14px' }}>
          According to the Operafrika Permission Matrix, Staff accounts do not have access to Team Roster or Payroll records. Staff members create sales and view stock for their assigned branch only.
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-6)', width: '100%' }}>
      {/* Scope Navigation & Top Tab Bar */}
      <section
        aria-label="Staff navigation and scope"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--ds-space-3)',
          backgroundColor: 'var(--ds-color-surface-container-lowest)',
          padding: 'var(--ds-space-4)',
          borderRadius: 'var(--ds-radius-xl)',
          border: '1px solid var(--ds-color-outline-variant)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 'var(--ds-space-3)',
          }}
        >
          {/* Module Switcher Tabs (Segmented Control) */}
          <div
            style={{
              display: 'flex',
              gap: '6px',
              backgroundColor: 'var(--ds-color-surface-container-low)',
              padding: '4px',
              borderRadius: 'var(--ds-radius-lg)',
              border: '1px solid var(--ds-color-outline-variant)',
              flex: '1 1 280px',
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('roster')}
              style={{
                flex: 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '9px 16px',
                borderRadius: 'var(--ds-radius-md)',
                fontSize: '0.8125rem',
                fontWeight: activeTab === 'roster' ? 700 : 600,
                backgroundColor: activeTab === 'roster' ? 'var(--ds-color-primary)' : 'transparent',
                color: activeTab === 'roster' ? '#ffffff' : 'var(--ds-color-on-surface)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                minHeight: '40px',
              }}
            >
              <Users size={16} /> Team Roster ({staffList.length})
            </button>

            {isOwner && (
              <button
                type="button"
                onClick={() => setActiveTab('payroll')}
                style={{
                  flex: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '9px 16px',
                  borderRadius: 'var(--ds-radius-md)',
                  fontSize: '0.8125rem',
                  fontWeight: activeTab === 'payroll' ? 700 : 600,
                  backgroundColor: activeTab === 'payroll' ? '#9333ea' : 'transparent',
                  color: activeTab === 'payroll' ? '#ffffff' : 'var(--ds-color-on-surface)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  minHeight: '40px',
                }}
              >
                <Wallet size={16} /> Payroll ({payrollList.length})
              </button>
            )}

            {isManager && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  borderRadius: 'var(--ds-radius-md)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--ds-color-on-surface-variant)',
                }}
              >
                <Lock size={13} /> Payroll (Owner Confidential)
              </span>
            )}
          </div>
        </div>

        {/* Branch Scope Selector (Owner only) */}
        {isOwner && branches.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', paddingTop: '8px', borderTop: '1px solid var(--ds-color-outline-variant)' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--ds-color-on-surface-variant)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Store size={14} /> Branch Scope:
            </span>
            <button
              type="button"
              onClick={() => handleBranchChange(undefined)}
              style={{
                padding: '4px 12px',
                borderRadius: 'var(--ds-radius-full)',
                fontSize: '0.75rem',
                fontWeight: !selectedBranchId ? 700 : 500,
                backgroundColor: !selectedBranchId ? 'var(--ds-color-primary)' : 'transparent',
                color: !selectedBranchId ? 'var(--ds-color-on-primary)' : 'var(--ds-color-on-surface)',
                border: '1px solid',
                borderColor: !selectedBranchId ? 'var(--ds-color-primary)' : 'var(--ds-color-outline-variant)',
                cursor: 'pointer',
              }}
            >
              All Branches
            </button>
            {branches.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => handleBranchChange(b.id)}
                style={{
                  padding: '4px 12px',
                  borderRadius: 'var(--ds-radius-full)',
                  fontSize: '0.75rem',
                  fontWeight: selectedBranchId === b.id ? 700 : 500,
                  backgroundColor: selectedBranchId === b.id ? 'var(--ds-color-primary)' : 'transparent',
                  color: selectedBranchId === b.id ? 'var(--ds-color-on-primary)' : 'var(--ds-color-on-surface)',
                  border: '1px solid',
                  borderColor: selectedBranchId === b.id ? 'var(--ds-color-primary)' : 'var(--ds-color-outline-variant)',
                  cursor: 'pointer',
                }}
              >
                {b.name}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ==================================================== */}
      {/* TAB 1: TEAM & STAFF DIRECTORY                       */}
      {/* ==================================================== */}
      {activeTab === 'roster' && (
        <section
          className="roster-card-container"
          style={{
            backgroundColor: 'var(--ds-color-surface-container-lowest)',
            border: '1px solid var(--ds-color-outline-variant)',
            borderRadius: 'var(--ds-radius-xl)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header & Search */}
          <div
            className="roster-section-header"
            style={{
              padding: 'var(--ds-space-4) var(--ds-space-5)',
              borderBottom: '1px solid var(--ds-color-outline-variant)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 'var(--ds-space-3)',
            }}
          >
            <div className="roster-header-title-block">
              <div className="roster-header-top-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 style={{ fontSize: '1.0625rem', fontWeight: 800, margin: 0, color: 'var(--ds-color-on-surface)' }}>
                    Active Team Roster
                  </h2>
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 'var(--ds-radius-full)',
                      backgroundColor: 'var(--ds-color-surface-container-high)',
                      color: 'var(--ds-color-on-surface-variant)',
                    }}
                  >
                    {filteredStaff.length} {filteredStaff.length === 1 ? 'member' : 'members'}
                  </span>
                </div>
              </div>
              <p className="roster-header-subtitle" style={{ margin: '2px 0 0', fontSize: '0.8125rem', color: 'var(--ds-color-on-surface-variant)' }}>
                {isManager ? 'Branch team members assigned to your location' : 'All accounts and role assignments across the business'}
              </p>
            </div>

            <div className="roster-toolbar-container">
              <div className="roster-search-wrapper" style={{ position: 'relative', width: '100%' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--ds-color-on-surface-variant)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '16px',
                    height: '16px',
                    pointerEvents: 'none',
                  }}
                >
                  <Search size={16} />
                </span>
                <input
                  type="text"
                  className="roster-search-input"
                  placeholder="Search staff by email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    height: '38px',
                    minHeight: '38px',
                    padding: '8px 12px 8px 36px',
                    borderRadius: 'var(--ds-radius-md)',
                    border: '1px solid var(--ds-color-outline-variant)',
                    backgroundColor: 'var(--ds-color-surface-container-low)',
                    fontSize: '0.8125rem',
                    color: 'var(--ds-color-on-surface)',
                    boxSizing: 'border-box',
                    outline: 'none',
                    lineHeight: '1.4',
                  }}
                />
              </div>

              {isOwner && (
                <button
                  type="button"
                  className="roster-add-staff-btn"
                  onClick={() => {
                    setAddBranchId(selectedBranchId || branches[0]?.id || '')
                    setFormError(null)
                    setShowAddStaffModal(true)
                  }}
                >
                  <UserPlus size={15} /> Add Team Member
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="desktop-table-container" style={{ overflowX: 'auto', width: '100%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--ds-color-surface-container-low)', borderBottom: '1px solid var(--ds-color-outline-variant)' }}>
                  <th scope="col" style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--ds-color-on-surface-variant)' }}>Email</th>
                  <th scope="col" style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--ds-color-on-surface-variant)' }}>Role</th>
                  <th scope="col" style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--ds-color-on-surface-variant)' }}>Assigned Branch</th>
                  <th scope="col" style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--ds-color-on-surface-variant)' }}>Status</th>
                  <th scope="col" style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--ds-color-on-surface-variant)' }}>Joined Date</th>
                  {isOwner && <th scope="col" style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--ds-color-on-surface-variant)', textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--ds-color-on-surface-variant)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--ds-space-3)' }}>
                        <div
                          style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--ds-color-surface-container-low)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Users size={24} color="var(--ds-color-primary)" />
                        </div>
                        <div>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: 'var(--ds-color-on-surface)' }}>
                            No team members found
                          </p>
                          <p style={{ margin: '4px 0 0', fontSize: '0.8125rem', color: 'var(--ds-color-on-surface-variant)' }}>
                            {searchQuery ? 'No staff match your search criteria.' : 'Start adding Branch Managers and Staff to manage branch operations.'}
                          </p>
                        </div>
                        {isOwner && (
                          <button
                            type="button"
                            onClick={() => {
                              setAddBranchId(selectedBranchId || branches[0]?.id || '')
                              setFormError(null)
                              setShowAddStaffModal(true)
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '10px 20px',
                              borderRadius: 'var(--ds-radius-md)',
                              backgroundColor: 'var(--ds-color-primary)',
                              color: 'var(--ds-color-on-primary)',
                              fontWeight: 700,
                              fontSize: '0.875rem',
                              border: 'none',
                              cursor: 'pointer',
                              marginTop: 'var(--ds-space-2)',
                              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                            }}
                          >
                            <UserPlus size={16} /> Add Team Member
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((member) => {
                    const isCurrentUser = member.email === userEmail
                    const roleColor =
                      member.role === 'OWNER' ? '#9333ea' : member.role === 'MANAGER' ? '#2563eb' : '#059669'
                    const initialLetter = member.email.charAt(0).toUpperCase()
                    return (
                      <tr key={member.id} style={{ borderBottom: '1px solid var(--ds-color-outline-variant)' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--ds-color-on-surface)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: 'var(--ds-radius-full)',
                                backgroundColor: `${roleColor}18`,
                                color: roleColor,
                                fontWeight: 800,
                                fontSize: '0.8125rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: `1px solid ${roleColor}30`,
                                flexShrink: 0,
                              }}
                            >
                              {initialLetter}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--ds-color-on-surface)' }}>
                                {member.email}
                              </span>
                              {isCurrentUser && (
                                <span style={{ fontSize: '0.6875rem', color: 'var(--ds-color-on-surface-variant)', fontWeight: 500 }}>
                                  (Current Session)
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: 'var(--ds-radius-full)',
                              fontSize: '0.6875rem',
                              fontWeight: 700,
                              backgroundColor: `${roleColor}15`,
                              color: roleColor,
                              letterSpacing: '0.04em',
                            }}
                          >
                            <Briefcase size={11} /> {member.role}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--ds-color-on-surface-variant)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem' }}>
                            <Building size={14} color="var(--ds-color-primary)" />
                            <span>{member.branchName || 'All Branches'}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              color: member.isEmailVerified ? '#16a34a' : '#ca8a04',
                            }}
                          >
                            <CheckCircle2 size={13} /> {member.isEmailVerified ? 'Active' : 'Pending'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--ds-color-on-surface-variant)', fontSize: '0.8125rem' }}>
                          {new Date(member.createdAt).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        {isOwner && (
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            {member.role !== 'OWNER' && (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <button
                                  type="button"
                                  onClick={() => openEditModal(member)}
                                  title="Edit Role / Branch"
                                  style={{
                                    padding: '6px 12px',
                                    borderRadius: 'var(--ds-radius-md)',
                                    border: '1px solid var(--ds-color-outline-variant)',
                                    backgroundColor: 'var(--ds-color-surface-container-low)',
                                    color: 'var(--ds-color-on-surface)',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    transition: 'background-color 0.15s ease',
                                  }}
                                >
                                  <Edit2 size={12} /> Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingMember(member)}
                                  title="Remove team member"
                                  style={{
                                    padding: '6px 12px',
                                    borderRadius: 'var(--ds-radius-md)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    backgroundColor: 'rgba(239, 68, 68, 0.06)',
                                    color: '#dc2626',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    transition: 'all 0.15s ease',
                                  }}
                                >
                                  <Trash2 size={12} /> Remove
                                </button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Staff Cards (Zero Horizontal Scroll on Mobile View) */}
          <div className="mobile-cards-container" style={{ display: 'none', flexDirection: 'column', gap: '10px', padding: '12px 14px' }}>
            {filteredStaff.length === 0 ? (
              <div style={{ padding: '24px 14px', textAlign: 'center', color: 'var(--ds-color-on-surface-variant)' }}>
                <Users size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                <p style={{ margin: 0, fontWeight: 700 }}>No team members found</p>
                <p style={{ margin: '4px 0 0', fontSize: '0.8125rem', color: 'var(--ds-color-on-surface-variant)' }}>
                  {searchQuery ? 'Try adjusting your search query.' : 'Add branch staff or managers to get started.'}
                </p>
              </div>
            ) : (
              filteredStaff.map((member) => {
                const initials = member.email.slice(0, 2).toUpperCase()
                const isCurrentUser = member.email === userEmail
                const roleColor =
                  member.role === 'OWNER' ? '#9333ea' : member.role === 'MANAGER' ? '#2563eb' : '#059669'
                return (
                  <div
                    key={`mobile-${member.id}`}
                    style={{
                      backgroundColor: 'var(--ds-color-surface-container-lowest)',
                      border: '1px solid var(--ds-color-outline-variant)',
                      borderRadius: 'var(--ds-radius-xl)',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                    }}
                  >
                    {/* Header Row: Avatar, Email, Role */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            backgroundColor: `${roleColor}15`,
                            color: roleColor,
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
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--ds-color-on-surface)', wordBreak: 'break-all', display: 'block', lineHeight: 1.3 }}>
                            {member.email}
                          </span>
                          {isCurrentUser && (
                            <span style={{ display: 'inline-block', fontSize: '0.6875rem', fontWeight: 600, color: 'var(--ds-color-primary)', marginTop: '2px' }}>
                              (Current Session)
                            </span>
                          )}
                        </div>
                      </div>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: 'var(--ds-radius-full)',
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          backgroundColor: `${roleColor}15`,
                          color: roleColor,
                          flexShrink: 0,
                          letterSpacing: '0.04em',
                        }}
                      >
                        <Briefcase size={11} /> {member.role}
                      </span>
                    </div>

                    {/* Metadata Box: Branch, Status, Joined Date */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        padding: '10px 12px',
                        borderRadius: 'var(--ds-radius-md)',
                        backgroundColor: 'var(--ds-color-surface-container-low)',
                        fontSize: '0.75rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--ds-color-on-surface-variant)' }}>
                          <Building size={13} color="var(--ds-color-primary)" />
                          <span style={{ fontWeight: 600, color: 'var(--ds-color-on-surface)' }}>{member.branchName || 'All Branches'}</span>
                        </span>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontWeight: 600,
                            color: member.isEmailVerified ? '#16a34a' : '#ca8a04',
                          }}
                        >
                          <CheckCircle2 size={12} /> {member.isEmailVerified ? 'Active' : 'Pending'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--ds-color-on-surface-variant)' }}>
                        <Calendar size={13} />
                        <span>Joined {new Date(member.createdAt).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                    </div>

                    {/* Actions Row */}
                    {isOwner && member.role !== 'OWNER' && (
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '4px' }}>
                        <button
                          type="button"
                          onClick={() => openEditModal(member)}
                          style={{
                            flex: 1,
                            minHeight: '40px',
                            padding: '8px 14px',
                            borderRadius: 'var(--ds-radius-md)',
                            border: '1px solid var(--ds-color-outline-variant)',
                            backgroundColor: 'var(--ds-color-surface-container-low)',
                            color: 'var(--ds-color-on-surface)',
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                          }}
                        >
                          <Edit2 size={13} /> Edit Role &amp; Branch
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingMember(member)}
                          style={{
                            minHeight: '40px',
                            padding: '8px 16px',
                            borderRadius: 'var(--ds-radius-md)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            backgroundColor: 'rgba(239, 68, 68, 0.06)',
                            color: '#dc2626',
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                          }}
                        >
                          <Trash2 size={13} /> Remove
                        </button>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </section>
      )}

      {/* ==================================================== */}
      {/* TAB 2: RECORD-ONLY PAYROLL (OWNER ONLY)              */}
      {/* ==================================================== */}
      {activeTab === 'payroll' && isOwner && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-6)' }}>
          {/* Information Notice */}
          <aside
            style={{
              padding: 'var(--ds-space-4)',
              backgroundColor: 'rgba(147, 51, 234, 0.08)',
              borderLeft: '4px solid #9333ea',
              borderRadius: 'var(--ds-radius-lg)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--ds-space-3)',
            }}
          >
            <Wallet size={24} color="#9333ea" />
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--ds-color-on-surface)', lineHeight: 1.5 }}>
              <strong>Record-Only Compensation:</strong> This payroll tracker logs salary overhead to accurately compute branch and consolidated Net Profit on the Profit &amp; Loss statement. In compliance with the MVP scope, no live money transfer or bank disbursement occurs here.
            </p>
          </aside>

          {/* Payroll KPI Cards */}
          <section
            aria-label="Payroll summary metrics"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 'var(--ds-space-4)',
            }}
          >
            <div
              style={{
                backgroundColor: 'var(--ds-color-surface-container-lowest)',
                border: '1px solid var(--ds-color-outline-variant)',
                borderLeft: '4px solid #9333ea',
                borderRadius: 'var(--ds-radius-xl)',
                padding: 'var(--ds-space-4)',
              }}
            >
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ds-color-on-surface-variant)' }}>
                Total Payroll
              </span>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--ds-color-on-surface)', marginTop: '4px', letterSpacing: '-0.02em' }}>
                {formatMoney(payrollMetrics.totalAmount)}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--ds-color-on-surface-variant)' }}>Cumulative recorded salaries</span>
            </div>

            <div
              style={{
                backgroundColor: 'var(--ds-color-surface-container-lowest)',
                border: '1px solid var(--ds-color-outline-variant)',
                borderLeft: '4px solid #16a34a',
                borderRadius: 'var(--ds-radius-xl)',
                padding: 'var(--ds-space-4)',
              }}
            >
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#16a34a' }}>
                Disbursed / Settled
              </span>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#16a34a', marginTop: '4px', letterSpacing: '-0.02em' }}>
                {formatMoney(payrollMetrics.totalPaid)}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--ds-color-on-surface-variant)' }}>Marked as paid</span>
            </div>

            <div
              style={{
                backgroundColor: 'var(--ds-color-surface-container-lowest)',
                border: '1px solid var(--ds-color-outline-variant)',
                borderLeft: `4px solid ${payrollMetrics.totalUnpaid > 0 ? '#dc2626' : 'var(--ds-color-outline-variant)'}`,
                borderRadius: 'var(--ds-radius-xl)',
                padding: 'var(--ds-space-4)',
              }}
            >
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: payrollMetrics.totalUnpaid > 0 ? '#dc2626' : 'var(--ds-color-on-surface-variant)' }}>
                Pending Accrual
              </span>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: payrollMetrics.totalUnpaid > 0 ? '#dc2626' : 'var(--ds-color-on-surface)', marginTop: '4px', letterSpacing: '-0.02em' }}>
                {formatMoney(payrollMetrics.totalUnpaid)}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--ds-color-on-surface-variant)' }}>Unpaid salary balances</span>
            </div>

            <div
              style={{
                backgroundColor: 'var(--ds-color-surface-container-lowest)',
                border: '1px solid var(--ds-color-outline-variant)',
                borderLeft: '4px solid var(--ds-color-primary)',
                borderRadius: 'var(--ds-radius-xl)',
                padding: 'var(--ds-space-4)',
              }}
            >
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ds-color-primary)' }}>
                Payroll Entries
              </span>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--ds-color-on-surface)', marginTop: '4px', letterSpacing: '-0.02em' }}>
                {payrollMetrics.totalRecords}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--ds-color-on-surface-variant)' }}>Total period salary logs</span>
            </div>
          </section>

          {/* Payroll Table */}
          <section
            className="roster-card-container"
            style={{
              backgroundColor: 'var(--ds-color-surface-container-lowest)',
              border: '1px solid var(--ds-color-outline-variant)',
              borderRadius: 'var(--ds-radius-xl)',
              overflow: 'hidden',
            }}
          >
            <div
              className="roster-section-header"
              style={{
                padding: 'var(--ds-space-4) var(--ds-space-5)',
                borderBottom: '1px solid var(--ds-color-outline-variant)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 'var(--ds-space-3)',
              }}
            >
              <div>
                <h2 style={{ fontSize: '1.0625rem', fontWeight: 800, margin: 0, color: 'var(--ds-color-on-surface)' }}>
                  Salary Compensation Records
                </h2>
                <p style={{ margin: '2px 0 0', fontSize: '0.8125rem', color: 'var(--ds-color-on-surface-variant)' }}>
                  Disbursement history and recorded compensation logs across branches
                </p>
              </div>

              {isOwner && (
                <button
                  type="button"
                  className="roster-add-staff-btn"
                  onClick={() => {
                    setPayrollUserId(staffList[0]?.id || '')
                    setPayrollPeriod(new Date().toISOString().slice(0, 7))
                    setPayrollAmount('')
                    setFormError(null)
                    setShowAddPayrollModal(true)
                  }}
                  style={{
                    backgroundColor: '#9333ea',
                    color: '#ffffff',
                  }}
                >
                  <Plus size={16} /> Record Compensation
                </button>
              )}
            </div>

            <div className="desktop-table-container" style={{ overflowX: 'auto', width: '100%' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--ds-color-surface-container-low)', borderBottom: '1px solid var(--ds-color-outline-variant)' }}>
                    <th scope="col" style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--ds-color-on-surface-variant)' }}>Staff Member</th>
                    <th scope="col" style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--ds-color-on-surface-variant)' }}>Branch</th>
                    <th scope="col" style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--ds-color-on-surface-variant)' }}>Pay Period</th>
                    <th scope="col" style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--ds-color-on-surface-variant)', textAlign: 'right' }}>Salary Amount</th>
                    <th scope="col" style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--ds-color-on-surface-variant)' }}>Status</th>
                    <th scope="col" style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--ds-color-on-surface-variant)' }}>Date Settled</th>
                    <th scope="col" style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--ds-color-on-surface-variant)', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payrollList.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--ds-color-on-surface-variant)' }}>
                        <Wallet size={32} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
                        <p style={{ margin: 0, fontWeight: 500 }}>No compensation records recorded yet.</p>
                      </td>
                    </tr>
                  ) : (
                    payrollList.map((record) => {
                      const isPaid = record.status === InvoiceStatus.PAID
                      return (
                        <tr key={record.id} style={{ borderBottom: '1px solid var(--ds-color-outline-variant)' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--ds-color-on-surface)' }}>
                            <div>{record.userEmail}</div>
                            <span style={{ fontSize: '0.6875rem', color: 'var(--ds-color-on-surface-variant)', textTransform: 'uppercase', fontWeight: 700 }}>
                              {record.userRole}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', color: 'var(--ds-color-on-surface-variant)' }}>
                            {record.branchName}
                          </td>
                          <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 700 }}>
                            {record.payPeriod}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--ds-color-on-surface)' }}>
                            {formatMoney(record.salaryAmount)}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '2px 8px',
                                borderRadius: 'var(--ds-radius-full)',
                                fontSize: '0.6875rem',
                                fontWeight: 700,
                                backgroundColor: isPaid ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                color: isPaid ? '#16a34a' : '#dc2626',
                              }}
                            >
                              {isPaid ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                              {record.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', color: 'var(--ds-color-on-surface-variant)' }}>
                            {record.datePaid ? new Date(record.datePaid).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <button
                              type="button"
                              onClick={() => handleTogglePayrollStatus(record)}
                              style={{
                                padding: '5px 12px',
                                borderRadius: 'var(--ds-radius-md)',
                                border: '1px solid var(--ds-color-outline-variant)',
                                backgroundColor: isPaid ? 'transparent' : '#16a34a',
                                color: isPaid ? 'var(--ds-color-on-surface)' : '#ffffff',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              {isPaid ? 'Mark Unpaid' : 'Mark Paid'}
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Payroll Cards (Zero Horizontal Scroll on Mobile View) */}
            <div className="mobile-cards-container" style={{ display: 'none', flexDirection: 'column', gap: '12px', padding: '12px' }}>
              {payrollList.length === 0 ? (
                <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--ds-color-on-surface-variant)' }}>
                  <Wallet size={32} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
                  <p style={{ margin: 0, fontWeight: 500 }}>No compensation records recorded yet.</p>
                </div>
              ) : (
                payrollList.map((record) => {
                  const isPaid = record.status === InvoiceStatus.PAID
                  return (
                    <div
                      key={`mobile-payroll-${record.id}`}
                      style={{
                        backgroundColor: 'var(--ds-color-surface-container-lowest)',
                        border: '1px solid var(--ds-color-outline-variant)',
                        borderRadius: 'var(--ds-radius-lg)',
                        padding: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--ds-color-on-surface)' }}>
                            {record.userEmail}
                          </span>
                          <span style={{ display: 'block', fontSize: '0.6875rem', color: 'var(--ds-color-on-surface-variant)', textTransform: 'uppercase', fontWeight: 700 }}>
                            {record.userRole} &middot; {record.branchName}
                          </span>
                        </div>
                        <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--ds-color-on-surface)' }}>
                          {formatMoney(record.salaryAmount)}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--ds-color-on-surface-variant)' }}>
                        <span>Period: <strong style={{ fontFamily: 'monospace' }}>{record.payPeriod}</strong></span>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 8px',
                            borderRadius: 'var(--ds-radius-full)',
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            backgroundColor: isPaid ? 'rgba(22, 163, 74, 0.1)' : 'rgba(220, 38, 38, 0.1)',
                            color: isPaid ? '#16a34a' : '#dc2626',
                          }}
                        >
                          {isPaid ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                          {isPaid ? 'Settled' : 'Pending'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px', paddingTop: '8px', borderTop: '1px solid var(--ds-color-outline-variant)' }}>
                        <button
                          type="button"
                          onClick={() => handleTogglePayrollStatus(record)}
                          style={{
                            padding: '6px 14px',
                            borderRadius: 'var(--ds-radius-md)',
                            border: '1px solid var(--ds-color-outline-variant)',
                            backgroundColor: isPaid ? 'transparent' : '#16a34a',
                            color: isPaid ? 'var(--ds-color-on-surface)' : '#ffffff',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {isPaid ? 'Mark Unpaid' : 'Mark Paid'}
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </section>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 1: ADD TEAM MEMBER (OWNER ONLY)                */}
      {/* ==================================================== */}
      {showAddStaffModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
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
              backgroundColor: 'var(--ds-color-surface-container-lowest)',
              border: '1px solid var(--ds-color-outline-variant)',
              borderRadius: 'var(--ds-radius-xl)',
              width: '100%',
              maxWidth: '480px',
              padding: 'var(--ds-space-6)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              maxHeight: '90dvh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--ds-space-4)' }}>
              <div>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 800, margin: 0, color: 'var(--ds-color-on-surface)' }}>
                  Add Team Member
                </h2>
                <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--ds-color-on-surface-variant)' }}>
                  Assign account credentials and branch scoping
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddStaffModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--ds-color-on-surface-variant)',
                  padding: '4px',
                  borderRadius: 'var(--ds-radius-sm)',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--ds-radius-md)',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: '#dc2626',
                  fontSize: '0.8125rem',
                  marginBottom: 'var(--ds-space-4)',
                }}
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleAddStaffSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-3)' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '6px', color: 'var(--ds-color-on-surface)' }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="staff@operafrika.com"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--ds-radius-md)',
                    border: '1px solid var(--ds-color-outline-variant)',
                    backgroundColor: 'var(--ds-color-surface-container-low)',
                    fontSize: '0.8125rem',
                    color: 'var(--ds-color-on-surface)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '6px', color: 'var(--ds-color-on-surface)' }}>
                  Temporary Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 8 characters"
                  value={addPassword}
                  onChange={(e) => setAddPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--ds-radius-md)',
                    border: '1px solid var(--ds-color-outline-variant)',
                    backgroundColor: 'var(--ds-color-surface-container-low)',
                    fontSize: '0.8125rem',
                    color: 'var(--ds-color-on-surface)',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--ds-space-3)' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '6px', color: 'var(--ds-color-on-surface)' }}>
                    Role *
                  </label>
                  <select
                    value={addRole}
                    onChange={(e) => setAddRole(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--ds-radius-md)',
                      border: '1px solid var(--ds-color-outline-variant)',
                      backgroundColor: 'var(--ds-color-surface-container-low)',
                      fontSize: '0.8125rem',
                      color: 'var(--ds-color-on-surface)',
                    }}
                  >
                    <option value="STAFF">Staff (Sales & View Stock)</option>
                    <option value="MANAGER">Manager (Full Branch Control)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '6px', color: 'var(--ds-color-on-surface)' }}>
                    Branch Assignment *
                  </label>
                  <select
                    value={addBranchId}
                    onChange={(e) => setAddBranchId(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--ds-radius-md)',
                      border: '1px solid var(--ds-color-outline-variant)',
                      backgroundColor: 'var(--ds-color-surface-container-low)',
                      fontSize: '0.8125rem',
                      color: 'var(--ds-color-on-surface)',
                    }}
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--ds-space-2)', marginTop: 'var(--ds-space-3)' }}>
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--ds-radius-md)',
                    border: '1px solid var(--ds-color-outline-variant)',
                    backgroundColor: 'transparent',
                    color: 'var(--ds-color-on-surface)',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
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
                    borderRadius: 'var(--ds-radius-md)',
                    border: 'none',
                    backgroundColor: 'var(--ds-color-primary)',
                    color: 'var(--ds-color-on-primary)',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                  }}
                >
                  {isSubmitting ? 'Adding...' : 'Add Team Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 2: EDIT TEAM MEMBER (OWNER ONLY)               */}
      {/* ==================================================== */}
      {showEditStaffModal && selectedStaffToEdit && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
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
              backgroundColor: 'var(--ds-color-surface-container-lowest)',
              border: '1px solid var(--ds-color-outline-variant)',
              borderRadius: 'var(--ds-radius-xl)',
              width: '100%',
              maxWidth: '440px',
              padding: 'var(--ds-space-6)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              maxHeight: '90dvh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--ds-space-3)' }}>
              <div>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 800, margin: 0, color: 'var(--ds-color-on-surface)' }}>
                  Edit Staff Assignment
                </h2>
                <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--ds-color-on-surface-variant)' }}>
                  Update role or physical branch assignment
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditStaffModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--ds-color-on-surface-variant)',
                  padding: '4px',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.8125rem', color: 'var(--ds-color-on-surface-variant)', margin: '0 0 var(--ds-space-4)' }}>
              Updating role and branch for <strong>{selectedStaffToEdit.email}</strong>
            </p>

            {formError && (
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--ds-radius-md)',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: '#dc2626',
                  fontSize: '0.8125rem',
                  marginBottom: 'var(--ds-space-4)',
                }}
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleEditStaffSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-3)' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '6px', color: 'var(--ds-color-on-surface)' }}>Role *</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--ds-radius-md)',
                    border: '1px solid var(--ds-color-outline-variant)',
                    backgroundColor: 'var(--ds-color-surface-container-low)',
                    fontSize: '0.8125rem',
                    color: 'var(--ds-color-on-surface)',
                  }}
                >
                  <option value="STAFF">Staff (Sales & View Stock)</option>
                  <option value="MANAGER">Manager (Full Branch Control)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '6px', color: 'var(--ds-color-on-surface)' }}>Assigned Branch *</label>
                <select
                  value={editBranchId}
                  onChange={(e) => setEditBranchId(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--ds-radius-md)',
                    border: '1px solid var(--ds-color-outline-variant)',
                    backgroundColor: 'var(--ds-color-surface-container-low)',
                    fontSize: '0.8125rem',
                    color: 'var(--ds-color-on-surface)',
                  }}
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--ds-space-2)', marginTop: 'var(--ds-space-2)' }}>
                <button
                  type="button"
                  onClick={() => setShowEditStaffModal(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--ds-radius-md)',
                    border: '1px solid var(--ds-color-outline-variant)',
                    backgroundColor: 'transparent',
                    color: 'var(--ds-color-on-surface)',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
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
                    borderRadius: 'var(--ds-radius-md)',
                    border: 'none',
                    backgroundColor: 'var(--ds-color-primary)',
                    color: 'var(--ds-color-on-primary)',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isSubmitting ? 'Saving...' : 'Update Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 3: ADD RECORD-ONLY PAYROLL (OWNER ONLY)        */}
      {/* ==================================================== */}
      {showAddPayrollModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
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
              backgroundColor: 'var(--ds-color-surface-container-lowest)',
              border: '1px solid var(--ds-color-outline-variant)',
              borderRadius: 'var(--ds-radius-xl)',
              width: '100%',
              maxWidth: '480px',
              padding: 'var(--ds-space-6)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              maxHeight: '90dvh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--ds-space-3)' }}>
              <div>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 800, margin: 0, color: 'var(--ds-color-on-surface)' }}>
                  Record Salary Compensation
                </h2>
                <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--ds-color-on-surface-variant)' }}>
                  Log confidential compensation for Profit &amp; Loss accounting
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddPayrollModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--ds-color-on-surface-variant)',
                  padding: '4px',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--ds-radius-md)',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: '#dc2626',
                  fontSize: '0.8125rem',
                  marginBottom: 'var(--ds-space-4)',
                }}
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleAddPayrollSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-3)' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '6px', color: 'var(--ds-color-on-surface)' }}>Staff Member *</label>
                <select
                  value={payrollUserId}
                  onChange={(e) => setPayrollUserId(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--ds-radius-md)',
                    border: '1px solid var(--ds-color-outline-variant)',
                    backgroundColor: 'var(--ds-color-surface-container-low)',
                    fontSize: '0.8125rem',
                    color: 'var(--ds-color-on-surface)',
                  }}
                >
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.email} ({s.role} - {s.branchName || 'All'})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--ds-space-3)' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '6px', color: 'var(--ds-color-on-surface)' }}>Pay Period (YYYY-MM) *</label>
                  <input
                    type="month"
                    required
                    value={payrollPeriod}
                    onChange={(e) => setPayrollPeriod(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--ds-radius-md)',
                      border: '1px solid var(--ds-color-outline-variant)',
                      backgroundColor: 'var(--ds-color-surface-container-low)',
                      fontSize: '0.8125rem',
                      color: 'var(--ds-color-on-surface)',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '6px', color: 'var(--ds-color-on-surface)' }}>Salary Amount ({currency}) *</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={payrollAmount}
                    onChange={(e) => setPayrollAmount(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--ds-radius-md)',
                      border: '1px solid var(--ds-color-outline-variant)',
                      backgroundColor: 'var(--ds-color-surface-container-low)',
                      fontSize: '0.8125rem',
                      color: 'var(--ds-color-on-surface)',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '6px', color: 'var(--ds-color-on-surface)' }}>Compensation Status *</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--ds-space-2)' }}>
                  <button
                    type="button"
                    onClick={() => setPayrollStatus('PAID')}
                    style={{
                      padding: '8px',
                      borderRadius: 'var(--ds-radius-md)',
                      border: '1px solid',
                      borderColor: payrollStatus === 'PAID' ? '#16a34a' : 'var(--ds-color-outline-variant)',
                      backgroundColor: payrollStatus === 'PAID' ? 'rgba(22, 163, 74, 0.1)' : 'transparent',
                      color: payrollStatus === 'PAID' ? '#16a34a' : 'var(--ds-color-on-surface)',
                      fontWeight: payrollStatus === 'PAID' ? 700 : 500,
                      cursor: 'pointer',
                    }}
                  >
                    Paid / Settled
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayrollStatus('UNPAID')}
                    style={{
                      padding: '8px',
                      borderRadius: 'var(--ds-radius-md)',
                      border: '1px solid',
                      borderColor: payrollStatus === 'UNPAID' ? '#dc2626' : 'var(--ds-color-outline-variant)',
                      backgroundColor: payrollStatus === 'UNPAID' ? 'rgba(220, 38, 38, 0.1)' : 'transparent',
                      color: payrollStatus === 'UNPAID' ? '#dc2626' : 'var(--ds-color-on-surface)',
                      fontWeight: payrollStatus === 'UNPAID' ? 700 : 500,
                      cursor: 'pointer',
                    }}
                  >
                    Unpaid / Pending
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--ds-space-2)', marginTop: 'var(--ds-space-3)' }}>
                <button
                  type="button"
                  onClick={() => setShowAddPayrollModal(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--ds-radius-md)',
                    border: '1px solid var(--ds-color-outline-variant)',
                    backgroundColor: 'transparent',
                    color: 'var(--ds-color-on-surface)',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
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
                    borderRadius: 'var(--ds-radius-md)',
                    border: 'none',
                    backgroundColor: '#9333ea',
                    color: '#ffffff',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isSubmitting ? 'Recording...' : 'Record Compensation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete / Remove Staff Confirmation Modal */}
      {deletingMember && (
        <div
          role="dialog"
          aria-labelledby="delete-staff-title"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: 'var(--ds-space-4)',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--ds-color-surface-container-lowest)',
              borderRadius: 'var(--ds-radius-xl)',
              border: '1px solid var(--ds-color-outline-variant)',
              maxWidth: '460px',
              width: '100%',
              padding: 'var(--ds-space-6)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--ds-space-4)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ds-space-3)' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Trash2 size={20} />
              </div>
              <div style={{ minWidth: 0 }}>
                <h3 id="delete-staff-title" style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--ds-color-on-surface)' }}>
                  Remove Team Member
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.8125rem', color: 'var(--ds-color-on-surface-variant)' }}>
                  This action revokes access immediately
                </p>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--ds-color-on-surface)', lineHeight: 1.5 }}>
              Are you sure you want to remove <strong>{deletingMember.email}</strong>? They will be detached from{' '}
              <strong>{deletingMember.branchName || 'their assigned branch'}</strong>, all their active sessions will be terminated, and they will no longer be able to log in.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--ds-space-2)', marginTop: 'var(--ds-space-2)' }}>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingMember(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--ds-radius-md)',
                  border: '1px solid var(--ds-color-outline-variant)',
                  backgroundColor: 'transparent',
                  color: 'var(--ds-color-on-surface)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteStaff}
                style={{
                  padding: '8px 18px',
                  borderRadius: 'var(--ds-radius-md)',
                  border: 'none',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Trash2 size={14} />
                {isDeleting ? 'Removing...' : 'Confirm Removal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
