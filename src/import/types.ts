import { Asset, Supported1099 } from 'ustaxes/core/data'
import { Either } from 'ustaxes/core/util'

export interface ImportWarning {
  message: string
  row?: number
}

export interface ImportResult {
  parserId: string
  parserName: string
  f1099s: Supported1099[]
  assets: Asset<Date>[]
  warnings: ImportWarning[]
}

export type ImportParseResult = Either<string[], ImportResult>

export interface CSVParser {
  id: string
  name: string
  description: string
  accepts: (headers: string[]) => boolean
  parse: (contents: string) => ImportParseResult
}
