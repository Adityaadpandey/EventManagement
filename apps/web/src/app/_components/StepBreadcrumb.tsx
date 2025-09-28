import { motion } from "framer-motion";

interface StepBreadcrumbProps {
  step: number;
}

export const StepBreadcrumb: React.FC<StepBreadcrumbProps> = ({ step }) => {
  if (step === 0) return null;

  const labels = ["Ticket Types", "Details", "Checkout"];

  return (
    <motion.div
      className="flex items-center gap-3 mb-4 text-xs text-zinc-400"
      key={`breadcrumb-${step}`}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.3, ease: "easeOut", delay: 0.4 }}
      layout
    >
      {labels.map((l, i) => (
        <div key={l} className="flex items-center gap-2">
          <div
            className={`${
              i === step
                ? "text-black"
                : i < step
                  ? "text-green-500"
                  : "text-[#8B8B8B]"
            }`}
          >
            {l}
          </div>

          {i < labels.length - 1 && (
            <div
              className={`mx-2 ${i < step ? "text-green-500" : "text-zinc-700"}`}
            >
              &gt;
            </div>
          )}
        </div>
      ))}
    </motion.div>
  );
};
