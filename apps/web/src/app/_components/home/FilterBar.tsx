"use client";

import { memo, useRef, useEffect, useState } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface FilterBarProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  filters: string[];
  searchOpen: boolean;
  searchQuery: string;
  onSearchToggle: () => void;
  onSearchChange: (query: string) => void;
}

export const FilterBar = memo(
  ({
    activeFilter,
    onFilterChange,
    filters,
    searchOpen,
    searchQuery,
    onSearchToggle,
    onSearchChange,
  }: FilterBarProps) => {
    const tagsRef = useRef<HTMLDivElement>(null);
    const [showLeftFade, setShowLeftFade] = useState(false);
    const [showRightFade, setShowRightFade] = useState(false);

    useEffect(() => {
      const el = tagsRef.current;
      if (!el) return;

      const checkScroll = () => {
        const { scrollLeft, scrollWidth, clientWidth } = el;
        setShowLeftFade(scrollLeft > 0);
        setShowRightFade(scrollLeft + clientWidth < scrollWidth - 1);
      };

      checkScroll();
      el.addEventListener("scroll", checkScroll, { passive: true });
      window.addEventListener("resize", checkScroll, { passive: true });

      return () => {
        el.removeEventListener("scroll", checkScroll);
        window.removeEventListener("resize", checkScroll);
      };
    }, []);

    return (
      <>
        <div className="flex items-center gap-4">
          <button
            onClick={onSearchToggle}
            className="h-[52px] w-[52px] p-4 bg-white rounded-full md:flex hidden relative z-50 cursor-pointer items-center justify-center hover:bg-gray-50 transition-colors"
            aria-label={searchOpen ? "Close search" : "Open search"}
          >
            {searchOpen ? (
              <X size={20} className="text-gray-600" />
            ) : (
              <img src="/svgs/searchIcon.svg" alt="Search" />
            )}
          </button>

          <div className="home-filter-tags-wrapper">
            {showLeftFade && <div className="home-filter-gradient-left" />}
            <div className="home-filter-tags" ref={tagsRef}>
              {filters.map((filter) => (
                <button
                  key={filter}
                  className={`home-filter-tag cursor-pointer transition-colors duration-200 ${
                    activeFilter === filter
                      ? "bg-black text-white font-semibold"
                      : "bg-white hover:bg-gray-50"
                  }`}
                  onClick={() => onFilterChange(filter)}
                  aria-pressed={activeFilter === filter}
                >
                  <h4>{filter}</h4>
                </button>
              ))}
            </div>
            {showRightFade && <div className="home-filter-gradient-right" />}
          </div>
        </div>

        <AnimatePresence>
          {searchOpen && (
            <motion.div
              className="absolute left-0 top-0 h-[52px] bg-white shadow-lg z-40 flex items-center md:block hidden"
              initial={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                scaleY: 0.9,
                y: 0,
                opacity: 0,
              }}
              animate={{
                width: "300px",
                height: 52,
                borderRadius: "9999px",
                scaleY: [0.9, 1.05, 1],
                y: 70,
                opacity: 1,
              }}
              exit={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                scaleY: 0.9,
                opacity: 0,
                y: 0,
              }}
              transition={{
                duration: 0.5,
                ease: [0.22, 1, 0.36, 1],
              }}
              style={{ transformOrigin: "top center" }}
            >
              <motion.input
                type="text"
                placeholder="Search events, tags, or locations..."
                className="w-full h-full bg-transparent outline-none px-4 text-base placeholder:text-gray-500"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") onSearchToggle();
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                autoFocus
              />
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  },
);

FilterBar.displayName = "FilterBar";
