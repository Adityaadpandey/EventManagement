import { sendEmail } from "./lib/mail";

const EventUpdate = async () => {
  await sendEmail(
    "adityapandeyadp@gmail.com",
    "Important Update: MusicFest 2025",
    {
      type: "event-update",
      content: {
        eventUpdate: {
          message: "The event venue has changed to “Sunset Stadium”.",
          updatedAt: new Date().toISOString(),
        },
      },
    },
    "Aditya",
  );
};
const TicketEmail = async () => {
  await sendEmail(
    "adityapandeyadp@gmail.com",
    "Your Ticket for MusicFest 2025",
    {
      type: "ticket",
      content: {
        ticket: {
          ticketQR: "TICKET_1756264289427_i0r8uwlfr6",
          ticketId: "welllllllllllllllllllllllll",
          eventName: "MusicFest 2025",
          seatNumber: "A12",
          date: "2025-08-15",
          venue: "Grand Arena",
        },
      },
    },
    "Aditya",
  );
};

const OtpEmail = async () => {
  await sendEmail(
    "adityapandeyadp@gmail.com",
    "Your OTP for Login",
    {
      type: "otp",
      content: {
        otp: "123456",
      },
    },
    "Aditya",
  );
};

const main = async () => {
  // await EventUpdate();
  // await TicketEmail();
  await OtpEmail();
};

main();
