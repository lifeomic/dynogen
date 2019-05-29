import * as fs from 'fs-extra';
import * as yaml from 'js-yaml';

import { mustConfig, generate } from '@dynogen/core';

export interface GenerateArgs {
  readonly config: string;
}

async function getConfig(path: string) {
  try {
    const rawConfig = await fs.readFile(path, 'utf8');
    const config = yaml.load(rawConfig);
    return mustConfig(config);
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(`config file "${path}" does not exist`);
    }
    throw err;
  }
}

export async function generateHandler({
  config: configPath
}: Readonly<GenerateArgs>) {
  const config = await getConfig(configPath);
  return generate(config);
}
