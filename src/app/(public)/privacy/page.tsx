import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | RankPilot",
  description:
    "Learn how RankPilot protects your privacy and handles your data securely.",
};

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>

      <div className="prose prose-lg max-w-none">
        <p className="text-lg text-muted-foreground mb-6">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Introduction</h2>
          <p>
            At RankPilot, we take your privacy seriously. This Privacy Policy
            explains how we collect, use, disclose, and safeguard your
            information when you use our SEO analysis platform.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            Information We Collect
          </h2>
          <h3 className="text-xl font-medium mb-2">Personal Information</h3>
          <ul className="list-disc pl-6 mb-4">
            <li>Email address and account credentials</li>
            <li>Payment information (processed securely through Stripe)</li>
            <li>Profile information you provide</li>
          </ul>

          <h3 className="text-xl font-medium mb-2">Usage Information</h3>
          <ul className="list-disc pl-6 mb-4">
            <li>URLs you analyze and SEO data</li>
            <li>Usage patterns and feature interactions</li>
            <li>Device and browser information</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            How We Use Your Information
          </h2>
          <ul className="list-disc pl-6">
            <li>Provide and improve our SEO analysis services</li>
            <li>Process payments and manage subscriptions</li>
            <li>Send important updates and support communications</li>
            <li>Analyze usage to enhance platform performance</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Data Security</h2>
          <p>
            We implement industry-standard security measures to protect your
            _data:
          </p>
          <ul className="list-disc pl-6">
            <li>Encryption in transit and at rest</li>
            <li>Secure payment processing through Stripe</li>
            <li>Regular security audits and monitoring</li>
            <li>Access controls and authentication</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Third-Party Services</h2>
          <p>We use trusted third-party services:</p>
          <ul className="list-disc pl-6">
            <li>
              <strong>Firebase:</strong> Authentication and data storage
            </li>
            <li>
              <strong>Stripe:</strong> Secure payment processing
            </li>
            <li>
              <strong>OpenAI:</strong> AI-powered SEO analysis
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Your Rights</h2>
          <p>You have the right to:</p>
          <ul className="list-disc pl-6">
            <li>Access and update your personal information</li>
            <li>Delete your account and associated data</li>
            <li>Export your data</li>
            <li>Opt-out of marketing communications</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy, please contact us
            at{" "}
            <a
              href="mailto:privacy@rankpilot.com"
              className="text-primary hover:underline"
            >
              privacy@rankpilot.com
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
