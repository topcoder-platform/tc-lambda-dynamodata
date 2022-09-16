const { snakeCase } = require("change-case");
const { DynamoDB } = require("aws-sdk");

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

exports.processAndSave = function main(event, context) {
  const tasks = [];

  const data = event.Records.map(({ dynamodb, eventSourceARN }) => ({
    dynamodb: DynamoDB.Converter.unmarshall(dynamodb.NewImage),
    tableName: eventSourceARN.split("/")[1],
  }));

  for (const record of data) {
    tasks.push(
      saveToS3Promise(record, dwOutputBucket, dwOutputBucketPathPrefix)
    );
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

const getPartitionKey = () => {
  const now = new Date();

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

async function saveToS3Promise(
  { tableName, dynamodb },
  dwDestBucket,
  dwOutputBucketPathPrefix
) {
  try {
    tableName = snakeCase(tableName);
    const destKey = `${tableName}/${getPartitionKey()}/${
      dynamodb[getPrimaryKey(tableName)]
    }.json`;

    const params = {
      Bucket: dwDestBucket,
      Key: `${dwOutputBucketPathPrefix}/${destKey}`,
      Body: Buffer.from(JSON.stringify(dynamodb)),
    };

    console.log("Uploading to S3...", params);
    await s3Client.send(new PutObjectCommand(params));
    console.log("Successfully uploaded to S3");
    return true;
  } catch (err) {
    return false;
  }
}
