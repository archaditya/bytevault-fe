import { useState, useEffect } from "react";

/**
 * Debounces a value by the specified delay in milliseconds.
 * Returns the debounced value that only updates after the user stops changing it.
 * 
 * @param value - The value to debounce
 * @param delayMs - Debounce delay in milliseconds (default: 300ms)
 * @returns The debounced value
 * 
 * @example
 * const debouncedSearch = useDebouncedValue(searchQuery, 300);
 * // debouncedSearch only updates 300ms after searchQuery stops changing
 */
export function useDebouncedValue<T>(value: T, delayMs: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debouncedValue;
}
