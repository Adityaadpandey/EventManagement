import React, { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";

type TicketType = {
  name: string;
  description?: string;
  price: number;
  discountedPrice?: number;
  discountReason?: string;
  quantity: number;
  salesCutoff?: string;
};

interface TicketTypeManagerProps {
  ticketTypes: TicketType[];
  onChange: (ticketTypes: TicketType[]) => void;
  errors?: Record<string, string>;
}

const TicketTypeManager: React.FC<TicketTypeManagerProps> = memo(
  ({ ticketTypes, onChange, errors = {} }) => {
    const addTicketType = () => {
      onChange([
        ...ticketTypes,
        {
          name: "",
          description: "",
          price: 0,
          quantity: 100,
        },
      ]);
    };

    const removeTicketType = (index: number) => {
      if (ticketTypes.length === 1) return; // Keep at least one
      onChange(ticketTypes.filter((_, i) => i !== index));
    };

    const updateTicketType = (
      index: number,
      field: keyof TicketType,
      value: any,
    ) => {
      const updated = [...ticketTypes];
      updated[index] = { ...updated[index], [field]: value };
      onChange(updated);
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Ticket Types</h2>
          <button
            type="button"
            onClick={addTicketType}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            + Add Ticket Type
          </button>
        </div>

        <AnimatePresence>
          {ticketTypes.map((ticket, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="p-6 border-2 border-gray-200 rounded-2xl space-y-4 relative"
            >
              {/* Remove button */}
              {ticketTypes.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeTicketType(index)}
                  className="absolute top-4 right-4 text-red-500 hover:text-red-700"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Ticket Name */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">
                    Ticket Name *
                  </label>
                  <input
                    type="text"
                    value={ticket.name}
                    onChange={(e) =>
                      updateTicketType(index, "name", e.target.value)
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
                    placeholder="e.g., General Admission, VIP, Early Bird"
                  />
                  {errors[`ticketType_${index}_name`] && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors[`ticketType_${index}_name`]}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={ticket.description || ""}
                    onChange={(e) =>
                      updateTicketType(index, "description", e.target.value)
                    }
                    rows={2}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black resize-none"
                    placeholder="Brief description of this ticket type..."
                  />
                </div>

                {/* Price */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={ticket.price}
                    onChange={(e) =>
                      updateTicketType(
                        index,
                        "price",
                        parseFloat(e.target.value) || 0,
                      )
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
                    placeholder="0.00"
                  />
                  {errors[`ticketType_${index}_price`] && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors[`ticketType_${index}_price`]}
                    </p>
                  )}
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={ticket.quantity}
                    onChange={(e) =>
                      updateTicketType(
                        index,
                        "quantity",
                        parseInt(e.target.value) || 1,
                      )
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
                    placeholder="100"
                  />
                  {errors[`ticketType_${index}_quantity`] && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors[`ticketType_${index}_quantity`]}
                    </p>
                  )}
                </div>

                {/* Discounted Price */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Discounted Price (₹) (Optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={ticket.discountedPrice || ""}
                    onChange={(e) =>
                      updateTicketType(
                        index,
                        "discountedPrice",
                        e.target.value ? parseFloat(e.target.value) : undefined,
                      )
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
                    placeholder="0.00"
                  />
                </div>

                {/* Discount Reason */}
                {ticket.discountedPrice && (
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Discount Reason (Optional)
                    </label>
                    <input
                      type="text"
                      value={ticket.discountReason || ""}
                      onChange={(e) =>
                        updateTicketType(
                          index,
                          "discountReason",
                          e.target.value,
                        )
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
                      placeholder="e.g., Early Bird, Student Discount"
                    />
                  </div>
                )}

                {/* Sales Cutoff */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">
                    Sales Cutoff Date (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={ticket.salesCutoff || ""}
                    onChange={(e) =>
                      updateTicketType(index, "salesCutoff", e.target.value)
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Stop selling this ticket type after this date/time
                  </p>
                </div>
              </div>

              {/* Ticket Summary */}
              <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                <p className="text-sm font-medium text-gray-700">
                  {ticket.name || "Unnamed Ticket"} •{" "}
                  {ticket.discountedPrice ? (
                    <>
                      <span className="line-through text-gray-500">
                        ₹{ticket.price}
                      </span>{" "}
                      <span className="text-green-600">
                        ₹{ticket.discountedPrice}
                      </span>
                    </>
                  ) : (
                    <span>₹{ticket.price}</span>
                  )}{" "}
                  • {ticket.quantity} available
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {Object.keys(errors).some((key) => key === "ticketTypes") && (
          <p className="text-red-500 text-sm">{errors.ticketTypes}</p>
        )}
      </div>
    );
  },
);

TicketTypeManager.displayName = "TicketTypeManager";

export default TicketTypeManager;
