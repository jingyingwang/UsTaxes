import { ReactElement } from 'react'
import { Information } from 'ustaxes/core/data'
import { InterviewSection, InterviewNode } from './types'
import Urls from 'ustaxes/data/urls'

// Re-use existing form components
import PrimaryTaxpayer from 'ustaxes/components/TaxPayer'
import SpouseAndDependent from 'ustaxes/components/TaxPayer/SpouseAndDependent'
import W2JobInfo from 'ustaxes/components/income/W2JobInfo'
import F1099Info from 'ustaxes/components/income/F1099Info'
import RealEstate from 'ustaxes/components/income/RealEstate'
import RoyaltyIncomeForm from 'ustaxes/components/income/RoyaltyIncome'
import OtherInvestments from 'ustaxes/components/income/OtherInvestments'
import { StockOptions } from 'ustaxes/components/income/StockOptions'
import { ESPPOptions } from 'ustaxes/components/income/ESPPOptions'
import { PartnershipIncome } from 'ustaxes/components/income/PartnershipIncome'
import { SCorpIncome } from 'ustaxes/components/income/SCorpIncome'
import { EstateAndTrustIncome } from 'ustaxes/components/income/EstateAndTrustIncome'
import EstimatedTaxes from 'ustaxes/components/payments/EstimatedTaxes'
import HealthSavingsAccounts from 'ustaxes/components/savingsAccounts/healthSavingsAccounts'
import IRA from 'ustaxes/components/savingsAccounts/IRA'
import F1098eInfo from 'ustaxes/components/deductions/F1098eInfo'
import ItemizedDeductions from 'ustaxes/components/deductions/ItemizedDeductions'
import CasualtyTheftLosses from 'ustaxes/components/deductions/CasualtyTheftLosses'
import F1098tInfo from 'ustaxes/components/credits/F1098tInfo'
import RefundBankAccount from 'ustaxes/components/RefundBankAccount'
import Questions from 'ustaxes/components/Questions'

/**
 * Helper to create a gating question node.
 * These ask yes/no questions to determine if a form section is relevant.
 */
const gatingQuestion = (
  id: string,
  title: string,
  description: string
): InterviewNode => ({
  id,
  title,
  description,
  type: 'question',
  component: <></>, // Rendered by QuestionNode
  answerKey: id
})

/**
 * Helper to create a form node that renders an existing component.
 */
const formNode = (
  id: string,
  title: string,
  description: string,
  component: ReactElement,
  url: string,
  shouldShow?: () => boolean
): InterviewNode => ({
  id,
  title,
  description,
  type: 'form',
  component,
  url,
  shouldShow
})

/**
 * Build the complete interview question graph.
 * The graph reads from Redux state to determine which sections are relevant
 * and uses gating answers to conditionally show/hide form nodes.
 *
 * @param info - Current tax information from Redux
 * @param answers - Current gating question answers
 */
export const buildQuestionGraph = (
  info: Information,
  answers: Record<string, boolean>
): InterviewSection[] => {
  const answered = (key: string): boolean => answers[key] === true

  return [
    // Section 1: Personal Information
    {
      id: 'personal',
      title: 'Personal Information',
      description: 'Tell us about yourself and your family',
      icon: 'person',
      nodes: [
        formNode(
          'primary-taxpayer',
          'Your Information',
          'Enter your name, SSN, and address',
          <PrimaryTaxpayer />,
          Urls.taxPayer.info
        ),
        formNode(
          'spouse-dependents',
          'Spouse & Dependents',
          'Add your spouse and any dependents',
          <SpouseAndDependent />,
          Urls.taxPayer.spouseAndDependent
        )
      ]
    },

    // Section 2: Income
    {
      id: 'income',
      title: 'Income',
      description: 'Report all sources of income',
      icon: 'attach_money',
      nodes: [
        formNode(
          'income-w2',
          'Wages (W-2)',
          'Enter your W-2 information from employers',
          <W2JobInfo />,
          Urls.income.w2s
        ),
        gatingQuestion(
          'has-1099',
          'Investment & Other Income',
          'Did you receive any 1099 forms (interest, dividends, capital gains)?'
        ),
        formNode(
          'income-1099',
          '1099 Income',
          'Enter your 1099 forms',
          <F1099Info />,
          Urls.income.f1099s,
          () => answered('has-1099')
        ),
        gatingQuestion(
          'has-rental',
          'Rental Property',
          'Did you receive income from rental real estate?'
        ),
        formNode(
          'income-rental',
          'Rental Income',
          'Enter rental property income and expenses',
          <RealEstate />,
          Urls.income.realEstate,
          () => answered('has-rental')
        ),
        gatingQuestion(
          'has-royalty',
          'Royalty Income',
          'Did you receive royalty income?'
        ),
        formNode(
          'income-royalty',
          'Royalty Income',
          'Enter royalty income details',
          <RoyaltyIncomeForm />,
          Urls.income.royaltyIncome,
          () => answered('has-royalty')
        ),
        gatingQuestion(
          'has-investments',
          'Other Investments',
          'Did you have other investment transactions (options, futures, etc.)?'
        ),
        formNode(
          'income-other-investments',
          'Other Investments',
          'Enter other investment details',
          <OtherInvestments />,
          Urls.income.otherInvestments,
          () => answered('has-investments')
        ),
        gatingQuestion(
          'has-stock-options',
          'Stock Options',
          'Did you exercise any incentive stock options (ISO)?'
        ),
        formNode(
          'income-stock-options',
          'Stock Options',
          'Enter stock option exercise details',
          <StockOptions />,
          Urls.income.stockOptions,
          () => answered('has-stock-options')
        ),
        gatingQuestion(
          'has-espp',
          'ESPP Transfers',
          'Did you sell shares from an Employee Stock Purchase Plan (ESPP)?'
        ),
        formNode(
          'income-espp',
          'ESPP Transfers',
          'Enter ESPP transfer details',
          <ESPPOptions />,
          Urls.income.esppOptions,
          () => answered('has-espp')
        ),
        gatingQuestion(
          'has-partnership',
          'Partnership Income',
          'Did you receive a Schedule K-1 from a partnership (Form 1065)?'
        ),
        formNode(
          'income-partnership',
          'Partnership Income (K-1)',
          'Enter Schedule K-1 from partnerships',
          <PartnershipIncome />,
          Urls.income.partnershipIncome,
          () => answered('has-partnership')
        ),
        gatingQuestion(
          'has-scorp',
          'S-Corporation Income',
          'Did you receive a Schedule K-1 from an S-Corporation (Form 1120-S)?'
        ),
        formNode(
          'income-scorp',
          'S-Corp Income (K-1)',
          'Enter Schedule K-1 from S-Corporations',
          <SCorpIncome />,
          Urls.income.sCorpIncome,
          () => answered('has-scorp')
        ),
        gatingQuestion(
          'has-estate-trust',
          'Estate & Trust Income',
          'Did you receive a Schedule K-1 from an estate or trust (Form 1041)?'
        ),
        formNode(
          'income-estate-trust',
          'Estate & Trust Income (K-1)',
          'Enter Schedule K-1 from estates or trusts',
          <EstateAndTrustIncome />,
          Urls.income.estateAndTrustIncome,
          () => answered('has-estate-trust')
        )
      ]
    },

    // Section 3: Payments
    {
      id: 'payments',
      title: 'Payments',
      description: 'Tax payments you already made this year',
      icon: 'payment',
      nodes: [
        gatingQuestion(
          'has-estimated-taxes',
          'Estimated Tax Payments',
          'Did you make estimated tax payments during the year?'
        ),
        formNode(
          'estimated-taxes',
          'Estimated Taxes',
          'Enter your estimated tax payment amounts',
          <EstimatedTaxes />,
          Urls.payments.estimatedTaxes,
          () => answered('has-estimated-taxes')
        )
      ]
    },

    // Section 4: Savings Accounts
    {
      id: 'savings',
      title: 'Savings Accounts',
      description: 'Health and retirement savings',
      icon: 'savings',
      nodes: [
        gatingQuestion(
          'has-hsa',
          'Health Savings Account',
          'Did you contribute to or receive distributions from a Health Savings Account (HSA)?'
        ),
        formNode(
          'hsa',
          'HSA',
          'Enter HSA contributions and distributions',
          <HealthSavingsAccounts />,
          Urls.savingsAccounts.healthSavingsAccounts,
          () => answered('has-hsa')
        ),
        gatingQuestion(
          'has-ira',
          'IRA Contributions',
          'Did you contribute to an Individual Retirement Arrangement (IRA)?'
        ),
        formNode(
          'ira',
          'IRA',
          'Enter IRA contribution details',
          <IRA />,
          Urls.savingsAccounts.ira,
          () => answered('has-ira')
        )
      ]
    },

    // Section 5: Deductions
    {
      id: 'deductions',
      title: 'Deductions',
      description: 'Reduce your taxable income',
      icon: 'remove_circle',
      nodes: [
        gatingQuestion(
          'has-student-loans',
          'Student Loan Interest',
          'Did you pay interest on student loans?'
        ),
        formNode(
          'student-loan-interest',
          'Student Loan Interest (1098-E)',
          'Enter student loan interest paid',
          <F1098eInfo />,
          Urls.deductions.f1098es,
          () => answered('has-student-loans')
        ),
        gatingQuestion(
          'has-casualty-losses',
          'Casualty & Theft Losses',
          'Did you have any casualty or theft losses in a federally declared disaster area?'
        ),
        formNode(
          'casualty-losses',
          'Casualty & Theft Losses',
          'Enter casualty and theft loss details',
          <CasualtyTheftLosses />,
          Urls.deductions.casualty,
          () => answered('has-casualty-losses')
        ),
        gatingQuestion(
          'wants-itemized',
          'Itemized Deductions',
          'Would you like to itemize deductions instead of taking the standard deduction?'
        ),
        formNode(
          'itemized-deductions',
          'Itemized Deductions',
          'Enter your itemized deductions',
          <ItemizedDeductions />,
          Urls.deductions.itemized,
          () => answered('wants-itemized')
        )
      ]
    },

    // Section 6: Credits
    {
      id: 'credits',
      title: 'Credits',
      description: 'Tax credits that reduce what you owe',
      icon: 'star',
      nodes: [
        gatingQuestion(
          'has-education-credits',
          'Education Credits',
          'Did you or a dependent pay tuition and have a 1098-T form?'
        ),
        formNode(
          'education-credits',
          'Education Credits (1098-T)',
          'Enter education expenses and 1098-T details',
          <F1098tInfo />,
          Urls.credits.education,
          () => answered('has-education-credits')
        )
      ]
    },

    // Section 7: Final
    {
      id: 'final',
      title: 'Finish Up',
      description: 'Review and finalize your return',
      icon: 'check_circle',
      nodes: [
        formNode(
          'refund-info',
          'Refund Information',
          'Enter your bank account for direct deposit',
          <RefundBankAccount />,
          Urls.refund
        ),
        formNode(
          'questions',
          'Additional Questions',
          'Answer required informational questions based on your return',
          <Questions />,
          Urls.questions
        )
      ]
    }
  ]
}
