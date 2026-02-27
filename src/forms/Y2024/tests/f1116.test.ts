import { commonTests, testKit } from '.'

jest.setTimeout(40000)

beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation((x: string) => {
    if (!x.includes('Removing XFA form data as pdf-lib')) {
      console.warn(x)
    }
  })
})

describe('F1116', () => {
  it('should never produce a credit exceeding total foreign tax paid', async () => {
    await testKit.with1040Assert((forms): Promise<void> => {
      const f1040 = commonTests.findF1040(forms)
      if (f1040?.f1116 !== undefined) {
        const f1116 = f1040.f1116
        expect(f1116.credit()).toBeLessThanOrEqual(f1116.totalForeignTaxPaid())
      }
      return Promise.resolve()
    })
  })

  it('should never produce a credit exceeding the limitation', async () => {
    await testKit.with1040Assert((forms): Promise<void> => {
      const f1040 = commonTests.findF1040(forms)
      if (f1040?.f1116 !== undefined) {
        const f1116 = f1040.f1116
        expect(f1116.credit()).toBeLessThanOrEqual(f1116.limitation())
      }
      return Promise.resolve()
    })
  })

  it('should produce zero credit when no foreign tax paid', async () => {
    await testKit.with1040Assert(
      (forms): Promise<void> => {
        const f1040 = commonTests.findF1040(forms)
        // When F1116 is not needed, it should not exist
        expect(f1040?.f1116).toBeUndefined()
        return Promise.resolve()
      },
      {},
      // Filter: only test cases with no foreign tax paid
      (info) =>
        info.f1099s.every((f) => {
          if (f.type === 'INT' || f.type === 'DIV') {
            return (
              (f.form as { foreignTaxPaid?: number }).foreignTaxPaid ===
                undefined ||
              (f.form as { foreignTaxPaid?: number }).foreignTaxPaid === 0
            )
          }
          return true
        })
    )
  })

  it('should correctly compute carryforward when tax paid exceeds limitation', async () => {
    await testKit.with1040Assert((forms): Promise<void> => {
      const f1040 = commonTests.findF1040(forms)
      if (f1040?.f1116 !== undefined) {
        const f1116 = f1040.f1116
        const expectedCarryforward = Math.max(
          0,
          f1116.totalForeignTaxPaid() - f1116.limitation()
        )
        expect(f1116.carryforward()).toEqual(expectedCarryforward)
      }
      return Promise.resolve()
    })
  })

  it('should have limitation ratio between 0 and 1', async () => {
    await testKit.with1040Assert((forms): Promise<void> => {
      const f1040 = commonTests.findF1040(forms)
      if (f1040?.f1116 !== undefined) {
        const f1116 = f1040.f1116
        expect(f1116.l6()).toBeGreaterThanOrEqual(0)
        expect(f1116.l6()).toBeLessThanOrEqual(1)
      }
      return Promise.resolve()
    })
  })
})
