import * as joi from '@hapi/joi';

export interface GeneratedFileConfig {
  readonly outPath: string;
  readonly overwrite?: boolean;
}

export const GeneratedFileConfigSchema = joi.object({
  outPath: joi.string().required(),
  overwrite: joi.bool()
});
