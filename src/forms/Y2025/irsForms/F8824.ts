import { FormTag } from 'ustaxes/core/irsForms/Form'
import { LikeKindExchange } from 'ustaxes/core/data'
import { sumFields } from 'ustaxes/core/irsForms/util'
import F1040Attachment from './F1040Attachment'
import { Field } from 'ustaxes/core/pdfFiller'

// IRS Form 8824: Like-Kind Exchanges (Section 1031)
// Reports like-kind exchanges of business or investment property.
// Gain is deferred and the new property receives a substituted basis.

export default class F8824 extends F1040Attachment {
  tag: FormTag = 'f8824'
  sequenceIndex = 60

  exchanges = (): LikeKindExchange[] => this.f1040.info.likeKindExchanges ?? []

  isNeeded = (): boolean => this.exchanges().length > 0

  // Per-exchange calculations

  recognizedGain = (exchange: LikeKindExchange): number => {
    const realizedGain =
      exchange.fmvReceived -
      exchange.adjustedBasis -
      exchange.bootPaid +
      exchange.bootReceived
    // Recognized gain is the lesser of boot received or realized gain (if positive)
    if (realizedGain <= 0) return 0
    return Math.min(exchange.bootReceived, realizedGain)
  }

  deferredGain = (exchange: LikeKindExchange): number => {
    const realizedGain =
      exchange.fmvReceived -
      exchange.adjustedBasis -
      exchange.bootPaid +
      exchange.bootReceived
    return Math.max(0, realizedGain - this.recognizedGain(exchange))
  }

  newBasis = (exchange: LikeKindExchange): number =>
    exchange.fmvPropertyReceived - this.deferredGain(exchange)

  // Aggregate calculations for Schedule D

  totalRecognizedGain = (): number =>
    sumFields(this.exchanges().map((e) => this.recognizedGain(e)))

  toScheduleD = (): number => this.totalRecognizedGain()

  fields = (): Field[] => []
}
