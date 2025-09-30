import Link from "next/link";
import { Instagram } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-transparent py-6 md:pb-6 pb-32  border-t border-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-xs text-gray-500">
        <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-4">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
            <Link
              href="/"
              className="font-semibold text-gray-700 hover:text-[#cdae00] transition-colors duration-300"
              aria-label="Go to Tixin homepage"
            >
              Tixin
            </Link>
            <span className="text-gray-300 hidden sm:inline">•</span>
            <Link
              href="/about-us"
              className="hover:text-[#cdae00] transition-colors duration-300"
              aria-label="View About Us page"
            >
              About
            </Link>
          </div>

          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-center">
            <a
              href="tel:+917247213443"
              className="hover:text-[#cdae00] transition-colors duration-300"
              aria-label="Call Tixin at +91 7247213443"
              rel="noopener noreferrer"
            >
              +91 7247213443
            </a>
            <span className="text-gray-300 hidden sm:inline">•</span>
            <a
              href="mailto:hq@tixin.in"
              className="hover:text-[#cdae00] transition-colors duration-300"
              aria-label="Email Tixin at hq@tixin.in"
              rel="noopener noreferrer"
            >
              hq@tixin.in
            </a>
            <span className="text-gray-300 hidden sm:inline">•</span>
            <Link
              href="/cancellation-policy"
              className="hover:text-[#cdae00] transition-colors duration-300"
              aria-label="View Cancellation and Refund Policy"
            >
              Cancellation
            </Link>
            <span className="text-gray-300 hidden sm:inline">•</span>
            <Link
              href="/terms-and-conditions"
              className="hover:text-[#cdae00] transition-colors duration-300"
              aria-label="View Terms and Conditions"
            >
              Terms
            </Link>
            <span className="text-gray-300 hidden sm:inline">•</span>
            <Link
              href="/privacy-policy"
              className="hover:text-[#cdae00] transition-colors duration-300"
              aria-label="View Privacy Policy"
            >
              Privacy
            </Link>
          </div>

          <div className="flex justify-center sm:justify-end items-center gap-3">
            <a
              href="https://x.com/tixinhq"
              className="text-gray-500 hover:text-[#af9500] transition-colors duration-300"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow Tixin on X"
            >
              <svg
                className="w-4 h-4"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a
              href=""
              className="text-gray-500 hover:text-[#cdae00] transition-colors duration-300"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow Tixin on Instagram"
            >
              <Instagram className="w-4 h-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
