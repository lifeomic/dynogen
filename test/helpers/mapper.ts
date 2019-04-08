import { MapperConfig } from '../../src';
import { createMockItemConfig } from './item';

const DEFAULT_MOCK_MAPPER_CONFIG = <Readonly<MapperConfig>>{
  item: createMockItemConfig(),
  outPath: './Mapper.ts',
  tableName: 'Users',
  hashKey: 'id'
};

export function createMockMapperConfig(
  config: Readonly<Partial<MapperConfig>> = {}
): MapperConfig {
  return {
    ...DEFAULT_MOCK_MAPPER_CONFIG,
    ...config
  };
}
