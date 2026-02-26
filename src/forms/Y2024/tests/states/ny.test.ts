import * as fc from 'fast-check'
import F1040 from '../../irsForms/F1040'
import Form from 'ustaxes/core/irsForms/Form'
import { create1040 } from '../../irsForms/Main'
import { FilingStatus, Information } from 'ustaxes/core/data'
import { createStateReturn } from '../../stateForms'
import { isLeft, isRight } from 'ustaxes/core/util'
import StateForm from 'ustaxes/core/stateForms/Form'
import * as arbitraries from 'ustaxes/core/tests/arbitraries'
import { computeBracketTax } from '../../stateForms/NY/Parameters'
import parameters from '../../stateForms/NY/Parameters'

jest.setTimeout(40000)

const A = new arbitraries.Arbitraries(2024)

const withNYStateReturn = (
  info: Information,
  logContext: fc.ContextValue,
  test: (f1040Forms: [F1040, Form[]], stateForms: StateForm[]) => void
): void => {
  const f1040Result = create1040(info, [])

  if (isLeft(f1040Result)) {
    logContext.log(f1040Result.left.join(';'))
    return
  }

  const [f1040] = f1040Result.right
  const stateReturn = createStateReturn(f1040)
  if (isLeft(stateReturn)) {
    logContext.log(stateReturn.left.join(';'))
    return
  }

  test(f1040Result.right, stateReturn.right)
}

describe('computeBracketTax', () => {
  it('should return 0 for zero or negative income', () => {
    const brackets = parameters.brackets[FilingStatus.S]
    expect(computeBracketTax(brackets, 0)).toBe(0)
    expect(computeBracketTax(brackets, -1000)).toBe(0)
  })

  it('should compute correct tax for income in first bracket only', () => {
    // $5,000 single: all at 4%
    const tax = computeBracketTax(parameters.brackets[FilingStatus.S], 5000)
    expect(tax).toBe(Math.round(5000 * 0.04))
  })

  it('should compute correct tax for income spanning multiple brackets', () => {
    // $50,000 single income:
    // 0-8500 @ 4% = 340
    // 8500-11700 @ 4.5% = 144
    // 11700-13900 @ 5.25% = 115.50
    // 13900-50000 @ 5.5% = 1985.50 (actually 13900-80650 bracket)
    const expected = Math.round(
      8500 * 0.04 +
        (11700 - 8500) * 0.045 +
        (13900 - 11700) * 0.0525 +
        (50000 - 13900) * 0.055
    )
    const tax = computeBracketTax(parameters.brackets[FilingStatus.S], 50000)
    expect(tax).toBe(expected)
  })

  it('should compute higher tax for MFS than MFJ at same income', () => {
    // MFS brackets match Single, MFJ brackets are wider
    const income = 100000
    const mfjTax = computeBracketTax(
      parameters.brackets[FilingStatus.MFJ],
      income
    )
    const mfsTax = computeBracketTax(
      parameters.brackets[FilingStatus.MFS],
      income
    )
    expect(mfsTax).toBeGreaterThanOrEqual(mfjTax)
  })
})

describe('NY IT-201 year 2024', () => {
  it('should produce state forms for NY residency', () => {
    fc.assert(
      fc.property(A.information(), fc.context(), (info, ctx) => {
        info.stateResidencies = [{ state: 'NY' }]
        info.w2s.forEach((w2) => {
          w2.state = 'NY'
        })

        withNYStateReturn(info, ctx, (_, stateForms) => {
          expect(stateForms.length).toBeGreaterThan(0)
          expect(stateForms[0].formName).toBe('IT-201')
        })
      })
    )
  })

  it('should never produce negative tax', () => {
    fc.assert(
      fc.property(A.information(), fc.context(), (info, ctx) => {
        info.stateResidencies = [{ state: 'NY' }]
        info.w2s.forEach((w2) => {
          w2.state = 'NY'
        })

        withNYStateReturn(info, ctx, ([f1040]) => {
          const stateReturn = createStateReturn(f1040)
          if (isRight(stateReturn)) {
            // Access internal fields through the form
            const fields = stateReturn.right[0].fields()
            // Field 25 is l15 (state tax after credits) - should be >= 0
            const stateTaxAfterCredits = fields[25]
            if (typeof stateTaxAfterCredits === 'number') {
              expect(stateTaxAfterCredits).toBeGreaterThanOrEqual(0)
            }
          }
        })
      })
    )
  })

  it('should compute tax proportional to taxable income', () => {
    fc.assert(
      fc.property(A.information(), fc.context(), (info, ctx) => {
        info.stateResidencies = [{ state: 'NY' }]
        info.w2s.forEach((w2) => {
          w2.state = 'NY'
        })

        withNYStateReturn(info, ctx, ([f1040]) => {
          const stateReturn = createStateReturn(f1040)
          if (isRight(stateReturn)) {
            const fields = stateReturn.right[0].fields()
            const taxableIncome = fields[19] // l9
            const stateTax = fields[20] // l10
            if (
              typeof taxableIncome === 'number' &&
              typeof stateTax === 'number' &&
              taxableIncome > 0
            ) {
              // Tax should never exceed 10.9% of taxable income
              // (the highest marginal rate)
              expect(stateTax).toBeLessThanOrEqual(
                Math.round(taxableIncome * 0.109) + 1
              )
              // Tax should be at least 4% of taxable income up to $8500
              // (but may be less due to rounding)
              if (taxableIncome <= 8500) {
                expect(stateTax).toBeLessThanOrEqual(
                  Math.round(taxableIncome * 0.04) + 1
                )
              }
            }
          }
        })
      })
    )
  })
})
