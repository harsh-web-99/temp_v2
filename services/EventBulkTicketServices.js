import { BulkTickets } from "../models/AllModels.js";

const createEventBulkTicketsService = async (bulkTicketsData) => {
  try {
    const newBulkTickets = await BulkTickets.insertMany(bulkTicketsData);
    return newBulkTickets;
  } catch (error) {
    console.error("Error creating BulkTickets:", error);
    throw new Error("Failed to create BulkTickets");
  }
};

const findOneEventBulkTicketsDataService = async (filterquery) => {
  try {
    const BulkTicketsData = await BulkTickets.findOne(filterquery);
    return BulkTicketsData;
  } catch (error) {
    console.error("Error finding One BulkTickets:", error);
    throw new Error("Failed to Finding One BulkTickets");
  }
};

const getEventBulkTicketsDataService = async (filterquery) => {
  try {
    const eventBulkTicketsData = await BulkTickets.find(filterquery);
    return eventBulkTicketsData;
  } catch (error) {
    console.error("Error finding fetching eventBulkTickets Data:", error);
    throw new Error("Failed to Finding fetching eventBulkTickets Data");
  }
};

const getEventBulkTicketsByIdService = async (genre_id) => {
  try {
    const promoterData = await BulkTickets.findById(genre_id);
    return promoterData;
  } catch (error) {
    console.error("Error finding fetching Promoter Data by Id:", error);
    throw new Error("Failed to Finding fetching Promoter Data by Id");
  }
};

const updateEventBulkTicketsDataService = async (filterquery, updateQuery) => {
  try {
    const promoterData = await BulkTickets.findByIdAndUpdate(
      filterquery,
      updateQuery
    );
    return promoterData;
  } catch (error) {
    console.error("Error updating Promoter Data:", error);
    throw new Error("Failed to update Promoter Data");
  }
};

const deleteEventBulkTicketsByIdService = async (filterQuery) => {
  try {
    const result = await BulkTickets.deleteOne(filterQuery);
    return result;
  } catch (error) {
    console.error("Error deleting Promoter Data by Id:", error);
    throw new Error("Failed to Deleting Promoter Data by Id:");
  }
};

const bulkUpdateBulkTicketsService = async (filterquery, updateData) => {
  try {
    const result = await BulkTickets.updateMany(filterquery, {
      $set: updateData,
    });
    console.log(`${result.nModified} documents were updated.`);
    return result;
  } catch (error) {
    console.error("Error updating BulkTickets:", error);
    throw new Error("Failed to update BulkTickets");
  }
};

const getPaginatedBulkTicketsData = async (filterQuery, limit, skip) => {
  try {
    return await BulkTickets.find(filterQuery).limit(limit).skip(skip);
  } catch (error) {
    console.error("Error in fetching paginated BulkTickets Data:", error);
    throw error;
  }
};

const countBulkTickets = async (filterQuery) => {
  try {
    return await BulkTickets.countDocuments(filterQuery);
  } catch (error) {
    console.error("Error in counting BulkTickets Data:", error);
    throw error;
  }
};

export {
  createEventBulkTicketsService,
  findOneEventBulkTicketsDataService,
  getEventBulkTicketsDataService,
  bulkUpdateBulkTicketsService,
  getPaginatedBulkTicketsData,
  countBulkTickets,
};
