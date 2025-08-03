// /src/pages/api/verify-captcha.ts
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { token } = req.body;

  const response = await fetch(
    `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${token}`,
    { method: "POST" }
  );

  const _data = await response.json();
  if (!_data.success) {
    return res.status(400).json({ _error: "Captcha verification failed" });
  }

  res.status(200).json({ success: true });
}
