import { IraPlanType, PersonRole } from 'ustaxes/core/data'
import { commonTests } from '.'

jest.setTimeout(40000)

beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation((x: string) => {
    if (!x.includes('Removing XFA form data as pdf-lib')) {
      console.warn(x)
    }
  })
})

describe('F5329', () => {
  it('should compute 10% penalty on taxable IRA distributions', async () => {
    await commonTests.withValid1040(
      (f1040) => {
        const f5329 = f1040.f5329
        const l1 = f5329.l1() ?? 0
        const l4 = f5329.l4() ?? 0

        if (l1 > 0) {
          // Line 4 should be 10% of line 3 (which equals line 1 when no exceptions)
          expect(l4).toEqual(Math.round(l1 * 0.1))
        } else {
          expect(l4).toEqual(0)
        }
      },
      // Filter to cases that have IRA distributions with taxable amounts
      (info) =>
        info.individualRetirementArrangements.some(
          (ira) =>
            ira.personRole === PersonRole.PRIMARY &&
            ira.taxableAmount > 0 &&
            ira.planType !== IraPlanType.RothIRA
        )
    )
  })

  it('should not be needed when there are no taxable distributions', async () => {
    await commonTests.withValid1040(
      (f1040) => {
        expect(f1040.f5329.isNeeded()).toBe(false)
      },
      (info) =>
        info.individualRetirementArrangements.every(
          (ira) =>
            ira.taxableAmount === 0 || ira.planType === IraPlanType.RothIRA
        )
    )
  })

  it('should exclude Roth IRA distributions from Part I', async () => {
    await commonTests.withValid1040((f1040) => {
      const rothTotal = f1040.info.individualRetirementArrangements
        .filter(
          (ira) =>
            ira.personRole === PersonRole.PRIMARY &&
            ira.planType === IraPlanType.RothIRA
        )
        .reduce((sum, ira) => sum + ira.taxableAmount, 0)

      const l1 = f1040.f5329.l1() ?? 0

      // L1 should not include Roth IRA amounts
      const nonRothTotal = f1040.info.individualRetirementArrangements
        .filter(
          (ira) =>
            ira.personRole === PersonRole.PRIMARY &&
            ira.taxableAmount > 0 &&
            ira.planType !== IraPlanType.RothIRA
        )
        .reduce((sum, ira) => sum + ira.taxableAmount, 0)

      if (nonRothTotal > 0) {
        expect(l1).toEqual(nonRothTotal)
      } else {
        expect(l1).toEqual(0)
      }

      // Verify Roth amounts are excluded even if they exist
      if (rothTotal > 0 && nonRothTotal === 0) {
        expect(l1).toEqual(0)
      }
    })
  })

  it('should feed into Schedule 2 line 8', async () => {
    await commonTests.withValid1040(
      (f1040) => {
        const f5329Tax = f1040.f5329.toSchedule2l8() ?? 0
        const f5329SpouseTax = f1040.f5329Spouse?.toSchedule2l8() ?? 0
        const schedule2l8 = f1040.schedule2.l8() ?? 0

        expect(schedule2l8).toEqual(f5329Tax + f5329SpouseTax || 0)
      },
      (info) =>
        info.individualRetirementArrangements.some(
          (ira) => ira.taxableAmount > 0 && ira.planType !== IraPlanType.RothIRA
        )
    )
  })

  it('should create separate form for spouse distributions', async () => {
    await commonTests.withValid1040(
      (f1040) => {
        if (f1040.f5329Spouse !== undefined) {
          const spouseIras = f1040.info.individualRetirementArrangements.filter(
            (ira) =>
              ira.personRole === PersonRole.SPOUSE &&
              ira.taxableAmount > 0 &&
              ira.planType !== IraPlanType.RothIRA
          )
          const spouseTotal = spouseIras.reduce(
            (sum, ira) => sum + ira.taxableAmount,
            0
          )
          expect(f1040.f5329Spouse.l1() ?? 0).toEqual(
            spouseTotal > 0 ? spouseTotal : 0
          )
        }
      },
      (info) =>
        info.taxPayer.spouse !== undefined &&
        info.individualRetirementArrangements.some(
          (ira) => ira.personRole === PersonRole.SPOUSE
        )
    )
  })

  it('should include F5329 penalty in total tax computation', async () => {
    await commonTests.withValid1040(
      (f1040) => {
        const penalty = f1040.f5329.l4() ?? 0
        if (penalty > 0) {
          // Schedule 2 line 8 should include the penalty
          expect(f1040.schedule2.l8() ?? 0).toBeGreaterThanOrEqual(penalty)
          // Schedule 2 line 21 (total other taxes) should include line 8
          expect(f1040.schedule2.l21()).toBeGreaterThanOrEqual(penalty)
          // F1040 line 23 should include schedule 2 total
          expect(f1040.l23() ?? 0).toBeGreaterThanOrEqual(penalty)
        }
      },
      (info) =>
        info.individualRetirementArrangements.some(
          (ira) =>
            ira.personRole === PersonRole.PRIMARY &&
            ira.taxableAmount > 0 &&
            ira.planType !== IraPlanType.RothIRA
        )
    )
  })

  it('should have sequenceIndex of 29', async () => {
    await commonTests.withValid1040((f1040) => {
      expect(f1040.f5329.sequenceIndex).toEqual(29)
    })
  })

  it('should handle zero taxable amounts correctly', async () => {
    await commonTests.withValid1040(
      (f1040) => {
        const l1 = f1040.f5329.l1()
        const l3 = f1040.f5329.l3()
        const l4 = f1040.f5329.l4()

        // If no taxable amount, all lines should be undefined
        if ((l1 ?? 0) === 0) {
          expect(l3).toBeUndefined()
          expect(l4).toBeUndefined()
        }
      },
      (info) =>
        info.individualRetirementArrangements.every(
          (ira) =>
            ira.personRole !== PersonRole.PRIMARY || ira.taxableAmount === 0
        )
    )
  })

  it('Schedule 2 l8box should be true when penalty exists', async () => {
    await commonTests.withValid1040((f1040) => {
      const l8 = f1040.schedule2.l8() ?? 0
      if (l8 > 0) {
        expect(f1040.schedule2.l8box()).toBe(true)
      } else {
        expect(f1040.schedule2.l8box()).toBe(false)
      }
    })
  })
})
