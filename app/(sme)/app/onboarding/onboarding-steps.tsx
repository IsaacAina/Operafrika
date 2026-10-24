'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import OnboardingProgress, { type StepItem } from './onboarding-progress'
import OnboardingIllustration from './onboarding-illustration'

const BUSINESS_TYPE_OPTIONS = [
  'Retail & Supermarket',
  'Wholesale & Distribution',
  'Food & Restaurant',
  'Services & Agency',
  'Health & Pharmacy',
  'Manufacturing & Production',
  'Electronics & Computing',
  'Fashion & Apparel',
  'General & Other',
]

const educationalSteps = [
  {
    title: 'Track sales with invoices',
    description:
      'Create invoices for your customers, track payment status (Paid, Unpaid, Partial), and keep every sale organized per branch.',
  },
  {
    title: 'Manage stock with confidence',
    description:
      'Add stock items with prices and reorder thresholds. Record stock-in and stock-out movements and get low-stock alerts before you run out.',
  },
  {
    title: 'See your profit & loss',
    description:
      'Record income and expenses, track payroll, and see profit and loss per branch or combined across all your branches in one place.',
  },
]

const OWNER_STEPS: StepItem[] = [
  { id: 'business', label: 'Business Profile', shortLabel: 'Profile' },
  { id: 'invoices', label: 'Invoices & Sales', shortLabel: 'Sales' },
  { id: 'inventory', label: 'Inventory & Stock', shortLabel: 'Stock' },
  { id: 'financials', label: 'Profit & Loss', shortLabel: 'P&L' },
]

const STAFF_STEPS: StepItem[] = [
  { id: 'invoices', label: 'Invoices & Sales', shortLabel: 'Sales' },
  { id: 'inventory', label: 'Inventory & Stock', shortLabel: 'Stock' },
  { id: 'financials', label: 'Profit & Loss', shortLabel: 'P&L' },
]

interface OnboardingInitialData {
  businessName: string
  businessType: string
  currency: string
  contactInfo: string
  branchName: string
  branchAddress: string
  branchContactInfo: string
}

interface OnboardingStepsProps {
  role: string
  initialData: OnboardingInitialData
}

export default function OnboardingSteps({ role, initialData }: OnboardingStepsProps) {
  const router = useRouter()
  const isOwner = role === 'OWNER'

  const [view, setView] = useState<'business' | 'education'>(
    isOwner ? 'business' : 'education',
  )

  // Ref for GSAP illustration
  const illustrationRef = useRef<HTMLDivElement>(null)

  // Education flow state
  const [eduIndex, setEduIndex] = useState(0)
  
  



  // Business profile form state
  const [businessName, setBusinessName] = useState(initialData.businessName)
  const [businessType, setBusinessType] = useState(
    initialData.businessType && initialData.businessType !== 'General'
      ? initialData.businessType
      : 'Retail & Supermarket',
  )
  const [contactInfo, setContactInfo] = useState(initialData.contactInfo)
  const [branchName, setBranchName] = useState(initialData.branchName || 'Main Branch')
  const [branchAddress, setBranchAddress] = useState(initialData.branchAddress)
  const [branchContactInfo, setBranchContactInfo] = useState(initialData.branchContactInfo)

  const [formError, setFormError] = useState<string | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)

  // Education flow state
  

  // Animate illustration on step change
useEffect(() => {
  const el = illustrationRef.current;
  if (!el) return;
  gsap.fromTo(
    el,
    { opacity: 0, y: -20 },
    { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }
  );
}, [view, eduIndex]);
  

  const [completing, setCompleting] = useState(false)

  const steps = isOwner ? OWNER_STEPS : STAFF_STEPS
  const currentStepIndex = isOwner
    ? view === 'business'
      ? 0
      : 1 + eduIndex
    : eduIndex

  function handleStepClick(targetIndex: number) {
    if (isOwner) {
      if (targetIndex === 0) {
        setView('business')
      } else {
        setView('education')
        setEduIndex(targetIndex - 1)
      }
    } else {
      setEduIndex(targetIndex)
    }
  }

  async function handleBusinessSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)

    const trimmedName = businessName.trim()
    const trimmedBranch = branchName.trim()

    if (!trimmedName || trimmedName.length < 2) {
      setFormError('Business name must be at least 2 characters.')
      return
    }

    if (!trimmedBranch || trimmedBranch.length < 2) {
      setFormError('Branch name must be at least 2 characters.')
      return
    }

    setSavingProfile(true)

    try {
      const res = await fetch('/api/onboarding/business-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: trimmedName,
          businessType: businessType.trim(),
          currency: 'NGN',
          contactInfo: contactInfo.trim() || undefined,
          branchName: trimmedBranch,
          branchAddress: branchAddress.trim() || undefined,
          branchContactInfo: branchContactInfo.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setFormError(data.error || 'Failed to save business settings.')
        return
      }

      // Transition to educational flow
      setView('education')
      setEduIndex(0)
    } catch {
      setFormError('Network error while saving settings. Please try again.')
    } finally {
      setSavingProfile(false)
    }
  }

  async function completeOnboarding() {
    setCompleting(true)
    try {
      await fetch('/api/onboarding/complete', { method: 'POST' })
    } catch {
      // Best effort - allow proceeding
    } finally {
      router.push('/app')
    }
  }

  const isLastEduStep = eduIndex === educationalSteps.length - 1
  const currentEduStep = educationalSteps[eduIndex]

  return (
    <main className="auth-page">
      <div className="onboarding-header">
        <Link href="/" className="auth-brand onboarding-brand" aria-label="Operafrika home">
          <Image
            src="/icon.svg"
            alt="Operafrika"
            width={40}
            height={40}
            priority
          />
        </Link>
        <button className="onboarding-close" type="button" aria-label="Close">
          <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
            <path
              d="M5 5 15 15M15 5 5 15"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
      <div className={`auth-card ${view === 'business' ? 'onboarding-card' : ''}`}>
        

        {/* Progressive animated onboarding stepper */}
        <OnboardingProgress
          steps={steps}
          currentStepIndex={currentStepIndex}
          onStepClick={handleStepClick}
        />

        {view === 'business' ? (
          <div key="business-pane" className="onboarding-animated-pane">
            <div ref={illustrationRef} className="onboarding-illustration">
              <OnboardingIllustration variant="business" />
            </div>
            <h1 className="auth-title">Set up your business</h1>
            <p className="auth-subtitle">
              Configure your business profile and first branch to get started.
            </p>

            <form className="auth-form" onSubmit={handleBusinessSubmit} noValidate>
              <h2 className="onboarding-section-title">Business details</h2>

              <div className="auth-field">
                <label className="auth-label" htmlFor="business-name">
                  Business name *
                </label>
                <input
                  id="business-name"
                  type="text"
                  className="auth-input"
                  required
                  placeholder="e.g. Adeola Supermarket"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  disabled={savingProfile}
                />
              </div>

              <div className="onboarding-grid onboarding-grid-2">
                <div className="auth-field">
                  <label className="auth-label" htmlFor="business-type">
                    Business category *
                  </label>
                  <div className="onboarding-select-wrapper">
                    <select
                      id="business-type"
                      className="auth-input onboarding-select"
                      value={businessType}
                      onChange={(e) => setBusinessType(e.target.value)}
                      disabled={savingProfile}
                    >
                      {BUSINESS_TYPE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    <svg
                      className="onboarding-select-chevron"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <path
                        d="M5.25 7.5 10 12.25 14.75 7.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>

                <div className="auth-field">
                  <label className="auth-label" htmlFor="business-currency">
                    Operating currency
                  </label>
                  <input
                    id="business-currency"
                    type="text"
                    className="auth-input onboarding-input-locked"
                    value="NGN - Nigerian Naira (₦)"
                    readOnly
                    disabled
                  />
                </div>
              </div>

              <div className="onboarding-notice">
                <span className="onboarding-notice-strong">
                  Currency policy note:
                </span>
                <span>
                  Currency is set to Nigerian Naira (NGN) and cannot be changed by
                  your business once saved. Only a Platform Admin can correct it.
                </span>
              </div>

              <div className="auth-field">
                <label className="auth-label" htmlFor="business-contact">
                  Business contact phone / email
                </label>
                <input
                  id="business-contact"
                  type="text"
                  className="auth-input"
                  placeholder="e.g. +234 801 234 5678"
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                  disabled={savingProfile}
                />
              </div>

              <h2 className="onboarding-section-title">First branch</h2>

              <div className="auth-field">
                <label className="auth-label" htmlFor="branch-name">
                  Branch name *
                </label>
                <input
                  id="branch-name"
                  type="text"
                  className="auth-input"
                  required
                  placeholder="e.g. Main Branch"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  disabled={savingProfile}
                />
              </div>

              <div className="onboarding-grid onboarding-grid-2">
                <div className="auth-field">
                  <label className="auth-label" htmlFor="branch-address">
                    Branch address
                  </label>
                  <input
                    id="branch-address"
                    type="text"
                    className="auth-input"
                    placeholder="e.g. 12 Marina, Lagos"
                    value={branchAddress}
                    onChange={(e) => setBranchAddress(e.target.value)}
                    disabled={savingProfile}
                  />
                </div>

                <div className="auth-field">
                  <label className="auth-label" htmlFor="branch-contact">
                    Branch contact phone
                  </label>
                  <input
                    id="branch-contact"
                    type="text"
                    className="auth-input"
                    placeholder="e.g. +234 802 345 6789"
                    value={branchContactInfo}
                    onChange={(e) => setBranchContactInfo(e.target.value)}
                    disabled={savingProfile}
                  />
                </div>
              </div>

              {formError ? (
                <p className="auth-error" role="alert">
                  {formError}
                </p>
              ) : null}

              <div className="onboarding-actions onboarding-actions-single">
                <button
                  type="submit"
                  className="onboarding-cta-button"
                  disabled={savingProfile}
                >
                  <span className="onboarding-cta-label">
                    {savingProfile ? 'Saving settings...' : 'Save & continue'}
                  </span>
                  <svg
                    className="onboarding-cta-icon"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path
                      d="M7.5 4.167 13.333 10 7.5 15.833"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div key={`edu-pane-${eduIndex}`} className="onboarding-animated-pane">
            <div ref={illustrationRef} className="onboarding-illustration">
              <OnboardingIllustration
                variant={
                  eduIndex === 0
                    ? 'invoices'
                    : eduIndex === 1
                      ? 'inventory'
                      : 'financials'
                }
              />
            </div>
            <h1 className="auth-title">Welcome to Operafrika</h1>
            <p className="auth-subtitle">
              Learn the basics before you get started
            </p>

            <div className="onboarding-step">
              <p className="onboarding-counter">
                Tutorial {eduIndex + 1} of {educationalSteps.length}
              </p>
              <h2 className="onboarding-step-title">{currentEduStep.title}</h2>
              <p className="onboarding-step-desc">{currentEduStep.description}</p>
            </div>

            <div className="onboarding-actions">
              {eduIndex > 0 ? (
                <button
                  type="button"
                  className="onboarding-button-quiet"
                  onClick={() => setEduIndex((i) => i - 1)}
                  disabled={completing}
                >
                  <svg
                    className="onboarding-button-icon onboarding-button-icon-left"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path
                      d="m12.5 15.833-5.833-5.833 5.833-5.833"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="onboarding-button-label">Back</span>
                </button>
              ) : isOwner ? (
                <button
                  type="button"
                  className="onboarding-button-quiet"
                  onClick={() => setView('business')}
                  disabled={completing}
                >
                  <span className="onboarding-button-label">Edit details</span>
                </button>
              ) : (
                <div />
              )}

              <button
                type="button"
                className="onboarding-cta-button"
                onClick={() =>
                  isLastEduStep ? completeOnboarding() : setEduIndex((i) => i + 1)
                }
                disabled={completing}
              >
                <span className="onboarding-cta-label">
                  {completing
                    ? 'Entering dashboard...'
                    : isLastEduStep
                      ? 'Get started'
                      : 'Next'}
                </span>
                <svg
                  className="onboarding-cta-icon"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path
                    d="M7.5 4.167 13.333 10 7.5 15.833"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
