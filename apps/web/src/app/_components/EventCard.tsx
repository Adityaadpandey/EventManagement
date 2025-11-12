"use client";

import React, { memo, useMemo } from "react";
import Image from "next/image";
import Superellipse from "react-superellipse";

interface EventCardProps {
  imageUrl: string;
  title: string;
  date: string;
  location: string;
  price: string | number;
  discountedPrice?: string | number;
}

const getOrdinalSuffix = (day: number): string => {
  if (day >= 11 && day <= 13) return "th";
  const lastDigit = day % 10;
  return lastDigit === 1
    ? "st"
    : lastDigit === 2
      ? "nd"
      : lastDigit === 3
        ? "rd"
        : "th";
};

// Optimized date formatting with caching
const formatDate = (dateString: string): string => {
  const parsedDate = new Date(dateString);

  // Early return for invalid dates
  if (isNaN(parsedDate.getTime())) return dateString;

  const day = parsedDate.getDate();
  const dayWithSuffix = `${day}${getOrdinalSuffix(day)}`;
  const month = parsedDate.toLocaleString("en-US", { month: "short" });
  const weekday = parsedDate.toLocaleString("en-US", { weekday: "short" });

  return `${dayWithSuffix} ${month} · ${weekday}`;
};

const EventCard: React.FC<EventCardProps> = memo(
  ({ imageUrl, title, date, location, price, discountedPrice, canBuy }) => {
    // Memoize formatted date to prevent recalculation on re-renders
    const formattedDate = useMemo(() => formatDate(date), [date]);

    // Normalize price to number for consistent comparison
    const priceValue = useMemo(
      () => (typeof price === "string" ? parseFloat(price) : price),
      [price],
    );
    const isFree = priceValue === 0;

    const priceDisplay = useMemo(
      () => (isFree ? "Free" : `₹${priceValue}`),
      [isFree, priceValue],
    );

    return (
      <Superellipse
        style={{ width: "100%", height: "auto" }}
        r1={0.02}
        r2={0.1}
      >
        <div className="flex flex-col gap-1 p-1 pb-2 bg-white  md:w-[36.25vw] max-w-[522px] w-[91.8vw]">
          <Superellipse
            style={{ width: "100%", height: "auto" }}
            r1={0.02}
            r2={0.1}
          >
            <div className="md:h-[20.069vw] h-[50.256vw] overflow-hidden relative">
              <Image
                src={imageUrl}
                alt={`${title} event image`}
                width={500}
                height={300}
                loading="lazy"
                className="w-full h-full object-cover"
                sizes="(max-width: 768px) 91.8vw, 36.25vw"
                quality={85}
              />

              {canBuy === false && (
                <span className="absolute top-0 right-0 text-white !text-xl bg-[#FF6363] px-4 py-2 rounded-l-full">
                  SOLD OUT
                </span>
              )}
            </div>
          </Superellipse>

          <div className="px-3 py-2 flex justify-between gap-5">
            <div className="flex flex-col gap-1">
              <h1 className="font-semibold text-[#1E1E1E]">{title}</h1>
              <h6 className="text-[#8B8B8B]">
                {location} · {formattedDate}
              </h6>
            </div>

            <div className="flex flex-col gap-1">
              {!isFree && (
                <span className="text-[#8B8B8B] shrink-0 text-nowrap">
                  Starts at
                </span>
              )}

              {!discountedPrice && (
                <h2 className={isFree ? "!text-green-600" : ""}>
                  {priceDisplay}
                </h2>
              )}

              {Number(discountedPrice) > 0 && (
                <div className="flex gap-1">
                  <h2 className="!text-[#007E45] !text-[24px]">
                    {discountedPrice}
                  </h2>
                  <h3 className="line-through text-[#8B8B8B]">
                    {priceDisplay}
                  </h3>
                </div>
              )}
            </div>
          </div>
        </div>
      </Superellipse>
    );
  },
);

EventCard.displayName = "EventCard";

export default EventCard;
