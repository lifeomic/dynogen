import { renderValueToString } from '../src/AST';

test('renderToString can render simple object', () => {
  const result = renderValueToString({
    str: 'string',
    num: 4,
    bool: true,
    undefined: undefined,
    null: null
  });

  expect(result).toEqual(`{
  str: "string",
  num: 4,
  bool: true,
  undefined: undefined,
  null: null
}`);
});

test('renderToString can render a nested object', () => {
  const result = renderValueToString({
    nestedObject: {
      nested: true
    }
  });

  expect(result).toEqual(`{
  nestedObject: {
    nested: true
  }
}`);
});

test('renderToString can render a simple array', () => {
  const result = renderValueToString([5, 'str', true, undefined, null]);
  expect(result).toEqual(`[
  5,
  "str",
  true,
  undefined,
  null
]`);
});

test('renderToString can render a nested array', () => {
  const result = renderValueToString([[{ nested: true }]]);

  expect(result).toEqual(`[
  [
    {
      nested: true
    }
  ]
]`);
});
