import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-transparent py-4 border-t border-gray-200 pb-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          {/* Company Info */}
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-gray-900">Tixin</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Hazlehut Apartments, Law Gate Road, <br />
              Near LPU, Kapurthala, Punjab 144411, India
            </p>
          </div>

          {/* Contact Info */}
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-gray-900">Contact</h3>
            <p className="text-xs text-gray-600">
              <span className="font-medium">Phone:</span>{" "}
              <a
                href="tel:+917247213443"
                className="hover:text-[#F6D100] transition-colors duration-200"
                aria-label="Call Tixin at +91 7247213443"
              >
                +91 7247213443
              </a>
            </p>
            <p className="text-xs text-gray-600">
              <span className="font-medium">Email:</span>{" "}
              <a
                href="mailto:hq@tixin.in"
                className="hover:text-[#F6D100] transition-colors duration-200"
                rel="noopener noreferrer"
                aria-label="Email Tixin at hq@tixin.in"
              >
                hq@tixin.in
              </a>
            </p>
          </div>

          {/* Policy and About Links */}
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-gray-900">Links</h3>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
              <Link
                href="/about-us"
                className="hover:text-[#F6D100] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="View About Us page"
              >
                About Us
              </Link>
              <Link
                href="/cancellation-policy"
                className="hover:text-[#F6D100] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="View Cancellation and Refund Policy"
              >
                Cancellation & Refund
              </Link>
              <Link
                href="/terms-and-conditions"
                className="hover:text-[#F6D100] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="View Terms and Conditions"
              >
                Terms
              </Link>
              <Link
                href="/privacy-policy"
                className="hover:text-[#F6D100] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="View Privacy Policy"
              >
                Privacy
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-4 pt-3 border-t border-gray-200 text-center text-xs text-gray-600">
          <p>&copy; {new Date().getFullYear()} Tixin. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
