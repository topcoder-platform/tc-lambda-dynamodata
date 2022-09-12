const { snakeCase } = require("change-case");
const { DynamoDB } = require("aws-sdk");

const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

// const {
//   CloudWatchClient,
//   PutMetricDataCommand,
// } = require("@aws-sdk/client-cloudwatch");

const s3Client = new S3Client();

// const cloudwatchClient = new CloudWatchClient({
//   apiVersion: "2010-08-01",
//   region: process.env.AWS_DEFAULT_REGION,
// });

const dwOutputBucket = process.env.DW_OUTPUT_BUCKET || "tc-dw-dev-dw-raw";
const dwOutputBucketPathPrefix =
  process.env.DW_OUTPUT_BUCKET_PATH_PREFIX || "Member";

exports.processAndSave = function main(event, context) {
  console.log("Event", JSON.stringify(event));

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

  Promise.all(tasks)
    .then(async () => {
      //   const query = getCWQuery("Success", event.Records[0].s3.object.key);
      //   const command = new PutMetricDataCommand(query);

      //   await cloudwatchClient.send(command);

      context.succeed();
    })
    .catch(async (err) => {
      console.error(`Failed with ${err}`);
      //   const query = getCWQuery("Failure", event.Records[0].s3.object.key);
      //   const command = new PutMetricDataCommand(query);

      //   await cloudwatchClient.send(command);

      context.fail();
    });
};

const getPartitionKey = () => {
  const now = new Date();

  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  return `${year}/${month}/${day}`;
};

const getCWQuery = (metricName, key) => {
  return {
    MetricData: [
      {
        MetricName: metricName,
        Dimensions: [
          {
            Name: "Process Auth0 Logs",
            Value: key,
          },
        ],
        Unit: "None",
        Value: 1.0,
        Timestamp: new Date(),
      },
    ],
    Namespace: `DW/SUMO/AUTH0`,
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
  tableName = snakeCase(tableName);
  const destKey = `${tableName}/${getPartitionKey()}/${
    dynamodb[getPrimaryKey(tableName)]
  }.json`;

  const params = {
    Bucket: dwDestBucket,
    Key: `${dwOutputBucketPathPrefix}/${destKey}`,
    Body: Buffer.from(JSON.stringify(dynamodb)),
    ACL: "bucket-owner-full-control",
  };

  console.log("Uploading to S3...", params);
  await s3Client.send(new PutObjectCommand(params));
  console.log("Successfully uploaded to S3");
}
