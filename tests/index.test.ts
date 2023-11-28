import Chance from 'chance';
import DynamoDB, { RecordItem } from '../src';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const chance = Chance();

jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: jest.fn(() => ({
    send: jest.fn(),
  })),
  PutCommand: jest.fn(),
  GetCommand: jest.fn(),
}));
jest.mock('@aws-sdk/util-dynamodb');

describe('DynamoDB Wrapper Class', () => {
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

      await client.putItem(item);

      const documentClient = client.getDocumentClient;

      expect(documentClient.send).toHaveBeenCalledWith(new PutCommand({
        Item: item,
      }))

    });
  });

  describe('getItem', () => {

  });

  describe('deleteItem', () => {

  });
});
