import Link from 'next/link'

export default function OnboardingIndex() {
  return (
    <div className="space-y-4">
      <div className="text-xl font-semibold">Get started</div>
      <div className="flex gap-2 text-sm">
        <Link className="px-3 py-2 border rounded" href="/onboarding/profile">Profile</Link>
        <Link className="px-3 py-2 border rounded" href="/onboarding/tone">Tone</Link>
        <Link className="px-3 py-2 border rounded" href="/onboarding/email">Email Setup</Link>
        <Link className="px-3 py-2 border rounded" href="/onboarding/notify">Notifications</Link>
      </div>
    </div>
  )
}


