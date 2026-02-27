import { Information, TaxYear, TaxYears } from 'ustaxes/core/data'
import { YearsTaxesState } from 'ustaxes/redux'
import { stringToState } from 'ustaxes/redux/fs'
import { enumKeys } from 'ustaxes/core/util'

/**
 * Categories of data that can be selectively imported from a prior year.
 * Each category maps to specific fields on the Information interface.
 */
export enum ImportCategory {
  TAXPAYER_INFO = 'TAXPAYER_INFO',
  DEPENDENTS = 'DEPENDENTS',
  EMPLOYERS = 'EMPLOYERS',
  STATE_RESIDENCIES = 'STATE_RESIDENCIES',
  REFUND = 'REFUND',
  CAPITAL_LOSS_CARRYFORWARD = 'CAPITAL_LOSS_CARRYFORWARD',
  NOL_CARRYFORWARDS = 'NOL_CARRYFORWARDS',
  IRA_BASIS = 'IRA_BASIS',
  PRIOR_YEAR_AMT_CREDIT = 'PRIOR_YEAR_AMT_CREDIT'
}

export const importCategoryLabels: Record<ImportCategory, string> = {
  [ImportCategory.TAXPAYER_INFO]:
    'Taxpayer info (name, SSN, address, filing status)',
  [ImportCategory.DEPENDENTS]: 'Dependents',
  [ImportCategory.EMPLOYERS]: 'Employer information (from W-2s)',
  [ImportCategory.STATE_RESIDENCIES]: 'State residencies',
  [ImportCategory.REFUND]: 'Refund bank account',
  [ImportCategory.CAPITAL_LOSS_CARRYFORWARD]: 'Capital loss carryforward',
  [ImportCategory.NOL_CARRYFORWARDS]: 'Net operating loss carryforwards',
  [ImportCategory.IRA_BASIS]: 'IRA basis tracking (Form 8606)',
  [ImportCategory.PRIOR_YEAR_AMT_CREDIT]: 'Prior year AMT credit (Form 8801)'
}

export interface PriorYearData {
  availableYears: TaxYear[]
  state: YearsTaxesState
}

export interface ImportSummary {
  year: TaxYear
  taxpayerName: string | undefined
  hasDependents: boolean
  hasW2s: boolean
  hasRefund: boolean
  hasCapitalLossCarryforward: boolean
  hasNOLCarryforwards: boolean
  hasIraBasis: boolean
  hasF8801: boolean
  hasStateResidencies: boolean
}

/**
 * Parse a USTaxes save file and extract available years with data.
 */
export const parsePriorYearFile = (rawJson: string): PriorYearData => {
  const state = stringToState(rawJson)
  const allYears = enumKeys(TaxYears)
  const availableYears = allYears.filter((year) => {
    const info = state[year]
    return info.taxPayer.primaryPerson?.firstName !== undefined
  })

  return { availableYears, state }
}

/**
 * Build a summary of what data is available for import from a given year.
 */
export const getImportSummary = (
  info: Information,
  year: TaxYear
): ImportSummary => {
  const primary = info.taxPayer.primaryPerson
  const taxpayerName = primary
    ? `${primary.firstName} ${primary.lastName}`
    : undefined

  return {
    year,
    taxpayerName,
    hasDependents: info.taxPayer.dependents.length > 0,
    hasW2s: info.w2s.length > 0,
    hasRefund: info.refund !== undefined,
    hasCapitalLossCarryforward: info.capitalLossCarryforward !== undefined,
    hasNOLCarryforwards: info.netOperatingLossCarryforwards.length > 0,
    hasIraBasis: info.individualRetirementArrangements.some(
      (ira) => ira.priorYearBasis > 0 || ira.rothBasis > 0
    ),
    hasF8801: info.f8801Input !== undefined,
    hasStateResidencies: info.stateResidencies.length > 0
  }
}

/**
 * Build a merged Information object by selectively importing
 * fields from the prior year into the current year's data.
 */
export const buildImportedInfo = (
  currentInfo: Information,
  priorInfo: Information,
  categories: Set<ImportCategory>
): Information => {
  const result: Information = { ...currentInfo }

  if (categories.has(ImportCategory.TAXPAYER_INFO)) {
    result.taxPayer = {
      ...result.taxPayer,
      filingStatus: priorInfo.taxPayer.filingStatus,
      primaryPerson: priorInfo.taxPayer.primaryPerson,
      spouse: priorInfo.taxPayer.spouse,
      contactPhoneNumber: priorInfo.taxPayer.contactPhoneNumber,
      contactEmail: priorInfo.taxPayer.contactEmail
    }
  }

  if (categories.has(ImportCategory.DEPENDENTS)) {
    result.taxPayer = {
      ...result.taxPayer,
      dependents: priorInfo.taxPayer.dependents
    }
  }

  if (categories.has(ImportCategory.EMPLOYERS)) {
    // Import W2s with employer info but zero out income amounts,
    // since those change each year
    result.w2s = priorInfo.w2s.map((w2) => ({
      ...w2,
      income: 0,
      medicareIncome: 0,
      fedWithholding: 0,
      ssWages: 0,
      ssWithholding: 0,
      medicareWithholding: 0,
      stateWages: undefined,
      stateWithholding: undefined,
      box12: undefined
    }))
  }

  if (categories.has(ImportCategory.STATE_RESIDENCIES)) {
    result.stateResidencies = priorInfo.stateResidencies
  }

  if (categories.has(ImportCategory.REFUND)) {
    result.refund = priorInfo.refund
  }

  if (categories.has(ImportCategory.CAPITAL_LOSS_CARRYFORWARD)) {
    result.capitalLossCarryforward = priorInfo.capitalLossCarryforward
  }

  if (categories.has(ImportCategory.NOL_CARRYFORWARDS)) {
    result.netOperatingLossCarryforwards =
      priorInfo.netOperatingLossCarryforwards
  }

  if (categories.has(ImportCategory.IRA_BASIS)) {
    // Import IRA records with basis fields preserved, zero out
    // current-year distribution and contribution amounts
    result.individualRetirementArrangements =
      priorInfo.individualRetirementArrangements.map((ira) => ({
        ...ira,
        grossDistribution: 0,
        taxableAmount: 0,
        federalIncomeTaxWithheld: 0,
        contributions: 0,
        rolloverContributions: 0,
        rothIraConversion: 0,
        recharacterizedContributions: 0,
        requiredMinimumDistributions: 0,
        lateContributions: 0,
        repayments: 0,
        nondeductibleContributions: 0,
        rothDistributions: 0
        // Preserve: priorYearBasis, totalIraValue, rothBasis
      }))
  }

  if (categories.has(ImportCategory.PRIOR_YEAR_AMT_CREDIT)) {
    result.f8801Input = priorInfo.f8801Input
  }

  return result
}

/**
 * Determine which categories have data available for import.
 */
export const availableCategories = (
  summary: ImportSummary
): ImportCategory[] => {
  const categories: ImportCategory[] = []

  // Taxpayer info is always available if there's a name
  if (summary.taxpayerName) {
    categories.push(ImportCategory.TAXPAYER_INFO)
  }
  if (summary.hasDependents) {
    categories.push(ImportCategory.DEPENDENTS)
  }
  if (summary.hasW2s) {
    categories.push(ImportCategory.EMPLOYERS)
  }
  if (summary.hasStateResidencies) {
    categories.push(ImportCategory.STATE_RESIDENCIES)
  }
  if (summary.hasRefund) {
    categories.push(ImportCategory.REFUND)
  }
  if (summary.hasCapitalLossCarryforward) {
    categories.push(ImportCategory.CAPITAL_LOSS_CARRYFORWARD)
  }
  if (summary.hasNOLCarryforwards) {
    categories.push(ImportCategory.NOL_CARRYFORWARDS)
  }
  if (summary.hasIraBasis) {
    categories.push(ImportCategory.IRA_BASIS)
  }
  if (summary.hasF8801) {
    categories.push(ImportCategory.PRIOR_YEAR_AMT_CREDIT)
  }

  return categories
}
