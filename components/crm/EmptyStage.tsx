"use client"

export default function EmptyStage({ stage }: { stage: string }) {
  return (
    <div className="text-xs text-muted-foreground p-3 border border-dashed rounded">
      <div>No deals in {stage} yet.</div>
      <div className="mt-2 flex gap-2">
        <button onClick={() => (window as any).dispatchEvent(new CustomEvent('open-new-deal'))} className="px-2 py-1 rounded border">+ New Deal</button>
        <button onClick={() => (window.location.href = '/dashboard/inbox')} className="px-2 py-1 rounded border">Import from Inbox</button>
      </div>
    </div>
  )
}
