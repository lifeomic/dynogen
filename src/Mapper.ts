import { GeneratedFileConfig } from './GeneratedFile';
import { Item, ItemConfig, DEFAULT_JSON_TO_TS_OPTIONS } from './Item';
import { renderValueToString, getIndentPrefix } from './ast';
import { JSONSchema4TypeName } from 'json-schema';
import { resolvePath } from './util';
import { DEFAULT_MAPPER_IMPORTS } from './constants';
import { compile } from 'json-schema-to-typescript';
import { Context } from './Context';
import { File } from './File';

type DynamoDBIndexableScalarType = 'S' | 'N';
const dynamoDBIndexableScalarTypeMap = new Map<
  JSONSchema4TypeName,
  DynamoDBIndexableScalarType
>([['string', 'S'], ['number', 'N'], ['integer', 'N']]);

interface SecondaryIndex {
  name: string;
  projectionType: string;
  nonKeyAttributes?: string[];
}

interface GlobalSecondaryIndex extends SecondaryIndex {
  hashKey: string;
  rangeKey?: string;
}

interface LocalSecondaryIndex extends SecondaryIndex {
  rangeKey: string;
}

interface TableSchemaConfig {
  hashKey: string;
  rangeKey?: string;
  globalSecondaryIndexes?: GlobalSecondaryIndex[];
  localSecondaryIndexes?: LocalSecondaryIndex[];
}

interface TableSchema {
  hashKey: string;
  rangeKey?: string;
  globalSecondaryIndexes: GlobalSecondaryIndex[];
  localSecondaryIndexes: LocalSecondaryIndex[];
}

export interface MapperMetadata extends TableSchemaConfig {
  tableName: string;
}

export interface MapperConfig extends GeneratedFileConfig, MapperMetadata {
  item: ItemConfig;
}

export class Mapper {
  constructor(name: Readonly<string>, config: Readonly<MapperConfig>) {
    this.name = name;
    this.item = new Item(config.item);
    this.tableName = config.tableName;
    this.tableSchema = {
      hashKey: config.hashKey,
      rangeKey: config.rangeKey,
      globalSecondaryIndexes: config.globalSecondaryIndexes || [],
      localSecondaryIndexes: config.localSecondaryIndexes || []
    };
    this.hashKey = config.hashKey;
    this.rangeKey = config.rangeKey;

    this.generatedFileConfig = {
      outPath: config.outPath,
      overwrite: config.overwrite
    };
  }

  readonly item: Item;
  readonly name: string;
  readonly hashKey: string;
  readonly rangeKey?: string;
  readonly tableName: string;
  readonly tableSchema: TableSchema;
  readonly generatedFileConfig: GeneratedFileConfig;

  private get keyTypeName() {
    return `${this.item.typeName}Key`;
  }

  private resolveIndexKeyType(key: string): string {
    const schemaTypeOrTypes = this.item.resolveKeyType(key);

    if (Array.isArray(schemaTypeOrTypes)) {
      throw new Error('Union types are not currently supported as index keys');
    }

    const schemaType = <JSONSchema4TypeName>schemaTypeOrTypes;
    return String(dynamoDBIndexableScalarTypeMap.get(schemaType));
  }

  private generateImports(): string {
    return `${DEFAULT_MAPPER_IMPORTS}
import {
  ${this.item.typeName},
  ${this.item.uninitializedTypeName},
  ${this.item.generatedPartialTypeName},
} from '${resolvePath(
      this.generatedFileConfig.outPath,
      this.item.generatedFileConfig.outPath
    )}';
${this.generateDefaultProviderImports()}`;
  }

  private generateDefaultProviderImports(): string {
    return (
      Object.values(this.item.defaultProviders)
        .map((defaultProvider) => {
          const modulePath = defaultProvider.relative
            ? resolvePath(
                this.generatedFileConfig.outPath,
                defaultProvider.modulePath
              )
            : defaultProvider.modulePath;
          return defaultProvider.type === 'default'
            ? `import ${defaultProvider.binding} = require('${modulePath}');`
            : `import { ${defaultProvider.binding} } from '${modulePath}';`;
        })
        .join('\n') + '\n'
    );
  }

  private generateGeneratedPartialMappings(): string {
    return (
      Object.entries(this.item.defaultProviders)
        .map(([name, defaultProvider]) => {
          return `${getIndentPrefix(3)}${name}: ${
            defaultProvider.binding
          }(),\n`;
        })
        .join('') + getIndentPrefix(3)
    );
  }

  private generateKeyType(): Promise<string> {
    const { indexKeys } = this;
    const indexProperties = Object.entries(this.item.schema.properties).reduce(
      (acc, [key, schema]) =>
        indexKeys.includes(key)
          ? {
              ...acc,
              [key]: schema
            }
          : acc,
      {}
    );

    return compile(
      {
        ...this.item.schema,
        required: [],
        properties: indexProperties
      },
      this.keyTypeName,
      DEFAULT_JSON_TO_TS_OPTIONS
    );
  }

  private generateTableSchema(): string {
    const TableName = this.tableName;
    const KeySchema = [
      {
        AttributeName: this.hashKey,
        KeyType: 'HASH'
      }
    ];

    const AttributeDefinitions = [
      {
        AttributeName: this.hashKey,
        AttributeType: this.resolveIndexKeyType(this.hashKey)
      }
    ];

    if (this.rangeKey) {
      const AttributeName = this.rangeKey;

      KeySchema.push({
        AttributeName,
        KeyType: 'RANGE'
      });

      AttributeDefinitions.push({
        AttributeName,
        AttributeType: this.resolveIndexKeyType(this.rangeKey)
      });
    }

    return renderValueToString(
      {
        TableName,
        KeySchema,
        AttributeDefinitions
      },
      {
        // set offset for property declaration inside of class body
        noPrefixIndent: true,
        indentLevelOffset: 1
      }
    );
  }

  get indexKeys(): string[] {
    return [
      ...this.tableSchema.globalSecondaryIndexes,
      ...this.tableSchema.localSecondaryIndexes,
      { hashKey: this.hashKey, rangeKey: this.rangeKey }
    ].reduce<string[]>((acc, curr: { hashKey?: string; rangeKey?: string }) => {
      if (curr.hashKey) {
        acc.push(curr.hashKey);
      }
      if (curr.rangeKey) {
        acc.push(curr.rangeKey);
      }
      return acc;
    }, []);
  }

  generateIndexNameType(): string {
    const names = [
      ...this.tableSchema.globalSecondaryIndexes,
      ...this.tableSchema.localSecondaryIndexes
    ].map((index: SecondaryIndex) => index.name);
    if (!names.length) return `type IndexName = never;`;
    return `type IndexName = ${names.map((name) => `"${name}"`).join(' | ')};`;
  }

  async generate(context: Context): Promise<void> {
    await this.item.generate(context);
    const content = `${this.generateImports()}
${this.generateIndexNameType()}

${await this.generateKeyType()}
const ajv = new Ajv({
  allErrors: true
});

export class ${this.name} {
  constructor(private readonly client: DocumentClient) {}

  static readonly tableSchema = ${this.generateTableSchema()};

  static get tableName(): string {
    return ${this.name}.tableSchema.TableName;
  }

  static initialize(item: ${this.item.uninitializedTypeName}): ${
      this.item.typeName
    } {
    return {
${this.generateGeneratedPartialMappings()}...item
    }
  }

  private static readonly validator = ajv.compile(${renderValueToString(
    this.item.schema,
    {
      noPrefixIndent: true,
      indentLevelOffset: 1
    }
  )})

  private static readonly partialValidator = ajv.compile(${renderValueToString(
    {
      ...this.item.schema,
      required: []
    },
    {
      noPrefixIndent: true,
      indentLevelOffset: 1
    }
  )})

  static async validate(item: Readonly<${this.item.typeName}>): Promise<void> {
    if (!await ${this.name}.validator(item)) throw new Error(ajv.errorsText());
  }

  static async partialValidate(item: Readonly<Partial<${
    this.item.typeName
  }>>): Promise<void> {
    if (!await ${
      this.name
    }.partialValidator(item)) throw new Error(ajv.errorsText());
  }

  async put(toPut: Readonly<${this.item.uninitializedTypeName}>): Promise<${
      this.item.typeName
    }> {
    const item = <${this.item.typeName}>{
      ...toPut,
      ...${this.name}.initialize(toPut)
    };

    await ${this.name}.validate(item);
    await this.client
      .put({
        TableName: ${this.name}.tableName,
        Item: item
      })
      .promise();

    // The input item is returned because getting new fields on PutItem
    // operation is impossible. DynamoDB only supports 'OLD_VALUES' and
    // 'NONE' for this operation. This would otherwise require a
    // subsequent query.
    return item;
  }

  async get(key: Readonly<${this.keyTypeName}>): Promise<${
      this.item.typeName
    }> {
    const { Item: item } = await this.client
      .get({
        TableName: ${this.name}.tableName,
        Key: key
      })
      .promise();

    if (!item) {
      throw new Error('${this.item.typeName} not found');
    }

    return <${this.item.typeName}>item;
  }

  async delete(key: Readonly<${this.keyTypeName}>): Promise<void> {
    await this.client
      .delete({
        TableName: ${this.name}.tableName,
        Key: key
      })
      .promise();
  }

  async query(): Promise<${this.item.typeName}[]> {
    const result = await this.client
      .query({
        TableName: ${this.name}.tableName
      })
      .promise();

    return <${this.item.typeName}[]>result.Items;
  }

  async update(
    key: Readonly<${this.keyTypeName}>,
    patch: Readonly<Partial<${this.item.typeName}>>
  ): Promise<${this.item.typeName}> {
    await ${this.name}.partialValidate(patch);
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
        TableName: ${this.name}.tableName,
        Key: key,
        AttributeUpdates: attributeUpdates,
        ReturnValues: "ALL_OLD"
      })
      .promise();

    return {
      ...(<${this.item.typeName}>old),
      ...patch
    };
  }
}`;
    context.stageFile(new File(this.generatedFileConfig.outPath, content));
  }
}
