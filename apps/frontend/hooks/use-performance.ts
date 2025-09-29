'use client'

import { useCallback, useMemo, useRef, useEffect, useState } from 'react'
import { debounce, throttle } from 'lodash-es'

/**
 * Hook for debouncing values to reduce unnecessary re-renders
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])

  return debouncedValue
}

/**
 * Hook for throttling function calls
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const throttledFn = useRef(throttle(callback, delay))

  useEffect(() => {
    throttledFn.current = throttle(callback, delay)
  }, [callback, delay])

  return throttledFn.current as T
}

/**
 * Hook for debouncing function calls
 */
export function useDebounceCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const debouncedFn = useRef(debounce(callback, delay))

  useEffect(() => {
    debouncedFn.current = debounce(callback, delay)
  }, [callback, delay])

  return debouncedFn.current as T
}

/**
 * Hook for memoizing expensive calculations with dependencies
 */
export function useExpensiveMemo<T>(
  factory: () => T,
  deps: React.DependencyList | undefined,
  shouldRecalculate?: (prevDeps: React.DependencyList | undefined, nextDeps: React.DependencyList | undefined) => boolean
): T {
  const prevDepsRef = useRef<React.DependencyList | undefined>()
  const memoizedValueRef = useRef<T>()

  return useMemo(() => {
    const shouldRecompute = shouldRecalculate
      ? shouldRecalculate(prevDepsRef.current, deps)
      : true

    if (shouldRecompute || memoizedValueRef.current === undefined) {
      memoizedValueRef.current = factory()
      prevDepsRef.current = deps
    }

    return memoizedValueRef.current
  }, deps)
}

/**
 * Hook for stable callback references that don't change on every render
 */
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T
): T {
  const callbackRef = useRef<T>(callback)

  useEffect(() => {
    callbackRef.current = callback
  })

  return useCallback((...args: any[]) => {
    return callbackRef.current(...args)
  }, []) as T
}

/**
 * Hook for tracking component performance
 */
export function usePerformanceTracker(componentName: string) {
  const renderCountRef = useRef(0)
  const lastRenderTime = useRef(Date.now())

  useEffect(() => {
    renderCountRef.current += 1
    const now = Date.now()
    const timeSinceLastRender = now - lastRenderTime.current
    lastRenderTime.current = now

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${componentName} render #${renderCountRef.current}, time since last: ${timeSinceLastRender}ms`)
    }
  })

  return {
    renderCount: renderCountRef.current,
    logRender: useCallback((additionalInfo?: string) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Performance] ${componentName} manual log: ${additionalInfo || 'No additional info'}`)
      }
    }, [componentName])
  }
}

/**
 * Hook for preventing unnecessary re-renders when objects/arrays haven't actually changed
 */
export function useDeepMemo<T>(value: T): T {
  const ref = useRef<T>(value)

  if (JSON.stringify(ref.current) !== JSON.stringify(value)) {
    ref.current = value
  }

  return ref.current
}

/**
 * Hook for batching state updates to reduce re-renders
 */
export function useBatchedState<T>(initialState: T) {
  const [state, setState] = useState(initialState)
  const pendingUpdatesRef = useRef<Partial<T>[]>([])
  const timeoutRef = useRef<NodeJS.Timeout>()

  const batchedSetState = useCallback((update: Partial<T> | ((prev: T) => Partial<T>)) => {
    const updateObj = typeof update === 'function' ? update(state) : update
    pendingUpdatesRef.current.push(updateObj)

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      setState(prevState => {
        const allUpdates = pendingUpdatesRef.current
        pendingUpdatesRef.current = []

        return allUpdates.reduce((acc, update) => ({ ...acc, ...update }), prevState)
      })
    }, 0)
  }, [state])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return [state, batchedSetState] as const
}

/**
 * Hook for intersection observer with performance optimizations
 */
export function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = useState(false)
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setEntry(entry)
        setIsIntersecting(entry.isIntersecting)
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options
      }
    )

    observer.observe(element)

    return () => {
      observer.unobserve(element)
    }
  }, [elementRef, options])

  return { isIntersecting, entry }
}

/**
 * Hook for managing component visibility with performance optimizations
 */
export function useVisibility() {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  return isVisible
}

export default {
  useDebounce,
  useThrottle,
  useDebounceCallback,
  useExpensiveMemo,
  useStableCallback,
  usePerformanceTracker,
  useDeepMemo,
  useBatchedState,
  useIntersectionObserver,
  useVisibility
}