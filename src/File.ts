import { GENERATED_FILE_HEADER_COMMENT } from './constants';

export class File {
  constructor(public path: string, content: string) {
    this.content = `${GENERATED_FILE_HEADER_COMMENT}\n${content}`;
  }

  public content: string;
}
