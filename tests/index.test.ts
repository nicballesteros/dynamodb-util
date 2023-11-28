import Chance from 'chance';
import DynamoDB, { RecordItem } from '../src';
import { DeleteCommand, DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';
import {NativeAttributeValue} from '@aws-sdk/util-dynamodb';

const chance = Chance();

const createItem = () => {
  const ppk = `resource:${chance.guid()}`;
  const psk = `sortvalue:${chance.guid()}`;

  return {
    ppk,
    psk,
    data: {
      value: chance.integer(),
    },
    spk: psk,
    ssk: ppk,
  };
};

describe('DynamoDB Wrapper Class', () => {
  const documentClientMock = mockClient(DynamoDBDocumentClient);

  let table: string;
  let region: string;

  beforeEach(() => {
    table = chance.string();
    region = chance.pickone([
      'us-east-1',
      'us-east-2',
      'us-west-1',
      'us-west-2',
    ]);

    documentClientMock.reset();
  });

  describe('constructor', () => {
    it('should create a DynamoDB object', () => {
      const client = new DynamoDB({
        table,
        region,
      });

      expect(client.getTable).toBe(table);
      expect(client.getRegion).toBe(region);
      expect(client.getDocumentClient).toBeInstanceOf(DynamoDBDocumentClient);
    });

    it('should use an empty string if region is not defined', () => {
      const client = new DynamoDB({
        table,
      });

      expect(client.getTable).toBe(table);
      expect(client.getRegion).toBe('');
      expect(client.getDocumentClient).toBeInstanceOf(DynamoDBDocumentClient);
    });
  });

  describe('fromEnvironment', () => {
    beforeEach(() => {
      process.env.DYNAMODB_TABLE = table;
      process.env.DYNAMODB_REGION = region;
    });

    afterAll(() => {
      delete process.env.DYNAMODB_TABLE;
      delete process.env.DYNAMODB_REGION;
    });

    it('should work with environment variables', () => {
      const client = DynamoDB.fromEnvironment();

      expect(client.getTable).toBe(table);
      expect(client.getRegion).toBe(region);
      expect(client.getDocumentClient).toBeInstanceOf(DynamoDBDocumentClient);
    });

    it('should use empty strings if not set', () => {
      delete process.env.DYNAMODB_TABLE;
      delete process.env.DYNAMODB_REGION;

      const client = DynamoDB.fromEnvironment();

      expect(client.getTable).toBe('');
      expect(client.getRegion).toBe('');
      expect(client.getDocumentClient).toBeInstanceOf(DynamoDBDocumentClient);
    });
  });

  describe('putItem', () => {
    it('should be a proxy for the putItem command', async () => {
      const client = new DynamoDB({
        table,
        region,
      });

      // An example data record
      const item: RecordItem = {
        ppk: `resource:${chance.guid()}`,
        psk: 'metadata',
        data: {
          numberValue: chance.integer(),
        },
      };

      documentClientMock.on(PutCommand).resolves({});

      await client.putItem(item);

      expect(documentClientMock).toHaveReceivedCommand(PutCommand);
      expect(documentClientMock).toHaveReceivedCommandTimes(PutCommand, 1);
      expect(documentClientMock).toHaveReceivedCommandWith(PutCommand, {
        TableName: table,
        Item: {
          ...item,
        },
      });
    });
  });

  describe('getItem', () => {
    it('should be a proxy for the getItem command', async () => {
      const client = new DynamoDB({
        table,
        region,
      });

      // An example data record
      const item: RecordItem = {
        ppk: `resource:${chance.guid()}`,
        psk: 'metadata',
        data: {
          numberValue: chance.integer(),
        },
      };

      documentClientMock.on(GetCommand).resolves({
        Item: item,
      });

      const res = await client.getItem(item.ppk, item.psk);

      expect(documentClientMock).toHaveReceivedCommand(GetCommand);
      expect(documentClientMock).toHaveReceivedCommandTimes(GetCommand, 1);
      expect(documentClientMock).toHaveReceivedCommandWith(GetCommand, {
        TableName: table,
        Key: {
          ppk: item.ppk,
          psk: item.psk,
        },
      });

      expect(res).toEqual(item);
    });

    it('should return undefined when not found', async () => {
      const client = new DynamoDB({
        table,
        region,
      });

      const item: RecordItem = {
        ppk: `resource:${chance.guid()}`,
        psk: 'metadata',
      };

      documentClientMock.on(GetCommand).resolves({
        Item: undefined,
      });

      const res = await client.getItem(item.ppk, item.psk);

      expect(documentClientMock).toHaveReceivedCommand(GetCommand);
      expect(documentClientMock).toHaveReceivedCommandTimes(GetCommand, 1);
      expect(documentClientMock).toHaveReceivedCommandWith(GetCommand, {
        TableName: table,
        Key: {
          ppk: item.ppk,
          psk: item.psk,
        },
      });

      expect(res).toBe(undefined);
    });

    it('should filter out deleted items', async () => {
      const client = new DynamoDB({
        table,
        region,
      });

      // An example data record
      const item: RecordItem = {
        ppk: `resource:${chance.guid()}`,
        psk: 'metadata',
        isDeleted: true,
        data: {
          numberValue: chance.integer(),
        },
      };

      documentClientMock.on(GetCommand).resolves({
        Item: item,
      });

      const res = await client.getItem(item.ppk, item.psk);

      expect(documentClientMock).toHaveReceivedCommand(GetCommand);
      expect(documentClientMock).toHaveReceivedCommandTimes(GetCommand, 1);
      expect(documentClientMock).toHaveReceivedCommandWith(GetCommand, {
        TableName: table,
        Key: {
          ppk: item.ppk,
          psk: item.psk,
        },
      });

      expect(res).toBe(undefined);
    });
  });

  describe('deleteItem', () => {
    it('should be a proxy for the deleteItem command', async () => {
      const client = new DynamoDB({
        table,
        region,
      });

      const item: RecordItem = {
        ppk: `resource:${chance.guid()}`,
        psk: 'metadata',
      };

      documentClientMock.on(DeleteCommand).resolves({});

      await client.deleteItem(item.ppk, item.psk);

      expect(documentClientMock).toHaveReceivedCommand(DeleteCommand);
      expect(documentClientMock).toHaveReceivedCommandTimes(DeleteCommand, 1);
      expect(documentClientMock).toHaveReceivedCommandWith(DeleteCommand, {
        TableName: table,
        Key: {
          ppk: item.ppk,
          psk: item.psk,
        },
      });
    });
  });

  describe('queryPrimaryIndex', () => {
    it('should query the primary index', async () => {
      const client = new DynamoDB({
        table,
        region,
      });

      const item: RecordItem = {
        ppk: `resource:${chance.guid()}`,
        psk: 'metadata',
      };

      const items: Record<string, NativeAttributeValue>[] = [item, ...chance.n(createItem, 4)];

      documentClientMock.on(QueryCommand).resolves({
        Items: items,
      });

      const res = await client.queryPrimaryIndex(item.ppk);

      expect(documentClientMock).toHaveReceivedCommand(QueryCommand);
      expect(documentClientMock).toHaveReceivedCommandTimes(QueryCommand, 1);
      expect(documentClientMock).toHaveReceivedCommandWith(QueryCommand, {
        TableName: table,
        KeyConditionExpression: 'ppk = :ppk',
        ExpressionAttributeValues: {
          ':ppk': item.ppk,
        } as Record<string, NativeAttributeValue>,
      });

      expect(res).toEqual(items);
    });

    it('should remove deleted items', async () => {
      const client = new DynamoDB({
        table,
        region,
      });

      const item: RecordItem = {
        ppk: `resource:${chance.guid()}`,
        psk: 'metadata',
      };

      const deletedItem: RecordItem = {
        ppk: `resource:${chance.guid()}`,
        psk: 'metadata',
        isDeleted: true,
      };

      const items: Record<string, NativeAttributeValue>[] = [item, deletedItem, ...chance.n(createItem, 4)];

      documentClientMock.on(QueryCommand).resolves({
        Items: items,
      });

      const res = await client.queryPrimaryIndex(item.ppk);

      expect(documentClientMock).toHaveReceivedCommand(QueryCommand);
      expect(documentClientMock).toHaveReceivedCommandTimes(QueryCommand, 1);
      expect(documentClientMock).toHaveReceivedCommandWith(QueryCommand, {
        TableName: table,
        KeyConditionExpression: 'ppk = :ppk',
        ExpressionAttributeValues: {
          ':ppk': item.ppk,
        } as Record<string, NativeAttributeValue>,
      });

      expect(res.length).toBe(items.length - 1);
      expect(res).toEqual(items.filter((i) => i.isDeleted !== true));
    });

    it('should query the primary index and the sort key', async () => {
      const client = new DynamoDB({
        table,
        region,
      });

      const item: RecordItem = {
        ppk: `resource:${chance.guid()}`,
        psk: 'metadata',
      };

      const items: Record<string, NativeAttributeValue>[] = [item, ...chance.n(createItem, 4)];

      documentClientMock.on(QueryCommand).resolves({
        Items: items,
      });

      const res = await client.queryPrimaryIndex(item.ppk, item.psk);

      expect(documentClientMock).toHaveReceivedCommand(QueryCommand);
      expect(documentClientMock).toHaveReceivedCommandTimes(QueryCommand, 1);
      expect(documentClientMock).toHaveReceivedCommandWith(QueryCommand, {
        TableName: table,
        KeyConditionExpression: 'ppk = :ppk and begins_with(psk, :psk)',
        ExpressionAttributeValues: {
          ':ppk': item.ppk,
          ':psk': item.psk,
        } as Record<string, NativeAttributeValue>,
      });

      expect(res).toEqual(items);
    });

    it('should only return pk', async () => {
      const client = new DynamoDB({
        table,
        region,
      });

      const item: RecordItem = {
        ppk: `resource:${chance.guid()}`,
        psk: 'metadata',
      };

      const items: Record<string, NativeAttributeValue>[] = [item, ...chance.n(createItem, 4)];

      documentClientMock.on(QueryCommand).resolves({
        Items: items,
      });

      const res = await client.queryPrimaryIndex(item.ppk, item.psk, {
        pkOnly: true,
      });

      expect(documentClientMock).toHaveReceivedCommand(QueryCommand);
      expect(documentClientMock).toHaveReceivedCommandTimes(QueryCommand, 1);
      expect(documentClientMock).toHaveReceivedCommandWith(QueryCommand, {
        TableName: table,
        KeyConditionExpression: 'ppk = :ppk and begins_with(psk, :psk)',
        ExpressionAttributeValues: {
          ':ppk': item.ppk,
          ':psk': item.psk,
        } as Record<string, NativeAttributeValue>,
        ProjectionExpression: 'ppk',
      });

      expect(res).toEqual(items);
    });

    it('should set a limit', async () => {
      const client = new DynamoDB({
        table,
        region,
      });

      const item: RecordItem = {
        ppk: `resource:${chance.guid()}`,
        psk: 'metadata',
      };

      const items: Record<string, NativeAttributeValue>[] = [item, ...chance.n(createItem, 4)];

      documentClientMock.on(QueryCommand).resolves({
        Items: items,
      });

      const limit = chance.natural({ min: 5, max: 10 });

      const res = await client.queryPrimaryIndex(item.ppk, item.psk, {
        limit,
      });

      expect(documentClientMock).toHaveReceivedCommand(QueryCommand);
      expect(documentClientMock).toHaveReceivedCommandTimes(QueryCommand, 1);
      expect(documentClientMock).toHaveReceivedCommandWith(QueryCommand, {
        TableName: table,
        KeyConditionExpression: 'ppk = :ppk and begins_with(psk, :psk)',
        ExpressionAttributeValues: {
          ':ppk': item.ppk,
          ':psk': item.psk,
        } as Record<string, NativeAttributeValue>,
        Limit: limit,
      });

      expect(res).toEqual(items);
    });
  });

  describe('querySecondaryIndex', () => {
    it('should query the secondary index', async () => {
      const client = new DynamoDB({
        table,
        region,
      });

      const item: RecordItem = createItem();

      const items: Record<string, NativeAttributeValue>[] = [item, ...chance.n(createItem, 4)];

      documentClientMock.on(QueryCommand).resolves({
        Items: items,
      });

      const res = await client.querySecondaryIndex(item.spk ?? '');

      expect(documentClientMock).toHaveReceivedCommand(QueryCommand);
      expect(documentClientMock).toHaveReceivedCommandTimes(QueryCommand, 1);
      expect(documentClientMock).toHaveReceivedCommandWith(QueryCommand, {
        TableName: table,
        KeyConditionExpression: 'spk = :spk',
        ExpressionAttributeValues: {
          ':spk': item.spk,
        } as Record<string, NativeAttributeValue>,
        IndexName: 'gsi',
      });

      expect(res).toEqual(items);
    });

    it('should remove deleted items', async () => {
      const client = new DynamoDB({
        table,
        region,
      });

      const item: RecordItem = createItem();

      const deletedItem: RecordItem = {
        ppk: `resource:${chance.guid()}`,
        psk: 'metadata',
        isDeleted: true,
        spk: 'metadata',
        ssk: `resource:${chance.guid()}`,
      };

      const items: Record<string, NativeAttributeValue>[] = [item, deletedItem, ...chance.n(createItem, 4)];

      documentClientMock.on(QueryCommand).resolves({
        Items: items,
      });

      const res = await client.querySecondaryIndex(item.spk ?? '');

      expect(documentClientMock).toHaveReceivedCommand(QueryCommand);
      expect(documentClientMock).toHaveReceivedCommandTimes(QueryCommand, 1);
      expect(documentClientMock).toHaveReceivedCommandWith(QueryCommand, {
        TableName: table,
        KeyConditionExpression: 'spk = :spk',
        ExpressionAttributeValues: {
          ':spk': item.spk,
        } as Record<string, NativeAttributeValue>,
        IndexName: 'gsi',
      });

      expect(res.length).toBe(items.length - 1);
      expect(res).toEqual(items.filter((i) => i.isDeleted !== true));
    });

    it('should query the secondary index and the sort key', async () => {
      const client = new DynamoDB({
        table,
        region,
      });

      const item: RecordItem = createItem();

      const items: Record<string, NativeAttributeValue>[] = [item, ...chance.n(createItem, 4)];

      documentClientMock.on(QueryCommand).resolves({
        Items: items,
      });

      const res = await client.querySecondaryIndex(item.spk ?? '', item.ssk ?? '');

      expect(documentClientMock).toHaveReceivedCommand(QueryCommand);
      expect(documentClientMock).toHaveReceivedCommandTimes(QueryCommand, 1);
      expect(documentClientMock).toHaveReceivedCommandWith(QueryCommand, {
        TableName: table,
        KeyConditionExpression: 'spk = :spk and begins_with(ssk, :ssk)',
        ExpressionAttributeValues: {
          ':spk': item.spk,
          ':ssk': item.ssk,
        } as Record<string, NativeAttributeValue>,
        IndexName: 'gsi',
      });

      expect(res).toEqual(items);
    });

    it('should only return pk', async () => {
      const client = new DynamoDB({
        table,
        region,
      });

      const item: RecordItem = createItem()

      const items: Record<string, NativeAttributeValue>[] = [item, ...chance.n(createItem, 4)];

      documentClientMock.on(QueryCommand).resolves({
        Items: items,
      });

      const res = await client.querySecondaryIndex(item.spk ?? '', item.ssk ?? '', {
        pkOnly: true,
      });

      expect(documentClientMock).toHaveReceivedCommand(QueryCommand);
      expect(documentClientMock).toHaveReceivedCommandTimes(QueryCommand, 1);
      expect(documentClientMock).toHaveReceivedCommandWith(QueryCommand, {
        TableName: table,
        KeyConditionExpression: 'spk = :spk and begins_with(ssk, :ssk)',
        ExpressionAttributeValues: {
          ':spk': item.spk,
          ':ssk': item.ssk,
        } as Record<string, NativeAttributeValue>,
        IndexName: 'gsi',
        ProjectionExpression: 'spk',
      });

      expect(res).toEqual(items);
    });

    it('should set a limit', async () => {
      const client = new DynamoDB({
        table,
        region,
      });

      const item: RecordItem = createItem();

      const items: Record<string, NativeAttributeValue>[] = [item, ...chance.n(createItem, 4)];

      documentClientMock.on(QueryCommand).resolves({
        Items: items,
      });

      const limit = chance.natural({ min: 5, max: 10 });

      const res = await client.querySecondaryIndex(item.spk ?? '', item.ssk ?? '', {
        limit,
      });

      expect(documentClientMock).toHaveReceivedCommand(QueryCommand);
      expect(documentClientMock).toHaveReceivedCommandTimes(QueryCommand, 1);
      expect(documentClientMock).toHaveReceivedCommandWith(QueryCommand, {
        TableName: table,
        KeyConditionExpression: 'spk = :spk and begins_with(ssk, :ssk)',
        ExpressionAttributeValues: {
          ':spk': item.spk,
          ':ssk': item.ssk,
        } as Record<string, NativeAttributeValue>,
        IndexName: 'gsi',
        Limit: limit,
      });

      expect(res).toEqual(items);
    });
  });
});
