import F1040Attachment from './F1040Attachment'
import { CasualtyTheftLoss } from 'ustaxes/core/data'
import { Field } from 'ustaxes/core/pdfFiller'
import { FormTag } from 'ustaxes/core/irsForms/Form'
import { sumFields } from 'ustaxes/core/irsForms/util'

const PERSONAL_EVENT_FLOOR = 100

export default class F4684 extends F1040Attachment {
  tag: FormTag = 'f4684'
  sequenceIndex = 26

  isNeeded = (): boolean => (this.f1040.info.casualtyTheftLosses ?? []).length > 0

  private losses = (): CasualtyTheftLoss[] =>
    this.f1040.info.casualtyTheftLosses ?? []

  private personalEvents = (): CasualtyTheftLoss[] =>
    this.losses().filter((loss) => loss.use === 'Personal')

  private businessOrIncomeEvents = (): CasualtyTheftLoss[] =>
    this.losses().filter((loss) => loss.use !== 'Personal')

  private fmvLoss = (loss: CasualtyTheftLoss): number =>
    Math.max(0, loss.fmvBefore - loss.fmvAfter)

  private baseLoss = (loss: CasualtyTheftLoss): number =>
    Math.min(loss.costOrBasis, this.fmvLoss(loss))

  private lossAfterReimbursement = (loss: CasualtyTheftLoss): number =>
    Math.max(0, this.baseLoss(loss) - loss.reimbursement)

  private gainFromReimbursement = (loss: CasualtyTheftLoss): number =>
    Math.max(0, loss.reimbursement - loss.costOrBasis)

  personalLossBeforeFloors = (): number => {
    const eligible = this.personalEvents().filter(
      (loss) => loss.isFederallyDeclaredDisaster
    )
    return sumFields(eligible.map((loss) => this.lossAfterReimbursement(loss)))
  }

  personalLossAfterEventFloors = (): number => {
    const eligible = this.personalEvents().filter(
      (loss) => loss.isFederallyDeclaredDisaster
    )
    return sumFields(
      eligible.map((loss) =>
        Math.max(0, this.lossAfterReimbursement(loss) - PERSONAL_EVENT_FLOOR)
      )
    )
  }

  personalCasualtyDeduction = (): number => {
    const lossAfterEventFloors = this.personalLossAfterEventFloors()
    const agiFloor = this.f1040.l11() * 0.1
    return Math.max(0, lossAfterEventFloors - agiFloor)
  }

  personalGainTotal = (): number =>
    sumFields(this.personalEvents().map((loss) => this.gainFromReimbursement(loss)))

  businessLossTotal = (): number =>
    sumFields(
      this.businessOrIncomeEvents().map((loss) =>
        this.lossAfterReimbursement(loss)
      )
    )

  businessGainTotal = (): number =>
    sumFields(
      this.businessOrIncomeEvents().map((loss) =>
        this.gainFromReimbursement(loss)
      )
    )

  businessNetGainLoss = (): number =>
    this.businessGainTotal() - this.businessLossTotal()

  toSchedule1Line4 = (): number | undefined => {
    const net = this.businessNetGainLoss() + this.personalGainTotal()
    return net === 0 ? undefined : net
  }

  fields = (): Field[] => []
}
