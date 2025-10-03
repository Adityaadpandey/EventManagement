// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import ClientLayout from "./_components/ClientLayout";
import { Bricolage_Grotesque } from "next/font/google";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: new URL("https://www.tixin.in"),
    title: {
      default: "Tixin – Buy Event Tickets & Discover Local Events",
      template: "%s | Tixin", // Allows page titles to be overridden
    },
    description:
      "Discover local events in India and book tickets securely with Tixin. Explore concerts, festivals, and more with real-time availability.",
    keywords: [
      "events",
      "tickets",
      "Tixin",
      "book events",
      "buy tickets online",
      "local events India",
      "concert tickets",
      "festival tickets",
    ],
    openGraph: {
      title: "Tixin – Discover Events and Book Tickets",
      description:
        "Explore local events and book tickets instantly with Tixin.",
      url: "https://www.tixin.in",
      siteName: "Tixin",
      images: [
        {
          url: "/logos/logoOnBlack.png",
          width: 1200,
          height: 630,
          alt: "Tixin Event Platform",
        },
      ],
      locale: "en_IN",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      site: "@tixinHQ",
      title: "Tixin – Discover Events and Book Tickets",
      description:
        "Explore local events and book tickets instantly with Tixin.",
      images: ["/logos/logoOnBlack.png"], // Fixed property name (should be `images`)
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/logos/roundedLogo.svg" />
        <link rel="canonical" href="https://www.tixin.in" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Tixin",
              url: "https://www.tixin.in",
              logo: "https://www.tixin.in/logos/roundedLogo.svg",
            }),
          }}
        />
      </head>
      <body>
        <Providers>
          <ClientLayout>{children}</ClientLayout>
        </Providers>
      </body>
    </html>
  );
}
