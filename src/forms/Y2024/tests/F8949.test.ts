import F8949 from '../irsForms/F8949'
import F1040 from '../irsForms/F1040'
import { Asset, FilingStatus, PersonRole, SoldAsset } from 'ustaxes/core/data'
import { ValidatedInformation } from 'ustaxes/forms/F1040Base'

const makeInfo = (): ValidatedInformation => ({
  f1099s: [],
  w2s: [],
  realEstate: [],
  estimatedTaxes: [],
  f1098es: [],
  f3921s: [],
  scheduleCInputs: [],
  scheduleK1Form1065s: [],
  itemizedDeductions: undefined,
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
  royaltyIncomes: [],
  f1098ts: [],
  f3922s: [],
  scheduleFInputs: [],
  scheduleHInputs: [],
  form6781: [],
  scheduleK1Form1120Ss: [],
  scheduleK1Form1041s: [],
  form2441Input: undefined,
  netOperatingLossCarryforwards: [],
  amendedReturns: [],
  depreciableAssets: []
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
  describe('box routing', () => {
    it('should route basis-reported short-term to Box A', () => {
      const asset = makeAsset({ basisReportedToIRS: true })
      const f1040 = new F1040(makeInfo(), [asset])
      const f8949 = new F8949(f1040)
      expect(f8949.getBoxForAsset(asset)).toBe('A')
    })

    it('should route basis-reported long-term to Box D', () => {
      const asset = makeAsset({
        basisReportedToIRS: true,
        openDate: new Date(2022, 0, 15),
        closeDate: new Date(2024, 6, 15)
      })
      const f1040 = new F1040(makeInfo(), [asset])
      const f8949 = new F8949(f1040)
      expect(f8949.getBoxForAsset(asset)).toBe('D')
    })

    it('should route basis-not-reported short-term to Box B', () => {
      const asset = makeAsset({ basisReportedToIRS: false })
      const f1040 = new F1040(makeInfo(), [asset])
      const f8949 = new F8949(f1040)
      expect(f8949.getBoxForAsset(asset)).toBe('B')
    })

    it('should route basis-not-reported long-term to Box E', () => {
      const asset = makeAsset({
        basisReportedToIRS: false,
        openDate: new Date(2022, 0, 15),
        closeDate: new Date(2024, 6, 15)
      })
      const f1040 = new F1040(makeInfo(), [asset])
      const f8949 = new F8949(f1040)
      expect(f8949.getBoxForAsset(asset)).toBe('E')
    })

    it('should route no-1099-B short-term to Box C (default)', () => {
      const asset = makeAsset()
      const f1040 = new F1040(makeInfo(), [asset])
      const f8949 = new F8949(f1040)
      expect(f8949.getBoxForAsset(asset)).toBe('C')
    })

    it('should route no-1099-B long-term to Box F (default)', () => {
      const asset = makeAsset({
        openDate: new Date(2022, 0, 15),
        closeDate: new Date(2024, 6, 15)
      })
      const f1040 = new F1040(makeInfo(), [asset])
      const f8949 = new F8949(f1040)
      expect(f8949.getBoxForAsset(asset)).toBe('F')
    })
  })

  describe('wash sale adjustments', () => {
    it('should include wash sale adjustment in short-term totals', () => {
      const asset = makeAsset({
        closePrice: 80, // loss of $200 (80-100)*10
        washSaleAdjustment: 150 // $150 wash sale disallowed
      })
      const f1040 = new F1040(makeInfo(), [asset])
      const f8949 = new F8949(f1040)
      const adj = f8949.shortTermTotalAdjustments()
      expect(adj).toBe(150)
      // Gain = proceeds - cost + adjustment = 800 - 1000 + 150 = -50
      expect(f8949.shortTermTotalGain()).toBe(-50)
    })

    it('should include wash sale adjustment in long-term totals', () => {
      const asset = makeAsset({
        openDate: new Date(2022, 0, 15),
        closeDate: new Date(2024, 6, 15),
        closePrice: 90,
        washSaleAdjustment: 50
      })
      const f1040 = new F1040(makeInfo(), [asset])
      const f8949 = new F8949(f1040, { category: 'unreported', index: 0 })
      const adj = f8949.longTermTotalAdjustments()
      expect(adj).toBe(50)
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
