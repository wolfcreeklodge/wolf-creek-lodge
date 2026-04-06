import { useState, useEffect } from 'react';

/**
 * Debounce a value by the given delay (ms).
 * @param {*} value
 * @param {number} delay - defaults to 300ms
 * @returns {*} debounced value
 */
export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export default useDebounce;
