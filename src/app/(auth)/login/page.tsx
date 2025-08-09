"use client";

import { useState, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { EnhancedAuthService } from "@/lib/services/enhanced-auth.service";
import { Eye, EyeOff } from "lucide-react";
import LoadingScreen from "@/components/ui/loading-screen";
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
        email,
        password
      );
      
      // Update login tracking with enhanced auth service
      try {
        await EnhancedAuthService.updateLoginTracking(userCredential.user.uid);
      } catch (trackingError) {
        console.warn("Login tracking update failed:", trackingError);
      }
      
      // Redirection is handled by the useEffect hook after auth state updates
    } catch (error: any) {
      setErrors({ form: error?.message || "Login failed. Please try again." });
    }
  };

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userDocRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(userDocRef);
      if (!docSnap.exists()) {
        await setDoc(userDocRef, {
          email: user.email,
          displayName: user.displayName,
          role: "user",
          createdAt: serverTimestamp(),
        });
      }
      // Redirection is handled by the useEffect hook after auth state updates
    } catch (error: any) {
      setErrors({
        form: error?.message || "Google sign-in failed. Please try again.",
      });
    }
  };

  if (loading) {
    return <LoadingScreen fullScreen text="Verifying your credentials..." />;
  }

  return (
    <div className="inset-0 flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-6 rounded-1xl shadow-xl border bg-card text-card-foreground">
        <h2 className="text-2xl font-bold text-center mb-2">Login</h2>
        <form onSubmit={handleLogin} className="space-y-4" noValidate>
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
              className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground ring-1 ring-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background transition"
              disabled={loading}
            />
            {errors.email && (
              <p className="text-red-600 text-xs mt-1">{errors.email}</p>
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
              className="w-full px-3 py-2 border border-input rounded-lg pr-10 bg-background text-foreground ring-1 ring-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background transition"
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
              <p className="text-red-600 text-xs mt-1">{errors.password}</p>
            )}
          </div>
          {errors.form && (
            <p className="text-red-600 text-xs mt-1">{errors.form}</p>
          )}
          <button
            type="submit"
            data-testid="login-button"
            className="w-full py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-lg hover:bg-primary/90 transition"
            disabled={loading}
          >
            Login
          </button>
          <p className="text-center text-xs text-muted-foreground mt-2">
            For your convenience, your session will remain active until you
            choose to log out.
          </p>
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

        <button
          onClick={handleGoogleSignIn}
          className="w-full inline-flex items-center justify-center py-2 border border-input rounded-lg shadow-sm bg-card text-sm font-medium text-foreground hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ring-offset-background"
          disabled={loading}
        >
          <GoogleIcon />
          Sign in with Google
        </button>

        <p className="text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link href="/register" className="text-primary hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
