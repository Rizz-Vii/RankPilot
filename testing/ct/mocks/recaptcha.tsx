import React from "react";
export default function ReCAPTCHA(props: { onChange?: (v: string) => void }) {
  React.useEffect(() => {
    props.onChange?.("dummy");
  }, []);
  return <div data-testid="recaptcha-mock">reCAPTCHA</div>;
}
