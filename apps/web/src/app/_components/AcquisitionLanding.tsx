"use client";

import Image from "next/image";
import { useRef, useEffect, useState } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import "../acquisition.css";

export default function AcquisitionLanding() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Use the local container for scroll tracking instead of the window.
  // This fixes the issue where scroll tracking failed due to the parent layout's overflow settings.
  const { scrollYProgress } = useScroll({
    container: scrollContainerRef,
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 150,
    damping: 40,
    restDelta: 0.001,
  });

  // Stage 1 to Stage 3: Smooth, continuous linear mapping from 0% to 100% scroll
  const opacityText = useTransform(smoothProgress, [0, 0.6], [1, 0]);
  const yText = useTransform(smoothProgress, [0, 0.6], [0, -50]);

  const cardWidth = useTransform(smoothProgress, [0, 1], ["90vw", "100vw"]);
  const cardMaxWidth = useTransform(
    smoothProgress,
    [0, 1],
    ["1440px", "10000px"],
  );
  const cardHeight = useTransform(smoothProgress, [0, 1], ["70vh", "100vh"]);
  const cardY = useTransform(smoothProgress, [0, 1], ["30vh", "0vh"]);
  const cardBorderRadius = useTransform(
    smoothProgress,
    [0, 1],
    ["32px", "0px"],
  );

  const [hasNavigated, setHasNavigated] = useState(false);

  // Stage 4: Only redirect when scroll completes
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const unsubscribe = smoothProgress.onChange((latest) => {
      // When user reaches the very bottom of the scroll
      if (latest >= 0.99 && !hasNavigated) {
        setHasNavigated(true);
        // Hold the full-screen state briefly (400ms) before navigating
        timeoutId = setTimeout(() => {
          window.location.href = "https://tunyt.com/discover";
        }, 400);
      }
      // If user scrolls back up before the redirect happens, cancel it
      else if (latest < 0.95 && hasNavigated) {
        setHasNavigated(false);
        clearTimeout(timeoutId);
      }
    });

    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [smoothProgress, hasNavigated]);

  return (
    <div
      ref={scrollContainerRef}
      className="absolute inset-0 w-full h-full overflow-y-auto overflow-x-hidden acquisition-container"
    >
      <div className="relative w-full h-[400vh]">
        <div className="sticky top-0 h-screen w-full flex flex-col items-center justify-center overflow-hidden">
          <Image
            src="/svgs/homeGradient.svg"
            alt=""
            width={500}
            height={300}
            className="absolute top-[70px] md:right-2 md:block hidden z-0 pointer-events-none opacity-60"
          />

          <motion.div
            style={{ opacity: opacityText, y: yText }}
            className="absolute top-[8vh] md:top-[12vh] flex flex-col items-center justify-center text-center z-10 px-[5.1282vw] w-full"
          >
            <Image
              src="/logos/logoOnWhite.png"
              alt="Tixin"
              width={220}
              height={75}
              className="mb-8 object-contain"
              priority
            />
            <h1 className="acquisition-heading text-4xl md:text-5xl lg:text-[64px] mb-8 mx-auto leading-[1.3]">
              Tixin has been acquired by
              <br />
              Aetheristic Pvt. Ltd.
            </h1>
            <p className="text-base md:text-lg max-w-2xl text-[var(--color-neutral-dark3)] leading-relaxed font-medium mx-auto">
              We're excited to continue our journey under Aetheristic Pvt. Ltd.
              Tixin now lives as Tunyt our next-generation platform for
              creating, discovering, and managing events.
            </p>
          </motion.div>

          <motion.div
            style={{
              width: cardWidth,
              height: cardHeight,
              y: cardY,
              borderRadius: cardBorderRadius,
              maxWidth: cardMaxWidth,
            }}
            className="absolute z-20 acquisition-glass-card overflow-hidden flex items-center justify-center will-change-transform"
          >
            <div className="w-full h-full relative">
              <iframe
                src="https://tunyt.com/discover"
                className="w-full h-full border-none pointer-events-none"
                tabIndex={-1}
              />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
