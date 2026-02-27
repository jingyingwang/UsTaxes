import {
  Person,
  IncomeW2,
  Refund,
  DependentDateString,
  FilingStatus,
  PrimaryPersonDateString,
  ContactInfo,
  Supported1099,
  F1098e,
  F1098t,
  SpouseDateString,
  Property,
  StateResidency,
  Information,
  EstimatedTaxPayments,
  Responses,
  Ira,
  Asset,
  ItemizedDeductions,
  Form2441Input,
  F3921,
  F3922,
  CasualtyTheftLoss,
  ScheduleK1Form1065,
  ScheduleK1Form1120S,
  ScheduleK1Form1041,
  ScheduleCInput,
  ScheduleHInput,
  Form6781Input,
  ScheduleFInput,
  RoyaltyIncome,
  TaxYear,
  HealthSavingsAccountDateString,
  InformationDateString,
  Credit,
  EditCreditAction,
  CapitalLossCarryforward,
  NOLCarryforward,
  EditNOLCarryforwardAction,
  F8801Input,
  AmendedReturnData,
  EditAmendedReturnAction
} from 'ustaxes/core/data'

import {
  EditDependentAction,
  EditPropertyAction,
  Edit1099Action,
  EditW2Action,
  EditEstimatedTaxesAction,
  Edit1098eAction,
  Edit1098tAction,
  EditHSAAction,
  EditCasualtyTheftLossAction,
  EditIraAction,
  EditAssetAction,
  EditF3921Action,
  EditF3922Action,
  EditScheduleCAction,
  EditScheduleHAction,
  EditScheduleFAction,
  EditScheduleK1Form1065Action,
  EditForm6781Action,
  EditRoyaltyIncomeAction,
  EditScheduleK1Form1120SAction,
  EditScheduleK1Form1041Action
} from 'ustaxes/core/data'
import * as validators from 'ustaxes/core/data/validate'
import { index as indexValidator } from 'ustaxes/core/data/validate'
import { ValidateFunction } from 'ajv'
import { infoToStringInfo } from './data'

export enum ActionName {
  SAVE_REFUND_INFO = 'SAVE_REFUND_INFO',
  SAVE_PRIMARY_PERSON_INFO = 'SAVE_TAXPAYER_INFO',
  SAVE_CONTACT_INFO = 'SAVE_CONTACT_INFO',
  SAVE_STATE_RESIDENCY = 'SAVE_STATE_RESIDENCY',
  SAVE_FILING_STATUS_INFO = 'SAFE_FILING_STATUS_INFO',
  ADD_DEPENDENT = 'TAXPAYER/ADD_DEPENDENT',
  EDIT_DEPENDENT = 'TAXPAYER/EDIT_DEPENDENT',
  REMOVE_DEPENDENT = 'TAXPAYER/REMOVE_DEPENDENT',
  ADD_SPOUSE = 'TAXPAYER/ADD_SPOUSE',
  REMOVE_SPOUSE = 'TAXPAYER/REMOVE_SPOUSE',
  ADD_W2 = 'ADD_W2',
  EDIT_W2 = 'EDIT_W2',
  REMOVE_W2 = 'REMOVE_W2',
  ADD_ESTIMATED_TAX = 'ADD_ESTIMATED_TAX',
  EDIT_ESTIMATED_TAX = 'EDIT_ESTIMATED_TAX',
  REMOVE_ESTIMATED_TAX = 'REMOVE_ESTIMATED_TAX',
  ADD_1099 = 'ADD_1099',
  EDIT_1099 = 'EDIT_1099',
  REMOVE_1099 = 'REMOVE_1099',
  ADD_PROPERTY = 'ADD_PROPERTY',
  EDIT_PROPERTY = 'EDIT_PROPERTY',
  REMOVE_PROPERTY = 'REMOVE_PROPERTY',
  ANSWER_QUESTION = 'ANSWER_QUESTION',
  ADD_1098e = 'ADD_1098e',
  EDIT_1098e = 'EDIT_1098e',
  REMOVE_1098e = 'REMOVE_1098e',
  ADD_1098t = 'ADD_1098t',
  EDIT_1098t = 'EDIT_1098t',
  REMOVE_1098t = 'REMOVE_1098t',
  SET_ITEMIZED_DEDUCTIONS = 'SET_ITEMIZED_DEDUCTIONS',
  ADD_CASUALTY_THEFT_LOSS = 'ADD_CASUALTY_THEFT_LOSS',
  EDIT_CASUALTY_THEFT_LOSS = 'EDIT_CASUALTY_THEFT_LOSS',
  REMOVE_CASUALTY_THEFT_LOSS = 'REMOVE_CASUALTY_THEFT_LOSS',
  SET_FORM_2441 = 'SET_FORM_2441',
  ADD_HSA = 'ADD_HSA',
  EDIT_HSA = 'EDIT_HSA',
  REMOVE_HSA = 'REMOVE_HSA',
  SET_INFO = 'SET_INFO',
  SET_ACTIVE_YEAR = 'SET_ACTIVE_YEAR',
  PROPAGATE_YEAR_DATA = 'PROPAGATE_YEAR_DATA',
  ADD_IRA = 'ADD_IRA',
  EDIT_IRA = 'EDIT_IRA',
  REMOVE_IRA = 'REMOVE_IRA',
  ADD_ASSET = 'ASSETS/ADD',
  ADD_ASSETS = 'ASSETS/ADD_MANY',
  EDIT_ASSET = 'ASSETS/EDIT',
  REMOVE_ASSET = 'ASSETS/REMOVE',
  REMOVE_ASSETS = 'ASSETS/REMOVE_MANY',
  ADD_F3921 = 'F3921/ADD',
  EDIT_F3921 = 'F3921/EDIT',
  REMOVE_F3921 = 'F3921/REMOVE',
  ADD_F3922 = 'F3922/ADD',
  EDIT_F3922 = 'F3922/EDIT',
  REMOVE_F3922 = 'F3922/REMOVE',
  ADD_SCHEDULE_C = 'SCHEDULE_C/ADD',
  EDIT_SCHEDULE_C = 'SCHEDULE_C/EDIT',
  REMOVE_SCHEDULE_C = 'SCHEDULE_C/REMOVE',
  ADD_SCHEDULE_H = 'SCHEDULE_H/ADD',
  EDIT_SCHEDULE_H = 'SCHEDULE_H/EDIT',
  REMOVE_SCHEDULE_H = 'SCHEDULE_H/REMOVE',
  ADD_SCHEDULE_F = 'SCHEDULE_F/ADD',
  EDIT_SCHEDULE_F = 'SCHEDULE_F/EDIT',
  REMOVE_SCHEDULE_F = 'SCHEDULE_F/REMOVE',
  ADD_ROYALTY_INCOME = 'ROYALTY_INCOME/ADD',
  EDIT_ROYALTY_INCOME = 'ROYALTY_INCOME/EDIT',
  REMOVE_ROYALTY_INCOME = 'ROYALTY_INCOME/REMOVE',
  ADD_SCHEDULE_K1_F1065 = 'SCHEDULE_K1_F1065/ADD',
  EDIT_SCHEDULE_K1_F1065 = 'SCHEDULE_K1_F1065/EDIT',
  REMOVE_SCHEDULE_K1_F1065 = 'SCHEDULE_K1_F1065/REMOVE',
  ADD_FORM_6781 = 'FORM_6781/ADD',
  EDIT_FORM_6781 = 'FORM_6781/EDIT',
  REMOVE_FORM_6781 = 'FORM_6781/REMOVE',
  ADD_SCHEDULE_K1_F1120S = 'SCHEDULE_K1_F1120S/ADD',
  EDIT_SCHEDULE_K1_F1120S = 'SCHEDULE_K1_F1120S/EDIT',
  REMOVE_SCHEDULE_K1_F1120S = 'SCHEDULE_K1_F1120S/REMOVE',
  ADD_SCHEDULE_K1_F1041 = 'SCHEDULE_K1_F1041/ADD',
  EDIT_SCHEDULE_K1_F1041 = 'SCHEDULE_K1_F1041/EDIT',
  REMOVE_SCHEDULE_K1_F1041 = 'SCHEDULE_K1_F1041/REMOVE',
  ADD_CREDIT = 'CREDIT/ADD',
  EDIT_CREDIT = 'CREDIT/EDIT',
  REMOVE_CREDIT = 'CREDIT/REMOVE',
  SET_CAPITAL_LOSS_CARRYFORWARD = 'SET_CAPITAL_LOSS_CARRYFORWARD',
  SET_PRIOR_YEAR_TAX = 'SET_PRIOR_YEAR_TAX',
  ADD_NOL_CARRYFORWARD = 'NOL_CARRYFORWARD/ADD',
  EDIT_NOL_CARRYFORWARD = 'NOL_CARRYFORWARD/EDIT',
  REMOVE_NOL_CARRYFORWARD = 'NOL_CARRYFORWARD/REMOVE',
  SET_F8801_INPUT = 'SET_F8801_INPUT',
  ADD_AMENDED_RETURN = 'AMENDED_RETURN/ADD',
  EDIT_AMENDED_RETURN = 'AMENDED_RETURN/EDIT',
  REMOVE_AMENDED_RETURN = 'AMENDED_RETURN/REMOVE'
}

interface Save<T, R> {
  type: T
  year: TaxYear
  formData: R
}

type SaveRefundInfo = Save<typeof ActionName.SAVE_REFUND_INFO, Refund>
type SavePrimaryPersonInfo = Save<
  typeof ActionName.SAVE_PRIMARY_PERSON_INFO,
  PrimaryPersonDateString
>
type SaveFilingStatusInfo = Save<
  typeof ActionName.SAVE_FILING_STATUS_INFO,
  FilingStatus
>
type SaveContactInfo = Save<typeof ActionName.SAVE_CONTACT_INFO, ContactInfo>
type SaveStateResidencyInfo = Save<
  typeof ActionName.SAVE_STATE_RESIDENCY,
  StateResidency
>
type AddDependent = Save<typeof ActionName.ADD_DEPENDENT, DependentDateString>
type EditDependent = Save<typeof ActionName.EDIT_DEPENDENT, EditDependentAction>
type RemoveDependent = Save<typeof ActionName.REMOVE_DEPENDENT, number>
type AddSpouse = Save<typeof ActionName.ADD_SPOUSE, SpouseDateString>
type RemoveSpouse = Save<typeof ActionName.REMOVE_SPOUSE, Record<string, never>>
type AddW2 = Save<typeof ActionName.ADD_W2, IncomeW2>
type EditW2 = Save<typeof ActionName.EDIT_W2, EditW2Action>
type RemoveW2 = Save<typeof ActionName.REMOVE_W2, number>
type AddEstimatedTaxes = Save<
  typeof ActionName.ADD_ESTIMATED_TAX,
  EstimatedTaxPayments
>
type EditEstimatedTaxes = Save<
  typeof ActionName.EDIT_ESTIMATED_TAX,
  EditEstimatedTaxesAction
>
type RemoveEstimatedTaxes = Save<typeof ActionName.REMOVE_ESTIMATED_TAX, number>
type AddHSA = Save<typeof ActionName.ADD_HSA, HealthSavingsAccountDateString>
type EditHSA = Save<typeof ActionName.EDIT_HSA, EditHSAAction>
type RemoveHSA = Save<typeof ActionName.REMOVE_HSA, number>
type Add1099 = Save<typeof ActionName.ADD_1099, Supported1099>
type Edit1099 = Save<typeof ActionName.EDIT_1099, Edit1099Action>
type Remove1099 = Save<typeof ActionName.REMOVE_1099, number>
type AddProperty = Save<typeof ActionName.ADD_PROPERTY, Property>
type EditProperty = Save<typeof ActionName.EDIT_PROPERTY, EditPropertyAction>
type RemoveProperty = Save<typeof ActionName.REMOVE_PROPERTY, number>
type AnswerQuestion = Save<typeof ActionName.ANSWER_QUESTION, Responses>
type Add1098e = Save<typeof ActionName.ADD_1098e, F1098e>
type Edit1098e = Save<typeof ActionName.EDIT_1098e, Edit1098eAction>
type Remove1098e = Save<typeof ActionName.REMOVE_1098e, number>
type Add1098t = Save<typeof ActionName.ADD_1098t, F1098t>
type Edit1098t = Save<typeof ActionName.EDIT_1098t, Edit1098tAction>
type Remove1098t = Save<typeof ActionName.REMOVE_1098t, number>
type SetItemizedDeductions = Save<
  typeof ActionName.SET_ITEMIZED_DEDUCTIONS,
  ItemizedDeductions
>
type AddCasualtyTheftLoss = Save<
  typeof ActionName.ADD_CASUALTY_THEFT_LOSS,
  CasualtyTheftLoss
>
type EditCasualtyTheftLoss = Save<
  typeof ActionName.EDIT_CASUALTY_THEFT_LOSS,
  EditCasualtyTheftLossAction
>
type RemoveCasualtyTheftLoss = Save<
  typeof ActionName.REMOVE_CASUALTY_THEFT_LOSS,
  number
>
type SetForm2441 = Save<typeof ActionName.SET_FORM_2441, Form2441Input>
type SetInfo = Save<typeof ActionName.SET_INFO, InformationDateString>
type SetActiveYear = Save<typeof ActionName.SET_ACTIVE_YEAR, TaxYear>
type AddIRA = Save<typeof ActionName.ADD_IRA, Ira>
type EditIRA = Save<typeof ActionName.EDIT_IRA, EditIraAction>
type RemoveIRA = Save<typeof ActionName.REMOVE_IRA, number>
type AddAsset = Save<typeof ActionName.ADD_ASSET, Asset<Date>>
type AddAssets = Save<typeof ActionName.ADD_ASSETS, Asset<Date>[]>
type EditAsset = Save<typeof ActionName.EDIT_ASSET, EditAssetAction>
type RemoveAsset = Save<typeof ActionName.REMOVE_ASSET, number>
type RemoveAssets = Save<typeof ActionName.REMOVE_ASSETS, number[]>
type AddF3921 = Save<typeof ActionName.ADD_F3921, F3921>
type EditF3921 = Save<typeof ActionName.EDIT_F3921, EditF3921Action>
type RemoveF3921 = Save<typeof ActionName.REMOVE_F3921, number>
type AddF3922 = Save<typeof ActionName.ADD_F3922, F3922>
type EditF3922 = Save<typeof ActionName.EDIT_F3922, EditF3922Action>
type RemoveF3922 = Save<typeof ActionName.REMOVE_F3922, number>
type AddScheduleC = Save<typeof ActionName.ADD_SCHEDULE_C, ScheduleCInput>
type EditScheduleC = Save<
  typeof ActionName.EDIT_SCHEDULE_C,
  EditScheduleCAction
>
type RemoveScheduleC = Save<typeof ActionName.REMOVE_SCHEDULE_C, number>
type AddScheduleH = Save<typeof ActionName.ADD_SCHEDULE_H, ScheduleHInput>
type EditScheduleH = Save<
  typeof ActionName.EDIT_SCHEDULE_H,
  EditScheduleHAction
>
type RemoveScheduleH = Save<typeof ActionName.REMOVE_SCHEDULE_H, number>
type AddScheduleF = Save<typeof ActionName.ADD_SCHEDULE_F, ScheduleFInput>
type EditScheduleF = Save<
  typeof ActionName.EDIT_SCHEDULE_F,
  EditScheduleFAction
>
type RemoveScheduleF = Save<typeof ActionName.REMOVE_SCHEDULE_F, number>
type AddRoyaltyIncome = Save<
  typeof ActionName.ADD_ROYALTY_INCOME,
  RoyaltyIncome
>
type EditRoyaltyIncome = Save<
  typeof ActionName.EDIT_ROYALTY_INCOME,
  EditRoyaltyIncomeAction
>
type RemoveRoyaltyIncome = Save<typeof ActionName.REMOVE_ROYALTY_INCOME, number>
type AddScheduleK1Form1065 = Save<
  typeof ActionName.ADD_SCHEDULE_K1_F1065,
  ScheduleK1Form1065
>
type EditScheduleK1Form1065 = Save<
  typeof ActionName.EDIT_SCHEDULE_K1_F1065,
  EditScheduleK1Form1065Action
>
type RemoveScheduleK1Form1065 = Save<
  typeof ActionName.REMOVE_SCHEDULE_K1_F1065,
  number
>
type AddForm6781 = Save<typeof ActionName.ADD_FORM_6781, Form6781Input>
type EditForm6781 = Save<typeof ActionName.EDIT_FORM_6781, EditForm6781Action>
type RemoveForm6781 = Save<typeof ActionName.REMOVE_FORM_6781, number>
type AddScheduleK1Form1120S = Save<
  typeof ActionName.ADD_SCHEDULE_K1_F1120S,
  ScheduleK1Form1120S
>
type EditScheduleK1Form1120S = Save<
  typeof ActionName.EDIT_SCHEDULE_K1_F1120S,
  EditScheduleK1Form1120SAction
>
type RemoveScheduleK1Form1120S = Save<
  typeof ActionName.REMOVE_SCHEDULE_K1_F1120S,
  number
>
type AddScheduleK1Form1041 = Save<
  typeof ActionName.ADD_SCHEDULE_K1_F1041,
  ScheduleK1Form1041
>
type EditScheduleK1Form1041 = Save<
  typeof ActionName.EDIT_SCHEDULE_K1_F1041,
  EditScheduleK1Form1041Action
>
type RemoveScheduleK1Form1041 = Save<
  typeof ActionName.REMOVE_SCHEDULE_K1_F1041,
  number
>
type AddCredit = Save<typeof ActionName.ADD_CREDIT, Credit>
type EditCredit = Save<typeof ActionName.EDIT_CREDIT, EditCreditAction>
type RemoveCredit = Save<typeof ActionName.REMOVE_CREDIT, number>
type SetCapitalLossCarryforward = Save<
  typeof ActionName.SET_CAPITAL_LOSS_CARRYFORWARD,
  CapitalLossCarryforward
>
type SetPriorYearTax = Save<typeof ActionName.SET_PRIOR_YEAR_TAX, number>
type AddNOLCarryforward = Save<
  typeof ActionName.ADD_NOL_CARRYFORWARD,
  NOLCarryforward
>
type EditNOLCarryforward = Save<
  typeof ActionName.EDIT_NOL_CARRYFORWARD,
  EditNOLCarryforwardAction
>
type RemoveNOLCarryforward = Save<
  typeof ActionName.REMOVE_NOL_CARRYFORWARD,
  number
>
type SetF8801Input = Save<typeof ActionName.SET_F8801_INPUT, F8801Input>
type AddAmendedReturn = Save<
  typeof ActionName.ADD_AMENDED_RETURN,
  AmendedReturnData
>
type EditAmendedReturn = Save<
  typeof ActionName.EDIT_AMENDED_RETURN,
  EditAmendedReturnAction
>
type RemoveAmendedReturn = Save<typeof ActionName.REMOVE_AMENDED_RETURN, number>

export type Actions =
  | SaveRefundInfo
  | SavePrimaryPersonInfo
  | SaveFilingStatusInfo
  | SaveContactInfo
  | SaveStateResidencyInfo
  | AddDependent
  | EditDependent
  | RemoveDependent
  | AddSpouse
  | RemoveSpouse
  | AddW2
  | EditW2
  | RemoveW2
  | AddEstimatedTaxes
  | EditEstimatedTaxes
  | RemoveEstimatedTaxes
  | Add1099
  | Edit1099
  | Remove1099
  | AddProperty
  | EditProperty
  | RemoveProperty
  | AnswerQuestion
  | Add1098e
  | Edit1098e
  | Remove1098e
  | Add1098t
  | Edit1098t
  | Remove1098t
  | SetItemizedDeductions
  | AddCasualtyTheftLoss
  | EditCasualtyTheftLoss
  | RemoveCasualtyTheftLoss
  | SetForm2441
  | AddHSA
  | EditHSA
  | RemoveHSA
  | SetInfo
  | SetActiveYear
  | AddIRA
  | EditIRA
  | RemoveIRA
  | AddAsset
  | AddAssets
  | EditAsset
  | RemoveAsset
  | RemoveAssets
  | AddF3921
  | EditF3921
  | RemoveF3921
  | AddF3922
  | EditF3922
  | RemoveF3922
  | AddScheduleC
  | EditScheduleC
  | RemoveScheduleC
  | AddScheduleH
  | EditScheduleH
  | RemoveScheduleH
  | AddScheduleF
  | EditScheduleF
  | RemoveScheduleF
  | AddRoyaltyIncome
  | EditRoyaltyIncome
  | RemoveRoyaltyIncome
  | AddScheduleK1Form1065
  | EditScheduleK1Form1065
  | RemoveScheduleK1Form1065
  | AddForm6781
  | EditForm6781
  | RemoveForm6781
  | AddScheduleK1Form1120S
  | EditScheduleK1Form1120S
  | RemoveScheduleK1Form1120S
  | AddScheduleK1Form1041
  | EditScheduleK1Form1041
  | RemoveScheduleK1Form1041
  | AddCredit
  | EditCredit
  | RemoveCredit
  | SetCapitalLossCarryforward
  | SetPriorYearTax
  | AddNOLCarryforward
  | EditNOLCarryforward
  | RemoveNOLCarryforward
  | SetF8801Input
  | AddAmendedReturn
  | EditAmendedReturn
  | RemoveAmendedReturn

export type SignalAction = (year: TaxYear) => Actions
export type ActionCreator<A> = (formData: A) => SignalAction

function signalAction<T extends ActionName>(
  t: T
): (year: TaxYear) => Save<T, Record<string, never>> {
  return (year: TaxYear) => ({
    type: t,
    year,
    formData: {}
  })
}

/**
 *  Create an action constructor given an action name and a validator
 *  for the action's payload. The validator checks the payload against
 *  the schema at runtime so we can see errors if data of the wrong types
 *  about to be inserted into the model
 */
const makeActionCreator =
  <A, T extends ActionName>(t: T, validate?: ValidateFunction<A>) =>
  (formData: A) =>
  (year: TaxYear): Save<T, A> => ({
    type: t,
    year,
    formData:
      validate !== undefined
        ? validators.checkType<A>(formData, validate)
        : formData
  })

/**
 * This variant includes a preprocessor function that can be used to
 * apply formatting changes to provided data, for example.
 */
const makePreprocessActionCreator =
  <A, AA, T extends ActionName>(
    t: T,
    validate: ValidateFunction<AA> | undefined,
    clean: (d: A) => AA
  ) =>
  (formData: A) =>
  (year: TaxYear): Save<T, AA> => ({
    type: t,
    year,
    formData:
      validate !== undefined
        ? validators.checkType(clean(formData), validate)
        : { ...formData, ...clean(formData) }
  })

export const saveRefundInfo: ActionCreator<Refund> = makeActionCreator(
  ActionName.SAVE_REFUND_INFO,
  validators.refund
)

const cleanPerson = <P extends Person<string>>(p: P): P => ({
  ...p,
  ssid: p.ssid.replace(/-/g, '')
})

export const savePrimaryPersonInfo: ActionCreator<PrimaryPersonDateString> =
  makePreprocessActionCreator(
    ActionName.SAVE_PRIMARY_PERSON_INFO,
    validators.primaryPerson,
    cleanPerson
  )

export const saveStateResidencyInfo: ActionCreator<StateResidency> =
  makeActionCreator(ActionName.SAVE_STATE_RESIDENCY, validators.stateResidency)

export const saveFilingStatusInfo: ActionCreator<FilingStatus> =
  makeActionCreator(ActionName.SAVE_FILING_STATUS_INFO, validators.filingStatus)

export const saveContactInfo: ActionCreator<ContactInfo> =
  makePreprocessActionCreator(
    ActionName.SAVE_CONTACT_INFO,
    validators.contactInfo,
    (t) => ({
      ...t,
      contactPhoneNumber: t.contactPhoneNumber?.replace(/-/g, '')
    })
  )

export const addDependent: ActionCreator<DependentDateString> =
  makePreprocessActionCreator(
    ActionName.ADD_DEPENDENT,
    validators.dependent,
    (t: DependentDateString) => cleanPerson(t)
  )

export const editDependent: ActionCreator<EditDependentAction> =
  makePreprocessActionCreator(
    ActionName.EDIT_DEPENDENT,
    undefined,
    ({ index, value }: EditDependentAction) => ({
      index,
      value: cleanPerson(value)
    })
  )

export const removeDependent: ActionCreator<number> = makeActionCreator(
  ActionName.REMOVE_DEPENDENT,
  indexValidator
)

export const addSpouse: ActionCreator<SpouseDateString> =
  makePreprocessActionCreator(
    ActionName.ADD_SPOUSE,
    validators.spouse,
    cleanPerson
  )

export const removeSpouse: SignalAction = signalAction(ActionName.REMOVE_SPOUSE)

export const addW2: ActionCreator<IncomeW2> = makeActionCreator(
  ActionName.ADD_W2,
  validators.incomeW2
)

export const editW2: ActionCreator<EditW2Action> = makeActionCreator(
  ActionName.EDIT_W2
)

export const removeW2: ActionCreator<number> = makeActionCreator(
  ActionName.REMOVE_W2,
  indexValidator
)

export const addEstimatedPayment: ActionCreator<EstimatedTaxPayments> =
  makeActionCreator(
    ActionName.ADD_ESTIMATED_TAX,
    validators.estimatedTaxPayments
  )

export const editEstimatedPayment: ActionCreator<EditEstimatedTaxesAction> =
  makeActionCreator(ActionName.EDIT_ESTIMATED_TAX)

export const removeEstimatedPayment: ActionCreator<number> = makeActionCreator(
  ActionName.REMOVE_ESTIMATED_TAX,
  indexValidator
)

export const addHSA: ActionCreator<HealthSavingsAccountDateString> =
  makeActionCreator(ActionName.ADD_HSA, validators.healthSavingsAccount)

export const editHSA: ActionCreator<EditHSAAction> = makeActionCreator(
  ActionName.EDIT_HSA,
  validators.editHSAAction
)

export const removeHSA: ActionCreator<number> = makeActionCreator(
  ActionName.REMOVE_HSA,
  indexValidator
)

export const add1099: ActionCreator<Supported1099> = makeActionCreator(
  ActionName.ADD_1099,
  validators.supported1099
)

export const edit1099: ActionCreator<Edit1099Action> = makeActionCreator(
  ActionName.EDIT_1099
)

export const remove1099: ActionCreator<number> = makeActionCreator(
  ActionName.REMOVE_1099,
  indexValidator
)

export const addProperty: ActionCreator<Property> = makeActionCreator(
  ActionName.ADD_PROPERTY,
  validators.property
)

export const editProperty: ActionCreator<EditPropertyAction> =
  makeActionCreator(ActionName.EDIT_PROPERTY)

export const removeProperty: ActionCreator<number> = makeActionCreator(
  ActionName.REMOVE_PROPERTY,
  indexValidator
)

export const answerQuestion: ActionCreator<Responses> = makeActionCreator(
  ActionName.ANSWER_QUESTION,
  validators.responses
)

export const add1098e: ActionCreator<F1098e> = makeActionCreator(
  ActionName.ADD_1098e,
  validators.f1098e
)

export const edit1098e: ActionCreator<Edit1098eAction> = makeActionCreator(
  ActionName.EDIT_1098e
)

export const remove1098e: ActionCreator<number> = makeActionCreator(
  ActionName.REMOVE_1098e,
  indexValidator
)

export const add1098t: ActionCreator<F1098t> = makeActionCreator(
  ActionName.ADD_1098t,
  validators.f1098t
)

export const edit1098t: ActionCreator<Edit1098tAction> = makeActionCreator(
  ActionName.EDIT_1098t
)

export const remove1098t: ActionCreator<number> = makeActionCreator(
  ActionName.REMOVE_1098t,
  indexValidator
)

export const setItemizedDeductions: ActionCreator<ItemizedDeductions> =
  makeActionCreator(
    ActionName.SET_ITEMIZED_DEDUCTIONS,
    validators.itemizedDeductions
  )

export const addCasualtyTheftLoss: ActionCreator<CasualtyTheftLoss> =
  makeActionCreator(ActionName.ADD_CASUALTY_THEFT_LOSS)

export const editCasualtyTheftLoss: ActionCreator<EditCasualtyTheftLossAction> =
  makeActionCreator(ActionName.EDIT_CASUALTY_THEFT_LOSS)

export const removeCasualtyTheftLoss: ActionCreator<number> = makeActionCreator(
  ActionName.REMOVE_CASUALTY_THEFT_LOSS,
  indexValidator
)

export const setForm2441: ActionCreator<Form2441Input> = makeActionCreator(
  ActionName.SET_FORM_2441
)

// debugging purposes only, leaving unchecked.
export const setInfo = makePreprocessActionCreator<
  Information,
  InformationDateString,
  ActionName.SET_INFO
>(ActionName.SET_INFO, validators.information, (info) => infoToStringInfo(info))

export const setActiveYear: ActionCreator<TaxYear> = makeActionCreator(
  ActionName.SET_ACTIVE_YEAR,
  validators.taxYear
)

export const addIRA: ActionCreator<Ira> = makeActionCreator(
  ActionName.ADD_IRA,
  validators.ira
)

export const editIRA: ActionCreator<EditIraAction> = makeActionCreator(
  ActionName.EDIT_IRA,
  validators.editIraAction
)

export const removeIRA: ActionCreator<number> = makeActionCreator(
  ActionName.REMOVE_IRA,
  indexValidator
)

export const addAsset: ActionCreator<Asset<Date>> = makeActionCreator(
  ActionName.ADD_ASSET
)

export const addAssets: ActionCreator<Asset<Date>[]> = makeActionCreator(
  ActionName.ADD_ASSETS
)

export const editAsset: ActionCreator<EditAssetAction> = makeActionCreator(
  ActionName.EDIT_ASSET
)

export const removeAsset: ActionCreator<number> = makeActionCreator(
  ActionName.REMOVE_ASSET,
  indexValidator
)

export const removeAssets: ActionCreator<number[]> = makeActionCreator(
  ActionName.REMOVE_ASSETS
)

export const addF3921: ActionCreator<F3921> = makeActionCreator(
  ActionName.ADD_F3921
)

export const editF3921: ActionCreator<EditF3921Action> = makeActionCreator(
  ActionName.EDIT_F3921
)

export const removeF3921: ActionCreator<number> = makeActionCreator(
  ActionName.REMOVE_F3921,
  indexValidator
)

export const addF3922: ActionCreator<F3922> = makeActionCreator(
  ActionName.ADD_F3922
)

export const editF3922: ActionCreator<EditF3922Action> = makeActionCreator(
  ActionName.EDIT_F3922
)

export const removeF3922: ActionCreator<number> = makeActionCreator(
  ActionName.REMOVE_F3922,
  indexValidator
)

export const addScheduleC: ActionCreator<ScheduleCInput> = makeActionCreator(
  ActionName.ADD_SCHEDULE_C,
  validators.scheduleC
)

export const editScheduleC: ActionCreator<EditScheduleCAction> =
  makeActionCreator(ActionName.EDIT_SCHEDULE_C)

export const removeScheduleC: ActionCreator<number> = makeActionCreator(
  ActionName.REMOVE_SCHEDULE_C,
  indexValidator
)

export const addScheduleH: ActionCreator<ScheduleHInput> = makeActionCreator(
  ActionName.ADD_SCHEDULE_H,
  validators.scheduleH
)

export const editScheduleH: ActionCreator<EditScheduleHAction> =
  makeActionCreator(ActionName.EDIT_SCHEDULE_H)

export const removeScheduleH: ActionCreator<number> = makeActionCreator(
  ActionName.REMOVE_SCHEDULE_H,
  indexValidator
)

export const addScheduleF: ActionCreator<ScheduleFInput> = makeActionCreator(
  ActionName.ADD_SCHEDULE_F,
  validators.scheduleF
)

export const editScheduleF: ActionCreator<EditScheduleFAction> =
  makeActionCreator(ActionName.EDIT_SCHEDULE_F)

export const removeScheduleF: ActionCreator<number> = makeActionCreator(
  ActionName.REMOVE_SCHEDULE_F,
  indexValidator
)

export const addRoyaltyIncome: ActionCreator<RoyaltyIncome> = makeActionCreator(
  ActionName.ADD_ROYALTY_INCOME,
  validators.royaltyIncome
)

export const editRoyaltyIncome: ActionCreator<EditRoyaltyIncomeAction> =
  makeActionCreator(ActionName.EDIT_ROYALTY_INCOME)

export const removeRoyaltyIncome: ActionCreator<number> = makeActionCreator(
  ActionName.REMOVE_ROYALTY_INCOME,
  indexValidator
)

export const addScheduleK1Form1065: ActionCreator<ScheduleK1Form1065> =
  makeActionCreator(ActionName.ADD_SCHEDULE_K1_F1065)

export const editScheduleK1Form1065: ActionCreator<EditScheduleK1Form1065Action> =
  makeActionCreator(ActionName.EDIT_SCHEDULE_K1_F1065)

export const removeScheduleK1Form1065: ActionCreator<number> =
  makeActionCreator(ActionName.REMOVE_SCHEDULE_K1_F1065, indexValidator)

export const addForm6781: ActionCreator<Form6781Input> = makeActionCreator(
  ActionName.ADD_FORM_6781
)

export const editForm6781: ActionCreator<EditForm6781Action> =
  makeActionCreator(ActionName.EDIT_FORM_6781)

export const removeForm6781: ActionCreator<number> = makeActionCreator(
  ActionName.REMOVE_FORM_6781,
  indexValidator
)

export const addScheduleK1Form1120S: ActionCreator<ScheduleK1Form1120S> =
  makeActionCreator(ActionName.ADD_SCHEDULE_K1_F1120S)

export const editScheduleK1Form1120S: ActionCreator<EditScheduleK1Form1120SAction> =
  makeActionCreator(ActionName.EDIT_SCHEDULE_K1_F1120S)

export const removeScheduleK1Form1120S: ActionCreator<number> =
  makeActionCreator(ActionName.REMOVE_SCHEDULE_K1_F1120S, indexValidator)

export const addScheduleK1Form1041: ActionCreator<ScheduleK1Form1041> =
  makeActionCreator(ActionName.ADD_SCHEDULE_K1_F1041)

export const editScheduleK1Form1041: ActionCreator<EditScheduleK1Form1041Action> =
  makeActionCreator(ActionName.EDIT_SCHEDULE_K1_F1041)

export const removeScheduleK1Form1041: ActionCreator<number> =
  makeActionCreator(ActionName.REMOVE_SCHEDULE_K1_F1041, indexValidator)

export const addCredit: ActionCreator<Credit> = makeActionCreator(
  ActionName.ADD_CREDIT,
  validators.credit
)

export const editCredit: ActionCreator<EditCreditAction> = makeActionCreator(
  ActionName.EDIT_CREDIT,
  validators.editCreditAction
)

export const removeCredit: ActionCreator<number> = makeActionCreator(
  ActionName.REMOVE_CREDIT,
  indexValidator
)

export const setCapitalLossCarryforward: ActionCreator<CapitalLossCarryforward> =
  makeActionCreator(
    ActionName.SET_CAPITAL_LOSS_CARRYFORWARD,
    validators.capitalLossCarryforward
  )

export const setPriorYearTax: ActionCreator<number> = makeActionCreator(
  ActionName.SET_PRIOR_YEAR_TAX
)

export const addNOLCarryforward: ActionCreator<NOLCarryforward> =
  makeActionCreator(ActionName.ADD_NOL_CARRYFORWARD)

export const editNOLCarryforward: ActionCreator<EditNOLCarryforwardAction> =
  makeActionCreator(ActionName.EDIT_NOL_CARRYFORWARD)

export const removeNOLCarryforward: ActionCreator<number> = makeActionCreator(
  ActionName.REMOVE_NOL_CARRYFORWARD,
  indexValidator
)

export const setF8801Input: ActionCreator<F8801Input> = makeActionCreator(
  ActionName.SET_F8801_INPUT
)

export const addAmendedReturn: ActionCreator<AmendedReturnData> =
  makeActionCreator(ActionName.ADD_AMENDED_RETURN)

export const editAmendedReturn: ActionCreator<EditAmendedReturnAction> =
  makeActionCreator(ActionName.EDIT_AMENDED_RETURN)

export const removeAmendedReturn: ActionCreator<number> = makeActionCreator(
  ActionName.REMOVE_AMENDED_RETURN,
  indexValidator
)
