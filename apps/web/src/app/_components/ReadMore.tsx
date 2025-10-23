import React, { useState } from "react";

interface ReadMoreProps {
  text: string | React.ReactNode; // can be HTML string or JSX
  maxLength?: number;
}

const ReadMore: React.FC<ReadMoreProps> = ({ text, maxLength = 300 }) => {
  const [expanded, setExpanded] = useState(false);

  if (!text) return null;

  // Case 1: If text is a React element (JSX)
  if (React.isValidElement(text)) {
    return (
      <div className="text-[#8B8B8B] !tracking-[-0.28px] !leading-[140%]">
        {text}
      </div>
    );
  }

  // Case 2: If text is a string (plain or HTML)
  const plainText = text.replace(/<[^>]+>/g, ""); // strip tags for length check
  const isLongText = plainText.length > maxLength;
  const displayText =
    expanded || !isLongText ? text : plainText.slice(0, maxLength) + "...";

  return (
    <div className="text-[#8B8B8B] !tracking-[-0.28px] !leading-[140%]">
      <div
        dangerouslySetInnerHTML={{ __html: displayText }}
        className="inline"
      />
      {isLongText && (
        <span
          onClick={() => setExpanded(!expanded)}
          className="cursor-pointer ml-1 hover:underline font-semibold !text-xs"
        >
          {expanded ? "Read less" : "Read more"}
        </span>
      )}
    </div>
  );
};

export default ReadMore;
