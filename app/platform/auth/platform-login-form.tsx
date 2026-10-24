'use client';

import { useSearchParams } from 'next/navigation';
import AuthCard from '../../(sme)/app/auth/auth-forms';

export default function PlatformLoginForm() {
  const searchParams = useSearchParams();
  const role = searchParams.get('role');
  const next = role === 'founder' ? '/founder' : role === 'admin' ? '/admin' : '/app';
  return <AuthCard view="login" next={next} />;
}
