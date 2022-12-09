const moment = require("moment");
const mapSubmission = (submission) => {
  if (typeof submission.challengeId === "number") {
    // This is a legacy submission, we need to convert the challengeId to a string
    submission.challengeId = String(submission.challengeId);
  }
  if (typeof submission.submissionPhaseId === "number") {
    // This is a legacy submission, we need to convert the submissionPhaseId to a string
    submission.submissionPhaseId = String(submission.submissionPhaseId);
  }
  submission.updated = +moment(submission.updated).format('x');
  submission.created = +moment(submission.created).format('x');
  return submission;
};

module.exports = {
  map: mapSubmission,
};
