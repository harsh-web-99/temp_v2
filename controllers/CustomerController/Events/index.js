import { validateEventsDataFilter } from "../../../validations/index.js";
import sendResponse from "../../../helpers/sendResponse.js";
import {
  IsOnlineEvent,
  IsVenueAvailable,
  Status,
  isEventFeatured,
  TicketStatus,
  TicketType,
  TicketVisiblity,
} from "../../../helpers/Enum.js";
import {
  findOneEventDataService,
  getEventDataService,
  getFormattedEventCardData,
  WebsiteCommonEventFilterQuery,
  formatEventDataforDetailsPage,
  getFormattedEventDateTimeByIdService,
} from "../../../services/EventServices.js";
import {
  getEventDateTimeDataService,
  getUpcomingEventIds,
  SortEventDateTime,
} from "../../../services/EventDateTimeServices.js";
import {
  getEventTourDataService,
  findOneEventTourDataService,
} from "../../../services/EventTourServices.js";
import { getEventTicketDataService } from "../../../services/EventTicketServices.js";

const subtractTime = (date) => {
  date.setHours(date.getHours() - 5);
  date.setMinutes(date.getMinutes() - 30);
  return date;
};

const formatEventDateTime = (eventDate, eventDateTimeId) => {
  const dayOfWeek = eventDate.toLocaleString("en-US", { weekday: "long" });
  const day = eventDate.toLocaleString("en-US", { day: "numeric" });
  const month = eventDate.toLocaleString("en-US", { month: "short" });
  const time = eventDate.toLocaleString("en-US", {
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  });

  return {
    eventDateTime_id: eventDateTimeId,
    Date: `${day}`,
    Time: time,
    Day: dayOfWeek,
    Month: month,
  };
};

const getAllOnlineEvents = async (req, res) => {
  try {
    console.log("Get All Online Events for WebSite API Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    const validationResponse = await validateEventsDataFilter(req.body);
    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const { category_id, startDate, endDate, LanguageName, Genre_id } =
      req.body;

    // const { ids: EventIds, error } = await getUpcomingEventIds();

    // if (error) {
    //   return sendResponse(res, 404, false, error);
    // }

    let EventFilterfilterQuery = {
      // _id: { $in: EventIds },
      OnlineEventFlag: IsOnlineEvent.Yes,
      ...WebsiteCommonEventFilterQuery,
    };

    if (category_id) {
      EventFilterfilterQuery["EventCategories.category_id"] = category_id;
    }

    if (LanguageName) {
      EventFilterfilterQuery.EventLanguages = {
        $eq: [LanguageName.trim()],
      };
    }

    if (Genre_id) {
      EventFilterfilterQuery["EventGenre.genre_id"] = Genre_id;
    }

    const EventsData = await getEventDataService(EventFilterfilterQuery);
    if (!EventsData.length) {
      return sendResponse(res, 404, false, "No Future Online Events Found");
    }

    if (startDate && endDate) {
      const EventDateTimeData = await getEventDateTimeDataService({
        EventStartDateTime: { $gte: startDate, $lte: endDate },
      });

      if (!EventDateTimeData.length) {
        return sendResponse(res, 404, false, "No Events Found");
      }

      const eventIds = EventDateTimeData.map((item) => item.Event_id);
      const filteredEvents = EventsData.filter((item) =>
        eventIds.includes(item._id)
      );

      if (!filteredEvents.length) {
        return sendResponse(res, 404, false, "No Events Found");
      }

      const updatedEventsDataArray = await getFormattedEventCardData(
        filteredEvents
      );

      return sendResponse(
        res,
        200,
        false,
        "Online Events fetched successfully",
        updatedEventsDataArray.reverse()
      );
    }

    const formattedEventsDataArray = await getFormattedEventCardData(
      EventsData
    );

    return sendResponse(
      res,
      200,
      false,
      "Online Events fetched successfully",
      formattedEventsDataArray
    );
  } catch (error) {
    console.error("Error in fetching All Events Data:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getAllFeaturedEvents = async (req, res) => {
  try {
    console.log("Get All Featured Events for WebSite API Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    const validationResponse = await validateEventsDataFilter(req.body);
    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const { category_id, startDate, endDate, LanguageName, Genre_id } =
      req.body;

    // const { ids: EventIds, error } = await getUpcomingEventIds();

    // if (error) {
    //   return sendResponse(res, 404, false, error);
    // }

    let EventFilterfilterQuery = {
      // _id: { $in: EventIds },
      FeaturedEventFlag: isEventFeatured.Yes,
      ...WebsiteCommonEventFilterQuery,
    };

    if (category_id) {
      EventFilterfilterQuery["EventCategories.category_id"] = category_id;
    }

    if (LanguageName) {
      EventFilterfilterQuery.EventLanguages = {
        $eq: [LanguageName.trim()],
      };
    }

    if (Genre_id) {
      EventFilterfilterQuery["EventGenre.genre_id"] = Genre_id;
    }

    const EventsData = await getEventDataService(EventFilterfilterQuery);
    if (!EventsData.length) {
      return sendResponse(res, 404, false, "No Featured Events Found");
    }

    if (startDate && endDate) {
      const EventDateTimeData = await getEventDateTimeDataService({
        EventStartDateTime: { $gte: startDate, $lte: endDate },
      });

      if (!EventDateTimeData.length) {
        return sendResponse(res, 404, false, "No Events Found");
      }

      const eventIds = EventDateTimeData.map((item) => item.Event_id);
      const filteredEvents = EventsData.filter((item) =>
        eventIds.includes(item._id)
      );

      if (!filteredEvents.length) {
        return sendResponse(res, 404, false, "No Events Found");
      }

      const updatedEventsDataArray = await getFormattedEventCardData(
        filteredEvents
      );

      return sendResponse(
        res,
        200,
        false,
        "Featured Events fetched successfully",
        updatedEventsDataArray.reverse()
      );
    }

    const formattedEventsDataArray = await getFormattedEventCardData(
      EventsData
    );

    return sendResponse(
      res,
      200,
      false,
      "Featured Events fetched successfully",
      formattedEventsDataArray
    );
  } catch (error) {
    console.error("Error in fetching All Events Data:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getAllUpcomingEvents = async (req, res) => {
  try {
    console.log("Get All Upcoming Events for WebSite API Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    const validationResponse = await validateEventsDataFilter(req.body);
    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const { category_id, startDate, endDate, LanguageName, Genre_id } =
      req.body;

    // const { ids: EventIds, error } = await getUpcomingEventIds();

    // if (error) {
    //   return sendResponse(res, 404, false, error);
    // }

    let EventFilterfilterQuery = {
      // _id: { $in: EventIds },
      ...WebsiteCommonEventFilterQuery,
    };

    if (category_id) {
      EventFilterfilterQuery["EventCategories.category_id"] = category_id;
    }

    if (LanguageName) {
      EventFilterfilterQuery.EventLanguages = {
        $eq: [LanguageName.trim()],
      };
    }

    if (Genre_id) {
      EventFilterfilterQuery["EventGenre.genre_id"] = Genre_id;
    }

    const EventsData = await getEventDataService(EventFilterfilterQuery);
    if (!EventsData.length) {
      return sendResponse(res, 404, false, "No Upcoming Events Found");
    }

    if (startDate && endDate) {
      const EventDateTimeData = await getEventDateTimeDataService({
        EventStartDateTime: { $gte: startDate, $lte: endDate },
      });

      if (!EventDateTimeData.length) {
        return sendResponse(res, 404, false, "No Events Found");
      }

      const eventIds = EventDateTimeData.map((item) => item.Event_id);
      const filteredEvents = EventsData.filter((item) =>
        eventIds.includes(item._id)
      );

      if (!filteredEvents.length) {
        return sendResponse(res, 404, false, "No Events Found");
      }

      const updatedEventsDataArray = await getFormattedEventCardData(
        filteredEvents
      );

      return sendResponse(
        res,
        200,
        false,
        "Upcoming Events fetched successfully",
        updatedEventsDataArray.reverse()
      );
    }

    const formattedEventsDataArray = await getFormattedEventCardData(
      EventsData
    );

    return sendResponse(
      res,
      200,
      false,
      "Upcoming Events fetched successfully",
      formattedEventsDataArray
    );
  } catch (error) {
    console.error("Error in fetching All Upcoming Events Data:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getLiveEventsTour = async (req, res) => {
  try {
    console.log("Get All Live Events Tour for WebSite API Called");

    const TotalEventTours = await getEventTourDataService({
      status: Status.Active,
    });

    if (TotalEventTours.length == 0) {
      return sendResponse(res, 404, false, "No Tour Events Found");
    }

    const LiveEventToursData = (
      await Promise.all(
        TotalEventTours.map(async (tourData) => {
          const Tour_id = tourData._doc._id;
          let EventFilterfilterQuery = {
            EventTour_id: Tour_id,
            ...WebsiteCommonEventFilterQuery,
          };

          const EventsData = await getEventDataService(EventFilterfilterQuery);
          if (EventsData.length > 0) {
            return {
              Tour_id: tourData._doc._id,
              TourName: tourData._doc.Name,
              EventCardImages: tourData._doc.Images,
            };
          }
          return null;
        })
      )
    ).filter((tour) => tour !== null);

    if (!LiveEventToursData) {
      return sendResponse(res, 404, false, "No Live Events Tours Found");
    }

    return sendResponse(
      res,
      200,
      false,
      "Live Events Tours fetched successfully",
      LiveEventToursData
    );
  } catch (error) {
    console.error("Error in fetching All Live Events Tours Data:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getLiveEventTourDetailsbyId = async (req, res) => {
  try {
    console.log("Get Webiste Event Tour Details By Id Api Called");
    console.log(
      "Event Tour Id:-----> " + JSON.stringify(req.body.event_Tour_id)
    );

    const { event_Tour_id } = req.body;

    if (!event_Tour_id) {
      return sendResponse(res, 404, true, "Event Tour Id Not Provided");
    }

    const eventTourFilterQuery = {
      _id: event_Tour_id,
      status: Status.Active,
    };

    const EventTourData = await findOneEventTourDataService(
      eventTourFilterQuery
    );

    if (!EventTourData) {
      return sendResponse(res, 404, false, "Event Tour Not Found");
    }

    let EventFilterfilterQuery = {
      EventTour_id: event_Tour_id,
      ...WebsiteCommonEventFilterQuery,
    };

    const TourEventsData = await getEventDataService(EventFilterfilterQuery);

    if (!TourEventsData) {
      return sendResponse(
        res,
        404,
        false,
        `No Events Tour Not Found for ${EventTourData._doc.Name}`
      );
    }

    const TourDateTimeArray = [];

    await Promise.all(
      TourEventsData.map(async (data) => {
        const event_id = data._doc._id;

        const eventDateTimeFilterQuery = {
          Event_id: event_id,
        };

        let fetchEventDateTimes = await getEventDateTimeDataService(
          eventDateTimeFilterQuery
        );
        TourDateTimeArray.push(...fetchEventDateTimes);
      })
    );

    const formattedTourEventsDataArray = await getFormattedEventCardData(
      TourEventsData
    );

    const EventTourlowestPrice = formattedTourEventsDataArray.reduce(
      (min, event) => Math.min(min, event.LowestticketPrice),
      formattedTourEventsDataArray[0].LowestticketPrice
    );

    const FirstDateTime = SortEventDateTime(TourDateTimeArray);

    let EventTourStartDateTimeData = FirstDateTime[0];

    const eventDate = new Date(
      EventTourStartDateTimeData._doc.EventStartDateTime
    );
    const EventTourStartDate = eventDate.toLocaleDateString("en-GB", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const respObj = {
      TourImages: EventTourData._doc.Images,
      TourName: EventTourData._doc.Name,
      TourDescription: EventTourData._doc.Description,
      EventTourStartDate: `${EventTourStartDate} Onwards`,
      EventTourlowestPrice: `${EventTourlowestPrice} Onwards`,
      TourEvents: formattedTourEventsDataArray,
    };

    return sendResponse(
      res,
      200,
      false,
      "Event Tour Details Fetched successfully",
      respObj
    );
  } catch (error) {
    console.error("Get Webiste Event Tour Details By Id Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getEventDetailsById = async (req, res) => {
  try {
    console.log("Get Website Event Details By Id API Called");
    const { event_id } = req.body;

    if (!event_id) {
      return sendResponse(res, 404, true, "Event Id Not Provided");
    }

    // Prepare query to find event by ID
    const eventFilterQuery = {
      _id: event_id,
      ...WebsiteCommonEventFilterQuery,
    };

    // Check if event exists
    const eventData = await findOneEventDataService(eventFilterQuery);
    if (!eventData) {
      return sendResponse(res, 404, true, "Event not found");
    }

    // Format event data for details page
    const eventDetails = await formatEventDataforDetailsPage(eventData);

    // Extract related event categories, artists, and genres
    const {
      EventCategories,
      EventArtist,
      EventGenre,
      VenueEventFlag,
      venue_id,
    } = eventData;

    // Prepare suggestions by venue,category, artist, and genre
    let suggestEvents = [];

    const categoryIds = EventCategories.map(
      (categories) => categories.category_id
    );
    const artistIds = EventArtist.map((artist) => artist.artist_id);
    const genreIds = EventGenre.map((genre) => genre.genre_id);

    if (VenueEventFlag == IsVenueAvailable.Yes) {
      const venueFilterQuery = {
        _id: { $ne: event_id },
        ...WebsiteCommonEventFilterQuery,
        venue_id: venue_id,
      };
      const sameVenueEvents = await getEventDataService(venueFilterQuery);
      const formattedVenueEvents = await getFormattedEventCardData(
        sameVenueEvents
      );

      suggestEvents = [...new Set([...suggestEvents, ...formattedVenueEvents])];
    }

    if (suggestEvents.length < 4) {
      const categoryFilterQuery = {
        "EventCategories.category_id": { $in: categoryIds },
        _id: { $ne: event_id },
        ...WebsiteCommonEventFilterQuery,
      };
      const sameCategoryEvents = await getEventDataService(categoryFilterQuery);
      const formattedCategoryEvents = await getFormattedEventCardData(
        sameCategoryEvents
      );

      suggestEvents = [
        ...new Set([...suggestEvents, ...formattedCategoryEvents]),
      ];
    }

    if (suggestEvents.length < 4) {
      const artistFilterQuery = {
        "EventArtist.artist_id": { $in: artistIds },
        _id: { $ne: event_id },
        ...WebsiteCommonEventFilterQuery,
      };
      const sameArtistEvents = await getEventDataService(artistFilterQuery);
      const formattedArtistEvents = await getFormattedEventCardData(
        sameArtistEvents
      );

      suggestEvents = [
        ...new Set([...suggestEvents, ...formattedArtistEvents]),
      ];
    }

    if (suggestEvents.length < 4) {
      const genreFilterQuery = {
        "EventGenre.genre_id": { $in: genreIds },
        _id: { $ne: event_id },
        ...WebsiteCommonEventFilterQuery,
      };
      const sameGenreEvents = await getEventDataService(genreFilterQuery);
      const formattedGenreEvents = await getFormattedEventCardData(
        sameGenreEvents
      );

      suggestEvents = [...new Set([...suggestEvents, ...formattedGenreEvents])];
    }

    // Prepare final response object
    const responsePayload = {
      EventDetailsObj: eventDetails,
      suggestedEvents: suggestEvents.slice(0, 4),
    };

    return sendResponse(
      res,
      200,
      false,
      "Event Details Fetched successfully",
      responsePayload
    );
  } catch (error) {
    console.error("Get Website Event Details By Id Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getEventDateTimeById = async (req, res) => {
  try {
    console.log("Get Event Date Time By Id Api Called");

    const { event_id } = req.body;

    if (!event_id) {
      return sendResponse(res, 404, true, "Event Id Not Provided");
    }

    // Check if the event exists
    const eventFilterQuery = { _id: event_id };
    let isEventExists = await findOneEventDataService(eventFilterQuery);

    if (!isEventExists) {
      return sendResponse(res, 404, true, "Event not found");
    }

    // Fetch Event DateTimes based on event_id
    const eventDateTimeFilterQuery = { Event_id: event_id };
    let fetchEventDateTimes = await getEventDateTimeDataService(
      eventDateTimeFilterQuery
    );

    if (!fetchEventDateTimes || fetchEventDateTimes.length == 0) {
      return sendResponse(res, 404, true, "No event times found");
    }

    // Format the event date times and subtract 5 hours and 30 minutes
    const formattedEventDateTimeData = fetchEventDateTimes.map((data) => {
      // Subtract 5 hours and 30 minutes from EventStartDateTime
      const adjustedDate = subtractTime(new Date(data.EventStartDateTime));

      // Format the adjusted date
      return formatEventDateTime(adjustedDate, data._id);
    });

    const isSeasonPassExists = await getEventTicketDataService({
      Event_id: event_id,
      Visibility: {
        $in: [TicketVisiblity.All, TicketVisiblity.AllCustomers],
      },
      TicketType: TicketType.SeasonPass,
      EventTicketStatus: TicketStatus.Enable,
    });

    const respObj = {
      EventName: isEventExists._doc.EventName,
      DateTimeDate: formattedEventDateTimeData,
      SeasonPassCount: isSeasonPassExists.length,
    };

    return sendResponse(
      res,
      200,
      false,
      "Event Date Times fetched successfully",
      respObj
    );
  } catch (error) {
    console.error("Get Event Date Time By Event Id Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

export {
  getAllOnlineEvents,
  getAllFeaturedEvents,
  getAllUpcomingEvents,
  getLiveEventsTour,
  getLiveEventTourDetailsbyId,
  getEventDetailsById,
  getEventDateTimeById,
};
