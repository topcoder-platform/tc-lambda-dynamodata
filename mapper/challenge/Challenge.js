const { pascalCase } = require("change-case");
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
      obj[field] = [`${obj[field]}`];
    }
    if (field === "tags" && Array.isArray(obj[field]) && obj[field][0] === null) {
      obj[field] = []
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
    } else {
      try {
        challenge.task.memberId = parseInt(challenge.task.memberId);
      } catch (e) { }
      if (isNaN(challenge.task.memberId)) {
        delete challenge.task.memberId; // bug in source system that results in null value
      }
    }
    if (challenge.task.isTask == null) {
      delete challenge.task.isTask; // bug in source system that results in null value
    }
  }
  challenge.metadata = challenge.metadata ? challenge.metadata.map(item => ({
    name: item.name,
    value: `${item.value}`,
  })) : []
  challenge.updated = +moment(challenge.updated).format("x");
  challenge.created = +moment(challenge.created).format("x");
  challenge.phases = challenge.phases.map((phase) => {
    phase.scheduledStartDate = +moment(phase.scheduledStartDate).format("x");
    phase.scheduledEndDate = +moment(phase.scheduledEndDate).format("x");
    phase.actualStartDate = +moment(phase.actualStartDate ? phase.actualStartDate : phase.scheduledStartDate).format("x");
    phase.actualEndDate = +moment(phase.actualEndDate ? phase.actualEndDate : phase.scheduledEndDate).format("x");
    if (phase.duration > 2147483647) {
      phase.duration = 2147483647;
    }
    if (isNaN(phase.scheduledEndDate) || isNaN(phase.scheduledStartDate)
      || isNaN(phase.actualEndDate) || isNaN(phase.actualStartDate)) {
      console.log(challenge)
      throw new Error(`Invalid date for challenge ${challenge.id} phase ${phase.id}`);
    }
    return phase;
  });
  if (!challenge.name) {
    challenge.name = ''
  }
  return challenge;
};

module.exports = {
  map: mappedChallenge,
};
