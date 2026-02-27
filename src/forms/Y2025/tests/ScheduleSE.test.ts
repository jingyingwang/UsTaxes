import * as fc from 'fast-check'
import { testKit, commonTests } from '.'

describe('ScheduleSE', () => {
  it('should be needed when Schedule C is needed', async () => {
    await fc.assert(
      testKit.with1040Property(
        (forms): Promise<void> => {
          const f1040 = commonTests.findF1040OrFail(forms)
          if (f1040.scheduleC !== undefined && f1040.scheduleC.isNeeded()) {
            expect(f1040.scheduleSE.isNeeded()).toBe(true)
          }
          return Promise.resolve()
        },
        (info) => info.scheduleCInputs.length > 0
      )
    )
  })

  it('should compute SE tax as zero when net earnings below $400', async () => {
    await fc.assert(
      testKit.with1040Property((forms): Promise<void> => {
        const f1040 = commonTests.findF1040OrFail(forms)
        if (f1040.scheduleSE.isNeeded() && f1040.scheduleSE.l4c() < 400) {
          expect(f1040.scheduleSE.l12()).toBeUndefined()
        }
        return Promise.resolve()
      })
    )
  })

  it('should have deductible half of SE tax less than or equal to SE tax', async () => {
    await fc.assert(
      testKit.with1040Property((forms): Promise<void> => {
        const f1040 = commonTests.findF1040OrFail(forms)
        if (
          f1040.scheduleSE.isNeeded() &&
          f1040.scheduleSE.l12() !== undefined
        ) {
          const seTax = f1040.scheduleSE.l12() ?? 0
          const deductible = f1040.scheduleSE.l13() ?? 0
          expect(deductible).toBeLessThanOrEqual(seTax)
          // l13 should be exactly half of l12
          expect(Math.round(deductible * 100)).toEqual(
            Math.round(seTax * 0.5 * 100)
          )
        }
        return Promise.resolve()
      })
    )
  })
})
