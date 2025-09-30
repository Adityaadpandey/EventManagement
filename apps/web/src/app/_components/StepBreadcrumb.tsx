import { motion } from "framer-motion";

interface StepBreadcrumbProps {
  step: number;
  setStep: (step: number) => void;
}

export const StepBreadcrumb: React.FC<StepBreadcrumbProps> = ({
  step,
  setStep,
}) => {
  if (step === 0) return null;

  const labels = ["Ticket Types", "Details", "Checkout"];

  return (
    <motion.div
      className="flex items-center gap-3 mb-4 text-xs font-medium"
      key={`breadcrumb-${step}`}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.3, ease: "easeOut", delay: 0.4 }}
      layout
    >
      {labels.map((l, i) => {
        const isActive = i === step;
        const isCompleted = i < step;

        return (
          <div key={l} className="flex items-center gap-2">
            <button
              onClick={() => isCompleted && setStep(i)}
              disabled={!isCompleted}
              className={`
                ${isActive ? "text-black underline" : ""}
                ${isCompleted ? "text-green-600 hover:underline cursor-pointer" : ""}
                ${!isActive && !isCompleted ? "text-[#8B8B8B]" : ""}
                transition-colors
              `}
            >
              {l}
            </button>

            {i < labels.length - 1 && (
              <div
                className={`mx-2 ${isCompleted ? "text-[#00B865]" : "text-[#8B8B8B]"}`}
              >
                &gt;
              </div>
            )}
          </div>
        );
      })}
    </motion.div>
  );
};
