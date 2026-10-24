'use client'

export interface StepItem {
  id: string
  label: string
  shortLabel?: string
}

interface OnboardingProgressProps {
  steps: StepItem[]
  currentStepIndex: number
  onStepClick?: (stepIndex: number) => void
}

export default function OnboardingProgress({
  steps,
  currentStepIndex,
  onStepClick,
}: OnboardingProgressProps) {
  const total = steps.length
  // Percentage calculates progress towards total completion (e.g. 1/4 = 25%, 4/4 = 100%)
  const progressPercent = Math.min(
    100,
    Math.round(((currentStepIndex + 1) / total) * 100),
  )

  return (
    <nav className="onboarding-stepper" aria-label="Onboarding progress">
      {/* Top progress bar with percentage */}
      <div className="onboarding-progress-header">
        <span className="onboarding-progress-caption">
          Step {currentStepIndex + 1} of {total}
        </span>
        <span className="onboarding-progress-percent">{progressPercent}% complete</span>
      </div>

      <div className="onboarding-progress-track">
        <div
          className="onboarding-progress-fill"
          style={{ width: `${progressPercent}%` }}
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      {/* Progressive step nodes with connecting lines */}
      <ol className="onboarding-stepper-list">
        {steps.map((step, index) => {
          const isCompleted = index < currentStepIndex
          const isCurrent = index === currentStepIndex
          const isUpcoming = index > currentStepIndex
          const canClick = isCompleted && Boolean(onStepClick)

          return (
            <li
              key={step.id}
              className={`onboarding-stepper-item ${
                isCompleted
                  ? 'is-completed'
                  : isCurrent
                    ? 'is-current'
                    : 'is-upcoming'
              }`}
            >
              <button
                type="button"
                className="onboarding-step-badge"
                disabled={!canClick}
                onClick={() => canClick && onStepClick?.(index)}
                aria-current={isCurrent ? 'step' : undefined}
                aria-label={`${step.label}: ${
                  isCompleted ? 'Completed' : isCurrent ? 'In progress' : 'Upcoming'
                }`}
              >
                {isCompleted ? (
                  <svg
                    className="onboarding-check-icon"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="3.5 8.5 6.5 11.5 12.5 5" />
                  </svg>
                ) : (
                  <span className="onboarding-step-num">{index + 1}</span>
                )}
              </button>

              <span className="onboarding-step-label">
                <span className="onboarding-label-full">{step.label}</span>
                <span className="onboarding-label-short">
                  {step.shortLabel || step.label}
                </span>
              </span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
