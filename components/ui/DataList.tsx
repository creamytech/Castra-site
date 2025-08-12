"use client"

import * as React from "react"
import { FixedSizeList as VirtualList, ListChildComponentProps } from "react-window"

export interface DataListProps<T> {
  items: T[]
  itemKey: (item: T, index: number) => React.Key
  itemHeight: number
  height: number
  renderRow: (item: T, index: number) => React.ReactNode
  className?: string
}

export function DataList<T>({ items, itemKey, itemHeight, height, renderRow, className }: DataListProps<T>) {
  const Row = React.useCallback(({ index, style }: ListChildComponentProps) => {
    const item = items[index]
    return (
      <div style={style} key={itemKey(item, index)}>
        {renderRow(item, index)}
      </div>
    )
  }, [items, itemKey, renderRow])

  return (
    <VirtualList
      className={className}
      height={height}
      itemCount={items.length}
      itemSize={itemHeight}
      width="100%"
    >
      {Row}
    </VirtualList>
  )
}

export default DataList


