"use client";
/* ALLOW_HEX: brand colors in embedded Google SVG icon */

import LoadingScreen from "@/components/ui/loading-screen";
import { useAuth } from "@/context/AuthContext";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { auth } from "@/lib/firebase";
import { EnhancedAuthService } from "@/lib/services/enhanced-auth.service";
import { safeErrorMessage } from "@/lib/utils";
import {
  GithubAuthProvider,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
const GoogleIcon = () => (
  <svg
    className="mr-2 h-4 w-4"
    width="18"
    height="18"
    viewBox="0 0 18 18"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g fill="none" fillRule="evenodd">
      <path
        d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.79 2.72v2.26h2.9c1.7-1.56 2.67-3.88 2.67-6.62z"
        fill="#4285F4"
      ></path>
      <path
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-2.06.92-1.65.12-3.4-.7-4.04-2.58H1.96v2.33A8.99 8.99 0 0 0 9 18z"
        fill="#34A853"
      ></path>
      <path
        d="M4.96 10.71A5.41 5.41 0 0 1 4.64 9c0-.58.1-1.15.32-1.7V5.01L1.96 5C1.34 6.18 1 7.55 1 9s.34 2.82 1.96 4z"
        fill="#FBBC05"
      ></path>
      <path
        d="M9 3.9c1.32 0 2.5.45 3.44 1.34l2.58-2.58A9 9 0 0 0 9 0a8.99 8.99 0 0 0-7.04 4l3.02 2.33c.63-1.88 2.39-2.7 4.02-2.73z"
        fill="#EA4335"
      ></path>
    </g>
  </svg>
);

export default function LoginPage() {
  // Auth guard - redirect authenticated users away from login page
  const { shouldRender } = useAuthGuard();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    form?: string;
  }>({});
  const router = useRouter();

  const { user, loading, role } = useAuth();

  // Improved redirection logic
  useEffect(() => {
    if (!loading && user && shouldRender) {
      const redirectPath = role === "admin" ? "/adminonly" : "/dashboard";
      router.push(redirectPath);
    }
  }, [user, loading, role, router, shouldRender]);

  if (loading) {
    return <LoadingScreen fullScreen text="Verifying your credentials..." />;
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
    return newErrors;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = validate();
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      // Update login tracking with enhanced auth service
      try {
        await EnhancedAuthService.updateLoginTracking(userCredential.user.uid);
      } catch (trackingError) {
        console.warn("Login tracking update failed:", trackingError);
      }

      // Redirection is handled by the useEffect hook after auth state updates
    } catch (error: unknown) {
      setErrors({ form: safeErrorMessage(error) || "Login failed. Please try again." });
    }
  };

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // Redirection is handled by the useEffect hook after auth state updates
    } catch (error: unknown) {
      setErrors({
        form: safeErrorMessage(error) || "Google sign-in failed. Please try again.",
      });
    }
  };

  const handleGithubSignIn = async () => {
    const provider = new GithubAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // Redirection is handled by the useEffect hook after auth state updates
    } catch (error: unknown) {
      setErrors({
        form: safeErrorMessage(error) || "GitHub sign-in failed. Please try again.",
      });
    }
  };

  if (loading) {
    return <LoadingScreen fullScreen text="Verifying your credentials..." />;
  }

  return (
    <div className="inset-0 flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-6 rounded-1xl shadow-xl border bg-card text-card-foreground">
  <h2 className="text-2xl font-bold text-center mb-2">Welcome Back</h2>
  <p className="text-sm text-muted-foreground text-center -mt-2 mb-4">Access your unified NeuroSEO™ workspace.</p>
        <form onSubmit={(e) => { void handleLogin(e); }} className="space-y-4" noValidate>
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium mb-1 text-foreground"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={errors.email ? 'login-email-error' : undefined}
              className={`w-full px-3 py-2 border rounded-lg bg-background text-foreground ring-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ring-offset-background transition ${errors.email ? 'border-destructive ring-destructive focus-visible:ring-destructive' : 'border-input ring-border focus-visible:ring-ring'}`}
              disabled={loading}
            />
            {errors.email && (
              <p id="login-email-error" role="alert" className="text-destructive-foreground text-xs mt-1">{errors.email}</p>
            )}
          </div>
          <div className="relative">
            <label
              htmlFor="password"
              className="block text-sm font-medium mb-1 text-foreground"
            >
              Password
            </label>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={errors.password ? 'login-password-error' : undefined}
              className={`w-full px-3 py-2 border rounded-lg pr-10 bg-background text-foreground ring-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ring-offset-background transition ${errors.password ? 'border-destructive ring-destructive focus-visible:ring-destructive' : 'border-input ring-border focus-visible:ring-ring'}`}
              disabled={loading}
            />
            <button
              type="button"
              tabIndex={-1}
              className="absolute right-3 top-9 text-muted-foreground"
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
            {errors.password && (
              <p id="login-password-error" role="alert" className="text-destructive-foreground text-xs mt-1">{errors.password}</p>
            )}
          </div>
          {errors.form && (
            <p role="alert" className="text-destructive-foreground text-xs mt-1">{errors.form}</p>
          )}
          <button
            type="submit"
            data-testid="login-button"
            className="w-full py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-lg hover:bg-primary/90 transition"
            disabled={loading}
          >
            Login
          </button>
          <p className="text-center text-xs text-muted-foreground mt-2">Secure session persists until you sign out. MFA & SSO available on higher tiers.</p>
        </form>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            onClick={() => { void handleGoogleSignIn(); }}
            className="w-full inline-flex items-center justify-center py-2 border border-input rounded-lg shadow-sm bg-card text-sm font-medium text-foreground hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ring-offset-background"
            disabled={loading}
          >
            <GoogleIcon />
            Google
          </button>
          <button
            onClick={() => { void handleGithubSignIn(); }}
            className="w-full inline-flex items-center justify-center py-2 border border-input rounded-lg shadow-sm bg-card text-sm font-medium text-foreground hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ring-offset-background"
            disabled={loading}
            aria-label="Sign in with GitHub"
          >
            {/* Simple GitHub mark */}
            <svg className="mr-2 h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 0 0 5.47 7.59c.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.01.08-2.1 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.09.16 1.9.08 2.1.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.92-.01 2.18 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" /></svg>
            GitHub
          </button>
        </div>

  <p className="text-center text-sm text-muted-foreground">New here? <Link href="/register" className="text-primary hover:underline">Create an account</Link></p>
      </div>
    </div>
  );
}
