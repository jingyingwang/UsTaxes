/**
 * Progressive tax bracket configurations for all graduated-rate states.
 * Tax year 2024.
 *
 * Sources:
 * - Tax Foundation 2024 State Income Tax Rates and Brackets
 * - Individual state revenue department publications
 */
import { FilingStatus } from 'ustaxes/core/data'
import { ProgressiveStateConfig } from 'ustaxes/core/stateForms/StateFormBase'
import { TaxBracket } from 'ustaxes/core/stateForms/stateBrackets'

// Helper to create bracket arrays. Each entry: [rate, upper bound].
const b = (entries: [number, number][]): TaxBracket[] =>
  entries.map(([rate, to]) => ({ rate, to }))

// Helper for states where all filing statuses share the same brackets.
const allSame = (
  brackets: TaxBracket[]
): { [K in FilingStatus]: TaxBracket[] } => ({
  [FilingStatus.S]: brackets,
  [FilingStatus.MFJ]: brackets,
  [FilingStatus.MFS]: brackets,
  [FilingStatus.HOH]: brackets,
  [FilingStatus.W]: brackets
})

// Helper for standard deduction where W matches MFJ.
const ded = (
  s: number,
  mfj: number,
  mfs: number,
  hoh: number
): { [K in FilingStatus]: number } => ({
  [FilingStatus.S]: s,
  [FilingStatus.MFJ]: mfj,
  [FilingStatus.MFS]: mfs,
  [FilingStatus.HOH]: hoh,
  [FilingStatus.W]: mfj
})

// ─── Alabama ───────────────────────────────────────────────
export const AL: ProgressiveStateConfig = {
  state: 'AL',
  formName: 'AL-40',
  brackets: {
    [FilingStatus.S]: b([
      [0.02, 500],
      [0.04, 3000],
      [0.05, Infinity]
    ]),
    [FilingStatus.MFJ]: b([
      [0.02, 1000],
      [0.04, 6000],
      [0.05, Infinity]
    ]),
    [FilingStatus.MFS]: b([
      [0.02, 500],
      [0.04, 3000],
      [0.05, Infinity]
    ]),
    [FilingStatus.HOH]: b([
      [0.02, 500],
      [0.04, 3000],
      [0.05, Infinity]
    ]),
    [FilingStatus.W]: b([
      [0.02, 1000],
      [0.04, 6000],
      [0.05, Infinity]
    ])
  },
  standardDeduction: ded(3000, 8500, 4250, 5200),
  personalExemption: 1500,
  dependentExemption: 1000
}

// ─── Arkansas ──────────────────────────────────────────────
export const AR: ProgressiveStateConfig = {
  state: 'AR',
  formName: 'AR-1000',
  brackets: allSame(
    b([
      [0.02, 4499],
      [0.039, Infinity]
    ])
  ),
  standardDeduction: ded(2340, 4680, 2340, 2340),
  personalExemption: 0,
  dependentExemption: 0
}

// ─── Arizona (flat 2.5%) ───────────────────────────────────
export const AZ: ProgressiveStateConfig = {
  state: 'AZ',
  formName: 'AZ-140',
  brackets: allSame(b([[0.025, Infinity]])),
  standardDeduction: ded(14600, 29200, 14600, 21900),
  personalExemption: 0,
  dependentExemption: 0
}

// ─── Connecticut ───────────────────────────────────────────
export const CT: ProgressiveStateConfig = {
  state: 'CT',
  formName: 'CT-1040',
  brackets: {
    [FilingStatus.S]: b([
      [0.02, 10000],
      [0.045, 50000],
      [0.055, 100000],
      [0.06, 200000],
      [0.065, 250000],
      [0.069, 500000],
      [0.0699, Infinity]
    ]),
    [FilingStatus.MFJ]: b([
      [0.02, 20000],
      [0.045, 100000],
      [0.055, 200000],
      [0.06, 400000],
      [0.065, 500000],
      [0.069, 1000000],
      [0.0699, Infinity]
    ]),
    [FilingStatus.MFS]: b([
      [0.02, 10000],
      [0.045, 50000],
      [0.055, 100000],
      [0.06, 200000],
      [0.065, 250000],
      [0.069, 500000],
      [0.0699, Infinity]
    ]),
    [FilingStatus.HOH]: b([
      [0.02, 16000],
      [0.045, 80000],
      [0.055, 160000],
      [0.06, 320000],
      [0.065, 400000],
      [0.069, 800000],
      [0.0699, Infinity]
    ]),
    [FilingStatus.W]: b([
      [0.02, 20000],
      [0.045, 100000],
      [0.055, 200000],
      [0.06, 400000],
      [0.065, 500000],
      [0.069, 1000000],
      [0.0699, Infinity]
    ])
  },
  // CT has no standard deduction; uses personal exemptions instead.
  // Personal exemption handled via personalExemption field.
  standardDeduction: ded(0, 0, 0, 0),
  personalExemption: 15000,
  dependentExemption: 0
}

// ─── District of Columbia ──────────────────────────────────
export const DC: ProgressiveStateConfig = {
  state: 'DC',
  formName: 'D-40',
  brackets: allSame(
    b([
      [0.04, 10000],
      [0.06, 40000],
      [0.065, 60000],
      [0.085, 250000],
      [0.0925, 500000],
      [0.0975, 1000000],
      [0.1075, Infinity]
    ])
  ),
  standardDeduction: ded(14600, 29200, 14600, 21900),
  personalExemption: 0,
  dependentExemption: 0
}

// ─── Delaware ──────────────────────────────────────────────
export const DE: ProgressiveStateConfig = {
  state: 'DE',
  formName: 'DE-200-01',
  brackets: allSame(
    b([
      [0, 2000],
      [0.022, 5000],
      [0.039, 10000],
      [0.048, 20000],
      [0.052, 25000],
      [0.0555, 60000],
      [0.066, Infinity]
    ])
  ),
  standardDeduction: ded(3250, 6500, 3250, 3250),
  personalExemption: 0,
  dependentExemption: 0
}

// ─── Hawaii ────────────────────────────────────────────────
export const HI: ProgressiveStateConfig = {
  state: 'HI',
  formName: 'HI-N11',
  brackets: {
    [FilingStatus.S]: b([
      [0.014, 9600],
      [0.032, 14400],
      [0.055, 19200],
      [0.064, 24000],
      [0.068, 36000],
      [0.072, 48000],
      [0.076, 125000],
      [0.079, 175000],
      [0.0825, 225000],
      [0.09, 275000],
      [0.1, 325000],
      [0.11, Infinity]
    ]),
    [FilingStatus.MFJ]: b([
      [0.014, 19200],
      [0.032, 28800],
      [0.055, 38400],
      [0.064, 48000],
      [0.068, 72000],
      [0.072, 96000],
      [0.076, 250000],
      [0.079, 350000],
      [0.0825, 450000],
      [0.09, 550000],
      [0.1, 650000],
      [0.11, Infinity]
    ]),
    [FilingStatus.MFS]: b([
      [0.014, 9600],
      [0.032, 14400],
      [0.055, 19200],
      [0.064, 24000],
      [0.068, 36000],
      [0.072, 48000],
      [0.076, 125000],
      [0.079, 175000],
      [0.0825, 225000],
      [0.09, 275000],
      [0.1, 325000],
      [0.11, Infinity]
    ]),
    [FilingStatus.HOH]: b([
      [0.014, 14400],
      [0.032, 21600],
      [0.055, 28800],
      [0.064, 36000],
      [0.068, 54000],
      [0.072, 72000],
      [0.076, 187500],
      [0.079, 262500],
      [0.0825, 337500],
      [0.09, 412500],
      [0.1, 487500],
      [0.11, Infinity]
    ]),
    [FilingStatus.W]: b([
      [0.014, 19200],
      [0.032, 28800],
      [0.055, 38400],
      [0.064, 48000],
      [0.068, 72000],
      [0.072, 96000],
      [0.076, 250000],
      [0.079, 350000],
      [0.0825, 450000],
      [0.09, 550000],
      [0.1, 650000],
      [0.11, Infinity]
    ])
  },
  standardDeduction: ded(4400, 8800, 4400, 6424),
  personalExemption: 1144,
  dependentExemption: 1144
}

// ─── Iowa ──────────────────────────────────────────────────
export const IA: ProgressiveStateConfig = {
  state: 'IA',
  formName: 'IA-1040',
  brackets: {
    [FilingStatus.S]: b([
      [0.044, 6210],
      [0.0482, 31050],
      [0.057, Infinity]
    ]),
    [FilingStatus.MFJ]: b([
      [0.044, 12420],
      [0.0482, 62100],
      [0.057, Infinity]
    ]),
    [FilingStatus.MFS]: b([
      [0.044, 6210],
      [0.0482, 31050],
      [0.057, Infinity]
    ]),
    [FilingStatus.HOH]: b([
      [0.044, 6210],
      [0.0482, 31050],
      [0.057, Infinity]
    ]),
    [FilingStatus.W]: b([
      [0.044, 12420],
      [0.0482, 62100],
      [0.057, Infinity]
    ])
  },
  standardDeduction: ded(14600, 29200, 14600, 21900),
  personalExemption: 0,
  dependentExemption: 0
}

// ─── Idaho (flat 5.695%) ───────────────────────────────────
export const ID: ProgressiveStateConfig = {
  state: 'ID',
  formName: 'ID-40',
  brackets: allSame(b([[0.05695, Infinity]])),
  standardDeduction: ded(14600, 29200, 14600, 21900),
  personalExemption: 0,
  dependentExemption: 0
}

// ─── Kansas ────────────────────────────────────────────────
export const KS: ProgressiveStateConfig = {
  state: 'KS',
  formName: 'KS-40',
  brackets: {
    [FilingStatus.S]: b([
      [0.052, 23000],
      [0.0558, Infinity]
    ]),
    [FilingStatus.MFJ]: b([
      [0.052, 46000],
      [0.0558, Infinity]
    ]),
    [FilingStatus.MFS]: b([
      [0.052, 23000],
      [0.0558, Infinity]
    ]),
    [FilingStatus.HOH]: b([
      [0.052, 23000],
      [0.0558, Infinity]
    ]),
    [FilingStatus.W]: b([
      [0.052, 46000],
      [0.0558, Infinity]
    ])
  },
  standardDeduction: ded(3605, 8240, 4120, 6180),
  personalExemption: 9160,
  dependentExemption: 2320
}

// ─── Louisiana ─────────────────────────────────────────────
export const LA: ProgressiveStateConfig = {
  state: 'LA',
  formName: 'LA-IT540',
  brackets: {
    [FilingStatus.S]: b([
      [0.0185, 12500],
      [0.035, 50000],
      [0.0425, Infinity]
    ]),
    [FilingStatus.MFJ]: b([
      [0.0185, 25000],
      [0.035, 100000],
      [0.0425, Infinity]
    ]),
    [FilingStatus.MFS]: b([
      [0.0185, 12500],
      [0.035, 50000],
      [0.0425, Infinity]
    ]),
    [FilingStatus.HOH]: b([
      [0.0185, 12500],
      [0.035, 50000],
      [0.0425, Infinity]
    ]),
    [FilingStatus.W]: b([
      [0.0185, 25000],
      [0.035, 100000],
      [0.0425, Infinity]
    ])
  },
  // LA uses combined personal exemption + standard deduction
  standardDeduction: ded(4500, 9000, 4500, 9000),
  personalExemption: 0,
  dependentExemption: 1000
}

// ─── Maryland ──────────────────────────────────────────────
// Note: MD standard deduction is 15% of AGI with min/max floors.
// The config uses the minimum amounts; the form overrides standardDeductionAmount().
export const MD: ProgressiveStateConfig = {
  state: 'MD',
  formName: 'MD-502',
  brackets: {
    [FilingStatus.S]: b([
      [0.02, 1000],
      [0.03, 2000],
      [0.04, 3000],
      [0.0475, 100000],
      [0.05, 125000],
      [0.0525, 150000],
      [0.055, 250000],
      [0.0575, Infinity]
    ]),
    [FilingStatus.MFJ]: b([
      [0.02, 1000],
      [0.03, 2000],
      [0.04, 3000],
      [0.0475, 150000],
      [0.05, 175000],
      [0.0525, 225000],
      [0.055, 300000],
      [0.0575, Infinity]
    ]),
    [FilingStatus.MFS]: b([
      [0.02, 1000],
      [0.03, 2000],
      [0.04, 3000],
      [0.0475, 100000],
      [0.05, 125000],
      [0.0525, 150000],
      [0.055, 250000],
      [0.0575, Infinity]
    ]),
    [FilingStatus.HOH]: b([
      [0.02, 1000],
      [0.03, 2000],
      [0.04, 3000],
      [0.0475, 150000],
      [0.05, 175000],
      [0.0525, 225000],
      [0.055, 300000],
      [0.0575, Infinity]
    ]),
    [FilingStatus.W]: b([
      [0.02, 1000],
      [0.03, 2000],
      [0.04, 3000],
      [0.0475, 150000],
      [0.05, 175000],
      [0.0525, 225000],
      [0.055, 300000],
      [0.0575, Infinity]
    ])
  },
  // MD standard deduction: 15% of AGI, min $1,800/$3,600, max $2,700/$5,450
  // These are the minimum values; MDForm overrides with the 15% calculation.
  standardDeduction: ded(1800, 3600, 1800, 1800),
  personalExemption: 3200,
  dependentExemption: 3200
}

// ─── Maine ─────────────────────────────────────────────────
export const ME: ProgressiveStateConfig = {
  state: 'ME',
  formName: 'ME-1040',
  brackets: {
    [FilingStatus.S]: b([
      [0.058, 26800],
      [0.0675, 63450],
      [0.0715, Infinity]
    ]),
    [FilingStatus.MFJ]: b([
      [0.058, 53600],
      [0.0675, 126900],
      [0.0715, Infinity]
    ]),
    [FilingStatus.MFS]: b([
      [0.058, 26800],
      [0.0675, 63450],
      [0.0715, Infinity]
    ]),
    [FilingStatus.HOH]: b([
      [0.058, 40100],
      [0.0675, 95150],
      [0.0715, Infinity]
    ]),
    [FilingStatus.W]: b([
      [0.058, 53600],
      [0.0675, 126900],
      [0.0715, Infinity]
    ])
  },
  standardDeduction: ded(14600, 29200, 14600, 21900),
  personalExemption: 5000,
  dependentExemption: 5000
}

// ─── Minnesota ─────────────────────────────────────────────
export const MN: ProgressiveStateConfig = {
  state: 'MN',
  formName: 'MN-M1',
  brackets: {
    [FilingStatus.S]: b([
      [0.0535, 32570],
      [0.068, 106990],
      [0.0785, 198630],
      [0.0985, Infinity]
    ]),
    [FilingStatus.MFJ]: b([
      [0.0535, 47620],
      [0.068, 189180],
      [0.0785, 330410],
      [0.0985, Infinity]
    ]),
    [FilingStatus.MFS]: b([
      [0.0535, 23810],
      [0.068, 94590],
      [0.0785, 165205],
      [0.0985, Infinity]
    ]),
    [FilingStatus.HOH]: b([
      [0.0535, 40095],
      [0.068, 148085],
      [0.0785, 264520],
      [0.0985, Infinity]
    ]),
    [FilingStatus.W]: b([
      [0.0535, 47620],
      [0.068, 189180],
      [0.0785, 330410],
      [0.0985, Infinity]
    ])
  },
  standardDeduction: ded(14575, 29150, 14575, 21900),
  personalExemption: 0,
  dependentExemption: 5050
}

// ─── Missouri ──────────────────────────────────────────────
export const MO: ProgressiveStateConfig = {
  state: 'MO',
  formName: 'MO-1040',
  brackets: allSame(
    b([
      [0, 1312],
      [0.02, 2626],
      [0.025, 3939],
      [0.03, 5252],
      [0.035, 6565],
      [0.04, 7878],
      [0.045, 9191],
      [0.047, Infinity]
    ])
  ),
  standardDeduction: ded(14600, 29200, 14600, 21900),
  personalExemption: 0,
  dependentExemption: 0
}

// ─── Mississippi ───────────────────────────────────────────
export const MS: ProgressiveStateConfig = {
  state: 'MS',
  formName: 'MS-80-105',
  brackets: allSame(
    b([
      [0, 10000],
      [0.047, Infinity]
    ])
  ),
  standardDeduction: ded(2300, 4600, 2300, 3400),
  personalExemption: 6000,
  dependentExemption: 1500
}

// ─── Montana ───────────────────────────────────────────────
export const MT: ProgressiveStateConfig = {
  state: 'MT',
  formName: 'MT-2',
  brackets: {
    [FilingStatus.S]: b([
      [0.047, 21100],
      [0.059, Infinity]
    ]),
    [FilingStatus.MFJ]: b([
      [0.047, 42200],
      [0.059, Infinity]
    ]),
    [FilingStatus.MFS]: b([
      [0.047, 21100],
      [0.059, Infinity]
    ]),
    [FilingStatus.HOH]: b([
      [0.047, 21100],
      [0.059, Infinity]
    ]),
    [FilingStatus.W]: b([
      [0.047, 42200],
      [0.059, Infinity]
    ])
  },
  // MT starts from federal taxable income (includes federal std deduction)
  standardDeduction: ded(0, 0, 0, 0),
  personalExemption: 0,
  dependentExemption: 0
}

// ─── Nebraska ──────────────────────────────────────────────
export const NE: ProgressiveStateConfig = {
  state: 'NE',
  formName: 'NE-1040N',
  brackets: {
    [FilingStatus.S]: b([
      [0.0246, 4030],
      [0.0351, 24120],
      [0.0501, 38870],
      [0.052, Infinity]
    ]),
    [FilingStatus.MFJ]: b([
      [0.0246, 8040],
      [0.0351, 48250],
      [0.0501, 77730],
      [0.052, Infinity]
    ]),
    [FilingStatus.MFS]: b([
      [0.0246, 4030],
      [0.0351, 24120],
      [0.0501, 38870],
      [0.052, Infinity]
    ]),
    [FilingStatus.HOH]: b([
      [0.0246, 6380],
      [0.0351, 36530],
      [0.0501, 55640],
      [0.052, Infinity]
    ]),
    [FilingStatus.W]: b([
      [0.0246, 8040],
      [0.0351, 48250],
      [0.0501, 77730],
      [0.052, Infinity]
    ])
  },
  standardDeduction: ded(7900, 15800, 7900, 11600),
  personalExemption: 0,
  dependentExemption: 0
}

// ─── New Mexico ────────────────────────────────────────────
export const NM: ProgressiveStateConfig = {
  state: 'NM',
  formName: 'NM-PIT1',
  brackets: {
    [FilingStatus.S]: b([
      [0.015, 5500],
      [0.032, 16500],
      [0.043, 33500],
      [0.047, 66500],
      [0.049, 210000],
      [0.059, Infinity]
    ]),
    [FilingStatus.MFJ]: b([
      [0.015, 8000],
      [0.032, 25000],
      [0.043, 50000],
      [0.047, 100000],
      [0.049, 315000],
      [0.059, Infinity]
    ]),
    [FilingStatus.MFS]: b([
      [0.015, 4000],
      [0.032, 12500],
      [0.043, 25000],
      [0.047, 50000],
      [0.049, 157500],
      [0.059, Infinity]
    ]),
    [FilingStatus.HOH]: b([
      [0.015, 5500],
      [0.032, 16500],
      [0.043, 33500],
      [0.047, 66500],
      [0.049, 210000],
      [0.059, Infinity]
    ]),
    [FilingStatus.W]: b([
      [0.015, 8000],
      [0.032, 25000],
      [0.043, 50000],
      [0.047, 100000],
      [0.049, 315000],
      [0.059, Infinity]
    ])
  },
  standardDeduction: ded(14600, 29200, 14600, 21900),
  personalExemption: 0,
  dependentExemption: 0
}

// ─── North Dakota ──────────────────────────────────────────
export const ND: ProgressiveStateConfig = {
  state: 'ND',
  formName: 'ND-1',
  brackets: {
    [FilingStatus.S]: b([
      [0, 47150],
      [0.0195, 238200],
      [0.025, Infinity]
    ]),
    [FilingStatus.MFJ]: b([
      [0, 78775],
      [0.0195, 289975],
      [0.025, Infinity]
    ]),
    [FilingStatus.MFS]: b([
      [0, 39388],
      [0.0195, 144988],
      [0.025, Infinity]
    ]),
    [FilingStatus.HOH]: b([
      [0, 62963],
      [0.0195, 264088],
      [0.025, Infinity]
    ]),
    [FilingStatus.W]: b([
      [0, 78775],
      [0.0195, 289975],
      [0.025, Infinity]
    ])
  },
  standardDeduction: ded(14600, 29200, 14600, 21900),
  personalExemption: 0,
  dependentExemption: 0
}

// ─── Oklahoma ──────────────────────────────────────────────
export const OK: ProgressiveStateConfig = {
  state: 'OK',
  formName: 'OK-511',
  brackets: {
    [FilingStatus.S]: b([
      [0.0025, 1000],
      [0.0075, 2500],
      [0.0175, 3750],
      [0.0275, 4900],
      [0.0375, 7200],
      [0.0475, Infinity]
    ]),
    [FilingStatus.MFJ]: b([
      [0.0025, 2000],
      [0.0075, 5000],
      [0.0175, 7500],
      [0.0275, 9800],
      [0.0375, 14400],
      [0.0475, Infinity]
    ]),
    [FilingStatus.MFS]: b([
      [0.0025, 1000],
      [0.0075, 2500],
      [0.0175, 3750],
      [0.0275, 4900],
      [0.0375, 7200],
      [0.0475, Infinity]
    ]),
    [FilingStatus.HOH]: b([
      [0.0025, 2000],
      [0.0075, 5000],
      [0.0175, 7500],
      [0.0275, 9800],
      [0.0375, 14400],
      [0.0475, Infinity]
    ]),
    [FilingStatus.W]: b([
      [0.0025, 2000],
      [0.0075, 5000],
      [0.0175, 7500],
      [0.0275, 9800],
      [0.0375, 14400],
      [0.0475, Infinity]
    ])
  },
  standardDeduction: ded(6350, 12700, 6350, 9350),
  personalExemption: 1000,
  dependentExemption: 1000
}

// ─── Oregon ────────────────────────────────────────────────
export const OR: ProgressiveStateConfig = {
  state: 'OR',
  formName: 'OR-40',
  brackets: {
    [FilingStatus.S]: b([
      [0.0475, 4400],
      [0.0675, 11050],
      [0.0875, 125000],
      [0.099, Infinity]
    ]),
    [FilingStatus.MFJ]: b([
      [0.0475, 8800],
      [0.0675, 22100],
      [0.0875, 250000],
      [0.099, Infinity]
    ]),
    [FilingStatus.MFS]: b([
      [0.0475, 4400],
      [0.0675, 11050],
      [0.0875, 125000],
      [0.099, Infinity]
    ]),
    [FilingStatus.HOH]: b([
      [0.0475, 8800],
      [0.0675, 22100],
      [0.0875, 250000],
      [0.099, Infinity]
    ]),
    [FilingStatus.W]: b([
      [0.0475, 8800],
      [0.0675, 22100],
      [0.0875, 250000],
      [0.099, Infinity]
    ])
  },
  standardDeduction: ded(2745, 5495, 2745, 4420),
  personalExemption: 0,
  dependentExemption: 0
}

// ─── Rhode Island ──────────────────────────────────────────
export const RI: ProgressiveStateConfig = {
  state: 'RI',
  formName: 'RI-1040',
  brackets: allSame(
    b([
      [0.0375, 79900],
      [0.0475, 181650],
      [0.0599, Infinity]
    ])
  ),
  standardDeduction: ded(10550, 21150, 10550, 15850),
  personalExemption: 4950,
  dependentExemption: 4950
}

// ─── South Carolina ────────────────────────────────────────
export const SC: ProgressiveStateConfig = {
  state: 'SC',
  formName: 'SC-1040',
  brackets: allSame(
    b([
      [0, 3460],
      [0.03, 17330],
      [0.062, Infinity]
    ])
  ),
  // SC starts from federal taxable income
  standardDeduction: ded(0, 0, 0, 0),
  personalExemption: 0,
  dependentExemption: 0
}

// ─── Vermont ───────────────────────────────────────────────
export const VT: ProgressiveStateConfig = {
  state: 'VT',
  formName: 'VT-IN111',
  brackets: {
    [FilingStatus.S]: b([
      [0.0335, 47900],
      [0.066, 116000],
      [0.076, 242000],
      [0.0875, Infinity]
    ]),
    [FilingStatus.MFJ]: b([
      [0.0335, 79950],
      [0.066, 193300],
      [0.076, 294600],
      [0.0875, Infinity]
    ]),
    [FilingStatus.MFS]: b([
      [0.0335, 39975],
      [0.066, 96650],
      [0.076, 147300],
      [0.0875, Infinity]
    ]),
    [FilingStatus.HOH]: b([
      [0.0335, 63975],
      [0.066, 154650],
      [0.076, 268300],
      [0.0875, Infinity]
    ]),
    [FilingStatus.W]: b([
      [0.0335, 79950],
      [0.066, 193300],
      [0.076, 294600],
      [0.0875, Infinity]
    ])
  },
  standardDeduction: ded(7400, 14850, 7400, 11100),
  personalExemption: 5100,
  dependentExemption: 5100
}

// ─── Wisconsin ─────────────────────────────────────────────
export const WI: ProgressiveStateConfig = {
  state: 'WI',
  formName: 'WI-1',
  brackets: {
    [FilingStatus.S]: b([
      [0.035, 14680],
      [0.044, 29370],
      [0.053, 323290],
      [0.0765, Infinity]
    ]),
    [FilingStatus.MFJ]: b([
      [0.035, 19580],
      [0.044, 39150],
      [0.053, 431060],
      [0.0765, Infinity]
    ]),
    [FilingStatus.MFS]: b([
      [0.035, 9790],
      [0.044, 19580],
      [0.053, 215530],
      [0.0765, Infinity]
    ]),
    [FilingStatus.HOH]: b([
      [0.035, 14680],
      [0.044, 29370],
      [0.053, 323290],
      [0.0765, Infinity]
    ]),
    [FilingStatus.W]: b([
      [0.035, 19580],
      [0.044, 39150],
      [0.053, 431060],
      [0.0765, Infinity]
    ])
  },
  // WI standard deduction phases out with income; these are max amounts.
  standardDeduction: ded(13230, 24490, 12240, 13230),
  personalExemption: 700,
  dependentExemption: 700
}

// ─── West Virginia ─────────────────────────────────────────
export const WV: ProgressiveStateConfig = {
  state: 'WV',
  formName: 'WV-IT140',
  brackets: allSame(
    b([
      [0.0222, 10000],
      [0.0296, 25000],
      [0.0333, 40000],
      [0.0444, 60000],
      [0.0482, Infinity]
    ])
  ),
  // WV uses personal exemptions, not a standard deduction
  standardDeduction: ded(0, 0, 0, 0),
  personalExemption: 2000,
  dependentExemption: 2000
}
