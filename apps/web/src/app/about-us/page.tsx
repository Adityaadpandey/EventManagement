"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Head from "next/head";
import { ErrorBoundary } from "react-error-boundary";
import Link from "next/link";

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
        className="mt-4 inline-flex items-center px-4 py-2 bg-[#F6D100] text-white rounded-lg shadow-sm hover:bg-blue-700 transition-colors duration-300"
      >
        Refresh Page
      </button>
    </div>
  </div>
);

export default function AboutUs() {
  const router = useRouter();

  // Analytics (Placeholder for Google Analytics or similar)
  useEffect(() => {
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "page_view", {
        page_title: "About Us",
        page_location: window.location.href,
      });
    }
  }, []);

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <div className="pb-32">
        {/* SEO Meta Tags */}
        <Head>
          <title>About Us | Tixin</title>
          <meta
            name="description"
            content="Discover Tixin's mission to simplify event hosting and create memorable experiences. Learn about our vision and how to connect with us."
          />
          <meta
            name="keywords"
            content="Tixin, about us, event hosting, event planning, mission, vision, contact"
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
                  className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 bg-white text-gray-700 rounded-lg shadow-sm hover:bg-blue-50 transition-colors duration-300 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F6D100]"
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

        {/* Hero Header */}
        <header className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-6">
          <h2 className="text-3xl xs:text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight text-center">
            About Tixin
          </h2>
          <p className="mt-3 text-base sm:text-lg text-gray-600 text-center">
            Empowering seamless, memorable events for everyone
          </p>
        </header>

        {/* Main Content */}
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 sm:pb-20">
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-4 xs:p-6 sm:p-8 space-y-8 animate-fade-in">
            <div className="space-y-6 text-sm sm:text-base text-gray-700 leading-relaxed">
              <p className="text-gray-600">
                At Tixin, we started with a simple observation: hosting an event
                should be exciting, not stressful. Yet, too often, people who
                wanted to bring their ideas to life—whether concerts, meetups,
                or community gatherings—faced endless hurdles. From poor
                coordination to scattered tools, the process felt broken.
              </p>
              <p className="text-gray-600 font-medium">
                We decided to change that.
              </p>
              <p className="text-gray-600">
                Tixin is built to empower anyone to host seamless, impactful
                events without the headaches. Our platform simplifies the entire
                journey—from planning and promotion to execution—so organizers
                can focus on what truly matters: creating experiences that
                people remember.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="border-l-4 border-[#F6D100] pl-4 hover:border-[#F6D100] transition-colors duration-300 bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Our Mission
                </h3>
                <p className="text-sm sm:text-base text-gray-600">
                  To make event hosting effortless, accessible, and enjoyable
                  for everyone, by providing tools that remove friction and
                  amplify creativity.
                </p>
              </div>

              <div className="border-l-4 border-[#F6D100] pl-4 hover:border-[#F6D100] transition-colors duration-300 bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Our Vision
                </h3>
                <p className="text-sm sm:text-base text-gray-600">
                  To redefine the future of events by becoming the most trusted
                  platform where every idea, big or small, can turn into a
                  shared experience that connects people.
                </p>
              </div>
            </div>

            <div className="border-l-4 border-[#F6D100] pl-4 hover:border-[#F6D100] transition-colors duration-300">
              <h3 className="text-lg font-semibold text-gray-900">
                Contact Us
              </h3>
              <p className="text-sm sm:text-base text-gray-600">
                We’d love to hear from you! Reach out to us at:
              </p>
              <ul className="list-none pl-0 space-y-3 mt-3 text-sm sm:text-base text-gray-700">
                <li>
                  <span className="font-medium">Address:</span> Hazlehut
                  Apartments, Law Gate Road, Near LPU, Kapurthala, Punjab
                  144411, India
                </li>
                <li>
                  <span className="font-medium">Phone:</span>{" "}
                  <a
                    href="tel:+917247213443"
                    className="text-[#F6D100] hover:underline transition-colors duration-300"
                    aria-label="Call Tixin at +91 7247213443"
                    rel="noopener noreferrer"
                  >
                    +91 7247213443
                  </a>
                </li>
                <li>
                  <span className="font-medium">Email:</span>{" "}
                  <a
                    href="mailto:hq@tixin.in"
                    className="text-[#F6D100] hover:underline transition-colors duration-300"
                    aria-label="Email Tixin at hq@tixin.in"
                    rel="noopener noreferrer"
                  >
                    hq@tixin.in
                  </a>
                </li>
                <li>
                  <span className="font-medium">Follow us on X:</span>{" "}
                  <a
                    href="https://x.com/tixinHQ"
                    className="text-[#F6D100] hover:underline transition-colors duration-300"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Follow Tixin on X"
                  >
                    @tixinHQ
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
}
