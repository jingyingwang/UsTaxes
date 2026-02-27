import { FilingStatus } from 'ustaxes/core/data'
import { sumFields } from 'ustaxes/core/irsForms/util'
import { MatrixRow } from './ScheduleE'
import F1040Attachment from './F1040Attachment'
import { Field } from 'ustaxes/core/pdfFiller'

/**
 * Form 8582 - Passive Activity Loss Limitations
 *
 * Implements the $25,000 special allowance for rental real estate activities
 * with active participation. The allowance phases out by 50% of the amount
 * by which modified AGI exceeds $100,000, fully phased out at $150,000.
 *
 * For MFS taxpayers who lived with spouse at any time during the year,
 * the allowance is $0. For MFS who lived apart all year, the allowance
 * is $12,500 and phases out starting at $50,000 MAGI.
 */
export default class F8582 extends F1040Attachment {
  tag = 'f8582'
  sequenceIndex = 88

  isNeeded = (): boolean => this.totalPassiveLoss() < 0

  /**
   * Modified Adjusted Gross Income for passive activity loss purposes.
   * Computed from non-passive income sources to avoid circular dependency
   * (F8582 -> F1040.l11 -> Schedule1 -> ScheduleE -> F8582).
   */
  modifiedAGI = (): number => {
    const w2Income = this.f1040.info.w2s.reduce((t, w) => t + w.income, 0)
    const interestIncome = this.f1040.scheduleB.to1040l2b() ?? 0
    const dividendIncome = this.f1040.scheduleB.to1040l3b() ?? 0
    return w2Income + interestIncome + dividendIncome
  }

  /**
   * Total passive income from rental real estate (positive amounts from Sch E)
   */
  totalPassiveIncome = (): number => {
    const rentalNet = this.f1040.scheduleE.rentalNet()
    const rentalIncome = rentalNet
      .filter((v): v is number => v !== undefined && v > 0)
      .reduce((a, b) => a + b, 0)

    // Passive K-1 income
    const k1PassiveIncome = sumFields([this.f1040.scheduleE.l29ah()])

    return rentalIncome + k1PassiveIncome
  }

  /**
   * Total passive losses from rental real estate and passive K-1s (negative)
   */
  totalPassiveLoss = (): number => {
    const rentalNet = this.f1040.scheduleE.rentalNet()
    const rentalLoss = rentalNet
      .filter((v): v is number => v !== undefined && v < 0)
      .reduce((a, b) => a + b, 0)

    // Passive K-1 losses
    const k1PassiveLoss = sumFields([this.f1040.scheduleE.l29bg()])

    return rentalLoss + k1PassiveLoss
  }

  /**
   * Part I, Line 1a: Rental real estate activities with active participation
   * (losses as positive number)
   */
  l1a = (): number => {
    const rentalNet = this.f1040.scheduleE.rentalNet()
    return Math.abs(
      rentalNet
        .filter((v): v is number => v !== undefined && v < 0)
        .reduce((a, b) => a + b, 0)
    )
  }

  /**
   * Part I, Line 1b: Rental real estate activities with active participation
   * (income)
   */
  l1b = (): number => {
    const rentalNet = this.f1040.scheduleE.rentalNet()
    return rentalNet
      .filter((v): v is number => v !== undefined && v > 0)
      .reduce((a, b) => a + b, 0)
  }

  /**
   * Part I, Line 1c: Combine 1a and 1b
   */
  l1c = (): number => this.l1b() - this.l1a()

  /**
   * Part I, Line 3a: All other passive activities (losses) - K-1 passive
   */
  l3a = (): number =>
    Math.abs(Math.min(0, sumFields([this.f1040.scheduleE.l29bg()])))

  /**
   * Part I, Line 3b: All other passive activities (income) - K-1 passive
   */
  l3b = (): number => Math.max(0, sumFields([this.f1040.scheduleE.l29ah()]))

  /**
   * Part I, Line 3c: Combine 3a and 3b
   */
  l3c = (): number => this.l3b() - this.l3a()

  /**
   * Part I, Line 4: Combine lines 1c and 3c.
   * If positive or zero, all losses are allowed (no limitation).
   */
  l4 = (): number => this.l1c() + this.l3c()

  /**
   * Part II - Special Allowance for Rental Real Estate Activities
   * With Active Participation
   *
   * Line 5: Enter the smaller of the loss on line 1c or the loss on line 4.
   * (As a positive number)
   */
  l5 = (): number => {
    if (this.l4() >= 0) return 0
    return Math.min(Math.abs(this.l1c()), Math.abs(this.l4()))
  }

  /**
   * Line 7: Maximum special allowance based on filing status
   */
  l7 = (): number => {
    const fs = this.f1040.info.taxPayer.filingStatus
    if (fs === FilingStatus.MFS) {
      // MFS who lived apart all year get $12,500
      // MFS who lived with spouse get $0
      // We assume lived with spouse (conservative); user would need
      // to indicate they lived apart via a question
      const livedApart =
        this.f1040.info.questions.LIVE_APART_FROM_SPOUSE ?? false
      return livedApart ? 12500 : 0
    }
    return 25000
  }

  /**
   * Line 8: Modified AGI (without passive losses)
   */
  l8 = (): number => this.modifiedAGI()

  /**
   * Line 9: Phase-out threshold
   * $100,000 for most filers, $50,000 for MFS who lived apart
   */
  l9 = (): number => {
    const fs = this.f1040.info.taxPayer.filingStatus
    if (fs === FilingStatus.MFS) {
      const livedApart =
        this.f1040.info.questions.LIVE_APART_FROM_SPOUSE ?? false
      return livedApart ? 50000 : 0
    }
    return 100000
  }

  /**
   * Line 10: Subtract line 9 from line 8. If zero or less, enter 0.
   */
  l10 = (): number => Math.max(0, this.l8() - this.l9())

  /**
   * Line 11: Multiply line 10 by 50% (.50)
   */
  l11 = (): number => this.l10() * 0.5

  /**
   * Line 12: Subtract line 11 from line 7. If zero or less, enter 0.
   * This is the maximum deductible rental real estate loss.
   */
  l12 = (): number => Math.max(0, this.l7() - this.l11())

  /**
   * Line 13: Smaller of line 5 or line 12.
   * This is the deductible loss from rental real estate with active participation.
   */
  l13 = (): number => Math.min(this.l5(), this.l12())

  /**
   * Part III, Line 16: Total losses allowed.
   * Line 4 net loss + line 13 special allowance adjustment.
   * The total deductible passive loss.
   */
  totalAllowedLoss = (): number => {
    if (this.l4() >= 0) {
      // All passive income exceeds losses, everything allowed
      return Math.abs(this.totalPassiveLoss())
    }
    // Allowed = passive income offset + special allowance
    return this.totalPassiveIncome() + this.l13()
  }

  /**
   * Returns the deductible rental real estate loss for each property column
   * after applying passive activity loss limitations.
   *
   * This is called by Schedule E line 22.
   */
  deductibleRealEstateLossAfterLimitation = (): MatrixRow => {
    const rentalNet = this.f1040.scheduleE.rentalNet()
    const totalRentalLoss = rentalNet
      .filter((v): v is number => v !== undefined && v < 0)
      .reduce((a, b) => a + b, 0)

    if (totalRentalLoss >= 0) {
      // No losses to limit
      return [undefined, undefined, undefined]
    }

    // Determine how much of the rental loss is allowed
    const maxAllowed = this.totalAllowedLoss()
    const totalLossAbs = Math.abs(totalRentalLoss)

    // Ratio of allowed loss to total loss (capped at 1.0)
    const ratio = Math.min(1, maxAllowed / totalLossAbs)

    return rentalNet.map((v) => {
      if (v === undefined || v >= 0) {
        return undefined
      }
      // Proportionally allocate the allowed loss
      return Math.round(v * ratio)
    }) as MatrixRow
  }

  fields = (): Field[] => []
}
