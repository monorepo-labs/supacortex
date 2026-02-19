import Link from "next/link";

export const metadata = { title: "Privacy Policy — Supacortex" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <Link
        href="/"
        className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors"
      >
        &larr; Home
      </Link>

      <h1
        className="mt-6 text-3xl font-semibold text-zinc-900"
        style={{ fontFamily: "var(--font-source-serif)" }}
      >
        Privacy Policy
      </h1>
      <p className="mt-1 text-sm text-zinc-400">Last updated: February 13, 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-zinc-600">
        <section>
          <h2 className="font-medium text-zinc-900">1. Information We Collect</h2>
          <p>
            <strong>Account information:</strong> When you sign up, we collect
            your email address and password (hashed, never stored in plain
            text).
          </p>
          <p className="mt-2">
            <strong>Third-party account data:</strong> When you connect your X
            (Twitter) account, we store an access token and refresh token to
            sync your bookmarks on your behalf. We do not store your X
            password.
          </p>
          <p className="mt-2">
            <strong>Bookmarks and content:</strong> We store the bookmarks you
            save and content synced from connected platforms, including tweet
            text, author information, and media URLs.
          </p>
        </section>

        <section>
          <h2 className="font-medium text-zinc-900">2. How We Use Your Information</h2>
          <p>We use your information solely to:</p>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>Provide and maintain the Service</li>
            <li>Sync bookmarks from connected third-party accounts</li>
            <li>Authenticate your sessions</li>
          </ul>
          <p className="mt-2">
            We do not sell, rent, or share your personal information with third
            parties for marketing purposes.
          </p>
        </section>

        <section>
          <h2 className="font-medium text-zinc-900">3. Third-Party API Access</h2>
          <p>
            When you connect your X account, we request the following
            permissions: reading your bookmarks, reading tweet data, and
            offline access (to refresh tokens). We only access data necessary
            to provide the bookmark sync feature. You can revoke access at any
            time through your X account settings.
          </p>
        </section>

        <section>
          <h2 className="font-medium text-zinc-900">4. Data Storage</h2>
          <p>
            Your data is stored in a PostgreSQL database hosted on Railway
            (EU/US infrastructure). Access tokens for third-party services are
            stored encrypted in the database.
          </p>
        </section>

        <section>
          <h2 className="font-medium text-zinc-900">5. Data Retention</h2>
          <p>
            We retain your data for as long as your account is active. If you
            delete your account, all associated data (bookmarks, tokens,
            profile information) will be permanently deleted.
          </p>
        </section>

        <section>
          <h2 className="font-medium text-zinc-900">6. Cookies</h2>
          <p>
            We use session cookies to keep you logged in. We do not use
            tracking cookies or third-party analytics.
          </p>
        </section>

        <section>
          <h2 className="font-medium text-zinc-900">7. Your Rights</h2>
          <p>You have the right to:</p>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>Access and export your data</li>
            <li>Delete your account and all associated data</li>
            <li>Disconnect third-party accounts at any time</li>
          </ul>
        </section>

        <section>
          <h2 className="font-medium text-zinc-900">8. Changes to This Policy</h2>
          <p>
            We may update this policy from time to time. Changes will be posted
            on this page with an updated date.
          </p>
        </section>

        <section>
          <h2 className="font-medium text-zinc-900">9. Contact</h2>
          <p>
            For privacy-related questions, contact us at{" "}
            <a
              href="mailto:yogesh@bootstrapped.llc"
              className="text-zinc-900 underline"
            >
              yogesh@bootstrapped.llc
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
