const fs = require("fs");
const parquet = require("parquetjs");

const { snakeCase } = require("change-case");
const { DynamoDB } = require("aws-sdk");

const challengeMapper = require("./mapper/challenge/Challenge");
const challengeSchema = require("./schema/challenge/challenge");

const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const {
  CloudWatchClient,
  PutMetricDataCommand,
} = require("@aws-sdk/client-cloudwatch");

const s3Client = new S3Client();
const cloudwatchClient = new CloudWatchClient({
  apiVersion: "2010-08-01",
  region: process.env.AWS_DEFAULT_REGION,
});

const dwOutputBucket = process.env.DW_OUTPUT_BUCKET || "tc-dw-dev-dw-raw";
const dwOutputBucketPathPrefix =
  process.env.DW_OUTPUT_BUCKET_PATH_PREFIX || "Member";
const pathPrefix = process.env.PATH_PREFIX || "/tmp";

exports.processAndSave = function main(event, context) {
  const tasks = [];

  const data = event.Records.map(({ dynamodb, eventSourceARN }) => ({
    dynamodb: DynamoDB.Converter.unmarshall(dynamodb.NewImage),
    tableName: eventSourceARN.split("/")[1],
  }));

  for (const record of data) {
    if (record.tableName === "Challenge") {
      tasks.push(saveToS3AsParquetPromise(record, pathPrefix, dwOutputBucket));
    } else {
      tasks.push(
        saveToS3Promise(record, dwOutputBucket, dwOutputBucketPathPrefix)
      );
    }
  }

  Promise.all(tasks).then(async (results) => {
    const successCount = results.filter((result) => result).length;
    const failureCount = results.filter((result) => !result).length;
    const tableName = data[0].tableName;

    if (successCount) {
      const query = getCWQuery("Success", tableName, successCount);
      const command = new PutMetricDataCommand(query);
      await cloudwatchClient.send(command);
    }

    if (failureCount) {
      const query = getCWQuery("Failure", tableName, successCount);
      const command = new PutMetricDataCommand(query);
      await cloudwatchClient.send(command);
    }

    context.succeed();
  });
};

const getPartitionKey = (updatedAt) => {
  const now = updatedAt == null ? new Date() : new Date(updatedAt);

  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  return `${year}/${month}/${day}`;
};

const getCWQuery = (metricName, tableName, count) => {
  return {
    MetricData: [
      {
        MetricName: metricName,
        Dimensions: [
          {
            Name: `Stream to data warehouse`,
            Value: tableName,
          },
        ],
        Unit: "Count",
        Value: count,
        Timestamp: new Date(),
      },
    ],
    Namespace: `DW/TOPCODER/MEMBER`,
  };
};

const getPrimaryKey = (tableName) => {
  switch (tableName) {
    case "member_entered_skills":
    case "member_aggregated_skills":
    case "member_profile_trait":
    case "member_profile":
    case "member_stats":
    case "member_stats_history":
      return "userId";
    case "tags":
      return "id";
    default:
      return "userId";
  }
};

const mapItem = (tableName, item) => {
  switch (tableName) {
    case "challenge":
      return challengeMapper.map(item);
    default:
      return item;
  }
};

async function saveToS3AsParquetPromise(
  { tableName, dynamodb },
  pathPrefix,
  dwDestBucket
) {
  try {
    tableName = snakeCase(tableName);
    console.log(tableName, "Record", dynamodb);
    const mappedItem = mapItem(dynamodb);
    console.log("After mapping", mappedItem);
    const updatedAt = new Date(dynamodb.updated);
    const partitionKey = getPartitionKey(updatedAt);

    await fs.promises.mkdir(pathPrefix + "/" + partitionKey, {
      recursive: true,
    });
    const filePath = `${pathPrefix}/${partitionKey}/${mappedItem.id}.parquet`;
    const writer = await parquet.ParquetWriter.openFile(
      challengeSchema,
      filePath
    );
    await writer.appendRow(mappedItem);
    await writer.close();

    const blob = await fs.promises.readFile(filePath);
    const destKey = `${tableName}/${partitionKey}/${mappedItem.id}.parquet`;

    const params = {
      Bucket: dwDestBucket,
      Key: `Challenge/${destKey}`,
      Body: blob,
    };

    const command = new PutObjectCommand(params);
    await s3Client.send(command);

    return true;
  } catch (err) {
    console.log("Error: ", err);
    return false;
  }
}

async function saveToS3Promise(
  { tableName, dynamodb },
  dwDestBucket,
  dwOutputBucketPathPrefix
) {
  try {
    tableName = snakeCase(tableName);
    const destKey = `${tableName}/${getPartitionKey(dynamodb.updatedAt)}/${
      dynamodb[getPrimaryKey(tableName)]
    }.json`;

    const params = {
      Bucket: dwDestBucket,
      Key: `${dwOutputBucketPathPrefix}/${destKey}`,
      Body: Buffer.from(JSON.stringify(dynamodb)),
    };

    console.log("Uploading to S3...", params);
    await s3Client.send(new PutObjectCommand(params));
    console.log("Successfully uploaded to S3", params);
    return true;
  } catch (err) {
    return false;
  }
}

exports.saveToS3Promise = saveToS3Promise;
