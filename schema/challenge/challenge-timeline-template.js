const parquet = require("parquetjs");

const schema = new parquet.ParquetSchema({
  id: { type: "UTF8" },
  isDefault: { type: "BOOLEAN" },
  timelineTemplateId: { type: "UTF8" },
  trackId: { type: "UTF8" },
  typeId: { type: "UTF8" },
});

module.exports = schema;
