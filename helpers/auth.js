import jwt from "jsonwebtoken";

const generateAuthToken = (payload) => {
  const token = jwt.sign(payload, process.env.JWT_PRIVATE_KEY);
  return token;
};

export default generateAuthToken;
