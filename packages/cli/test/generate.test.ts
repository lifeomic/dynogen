import * as path from 'path';

import * as fs from 'fs-extra';
import { dump } from 'js-yaml';
import { withinTmpdir } from 'with-tmp';

import { DEFAULT_DYNOGEN_CONFIG_PATH } from '../src/constants';
import { generateHandler, GenerateArgs } from '../src/generate';

const MOCK_ARGS: Readonly<GenerateArgs> = {
  config: DEFAULT_DYNOGEN_CONFIG_PATH
};

test('exits when config does not exist', () => {
  return withinTmpdir('panic-when-config-does-not-exist', async () => {
    await expect(generateHandler(MOCK_ARGS)).rejects.toThrowError(
      `config file "${DEFAULT_DYNOGEN_CONFIG_PATH}" does not exist`
    );
  });
});

test('throws when error reading file', () => {
  return withinTmpdir('panic-when-fail-to-read-config', async (dir) => {
    // dynogen config write with root r/w perm
    await fs.writeFile(path.join(dir, DEFAULT_DYNOGEN_CONFIG_PATH), '', {
      mode: 0
    });
    await expect(generateHandler(MOCK_ARGS)).rejects.toThrowError();
  });
});

test('throws when config is invalid', () => {
  return withinTmpdir('panic-when-config-invalid', async (dir) => {
    const content = dump({ invalid: true });
    await fs.writeFile(path.join(dir, DEFAULT_DYNOGEN_CONFIG_PATH), content);
    await expect(generateHandler(MOCK_ARGS)).rejects.toThrowError();
  });
});
