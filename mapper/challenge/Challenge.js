const moment = require("moment");

function fixJson(obj, field) {
  if (obj[field] != null) {
    if (obj[field].wrapperName === "Set") {
      obj[field] = obj[field].values.map((v) => JSON.parse(v));
      if (obj[field] == null) {
        obj[field] = [];
      }
    } else {
      obj[field] = JSON.parse(obj[field]);
    }

    if (field === "prizeSets" && obj["prizeSets"] != null) {
      obj.prizeSets = obj.prizeSets.flatMap((x) =>
        x.prizes.map((y, index) => ({
          type: x.type,
          currency: y.type,
          value: y.value,
          position: index + 1,
        }))
      );
    }

    if (field === "tags" && !Array.isArray(obj[field])) {
      obj[field] = [obj[field]];
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

  if (challenge.task != null) {
    if (challenge.task.memberId == null) {
      delete challenge.task.memberId; // bug in source system that results in null value
    }
    if (challenge.task.isTask == null) {
      delete challenge.task.isTask; // bug in source system that results in null value
    }
  }
  challenge.updated = +moment(challenge.updated).format("x");
  challenge.created = +moment(challenge.created).format("x");

  return challenge;
};

module.exports = {
  map: mappedChallenge,
};
