import { Event } from "../models/AllModels.js";
import {
  getEventDateTimeDataService,
  SortEventDateTime,
} from "./EventDateTimeServices.js";
import { findOneCategoryDataService } from "./CategoryServices.js";
import { findOnePromoterDataService } from "./PromoterServices.js";
import { findOneOrganizerDataService } from "./OrganizerServices.js";
import { findOneVenueDataService } from "./VenueServices.js";
import { getEventTicketDataService } from "./EventTicketServices.js";
import {
  TicketAvailability,
  TicketStatus,
  TicketVisiblity,
  EventVisibility,
  EventStatus,
  EventEnableDisableStatus,
  EventType,
  TicketType,
} from "../helpers/Enum.js";
import { FormatEventDateTimeForWebsite } from "../helpers/DateTime.js";
import {
  getFormattedEventDateTimeForTickets,
  FormatEventDateTimeForScannerUser,
} from "../helpers/DateTime.js";
import { findOneArtistDataService } from "./ArtistServices.js";

const createEventService = async (eventData) => {
  try {
    const newEvent = new Event(eventData);
    await newEvent.save();
    return newEvent;
  } catch (error) {
    console.error("Error creating Event:", error);
    throw new Error("Failed to create Event");
  }
};

const findOneEventDataService = async (filterquery) => {
  try {
    const EventData = await Event.findOne(filterquery);
    return EventData;
  } catch (error) {
    console.error("Error finding One Event:", error);
    throw new Error("Failed to Finding One Event");
  }
};

const getEventDataService = async (filterquery) => {
  try {
    const EventsData = await Event.find(filterquery);
    return EventsData;
  } catch (error) {
    console.error("Error finding fetching Event Data:", error);
    throw new Error("Failed to Finding fetching Event Data");
  }
};

const getPaginatedEventsData = async (filterQuery, limit, skip) => {
  try {
    return await Event.find(filterQuery)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);
  } catch (error) {
    console.error("Error in fetching paginated Event Data:", error);
    throw error;
  }
};

const countEvents = async (filterQuery) => {
  try {
    return await Event.countDocuments(filterQuery);
  } catch (error) {
    console.error("Error in counting Event Data:", error);
    throw error;
  }
};

const getEventByIdService = async (event_id) => {
  try {
    const EventData = await Event.findById(event_id);
    return EventData;
  } catch (error) {
    console.error("Error finding fetching Event Data by Id:", error);
    throw new Error("Failed to Finding fetching Event Data by Id");
  }
};

const deleteEventByIdService = async (filterQuery) => {
  try {
    const result = await Event.deleteOne(filterQuery);
    return result;
  } catch (error) {
    console.error("Error deleting Event Data by Id:", error);
    throw new Error("Failed to Deleting Event Data by Id:");
  }
};

const updateEventDataService = async (filterquery, updateQuery) => {
  try {
    const EventData = await Event.findByIdAndUpdate(filterquery, updateQuery);
    return EventData;
  } catch (error) {
    console.error("Error updating Event Data:", error);
    throw new Error("Failed to update Event Data");
  }
};

const getFormattedEventDateTimeByIdService = async (event_id) => {
  try {
    const eventDateTimeFilterQuery = {
      Event_id: event_id,
    };

    let fetchEventDateTimes = await getEventDateTimeDataService(
      eventDateTimeFilterQuery
    );

    const sortedEventDateTime = SortEventDateTime(fetchEventDateTimes);

    const FormatEventDateTime = sortedEventDateTime.map((data) => {
      const FormattedDateTime = getFormattedEventDateTimeForTickets(data);
      return FormattedDateTime;
    });

    return FormatEventDateTime;
  } catch (error) {
    console.error("Error updating Event Data:", error);
    throw new Error("Failed to update Event Data");
  }
};

const getFormattedEventTableData = async (EventsData, eventDateMap) => {
  const updatedEventsDataArray = await Promise.all(
    EventsData.map(async (event) => {
      const eventDateTimeFilterQuery = {
        Event_id: event._id,
      };
      const EventDateTimeData = await getEventDateTimeDataService(
        eventDateTimeFilterQuery
      );
      
      // Use the eventDateMap if provided, otherwise fall back to sorting
      let arrangedEventDateTime;
      if (eventDateMap && eventDateMap[event._id]) {
        // Use the pre-selected best date from eventDateMap
        const bestDateString = eventDateMap[event._id].date;
        const bestDateObj = new Date(bestDateString);
        const bestTimestamp = bestDateObj.getTime();
        
        console.log(`🔍 Filtering event "${event.EventName}" (${event._id})`);
        console.log(`   Best date to select: ${bestDateString} (timestamp: ${bestTimestamp})`);
        console.log(`   Available dates: ${EventDateTimeData.map(dt => dt.EventStartDateTime).join(', ')}`);
        
        // Filter to ONLY include the best date (match by timestamp)
        arrangedEventDateTime = EventDateTimeData.filter(dt => {
          const dtDate = new Date(dt.EventStartDateTime);
          const dtTimestamp = dtDate.getTime();
          const isMatch = dtTimestamp === bestTimestamp;
          console.log(`   Comparing: ${dt.EventStartDateTime} (${dtTimestamp}) === ${bestTimestamp}? ${isMatch}`);
          return isMatch;
        });
        
        console.log(`   ✓ Filtered to ${arrangedEventDateTime.length} date(s)`);
        
        // If exact match not found, try matching by date string
        if (arrangedEventDateTime.length === 0) {
          console.log(`   ⚠️ No timestamp match, trying string match...`);
          arrangedEventDateTime = EventDateTimeData.filter(dt => {
            const isMatch = dt.EventStartDateTime === bestDateString;
            console.log(`   String compare: "${dt.EventStartDateTime}" === "${bestDateString}"? ${isMatch}`);
            return isMatch;
          });
          console.log(`   ✓ String match found ${arrangedEventDateTime.length} date(s)`);
        }
        
        // If still not found, fall back to all dates
        if (arrangedEventDateTime.length === 0) {
          console.log(`   ❌ No match found! Falling back to all dates`);
          arrangedEventDateTime = SortEventDateTime(EventDateTimeData);
        }
      } else {
        // Fall back to sorting by earliest date if no eventDateMap
        arrangedEventDateTime = SortEventDateTime(EventDateTimeData);
      }

      const category_id = event._doc.EventCategories[0]._doc.category_id;
      const VenueEventFlag = event._doc.VenueEventFlag;
      const OnlineEventFlag = event._doc.OnlineEventFlag;
      const VenueToBeAnnounced = event._doc.VenueToBeAnnounced;

      const categoryFilterQuery = {
        _id: category_id,
      };
      const categoryData = await findOneCategoryDataService(
        categoryFilterQuery
      );
      const categoryName = categoryData._doc.Name;

      const EventOrganizersArray = event._doc.EventOrganizers;
      const EventPromotersArray = event._doc.EventPromoter;

      let updatedEventPromotersArraywithNames = [];

      if (EventPromotersArray) {
        updatedEventPromotersArraywithNames = await Promise.all(
          EventPromotersArray.map(async (promoterData) => {
            const { promoter_id } = promoterData;
            const promoterFilterQuery = {
              _id: promoter_id,
            };
            const OrganizerData = await findOnePromoterDataService(
              promoterFilterQuery
            );
            const PromoterName = OrganizerData._doc.Username;
            return {
              promoter_id,
              PromoterName: PromoterName,
            };
          })
        );
      }

      const updatedEventOrganizerArraywithNames = await Promise.all(
        EventOrganizersArray.map(async (organizerData) => {
          const { organizer_id } = organizerData;
          const organizerFilterQuery = {
            _id: organizer_id,
          };
          const OrganizerData = await findOneOrganizerDataService(
            organizerFilterQuery
          );
          const OrganizerName = OrganizerData._doc.Username;
          return {
            organizer_id,
            OrganizerName,
          };
        })
      );

      const isSeasonPassExists = await getEventTicketDataService({
        Event_id: event._id,
        Visibility: {
          $in: [TicketVisiblity.All, TicketVisiblity.AllCustomers],
        },
        TicketType: TicketType.SeasonPass,
        EventTicketStatus: TicketStatus.Enable,
      });

      const updatedEventObj = {
        ...event._doc,
        arrangedEventDateTime,
        categoryName,
        PopUpOrganizerData: updatedEventOrganizerArraywithNames,
        PopUpPromoterData: updatedEventPromotersArraywithNames,
        SeasonPassCount: isSeasonPassExists.length,
      };
      if (VenueEventFlag == 1) {
        const venue_id = event._doc.venue_id;
        const venuefilterQuery = { _id: venue_id };
        const venueData = await findOneVenueDataService(venuefilterQuery);
        const VenueName = venueData._doc.Name;
        const VenueCity = venueData._doc.City;
        updatedEventObj["VenueName"] = VenueName;
        updatedEventObj["VenueCity"] = VenueCity;
      }

      if (OnlineEventFlag == 1) {
        updatedEventObj["VenueName"] = "Online Event";
        updatedEventObj["VenueCity"] = "-";
      }

      if (VenueToBeAnnounced == 1) {
        updatedEventObj["VenueName"] = "To Be Announced";
        updatedEventObj["VenueCity"] = "-";
      }

      return updatedEventObj;
    })
  );
  return updatedEventsDataArray;
};

const getFormattedPromoterEventsCardData = async (EventsData) => {
  const updatedEventsDataArray = await Promise.all(
    EventsData.map(async (event) => {
      const eventDateTimeFilterQuery = {
        Event_id: event._id,
      };
      const EventDateTimeData = await getEventDateTimeDataService(
        eventDateTimeFilterQuery
      );
      const arrangedEventDateTime = SortEventDateTime(EventDateTimeData);

      const category_id = event._doc.EventCategories[0]._doc.category_id;
      const VenueEventFlag = event._doc.VenueEventFlag;
      const OnlineEventFlag = event._doc.OnlineEventFlag;
      const VenueToBeAnnounced = event._doc.VenueToBeAnnounced;

      const categoryFilterQuery = {
        _id: category_id,
      };
      const categoryData = await findOneCategoryDataService(
        categoryFilterQuery
      );
      const categoryName = categoryData._doc.Name;

      const EventOrganizersArray = event._doc.EventOrganizers;
      const EventPromotersArray = event._doc.EventPromoter;

      let updatedEventPromotersArraywithNames = [];

      if (EventPromotersArray) {
        updatedEventPromotersArraywithNames = await Promise.all(
          EventPromotersArray.map(async (promoterData) => {
            const { promoter_id } = promoterData;
            const promoterFilterQuery = {
              _id: promoter_id,
            };
            const OrganizerData = await findOnePromoterDataService(
              promoterFilterQuery
            );
            const PromoterName = OrganizerData._doc.Username;
            return {
              promoter_id,
              PromoterName: PromoterName,
            };
          })
        );
      }

      const updatedEventOrganizerArraywithNames = await Promise.all(
        EventOrganizersArray.map(async (organizerData) => {
          const { organizer_id } = organizerData;
          const organizerFilterQuery = {
            _id: organizer_id,
          };
          const OrganizerData = await findOneOrganizerDataService(
            organizerFilterQuery
          );
          const OrganizerName = OrganizerData._doc.Username;
          return {
            organizer_id,
            OrganizerName,
          };
        })
      );

      const isSeasonPassExists = await getEventTicketDataService({
        Event_id: event._id,
        Visibility: {
          $in: [TicketVisiblity.All, TicketVisiblity.Promoters],
        },
        TicketType: TicketType.SeasonPass,
        EventTicketStatus: TicketStatus.Enable,
      });

      const updatedEventObj = {
        ...event._doc,
        arrangedEventDateTime,
        categoryName,
        PopUpOrganizerData: updatedEventOrganizerArraywithNames,
        PopUpPromoterData: updatedEventPromotersArraywithNames,
        SeasonPassCount: isSeasonPassExists.length,
      };
      if (VenueEventFlag == 1) {
        const venue_id = event._doc.venue_id;
        const venuefilterQuery = { _id: venue_id };
        const venueData = await findOneVenueDataService(venuefilterQuery);
        const VenueName = venueData._doc.Name;
        const VenueCity = venueData._doc.City;
        updatedEventObj["VenueName"] = VenueName;
        updatedEventObj["VenueCity"] = VenueCity;
      }

      if (OnlineEventFlag == 1) {
        updatedEventObj["VenueName"] = "Online Event";
        updatedEventObj["VenueCity"] = "-";
      }

      if (VenueToBeAnnounced == 1) {
        updatedEventObj["VenueName"] = "To Be Announced";
        updatedEventObj["VenueCity"] = "-";
      }

      return updatedEventObj;
    })
  );
  return updatedEventsDataArray;
};

const getFormattedEventCardData = async (EventsData) => {
  // Use Promise.all to process multiple events concurrently
  const updatedEventsDataArray = await Promise.all(
    EventsData.map(async (event) => {
      // Prepare a query to fetch Event DateTime data based on event ID
      const eventDateTimeFilterQuery = {
        Event_id: event._id,
      };

      // Fetch and sort event's date-time data
      const EventDateTimeData = await getEventDateTimeDataService(
        eventDateTimeFilterQuery
      );
      const arrangedEventDateTime = SortEventDateTime(EventDateTimeData);

      const EventStartDateTime = arrangedEventDateTime[0].EventStartDateTime;

      const formattedEventStartDateTime =
        FormatEventDateTimeForWebsite(EventStartDateTime);

      // Prepare a query to fetch available tickets for the event
      const eventTicketsQueryFilter = {
        Event_id: event._id,
        EventTicketStatus: TicketStatus.Enable,
        EventTicketAvailability: TicketAvailability.Available,
        Visibility: {
          $in: [TicketVisiblity.All, TicketVisiblity.AllCustomers],
        },
      };

      // Fetch available event tickets
      const EventTicketsData = await getEventTicketDataService(
        eventTicketsQueryFilter
      );

      let LowestticketPriceObj;

      // Determine the lowest ticket price if there are any available tickets
      if (EventTicketsData.length > 0) {
        LowestticketPriceObj = EventTicketsData.reduce((lowest, ticket) => {
          return ticket.Price < lowest.Price ? ticket : lowest;
        }, EventTicketsData[0]);
      }

      // Extract necessary flags from the event object
      const { VenueEventFlag, OnlineEventFlag, VenueToBeAnnounced } =
        event._doc;

      // Initialize the updated event object with basic details
      const updatedEventObj = {
        event_id: event._id,
        EventName: event._doc.EventName,
        EventStartDate: arrangedEventDateTime[0].EventStartDateTime,
        EventStartDate: formattedEventStartDateTime.date,
        EventStartTime: formattedEventStartDateTime.time,
        EventCardImages: event._doc.EventCarouselImages,
        LowestticketPrice:
          EventTicketsData.length > 0 ? LowestticketPriceObj?.Price : null,
        isFeatured: event._doc.FeaturedEventFlag,
      };

      // Handle venue-related details if the event is a venue-based event
      if (VenueEventFlag == 1) {
        const venuefilterQuery = { _id: event._doc.venue_id };
        const venueData = await findOneVenueDataService(venuefilterQuery);

        // Add venue name and city to the event object
        updatedEventObj["VenueName"] = venueData._doc.Name;
        updatedEventObj["VenueCity"] = venueData._doc.City;
      }

      // Handle online event case
      if (OnlineEventFlag == 1) {
        updatedEventObj["VenueName"] = "Online Event";
        updatedEventObj["VenueCity"] = "-";
      }

      // Handle "Venue To Be Announced" case
      if (VenueToBeAnnounced == 1) {
        updatedEventObj["VenueName"] = "To Be Announced";
        updatedEventObj["VenueCity"] = event._doc.VenueToBeAnnouncedCity;
      }

      return updatedEventObj; // Return the updated event object
    })
  );

  // Return the array of updated event objects after processing all events
  return updatedEventsDataArray;
};

const getformattedEventDataForScannerUser = async (EventsData) => {
  const updatedEventsDataArray = await Promise.all(
    EventsData.map(async (event) => {
      const eventDateTimeFilterQuery = {
        Event_id: event._id,
      };
      const EventDateTimeData = await getEventDateTimeDataService(
        eventDateTimeFilterQuery
      );
      const arrangedEventDateTime = SortEventDateTime(EventDateTimeData);

      const EventStartDateTime = arrangedEventDateTime[0].EventStartDateTime;

      const formattedEventStartDateTime =
        FormatEventDateTimeForScannerUser(EventStartDateTime);

      const updatedEventObj = {
        event_id: event._doc._id,
        EventName: event._doc.EventName,
        EventStartDate: formattedEventStartDateTime.date,
        EventStartTime: formattedEventStartDateTime.time,
      };

      return updatedEventObj;
    })
  );
  return updatedEventsDataArray;
};

const WebsiteCommonEventFilterQuery = {
  EventStatus: EventStatus.Published,
  EventVisibility: EventVisibility.Public,
  EventIsEnableOrDisable: EventEnableDisableStatus.Enable,
};

const formatEventDataforDetailsPage = async (EventData) => {
  const EventId = EventData._doc._id;
  const category_id = EventData._doc.EventCategories[0]._doc.category_id;
  const VenueEventFlag = EventData._doc.VenueEventFlag;
  const OnlineEventFlag = EventData._doc.OnlineEventFlag;
  const VenueToBeAnnounced = EventData._doc.VenueToBeAnnounced;
  const EventsArtistsData = EventData._doc.EventArtist;
  const EventDataType = EventData._doc.EventType;
  const WhatsAppNumber = EventData._doc.WhatsAppPhoneNumber;

  const eventDateTimeFilterQuery = {
    Event_id: EventId,
  };

  const EventDateTimeData = await getEventDateTimeDataService(
    eventDateTimeFilterQuery
  );
  const arrangedEventDateTime = SortEventDateTime(EventDateTimeData);

  const EventStartDateTime = arrangedEventDateTime[0].EventStartDateTime;

  const formattedEventStartDateTime =
    FormatEventDateTimeForWebsite(EventStartDateTime);

  const categoryFilterQuery = {
    _id: category_id,
  };

  const eventTicketsQueryFilter = {
    Event_id: EventId,
    EventTicketStatus: TicketStatus.Enable,
    EventTicketAvailability: TicketAvailability.Available,
    Visibility: {
      $in: [TicketVisiblity.All, TicketVisiblity.AllCustomers],
    },
  };

  const EventTicketsData = await getEventTicketDataService(
    eventTicketsQueryFilter
  );

  let LowestticketPriceObj;

  if (EventTicketsData.length > 0) {
    LowestticketPriceObj = EventTicketsData.reduce((lowest, ticket) => {
      return ticket.Price < lowest.Price ? ticket : lowest;
    }, EventTicketsData[0]);
  }

  const categoryData = await findOneCategoryDataService(categoryFilterQuery);
  const categoryName = categoryData._doc.Name;

  const updatedArtistData = await Promise.all(
    EventsArtistsData.map(async (data) => {
      const { artist_id } = data;
      const artistFilterQuery = {
        _id: artist_id,
      };
      const PromoterData = await findOneArtistDataService(artistFilterQuery);

      const ArtistName = PromoterData._doc.Name;
      const ArtistImage = PromoterData._doc.Images[0].image_path;

      return {
        ArtistName,
        ArtistImage,
      };
    })
  );

  const updatedEventObj = {
    EventCarouselImages: EventData._doc.EventCarouselImages,
    EventName: EventData._doc.EventName,
    Genre: EventData._doc.EventGenre,
    Language: EventData._doc.EventLanguages,
    BestSuitedFor: `${EventData._doc.BestSuitedFor}yrs+`,
    EventStartDate: formattedEventStartDateTime.date,
    EventStartTime: `${formattedEventStartDateTime.time} Onwards`,
    TicketPriceStartsFrom:
      EventTicketsData.length > 0 ? LowestticketPriceObj?.Price : null,
    AboutEvent: EventData._doc.EventDescription,
    EventGalleryImages: EventData._doc.EventGalleryImages,
    EventArtists: updatedArtistData,
    EventFaqs: EventData._doc.EventFAQs,
    EventTermsConditions: EventData._doc.EventTermsCondition,
    categoryName,
    VenueEventFlag,
    OnlineEventFlag,
    VenueToBeAnnounced,
  };

  if (VenueEventFlag == 1) {
    const venue_id = EventData._doc.venue_id;
    const venuefilterQuery = { _id: venue_id };
    const venueData = await findOneVenueDataService(venuefilterQuery);
    const VenueName = venueData._doc.Name;
    const VenueCity = venueData._doc.City;
    const VenueMapLocationLink = venueData._doc.Map_Location;
    updatedEventObj["VenueName"] = VenueName;
    updatedEventObj["VenueCity"] = VenueCity;
    updatedEventObj["VenueMapLocationLink"] = VenueMapLocationLink;
    updatedEventObj["VenueLayout"] = EventData._doc?.Venue_layout_ImagePath;
  }

  if (OnlineEventFlag == 1) {
    updatedEventObj["VenueName"] = "Online Event";
    updatedEventObj["VenueCity"] = "-";
  }

  if (VenueToBeAnnounced == 1) {
    updatedEventObj["VenueName"] = "To Be Announced";
    updatedEventObj["VenueCity"] = "-";
  }

  if (EventDataType == EventType.WhatsApp) {
    updatedEventObj["WhatsAppPhoneNumber"] = WhatsAppNumber;
  }

  return updatedEventObj;
};

export {
  createEventService,
  findOneEventDataService,
  getEventDataService,
  getPaginatedEventsData,
  countEvents,
  getEventByIdService,
  deleteEventByIdService,
  updateEventDataService,
  getFormattedEventDateTimeByIdService,
  getFormattedEventTableData,
  getFormattedPromoterEventsCardData,
  getFormattedEventCardData,
  getformattedEventDataForScannerUser,
  WebsiteCommonEventFilterQuery,
  formatEventDataforDetailsPage,
};
