import { useCaptcha } from "@/hooks/useCaptcha";
import { usePasswordToggle } from "@/hooks/usePasswordToggle";
import { useRateLimiter } from "@/hooks/useRateLimiter";
import { useState } from "react";
export interface SecureRegisterFormProps {
  onRegister: (args: {
    email: string;
    password: string;
    confirmPassword: string;
    captchaToken: string;
  }) => Promise<void>;
  agreeTerms: boolean;
  setAgreeTerms: React.Dispatch<React.SetStateAction<boolean>>;
  isLoading: boolean;
}

export function SecureRegisterForm({
  onRegister,
  isLoading,
}: SecureRegisterFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
    form?: string;
  }>({});

  const passwordToggle = usePasswordToggle();
  const confirmPasswordToggle = usePasswordToggle();
  const { captchaToken, CaptchaComponent } = useCaptcha();
  const { canProceed } = useRateLimiter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    if (!email) return setErrors((err) => ({ ...err, email: "Email required" }));
    if (!password)
      return setErrors((err) => ({ ...err, password: "Password required" }));
    if (password !== confirmPassword)
      return setErrors((err) => ({
        ...err,
        confirmPassword: "Passwords do not match",
      }));
    if (!captchaToken)
      return setErrors((err) => ({
        ...err,
        form: "Please verify that you're human.",
      }));
    if (!canProceed())
      return setErrors((err) => ({
        ...err,
        form: "Please wait before trying again.",
      }));
    // Fire and forget registration – internal promise handled by caller
    void onRegister({ email, password, confirmPassword, captchaToken });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
  {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
      </div>
      <div className="relative">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type={passwordToggle.show ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button
          type="button"
          onClick={passwordToggle.toggle}
          className="absolute right-3 top-2 text-sm"
        >
          {passwordToggle.show ? "Hide" : "Show"}
        </button>
        {errors.password && (
          <p className="text-xs text-destructive">{errors.password}</p>
        )}
      </div>
      <div className="relative">
        <label htmlFor="confirmPassword">Confirm Password</label>
        <input
          id="confirmPassword"
          type={confirmPasswordToggle.show ? "text" : "password"}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
        <button
          type="button"
          onClick={confirmPasswordToggle.toggle}
          className="absolute right-3 top-2 text-sm"
        >
          {confirmPasswordToggle.show ? "Hide" : "Show"}
        </button>
        {errors.confirmPassword && (
          <p className="text-xs text-destructive">{errors.confirmPassword}</p>
        )}
      </div>
      <div className="flex justify-center">{CaptchaComponent}</div>
      {errors.form && (
        <p className="text-xs text-destructive text-center">{errors.form}</p>
      )}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-2 bg-primary text-primary-foreground rounded"
      >
        Register
      </button>
    </form>
  );
}
