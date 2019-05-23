import { mustConfig } from '../src/config';
import { createMockMapperConfig } from './helpers/mapper';

interface MustConfigFixture {
  title: string;
  value: Object;
  succeeds: boolean;
}

function testMustConfig({ value, succeeds, title }: MustConfigFixture) {
  test(`mustConfig ${succeeds ? 'rejects' : 'resolves'} ${title}`, () => {
    const fn = () => mustConfig(value);
    if (succeeds) {
      return expect(fn()).toEqual(value);
    }
    expect(fn).toThrowError();
  });
}

const mustConfigFixtures: MustConfigFixture[] = [
  {
    title: 'Simple mapper config',
    value: {
      mappers: {
        UserMapper: createMockMapperConfig()
      }
    },
    succeeds: true
  },
  {
    title: 'Invalid mapper config',
    value: {
      mappers: {
        InvalidMapper: {
          notAllowed: true
        }
      }
    },
    succeeds: false
  }
];

mustConfigFixtures.forEach((fixture) => testMustConfig(fixture));
