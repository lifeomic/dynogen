import { MapperConfig, Mapper, File } from '../src';
import { createContext } from '../src/Context';
import { DEFAULT_MAPPER_IMPORTS } from '../src/constants';
import { createMockMapperConfig } from './helpers/mapper';
import { createMockItemConfig } from './helpers/item';

interface Fixture {
  title: string;
  config: MapperConfig;
  expected: string;
  name: string;
}

const fixtures: Fixture[] = [
  {
    title: 'Generates simple Mapper',
    name: 'UserMapper',
    config: createMockMapperConfig(),
    expected: `${DEFAULT_MAPPER_IMPORTS}
import {
  User,
  UninitializedUser,
  GeneratedPartialUser,
} from './User';


type IndexName = never;

export interface UserKey {
  id?: string;
}

const ajv = new Ajv({
  allErrors: true
});

export class UserMapper {
  constructor(private readonly client: DocumentClient) {}

  static readonly tableSchema = {
    TableName: "Users",
    KeySchema: [
      {
        AttributeName: "id",
        KeyType: "HASH"
      }
    ],
    AttributeDefinitions: [
      {
        AttributeName: "id",
        AttributeType: "S"
      }
    ]
  };

  static get tableName(): string {
    return UserMapper.tableSchema.TableName;
  }

  static initialize(item: UninitializedUser): User {
    return {
      ...item
    }
  }

  private static readonly validator = ajv.compile({
    additionalProperties: false,
    name: \"User\",
    type: \"object\",
    required: [
      \"id\",
      \"login\"
    ],
    properties: {
      id: {
        type: \"string\"
      },
      name: {
        type: \"string\"
      },
      login: {
        type: \"string\"
      }
    }
  })

  private static readonly partialValidator = ajv.compile({
    additionalProperties: false,
    name: \"User\",
    type: \"object\",
    required: [

    ],
    properties: {
      id: {
        type: \"string\"
      },
      name: {
        type: \"string\"
      },
      login: {
        type: \"string\"
      }
    }
  })

  static async validate(item: Readonly<User>): Promise<void> {
    if (!await UserMapper.validator(item)) throw new Error(ajv.errorsText());
  }

  static async partialValidate(item: Readonly<Partial<User>>): Promise<void> {
    if (!await UserMapper.partialValidator(item)) throw new Error(ajv.errorsText());
  }

  async put(toPut: Readonly<UninitializedUser>): Promise<User> {
    const item = <User>{
      ...toPut,
      ...UserMapper.initialize(toPut)
    };

    await UserMapper.validate(item);
    await this.client
      .put({
        TableName: UserMapper.tableName,
        Item: item
      })
      .promise();

    // The input item is returned because getting new fields on PutItem
    // operation is impossible. DynamoDB only supports 'OLD_VALUES' and
    // 'NONE' for this operation. This would otherwise require a
    // subsequent query.
    return item;
  }

  async get(key: Readonly<UserKey>): Promise<User> {
    const { Item: item } = await this.client
      .get({
        TableName: UserMapper.tableName,
        Key: key
      })
      .promise();

    if (!item) {
      throw new Error('User not found');
    }

    return <User>item;
  }

  async delete(key: Readonly<UserKey>): Promise<void> {
    await this.client
      .delete({
        TableName: UserMapper.tableName,
        Key: key
      })
      .promise();
  }

  async query(): Promise<User[]> {
    const result = await this.client
      .query({
        TableName: UserMapper.tableName
      })
      .promise();

    return <User[]>result.Items;
  }

  async update(
    key: Readonly<UserKey>,
    patch: Readonly<Partial<User>>
  ): Promise<User> {
    await UserMapper.partialValidate(patch);
    const attributeUpdates = Object.entries(patch).reduce(
      (acc, [key, value]) => ({
        ...acc,
        [key]: {
          Value: value,
          Action: "PUT"
        }
      }),
      {}
    );

    const { Attributes: old } = await this.client
      .update({
        TableName: UserMapper.tableName,
        Key: key,
        AttributeUpdates: attributeUpdates,
        ReturnValues: "ALL_OLD"
      })
      .promise();

    return {
      ...(<User>old),
      ...patch
    };
  }
}`
  },
  {
    title: 'Generates simple Mapper',
    name: 'UserMapper',
    config: createMockMapperConfig({
      rangeKey: 'name',
      globalSecondaryIndexes: [
        {
          name: 'byLogin',
          hashKey: 'login',
          projectionType: 'all'
        }
      ],
      localSecondaryIndexes: [
        {
          name: 'byName',
          rangeKey: 'name',
          projectionType: 'all'
        }
      ],
      item: createMockItemConfig({
        defaultProviders: {
          id: 'uuid=uuid/v4',
          name: './util#generateRandomName'
        }
      })
    }),
    expected: `${DEFAULT_MAPPER_IMPORTS}
import {
  User,
  UninitializedUser,
  GeneratedPartialUser,
} from './User';
import uuid = require('uuid/v4');
import { generateRandomName } from './util';

type IndexName = "byLogin" | "byName";

export interface UserKey {
  id?: string;
  name?: string;
  login?: string;
}

const ajv = new Ajv({
  allErrors: true
});

export class UserMapper {
  constructor(private readonly client: DocumentClient) {}

  static readonly tableSchema = {
    TableName: "Users",
    KeySchema: [
      {
        AttributeName: "id",
        KeyType: "HASH"
      },
      {
        AttributeName: "name",
        KeyType: "RANGE"
      }
    ],
    AttributeDefinitions: [
      {
        AttributeName: "id",
        AttributeType: "S"
      },
      {
        AttributeName: "name",
        AttributeType: "S"
      }
    ]
  };

  static get tableName(): string {
    return UserMapper.tableSchema.TableName;
  }

  static initialize(item: UninitializedUser): User {
    return {
      id: uuid(),
      name: generateRandomName(),
      ...item
    }
  }

  private static readonly validator = ajv.compile({
    additionalProperties: false,
    name: \"User\",
    type: \"object\",
    required: [
      \"id\",
      \"login\"
    ],
    properties: {
      id: {
        type: \"string\"
      },
      name: {
        type: \"string\"
      },
      login: {
        type: \"string\"
      }
    }
  })

  private static readonly partialValidator = ajv.compile({
    additionalProperties: false,
    name: \"User\",
    type: \"object\",
    required: [

    ],
    properties: {
      id: {
        type: \"string\"
      },
      name: {
        type: \"string\"
      },
      login: {
        type: \"string\"
      }
    }
  })

  static async validate(item: Readonly<User>): Promise<void> {
    if (!await UserMapper.validator(item)) throw new Error(ajv.errorsText());
  }

  static async partialValidate(item: Readonly<Partial<User>>): Promise<void> {
    if (!await UserMapper.partialValidator(item)) throw new Error(ajv.errorsText());
  }

  async put(toPut: Readonly<UninitializedUser>): Promise<User> {
    const item = <User>{
      ...toPut,
      ...UserMapper.initialize(toPut)
    };

    await UserMapper.validate(item);
    await this.client
      .put({
        TableName: UserMapper.tableName,
        Item: item
      })
      .promise();

    // The input item is returned because getting new fields on PutItem
    // operation is impossible. DynamoDB only supports 'OLD_VALUES' and
    // 'NONE' for this operation. This would otherwise require a
    // subsequent query.
    return item;
  }

  async get(key: Readonly<UserKey>): Promise<User> {
    const { Item: item } = await this.client
      .get({
        TableName: UserMapper.tableName,
        Key: key
      })
      .promise();

    if (!item) {
      throw new Error('User not found');
    }

    return <User>item;
  }

  async delete(key: Readonly<UserKey>): Promise<void> {
    await this.client
      .delete({
        TableName: UserMapper.tableName,
        Key: key
      })
      .promise();
  }

  async query(): Promise<User[]> {
    const result = await this.client
      .query({
        TableName: UserMapper.tableName
      })
      .promise();

    return <User[]>result.Items;
  }

  async update(
    key: Readonly<UserKey>,
    patch: Readonly<Partial<User>>
  ): Promise<User> {
    await UserMapper.partialValidate(patch);
    const attributeUpdates = Object.entries(patch).reduce(
      (acc, [key, value]) => ({
        ...acc,
        [key]: {
          Value: value,
          Action: "PUT"
        }
      }),
      {}
    );

    const { Attributes: old } = await this.client
      .update({
        TableName: UserMapper.tableName,
        Key: key,
        AttributeUpdates: attributeUpdates,
        ReturnValues: "ALL_OLD"
      })
      .promise();

    return {
      ...(<User>old),
      ...patch
    };
  }
}`
  }
];

fixtures.forEach(({ title, name, config, expected }) => {
  test(title, async () => {
    const context = createContext();
    const stageSpy = jest.spyOn(context, 'stageFile');
    const item = new Mapper(name, config);
    await item.generate(context);
    expect(stageSpy.mock.calls[1][0]).toEqual(
      new File(config.outPath, expected)
    );
  });
});

test('Throws when using union type for index key', async () => {
  const mapper = new Mapper(
    'UserMapper',
    createMockMapperConfig({
      item: createMockItemConfig({
        schema: {
          type: 'object',
          name: 'User',
          properties: {
            id: {
              type: ['string', 'number']
            }
          },
          required: ['id']
        }
      })
    })
  );

  await expect(mapper.generate(createContext())).rejects.toThrow(
    'Union types are not currently supported as index keys'
  );
});
