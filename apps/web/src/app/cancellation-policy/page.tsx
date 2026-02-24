"use client";

import Head from "next/head";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ErrorBoundary } from "react-error-boundary";

// Error Fallback Component
const ErrorFallback = ({ error }: { error: Error }) => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="p-6 rounded-lg shadow-sm border border-gray-100 text-center">
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

export default function CancellationRefundPolicy() {
  const router = useRouter();

  // Analytics
  useEffect(() => {
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "page_view", {
        page_title: "Cancellation & Refund Policy",
        page_location: window.location.href,
      });
    }
  }, []);

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <div className="min-h-screen">
        {/* SEO Meta Tags */}
        <Head>
          <title>Cancellation & Refund Policy | Tixin</title>
          <meta
            name="description"
            content="Learn about Tixin's Cancellation & Refund Policy, including guidelines for cancellations, refunds, and handling of defective or perishable items."
          />
          <meta
            name="keywords"
            content="Tixin, cancellation policy, refund policy, event tickets, customer service"
          />
          <meta name="robots" content="index, follow" />
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
              Cancellation & Refund Policy
            </h2>

            <div className="space-y-6 text-sm sm:text-base text-gray-700 leading-relaxed">
              <p className="text-gray-600">
                At Tixin, we are committed to ensuring a seamless and fair
                experience for our customers. Our cancellation and refund policy
                is designed to be transparent and accommodating. Please review
                the details below:
              </p>

              <div className="space-y-5">
                <div className="border-l-4 border-[#F6D100] pl-4  transition-colors duration-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Cancellation Requests
                  </h3>
                  <p>
                    Cancellations are accepted if requested within{" "}
                    <strong className="font-semibold">2 days</strong> of placing
                    the order. However, cancellations may not be processed if
                    the order has been sent to our vendors/merchants and
                    shipping has begun.
                  </p>
                </div>

                <div className="border-l-4 border-[#F6D100] pl-4  transition-colors duration-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Perishable Items
                  </h3>
                  <p>
                    Cancellation requests for perishable items (e.g., flowers or
                    food) are not accepted. Refunds or replacements may be
                    offered if the customer demonstrates that the delivered
                    product is of poor quality.
                  </p>
                </div>

                <div className="border-l-4 border-[#F6D100] pl-4  transition-colors duration-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Damaged or Defective Items
                  </h3>
                  <p>
                    If you receive damaged or defective items, please report the
                    issue to our Customer Service team within{" "}
                    <strong className="font-semibold">2 days</strong> of
                    receipt. The request will be reviewed once the merchant
                    verifies the condition.
                  </p>
                </div>

                <div className="border-l-4 border-[#F6D100] pl-4  transition-colors duration-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Product Discrepancies
                  </h3>
                  <p>
                    If the delivered product does not match the description on
                    our site or fails to meet your expectations, please notify
                    our Customer Service team within{" "}
                    <strong className="font-semibold">2 days</strong> of
                    receipt. Our team will investigate and take appropriate
                    action.
                  </p>
                </div>

                <div className="border-l-4 border-[#F6D100] pl-4  transition-colors duration-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Manufacturer Warranties
                  </h3>
                  <p>
                    For products with a manufacturer’s warranty, please contact
                    the manufacturer directly to address any issues.
                  </p>
                </div>

                <div className="border-l-4 border-[#F6D100] pl-4  transition-colors duration-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Refund Processing
                  </h3>
                  <p>
                    Approved refunds will be processed within{" "}
                    <strong className="font-semibold">16-30 days</strong> and
                    credited to the original payment method.
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
