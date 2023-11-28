import Chance from 'chance';
import DynamoDB, { RecordItem } from '../src';
import { DeleteCommand, DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';

const chance = Chance();

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
    it('should create a DynamoDB object', async () => {
      const client = new DynamoDB({
        table,
        region,
      });

      expect(client.getTable).toBe(table);
      expect(client.getRegion).toBe(region);
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

    it('should work with environment variables', async () => {
      const client = DynamoDB.fromEnvironment();

      expect(client.getTable).toBe(table);
      expect(client.getRegion).toBe(region);
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
});
