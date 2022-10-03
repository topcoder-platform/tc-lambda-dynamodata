const { snakeCase } = require("change-case");
const { DynamoDB, S3 } = require("aws-sdk");

const parquet = require("parquetjs");
const Promise = require("bluebird");
const fs = require("fs");

const challengeMapper = require("./mapper/challenge/Challenge");
const challengeSchema = require("./schema/challenge/challenge");

const docClient = new DynamoDB.DocumentClient({
  apiVersion: "2012-08-10",
  sslEnabled: false,
  paramValidation: false,
  convertResponseTypes: true,
});

const s3Client = new S3();

const dwOutputBucket = process.env.DW_OUTPUT_BUCKET || "tc-dw-dev-dw-raw";
const pathPrefix = process.env.PATH_PREFIX || "./files";

const mapItem = (tableName, item) => {
  switch (tableName) {
    case "challenge":
      return challengeMapper.map(item);
    default:
      return item;
  }
};

const getPartitionKey = (date) => {
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
};

exports.fetchAll = async function main(event, context) {
  const TableName = event.tableName;
  const Limit = event.limit || 2000;
  const OutputBucketPathPrefix = event.outputBucketPathPrefix || "Member";
  const NumRecordsToProcess = event.numRecordsToProcess || 10000;
  const Concurrency = event.concurrency | 5;

  let params = { TableName, Limit };

  if (event.exclusiveStartKey != null) {
    params.ExclusiveStartKey = event.exclusiveStartKey;
  }

  let items;
  let totalCount = 0;

  const tableName = snakeCase(TableName);

  do {
    items = await docClient.scan(params).promise();
    params.ExclusiveStartKey = items.LastEvaluatedKey;

    await Promise.map(
      items.Items,
      async (item) => {
        // save as parquet file
        const mappedItem = mapItem(tableName, item);

        const updatedAt = new Date(item.updated);
        const partitionKey = getPartitionKey(updatedAt);

        await fs.promises.mkdir(pathPrefix + "/" + partitionKey, {
          recursive: true,
        });
        totalCount++;
        const filePath = `${pathPrefix}/${partitionKey}/challenge-${mappedItem.id}}.parquet`;
        const writer = await parquet.ParquetWriter.openFile(
          challengeSchema,
          filePath
        );

        await writer.appendRow(mappedItem);
        await writer.close();

        // read file as blob
        const blob = await fs.promises.readFile(filePath);

        // upload blob to s3
        const Key = `${OutputBucketPathPrefix}/${tableName}/${partitionKey}/challenge-${mappedItem.id}}.parquet`;
        console.log("Uploading item number: ", totalCount, " to s3", Key);
        const s3Params = {
          Bucket: dwOutputBucket,
          Key,
          Body: blob,
        };
        return s3Client.upload(s3Params).promise();
      },
      { concurrency: Concurrency }
    ).then((results) => {
      console.log("Results", results);
      // const failed = results.filter((result) => !result).length;
      // console.log("Failed", failed);
      console.log("totalCount", totalCount);
    });
  } while (
    typeof items.LastEvaluatedKey != "undefined" &&
    totalCount < NumRecordsToProcess
  );

  console.log(`Uploaded ${totalCount} items from ${TableName} table`);

  if (typeof items.LastEvaluatedKey != "undefined") {
    console.log("items.LastEvaluatedKey", items.LastEvaluatedKey);
    console.log("Theres more items to process. Invoking lambda again");

    const newEvent = {
      ...event,
      exclusiveStartKey: items.LastEvaluatedKey,
    };

    console.log("newEvent", newEvent);

    const lambda = new AWS.Lambda();
    const lambdaParams = {
      FunctionName: context.functionName,
      InvocationType: "Event",
      Payload: JSON.stringify(newEvent),
    };
    // await lambda.invoke(lambdaParams).promise();
  }

  context.succeed();
};
