import type { Metadata } from "next";
import PrivacyClient from "./PrivacyClient";

export const metadata: Metadata = {
  title: "Privacy Policy | RankPilot",
  description: "Learn how RankPilot protects your privacy and handles your data securely.",
};

export default function PrivacyPage() {
  return <PrivacyClient />;
}
