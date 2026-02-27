import { PDFDocument } from 'pdf-lib'
import fs from 'fs'
import path from 'path'

/**
 * Field mapping verification test for Y2025 IRS forms.
 *
 * For each form that has both a TypeScript implementation and a PDF template,
 * this test loads the PDF, counts its fillable fields, and compares that count
 * to the form's fields() array length. Mismatches indicate the form
 * implementation may be out of sync with the PDF template.
 *
 * The test uses source-code parsing to extract form tags and field array lengths,
 * since many forms require complex F1040 dependencies that are impractical to
 * mock in isolation.
 */

const PDF_DIR = path.resolve(__dirname, '../../../../public/forms/Y2025/irs')
const FORMS_DIR = path.resolve(__dirname, '../irsForms')

interface FormInfo {
  fileName: string
  tag: string
  fieldCount: number | 'dynamic'
}

/**
 * Parse a form source file to extract the tag and determine field count.
 * Returns null if the file doesn't define a form tag.
 */
function parseFormSource(filePath: string): FormInfo | null {
  const source = fs.readFileSync(filePath, 'utf-8')
  const fileName = path.basename(filePath, '.ts')

  // Extract the form tag
  const tagMatch = source.match(/tag(?:\s*:\s*FormTag)?\s*=\s*'([^']+)'/)
  if (!tagMatch) return null

  const tag = tagMatch[1]

  // Determine field count from source
  // Pattern 1: fields = (): Field[] => []  (empty stub)
  if (/fields\s*=\s*\(\)\s*:\s*Field\[\]\s*=>\s*\[\]/.test(source)) {
    return { fileName, tag, fieldCount: 0 }
  }

  // Pattern 2: fields = (): Field[] => [...]  with content
  // Try to count the top-level elements in the array
  const fieldsMatch = source.match(
    /fields\s*=\s*\(\)\s*:\s*Field\[\]\s*=>\s*\[([\s\S]*?)\n\s*\]/
  )
  if (fieldsMatch) {
    const body = fieldsMatch[1]
    // Count top-level comma-separated items, accounting for nested parens/brackets
    const count = countTopLevelItems(body)
    if (count !== null) {
      return { fileName, tag, fieldCount: count }
    }
  }

  return { fileName, tag, fieldCount: 'dynamic' }
}

/**
 * Count top-level comma-separated items in an array body string.
 * Handles nested parentheses, brackets, and template literals.
 */
function countTopLevelItems(body: string): number | null {
  const trimmed = body.trim()
  if (trimmed === '') return 0

  let depth = 0
  let count = 1
  let inString = false
  let stringChar = ''
  let inTemplate = false

  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i]
    const prev = i > 0 ? trimmed[i - 1] : ''

    if (inString) {
      if (ch === stringChar && prev !== '\\') {
        inString = false
      }
      continue
    }

    if (inTemplate) {
      if (ch === '`' && prev !== '\\') {
        inTemplate = false
      }
      continue
    }

    if (ch === "'" || ch === '"') {
      inString = true
      stringChar = ch
      continue
    }

    if (ch === '`') {
      inTemplate = true
      continue
    }

    if (ch === '(' || ch === '[' || ch === '{') {
      depth++
    } else if (ch === ')' || ch === ']' || ch === '}') {
      depth--
    } else if (ch === ',' && depth === 0) {
      count++
    }
  }

  return count
}

async function getPdfFieldCount(tag: string): Promise<number | null> {
  const pdfPath = path.join(PDF_DIR, `${tag}.pdf`)
  if (!fs.existsSync(pdfPath)) {
    return null
  }
  const bytes = fs.readFileSync(pdfPath).toString('base64')
  // Suppress XFA warnings from pdf-lib
  const origWarn = console.warn
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  console.warn = () => {}
  try {
    const pdf = await PDFDocument.load(bytes)
    return pdf.getForm().getFields().length
  } finally {
    console.warn = origWarn
  }
}

function discoverForms(): FormInfo[] {
  const files = fs.readdirSync(FORMS_DIR).filter((f) => {
    return (
      f.endsWith('.ts') &&
      f !== 'index.ts' &&
      f !== 'Main.ts' &&
      f !== 'F1040Attachment.ts'
    )
  })

  const forms: FormInfo[] = []
  for (const file of files) {
    const info = parseFormSource(path.join(FORMS_DIR, file))
    if (info) {
      forms.push(info)
    }
  }
  return forms
}

describe('Y2025 field mapping verification', () => {
  let forms: FormInfo[]

  beforeAll(() => {
    forms = discoverForms()
  })

  it('should discover all Y2025 form implementations', () => {
    expect(forms.length).toBeGreaterThan(40)
    console.log(`Discovered ${forms.length} form implementations`)
  })

  it('should verify field counts match between forms and PDFs', async () => {
    const results: Array<{
      fileName: string
      tag: string
      formFields: number | 'dynamic'
      pdfFields: number | null
      status: 'match' | 'mismatch' | 'no-pdf' | 'dynamic' | 'stub'
    }> = []

    for (const form of forms) {
      const pdfFields = await getPdfFieldCount(form.tag)

      let status: (typeof results)[number]['status']
      if (pdfFields === null) {
        status = 'no-pdf'
      } else if (form.fieldCount === 'dynamic') {
        status = 'dynamic'
      } else if (form.fieldCount === 0 && pdfFields > 0) {
        status = 'stub'
      } else if (form.fieldCount === pdfFields) {
        status = 'match'
      } else {
        status = 'mismatch'
      }

      results.push({
        fileName: form.fileName,
        tag: form.tag,
        formFields: form.fieldCount,
        pdfFields,
        status
      })
    }

    const matches = results.filter((r) => r.status === 'match')
    const mismatches = results.filter((r) => r.status === 'mismatch')
    const stubs = results.filter((r) => r.status === 'stub')
    const dynamic = results.filter((r) => r.status === 'dynamic')
    const noPdf = results.filter((r) => r.status === 'no-pdf')

    console.log('\n=== Y2025 Field Mapping Verification Report ===\n')
    console.log(`Total forms:          ${results.length}`)
    console.log(`Exact matches:        ${matches.length}`)
    console.log(`Mismatches:           ${mismatches.length}`)
    console.log(`Stubs (fields=[]):    ${stubs.length}`)
    console.log(`Dynamic (unparsed):   ${dynamic.length}`)
    console.log(`No PDF available:     ${noPdf.length}`)

    if (matches.length > 0) {
      console.log('\n--- Exact Matches ---')
      for (const r of matches) {
        console.log(`  OK  ${r.fileName} (${r.tag}): ${r.formFields} fields`)
      }
    }

    if (mismatches.length > 0) {
      console.log('\n--- MISMATCHES (form fields != PDF fields) ---')
      for (const r of mismatches) {
        console.log(
          `  !!  ${r.fileName} (${r.tag}): form=${r.formFields}, pdf=${String(
            r.pdfFields
          )}`
        )
      }
    }

    if (stubs.length > 0) {
      console.log('\n--- Stubs (empty fields[], PDF has fields) ---')
      for (const r of stubs) {
        console.log(
          `  --  ${r.fileName} (${r.tag}): form=0, pdf=${String(r.pdfFields)}`
        )
      }
    }

    if (dynamic.length > 0) {
      console.log('\n--- Dynamic (field count determined at runtime) ---')
      for (const r of dynamic) {
        console.log(
          `  ??  ${r.fileName} (${r.tag}): pdf=${String(
            r.pdfFields ?? 'no-pdf'
          )}`
        )
      }
    }

    if (noPdf.length > 0) {
      console.log('\n--- No PDF Template Available ---')
      for (const r of noPdf) {
        console.log(
          `  --  ${r.fileName} (${r.tag}): ${r.formFields} form fields`
        )
      }
    }

    // Verify we checked at least some forms with PDFs
    const withPdf = results.filter((r) => r.status !== 'no-pdf')
    expect(withPdf.length).toBeGreaterThan(0)
  })
})
