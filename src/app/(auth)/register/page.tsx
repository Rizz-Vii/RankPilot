"use client";

import LoadingScreen from "@/components/ui/loading-screen";
import { useAuth } from "@/context/AuthContext";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { auth } from "@/lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type React from "react";
import { useRef, useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";

export default function RegisterPage() {
  // Auth guard - redirect authenticated users away from register page
  const { shouldRender } = useAuthGuard();
  const router = useRouter();
  const { loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Refs for focus management
  const emailRef = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);
  const confirmRef = useRef<HTMLInputElement | null>(null);
  const termsRef = useRef<HTMLInputElement | null>(null);
  const recaptchaRef = useRef<{ reset: () => void } | null>(null);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
    terms?: string;
    captcha?: string;
    form?: string;
  }>({});

  // Safe handler for ReCAPTCHA change without loosening types
  function handleCaptchaChange(value: unknown) {
    setCaptchaToken(typeof value === 'string' ? value : "");
  }

  if (loading) {
    return <LoadingScreen fullScreen text="Setting up your account..." />;
  }

  if (!shouldRender) {
    return <LoadingScreen fullScreen text="Redirecting..." />;
  }

  function validate() {
    const newErrors: typeof errors = {};
    if (!email.trim()) newErrors.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      newErrors.email = "Invalid email address.";
    if (!password) newErrors.password = "Password is required.";
    else if (password.length < 6)
      newErrors.password = "Password must be at least 6 characters.";
    if (!confirmPassword)
      newErrors.confirmPassword = "Please confirm your password.";
    else if (password !== confirmPassword)
      newErrors.confirmPassword = "Passwords do not match.";
    if (!agreeTerms)
      newErrors.terms = "You must agree to the Terms & Conditions.";
    if (process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY && !captchaToken)
      newErrors.captcha = "Please verify that you're human.";
    return newErrors;
  }

  function focusFirstError(errs: typeof errors) {
    if (errs.email) {
      emailRef.current?.focus();
      emailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (errs.password) {
      passwordRef.current?.focus();
      passwordRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (errs.confirmPassword) {
      confirmRef.current?.focus();
      confirmRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (errs.captcha) {
      // Attempt to reset captcha if available, using unknown + local narrow
      recaptchaRef.current?.reset?.();
      return;
    }
    if (errs.terms) {
      termsRef.current?.focus();
      termsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    const newErrors = validate();
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      focusFirstError(newErrors);
      return;
    }
    try {
      setSubmitting(true);
      // If captcha enabled, verify server-side before account creation
      if (process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY && captchaToken) {
        try {
          const resp = await fetch('/api/verify-captcha', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: captchaToken }),
          });
          if (!resp.ok) {
            const data = await resp.json().catch(() => ({}));
            const msg = (data && typeof data === 'object' && 'error' in data)
              ? 'Captcha verification failed. Please try again.'
              : 'Captcha verification failed. Please try again.';
            const errState = { ...newErrors, captcha: msg };
            setErrors(errState);
            focusFirstError(errState);
            setSubmitting(false);
            return;
          }
        } catch {
          const errState = { ...newErrors, captcha: 'Unable to verify captcha. Check your network and retry.' };
          setErrors(errState);
          focusFirstError(errState);
          setSubmitting(false);
          return;
        }
      }

      await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password.trim()
      );
      // User document will be created by ensureUserSubscription in AuthContext
      // This ensures consistent subscription structure across all auth methods
      router.push("/dashboard");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Registration failed. Please try again.';
      setErrors({
        form: message,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="inset-0 flex items-center justify-center bg-background">
      <form
        onSubmit={(e) => { void handleRegister(e); }}
        className="w-full max-w-md p-8 space-y-6 rounded-1xl shadow-xl border bg-card text-card-foreground -mt-16"
      >
  <h2 className="text-2xl font-bold text-center mb-2">Create Your Account</h2>
  <p className="text-sm text-muted-foreground text-center -mt-2">Launch your NeuroSEO™ growth workspace in under a minute.</p>
        <div>
          <label htmlFor="email" className="block font-medium mb-1 text-foreground">Work Email</label>
          <input
            id="email"
            type="email"
            role="textbox"
            autoComplete="email"
            aria-label="Email address"
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "email-error" : undefined}
              placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            ref={emailRef}
            className={`w-full px-3 py-2 border rounded-lg bg-background text-foreground ring-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ring-offset-background transition ${errors.email ? 'border-destructive ring-destructive focus-visible:ring-destructive' : 'border-input ring-border focus-visible:ring-ring'}`}
          />
          {errors.email && <p id="email-error" role="alert" className="text-xs text-destructive-foreground mt-1">{errors.email}</p>}
        </div>
        <div className="relative">
          <label htmlFor="password" className="block font-medium mb-1 text-foreground">Password</label>
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            role="textbox"
            autoComplete="new-password"
            aria-label="Password"
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? "password-error" : undefined}
              placeholder="Create a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            ref={passwordRef}
            className={`w-full px-3 py-2 border rounded-lg pr-10 bg-background text-foreground ring-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ring-offset-background transition ${errors.password ? 'border-destructive ring-destructive focus-visible:ring-destructive' : 'border-input ring-border focus-visible:ring-ring'}`}
          />
          <button
            type="button"
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3 top-9 text-muted-foreground"
            onClick={() => setShowPassword((v) => !v)}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
          {errors.password && <p id="password-error" role="alert" className="text-xs text-destructive-foreground mt-1">{errors.password}</p>}
        </div>
        <div className="relative">
          <label htmlFor="confirmPassword" className="block font-medium mb-1 text-foreground">Confirm Password</label>
          <input
            id="confirmPassword"
            type={showConfirm ? "text" : "password"}
            role="textbox"
            autoComplete="new-password"
            aria-label="Confirm password"
            aria-invalid={errors.confirmPassword ? true : undefined}
            aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
              placeholder="Re-enter your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            ref={confirmRef}
            className={`w-full px-3 py-2 border rounded-lg pr-10 bg-background text-foreground ring-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ring-offset-background transition ${errors.confirmPassword ? 'border-destructive ring-destructive focus-visible:ring-destructive' : 'border-input ring-border focus-visible:ring-ring'}`}
          />
          <button
            type="button"
            tabIndex={-1}
            aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
            className="absolute right-3 top-9 text-muted-foreground"
            onClick={() => setShowConfirm((v) => !v)}
          >
            {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
          {errors.confirmPassword && <p id="confirmPassword-error" role="alert" className="text-xs text-destructive-foreground mt-1">{errors.confirmPassword}</p>}
        </div>
        {process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY && (
          <div className="mt-2 flex justify-center">
            <div className="max-w-full overflow-x-auto" data-testid="recaptcha">
              <ReCAPTCHA
                ref={(el: unknown) => {
                  // Narrow unknown instance to minimal shape without widening types
                  if (el && typeof el === 'object' && 'reset' in el && typeof (el as { reset: unknown }).reset === 'function') {
                    const resetFn = (el as { reset: () => void }).reset;
                    recaptchaRef.current = { reset: () => resetFn() };
                  } else {
                    recaptchaRef.current = null;
                  }
                }}
                sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
                onChange={handleCaptchaChange}
              />
              {errors.captcha && <p role="alert" className="text-xs text-destructive-foreground mt-1 text-center">{errors.captcha}</p>}
            </div>
          </div>
        )}
        <div className="flex flex-col items-center justify-center">
          <div className="flex items-center">
            <input
              id="terms"
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              aria-invalid={errors.terms ? true : undefined}
              aria-describedby={errors.terms ? 'terms-error' : undefined}
              className="mr-2"
              ref={termsRef}
            />
            <label htmlFor="terms" className="text-sm text-foreground">
              I agree to the{" "}
              <a href="/terms" className="underline text-primary">
                Terms & Conditions
              </a>
            </label>
          </div>
          {errors.terms && (
            <p id="terms-error" role="alert" className="text-xs text-destructive-foreground mt-1">{errors.terms}</p>
          )}
        </div>
        {errors.form && (
          <p role="alert" className="text-xs text-destructive-foreground mt-1">{errors.form}</p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-lg hover:bg-primary/90 transition disabled:opacity-70"
        >
          {submitting ? 'Creating account…' : 'Register'}
        </button>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account? <Link href="/login" className="text-primary hover:underline">Log in</Link>
        </p>
      </form>
    </div>
  );
}
