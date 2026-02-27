import * as fc from 'fast-check'
import { testKit, commonTests } from '.'
import { FilingStatus } from 'ustaxes/core/data'

describe('ScheduleD', () => {
  it('should never pass through more than allowed losses', async () => {
    await fc.assert(
      testKit.with1040Property((forms): Promise<void> => {
        const f1040 = commonTests.findF1040OrFail(forms)
        if (f1040.scheduleD.isNeeded()) {
          expect(Math.round(f1040.l7() ?? 0)).toBeGreaterThanOrEqual(
            -f1040.scheduleD.l21Min()
          )
        }
        return Promise.resolve()
      })
    )
  })

  it('should enforce $3,000 loss limit for non-MFS filers', async () => {
    await fc.assert(
      testKit.with1040Property(
        (forms): Promise<void> => {
          const f1040 = commonTests.findF1040OrFail(forms)
          if (f1040.scheduleD.isNeeded()) {
            const l21 = f1040.scheduleD.l21()
            if (l21 !== undefined) {
              expect(l21).toBeGreaterThanOrEqual(-3000)
            }
          }
          return Promise.resolve()
        },
        (info) => info.taxPayer.filingStatus !== FilingStatus.MFS
      )
    )
  })

  it('should enforce $1,500 loss limit for MFS filers', async () => {
    await fc.assert(
      testKit.with1040Property(
        (forms): Promise<void> => {
          const f1040 = commonTests.findF1040OrFail(forms)
          if (f1040.scheduleD.isNeeded()) {
            const l21 = f1040.scheduleD.l21()
            if (l21 !== undefined) {
              expect(l21).toBeGreaterThanOrEqual(-1500)
            }
          }
          return Promise.resolve()
        },
        (info) => info.taxPayer.filingStatus === FilingStatus.MFS
      )
    )
  })

  it('should correctly net short-term and long-term gains on l16', async () => {
    await fc.assert(
      testKit.with1040Property((forms): Promise<void> => {
        const f1040 = commonTests.findF1040OrFail(forms)
        if (f1040.scheduleD.isNeeded()) {
          const l7 = f1040.scheduleD.l7()
          const l15 = f1040.scheduleD.l15()
          const l16 = f1040.scheduleD.l16()
          // l16 should be exact sum of l7 and l15
          expect(Math.round(l16 * 100)).toEqual(Math.round((l7 + l15) * 100))
        }
        return Promise.resolve()
      })
    )
  })

  it('should have non-negative total loss carryforward', async () => {
    await fc.assert(
      testKit.with1040Property((forms): Promise<void> => {
        const f1040 = commonTests.findF1040OrFail(forms)
        if (f1040.scheduleD.isNeeded()) {
          expect(f1040.scheduleD.lossCarryForward()).toBeGreaterThanOrEqual(0)
        }
        return Promise.resolve()
      })
    )
  })
})
