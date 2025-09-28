"use client";

import React from "react";

interface EventCardProps {
  imageUrl: string;
  title: string;
  date: string;
  location: string;
  price: string;
}

const EventCard: React.FC<EventCardProps> = ({
  imageUrl,
  title,
  date,
  location,
  price,
}) => {
  const formatDate = (dateString: string): string => {
    const parsedDate = new Date(dateString);

    const day = parsedDate.getDate();

    const getOrdinal = (d: number): string => {
      if (d >= 11 && d <= 13) return `${d}th`;
      switch (d % 10) {
        case 1:
          return `${d}st`;
        case 2:
          return `${d}nd`;
        case 3:
          return `${d}rd`;
        default:
          return `${d}th`;
      }
    };

    const dayWithSuffix = getOrdinal(day);
    const month = parsedDate.toLocaleString("en-US", { month: "short" });
    const weekday = parsedDate.toLocaleString("en-US", { weekday: "short" });

    return `${dayWithSuffix} ${month} . ${weekday}`;
  };

  const formattedDate = formatDate(date);

  return (
    <div className="flex flex-col gap-1 p-1 pb-[0.5555vw] bg-white md:rounded-[1.6666vw] rounded-2xl md:w-[36.25vw] max-w-[522px] w-[91.8vw]">
      <div className="md:h-[20.069vw] h-[50.256vw] md:rounded-3xl rounded-xl overflow-hidden">
        <img
          src={imageUrl}
          alt="Event Image"
          className="w-full h-full object-cover"
        />
      </div>

      <div className="px-3 py-2 flex justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1>{title}</h1>
          <h6 className="text-[#8B8B8B]">
            {location} • {formattedDate}
          </h6>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[#8B8B8B]">Starts at</span>

          <h2>₹{price}</h2>
        </div>
      </div>
    </div>
  );
};

export default EventCard;
