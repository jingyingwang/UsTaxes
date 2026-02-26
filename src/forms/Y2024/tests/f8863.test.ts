import F1040 from '../irsForms/F1040'
import {
  EducationCreditType,
  F1098t,
  FilingStatus,
  IncomeW2,
  PersonRole,
  PrimaryPerson
} from 'ustaxes/core/data'
import { blankState } from 'ustaxes/redux/reducer'

const basePrimaryPerson = (): PrimaryPerson => ({
  firstName: 'Test',
  lastName: 'User',
  ssid: '123456789',
  role: PersonRole.PRIMARY,
  isBlind: false,
  dateOfBirth: new Date('1990-01-01'),
  address: {
    address: '1 Main St',
    city: 'Testville',
    state: 'CA',
    zip: '12345'
  },
  isTaxpayerDependent: false
})

const makeW2 = (income: number): IncomeW2 => ({
  occupation: 'Engineer',
  income,
  medicareIncome: income,
  fedWithholding: 0,
  ssWages: income,
  ssWithholding: 0,
  medicareWithholding: 0,
  personRole: PersonRole.PRIMARY
})

const makeInfo = (f1098ts: F1098t[], income = 0) => ({
  ...blankState,
  taxPayer: {
    ...blankState.taxPayer,
    filingStatus: FilingStatus.S,
    primaryPerson: basePrimaryPerson()
  },
  w2s: income > 0 ? [makeW2(income)] : [],
  f1098ts
})

describe('Form 8863 (Education Credits)', () => {
  it('calculates AOTC with refundable and nonrefundable portions', () => {
    const f1098t: F1098t = {
      student: { role: PersonRole.PRIMARY },
      creditType: EducationCreditType.AOTC,
      institution: 'Test University',
      paymentsReceived: 4000,
      adjustmentsToQualifiedExpenses: 0,
      scholarshipsOrGrants: 0,
      adjustmentsToScholarships: 0,
      additionalQualifiedExpenses: 0,
      otherTaxFreeAssistance: 0,
      atLeastHalfTime: true,
      graduateStudent: false,
      aotcClaimedYears: 0,
      felonyDrugConviction: false
    }

    const f1040 = new F1040(makeInfo([f1098t]), [])
    expect(f1040.f8863?.l8()).toBe(1000)
    expect(f1040.f8863?.l19()).toBe(1500)
  })

  it('applies the AOTC phaseout', () => {
    const f1098t: F1098t = {
      student: { role: PersonRole.PRIMARY },
      creditType: EducationCreditType.AOTC,
      institution: 'Test University',
      paymentsReceived: 4000,
      adjustmentsToQualifiedExpenses: 0,
      scholarshipsOrGrants: 0,
      adjustmentsToScholarships: 0,
      additionalQualifiedExpenses: 0,
      otherTaxFreeAssistance: 0,
      atLeastHalfTime: true,
      graduateStudent: false,
      aotcClaimedYears: 0,
      felonyDrugConviction: false
    }

    const f1040 = new F1040(makeInfo([f1098t], 85000), [])
    expect(f1040.f8863?.l8()).toBe(500)
    expect(f1040.f8863?.l19()).toBe(750)
  })

  it('calculates LLC across multiple students', () => {
    const base: Omit<F1098t, 'paymentsReceived'> = {
      student: { role: PersonRole.PRIMARY },
      creditType: EducationCreditType.LLC,
      institution: 'Test University',
      adjustmentsToQualifiedExpenses: 0,
      scholarshipsOrGrants: 0,
      adjustmentsToScholarships: 0,
      additionalQualifiedExpenses: 0,
      otherTaxFreeAssistance: 0,
      atLeastHalfTime: false,
      graduateStudent: false,
      aotcClaimedYears: 0,
      felonyDrugConviction: false
    }

    const f1040 = new F1040(
      makeInfo([
        { ...base, paymentsReceived: 6000 },
        { ...base, paymentsReceived: 5000 }
      ]),
      []
    )

    expect(f1040.f8863?.l8()).toBe(0)
    expect(f1040.f8863?.l19()).toBe(2000)
  })

  it('enforces the AOTC 4-year limit', () => {
    const f1098t: F1098t = {
      student: { role: PersonRole.PRIMARY },
      creditType: EducationCreditType.AOTC,
      institution: 'Test University',
      paymentsReceived: 4000,
      adjustmentsToQualifiedExpenses: 0,
      scholarshipsOrGrants: 0,
      adjustmentsToScholarships: 0,
      additionalQualifiedExpenses: 0,
      otherTaxFreeAssistance: 0,
      atLeastHalfTime: true,
      graduateStudent: false,
      aotcClaimedYears: 4,
      felonyDrugConviction: false
    }

    const f1040 = new F1040(makeInfo([f1098t]), [])
    expect(f1040.f8863?.l8()).toBe(0)
    expect(f1040.f8863?.l19()).toBe(0)
  })
})
