import { useEffect, type RefObject } from 'react'

export function useClickOutside<T extends HTMLElement>(
  refs: RefObject<T> | RefObject<T>[],
  callback: () => void,
  enabled = true
) {
  useEffect(() => {
    if (!enabled) return

    const handleClickOutside = (event: MouseEvent) => {
      const refArray = Array.isArray(refs) ? refs : [refs]
      const clickedOutside = refArray.every(
        (ref) => ref.current && !ref.current.contains(event.target as Node)
      )
      if (clickedOutside) {
        callback()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [refs, callback, enabled])
}
