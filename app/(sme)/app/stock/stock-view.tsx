'use client'

import React, { useState, useEffect } from 'react'
import type { StockItemWithBranch, StockMovementRecord } from '@/lib/stock'
import {
  Package,
  Layers,
  AlertTriangle,
  DollarSign,
  Plus,
  Search,
  ArrowUpDown,
  Edit3,
  X,
  ShieldAlert,
  History,
  CheckCircle2,
  AlertCircle,
  Store,
  Tag,
  PlusCircle,
  MinusCircle,
  TrendingUp,
} from 'lucide-react'

interface StockViewProps {
  initialItems: StockItemWithBranch[]
  initialMovements: StockMovementRecord[]
  branches: Array<{ id: string; name: string }>
  currentBranchId: string | null
  userRole: string
  currency: string
}

// Generate consistent avatar color based on product name
function getProductAvatarColor(name: string): { bg: string; text: string } {
  const colors = [
    { bg: 'rgba(15, 118, 110, 0.12)', text: '#0f766e' }, // Teal
    { bg: 'rgba(37, 99, 235, 0.12)', text: '#2563eb' }, // Blue
    { bg: 'rgba(124, 58, 237, 0.12)', text: '#7c3aed' }, // Violet
    { bg: 'rgba(217, 119, 6, 0.12)', text: '#d97706' }, // Amber
    { bg: 'rgba(219, 39, 119, 0.12)', text: '#db2777' }, // Pink
    { bg: 'rgba(5, 150, 105, 0.12)', text: '#059669' }, // Emerald
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % colors.length
  return colors[index]!
}

// Extract initials (up to 2 letters)
function getInitials(name: string): string {
  if (!name || !name.trim()) return 'SK'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase()
  }
  return ((parts[0]![0] || '') + (parts[parts.length - 1]![0] || '')).toUpperCase()
}

export default function StockView({
  initialItems,
  initialMovements,
  branches,
  currentBranchId,
  userRole,
  currency,
}: StockViewProps) {
  const [items, setItems] = useState<StockItemWithBranch[]>(initialItems)
  const [movements, setMovements] = useState<StockMovementRecord[]>(initialMovements)

  useEffect(() => {
    setItems(initialItems)
    setMovements(initialMovements)
  }, [initialItems, initialMovements])
  const [activeTab, setActiveTab] = useState<'all' | 'low' | 'out' | 'movements'>('all')
  const [search, setSearch] = useState('')

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [movementItem, setMovementItem] = useState<StockItemWithBranch | null>(null)
  const [editItem, setEditItem] = useState<StockItemWithBranch | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Form states - Add Item
  const [addForm, setAddForm] = useState({
    branchId: currentBranchId || (branches[0]?.id ?? ''),
    name: '',
    sku: '',
    quantity: 0,
    costPrice: 0,
    sellingPrice: 0,
    reorderThreshold: 5,
  })

  // Form states - Record Movement
  const [movementForm, setMovementForm] = useState({
    type: 'IN' as 'IN' | 'OUT',
    quantity: 1,
    reason: '',
  })

  // Form states - Edit Item
  const [editForm, setEditForm] = useState({
    name: '',
    sku: '',
    costPrice: 0,
    sellingPrice: 0,
    reorderThreshold: 5,
  })

  const isStaff = userRole === 'STAFF'

  function formatMoney(amount: number): string {
    try {
      return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
      }).format(amount)
    } catch {
      return `${currency} ${amount.toFixed(2)}`
    }
  }

  // Filter items
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.sku && item.sku.toLowerCase().includes(search.toLowerCase()))

    if (!matchesSearch) return false

    if (activeTab === 'low') return item.isLowStock && !item.isOutOfStock
    if (activeTab === 'out') return item.isOutOfStock
    return true
  })

  const lowStockCount = items.filter((i) => i.isLowStock && !i.isOutOfStock).length
  const outOfStockCount = items.filter((i) => i.isOutOfStock).length
  const totalUnits = items.reduce((sum, i) => sum + i.quantity, 0)
  const totalValuation = items.reduce((sum, i) => sum + i.quantity * i.costPrice, 0)

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setErrorMsg(null)

    try {
      const res = await fetch('/api/stock/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create stock item')
      }

      setItems((prev) => [data.item, ...prev])
      setIsAddOpen(false)
      setAddForm({
        branchId: currentBranchId || (branches[0]?.id ?? ''),
        name: '',
        sku: '',
        quantity: 0,
        costPrice: 0,
        sellingPrice: 0,
        reorderThreshold: 5,
      })
    } catch (err: unknown) {
      const error = err as Error
      setErrorMsg(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleRecordMovement(e: React.FormEvent) {
    e.preventDefault()
    if (!movementItem) return
    setIsLoading(true)
    setErrorMsg(null)

    try {
      const res = await fetch('/api/stock/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: movementItem.id,
          type: movementForm.type,
          quantity: movementForm.quantity,
          reason: movementForm.reason,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to record stock movement')
      }

      // Update local item quantity & health status
      setItems((prev) =>
        prev.map((item) => (item.id === data.item.id ? data.item : item)),
      )

      // Prepend movement record to history list
      setMovements((prev) => [data.movement, ...prev])

      setMovementItem(null)
      setMovementForm({ type: 'IN', quantity: 1, reason: '' })
    } catch (err: unknown) {
      const error = err as Error
      setErrorMsg(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleEditItem(e: React.FormEvent) {
    e.preventDefault()
    if (!editItem) return
    setIsLoading(true)
    setErrorMsg(null)

    try {
      const res = await fetch(`/api/stock/items/${editItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update stock item')
      }

      setItems((prev) =>
        prev.map((item) => (item.id === data.item.id ? data.item : item)),
      )
      setEditItem(null)
    } catch (err: unknown) {
      const error = err as Error
      setErrorMsg(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-6)', width: '100%' }}>
      {/* Staff Permission Matrix Notice */}
      {isStaff && (
        <aside
          aria-label="Staff inventory visibility notice"
          style={{
            padding: 'var(--ds-space-4) var(--ds-space-5)',
            backgroundColor: 'var(--ds-color-surface-container-lowest)',
            borderLeft: '4px solid #2563eb',
            borderRadius: 'var(--ds-radius-lg)',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            border: '1px solid var(--ds-color-outline-variant)',
            borderLeftWidth: '4px',
            borderLeftColor: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--ds-space-3)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: 'var(--ds-radius-full)',
              backgroundColor: 'rgba(37, 99, 235, 0.1)',
              color: '#2563eb',
              flexShrink: 0,
            }}
          >
            <ShieldAlert size={20} />
          </div>
          <p
            style={{
              margin: 0,
              fontSize: '0.875rem',
              color: 'var(--ds-color-on-surface)',
              fontFamily: 'Inter, sans-serif',
              lineHeight: 1.5,
            }}
          >
            <strong style={{ fontWeight: 700 }}>Staff Read-Only View:</strong> You have real-time visibility into stock levels and shelf quantities for your assigned branch. Adding new items, price editing, and stock transfers/adjustments are reserved for Branch Managers and Owners.
          </p>
        </aside>
      )}

      {/* KPI Overview Metric Cards */}
      <section
        aria-label="Inventory metrics overview"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: 'var(--ds-space-4)',
          width: '100%',
        }}
      >
        {/* Card 1: Total Products */}
        <div
          style={{
            backgroundColor: 'var(--ds-color-surface-container-lowest)',
            borderRadius: 'var(--ds-radius-xl)',
            border: '1px solid var(--ds-color-outline-variant)',
            borderLeft: '4px solid #059669',
            padding: 'var(--ds-space-5)',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--ds-space-3)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--ds-color-on-surface-variant)',
              }}
            >
              Unique Products
            </span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--ds-radius-lg)',
                backgroundColor: 'rgba(5, 150, 105, 0.12)',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Package size={18} />
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: '2rem',
                fontWeight: 800,
                color: 'var(--ds-color-on-surface)',
                fontFamily: 'Inter, sans-serif',
                letterSpacing: '-0.02em',
                lineHeight: 1,
              }}
            >
              {items.length}
            </div>
            <p style={{ margin: '6px 0 0 0', fontSize: '0.8125rem', color: 'var(--ds-color-on-surface-variant)' }}>
              Catalog items on record
            </p>
          </div>
        </div>

        {/* Card 2: Units On Hand */}
        <div
          style={{
            backgroundColor: 'var(--ds-color-surface-container-lowest)',
            borderRadius: 'var(--ds-radius-xl)',
            border: '1px solid var(--ds-color-outline-variant)',
            borderLeft: '4px solid #2563eb',
            padding: 'var(--ds-space-5)',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--ds-space-3)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--ds-color-on-surface-variant)',
              }}
            >
              Total Units On Hand
            </span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--ds-radius-lg)',
                backgroundColor: 'rgba(37, 99, 235, 0.12)',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Layers size={18} />
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: '2rem',
                fontWeight: 800,
                color: 'var(--ds-color-on-surface)',
                fontFamily: 'Inter, sans-serif',
                letterSpacing: '-0.02em',
                lineHeight: 1,
              }}
            >
              {totalUnits}
            </div>
            <p style={{ margin: '6px 0 0 0', fontSize: '0.8125rem', color: 'var(--ds-color-on-surface-variant)' }}>
              Physical units in current stock
            </p>
          </div>
        </div>

        {/* Card 3: Low Stock Alerts */}
        <div
          style={{
            backgroundColor: 'var(--ds-color-surface-container-lowest)',
            borderRadius: 'var(--ds-radius-xl)',
            border: '1px solid var(--ds-color-outline-variant)',
            borderLeft: lowStockCount > 0 ? '4px solid #d97706' : '4px solid #10b981',
            padding: 'var(--ds-space-5)',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--ds-space-3)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--ds-color-on-surface-variant)',
              }}
            >
              Low Stock Alerts
            </span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--ds-radius-lg)',
                backgroundColor: lowStockCount > 0 ? 'rgba(217, 119, 6, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                color: lowStockCount > 0 ? '#b45309' : '#047857',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertTriangle size={18} />
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: '2rem',
                fontWeight: 800,
                color: lowStockCount > 0 ? '#b45309' : 'var(--ds-color-on-surface)',
                fontFamily: 'Inter, sans-serif',
                letterSpacing: '-0.02em',
                lineHeight: 1,
              }}
            >
              {lowStockCount}
            </div>
            <p style={{ margin: '6px 0 0 0', fontSize: '0.8125rem', color: 'var(--ds-color-on-surface-variant)' }}>
              {lowStockCount > 0 ? 'Items at or below reorder limit' : 'All stock levels healthy'}
            </p>
          </div>
        </div>

        {/* Card 4: Inventory Valuation */}
        <div
          style={{
            backgroundColor: 'var(--ds-color-surface-container-lowest)',
            borderRadius: 'var(--ds-radius-xl)',
            border: '1px solid var(--ds-color-outline-variant)',
            borderLeft: '4px solid #7c3aed',
            padding: 'var(--ds-space-5)',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--ds-space-3)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--ds-color-on-surface-variant)',
              }}
            >
              Inventory Valuation
            </span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--ds-radius-lg)',
                backgroundColor: 'rgba(124, 58, 237, 0.12)',
                color: '#7c3aed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <DollarSign size={18} />
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: '2rem',
                fontWeight: 800,
                color: 'var(--ds-color-on-surface)',
                fontFamily: 'Inter, sans-serif',
                letterSpacing: '-0.02em',
                lineHeight: 1,
              }}
            >
              {formatMoney(totalValuation)}
            </div>
            <p style={{ margin: '6px 0 0 0', fontSize: '0.8125rem', color: 'var(--ds-color-on-surface-variant)' }}>
              Cost valuation of held stock
            </p>
          </div>
        </div>
      </section>

      {/* Main Inventory Interactive Section */}
      <section
        aria-labelledby="stock-directory-heading"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--ds-space-4)',
          width: '100%',
          backgroundColor: 'var(--ds-color-surface-container-lowest)',
          borderRadius: 'var(--ds-radius-xl)',
          border: '1px solid var(--ds-color-outline-variant)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          padding: 'var(--ds-space-5)',
        }}
      >
        {/* Section Header & Primary CTAs */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 'var(--ds-space-3)',
            paddingBottom: 'var(--ds-space-3)',
            borderBottom: '1px solid var(--ds-color-outline-variant)',
          }}
        >
          <div>
            <h2
              id="stock-directory-heading"
              style={{
                margin: 0,
                fontSize: '1.25rem',
                fontWeight: 800,
                color: 'var(--ds-color-on-surface)',
                fontFamily: 'Inter, sans-serif',
                letterSpacing: '-0.01em',
              }}
            >
              Stock Catalog &amp; Movements
            </h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.8125rem', color: 'var(--ds-color-on-surface-variant)' }}>
              Showing {filteredItems.length} of {items.length} items &middot; {movements.length} logged stock movements
            </p>
          </div>

          {!isStaff && (
            <button
              type="button"
              onClick={() => setIsAddOpen(true)}
              style={{
                padding: 'var(--ds-space-2) var(--ds-space-4)',
                backgroundColor: 'var(--ds-color-primary)',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.875rem',
                borderRadius: 'var(--ds-radius-md)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 4px rgba(15, 118, 110, 0.2)',
                transition: 'all 0.15s ease',
              }}
            >
              <Plus size={16} />
              <span>Add Stock Item</span>
            </button>
          )}
        </div>

        {/* Segmented Filter Tabs & Search Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 'var(--ds-space-3)',
          }}
        >
          {/* Segmented Tab Controls */}
          <div
            role="tablist"
            aria-label="Stock item filters"
            style={{
              display: 'inline-flex',
              backgroundColor: 'var(--ds-color-surface-container-low)',
              padding: '4px',
              borderRadius: 'var(--ds-radius-lg)',
              border: '1px solid var(--ds-color-outline-variant)',
              gap: '4px',
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'all'}
              onClick={() => setActiveTab('all')}
              style={{
                padding: '6px 14px',
                fontSize: '0.8125rem',
                fontWeight: activeTab === 'all' ? 700 : 600,
                fontFamily: 'Inter, sans-serif',
                borderRadius: 'var(--ds-radius-md)',
                border: 'none',
                backgroundColor: activeTab === 'all' ? 'var(--ds-color-surface-container-lowest)' : 'transparent',
                color: activeTab === 'all' ? 'var(--ds-color-on-surface)' : 'var(--ds-color-on-surface-variant)',
                boxShadow: activeTab === 'all' ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>All Items</span>
              <span
                style={{
                  padding: '1px 6px',
                  borderRadius: 'var(--ds-radius-full)',
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  backgroundColor: activeTab === 'all' ? 'rgba(15, 118, 110, 0.12)' : 'rgba(0, 0, 0, 0.06)',
                  color: activeTab === 'all' ? 'var(--ds-color-primary)' : 'inherit',
                }}
              >
                {items.length}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'low'}
              onClick={() => setActiveTab('low')}
              style={{
                padding: '6px 14px',
                fontSize: '0.8125rem',
                fontWeight: activeTab === 'low' ? 700 : 600,
                fontFamily: 'Inter, sans-serif',
                borderRadius: 'var(--ds-radius-md)',
                border: 'none',
                backgroundColor: activeTab === 'low' ? 'var(--ds-color-surface-container-lowest)' : 'transparent',
                color: activeTab === 'low' ? '#b45309' : 'var(--ds-color-on-surface-variant)',
                boxShadow: activeTab === 'low' ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <AlertTriangle size={13} color={activeTab === 'low' ? '#b45309' : 'currentColor'} />
              <span>Low Stock</span>
              {lowStockCount > 0 && (
                <span
                  style={{
                    padding: '1px 6px',
                    borderRadius: 'var(--ds-radius-full)',
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    backgroundColor: 'rgba(217, 119, 6, 0.15)',
                    color: '#b45309',
                  }}
                >
                  {lowStockCount}
                </span>
              )}
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'out'}
              onClick={() => setActiveTab('out')}
              style={{
                padding: '6px 14px',
                fontSize: '0.8125rem',
                fontWeight: activeTab === 'out' ? 700 : 600,
                fontFamily: 'Inter, sans-serif',
                borderRadius: 'var(--ds-radius-md)',
                border: 'none',
                backgroundColor: activeTab === 'out' ? 'var(--ds-color-surface-container-lowest)' : 'transparent',
                color: activeTab === 'out' ? '#dc2626' : 'var(--ds-color-on-surface-variant)',
                boxShadow: activeTab === 'out' ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <AlertCircle size={13} color={activeTab === 'out' ? '#dc2626' : 'currentColor'} />
              <span>Out of Stock</span>
              {outOfStockCount > 0 && (
                <span
                  style={{
                    padding: '1px 6px',
                    borderRadius: 'var(--ds-radius-full)',
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    backgroundColor: 'rgba(220, 38, 38, 0.15)',
                    color: '#dc2626',
                  }}
                >
                  {outOfStockCount}
                </span>
              )}
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'movements'}
              onClick={() => setActiveTab('movements')}
              style={{
                padding: '6px 14px',
                fontSize: '0.8125rem',
                fontWeight: activeTab === 'movements' ? 700 : 600,
                fontFamily: 'Inter, sans-serif',
                borderRadius: 'var(--ds-radius-md)',
                border: 'none',
                backgroundColor: activeTab === 'movements' ? 'var(--ds-color-surface-container-lowest)' : 'transparent',
                color: activeTab === 'movements' ? 'var(--ds-color-primary)' : 'var(--ds-color-on-surface-variant)',
                boxShadow: activeTab === 'movements' ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <History size={13} />
              <span>Movements Log</span>
              <span
                style={{
                  padding: '1px 6px',
                  borderRadius: 'var(--ds-radius-full)',
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  backgroundColor: activeTab === 'movements' ? 'rgba(15, 118, 110, 0.12)' : 'rgba(0, 0, 0, 0.06)',
                  color: activeTab === 'movements' ? 'var(--ds-color-primary)' : 'inherit',
                }}
              >
                {movements.length}
              </span>
            </button>
          </div>

          {/* Search Box */}
          {activeTab !== 'movements' && (
            <div style={{ position: 'relative', minWidth: '260px', flex: '1 1 260px', maxWidth: '400px' }}>
              <span
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--ds-color-on-surface-variant)',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Search size={15} />
              </span>
              <input
                type="text"
                placeholder="Search items by name or SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 36px',
                  fontSize: '0.875rem',
                  borderRadius: 'var(--ds-radius-lg)',
                  border: '1px solid var(--ds-color-outline-variant)',
                  backgroundColor: 'var(--ds-color-surface-container-low)',
                  color: 'var(--ds-color-on-surface)',
                  outline: 'none',
                  fontFamily: 'Inter, sans-serif',
                }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--ds-color-on-surface-variant)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Table Content: Items or Movements */}
        {activeTab === 'movements' ? (
          <div>
            {movements.length === 0 ? (
              <div
                style={{
                  padding: 'var(--ds-space-10) var(--ds-space-6)',
                  textAlign: 'center',
                  backgroundColor: 'var(--ds-color-surface-container-low)',
                  borderRadius: 'var(--ds-radius-lg)',
                  border: '1px dashed var(--ds-color-outline-variant)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 'var(--ds-space-3)',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: 'var(--ds-radius-full)',
                    backgroundColor: 'rgba(15, 118, 110, 0.1)',
                    color: 'var(--ds-color-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <History size={24} />
                </div>
                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: '1rem',
                      fontWeight: 800,
                      color: 'var(--ds-color-on-surface)',
                      fontFamily: 'Inter, sans-serif',
                    }}
                  >
                    No stock movements recorded yet
                  </h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.8125rem', color: 'var(--ds-color-on-surface-variant)' }}>
                    When items are restocked, returned, damaged, or adjusted, the full audit trail appears here.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div
                  className="desktop-table-container"
                  style={{
                    overflowX: 'auto',
                    borderRadius: 'var(--ds-radius-lg)',
                    border: '1px solid var(--ds-color-outline-variant)',
                  }}
                >
                <table
                  aria-label="Stock movements history"
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    textAlign: 'left',
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        backgroundColor: 'var(--ds-color-surface-container-low)',
                        borderBottom: '1px solid var(--ds-color-outline-variant)',
                      }}
                    >
                      <th
                        scope="col"
                        style={{
                          padding: '12px 16px',
                          fontSize: '0.6875rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          color: 'var(--ds-color-on-surface-variant)',
                        }}
                      >
                        Date &amp; Time
                      </th>
                      <th
                        scope="col"
                        style={{
                          padding: '12px 16px',
                          fontSize: '0.6875rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          color: 'var(--ds-color-on-surface-variant)',
                        }}
                      >
                        Product Item
                      </th>
                      <th
                        scope="col"
                        style={{
                          padding: '12px 16px',
                          fontSize: '0.6875rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          color: 'var(--ds-color-on-surface-variant)',
                        }}
                      >
                        Branch
                      </th>
                      <th
                        scope="col"
                        style={{
                          padding: '12px 16px',
                          fontSize: '0.6875rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          color: 'var(--ds-color-on-surface-variant)',
                        }}
                      >
                        Movement Type
                      </th>
                      <th
                        scope="col"
                        style={{
                          padding: '12px 16px',
                          fontSize: '0.6875rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          color: 'var(--ds-color-on-surface-variant)',
                        }}
                      >
                        Quantity
                      </th>
                      <th
                        scope="col"
                        style={{
                          padding: '12px 16px',
                          fontSize: '0.6875rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          color: 'var(--ds-color-on-surface-variant)',
                        }}
                      >
                        Reason / Note
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((m) => {
                      const isStockIn = m.type === 'IN'
                      const avatarColor = getProductAvatarColor(m.itemName)
                      const initials = getInitials(m.itemName)

                      return (
                        <tr
                          key={m.id}
                          style={{
                            borderBottom: '1px solid var(--ds-color-outline-variant)',
                            transition: 'background-color 0.12s ease',
                          }}
                        >
                          <td style={{ padding: '12px 16px', fontSize: '0.8125rem', color: 'var(--ds-color-on-surface-variant)' }}>
                            {new Date(m.createdAt).toLocaleDateString('en-NG', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}{' '}
                            <span style={{ fontSize: '0.75rem' }}>
                              {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: 'var(--ds-radius-full)',
                                  backgroundColor: avatarColor.bg,
                                  color: avatarColor.text,
                                  fontWeight: 800,
                                  fontSize: '0.75rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                }}
                              >
                                {initials}
                              </div>
                              <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--ds-color-on-surface)' }}>
                                {m.itemName}
                              </span>
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
                                padding: '2px 8px',
                                borderRadius: 'var(--ds-radius-md)',
                                backgroundColor: 'var(--ds-color-surface-container-high)',
                                color: 'var(--ds-color-on-surface)',
                              }}
                            >
                              <Store size={12} color="var(--ds-color-on-surface-variant)" />
                              {m.branchName}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '3px 8px',
                                borderRadius: 'var(--ds-radius-full)',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                backgroundColor: isStockIn ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                                color: isStockIn ? '#047857' : '#b91c1c',
                              }}
                            >
                              {isStockIn ? <PlusCircle size={13} /> : <MinusCircle size={13} />}
                              <span>{isStockIn ? '+ Stock IN' : '- Stock OUT'}</span>
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', fontWeight: 800, fontSize: '0.875rem', color: 'var(--ds-color-on-surface)' }}>
                            {m.quantity} units
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '0.8125rem', color: 'var(--ds-color-on-surface)' }}>
                            {m.reason}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Stock Movements Cards (Zero Horizontal Scroll on Mobile View) */}
              <div className="mobile-cards-container" style={{ display: 'none', flexDirection: 'column', gap: '10px' }}>
                {movements.map((m) => {
                  const isStockIn = m.type === 'IN'
                  const avatarColor = getProductAvatarColor(m.itemName)
                  const initials = getInitials(m.itemName)
                  return (
                    <div
                      key={`mobile-m-${m.id}`}
                      style={{
                        backgroundColor: 'var(--ds-color-surface-container-lowest)',
                        border: '1px solid var(--ds-color-outline-variant)',
                        borderRadius: 'var(--ds-radius-lg)',
                        padding: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: 'var(--ds-radius-full)',
                              backgroundColor: avatarColor.bg,
                              color: avatarColor.text,
                              fontWeight: 800,
                              fontSize: '0.75rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {initials}
                          </div>
                          <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--ds-color-on-surface)' }}>
                            {m.itemName}
                          </span>
                        </div>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: 'var(--ds-radius-full)',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor: isStockIn ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                            color: isStockIn ? '#047857' : '#b91c1c',
                          }}
                        >
                          {isStockIn ? '+ Stock IN' : '- Stock OUT'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--ds-color-on-surface-variant)' }}>
                        <span>Branch: {m.branchName}</span>
                        <span>{new Date(m.createdAt).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--ds-color-surface-container-low)', padding: '6px 10px', borderRadius: 'var(--ds-radius-sm)', fontSize: '0.8125rem' }}>
                        <span style={{ color: 'var(--ds-color-on-surface-variant)' }}>Quantity: <strong style={{ color: 'var(--ds-color-on-surface)' }}>{m.quantity} units</strong></span>
                        <span style={{ color: 'var(--ds-color-on-surface-variant)', fontStyle: 'italic' }}>{m.reason}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
          </div>
        ) : (
          <div>
            {filteredItems.length === 0 ? (
              <div
                style={{
                  padding: 'var(--ds-space-10) var(--ds-space-6)',
                  textAlign: 'center',
                  backgroundColor: 'var(--ds-color-surface-container-low)',
                  borderRadius: 'var(--ds-radius-lg)',
                  border: '1px dashed var(--ds-color-outline-variant)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 'var(--ds-space-3)',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: 'var(--ds-radius-full)',
                    backgroundColor: 'rgba(15, 118, 110, 0.1)',
                    color: 'var(--ds-color-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Package size={24} />
                </div>
                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: '1rem',
                      fontWeight: 800,
                      color: 'var(--ds-color-on-surface)',
                      fontFamily: 'Inter, sans-serif',
                    }}
                  >
                    No stock items found
                  </h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.8125rem', color: 'var(--ds-color-on-surface-variant)' }}>
                    {search
                      ? 'No products match your current search query. Try clearing the filter.'
                      : activeTab === 'low'
                      ? 'No items are currently below the reorder threshold. Inventory is healthy!'
                      : activeTab === 'out'
                      ? 'No items are completely out of stock.'
                      : 'Get started by creating your first stock item.'}
                  </p>
                </div>
                {!isStaff && !search && activeTab === 'all' && (
                  <button
                    type="button"
                    onClick={() => setIsAddOpen(true)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: 'var(--ds-color-primary)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 'var(--ds-radius-md)',
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginTop: 'var(--ds-space-2)',
                    }}
                  >
                    <Plus size={16} />
                    <span>Create First Product</span>
                  </button>
                )}
              </div>
            ) : (
              <>
                <div
                  className="desktop-table-container"
                  style={{
                    overflowX: 'auto',
                    borderRadius: 'var(--ds-radius-lg)',
                    border: '1px solid var(--ds-color-outline-variant)',
                  }}
                >
                <table
                  aria-label="Stock items list"
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    textAlign: 'left',
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        backgroundColor: 'var(--ds-color-surface-container-low)',
                        borderBottom: '1px solid var(--ds-color-outline-variant)',
                      }}
                    >
                      <th
                        scope="col"
                        style={{
                          padding: '12px 16px',
                          fontSize: '0.6875rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          color: 'var(--ds-color-on-surface-variant)',
                        }}
                      >
                        Product Name / SKU
                      </th>
                      <th
                        scope="col"
                        style={{
                          padding: '12px 16px',
                          fontSize: '0.6875rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          color: 'var(--ds-color-on-surface-variant)',
                        }}
                      >
                        Branch
                      </th>
                      <th
                        scope="col"
                        style={{
                          padding: '12px 16px',
                          fontSize: '0.6875rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          color: 'var(--ds-color-on-surface-variant)',
                        }}
                      >
                        Cost Price
                      </th>
                      <th
                        scope="col"
                        style={{
                          padding: '12px 16px',
                          fontSize: '0.6875rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          color: 'var(--ds-color-on-surface-variant)',
                        }}
                      >
                        Selling Price
                      </th>
                      <th
                        scope="col"
                        style={{
                          padding: '12px 16px',
                          fontSize: '0.6875rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          color: 'var(--ds-color-on-surface-variant)',
                        }}
                      >
                        Stock Level
                      </th>
                      <th
                        scope="col"
                        style={{
                          padding: '12px 16px',
                          fontSize: '0.6875rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          color: 'var(--ds-color-on-surface-variant)',
                        }}
                      >
                        Reorder Limit
                      </th>
                      <th
                        scope="col"
                        style={{
                          padding: '12px 16px',
                          fontSize: '0.6875rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          color: 'var(--ds-color-on-surface-variant)',
                        }}
                      >
                        Health Status
                      </th>
                      {!isStaff && (
                        <th
                          scope="col"
                          style={{
                            padding: '12px 16px',
                            fontSize: '0.6875rem',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                            color: 'var(--ds-color-on-surface-variant)',
                            textAlign: 'right',
                          }}
                        >
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => {
                      const avatarColor = getProductAvatarColor(item.name)
                      const initials = getInitials(item.name)

                      return (
                        <tr
                          key={item.id}
                          style={{
                            borderBottom: '1px solid var(--ds-color-outline-variant)',
                            transition: 'background-color 0.12s ease',
                          }}
                        >
                          {/* Product Avatar & Name */}
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div
                                style={{
                                  width: '36px',
                                  height: '36px',
                                  borderRadius: 'var(--ds-radius-lg)',
                                  backgroundColor: avatarColor.bg,
                                  color: avatarColor.text,
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
                              <div>
                                <span
                                  style={{
                                    display: 'block',
                                    fontWeight: 700,
                                    fontSize: '0.9375rem',
                                    color: 'var(--ds-color-on-surface)',
                                    letterSpacing: '-0.01em',
                                  }}
                                >
                                  {item.name}
                                </span>
                                {item.sku ? (
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                      fontSize: '0.6875rem',
                                      color: 'var(--ds-color-on-surface-variant)',
                                      fontFamily: 'monospace',
                                    }}
                                  >
                                    <Tag size={11} /> {item.sku}
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '0.6875rem', color: 'var(--ds-color-on-surface-variant)', fontStyle: 'italic' }}>
                                    No SKU
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Branch Location */}
                          <td style={{ padding: '14px 16px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                padding: '3px 8px',
                                borderRadius: 'var(--ds-radius-md)',
                                backgroundColor: 'var(--ds-color-surface-container-high)',
                                color: 'var(--ds-color-on-surface)',
                              }}
                            >
                              <Store size={12} color="var(--ds-color-on-surface-variant)" />
                              {item.branchName}
                            </span>
                          </td>

                          {/* Cost Price */}
                          <td style={{ padding: '14px 16px', fontSize: '0.875rem', color: 'var(--ds-color-on-surface)' }}>
                            {formatMoney(item.costPrice)}
                          </td>

                          {/* Selling Price */}
                          <td style={{ padding: '14px 16px', fontSize: '0.875rem', fontWeight: 700, color: 'var(--ds-color-on-surface)' }}>
                            {formatMoney(item.sellingPrice)}
                          </td>

                          {/* Quantity On Hand */}
                          <td style={{ padding: '14px 16px' }}>
                            <span
                              style={{
                                fontSize: '1rem',
                                fontWeight: 800,
                                color: item.isOutOfStock ? '#dc2626' : item.isLowStock ? '#b45309' : 'var(--ds-color-on-surface)',
                              }}
                            >
                              {item.quantity}
                            </span>{' '}
                            <span style={{ fontSize: '0.75rem', color: 'var(--ds-color-on-surface-variant)' }}>units</span>
                          </td>

                          {/* Reorder Threshold */}
                          <td style={{ padding: '14px 16px', fontSize: '0.8125rem', color: 'var(--ds-color-on-surface-variant)' }}>
                            &le; {item.reorderThreshold} units
                          </td>

                          {/* Health Status Pill Badge */}
                          <td style={{ padding: '14px 16px' }}>
                            {item.isOutOfStock ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  padding: '4px 9px',
                                  borderRadius: 'var(--ds-radius-full)',
                                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                                  color: '#b91c1c',
                                  fontWeight: 700,
                                  fontSize: '0.75rem',
                                }}
                              >
                                <AlertCircle size={13} />
                                <span>Out of Stock</span>
                              </span>
                            ) : item.isLowStock ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  padding: '4px 9px',
                                  borderRadius: 'var(--ds-radius-full)',
                                  backgroundColor: 'rgba(217, 119, 6, 0.12)',
                                  color: '#b45309',
                                  fontWeight: 700,
                                  fontSize: '0.75rem',
                                }}
                              >
                                <AlertTriangle size={13} />
                                <span>Low Stock</span>
                              </span>
                            ) : (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  padding: '4px 9px',
                                  borderRadius: 'var(--ds-radius-full)',
                                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                                  color: '#047857',
                                  fontWeight: 700,
                                  fontSize: '0.75rem',
                                }}
                              >
                                <CheckCircle2 size={13} />
                                <span>Healthy</span>
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          {!isStaff && (
                            <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: 'var(--ds-space-2)' }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMovementItem(item)
                                    setMovementForm({ type: 'IN', quantity: 1, reason: '' })
                                  }}
                                  style={{
                                    padding: '5px 10px',
                                    fontSize: '0.8125rem',
                                    fontWeight: 600,
                                    backgroundColor: 'var(--ds-color-surface-container-low)',
                                    border: '1px solid var(--ds-color-outline-variant)',
                                    color: 'var(--ds-color-on-surface)',
                                    cursor: 'pointer',
                                    borderRadius: 'var(--ds-radius-md)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    transition: 'all 0.15s ease',
                                  }}
                                >
                                  <ArrowUpDown size={13} />
                                  <span>Adjust</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditItem(item)
                                    setEditForm({
                                      name: item.name,
                                      sku: item.sku || '',
                                      costPrice: item.costPrice,
                                      sellingPrice: item.sellingPrice,
                                      reorderThreshold: item.reorderThreshold,
                                    })
                                  }}
                                  style={{
                                    padding: '5px 10px',
                                    fontSize: '0.8125rem',
                                    fontWeight: 600,
                                    backgroundColor: 'transparent',
                                    border: '1px solid var(--ds-color-outline-variant)',
                                    color: 'var(--ds-color-on-surface)',
                                    cursor: 'pointer',
                                    borderRadius: 'var(--ds-radius-md)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    transition: 'all 0.15s ease',
                                  }}
                                >
                                  <Edit3 size={13} />
                                  <span>Edit</span>
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Stock Item Cards (Zero Horizontal Scroll on Mobile View) */}
              <div className="mobile-cards-container" style={{ display: 'none', flexDirection: 'column', gap: '12px' }}>
                {filteredItems.map((item) => {
                  const avatarColor = getProductAvatarColor(item.name)
                  const initials = getInitials(item.name)
                  return (
                    <div
                      key={`mobile-${item.id}`}
                      style={{
                        backgroundColor: 'var(--ds-color-surface-container-lowest)',
                        border: '1px solid var(--ds-color-outline-variant)',
                        borderRadius: 'var(--ds-radius-lg)',
                        padding: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: 'var(--ds-radius-lg)',
                              backgroundColor: avatarColor.bg,
                              color: avatarColor.text,
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
                          <div>
                            <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: 'var(--ds-color-on-surface)' }}>
                              {item.name}
                            </h4>
                            <span style={{ fontSize: '0.75rem', color: 'var(--ds-color-on-surface-variant)' }}>
                              SKU: {item.sku || 'N/A'} &middot; {item.branchName}
                            </span>
                          </div>
                        </div>

                        {item.quantity === 0 ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: 'var(--ds-radius-full)',
                              backgroundColor: 'rgba(239, 68, 68, 0.12)',
                              color: '#b91c1c',
                              fontWeight: 700,
                              fontSize: '0.75rem',
                            }}
                          >
                            <AlertCircle size={12} /> Out
                          </span>
                        ) : item.isLowStock ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: 'var(--ds-radius-full)',
                              backgroundColor: 'rgba(217, 119, 6, 0.12)',
                              color: '#b45309',
                              fontWeight: 700,
                              fontSize: '0.75rem',
                            }}
                          >
                            <AlertTriangle size={12} /> Low ({item.quantity})
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: 'var(--ds-radius-full)',
                              backgroundColor: 'rgba(16, 185, 129, 0.12)',
                              color: '#047857',
                              fontWeight: 700,
                              fontSize: '0.75rem',
                            }}
                          >
                            <CheckCircle2 size={12} /> {item.quantity} in stock
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 10px',
                          borderRadius: 'var(--ds-radius-sm)',
                          background: 'var(--ds-color-surface-container-low)',
                          fontSize: '0.8125rem',
                        }}
                      >
                        <div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--ds-color-on-surface-variant)', display: 'block' }}>Cost Price</span>
                          <strong style={{ fontSize: '0.875rem', color: 'var(--ds-color-on-surface)' }}>{formatMoney(item.costPrice)}</strong>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--ds-color-on-surface-variant)', display: 'block' }}>Selling Price</span>
                          <strong style={{ fontSize: '0.875rem', color: 'var(--ds-color-primary)' }}>{formatMoney(item.sellingPrice)}</strong>
                        </div>
                      </div>

                      {!isStaff && (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '2px', paddingTop: '8px', borderTop: '1px solid var(--ds-color-outline-variant)' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setMovementItem(item)
                              setMovementForm({ type: 'IN', quantity: 1, reason: '' })
                            }}
                            style={{
                              flex: 1,
                              padding: '8px',
                              fontSize: '0.8125rem',
                              fontWeight: 600,
                              backgroundColor: 'var(--ds-color-surface-container-low)',
                              border: '1px solid var(--ds-color-outline-variant)',
                              color: 'var(--ds-color-on-surface)',
                              cursor: 'pointer',
                              borderRadius: 'var(--ds-radius-md)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '5px',
                            }}
                          >
                            <ArrowUpDown size={13} />
                            <span>Adjust</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditItem(item)
                              setEditForm({
                                name: item.name,
                                sku: item.sku || '',
                                costPrice: item.costPrice,
                                sellingPrice: item.sellingPrice,
                                reorderThreshold: item.reorderThreshold,
                              })
                            }}
                            style={{
                              flex: 1,
                              padding: '8px',
                              fontSize: '0.8125rem',
                              fontWeight: 600,
                              backgroundColor: 'transparent',
                              border: '1px solid var(--ds-color-outline-variant)',
                              color: 'var(--ds-color-on-surface)',
                              cursor: 'pointer',
                              borderRadius: 'var(--ds-radius-md)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '5px',
                            }}
                          >
                            <Edit3 size={13} />
                            <span>Edit</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
          </div>
        )}
      </section>

      {/* MODAL 1: Add Stock Item */}
      {isAddOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-item-modal-title"
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
              animation: 'fadeIn 0.15s ease-out',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2
                  id="add-item-modal-title"
                  style={{
                    margin: 0,
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color: 'var(--ds-color-on-surface)',
                    fontFamily: 'Inter, sans-serif',
                    letterSpacing: '-0.01em',
                  }}
                >
                  Add New Stock Item
                </h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8125rem', color: 'var(--ds-color-on-surface-variant)' }}>
                  Register a physical product, set cost &amp; selling prices, and configure low-stock alerts.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                aria-label="Close modal"
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
                <X size={20} />
              </button>
            </div>

            {errorMsg && (
              <div
                role="alert"
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
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleAddItem} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-3)' }}>
              {branches.length > 1 && (
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.8125rem',
                      fontWeight: 700,
                      color: 'var(--ds-color-on-surface)',
                      marginBottom: '6px',
                    }}
                  >
                    Branch Location *
                  </label>
                  <select
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 'var(--ds-radius-md)',
                      border: '1px solid var(--ds-color-outline-variant)',
                      backgroundColor: 'var(--ds-color-surface-container-low)',
                      color: 'var(--ds-color-on-surface)',
                      fontSize: '0.875rem',
                      outline: 'none',
                    }}
                    value={addForm.branchId}
                    onChange={(e) => setAddForm({ ...addForm, branchId: e.target.value })}
                    required
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    color: 'var(--ds-color-on-surface)',
                    marginBottom: '6px',
                  }}
                >
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 50kg Dangote Cement or Peak Milk 400g"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 'var(--ds-radius-md)',
                    border: '1px solid var(--ds-color-outline-variant)',
                    backgroundColor: 'var(--ds-color-surface-container-low)',
                    color: 'var(--ds-color-on-surface)',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    color: 'var(--ds-color-on-surface)',
                    marginBottom: '6px',
                  }}
                >
                  SKU / Barcode (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. CEM-DAN-50"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 'var(--ds-radius-md)',
                    border: '1px solid var(--ds-color-outline-variant)',
                    backgroundColor: 'var(--ds-color-surface-container-low)',
                    color: 'var(--ds-color-on-surface)',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                  value={addForm.sku}
                  onChange={(e) => setAddForm({ ...addForm, sku: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--ds-space-3)' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.8125rem',
                      fontWeight: 700,
                      color: 'var(--ds-color-on-surface)',
                      marginBottom: '6px',
                    }}
                  >
                    Cost Price ({currency}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 'var(--ds-radius-md)',
                      border: '1px solid var(--ds-color-outline-variant)',
                      backgroundColor: 'var(--ds-color-surface-container-low)',
                      color: 'var(--ds-color-on-surface)',
                      fontSize: '0.875rem',
                      outline: 'none',
                    }}
                    value={addForm.costPrice}
                    onChange={(e) => setAddForm({ ...addForm, costPrice: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.8125rem',
                      fontWeight: 700,
                      color: 'var(--ds-color-on-surface)',
                      marginBottom: '6px',
                    }}
                  >
                    Selling Price ({currency}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 'var(--ds-radius-md)',
                      border: '1px solid var(--ds-color-outline-variant)',
                      backgroundColor: 'var(--ds-color-surface-container-low)',
                      color: 'var(--ds-color-on-surface)',
                      fontSize: '0.875rem',
                      outline: 'none',
                    }}
                    value={addForm.sellingPrice}
                    onChange={(e) => setAddForm({ ...addForm, sellingPrice: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--ds-space-3)' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.8125rem',
                      fontWeight: 700,
                      color: 'var(--ds-color-on-surface)',
                      marginBottom: '6px',
                    }}
                  >
                    Initial Shelf Units
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 'var(--ds-radius-md)',
                      border: '1px solid var(--ds-color-outline-variant)',
                      backgroundColor: 'var(--ds-color-surface-container-low)',
                      color: 'var(--ds-color-on-surface)',
                      fontSize: '0.875rem',
                      outline: 'none',
                    }}
                    value={addForm.quantity}
                    onChange={(e) => setAddForm({ ...addForm, quantity: parseInt(e.target.value, 10) || 0 })}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.8125rem',
                      fontWeight: 700,
                      color: 'var(--ds-color-on-surface)',
                      marginBottom: '6px',
                    }}
                  >
                    Low-Stock Alert Threshold
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 'var(--ds-radius-md)',
                      border: '1px solid var(--ds-color-outline-variant)',
                      backgroundColor: 'var(--ds-color-surface-container-low)',
                      color: 'var(--ds-color-on-surface)',
                      fontSize: '0.875rem',
                      outline: 'none',
                    }}
                    value={addForm.reorderThreshold}
                    onChange={(e) => setAddForm({ ...addForm, reorderThreshold: parseInt(e.target.value, 10) || 0 })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--ds-space-3)', marginTop: 'var(--ds-space-3)' }}>
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  style={{
                    backgroundColor: 'transparent',
                    border: '1px solid var(--ds-color-outline-variant)',
                    borderRadius: 'var(--ds-radius-md)',
                    cursor: 'pointer',
                    padding: '8px 16px',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: 'var(--ds-color-on-surface)',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    backgroundColor: 'var(--ds-color-primary)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 'var(--ds-radius-md)',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    padding: '8px 18px',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    boxShadow: '0 2px 4px rgba(15, 118, 110, 0.2)',
                  }}
                >
                  {isLoading ? 'Saving Product...' : 'Save Stock Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Record Movement / Adjust */}
      {movementItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="adjust-stock-modal-title"
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
              maxWidth: '500px',
              width: '100%',
              backgroundColor: 'var(--ds-color-surface-container-lowest)',
              borderRadius: 'var(--ds-radius-2xl)',
              border: '1px solid var(--ds-color-outline-variant)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              padding: 'var(--ds-space-6)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--ds-space-4)',
              animation: 'fadeIn 0.15s ease-out',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2
                  id="adjust-stock-modal-title"
                  style={{
                    margin: 0,
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color: 'var(--ds-color-on-surface)',
                    fontFamily: 'Inter, sans-serif',
                    letterSpacing: '-0.01em',
                  }}
                >
                  Adjust Stock: {movementItem.name}
                </h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8125rem', color: 'var(--ds-color-on-surface-variant)' }}>
                  Current level: <strong>{movementItem.quantity} units</strong> &middot; Branch: {movementItem.branchName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMovementItem(null)}
                aria-label="Close modal"
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
                <X size={20} />
              </button>
            </div>

            {errorMsg && (
              <div
                role="alert"
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
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleRecordMovement} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-3)' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    color: 'var(--ds-color-on-surface)',
                    marginBottom: '6px',
                  }}
                >
                  Movement Type *
                </label>
                <div style={{ display: 'flex', gap: 'var(--ds-space-2)' }}>
                  <button
                    type="button"
                    onClick={() => setMovementForm({ ...movementForm, type: 'IN' })}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: 'var(--ds-radius-md)',
                      backgroundColor: movementForm.type === 'IN' ? '#047857' : 'var(--ds-color-surface-container-low)',
                      color: movementForm.type === 'IN' ? '#ffffff' : 'var(--ds-color-on-surface)',
                      border: '1px solid var(--ds-color-outline-variant)',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '0.8125rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <PlusCircle size={15} />
                    <span>+ Stock IN (Restock)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMovementForm({ ...movementForm, type: 'OUT' })}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: 'var(--ds-radius-md)',
                      backgroundColor: movementForm.type === 'OUT' ? '#b91c1c' : 'var(--ds-color-surface-container-low)',
                      color: movementForm.type === 'OUT' ? '#ffffff' : 'var(--ds-color-on-surface)',
                      border: '1px solid var(--ds-color-outline-variant)',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '0.8125rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <MinusCircle size={15} />
                    <span>- Stock OUT (Loss/Damage)</span>
                  </button>
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    color: 'var(--ds-color-on-surface)',
                    marginBottom: '6px',
                  }}
                >
                  Quantity to Adjust *
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setMovementForm({ ...movementForm, quantity: Math.max(1, movementForm.quantity - 1) })}
                    disabled={movementForm.quantity <= 1}
                    aria-label="Decrease quantity"
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: 'var(--ds-radius-md)',
                      border: '1px solid var(--ds-color-outline-variant)',
                      backgroundColor: 'var(--ds-color-surface-container-low)',
                      color: 'var(--ds-color-on-surface)',
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      cursor: movementForm.quantity <= 1 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: movementForm.quantity <= 1 ? 0.4 : 1,
                      flexShrink: 0,
                    }}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max={movementForm.type === 'OUT' ? movementItem.quantity : undefined}
                    required
                    style={{
                      flex: 1,
                      height: '44px',
                      padding: '0 12px',
                      textAlign: 'center',
                      borderRadius: 'var(--ds-radius-md)',
                      border: '1px solid var(--ds-color-outline-variant)',
                      backgroundColor: 'var(--ds-color-surface-container-low)',
                      color: 'var(--ds-color-on-surface)',
                      fontSize: '1rem',
                      fontWeight: 700,
                      outline: 'none',
                    }}
                    value={movementForm.quantity}
                    onChange={(e) => setMovementForm({ ...movementForm, quantity: parseInt(e.target.value, 10) || 1 })}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const max = movementForm.type === 'OUT' ? movementItem.quantity : 99999
                      setMovementForm({ ...movementForm, quantity: Math.min(max, movementForm.quantity + 1) })
                    }}
                    disabled={movementForm.type === 'OUT' && movementForm.quantity >= movementItem.quantity}
                    aria-label="Increase quantity"
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: 'var(--ds-radius-md)',
                      border: '1px solid var(--ds-color-outline-variant)',
                      backgroundColor: 'var(--ds-color-surface-container-low)',
                      color: 'var(--ds-color-on-surface)',
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      cursor: (movementForm.type === 'OUT' && movementForm.quantity >= movementItem.quantity) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: (movementForm.type === 'OUT' && movementForm.quantity >= movementItem.quantity) ? 0.4 : 1,
                      flexShrink: 0,
                    }}
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    color: 'var(--ds-color-on-surface)',
                    marginBottom: '6px',
                  }}
                >
                  Adjustment Reason / Reference *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Supplier restock, physical recount, expired carton"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 'var(--ds-radius-md)',
                    border: '1px solid var(--ds-color-outline-variant)',
                    backgroundColor: 'var(--ds-color-surface-container-low)',
                    color: 'var(--ds-color-on-surface)',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                  value={movementForm.reason}
                  onChange={(e) => setMovementForm({ ...movementForm, reason: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--ds-space-3)', marginTop: 'var(--ds-space-3)' }}>
                <button
                  type="button"
                  onClick={() => setMovementItem(null)}
                  style={{
                    backgroundColor: 'transparent',
                    border: '1px solid var(--ds-color-outline-variant)',
                    borderRadius: 'var(--ds-radius-md)',
                    cursor: 'pointer',
                    padding: '8px 16px',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: 'var(--ds-color-on-surface)',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    backgroundColor: 'var(--ds-color-primary)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 'var(--ds-radius-md)',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    padding: '8px 18px',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    boxShadow: '0 2px 4px rgba(15, 118, 110, 0.2)',
                  }}
                >
                  {isLoading ? 'Recording...' : 'Confirm Movement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Edit Stock Item */}
      {editItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-item-modal-title"
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
              maxWidth: '500px',
              width: '100%',
              backgroundColor: 'var(--ds-color-surface-container-lowest)',
              borderRadius: 'var(--ds-radius-2xl)',
              border: '1px solid var(--ds-color-outline-variant)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              padding: 'var(--ds-space-6)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--ds-space-4)',
              animation: 'fadeIn 0.15s ease-out',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2
                  id="edit-item-modal-title"
                  style={{
                    margin: 0,
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color: 'var(--ds-color-on-surface)',
                    fontFamily: 'Inter, sans-serif',
                    letterSpacing: '-0.01em',
                  }}
                >
                  Edit Product: {editItem.name}
                </h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8125rem', color: 'var(--ds-color-on-surface-variant)' }}>
                  To alter on-hand quantities, record a Stock Movement instead.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditItem(null)}
                aria-label="Close modal"
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
                <X size={20} />
              </button>
            </div>

            {errorMsg && (
              <div
                role="alert"
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
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleEditItem} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-3)' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    color: 'var(--ds-color-on-surface)',
                    marginBottom: '6px',
                  }}
                >
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 'var(--ds-radius-md)',
                    border: '1px solid var(--ds-color-outline-variant)',
                    backgroundColor: 'var(--ds-color-surface-container-low)',
                    color: 'var(--ds-color-on-surface)',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    color: 'var(--ds-color-on-surface)',
                    marginBottom: '6px',
                  }}
                >
                  SKU / Barcode
                </label>
                <input
                  type="text"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 'var(--ds-radius-md)',
                    border: '1px solid var(--ds-color-outline-variant)',
                    backgroundColor: 'var(--ds-color-surface-container-low)',
                    color: 'var(--ds-color-on-surface)',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                  value={editForm.sku}
                  onChange={(e) => setEditForm({ ...editForm, sku: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--ds-space-3)' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.8125rem',
                      fontWeight: 700,
                      color: 'var(--ds-color-on-surface)',
                      marginBottom: '6px',
                    }}
                  >
                    Cost Price ({currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 'var(--ds-radius-md)',
                      border: '1px solid var(--ds-color-outline-variant)',
                      backgroundColor: 'var(--ds-color-surface-container-low)',
                      color: 'var(--ds-color-on-surface)',
                      fontSize: '0.875rem',
                      outline: 'none',
                    }}
                    value={editForm.costPrice}
                    onChange={(e) => setEditForm({ ...editForm, costPrice: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.8125rem',
                      fontWeight: 700,
                      color: 'var(--ds-color-on-surface)',
                      marginBottom: '6px',
                    }}
                  >
                    Selling Price ({currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 'var(--ds-radius-md)',
                      border: '1px solid var(--ds-color-outline-variant)',
                      backgroundColor: 'var(--ds-color-surface-container-low)',
                      color: 'var(--ds-color-on-surface)',
                      fontSize: '0.875rem',
                      outline: 'none',
                    }}
                    value={editForm.sellingPrice}
                    onChange={(e) => setEditForm({ ...editForm, sellingPrice: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    color: 'var(--ds-color-on-surface)',
                    marginBottom: '6px',
                  }}
                >
                  Low Stock Alert Threshold (Units)
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 'var(--ds-radius-md)',
                    border: '1px solid var(--ds-color-outline-variant)',
                    backgroundColor: 'var(--ds-color-surface-container-low)',
                    color: 'var(--ds-color-on-surface)',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                  value={editForm.reorderThreshold}
                  onChange={(e) => setEditForm({ ...editForm, reorderThreshold: parseInt(e.target.value, 10) || 0 })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--ds-space-3)', marginTop: 'var(--ds-space-3)' }}>
                <button
                  type="button"
                  onClick={() => setEditItem(null)}
                  style={{
                    backgroundColor: 'transparent',
                    border: '1px solid var(--ds-color-outline-variant)',
                    borderRadius: 'var(--ds-radius-md)',
                    cursor: 'pointer',
                    padding: '8px 16px',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: 'var(--ds-color-on-surface)',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    backgroundColor: 'var(--ds-color-primary)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 'var(--ds-radius-md)',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    padding: '8px 18px',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    boxShadow: '0 2px 4px rgba(15, 118, 110, 0.2)',
                  }}
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
