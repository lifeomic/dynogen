import { File } from './File';

export interface Context {
  readonly files: File[];
  stageFile(file: File): void;
}

export function createContext(): Context {
  const files = new Array<File>();
  return {
    files,
    stageFile: (file: File) => files.push(file)
  };
}
