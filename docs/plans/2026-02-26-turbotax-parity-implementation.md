# USTaxes Full TurboTax Parity — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement all remaining features (Phases 2-6) to achieve full TurboTax parity for TY2025 — ~25 federal forms, all 50 state tax engines, deep investment/business forms, TurboTax-style interview wizard, and PDF polish.

**Architecture:** Each form follows the F1040Attachment pattern: extend base class, implement line calculations as methods, return `fields()` array matching PDF field order, register in F1040 constructor and `schedules()`. State forms extend StateFormBase with federal AGI adjustments. Interview wizard is a JSON-driven question graph engine rendering existing form components.

**Tech Stack:** TypeScript, React 17, React Hook Form, Redux + redux-persist, Material-UI 4, pdf-lib, fast-check (property-based testing)

**Parallelism:** Phases 2, 3, and 4 run concurrently. Phase 5 starts once form components exist. Phase 6 is continuous polish.

---

## Key File Paths Reference

| What | Path |
|------|------|
| Form base class | `src/core/irsForms/Form.ts` |
| F1040Attachment | `src/forms/Y2025/irsForms/F1040Attachment.ts` |
| F1040 (registration) | `src/forms/Y2025/irsForms/F1040.ts` |
| Data model | `src/core/data/index.ts` |
| Redux actions | `src/redux/actions.ts` |
| Redux reducer | `src/redux/reducer.ts` |
| Section registration | `src/components/Menu.tsx` |
| Input components | `src/components/input/` |
| FormListContainer | `src/components/FormContainer.tsx` |
| Test setup | `src/forms/Y2025/tests/index.ts` |
| Federal constants | `src/data/federal.ts` |
| PDF filler | `src/core/pdfFiller/` |
| PDFs directory | `public/irs/` |

---

## PHASE 2: Missing Federal Forms

### Task 2.1: Schedule C — Self-Employment Income (HIGH PRIORITY)

**Files:**
- Modify: `src/core/data/index.ts` — add ScheduleCData interface
- Modify: `src/redux/actions.ts` — add ADD/EDIT/REMOVE_SCHEDULE_C actions
- Modify: `src/redux/reducer.ts` — add schedule C reducer cases
- Rewrite: `src/forms/Y2025/irsForms/ScheduleC.ts` — full implementation
- Modify: `src/forms/Y2025/irsForms/F1040.ts` — wire Schedule C into constructor/schedules
- Create: `src/components/income/ScheduleCInfo.tsx` — UI component
- Modify: `src/components/Menu.tsx` — register Schedule C section
- Create: `src/forms/Y2025/tests/ScheduleC.test.ts` — tests
- Ensure: `public/irs/f1040sc.pdf` exists with correct fields

**Step 1: Add ScheduleCData to data model**

In `src/core/data/index.ts`, add after the existing ScheduleK1Form1065 interface:

```typescript
export enum ScheduleCExpenseType {
  advertising = 'Advertising',
  carAndTruck = 'Car and truck expenses',
  commissions = 'Commissions and fees',
  contractLabor = 'Contract labor',
  depletion = 'Depletion',
  depreciation = 'Depreciation',
  employeeBenefits = 'Employee benefit programs',
  insurance = 'Insurance (other than health)',
  interestMortgage = 'Interest on business mortgage',
  interestOther = 'Interest (other)',
  legal = 'Legal and professional services',
  officeExpense = 'Office expense',
  pensionPlans = 'Pension and profit-sharing plans',
  rentVehicles = 'Rent or lease (vehicles, machinery)',
  rentOther = 'Rent or lease (other)',
  repairs = 'Repairs and maintenance',
  supplies = 'Supplies',
  taxesAndLicenses = 'Taxes and licenses',
  travel = 'Travel',
  meals = 'Meals (50% deductible)',
  utilities = 'Utilities',
  wages = 'Wages',
  otherExpenses = 'Other expenses'
}

export enum AccountingMethod {
  cash = 'Cash',
  accrual = 'Accrual',
  other = 'Other'
}

export interface ScheduleCData {
  businessName: string
  proprietorName?: string
  ein?: string
  businessAddress?: Address
  principalBusinessCode: string
  accountingMethod: AccountingMethod
  didMateriallyParticipate: boolean
  startedOrAcquiredThisYear: boolean
  madePaymentsRequiring1099: boolean
  filed1099s: boolean
  isStatutoryEmployee: boolean
  grossReceipts: number
  returnsAndAllowances: number
  otherIncome: number
  costOfGoodsSold: number
  expenses: Partial<{ [K in ScheduleCExpenseType]: number }>
  otherExpenseDescriptions?: Array<{ description: string; amount: number }>
  personRole: PersonRole.PRIMARY | PersonRole.SPOUSE
}
```

Add to `Information` interface:
```typescript
scheduleCBusinesses: ScheduleCData[]
```

**Step 2: Add Redux actions for Schedule C**

In `src/redux/actions.ts`, add to ActionName enum:
```typescript
ADD_SCHEDULE_C = 'SCHEDULE_C/ADD',
EDIT_SCHEDULE_C = 'SCHEDULE_C/EDIT',
REMOVE_SCHEDULE_C = 'SCHEDULE_C/REMOVE',
```

Add action creators:
```typescript
export const addScheduleC = makeActionCreator(ActionName.ADD_SCHEDULE_C)
export const editScheduleC = makeActionCreator(ActionName.EDIT_SCHEDULE_C)
export const removeScheduleC = makeIndexActionCreator(ActionName.REMOVE_SCHEDULE_C)
```

**Step 3: Add reducer cases**

In `src/redux/reducer.ts`, add to formReducer switch:
```typescript
case ActionName.ADD_SCHEDULE_C:
  return { ...newState, scheduleCBusinesses: [...(newState.scheduleCBusinesses ?? []), action.formData] }
case ActionName.EDIT_SCHEDULE_C: {
  const newBiz = [...(newState.scheduleCBusinesses ?? [])]
  newBiz.splice(action.formData.index, 1, action.formData.value)
  return { ...newState, scheduleCBusinesses: newBiz }
}
case ActionName.REMOVE_SCHEDULE_C: {
  const newBiz = [...(newState.scheduleCBusinesses ?? [])]
  newBiz.splice(action.formData, 1)
  return { ...newState, scheduleCBusinesses: newBiz }
}
```

Add `scheduleCBusinesses: []` to blankState.

**Step 4: Implement ScheduleC form class**

Replace `src/forms/Y2025/irsForms/ScheduleC.ts`:

```typescript
import F1040Attachment from './F1040Attachment'
import { Field } from 'ustaxes/core/pdfFiller'
import { FormTag } from 'ustaxes/core/irsForms/Form'
import { sumFields } from 'ustaxes/core/irsForms/util'
import F1040 from './F1040'
import { ScheduleCData, ScheduleCExpenseType, PersonRole } from 'ustaxes/core/data'

export default class ScheduleC extends F1040Attachment {
  tag: FormTag = 'f1040sc'
  sequenceIndex = 9
  index: number

  constructor(f1040: F1040, index = 0) {
    super(f1040)
    this.index = index
  }

  get business(): ScheduleCData {
    return this.f1040.info.scheduleCBusinesses[this.index]
  }

  isNeeded = (): boolean =>
    (this.f1040.info.scheduleCBusinesses?.length ?? 0) > this.index

  copies = (): ScheduleC[] => {
    if (this.index === 0) {
      const count = (this.f1040.info.scheduleCBusinesses?.length ?? 1) - 1
      return Array.from({ length: count }, (_, i) => new ScheduleC(this.f1040, i + 1))
    }
    return []
  }

  // Part I: Income
  l1 = (): number => this.business.grossReceipts
  l2 = (): number => this.business.returnsAndAllowances
  l3 = (): number => this.l1() - this.l2()
  l4 = (): number => this.business.costOfGoodsSold
  l5 = (): number => this.l3() - this.l4()
  l6 = (): number => this.business.otherIncome ?? 0
  l7 = (): number => this.l5() + this.l6()  // Gross income

  // Part II: Expenses
  expense = (type: ScheduleCExpenseType): number =>
    this.business.expenses[type] ?? 0

  l8 = (): number => this.expense(ScheduleCExpenseType.advertising)
  l9 = (): number => this.expense(ScheduleCExpenseType.carAndTruck)
  l10 = (): number => this.expense(ScheduleCExpenseType.commissions)
  l11 = (): number => this.expense(ScheduleCExpenseType.contractLabor)
  l12 = (): number => this.expense(ScheduleCExpenseType.depletion)
  l13 = (): number => this.expense(ScheduleCExpenseType.depreciation)
  l14 = (): number => this.expense(ScheduleCExpenseType.employeeBenefits)
  l15 = (): number => this.expense(ScheduleCExpenseType.insurance)
  l16a = (): number => this.expense(ScheduleCExpenseType.interestMortgage)
  l16b = (): number => this.expense(ScheduleCExpenseType.interestOther)
  l17 = (): number => this.expense(ScheduleCExpenseType.legal)
  l18 = (): number => this.expense(ScheduleCExpenseType.officeExpense)
  l19 = (): number => this.expense(ScheduleCExpenseType.pensionPlans)
  l20a = (): number => this.expense(ScheduleCExpenseType.rentVehicles)
  l20b = (): number => this.expense(ScheduleCExpenseType.rentOther)
  l21 = (): number => this.expense(ScheduleCExpenseType.repairs)
  l22 = (): number => this.expense(ScheduleCExpenseType.supplies)
  l23 = (): number => this.expense(ScheduleCExpenseType.taxesAndLicenses)
  l24a = (): number => this.expense(ScheduleCExpenseType.travel)
  l24b = (): number => this.expense(ScheduleCExpenseType.meals)
  l25 = (): number => this.expense(ScheduleCExpenseType.utilities)
  l26 = (): number => this.expense(ScheduleCExpenseType.wages)
  l27a = (): number =>
    sumFields(this.business.otherExpenseDescriptions?.map((e) => e.amount) ?? [])

  l28 = (): number =>
    sumFields([
      this.l8(), this.l9(), this.l10(), this.l11(), this.l12(),
      this.l13(), this.l14(), this.l15(), this.l16a(), this.l16b(),
      this.l17(), this.l18(), this.l19(), this.l20a(), this.l20b(),
      this.l21(), this.l22(), this.l23(), this.l24a(), this.l24b(),
      this.l25(), this.l26(), this.l27a()
    ])

  // Net profit or loss
  l29 = (): number => this.l7() - this.l28()
  l31 = (): number => this.l29()  // Simplified — no home office deduction yet

  fields = (): Field[] => [
    // Map to PDF fields — exact order must match f1040sc.pdf
    this.f1040.namesString(),
    this.f1040.info.taxPayer.primaryPerson?.ssid,
    this.business.businessName,
    this.business.principalBusinessCode,
    this.business.ein,
    // ... remaining fields match PDF structure
    // NOTE: Implementer must download IRS f1040sc.pdf and count exact fields
  ]
}
```

**Step 5: Wire into F1040**

In `src/forms/Y2025/irsForms/F1040.ts`:
- Add to constructor: `this.scheduleC = new ScheduleC(this)`
- Add `this.scheduleC` to the `res1` array in `schedules()`
- Wire `scheduleC.l31()` into Schedule 1 line 3 (business income)

**Step 6: Create UI component**

Create `src/components/income/ScheduleCInfo.tsx` following the FormListContainer pattern from W2JobInfo.tsx.

**Step 7: Register in Menu.tsx**

Add to the Income section in `drawerSections`:
```typescript
item('Self-Employment (Schedule C)', Urls.income.scheduleC, <ScheduleCInfo />)
```

**Step 8: Write tests**

Create `src/forms/Y2025/tests/ScheduleC.test.ts`:
```typescript
import { testKit, commonTests } from '.'

describe('Schedule C', () => {
  it('should calculate net profit correctly', async () => {
    await fc.assert(
      testKit.with1040Property((forms) => {
        const f1040 = commonTests.findF1040OrFail(forms)
        if (f1040.scheduleC?.isNeeded()) {
          const sc = f1040.scheduleC
          expect(sc.l7()).toEqual(sc.l5() + sc.l6())
          expect(sc.l29()).toEqual(sc.l7() - sc.l28())
        }
        return Promise.resolve()
      })
    )
  })
})
```

**Step 9: Verify and commit**

Run: `npx react-scripts test --watchAll=false --testPathPattern=ScheduleC`
Then commit: `git commit -m "feat: implement Schedule C self-employment income"`

---

### Task 2.2: Form 8829 — Home Office Deduction

**Files:**
- Create: `src/forms/Y2025/irsForms/F8829.ts`
- Modify: `src/core/data/index.ts` — add HomeOfficeData interface
- Modify: `src/forms/Y2025/irsForms/F1040.ts` — register
- Create: `src/components/deductions/HomeOffice.tsx`
- Create: `src/forms/Y2025/tests/F8829.test.ts`

**Implementation notes:**
- Two methods: Regular (actual expenses × business %) and Simplified ($5/sqft, max 300 sqft = $1,500)
- Regular method: total home expenses × (office sqft / total sqft)
- Deduction flows to Schedule C line 30
- Must track carryover of excess casualty losses and depreciation

```typescript
export default class F8829 extends F1040Attachment {
  tag: FormTag = 'f8829'
  sequenceIndex = 66

  // Part I: Business use percentage
  l1 = (): number => this.homeOffice.officeSquareFootage
  l2 = (): number => this.homeOffice.totalSquareFootage
  l3 = (): number => this.l1() / this.l2()  // Business percentage

  // Simplified method
  simplifiedDeduction = (): number =>
    Math.min(this.l1(), 300) * 5

  isNeeded = (): boolean =>
    this.f1040.scheduleC?.business?.homeOffice !== undefined
}
```

---

### Task 2.3: Form 4562 — Depreciation & Amortization

**Files:**
- Create: `src/core/depreciation/index.ts` — depreciation engine
- Create: `src/core/depreciation/macrs.ts` — MACRS tables
- Create: `src/forms/Y2025/irsForms/F4562.ts`
- Create: `src/forms/Y2025/tests/F4562.test.ts`

**Implementation notes:**
- Central depreciation module reused by F4562, F8829, Schedule C
- MACRS recovery periods: 3, 5, 7, 10, 15, 20, 25, 27.5, 39 years
- Methods: 200% DB, 150% DB, Straight-line
- Conventions: Half-year, mid-quarter, mid-month
- Section 179 expensing election (2025 limit: $1,220,000)
- Bonus depreciation: 40% for 2025 (phasing down)

```typescript
// src/core/depreciation/index.ts
export interface DepreciableAsset {
  description: string
  dateInService: Date
  cost: number
  recoveryPeriod: 3 | 5 | 7 | 10 | 15 | 20 | 25 | 27.5 | 39
  method: '200DB' | '150DB' | 'SL'
  convention: 'half-year' | 'mid-quarter' | 'mid-month'
  section179: number
  bonusDepreciationPct: number
  priorDepreciation: number
  businessUsePct: number
}

export function calculateDepreciation(
  asset: DepreciableAsset,
  taxYear: number
): number {
  const depreciableBasis = (asset.cost - asset.section179) * (1 - asset.bonusDepreciationPct / 100)
  const yearInService = taxYear - asset.dateInService.getFullYear()
  const rate = getMACRSRate(asset.recoveryPeriod, asset.method, asset.convention, yearInService)
  return depreciableBasis * rate * (asset.businessUsePct / 100)
}
```

---

### Task 2.4: Form 1040X — Amended Returns

**Files:**
- Create: `src/forms/Y2025/irsForms/F1040X.ts`
- Create: `src/components/AmendedReturn.tsx`
- Modify: `src/core/data/index.ts` — add AmendedReturnData

**Implementation notes:**
- Three columns: A (original), B (net change), C (corrected)
- Lines mirror 1040 but show changes
- Must explain each change in Part III
- Can amend any of the 3 most recent tax years

---

### Task 2.5: Form 8606 — Nondeductible IRAs / Roth Conversions

**Files:**
- Create: `src/forms/Y2025/irsForms/F8606.ts`
- Modify: `src/core/data/index.ts` — add IRA basis tracking
- Create: `src/components/savingsAccounts/F8606Info.tsx`

**Implementation notes:**
- Part I: Nondeductible IRA contributions (basis tracking)
- Part II: Roth conversions (taxable portion calculation)
- Part III: Roth IRA distributions
- Key calculation: taxable portion = conversion × (1 - basis/total_IRA_value)

---

### Task 2.6: Simple Federal Forms (batch — can parallelize)

These forms are low complexity and follow the same pattern:

| Form | Key Logic | sequenceIndex |
|------|-----------|---------------|
| **Form 5329** | 10% early distribution penalty × distribution amount | 29 |
| **Form 8880** | Saver's credit: lookup table by AGI and filing status | 54 |
| **Form 8839** | Adoption credit: qualified expenses up to $16,810 limit | 38 |
| **Form 7206** | Self-employed health insurance: 100% deduction for SE filers | 55 |
| **Schedule H** | Household employment tax: SS + Medicare on domestic wages | 44 |
| **Form 2210** | Underpayment penalty: (required payment - actual) × rate × days/365 | 17 |
| **Form 4868** | Extension: estimate tax owed, request 6-month extension | 68 |
| **Form 9465** | Installment agreement: monthly payment plan request | 72 |

Each follows the same implementation pattern as Schedule C above:
1. Add data interface to `src/core/data/index.ts`
2. Add Redux actions and reducer cases
3. Create form class in `src/forms/Y2025/irsForms/`
4. Create UI component in `src/components/`
5. Register in F1040.ts and Menu.tsx
6. Write tests
7. Ensure PDF exists in `public/irs/`

---

### Task 2.7: K-1 Input Support (1120-S and 1041)

**Files:**
- Modify: `src/core/data/index.ts` — add ScheduleK1Form1120S, ScheduleK1Form1041 interfaces
- Modify: `src/redux/actions.ts` — ADD/EDIT/REMOVE for each
- Create: `src/components/income/K1Form1120S.tsx`
- Create: `src/components/income/K1Form1041.tsx`

**Implementation notes:**
- K-1 from S-Corp (1120-S): ordinary income, rental income, interest, dividends, capital gains, Section 179
- K-1 from Trust/Estate (1041): interest, dividends, capital gains, rental income, directly apportioned deductions
- Both flow data into existing schedules (Schedule E Part II, Schedule D, etc.)

---

### Task 2.8: Schedule F — Farm Income

**Files:**
- Create: `src/forms/Y2025/irsForms/ScheduleF.ts`
- Modify: `src/core/data/index.ts` — add ScheduleFData
- Create: `src/components/income/ScheduleFInfo.tsx`

**Implementation notes:**
- Mirrors Schedule C structure but for farming
- Cash vs. accrual accounting
- Crop insurance proceeds
- Cooperative distributions
- Conservation expenses
- Net farm profit flows to Schedule 1 line 6

---

## PHASE 3: All 50 State Tax Engines

### Task 3.0: State Form Infrastructure

**Files:**
- Create: `src/core/stateForms/StateFormBase.ts` — common base class
- Create: `src/core/stateForms/stateBrackets.ts` — tax bracket computation
- Modify: `src/forms/Y2025/stateForms/index.ts` — factory registration

**Step 1: Create StateFormBase**

```typescript
// src/core/stateForms/StateFormBase.ts
import StateForm from './Form'
import { FilingStatus, ValidatedInformation } from 'ustaxes/core/data'
import { Field } from 'ustaxes/core/pdfFiller'

export interface TaxBracket {
  rate: number
  min: number
  max: number
}

export function computeBracketTax(income: number, brackets: TaxBracket[]): number {
  return brackets.reduce((tax, bracket) => {
    if (income <= bracket.min) return tax
    const taxableInBracket = Math.min(income, bracket.max) - bracket.min
    return tax + taxableInBracket * bracket.rate
  }, 0)
}

export abstract class StateFormBase extends StateForm {
  abstract brackets(status: FilingStatus): TaxBracket[]
  abstract standardDeduction(status: FilingStatus): number
  abstract personalExemption(): number

  abstract stateAdditions(): number
  abstract stateSubtractions(): number
  abstract stateCredits(): number
  abstract stateWithholding(): number

  federalAGI(): number {
    // Pulled from federal F1040 line 11
    return this.f1040.l11()
  }

  stateTaxableIncome(): number {
    return Math.max(0,
      this.federalAGI()
      + this.stateAdditions()
      - this.stateSubtractions()
      - this.standardDeduction(this.filingStatus)
      - this.personalExemption()
    )
  }

  stateTax(): number {
    return computeBracketTax(this.stateTaxableIncome(), this.brackets(this.filingStatus))
  }

  stateNetTax(): number {
    return Math.max(0, this.stateTax() - this.stateCredits())
  }

  refundOrOwed(): number {
    return this.stateWithholding() - this.stateNetTax()
  }
}
```

**Step 2: Commit infrastructure**

```bash
git commit -m "feat: add StateFormBase infrastructure for all 50 states"
```

---

### Task 3.1: No-Income-Tax States (9 states)

States: **AK, FL, NV, SD, TX, WA, WY** (fully no tax), **NH, TN** (interest/dividends only)

These are already handled as "no filing required" in the existing codebase. Verify they return appropriate "no filing needed" message.

---

### Task 3.2: Flat-Tax States (batch — highly parallelizable)

Each flat-tax state is ~50-80 lines following the same pattern:

| State | Rate | Standard Deduction | Notes |
|-------|------|-------------------|-------|
| CO | 4.40% | Federal SD | Federal AGI starting point |
| IL | 4.95% | $2,425 personal exemption | Already has stub |
| IN | 3.05% | None (exemptions only) | County tax too |
| KY | 4.00% | $3,160 | |
| MA | 5.00% | None | Short-term cap gains at 8.5% |
| MI | 4.25% | $5,600 personal exemption | |
| NC | 4.50% | $12,750 S / $25,500 MFJ | |
| PA | 3.07% | None | Most income exempt |
| UT | 4.65% | Taxpayer credit instead | |

**Per-state implementation:**

```typescript
// src/forms/Y2025/stateForms/CO/CO104.ts (Colorado example)
import { StateFormBase, TaxBracket } from 'ustaxes/core/stateForms/StateFormBase'

export default class CO104 extends StateFormBase {
  state = State.CO
  formName = 'CO 104'
  formOrder = 0

  brackets = (): TaxBracket[] => [
    { rate: 0.044, min: 0, max: Infinity }
  ]

  standardDeduction = (status: FilingStatus): number => {
    // Colorado uses federal standard deduction
    return federalStandardDeduction(status)
  }

  personalExemption = (): number => 0

  stateAdditions = (): number => {
    // Colorado additions: state/local bond interest from other states, etc.
    return 0  // Simplified — add specific additions as needed
  }

  stateSubtractions = (): number => {
    // Colorado subtractions: Social Security, pension exclusion, etc.
    return 0  // Simplified
  }

  stateCredits = (): number => 0
  stateWithholding = (): number =>
    sumFields(this.f1040.info.w2s
      .filter(w => w.state === State.CO)
      .map(w => w.stateWithholding ?? 0))

  attachments = (): StateForm[] => []
  fields = (): Field[] => [/* PDF field mapping */]
}
```

---

### Task 3.3: Progressive-Tax States — High Priority (CA, NY, NJ, GA, VA, OH)

These are the most complex and highest-impact states. Each needs:
- Full bracket tables per filing status
- State-specific additions/subtractions to federal AGI
- State credits (child, earned income, property tax, etc.)
- Multiple form schedules

**California (CA 540)** — most complex:
- 9 tax brackets (1%-12.3% + 1% mental health surcharge over $1M)
- Unique conformity: CA does not conform to many federal deductions
- Schedule CA for federal/state differences
- Renter's credit, child/dependent care credit
- SDI (State Disability Insurance) from W-2s

**New York (IT-201)** — also complex:
- 8 brackets (4%-10.9%)
- NYC additional tax (3.078%-3.876%)
- Yonkers surcharge
- STAR credit, child credit, earned income credit
- IT-201-ATT for additional taxes

Each progressive state is a separate task unit (~200-400 lines per state).

---

### Task 3.4: Remaining Progressive States (25 states)

AL, AR, AZ, CT, DC, DE, HI, IA, ID, KS, LA, MD, ME, MN, MO, MS, MT, NE, NM, ND, OK, OR, RI, SC, VT, WI, WV

Same pattern as Task 3.3 but lower priority. Each follows StateFormBase with state-specific brackets and adjustments.

---

## PHASE 4: Investment & Business Deep

### Task 4.1: Depreciation Engine (shared module)

See Task 2.3 above — the depreciation engine is a prerequisite for Form 4562.

**MACRS tables to implement:**

| Recovery Period | 200% DB | 150% DB | SL |
|-----------------|---------|---------|-----|
| 3-year | ✓ | ✓ | ✓ |
| 5-year | ✓ | ✓ | ✓ |
| 7-year | ✓ | ✓ | ✓ |
| 10-year | ✓ | ✓ | ✓ |
| 15-year | — | ✓ | ✓ |
| 20-year | — | ✓ | ✓ |
| 25-year | — | — | ✓ |
| 27.5-year (residential) | — | — | ✓ |
| 39-year (commercial) | — | — | ✓ |

---

### Task 4.2: Form 6781 — Section 1256 Contracts

**Files:**
- Create: `src/forms/Y2025/irsForms/F6781.ts`
- Create: `src/forms/Y2025/tests/F6781.test.ts`

**Key logic:** 60% long-term / 40% short-term split for regulated futures, foreign currency, and non-equity options.

```typescript
l1 = (): number => this.totalSection1256Gains
// 60% treated as long-term
l8 = (): number => this.l1() * 0.60
// 40% treated as short-term
l9 = (): number => this.l1() * 0.40
```

---

### Task 4.3: Form 6252 — Installment Sales

**Key logic:**
```typescript
grossProfitRatio = (): number => this.grossProfit / this.contractPrice
taxableGain = (): number => this.paymentsReceived * this.grossProfitRatio()
```

---

### Task 4.4: Form 8824 — Like-Kind Exchanges

**Key logic:**
```typescript
// Deferred gain: FMV received - adjusted basis given - boot paid + boot received
// New basis: FMV of like-kind property received - deferred gain
```

---

### Task 4.5: Enhanced F8949 — Bulk Crypto Transactions

**Modify:** `src/forms/Y2025/irsForms/F8949.ts`

- Support up to 20,000 transactions
- Aggregate reporting for transactions with same asset
- Wash sale detection and adjustment (Column g)
- Summary totals flow to Schedule D
- Handle 1099-DA data from crypto brokers

---

### Task 4.6: Forms 3921/3922 — Stock Options (ISO/NSO/ESPP)

**Files:**
- Create: `src/forms/Y2025/irsForms/F3921.ts` (ISO exercises)
- Create: `src/forms/Y2025/irsForms/F3922.ts` (ESPP)

**Key logic:**
- ISO: AMT adjustment = (FMV at exercise - exercise price) × shares
- NSO: Ordinary income = (FMV at exercise - exercise price) × shares
- ESPP: Discount element may be ordinary income
- Wire AMT adjustment to Form 6251

---

## PHASE 5: Import & Interview Wizard

### Task 5.1: CSV Import Infrastructure

**Files:**
- Create: `src/import/index.ts` — parser registry
- Create: `src/import/parsers/fidelity.ts`
- Create: `src/import/parsers/schwab.ts`
- Create: `src/import/parsers/vanguard.ts`
- Create: `src/import/parsers/coinbase.ts`
- Create: `src/import/parsers/robinhood.ts`
- Create: `src/import/parsers/generic.ts` — column mapping
- Create: `src/components/import/CSVImport.tsx`

**Parser interface:**
```typescript
export interface CSVParser<T> {
  broker: string
  supportedForms: string[]  // ['1099-B', '1099-DIV']
  detect(headers: string[]): boolean
  parse(rows: string[][]): T[]
  validate(data: T[]): ImportError[]
}
```

**Step 1:** Create parser interface and registry
**Step 2:** Implement Fidelity parser (1099-B CSV format)
**Step 3:** Implement remaining broker parsers
**Step 4:** Create drag-and-drop CSV import UI component
**Step 5:** Wire imported data into Redux store
**Step 6:** Write tests for each parser with sample CSVs

---

### Task 5.2: Prior Year Data Import

**Files:**
- Create: `src/import/priorYear.ts`
- Create: `src/components/import/PriorYearImport.tsx`

**Logic:**
- Load JSON from localStorage or file upload
- Map previous year's Information to current year schema
- Handle schema version migrations
- Pre-fill: taxpayer info, dependents, employers, basis tracking

---

### Task 5.3: PDF Upload & Field Extraction

**Files:**
- Create: `src/import/pdfExtract.ts`
- Create: `src/components/import/PDFUpload.tsx`

**Logic:**
- Use pdf-lib (already a dependency) to read uploaded PDFs
- Extract form field values by field name
- Map IRS PDF field names to data model
- Support W-2, 1099 series, K-1 forms

---

### Task 5.4: Interview Engine

**Files:**
- Create: `src/interview/engine.ts` — state machine
- Create: `src/interview/questions.ts` — question definitions
- Create: `src/interview/types.ts` — interfaces
- Create: `src/components/interview/InterviewLayout.tsx` — main layout
- Create: `src/components/interview/QuestionNode.tsx` — question renderer
- Create: `src/components/interview/ProgressSidebar.tsx` — progress tracking
- Create: `src/components/interview/ReviewSummary.tsx` — final review

**Interview engine architecture:**

```typescript
// src/interview/types.ts
export interface InterviewNode {
  id: string
  type: 'yes-no' | 'multiple-choice' | 'form-entry' | 'info'
  question: string
  helpText?: string
  options?: Array<{ label: string; value: string; nextId: string }>
  condition?: (info: Information) => boolean  // Skip if false
  formComponent?: string  // Component key to render
  defaultNext: string     // Next node if no option-specific next
}

export interface InterviewSection {
  id: string
  title: string
  icon: string
  description: string
  nodes: InterviewNode[]
  isComplete: (info: Information) => boolean
}

// src/interview/engine.ts
export class InterviewEngine {
  private sections: InterviewSection[]
  private currentNodeId: string
  private history: string[]  // For back navigation
  private info: Information

  constructor(sections: InterviewSection[], info: Information) {
    this.sections = sections
    this.info = info
    this.currentNodeId = this.findFirstUnanswered()
    this.history = []
  }

  getCurrentNode(): InterviewNode { /* ... */ }

  advance(answer: any): InterviewNode {
    this.history.push(this.currentNodeId)
    const current = this.getCurrentNode()
    const nextId = current.options?.find(o => o.value === answer)?.nextId
      ?? current.defaultNext
    this.currentNodeId = nextId
    // Skip nodes whose conditions are false
    while (this.getCurrentNode().condition?.(this.info) === false) {
      this.currentNodeId = this.getCurrentNode().defaultNext
    }
    return this.getCurrentNode()
  }

  goBack(): InterviewNode {
    this.currentNodeId = this.history.pop() ?? this.currentNodeId
    return this.getCurrentNode()
  }

  progress(): number {
    const total = this.sections.flatMap(s => s.nodes).length
    const answered = this.history.length
    return Math.round((answered / total) * 100)
  }
}
```

**Step 1:** Create types and engine
**Step 2:** Define question flow for Income section
**Step 3:** Define question flow for Deductions section
**Step 4:** Define question flow for Credits section
**Step 5:** Create InterviewLayout with sidebar progress
**Step 6:** Create QuestionNode renderer
**Step 7:** Create ReviewSummary showing all entered data
**Step 8:** Wire interview into Main.tsx as alternate navigation mode
**Step 9:** Write tests for engine state transitions

---

### Task 5.5: Real-Time Refund Estimator

**Files:**
- Create: `src/components/RefundEstimator.tsx`

**Logic:**
- Runs F1040 calculation on current data after each form save
- Displays running refund/owed amount in sidebar or header
- Updates live as user enters data
- Shows breakdown: federal tax, credits, withholding, refund/owed

---

## PHASE 6: PDF Output Polish

### Task 6.1: PDF Field Mapping Verification

For every new form implemented in Phases 2-4:
1. Download IRS PDF from irs.gov
2. Place in `public/irs/{formtag}.pdf`
3. Count exact number of fillable fields
4. Verify `fields()` array length matches
5. Verify field order matches PDF field order

**Testing approach:**
```typescript
it('should match PDF field count', async () => {
  const pdfBytes = await fetchPDF('f1040sc')
  const pdf = await PDFDocument.load(pdfBytes)
  const fieldCount = pdf.getForm().getFields().length
  expect(scheduleC.fields().length).toBe(fieldCount)
})
```

### Task 6.2: Multi-Page Overflow

Forms like Schedule C (Part V: Other Expenses) may need multiple pages. Implement the `copies()` pattern:

```typescript
copies = (): ScheduleC[] => {
  if (this.index === 0 && this.business.otherExpenseDescriptions?.length > 5) {
    const extraPages = Math.ceil((this.business.otherExpenseDescriptions.length - 5) / 5)
    return Array.from({ length: extraPages }, (_, i) => new ScheduleC(this.f1040, i + 1))
  }
  return []
}
```

### Task 6.3: 1040-ES Estimated Tax Vouchers

**Files:**
- Create: `src/forms/Y2025/irsForms/F1040ES.ts`

Generate quarterly payment vouchers based on current year tax liability.

### Task 6.4: State Form PDFs

Each state needs its PDF template placed in `public/irs/` (or a new `public/state/` directory) with correct field mapping.

---

## Execution Order & Dependencies

```
Wave 1 (Parallel):
├── Phase 2: Task 2.1 (Schedule C) — FIRST, blocks 2.2
├── Phase 2: Tasks 2.4-2.8 (independent forms) — parallel batch
├── Phase 3: Task 3.0 (infrastructure) — FIRST, blocks 3.1-3.4
├── Phase 4: Task 4.1 (depreciation) — FIRST, blocks 4.2-4.6
│
├── Phase 2: Task 2.2 (Form 8829) — after 2.1
├── Phase 2: Task 2.3 (Form 4562) — after 4.1
├── Phase 3: Tasks 3.1-3.2 (no-tax + flat states) — after 3.0
├── Phase 3: Tasks 3.3-3.4 (progressive states) — after 3.0
├── Phase 4: Tasks 4.2-4.6 (investment forms) — after 4.1

Wave 2 (After Wave 1 forms exist):
├── Phase 5: Task 5.1 (CSV import)
├── Phase 5: Task 5.2 (prior year import)
├── Phase 5: Task 5.3 (PDF upload)
├── Phase 5: Task 5.4 (interview engine) — needs form components
├── Phase 5: Task 5.5 (refund estimator)

Wave 3 (Continuous):
├── Phase 6: Tasks 6.1-6.4 (PDF polish, state PDFs)
```

## Commit Strategy

Each task gets its own branch and commit(s):
- `feat/schedule-c` — Task 2.1
- `feat/form-8829` — Task 2.2
- `feat/depreciation-engine` — Task 4.1
- `feat/state-{ST}` — one branch per state
- `feat/interview-engine` — Task 5.4
- etc.

Merge to `feat/ty2025-turbotax-parity` as each task completes. Final merge to `master` after integration testing.
