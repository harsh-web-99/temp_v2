import dotenv from "dotenv";
dotenv.config();
import jwt from "jsonwebtoken";
import jwt_decode from "jwt-decode";
import { decrypt } from "../helpers/encryptionUtils.js";
import { AccessLevel } from "../helpers/Enum.js";

const AdminMiddleware = async (req, res, next) => {
  try {
    console.log("AdminMiddleware  Called");

    const headerToken = req.headers.authorization;
    const token =
      req.body.token || req.query.token || req.params.token || headerToken;
    if (!token) return res.status(401).send("Access denied. No token provided");

    const DecryptedToken = await decrypt(token);

    let DecodedToken = await jwt_decode(DecryptedToken);

    const TokenPayloadData = DecodedToken.payload;

    if (TokenPayloadData.userRole == AccessLevel.Admin) {
      const decoded = jwt.verify(DecryptedToken, process.env.JWT_PRIVATE_KEY);
      req.user = decoded;
      next();
    } else {
      res.status(400).send("Invalid token");
    }
  } catch (err) {
    console.log(err);
    res.status(400).send("Invalid token");
  }
};

const UserMiddleware = async (req, res, next) => {
  try {
    console.log("UserMiddleware  Called");
    SkiplinesAfterLogs();

    const headerToken = req.headers.authorization;
    const token =
      req.body.token || req.query.token || req.params.token || headerToken;
    if (!token) return res.status(401).send("Access denied. No token provided");

    const DecryptedToken = await decrypt(token);

    let DecodedToken = await jwt_decode(DecryptedToken);

    const TokenPayloadData = DecodedToken.payload;

    if (TokenPayloadData.userRole == AccessLevel.Customer) {
      const decoded = jwt.verify(DecryptedToken, process.env.JWT_PRIVATE_KEY);
      req.user = decoded;
      next();
    } else {
      res.status(400).send("Invalid token");
    }
  } catch (err) {
    console.log(err);
    res.status(400).send("Invalid token");
  }
};

const CommonMiddleware = async (req, res, next) => {
  try {
    console.log("CommonMiddleware  Called");

    const headerToken = req.headers.authorization;
    const token =
      req.body.token || req.query.token || req.params.token || headerToken;
    if (!token) return res.status(401).send("Access denied. No token provided");

    const DecryptedToken = await decrypt(token);

    const decoded = jwt.verify(DecryptedToken, process.env.JWT_PRIVATE_KEY);
    req.user = decoded;
    next();
  } catch (err) {
    console.log(err);
    res.status(400).send("Invalid token");
  }
};

module.exports = { AdminMiddleware, UserMiddleware, CommonMiddleware };
