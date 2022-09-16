const { snakeCase } = require("change-case");
const { DynamoDB } = require("aws-sdk");
const { saveToS3Promise } = require("./handler");

const docClient = new DynamoDB.DocumentClient({
  apiVersion: "2012-08-10",
  sslEnabled: false,
  paramValidation: false,
  convertResponseTypes: false,
});

const dwOutputBucket = process.env.DW_OUTPUT_BUCKET || "tc-dw-dev-dw-raw";
const dwOutputBucketPathPrefix =
  process.env.DW_OUTPUT_BUCKET_PATH_PREFIX || "Member";

exports.fetchAll = async function main(event, context) {
  const TableName = event.tableName;

  let params = { TableName: TableName, Limit: 2000 };
  let items;
  let totalCount = 0;

  const tableName = snakeCase(TableName);

  do {
    items = await docClient.scan(params).promise();
    params.ExclusiveStartKey = items.LastEvaluatedKey;

    for (const item of items.Items) {
      const result = await saveToS3Promise(
        { dynamodb: item, tableName },
        dwOutputBucket,
        dwOutputBucketPathPrefix
      );
      totalCount++;
      console.log("Record number", totalCount, " result -> ", result);
    }
  } while (typeof items.LastEvaluatedKey != "undefined");

  console.log(`Uploaded ${totalCount} items from ${TableName} table`);

  context.succeed();
};
