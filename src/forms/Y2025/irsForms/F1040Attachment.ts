import Form from 'ustaxes/core/irsForms/Form'
import { Information } from 'ustaxes/core/data'

export interface F1040Like {
  info: Information
}

abstract class F1040Attachment extends Form {
  f1040: F1040Like

  constructor(f1040: F1040Like) {
    super()
    this.f1040 = f1040
  }

  isNeeded = (): boolean => true
  copies = (): F1040Attachment[] => []
}

export abstract class Worksheet {
  f1040: F1040Like

  constructor(f1040: F1040Like) {
    this.f1040 = f1040
  }
}

export default F1040Attachment
