# NPM Package: dynamodb-util

A simple @aws-sdk/client-dynamodb wrapper that makes single table dynamodb
queries easy to use.

## Use

I personally use this package on my DynamoDB single table data design.

## Features

### Soft Deletes

Will ignore data that has been deleted (softly). The package will check if the
`isDeleted` property of the DB Record has been set to true. If so, the package
will return undefined in its place.

### Easy Creation from Environment

When using the package in AWS Lambda and defining the environment variable in
aws-cdk, the environment variables can be used to reduce the amount of
boilerplate code needed in your lambda.

```javascript
environment: {
  DYNAMODB_TABLE: 'table-name',
  DYNAMODB_REGION: 'us-east-1',
},
```

```javascript
const client = DynamoDB.fromEnvironment();
```

`client` will be set to the correct table and region in one line of code.

## Methods

### getItem

```javascript
await client.getItem(primaryKey, sortKey);
```

Get item will dispatch a `GetCommand` to the `DynamoDBDocumentClient`. The
value will be checked to make sure it has not been soft deleted, and then it
will be returned to the user. If the Record is not found, `undefined` is
returned.

## putItem

```javascript
const item = {
  primaryKey: 'abc',
  sortKey: '123',
  data: 'some data',
};
await client.putItem(item);
```

Get item will dispatch a `PutCommand` to the `DynamoDBDocumentClient`. A new
record will be created in the database with the item as it's data.

### deleteItem

```javascript
await client.deleteItem(primaryKey, sortKey);
```

Get item will dispatch a `DeleteCommand` to the `DynamoDBDocumentClient`. If
the record exists, it will be deleted. Otherwise nothing happens.

### queryPrimaryIndex

```javascript
await client.queryPrimaryIndex(primaryKey);
```

Get item will dispatch a `QueryCommand` to the `DynamoDBDocumentClient`. All
records with the primary key will be returned to the caller.

```javascript
await client.queryPrimaryIndex(primaryKey, beginsWith, { limit: 10 });
```

Optionally, you can specify what the sort key begins with. All the records that
match the primary key and fulfil the sort key begins with constraint will be returned.

### querySecondaryIndex

Does the same as queryPrimaryIndex except on a secondary index called `gsi`.

```javascript
await client.querySecondaryIndex(secondaryKey);
```

Get item will dispatch a `QueryCommand` to the `DynamoDBDocumentClient`. All
records with the secondary key will be returned to the caller.

```javascript
await client.querySecondaryIndex(secondaryKey, beginsWith, { limit: 10 });
```

Optionally, you can specify what the sort key begins with. All the records that
match the secondary key and fulfil the sort key begins with constraint will be
returned.
