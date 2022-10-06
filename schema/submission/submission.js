const parquet = require("parquetjs");

const schema = new parquet.ParquetSchema({
  id: { type: "UTF8" },
  challengeId: { type: "UTF8" },
  created: { type: "TIMESTAMP_MILLIS" },
  createdBy: { type: "UTF8" },
  fileType: { type: "UTF8" },
  legacyChallengeId: { type: "INT64", optional: true },
  legacySubmissionId: { type: "INT64", optional: true },
  memberId: { type: "INT64" },
  submissionPhaseId: { type: "UTF8", optional: true },
  submittedDate: { type: "TIMESTAMP_MILLIS", optional: true },
  type: { type: "UTF8" },
  updated: { type: "TIMESTAMP_MILLIS", optional: true },
  updatedBy: { type: "UTF8", optional: true },
  url: { type: "UTF8", optional: true },
});

module.exports = schema;
