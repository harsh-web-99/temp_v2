import {
  sendBookingSms,
  sendOtpSms,
  sendCancelEventBookingSms,
  sendTicketRedeemptionSms,
} from "./SmsFunctions.js";
import {
  sendOtpWhatsapp,
  sendBookingWhatsapp,
  sendCancelEventBookingWhatsapp,
  sendTicketRedeemptionWhatsapp,
} from "./WhatsappFunctions.js";

// WhatsApp is always sent. SMS is also sent unless SMS_ENABLED=false.
const isSmsEnabled = () => {
  if (process.env.SMS_ENABLED !== "false") return true;
  console.log("SMS skipped because SMS_ENABLED=false");
  return false;
};

// mobileNumber is the 10 digit number without country code

const sendOtpNotification = (mobileNumber, OTP) => {
  sendOtpWhatsapp(mobileNumber, OTP);
  if (isSmsEnabled()) sendOtpSms(`91${mobileNumber}`, OTP);
};

const sendBookingNotification = ({
  mobileNumber,
  EventName,
  EventDateTime,
  BookingId,
  TicketName,
  TicketQuantity,
  TicketUrl,
}) => {
  sendBookingWhatsapp(
    mobileNumber,
    EventName,
    EventDateTime,
    BookingId,
    TicketName,
    TicketQuantity,
    TicketUrl,
  );
  if (isSmsEnabled()) sendBookingSms(`91${mobileNumber}`, EventName, BookingId);
};

const sendCancelEventBookingNotification = (
  mobileNumber,
  EventName,
  BookingId,
) => {
  sendCancelEventBookingWhatsapp(mobileNumber, EventName, BookingId);
  if (isSmsEnabled()) {
    sendCancelEventBookingSms(`91${mobileNumber}`, EventName, BookingId);
  }
};

const sendTicketRedeemptionNotification = (
  mobileNumber,
  EventName,
  BookingId,
) => {
  sendTicketRedeemptionWhatsapp(mobileNumber, EventName, BookingId);
  if (isSmsEnabled()) {
    sendTicketRedeemptionSms(`91${mobileNumber}`, EventName, BookingId);
  }
};

export {
  sendOtpNotification,
  sendBookingNotification,
  sendCancelEventBookingNotification,
  sendTicketRedeemptionNotification,
};
