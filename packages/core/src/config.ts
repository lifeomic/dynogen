import * as joi from '@hapi/joi';

import { MapperConfig, MapperConfigSchema } from './Mapper';

export interface Config {
  mappers: Record<string, MapperConfig>;
}

export const ConfigSchema = joi.object({
  mappers: joi.object().pattern(joi.string(), MapperConfigSchema)
});

export function mustConfig(object: Object): Config {
  joi.assert(object, ConfigSchema, 'Invalid config');
  return object as Config;
}
