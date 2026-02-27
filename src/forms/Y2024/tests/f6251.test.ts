/* eslint @typescript-eslint/no-empty-function: "off" */

import { FilingStatus, Income1099Type, PersonRole } from 'ustaxes/core/data'
import F1040 from '../irsForms/F1040'
import F6251 from '../irsForms/F6251'
import { cloneDeep } from 'lodash'
import { ValidatedInformation } from 'ustaxes/forms/F1040Base'
import federalBrackets, { amt } from '../data/federal'

const baseInformation: ValidatedInformation = {
  f1099s: [],
  f3921s: [
    {
      name: 'Stock Option',
      personRole: PersonRole.PRIMARY,
      exercisePricePerShare: 1,
      fmv: 101,
      numShares: 1000
    }
  ],
  credits: [],
  f3922s: [],
  scheduleCInputs: [],
  scheduleFInputs: [],
  scheduleHInputs: [],
  scheduleK1Form1065s: [],
  form6781: [],
  itemizedDeductions: undefined,
  form2441Input: undefined,
  w2s: [
    {
      employer: { EIN: '111111111', employerName: 'w2s employer name' },
      personRole: PersonRole.PRIMARY,
      occupation: 'w2s-occupation',
      state: 'AL',
      income: 100000,
      medicareIncome: 0,
      fedWithholding: 0,
      ssWages: 100000,
      ssWithholding: 0,
      medicareWithholding: 0,
      stateWages: 100000,
      stateWithholding: 0
    }
  ],
  estimatedTaxes: [],
  realEstate: [],
  royaltyIncomes: [],
  taxPayer: {
    primaryPerson: {
      address: {
        address: '0001',
        aptNo: '',
        city: 'AR city',
        state: 'AR',
        zip: '1234567'
      },
      firstName: 'payer-first-name',
      lastName: 'payer-last-name',
      isTaxpayerDependent: false,
      role: PersonRole.PRIMARY,
      ssid: '111111111',
      dateOfBirth: new Date('01/01/1970'),
      isBlind: false
    },
    spouse: undefined,
    dependents: [],
    filingStatus: FilingStatus.S
  },
  questions: {},
  f1098es: [],
  f1098ts: [],
  stateResidencies: [{ state: 'AL' }],
  healthSavingsAccounts: [],
  individualRetirementArrangements: [],
  netOperatingLossCarryforwards: [],
  amendedReturns: []
}

describe('AMT', () => {
  it('stock options should trigger AMT', () => {
    const information = cloneDeep(baseInformation)
    const income = baseInformation.w2s[0].income
    const f1040 = new F1040(information, [])
    const f6251 = new F6251(f1040)
    expect(f6251.isNeeded()).toEqual(true)
    expect(Math.round(f6251.l1() ?? 0)).toEqual(
      income -
        federalBrackets.ordinary.status[FilingStatus.S].deductions[0].amount
    )
    expect(Math.round(f6251.l7() ?? 0)).toEqual(
      (income +
        100000 -
        (amt.excemption(FilingStatus.S, income + 100000) ?? 0)) *
        0.26
    )
    expect(Math.round(f6251.l10())).toEqual(Math.round(f1040.l16() ?? 0))
    expect(Math.round(f6251.l11())).toEqual(
      Math.round(f6251.l9() - f6251.l10())
    )
  })

  it('small stock options should NOT trigger AMT', () => {
    const information = cloneDeep(baseInformation)
    information.f3921s[0].exercisePricePerShare = 100

    const f1040 = new F1040(information, [])
    const f6251 = new F6251(f1040)
    expect(f6251.isNeeded()).toEqual(false)
    expect(Math.round(f6251.l11())).toEqual(0)
  })

  it('ESPP (F3922) should NOT affect AMT adjustment', () => {
    const information = cloneDeep(baseInformation)
    information.f3921s = []
    information.f3922s = [
      {
        name: 'ESPP Transfer',
        personRole: PersonRole.PRIMARY,
        fmvPerShareOnGrant: 50,
        fmvPerShareOnExercise: 80,
        exercisePricePerShare: 42.5,
        numShares: 100
      }
    ]

    const f1040 = new F1040(information, [])
    const f6251 = new F6251(f1040)
    // ESPP discount element does NOT create AMT adjustment (only ISOs do)
    expect(f6251.l2i()).toEqual(0)
  })

  it('ISO and ESPP combined: only ISO triggers AMT', () => {
    const information = cloneDeep(baseInformation)
    information.f3922s = [
      {
        name: 'ESPP Transfer',
        personRole: PersonRole.PRIMARY,
        fmvPerShareOnGrant: 50,
        fmvPerShareOnExercise: 80,
        exercisePricePerShare: 42.5,
        numShares: 100
      }
    ]

    const f1040 = new F1040(information, [])
    const f6251 = new F6251(f1040)
    // Only ISO contributes to AMT: (101 - 1) * 1000 = 100000
    expect(f6251.l2i()).toEqual(100000)
    expect(f6251.isNeeded()).toEqual(true)
  })
})

describe('AMT exemption phase-out', () => {
  it('returns full exemption when AMTI is below threshold (Single)', () => {
    expect(amt.excemption(FilingStatus.S, 500000)).toEqual(85700)
  })

  it('returns full exemption at exactly the threshold (Single)', () => {
    expect(amt.excemption(FilingStatus.S, 609350)).toEqual(85700)
  })

  it('reduces exemption by 25 cents per dollar above threshold (Single)', () => {
    // AMTI = 700,000, which is 90,650 above threshold of 609,350
    // Reduction = 90,650 * 0.25 = 22,662.50
    // Exemption = 85,700 - 22,662.50 = 63,037.50
    expect(amt.excemption(FilingStatus.S, 700000)).toEqual(63037.5)
  })

  it('fully phases out exemption at high AMTI (Single)', () => {
    // Full phase-out: 609,350 + (4 x 85,700) = 952,150
    expect(amt.excemption(FilingStatus.S, 952150)).toEqual(0)
    expect(amt.excemption(FilingStatus.S, 1000000)).toEqual(0)
  })

  it('returns full exemption for MFJ below threshold', () => {
    expect(amt.excemption(FilingStatus.MFJ, 1000000)).toEqual(133300)
    expect(amt.excemption(FilingStatus.MFJ, 1218700)).toEqual(133300)
  })

  it('phases out exemption for MFJ above threshold', () => {
    // AMTI = 1,300,000, which is 81,300 above threshold of 1,218,700
    // Reduction = 81,300 * 0.25 = 20,325
    // Exemption = 133,300 - 20,325 = 112,975
    expect(amt.excemption(FilingStatus.MFJ, 1300000)).toEqual(112975)
  })

  it('fully phases out for MFJ', () => {
    // Full phase-out: 1,218,700 + (4 x 133,300) = 1,751,900
    expect(amt.excemption(FilingStatus.MFJ, 1751900)).toEqual(0)
  })

  it('handles MFS filing status', () => {
    expect(amt.excemption(FilingStatus.MFS, 500000)).toEqual(66650)
    // Phase-out threshold for MFS is 609,350
    // AMTI = 700,000, which is 90,650 above threshold
    // Reduction = 90,650 * 0.25 = 22,662.50
    // Exemption = 66,650 - 22,662.50 = 43,987.50
    expect(amt.excemption(FilingStatus.MFS, 700000)).toEqual(43987.5)
  })

  it('handles HOH filing status (same thresholds as Single)', () => {
    expect(amt.excemption(FilingStatus.HOH, 500000)).toEqual(85700)
    expect(amt.excemption(FilingStatus.HOH, 700000)).toEqual(63037.5)
  })

  it('handles W (Widow) filing status (same thresholds as MFJ)', () => {
    expect(amt.excemption(FilingStatus.W, 1000000)).toEqual(133300)
    expect(amt.excemption(FilingStatus.W, 1300000)).toEqual(112975)
  })
})

describe('AMT 26%/28% rate structure', () => {
  it('uses 26% rate when AMT taxable income is at or below cap', () => {
    const information = cloneDeep(baseInformation)
    // With ISO adjustment of 100K, AMTI is approx 200K which is below the 232,600 cap
    const f1040 = new F1040(information, [])
    const f6251 = new F6251(f1040)
    const l6 = f6251.l6()
    expect(l6).toBeLessThanOrEqual(232600)
    // l7 = l6 * 0.26
    expect(f6251.l7()).toEqual(l6 * 0.26)
  })

  it('uses 28% rate for AMT taxable income above cap', () => {
    const information = cloneDeep(baseInformation)
    // Large ISO: make AMT taxable income exceed the 232,600 cap
    information.f3921s[0].numShares = 10000 // 10K shares x $100 spread = $1M ISO
    const f1040 = new F1040(information, [])
    const f6251 = new F6251(f1040)
    const l6 = f6251.l6()
    expect(l6).toBeGreaterThan(232600)
    // l7 = l6 * 0.28 - 4414 (for non-MFS)
    expect(f6251.l7()).toEqual(l6 * 0.28 - 4414)
  })
})

describe('AMT private activity bond interest', () => {
  it('includes private activity bond interest in AMTI (l2g)', () => {
    const information = cloneDeep(baseInformation)
    information.f3921s = [] // No ISOs
    information.f1099s = [
      {
        payer: 'Bond Fund',
        type: Income1099Type.INT,
        form: {
          income: 5000,
          privateActivityBondInterest: 50000
        },
        personRole: PersonRole.PRIMARY
      }
    ]

    const f1040 = new F1040(information, [])
    const f6251 = new F6251(f1040)
    expect(f6251.l2g()).toEqual(50000)
    // l4 (AMTI) should include the 50,000 bond interest
    const l4 = f6251.l4() ?? 0
    expect(l4).toBeGreaterThanOrEqual(50000)
  })

  it('returns undefined for l2g when no private activity bond interest', () => {
    const information = cloneDeep(baseInformation)
    information.f3921s = []

    const f1040 = new F1040(information, [])
    const f6251 = new F6251(f1040)
    expect(f6251.l2g()).toBeUndefined()
  })

  it('aggregates private activity bond interest from multiple 1099-INTs', () => {
    const information = cloneDeep(baseInformation)
    information.f3921s = []
    information.f1099s = [
      {
        payer: 'Fund A',
        type: Income1099Type.INT,
        form: { income: 1000, privateActivityBondInterest: 10000 },
        personRole: PersonRole.PRIMARY
      },
      {
        payer: 'Fund B',
        type: Income1099Type.INT,
        form: { income: 2000, privateActivityBondInterest: 20000 },
        personRole: PersonRole.PRIMARY
      }
    ]

    const f1040 = new F1040(information, [])
    const f6251 = new F6251(f1040)
    expect(f6251.l2g()).toEqual(30000)
  })
})

describe('AMT tentative minimum tax vs regular tax', () => {
  it('AMT is zero when tentative minimum tax does not exceed regular tax', () => {
    const information = cloneDeep(baseInformation)
    // Small ISO that will not exceed regular tax
    information.f3921s[0].exercisePricePerShare = 100 // Only $1 spread
    information.f3921s[0].numShares = 100

    const f1040 = new F1040(information, [])
    const f6251 = new F6251(f1040)
    // l11 = max(0, l9 - l10) where l9 is tentative min tax, l10 is regular tax
    expect(f6251.l11()).toEqual(0)
  })

  it('AMT equals excess of tentative minimum tax over regular tax', () => {
    const information = cloneDeep(baseInformation)
    // Large ISO: $100K spread triggers AMT
    const f1040 = new F1040(information, [])
    const f6251 = new F6251(f1040)
    const l9 = f6251.l9()
    const l10 = f6251.l10()
    expect(l9).toBeGreaterThan(l10)
    expect(f6251.l11()).toEqual(l9 - l10)
  })
})

describe('AMT exemption phase-out', () => {
  it('returns full exemption when AMTI is below threshold (Single)', () => {
    expect(amt.excemption(FilingStatus.S, 500000)).toEqual(85700)
  })

  it('returns full exemption at exactly the threshold (Single)', () => {
    expect(amt.excemption(FilingStatus.S, 609350)).toEqual(85700)
  })

  it('reduces exemption by 25 cents per dollar above threshold (Single)', () => {
    // AMTI = 700,000, which is 90,650 above threshold of 609,350
    // Reduction = 90,650 * 0.25 = 22,662.50
    // Exemption = 85,700 - 22,662.50 = 63,037.50
    expect(amt.excemption(FilingStatus.S, 700000)).toEqual(63037.5)
  })

  it('fully phases out exemption at high AMTI (Single)', () => {
    // Full phase-out: 609,350 + (4 x 85,700) = 952,150
    expect(amt.excemption(FilingStatus.S, 952150)).toEqual(0)
    expect(amt.excemption(FilingStatus.S, 1000000)).toEqual(0)
  })

  it('returns full exemption for MFJ below threshold', () => {
    expect(amt.excemption(FilingStatus.MFJ, 1000000)).toEqual(133300)
    expect(amt.excemption(FilingStatus.MFJ, 1218700)).toEqual(133300)
  })

  it('phases out exemption for MFJ above threshold', () => {
    // AMTI = 1,300,000, which is 81,300 above threshold of 1,218,700
    // Reduction = 81,300 * 0.25 = 20,325
    // Exemption = 133,300 - 20,325 = 112,975
    expect(amt.excemption(FilingStatus.MFJ, 1300000)).toEqual(112975)
  })

  it('fully phases out for MFJ', () => {
    // Full phase-out: 1,218,700 + (4 x 133,300) = 1,751,900
    expect(amt.excemption(FilingStatus.MFJ, 1751900)).toEqual(0)
  })

  it('handles MFS filing status', () => {
    expect(amt.excemption(FilingStatus.MFS, 500000)).toEqual(66650)
    // Phase-out threshold for MFS is 609,350
    // AMTI = 700,000, which is 90,650 above threshold
    // Reduction = 90,650 * 0.25 = 22,662.50
    // Exemption = 66,650 - 22,662.50 = 43,987.50
    expect(amt.excemption(FilingStatus.MFS, 700000)).toEqual(43987.5)
  })

  it('handles HOH filing status (same thresholds as Single)', () => {
    expect(amt.excemption(FilingStatus.HOH, 500000)).toEqual(85700)
    expect(amt.excemption(FilingStatus.HOH, 700000)).toEqual(63037.5)
  })

  it('handles W (Widow) filing status (same thresholds as MFJ)', () => {
    expect(amt.excemption(FilingStatus.W, 1000000)).toEqual(133300)
    expect(amt.excemption(FilingStatus.W, 1300000)).toEqual(112975)
  })
})

describe('AMT 26%/28% rate structure', () => {
  it('uses 26% rate when AMT taxable income is at or below cap', () => {
    const information = cloneDeep(baseInformation)
    // With ISO adjustment of 100K, AMTI is approx 200K which is below the 232,600 cap
    const f1040 = new F1040(information, [])
    const f6251 = new F6251(f1040)
    const l6 = f6251.l6()
    expect(l6).toBeLessThanOrEqual(232600)
    // l7 = l6 * 0.26
    expect(f6251.l7()).toEqual(l6 * 0.26)
  })

  it('uses 28% rate for AMT taxable income above cap', () => {
    const information = cloneDeep(baseInformation)
    // Large ISO: make AMT taxable income exceed the 232,600 cap
    information.f3921s[0].numShares = 10000 // 10K shares x $100 spread = $1M ISO
    const f1040 = new F1040(information, [])
    const f6251 = new F6251(f1040)
    const l6 = f6251.l6()
    expect(l6).toBeGreaterThan(232600)
    // l7 = l6 * 0.28 - 4414 (for non-MFS)
    expect(f6251.l7()).toEqual(l6 * 0.28 - 4414)
  })
})

describe('AMT private activity bond interest', () => {
  it('includes private activity bond interest in AMTI (l2g)', () => {
    const information = cloneDeep(baseInformation)
    information.f3921s = [] // No ISOs
    information.f1099s = [
      {
        payer: 'Bond Fund',
        type: Income1099Type.INT,
        form: {
          income: 5000,
          privateActivityBondInterest: 50000
        },
        personRole: PersonRole.PRIMARY
      }
    ]

    const f1040 = new F1040(information, [])
    const f6251 = new F6251(f1040)
    expect(f6251.l2g()).toEqual(50000)
    // l4 (AMTI) should include the 50,000 bond interest
    const l4 = f6251.l4() ?? 0
    expect(l4).toBeGreaterThanOrEqual(50000)
  })

  it('returns undefined for l2g when no private activity bond interest', () => {
    const information = cloneDeep(baseInformation)
    information.f3921s = []

    const f1040 = new F1040(information, [])
    const f6251 = new F6251(f1040)
    expect(f6251.l2g()).toBeUndefined()
  })

  it('aggregates private activity bond interest from multiple 1099-INTs', () => {
    const information = cloneDeep(baseInformation)
    information.f3921s = []
    information.f1099s = [
      {
        payer: 'Fund A',
        type: Income1099Type.INT,
        form: { income: 1000, privateActivityBondInterest: 10000 },
        personRole: PersonRole.PRIMARY
      },
      {
        payer: 'Fund B',
        type: Income1099Type.INT,
        form: { income: 2000, privateActivityBondInterest: 20000 },
        personRole: PersonRole.PRIMARY
      }
    ]

    const f1040 = new F1040(information, [])
    const f6251 = new F6251(f1040)
    expect(f6251.l2g()).toEqual(30000)
  })
})

describe('AMT tentative minimum tax vs regular tax', () => {
  it('AMT is zero when tentative minimum tax does not exceed regular tax', () => {
    const information = cloneDeep(baseInformation)
    // Small ISO that will not exceed regular tax
    information.f3921s[0].exercisePricePerShare = 100 // Only $1 spread
    information.f3921s[0].numShares = 100

    const f1040 = new F1040(information, [])
    const f6251 = new F6251(f1040)
    // l11 = max(0, l9 - l10) where l9 is tentative min tax, l10 is regular tax
    expect(f6251.l11()).toEqual(0)
  })

  it('AMT equals excess of tentative minimum tax over regular tax', () => {
    const information = cloneDeep(baseInformation)
    // Large ISO: $100K spread triggers AMT
    const f1040 = new F1040(information, [])
    const f6251 = new F6251(f1040)
    const l9 = f6251.l9()
    const l10 = f6251.l10()
    expect(l9).toBeGreaterThan(l10)
    expect(f6251.l11()).toEqual(l9 - l10)
  })
})
