import Link from "next/link";

export const metadata = { title: "Terms of Service — Supercortex" };

export default function TermsPage() {
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
        Terms of Service
      </h1>
      <p className="mt-1 text-sm text-zinc-400">Last updated: February 13, 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-zinc-600">
        <section>
          <h2 className="font-medium text-zinc-900">1. Acceptance of Terms</h2>
          <p>
            By accessing or using Supercortex (&quot;the Service&quot;), you
            agree to be bound by these Terms of Service. If you do not agree,
            do not use the Service.
          </p>
        </section>

        <section>
          <h2 className="font-medium text-zinc-900">2. Description of Service</h2>
          <p>
            Supercortex is a personal knowledge workspace that allows users to
            save bookmarks, sync content from third-party platforms (including
            X/Twitter), and organize saved content. The Service is provided
            &quot;as is&quot; and may change without notice.
          </p>
        </section>

        <section>
          <h2 className="font-medium text-zinc-900">3. Accounts</h2>
          <p>
            You are responsible for maintaining the security of your account
            credentials. You may connect third-party accounts (such as X) to
            enable additional features. You can disconnect these at any time.
          </p>
        </section>

        <section>
          <h2 className="font-medium text-zinc-900">4. User Content</h2>
          <p>
            Content you save to Supercortex remains yours. We do not claim
            ownership of your bookmarks, notes, or any other content you store.
            Content synced from third-party platforms is subject to those
            platforms&apos; terms of service.
          </p>
        </section>

        <section>
          <h2 className="font-medium text-zinc-900">5. Third-Party Services</h2>
          <p>
            The Service integrates with third-party platforms such as X/Twitter
            via their APIs. We access your data on these platforms only with
            your explicit authorization and only to provide the features you
            request (e.g., syncing bookmarks). We are not responsible for the
            availability or terms of third-party services.
          </p>
        </section>

        <section>
          <h2 className="font-medium text-zinc-900">6. Prohibited Use</h2>
          <p>
            You may not use the Service to violate any laws, infringe on
            others&apos; rights, distribute malware, or attempt to gain
            unauthorized access to the Service or its infrastructure.
          </p>
        </section>

        <section>
          <h2 className="font-medium text-zinc-900">7. Termination</h2>
          <p>
            We may suspend or terminate your access to the Service at our
            discretion. You may delete your account at any time.
          </p>
        </section>

        <section>
          <h2 className="font-medium text-zinc-900">8. Limitation of Liability</h2>
          <p>
            The Service is provided without warranties of any kind. We are not
            liable for any damages arising from your use of the Service,
            including loss of data.
          </p>
        </section>

        <section>
          <h2 className="font-medium text-zinc-900">9. Changes to Terms</h2>
          <p>
            We may update these terms at any time. Continued use of the Service
            after changes constitutes acceptance of the new terms.
          </p>
        </section>

        <section>
          <h2 className="font-medium text-zinc-900">10. Contact</h2>
          <p>
            For questions about these terms, contact us at{" "}
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
