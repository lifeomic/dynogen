import { Config } from './config';
import { Mapper } from './Mapper';
import * as fs from 'fs-extra';
import { File } from './File';
import { flatten } from 'lodash';

export async function generateFiles(config: Readonly<Config>): Promise<File[]> {
  const mappers = Object.entries(config.mappers).map(
    ([name, config]) => new Mapper(name, config)
  );

  const files = await Promise.all(mappers.map((mapper) => mapper.generate()));
  return flatten(files);
}

export async function generate(config: Readonly<Config>): Promise<void> {
  const files = await generateFiles(config);
  await Promise.all(
    files.map((file: File) => fs.writeFile(file.path, file.content))
  );
}
