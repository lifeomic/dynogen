import { Config } from './config';
import { Mapper } from './Mapper';
import { createContext } from './Context';
import * as fs from 'fs-extra';
import { File } from './File';

export async function generateFiles(config: Readonly<Config>): Promise<File[]> {
  const context = createContext();
  const mappers = Object.entries(config.mappers).map(
    ([name, config]) => new Mapper(name, config)
  );

  await Promise.all(mappers.map((mapper) => mapper.generate(context)));
  return context.files;
}

export async function generate(config: Readonly<Config>): Promise<void> {
  const files = await generateFiles(config);
  await Promise.all(
    files.map((file: File) => fs.writeFile(file.path, file.content))
  );
}
