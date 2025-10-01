import React, { useState } from "react";

interface ReadMoreProps {
  text: string;
  maxLength?: number;
}

const ReadMore: React.FC<ReadMoreProps> = ({ text, maxLength = 300 }) => {
  const [expanded, setExpanded] = useState(false);

  if (!text) return null;

  const isLongText = text.length > maxLength;
  const displayText =
    expanded || !isLongText ? text : text.slice(0, maxLength) + "...";

  return (
    <p className="text-[#8B8B8B]">
      {displayText}
      {isLongText && (
        <span
          onClick={() => setExpanded(!expanded)}
          className="cursor-pointer ml-1 hover:underline font-bold"
        >
          {expanded ? "Read less" : "Read more"}
        </span>
      )}
    </p>
  );
};

export default ReadMore;
