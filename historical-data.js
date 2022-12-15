const { snakeCase } = require("change-case");
const { DynamoDB, S3 } = require("aws-sdk");

const parquet = require("parquetjs");
const Promise = require("bluebird");
const fs = require("fs");

const challengeMapper = require("./mapper/challenge/Challenge");

const challengeSchema = require("./schema/challenge/challenge");
const challengeTrackSchema = require("./schema/challenge/challenge-track");
const challengeTypeSchema = require("./schema/challenge/challenge-type");
const challengeTimelineTemplateSchema = require("./schema/challenge/challenge-timeline-template");
const resource = require("./schema/challenge/resource");
const resourceRole = require("./schema/challenge/resource-role");

const submissionMapper = require("./mapper/challenge/Submission");
const submissionSchema = require("./schema/submission/submission");

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
  if (tableName === "challenge") {
    return challengeMapper.map(item);
  }

  if (tableName === "submission") {
    return submissionMapper.map(item);
  }

  return item;
};

const getSchemaName = (table) => {
  if (table === "challenge") {
    return challengeSchema;
  } else if (table === "submission") {
    return submissionSchema;
  } else if (table === "challenge_track") {
    return challengeTrackSchema;
  } else if (table === "challenge_type") {
    return challengeTypeSchema;
  } else if (table === "challenge_timeline_template") {
    return challengeTimelineTemplateSchema;
  } else if (table === "resource") {
    return resource;
  } else if (table === "resource_role") {
    return resourceRole;
  }

  return null;
};

const getPartitionKey = (date) => {
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
};

exports.fetchAll = async function main(event, context) {
  const TableName = event.tableName;
  const Limit = event.limit || 2000;
  const OutputBucketPathPrefix = event.outputBucketPathPrefix || "Challenge";
  // const NumRecordsToProcess = event.numRecordsToProcess || 10000;
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

    console.log(`Fetched ${items.Items.length} items`);
    console.log(`LastEvaluatedKey:`, items.LastEvaluatedKey);

    await Promise.map(
      items.Items,
      async (item) => {
        // save as parquet file
        const mappedItem = mapItem(tableName, item);

        const updatedAt =
          item.updated == null ? new Date() : new Date(item.updated);
        const partitionKey = getPartitionKey(updatedAt);

        await fs.promises.mkdir(pathPrefix + "/" + partitionKey, {
          recursive: true,
        });
        totalCount++;
        const filePath = `${pathPrefix}/${partitionKey}/${mappedItem.id}.parquet`;
        const writer = await parquet.ParquetWriter.openFile(
          getSchemaName(tableName),
          filePath
        );

        try {
          await writer.appendRow(mappedItem);
          await writer.close();

          // read file as blob
          const blob = await fs.promises.readFile(filePath);

          // upload blob to s3
          const Key = `${OutputBucketPathPrefix}/${tableName}/${partitionKey}/${mappedItem.id}.parquet`;
          const s3Params = {
            Bucket: dwOutputBucket,
            Key,
            Body: blob,
          };

          return await s3Client.upload(s3Params).promise();
        } catch (err) {
          console.log("Failed to process", mappedItem.id, err);
          console.log("mappedItem", mappedItem);
        }
      },
      { concurrency: Concurrency }
    ).then((_results) => {
      console.log("totalCount", totalCount);
    });
  } while (typeof items.LastEvaluatedKey != "undefined");

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
    await lambda.invoke(lambdaParams).promise();
    console.log("Invoked lambda again");
    context.succeed();
  } else {
    console.log(`Successfully pulled all data from table "${TableName}"`);
    context.succeed();
  }
};
