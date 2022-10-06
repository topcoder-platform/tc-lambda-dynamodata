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

  if (challenge.task != null && challenge.task.memberId == null) {
    delete challenge.task.memberId; // bug in source system that results in null value
  }

  return challenge;
};

module.exports = {
  map: mappedChallenge,
};
