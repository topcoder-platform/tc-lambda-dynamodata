const AWS = require("aws-sdk");

const mapDate = (dateString) =>
  dateString != null ? new Date(dateString).getTime() : "";

function fixJson(obj, field) {
  if (obj[field] != null) {
    if (obj[field].wrapperName === "Set") {
      obj[field] = obj[field].values.map((v) => JSON.parse(v));
    } else {
      obj[field] = JSON.parse(obj[field]);
    }
  }
}

const jsonFields = [
  "legacy",
  "task",
  "overview",
  "phases",
  "events",
  "winners",
  "terms",
  "metadata",
  "prizeSets",
  "tags",
  "billing",
];

const mappedChallenge = (challenge) => {
  for (const field of jsonFields) {
    fixJson(challenge, field);
  }
  return challenge;
};

module.exports = {
  map: mappedChallenge,
};
