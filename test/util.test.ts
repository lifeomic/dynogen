import {
  isRelativeOrAbsoluteRequire,
  resolvePath,
  parseModuleBindingString
} from '../src/util';

afterEach(() => {
  jest.clearAllMocks();
});

describe('isRelativeOrAbsoluteRequire', () => {
  const fixtures = [
    {
      path: 'uuid/v4',
      expected: false
    },
    {
      path: './relative/path/to/local/module.js',
      expected: true
    },
    {
      path: '/absolute/path/to/module.ts',
      expected: true
    },
    {
      path: 'react',
      expected: false
    },
    {
      path: 'C:\\random\\windows\\module\\path',
      expected: true
    }
  ];

  fixtures.forEach(({ path, expected }) => {
    test(`isRelativeOrAbsoluteRequire('${path}') should yeild ${expected}`, () => {
      expect(isRelativeOrAbsoluteRequire(path)).toEqual(expected);
    });
  });
});

describe('resolvePath', () => {
  const fixtures = [
    {
      from: './some/directory',
      to: '../foo',
      expected: '../../foo',
      base: '/home/workspace/code/some-module'
    },
    {
      from: './some/file',
      to: 'some-node-module',
      expected: 'some-node-module'
    },
    {
      from: './some/module/foo.ts',
      to: './some/other/module/bar.ts',
      expected: '../other/module/bar'
    },
    {
      from: './foo.ts',
      to: './bar.ts',
      expected: './bar'
    }
  ];

  fixtures.forEach(({ from, to, expected, base }) => {
    test(`relative path from ${from} to ${to} with base ${base} should yeild ${expected}`, () => {
      if (base) {
        jest.spyOn(process, 'cwd').mockImplementation(() => base);
      }

      expect(resolvePath(from, to)).toEqual(expected);
    });
  });
});

describe('parseModuleBindingString', () => {
  const fixtures = [
    {
      title: 'parses as default module binding',
      input: 'uuid=uuid/v4',
      expected: {
        type: 'default',
        modulePath: 'uuid/v4',
        binding: 'uuid'
      }
    },
    {
      title: 'parses as symbol module binding',
      input: 'aws-sdk/clients/dynamodb#DocumentClient',
      expected: {
        type: 'symbol',
        modulePath: 'aws-sdk/clients/dynamodb',
        binding: 'DocumentClient'
      }
    }
  ];

  test('throws error when obviously does not match syntax', () => {
    expect(() => parseModuleBindingString('invalid')).toThrowError();
  });

  fixtures.forEach(({ title, input, expected }) => {
    test(title, () => {
      expect(parseModuleBindingString(input)).toMatchObject(expected);
    });
  });
});
