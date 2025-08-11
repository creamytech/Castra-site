export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="text-2xl font-bold">Welcome to Castra</div>
        <div className="text-sm text-muted-foreground">Let’s set up your profile and preferences.</div>
      </div>
      {children}
    </div>
  )
}


