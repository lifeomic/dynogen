import { ItemConfig } from '../../src';

const DEFAULT_MOCK_ITEM_CONFIG = <Readonly<ItemConfig>>{
  outPath: './User.ts',
  schema: {
    additionalProperties: false,
    name: 'User',
    type: 'object',
    required: ['id', 'login'],
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
};

export function createMockItemConfig(
  config: Readonly<Partial<ItemConfig>> = {}
): ItemConfig {
  return {
    ...DEFAULT_MOCK_ITEM_CONFIG,
    ...config
  };
}
