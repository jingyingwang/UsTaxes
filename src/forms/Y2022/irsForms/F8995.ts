import F1040Attachment from './F1040Attachment'
import { FormTag } from 'ustaxes/core/irsForms/Form'
import { FilingStatus } from 'ustaxes/core/data'
import { Field } from 'ustaxes/core/pdfFiller'
import { buildQbiItems, QbiItem } from 'ustaxes/forms/qbi'

export function getF8995PhaseOutIncome(filingStatus: FilingStatus): number {
  let formAMinAmount = 170050
  if (filingStatus === FilingStatus.MFJ) {
    formAMinAmount = 340100
  }
  return formAMinAmount
}

function ifNumber(
  num: number | undefined,
  f: (num: number) => number | undefined
) {
  return num !== undefined ? f(num) : undefined
}

export default class F8995 extends F1040Attachment {
  tag: FormTag = 'f8995'
  sequenceIndex = 55

  qbiItems = (): QbiItem[] => buildQbiItems(this.f1040.info)
  qbiItemsForForm = (): QbiItem[] => this.qbiItems().slice(0, 5)

  netCapitalGains = (): number => {
    let rtn = this.f1040.l3a() ?? 0
    if (this.f1040.scheduleD.isNeeded()) {
      const l15 = this.f1040.scheduleD.l15()
      const l16 = this.f1040.scheduleD.l16()
      const min = Math.min(l15, l16)
      if (min > 0) rtn += min
    } else {
      rtn += this.f1040.l7() ?? 0
    }
    return rtn
  }

  l2 = (): number | undefined =>
    this.qbiItems().map((item) => item.qbi).reduce((c, a) => c + a, 0)
  l3 = (): number | undefined => undefined
  l4 = (): number | undefined =>
    ifNumber(this.l2(), (num) => num + (this.l3() ?? 0))
  l5 = (): number | undefined => ifNumber(this.l4(), (num) => num * 0.2)

  // TODO: REIT
  l6 = (): number => 0
  l7 = (): number => 0
  l8 = (): number | undefined => ifNumber(this.l6(), (num) => num + this.l7())
  l9 = (): number | undefined => ifNumber(this.l8(), (num) => num * 0.2)

  l10 = (): number | undefined =>
    ifNumber(this.l5(), (num) => num + (this.l9() ?? 0))
  l11 = (): number => this.f1040.l11() - this.f1040.l12()
  l12 = (): number => this.netCapitalGains()
  l13 = (): number => Math.max(0, this.l11() - this.l12())
  l14 = (): number => this.l13() * 0.2
  l15 = (): number => Math.min(this.l10() ?? 0, this.l14())
  l16 = (): number => Math.min(0, (this.l2() ?? 0) + (this.l3() ?? 0))
  l17 = (): number => Math.min(0, this.l6() + this.l7())

  deductions = (): number => this.l15()

  fields = (): Field[] => {
    const items = this.qbiItemsForForm()
    return [
    this.f1040.namesString(),
    this.f1040.info.taxPayer.primaryPerson.ssid,
    items[0]?.name,
    items[0]?.ein,
    items[0]?.qbi,
    items[1]?.name,
    items[1]?.ein,
    items[1]?.qbi,
    items[2]?.name,
    items[2]?.ein,
    items[2]?.qbi,
    items[3]?.name,
    items[3]?.ein,
    items[3]?.qbi,
    items[4]?.name,
    items[4]?.ein,
    items[4]?.qbi,
    this.l2(),
    this.l3(),
    this.l4(),
    this.l5(),
    this.l6(),
    this.l7(),
    this.l8(),
    this.l9(),
    this.l10(),
    this.l11(),
    this.l12(),
    this.l13(),
    this.l14(),
    this.l15(),
    this.l16(),
    this.l17()
  ]
  }
}
