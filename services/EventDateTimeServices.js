import { EventDateTimeModel } from "../models/AllModels.js";
import { getAsiaCalcuttaCurrentDateTimeinIsoFormat } from "../helpers/DateTime.js";

const insertEventDateTimeService = async (EventDateTimeData) => {
  try {
    const newEventDateTime = new EventDateTimeModel(EventDateTimeData);
    await newEventDateTime.save();
    return newEventDateTime;
  } catch (error) {
    console.error("Error inserting Event Date Time:", error);
    throw new Error("Failed to insert Event Date Time");
  }
};

const insertManyEventDateTimeService = async (EventDateTimeData) => {
  try {
    const newEventDateTime = await EventDateTimeModel.insertMany(
      EventDateTimeData
    );
    return newEventDateTime;
  } catch (error) {
    console.error("Error creating EventDateTime Tag:", error);
    throw new Error("Failed to create EventDateTime Tag");
  }
};

const findOneEventDateTimeDataService = async (filterquery) => {
  try {
    const EventDateTimeData = await EventDateTimeModel.findOne(filterquery);
    return EventDateTimeData;
  } catch (error) {
    console.error("Error finding One EventDateTime Data:", error);
    throw new Error("Failed to Finding One EventDateTime Data");
  }
};

const getEventDateTimeDataService = async (filterquery) => {
  try {
    const EventDateTimeData = await EventDateTimeModel.find(filterquery);
    return EventDateTimeData;
  } catch (error) {
    console.error("Error finding fetching EventDateTime Data:", error);
    throw new Error("Failed to Finding fetching EventDateTime Data");
  }
};

const getEventDateTimeByIdService = async (eventDateTime_id) => {
  try {
    const EventDateTimeData = await EventDateTimeModel.findById(
      eventDateTime_id
    );
    return EventDateTimeData;
  } catch (error) {
    console.error("Error finding fetching EventDateTime Data by Id:", error);
    throw new Error("Failed to Finding fetching EventDateTime Data by Id");
  }
};

const deleteEventDateTimeByIdService = async (filterQuery) => {
  try {
    const result = await EventDateTimeModel.deleteOne(filterQuery);
    return result;
  } catch (error) {
    console.error("Error deleting EventDateTime Data by Id:", error);
    throw new Error("Failed to Deleting EventDateTime Data by Id:");
  }
};

const updateEventDateTimeDataService = async (filterquery, updateQuery) => {
  try {
    const EventDateTimeData = await EventDateTimeModel.findByIdAndUpdate(
      filterquery,
      updateQuery
    );
    return EventDateTimeData;
  } catch (error) {
    console.error("Error updating EventDateTime Data:", error);
    throw new Error("Failed to update EventDateTime Data");
  }
};

const SortEventDateTime = (EventDateTimeObj) => {
  try {
    const SortedEventDateTime = EventDateTimeObj.sort(
      (a, b) => new Date(a.EventStartDateTime) - new Date(b.EventStartDateTime)
    );
    return SortedEventDateTime;
  } catch (error) {
    console.error("Error Sorting EventDateTime Data:", error);
    throw new Error("Failed to Sorting EventDateTime Data");
  }
};

const getUpcomingEventIds = async () => {
  try {
    const currentDateTime = getAsiaCalcuttaCurrentDateTimeinIsoFormat();

    const EventDateTimeFilterQuery = {
      EventStartDateTime: { $gte: currentDateTime },
    };

    const EventDateTimeData = await getEventDateTimeDataService(
      EventDateTimeFilterQuery
    );

    if (EventDateTimeData.length == 0) {
      return { ids: [], error: "No Featured Events Found" };
    }

    // Use Set to remove duplicates
    const uniqueEventIds = [
      ...new Set(EventDateTimeData.map((data) => data.Event_id)),
    ];

    return { ids: uniqueEventIds, error: null };
  } catch (error) {
    console.error("Error fetching upcoming event IDs:", error.message);
    throw new Error("Internal Server Error");
  }
};

const getPaginatedEventDateTimeData = async (filterQuery, limit, skip) => {
  try {
    return await EventDateTimeModel.find(filterQuery).limit(limit).skip(skip);
  } catch (error) {
    console.error(
      "Error in fetching paginated EventDateTimeModel Data:",
      error
    );
    throw error;
  }
};

const countEventDateTime = async (filterQuery) => {
  try {
    return await EventDateTimeModel.countDocuments(filterQuery);
  } catch (error) {
    console.error("Error in counting EventDateTimeModel Data:", error);
    throw error;
  }
};

export {
  insertEventDateTimeService,
  insertManyEventDateTimeService,
  findOneEventDateTimeDataService,
  getEventDateTimeDataService,
  getEventDateTimeByIdService,
  deleteEventDateTimeByIdService,
  updateEventDateTimeDataService,
  SortEventDateTime,
  getUpcomingEventIds,
  getPaginatedEventDateTimeData,
  countEventDateTime,
};
