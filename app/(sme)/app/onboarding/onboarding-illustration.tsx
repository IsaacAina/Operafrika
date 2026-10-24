export type IllustrationVariant =
  | 'business'
  | 'invoices'
  | 'inventory'
  | 'financials'

interface OnboardingIllustrationProps {
  variant: IllustrationVariant
}

const LABELS: Record<IllustrationVariant, string> = {
  business: 'A shop front with a striped awning, sign and display windows',
  invoices: 'An invoice document with a paid checkmark',
  inventory: 'Stacked stock boxes with a low stock warning',
  financials: 'A rising bar chart with coins',
}

function BusinessIllustration() {
  return (
    <>
      <rect
        x="42"
        y="128"
        width="236"
        height="6"
        rx="3"
        fill="var(--ds-color-outline-variant)"
      />
      <path
        d="M78 128V74h164v54"
        fill="var(--ds-color-surface-container-lowest)"
        stroke="var(--ds-color-outline)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M70 74h180l-12 22H82Z" fill="var(--ds-color-primary)" />
      <path
        d="M96 74 88 96M128 74l-8 22M160 74l-8 22M192 74l-8 22M224 74l-8 22"
        stroke="var(--ds-color-primary-container)"
        strokeWidth="6"
      />
      <rect
        x="130"
        y="50"
        width="60"
        height="20"
        rx="6"
        fill="var(--ds-color-primary-container)"
      />
      <rect
        x="140"
        y="58"
        width="40"
        height="4"
        rx="2"
        fill="var(--ds-color-on-primary-container)"
      />
      <rect
        x="96"
        y="92"
        width="34"
        height="24"
        rx="3"
        fill="var(--ds-color-surface-container-low)"
        stroke="var(--ds-color-outline-variant)"
        strokeWidth="2"
      />
      <path
        d="M113 92v24M96 104h34"
        stroke="var(--ds-color-outline-variant)"
        strokeWidth="2"
      />
      <rect
        x="142"
        y="92"
        width="30"
        height="24"
        rx="3"
        fill="var(--ds-color-surface-container-low)"
        stroke="var(--ds-color-outline-variant)"
        strokeWidth="2"
      />
      <path
        d="M157 92v24M142 104h30"
        stroke="var(--ds-color-outline-variant)"
        strokeWidth="2"
      />
      <rect
        x="186"
        y="94"
        width="34"
        height="34"
        rx="3"
        fill="var(--ds-color-primary-container)"
        stroke="var(--ds-color-on-primary-container)"
        strokeWidth="2"
      />
      <circle cx="213" cy="112" r="2.5" fill="var(--ds-color-on-primary-container)" />
    </>
  )
}

function InvoicesIllustration() {
  return (
    <>
      <rect
        x="104"
        y="28"
        width="112"
        height="124"
        rx="10"
        fill="var(--ds-color-surface-container-lowest)"
        stroke="var(--ds-color-outline)"
        strokeWidth="3"
      />
      <path
        d="M188 28v24h28"
        fill="var(--ds-color-surface-container-low)"
        stroke="var(--ds-color-outline)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <rect
        x="120"
        y="48"
        width="46"
        height="7"
        rx="3.5"
        fill="var(--ds-color-on-primary-container)"
      />
      <rect
        x="120"
        y="64"
        width="58"
        height="4"
        rx="2"
        fill="var(--ds-color-outline-variant)"
      />
      <rect
        x="120"
        y="76"
        width="50"
        height="4"
        rx="2"
        fill="var(--ds-color-outline-variant)"
      />
      <rect
        x="120"
        y="88"
        width="58"
        height="4"
        rx="2"
        fill="var(--ds-color-outline-variant)"
      />
      <rect
        x="120"
        y="108"
        width="38"
        height="18"
        rx="4"
        fill="var(--ds-color-primary-container)"
      />
      <circle cx="214" cy="122" r="22" fill="var(--ds-color-success)" />
      <path
        d="m203 122 7 7 15-15"
        fill="none"
        stroke="var(--ds-color-on-success)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  )
}

function InventoryIllustration() {
  return (
    <>
      <rect
        x="66"
        y="128"
        width="188"
        height="6"
        rx="3"
        fill="var(--ds-color-outline-variant)"
      />
      <rect
        x="84"
        y="88"
        width="62"
        height="40"
        rx="6"
        fill="var(--ds-color-primary-container)"
        stroke="var(--ds-color-on-primary-container)"
        strokeWidth="2"
      />
      <path
        d="M84 101h62M115 88v13"
        stroke="var(--ds-color-on-primary-container)"
        strokeWidth="2"
      />
      <rect
        x="156"
        y="58"
        width="66"
        height="70"
        rx="6"
        fill="var(--ds-color-surface-container-low)"
        stroke="var(--ds-color-outline)"
        strokeWidth="2"
      />
      <path
        d="M156 76h66M189 58v18"
        stroke="var(--ds-color-outline-variant)"
        strokeWidth="2"
      />
      <rect
        x="104"
        y="58"
        width="42"
        height="30"
        rx="5"
        fill="var(--ds-color-secondary-container)"
        stroke="var(--ds-color-on-secondary-container)"
        strokeWidth="2"
      />
      <path
        d="M104 68h42M125 58v10"
        stroke="var(--ds-color-on-secondary-container)"
        strokeWidth="2"
      />
      <rect
        x="132"
        y="108"
        width="44"
        height="20"
        rx="5"
        fill="var(--ds-color-surface-container-lowest)"
        stroke="var(--ds-color-outline)"
        strokeWidth="2"
      />
      <path
        d="m154 113 12 10h-24Z"
        fill="var(--ds-color-warning-container)"
        stroke="var(--ds-color-on-warning-container)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M154 117v3"
        stroke="var(--ds-color-on-warning-container)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="154" cy="123" r="1" fill="var(--ds-color-on-warning-container)" />
    </>
  )
}

function FinancialsIllustration() {
  return (
    <>
      <path
        d="M76 132V50"
        stroke="var(--ds-color-outline)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M76 132h172"
        stroke="var(--ds-color-outline)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <rect x="96" y="96" width="26" height="36" rx="4" fill="var(--ds-color-primary-container)" />
      <rect x="136" y="78" width="26" height="54" rx="4" fill="var(--ds-color-primary-container)" />
      <rect x="176" y="60" width="26" height="72" rx="4" fill="var(--ds-color-primary-container)" />
      <rect x="216" y="42" width="26" height="90" rx="4" fill="var(--ds-color-primary)" />
      <path
        d="M108 86 148 66l40-14 54-12"
        fill="none"
        stroke="var(--ds-color-success)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m232 20 10 4-4 10"
        fill="none"
        stroke="var(--ds-color-success)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="96" cy="148" r="10" fill="var(--ds-color-warning-container)" />
      <circle cx="120" cy="148" r="10" fill="var(--ds-color-warning-container)" />
      <circle cx="108" cy="138" r="10" fill="var(--ds-color-warning-container)" />
    </>
  )
}

export default function OnboardingIllustration({
  variant,
}: OnboardingIllustrationProps) {
  return (
    <svg
      viewBox="0 0 320 180"
      role="img"
      aria-label={LABELS[variant]}
      focusable="false"
    >
      {variant === 'business' ? <BusinessIllustration /> : null}
      {variant === 'invoices' ? <InvoicesIllustration /> : null}
      {variant === 'inventory' ? <InventoryIllustration /> : null}
      {variant === 'financials' ? <FinancialsIllustration /> : null}
    </svg>
  )
}
