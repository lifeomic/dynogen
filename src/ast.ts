const INDENT = '  ';

type PrimitiveValue = string | number | boolean | null | undefined;
type Value = PrimitiveValue | Object | any[];

interface RenderOptions {
  indentLevelOffset?: number;
  noPrefixIndent?: boolean;
}

/**
 * Get prefix given an indent offset
 *
 * @param offset indent level
 */
export function getIndentPrefix(offset: number) {
  return INDENT.repeat(offset);
}

function renderObjectToString(object: Object, options: RenderOptions): string {
  const indentOffset = options.indentLevelOffset || 0;
  const innerIndentOffset = indentOffset + 1;
  const indent = getIndentPrefix(indentOffset);
  const innerIndent = getIndentPrefix(innerIndentOffset);
  const prefix = options.noPrefixIndent ? '' : indent;

  const renderedBindings = Object.entries(object)
    .map(([key, value]) => {
      const renderedValue = renderValueToString(value, {
        noPrefixIndent: true,
        indentLevelOffset: innerIndentOffset
      });
      return `${innerIndent}${key}: ${renderedValue}`;
    })
    .join(',\n');
  return `${prefix}{\n${renderedBindings}\n${indent}}`;
}

function renderArrayToString(array: any[], options: RenderOptions): string {
  const indentOffset = options.indentLevelOffset || 0;
  const innerIndentOffset = indentOffset + 1;
  const indent = INDENT.repeat(indentOffset);
  const prefix = options.noPrefixIndent ? '' : indent;

  const renderedElements = array
    .map((el) =>
      renderValueToString(el, {
        indentLevelOffset: innerIndentOffset
      })
    )
    .join(',\n');
  return `${prefix}[\n${renderedElements}\n${indent}]`;
}

/**
 * Renders a native javascript value as a string
 *
 * @param node the value to render
 * @param options render options
 *
 */
export function renderValueToString(
  node: Value,
  options: RenderOptions = {}
): string {
  const indentOffset = options.indentLevelOffset || 0;
  const indent = INDENT.repeat(indentOffset);
  const prefix = options.noPrefixIndent ? '' : indent;

  switch (typeof node) {
    case 'string':
    case 'number':
    case 'boolean':
      return `${prefix}${JSON.stringify(node)}`;
    case 'undefined':
      return `${prefix}undefined`;
    case 'object':
      if (node === null) {
        return `${prefix}null`;
      }

      if (Array.isArray(node)) {
        return renderArrayToString(node, options);
      }
      return renderObjectToString(node, options);
  }
}
