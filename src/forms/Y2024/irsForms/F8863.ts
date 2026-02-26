import F1040Attachment from './F1040Attachment'
import { Field } from 'ustaxes/core/pdfFiller'
import { FormTag } from 'ustaxes/core/irsForms/Form'
import {
  EducationCreditType,
  F1098t,
  FilingStatus
} from 'ustaxes/core/data'
import { sumFields } from 'ustaxes/core/irsForms/util'

const AOTC_MAX_EXPENSES = 4000
const AOTC_MAX_CREDIT = 2500
const AOTC_REFUNDABLE_RATE = 0.4
const LLC_MAX_EXPENSES = 10000
const LLC_RATE = 0.2

type PhaseoutRange = { start: number; end: number }

const phaseoutRangeForStatus = (
  status: FilingStatus
): PhaseoutRange | undefined => {
  switch (status) {
    case FilingStatus.MFJ:
      return { start: 160000, end: 180000 }
    case FilingStatus.MFS:
      return undefined
    default:
      return { start: 80000, end: 90000 }
  }
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

export default class F8863 extends F1040Attachment {
  tag: FormTag = 'f8863'
  sequenceIndex = 999

  isNeeded = (): boolean => this.f1040.info.f1098ts.length > 0

  educationRecords = (): F1098t[] => this.f1040.info.f1098ts

  taxpayerEligible = (): boolean =>
    !this.f1040.info.taxPayer.primaryPerson.isTaxpayerDependent &&
    this.f1040.info.taxPayer.filingStatus !== FilingStatus.MFS

  magi = (): number =>
    sumFields([
      this.f1040.l11(),
      this.f1040.f2555?.l45(),
      this.f1040.f2555?.l50(),
      this.f1040.f4563?.l15()
    ])

  phaseoutRatio = (): number => {
    const range = phaseoutRangeForStatus(this.f1040.info.taxPayer.filingStatus)
    if (range === undefined) return 1
    if (this.magi() <= range.start) return 0
    if (this.magi() >= range.end) return 1
    return clamp(
      (this.magi() - range.start) / (range.end - range.start),
      0,
      1
    )
  }

  applyPhaseout = (credit: number): number =>
    credit * (1 - this.phaseoutRatio())

  adjustedQualifiedExpenses = (f: F1098t): number => {
    const netScholarships = Math.max(
      0,
      f.scholarshipsOrGrants - f.adjustmentsToScholarships
    )
    const expenses =
      f.paymentsReceived +
      f.additionalQualifiedExpenses -
      netScholarships -
      f.adjustmentsToQualifiedExpenses -
      f.otherTaxFreeAssistance
    return Math.max(0, expenses)
  }

  aotcEligible = (f: F1098t): boolean =>
    f.creditType === EducationCreditType.AOTC &&
    f.atLeastHalfTime &&
    !f.graduateStudent &&
    f.aotcClaimedYears < 4 &&
    !f.felonyDrugConviction

  aotcPerStudent = (f: F1098t): number => {
    if (!this.aotcEligible(f)) return 0
    const qualified = Math.min(this.adjustedQualifiedExpenses(f), AOTC_MAX_EXPENSES)
    const first = Math.min(qualified, 2000)
    const second = Math.min(Math.max(0, qualified - 2000), 2000)
    return Math.min(AOTC_MAX_CREDIT, first + second * 0.25)
  }

  totalAotc = (): number =>
    this.taxpayerEligible()
      ? this.educationRecords().reduce(
          (sum, f) => sum + this.aotcPerStudent(f),
          0
        )
      : 0

  llcQualifiedExpenses = (): number =>
    this.taxpayerEligible()
      ? this.educationRecords()
          .filter((f) => f.creditType === EducationCreditType.LLC)
          .reduce((sum, f) => sum + this.adjustedQualifiedExpenses(f), 0)
      : 0

  totalLlc = (): number =>
    Math.min(this.llcQualifiedExpenses(), LLC_MAX_EXPENSES) * LLC_RATE

  adjustedAotc = (): number => this.applyPhaseout(this.totalAotc())
  adjustedLlc = (): number => this.applyPhaseout(this.totalLlc())

  refundableAotc = (): number => this.adjustedAotc() * AOTC_REFUNDABLE_RATE

  nonrefundableAotc = (): number =>
    Math.max(0, this.adjustedAotc() - this.refundableAotc())

  l8 = (): number => Math.round(this.refundableAotc())

  l19 = (): number =>
    Math.round(Math.max(0, this.nonrefundableAotc() + this.adjustedLlc()))

  fields = (): Field[] => []
}
