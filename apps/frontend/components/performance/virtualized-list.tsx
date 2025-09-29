'use client'

import React, { memo, useMemo, useCallback, useState, useEffect } from 'react'
import { FixedSizeList as List, VariableSizeList, areEqual } from 'react-window'
import { cn } from '@/lib/utils'
import { useIntersectionObserver } from '@/hooks/use-performance'

interface VirtualizedListProps<T> {
  items: T[]
  itemHeight: number | ((index: number) => number)
  renderItem: (item: T, index: number) => React.ReactNode
  className?: string
  height?: number
  width?: string | number
  overscan?: number
  onItemsRendered?: (startIndex: number, endIndex: number) => void
  isLoading?: boolean
  hasNextPage?: boolean
  loadMoreItems?: () => void
  loadingComponent?: React.ReactNode
  emptyComponent?: React.ReactNode
  estimatedItemSize?: number
}

// Memoized list item component to prevent unnecessary re-renders
const VirtualizedListItem = memo<{
  index: number
  style: React.CSSProperties
  data: {
    items: any[]
    renderItem: (item: any, index: number) => React.ReactNode
  }
}>(({ index, style, data }) => {
  const item = data.items[index]
  return (
    <div style={style}>
      {data.renderItem(item, index)}
    </div>
  )
}, areEqual)

VirtualizedListItem.displayName = 'VirtualizedListItem'

export function VirtualizedList<T>({
  items,
  itemHeight,
  renderItem,
  className,
  height = 400,
  width = '100%',
  overscan = 5,
  onItemsRendered,
  isLoading = false,
  hasNextPage = false,
  loadMoreItems,
  loadingComponent,
  emptyComponent,
  estimatedItemSize = 50
}: VirtualizedListProps<T>) {
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  // Memoize the item data to prevent unnecessary re-renders
  const itemData = useMemo(() => ({
    items,
    renderItem
  }), [items, renderItem])

  // Handle infinite scrolling
  const handleItemsRendered = useCallback(({
    overscanStartIndex,
    overscanStopIndex,
    visibleStartIndex,
    visibleStopIndex
  }: {
    overscanStartIndex: number
    overscanStopIndex: number
    visibleStartIndex: number
    visibleStopIndex: number
  }) => {
    onItemsRendered?.(visibleStartIndex, visibleStopIndex)

    // Load more items when approaching the end
    if (
      hasNextPage &&
      !isLoadingMore &&
      loadMoreItems &&
      overscanStopIndex >= items.length - 3
    ) {
      setIsLoadingMore(true)
      loadMoreItems()
    }
  }, [hasNextPage, isLoadingMore, loadMoreItems, items.length, onItemsRendered])

  useEffect(() => {
    if (!isLoading) {
      setIsLoadingMore(false)
    }
  }, [isLoading])

  // Show empty state
  if (items.length === 0 && !isLoading) {
    return (
      <div className={cn('flex items-center justify-center h-64', className)}>
        {emptyComponent || <p className="text-muted-foreground">No items to display</p>}
      </div>
    )
  }

  const ListComponent = typeof itemHeight === 'function' ? VariableSizeList : List

  return (
    <div className={cn('w-full', className)}>
      <ListComponent
        height={height}
        width={width}
        itemCount={items.length + (hasNextPage ? 1 : 0)}
        itemSize={typeof itemHeight === 'function' ? itemHeight : itemHeight}
        itemData={itemData}
        overscanCount={overscan}
        onItemsRendered={handleItemsRendered}
        estimatedItemSize={estimatedItemSize}
      >
        {VirtualizedListItem}
      </ListComponent>

      {(isLoading || isLoadingMore) && (
        <div className="flex items-center justify-center p-4">
          {loadingComponent || (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-muted-foreground">Loading...</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Grid virtualization for cards/tiles
interface VirtualizedGridProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  columnCount: number
  rowHeight: number
  className?: string
  height?: number
  width?: string | number
  gap?: number
}

export const VirtualizedGrid = memo(<T,>({
  items,
  renderItem,
  columnCount,
  rowHeight,
  className,
  height = 400,
  width = '100%',
  gap = 16
}: VirtualizedGridProps<T>) => {
  const rowCount = Math.ceil(items.length / columnCount)

  const getItemData = useMemo(() => ({
    items,
    renderItem,
    columnCount,
    gap
  }), [items, renderItem, columnCount, gap])

  const GridRow = memo<{
    index: number
    style: React.CSSProperties
    data: typeof getItemData
  }>(({ index, style, data }) => {
    const startIndex = index * data.columnCount
    const endIndex = Math.min(startIndex + data.columnCount, data.items.length)

    return (
      <div style={style} className="flex" style={{ ...style, gap: data.gap }}>
        {Array.from({ length: endIndex - startIndex }, (_, colIndex) => {
          const itemIndex = startIndex + colIndex
          const item = data.items[itemIndex]

          return (
            <div
              key={itemIndex}
              style={{
                flex: `0 0 calc((100% - ${(data.columnCount - 1) * data.gap}px) / ${data.columnCount})`
              }}
            >
              {item && data.renderItem(item, itemIndex)}
            </div>
          )
        })}
      </div>
    )
  }, areEqual)

  GridRow.displayName = 'GridRow'

  return (
    <div className={cn('w-full', className)}>
      <List
        height={height}
        width={width}
        itemCount={rowCount}
        itemSize={rowHeight}
        itemData={getItemData}
      >
        {GridRow}
      </List>
    </div>
  )
})

VirtualizedGrid.displayName = 'VirtualizedGrid'

// Infinite scrolling hook for use with virtualized lists
export function useInfiniteScroll<T>({
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
}: {
  fetchNextPage: () => void
  hasNextPage: boolean
  isFetchingNextPage: boolean
}) {
  const loadMoreRef = React.useRef<HTMLDivElement>(null)
  const { isIntersecting } = useIntersectionObserver(loadMoreRef, {
    threshold: 0.1,
    rootMargin: '100px'
  })

  useEffect(() => {
    if (isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage])

  return { loadMoreRef }
}

export default VirtualizedList