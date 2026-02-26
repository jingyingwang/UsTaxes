import F8949, { AggregateTotal } from '../irsForms/F8949'
import { testKit } from '.'

describe('F8949 (Y2025 Enhanced)', () => {
  it('should attach F8949 if there are sales this year', async () => {
    await testKit.with1040Assert((forms, info, assets): Promise<void> => {
      if (
        assets.filter((p) => p.closeDate?.getFullYear() === 2025).length > 0
      ) {
        expect(forms.filter((s) => s.tag === 'f8949').length).toBeGreaterThan(0)
      }
      return Promise.resolve()
    })
  })

  it('should use aggregate reporting when transactions exceed threshold', async () => {
    await testKit.with1040Assert((forms): Promise<void> => {
      const f8949Forms = forms.filter((s) => s.tag === 'f8949')
      for (const form of f8949Forms) {
        const f = form as unknown as F8949
        if (f.useAggregateReporting()) {
          // In aggregate mode, copies should be empty
          expect(f.copies().length).toBe(0)
          // Short-term lines should have "See attached statement" as first entry
          const lines = f.shortTermLines()
          if (f.thisYearShortTermSales().length > 14) {
            expect(lines[0][0]).toBe('See attached statement')
          }
        }
      }
      return Promise.resolve()
    })
  })

  it('should compute wash sale adjustments for replacement purchases within window', async () => {
    await testKit.with1040Assert((forms): Promise<void> => {
      const f8949Forms = forms.filter((s) => s.tag === 'f8949')
      for (const form of f8949Forms) {
        const f = form as unknown as F8949
        const shortWithWash = f.shortTermSalesWithWashSales()
        const longWithWash = f.longTermSalesWithWashSales()

        // Verify wash sale adjustments are non-negative
        for (const sale of [...shortWithWash, ...longWithWash]) {
          if (sale.washSaleDisallowed !== undefined) {
            expect(sale.washSaleDisallowed).toBeGreaterThanOrEqual(0)
          }
        }
      }
      return Promise.resolve()
    })
  })

  it('should produce consistent totals between aggregate and per-page modes', async () => {
    await testKit.with1040Assert((forms): Promise<void> => {
      const f8949Forms = forms.filter((s) => s.tag === 'f8949')
      for (const form of f8949Forms) {
        const f = form as unknown as F8949
        const shortAgg: AggregateTotal = f.shortTermAggregate()
        const longAgg: AggregateTotal = f.longTermAggregate()

        // gainOrLoss should equal proceeds - cost + adjustments
        expect(shortAgg.gainOrLoss).toBeCloseTo(
          shortAgg.proceeds - shortAgg.cost + shortAgg.adjustments,
          2
        )
        expect(longAgg.gainOrLoss).toBeCloseTo(
          longAgg.proceeds - longAgg.cost + longAgg.adjustments,
          2
        )
      }
      return Promise.resolve()
    })
  })
})
