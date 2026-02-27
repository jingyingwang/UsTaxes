import F8949 from '../irsForms/F8949'
import F1040 from '../irsForms/F1040'
import { Asset, FilingStatus, PersonRole, SoldAsset } from 'ustaxes/core/data'
import { ValidatedInformation } from 'ustaxes/forms/F1040Base'

const makeInfo = (): ValidatedInformation => ({
  f1099s: [],
  w2s: [],
  realEstate: [],
  royaltyIncomes: [],
  estimatedTaxes: [],
  f1098es: [],
  f1098ts: [],
  f3921s: [],
  f3922s: [],
  scheduleCInputs: [],
  scheduleFInputs: [],
  scheduleHInputs: [],
  scheduleK1Form1065s: [],
  scheduleK1Form1120Ss: [],
  scheduleK1Form1041s: [],
  form6781: [],
  netOperatingLossCarryforwards: [],
  itemizedDeductions: undefined,
  form2441Input: undefined,
  taxPayer: {
    filingStatus: FilingStatus.S,
    primaryPerson: {
      firstName: 'Test',
      lastName: 'User',
      ssid: '123456789',
      role: PersonRole.PRIMARY,
      isBlind: false,
      dateOfBirth: new Date(1990, 0, 1),
      address: {
        address: '123 Main St',
        city: 'Anytown',
        state: 'AL',
        zip: '12345'
      },
      isTaxpayerDependent: false
    },
    dependents: []
  },
  questions: {},
  credits: [],
  stateResidencies: [{ state: 'AL' }],
  healthSavingsAccounts: [],
  individualRetirementArrangements: [],
  amendedReturns: []
})

const makeAsset = (overrides: Partial<Asset<Date>> = {}): SoldAsset<Date> => ({
  name: 'AAPL',
  positionType: 'Security',
  openDate: new Date(2024, 0, 15),
  closeDate: new Date(2024, 6, 15),
  openPrice: 100,
  closePrice: 150,
  openFee: 0,
  closeFee: 0,
  quantity: 10,
  ...overrides
})

describe('F8949', () => {
  describe('category-based box routing', () => {
    it('should assign unreported short-term assets to Box C', () => {
      const asset = makeAsset()
      const f1040 = new F1040(makeInfo(), [asset])
      const f8949 = new F8949(f1040, { category: 'unreported' })
      expect(f8949.part1BoxC()).toBe(true)
      expect(f8949.part1BoxA()).toBe(false)
      expect(f8949.part1BoxB()).toBe(false)
    })

    it('should assign unreported long-term assets to Box F', () => {
      const asset = makeAsset({
        openDate: new Date(2022, 0, 15),
        closeDate: new Date(2024, 6, 15)
      })
      const f1040 = new F1040(makeInfo(), [asset])
      const f8949 = new F8949(f1040, { category: 'unreported' })
      expect(f8949.part2BoxF()).toBe(true)
      expect(f8949.part2BoxD()).toBe(false)
      expect(f8949.part2BoxE()).toBe(false)
    })

    it('should detect when form is needed with assets', () => {
      const asset = makeAsset()
      const f1040 = new F1040(makeInfo(), [asset])
      const f8949 = new F8949(f1040)
      expect(f8949.isNeeded()).toBe(true)
    })

    it('should detect when form is not needed without assets', () => {
      const f1040 = new F1040(makeInfo(), [])
      const f8949 = new F8949(f1040)
      expect(f8949.isNeeded()).toBe(false)
    })
  })

  describe('totals for unreported assets', () => {
    it('should compute short-term proceeds and cost totals', () => {
      const asset = makeAsset({
        closePrice: 80,
        quantity: 10
      })
      const f1040 = new F1040(makeInfo(), [asset])
      const f8949 = new F8949(f1040, { category: 'unreported' })
      // proceeds = 80*10 - 0 fee = 800, cost = 100*10 + 0 fee = 1000
      expect(f8949.shortTermTotalProceeds()).toBe(800)
      expect(f8949.shortTermTotalCost()).toBe(1000)
      expect(f8949.shortTermTotalGain()).toBe(-200)
    })

    it('should compute long-term proceeds and cost totals', () => {
      const asset = makeAsset({
        openDate: new Date(2022, 0, 15),
        closeDate: new Date(2024, 6, 15),
        closePrice: 90,
        quantity: 10
      })
      const f1040 = new F1040(makeInfo(), [asset])
      const f8949 = new F8949(f1040, { category: 'unreported' })
      // proceeds = 90*10 = 900, cost = 100*10 = 1000
      expect(f8949.longTermTotalProceeds()).toBe(900)
      expect(f8949.longTermTotalCost()).toBe(1000)
      expect(f8949.longTermTotalGain()).toBe(-100)
    })

    it('should return undefined adjustments when no wash sales', () => {
      const asset = makeAsset()
      const f1040 = new F1040(makeInfo(), [asset])
      const f8949 = new F8949(f1040)
      expect(f8949.shortTermTotalAdjustments()).toBeUndefined()
    })
  })

  describe('holding period classification', () => {
    it('should classify <= 366 days as short-term', () => {
      const asset = makeAsset({
        openDate: new Date(2024, 0, 1),
        closeDate: new Date(2024, 11, 31) // 365 days
      })
      const f1040 = new F1040(makeInfo(), [asset])
      const f8949 = new F8949(f1040)
      expect(f8949.isLongTerm(asset)).toBe(false)
    })

    it('should classify > 366 days as long-term', () => {
      const asset = makeAsset({
        openDate: new Date(2023, 0, 1),
        closeDate: new Date(2024, 1, 2) // ~398 days
      })
      const f1040 = new F1040(makeInfo(), [asset])
      const f8949 = new F8949(f1040)
      expect(f8949.isLongTerm(asset)).toBe(true)
    })
  })
})
