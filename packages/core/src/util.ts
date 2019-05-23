import * as path from 'path';

/**
 * Determines whether a given module path is either a local
 * /relative path or a node module path ref
 *
 * @param path module path
 */
export function isRelativeOrAbsoluteRequire(path: string) {
  // node module regex
  return !/^[a-z][a-z-_]+((\/)?.+)$/i.test(path);
}

const DEFAULT_MODULE_EXTS = ['.js', '.ts'];

/**
 * Resolve clean path to a module from a given base path.
 *
 * @param from base path
 * @param to module path to resolve
 */
export function resolvePath(from: string, to: string): string {
  if (!isRelativeOrAbsoluteRequire(to)) return to;
  const fromPath = path.parse(path.join(process.cwd(), from)).dir;
  const toPath = path.join(process.cwd(), to);
  const relativePath = path.relative(fromPath, toPath);
  const relativePathMetaData = path.parse(relativePath);
  const inferableExt = DEFAULT_MODULE_EXTS.includes(relativePathMetaData.ext);
  const pathPrefix = relativePathMetaData.dir.length ? '' : './';

  return `${pathPrefix}${
    inferableExt
      ? relativePath.substr(0, relativePath.length - 3)
      : relativePath
  }`;
}

/**
 * Default import syntax:
 * [identifier]
 *  =
 *   [modulePath]
 */
const DEFAULT_IMPORT_SYNTAX = /^[a-z$_][a-z0-9$_]*=[^=]+$/i;

/**
 * Symbol import syntax:
 * [modulePath]
 *  #
 *   [symbol]
 */
const SYMBOL_IMPORT_SYNTAX = /^((?!#).)+#[a-z$_][a-z0-9$_]*$/i;

export interface ModuleBinding {
  type: 'default' | 'symbol';
  relative: boolean;
  modulePath: string;
  binding: string;
}

/**
 * Parses module binding string syntax for configurable imports
 *
 * @param str module binding string
 */
export function parseModuleBindingString(str: string): ModuleBinding {
  if (DEFAULT_IMPORT_SYNTAX.test(str)) {
    const [binding, modulePath] = str.split('=');
    return {
      type: 'default',
      modulePath,
      binding,
      relative: isRelativeOrAbsoluteRequire(modulePath)
    };
  } else if (SYMBOL_IMPORT_SYNTAX.test(str)) {
    const [modulePath, binding] = str.split('#');
    return {
      type: 'symbol',
      modulePath,
      binding,
      relative: isRelativeOrAbsoluteRequire(modulePath)
    };
  } else {
    throw new SyntaxError('Invalid module binding string syntax');
  }
}
