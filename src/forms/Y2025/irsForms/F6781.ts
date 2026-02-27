import { FormTag } from 'ustaxes/core/irsForms/Form'
import { Form6781Input, Section1256Contract } from 'ustaxes/core/data'
import { sumFields } from 'ustaxes/core/irsForms/util'
import F1040Attachment from './F1040Attachment'
import { Field } from 'ustaxes/core/pdfFiller'

// IRS Form 6781: Gains and Losses From Section 1256 Contracts and Straddles
// Section 1256 contracts are subject to mark-to-market treatment and the
// 60/40 rule: 60% of gains/losses are treated as long-term, 40% as short-term,
// regardless of actual holding period.

const NUM_CONTRACT_LINES = 10

type ContractLine = [string, number] | [undefined, undefined]

const emptyContractLine: ContractLine = [undefined, undefined]

const toContractLine = (contract: Section1256Contract): ContractLine => [
  contract.description,
  contract.gainOrLoss
]

const padUntil = <A, B>(xs: A[], v: B, n: number): (A | B)[] => {
  if (xs.length >= n) {
    return xs.slice(0, n)
  }
  return [...xs, ...Array.from(Array(n - xs.length)).map(() => v)]
}

export default class F6781 extends F1040Attachment {
  tag: FormTag = 'f6781'
  sequenceIndex = 39

  allInputs = (): Form6781Input[] => this.f1040.info.form6781

  allContracts = (): Section1256Contract[] =>
    this.allInputs().flatMap((input) => input.section1256Contracts)

  isNeeded = (): boolean => this.allContracts().length > 0

  contractLines = (): ContractLine[] =>
    padUntil(
      this.allContracts().map((c) => toContractLine(c)),
      emptyContractLine,
      NUM_CONTRACT_LINES
    )

  // Part I: Section 1256 Contracts Marked to Market

  // Line 2: Sum of all gains/losses from line 1
  l2 = (): number =>
    this.allContracts().reduce((sum, c) => sum + c.gainOrLoss, 0)

  // Line 3: Net gain or loss from straddles (Part II)
  // Not implemented - straddles require Part II which is complex
  l3 = (): number | undefined => undefined

  // Line 4: Combine lines 2 and 3
  l4 = (): number => sumFields([this.l2(), this.l3()])

  // Line 5: Net section 1256 contracts loss election
  // Only applicable if line 4 is a loss and taxpayer elects to carry back
  l5 = (): number =>
    this.allInputs().reduce(
      (sum, input) => sum + input.netSectionLossElection,
      0
    )

  // Line 6: Line 4 minus line 5
  l6 = (): number => this.l4() - this.l5()

  // Line 7: 40% of line 6 - short-term capital gain or loss
  l7 = (): number => Math.round(this.l6() * 0.4)

  // Line 8: 60% of line 6 - long-term capital gain or loss
  l8 = (): number => Math.round(this.l6() * 0.6)

  // These feed into Schedule D:
  // l7 -> Schedule D line 4 (short-term)
  // l8 -> Schedule D line 11 (long-term)
  shortTermGainOrLoss = (): number => this.l7()
  longTermGainOrLoss = (): number => this.l8()

  fields = (): Field[] => [
    this.f1040.namesString(),
    this.f1040.info.taxPayer.primaryPerson.ssid,
    // Mixed straddle election checkboxes (Part I header)
    false, // (a) mixed straddle account election
    false, // (b) straddle-by-straddle identification election
    false, // (c) mixed straddle election
    false, // (d) net section 1256 contracts loss election
    // Line 1: Contract details (description, gain/loss) x NUM_CONTRACT_LINES
    ...this.contractLines().flat(),
    // Line 2: Total
    this.l2(),
    // Line 3: Straddles
    this.l3(),
    // Line 4: Combined
    this.l4(),
    // Line 5: Loss election
    this.l5() || undefined,
    // Line 6: Net
    this.l6(),
    // Line 7: 40% short-term
    this.l7(),
    // Line 8: 60% long-term
    this.l8()
  ]
}
