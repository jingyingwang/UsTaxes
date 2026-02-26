import { testKit } from '.'
import F1040 from '../irsForms/F1040'
import Form from 'ustaxes/core/irsForms/Form'

jest.setTimeout(40000)

beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation((x: string) => {
    if (!x.includes('Removing XFA form data as pdf-lib')) {
      console.warn(x)
    }
  })
})

const findF1040 = (forms: Form[]): F1040 | undefined =>
  forms.find((f) => f.tag === 'f1040') as F1040 | undefined

describe('F2210', () => {
  it('should never produce a negative penalty', async () => {
    await testKit.with1040Assert((forms): Promise<void> => {
      const f1040 = findF1040(forms)
      expect(f1040).not.toBeUndefined()
      if (f1040 !== undefined) {
        const penalty = f1040.f2210.penalty()
        expect(penalty).toBeGreaterThanOrEqual(0)
      }
      return Promise.resolve()
    })
  })

  it('should not produce penalty when underpayment < $1,000', async () => {
    await testKit.with1040Assert((forms): Promise<void> => {
      const f1040 = findF1040(forms)
      expect(f1040).not.toBeUndefined()
      if (f1040 !== undefined) {
        const f2210 = f1040.f2210
        if (f2210.l8() < 1000) {
          expect(f2210.penalty()).toBe(0)
        }
      }
      return Promise.resolve()
    })
  })

  it('should not produce penalty when total payments >= required annual payment', async () => {
    await testKit.with1040Assert((forms): Promise<void> => {
      const f1040 = findF1040(forms)
      expect(f1040).not.toBeUndefined()
      if (f1040 !== undefined) {
        const f2210 = f1040.f2210
        const totalPayments = f1040.l25d() + f1040.l26()
        if (totalPayments >= f2210.l9()) {
          expect(f2210.penalty()).toBe(0)
        }
      }
      return Promise.resolve()
    })
  })

  it('penalty should not exceed underpayment amount', async () => {
    await testKit.with1040Assert((forms): Promise<void> => {
      const f1040 = findF1040(forms)
      expect(f1040).not.toBeUndefined()
      if (f1040 !== undefined) {
        const f2210 = f1040.f2210
        const penalty = f2210.penalty()
        const underpayment = f2210.l10()
        // Penalty rate is 8%, so penalty should be at most 8% of underpayment
        expect(penalty).toBeLessThanOrEqual(Math.round(underpayment * 0.08) + 1)
      }
      return Promise.resolve()
    })
  })

  it('should only appear in schedules when penalty > 0', async () => {
    await testKit.with1040Assert((forms): Promise<void> => {
      const f1040 = findF1040(forms)
      expect(f1040).not.toBeUndefined()
      if (f1040 !== undefined) {
        const f2210InSchedules = forms.some((f) => f.tag === 'f2210')
        if (f1040.f2210.penalty() === 0) {
          expect(f2210InSchedules).toBe(false)
        }
      }
      return Promise.resolve()
    })
  })

  it('should wire penalty to F1040 line 38', async () => {
    await testKit.with1040Assert((forms): Promise<void> => {
      const f1040 = findF1040(forms)
      expect(f1040).not.toBeUndefined()
      if (f1040 !== undefined) {
        const penalty = f1040.f2210.penalty()
        if (penalty > 0) {
          expect(f1040.l38()).toBe(penalty)
        } else {
          expect(f1040.l38()).toBeUndefined()
        }
      }
      return Promise.resolve()
    })
  })
})
