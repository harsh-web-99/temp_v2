import { EventTour } from "../models/AllModels.js";

const createEventTourService = async (eventTourData) => {
  try {
    const newEventTour = new EventTour(eventTourData);
    await newEventTour.save();
    return newEventTour;
  } catch (error) {
    console.error("Error creating EventTour:", error);
    throw new Error("Failed to create EventTour");
  }
};

const findOneEventTourDataService = async (filterquery) => {
  try {
    const eventTourData = await EventTour.findOne(filterquery);
    return eventTourData;
  } catch (error) {
    console.error("Error finding One EventTour:", error);
    throw new Error("Failed to Finding One EventTour");
  }
};

const getEventTourDataService = async (filterquery) => {
  try {
    const EventTourData = await EventTour.find(filterquery);
    return EventTourData;
  } catch (error) {
    console.error("Error finding fetching EventTour Data:", error);
    throw new Error("Failed to Finding fetching EventTour Data");
  }
};

const getEventTourByIdService = async (eventTour_id) => {
  try {
    const EventTourData = await EventTour.findById(eventTour_id);
    return EventTourData;
  } catch (error) {
    console.error("Error finding fetching EventTour Data by Id:", error);
    throw new Error("Failed to Finding fetching EventTour Data by Id");
  }
};

const deleteEventTourByIdService = async (filterQuery) => {
  try {
    const result = await EventTour.deleteOne(filterQuery);
    return result;
  } catch (error) {
    console.error("Error deleting EventTour Data by Id:", error);
    throw new Error("Failed to Deleting EventTour Data by Id:");
  }
};

const updateEventTourDataService = async (filterquery, updateQuery) => {
  try {
    const EventTourData = await EventTour.findByIdAndUpdate(
      filterquery,
      updateQuery
    );
    return EventTourData;
  } catch (error) {
    console.error("Error updating EventTour Data:", error);
    throw new Error("Failed to update EventTour Data");
  }
};

const getPaginatedEventToursData = async (filterQuery, limit, skip) => {
  try {
    return await EventTour.find(filterQuery).limit(limit).skip(skip);
  } catch (error) {
    console.error("Error in fetching paginated EventTour Data:", error);
    throw error;
  }
};

const countEventTours = async (filterQuery) => {
  try {
    return await EventTour.countDocuments(filterQuery);
  } catch (error) {
    console.error("Error in counting EventTour Data:", error);
    throw error;
  }
};

export {
  createEventTourService,
  findOneEventTourDataService,
  getEventTourDataService,
  getEventTourByIdService,
  deleteEventTourByIdService,
  updateEventTourDataService,
  getPaginatedEventToursData,
  countEventTours,
};
