import { GeneratedFileConfig } from './GeneratedFile';
import {
  compile,
  Options as JSONSchemaToTSOptions
} from 'json-schema-to-typescript';
import { JSONSchema4, JSONSchema4Type } from 'json-schema';
import { ModuleBinding, parseModuleBindingString } from './util';
import { Context } from './Context';
import { File } from './File';

export const DEFAULT_JSON_TO_TS_OPTIONS: Readonly<
  Partial<JSONSchemaToTSOptions>
> = {
  bannerComment: '',
  enableConstEnums: true
};

export interface JSONSchemaNamedObject extends JSONSchema4 {
  name: string;
  type: 'object';
  required?: string[];
  properties: Record<string, JSONSchema4 & { type: JSONSchema4Type }>;
}

export interface ItemConfig extends GeneratedFileConfig {
  schema: JSONSchemaNamedObject;
  defaultProviders?: Record<string, string>;
}

export class Item {
  constructor({
    schema,
    defaultProviders = {},
    ...generatedFileConfig
  }: Readonly<ItemConfig>) {
    this.schema = schema;
    this.generatedFileConfig = generatedFileConfig;
    this.defaultProviders = Object.entries(defaultProviders).reduce(
      (acc, [name, moduleBindingString]) => ({
        ...acc,
        [name]: parseModuleBindingString(moduleBindingString)
      }),
      {}
    );
  }

  readonly schema: JSONSchemaNamedObject;
  readonly generatedFileConfig: GeneratedFileConfig;
  readonly defaultProviders: Record<string, ModuleBinding>;

  get typeName(): string {
    return this.schema.name;
  }

  get uninitializedTypeName(): string {
    return `Uninitialized${this.typeName}`;
  }

  get generatedPartialTypeName(): string {
    return `GeneratedPartial${this.typeName}`;
  }

  get generatedKeys(): string[] {
    return Object.keys(this.defaultProviders);
  }

  resolveKeyType(key: string): JSONSchema4Type {
    const property = this.schema.properties[key];
    if (!property)
      throw new Error(
        `property "${key}" does not exist on schema "${this.typeName}"`
      );

    return property.type;
  }

  async generate(context: Context): Promise<void> {
    const ifaces = await Promise.all([
      this.generateInterface(),
      this.generateUninitializedInterface(),
      this.generateGeneratedPartialInterface()
    ]);
    const content = ifaces.map((s) => s.trim()).join('\n\n');

    context.stageFile(new File(this.generatedFileConfig.outPath, content));
  }

  private generateGeneratedPartialInterface(): Promise<string> {
    if (!Object.keys(this.defaultProviders).length) {
      return Promise.resolve(
        `export type ${this.generatedPartialTypeName} = {};`
      );
    }

    const generatedProperties = Object.entries(this.schema.properties).reduce(
      (acc, [key, schema]) =>
        this.generatedKeys.includes(key)
          ? {
              ...acc,
              [key]: schema
            }
          : acc,
      {}
    );

    return compile(
      {
        type: 'object',
        required: this.generatedKeys,
        properties: generatedProperties,
        additionalItems: false,
        additionalProperties: false
      },
      this.generatedPartialTypeName,
      DEFAULT_JSON_TO_TS_OPTIONS
    );
  }

  private async generateInterface(
    overrides: Partial<JSONSchema4> = {},
    name: string = this.typeName
  ): Promise<string> {
    return compile(
      {
        ...this.schema,
        ...overrides
      },
      name,
      DEFAULT_JSON_TO_TS_OPTIONS
    );
  }

  private generateUninitializedInterface(): Promise<string> {
    if (!Object.keys(this.defaultProviders).length) {
      return Promise.resolve(
        `export type ${this.uninitializedTypeName} = ${this.typeName};`
      );
    }

    const uninitialzedRequirements = this.schema.required
      ? this.schema.required.filter((key) => !this.generatedKeys.includes(key))
      : [];

    return this.generateInterface(
      {
        required: uninitialzedRequirements
      },
      this.uninitializedTypeName
    );
  }
}
