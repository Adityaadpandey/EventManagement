"use client";

import Head from "next/head";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ErrorBoundary } from "react-error-boundary";

// Error Fallback Component
const ErrorFallback = ({ error }: { error: Error }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 text-center">
      <h2 className="text-lg font-semibold text-red-600">
        Something went wrong
      </h2>
      <p className="text-gray-600 mt-2">{error.message}</p>
      <button
        onClick={() => window.location.reload()}
        className="mt-4 inline-flex items-center px-4 py-2 bg-[var(--color-primary)] text-black rounded-lg shadow-sm hover:brightness-95 transition-colors duration-200"
      >
        Refresh Page
      </button>
    </div>
  </div>
);

export default function PrivacyPolicy() {
  const router = useRouter();

  // Analytics (Placeholder for Google Analytics or similar)
  useEffect(() => {
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "page_view", {
        page_title: "Privacy Policy",
        page_location: window.location.href,
      });
    }
  }, []);

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <div className="bg-gray-50">
        {/* SEO Meta Tags */}
        <Head>
          <title>Privacy Policy | Tixin</title>
          <meta
            name="description"
            content="Learn how Tixin collects, uses, and protects your personal information in accordance with our Privacy Policy, including details on cookies and data control."
          />
          <meta
            name="keywords"
            content="Tixin, privacy policy, data protection, cookies, personal information, event tickets"
          />
          <meta name="robots" content="index, follow" />
          <link rel="canonical" href="https://www.tixin.com/privacy-policy" />
        </Head>

        {/* Navigation Bar */}
        <nav
          className="bg-white shadow-sm border-b border-gray-200"
          aria-label="Main navigation"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                  Tixin
                </h1>
              </div>
              <div className="flex items-center space-x-3 sm:space-x-4">
                <button
                  onClick={() => router.back()}
                  className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 bg-white text-gray-700 rounded-lg shadow-sm hover:bg-gray-50 transition-colors duration-200 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F6D100]"
                  aria-label="Go back to previous page"
                >
                  <svg
                    className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  Back
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 pb-32">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 xs:p-6 sm:p-8 space-y-6 animate-fade-in">
            <h2 className="text-2xl xs:text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
              Privacy Policy
            </h2>

            <div className="space-y-6 text-sm sm:text-base text-gray-700 leading-relaxed">
              <p className="text-gray-600">
                At Tixin, we are committed to protecting your privacy. This
                Privacy Policy outlines how we collect, use, and safeguard your
                information when you visit our website or make a purchase.
                Please review the details below:
              </p>

              <div className="space-y-5">
                <div className="border-l-4 border-[#F6D100] pl-4 transition-colors duration-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Information We Collect
                  </h3>
                  <p>We may collect the following information:</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Name</li>
                    <li>Contact information, including email address</li>
                    <li>
                      Demographic information such as postcode, preferences, and
                      interests, if required
                    </li>
                    <li>
                      Other information relevant to customer surveys and/or
                      offers
                    </li>
                  </ul>
                </div>

                <div className="border-l-4 border-[#F6D100] pl-4 transition-colors duration-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    How We Use Your Information
                  </h3>
                  <p>
                    We use the collected information to understand your needs
                    and provide a better service, specifically for:
                  </p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Internal record keeping</li>
                    <li>Improving our products and services</li>
                    <li>
                      Sending promotional emails about new products, special
                      offers, or other information we think you may find
                      interesting using the provided email address
                    </li>
                    <li>
                      Contacting you for market research purposes via email,
                      phone, fax, or mail
                    </li>
                    <li>Customizing the website according to your interests</li>
                  </ul>
                </div>

                <div className="border-l-4 border-[#F6D100] pl-4 transition-colors duration-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Security
                  </h3>
                  <p>
                    We are committed to ensuring your information is secure. We
                    have implemented suitable measures to prevent unauthorized
                    access or disclosure of your data.
                  </p>
                </div>

                <div className="border-l-4 border-[#F6D100] pl-4 transition-colors duration-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    How We Use Cookies
                  </h3>
                  <p>
                    A cookie is a small file that, with your permission, is
                    placed on your computer’s hard drive. Cookies help analyze
                    web traffic and allow web applications to tailor operations
                    to your preferences by remembering your likes and dislikes.
                  </p>
                  <p>
                    We use traffic log cookies to identify which pages are being
                    used, helping us analyze webpage traffic data and improve
                    our website. This information is used solely for statistical
                    analysis, and the data is removed from the system afterward.
                  </p>
                  <p>
                    Cookies do not give us access to your computer or any
                    personal information beyond what you choose to share. You
                    can accept or decline cookies via your browser settings,
                    though declining cookies may limit website functionality.
                  </p>
                </div>

                <div className="border-l-4 border-[#F6D100] pl-4 transition-colors duration-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Controlling Your Personal Information
                  </h3>
                  <p>
                    You may restrict the collection or use of your personal
                    information by:
                  </p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>
                      Checking the box on website forms to indicate you do not
                      want your information used for direct marketing purposes
                    </li>
                    <li>
                      Contacting us at{" "}
                      <a
                        href="mailto:hq@tixin.com"
                        className="text-[#F6D100] hover:underline font-medium"
                        rel="noopener noreferrer"
                      >
                        hq@tixin.com
                      </a>{" "}
                      if you previously agreed to direct marketing and wish to
                      change your preference
                    </li>
                  </ul>
                  <p>
                    We will not sell, distribute, or lease your personal
                    information to third parties unless we have your permission
                    or are required by law. We may use your information to send
                    promotional information about third parties if you consent.
                  </p>
                </div>

                <div className="border-l-4 border-[#F6D100] pl-4 transition-colors duration-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Correcting Your Information
                  </h3>
                  <p>
                    If you believe any information we hold about you is
                    incorrect or incomplete, please write to us at Hazlehut
                    Apartments, Law Gate Road, near LPU, Kapurthala, Punjab
                    144411, India, or contact us at{" "}
                    <a
                      href="mailto:hq@tixin.com"
                      className="text-[#F6D100] hover:underline font-medium"
                      rel="noopener noreferrer"
                    >
                      hq@tixin.com
                    </a>
                    . We will promptly correct any inaccuracies.
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <p className="text-sm sm:text-base">
                  For assistance, please contact our Customer Service team at{" "}
                  <a
                    href="mailto:hq@tixin.com"
                    className="text-[#F6D100] hover:underline font-medium"
                    rel="noopener noreferrer"
                  >
                    hq@tixin.com
                  </a>
                  .
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className="mt-8 text-center text-sm text-gray-500 py-6 border-t border-gray-200">
            &copy; {new Date().getFullYear()} Tixin. All rights reserved.
          </footer>
        </main>
      </div>
    </ErrorBoundary>
  );
}
