import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import { promisify } from 'util';
import rimraf = require('rimraf');

import { generate } from '../src';
import { createMockMapperConfig } from './helpers/mapper';
import { createMockItemConfig } from './helpers/item';

const rimrafAsync = promisify(rimraf);

async function mkdtemp(prefix: string): Promise<[string, () => Promise<void>]> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  return [dir, async () => rimrafAsync(dir)];
}

test('Generates nothing', async () => {
  const [dir, cleanUp] = await mkdtemp('nothing');
  try {
    await generate({ mappers: {} });

    const files = await fs.readdir(dir);
    expect(files.length).toEqual(0);
  } finally {
    await cleanUp();
  }
});

test('Generate generates files', async () => {
  const [dir, cleanUp] = await mkdtemp('nothing');
  try {
    await generate({
      mappers: {
        UserMapper: createMockMapperConfig({
          outPath: path.join(dir, 'Mapper.ts'),
          item: createMockItemConfig({
            outPath: path.join(dir, 'Item.ts')
          })
        })
      }
    });

    const files = await fs.readdir(dir);
    expect(files).toEqual(['Item.ts', 'Mapper.ts']);
  } finally {
    await cleanUp();
  }
});
