const sendResponse = (res, statusCode, error, message, data = null) => {
  const response = {
    error,
    message,
    data,
  };

  return res.status(statusCode).json(response);
};

export default sendResponse;
