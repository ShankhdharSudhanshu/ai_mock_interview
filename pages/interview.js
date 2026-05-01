import { useEffect } from 'react';
import { useRouter } from 'next/router';

// Old /interview route — redirect to dashboard
export default function InterviewRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/dashboard'); }, [router]);
  return null;
}