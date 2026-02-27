const Urls = {
  usTaxes: {
    start: '/start'
  },
  taxPayer: {
    root: '/taxpayer',
    info: '/info',
    spouseAndDependent: '/spouseanddependent'
  },
  refund: '/refundinfo',
  questions: '/questions',
  income: {
    w2s: '/income/w2jobinfo',
    f1099s: '/income/f1099s',
    csvImport: '/income/import',
    realEstate: '/income/realestate',
    royaltyIncome: '/income/royaltyincome',
    otherInvestments: '/income/otherinvestments',
    stockOptions: '/income/stockoptions',
    esppOptions: '/income/esppoptions',
    partnershipIncome: '/income/partnershipincome',
    sCorpIncome: '/income/scorpincome',
    estateAndTrustIncome: '/income/estatetrustincome',
    businessIncome: '/income/businessincome'
  },
  payments: {
    estimatedTaxes: '/payments/estimatedtaxes'
  },
  savingsAccounts: {
    healthSavingsAccounts: '/savingsaccounts/hsa',
    ira: '/savingsaccounts/ira'
  },
  deductions: {
    f1098es: '/deductions/studentloaninterest',
    casualty: '/deductions/casualty',
    itemized: '/deductions/itemized'
  },
  credits: {
    main: '/credits',
    eic: '/credits/eic',
    education: '/credits/education'
  },
  interview: '/interview',
  amendedReturn: '/amended/f1040x',
  importPdf: '/import/pdf',
  createPdf: '/createpdf',
  settings: '/settings',
  help: '/help',
  Y2021: {
    credits: `/Y2021/credits`
  },
  default: ''
}

Urls.default = Urls.usTaxes.start

export default Urls
