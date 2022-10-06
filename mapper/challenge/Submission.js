const mapSubmission = (submission) => {
  if (typeof submission.challengeId === "number") {
    // This is a legacy submission, we need to convert the challengeId to a string
    submission.challengeId = String(submission.challengeId);
  }
  if (typeof submission.submissionPhaseId === "number") {
    // This is a legacy submission, we need to convert the submissionPhaseId to a string
    submission.submissionPhaseId = String(submission.submissionPhaseId);
  }
  return submission;
};

module.exports = {
  map: mapSubmission,
};
