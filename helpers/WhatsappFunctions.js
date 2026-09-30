import https from "https";

// Template names as approved in Interakt (Templates → Active)
const WhatsappTemplates = {
  Otp: "otp",
  BookingConfirmation: "ticket_confirmation_a5",
  BookingCancellation: "booking_cancellation",
  TicketRedeemed: "ticket_redeemed_confirmation",
};

// WhatsApp rejects template values that are empty or contain new lines / tabs
const toTemplateValue = (value) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim() || "-";

const sendWhatsappTemplate = (
  mobileNumber,
  templateName,
  bodyValues = [],
  buttonValues,
) => {
  const options = {
    method: "POST",
    hostname: "api.interakt.ai",
    port: null,
    path: "/v1/public/message/",
    headers: {
      Authorization: `Basic ${process.env.INTERAKT_API_KEY}`,
      "content-type": "application/json",
    },
  };

  const req = https.request(options, function (res) {
    const chunks = [];

    res.on("data", function (chunk) {
      chunks.push(chunk);
    });

    res.on("end", function () {
      const body = Buffer.concat(chunks);
      console.log(
        `Interakt WhatsApp ${templateName} response (${res.statusCode}):`,
        body.toString(),
      );
    });
  });

  req.on("error", function (e) {
    console.error(
      `Interakt WhatsApp ${templateName} request failed:`,
      e.message,
    );
  });

  const template = {
    name: templateName,
    languageCode: "en",
    bodyValues: bodyValues.map(toTemplateValue),
  };
  if (buttonValues) template.buttonValues = buttonValues;

  const payload = JSON.stringify({
    countryCode: "+91",
    phoneNumber: String(mobileNumber),
    type: "Template",
    template,
  });

  req.write(payload);
  req.end();
};

// "{{1}} is your verification code." + Copy code button
const sendOtpWhatsapp = (mobileNumber, OTP) => {
  sendWhatsappTemplate(mobileNumber, WhatsappTemplates.Otp, [OTP], {
    0: [String(OTP)],
  });
};

// Event {{1}}, Date {{2}}, Booking ID {{3}}, {{4}} — {{5}} Ticket(s), e-tickets link {{6}}
const sendBookingWhatsapp = (
  mobileNumber,
  EventName,
  EventDateTime,
  BookingId,
  TicketName,
  TicketQuantity,
  TicketUrl,
) => {
  sendWhatsappTemplate(mobileNumber, WhatsappTemplates.BookingConfirmation, [
    EventName,
    EventDateTime,
    BookingId,
    TicketName,
    TicketQuantity,
    TicketUrl,
  ]);
};

// {{1}} event name, Booking ID {{2}}
const sendCancelEventBookingWhatsapp = (mobileNumber, EventName, BookingId) => {
  sendWhatsappTemplate(mobileNumber, WhatsappTemplates.BookingCancellation, [
    EventName,
    BookingId,
  ]);
};

// Tickets for {{1}} redeemed, Booking ID {{2}}
const sendTicketRedeemptionWhatsapp = (mobileNumber, EventName, BookingId) => {
  sendWhatsappTemplate(mobileNumber, WhatsappTemplates.TicketRedeemed, [
    EventName,
    BookingId,
  ]);
};

export {
  sendOtpWhatsapp,
  sendBookingWhatsapp,
  sendCancelEventBookingWhatsapp,
  sendTicketRedeemptionWhatsapp,
};
