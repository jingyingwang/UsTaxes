import {
  aggregateTransactions,
  detectParser,
  ParsedTransaction
} from '../index'
import {
  parseDollar,
  determineTermType,
  termTypeFromLabel
} from '../parsers/common'
import { fidelityParser } from '../parsers/fidelity'
import { schwabParser } from '../parsers/schwab'
import { vanguardParser } from '../parsers/vanguard'
import { isLeft, isRight } from 'ustaxes/core/util'

describe('parseDollar', () => {
  it('parses plain numbers', () => {
    expect(parseDollar('100.50')).toBe(100.5)
  })

  it('handles dollar sign and commas', () => {
    expect(parseDollar('$1,234.56')).toBe(1234.56)
  })

  it('handles parenthesized negatives', () => {
    expect(parseDollar('($500.00)')).toBe(-500)
  })

  it('returns 0 for empty string', () => {
    expect(parseDollar('')).toBe(0)
  })

  it('handles whitespace', () => {
    expect(parseDollar(' $ 1,000 ')).toBe(1000)
  })
})

describe('determineTermType', () => {
  it('returns SHORT for undefined dateAcquired', () => {
    expect(determineTermType(undefined, '2024-06-01')).toBe('SHORT')
  })

  it('returns SHORT for <1 year holding', () => {
    expect(determineTermType('2024-01-01', '2024-06-01')).toBe('SHORT')
  })

  it('returns LONG for >1 year holding', () => {
    expect(determineTermType('2023-01-01', '2024-06-01')).toBe('LONG')
  })
})

describe('termTypeFromLabel', () => {
  it('detects long-term', () => {
    expect(termTypeFromLabel('Long-Term')).toBe('LONG')
    expect(termTypeFromLabel('long term')).toBe('LONG')
  })

  it('defaults to short-term', () => {
    expect(termTypeFromLabel('Short-Term')).toBe('SHORT')
    expect(termTypeFromLabel('')).toBe('SHORT')
  })
})

describe('aggregateTransactions', () => {
  it('aggregates by term and basis reporting', () => {
    const txs: ParsedTransaction[] = [
      {
        description: 'AAPL',
        dateSold: '2024-03-01',
        proceeds: 1000,
        costBasis: 800,
        washSaleLossDisallowed: 0,
        termType: 'SHORT',
        basisReportedToIRS: true
      },
      {
        description: 'MSFT',
        dateSold: '2024-03-01',
        proceeds: 2000,
        costBasis: 1500,
        washSaleLossDisallowed: 50,
        termType: 'LONG',
        basisReportedToIRS: true
      },
      {
        description: 'GOOG',
        dateSold: '2024-03-01',
        proceeds: 500,
        costBasis: 600,
        washSaleLossDisallowed: 0,
        termType: 'SHORT',
        basisReportedToIRS: false
      }
    ]

    const result = aggregateTransactions(txs)

    expect(result.shortTermBasisReportedProceeds).toBe(1000)
    expect(result.shortTermBasisReportedCostBasis).toBe(800)
    expect(result.longTermBasisReportedProceeds).toBe(2000)
    expect(result.longTermBasisReportedCostBasis).toBe(1500)
    expect(result.longTermBasisReportedWashSale).toBe(50)
    expect(result.shortTermBasisNotReportedProceeds).toBe(500)
    expect(result.shortTermBasisNotReportedCostBasis).toBe(600)
    expect(result.longTermBasisNotReportedProceeds).toBe(0)
  })
})

describe('detectParser', () => {
  it('detects Fidelity format', () => {
    const headers = [
      'Symbol',
      'Description',
      'Date Acquired',
      'Date Sold',
      'Proceeds',
      'Cost Basis',
      'Gain/Loss',
      'Type of Gain/Loss'
    ]
    const parser = detectParser(headers)
    expect(parser.name).toBe('Fidelity')
  })

  it('detects Schwab format', () => {
    const headers = [
      'Description of Property',
      'Date Acquired',
      'Date Sold or Disposed',
      'Proceeds',
      'Cost or Other Basis',
      'Wash Sale Loss Disallowed',
      'Gain or (Loss)'
    ]
    const parser = detectParser(headers)
    expect(parser.name).toBe('Charles Schwab')
  })

  it('detects Vanguard format', () => {
    const headers = [
      'Fund Account Number',
      'Fund Name',
      'CUSIP Number',
      'Date of Sale/Exchange',
      'Sales Price',
      'Cost or Other Basis'
    ]
    const parser = detectParser(headers)
    expect(parser.name).toBe('Vanguard')
  })

  it('falls back to generic for unknown format', () => {
    const headers = ['Column A', 'Column B', 'Column C']
    const parser = detectParser(headers)
    expect(parser.name).toContain('Generic')
  })
})

describe('fidelityParser', () => {
  const headers = [
    'Symbol',
    'Description',
    'Date Acquired',
    'Date Sold',
    'Proceeds',
    'Cost Basis',
    'Wash Sale Loss Disallowed',
    'Gain/Loss',
    'Term'
  ]

  it('parses valid rows', () => {
    const rows = [
      [
        'AAPL',
        'Apple Inc',
        '01/15/2023',
        '03/20/2024',
        '$5,000.00',
        '$3,000.00',
        '$0.00',
        '$2,000.00',
        'Long-Term'
      ],
      [
        'MSFT',
        'Microsoft',
        '06/01/2024',
        '08/15/2024',
        '$2,500.00',
        '$2,000.00',
        '$100.00',
        '$600.00',
        'Short-Term'
      ]
    ]

    const result = fidelityParser.parse(headers, rows)
    expect(isRight(result)).toBe(true)
    if (isRight(result)) {
      expect(result.right).toHaveLength(2)
      expect(result.right[0].proceeds).toBe(5000)
      expect(result.right[0].termType).toBe('LONG')
      expect(result.right[1].washSaleLossDisallowed).toBe(100)
      expect(result.right[1].termType).toBe('SHORT')
    }
  })

  it('rejects rows with missing proceeds', () => {
    const rows = [
      [
        'AAPL',
        'Apple Inc',
        '01/15/2023',
        '03/20/2024',
        '',
        '$3,000.00',
        '$0.00',
        '',
        'Long-Term'
      ]
    ]

    const result = fidelityParser.parse(headers, rows)
    expect(isLeft(result)).toBe(true)
  })
})

describe('schwabParser', () => {
  const headers = [
    'Description of Property',
    'Date Acquired',
    'Date Sold or Disposed',
    'Proceeds',
    'Cost or Other Basis',
    'Wash Sale Loss Disallowed',
    'Gain or (Loss)',
    'Short-term or Long-term'
  ]

  it('parses data rows and skips section headers', () => {
    const rows = [
      ['Short Term - Covered Securities', '', '', '', '', '', '', ''],
      [
        'AAPL 100 shares',
        '01/15/2024',
        '06/15/2024',
        '$10,000',
        '$8,000',
        '$0',
        '$2,000',
        'Short-Term'
      ],
      ['Totals', '', '', '$10,000', '$8,000', '', '$2,000', ''],
      ['Long Term - Covered Securities', '', '', '', '', '', '', ''],
      [
        'MSFT 50 shares',
        '01/01/2022',
        '06/15/2024',
        '$5,000',
        '$3,000',
        '$0',
        '$2,000',
        'Long-Term'
      ]
    ]

    const result = schwabParser.parse(headers, rows)
    expect(isRight(result)).toBe(true)
    if (isRight(result)) {
      expect(result.right).toHaveLength(2)
      expect(result.right[0].termType).toBe('SHORT')
      expect(result.right[1].termType).toBe('LONG')
    }
  })
})

describe('vanguardParser', () => {
  const headers = [
    'Fund Account Number',
    'Fund Name',
    'Date of Acquisition',
    'Date of Sale/Exchange',
    'Sales Price',
    'Cost or Other Basis',
    'Wash Sale Loss Disallowed',
    'Short-term/Long-term',
    'Noncovered/Covered'
  ]

  it('parses valid rows', () => {
    const rows = [
      [
        '12345',
        'Total Stock Market',
        '01/01/2022',
        '06/01/2024',
        '$10,000',
        '$7,000',
        '$0',
        'Long-term',
        'Covered'
      ],
      [
        '12345',
        'Total Bond Market',
        '03/01/2024',
        '09/01/2024',
        '$5,000',
        '$4,800',
        '$50',
        'Short-term',
        'Noncovered'
      ]
    ]

    const result = vanguardParser.parse(headers, rows)
    expect(isRight(result)).toBe(true)
    if (isRight(result)) {
      expect(result.right).toHaveLength(2)
      expect(result.right[0].termType).toBe('LONG')
      expect(result.right[0].basisReportedToIRS).toBe(true)
      expect(result.right[1].termType).toBe('SHORT')
      expect(result.right[1].basisReportedToIRS).toBe(false)
      expect(result.right[1].washSaleLossDisallowed).toBe(50)
    }
  })
})
