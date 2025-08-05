import React, { useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";

export function useCaptcha() {
  const [captchaToken, setCaptchaToken] = useState("");
  const CaptchaComponent = (
    <ReCAPTCHA
      sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!}
      onChange={(token: string | null) => setCaptchaToken(token || "")}
    />
  );
  return { captchaToken, setCaptchaToken, CaptchaComponent };
}
