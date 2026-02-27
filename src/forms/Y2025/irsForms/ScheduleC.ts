import F1040Attachment from './F1040Attachment'
import { Field } from 'ustaxes/core/pdfFiller'
import { FormTag } from 'ustaxes/core/irsForms/Form'

/**
 * Schedule C — Profit or Loss From Business (Sole Proprietorship)
 *
 * Partially implemented. Lines 1 and 31 are stubs for downstream consumers
 * (Schedule 8812, Schedule SE). Line 30 integrates Form 8829 home office
 * deduction when available.
 */
export default class ScheduleC extends F1040Attachment {
  tag: FormTag = 'f1040sc'
  sequenceIndex = 9

  // TODO: statutory employee income
  // shown on Schedule 8812, earned income
  l1 = (): number | undefined => undefined

  // Line 30: Business use of home (from Form 8829)
  l30 = (): number | undefined => this.f1040.f8829?.deduction()

  // TODO: net profit or loss
  // shown on Schedule 8812, earned income
  l31 = (): number | undefined => undefined

  fields = (): Field[] => []
}
