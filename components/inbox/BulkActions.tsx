'use client'

export default function BulkActions({
  selectedCount,
  onMarkRead,
  onMarkUnread,
  onArchive,
  onClear
}: {
  selectedCount: number
  onMarkRead: () => void
  onMarkUnread: () => void
  onArchive: () => void
  onClear: () => void
}) {
  if (selectedCount <= 0) return null
  return (
    <div className="sticky top-[52px] z-30 bg-card/90 backdrop-blur border-b px-3 py-2 flex items-center gap-2">
      <div className="text-sm">{selectedCount} selected</div>
      <button onClick={onMarkRead} className="text-xs px-2 py-1 rounded border hover:bg-muted">Mark read</button>
      <button onClick={onMarkUnread} className="text-xs px-2 py-1 rounded border hover:bg-muted">Mark unread</button>
      <button onClick={onArchive} className="text-xs px-2 py-1 rounded border hover:bg-muted">Archive</button>
      <button onClick={onClear} className="ml-auto text-xs px-2 py-1 rounded border hover:bg-muted">Clear</button>
    </div>
  )
}


