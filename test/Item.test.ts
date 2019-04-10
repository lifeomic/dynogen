import { ItemConfig, Item, File } from '../src';
import { createMockItemConfig } from './helpers/item';

interface Fixture {
  title: string;
  config: ItemConfig;
  expected: string;
}

const fixtures: Fixture[] = [
  {
    title: 'Generates simple item from config',
    config: createMockItemConfig(),
    expected: `export interface User {
  id: string;
  name?: string;
  login: string;
}

export type UninitializedUser = User;

export type GeneratedPartialUser = {};`
  },
  {
    title: 'Generates item with no required properties',
    config: createMockItemConfig({
      defaultProviders: {
        id: 'uuid=uuid/v4'
      },
      schema: {
        name: 'User',
        type: 'object',
        properties: {
          id: {
            type: 'string'
          },
          name: {
            type: 'string'
          },
          login: {
            type: 'string'
          }
        }
      }
    }),
    expected: `export interface User {
  id?: string;
  name?: string;
  login?: string;
  [k: string]: any;
}

export interface UninitializedUser {
  id?: string;
  name?: string;
  login?: string;
  [k: string]: any;
}

export interface GeneratedPartialUser {
  id: string;
}`
  },
  {
    title: 'Generates item from config with default providers',
    config: createMockItemConfig({
      defaultProviders: {
        id: 'uuid=uuid/v4',
        login: './utils#randomLoginGenerator'
      }
    }),
    expected: `export interface User {
  id: string;
  name?: string;
  login: string;
}

export interface UninitializedUser {
  id?: string;
  name?: string;
  login?: string;
}

export interface GeneratedPartialUser {
  id: string;
  login: string;
}`
  }
];

fixtures.forEach(({ title, config, expected }) => {
  test(title, async () => {
    const item = new Item(config);
    const file = await item.generate();
    expect(file).toEqual(new File(config.outPath, expected));
  });
});

describe('resolveKeyType', () => {
  test("resolves key's scalar type", () => {
    const item = new Item(createMockItemConfig());
    expect(item.resolveKeyType('id')).toBe('string');
  });

  test('throws error when trying to resolve type for a non existent key', () => {
    const item = new Item(createMockItemConfig());
    expect(() => item.resolveKeyType('doesNotExist')).toThrowError(
      'property "doesNotExist" does not exist on schema "User"'
    );
  });
});
