import React, { useState } from "react";

interface ReadMoreProps {
  text: string | React.ReactNode;
  maxLength?: number;
}

const ReadMore: React.FC<ReadMoreProps> = ({ text, maxLength = 300 }) => {
  const [expanded, setExpanded] = useState(false);

  if (!text) return null;

  // Case 1: If text is a React element (JSX)
  if (React.isValidElement(text)) {
    return (
      <div className="text-[#8B8B8B] tracking-[-0.28px] leading-[1.6] text-sm">
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
    <div className="text-[#8B8B8B] tracking-[-0.28px] text-sm">
      <div
        dangerouslySetInnerHTML={{ __html: displayText }}
        style={{ lineHeight: "1.6" }}
        className="[&_*]:!text-sm [&_*]:!text-[#8B8B8B] [&_*]:!leading-[1.6]
          [&>h3]:font-semibold [&>h3]:mb-2 [&>h3]:mt-0
          [&>p]:mb-2 [&>p]:mt-0
          [&>p:last-child]:mb-0
          [&_strong]:font-semibold
          [&_em]:italic
          [&_br]:hidden"
      />
      {isLongText && (
        <span
          onClick={() => setExpanded(!expanded)}
          className="cursor-pointer ml-1 hover:underline font-semibold text-[#8B8B8B] text-sm inline-block mt-2"
        >
          {expanded ? "Read less" : "Read more"}
        </span>
      )}
    </div>
  );
};

export default ReadMore;
