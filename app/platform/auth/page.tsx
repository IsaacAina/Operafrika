import type { Metadata } from 'next'
import PlatformLoginForm from './platform-login-form'

export const metadata: Metadata = {
  title: 'Platform Login',
}

export default function PlatformAuthPage() {
  return <PlatformLoginForm />
}
