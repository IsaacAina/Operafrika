'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  TrendingUp,
  Building2,
  Users,
  Store,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Layers,
  Sparkles,
  X,
  Mail,
  Calendar,
  Activity,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  MessageSquare,
  Receipt,
  Package,
  FileSpreadsheet,
  Zap,
  Database,
} from 'lucide-react'

export interface SignupVelocityData {
  last7Days: number
  last30Days: number
  weeklyTrend: Array<{ label: string; count: number; percentage: number }>
}

export interface PlatformFeatureAdoption {
  totalAiConversations: number
  totalInvoicesRecorded: number
  totalCustomers: number
  totalStockItems: number
  totalCsvImports: number
  multiBranchCount: number
  singleBranchCount: number
}

export interface OnboardingFunnelStep {
  step: string
  label: string
  count: number
  percentage: number
}

export interface SignupRecord {
  id: string
  name: string
  currency: string
  businessType: string
  ownerEmail: string
  planName: string
  branchCount: number
  userCount: number
  checkinCount: number
  onboardingCompleted: boolean
  createdAt: string
}

export interface PlanBreakdown {
  planName: string
  count: number
  percentage: number
}

interface FounderViewProps {
  businessCount: number
  userCount: number
  branchCount: number
  completedOnboardingCount: number
  inProgressOnboardingCount: number
  planBreakdown: PlanBreakdown[]
  recentSignups: SignupRecord[]
  canAccessAdmin: boolean
  userEmail: string
  currentPage: number
  totalPages: number
  pageSize: number
  totalSignupsCount: number
  signupVelocity?: SignupVelocityData
  featureAdoption?: PlatformFeatureAdoption
  onboardingFunnel?: OnboardingFunnelStep[]
}

export default function FounderView({
  businessCount,
  userCount,
  branchCount,
  completedOnboardingCount,
  inProgressOnboardingCount,
  planBreakdown,
  recentSignups,
  canAccessAdmin,
  currentPage,
  totalPages,
  pageSize,
  totalSignupsCount,
  signupVelocity,
  featureAdoption,
  onboardingFunnel,
}: FounderViewProps) {
  const router = useRouter()
  const [selectedMember, setSelectedMember] = useState<SignupRecord | null>(null)

  const goToPage = (page: number) => {
    const url = new URL(window.location.href)
    url.searchParams.set('page', String(page))
    router.push(url.pathname + url.search)
  }

  const onboardingCompletionRate =
    businessCount > 0 ? Math.round((completedOnboardingCount / businessCount) * 100) : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-6)', width: '100%' }}>
      {/* Navigation Switcher to Admin Console */}
      {canAccessAdmin && (
        <div className="platform-switcher-banner">
          <div className="platform-switcher-text-container">
            <div className="platform-switcher-title-row">
              <Building2 size={16} color="var(--ds-color-primary)" />
              <span className="platform-switcher-title">
                Platform Admin Console Available
              </span>
            </div>
            <span className="platform-switcher-desc">
              Manage business accounts, branch configurations, and currency corrections.
            </span>
          </div>
          <Link href="/admin" className="platform-switcher-btn">
            <span>Open Admin Console</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* KPI Cards Grid */}
      <section
        className="responsive-kpi-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 'var(--ds-space-4)',
        }}
      >
        <div
          style={{
            backgroundColor: 'var(--ds-color-surface-container-lowest)',
            padding: 'var(--ds-space-5)',
            borderRadius: 'var(--ds-radius-xl)',
            border: '1px solid var(--ds-color-outline-variant)',
            borderLeft: '4px solid #059669',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--ds-space-2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--ds-color-on-surface-variant)', letterSpacing: '0.05em' }}>
              Total Signups
            </span>
            <TrendingUp size={18} color="#059669" />
          </div>
          <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--ds-color-on-surface)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            {businessCount}
          </span>
          <span style={{ fontSize: '0.8125rem', color: 'var(--ds-color-on-surface-variant)' }}>
            Active registered SME businesses
          </span>
        </div>

        <div
          style={{
            backgroundColor: 'var(--ds-color-surface-container-lowest)',
            padding: 'var(--ds-space-5)',
            borderRadius: 'var(--ds-radius-xl)',
            border: '1px solid var(--ds-color-outline-variant)',
            borderLeft: '4px solid var(--ds-color-primary)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--ds-space-2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--ds-color-on-surface-variant)', letterSpacing: '0.05em' }}>
              Active SME Users
            </span>
            <Users size={18} color="var(--ds-color-primary)" />
          </div>
          <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--ds-color-on-surface)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            {userCount}
          </span>
          <span style={{ fontSize: '0.8125rem', color: 'var(--ds-color-on-surface-variant)' }}>
            Team members &amp; owners onboarded
          </span>
        </div>

        <div
          style={{
            backgroundColor: 'var(--ds-color-surface-container-lowest)',
            padding: 'var(--ds-space-5)',
            borderRadius: 'var(--ds-radius-xl)',
            border: '1px solid var(--ds-color-outline-variant)',
            borderLeft: '4px solid #2563eb',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--ds-space-2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--ds-color-on-surface-variant)', letterSpacing: '0.05em' }}>
              Onboarding Completion
            </span>
            <CheckCircle2 size={18} color="#2563eb" />
          </div>
          <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--ds-color-on-surface)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            {onboardingCompletionRate}%
          </span>
          <span style={{ fontSize: '0.8125rem', color: 'var(--ds-color-on-surface-variant)' }}>
            {completedOnboardingCount} completed of {businessCount} total
          </span>
        </div>

        <div
          style={{
            backgroundColor: 'var(--ds-color-surface-container-lowest)',
            padding: 'var(--ds-space-5)',
            borderRadius: 'var(--ds-radius-xl)',
            border: '1px solid var(--ds-color-outline-variant)',
            borderLeft: '4px solid #7c3aed',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--ds-space-2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--ds-color-on-surface-variant)', letterSpacing: '0.05em' }}>
              Total Locations
            </span>
            <Store size={18} color="#7c3aed" />
          </div>
          <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--ds-color-on-surface)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            {branchCount}
          </span>
          <span style={{ fontSize: '0.8125rem', color: 'var(--ds-color-on-surface-variant)' }}>
            Physical retail stores active
          </span>
        </div>
      </section>

      {/* Two Column Section: Onboarding Funnel & Plans Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 'var(--ds-space-6)' }}>
        {/* Onboarding Funnel Card */}
        <section
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
            <span style={{ fontSize: '0.6875rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--ds-color-on-surface-variant)', letterSpacing: '0.05em' }}>
              Conversion Velocity
            </span>
            <h2 style={{ margin: '4px 0 0 0', fontSize: '1.125rem', fontWeight: 800, color: 'var(--ds-color-on-surface)' }}>
              Onboarding &amp; Drop-Off Funnel
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {onboardingFunnel && onboardingFunnel.length > 0 ? (
              onboardingFunnel.map((item, idx) => {
                const colors = ['var(--ds-color-primary)', '#2563eb', '#7c3aed', '#059669']
                const color = colors[idx % colors.length]
                return (
                  <div key={item.step}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.8125rem', fontWeight: 600 }}>
                      <span>{item.step}: {item.label}</span>
                      <span>{item.count} ({item.percentage}%)</span>
                    </div>
                    <div style={{ height: '8px', width: '100%', backgroundColor: 'var(--ds-color-surface-container-low)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${item.percentage}%`,
                          backgroundColor: color,
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>
                )
              })
            ) : (
              <>
                {/* Stage 1 */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.8125rem', fontWeight: 600 }}>
                    <span>1. Business Created</span>
                    <span>{businessCount} (100%)</span>
                  </div>
                  <div style={{ height: '8px', width: '100%', backgroundColor: 'var(--ds-color-surface-container-low)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: '100%', backgroundColor: 'var(--ds-color-primary)' }} />
                  </div>
                </div>

                {/* Stage 2 */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.8125rem', fontWeight: 600 }}>
                    <span>2. First Branch Registered</span>
                    <span>{branchCount} ({businessCount > 0 ? Math.min(100, Math.round((branchCount / businessCount) * 100)) : 0}%)</span>
                  </div>
                  <div style={{ height: '8px', width: '100%', backgroundColor: 'var(--ds-color-surface-container-low)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${businessCount > 0 ? Math.min(100, Math.round((branchCount / businessCount) * 100)) : 0}%`,
                        backgroundColor: '#2563eb',
                      }}
                    />
                  </div>
                </div>

                {/* Stage 3 */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.8125rem', fontWeight: 600 }}>
                    <span>3. Onboarding Flow Completed</span>
                    <span>{completedOnboardingCount} ({onboardingCompletionRate}%)</span>
                  </div>
                  <div style={{ height: '8px', width: '100%', backgroundColor: 'var(--ds-color-surface-container-low)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${onboardingCompletionRate}%`,
                        backgroundColor: '#059669',
                      }}
                    />
                  </div>
                </div>
              </>
            )}

            {/* In Progress Callout */}
            <div
              style={{
                marginTop: '6px',
                padding: '10px 14px',
                borderRadius: 'var(--ds-radius-md)',
                backgroundColor: 'rgba(217, 119, 6, 0.08)',
                border: '1px solid rgba(217, 119, 6, 0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.8125rem',
                color: '#92400e',
              }}
            >
              <Clock size={16} />
              <span>
                <strong>{inProgressOnboardingCount} businesses</strong> currently in progress (not dropped off).
              </span>
            </div>
          </div>
        </section>

        {/* Subscription Plan Distribution Card */}
        <section
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
            <span style={{ fontSize: '0.6875rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--ds-color-on-surface-variant)', letterSpacing: '0.05em' }}>
              Product Adoption
            </span>
            <h2 style={{ margin: '4px 0 0 0', fontSize: '1.125rem', fontWeight: 800, color: 'var(--ds-color-on-surface)' }}>
              Businesses by Subscription Tier
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {planBreakdown.map((item) => (
              <div
                key={item.planName}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: 'var(--ds-radius-md)',
                  backgroundColor: 'var(--ds-color-surface-container-low)',
                  border: '1px solid var(--ds-color-outline-variant)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Layers size={16} color="var(--ds-color-primary)" />
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--ds-color-on-surface)' }}>
                    {item.planName}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--ds-color-on-surface)' }}>
                    {item.count}
                  </span>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: 'var(--ds-radius-full)',
                      backgroundColor: 'rgba(15, 118, 110, 0.1)',
                      color: 'var(--ds-color-primary)',
                    }}
                  >
                    {item.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          <p style={{ margin: 'auto 0 0 0', fontSize: '0.75rem', color: 'var(--ds-color-on-surface-variant)', lineHeight: 1.4 }}>
            All accounts are granted full-feature access through the MVP trial period until live V2 billing launches.
          </p>
        </section>
      </div>

      {/* Two Column Grid: Signup Velocity & Platform Feature Adoption */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 'var(--ds-space-6)' }}>
        {/* Signup Velocity Card */}
        <section
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
            <span style={{ fontSize: '0.6875rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--ds-color-on-surface-variant)', letterSpacing: '0.05em' }}>
              Acquisition Momentum
            </span>
            <h2 style={{ margin: '4px 0 0 0', fontSize: '1.125rem', fontWeight: 800, color: 'var(--ds-color-on-surface)' }}>
              Signup Velocity &amp; Weekly Trend
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--ds-space-3)' }}>
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--ds-radius-lg)',
                backgroundColor: 'var(--ds-color-surface-container-low)',
                border: '1px solid var(--ds-color-outline-variant)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--ds-color-on-surface-variant)' }}>
                Last 7 Days
              </span>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--ds-color-primary)', lineHeight: 1.1 }}>
                +{signupVelocity?.last7Days ?? 0}
              </span>
              <span style={{ fontSize: '0.6875rem', color: 'var(--ds-color-on-surface-variant)' }}>
                New SME businesses registered
              </span>
            </div>

            <div
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--ds-radius-lg)',
                backgroundColor: 'var(--ds-color-surface-container-low)',
                border: '1px solid var(--ds-color-outline-variant)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--ds-color-on-surface-variant)' }}>
                Last 30 Days
              </span>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#2563eb', lineHeight: 1.1 }}>
                +{signupVelocity?.last30Days ?? 0}
              </span>
              <span style={{ fontSize: '0.6875rem', color: 'var(--ds-color-on-surface-variant)' }}>
                Monthly acquisition volume
              </span>
            </div>
          </div>

          {/* 4-Week Progress Bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--ds-color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              4-Week Registration Velocity
            </span>
            {(signupVelocity?.weeklyTrend || []).map((w) => (
              <div key={w.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                  <span style={{ color: 'var(--ds-color-on-surface)' }}>{w.label}</span>
                  <span style={{ color: 'var(--ds-color-on-surface-variant)' }}>{w.count} signups</span>
                </div>
                <div style={{ height: '6px', width: '100%', backgroundColor: 'var(--ds-color-surface-container-low)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.max(5, w.percentage)}%`,
                      backgroundColor: 'var(--ds-color-primary)',
                      borderRadius: '3px',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Aggregated Feature Adoption & Product Activity Card */}
        <section
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
            <span style={{ fontSize: '0.6875rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--ds-color-on-surface-variant)', letterSpacing: '0.05em' }}>
              Platform Activity
            </span>
            <h2 style={{ margin: '4px 0 0 0', fontSize: '1.125rem', fontWeight: 800, color: 'var(--ds-color-on-surface)' }}>
              Core Feature Adoption
            </h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 'var(--ds-space-3)',
            }}
          >
            {/* AI Assistant Conversations */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--ds-radius-lg)',
                backgroundColor: 'var(--ds-color-surface-container-low)',
                border: '1px solid var(--ds-color-outline-variant)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--ds-color-on-surface-variant)' }}>
                  AI Assistant
                </span>
                <Sparkles size={15} color="#0284c7" />
              </div>
              <span style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--ds-color-on-surface)', lineHeight: 1.1 }}>
                {featureAdoption?.totalAiConversations ?? 0}
              </span>
              <span style={{ fontSize: '0.6875rem', color: 'var(--ds-color-on-surface-variant)' }}>
                Conversations answered
              </span>
            </div>

            {/* Invoices & Sales Recorded */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--ds-radius-lg)',
                backgroundColor: 'var(--ds-color-surface-container-low)',
                border: '1px solid var(--ds-color-outline-variant)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--ds-color-on-surface-variant)' }}>
                  Sales &amp; Invoices
                </span>
                <Receipt size={15} color="#059669" />
              </div>
              <span style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--ds-color-on-surface)', lineHeight: 1.1 }}>
                {featureAdoption?.totalInvoicesRecorded ?? 0}
              </span>
              <span style={{ fontSize: '0.6875rem', color: 'var(--ds-color-on-surface-variant)' }}>
                Total transactions recorded
              </span>
            </div>

            {/* Customers Managed */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--ds-radius-lg)',
                backgroundColor: 'var(--ds-color-surface-container-low)',
                border: '1px solid var(--ds-color-outline-variant)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--ds-color-on-surface-variant)' }}>
                  SME Customers
                </span>
                <Users size={15} color="#7c3aed" />
              </div>
              <span style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--ds-color-on-surface)', lineHeight: 1.1 }}>
                {featureAdoption?.totalCustomers ?? 0}
              </span>
              <span style={{ fontSize: '0.6875rem', color: 'var(--ds-color-on-surface-variant)' }}>
                Customer profiles managed
              </span>
            </div>

            {/* Inventory Items Tracked */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--ds-radius-lg)',
                backgroundColor: 'var(--ds-color-surface-container-low)',
                border: '1px solid var(--ds-color-outline-variant)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--ds-color-on-surface-variant)' }}>
                  Catalog SKUs
                </span>
                <Package size={15} color="#d97706" />
              </div>
              <span style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--ds-color-on-surface)', lineHeight: 1.1 }}>
                {featureAdoption?.totalStockItems ?? 0}
              </span>
              <span style={{ fontSize: '0.6875rem', color: 'var(--ds-color-on-surface-variant)' }}>
                Stock items tracked
              </span>
            </div>
          </div>

          {/* Multi-Branch Split Footer */}
          <div
            className="founder-topology-split"
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--ds-radius-md)',
              backgroundColor: 'var(--ds-color-surface-container-low)',
              border: '1px solid var(--ds-color-outline-variant)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Store size={14} color="var(--ds-color-primary)" />
              <span style={{ color: 'var(--ds-color-on-surface)', fontWeight: 600 }}>
                Branch Topology Split:
              </span>
            </div>
            <span style={{ color: 'var(--ds-color-on-surface-variant)' }}>
              <strong>{featureAdoption?.singleBranchCount ?? 0}</strong> Single-Branch &middot; <strong>{featureAdoption?.multiBranchCount ?? 0}</strong> Multi-Branch
            </span>
          </div>
        </section>
      </div>

      {/* Actionable Recent Signups Feed */}
      <section
        style={{
          backgroundColor: 'var(--ds-color-surface-container-lowest)',
          borderRadius: 'var(--ds-radius-xl)',
          border: '1px solid var(--ds-color-outline-variant)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: 'var(--ds-space-5) var(--ds-space-6)', borderBottom: '1px solid var(--ds-color-outline-variant)' }}>
          <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800, color: 'var(--ds-color-on-surface)' }}>
            Recent Signups &amp; Claimed Members
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.8125rem', color: 'var(--ds-color-on-surface-variant)' }}>
            Click any row to view member profile details and check-in history.
          </p>
        </div>

        {/* Desktop View Table */}
        <div className="desktop-table-container" style={{ width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--ds-color-surface-container-low)', borderBottom: '1px solid var(--ds-color-outline-variant)' }}>
                <th style={{ padding: '12px 18px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--ds-color-on-surface-variant)' }}>
                  Business Name
                </th>
                <th style={{ padding: '12px 18px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--ds-color-on-surface-variant)' }}>
                  Registered Email
                </th>
                <th style={{ padding: '12px 18px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--ds-color-on-surface-variant)' }}>
                  Plan
                </th>
                <th style={{ padding: '12px 18px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--ds-color-on-surface-variant)' }}>
                  Currency
                </th>
                <th style={{ padding: '12px 18px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--ds-color-on-surface-variant)' }}>
                  Branches
                </th>
                <th style={{ padding: '12px 18px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--ds-color-on-surface-variant)' }}>
                  Onboarding
                </th>
                <th style={{ padding: '12px 18px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--ds-color-on-surface-variant)' }}>
                  Signup Date
                </th>
              </tr>
            </thead>
            <tbody>
              {recentSignups.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => setSelectedMember(s)}
                  style={{
                    borderBottom: '1px solid var(--ds-color-outline-variant)',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--ds-color-surface-container-low)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  <td style={{ padding: '14px 18px', fontWeight: 700, fontSize: '0.875rem', color: 'var(--ds-color-on-surface)' }}>
                    {s.name}
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <div
                      title={s.ownerEmail}
                      style={{
                        maxWidth: '180px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontSize: '0.8125rem',
                        color: 'var(--ds-color-on-surface)',
                        fontWeight: 500,
                      }}
                    >
                      {s.ownerEmail}
                    </div>
                  </td>
                  <td style={{ padding: '14px 18px', fontSize: '0.8125rem', color: 'var(--ds-color-on-surface)' }}>
                    {s.planName}
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 'var(--ds-radius-full)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: 'var(--ds-color-surface-container-high)',
                        color: 'var(--ds-color-on-surface)',
                      }}
                    >
                      {s.currency}
                    </span>
                  </td>
                  <td style={{ padding: '14px 18px', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--ds-color-on-surface)' }}>
                    {s.branchCount}
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    {s.onboardingCompleted ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#059669', fontSize: '0.75rem', fontWeight: 700 }}>
                        <CheckCircle2 size={13} /> Completed
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#d97706', fontSize: '0.75rem', fontWeight: 700 }}>
                        <Clock size={13} /> In Progress
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '14px 18px', fontSize: '0.75rem', color: 'var(--ds-color-on-surface-variant)' }}>
                    {new Date(s.createdAt).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Stacked Cards (Zero Horizontal Scroll on Mobile View) */}
        <div className="mobile-cards-container" style={{ display: 'none', flexDirection: 'column', gap: '10px', padding: '12px' }}>
          {recentSignups.map((s) => (
            <div
              key={s.id}
              onClick={() => setSelectedMember(s)}
              style={{
                backgroundColor: 'var(--ds-color-surface-container-lowest)',
                borderRadius: 'var(--ds-radius-lg)',
                border: '1px solid var(--ds-color-outline-variant)',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 800, color: 'var(--ds-color-on-surface)' }}>
                  {s.name}
                </h3>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: 'var(--ds-radius-full)',
                    backgroundColor: 'var(--ds-color-surface-container-high)',
                    color: 'var(--ds-color-on-surface)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  {s.currency}
                </span>
              </div>
              <div
                title={s.ownerEmail}
                style={{
                  fontSize: '0.8125rem',
                  color: 'var(--ds-color-on-surface)',
                  fontWeight: 500,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {s.ownerEmail}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', paddingTop: '4px', borderTop: '1px solid var(--ds-color-outline-variant)' }}>
                <span style={{ color: 'var(--ds-color-on-surface-variant)' }}>
                  Plan: <strong>{s.planName}</strong>
                </span>
                <span style={{ color: s.onboardingCompleted ? '#059669' : '#d97706', fontWeight: 700 }}>
                  {s.onboardingCompleted ? 'Completed' : 'In Progress'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Database Pagination Bar (5 rows per page) */}
        <div className="platform-pagination-container">
          <span className="platform-pagination-summary">
            Showing <strong>{totalSignupsCount > 0 ? (currentPage - 1) * pageSize + 1 : 0}</strong> to{' '}
            <strong>{Math.min(currentPage * pageSize, totalSignupsCount)}</strong> of{' '}
            <strong>{totalSignupsCount}</strong> registered businesses
          </span>

          <div className="platform-pagination-controls">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => goToPage(currentPage - 1)}
              className="platform-pagination-btn"
              style={{
                opacity: currentPage <= 1 ? 0.4 : 1,
                cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
              }}
            >
              <ChevronLeft size={14} /> Previous
            </button>

            <span className="platform-pagination-page-indicator">
              Page {currentPage} of {Math.max(1, totalPages)}
            </span>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => goToPage(currentPage + 1)}
              className="platform-pagination-btn"
              style={{
                opacity: currentPage >= totalPages ? 0.4 : 1,
                cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
              }}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </section>

      {/* POPUP MODAL: Member Details (Minimalistic & Actionable) */}
      {selectedMember && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="founder-member-modal-title"
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
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: 'var(--ds-radius-lg)',
                    backgroundColor: 'rgba(5, 150, 105, 0.1)',
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '1rem',
                  }}
                >
                  {selectedMember.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3
                    id="founder-member-modal-title"
                    style={{
                      margin: 0,
                      fontSize: '1.125rem',
                      fontWeight: 800,
                      color: 'var(--ds-color-on-surface)',
                      lineHeight: 1.2,
                    }}
                  >
                    {selectedMember.name}
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--ds-color-on-surface-variant)' }}>
                    {selectedMember.businessType} &middot; ID: {selectedMember.id.slice(-8)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                aria-label="Close dialog"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--ds-color-on-surface-variant)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Information Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                padding: '14px',
                backgroundColor: 'var(--ds-color-surface-container-low)',
                borderRadius: 'var(--ds-radius-lg)',
                border: '1px solid var(--ds-color-outline-variant)',
              }}
            >
              <div>
                <span style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--ds-color-on-surface-variant)' }}>
                  Registered Email
                </span>
                <span
                  title={selectedMember.ownerEmail}
                  style={{
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    color: 'var(--ds-color-on-surface)',
                    display: 'block',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    marginTop: '2px',
                  }}
                >
                  {selectedMember.ownerEmail}
                </span>
              </div>

              <div>
                <span style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--ds-color-on-surface-variant)' }}>
                  Registration Date
                </span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--ds-color-on-surface)', display: 'block', marginTop: '2px' }}>
                  {new Date(selectedMember.createdAt).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>

              <div>
                <span style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--ds-color-on-surface-variant)' }}>
                  Subscription Tier
                </span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--ds-color-primary)', display: 'block', marginTop: '2px' }}>
                  {selectedMember.planName}
                </span>
              </div>

              <div>
                <span style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--ds-color-on-surface-variant)' }}>
                  Check-ins &amp; Sessions
                </span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--ds-color-on-surface)', display: 'block', marginTop: '2px' }}>
                  {selectedMember.checkinCount} user sessions
                </span>
              </div>

              <div>
                <span style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--ds-color-on-surface-variant)' }}>
                  Locations Deployed
                </span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--ds-color-on-surface)', display: 'block', marginTop: '2px' }}>
                  {selectedMember.branchCount} physical branch(es)
                </span>
              </div>

              <div>
                <span style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--ds-color-on-surface-variant)' }}>
                  Onboarding Funnel
                </span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: selectedMember.onboardingCompleted ? '#059669' : '#d97706', display: 'block', marginTop: '2px' }}>
                  {selectedMember.onboardingCompleted ? 'Completed' : 'In Progress'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '6px' }}>
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                style={{
                  padding: '8px 18px',
                  borderRadius: 'var(--ds-radius-md)',
                  backgroundColor: 'var(--ds-color-primary)',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Architectural Boundary & Strict Financial Isolation Disclosure */}
      <div
        style={{
          padding: '14px 18px',
          borderRadius: 'var(--ds-radius-lg)',
          backgroundColor: 'var(--ds-color-surface-container-low)',
          border: '1px solid var(--ds-color-outline-variant)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <ShieldCheck size={20} color="var(--ds-color-primary)" style={{ flexShrink: 0 }} />
        <span style={{ fontSize: '0.8125rem', color: 'var(--ds-color-on-surface-variant)', lineHeight: 1.4 }}>
          <strong>Platform Boundary Guarantee:</strong> Speculative revenue metrics (MRR, ARR, CAC, LTV, Burn Rate, Runway) are excluded by instruction until real payment collections launch in V2. Platform internal accounts have zero access to SME tenant customer records, inventory, and transaction rows.
        </span>
      </div>
    </div>
  )
}
