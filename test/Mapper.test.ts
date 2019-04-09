import { MapperConfig, Mapper } from '../src';
import { createContext } from '../src/Context';
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
    const context = createContext();
    const stageSpy = jest.spyOn(context, 'stageFile');
    const item = new Mapper(name, config);
    await item.generate(context);
    expect(stageSpy.mock.calls[1][0].content).toMatchSnapshot();
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
