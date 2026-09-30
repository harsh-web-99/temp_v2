import { Customer } from "../models/AllModels.js";

const registerCustomerService = async (customerData) => {
  try {
    const newCustomer = new Customer(customerData);
    await newCustomer.save();
    return newCustomer;
  } catch (error) {
    console.error("Error registering Customer:", error);
    throw new Error("Failed to registering Customer");
  }
};

const findOneCustomerDataService = async (filterquery) => {
  try {
    const CustomerData = await Customer.findOne(filterquery);
    return CustomerData;
  } catch (error) {
    console.error("Error finding One Customer:", error);
    throw new Error("Failed to Finding One Customer");
  }
};

const getCustomerDataService = async (filterquery) => {
  try {
    const CustomerData = await Customer.find(filterquery);
    return CustomerData;
  } catch (error) {
    console.error("Error finding fetching Customer Data:", error);
    throw new Error("Failed to Finding fetching Customer Data");
  }
};

const getCustomerByIdService = async (customer_id) => {
  try {
    const superAdminData = await Customer.findById(customer_id);
    return superAdminData;
  } catch (error) {
    console.error("Error finding fetching CustomerData Data by Id:", error);
    throw new Error("Failed to Finding fetching CustomerData Data by Id");
  }
};

const updateCustomerDataService = async (filterquery, updateQuery) => {
  try {
    const CustomerData = await Customer.findByIdAndUpdate(
      filterquery,
      updateQuery
    );
    return CustomerData;
  } catch (error) {
    console.error("Error updating Customer Data:", error);
    throw new Error("Failed to update Customer Data");
  }
};

const getPaginatedCustomerData = async (filterQuery, limit, skip) => {
  try {
    return await Customer.find(filterQuery)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);
  } catch (error) {
    console.error("Error in fetching paginated Customer Data:", error);
    throw error;
  }
};

const countCustomer = async (filterQuery) => {
  try {
    return await Customer.countDocuments(filterQuery);
  } catch (error) {
    console.error("Error in counting Customer Data:", error);
    throw error;
  }
};

export {
  registerCustomerService,
  findOneCustomerDataService,
  getCustomerDataService,
  getCustomerByIdService,
  updateCustomerDataService,
  getPaginatedCustomerData,
  countCustomer,
};
