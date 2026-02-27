import * as fc from 'fast-check'
import { testKit, commonTests } from '.'

describe('ScheduleC', () => {
  it('should compute net profit as income minus expenses', async () => {
    await fc.assert(
      testKit.with1040Property(
        (forms): Promise<void> => {
          const f1040 = commonTests.findF1040OrFail(forms)
          if (
            f1040.scheduleC !== undefined &&
            f1040.scheduleC.isNeeded() &&
            f1040.scheduleC.input() !== undefined
          ) {
            const grossProfit = f1040.scheduleC.l7() ?? 0
            const totalExpenses = f1040.scheduleC.l28() ?? 0
            const netProfit = f1040.scheduleC.l31() ?? 0
            // Net profit = gross profit - total expenses
            expect(Math.round(netProfit * 100)).toEqual(
              Math.round((grossProfit - totalExpenses) * 100)
            )
          }
          return Promise.resolve()
        },
        (info) => info.scheduleCInputs.length > 0
      )
    )
  })

  it('should be needed when scheduleCInputs are present', async () => {
    await fc.assert(
      testKit.with1040Property(
        (forms): Promise<void> => {
          const f1040 = commonTests.findF1040OrFail(forms)
          if (f1040.scheduleC !== undefined) {
            expect(f1040.scheduleC.isNeeded()).toBe(true)
          }
          return Promise.resolve()
        },
        (info) => info.scheduleCInputs.length > 0
      )
    )
  })
})
