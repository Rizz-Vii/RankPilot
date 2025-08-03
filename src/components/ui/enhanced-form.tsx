"use client";

import { useHydration } from "@/components/HydrationContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { XCircle } from "lucide-react";
import React, { createContext, useContext, useRef } from "react";

interface EnhancedFormContextType {
  isSubmitting: boolean;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  values: Record<string, any>;
  setFieldValue: (name: string, _value: unknown) => void;
  setFieldTouched: (name: string, touched: boolean) => void;
  setFieldError: (name: string, _error: string) => void;
  clearFieldError: (name: string) => void;
  /**
   * Validation schema for type-safe field validation
   */
  schema?: unknown;
  /**
   * Field registration for better composition
   */
  registerField: (name: string, config?: FieldConfig) => void;
  unregisterField: (name: string) => void;
  /**
   * Submit handler with error boundary
   */
  submitWithErrorBoundary: (handler: () => Promise<void>) => Promise<void>;
}

interface FieldConfig {
  validate?: (_value: unknown) => string | undefined;
  transform?: (_value: unknown) => any;
  defaultValue?: unknown;
}

const EnhancedFormContext = createContext<EnhancedFormContextType | null>(null);

export function useEnhancedForm() {
  const context = useContext(EnhancedFormContext);
  if (!context) {
    throw new Error(
      "useEnhancedForm must be used within an EnhancedFormProvider"
    );
  }
  return context;
}

interface EnhancedFormProps {
  children: React.ReactNode;
  onSubmit: (values: Record<string, any>) => Promise<void> | void;
  initialValues?: Record<string, any>;
  validationSchema?: unknown; // Could be Zod schema
  className?: string;
  autoComplete?: string;
  noValidate?: boolean;
  ariaLabel?: string;
  submitOnEnter?: boolean;
}

export function EnhancedForm({
  children,
  onSubmit,
  initialValues = {},
  className,
  autoComplete = "on",
  noValidate = true,
  ariaLabel,
  submitOnEnter = true,
}: EnhancedFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});
  const [values, setValues] = React.useState(initialValues);
  const [submitAttempted, setSubmitAttempted] = React.useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const hydrated = useHydration();

  const setFieldValue = (name: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      clearFieldError(name);
    }
  };

  const setFieldTouched = (name: string, touched: boolean) => {
    setTouched((prev) => ({ ...prev, [name]: touched }));
  };

  const setFieldError = (name: string, error: string) => {
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const clearFieldError = (name: string) => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[name];
      return newErrors;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);

    // Mark all fields as touched to show validation errors
    const allFieldNames = Object.keys(values);
    const touchedFields = allFieldNames.reduce(
      (acc, name) => {
        acc[name] = true;
        return acc;
      },
      {} as Record<string, boolean>
    );
    setTouched(touchedFields);

    // Check if there are any errors
    if (Object.keys(errors).length > 0) {
      // Focus on first error field
      const firstErrorField = formRef.current?.querySelector(
        `[name="${Object.keys(errors)[0]}"]`
      ) as HTMLElement;
      firstErrorField?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } catch (_error) {
      console.error("Form submission _error:", _error);
      // You could set a global form error here
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (submitOnEnter && e.key === "Enter" && !e.shiftKey) {
      const target = e.target as HTMLElement;
      // Don't submit on Enter for textareas
      if (target.tagName.toLowerCase() !== "textarea") {
        handleSubmit(e as any);
      }
    }
  };

  const contextValue: EnhancedFormContextType = {
    isSubmitting,
    errors,
    touched,
    values,
    setFieldValue,
    setFieldTouched,
    setFieldError,
    clearFieldError,
    registerField: () => { }, // Placeholder implementation
    unregisterField: () => { }, // Placeholder implementation
    submitWithErrorBoundary: async () => { }, // Placeholder implementation
  };

  return (
    <EnhancedFormContext.Provider value={contextValue}>
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}
        className={cn("space-y-6", className)}
        autoComplete={autoComplete}
        noValidate={noValidate}
        aria-label={ariaLabel}
        aria-busy={isSubmitting}
      >
        {children}
      </form>
    </EnhancedFormContext.Provider>
  );
}

interface EnhancedFieldProps {
  name: string;
  label?: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  description?: string;
  validate?: (_value: unknown) => string | undefined;
  children?: (props: {
    _value: unknown;
    onChange: (_value: unknown) => void;
    onBlur: () => void;
    error?: string;
    touched: boolean;
    disabled: boolean;
  }) => React.ReactNode;
}

export function EnhancedField({
  name,
  label,
  type = "text",
  placeholder,
  required = false,
  disabled = false,
  className,
  description,
  validate,
  children,
}: EnhancedFieldProps) {
  const {
    values,
    errors,
    touched,
    isSubmitting,
    setFieldValue,
    setFieldTouched,
    setFieldError,
    clearFieldError,
  } = useEnhancedForm();

  const fieldValue = values[name] || "";
  const fieldError = errors[name];
  const fieldTouched = touched[name];
  const isDisabled = disabled || isSubmitting;
  const hydrated = useHydration();

  const handleChange = (_value: unknown) => {
    setFieldValue(name, _value);

    // Run validation if provided
    if (validate) {
      const error = validate(_value);
      if (error) {
        setFieldError(name, error);
      } else {
        clearFieldError(name);
      }
    }
  };

  const handleBlur = () => {
    setFieldTouched(name, true);
  };

  const fieldId = `field-${name}`;
  const errorId = `${fieldId}-error`;
  const descriptionId = `${fieldId}-description`;

  if (children) {
    return (
      <div className={cn("space-y-2", className)}>
        {label && (
          <label
            htmlFor={fieldId}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {label}
            {required && (
              <span className="text-destructive ml-1" aria-label="required">
                *
              </span>
            )}
          </label>
        )}
        {children({
          _value: fieldValue,
          onChange: handleChange,
          onBlur: handleBlur,
          error: fieldError,
          touched: fieldTouched,
          disabled: isDisabled,
        })}
        {description && (
          <p id={descriptionId} className="text-sm text-muted-foreground">
            {description}
          </p>
        )}
        <AnimatePresence>
          {fieldError && fieldTouched && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Alert variant="destructive" className="mt-2">
                <XCircle className="h-4 w-4" />
                <AlertDescription id={errorId}>{fieldError}</AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label
          htmlFor={fieldId}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {label}
          {required && (
            <span className="text-destructive ml-1" aria-label="required">
              *
            </span>
          )}
        </label>
      )}
      <input
        id={fieldId}
        name={name}
        type={type}
        value={fieldValue}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={!hydrated || isDisabled}
        required={required}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          fieldError &&
          fieldTouched &&
          "border-destructive focus-visible:ring-destructive"
        )}
        aria-invalid={fieldError && fieldTouched ? "true" : "false"}
        aria-describedby={cn(
          description && descriptionId,
          fieldError && fieldTouched && errorId
        )}
      />
      {description && (
        <p id={descriptionId} className="text-sm text-muted-foreground">
          {description}
        </p>
      )}
      <AnimatePresence>
        {fieldError && fieldTouched && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <Alert variant="destructive" className="mt-2">
              <XCircle className="h-4 w-4" />
              <AlertDescription id={errorId}>{fieldError}</AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
