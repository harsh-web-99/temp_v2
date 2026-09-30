import { EventBookings, EventTickets } from "../../../models/AllModels.js";
import { validateEventTicketsBookingByWebsite } from "../../../validations/index.js";
import {
  TicketVisiblity,
  BookingStatus,
  Status,
  PromocodeValid,
} from "../../../helpers/Enum.js";
import getCurrentDateTime from "../../../helpers/getCurrentDateTime.js";
import { v4 as uuidv4 } from "uuid";
import fs from "fs/promises";
import sendResponse from "../../../helpers/sendResponse.js";
import { generateRandomAlphaNumeric } from "../../../helpers/commonFunctions.js";
import {
  TicketBookingSource,
  ConvinienceFeeUnit,
  PromocodeUnit,
  TicketType,
  PromocodeStatus,
  PromocodeCanbeUsedIn,
  PromocodeOneTimePerCustomerFlag,
} from "../../../helpers/Enum.js";
import {
  findOneEventTicketDataService,
  generateQRCode,
} from "../../../services/EventTicketServices.js";
import {
  findOneEventDataService,
  WebsiteCommonEventFilterQuery,
} from "../../../services/EventServices.js";
import {
  findOneEventBookingsDataService,
  sendBookingSmsMailtoUser,
} from "../../../services/EventBookingServices.js";
import { findOneEventBulkTicketsDataService } from "../../../services/EventBulkTicketServices.js";
import { getAsiaCalcuttaCurrentDateTimeinIsoFormat } from "../../../helpers/DateTime.js";
import { saveQRCodeToServer } from "../../../helpers/commonFunctions.js";
import { findOneCustomerDataService } from "../../../services/CustomerServices.js";
import { findOnePromocodeDataService } from "../../../services/PromocodeServices.js";
import { ConvinenceFeeGstPercentage } from "../../../config/index.js";
import crypto from "crypto";
import { WebisteBase_Url, ServerBase_Url } from "../../../config/index.js";
import { isProduction } from "../../../config/index.js";
import path from "path";
import { encrypt, decrypt } from "../../../helpers/encryptionUtils.js";

const generateHash = (
  key,
  txnid,
  amount,
  productinfo,
  firstname,
  email,
  salt,
) => {
  // Add udf1 through udf5 as empty values (or use actual values if you have them)
  const udf1 = "",
    udf2 = "",
    udf3 = "",
    udf4 = "",
    udf5 = "";

  // Create the hash string according to the PayU formula
  const hashString = `${key}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|${udf1}|${udf2}|${udf3}|${udf4}|${udf5}||||||${salt}`;

  // Generate the hash using sha512
  return crypto.createHash("sha512").update(hashString).digest("hex");
};

const getPayuCredentials = () => {
  const key =
    isProduction == "true"
      ? process.env.PAYU_LIVE_MERCHANT_KEY
      : process.env.PAYU_TEST_MERCHANT_KEY;
  const salt =
    isProduction == "true"
      ? process.env.PAYU_LIVE_MERCHANT_SALT
      : process.env.PAYU_TEST_MERCHANT_SALT;

  if (!key || !salt) {
    throw new Error("Payment configuration missing");
  }

  return { key, salt };
};

// Verifies the reverse hash PayU posts to surl/furl, so a callback cannot be forged
const isValidPayuResponseHash = (body) => {
  const { key, salt } = getPayuCredentials();
  const {
    status = "",
    txnid = "",
    amount = "",
    productinfo = "",
    firstname = "",
    email = "",
    udf1 = "",
    udf2 = "",
    udf3 = "",
    udf4 = "",
    udf5 = "",
    additionalCharges,
    hash,
  } = body;

  if (!hash || body.key !== key) return false;

  let hashString = `${salt}|${status}||||||${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|${email}|${firstname}|${productinfo}|${amount}|${txnid}|${key}`;
  if (additionalCharges) {
    hashString = `${additionalCharges}|${hashString}`;
  }

  const expectedHash = crypto
    .createHash("sha512")
    .update(hashString)
    .digest("hex");
  const receivedHash = String(hash).toLowerCase();

  return (
    receivedHash.length === expectedHash.length &&
    crypto.timingSafeEqual(Buffer.from(receivedHash), Buffer.from(expectedHash))
  );
};

// Booking totals are not rounded (e.g. 1034.3646), so allow PayU to round to the nearest paisa either way
const isSameAmount = (a, b) =>
  Math.abs(parseFloat(a) - parseFloat(b)) < 0.011;

const redirectToFailurePage = (res, txnid, error, error_Message) =>
  res.redirect(
    `${WebisteBase_Url}/failure?txnid=${encodeURIComponent(
      txnid || "",
    )}&error=${encodeURIComponent(error)}&error_Message=${encodeURIComponent(
      error_Message,
    )}`,
  );

// Throws if the booking or any required payment field is missing
const createPayment = async (Booking_id) => {
  if (!Booking_id) {
    throw new Error("Booking Id not Found");
  }

  const BookingData = await findOneEventBookingsDataService({
    Booking_id,
    BookingSource: TicketBookingSource.Website,
  });

  if (!BookingData) {
    throw new Error("No Booking Found");
  }

  const amount = BookingData._doc.TotalAmount;
  const productinfo = `Event Ticket Booking`;
  const firstname = BookingData._doc.CustomerName;
  const email = BookingData._doc.Email;
  const phone = BookingData._doc.PhoneNumber;
  const txnid = BookingData._doc.Transaction_id;

  const successUrl = `${ServerBase_Url}/webiste/bookticket/payment/success`;
  const failureUrl = `${ServerBase_Url}/webiste/bookticket/payment/failed`;

  if (!amount || !firstname || !email || !phone || !txnid) {
    throw new Error("Booking is missing required payment fields");
  }

  const { key, salt } = getPayuCredentials();

  const hash = generateHash(
    key,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    salt,
  );

  return {
    key,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    phone,
    surl: successUrl,
    furl: failureUrl,
    hash,
  };
};

// Payment data is returned by /bookTicket; this route never worked because
// createPayment was called with the request object as the Booking_id.
const createPaymentRoute = (req, res) =>
  sendResponse(res, 410, true, "Payment data is returned by /bookTicket");

const BookEventTicketsByCustomer = async (req, res) => {
  let session;
  try {
    const { string } = req.body;
    const data = decrypt(string);
    const parsedData = JSON.parse(data);

    console.log("Get Book Event Tickets by Customer API Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(parsedData));

    // Step 1: Validate incoming request body
    const validationResponse =
      await validateEventTicketsBookingByWebsite(parsedData);
    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    // Destructure required fields from the request body
    const {
      customer_id,
      event_id,
      EventTicket_id,
      TicketQuantity,
      Promocode_id,
      customer_Address,
      customer_Pincode,
      customer_Country,
      customer_CountryIsoCode,
      customer_State,
      customer_StateIsoCode,
      customer_City,
      customer_CityIsoCode,
    } = parsedData;

    // Step 2: Verify the customer and event existence in parallel
    const [isCustomerExists, isEventExists] = await Promise.all([
      findOneCustomerDataService({ _id: customer_id, status: Status.Active }),
      findOneEventDataService({
        _id: event_id,
        ...WebsiteCommonEventFilterQuery,
      }),
    ]);

    if (!isCustomerExists)
      return sendResponse(res, 404, true, "Customer Not Found");
    if (!isEventExists) return sendResponse(res, 404, true, "Event Not Found");

    // Step 3: Verify event ticket existence
    const eventTicketFilterQuery = {
      _id: EventTicket_id,
      Event_id: event_id,
      Visibility: {
        $in: [TicketVisiblity.All, TicketVisiblity.AllCustomers],
      },
    };
    const isEventTicketExists = await findOneEventTicketDataService(
      eventTicketFilterQuery,
    );

    if (!isEventTicketExists)
      return sendResponse(res, 404, true, "Event Ticket Not Found");

    // Extract necessary values for calculations
    const trimmedCustomerName = isCustomerExists._doc.CustomerName.trim();
    const PhoneNumber = isCustomerExists._doc.MobileNumber;
    const normalizedEmail = isCustomerExists._doc.Email.trim().toLowerCase();
    const TicketPrice = isEventTicketExists._doc.Price;
    const EventTicketType = isEventTicketExists._doc.TicketType;
    const TotalTicketPrice = TicketPrice * TicketQuantity;

    let EventDateTime_id = null;
    if (
      EventTicketType == TicketType.SingleDay ||
      EventTicketType == TicketType.MultipleDay
    ) {
      EventDateTime_id = isEventTicketExists._doc.EventDateTime_id;
    }

    // Step 4: Handle Promocode (if provided)
    let PromocodeDiscountAmount = 0;
    let TicketPriceAfterPromocodeDiscountAmount = TotalTicketPrice;

    if (Promocode_id) {
      const promocode = await findOnePromocodeDataService({
        status: PromocodeStatus.Active,
        _id: Promocode_id,
      });

      if (!promocode)
        return sendResponse(res, 404, true, "Invalid or Expired Promocode");

      const {
        _id,
        CanBeUsed,
        Events,
        OneTimeUseFlag,
        PromocodeType,
        Value: PromocodeValue,
        MinCheckoutAmount: PromocodeMinimumCheckOutAmount,
      } = promocode;

      // Check if the promocode is one-time use per customer
      if (OneTimeUseFlag == PromocodeOneTimePerCustomerFlag.Yes) {
        const IsPromocodeAlreadyUsed = await findOneEventBookingsDataService({
          customer_id: customer_id,
          Promocode_id: _id,
          status: BookingStatus.Booked,
        });
        if (IsPromocodeAlreadyUsed)
          return sendResponse(res, 400, true, "Promocode already used");
      }

      // Check event applicability
      let isValid = false;
      if (CanBeUsed == PromocodeCanbeUsedIn.AllEvents) {
        isValid = true;
      } else if (CanBeUsed == PromocodeCanbeUsedIn.SpecificEvents) {
        isValid =
          Array.isArray(Events) && Events.some((e) => e.event_id == event_id);
      }

      if (!isValid)
        return sendResponse(
          res,
          400,
          true,
          "Promocode not valid for this event",
        );

      // Check minimum checkout amount
      if (TotalTicketPrice < PromocodeMinimumCheckOutAmount) {
        return sendResponse(
          res,
          409,
          true,
          `Total Ticket Price should be greater than ${PromocodeMinimumCheckOutAmount}`,
        );
      }

      // Calculate discount based on Promocode type
      let appliedAmount = 0;
      if (PromocodeType == PromocodeUnit.Amount) {
        appliedAmount = PromocodeValue;
      } else if (PromocodeType == PromocodeUnit.Percentage) {
        appliedAmount = (TotalTicketPrice * PromocodeValue) / 100;
      }

      PromocodeDiscountAmount = Math.min(TotalTicketPrice, appliedAmount);
      TicketPriceAfterPromocodeDiscountAmount =
        TotalTicketPrice - PromocodeDiscountAmount;
    }

    // Step 5: Calculate Convenience Fee and GST
    const ConvenienceFeeType = isEventExists._doc.ConvinienceFeeUnit;
    const ConvenienceFeeValue = isEventExists._doc.ConvinienceFeeValue;

    // Zero price tickets are free: no convenience fee or GST
    const isZeroPriceTicket = TotalTicketPrice == 0;

    let ConvenienceFee = 0;
    if (isZeroPriceTicket) {
      ConvenienceFee = 0;
    } else if (ConvenienceFeeType == ConvinienceFeeUnit.Amount) {
      ConvenienceFee = ConvenienceFeeValue;
    } else if (ConvenienceFeeType == ConvinienceFeeUnit.Percentage) {
      ConvenienceFee =
        (TicketPriceAfterPromocodeDiscountAmount * ConvenienceFeeValue) / 100;
    }

    const ConvinenceFeeGstAmount =
      (ConvenienceFee * ConvinenceFeeGstPercentage) / 100;
    const TotalBookingAmount =
      TicketPriceAfterPromocodeDiscountAmount +
      ConvenienceFee +
      ConvinenceFeeGstAmount;

    // Nothing to pay, so the booking is confirmed without PayU
    const isFreeBooking = TotalBookingAmount == 0;

    // Step 6: Generate a unique Booking ID
    let TicketBooking_id, eventBookingExists, bulkTicketExists;
    do {
      TicketBooking_id = generateRandomAlphaNumeric(6);
      [eventBookingExists, bulkTicketExists] = await Promise.all([
        findOneEventBookingsDataService({ Booking_id: TicketBooking_id }),
        findOneEventBulkTicketsDataService({ Booking_id: TicketBooking_id }),
      ]);
    } while (eventBookingExists || bulkTicketExists);

    // Step 7: Verify available ticket quantity
    const TotalEventTicketsQuantity = isEventTicketExists._doc.Quantity;
    const BookedTicketQuantity = isEventTicketExists._doc.BookedQuantity;
    const TicketsAvailableQuantity =
      TotalEventTicketsQuantity - BookedTicketQuantity;
    const TicketMaximumBookingQuantity =
      isEventTicketExists._doc.BookingMaxLimit;

    if (TicketQuantity > TicketMaximumBookingQuantity) {
      return sendResponse(
        res,
        409,
        true,
        `Maximum ${TicketMaximumBookingQuantity} Tickets Can be Booked Once`,
      );
    }

    if (TicketQuantity > TicketsAvailableQuantity) {
      return sendResponse(res, 409, true, "Insufficient Tickets Available");
    }

    // Step 8: Generate QR code and save it
    const qrObj = { Booking_id: TicketBooking_id, TicketType: EventTicketType };
    const qrCodeUrl = await generateQRCode(qrObj);
    const QrCodeimagePath = await saveQRCodeToServer(
      qrCodeUrl,
      TicketBooking_id,
    );

    const Transaction_id = `${TicketBooking_id}-${Date.now()}`;

    // Step 9: Create Booking Object
    const BookingObj = {
      _id: uuidv4(),
      customer_id,
      CustomerName: trimmedCustomerName,
      PhoneNumber,
      Email: normalizedEmail,
      event_id,
      EventDateTime_id: EventDateTime_id,
      EventTicketType,
      EventTicket_id,
      TicketQuantity,
      TicketPrice,
      Booking_id: TicketBooking_id,
      Transaction_id: Transaction_id,
      Promocode_id: Promocode_id || null,
      PromocodeDiscountAmount,
      ConvenienceFee,
      GST: ConvinenceFeeGstAmount,
      TotalAmount: TotalBookingAmount,
      BookingDateTime: getCurrentDateTime(),
      FilterationBookingDateTime: getAsiaCalcuttaCurrentDateTimeinIsoFormat(),
      BookingSource: TicketBookingSource.Website,
      Qr_image_path: QrCodeimagePath,
      customer_Address,
      customer_Pincode,
      customer_Country: customer_Country || null,
      customer_CountryIsoCode: customer_CountryIsoCode || null,
      customer_State: customer_State || null,
      customer_StateIsoCode: customer_StateIsoCode || null,
      customer_City: customer_City || null,
      customer_CityIsoCode: customer_CityIsoCode || null,
      status: isFreeBooking ? BookingStatus.Booked : BookingStatus.InProcess,
      ...(isFreeBooking && { mode: "FREE", net_amount_debit: "0" }),
    };

    // Step 10: Start the database transaction and save booking details
    session = await EventBookings.startSession();
    session.startTransaction();

    await EventBookings.create([BookingObj], { session });

    // Update the booked quantity of event tickets
    const updatedTicket = await EventTickets.findOneAndUpdate(
      {
        _id: EventTicket_id,
        EventDateTime_id,
        Event_id: event_id,
        $expr: {
          $gte: [
            { $subtract: ["$Quantity", "$BookedQuantity"] },
            TicketQuantity,
          ],
        },
      },
      { $inc: { BookedQuantity: TicketQuantity } },
      { new: true, session },
    );

    if (!updatedTicket) {
      await session.abortTransaction();
      return sendResponse(res, 409, true, "Insufficient Tickets Available");
    }

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    if (isFreeBooking) {
      await sendBookingSmsMailtoUser(TicketBooking_id);

      const redirectUrl = `${WebisteBase_Url}/success?Booking_id=${BookingObj._id}&txnid=${Transaction_id}&amount=0&paymentmode=FREE`;

      return sendResponse(
        res,
        200,
        false,
        "Event Ticket Booked successfully",
        encrypt({
          isFreeBooking: true,
          Booking_id: BookingObj._id,
          redirectUrl,
        }),
      );
    }

    const PaymentDataObj = await createPayment(TicketBooking_id);

    const responseadata = encrypt(PaymentDataObj);

    // Step 11: Return success response
    return sendResponse(
      res,
      200,
      false,
      "Event Ticket Booked successfully",
      responseadata,
    );
  } catch (error) {
    // Rollback the transaction in case of an error
    if (session?.inTransaction()) await session.abortTransaction();
    if (session) session.endSession();

    console.error(
      "Error in booking Event Tickets by Customer on Website:",
      error,
    );
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getPaymentDetailsUpdate = ({
  mihpayid,
  addedon,
  payment_source,
  net_amount_debit,
  unmappedstatus,
  mode,
  bank_ref_num,
  cardnum,
  error = null,
  error_Message = null,
}) => ({
  mihpayid,
  unmappedstatus,
  mode,
  bank_ref_num,
  cardnum,
  addedon,
  error,
  error_Message,
  payment_source,
  net_amount_debit,
});

const paymentSuccess = async (req, res) => {
  try {
    console.log("Payment Succcess Api Called");
    const { txnid, mode, status, amount, net_amount_debit } = req.body;

    if (!txnid || !status) {
      return sendResponse(res, 400, true, "All fields are required");
    }

    if (!isValidPayuResponseHash(req.body)) {
      console.error(`PayU hash mismatch on success callback for ${txnid}`);
      return redirectToFailurePage(
        res,
        txnid,
        "HASH_MISMATCH",
        "Payment could not be verified",
      );
    }

    if (status !== "success") {
      console.error(`PayU success callback with status ${status} for ${txnid}`);
      return redirectToFailurePage(
        res,
        txnid,
        "PAYMENT_NOT_SUCCESSFUL",
        "Payment was not successful",
      );
    }

    const bookingData = await findOneEventBookingsDataService({
      Transaction_id: txnid,
    });
    if (!bookingData) {
      return sendResponse(res, 400, true, "Booking Not Found");
    }

    if (!isSameAmount(amount, bookingData._doc.TotalAmount)) {
      console.error(
        `PayU amount ${amount} does not match booking amount ${bookingData._doc.TotalAmount} for ${txnid}`,
      );
      return redirectToFailurePage(
        res,
        txnid,
        "AMOUNT_MISMATCH",
        "Payment amount does not match the booking",
      );
    }

    // Only an InProcess booking moves to Booked, so repeated callbacks are ignored
    const updatedBooking = await EventBookings.findOneAndUpdate(
      { Transaction_id: txnid, status: BookingStatus.InProcess },
      { ...getPaymentDetailsUpdate(req.body), status: BookingStatus.Booked },
    );

    if (updatedBooking) {
      await sendBookingSmsMailtoUser(bookingData._doc.Booking_id);
    } else if (bookingData._doc.status !== BookingStatus.Booked) {
      return redirectToFailurePage(
        res,
        txnid,
        "BOOKING_NOT_IN_PROCESS",
        "Booking is no longer awaiting payment",
      );
    }

    return res.redirect(
      `${WebisteBase_Url}/success?Booking_id=${bookingData._id}&txnid=${txnid}&amount=${net_amount_debit}&paymentmode=${mode}`,
    );
  } catch (error) {
    console.error("Error handling payment success:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const paymentFailed = async (req, res) => {
  try {
    console.log("Payment Failed Api Called");
    const { txnid, error, error_Message } = req.body;

    if (!txnid || !error) {
      return sendResponse(res, 400, true, "All fields are required");
    }

    // A forged failure callback would otherwise cancel a customer's booking
    if (!isValidPayuResponseHash(req.body)) {
      console.error(`PayU hash mismatch on failure callback for ${txnid}`);
      return redirectToFailurePage(
        res,
        txnid,
        "HASH_MISMATCH",
        "Payment could not be verified",
      );
    }

    const bookingData = await findOneEventBookingsDataService({
      Transaction_id: txnid,
    });
    if (!bookingData) {
      return sendResponse(res, 400, true, "Booking Not Found");
    }

    // Only an InProcess booking moves to Failed, so tickets are released once
    const updatedBooking = await EventBookings.findOneAndUpdate(
      { Transaction_id: txnid, status: BookingStatus.InProcess },
      {
        ...getPaymentDetailsUpdate(req.body),
        status: BookingStatus.Failed,
      },
    );

    if (updatedBooking) {
      await EventTickets.updateOne(
        { _id: updatedBooking.EventTicket_id },
        { $inc: { BookedQuantity: -updatedBooking.TicketQuantity } },
      );
    }

    return res.redirect(
      `${WebisteBase_Url}/failure?Booking_id=${
        bookingData._id
      }&txnid=${txnid}&error=${error}&error_Message=${encodeURIComponent(
        error_Message,
      )}`,
    );
  } catch (error) {
    console.error("Error handling payment failure:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

export {
  BookEventTicketsByCustomer,
  createPaymentRoute,
  paymentSuccess,
  paymentFailed,
};
