# USTaxes Full TurboTax Parity — Design Document

**Date:** 2026-02-26
**Status:** Approved
**Approach:** Maximum Parallelism (Phases 2+3+4 concurrent, then Phase 5, then Phase 6)

## Executive Summary

Implement all remaining features to achieve full TurboTax parity for TY2025:
- ~25 new federal forms (Phase 2)
- All 50 state tax engines (Phase 3)
- Deep investment/business forms (Phase 4)
- TurboTax-style interview wizard + import infrastructure (Phase 5)
- PDF output polish (Phase 6, no e-filing)

Phases 2, 3, and 4 run in parallel. Phase 5 starts after form implementations stabilize. Phase 6 is ongoing polish.

---

## Phase 2: Missing Federal Forms (~25 forms)

### Tier 1 — No inter-form dependencies

| Form | Purpose | Lines | Complexity |
|------|---------|-------|------------|
| Schedule C | Self-employment profit/loss | ~50 | High |
| Form 1040X | Amended returns | ~30 | Medium |
| Form 8606 | Nondeductible IRAs / Roth conversions | ~25 | Medium |
| Form 5329 | Early distribution penalties | ~15 | Low |
| Form 8880 | Saver's Credit | ~10 | Low |
| Form 8839 | Adoption Credit | ~15 | Low |
| Form 7206 | Self-employed health insurance deduction | ~10 | Low |
| Schedule F | Farm income | ~50 | High |
| Schedule H | Household employment taxes | ~25 | Medium |
| Form 2210 | Underpayment penalty | ~30 | Medium |
| Form 4868 | Extension filing | ~10 | Low |
| Form 9465 | Installment agreement | ~15 | Low |
| 1120-S K-1 | S-Corp pass-through (data entry) | ~20 | Medium |
| 1041 K-1 | Trust/estate pass-through (data entry) | ~20 | Medium |

### Tier 2 — Depends on Schedule C

| Form | Purpose | Lines | Complexity |
|------|---------|-------|------------|
| Form 8829 | Home office deduction | ~40 | Medium |
| Form 4562 | Depreciation/amortization (8 variants) | ~50 | High |

### Data Model Additions

New interfaces in `src/core/data/index.ts`:

```typescript
interface ScheduleCData {
  businessName: string
  businessEIN?: string
  principalBusinessCode: string
  accountingMethod: 'cash' | 'accrual' | 'other'
  grossReceipts: number
  returnsAndAllowances: number
  costOfGoodsSold: number
  expenses: Partial<{ [K in ScheduleCExpenseType]: number }>
  vehicleInfo?: VehicleInfo
  homeOffice?: HomeOfficeData
}

interface ScheduleFData {
  farmName: string
  principalProduct: string
  accountingMethod: 'cash' | 'accrual'
  grossIncome: number
  expenses: Partial<{ [K in ScheduleFExpenseType]: number }>
}

interface ScheduleHData {
  cashWagesPaid: number
  federalWithholding: number
  socialSecurityTax: number
  medicareTax: number
  employeeCount: number
}

interface AmendedReturnData {
  originalFilingDate: Date
  originalAmounts: Partial<Record<string, number>>
  correctedAmounts: Partial<Record<string, number>>
  explanationOfChanges: string
}

interface IRABasisTracking {
  traditionalNondeductibleBasis: number
  rothConversionAmount: number
  rothConversionBasis: number
  totalTraditionalIRAValue: number
}
```

Extend `Information` interface:
```typescript
interface Information<D = Date> {
  // ... existing fields ...
  scheduleCBusinesses: ScheduleCData[]
  scheduleFfarms: ScheduleFData[]
  scheduleHEmployment?: ScheduleHData
  amendedReturn?: AmendedReturnData
  iraBasis?: IRABasisTracking
  scheduleK1Form1041s: ScheduleK1Form1041[]
  scheduleK1Form1120Ss: ScheduleK1Form1120S[]
}
```

### Form Registration

Each new form:
1. Create class in `src/forms/Y2025/irsForms/`
2. Add property to F1040 class
3. Initialize in F1040 constructor
4. Add to `schedules()` filter list
5. Set correct `sequenceIndex` per IRS assembly order

---

## Phase 3: All 50 State Tax Engines

### Tiered Approach

**Tier A — No income tax (9 states, already handled):**
AK, FL, NV, NH (interest/dividends only), SD, TN, TX, WA, WY

**Tier B — Flat tax states (11 states, simplest):**
CO (4.4%), IL (4.95%), IN (3.05%), KY (4.0%), MA (5.0%), MI (4.25%), NC (4.5%), PA (3.07%), UT (4.65%)

**Tier C — Progressive tax states (31 states, full bracket implementation):**
AL, AR, AZ, CA, CT, DC, DE, GA, HI, IA, ID, KS, LA, MD, ME, MN, MO, MS, MT, NE, NJ, NM, NY, ND, OH, OK, OR, RI, SC, VT, VA, WI, WV

### Common State Form Architecture

New base class `StateFormBase` in `src/core/stateForms/`:

```typescript
abstract class StateFormBase extends StateForm {
  // Common pattern: federal AGI → state adjustments → state tax
  abstract stateAdditions(): number      // Items state adds back
  abstract stateSubtractions(): number   // State-specific deductions
  abstract stateTaxBrackets(): TaxBracket[]
  abstract stateCredits(): number
  abstract stateWithholding(): number

  stateTaxableIncome(): number {
    return this.federalAGI() + this.stateAdditions() - this.stateSubtractions()
  }

  stateTaxBeforeCredits(): number {
    return computeTax(this.stateTaxableIncome(), this.stateTaxBrackets())
  }

  stateNetTax(): number {
    return Math.max(0, this.stateTaxBeforeCredits() - this.stateCredits())
  }

  stateRefundOrOwed(): number {
    return this.stateWithholding() - this.stateNetTax()
  }
}
```

### Per-State Implementation

Each state gets:
1. `src/forms/Y2025/stateForms/{ST}/` directory
2. Main return form extending `StateFormBase`
3. `constants.ts` — brackets, rates, standard deduction, exemptions
4. State-specific schedules as needed (e.g., CA Schedule CA for conformity adjustments)
5. PDF mapping to state form fields

### State Constants Structure

```typescript
// Per-state constants file
interface StateConstants {
  brackets: { [status in FilingStatus]: TaxBracket[] }
  standardDeduction: { [status in FilingStatus]: number }
  personalExemption: number
  dependentExemption: number
  conformityYear: number  // Which federal tax code version state conforms to
  additions: string[]     // Items added back to federal AGI
  subtractions: string[]  // State-specific deductions
}
```

### Parallelization

All 50 states are independent — each can be a separate polecat task. Flat-tax states take ~1 hour each, progressive states take ~2-4 hours each.

---

## Phase 4: Investment & Business Deep

### Depreciation Engine (Core Module)

Central module used by Form 4562, Form 8829, and Schedule C:

```typescript
// src/core/depreciation/
interface DepreciableAsset {
  description: string
  dateInService: Date
  cost: number
  recoveryPeriod: RecoveryPeriod  // 3, 5, 7, 10, 15, 20, 25, 27.5, 39 years
  method: DepreciationMethod       // SL, DB-200, DB-150
  convention: Convention            // half-year, mid-quarter, mid-month
  section179Election: number
  bonusDepreciationPct: number     // 0%, 40%, 60%, 80%, 100%
  priorDepreciation: number
  listedProperty: boolean
  businessUsePct: number
}

function calculateDepreciation(asset: DepreciableAsset, taxYear: number): number
function getMACRSTable(period: RecoveryPeriod, method: DepreciationMethod, convention: Convention): number[]
```

### Other Phase 4 Forms

| Form | Key Logic |
|------|-----------|
| Form 8829 | Square footage ratio × home expenses, simplified method ($5/sqft max 300 sqft) |
| Form 6781 | Section 1256: 60% long-term + 40% short-term split |
| Form 6252 | Installment sale: gross profit ratio × payments received |
| Form 8824 | Like-kind exchange: adjusted basis + boot = new basis |
| F8949 bulk | Aggregate reporting for >200 transactions, wash sale adjustment column |
| Forms 3921/3922 | ISO exercise: AMT adjustment = (FMV - exercise price) × shares |

---

## Phase 5: Import & Interview Wizard

### Import Infrastructure

#### W-2 EIN Lookup
- Use IRS FIRE system or public EIN database for employer auto-fill
- Fallback: manual entry (current behavior)

#### 1099 CSV Import
Parser modules per broker:
```typescript
// src/import/parsers/
interface CSVParser<T> {
  broker: string
  detect(headers: string[]): boolean      // Auto-detect broker from CSV headers
  parse(rows: CSVRow[]): T[]              // Parse to typed data
  validate(data: T[]): ValidationError[]  // Validate parsed data
}
```

Supported brokers:
- Fidelity, Schwab, Vanguard (1099-B, 1099-DIV, 1099-INT)
- Coinbase, Robinhood, Kraken (1099-DA / crypto transactions)
- Generic CSV with column mapping UI

#### Prior Year Import
- Load USTaxes JSON save file from previous year
- Map to current year data model (handle schema migrations)
- Pre-fill: taxpayer info, dependents, employer info, carried-over basis

#### PDF Upload
- Client-side PDF field extraction using pdf-lib (already a dependency)
- Parse IRS form fields from uploaded PDF documents
- Map extracted values to data model

### TurboTax-Style Interview Wizard

#### Architecture: Question Graph Engine

```typescript
// src/interview/
interface InterviewNode {
  id: string
  type: 'question' | 'section-header' | 'form-entry' | 'summary'
  question?: string
  options?: InterviewOption[]
  condition?: (info: Information) => boolean  // Show/skip based on existing data
  formComponent?: React.ComponentType         // UI to render for data entry
  next: (answer: any, info: Information) => string  // Next node ID
}

interface InterviewSection {
  id: string
  title: string          // "Income", "Deductions", "Credits"
  icon: string
  nodes: InterviewNode[]
  isComplete: (info: Information) => boolean
}

interface InterviewEngine {
  sections: InterviewSection[]
  currentNode: string
  progress: number        // 0-100%
  advance(answer: any): void
  goBack(): void
  jumpToSection(sectionId: string): void
}
```

#### Interview Flow

```
1. Welcome & Filing Status
   └─ Filing status, personal info, dependents

2. Income
   ├─ "Did you work as an employee?" → W-2 entry
   ├─ "Did you do freelance or gig work?" → Schedule C interview
   ├─ "Did you earn interest income?" → 1099-INT entry
   ├─ "Did you earn dividend income?" → 1099-DIV entry
   ├─ "Did you sell stocks, bonds, or crypto?" → 1099-B/DA entry
   ├─ "Did you receive retirement distributions?" → 1099-R entry
   ├─ "Did you receive Social Security?" → SSA-1099 entry
   ├─ "Did you have rental property income?" → Schedule E interview
   ├─ "Did you have farm income?" → Schedule F interview
   ├─ "Did you receive K-1 forms?" → K-1 entry (1065, 1120-S, 1041)
   └─ "Any other income?" → Catch-all

3. Deductions
   ├─ Standard vs. itemized decision helper
   ├─ "Did you pay mortgage interest?" → Schedule A
   ├─ "Did you pay state/local taxes?" → SALT
   ├─ "Did you make charitable contributions?" → Schedule A
   ├─ "Did you have medical expenses?" → Schedule A
   ├─ "Did you contribute to an IRA?" → Schedule 1
   ├─ "Did you pay student loan interest?" → Schedule 1
   ├─ "Are you 65+?" → Schedule 1-A senior deduction
   ├─ "Did you earn tips?" → Schedule 1-A tip deduction
   └─ "Did you work overtime?" → Schedule 1-A overtime deduction

4. Credits
   ├─ "Do you have children under 17?" → Child Tax Credit
   ├─ "Did you pay for child care?" → Form 2441
   ├─ "Are you a student or paying tuition?" → Form 8863
   ├─ "Did you contribute to retirement?" → Form 8880
   └─ Health insurance → Form 8962

5. State Taxes
   └─ Auto-detected from residency → state form interview

6. Review & Generate
   └─ Summary with all data, edit links, PDF generation
```

#### Progress Tracking UI

Sidebar with sections showing:
- Completed sections (checkmark)
- Current section (highlighted)
- Remaining sections (grayed)
- Overall % complete
- Estimated refund/owed (updates live)

---

## Phase 6: PDF Output Polish

Since we're not implementing e-filing:

1. **PDF field mapping** for all new forms (Phases 2-4)
2. **Multi-page handling** for forms with overflow (e.g., Schedule C with many expenses)
3. **Print-friendly formatting** — ensure all PDFs render correctly when printed
4. **Form 8888** (direct deposit split to 3 accounts) — enhance existing
5. **1040-ES vouchers** — quarterly estimated tax payment slips
6. **State form PDFs** — all 50 states need correct PDF templates

---

## Parallel Execution Plan

### Wave 1 (Concurrent)

| Track | Work | Dependencies |
|-------|------|-------------|
| **Phase 2 Track A** | Schedule C, Schedule F, Form 1040X, low-complexity forms | None |
| **Phase 2 Track B** | Form 4562 (depreciation engine), Form 8829, Form 8606 | Schedule C for 8829 |
| **Phase 3 Track A** | Flat-tax states (11 states) | Federal form calculations |
| **Phase 3 Track B** | Progressive-tax states (31 states) | Federal form calculations |
| **Phase 4** | Depreciation engine, Form 6781, Form 6252, Form 8824, crypto bulk, stock options | Depreciation engine for 4562 |

### Wave 2 (After Wave 1 stabilizes)

| Track | Work | Dependencies |
|-------|------|-------------|
| **Phase 5 Import** | CSV parsers, PDF upload, prior year import | Data model from Phase 2 |
| **Phase 5 Interview** | Question graph engine, section flows, progress UI | All form components |
| **Phase 6 Polish** | PDF field mapping for all new forms, print testing | All forms implemented |

### Integration Points

- State forms reference federal calculations → state work starts after core federal forms have stable APIs
- Interview wizard needs form components → starts after Phase 2 UI components exist
- PDF polish runs continuously as forms are completed

---

## Testing Strategy

### Unit Tests (per form)
- Property-based tests with `fast-check` (existing pattern)
- Edge cases: zero income, maximum deductions, phase-out boundaries
- Cross-form dependency validation

### Integration Tests
- Full return generation with known tax scenarios
- Comparison against IRS Publication 17 examples
- State + federal combined return validation

### PDF Tests
- Field count verification (fields().length === PDF field count)
- Visual spot-checks for field positioning
- Multi-page overflow handling

---

## Success Criteria

- All ~25 new federal forms produce correct calculations matching IRS instructions
- All 50 states generate correct state returns
- Interview wizard guides users through complete return without tax knowledge
- CSV import works for top 5 brokers (Fidelity, Schwab, Vanguard, Coinbase, Robinhood)
- PDF output is print-ready for all forms
- Test suite passes with property-based validation
- Existing TY2025 Phase 1 features remain unbroken
