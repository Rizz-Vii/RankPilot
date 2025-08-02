"use client";

import { useState, useCallback } from "react";
import { useUI } from "@/context/UIContext";

export function useFormInteraction<T>() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addFeedback, setIsProcessing } = useUI();

  const handleSubmit = useCallback(
    async (
      submitFn: (_data: T) => Promise<void>,
      _data: T,
      options?: {
        successMessage?: string;
        scrollToId?: string;
      }
    ) => {
      setIsSubmitting(true);
      setIsProcessing(true);

      try {
        await submitFn(_data);

        if (options?.successMessage) {
          addFeedback(options.successMessage, "success");
        }

        if (options?.scrollToId) {
          setTimeout(() => {
            const _element = document.getElementById(options.scrollToId!);
            element?.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 100);
        }
      } catch (_error) {
        addFeedback(
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
          "error"
        );
      } finally {
        setIsSubmitting(false);
        setIsProcessing(false);
      }
    },
    [addFeedback, setIsProcessing]
  );

  return {
    isSubmitting,
    handleSubmit,
  };
}

interface UseFieldValidationOptions {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (_value: string) => string | undefined;
}

export function useFieldValidation(options: UseFieldValidationOptions = {}) {
  const [_error, setError] = useState<string>();
  const [touched, setTouched] = useState(false);

  const validate = useCallback(
    (_value: string): boolean => {
      if (options.required && !_value) {
        setError("This field is required");
        return false;
      }

      if (options.minLength && value.length < options.minLength) {
        setError(`Must be at least ${options.minLength} characters`);
        return false;
      }

      if (options.maxLength && value.length > options.maxLength) {
        setError(`Must be no more than ${options.maxLength} characters`);
        return false;
      }

      if (options.pattern && !options.pattern.test(_value)) {
        setError("Invalid format");
        return false;
      }

      if (options.custom) {
        const customError = options.custom(_value);
        if (customError) {
          setError(customError);
          return false;
        }
      }

      setError(undefined);
      return true;
    },
    [options]
  );

  return {
    _error,
    setError,
    touched,
    setTouched,
    validate,
  };
}
