"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Head from "next/head";
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
        className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 transition-colors duration-200"
      >
        Refresh Page
      </button>
    </div>
  </div>
);

export default function TermsAndConditions() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "page_view", {
        page_title: "Terms and Conditions",
        page_location: window.location.href,
      });
    }
  }, []);

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <div className="min-h-screen">
        <Head>
          <title>Terms and Conditions | Tixin</title>
          <meta
            name="description"
            content="Review Tixin's Terms and Conditions governing the use of our website and services, including user responsibilities, content usage, and legal disclaimers."
          />
          <meta
            name="keywords"
            content="Tixin, terms and conditions, website usage, legal agreement, event tickets"
          />
          <meta name="robots" content="index, follow" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link
            rel="canonical"
            href="https://www.tixin.com/terms-and-conditions"
          />
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
              Terms and Conditions
            </h2>

            <div className="space-y-6 text-sm sm:text-base text-gray-700 leading-relaxed">
              <p className="text-gray-600">
                For the purpose of these Terms and Conditions, "we", "us", "our"
                refers to Tixin, with its registered office at Hazlehut
                Apartments, Law Gate Road, near LPU, Kapurthala, Punjab 144411,
                India. "You", "your", "user", or "visitor" refers to any natural
                or legal person visiting our website or purchasing from us. Your
                use of our website and services is governed by the following
                terms:
              </p>

              <div className="space-y-5">
                <div className="border-l-4 border-[#F6D100] pl-4 transition-colors duration-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Content Changes
                  </h3>
                  <p>
                    The content of our website is subject to change without
                    notice.
                  </p>
                </div>

                <div className="border-l-4 border-[#F6D100] pl-4 transition-colors duration-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    No Warranty
                  </h3>
                  <p>
                    Neither we nor any third parties provide any warranty or
                    guarantee as to the accuracy, timeliness, performance,
                    completeness, or suitability of the information and
                    materials on this website. You acknowledge that such
                    information may contain inaccuracies or errors, and we
                    expressly exclude liability for any such inaccuracies or
                    errors to the fullest extent permitted by law.
                  </p>
                </div>

                <div className="border-l-4 border-[#F6D100] pl-4 transition-colors duration-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    User Responsibility
                  </h3>
                  <p>
                    Your use of any information or materials on our website or
                    product pages is entirely at your own risk, for which we
                    shall not be liable. It is your responsibility to ensure
                    that any products, services, or information available
                    through our website meet your specific requirements.
                  </p>
                </div>

                <div className="border-l-4 border-[#F6D100] pl-4 transition-colors duration-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Intellectual Property
                  </h3>
                  <p>
                    Our website contains material owned by or licensed to us,
                    including but not limited to design, layout, look,
                    appearance, and graphics. Reproduction is prohibited except
                    in accordance with the copyright notice, which forms part of
                    these terms.
                  </p>
                </div>

                <div className="border-l-4 border-[#F6D100] pl-4 transition-colors duration-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Trademarks
                  </h3>
                  <p>
                    All trademarks reproduced on our website that are not the
                    property of, or licensed to, the operator are acknowledged.
                  </p>
                </div>

                <div className="border-l-4 border-[#F6D100] pl-4 transition-colors duration-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Unauthorized Use
                  </h3>
                  <p>
                    Unauthorized use of information provided by us may give rise
                    to a claim for damages and/or be a criminal offense.
                  </p>
                </div>

                <div className="border-l-4 border-[#F6D100] pl-4 transition-colors duration-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    External Links
                  </h3>
                  <p>
                    Our website may include links to other websites for your
                    convenience. These links do not signify endorsement, and we
                    are not responsible for the content of linked sites.
                  </p>
                </div>

                <div className="border-l-4 border-[#F6D100] pl-4 transition-colors duration-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Linking to Our Website
                  </h3>
                  <p>
                    You may not create a link to our website from another
                    website or document without Tixin’s prior written consent.
                  </p>
                </div>

                <div className="border-l-4 border-[#F6D100] pl-4 transition-colors duration-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Governing Law
                  </h3>
                  <p>
                    Any dispute arising out of the use of our website,
                    purchases, or engagement with us is subject to the laws of
                    India.
                  </p>
                </div>

                <div className="border-l-4 border-[#F6D100] pl-4 transition-colors duration-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Transaction Authorization
                  </h3>
                  <p>
                    We shall not be liable for any loss or damage arising from
                    the decline of authorization for any transaction due to the
                    cardholder exceeding the preset limit mutually agreed with
                    our acquiring bank.
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
