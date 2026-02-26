import Form, { FormTag } from 'ustaxes/core/irsForms/Form'
import { Field } from 'ustaxes/core/pdfFiller'

export interface LikeKindExchangeInput {
  fmvReceived?: number
  adjustedBasis?: number
  bootPaid?: number
  bootReceived?: number
  fmvPropertyReceived?: number
}

// Like-kind exchange under Section 1031.
export default class F8824 extends Form {
  tag: FormTag = 'f8824'
  sequenceIndex = 999

  exchange: LikeKindExchangeInput

  constructor(exchange: LikeKindExchangeInput) {
    super()
    this.exchange = exchange
  }

  fmvReceived = (): number | undefined => this.exchange.fmvReceived
  adjustedBasis = (): number | undefined => this.exchange.adjustedBasis
  bootPaid = (): number | undefined => this.exchange.bootPaid
  bootReceived = (): number | undefined => this.exchange.bootReceived
  fmvPropertyReceived = (): number | undefined =>
    this.exchange.fmvPropertyReceived

  deferredGain = (): number | undefined => {
    const fmvReceived = this.fmvReceived()
    const adjustedBasis = this.adjustedBasis()
    if (fmvReceived === undefined || adjustedBasis === undefined) {
      return undefined
    }
    const bootPaid = this.bootPaid() ?? 0
    const bootReceived = this.bootReceived() ?? 0
    return fmvReceived - adjustedBasis - bootPaid + bootReceived
  }

  newBasis = (): number | undefined => {
    const fmvPropertyReceived = this.fmvPropertyReceived()
    const deferredGain = this.deferredGain()
    if (fmvPropertyReceived === undefined || deferredGain === undefined) {
      return undefined
    }
    return fmvPropertyReceived - deferredGain
  }

  fields = (): Field[] => []
}
