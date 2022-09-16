const { snakeCase } = require("change-case");
const { DynamoDB } = require("aws-sdk");

const docClient = new DynamoDB.DocumentClient({
  apiVersion: "2012-08-10",
  sslEnabled: false,
  paramValidation: false,
  convertResponseTypes: false,
});

exports.fetchAll = async function main(event, context) {
  console.log("event", event);

  const TableName = event.tableName;
  let params = { TableName: TableName, Limit: 200 };
  let items;
  let totalCount = 0;

  let tableName = snakeCase(TableName);
  console.log('tableName', tableName);
  do {
    items = await docClient.scan(params).promise();
    params.ExclusiveStartKey = items.LastEvaluatedKey;

    for (const item of items.Items) {
      console.log("item", item);
    }

    totalCount++;
  } while (typeof items.LastEvaluatedKey != "undefined" && totalCount < 5);

  context.succeed();
};
