import { DynamoDBClient, DynamoDBClientConfig, QueryCommand, QueryCommandInput } from '@aws-sdk/client-dynamodb';
import { DeleteCommand, DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { NativeAttributeValue } from '@aws-sdk/util-dynamodb';
import GetItemCommandError from './errors/GetItemCommandError';

export interface DynamoDBConfig extends DynamoDBClientConfig {
  table: string,
}

export interface RecordItem extends Record<string, NativeAttributeValue> {
  ppk: string,
  psk: string,
  spk: string | undefined,
  ssk: string | undefined,
  isDeleted: boolean | undefined,
}

export interface QueryOptions {
  limit: number | undefined,
  pkOnly: boolean | undefined,
}

export default class DynamoDB extends DynamoDBClient {
  private table: string = '';
  private documentClient: DynamoDBDocumentClient;

  constructor(config: DynamoDBConfig) {
    super(config);

    this.table = config.table;
    this.documentClient = DynamoDBDocumentClient.from(this);
  }

  public static fromEnvironment(): DynamoDB {
    const region = process.env.DYNAMODB_REGION ?? '';
    const table = process.env.DYNAMODB_TABLE ?? '';

    return new DynamoDB({
      table,
      region,
    });
  }

  public async putItem(item: RecordItem): Promise<void> {
    const command = new PutCommand({
      TableName: this.table,
      Item: {
        ...item,
      },
    });

    await this.documentClient.send(command);
  }

  private filterDeletedItems(items: RecordItem | RecordItem[] ): RecordItem | RecordItem[] | undefined {
    if (!Array.isArray(items)) {
      if (items?.isDeleted === true) {
        return undefined;
      }

      return items;
    }

    return items.filter((i) => i.isDeleted !== true);
  }

  public async getItem(primaryKey: string, sortKey: string): Promise<RecordItem | undefined> {
    const command = new GetCommand({
      TableName: this.table,
      Key: {
        ppk: primaryKey,
        psk: sortKey,
      },
    });

    const { Item: item } = await this.documentClient.send(command);

    if (item === undefined) {
      return undefined;
    }

    return this.filterDeletedItems(item as RecordItem) as RecordItem | undefined;
  }

  public async deleteItem(primaryKey: string, sortKey: string): Promise<void> {
    const command = new DeleteCommand({
      TableName: this.table,
      Key: {
        ppk: primaryKey,
        psk: sortKey,
      },
    });

    await this.documentClient.send(command);
  }

  public async queryPrimaryIndex(primaryKey: string, sortKeyBeginsWith?: string, options?: QueryOptions) {
    let KeyConditionExpression = 'ppk = :ppk';
    let ExpressionAttributeValues: Record<string, NativeAttributeValue> = {
      ':ppk': primaryKey,
    };

    if (sortKeyBeginsWith !== undefined && sortKeyBeginsWith !== '') {
      KeyConditionExpression += ' and begins_with(psk, :psk)';
      ExpressionAttributeValues[':psk'] = sortKeyBeginsWith;
    }

    const params: QueryCommandInput = {
      TableName: this.table,
    };

    if (options?.pkOnly) {
      params.ProjectionExpression = 'ppk';
    }

    if (options?.limit !== undefined) {
      params.Limit = options.limit;
    }

    const command = new QueryCommand({
      KeyConditionExpression,
      ExpressionAttributeValues,
      ...params,
    });

    const { Items: items } = await this.documentClient.send(command);

    return this.filterDeletedItems(items as RecordItem[]);
  }

  public async querySecondaryIndex(secondaryKey: string, sortKeyBeginsWith?: string, options?: QueryOptions) {
    let KeyConditionExpression = 'spk = :spk';
    let ExpressionAttributeValues: Record<string, NativeAttributeValue> = {
      ':spk': secondaryKey,
    };

    if (sortKeyBeginsWith !== undefined && sortKeyBeginsWith !== '') {
      KeyConditionExpression += ' and begins_with(ssk, :ssk)';
      ExpressionAttributeValues[':ssk'] = sortKeyBeginsWith;
    }

    const params: QueryCommandInput = {
      TableName: this.table,
    };

    if (options?.pkOnly) {
      params.ProjectionExpression = 'spk';
    }

    if (options?.limit !== undefined) {
      params.Limit = options.limit;
    }

    const command = new QueryCommand({
      KeyConditionExpression,
      ExpressionAttributeValues,
      IndexName: 'gsi',
      ...params,
    });

    const { Items: items } = await this.documentClient.send(command);

    return this.filterDeletedItems(items as RecordItem[]);
  }
}
