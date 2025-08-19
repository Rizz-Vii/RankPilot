import type { Metadata } from "next";
import TermsClient from "./TermsClient";

export const metadata: Metadata = {
  title: "Terms of Service | RankPilot",
  description: "RankPilot Terms of Service and user agreement.",
};
export default function TermsPage() {
  return <TermsClient />;
}
