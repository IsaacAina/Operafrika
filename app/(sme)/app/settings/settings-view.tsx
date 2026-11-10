'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Settings,
  Building,
  Building2,
  Lock,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  X,
  ShieldAlert,
  Info,
  Calendar,
  Layers,
  ArrowRight,
  Store,
  Users,
  Receipt,
  Package,
  Bot,
  BellRing,
  Smartphone,
  ShieldCheck,
  Coins,
  BarChart3,
  FileSpreadsheet,
  TrendingUp,
  Shield,
  ArrowLeftRight,
  MessageSquare,
  FileText,
  Headset,
  Clock,
} from 'lucide-react'
import type { BusinessSettingsDetail } from '@/lib/settings'

type BillingCycle = 'monthly' | 'quarterly' | 'bi-annual' | 'annual'

interface CyclePriceInfo {
  priceDisplay: string
  billedNote: string
  savingsBadge?: string
}

interface PlanBenefitItem {
  text: string
  icon: React.ComponentType<{ size?: number | string; color?: string; style?: React.CSSProperties }>
  isEnriched?: boolean
}

interface CommercialPlanTier {
  name: string
  description: string
  pricing: Record<BillingCycle, CyclePriceInfo>
  features: PlanBenefitItem[]
  recommended?: boolean
}

const COMMERCIAL_PLAN_TIERS: CommercialPlanTier[] = [
  {
    name: 'Free',
    description: 'Basic single-device operations for sole proprietors & micro-shops',
    pricing: {
      monthly: { priceDisplay: '₦0 / month', billedNote: 'Free forever / No card required' },
      quarterly: { priceDisplay: '₦0', billedNote: 'Free forever / No card required' },
      'bi-annual': { priceDisplay: '₦0', billedNote: 'Free forever / No card required' },
      annual: { priceDisplay: '₦0', billedNote: 'Free forever / No card required' },
    },
    features: [
      { text: '1 physical branch', icon: Store },
      { text: '1 user account (Owner only)', icon: Users },
      { text: 'Up to 50 sales & invoices / month', icon: Receipt, isEnriched: true },
      { text: 'Up to 30 inventory products', icon: Package, isEnriched: true },
      { text: '5 AI business questions / month', icon: Bot, isEnriched: true },
      { text: 'Real-time stock reorder alerts', icon: BellRing, isEnriched: true },
      { text: 'Mobile POS receipt generator', icon: Smartphone, isEnriched: true },
    ],
  },
  {
    name: 'Starter',
    description: 'Essential operating tools & staff delegation for growing retail stores',
    pricing: {
      monthly: { priceDisplay: '₦7,500 / month', billedNote: 'Billed monthly' },
      quarterly: { priceDisplay: '₦21,375 / qtr', billedNote: 'Billed every 3 mos (₦7,125/mo)', savingsBadge: 'Save 5%' },
      'bi-annual': { priceDisplay: '₦40,500 / 6 mos', billedNote: 'Billed every 6 mos (₦6,750/mo)', savingsBadge: 'Save 10%' },
      annual: { priceDisplay: '₦75,000 / year', billedNote: 'Billed annually (₦6,250/mo)', savingsBadge: 'Save 17% — 2 Mo Free' },
    },
    features: [
      { text: '1 physical branch', icon: Store },
      { text: 'Unlimited sales, invoices & receipts', icon: Receipt, isEnriched: true },
      { text: 'Unlimited inventory items & stock tracking', icon: Package, isEnriched: true },
      { text: 'Up to 3 staff & cashier accounts', icon: Users },
      { text: 'Cashier vs Manager role permissions', icon: ShieldCheck, isEnriched: true },
      { text: 'Customer debt & credit ledger with CSV export', icon: FileSpreadsheet, isEnriched: true },
      { text: 'Direct income & expense logging', icon: BarChart3 },
      { text: '50 AI business questions / month', icon: Bot, isEnriched: true },
    ],
  },
  {
    name: 'Growth',
    recommended: true,
    description: 'Multi-branch operations and advanced profit & loss intelligence',
    pricing: {
      monthly: { priceDisplay: '₦20,000 / month', billedNote: 'Billed monthly' },
      quarterly: { priceDisplay: '₦57,000 / qtr', billedNote: 'Billed every 3 mos (₦19,000/mo)', savingsBadge: 'Save 5%' },
      'bi-annual': { priceDisplay: '₦108,000 / 6 mos', billedNote: 'Billed every 6 mos (₦18,000/mo)', savingsBadge: 'Save 10%' },
      annual: { priceDisplay: '₦200,000 / year', billedNote: 'Billed annually (₦16,667/mo)', savingsBadge: 'Save 17% — 2 Mo Free' },
    },
    features: [
      { text: 'Up to 3 physical branches', icon: Building2 },
      { text: 'Unlimited staff & branch managers', icon: Users },
      { text: 'Consolidated & branch P&L reports with exports', icon: FileSpreadsheet },
      { text: 'Branch performance comparison & metrics', icon: TrendingUp, isEnriched: true },
      { text: 'Record-only confidential payroll tracker', icon: Lock, isEnriched: true },
      { text: 'Low-stock threshold alerts across all branches', icon: BellRing, isEnriched: true },
      { text: 'AI business assistant across branches', icon: Sparkles },
      { text: '500 AI business questions / month', icon: Bot, isEnriched: true },
    ],
  },
  {
    name: 'Business',
    description: 'Comprehensive operations & security for expanding retail chains',
    pricing: {
      monthly: { priceDisplay: '₦50,000 / month', billedNote: 'Billed monthly' },
      quarterly: { priceDisplay: '₦142,500 / qtr', billedNote: 'Billed every 3 mos (₦47,500/mo)', savingsBadge: 'Save 5%' },
      'bi-annual': { priceDisplay: '₦270,000 / 6 mos', billedNote: 'Billed every 6 mos (₦45,000/mo)', savingsBadge: 'Save 10%' },
      annual: { priceDisplay: '₦500,000 / year', billedNote: 'Billed annually (₦41,667/mo)', savingsBadge: 'Save 17% — 2 Mo Free' },
    },
    features: [
      { text: 'Up to 10 physical branches', icon: Building2 },
      { text: 'Full structured security audit log', icon: Shield },
      { text: 'Detailed staff audit trail & activity logs', icon: FileText, isEnriched: true },
      { text: 'Multi-branch inventory rebalancing & transfer logs', icon: Package, isEnriched: true },
      { text: 'Automated low-stock branch transfer tracking', icon: ArrowLeftRight },
      { text: 'Priority WhatsApp support & dedicated onboarding', icon: Headset, isEnriched: true },
      { text: '2,500 AI business questions / month', icon: Bot, isEnriched: true },
    ],
  },
  {
    name: 'Enterprise',
    description: 'Custom corporate infrastructure and dedicated platform account manager',
    pricing: {
      monthly: { priceDisplay: 'Custom Quote', billedNote: 'Annual contract / Bank wire' },
      quarterly: { priceDisplay: 'Custom Quote', billedNote: 'Annual contract / Bank wire' },
      'bi-annual': { priceDisplay: 'Custom Quote', billedNote: 'Annual contract / Bank wire' },
      annual: { priceDisplay: 'Custom / Annual', billedNote: 'Dedicated SLA & Bank wire' },
    },
    features: [
      { text: 'Unlimited branches & warehouses', icon: Building2 },
      { text: 'Multi-company consolidated financial statements', icon: Layers, isEnriched: true },
      { text: 'Custom data export & ERP reporting integrations', icon: FileSpreadsheet },
      { text: 'Dedicated Nigerian account manager with 24/7 support', icon: Headset, isEnriched: true },
      { text: '99.9% uptime SLA with daily offsite backup', icon: ShieldCheck, isEnriched: true },
      { text: 'Unlimited AI business questions & custom query models', icon: Sparkles, isEnriched: true },
    ],
  },
]

interface SettingsViewProps {
  initialSettings: BusinessSettingsDetail
  userRole: string
  userEmail: string
}

export default function SettingsView({
  initialSettings,
  userRole,
  userEmail,
}: SettingsViewProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [settings, setSettings] = useState<BusinessSettingsDetail>(initialSettings)

  // Edit profile form state
  const [name, setName] = useState(initialSettings.name)
  const [businessType, setBusinessType] = useState(initialSettings.businessType)
  const [contactInfo, setContactInfo] = useState(initialSettings.contactInfo || '')

  const [formError, setFormError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Subscription plan modal
  const [showPlansModal, setShowPlansModal] = useState(false)
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('annual')

  const isOwner = userRole === 'OWNER'

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isOwner) return

    setFormError(null)
    setSuccessMsg(null)
    setIsSubmitting(true)

    try {
      const res = await fetch('/api/business/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, businessType, contactInfo }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update business profile')
      }

      setSettings(data.settings)
      setSuccessMsg('Business profile settings saved successfully.')
      startTransition(() => {
        router.refresh()
      })
    } catch (err: any) {
      setFormError(err.message || 'Error updating settings')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-6)', width: '100%' }}>
      {/* Messages */}
      {formError && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--ds-radius-md)',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            color: '#dc2626',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertCircle size={18} />
          <span>{formError}</span>
        </div>
      )}

      {successMsg && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--ds-radius-md)',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            color: '#16a34a',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Grid: Profile Form + Currency & Subscription Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 'var(--ds-space-6)',
        }}
      >
        {/* Card 1: Business Profile Information */}
        <section
          className="route-card"
          style={{
            padding: 'var(--ds-space-6)',
            boxShadow: 'none',
            backgroundColor: 'var(--ds-color-surface-container-lowest)',
          }}
        >
          <div style={{ marginBottom: 'var(--ds-space-4)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 800, margin: 0, color: 'var(--ds-color-on-surface)' }}>
              Business Profile
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--ds-color-on-surface-variant)' }}>
              {isOwner
                ? 'Primary operating details and company identification'
                : 'Read-only business profile view (Manager)'}
            </p>
          </div>

          <form onSubmit={handleProfileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-4)' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Business Name *
              </label>
              <input
                type="text"
                required
                disabled={!isOwner}
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 'var(--ds-radius-sm)',
                  border: '1px solid var(--ds-color-outline-variant)',
                  backgroundColor: isOwner ? 'var(--ds-color-background)' : 'var(--ds-color-surface-container-low)',
                  fontSize: '13px',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Business Category / Industry *
              </label>
              <input
                type="text"
                required
                disabled={!isOwner}
                placeholder="e.g. Retail Supermarket, Pharmacy, Fashion Boutique"
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 'var(--ds-radius-sm)',
                  border: '1px solid var(--ds-color-outline-variant)',
                  backgroundColor: isOwner ? 'var(--ds-color-background)' : 'var(--ds-color-surface-container-low)',
                  fontSize: '13px',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Headquarters Contact &amp; Address
              </label>
              <textarea
                disabled={!isOwner}
                rows={3}
                placeholder="Central corporate phone, contact email, and registered headquarters address"
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 'var(--ds-radius-sm)',
                  border: '1px solid var(--ds-color-outline-variant)',
                  backgroundColor: isOwner ? 'var(--ds-color-background)' : 'var(--ds-color-surface-container-low)',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
            </div>

            {isOwner && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--ds-space-2)' }}>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: '8px 20px',
                    borderRadius: 'var(--ds-radius-md)',
                    border: 'none',
                    backgroundColor: 'var(--ds-color-primary)',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: isSubmitting ? 'wait' : 'pointer',
                  }}
                >
                  {isSubmitting ? 'Saving Changes...' : 'Save Profile Settings'}
                </button>
              </div>
            )}
          </form>
        </section>

        {/* Right Column: Currency Protection + Subscription Transparency */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-6)' }}>
          {/* Card 2: Currency Protection (Strict Rule) */}
          <section
            className="route-card"
            style={{
              padding: 'var(--ds-space-5)',
              boxShadow: 'none',
              backgroundColor: 'var(--ds-color-surface-container-lowest)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Lock size={18} color="#0f766e" />
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>Operating Currency (Protected)</h3>
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: 'var(--ds-radius-md)',
                backgroundColor: 'rgba(15, 118, 110, 0.08)',
                color: 'var(--ds-color-primary)',
                fontWeight: 800,
                fontSize: '16px',
                margin: '8px 0',
              }}
            >
              <span>{settings.currency} (Nigerian Naira)</span>
            </div>

            <p style={{ margin: 0, fontSize: '12px', lineHeight: 1.6, color: 'var(--ds-color-on-surface-variant)' }}>
              Operating currency is locked at onboarding across all branch invoices, inventory valuations, and financial records. To ensure absolute data integrity, SME accounts cannot modify currency. Only an authorized Operafrika Platform Administrator can perform a currency correction.
            </p>
          </section>

          {/* Card 3: Subscription Plan Transparency (Active Free Until V2) */}
          <section
            className="route-card"
            style={{
              padding: 'var(--ds-space-5)',
              boxShadow: 'none',
              backgroundColor: 'var(--ds-color-surface-container-lowest)',
              borderLeft: '4px solid #2563eb',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} color="#2563eb" />
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>Current Subscription</h3>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  padding: '4px 10px',
                  borderRadius: 'var(--ds-radius-full)',
                  backgroundColor: 'rgba(37, 99, 235, 0.1)',
                  color: '#2563eb',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                Early Access Partner
              </span>
            </div>

            <div style={{ margin: '8px 0' }}>
              <span style={{ display: 'block', fontSize: '18px', fontWeight: 800, color: 'var(--ds-color-on-surface)' }}>
                {settings.subscription.planName}
              </span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#16a34a' }}>
                ₦0 / month &middot; 100% Free until V2 Commercial Launch
              </span>
            </div>

            <p style={{ margin: '4px 0 12px 0', fontSize: '12px', lineHeight: 1.5, color: 'var(--ds-color-on-surface-variant)' }}>
              {settings.subscription.earlyAccessNotice}
            </p>

            <button
              type="button"
              onClick={() => setShowPlansModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: 'var(--ds-radius-md)',
                border: '1px solid var(--ds-color-outline-variant)',
                backgroundColor: 'var(--ds-color-surface-container-low)',
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--ds-color-on-surface)',
                cursor: 'pointer',
              }}
            >
              <span>View Upcoming Commercial Plans (V2)</span>
              <ArrowRight size={14} />
            </button>
          </section>
        </div>
      </div>

      {/* ==================================================== */}
      {/* MODAL: COMMERCIAL PLAN TIERS (WITH CLOSE X ICON)     */}
      {/* ==================================================== */}
      {showPlansModal && (
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
              maxWidth: '840px',
              backgroundColor: 'var(--ds-color-surface-container-lowest)',
              padding: 'var(--ds-space-6)',
              boxShadow: '0 25px 30px -5px rgba(0,0,0,0.25)',
              maxHeight: '90dvh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--ds-space-3)', marginBottom: 'var(--ds-space-3)' }}>
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--ds-color-on-surface)' }}>
                  Upcoming Commercial Subscription Plans (V2)
                </h2>
                <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: 'var(--ds-color-on-surface-variant)' }}>
                  Operafrika will introduce automated Flutterwave subscription billing in V2. You enjoy full access for free until then!
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPlansModal(false)}
                aria-label="Close"
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px',
                  color: 'var(--ds-color-on-surface-variant)',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 'var(--ds-radius-sm)',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Billing Cycle Switcher */}
            <div className="billing-cycle-section">
              <span className="billing-cycle-label">
                Billing Cycle:
              </span>
              <div className="billing-cycle-pill-group">
                {([
                  { id: 'monthly', title: 'Monthly', discount: '' },
                  { id: 'quarterly', title: 'Quarterly', discount: 'Save 5%' },
                  { id: 'bi-annual', title: 'Bi-Annual', discount: 'Save 10%' },
                  { id: 'annual', title: 'Annual', discount: 'Save 17% — 2 Mo Free' },
                ] as { id: BillingCycle; title: string; discount: string }[]).map((tab) => {
                  const isActive = billingCycle === tab.id
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setBillingCycle(tab.id)}
                      className={`billing-cycle-btn ${isActive ? 'active' : ''}`}
                      style={{
                        backgroundColor: isActive ? 'var(--ds-color-primary)' : 'transparent',
                        color: isActive ? '#ffffff' : 'var(--ds-color-on-surface)',
                      }}
                    >
                      <span className="billing-cycle-btn-title">{tab.title}</span>
                      {tab.discount && (
                        <span
                          className="billing-cycle-btn-discount"
                          style={{
                            color: isActive ? 'rgba(255, 255, 255, 0.92)' : '#16a34a',
                          }}
                        >
                          {tab.discount}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Plans Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 'var(--ds-space-4)',
                marginTop: 'var(--ds-space-2)',
              }}
            >
              {COMMERCIAL_PLAN_TIERS.map((tier) => {
                const pricingInfo = tier.pricing[billingCycle]
                return (
                  <div
                    key={tier.name}
                    style={{
                      padding: 'var(--ds-space-4)',
                      borderRadius: 'var(--ds-radius-lg)',
                      border: `2px solid ${tier.recommended ? 'var(--ds-color-primary)' : 'var(--ds-color-outline-variant)'}`,
                      backgroundColor: tier.recommended ? 'rgba(15, 118, 110, 0.03)' : 'var(--ds-color-surface-container-low)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: 'var(--ds-space-3)',
                      position: 'relative',
                    }}
                  >
                    {tier.recommended && (
                      <span
                        style={{
                          position: 'absolute',
                          top: '-10px',
                          right: '12px',
                          fontSize: '10px',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          padding: '2px 8px',
                          borderRadius: 'var(--ds-radius-full)',
                          backgroundColor: 'var(--ds-color-primary)',
                          color: '#ffffff',
                        }}
                      >
                        Most Popular
                      </span>
                    )}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>{tier.name}</h3>
                        {pricingInfo.savingsBadge && (
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: 'rgba(22, 163, 74, 0.12)',
                              color: '#16a34a',
                            }}
                          >
                            {pricingInfo.savingsBadge}
                          </span>
                        )}
                      </div>
                      <span style={{ display: 'block', fontSize: '16px', fontWeight: 800, color: 'var(--ds-color-primary)', marginTop: '4px' }}>
                        {pricingInfo.priceDisplay}
                      </span>
                      <span style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: 'var(--ds-color-on-surface-variant)', marginTop: '2px' }}>
                        {pricingInfo.billedNote}
                      </span>
                      <p style={{ margin: '6px 0 10px 0', fontSize: '12px', color: 'var(--ds-color-on-surface-variant)', lineHeight: 1.4 }}>
                        {tier.description}
                      </p>

                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {tier.features.map((feat) => {
                          const Icon = feat.icon
                          return (
                            <li key={feat.text} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', lineHeight: '1.35' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: '4px',
                                  backgroundColor: tier.recommended ? 'rgba(15, 118, 110, 0.12)' : 'var(--ds-color-surface-container-high)',
                                  color: tier.recommended ? 'var(--ds-color-primary)' : 'var(--ds-color-on-surface-variant)',
                                  flexShrink: 0,
                                  marginTop: '1px',
                                }}
                              >
                                <Icon size={12} />
                              </span>
                              <span
                                style={{
                                  color: feat.isEnriched ? 'var(--ds-color-on-surface)' : 'var(--ds-color-on-surface-variant)',
                                  fontWeight: feat.isEnriched ? 600 : 400,
                                }}
                              >
                                {feat.text}
                              </span>
                            </li>
                          )
                        })}
                      </ul>
                    </div>

                    <div style={{ paddingTop: 'var(--ds-space-2)', borderTop: '1px solid var(--ds-color-outline-variant)' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ds-color-on-surface-variant)' }}>
                        Available in V2 Launch
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--ds-space-6)' }}>
              <button
                type="button"
                onClick={() => setShowPlansModal(false)}
                style={{
                  padding: '8px 20px',
                  borderRadius: 'var(--ds-radius-md)',
                  border: 'none',
                  backgroundColor: 'var(--ds-color-primary)',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Close Plan Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
