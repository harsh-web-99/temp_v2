import moment from "moment-timezone";
const timezone = "Asia/Calcutta";

const getCurrentDateTime = () => {
  const timeInZone = moment().tz(timezone);
  const CurrentDateTime = timeInZone.format("DD-MM-YYYY HH:mm:ss");
  return CurrentDateTime;
};

export default getCurrentDateTime;
