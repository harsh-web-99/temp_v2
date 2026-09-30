import getCurrentDateTime from "../helpers/getCurrentDateTime.js";
import {
  EventEnableDisableStatus,
  EventStatus,
  PromocodeStatus,
  BookingStatus,
  TicketBookingSource,
} from "../helpers/Enum.js";
import {
  getEventDataService,
  updateEventDataService,
} from "../services/EventServices.js";
import { getEventDateTimeDataService } from "../services/EventDateTimeServices.js";
import {
  getPromocodeDataService,
  updatePromocodeDataService,
} from "../services/PromocodeServices.js";
import path from "path";
import fs from "fs/promises";
import { getAsiaCalcuttaCurrentDateTimeinIsoFormat } from "../helpers/DateTime.js";
import { getEventBookingsDataService } from "../services/EventBookingServices.js";
import { EventTickets, EventBookings } from "../models/AllModels.js";

let isJobRunning = false;
let isPromocodeJobRunning = false;
let isBookingJobRunning = false;

const checkIfAllEventDateTimeEnded = (eventDateTimeData) => {
  const currentTime = getAsiaCalcuttaCurrentDateTimeinIsoFormat();

  // Check if all EventEndDateTime are less than currentTime
  return eventDateTimeData.every((event) => {
    const eventEndTime = new Date(event.EventEndDateTime).toISOString();
    return eventEndTime < currentTime;
  });
};

const updateEventStatusToCompleted = async () => {
  try {
    // Check if a job is already running
    if (isJobRunning) {
      console.log("Another job is currently running. Skipping this execution.");
      return;
    }

    // Set the lock to indicate job is running
    isJobRunning = true;
    console.log(
      "updateEventStatusToCompleted Function started at " + getCurrentDateTime()
    );

    // Define the query for fetching events that are published and enabled
    const eventFilterQuery = {
      EventStatus: EventStatus.Published,
      EventIsEnableOrDisable: EventEnableDisableStatus.Enable,
    };

    // Fetch event data based on the query
    const EventsData = await getEventDataService(eventFilterQuery);

    if (!EventsData.length) {
      console.log("Published Events not found");
      isJobRunning = false; // Release lock
      return;
    }

    // Iterate over each event data
    await Promise.all(
      EventsData.map(async (data) => {
        const Event_id = data._doc._id;

        // Query to get EventDateTime data for the current event
        const eventDateTimeForEventsFilterQuery = {
          Event_id: Event_id,
        };
        const EventDateTimeData = await getEventDateTimeDataService(
          eventDateTimeForEventsFilterQuery
        );

        // Check if all EventDateTime entries for the event have ended
        const isEventEnded = checkIfAllEventDateTimeEnded(EventDateTimeData);

        if (isEventEnded) {
          const filterquery = {
            _id: Event_id,
          };

          const updateQuery = {
            EventStatus: EventStatus.Completed,
          };

          await updateEventDataService(filterquery, updateQuery);
          console.log(`Event with ID ${Event_id} marked as completed.`);
        } else {
          console.log(`Event with ID ${Event_id} is still ongoing.`);
        }
      })
    );

    // Release the lock after the job is completed
    isJobRunning = false;
    console.log("updateEventStatusToCompleted Function completed.");
  } catch (error) {
    // Release the lock in case of error
    isJobRunning = false;
    console.error("Error in fetching Published Events Data:", error);
  }
};

const expirePromocodeStatus = async () => {
  try {
    if (isPromocodeJobRunning) {
      console.log(
        "Another Promocode job is currently running. Skipping this execution."
      );
      return;
    }

    isPromocodeJobRunning = true;
    console.log("Expire Promocode Function started at " + getCurrentDateTime());

    const promocodeFilterQuery = {
      status: PromocodeStatus.Active,
    };

    const PromocodeData = await getPromocodeDataService(promocodeFilterQuery);

    if (!PromocodeData.length) {
      console.log("No Promocode found for expiry.");
      isPromocodeJobRunning = false;
      return;
    }

    await Promise.all(
      PromocodeData.map(async (promocode) => {
        const currentTime = getAsiaCalcuttaCurrentDateTimeinIsoFormat();
        const expiryTime = new Date(promocode.ExpiryDate).toISOString();
        const promocode_id = promocode._id;

        if (expiryTime <= currentTime) {
          const filterQuery = {
            _id: promocode_id,
          };

          const updateQuery = {
            status: PromocodeStatus.Expired,
          };

          await updatePromocodeDataService(filterQuery, updateQuery);

          console.log(
            `Promocode ${promocode_id} has been updated to Expired status.`
          );
        }
      })
    );

    isPromocodeJobRunning = false;
    console.log("Expire Promocode Function completed.");
  } catch (error) {
    isPromocodeJobRunning = false;
    console.error("Error in expiring Promocodes:", error);
  }
};

const releasePendingBookingTickets = async () => {
  try {
    if (isBookingJobRunning) {
      console.log(
        "Relase Pending Bookings job is currently running. Skipping this execution."
      );
      return;
    }

    isBookingJobRunning = true;
    console.log(
      "Release Pending Bookings Function started at " + getCurrentDateTime()
    );

    const currentTime = getAsiaCalcuttaCurrentDateTimeinIsoFormat();
    const dateTime = new Date(currentTime);
    dateTime.setTime(dateTime.getTime() - 10 * 60 * 1000);
    const tenMinutesAgo = dateTime.toISOString();

    const inprocessbookingfilterQuery = {
      status: BookingStatus.InProcess,
      FilterationBookingDateTime: { $lt: tenMinutesAgo },
      BookingSource: TicketBookingSource.Website,
    };
    const InProcessBookingData = await getEventBookingsDataService(
      inprocessbookingfilterQuery
    );

    if (!InProcessBookingData.length) {
      console.log("No In process Bookings found for relase.");
      isBookingJobRunning = false;
      return;
    }

    await Promise.all(
      InProcessBookingData.map(async (bookingData) => {
        console.log("Bookings Found for release");

        // Delete only if still InProcess, so a booking paid in the meantime is kept
        // and each booking's tickets are released exactly once
        const releasedBooking = await EventBookings.findOneAndDelete({
          _id: bookingData._doc._id,
          status: BookingStatus.InProcess,
        });
        if (!releasedBooking) return;

        await EventTickets.updateOne(
          { _id: releasedBooking.EventTicket_id },
          { $inc: { BookedQuantity: -releasedBooking.TicketQuantity } }
        );

        if (releasedBooking.Qr_image_path) {
          await fs
            .unlink(path.join(releasedBooking.Qr_image_path))
            .catch((err) =>
              console.error("Error deleting QR code image:", err.message)
            );
        }
      })
    );

    isBookingJobRunning = false;
    console.log("Release Pending Bookings Function completed.");
  } catch (error) {
    isBookingJobRunning = false;
    console.error("Error in relasing the Pending Bookings:", error);
  }
};

export {
  checkIfAllEventDateTimeEnded,
  updateEventStatusToCompleted,
  expirePromocodeStatus,
  releasePendingBookingTickets,
};
