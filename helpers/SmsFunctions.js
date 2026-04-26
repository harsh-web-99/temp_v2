import https from "https";

const sendBookingSms = (customerMobileNumber, EventName, bookingId) => {
  const options = {
    method: "POST",
    hostname: "control.msg91.com",
    port: null,
    path: "/api/v5/flow",
    headers: {
      authkey: process.env.MSG91_SMS_AUTHKEY,
      accept: "application/json",
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
      console.log("Response received:", body.toString());
    });
  });

  req.on("error", function (e) {
    console.error("Request failed:", e.message);
  });

  const payload = JSON.stringify({
    template_id: process.env.BOOKING_SMS_MESSAGE_TEMPLATE_ID,
    recipients: [
      {
        mobiles: customerMobileNumber,
        var1: EventName,
        var2: bookingId,
      },
    ],
  });

  req.write(payload);
  req.end();
};

const sendOtpSms = (customerMobileNumber, OTP) => {
  const options = {
    method: "POST",
    hostname: "control.msg91.com",
    port: null,
    path: "/api/v5/flow",
    headers: {
      authkey: process.env.MSG91_SMS_AUTHKEY,
      accept: "application/json",
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
      console.log("Response received:", body.toString());
    });
  });

  req.on("error", function (e) {
    console.error("Request failed:", e.message);
  });

  const payload = JSON.stringify({
    template_id: process.env.OTP_SMS_MESSAGE_TEMPLATE_ID,
    recipients: [
      {
        mobiles: customerMobileNumber,
        var1: OTP,
      },
    ],
  });

  req.write(payload);
  req.end();
};

const sendCancelEventBookingSms = (
  customerMobileNumber,
  EventName,
  BookingId
) => {
  const options = {
    method: "POST",
    hostname: "control.msg91.com",
    port: null,
    path: "/api/v5/flow",
    headers: {
      authkey: process.env.MSG91_SMS_AUTHKEY,
      accept: "application/json",
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
      console.log("Response received:", body.toString());
    });
  });

  req.on("error", function (e) {
    console.error("Request failed:", e.message);
  });

  const payload = JSON.stringify({
    template_id: process.env.BOOKING_CANCEL_SMS_MESSAGE_TEMPLATE_ID,
    recipients: [
      {
        mobiles: customerMobileNumber,
        var1: EventName,
        var2: BookingId,
      },
    ],
  });

  req.write(payload);
  req.end();
};

const sendTicketRedeemptionSms = (
  customerMobileNumber,
  EventName,
  BookingId
) => {
  const options = {
    method: "POST",
    hostname: "control.msg91.com",
    port: null,
    path: "/api/v5/flow",
    headers: {
      authkey: process.env.MSG91_SMS_AUTHKEY,
      accept: "application/json",
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
      console.log("Response received:", body.toString());
    });
  });

  req.on("error", function (e) {
    console.error("Request failed:", e.message);
  });

  const payload = JSON.stringify({
    template_id: process.env.TICKET_REDEEMPTION_SMS_MESSAGE_TEMPLATE_ID,
    recipients: [
      {
        mobiles: customerMobileNumber,
        var1: EventName,
        var2: BookingId,
      },
    ],
  });

  req.write(payload);
  req.end();
};

export {
  sendBookingSms,
  sendOtpSms,
  sendCancelEventBookingSms,
  sendTicketRedeemptionSms,
};
