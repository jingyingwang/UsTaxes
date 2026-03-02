import { enumKeys } from '../util'
import type {
  PropertyClass,
  DepreciationMethod,
  Convention
} from '../depreciation'

export enum TaxYears {
  Y2019 = 2019,
  Y2020 = 2020,
  Y2021 = 2021,
  Y2022 = 2022,
  Y2023 = 2023,
  Y2024 = 2024,
  Y2025 = 2025
}

export type TaxYear = keyof typeof TaxYears

export enum PersonRole {
  PRIMARY = 'PRIMARY',
  SPOUSE = 'SPOUSE',
  DEPENDENT = 'DEPENDENT',
  EMPLOYER = 'EMPLOYER'
}

/**
 * Types such as the following are generic with respect to the Date
 * type. AJV tests the typed serialization of these interfaces
 * in JSON, and Date is not a valid type in JSON. So when our data
 * is serialized in and out of local storage, or to a JSON file,
 * these data must be parsed / serialized from / to strings.
 *
 * Our AJV schema generator ignores generic types.
 */
export interface Person<D = Date> {
  firstName: string
  lastName: string
  ssid: string
  role: PersonRole
  isBlind: boolean
  dateOfBirth: D
}

// Concrete type for our AJV schema generator.
export type PersonDateString = Person<string>

export interface QualifyingInformation {
  numberOfMonths: number
  isStudent: boolean
}

export interface Dependent<D = Date> extends Person<D> {
  relationship: string
  qualifyingInfo?: QualifyingInformation
}

export type DependentDateString = Dependent<string>

export interface Address {
  address: string
  aptNo?: string
  city: string
  state?: State
  zip?: string
  foreignCountry?: string
  province?: string
  postalCode?: string
}

export interface PrimaryPerson<D = Date> extends Person<D> {
  address: Address
  isTaxpayerDependent: boolean
}
export type PrimaryPersonDateString = PrimaryPerson<string>

export interface Spouse<D = Date> extends Person<D> {
  isTaxpayerDependent: boolean
}

export type SpouseDateString = Spouse<string>

export interface Employer {
  EIN?: string
  employerName?: string
  address?: Address
}

export enum AccountType {
  checking = 'checking',
  savings = 'savings'
}

export interface Refund {
  routingNumber: string
  accountNumber: string
  accountType: AccountType
}

export interface IncomeW2 {
  occupation: string
  income: number
  medicareIncome: number
  fedWithholding: number
  ssWages: number
  ssWithholding: number
  medicareWithholding: number
  employer?: Employer
  personRole: PersonRole.PRIMARY | PersonRole.SPOUSE
  state?: State
  stateWages?: number
  stateWithholding?: number
  box12?: W2Box12Info
}

export interface EstimatedTaxPayments {
  label: string
  payment: number
}

export enum Income1099Type {
  B = 'B',
  INT = 'INT',
  DIV = 'DIV',
  NEC = 'NEC',
  R = 'R',
  SSA = 'SSA'
}

export interface F1099BData {
  // Basis reported to IRS (covered)
  shortTermBasisReportedProceeds: number
  shortTermBasisReportedCostBasis: number
  shortTermBasisReportedWashSale: number
  longTermBasisReportedProceeds: number
  longTermBasisReportedCostBasis: number
  longTermBasisReportedWashSale: number
  // Basis NOT reported to IRS (noncovered)
  shortTermBasisNotReportedProceeds: number
  shortTermBasisNotReportedCostBasis: number
  shortTermBasisNotReportedWashSale: number
  longTermBasisNotReportedProceeds: number
  longTermBasisNotReportedCostBasis: number
  longTermBasisNotReportedWashSale: number
}

export enum CostBasisMethod {
  FIFO = 'FIFO',
  SpecificId = 'SpecificId',
  AverageCost = 'AverageCost'
}

export interface CapitalLossCarryforward {
  shortTerm: number
  longTerm: number
}

export type LegacyF1099BData = {
  shortTermProceeds?: number
  shortTermCostBasis?: number
  longTermProceeds?: number
  longTermCostBasis?: number
}

export const normalizeF1099BData = (
  form: F1099BData & LegacyF1099BData
): F1099BData => ({
  shortTermBasisReportedProceeds:
    form.shortTermBasisReportedProceeds ?? form.shortTermProceeds ?? 0,
  shortTermBasisReportedCostBasis:
    form.shortTermBasisReportedCostBasis ?? form.shortTermCostBasis ?? 0,
  shortTermBasisReportedWashSale: form.shortTermBasisReportedWashSale ?? 0,
  shortTermBasisNotReportedProceeds:
    form.shortTermBasisNotReportedProceeds ?? 0,
  shortTermBasisNotReportedCostBasis:
    form.shortTermBasisNotReportedCostBasis ?? 0,
  shortTermBasisNotReportedWashSale:
    form.shortTermBasisNotReportedWashSale ?? 0,
  longTermBasisReportedProceeds:
    form.longTermBasisReportedProceeds ?? form.longTermProceeds ?? 0,
  longTermBasisReportedCostBasis:
    form.longTermBasisReportedCostBasis ?? form.longTermCostBasis ?? 0,
  longTermBasisReportedWashSale: form.longTermBasisReportedWashSale ?? 0,
  longTermBasisNotReportedProceeds: form.longTermBasisNotReportedProceeds ?? 0,
  longTermBasisNotReportedCostBasis:
    form.longTermBasisNotReportedCostBasis ?? 0,
  longTermBasisNotReportedWashSale: form.longTermBasisNotReportedWashSale ?? 0
})

export interface F1099IntData {
  income: number
  taxExemptInterest?: number // Box 8
  earlyWithdrawalPenalty?: number // Box 2
  // Box 9: Specified private activity bond interest (subject to AMT)
  privateActivityBondInterest?: number
}

export interface F1099DivData {
  dividends: number
  qualifiedDividends: number
  totalCapitalGainsDistributions: number
  foreignTaxPaid?: number // Box 7
}
/*
 TODO: Add in logic for various different distributions
 that should go in box 4a and 5a. Will need to implement
 form 8606 and Schedule 1 line 19.
 */
export enum PlanType1099 {
  /* IRA includes a traditional IRA, Roth IRA,
   * simplified employee pension (SEP) IRA,
   * and a savings incentive match plan for employees (SIMPLE) IRA
   */
  IRA = 'IRA',
  RothIRA = 'RothIRA',
  SepIRA = 'SepIRA',
  SimpleIRA = 'SimpleIRA',
  // Pension and annuity payments include distributions from 401(k), 403(b), and governmental 457(b) plans.
  Pension = 'Pension'
}

export const PlanType1099Texts: { [k in keyof typeof PlanType1099]: string } = {
  IRA: 'traditional IRA',
  RothIRA: 'Roth IRA',
  SepIRA: 'simplified employee pension (SEP) IRA',
  SimpleIRA: 'savings incentive match plan for employees (SIMPLE) IRA',
  Pension: '401(k), 403(b), or 457(b) plan'
}

export interface F1099RData {
  grossDistribution: number
  taxableAmount: number
  federalIncomeTaxWithheld: number
  planType: PlanType1099
}

export interface F1099SSAData {
  // benefitsPaid: number
  // benefitsRepaid: number
  netBenefits: number
  federalIncomeTaxWithheld: number
}

// See https://www.irs.gov/forms-pubs/about-form-1099-nec
export interface F1099NecData {
  nonemployeeCompensation: number // Box 1
  federalIncomeTaxWithheld: number // Box 4
}

export interface Income1099<T, D> {
  payer: string
  type: T
  form: D
  personRole: PersonRole.PRIMARY | PersonRole.SPOUSE
}
export enum W2Box12Code {
  A = 'A', // Uncollected social security or RRTA tax on tips.
  B = 'B', // Uncollected Medicare tax on tips.
  C = 'C', // Taxable cost of group-term life insurance over $50,000.
  D = 'D', // Elective deferrals under a section 401(k) cash or deferred arrangement (plan).
  E = 'E', // Elective deferrals under a section 403(b) salary reduction agreement.
  F = 'F', // Elective deferrals under a section 408(k)(6) salary reduction SEP.
  G = 'G', // Elective deferrals and employer contributions (including nonelective deferrals) to any governmental or nongovernmental section 457(b) deferred compensation plan.
  H = 'H', // Elective deferrals under section 501(c)(18)(D) tax-exempt organization plan.
  J = 'J', // Nontaxable sick pay.
  K = 'K', // 20% excise tax on excess golden parachute payments (not applicable to Forms W-2AS, W-2CM, W-2GU, or W-2VI).
  L = 'L', // Substantiated employee business expense reimbursements.
  M = 'M', // Uncollected social security or RRTA tax on taxable cost of group-term life insurance over $50,000 (for former employees).
  N = 'N', // Uncollected Medicare tax on taxable cost of group-term life insurance over $50,000 (for former employees).
  P = 'P', // Excludable moving expense reimbursements paid directly to a member of the U.S. Armed Forces.
  Q = 'Q', // Nontaxable combat pay.
  R = 'R', // Employer contributions to an Archer MSA.
  S = 'S', // Employee salary reduction contributions under a section 408(p) SIMPLE plan.
  T = 'T', // Adoption benefits.
  V = 'V', // Income from the exercise of nonstatutory stock option(s).
  W = 'W', // Employer contributions to a health savings account (HSA).
  Y = 'Y', // Deferrals under a section 409A nonqualified deferred compensation plan.
  Z = 'Z', // Income under a nonqualified deferred compensation plan that fails to satisfy section 409A.
  AA = 'AA', // Designated Roth contributions under a section 401(k) plan.
  BB = 'BB', // Designated Roth contributions under a section 403(b) plan.
  DD = 'DD', // Cost of employer-sponsored health coverage.
  EE = 'EE', // Designated Roth contributions under a governmental section 457(b) plan.
  FF = 'FF', // Permitted benefits under a qualified small employer health reimbursement arrangement.
  GG = 'GG', // Income from qualified equity grants under section 83(i).
  HH = 'HH' // Aggregate deferrals under section 83(i) elections as of the close of the calendar year.}
}

export const W2Box12CodeDescriptions: { [key in W2Box12Code]: string } = {
  A: 'Uncollected social security or RRTA tax on tips.',
  B: 'Uncollected Medicare tax on tips.',
  C: 'Taxable cost of group-term life insurance over $50,000.',
  D: 'Elective deferrals under a section 401(k) cash or deferred arrangement plan.',
  E: 'Elective deferrals under a section 403(b) salary reduction agreement.',
  F: 'Elective deferrals under a section 408(k)(6) salary reduction SEP.',
  G: 'Elective deferrals and employer contributions (including nonelective deferrals) to any governmental or nongovernmental section 457(b) deferred compensation plan.',
  H: 'Elective deferrals under section 501(c)(18)(D) tax-exempt organization plan.',
  J: 'Nontaxable sick pay.',
  K: '20% excise tax on excess golden parachute payments (not applicable to Forms W-2AS, W-2CM, W-2GU, or W-2VI).',
  L: 'Substantiated employee business expense reimbursements.',
  M: 'Uncollected social security or RRTA tax on taxable cost of group-term life insurance over $50,000 (for former employees).',
  N: 'Uncollected Medicare tax on taxable cost of group-term life insurance over $50,000 (for former employees).',
  P: 'Excludable moving expense reimbursements paid directly to a member of the U.S. Armed Forces.',
  Q: 'Nontaxable combat pay.',
  R: 'Employer contributions to an Archer MSA.',
  S: 'Employee salary reduction contributions under a section 408(p) SIMPLE plan.',
  T: 'Adoption benefits.',
  V: 'Income from the exercise of nonstatutory stock option(s).',
  W: 'Employer contributions to a health savings account (HSA).',
  Y: 'Deferrals under a section 409A nonqualified deferred compensation plan.',
  Z: 'Income under a nonqualified deferred compensation plan that fails to satisfy section 409A.',
  AA: 'Designated Roth contributions under a section 401(k) plan.',
  BB: 'Designated Roth contributions under a section 403(b) plan.',
  DD: 'Cost of employer-sponsored health coverage.',
  EE: 'Designated Roth contributions under a governmental section 457(b) plan.',
  FF: 'Permitted benefits under a qualified small employer health reimbursement arrangement.',
  GG: 'Income from qualified equity grants under section 83(i).',
  HH: 'Aggregate deferrals under section 83(i) elections as of the close of the calendar year.'
}

export type W2Box12Info<A = number> = { [key in W2Box12Code]?: A }

export interface HealthSavingsAccount<D = Date> {
  label: string
  coverageType: 'self-only' | 'family'
  contributions: number
  personRole: PersonRole.PRIMARY | PersonRole.SPOUSE
  startDate: D
  endDate: D
  totalDistributions: number
  qualifiedDistributions: number
}

export type HealthSavingsAccountDateString = HealthSavingsAccount<string>

export enum IraPlanType {
  IRA = 'IRA',
  RothIRA = 'RothIRA',
  SepIRA = 'SepIRA',
  SimpleIRA = 'SimpleIRA'
}

export const IraPlanTypeTexts = {
  [IraPlanType.IRA]: 'Traditional IRA',
  [IraPlanType.RothIRA]: 'Roth IRA',
  [IraPlanType.SepIRA]: 'Simplified employee pension (SEP) IRA',
  [IraPlanType.SimpleIRA]:
    'Savings incentive match plan for employees (SIMPLE) IRA'
}

export type IraPlanName = keyof typeof IraPlanType

export const iraPlanNames: IraPlanName[] = enumKeys(IraPlanType)
// export const iraPlanNames: IraPlanName[] = [
//   'IRA',
//   'RothIRA',
//   'SepIRA',
//   'SimpleIRA'
// ]

export interface Ira {
  payer: string
  personRole: PersonRole.PRIMARY | PersonRole.SPOUSE
  // fields about distributions from form 1099-R
  grossDistribution: number // 1099-R box 1
  taxableAmount: number // 1099-R box 2a
  taxableAmountNotDetermined: boolean // 1099-R box 2b
  totalDistribution: boolean // 1099-R box 2b
  federalIncomeTaxWithheld: number // 1099-R box 4
  planType: IraPlanType
  // fields about contributions from form 5498
  contributions: number // contributions depending on the plan type
  rolloverContributions: number // 5498 box 2
  rothIraConversion: number // 5498 box 3
  recharacterizedContributions: number // 5498 box 4
  requiredMinimumDistributions: number // 5498 box 12b
  lateContributions: number // 5498 box 13a
  repayments: number // 5498 box 14a
  // Form 8606 basis tracking fields
  nondeductibleContributions: number // current year nondeductible contributions (8606 line 1)
  priorYearBasis: number // total basis from prior years (8606 line 2)
  totalIraValue: number // year-end value of all traditional IRAs (8606 line 6)
  // Roth distribution tracking (Part III)
  rothDistributions: number // total Roth IRA distributions
  rothBasis: number // Roth IRA contribution basis
}

export enum FilingStatus {
  S = 'S',
  MFJ = 'MFJ',
  MFS = 'MFS',
  HOH = 'HOH',
  W = 'W'
}

export type FilingStatusName = keyof typeof FilingStatus

export const FilingStatusTexts = {
  [FilingStatus.S]: 'Single',
  [FilingStatus.MFJ]: 'Married Filing Jointly',
  [FilingStatus.MFS]: 'Married Filing Separately',
  [FilingStatus.HOH]: 'Head of Household',
  [FilingStatus.W]: 'Widow(er)'
}

export const filingStatuses = <D>(
  p: TaxPayer<D> | undefined
): FilingStatus[] => {
  let withDependents: FilingStatus[] = []
  let spouseStatuses: FilingStatus[] = []

  if ((p?.dependents ?? []).length > 0) {
    withDependents = [FilingStatus.HOH]
  }
  if (p?.spouse !== undefined) {
    spouseStatuses = [FilingStatus.MFJ, FilingStatus.MFS]
    // HoH not available if married
    withDependents = []
  } else {
    spouseStatuses = [FilingStatus.S, FilingStatus.W]
  }
  return [...spouseStatuses, ...withDependents]
}

export interface ContactInfo {
  contactPhoneNumber?: string
  contactEmail?: string
}

export interface TaxPayer<D = Date> extends ContactInfo {
  filingStatus?: FilingStatus
  primaryPerson?: PrimaryPerson<D>
  spouse?: Spouse<D>
  dependents: Dependent<D>[]
}

export type TaxPayerDateString = TaxPayer<string>

export type Income1099Int = Income1099<Income1099Type.INT, F1099IntData>
export type Income1099B = Income1099<Income1099Type.B, F1099BData>
export type Income1099Div = Income1099<Income1099Type.DIV, F1099DivData>
export type Income1099Nec = Income1099<Income1099Type.NEC, F1099NecData>
export type Income1099R = Income1099<Income1099Type.R, F1099RData>
export type Income1099SSA = Income1099<Income1099Type.SSA, F1099SSAData>

export type Supported1099 =
  | Income1099Int
  | Income1099B
  | Income1099Div
  | Income1099Nec
  | Income1099R
  | Income1099SSA

export enum PropertyType {
  singleFamily,
  multiFamily,
  vacation,
  commercial,
  land,
  selfRental,
  other
}

export type PropertyTypeName = keyof typeof PropertyType

export enum PropertyExpenseType {
  advertising,
  auto,
  cleaning,
  commissions,
  insurance,
  legal,
  management,
  mortgage,
  otherInterest,
  repairs,
  supplies,
  taxes,
  utilities,
  depreciation,
  other
}

export type PropertyExpenseTypeName = keyof typeof PropertyExpenseType

export interface Property {
  address: Address
  rentalDays: number
  personalUseDays: number
  rentReceived: number
  propertyType: PropertyTypeName
  otherPropertyType?: string
  qualifiedJointVenture: boolean
  expenses: Partial<{ [K in PropertyExpenseTypeName]: number }>
  otherExpenseType?: string
}

// Schedule E Part I royalty income (lines 4, expenses)
export enum RoyaltyExpenseType {
  advertising,
  auto,
  cleaning,
  commissions,
  insurance,
  legal,
  management,
  interestMortgage,
  interestOther,
  repairs,
  supplies,
  taxes,
  utilities,
  depreciation,
  other
}

export type RoyaltyExpenseTypeName = keyof typeof RoyaltyExpenseType

export interface RoyaltyIncome {
  personRole: PersonRole.PRIMARY | PersonRole.SPOUSE
  payerName: string
  royaltyReceived: number
  expenses: Partial<{ [K in RoyaltyExpenseTypeName]: number }>
  otherExpenseType?: string
}

export interface F1098e {
  lender: string
  interest: number
}

export enum EducationCreditType {
  AOTC = 'AOTC',
  LLC = 'LLC'
}

export interface EducationStudent {
  role: PersonRole
  dependentIndex?: number
}

export interface F1098t {
  student: EducationStudent
  creditType: EducationCreditType
  institution: string
  institutionEin?: string
  paymentsReceived: number
  adjustmentsToQualifiedExpenses: number
  scholarshipsOrGrants: number
  adjustmentsToScholarships: number
  additionalQualifiedExpenses: number
  otherTaxFreeAssistance: number
  atLeastHalfTime: boolean
  graduateStudent: boolean
  aotcClaimedYears: number
  felonyDrugConviction: boolean
}

export interface F3921 {
  name: string
  personRole: PersonRole.PRIMARY | PersonRole.SPOUSE
  exercisePricePerShare: number
  fmv: number
  numShares: number
}

// IRS Form 3922: Transfer of Stock Acquired Through an Employee Stock Purchase Plan
// See https://www.irs.gov/forms-pubs/about-form-3922
export interface F3922 {
  name: string
  personRole: PersonRole.PRIMARY | PersonRole.SPOUSE
  fmvPerShareOnGrant: number // Box 3: FMV per share on date of grant
  fmvPerShareOnExercise: number // Box 4: FMV per share on date of exercise
  exercisePricePerShare: number // Box 5: Exercise price paid per share
  numShares: number // Box 6: Number of shares transferred
}

// Schedule C expense categories (Part II, lines 8-27)
export enum ScheduleCExpenseType {
  advertising,
  carAndTruck,
  commissions,
  contractLabor,
  depletion,
  depreciation,
  employeeBenefitPrograms,
  insurance,
  interestMortgage,
  interestOther,
  legalAndProfessional,
  officeExpense,
  pensionAndProfitSharing,
  rentVehicles,
  rentOther,
  repairs,
  supplies,
  taxesAndLicenses,
  travel,
  deductibleMeals,
  utilities,
  wages,
  otherExpenses
}

export type ScheduleCExpenseTypeName = keyof typeof ScheduleCExpenseType

export enum AccountingMethod {
  cash = 'cash',
  accrual = 'accrual',
  other = 'other'
}

// See https://www.irs.gov/forms-pubs/about-schedule-c-form-1040
export interface ScheduleCInput {
  personRole: PersonRole.PRIMARY | PersonRole.SPOUSE
  businessName: string
  businessActivityCode: string
  businessDescription: string
  ein?: string
  businessAddress?: Address
  accountingMethod: AccountingMethod

  // Part I: Income
  grossReceipts: number // Line 1
  returns: number // Line 2
  otherIncome: number // Line 6

  // Part III: Cost of Goods Sold
  beginningInventory: number // Line 35
  purchases: number // Line 36
  costOfLabor: number // Line 37
  materialsAndSupplies: number // Line 38
  otherCosts: number // Line 39
  endingInventory: number // Line 41

  // Part II: Expenses (lines 8-27)
  expenses: Partial<{ [K in ScheduleCExpenseTypeName]: number }>
  otherExpenseType?: string
}

// See https://www.irs.gov/forms-pubs/about-form-8829
export type HomeOfficeMethod = 'regular' | 'simplified'

export interface HomeOfficeInput {
  // Which Schedule C business this home office belongs to
  businessIndex: number
  // Method choice
  method: HomeOfficeMethod

  // Part I: Area used for business
  officeSquareFootage: number // Area used regularly and exclusively for business
  totalHomeSquareFootage: number // Total area of home

  // Part II: Actual expenses (Regular method only)
  // Direct expenses are 100% deductible; indirect are prorated by business %
  directMortgageInterest: number
  directRealEstateTaxes: number
  indirectMortgageInterest: number
  indirectRealEstateTaxes: number
  indirectInsurance: number
  indirectRent: number
  indirectRepairs: number
  indirectUtilities: number
  indirectOtherExpenses: number

  // Part III: Depreciation (Regular method only)
  homeCostOrBasis: number // Cost or adjusted basis of home (excluding land)
  homeValueOfLand: number // Value of land

  // Carryover from prior year (Regular method only)
  carryoverFromPriorYear: number
}

// See https://www.irs.gov/forms-pubs/about-form-6781
// Section 1256 contracts: regulated futures, foreign currency, non-equity options
// Subject to 60% long-term / 40% short-term split and mark-to-market treatment
export interface Section1256Contract {
  description: string
  gainOrLoss: number // Positive = gain, negative = loss (mark-to-market)
}

export interface Form6781Input {
  section1256Contracts: Section1256Contract[]
  // Line 5: Net section 1256 contracts loss election (carryback to prior years)
  netSectionLossElection: number
}

// Schedule F expense categories (Part II, lines 12-32)
export enum ScheduleFExpenseType {
  carAndTruck,
  chemicals,
  conservation,
  customHire,
  depreciation,
  employeeBenefitPrograms,
  feed,
  fertilizers,
  freight,
  gasoline,
  insurance,
  interestMortgage,
  interestOther,
  labor,
  pensionAndProfitSharing,
  rentVehicles,
  rentOther,
  repairs,
  seeds,
  storage,
  supplies,
  taxes,
  utilities,
  veterinary,
  otherExpenses
}

export type ScheduleFExpenseTypeName = keyof typeof ScheduleFExpenseType

// See https://www.irs.gov/forms-pubs/about-schedule-f-form-1040
export interface ScheduleFInput {
  personRole: PersonRole.PRIMARY | PersonRole.SPOUSE
  farmName: string
  principalProduct: string
  ein?: string
  farmAddress?: Address
  accountingMethod: AccountingMethod

  // Part I: Farm Income — Cash Method
  salesLivestock: number // Line 1a (sales of livestock/other resale items)
  costBasisLivestock: number // Line 1b (cost or other basis)
  salesRaised: number // Line 2 (sales of livestock, produce, grains, etc. you raised)
  cooperativeDistributions: number // Line 3a
  cooperativeDistributionsTaxable: number // Line 3b
  agriculturalProgramPayments: number // Line 4a
  agriculturalProgramPaymentsTaxable: number // Line 4b
  cccLoansReported: number // Line 5a (CCC loans reported under election)
  cccLoansForfeited: number // Line 5b (CCC loans forfeited)
  cropInsuranceProceeds: number // Line 6a
  cropInsuranceTaxable: number // Line 6b
  customHireIncome: number // Line 7
  otherFarmIncome: number // Line 8

  // Part II: Farm Expenses (lines 12-32)
  expenses: Partial<{ [K in ScheduleFExpenseTypeName]: number }>
  otherExpenseType?: string
}

export type EditScheduleFAction = ArrayItemEditAction<ScheduleFInput>

// See https://www.irs.gov/forms-pubs/about-form-8801
// Prior year AMT credit information needed for Form 8801
export interface F8801Input {
  // Prior year minimum tax credit carryforward (prior year Form 8801, line 26)
  priorYearMinimumTaxCredit: number
  // Prior year net minimum tax from exclusion items (prior year Form 8801, line 7 or recomputed)
  priorYearNetMinimumTaxOnExclusionItems: number
}

// See https://www.irs.gov/forms-pubs/about-schedule-h-form-1040
export interface ScheduleHInput {
  // Total cash wages paid to household employees
  cashWages: number
  // Federal income tax withheld (if any, from W-2)
  federalIncomeTaxWithheld: number
  // Did you pay total cash wages of $1,000 or more in any calendar quarter?
  paidOver1000InQuarter: boolean
  // State where FUTA tax was paid (for state unemployment credit)
  state?: State
  // State unemployment contributions paid
  stateUnemploymentContributions: number
  // Were all state unemployment contributions paid by the due date of Form 1040?
  contributionsPaidByDueDate: boolean
  // Were you a household employer in a credit reduction state?
  creditReductionState: boolean
}

// See https://www.irs.gov/instructions/i1065sk1
export interface ScheduleK1Form1065 {
  personRole: PersonRole.PRIMARY | PersonRole.SPOUSE
  partnershipName: string
  partnershipEin: string
  partnerOrSCorp: 'P' | 'S'
  isForeign: boolean
  isPassive: boolean
  ordinaryBusinessIncome: number // Schedule E (Form 1040), line 28, column (i) or (k).
  interestIncome: number // Form 1040, line 2b
  guaranteedPaymentsForServices: number // Schedule E (Form 1040), line 28, column (k)
  guaranteedPaymentsForCapital: number // Schedule E (Form 1040), line 28, column (k)
  selfEmploymentEarningsA: number // Schedule SE (Form 1040)
  selfEmploymentEarningsB: number // Schedule SE (Form 1040)
  selfEmploymentEarningsC: number // Schedule SE (Form 1040)
  distributionsCodeAAmount: number // If the amount shown as code A exceeds the adjusted basis of your partnership interest immediately before the distribution, the excess is treated as gain from the sale or exchange of your partnership interest. Generally, this gain is treated as gain from the sale of a capital asset and should be reported on Form 8949 and the Schedule D for your return.
  section199AQBI: number // Form 8995 or 8995-A
}

// Form 2441: Child and Dependent Care Credit
export interface CareProvider {
  name: string
  address?: Address
  identifyingNumber: string // SSN or EIN
  amountPaid: number
}

export interface CareExpense {
  dependentIndex: number // index into taxpayer.dependents[]
  amount: number
}

// See https://www.irs.gov/forms-pubs/about-form-2441
export interface Form2441Input {
  careProviders: CareProvider[]
  careExpenses: CareExpense[]
  // Total employer-provided dependent care benefits (W-2 box 10)
  dependentCareBenefits: number
}
// Form 8839 - Qualified Adoption Expenses
export interface AdoptionChild {
  childName: string
  yearOfBirth: number
  isSpecialNeeds: boolean
  isForeignAdoption: boolean
  // Part II: Qualifying adoption expenses paid for this child
  qualifyingExpenses: number
  // Part III: Employer-provided adoption benefits received for this child (W-2 Box 12, Code T attributed to this child)
  employerBenefitsReceived: number
  // Part III: Employer-provided adoption benefits excluded from income in prior years for this child
  priorYearEmployerBenefitsExcluded: number
}

export interface F8839Input {
  adoptions: AdoptionChild[] // up to 3 per form
  // Prior year adoption credit carryforward (Part II, line 13)
  priorYearCreditCarryforward: number
}

// Form 1040X - Amended Return data
export interface AmendedReturnLine {
  lineDescription: string
  columnA: number
  columnB: number
  explanation: string
}

export interface AmendedReturnData {
  taxYearAmended: string
  filingStatus: FilingStatus
  lines: AmendedReturnLine[]
  partIIIExplanation: string
}

export type EditAmendedReturnAction = ArrayItemEditAction<AmendedReturnData>

// See https://www.irs.gov/instructions/i1120ssk1
export interface ScheduleK1Form1120S {
  personRole: PersonRole.PRIMARY | PersonRole.SPOUSE
  corporationName: string
  corporationEin: string
  isForeign: boolean
  isPassive: boolean
  ordinaryBusinessIncome: number
  netRentalRealEstateIncome: number
  otherNetRentalIncome: number
  interestIncome: number
  ordinaryDividends: number
  qualifiedDividends: number
  royalties: number
  netShortTermCapitalGain: number
  netLongTermCapitalGain: number
  section199AQBI: number
}

// See https://www.irs.gov/instructions/i1041sk1
export interface ScheduleK1Form1041 {
  personRole: PersonRole.PRIMARY | PersonRole.SPOUSE
  estateTrustName: string
  estateTrustEin: string
  isForeign: boolean
  isPassive: boolean
  interestIncome: number
  ordinaryDividends: number
  qualifiedDividends: number
  netShortTermCapitalGain: number
  netLongTermCapitalGain: number
  otherPortfolioAndNonbusinessIncome: number
  ordinaryBusinessIncome: number
  netRentalRealEstateIncome: number
  otherRentalIncome: number
  directlyApportionedDeductions: number
  section199AQBI: number
}

export interface ItemizedDeductions {
  medicalAndDental: string | number
  stateAndLocalTaxes: string | number
  isSalesTax: boolean
  stateAndLocalRealEstateTaxes: string | number
  stateAndLocalPropertyTaxes: string | number
  interest8a: string | number
  interest8b: string | number
  interest8c: string | number
  interest8d: string | number
  investmentInterest: string | number
  charityCashCheck: string | number
  charityOther: string | number
  casualtyAndTheftLosses: string | number
}

export type CasualtyLossUse = 'Personal' | 'Business' | 'Income'

export interface CasualtyTheftLoss {
  description: string
  date: string
  use: CasualtyLossUse
  isFederallyDeclaredDisaster: boolean
  costOrBasis: number
  fmvBefore: number
  fmvAfter: number
  reimbursement: number
}

export type State =
  | 'AL'
  | 'AK'
  | 'AZ'
  | 'CO'
  | 'DC'
  | 'FL'
  | 'HI'
  | 'ID'
  | 'IN'
  | 'KY'
  | 'MA'
  | 'ME'
  | 'MN'
  | 'MS'
  | 'NC'
  | 'NE'
  | 'NJ'
  | 'NV'
  | 'OH'
  | 'OR'
  | 'RI'
  | 'SD'
  | 'TX'
  | 'VA'
  | 'WA'
  | 'WV'
  | 'AR'
  | 'CA'
  | 'CT'
  | 'DE'
  | 'GA'
  | 'IA'
  | 'IL'
  | 'KS'
  | 'LA'
  | 'MD'
  | 'MI'
  | 'MO'
  | 'MT'
  | 'ND'
  | 'NH'
  | 'NM'
  | 'NY'
  | 'OK'
  | 'PA'
  | 'SC'
  | 'TN'
  | 'UT'
  | 'VT'
  | 'WI'
  | 'WY'

// Hold information about state residency
// TODO: Support part-year state residency
export interface StateResidency {
  state: State
}

// Defines usable tag names for each question later defined,
// and maps to a type which is the expected response type.
export interface QuestionTag {
  CRYPTO: boolean
  FOREIGN_ACCOUNT_EXISTS: boolean
  FINCEN_114: boolean
  FINCEN_114_ACCOUNT_COUNTRY: string
  FORM_8938_REQUIRED: boolean
  FORM_8938_ASSET_CATEGORIES: string
  FORM_8938_MAX_VALUE: string
  FORM_8938_INCOME_REPORTED: string
  FOREIGN_TRUST_RELATIONSHIP: boolean
  LIVE_APART_FROM_SPOUSE: boolean
  HSA_TESTING_PERIOD_FAILED: boolean
}

export type QuestionTagName = keyof QuestionTag

// Typescript provides no way to access
// keys of an interface at runtime.
export const questionTagNames: QuestionTagName[] = [
  'CRYPTO',
  'FOREIGN_ACCOUNT_EXISTS',
  'FINCEN_114',
  'FINCEN_114_ACCOUNT_COUNTRY',
  'FORM_8938_REQUIRED',
  'FORM_8938_ASSET_CATEGORIES',
  'FORM_8938_MAX_VALUE',
  'FORM_8938_INCOME_REPORTED',
  'FOREIGN_TRUST_RELATIONSHIP',
  'LIVE_APART_FROM_SPOUSE',
  'HSA_TESTING_PERIOD_FAILED'
]

export type ValueTag = 'string' | 'boolean'

export type Responses = Partial<QuestionTag> // Defines usable tag names for each question later defined,

export enum CreditType {
  AdvanceChildTaxCredit = 'CreditType/AdvanceChildTaxCredit',
  Other = 'CreditType/Other'
}

export interface Credit {
  recipient: PersonRole
  amount: number
  type: CreditType
}

/**
 * Represents a net operating loss from a specific tax year that can be
 * carried forward to future years. Post-TCJA (2018+) NOLs are limited
 * to offsetting 80% of taxable income; pre-2018 NOLs offset 100%.
 */
export interface NOLCarryforward {
  /** The tax year in which the NOL was originally generated */
  year: number
  /** The remaining NOL amount available for carryforward (positive number) */
  amount: number
}

/**
 * User-input form of a depreciable asset for Form 4562.
 * Generic over date type D so it can serialize to/from JSON.
 */
export interface DepreciableAssetInput<D = Date> {
  description: string
  datePlacedInService: D
  cost: number
  propertyClass: PropertyClass
  method: DepreciationMethod
  convention: Convention
  section179Election: number
  bonusDepreciationEligible: boolean
  businessIndex: number
  quarterPlaced?: 1 | 2 | 3 | 4
}

export interface Information<D = Date> {
  f1099s: Supported1099[]
  w2s: IncomeW2[]
  realEstate: Property[]
  royaltyIncomes: RoyaltyIncome[]
  estimatedTaxes: EstimatedTaxPayments[]
  f1098es: F1098e[]
  f1098ts: F1098t[]
  f3921s: F3921[]
  f3922s: F3922[]
  scheduleCInputs: ScheduleCInput[]
  homeOfficeInputs: HomeOfficeInput[]
  scheduleFInputs: ScheduleFInput[]
  scheduleHInputs: ScheduleHInput[]
  scheduleK1Form1065s: ScheduleK1Form1065[]
  form6781: Form6781Input[]
  installmentSales?: InstallmentSale[]
  scheduleK1Form1120Ss: ScheduleK1Form1120S[]
  scheduleK1Form1041s: ScheduleK1Form1041[]
  itemizedDeductions: ItemizedDeductions | undefined
  casualtyTheftLosses?: CasualtyTheftLoss[]
  likeKindExchanges?: LikeKindExchange[]
  priorYearTax?: number
  form2441Input: Form2441Input | undefined
  refund?: Refund
  taxPayer: TaxPayer<D>
  questions: Responses
  credits: Credit[]
  stateResidencies: StateResidency[]
  healthSavingsAccounts: HealthSavingsAccount<D>[]
  individualRetirementArrangements: Ira[]
  capitalLossCarryforward?: CapitalLossCarryforward
  netOperatingLossCarryforwards: NOLCarryforward[]
  f8801Input?: F8801Input
  f8839Input?: F8839Input
  amendedReturns: AmendedReturnData[]
  depreciableAssets: DepreciableAssetInput<D>[]
}

export type InformationDateString = Information<string>

/**
 * An asset can be anything that is transactable, such as a stock,
 * bond, mutual fund, real estate, or cryptocurrency, which is not reported
 * on 1099-B. A position always has an open date. A position may
 * be sold, at which time its gain or loss will be reported,
 * or it may be gifted to another person, at which time its
 * gain or loss will not be reported.
 *
 * An asset can be carried across multiple tax years,
 * so it should not be a sibling rather than a member of `Information`.
 *
 * If a position is real estate, then it has a state, which will
 * require state apportionment.
 *
 * "Closing an asset" can result in a long-term or short-term capital
 * gain. An asset is closed when it gets a closeDate.
 */
export type AssetType = 'Security' | 'Real Estate'
export interface Asset<D = Date> {
  name: string
  positionType: AssetType
  openDate: D
  closeDate?: D
  giftedDate?: D
  openPrice: number
  openFee: number
  closePrice?: number
  closeFee?: number
  quantity: number
  state?: State
  costBasisMethod?: CostBasisMethod
  washSaleAdjustment?: number
  basisReportedToIRS?: boolean
}

export type SoldAsset<D> = Asset<D> & {
  closePrice: number
  closeDate: D
}

export interface LikeKindExchange {
  description: string
  fmvReceived: number
  adjustedBasis: number
  bootPaid: number
  bootReceived: number
  fmvPropertyReceived: number
}

export type InstallmentSaleType = 'capital' | 'business'
export interface InstallmentSale {
  description: string
  contractPrice: number
  grossProfit: number
  paymentsReceived: number
  type: InstallmentSaleType
}

export const isSold = <D>(p: Asset<D>): p is SoldAsset<D> => {
  return p.closeDate !== undefined && p.closePrice !== undefined
}

export type AssetString = Asset<string>

// Validated action types:

export interface ArrayItemEditAction<A> {
  index: number
  value: A
}

export type EditDependentAction = ArrayItemEditAction<DependentDateString>
export type EditW2Action = ArrayItemEditAction<IncomeW2>
export type EditEstimatedTaxesAction = ArrayItemEditAction<EstimatedTaxPayments>
export type Edit1099Action = ArrayItemEditAction<Supported1099>
export type EditPropertyAction = ArrayItemEditAction<Property>
export type EditCasualtyTheftLossAction = ArrayItemEditAction<CasualtyTheftLoss>
export type Edit1098eAction = ArrayItemEditAction<F1098e>
export type Edit1098tAction = ArrayItemEditAction<F1098t>
export type EditHSAAction = ArrayItemEditAction<HealthSavingsAccountDateString>
export type EditIraAction = ArrayItemEditAction<Ira>
export type EditAssetAction = ArrayItemEditAction<Asset<Date>>
export type EditF3921Action = ArrayItemEditAction<F3921>
export type EditF3922Action = ArrayItemEditAction<F3922>
export type EditScheduleCAction = ArrayItemEditAction<ScheduleCInput>
export type EditHomeOfficeAction = ArrayItemEditAction<HomeOfficeInput>
export type EditScheduleHAction = ArrayItemEditAction<ScheduleHInput>
export type EditRoyaltyIncomeAction = ArrayItemEditAction<RoyaltyIncome>
export type EditScheduleK1Form1065Action =
  ArrayItemEditAction<ScheduleK1Form1065>
export type EditForm6781Action = ArrayItemEditAction<Form6781Input>
export type EditScheduleK1Form1120SAction =
  ArrayItemEditAction<ScheduleK1Form1120S>
export type EditScheduleK1Form1041Action =
  ArrayItemEditAction<ScheduleK1Form1041>
export type EditCreditAction = ArrayItemEditAction<Credit>
export type EditNOLCarryforwardAction = ArrayItemEditAction<NOLCarryforward>
export type EditF8801InputAction = F8801Input | undefined
