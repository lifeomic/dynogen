import * as path from 'path';
import * as ejs from 'ejs';
import { JSONSchema4TypeName } from 'json-schema';
import { compile } from 'json-schema-to-typescript';

import { GeneratedFileConfig } from './GeneratedFile';
import { Item, ItemConfig, DEFAULT_JSON_TO_TS_OPTIONS } from './Item';
import { renderValueToString, getIndentPrefix } from './ast';
import { resolvePath } from './util';
import { Context } from './Context';
import { File } from './File';

const MAPPER_TEMPLATE_PATH = path.join(__dirname, 'templates', 'Mapper.ts.ejs');

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

export interface MapperRenderProps {
  name: string;
  tableSchema: string;
  generatedPartialMappings: string;
  itemSchema: string;
  partialItemSchema: string;
  keyTypeDeclaration: string;
  keyTypeName: string;
  itemResolvePath: string;
  defaultProviderImports: string;
  indexNameDeclaration: string;
  item: {
    typeName: string;
    uninitializedTypename: string;
  };
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

    const schemaType = schemaTypeOrTypes as JSONSchema4TypeName;
    return String(dynamoDBIndexableScalarTypeMap.get(schemaType));
  }

  private renderDefaultProviderImports(): string {
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

  private renderGeneratedPartialMappings(): string {
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

  private renderKeyType(): Promise<string> {
    const { indexKeys } = this;
    const indexProperties = Object.entries(this.item.schema.properties).reduce(
      (acc, [key, schema]) =>
        indexKeys.includes(key) ? { ...acc, [key]: schema } : acc,
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

  private renderTableSchema(): string {
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

  private get itemResolvePath(): string {
    return resolvePath(
      this.generatedFileConfig.outPath,
      this.item.generatedFileConfig.outPath
    );
  }

  private get indexKeys(): string[] {
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

  private renderIndexNameType(): string {
    const names = [
      ...this.tableSchema.globalSecondaryIndexes,
      ...this.tableSchema.localSecondaryIndexes
    ].map((index: SecondaryIndex) => index.name);
    if (!names.length) return `type IndexName = never;`;
    return `type IndexName = ${names.map((name) => `"${name}"`).join(' | ')};`;
  }

  private renderItemSchemaValue() {
    return renderValueToString(this.item.schema, {
      noPrefixIndent: true,
      indentLevelOffset: 1
    });
  }

  private renderPartialItemSchemaValue() {
    return renderValueToString(
      {
        ...this.item.schema,
        required: []
      },
      { noPrefixIndent: true, indentLevelOffset: 1 }
    );
  }

  private render(props: MapperRenderProps): Promise<string> {
    return ejs.renderFile(MAPPER_TEMPLATE_PATH, props);
  }

  async generate(context: Context): Promise<void> {
    await this.item.generate(context);
    const content = await this.render({
      name: this.name,
      itemResolvePath: this.itemResolvePath,
      tableSchema: this.renderTableSchema(),
      generatedPartialMappings: this.renderGeneratedPartialMappings(),
      itemSchema: this.renderItemSchemaValue(),
      partialItemSchema: this.renderPartialItemSchemaValue(),
      keyTypeDeclaration: await this.renderKeyType(),
      defaultProviderImports: this.renderDefaultProviderImports(),
      indexNameDeclaration: this.renderIndexNameType(),
      keyTypeName: this.keyTypeName,
      item: {
        typeName: this.item.typeName,
        uninitializedTypename: this.item.uninitializedTypeName
      }
    });
    context.stageFile(new File(this.generatedFileConfig.outPath, content));
  }
}
