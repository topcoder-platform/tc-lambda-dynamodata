const parquet = require("parquetjs");

const phaseFields = {
  id: { type: "UTF8", optional: true },
  name: { type: "UTF8", optional: true },
  phaseId: { type: "UTF8", optional: true },
  isOpen: { type: "BOOLEAN", optional: true },
  duration: { type: "UINT_32", optional: true },
  scheduledEndDate: { type: "TIMESTAMP_MILLIS", optional: true },
  actualEndDate: { type: "TIMESTAMP_MILLIS", optional: true },
  actualStartDate: { type: "TIMESTAMP_MILLIS", optional: true },
  scheduledStartDate: { type: "TIMESTAMP_MILLIS", optional: true },
};

const schema = new parquet.ParquetSchema({
  id: { type: "UTF8" },
  legacyId: {
    optional: true,
    type: "INT64",
  },
  typeId: {
    type: "UTF8",
  },
  trackId: {
    type: "UTF8",
  },
  legacy: {
    optional: true,
    repeated: false,
    fields: {
      track: { type: "UTF8", optional: true },
      subTrack: { type: "UTF8", optional: true },
      isTask: { type: "BOOLEAN", optional: true },
      pureV5Task: { type: "BOOLEAN", optional: true }, // TODO: Reload historical challenge data
      reviewType: { type: "UTF8", optional: true },
      confidentialityType: { type: "UTF8", optional: true },
      directProjectId: { type: "INT64", optional: true },
      forumId: { type: "INT64", optional: true },
      screeningScorecardId: { type: "INT64", optional: true },
      reviewScorecardId: { type: "INT64", optional: true },
      migration: { type: "INT64", optional: true },
    },
  },
  billing: {
    optional: true,
    repeated: false,
    fields: {
      billingAccountId: { type: "INT32", optional: true },
      markup: { type: "DOUBLE", optional: true },
    },
  },
  name: { type: "UTF8" },
  description: { type: "UTF8", optional: true },
  privateDescription: { type: "UTF8", optional: true },
  descriptionFormat: { type: "UTF8" },
  metadata: {
    optional: true,
    repeated: true,
    fields: {
      name: { type: "UTF8", optional: true },
      value: { type: "UTF8", optional: true },
    },
  },
  task: {
    optional: true,
    repeated: false,
    fields: {
      isAssigned: { type: "BOOLEAN" },
      isTask: { type: "BOOLEAN" },
      memberId: { type: "INT64", optional: true },
    },
  },
  timelineTemplateId: { type: "UTF8", optional: true },
  phases: {
    repeated: true,
    optional: true,
    fields: phaseFields,
  },
  events: {
    repeated: true,
    fields: {
      name: { type: "UTF8", optional: true },
      id: { type: "UINT_32", optional: true },
      key: { type: "UTF8", optional: true },
    },
  },
  terms: {
    repeated: true,
    optional: true,
    fields: {
      id: { type: "UTF8", optional: true },
      roleId: { type: "UTF8", optional: true },
    },
  },
  prizeSets: {
    repeated: true,
    optional: true,
    fields: {
      prizes: {
        repeated: true,
        fields: {
          type: { type: "UTF8", optional: true },
          value: { type: "DOUBLE", optional: true },
        },
      },
    },
  },
  tags: {
    optional: true,
    repeated: true,
    type: "UTF8",
  },
  projectId: { type: "INT64", optional: true },
  startDate: { type: "TIMESTAMP_MILLIS", optional: true },
  endDate: { type: "TIMESTAMP_MILLIS", optional: true },
  status: {
    type: "UTF8",
  },
  attachments: {
    optional: true,
    type: "UTF8",
  },
  groups: {
    repeated: true,
    optional: true,
    type: "UTF8",
  },
  winners: {
    repeated: true,
    optional: true,
    fields: {
      handle: { type: "UTF8", optional: true },
      placement: { type: "UINT_32", optional: true },
    },
  },
  discussions: {
    repeated: true,
    optional: true,
    fields: {
      provider: { type: "UTF8", optional: true },
      name: { type: "UTF8", optional: true },
      id: { type: "UTF8", optional: true },
      type: { type: "UTF8", optional: true },
      url: { type: "UTF8", optional: true },
    },
  },
  overview: {
    optional: true,
    fields: {
      totalPrizes: { type: "INT64", optional: true },
    },
  },
  created: { type: "TIMESTAMP_MILLIS", optional: true },
  createdBy: { type: "UTF8", optional: true },
  updated: { type: "TIMESTAMP_MILLIS", optional: true },
  updatedBy: { type: "UTF8", optional: true },
});

module.exports = schema;
