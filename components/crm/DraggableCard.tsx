"use client"

import { CSSProperties, ReactNode } from 'react'
import { useDraggable, useDroppable } from '@dnd-kit/core'

export default function DraggableCard({ id, children, data }: { id: string; children: ReactNode; data?: any }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id, data })
  const { setNodeRef: setDropRef } = useDroppable({ id, data })
  const setRefs = (node: any) => { setNodeRef(node); setDropRef(node) }
  // On touch devices, ensure element is draggable without long-press/keyboard
  // Make the whole card the drag handle by applying listeners to a wrapper
  const style: CSSProperties = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 10 } : {}
  return (
    <div ref={setRefs} style={style} {...listeners} {...attributes} data-dragging={isDragging ? 'true' : 'false'} className={(isDragging ? 'opacity-90 scale-[1.02] shadow-lg ' : '') + 'touch-none select-none will-change-transform transition-transform'}>
      {children}
    </div>
  )
}
