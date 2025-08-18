"use client";

import LoadingScreen from "@/components/ui/loading-screen";
import { useAuth } from "@/context/AuthContext";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { auth } from "@/lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";

export default function RegisterPage() {
  // Auth guard - redirect authenticated users away from register page
  const { shouldRender } = useAuthGuard();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
    terms?: string;
    captcha?: string;
    form?: string;
  }>({});

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

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    const newErrors = validate();
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    try {
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
    }
  }

  return (
    <div className="inset-0 flex items-center justify-center bg-background">
      <form
        onSubmit={handleRegister}
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
            aria-describedby="email-error"
              placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground ring-1 ring-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background transition"
          />
          <p id="email-error" className="text-xs text-destructive-foreground mt-1">{errors.email}</p>
        </div>
        <div className="relative">
          <label htmlFor="password" className="block font-medium mb-1 text-foreground">Password</label>
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            role="textbox"
            autoComplete="new-password"
            aria-label="Password"
            aria-describedby="password-error"
              placeholder="Create a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-lg pr-10 bg-background text-foreground ring-1 ring-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background transition"
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
          <p id="password-error" className="text-xs text-destructive-foreground mt-1">{errors.password}</p>
        </div>
        <div className="relative">
          <label htmlFor="confirmPassword" className="block font-medium mb-1 text-foreground">Confirm Password</label>
          <input
            id="confirmPassword"
            type={showConfirm ? "text" : "password"}
            role="textbox"
            autoComplete="new-password"
            aria-label="Confirm password"
            aria-describedby="confirmPassword-error"
              placeholder="Re-enter your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-lg pr-10 bg-background text-foreground ring-1 ring-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background transition"
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
          <p id="confirmPassword-error" className="text-xs text-destructive-foreground mt-1">{errors.confirmPassword}</p>
        </div>
        {process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY && (
          <div>
            <ReCAPTCHA
              sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
              onChange={(token) => setCaptchaToken(token || "")}
            />
            <p className="text-xs text-destructive-foreground mt-1">{errors.captcha}</p>
          </div>
        )}
        <div className="flex flex-col items-center justify-center">
          <div className="flex items-center">
            <input
              id="terms"
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="terms" className="text-sm text-foreground">
              I agree to the{" "}
              <a href="/terms" className="underline text-primary">
                Terms & Conditions
              </a>
            </label>
          </div>
          {errors.terms && (
            <p className="text-xs text-destructive-foreground mt-1">{errors.terms}</p>
          )}
        </div>
        {errors.form && (
          <p className="text-xs text-destructive-foreground mt-1">{errors.form}</p>
        )}
        <button
          type="submit"
          className="w-full py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-lg hover:bg-primary/90 transition"
        >
          Register
        </button>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account? <Link href="/login" className="text-primary hover:underline">Log in</Link>
        </p>
      </form>
    </div>
  );
}
