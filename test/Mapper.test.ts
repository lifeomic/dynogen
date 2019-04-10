import { MapperConfig, Mapper } from '../src';
import { createMockMapperConfig } from './helpers/mapper';
import { createMockItemConfig } from './helpers/item';

interface Fixture {
  title: string;
  config: MapperConfig;
  name: string;
}

const fixtures: Fixture[] = [
  {
    title: 'Generates simple Mapper',
    name: 'UserMapper',
    config: createMockMapperConfig()
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
    })
  }
];

fixtures.forEach(({ title, name, config }) => {
  test(title, async () => {
    const item = new Mapper(name, config);
    const file = await item.generate();
    expect(file).toMatchSnapshot();
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

  await expect(mapper.generate()).rejects.toThrow(
    'Union types are not currently supported as index keys'
  );
});
