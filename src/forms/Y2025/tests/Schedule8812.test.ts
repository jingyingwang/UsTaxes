import { commonTests } from '.'
import Schedule8812 from '../irsForms/Schedule8812'
import F1040 from '../irsForms/F1040'

const withSchedule8812 = async (
  f: (f1040: F1040, s8812: Schedule8812) => void
): Promise<void> =>
  await commonTests.withValid1040(
    (f1040: F1040): void => {
      if (f1040.schedule8812.isNeeded()) {
        f(f1040, f1040.schedule8812)
      }
    },
    // Add filter to info property so we're only testing in the domain
    // we care about.
    (info) => info.taxPayer.dependents.length > 0
  )

describe('Schedule 8812', () => {
  it('should be attached with qualifiying dependents', async () => {
    await commonTests.withValid1040((f1040) => {
      // If there are qualifying dependents, we must have a schedule 8812
      if (f1040.qualifyingDependents.qualifyingChildren().length > 0) {
        expect(f1040.schedule8812).not.toBe(undefined)
      }
    })
  })

  it('should not produce line 5 with no dependents', async () => {
    await withSchedule8812((f1040, s8812) => {
      if (s8812.l4() === 0) {
        expect(s8812.l5()).toEqual(0)
      }
    })
  })

  it('should show a multiple of 1000 at l10', async () => {
    await withSchedule8812((f1040, s8812) => {
      expect(s8812.l10() % 1000).toEqual(0)
    })
  })

  it('should use $2,200 per qualifying child for TY2025 OBBBA', async () => {
    await withSchedule8812((f1040, s8812) => {
      const numChildren = s8812.l4()
      expect(s8812.l5()).toEqual(numChildren * 2200)
    })
  })

  it('should use $1,700 refundable per child for TY2025 OBBBA', async () => {
    await withSchedule8812((f1040, s8812) => {
      const part2a = s8812.part2a()
      if (part2a.allowed && part2a.l16bdeps !== undefined) {
        expect(part2a.l16b).toEqual(part2a.l16bdeps * 1700)
      }
    })
  })

  it('should use $500 per other dependent', async () => {
    await withSchedule8812((f1040, s8812) => {
      const numOther = s8812.l6()
      expect(s8812.l7()).toEqual(numOther * 500)
    })
  })
})
