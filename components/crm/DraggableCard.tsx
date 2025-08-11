"use client"

import { CSSProperties, ReactNode } from 'react'
import { useDraggable } from '@dnd-kit/core'

export default function DraggableCard({ id, children }: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id })
  // On touch devices, ensure element is draggable without long-press/keyboard
  // Make the whole card the drag handle by applying listeners to a wrapper
  const style: CSSProperties = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 10 } : {}
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className={(isDragging ? 'opacity-70 ' : '') + 'touch-none select-none'}>
      {children}
    </div>
  )
}
