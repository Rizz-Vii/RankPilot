"use client";

import { useState, useEffect } from "react";

export function useDebounce<T>(_value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(_value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(_value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [_value, delay]);

  return debouncedValue;
}
