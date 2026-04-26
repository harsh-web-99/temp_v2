import { validateBulkTicketBooking } from "../../../validations/index.js";
import getCurrentDateTime from "../../../helpers/getCurrentDateTime.js";
import {
  BulkTicketStatus,
  ImagesUrls,
  TicketType,
} from "../../../helpers/Enum.js";
import { v4 as uuidv4 } from "uuid";
import sendResponse from "../../../helpers/sendResponse.js";
import { generateRandomAlphaNumeric } from "../../../helpers/commonFunctions.js";
import {
  createEventBulkTicketsService,
  findOneEventBulkTicketsDataService,
  getEventBulkTicketsDataService,
  bulkUpdateBulkTicketsService,
  getPaginatedBulkTicketsData,
  countBulkTickets,
} from "../../../services/EventBulkTicketServices.js";
import { findOneSuperAdminDataService } from "../../../services/SuperAdminServices.js";
import { findOneEventDataService } from "../../../services/EventServices.js";
import { findOneEventBookingsDataService } from "../../../services/EventBookingServices.js";
import { getCheckInDataService } from "../../../services/CheckInServices.js";
import {
  getEventDateTimeDataService,
  findOneEventDateTimeDataService,
} from "../../../services/EventDateTimeServices.js";
import { findOneVenueDataService } from "../../../services/VenueServices.js";
import {
  generatePDFWithPuppeteer,
  generateQRCode,
  zipFiles,
  sendEmailWithAttachment,
} from "../../../services/EventTicketServices.js";
import ExcelJS from "exceljs";
import path from "path";
import fs from "fs";
import { getAsiaCalcuttaCurrentDateTimeinIsoFormat } from "../../../helpers/DateTime.js";

const createBulkTicketForEvent = async (req, res) => {
  try {
    console.log("Create Event Bulk Ticket API Called");
    console.log("Request Body Parameters:", req.body);

    const validationResponse = await validateBulkTicketBooking(req.body);
    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const {
      event_id,
      TicketName,
      CustomerName,
      PhoneNumber,
      Email,
      EventDateTime_id,
      Quantity,
      Price,
      CreatedBy,
      createduser_id,
    } = req.body;

    if (Quantity > 50) {
      return sendResponse(
        res,
        400,
        true,
        "Only 50 bulk tickets can be booked at one time"
      );
    }

    const superAdminExists = await findOneSuperAdminDataService({
      _id: createduser_id,
    });
    if (!superAdminExists) {
      return sendResponse(res, 404, true, "SuperAdmin Not Found");
    }

    const event = await findOneEventDataService({ _id: event_id });
    if (!event) {
      return sendResponse(res, 404, true, "Event Not Found");
    }

    if (event._doc.VenueEventFlag == 0) {
      return sendResponse(res, 409, true, "Venue is not available for event");
    }

    const venueData = await findOneVenueDataService({
      _id: event._doc.venue_id,
    });
    if (!venueData) {
      return sendResponse(res, 404, true, "Venue Not Found");
    }

    const trimmedCustomerName = CustomerName.trim();
    const normalizedEmail = Email.trim().toLowerCase();
    const trimmedTicketName = TicketName.trim();

    const eventDateTime = (
      await getEventDateTimeDataService({ Event_id: event_id })
    ).find((obj) => obj._id == EventDateTime_id);

    if (!eventDateTime) {
      return sendResponse(res, 404, true, "Event Date Time Not Found");
    }

    const eventDate = new Date(eventDateTime._doc.EventStartDateTime);
    const EventDate = eventDate.toLocaleDateString("en-GB", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    });
    const EventTime = eventDate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "UTC",
    });

    let BulkTicketBatchId;
    do {
      BulkTicketBatchId = generateRandomAlphaNumeric(6);
    } while (
      await findOneEventBulkTicketsDataService({ Batch_id: BulkTicketBatchId })
    );

    const bulkTicketArray = [];
    for (let i = 0; i < Quantity; i++) {
      let Booking_id;
      let eventBookingExists;
      let bulkTicketExists;
      do {
        Booking_id = generateRandomAlphaNumeric(6);

        [eventBookingExists, bulkTicketExists] = await Promise.all([
          findOneEventBookingsDataService({ Booking_id: Booking_id }),
          findOneEventBulkTicketsDataService({ Booking_id: Booking_id }),
        ]);
      } while (eventBookingExists || bulkTicketExists);

      const bulkTicketObj = {
        _id: uuidv4(),
        event_id,
        eventName: event._doc.EventName,
        VenueName: venueData._doc.Name,
        VenueCity: venueData._doc.City,
        Booking_id,
        Batch_id: BulkTicketBatchId,
        TicketName: trimmedTicketName,
        CustomerName: trimmedCustomerName,
        PhoneNumber,
        Email: normalizedEmail,
        EventDateTime_id: EventDateTime_id,
        EventDate,
        EventTime,
        Price,
        CreatedBy,
        createduser_id,
        FilterationDateTime: getAsiaCalcuttaCurrentDateTimeinIsoFormat(),
        createdAt: getCurrentDateTime(),
      };

      bulkTicketArray.push(bulkTicketObj);
    }

    await createEventBulkTicketsService(bulkTicketArray);

    const pdfDir = path.join(process.cwd(), "pdfs");
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir);
    }

    const BATCH_SIZE = 10;
    const pdfPromises = [];

    const logoUrl = ImagesUrls.EventingClubLogo;

    for (let i = 0; i < bulkTicketArray.length; i += BATCH_SIZE) {
      const batch = bulkTicketArray.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(async (ticket, index) => {
        const qrObj = {
          Booking_id: ticket.Booking_id,
          TicketType: TicketType.BulkTicket,
        };
        const qrCodeUrl = await generateQRCode(qrObj);
        const pdfPath = path.join(pdfDir, `ticket_${i + index + 1}.pdf`);
        await generatePDFWithPuppeteer(
          { ...ticket, qrCodeUrl, logoUrl },
          pdfPath
        );
        return { path: pdfPath, name: `ticket_${i + index + 1}.pdf` };
      });
      pdfPromises.push(...batchPromises);
      await Promise.all(batchPromises);
    }

    const pdfFiles = await Promise.all(pdfPromises);
    const zipFilePath = path.join(pdfDir, "tickets.zip");
    await zipFiles(pdfFiles, zipFilePath);

    // Send the email with the ZIP file attachment
    const emailResponse = await sendEmailWithAttachment(
      Email,
      zipFilePath,
      trimmedCustomerName,
      event._doc.EventName,
      logoUrl
    );

    // Optionally, you can respond to the client here
    res.status(200).json({
      message: "Tickets have been sent to your email.",
      emailResponse,
    });

    // Clean up
    pdfFiles.forEach(({ path }) => fs.unlinkSync(path));
    fs.unlinkSync(zipFilePath);
  } catch (error) {
    console.error("Create Event Bulk Ticket Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getBulkTicketsOfEvent = async (req, res) => {
  try {
    // Log API call and request body parameters
    console.log("Get Event Bulk Tickets Api Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    // Destructure request body
    const { event_id } = req.body;

    // Check if event id is provided
    if (!event_id) {
      return sendResponse(res, 404, true, "Event Id Not Provided");
    }

    const eventFilterQuery = {
      _id: event_id,
    };

    // Check if the event exists
    const isEventExists = await findOneEventDataService(eventFilterQuery);
    if (!isEventExists) {
      return sendResponse(res, 404, true, "Event Not Found");
    }

    const EventName = isEventExists._doc.EventName;

    const eventBulkTicketsFilterQuery = {
      event_id: event_id,
    };

    // Fetch bulk tickets of the event
    const EventBulkTicketsData = await getEventBulkTicketsDataService(
      eventBulkTicketsFilterQuery
    );

    // If no bulk tickets found
    if (EventBulkTicketsData.length == 0) {
      return sendResponse(res, 404, true, "Event Bulk Tickets Not Found");
    }

    const eventDateTimeFilterQuery = { Event_id: event_id };
    const EventDatesTime = await getEventDateTimeDataService(
      eventDateTimeFilterQuery
    );

    // Group bulk tickets by ticket name
    const groupedByBatchId = EventBulkTicketsData.reduce((acc, current) => {
      const batchId = current.Batch_id;
      if (!acc[batchId]) {
        acc[batchId] = [];
      }
      acc[batchId].push(current);
      return acc;
    }, {});

    let totalCheckInCount = 0;
    let totalQuantity = 0;
    let totalPrice = 0;

    // Fetch EventDateTime for each ticket and format grouped data
    const result = await Promise.all(
      Object.keys(groupedByBatchId).map(async (batchId) => {
        const ticketData = groupedByBatchId[batchId][0];
        const eventDateTime = await findOneEventDateTimeDataService({
          _id: ticketData._doc.EventDateTime_id,
        });

        const CheckInData = await getCheckInDataService({
          BulkTicketBatchId: batchId,
        });

        totalCheckInCount += CheckInData.length;
        totalQuantity += groupedByBatchId[batchId].length;
        totalPrice += groupedByBatchId[batchId].length * ticketData.Price;

        const EventStartDateTime = eventDateTime._doc.EventStartDateTime;

        return {
          BatchId: ticketData.Batch_id,
          TicketName: ticketData.TicketName,
          EventName: EventName,
          CustomerName: ticketData.CustomerName,
          PhoneNumber: ticketData.PhoneNumber,
          EventDateTime_id: ticketData.EventDateTime_id,
          EventStartDateTime: EventStartDateTime,
          Email: ticketData.Email,
          Quantity: groupedByBatchId[batchId].length,
          CheckIn: CheckInData.length,
          TotalAmount: groupedByBatchId[batchId].length * ticketData.Price,
          Price: ticketData.Price,
          CreatedAt: ticketData.createdAt,
          Status: ticketData.status,
        };
      })
    );

    const ticketNamesSet = new Set();
    result.forEach((ticketData) => {
      ticketNamesSet.add(ticketData.TicketName);
    });
    const TicketNamesArray = Array.from(ticketNamesSet);

    const responseObj = {
      TicketNamesArray: TicketNamesArray,
      EventBulkTicketsData: result,
      EventDatesTime: EventDatesTime,
      totalCheckInCount,
      totalQuantity,
      totalPrice,
    };

    // Return success response
    return sendResponse(
      res,
      200,
      false,
      "Event Bulk Tickets Fetched successfully",
      responseObj
    );
  } catch (error) {
    // Handle errors
    console.error("Get Event Bulk Tickets Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getBulkTicketsByFilter = async (req, res) => {
  try {
    console.log("Get Bulk Tickets by Filter API Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    // Validate the filters
    const { event_id, TicketName, eventDateTime } = req.body;
    if (!event_id) {
      return sendResponse(res, 400, true, "Event ID is required");
    }

    const eventFilterQuery = {
      _id: event_id,
    };
    let isEventExists = await findOneEventDataService(eventFilterQuery);

    if (!isEventExists) {
      return sendResponse(res, 404, true, "Event not found");
    }
    const EventName = isEventExists._doc.EventName;

    const eventBulkTicketsFilterQuery = {
      event_id: event_id,
    };

    if (TicketName) {
      eventBulkTicketsFilterQuery.TicketName = TicketName;
    }

    if (eventDateTime) {
      eventBulkTicketsFilterQuery.EventDateTime_id = eventDateTime;
    }

    const BulkTicketsData = await getEventBulkTicketsDataService(
      eventBulkTicketsFilterQuery
    );

    if (!BulkTicketsData.length) {
      return sendResponse(res, 404, true, "Tickets not found");
    }

    const groupedByBatchId = BulkTicketsData.reduce((acc, current) => {
      const batchId = current.Batch_id;
      if (!acc[batchId]) {
        acc[batchId] = [];
      }
      acc[batchId].push(current);
      return acc;
    }, {});

    // Format grouped data
    const result = await Promise.all(
      Object.keys(groupedByBatchId).map(async (batchId) => {
        const ticketData = groupedByBatchId[batchId][0];
        const eventDateTime = await findOneEventDateTimeDataService({
          _id: ticketData._doc.EventDateTime_id,
        });

        const CheckInData = await getCheckInDataService({
          BulkTicketBatchId: batchId,
        });

        const EventStartDateTime = eventDateTime._doc.EventStartDateTime;

        return {
          BatchId: ticketData.Batch_id,
          TicketName: ticketData.TicketName,
          EventName: EventName,
          CustomerName: ticketData.CustomerName,
          PhoneNumber: ticketData.PhoneNumber,
          EventDateTime_id: ticketData.EventDateTime_id,
          EventStartDateTime: EventStartDateTime,
          Email: ticketData.Email,
          Quantity: groupedByBatchId[batchId].length,
          CheckIn: CheckInData.length,
          TotalAmount: groupedByBatchId[batchId].length * ticketData.Price,
          Price: ticketData.Price,
          CreatedAt: ticketData.createdAt,
          Status: ticketData.status,
        };
      })
    );

    // Return success response
    return sendResponse(
      res,
      200,
      false,
      "Event Bulk Tickets Fetched successfully",
      result
    );
  } catch (error) {
    console.error("Error in fetching Tickets by Filter Data:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const cancelBukTicket = async (req, res) => {
  try {
    console.log("Cancel Bulk Ticket Status by BulkTicketBatch_Id API Called");
    console.log(
      "EventTicket Id:-----> " + JSON.stringify(req.body.BulkTicketBatch_Id)
    );

    const { BulkTicketBatch_Id } = req.body;

    if (!BulkTicketBatch_Id) {
      return sendResponse(res, 404, true, "Bulk Event Ticket Id Not Provided");
    }

    const eventBulkTicketFilterQuery = {
      Batch_id: BulkTicketBatch_Id,
    };
    const EventBulkTicketsData = await getEventBulkTicketsDataService(
      eventBulkTicketFilterQuery
    );

    if (EventBulkTicketsData.length == 0) {
      return sendResponse(res, 404, true, "Bulk Event Tickets not found");
    }

    const updateData = {
      status: BulkTicketStatus.Cancelled,
    };

    await bulkUpdateBulkTicketsService(eventBulkTicketFilterQuery, updateData);

    return sendResponse(
      res,
      200,
      false,
      "Bulk Event Tickets Cancelled successfully"
    );
  } catch (error) {
    console.error("Error in cancelling Event Bulk Tickets:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const exportBulkTicketBookingIds = async (req, res) => {
  try {
    console.log(
      "Export Bulk Ticket BookingIds by BulkTicketBatch_Id API Called"
    );
    const { BulkTicketBatch_Id } = req.body;

    // Log the received BulkTicketBatch_Id
    console.log("EventTicket Id:----->", BulkTicketBatch_Id);

    // Check if BulkTicketBatch_Id is provided
    if (!BulkTicketBatch_Id) {
      return sendResponse(res, 404, true, "Bulk Event Ticket Id Not Provided");
    }

    // Create the query to fetch the data
    const eventBulkTicketFilterQuery = { Batch_id: BulkTicketBatch_Id };
    const EventBulkTicketsData = await getEventBulkTicketsDataService(
      eventBulkTicketFilterQuery
    );

    // Check if any tickets were found
    if (EventBulkTicketsData.length == 0) {
      return sendResponse(res, 404, true, "Bulk Event Tickets not found");
    }

    // Create a new workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("BulkTicketBookingIds");

    // Add a header row
    worksheet.columns = [
      { header: "Booking_id", key: "Booking_id", width: 30 },
    ];

    // Add the data rows
    EventBulkTicketsData.forEach((ticket) => {
      worksheet.addRow({ Booking_id: ticket.Booking_id });
    });

    // Write the data to a buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Set response headers for downloading the Excel file
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="BulkTicketBookingIds.xlsx"'
    );

    // Send the buffer as the file response
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error("Error in exporting BulkTicket BookingIds:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

export {
  createBulkTicketForEvent,
  getBulkTicketsOfEvent,
  cancelBukTicket,
  exportBulkTicketBookingIds,
  getBulkTicketsByFilter,
};
