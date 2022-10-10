const parquet = require("parquetjs");

const schema = new parquet.ParquetSchema({
  id: { type: "UTF8" },
  abbreviation: { type: "UTF8" },
  isActive: { type: "BOOLEAN" },
  name: { type: "UTF8" },
});

module.exports = schema;
