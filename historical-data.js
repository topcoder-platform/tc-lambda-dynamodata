const { snakeCase } = require("change-case");
const { DynamoDB } = require("aws-sdk");
const { saveToS3Promise } = require("./handler");

const Promise = require("bluebird");

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
  if (event.exclusiveStartKey != null) {
    params.ExclusiveStartKey = event.exclusiveStartKey;
  }

  let items;
  let totalCount = 0;

  const tableName = snakeCase(TableName);

  do {
    items = await docClient.scan(params).promise();
    params.ExclusiveStartKey = items.LastEvaluatedKey;

    console.log("Last evaluated key", items.LastEvaluatedKey);

    await Promise.map(
      items.Items,
      (item) =>
        saveToS3Promise(
          { dynamodb: item, tableName },
          dwOutputBucket,
          dwOutputBucketPathPrefix
        ),
      { concurrency: 500 }
    ).then((results) => {
      const failed = results.filter((result) => !result).length;
      console.log("Failed", failed);
      totalCount += results.length;
      console.log("totalCount", totalCount);
    });
  } while (typeof items.LastEvaluatedKey != "undefined");

  console.log(`Uploaded ${totalCount} items from ${TableName} table`);

  context.succeed();
};
