import { useState } from "react";
import { usePasswordToggle } from "@/hooks/usePasswordToggle";
import { useCaptcha } from "@/hooks/useCaptcha";
import { useRateLimiter } from "@/hooks/useRateLimiter";
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    if (!email) return setErrors((e) => ({ ...e, email: "Email required" }));
    if (!password)
      return setErrors((e) => ({ ...e, password: "Password required" }));
    if (password !== confirmPassword)
      return setErrors((e) => ({
        ...e,
        confirmPassword: "Passwords do not match",
      }));
    if (!captchaToken)
      return setErrors((e) => ({
        ...e,
        form: "Please verify that you're human.",
      }));
    if (!canProceed())
      return setErrors((e) => ({
        ...e,
        form: "Please wait before trying again.",
      }));
    await onRegister({ email, password, confirmPassword, captchaToken });
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
        {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
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
          <p className="text-xs text-red-600">{errors.password}</p>
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
          <p className="text-xs text-red-600">{errors.confirmPassword}</p>
        )}
      </div>
      <div className="flex justify-center">{CaptchaComponent}</div>
      {errors.form && (
        <p className="text-xs text-red-600 text-center">{errors.form}</p>
      )}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-2 bg-blue-600 text-white rounded"
      >
        Register
      </button>
    </form>
  );
}
