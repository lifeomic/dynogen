import { GENERATED_FILE_HEADER_COMMENT } from './constants';

export class File {
  constructor(public readonly path: string, content: string) {
    this.content = `${GENERATED_FILE_HEADER_COMMENT}\n${content}`;
  }

  public readonly content: string;
}
