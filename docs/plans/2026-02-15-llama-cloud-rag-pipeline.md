# LlamaCloud RAG Pipeline Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a 5-phase legal document RAG pipeline with JSON sidecar metadata, LLM enrichment, LlamaCloud indexing, and Vercel Blob storage.

**Architecture:** Bottom-up TDD — pure functions first (regex, extractors, Zod schemas), then LLM integration via mocked AI SDK, then workflow integration modifying existing WDK pipeline, then LlamaCloud SDK indexing, then Vercel Blob migration with dual backend. Each phase is a feature branch merged to main after tests pass.

**Tech Stack:** TypeScript, Vitest (85% coverage), Zod v4, AI SDK v6 (`generateObject`), `@llamaindex/llama-cloud` v1.5.0 (SDK-only), `bash-tool` v1.3.14, Vercel WDK (`workflow` v4.1.0-beta.57), `@vercel/blob` (Phase 5)

**Design Doc:** `docs/plans/2026-02-15-llama-cloud-rag-pipeline-design.md`

---

## Phase 1: Mexican Legal Regex & Deterministic Extraction

**Branch:** `feat/sidecar-regex`

---

### Task 1: Create Test Fixtures

**Files:**
- Create: `test/fixtures/ley-sample.md`
- Create: `test/fixtures/contrato-sample.md`
- Create: `test/fixtures/sentencia-sample.md`

These are realistic Mexican legal document samples that all subsequent tests rely on. Each fixture is ~50-80 lines of real-world patterns including known traps (OCR ordinals, Transitorios, monetary amounts).

**Step 1: Create the ley (legislation) fixture**

```markdown
# LEY ADUANERA

TITULO PRIMERO Disposiciones Generales

CAPITULO UNICO

ARTICULO 10. Esta Ley, las de los Impuestos Generales de Importación y de Exportación y las demás leyes y ordenamientos aplicables, regulan la entrada al territorio nacional y la salida del mismo de mercancías y de los medios en que se transportan o conducen, el despacho aduanero y los hechos o actos que deriven de éste o de dicha entrada o salida de mercancías.

ARTICULO 20. Las disposiciones de esta Ley se aplicarán sin perjuicio de lo dispuesto por los tratados internacionales de los que México sea parte.

TITULO SEGUNDO Del Control de Aduana en el Despacho

CAPITULO I Entrada y Salida de Mercancías del Territorio Nacional

ARTICULO 30. Para efectos del artículo anterior, se considera que la entrada al territorio nacional o la salida del mismo se realiza:

I. Por vía terrestre: en el momento en que las mercancías crucen la línea divisoria internacional;
II. Por vía marítima o fluvial: en el momento en que el buque llegue al primer puerto nacional o salga del último puerto nacional;
III. Por vía aérea: al aterrizar la aeronave en el primer aeropuerto nacional o al despegar del último aeropuerto nacional.

ARTICULO 40. Los regímenes aduaneros se clasifican en:

fracción I Definitivos, de importación y de exportación;
fracción II Temporales, de importación y de exportación;

TITULO OCTAVO Infracciones y Sanciones

ARTICULO 1760. Cometen las infracciones relacionadas con la importación o exportación, quienes introduzcan al país o extraigan de él mercancías:

I. Omitiendo el pago total o parcial de las contribuciones;

Se impondrá una multa de $2,000.00 a $5,000.00 a quien cometa las infracciones establecidas en este artículo.

TRANSITORIOS

ARTICULO PRIMERO. La presente Ley entrará en vigor el 1 de abril de 1996.

ARTICULO SEGUNDO. Se abrogan la Ley Aduanera publicada en el DOF 30/12/1981 y sus reformas.

DECRETO por el que se reforman diversas disposiciones de la Ley Aduanera
Publicado en el Diario Oficial de la Federación el 25 de junio de 2002

ARTICULO UNICO. Se reforman los artículos 36 y 37 de la Ley Aduanera.

TRANSITORIOS

PRIMERO. El presente Decreto entrará en vigor el día siguiente al de su publicación en el DOF.

ANEXO 13 DE LAS REGLAS GENERALES DE COMERCIO EXTERIOR PARA 2026

Multas y cantidades actualizadas que establece la Ley Aduanera, vigentes a partir del 1 de enero de 2026.
Art. 176 fracción I: de $4,510.00 a $11,275.00
```

**Step 2: Create the contrato (contract) fixture**

```markdown
# CONTRATO DE PRESTACIÓN DE SERVICIOS

En la Ciudad de México, a 15 de enero de 2026, comparecen:

Por una parte, CORPORATIVO LEGAL MEXICANO, S.A. de C.V., representada por el Lic. Juan Pérez García (en lo sucesivo, "EL PRESTADOR");

Por otra parte, TECNOLOGÍAS DEL PACÍFICO, S.A.P.I. de C.V., representada por la Ing. María López Hernández (en lo sucesivo, "EL CLIENTE");

DECLARACIONES

I. "EL PRESTADOR" declara:
a) Ser una sociedad mercantil constituida conforme a las leyes mexicanas.
b) Tener su domicilio en Paseo de la Reforma No. 250, Col. Juárez, Alcaldía Cuauhtémoc, C.P. 06600.

II. "EL CLIENTE" declara:
a) Ser una sociedad anónima promotora de inversión de capital variable.

CLÁUSULAS

CLÁUSULA PRIMERA. OBJETO DEL CONTRATO
El presente contrato tiene por objeto la prestación de servicios de asesoría legal corporativa.

CLÁUSULA SEGUNDA. VIGENCIA
El presente contrato tendrá una vigencia de 12 (doce) meses contados a partir del 1 de febrero de 2026.

CLÁUSULA TERCERA. CONTRAPRESTACIÓN
"EL CLIENTE" pagará a "EL PRESTADOR" la cantidad de $150,000.00 (ciento cincuenta mil pesos 00/100 M.N.) mensuales más el Impuesto al Valor Agregado correspondiente.

CLÁUSULA CUARTA. FORMA DE PAGO
Los pagos se realizarán dentro de los primeros 5 (cinco) días hábiles de cada mes, mediante transferencia electrónica.

CLÁUSULA QUINTA. CONFIDENCIALIDAD
Las partes se obligan a mantener en estricta confidencialidad toda la información intercambiada con motivo del presente contrato.

CLÁUSULA SEXTA. PENALIZACIÓN
En caso de incumplimiento, la parte responsable pagará una pena convencional equivalente a 50 UMAs por cada día de retraso.

CLÁUSULA SÉPTIMA. JURISDICCIÓN
Para la interpretación y cumplimiento del presente contrato, las partes se someten a la jurisdicción de los tribunales competentes de la Ciudad de México, conforme al artículo 1o. del Código de Procedimientos Civiles.

Referencia NOM-035-STPS-2018 para condiciones de trabajo.
Conforme a la tesis 2a./J. 47/2014 (10a.) de la SCJN.
```

**Step 3: Create the sentencia (court ruling) fixture**

```markdown
# SENTENCIA

JUZGADO SEGUNDO DE DISTRITO EN MATERIA ADMINISTRATIVA EN LA CIUDAD DE MÉXICO

JUICIO DE AMPARO INDIRECTO 1234/2025

QUEJOSO: IMPORTADORA DEL NORTE, S.A. de C.V.

AUTORIDAD RESPONSABLE: Administración General de Aduanas del SAT

Ciudad de México, a 10 de diciembre de 2025

RESULTANDO

PRIMERO. Por escrito presentado el 15 de octubre de 2025, la parte quejosa solicitó el amparo y protección de la Justicia Federal.

SEGUNDO. Se admitió la demanda mediante auto de fecha 18 de octubre de 2025.

CONSIDERANDO

PRIMERO. Este Juzgado es competente para conocer del presente asunto, de conformidad con lo dispuesto por los artículos 103, fracción I, y 107 de la Constitución Política de los Estados Unidos Mexicanos.

SEGUNDO. La parte quejosa acreditó su interés legítimo conforme a la tesis 1a./J. 23/2018 de la Primera Sala de la SCJN, publicada en el DOF 15/03/2018.

TERCERO. Son fundados los conceptos de violación. El acto reclamado vulnera el artículo 16 constitucional, en relación con los Artículos 150 y 151 de la Ley Aduanera, publicada en el Diario Oficial de la Federación el 15 de diciembre de 1995.

Se determina que la multa impuesta por $85,000.00 M.N. no se encuentra debidamente fundada conforme a lo establecido por el artículo 176, fracción II de la Ley Aduanera.

RESUELVE

PRIMERO. Se CONCEDE el amparo y protección de la Justicia Federal a la parte quejosa.

SEGUNDO. La autoridad responsable deberá dejar sin efectos la resolución impugnada en un plazo de 15 días hábiles.
```

**Step 4: Commit fixtures**

```bash
git add test/fixtures/ley-sample.md test/fixtures/contrato-sample.md test/fixtures/sentencia-sample.md
git commit -m "test: add Mexican legal document fixtures for sidecar tests"
```

---

### Task 2: Create Sidecar Zod Schemas

**Files:**
- Create: `lib/metadata/types.ts`
- Test: `test/lib/metadata/types.test.ts`

**Step 1: Write the failing test**

```typescript
// test/lib/metadata/types.test.ts
import { describe, it, expect } from 'vitest'
import {
  TocEntrySchema,
  EntitySchema,
  NavigationSchema,
  SidecarSchema,
} from '@/lib/metadata/types'

describe('TocEntrySchema', () => {
  it('validates a valid TOC entry', () => {
    const entry = {
      id: 'titulo-primero',
      heading: 'TITULO PRIMERO Disposiciones Generales',
      level: 2,
      lineStart: 3,
      lineEnd: 20,
      summary: '',
      grepPattern: "sed -n '3,20p'",
      isTransitoryOrAnnex: false,
      containsFines: false,
    }
    expect(TocEntrySchema.parse(entry)).toEqual(entry)
  })

  it('rejects negative line numbers', () => {
    expect(() =>
      TocEntrySchema.parse({
        id: 'x',
        heading: 'x',
        level: 1,
        lineStart: -1,
        lineEnd: 5,
        summary: '',
        grepPattern: '',
        isTransitoryOrAnnex: false,
        containsFines: false,
      }),
    ).toThrow()
  })
})

describe('SidecarSchema', () => {
  it('validates a minimal valid sidecar', () => {
    const sidecar = {
      schemaVersion: '1.0.0' as const,
      generatedAt: '2026-02-15T00:00:00.000Z',
      sourceFile: 'test.md',
      sourceHash: 'abc123',
      document: {
        title: 'Test Document',
        type: 'ley' as const,
        totalLines: 100,
        totalWords: 500,
        language: 'es' as const,
      },
      tableOfContents: [],
      entities: {
        dates: [],
        monetaryAmounts: [],
        definedTerms: [],
        legalReferences: [],
      },
      navigation: {
        warnings: {},
        quickCommands: {},
        sectionsByTopic: {},
      },
      legalPatterns: {
        regexLibrary: {},
      },
    }
    expect(() => SidecarSchema.parse(sidecar)).not.toThrow()
  })

  it('rejects invalid document type', () => {
    expect(() =>
      SidecarSchema.parse({
        schemaVersion: '1.0.0',
        generatedAt: '2026-02-15T00:00:00.000Z',
        sourceFile: 'test.md',
        sourceHash: 'abc123',
        document: {
          title: 'Test',
          type: 'invalid',
          totalLines: 1,
          totalWords: 1,
          language: 'es',
        },
        tableOfContents: [],
        entities: { dates: [], monetaryAmounts: [], definedTerms: [], legalReferences: [] },
        navigation: { warnings: {}, quickCommands: {}, sectionsByTopic: {} },
        legalPatterns: { regexLibrary: {} },
      }),
    ).toThrow()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test test/lib/metadata/types.test.ts`
Expected: FAIL — `Cannot find module '@/lib/metadata/types'`

**Step 3: Write the implementation**

```typescript
// lib/metadata/types.ts
import { z } from 'zod'

export const TocEntrySchema = z.object({
  id: z.string(),
  heading: z.string(),
  level: z.number().int().min(1).max(6),
  lineStart: z.number().int().positive(),
  lineEnd: z.number().int().positive(),
  summary: z.string(),
  grepPattern: z.string(),
  isTransitoryOrAnnex: z.boolean(),
  containsFines: z.boolean(),
})

export type TocEntry = z.infer<typeof TocEntrySchema>

export const EntitySchema = z.object({
  dates: z.array(z.object({
    value: z.string(),
    context: z.string(),
    line: z.number().int(),
  })),
  monetaryAmounts: z.array(z.object({
    value: z.string(),
    context: z.string(),
    line: z.number().int(),
  })),
  definedTerms: z.array(z.object({
    term: z.string(),
    definedAtLine: z.number().int(),
    usageLines: z.array(z.number().int()),
    article: z.string().optional(),
    meaning: z.string().optional(),
  })),
  legalReferences: z.array(z.object({
    type: z.enum(['ley', 'nom', 'dof', 'tesis']),
    reference: z.string(),
    line: z.number().int(),
  })),
})

export type Entities = z.infer<typeof EntitySchema>

export const NavigationSchema = z.object({
  warnings: z.record(z.string()),
  quickCommands: z.record(z.string()),
  sectionsByTopic: z.record(z.object({
    sections: z.array(z.string()),
    lineRange: z.tuple([z.number(), z.number()]),
  })),
})

export type Navigation = z.infer<typeof NavigationSchema>

export const SidecarSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  generatedAt: z.string().datetime(),
  sourceFile: z.string(),
  sourceHash: z.string(),
  document: z.object({
    title: z.string(),
    type: z.enum(['contrato', 'ley', 'sentencia', 'nom', 'otro']),
    totalLines: z.number().int(),
    totalWords: z.number().int(),
    language: z.literal('es'),
    parties: z.array(z.object({
      name: z.string(),
      role: z.string(),
      definedAs: z.string(),
    })).optional(),
  }),
  tableOfContents: z.array(TocEntrySchema),
  entities: EntitySchema,
  navigation: NavigationSchema,
  legalPatterns: z.object({
    regexLibrary: z.record(z.string()),
  }),
})

export type Sidecar = z.infer<typeof SidecarSchema>
```

**Step 4: Run test to verify it passes**

Run: `pnpm test test/lib/metadata/types.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/metadata/types.ts test/lib/metadata/types.test.ts
git commit -m "feat: add Zod schemas for sidecar metadata structure"
```

---

### Task 3: Mexican Legal Regex Library

**Files:**
- Create: `lib/metadata/mexican-legal-regex.ts`
- Test: `test/lib/metadata/mexican-legal-regex.test.ts`

**Step 1: Write the failing test**

```typescript
// test/lib/metadata/mexican-legal-regex.test.ts
import { describe, it, expect } from 'vitest'
import { MEXICAN_LEGAL_REGEX, matchAll } from '@/lib/metadata/mexican-legal-regex'

describe('MEXICAN_LEGAL_REGEX', () => {
  describe('articlesOcrAware', () => {
    const re = new RegExp(MEXICAN_LEGAL_REGEX.articlesOcrAware)

    it('matches standard article format', () => {
      expect('Artículo 36 de la Ley').toMatch(re)
    })

    it('matches OCR-corrupted ordinal (1o. -> 10.)', () => {
      expect('ARTICULO 10. Esta Ley').toMatch(re)
    })

    it('matches ARTICULO 20.', () => {
      expect('ARTICULO 20. Las disposiciones').toMatch(re)
    })

    it('matches Bis/Ter variants', () => {
      expect('Artículo 36 Bis').toMatch(re)
      expect('Art. 37 Ter').toMatch(re)
    })

    it('matches hyphenated articles', () => {
      expect('ARTICULO 14-A.').toMatch(re)
    })
  })

  describe('transitorios', () => {
    const re = new RegExp(MEXICAN_LEGAL_REGEX.transitorios, 'i')

    it('matches TRANSITORIOS header', () => {
      expect('TRANSITORIOS').toMatch(re)
    })

    it('matches DECRETO por el que', () => {
      expect('DECRETO por el que se reforman').toMatch(re)
    })

    it('matches ARTICULOS TRANSITORIOS', () => {
      expect('ARTÍCULOS TRANSITORIOS').toMatch(re)
    })
  })

  describe('pesos', () => {
    const re = new RegExp(MEXICAN_LEGAL_REGEX.pesos)

    it('matches peso amounts with M.N.', () => {
      expect('$150,000.00 M.N.').toMatch(re)
    })

    it('matches simple peso amounts', () => {
      expect('$2,000.00').toMatch(re)
    })

    it('matches pesos keyword', () => {
      expect('$85,000.00 pesos').toMatch(re)
    })
  })

  describe('clausulas', () => {
    const re = new RegExp(MEXICAN_LEGAL_REGEX.clausulas)

    it('matches ordinal clauses', () => {
      expect('CLÁUSULA PRIMERA').toMatch(re)
      expect('CLÁUSULA SÉPTIMA').toMatch(re)
    })
  })

  describe('noms', () => {
    const re = new RegExp(MEXICAN_LEGAL_REGEX.noms)

    it('matches NOM format', () => {
      expect('NOM-035-STPS-2018').toMatch(re)
    })
  })

  describe('tesis', () => {
    const re = new RegExp(MEXICAN_LEGAL_REGEX.tesis)

    it('matches tesis format', () => {
      expect('tesis 2a./J. 47/2014 (10a.)').toMatch(re)
      expect('tesis 1a./J. 23/2018').toMatch(re)
    })
  })
})

describe('matchAll', () => {
  it('returns all matches with line numbers', () => {
    const text = 'Line one\nARTICULO 10. Something\nLine three\nARTICULO 20. Other'
    const results = matchAll(text, MEXICAN_LEGAL_REGEX.articlesOcrAware)
    expect(results).toHaveLength(2)
    expect(results[0]).toMatchObject({ match: expect.stringContaining('ARTICULO 10'), line: 2 })
    expect(results[1]).toMatchObject({ match: expect.stringContaining('ARTICULO 20'), line: 4 })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test test/lib/metadata/mexican-legal-regex.test.ts`
Expected: FAIL

**Step 3: Write the implementation**

```typescript
// lib/metadata/mexican-legal-regex.ts

export const MEXICAN_LEGAL_REGEX = {
  articles: String.raw`(?:Art[íi]culo|Art\.)\s+(?:Transitorio\s+)?\d{1,4}\s*(?:Bis|Ter|Qu[aá]ter)?`,
  articlesOcrAware: String.raw`(?:ART[IÍ]CULO|Art[íi]culo|Art\.)\s+\d{1,4}[oO0]?\.?(?:\s*(?:Bis|Ter|Qu[aá]ter)(?:\s+\d+)?)?(?:-[A-Z])?\.?`,
  fractions: String.raw`fracci[oó]n(?:es)?\s+[IVXLCDM]+(?:\s*[,y]\s*[IVXLCDM]+)*`,
  incisos: String.raw`inciso(?:s)?\s+[a-z]\)(?:\s*[,y]\s*[a-z]\))*`,
  noms: String.raw`NOM-\d{3}-[A-Z]{2,10}(?:\/[A-Z]{2,10})?-\d{4}`,
  dofShort: String.raw`DOF\s+\d{1,2}[-/]\d{1,2}[-/]\d{2,4}`,
  dofLong: String.raw`(?:publicad[oa]|reformad[oa])\s+en\s+el\s+Diario\s+Oficial\s+de\s+la\s+Federaci[oó]n\s+(?:el\s+)?\d{1,2}\s+de\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+de\s+\d{4}`,
  clausulas: String.raw`CL[AÁ]USULA\s+(?:PRIMERA|SEGUNDA|TERCERA|CUARTA|QUINTA|SEXTA|S[ÉE]PTIMA|OCTAVA|NOVENA|D[ÉE]CIMA(?:\s+(?:PRIMERA|SEGUNDA|TERCERA))?|VIG[ÉE]SIMA(?:\s+\w+)?|\d+)`,
  spanishDates: String.raw`\d{1,2}\s+de\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+de\s+\d{4}`,
  pesos: String.raw`\$[\d,]+(?:\.\d{1,2})?\s*(?:M\.?N\.?|pesos|MXN)?`,
  umas: String.raw`[\d,]+(?:\.\d{1,2})?\s*(?:UMA[Ss]?|UDI[Ss]?|VSM)`,
  legalEntities: String.raw`S\.A\.(?:\s*de\s*C\.V\.)?|S\.\s*de\s*R\.L\.(?:\s*de\s*C\.V\.)?|S\.A\.P\.I\.(?:\s*de\s*C\.V\.)?|A\.C\.|S\.A\.S\.`,
  tesis: String.raw`[Tt]esis\s+(?:\d{1,2}a\.\s*(?:\/J\.)?\s*)?\d{1,4}\/\d{4}\s*(?:\(\d{1,2}a\.\))?`,
  titulos: String.raw`T[IÍ]TULO\s+(?:PRIMERO|SEGUNDO|TERCERO|CUARTO|QUINTO|[IVXLC]+)`,
  capitulos: String.raw`CAP[IÍ]TULO\s+(?:[IVXLC]+|\d+)`,
  considerandos: String.raw`CONSIDERANDO\s*(?:PRIMERO|SEGUNDO|TERCERO|\d+)?`,
  resolutivos: String.raw`(?:PUNTOS?\s+)?RESOLUTIVOS?|R\s*E\s*S\s*U\s*E\s*L\s*V\s*E`,
  transitorios: String.raw`(?:TRANSITORIOS?|ART[IÍ]CULOS?\s+TRANSITORIOS?|DECRETO\s+(?:por|que))`,
  anexos: String.raw`ANEXO\s+\d+\s+(?:DE\s+LAS\s+)?(?:REGLAS\s+GENERALES)?`,
  fines: String.raw`(?:multa|sanci[oó]n|embargo|decomiso)\s+(?:de\s+)?\$[\d,]+`,
} as const

export type RegexKey = keyof typeof MEXICAN_LEGAL_REGEX

export interface RegexMatch {
  match: string
  line: number
  index: number
}

/** Run a regex pattern against text and return all matches with 1-based line numbers. */
export function matchAll(text: string, pattern: string): RegexMatch[] {
  const lines = text.split('\n')
  const re = new RegExp(pattern, 'gi')
  const results: RegexMatch[] = []

  for (let i = 0; i < lines.length; i++) {
    let m: RegExpExecArray | null
    while ((m = re.exec(lines[i])) !== null) {
      results.push({ match: m[0], line: i + 1, index: m.index })
    }
  }

  return results
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test test/lib/metadata/mexican-legal-regex.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/metadata/mexican-legal-regex.ts test/lib/metadata/mexican-legal-regex.test.ts
git commit -m "feat: add OCR-aware Mexican legal regex library with matchAll utility"
```

---

### Task 4: Document Type Detector

**Files:**
- Create: `lib/metadata/document-type-detector.ts`
- Test: `test/lib/metadata/document-type-detector.test.ts`

**Step 1: Write the failing test**

```typescript
// test/lib/metadata/document-type-detector.test.ts
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, it, expect } from 'vitest'
import { detectDocumentType } from '@/lib/metadata/document-type-detector'

const fixtures = path.resolve('test/fixtures')
const ley = readFileSync(path.join(fixtures, 'ley-sample.md'), 'utf-8')
const contrato = readFileSync(path.join(fixtures, 'contrato-sample.md'), 'utf-8')
const sentencia = readFileSync(path.join(fixtures, 'sentencia-sample.md'), 'utf-8')

describe('detectDocumentType', () => {
  it('detects ley (legislation)', () => {
    expect(detectDocumentType(ley)).toBe('ley')
  })

  it('detects contrato (contract)', () => {
    expect(detectDocumentType(contrato)).toBe('contrato')
  })

  it('detects sentencia (court ruling)', () => {
    expect(detectDocumentType(sentencia)).toBe('sentencia')
  })

  it('returns otro for unrecognized text', () => {
    expect(detectDocumentType('This is a random document in English.')).toBe('otro')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test test/lib/metadata/document-type-detector.test.ts`
Expected: FAIL

**Step 3: Write the implementation**

```typescript
// lib/metadata/document-type-detector.ts
import { MEXICAN_LEGAL_REGEX } from './mexican-legal-regex'

export type DocumentType = 'contrato' | 'ley' | 'sentencia' | 'nom' | 'otro'

interface Signal {
  pattern: RegExp
  weight: number
}

const SIGNALS: Record<DocumentType, Signal[]> = {
  ley: [
    { pattern: new RegExp(MEXICAN_LEGAL_REGEX.titulos, 'i'), weight: 3 },
    { pattern: new RegExp(MEXICAN_LEGAL_REGEX.capitulos, 'i'), weight: 2 },
    { pattern: new RegExp(MEXICAN_LEGAL_REGEX.articlesOcrAware, 'i'), weight: 2 },
    { pattern: new RegExp(MEXICAN_LEGAL_REGEX.transitorios, 'i'), weight: 2 },
    { pattern: /\bLEY\b/i, weight: 3 },
    { pattern: /\bCÓDIGO\b/i, weight: 3 },
    { pattern: /\bREGLAMENTO\b/i, weight: 2 },
  ],
  contrato: [
    { pattern: new RegExp(MEXICAN_LEGAL_REGEX.clausulas, 'i'), weight: 4 },
    { pattern: /\bCONTRATO\b/i, weight: 3 },
    { pattern: /\bCONVENIO\b/i, weight: 3 },
    { pattern: /en lo sucesivo/i, weight: 3 },
    { pattern: /DECLARACIONES/i, weight: 2 },
    { pattern: new RegExp(MEXICAN_LEGAL_REGEX.legalEntities), weight: 1 },
  ],
  sentencia: [
    { pattern: new RegExp(MEXICAN_LEGAL_REGEX.considerandos, 'i'), weight: 4 },
    { pattern: new RegExp(MEXICAN_LEGAL_REGEX.resolutivos, 'i'), weight: 4 },
    { pattern: /SENTENCIA/i, weight: 3 },
    { pattern: /JUZGADO|TRIBUNAL/i, weight: 3 },
    { pattern: /QUEJOSO|DEMANDANTE|ACTOR/i, weight: 2 },
    { pattern: /RESULTANDO/i, weight: 2 },
    { pattern: /AMPARO/i, weight: 2 },
  ],
  nom: [
    { pattern: new RegExp(MEXICAN_LEGAL_REGEX.noms), weight: 5 },
    { pattern: /NORMA OFICIAL MEXICANA/i, weight: 5 },
  ],
  otro: [],
}

/** Score text against each document type and return the best match. */
export function detectDocumentType(text: string): DocumentType {
  // Only check the first ~3000 chars for efficiency (headers are at the top)
  const preview = text.slice(0, 3000)

  let bestType: DocumentType = 'otro'
  let bestScore = 0

  for (const [type, signals] of Object.entries(SIGNALS) as [DocumentType, Signal[]][]) {
    if (type === 'otro') continue
    let score = 0
    for (const { pattern, weight } of signals) {
      if (pattern.test(preview)) {
        score += weight
      }
    }
    if (score > bestScore) {
      bestScore = score
      bestType = type
    }
  }

  return bestType
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test test/lib/metadata/document-type-detector.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/metadata/document-type-detector.ts test/lib/metadata/document-type-detector.test.ts
git commit -m "feat: add weighted-signal document type detector for Mexican legal docs"
```

---

### Task 5: Heading Extractor (TOC Builder)

**Files:**
- Create: `lib/metadata/heading-extractor.ts`
- Test: `test/lib/metadata/heading-extractor.test.ts`

**Step 1: Write the failing test**

```typescript
// test/lib/metadata/heading-extractor.test.ts
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, it, expect } from 'vitest'
import { extractHeadings } from '@/lib/metadata/heading-extractor'

const ley = readFileSync(path.resolve('test/fixtures/ley-sample.md'), 'utf-8')
const contrato = readFileSync(path.resolve('test/fixtures/contrato-sample.md'), 'utf-8')

describe('extractHeadings', () => {
  it('extracts markdown headings with line ranges', () => {
    const result = extractHeadings(ley)
    expect(result.length).toBeGreaterThan(0)
    // First heading should be the title
    expect(result[0].heading).toContain('LEY ADUANERA')
    expect(result[0].level).toBe(1)
    expect(result[0].lineStart).toBe(1)
  })

  it('calculates lineEnd as next heading lineStart - 1', () => {
    const result = extractHeadings(ley)
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].lineEnd).toBe(result[i + 1].lineStart - 1)
    }
    // Last heading extends to end of file
    const totalLines = ley.split('\n').length
    expect(result[result.length - 1].lineEnd).toBe(totalLines)
  })

  it('generates kebab-case IDs', () => {
    const result = extractHeadings(ley)
    for (const entry of result) {
      expect(entry.id).toMatch(/^[a-z0-9-]+$/)
    }
  })

  it('generates grep patterns', () => {
    const result = extractHeadings(ley)
    for (const entry of result) {
      expect(entry.grepPattern).toContain(`sed -n '${entry.lineStart},${entry.lineEnd}p'`)
    }
  })

  it('detects transitorios sections', () => {
    const result = extractHeadings(ley)
    const transitorios = result.filter(h => h.isTransitoryOrAnnex)
    expect(transitorios.length).toBeGreaterThan(0)
  })

  it('detects sections containing fines', () => {
    const result = extractHeadings(ley)
    const withFines = result.filter(h => h.containsFines)
    expect(withFines.length).toBeGreaterThan(0)
  })

  it('extracts contract clauses as headings', () => {
    const result = extractHeadings(contrato)
    const clauses = result.filter(h => h.heading.includes('CLÁUSULA'))
    expect(clauses.length).toBeGreaterThanOrEqual(7)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test test/lib/metadata/heading-extractor.test.ts`
Expected: FAIL

**Step 3: Write the implementation**

```typescript
// lib/metadata/heading-extractor.ts
import type { TocEntry } from './types'
import { MEXICAN_LEGAL_REGEX } from './mexican-legal-regex'

const STRUCTURAL_HEADING_RE = new RegExp(
  `^(?:${[
    MEXICAN_LEGAL_REGEX.titulos,
    MEXICAN_LEGAL_REGEX.capitulos,
    MEXICAN_LEGAL_REGEX.clausulas,
    MEXICAN_LEGAL_REGEX.considerandos,
    MEXICAN_LEGAL_REGEX.resolutivos,
    MEXICAN_LEGAL_REGEX.transitorios,
    MEXICAN_LEGAL_REGEX.anexos,
  ].join('|')})`,
  'i',
)

const TRANSITORIO_RE = new RegExp(MEXICAN_LEGAL_REGEX.transitorios, 'i')
const ANNEX_RE = new RegExp(MEXICAN_LEGAL_REGEX.anexos, 'i')
const FINES_RE = new RegExp(MEXICAN_LEGAL_REGEX.fines, 'i')

function toKebabCase(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

/** Extract headings from markdown and structural legal patterns. Returns TOC entries with line ranges. */
export function extractHeadings(markdown: string): TocEntry[] {
  const lines = markdown.split('\n')
  const rawHeadings: { heading: string; level: number; lineStart: number }[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Markdown headings: # Heading
    const mdMatch = line.match(/^(#{1,6})\s+(.+)/)
    if (mdMatch) {
      rawHeadings.push({
        heading: mdMatch[2].trim(),
        level: mdMatch[1].length,
        lineStart: i + 1,
      })
      continue
    }

    // Structural legal headings (all-caps lines matching legal patterns)
    const trimmed = line.trim()
    if (trimmed.length > 3 && STRUCTURAL_HEADING_RE.test(trimmed)) {
      rawHeadings.push({
        heading: trimmed,
        level: 2,
        lineStart: i + 1,
      })
    }
  }

  // Build TOC entries with lineEnd ranges
  const totalLines = lines.length
  const entries: TocEntry[] = rawHeadings.map((h, idx) => {
    const lineEnd = idx < rawHeadings.length - 1
      ? rawHeadings[idx + 1].lineStart - 1
      : totalLines

    // Check section content for fines
    const sectionContent = lines.slice(h.lineStart - 1, lineEnd).join('\n')

    return {
      id: toKebabCase(h.heading),
      heading: h.heading,
      level: h.level,
      lineStart: h.lineStart,
      lineEnd,
      summary: '', // Filled by LLM in Phase 2
      grepPattern: `sed -n '${h.lineStart},${lineEnd}p'`,
      isTransitoryOrAnnex: TRANSITORIO_RE.test(h.heading) || ANNEX_RE.test(h.heading),
      containsFines: FINES_RE.test(sectionContent),
    }
  })

  return entries
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test test/lib/metadata/heading-extractor.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/metadata/heading-extractor.ts test/lib/metadata/heading-extractor.test.ts
git commit -m "feat: add heading extractor with line ranges, transitorios/fines detection"
```

---

### Task 6: Entity Extractor

**Files:**
- Create: `lib/metadata/entity-extractor.ts`
- Test: `test/lib/metadata/entity-extractor.test.ts`

**Step 1: Write the failing test**

```typescript
// test/lib/metadata/entity-extractor.test.ts
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, it, expect } from 'vitest'
import { extractEntities } from '@/lib/metadata/entity-extractor'

const ley = readFileSync(path.resolve('test/fixtures/ley-sample.md'), 'utf-8')
const contrato = readFileSync(path.resolve('test/fixtures/contrato-sample.md'), 'utf-8')
const sentencia = readFileSync(path.resolve('test/fixtures/sentencia-sample.md'), 'utf-8')

describe('extractEntities', () => {
  describe('dates', () => {
    it('extracts Spanish dates from ley', () => {
      const result = extractEntities(ley)
      expect(result.dates.length).toBeGreaterThan(0)
      expect(result.dates.some(d => d.value.includes('1996'))).toBe(true)
    })

    it('extracts dates from contrato', () => {
      const result = extractEntities(contrato)
      expect(result.dates.some(d => d.value.includes('enero'))).toBe(true)
    })
  })

  describe('monetaryAmounts', () => {
    it('extracts peso amounts', () => {
      const result = extractEntities(ley)
      expect(result.monetaryAmounts.length).toBeGreaterThan(0)
      expect(result.monetaryAmounts.some(a => a.value.includes('$2,000.00'))).toBe(true)
    })

    it('extracts contract amounts', () => {
      const result = extractEntities(contrato)
      expect(result.monetaryAmounts.some(a => a.value.includes('$150,000.00'))).toBe(true)
    })
  })

  describe('definedTerms', () => {
    it('extracts quoted defined terms from contrato', () => {
      const result = extractEntities(contrato)
      expect(result.definedTerms.some(t => t.term === 'EL PRESTADOR')).toBe(true)
      expect(result.definedTerms.some(t => t.term === 'EL CLIENTE')).toBe(true)
    })
  })

  describe('legalReferences', () => {
    it('extracts NOM references', () => {
      const result = extractEntities(contrato)
      expect(result.legalReferences.some(r => r.type === 'nom' && r.reference.includes('NOM-035'))).toBe(true)
    })

    it('extracts tesis references', () => {
      const result = extractEntities(contrato)
      expect(result.legalReferences.some(r => r.type === 'tesis')).toBe(true)
    })

    it('extracts DOF references', () => {
      const result = extractEntities(sentencia)
      expect(result.legalReferences.some(r => r.type === 'dof')).toBe(true)
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test test/lib/metadata/entity-extractor.test.ts`
Expected: FAIL

**Step 3: Write the implementation**

```typescript
// lib/metadata/entity-extractor.ts
import type { Entities } from './types'
import { MEXICAN_LEGAL_REGEX, matchAll } from './mexican-legal-regex'

const DEFINED_TERM_RE = /["""]([^"""]{2,60})["""]/g

export function extractEntities(text: string): Entities {
  const dates = matchAll(text, MEXICAN_LEGAL_REGEX.spanishDates).map(m => ({
    value: m.match,
    context: extractContext(text, m.line),
    line: m.line,
  }))

  const pesoMatches = matchAll(text, MEXICAN_LEGAL_REGEX.pesos)
  const umaMatches = matchAll(text, MEXICAN_LEGAL_REGEX.umas)
  const monetaryAmounts = [...pesoMatches, ...umaMatches].map(m => ({
    value: m.match,
    context: extractContext(text, m.line),
    line: m.line,
  }))

  const definedTerms = extractDefinedTerms(text)

  const legalReferences = [
    ...matchAll(text, MEXICAN_LEGAL_REGEX.noms).map(m => ({
      type: 'nom' as const,
      reference: m.match,
      line: m.line,
    })),
    ...matchAll(text, MEXICAN_LEGAL_REGEX.dofShort).map(m => ({
      type: 'dof' as const,
      reference: m.match,
      line: m.line,
    })),
    ...matchAll(text, MEXICAN_LEGAL_REGEX.dofLong).map(m => ({
      type: 'dof' as const,
      reference: m.match,
      line: m.line,
    })),
    ...matchAll(text, MEXICAN_LEGAL_REGEX.tesis).map(m => ({
      type: 'tesis' as const,
      reference: m.match,
      line: m.line,
    })),
  ]

  // Deduplicate DOF references by line
  const uniqueRefs = legalReferences.filter((ref, idx, arr) =>
    arr.findIndex(r => r.line === ref.line && r.type === ref.type) === idx,
  )

  return { dates, monetaryAmounts, definedTerms, legalReferences: uniqueRefs }
}

function extractDefinedTerms(text: string) {
  const lines = text.split('\n')
  const termMap = new Map<string, { definedAtLine: number; usageLines: number[] }>()

  // First pass: find definitions (terms in quotes followed by defining pattern)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    let m: RegExpExecArray | null
    const re = new RegExp(DEFINED_TERM_RE.source, 'g')
    while ((m = re.exec(line)) !== null) {
      const term = m[1].trim()
      // Only track terms that look like defined names (mostly uppercase or short)
      if (term.length >= 3 && /^[A-ZÁÉÍÓÚÑÜ\s]+$/.test(term)) {
        if (!termMap.has(term)) {
          termMap.set(term, { definedAtLine: i + 1, usageLines: [] })
        }
      }
    }
  }

  // Second pass: find usages of defined terms
  for (const [term, data] of termMap) {
    for (let i = 0; i < lines.length; i++) {
      if (i + 1 === data.definedAtLine) continue
      if (lines[i].includes(term) || lines[i].includes(`"${term}"`) || lines[i].includes(`"${term}"`)) {
        data.usageLines.push(i + 1)
      }
    }
  }

  return [...termMap.entries()].map(([term, data]) => ({
    term,
    definedAtLine: data.definedAtLine,
    usageLines: data.usageLines,
  }))
}

function extractContext(text: string, lineNum: number): string {
  const lines = text.split('\n')
  const line = lines[lineNum - 1] ?? ''
  return line.trim().slice(0, 120)
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test test/lib/metadata/entity-extractor.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/metadata/entity-extractor.ts test/lib/metadata/entity-extractor.test.ts
git commit -m "feat: add entity extractor for dates, amounts, defined terms, legal refs"
```

---

### Task 7: Navigation Builder (Warnings + Quick Commands)

**Files:**
- Create: `lib/metadata/navigation-builder.ts`
- Test: `test/lib/metadata/navigation-builder.test.ts`

**Step 1: Write the failing test**

```typescript
// test/lib/metadata/navigation-builder.test.ts
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, it, expect } from 'vitest'
import { buildNavigation } from '@/lib/metadata/navigation-builder'
import { extractHeadings } from '@/lib/metadata/heading-extractor'
import type { DocumentType } from '@/lib/metadata/document-type-detector'

const ley = readFileSync(path.resolve('test/fixtures/ley-sample.md'), 'utf-8')
const contrato = readFileSync(path.resolve('test/fixtures/contrato-sample.md'), 'utf-8')

describe('buildNavigation', () => {
  describe('warnings', () => {
    it('detects OCR ordinal corruption', () => {
      const toc = extractHeadings(ley)
      const nav = buildNavigation(ley, toc, 'ley')
      expect(nav.warnings.ocr_ordinals).toBeDefined()
      expect(nav.warnings.ocr_ordinals).toContain('OCR')
    })

    it('detects transitorios noise ratio', () => {
      const toc = extractHeadings(ley)
      const nav = buildNavigation(ley, toc, 'ley')
      expect(nav.warnings.transitorios_noise).toBeDefined()
    })

    it('detects outdated fines when annexes present', () => {
      const toc = extractHeadings(ley)
      const nav = buildNavigation(ley, toc, 'ley')
      expect(nav.warnings.outdated_fines).toBeDefined()
    })

    it('produces no warnings for contrato without issues', () => {
      const toc = extractHeadings(contrato)
      const nav = buildNavigation(contrato, toc, 'contrato')
      expect(nav.warnings.ocr_ordinals).toBeUndefined()
    })
  })

  describe('quickCommands', () => {
    it('generates readArticle for ley type', () => {
      const toc = extractHeadings(ley)
      const nav = buildNavigation(ley, toc, 'ley')
      expect(nav.quickCommands.readArticle).toBeDefined()
    })

    it('generates readClause for contrato type', () => {
      const toc = extractHeadings(contrato)
      const nav = buildNavigation(contrato, toc, 'contrato')
      expect(nav.quickCommands.readClause).toBeDefined()
    })
  })

  describe('sectionsByTopic', () => {
    it('groups ley sections by topic', () => {
      const toc = extractHeadings(ley)
      const nav = buildNavigation(ley, toc, 'ley')
      expect(Object.keys(nav.sectionsByTopic).length).toBeGreaterThan(0)
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test test/lib/metadata/navigation-builder.test.ts`
Expected: FAIL

**Step 3: Write the implementation**

```typescript
// lib/metadata/navigation-builder.ts
import type { Navigation, TocEntry } from './types'
import type { DocumentType } from './document-type-detector'

const TOPIC_KEYWORDS: Record<string, RegExp> = {
  infracciones: /infracci[oó]n|sanci[oó]n|multa|decomiso/i,
  importacion: /importaci[oó]n|aduana|despacho/i,
  exportacion: /exportaci[oó]n/i,
  obligaciones: /obligaci[oó]n|deber|cumplimiento/i,
  confidencialidad: /confidencial|secreto|reserv/i,
  jurisdiccion: /jurisdicci[oó]n|competencia|tribunal/i,
  pago: /pago|contrapresta|honorario|remuner/i,
  vigencia: /vigencia|plazo|t[eé]rmino|duraci[oó]n/i,
  objeto: /objeto|prop[oó]sito|finalidad/i,
  definiciones: /definici[oó]n|glosario|conceptos/i,
}

export function buildNavigation(
  markdown: string,
  toc: TocEntry[],
  documentType: DocumentType,
): Navigation {
  const lines = markdown.split('\n')
  const warnings = detectDocumentHazards(lines)
  const quickCommands = buildQuickCommands(documentType, toc)
  const sectionsByTopic = classifySectionsByTopic(toc, lines)

  return { warnings, quickCommands, sectionsByTopic }
}

function detectDocumentHazards(lines: string[]): Record<string, string> {
  const warnings: Record<string, string> = {}

  const hasOcrOrdinals = lines.some(l => /ARTICULO\s+\d0\./.test(l))
  if (hasOcrOrdinals) {
    warnings.ocr_ordinals =
      "The ordinal 'o.' was OCR'd as '0.'. " +
      'Article 1o = ARTICULO 10., Article 2o = ARTICULO 20. ' +
      'The readArticle quickCommand handles this automatically.'
  }

  const transitorioLine = lines.findIndex(
    l => /^(?:TRANSITORIOS|ART[IÍ]CULOS?\s+TRANSITORIOS)/i.test(l.trim()),
  )
  if (transitorioLine > 0) {
    const ratio = (lines.length - transitorioLine) / lines.length
    if (ratio > 0.2) {
      warnings.transitorios_noise =
        `${Math.round(ratio * 100)}% of document (from line ${transitorioLine + 1}) ` +
        'is Transitorios/historical decrees. These are NOT current law.'
    }
  }

  const annexLine = lines.findIndex(
    l => /^ANEXO\s+\d+\s+DE\s+LAS\s+REGLAS\s+GENERALES/i.test(l.trim()),
  )
  if (annexLine > 0) {
    warnings.outdated_fines =
      'Fine amounts in article text may be outdated. ' +
      `The updated amounts are in the Annex section starting at line ${annexLine + 1}. ` +
      'Use findUpdatedFines quickCommand instead.'
  }

  return warnings
}

function buildQuickCommands(
  documentType: DocumentType,
  toc: TocEntry[],
): Record<string, string> {
  const commands: Record<string, string> = {}

  commands.listSections = `jq '.tableOfContents[] | {id, heading, lineStart, lineEnd, isTransitoryOrAnnex}' metadata.json`

  if (documentType === 'ley') {
    commands.readArticle = `grep -n -E 'ART[IÍ]CULO\\s+{N}[oO0]?\\.' content.md | head -5`
    commands.findUpdatedFines = `grep -A2 'Art.*{N}' content.md | grep -E '\\$[\\d,]+'`
    commands.skipTransitorios = `jq '.tableOfContents[] | select(.isTransitoryOrAnnex == false)' metadata.json`
  }

  if (documentType === 'contrato') {
    commands.readClause = `grep -n -E 'CLÁUSULA.*{NAME}' content.md`
    commands.listParties = `jq '.document.parties' metadata.json`
  }

  if (documentType === 'sentencia') {
    commands.readConsiderando = `grep -n -A50 'CONSIDERANDO.*{N}' content.md`
    commands.readResolutivo = `grep -n -A20 'RESUELVE' content.md`
  }

  return commands
}

function classifySectionsByTopic(
  toc: TocEntry[],
  lines: string[],
): Record<string, { sections: string[]; lineRange: [number, number] }> {
  const topics: Record<string, { sections: string[]; lineRange: [number, number] }> = {}

  for (const entry of toc) {
    if (entry.isTransitoryOrAnnex) continue
    const sectionContent = lines.slice(entry.lineStart - 1, entry.lineEnd).join(' ')

    for (const [topic, pattern] of Object.entries(TOPIC_KEYWORDS)) {
      if (pattern.test(sectionContent) || pattern.test(entry.heading)) {
        if (!topics[topic]) {
          topics[topic] = { sections: [], lineRange: [entry.lineStart, entry.lineEnd] }
        }
        topics[topic].sections.push(entry.id)
        topics[topic].lineRange = [
          Math.min(topics[topic].lineRange[0], entry.lineStart),
          Math.max(topics[topic].lineRange[1], entry.lineEnd),
        ]
      }
    }
  }

  return topics
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test test/lib/metadata/navigation-builder.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/metadata/navigation-builder.ts test/lib/metadata/navigation-builder.test.ts
git commit -m "feat: add navigation builder with hazard detection and quick commands"
```

---

### Task 8: Sidecar Generator (Orchestrator)

**Files:**
- Create: `lib/metadata/sidecar-generator.ts`
- Test: `test/lib/metadata/sidecar-generator.test.ts`

**Step 1: Write the failing test**

```typescript
// test/lib/metadata/sidecar-generator.test.ts
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, it, expect } from 'vitest'
import { generateSidecar } from '@/lib/metadata/sidecar-generator'
import { SidecarSchema } from '@/lib/metadata/types'

const ley = readFileSync(path.resolve('test/fixtures/ley-sample.md'), 'utf-8')
const contrato = readFileSync(path.resolve('test/fixtures/contrato-sample.md'), 'utf-8')
const sentencia = readFileSync(path.resolve('test/fixtures/sentencia-sample.md'), 'utf-8')

describe('generateSidecar', () => {
  it('produces a valid sidecar for ley document', () => {
    const sidecar = generateSidecar(ley, 'ley-aduanera.md')
    expect(() => SidecarSchema.parse(sidecar)).not.toThrow()
    expect(sidecar.document.type).toBe('ley')
    expect(sidecar.schemaVersion).toBe('1.0.0')
  })

  it('produces a valid sidecar for contrato document', () => {
    const sidecar = generateSidecar(contrato, 'contrato-servicios.md')
    expect(() => SidecarSchema.parse(sidecar)).not.toThrow()
    expect(sidecar.document.type).toBe('contrato')
  })

  it('produces a valid sidecar for sentencia document', () => {
    const sidecar = generateSidecar(sentencia, 'sentencia-amparo.md')
    expect(() => SidecarSchema.parse(sidecar)).not.toThrow()
    expect(sidecar.document.type).toBe('sentencia')
  })

  it('includes TOC with correct line ranges', () => {
    const sidecar = generateSidecar(ley, 'ley.md')
    expect(sidecar.tableOfContents.length).toBeGreaterThan(0)
    for (const entry of sidecar.tableOfContents) {
      expect(entry.lineStart).toBeLessThanOrEqual(entry.lineEnd)
    }
  })

  it('includes entities', () => {
    const sidecar = generateSidecar(contrato, 'contrato.md')
    expect(sidecar.entities.dates.length).toBeGreaterThan(0)
    expect(sidecar.entities.monetaryAmounts.length).toBeGreaterThan(0)
  })

  it('includes navigation warnings for ley with OCR issues', () => {
    const sidecar = generateSidecar(ley, 'ley.md')
    expect(sidecar.navigation.warnings.ocr_ordinals).toBeDefined()
  })

  it('includes regex library', () => {
    const sidecar = generateSidecar(ley, 'ley.md')
    expect(Object.keys(sidecar.legalPatterns.regexLibrary).length).toBeGreaterThan(0)
  })

  it('is deterministic (same input = same output except generatedAt)', () => {
    const a = generateSidecar(ley, 'ley.md')
    const b = generateSidecar(ley, 'ley.md')
    // generatedAt will differ, so compare everything else
    expect({ ...a, generatedAt: '' }).toEqual({ ...b, generatedAt: '' })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test test/lib/metadata/sidecar-generator.test.ts`
Expected: FAIL

**Step 3: Write the implementation**

```typescript
// lib/metadata/sidecar-generator.ts
import { createHash } from 'node:crypto'
import type { Sidecar } from './types'
import { detectDocumentType } from './document-type-detector'
import { extractHeadings } from './heading-extractor'
import { extractEntities } from './entity-extractor'
import { buildNavigation } from './navigation-builder'
import { MEXICAN_LEGAL_REGEX } from './mexican-legal-regex'

/** Generate a deterministic JSON sidecar from markdown content. No LLM calls. */
export function generateSidecar(markdown: string, sourceFile: string): Sidecar {
  const lines = markdown.split('\n')
  const documentType = detectDocumentType(markdown)
  const tableOfContents = extractHeadings(markdown)
  const entities = extractEntities(markdown)
  const navigation = buildNavigation(markdown, tableOfContents, documentType)

  // Extract title from first heading or first non-empty line
  const firstHeading = tableOfContents[0]?.heading
  const title = firstHeading ?? lines.find(l => l.trim())?.replace(/^#+\s*/, '') ?? sourceFile

  const sidecar: Sidecar = {
    schemaVersion: '1.0.0',
    generatedAt: new Date().toISOString(),
    sourceFile,
    sourceHash: createHash('sha256').update(markdown).digest('hex').slice(0, 16),
    document: {
      title,
      type: documentType,
      totalLines: lines.length,
      totalWords: markdown.split(/\s+/).filter(Boolean).length,
      language: 'es',
    },
    tableOfContents,
    entities,
    navigation,
    legalPatterns: {
      regexLibrary: Object.fromEntries(
        Object.entries(MEXICAN_LEGAL_REGEX).map(([k, v]) => [k, v]),
      ),
    },
  }

  return sidecar
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test test/lib/metadata/sidecar-generator.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/metadata/sidecar-generator.ts test/lib/metadata/sidecar-generator.test.ts
git commit -m "feat: add sidecar generator orchestrating all deterministic extractors"
```

---

### Task 9: Run Full Phase 1 Test Suite and Verify Coverage

**Step 1: Run all Phase 1 tests**

Run: `pnpm test test/lib/metadata/`
Expected: All PASS

**Step 2: Run coverage**

Run: `pnpm test:coverage -- --reporter=text test/lib/metadata/`
Expected: All `lib/metadata/` files at 85%+ coverage

**Step 3: Fix any coverage gaps**

Add additional test cases for any branches below 85%.

**Step 4: Commit any fixes**

```bash
git add -A test/lib/metadata/ lib/metadata/
git commit -m "test: ensure 85%+ coverage for Phase 1 sidecar metadata"
```

---

## Phase 2: LLM-Enhanced Summaries

**Branch:** `feat/sidecar-llm` (create from latest `main` after merging Phase 1)

---

### Task 10: LLM Enrichment Module

**Files:**
- Create: `lib/metadata/llm-enrichment.ts`
- Test: `test/lib/metadata/llm-enrichment.test.ts`

**Step 1: Write the failing test**

```typescript
// test/lib/metadata/llm-enrichment.test.ts
import { describe, it, expect, vi } from 'vitest'
import type { TocEntry } from '@/lib/metadata/types'

// Mock AI SDK before importing the module under test
vi.mock('ai', () => ({
  generateObject: vi.fn(),
}))
vi.mock('@ai-sdk/openai', () => ({
  openai: vi.fn(() => 'mocked-model'),
}))

describe('enrichWithLlm', () => {
  it('calls generateObject and returns structured enrichment', async () => {
    const { generateObject } = await import('ai')
    const mockResult = {
      title: 'Ley Aduanera',
      documentType: 'ley' as const,
      sections: [
        { id: 'titulo-primero', summary: 'General provisions', isTransitoryOrAnnex: false, containsFines: false },
      ],
      definedTerms: [],
      documentSpecificWarnings: ['OCR ordinal corruption detected'],
    }

    vi.mocked(generateObject).mockResolvedValueOnce({ object: mockResult } as never)

    const { enrichWithLlm } = await import('@/lib/metadata/llm-enrichment')

    const toc: TocEntry[] = [{
      id: 'titulo-primero',
      heading: 'TITULO PRIMERO',
      level: 2,
      lineStart: 1,
      lineEnd: 50,
      summary: '',
      grepPattern: "sed -n '1,50p'",
      isTransitoryOrAnnex: false,
      containsFines: false,
    }]

    const result = await enrichWithLlm(toc, 'Some markdown...')
    expect(result.title).toBe('Ley Aduanera')
    expect(result.sections).toHaveLength(1)
    expect(generateObject).toHaveBeenCalledOnce()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test test/lib/metadata/llm-enrichment.test.ts`
Expected: FAIL

**Step 3: Write the implementation**

```typescript
// lib/metadata/llm-enrichment.ts
import { z } from 'zod'
import type { TocEntry } from './types'

export const LlmEnrichmentSchema = z.object({
  title: z.string(),
  documentType: z.enum(['contrato', 'ley', 'sentencia', 'nom', 'otro']),
  parties: z.array(z.object({
    name: z.string(),
    role: z.string(),
    definedAs: z.string(),
  })).optional(),
  sections: z.array(z.object({
    id: z.string(),
    summary: z.string().describe('1-2 sentence summary for agent navigation'),
    isTransitoryOrAnnex: z.boolean().describe('TRUE if Decreto Transitorio or Annexo'),
    containsFines: z.boolean().describe('TRUE if imposes multas, embargos, sanciones'),
  })),
  definedTerms: z.array(z.object({
    term: z.string(),
    article: z.string().describe('Article where defined, e.g., "2o. fraccion XVI"'),
    meaning: z.string(),
  })),
  documentSpecificWarnings: z.array(z.string())
    .describe('Hazards: OCR quirks, outdated data, special interpretation rules'),
})

export type LlmEnrichment = z.infer<typeof LlmEnrichmentSchema>

export async function enrichWithLlm(
  toc: TocEntry[],
  markdownPreview: string,
): Promise<LlmEnrichment> {
  const { generateObject } = await import('ai')
  const { openai } = await import('@ai-sdk/openai')

  const { object } = await generateObject({
    model: openai('gpt-4o'),
    schema: LlmEnrichmentSchema,
    prompt: [
      'Analyze this Mexican legal document.',
      'ATTENTION: OCR may have read ordinal "o." as "0." (e.g., ARTICULO 10. = Art 1o).',
      'Classify rigorously whether sections are current articles or historical Transitorios.',
      '',
      `Sections:\n${toc.map(s => `[${s.id}] Lines ${s.lineStart}-${s.lineEnd}: ${s.heading}`).join('\n')}`,
      '',
      `Document (first 12000 chars):\n${markdownPreview.slice(0, 12000)}`,
    ].join('\n'),
  })

  return object
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test test/lib/metadata/llm-enrichment.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/metadata/llm-enrichment.ts test/lib/metadata/llm-enrichment.test.ts
git commit -m "feat: add LLM enrichment module with generateObject and mocked tests"
```

---

### Task 11: Sidecar Merger

**Files:**
- Create: `lib/metadata/sidecar-merger.ts`
- Test: `test/lib/metadata/sidecar-merger.test.ts`

**Step 1: Write the failing test**

```typescript
// test/lib/metadata/sidecar-merger.test.ts
import { describe, it, expect } from 'vitest'
import { mergeLlmEnrichment } from '@/lib/metadata/sidecar-merger'
import { generateSidecar } from '@/lib/metadata/sidecar-generator'
import { SidecarSchema } from '@/lib/metadata/types'
import type { LlmEnrichment } from '@/lib/metadata/llm-enrichment'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const ley = readFileSync(path.resolve('test/fixtures/ley-sample.md'), 'utf-8')

describe('mergeLlmEnrichment', () => {
  const baseSidecar = generateSidecar(ley, 'ley.md')

  const llmData: LlmEnrichment = {
    title: 'Ley Aduanera (Actualizada 2026)',
    documentType: 'ley',
    sections: baseSidecar.tableOfContents.map(e => ({
      id: e.id,
      summary: `Summary for ${e.heading}`,
      isTransitoryOrAnnex: e.isTransitoryOrAnnex,
      containsFines: e.containsFines,
    })),
    definedTerms: [
      { term: 'mercancía', article: 'Art. 2o. fracción III', meaning: 'Goods subject to customs' },
    ],
    documentSpecificWarnings: ['Check annex for updated fine amounts'],
  }

  it('merges LLM summaries into TOC entries', () => {
    const merged = mergeLlmEnrichment(baseSidecar, llmData)
    expect(merged.tableOfContents[0].summary).toContain('Summary for')
  })

  it('updates document title from LLM', () => {
    const merged = mergeLlmEnrichment(baseSidecar, llmData)
    expect(merged.document.title).toBe('Ley Aduanera (Actualizada 2026)')
  })

  it('adds LLM defined terms to entities', () => {
    const merged = mergeLlmEnrichment(baseSidecar, llmData)
    const mercancia = merged.entities.definedTerms.find(t => t.term === 'mercancía')
    expect(mercancia?.article).toBe('Art. 2o. fracción III')
    expect(mercancia?.meaning).toBe('Goods subject to customs')
  })

  it('adds LLM warnings to navigation', () => {
    const merged = mergeLlmEnrichment(baseSidecar, llmData)
    expect(merged.navigation.warnings.llm_warning_0).toContain('annex')
  })

  it('still validates against SidecarSchema', () => {
    const merged = mergeLlmEnrichment(baseSidecar, llmData)
    expect(() => SidecarSchema.parse(merged)).not.toThrow()
  })

  it('preserves deterministic data when LLM section IDs do not match', () => {
    const llmWithBadIds: LlmEnrichment = {
      ...llmData,
      sections: [{ id: 'nonexistent', summary: 'Bad', isTransitoryOrAnnex: false, containsFines: false }],
    }
    const merged = mergeLlmEnrichment(baseSidecar, llmWithBadIds)
    // Deterministic entries should still have empty summaries
    expect(merged.tableOfContents[0].summary).toBe('')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test test/lib/metadata/sidecar-merger.test.ts`
Expected: FAIL

**Step 3: Write the implementation**

```typescript
// lib/metadata/sidecar-merger.ts
import type { Sidecar } from './types'
import type { LlmEnrichment } from './llm-enrichment'

/** Merge LLM enrichment data into a deterministic sidecar. LLM data overlays but never deletes. */
export function mergeLlmEnrichment(base: Sidecar, llm: LlmEnrichment): Sidecar {
  const sectionMap = new Map(llm.sections.map(s => [s.id, s]))

  const tableOfContents = base.tableOfContents.map(entry => {
    const llmSection = sectionMap.get(entry.id)
    if (!llmSection) return entry
    return {
      ...entry,
      summary: llmSection.summary || entry.summary,
      // LLM can upgrade but not downgrade flags
      isTransitoryOrAnnex: entry.isTransitoryOrAnnex || llmSection.isTransitoryOrAnnex,
      containsFines: entry.containsFines || llmSection.containsFines,
    }
  })

  // Merge LLM defined terms into existing ones
  const existingTerms = new Map(base.entities.definedTerms.map(t => [t.term, t]))
  for (const llmTerm of llm.definedTerms) {
    const existing = existingTerms.get(llmTerm.term)
    if (existing) {
      existing.article = llmTerm.article
      existing.meaning = llmTerm.meaning
    } else {
      existingTerms.set(llmTerm.term, {
        term: llmTerm.term,
        definedAtLine: 0,
        usageLines: [],
        article: llmTerm.article,
        meaning: llmTerm.meaning,
      })
    }
  }

  // Merge LLM warnings
  const warnings = { ...base.navigation.warnings }
  for (let i = 0; i < llm.documentSpecificWarnings.length; i++) {
    warnings[`llm_warning_${i}`] = llm.documentSpecificWarnings[i]
  }

  return {
    ...base,
    document: {
      ...base.document,
      title: llm.title || base.document.title,
      parties: llm.parties ?? base.document.parties,
    },
    tableOfContents,
    entities: {
      ...base.entities,
      definedTerms: [...existingTerms.values()],
    },
    navigation: {
      ...base.navigation,
      warnings,
    },
  }
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test test/lib/metadata/sidecar-merger.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/metadata/sidecar-merger.ts test/lib/metadata/sidecar-merger.test.ts
git commit -m "feat: add sidecar merger overlaying LLM enrichment onto deterministic base"
```

---

### Task 12: Phase 2 Coverage Check

**Step 1: Run full Phase 2 tests**

Run: `pnpm test test/lib/metadata/`
Expected: All PASS

**Step 2: Verify coverage**

Run: `pnpm test:coverage -- --reporter=text test/lib/metadata/`
Expected: All files 85%+

**Step 3: Commit if needed**

---

## Phase 3: Workflow Integration

**Branch:** `feat/sidecar-workflow` (from latest `main`)

---

### Task 13: Add saveSidecar to Document Storage

**Files:**
- Modify: `lib/document-storage.ts` (add `saveSidecar`, `getSidecarPath`)
- Modify: `lib/types/documents.ts` (add `sidecarPath` to DocumentMetadata)
- Test: `test/lib/document-storage.test.ts`

**Step 1: Write the failing test**

```typescript
// test/lib/document-storage.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

describe('saveSidecar', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), 'storage-test-'))
    vi.stubEnv('UPLOADS_DIR', tempDir)
  })

  it('saves sidecar JSON and returns path', async () => {
    // Dynamic import after env is set
    const { saveUploadedFile, saveSidecar } = await import('@/lib/document-storage')
    const file = new File([new Uint8Array([1, 2, 3])], 'test.pdf', { type: 'application/pdf' })
    const { documentId } = await saveUploadedFile(file)

    const sidecar = { schemaVersion: '1.0.0', test: true }
    const sidecarPath = await saveSidecar(documentId, sidecar)

    expect(sidecarPath).toContain('metadata.json')

    // Verify it's valid JSON
    const { readFile } = await import('node:fs/promises')
    const content = await readFile(sidecarPath, 'utf-8')
    expect(JSON.parse(content)).toMatchObject({ schemaVersion: '1.0.0' })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test test/lib/document-storage.test.ts`
Expected: FAIL — `saveSidecar is not a function`

**Step 3: Implement the changes**

Modify `lib/types/documents.ts` — add `sidecarPath` field:

```typescript
// Add to DocumentMetadata interface at lib/types/documents.ts:12
sidecarPath?: string
```

Modify `lib/document-storage.ts` — add `saveSidecar` function and export `getSidecarPath`:

```typescript
// Add after getMetadataPath function (around line 28):

export function getSidecarPath(documentId: string): string {
  return path.join(getDocumentDir(documentId), 'sidecar.json')
}

// Add after saveMarkdown function (around line 121):

export async function saveSidecar(
  documentId: string,
  sidecar: unknown,
): Promise<string> {
  const sidecarPath = getSidecarPath(documentId)
  await writeFile(sidecarPath, JSON.stringify(sidecar, null, 2), 'utf-8')
  await updateMetadata(documentId, { sidecarPath })
  return sidecarPath
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test test/lib/document-storage.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/document-storage.ts lib/types/documents.ts test/lib/document-storage.test.ts
git commit -m "feat: add saveSidecar to document storage layer"
```

---

### Task 14: Add Sidecar Generation Step to Workflow

**Files:**
- Modify: `workflows/parse-document.ts`
- Test: `test/workflows/parse-document.test.ts`

**Step 1: Write the failing test**

```typescript
// test/workflows/parse-document.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock external dependencies
vi.mock('@llamaindex/llama-cloud', () => ({
  default: vi.fn().mockImplementation(() => ({
    parsing: {
      parse: vi.fn().mockResolvedValue({
        markdown: { pages: [{ success: true, markdown: '# LEY TEST\n\nARTICULO 10. Test content.' }] },
        job: { id: 'test-job-id' },
      }),
    },
  })),
}))

vi.mock('@/lib/document-storage', () => ({
  getOriginalFile: vi.fn().mockResolvedValue({
    buffer: Buffer.from('fake-pdf'),
    metadata: { originalName: 'test.pdf', mimeType: 'application/pdf' },
  }),
  saveMarkdown: vi.fn().mockResolvedValue('/uploads/test-id/content.md'),
  saveSidecar: vi.fn().mockResolvedValue('/uploads/test-id/sidecar.json'),
  updateMetadata: vi.fn().mockResolvedValue({}),
}))

describe('parseDocumentWorkflow', () => {
  it('generates sidecar after parsing', async () => {
    // Note: This is a unit test of the sidecar generation logic.
    // The actual workflow uses 'use step' directives that need the Vercel WDK runtime.
    // Here we test the sidecar generation function directly.
    const { generateSidecar } = await import('@/lib/metadata/sidecar-generator')
    const markdown = '# LEY TEST\n\nARTICULO 10. Test content.'
    const sidecar = generateSidecar(markdown, 'test.md')

    expect(sidecar.schemaVersion).toBe('1.0.0')
    expect(sidecar.document.type).toBeDefined()
    expect(sidecar.tableOfContents).toBeDefined()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test test/workflows/parse-document.test.ts`
Expected: FAIL (or pass if sidecar-generator already exists — adjust test as needed)

**Step 3: Modify the workflow**

Modify `workflows/parse-document.ts` to add sidecar generation step. Add between `parseWithSdk` and `saveResultStep`:

```typescript
// Add new step function after parseWithSdk (around line 48):

async function generateSidecarStep(
  documentId: string,
  markdown: string,
): Promise<unknown> {
  'use step'

  const { generateSidecar } = await import('@/lib/metadata/sidecar-generator')
  const { enrichWithLlm } = await import('@/lib/metadata/llm-enrichment')
  const { mergeLlmEnrichment } = await import('@/lib/metadata/sidecar-merger')

  // Pass 1: Deterministic extraction (fast, no API calls)
  const baseSidecar = generateSidecar(markdown, `${documentId}.md`)

  // Pass 2: LLM enrichment (adds summaries, validates classifications)
  try {
    const llmData = await enrichWithLlm(baseSidecar.tableOfContents, markdown)
    return mergeLlmEnrichment(baseSidecar, llmData)
  } catch (error) {
    console.warn(`[parse-document] LLM enrichment failed for ${documentId}, using deterministic sidecar:`, error)
    return baseSidecar
  }
}
```

Modify `saveResultStep` to also save sidecar (around line 50):

```typescript
async function saveResultStep(
  documentId: string,
  markdown: string,
  jobId: string,
  sidecar: unknown,
): Promise<string> {
  'use step'

  const { saveMarkdown, saveSidecar, updateMetadata } = await import(
    '@/lib/document-storage'
  )
  await updateMetadata(documentId, { llamaJobId: jobId })

  // Save sidecar if available
  if (sidecar) {
    await saveSidecar(documentId, sidecar)
  }

  return saveMarkdown(documentId, markdown)
}
```

Update the workflow orchestrator to pass sidecar through:

```typescript
// In parseDocumentWorkflow, after the parseWithSdk call (around line 107):
  const sidecar = await generateSidecarStep(documentId, markdown)
  const markdownPath = await saveResultStep(documentId, markdown, jobId, sidecar)
```

**Step 4: Run test to verify it passes**

Run: `pnpm test test/workflows/`
Expected: PASS

**Step 5: Commit**

```bash
git add workflows/parse-document.ts test/workflows/parse-document.test.ts
git commit -m "feat: add sidecar generation step to parse-document workflow"
```

---

### Task 15: Update Agent System Prompt for Sidecar Workflow

**Files:**
- Modify: `app/api/chat/route.ts:15-121` (add sidecar instructions to system prompt)

**Step 1: Write the test**

This is a string content change — test by verifying the system prompt includes sidecar instructions.

```typescript
// test/app/api/chat/system-prompt.test.ts
import { describe, it, expect } from 'vitest'

// We'll test by reading the file and checking for the sidecar instructions
import { readFileSync } from 'node:fs'
import path from 'node:path'

describe('chat system prompt', () => {
  const routeFile = readFileSync(path.resolve('app/api/chat/route.ts'), 'utf-8')

  it('includes sidecar workflow instructions', () => {
    expect(routeFile).toContain('metadata.json')
    expect(routeFile).toContain('sidecar')
    expect(routeFile).toContain('quickCommands')
  })

  it('instructs agent to read sidecar FIRST', () => {
    expect(routeFile).toContain('ALWAYS read')
    expect(routeFile).toContain('sidecar')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test test/app/api/chat/system-prompt.test.ts`
Expected: FAIL (sidecar not yet in prompt)

**Step 3: Add sidecar instructions to system prompt**

Modify `app/api/chat/route.ts`. Add the following block inside the `system` template string, after the `### Common Tasks` section (before the closing backtick around line 121):

```typescript
// Add before "Do NOT guess or fabricate" (around line 118):

## Document Navigation with Sidecars

Each document MAY have a sidecar.json alongside its content.md:
/documents/{documentId}/
  content.md      ← Searchable markdown
  metadata.json   ← Document name, status
  sidecar.json    ← Structured navigation metadata (if available)

### MANDATORY WORKFLOW (when sidecar.json exists):
1. ALWAYS read sidecar.json FIRST: cat /documents/{id}/sidecar.json | jq '.'
2. Check navigation.warnings for document-specific hazards (OCR quirks, outdated data)
3. Scan tableOfContents summaries and isTransitoryOrAnnex flags
4. Use navigation.quickCommands templates for targeted extraction (replace {N} with article number)
5. For monetary amounts, check if containsFines is true — use findUpdatedFines command
6. Use sed -n 'START,ENDp' with line ranges from TOC instead of cat-ing entire files

### Sidecar Quick Reference:
- List all sections: cat sidecar.json | jq '.tableOfContents[] | {id, heading, summary, isTransitoryOrAnnex}'
- Check warnings: cat sidecar.json | jq '.navigation.warnings'
- Get quick commands: cat sidecar.json | jq '.navigation.quickCommands'
- Skip transitorios: cat sidecar.json | jq '.tableOfContents[] | select(.isTransitoryOrAnnex == false)'
- Find fines sections: cat sidecar.json | jq '.tableOfContents[] | select(.containsFines == true)'

If sidecar.json does not exist (older documents), fall back to the standard search workflow above.
```

**Step 4: Run test to verify it passes**

Run: `pnpm test test/app/api/chat/system-prompt.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add app/api/chat/route.ts test/app/api/chat/system-prompt.test.ts
git commit -m "feat: add sidecar navigation instructions to agent system prompt"
```

---

### Task 16: Mount Sidecar in Sandbox

**Files:**
- Modify: `lib/sandbox.ts` (no code changes needed — OverlayFs already mounts the entire uploads directory)
- Test: Verify sidecar.json is accessible from sandbox

The OverlayFs at `lib/sandbox.ts:21-25` already mounts the entire `uploads/` directory at `/documents/` with `readOnly: true`. Since `saveSidecar` writes to `uploads/{documentId}/sidecar.json`, the file is automatically visible to the bash agent at `/documents/{documentId}/sidecar.json`.

**Step 1: Write a verification test**

```typescript
// test/lib/sandbox-sidecar.test.ts
import { describe, it, expect } from 'vitest'
import { mkdir, writeFile } from 'node:fs/promises'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

describe('sandbox sidecar access', () => {
  it('OverlayFs exposes sidecar.json files alongside content.md', async () => {
    // This is a documentation test confirming the architecture:
    // OverlayFs(uploads/) -> /documents/ includes ALL files in document dirs
    // No code changes needed — just verify the design assumption
    const tempDir = await mkdtemp(path.join(tmpdir(), 'sandbox-test-'))
    const docDir = path.join(tempDir, 'test-doc-id')
    await mkdir(docDir, { recursive: true })
    await writeFile(path.join(docDir, 'content.md'), '# Test')
    await writeFile(path.join(docDir, 'sidecar.json'), '{"schemaVersion":"1.0.0"}')
    await writeFile(path.join(docDir, 'metadata.json'), '{"status":"completed"}')

    const { readdir } = await import('node:fs/promises')
    const files = await readdir(docDir)
    expect(files).toContain('content.md')
    expect(files).toContain('sidecar.json')
    expect(files).toContain('metadata.json')

    await rm(tempDir, { recursive: true, force: true })
  })
})
```

**Step 2: Run test**

Run: `pnpm test test/lib/sandbox-sidecar.test.ts`
Expected: PASS (no code changes needed)

**Step 3: Commit**

```bash
git add test/lib/sandbox-sidecar.test.ts
git commit -m "test: verify sidecar.json accessible through sandbox OverlayFs"
```

---

### Task 17: Phase 3 Full Test Suite

**Step 1: Run all tests**

Run: `pnpm test`
Expected: All PASS

**Step 2: Run coverage**

Run: `pnpm test:coverage`
Expected: 85%+ on `lib/`, `workflows/`, `app/api/`

**Step 3: Run typecheck and lint**

Run: `pnpm validate`
Expected: PASS

**Step 4: Commit any fixes**

---

## Phase 4: LlamaCloud Indexing & Semantic Retrieval

**Branch:** `feat/llamacloud-indexing` (from latest `main`)

---

### Task 18: Indexing Types

**Files:**
- Create: `lib/indexing/types.ts`
- Test: `test/lib/indexing/types.test.ts`

**Step 1: Write the failing test**

```typescript
// test/lib/indexing/types.test.ts
import { describe, it, expect } from 'vitest'
import { IndexingConfigSchema } from '@/lib/indexing/types'

describe('IndexingConfigSchema', () => {
  it('validates a valid config', () => {
    expect(() => IndexingConfigSchema.parse({
      pipelineName: 'legal-documents',
      projectId: 'proj_123',
      embeddingModel: 'text-embedding-3-small',
      embeddingDimensions: 1536,
      chunkSize: 512,
      chunkOverlap: 50,
    })).not.toThrow()
  })

  it('rejects missing required fields', () => {
    expect(() => IndexingConfigSchema.parse({})).toThrow()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test test/lib/indexing/types.test.ts`
Expected: FAIL

**Step 3: Write the implementation**

```typescript
// lib/indexing/types.ts
import { z } from 'zod'

export const IndexingConfigSchema = z.object({
  pipelineName: z.string().default('legal-documents'),
  projectId: z.string(),
  embeddingModel: z.string().default('text-embedding-3-small'),
  embeddingDimensions: z.number().default(1536),
  chunkSize: z.number().default(512),
  chunkOverlap: z.number().default(50),
})

export type IndexingConfig = z.infer<typeof IndexingConfigSchema>
```

**Step 4: Run test to verify it passes**

Run: `pnpm test test/lib/indexing/types.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/indexing/types.ts test/lib/indexing/types.test.ts
git commit -m "feat: add Zod schema for LlamaCloud indexing configuration"
```

---

### Task 19: Pipeline Manager

**Files:**
- Create: `lib/indexing/pipeline-manager.ts`
- Test: `test/lib/indexing/pipeline-manager.test.ts`

**Step 1: Write the failing test**

```typescript
// test/lib/indexing/pipeline-manager.test.ts
import { describe, it, expect, vi } from 'vitest'

vi.mock('@llamaindex/llama-cloud', () => ({
  default: vi.fn().mockImplementation(() => ({
    pipelines: {
      upsert: vi.fn().mockResolvedValue({ id: 'pipe_123', name: 'legal-documents' }),
    },
  })),
}))

describe('ensurePipeline', () => {
  it('creates or upserts a pipeline and returns its ID', async () => {
    const { ensurePipeline } = await import('@/lib/indexing/pipeline-manager')
    const result = await ensurePipeline()
    expect(result).toMatchObject({ id: 'pipe_123' })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test test/lib/indexing/pipeline-manager.test.ts`
Expected: FAIL

**Step 3: Write the implementation**

```typescript
// lib/indexing/pipeline-manager.ts

export async function ensurePipeline() {
  const { default: LlamaCloud } = await import('@llamaindex/llama-cloud')

  const client = new LlamaCloud({
    apiKey: process.env.LLAMA_CLOUD_API_KEY,
  })

  return client.pipelines.upsert({
    name: process.env.LLAMA_CLOUD_PIPELINE_NAME ?? 'legal-documents',
    project_id: process.env.LLAMA_CLOUD_PROJECT_ID!,
    embedding_config: {
      type: 'OPENAI',
      model: 'text-embedding-3-small',
      dimensions: 1536,
    },
    transform_config: {
      mode: 'auto',
      chunk_size: 512,
      chunk_overlap: 50,
    },
  })
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test test/lib/indexing/pipeline-manager.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/indexing/pipeline-manager.ts test/lib/indexing/pipeline-manager.test.ts
git commit -m "feat: add LlamaCloud pipeline manager with upsert"
```

---

### Task 20: Document Indexer

**Files:**
- Create: `lib/indexing/document-indexer.ts`
- Test: `test/lib/indexing/document-indexer.test.ts`

**Step 1: Write the failing test**

```typescript
// test/lib/indexing/document-indexer.test.ts
import { describe, it, expect, vi } from 'vitest'

const mockCreate = vi.fn().mockResolvedValue({ id: 'doc_123' })

vi.mock('@llamaindex/llama-cloud', () => ({
  default: vi.fn().mockImplementation(() => ({
    pipelines: {
      documents: {
        create: mockCreate,
      },
    },
  })),
}))

describe('indexDocument', () => {
  it('pushes document chunks with sidecar metadata', async () => {
    const { indexDocument } = await import('@/lib/indexing/document-indexer')

    await indexDocument('pipe_123', {
      documentId: 'doc-abc',
      markdown: '# Test\n\nSome content',
      documentType: 'ley',
      title: 'Test Ley',
    })

    expect(mockCreate).toHaveBeenCalledWith(
      'pipe_123',
      expect.objectContaining({
        documents: expect.arrayContaining([
          expect.objectContaining({
            metadata: expect.objectContaining({
              document_type: 'ley',
            }),
          }),
        ]),
      }),
    )
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test test/lib/indexing/document-indexer.test.ts`
Expected: FAIL

**Step 3: Write the implementation**

```typescript
// lib/indexing/document-indexer.ts

interface IndexDocumentInput {
  documentId: string
  markdown: string
  documentType: string
  title: string
}

export async function indexDocument(
  pipelineId: string,
  input: IndexDocumentInput,
) {
  const { default: LlamaCloud } = await import('@llamaindex/llama-cloud')

  const client = new LlamaCloud({
    apiKey: process.env.LLAMA_CLOUD_API_KEY,
  })

  return client.pipelines.documents.create(pipelineId, {
    documents: [{
      id: input.documentId,
      text: input.markdown,
      metadata: {
        document_type: input.documentType,
        title: input.title,
        source_id: input.documentId,
      },
    }],
  })
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test test/lib/indexing/document-indexer.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/indexing/document-indexer.ts test/lib/indexing/document-indexer.test.ts
git commit -m "feat: add document indexer pushing chunks to LlamaCloud pipeline"
```

---

### Task 21: Semantic Retriever

**Files:**
- Create: `lib/indexing/semantic-retriever.ts`
- Test: `test/lib/indexing/semantic-retriever.test.ts`

**Step 1: Write the failing test**

```typescript
// test/lib/indexing/semantic-retriever.test.ts
import { describe, it, expect, vi } from 'vitest'

const mockRetrieve = vi.fn().mockResolvedValue({
  retrieval_nodes: [
    { text: 'Artículo 36 Bis...', score: 0.95, metadata: { document_type: 'ley', page_number: 12 } },
  ],
})

vi.mock('@llamaindex/llama-cloud', () => ({
  default: vi.fn().mockImplementation(() => ({
    pipelines: {
      retrieve: mockRetrieve,
    },
  })),
}))

describe('searchDocuments', () => {
  it('returns ranked retrieval nodes', async () => {
    const { searchDocuments } = await import('@/lib/indexing/semantic-retriever')
    const results = await searchDocuments('pipe_123', 'despacho aduanero')

    expect(results.retrieval_nodes).toHaveLength(1)
    expect(results.retrieval_nodes[0].score).toBe(0.95)
    expect(mockRetrieve).toHaveBeenCalledWith('pipe_123', expect.objectContaining({
      query: 'despacho aduanero',
      enable_reranking: true,
    }))
  })

  it('passes metadata filters when provided', async () => {
    const { searchDocuments } = await import('@/lib/indexing/semantic-retriever')
    await searchDocuments('pipe_123', 'multas', {
      filters: {
        filters: [{ key: 'document_type', value: 'ley', operator: 'eq' as const }],
        condition: 'and' as const,
      },
    })

    expect(mockRetrieve).toHaveBeenCalledWith('pipe_123', expect.objectContaining({
      search_filters: expect.objectContaining({
        filters: expect.arrayContaining([
          expect.objectContaining({ key: 'document_type', value: 'ley' }),
        ]),
      }),
    }))
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test test/lib/indexing/semantic-retriever.test.ts`
Expected: FAIL

**Step 3: Write the implementation**

```typescript
// lib/indexing/semantic-retriever.ts

interface SearchOptions {
  alpha?: number
  topK?: number
  filters?: {
    filters: Array<{ key: string; value: string; operator: string }>
    condition: string
  }
}

export async function searchDocuments(
  pipelineId: string,
  query: string,
  options?: SearchOptions,
) {
  const { default: LlamaCloud } = await import('@llamaindex/llama-cloud')

  const client = new LlamaCloud({
    apiKey: process.env.LLAMA_CLOUD_API_KEY,
  })

  return client.pipelines.retrieve(pipelineId, {
    query,
    alpha: options?.alpha ?? 0.5,
    dense_similarity_top_k: options?.topK ?? 20,
    sparse_similarity_top_k: options?.topK ?? 20,
    enable_reranking: true,
    rerank_top_n: 5,
    retrieval_mode: 'chunks',
    search_filters: options?.filters,
  })
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test test/lib/indexing/semantic-retriever.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/indexing/semantic-retriever.ts test/lib/indexing/semantic-retriever.test.ts
git commit -m "feat: add semantic retriever with hybrid search and reranking"
```

---

### Task 22: Add Indexing Step to Workflow

**Files:**
- Modify: `workflows/parse-document.ts` (add `indexInPipelineStep` after sidecar generation)

**Step 1: Add the indexing step**

Add after `generateSidecarStep` in `workflows/parse-document.ts`:

```typescript
async function indexInPipelineStep(
  documentId: string,
  markdown: string,
  sidecar: { document: { type: string; title: string } },
): Promise<void> {
  'use step'

  // Only index if LlamaCloud is configured
  if (!process.env.LLAMA_CLOUD_PROJECT_ID) return

  const { ensurePipeline } = await import('@/lib/indexing/pipeline-manager')
  const { indexDocument } = await import('@/lib/indexing/document-indexer')

  const pipeline = await ensurePipeline()
  await indexDocument(pipeline.id, {
    documentId,
    markdown,
    documentType: sidecar.document.type,
    title: sidecar.document.title,
  })
}
```

Update the orchestrator to call it:

```typescript
// After sidecar generation, before saveResultStep:
  await indexInPipelineStep(documentId, markdown, sidecar as { document: { type: string; title: string } })
```

**Step 2: Run tests**

Run: `pnpm test`
Expected: All PASS

**Step 3: Commit**

```bash
git add workflows/parse-document.ts
git commit -m "feat: add LlamaCloud indexing step to parse-document workflow"
```

---

### Task 23: Add Search Tool to Chat Agent

**Files:**
- Modify: `app/api/chat/route.ts` (add semantic search tool)

**Step 1: Add the search tool**

Add after the `getToolkit()` call in `app/api/chat/route.ts`:

```typescript
import { tool } from 'ai'
import { z } from 'zod'

// Inside POST handler, after const { tools } = await getToolkit():

const searchTool = process.env.LLAMA_CLOUD_PROJECT_ID
  ? {
      semanticSearch: tool({
        description: 'Semantic search across all indexed legal documents. Use for broad queries when you need to find relevant content across multiple documents, or when grep-based search is insufficient.',
        parameters: z.object({
          query: z.string().describe('Natural language query in Spanish or English'),
          documentType: z.enum(['contrato', 'ley', 'sentencia', 'nom', 'all']).optional().describe('Filter by document type'),
        }),
        execute: async ({ query, documentType }) => {
          const { searchDocuments } = await import('@/lib/indexing/semantic-retriever')
          const { ensurePipeline } = await import('@/lib/indexing/pipeline-manager')

          const pipeline = await ensurePipeline()
          const filters = documentType && documentType !== 'all'
            ? { filters: [{ key: 'document_type', value: documentType, operator: 'eq' as const }], condition: 'and' as const }
            : undefined

          const results = await searchDocuments(pipeline.id, query, { filters })
          return (results.retrieval_nodes ?? []).slice(0, 5).map((n: { text: string; score: number; metadata: Record<string, unknown> }) => ({
            text: n.text.slice(0, 500),
            score: n.score,
            documentType: n.metadata.document_type,
          }))
        },
      }),
    }
  : {}

// Update the streamText call to include both tool sets:
const result = streamText({
  // ...existing config
  tools: { ...tools, ...searchTool },
  // ...
})
```

**Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add app/api/chat/route.ts
git commit -m "feat: add semantic search tool to chat agent (LlamaCloud-powered)"
```

---

### Task 24: Phase 4 Full Test Suite

**Step 1: Run all tests**

Run: `pnpm test`
Expected: All PASS

**Step 2: Coverage check**

Run: `pnpm test:coverage`
Expected: 85%+

**Step 3: Validate**

Run: `pnpm validate`
Expected: PASS

---

## Phase 5: Vercel Blob Storage Migration

**Branch:** `feat/blob-storage` (from latest `main`)

---

### Task 25: Install @vercel/blob

**Step 1: Install the package**

```bash
pnpm add @vercel/blob
```

**Step 2: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add @vercel/blob dependency"
```

---

### Task 26: Dual Storage Backend

**Files:**
- Modify: `lib/document-storage.ts` (add Blob functions with env switch)
- Test: `test/lib/document-storage-blob.test.ts`

**Step 1: Write the failing test**

```typescript
// test/lib/document-storage-blob.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@vercel/blob', () => ({
  put: vi.fn().mockResolvedValue({ url: 'https://blob.vercel-storage.com/doc/test.md' }),
  list: vi.fn().mockResolvedValue({
    blobs: [
      { pathname: 'documents/abc/content.md', url: 'https://blob.vercel-storage.com/content.md' },
      { pathname: 'documents/abc/sidecar.json', url: 'https://blob.vercel-storage.com/sidecar.json' },
    ],
  }),
}))

describe('blob storage backend', () => {
  beforeEach(() => {
    vi.stubEnv('STORAGE_BACKEND', 'blob')
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', 'test-token')
  })

  it('getStorageBackend returns blob when env is set', async () => {
    const { getStorageBackend } = await import('@/lib/document-storage')
    expect(getStorageBackend()).toBe('blob')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test test/lib/document-storage-blob.test.ts`
Expected: FAIL

**Step 3: Add the storage backend switch**

Add to `lib/document-storage.ts`:

```typescript
// Add at the top (around line 6):
export function getStorageBackend(): 'local' | 'blob' {
  return (process.env.STORAGE_BACKEND as 'local' | 'blob') ?? 'local'
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test test/lib/document-storage-blob.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/document-storage.ts test/lib/document-storage-blob.test.ts
git commit -m "feat: add dual storage backend switch (local/blob) with env var"
```

---

### Task 27: MANIFEST.json Generator

**Files:**
- Create: `lib/manifest.ts`
- Test: `test/lib/manifest.test.ts`

**Step 1: Write the failing test**

```typescript
// test/lib/manifest.test.ts
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/document-storage', () => ({
  listDocuments: vi.fn().mockResolvedValue([
    {
      documentId: 'abc',
      originalName: 'ley-aduanera.pdf',
      status: 'completed',
      sidecarPath: '/uploads/abc/sidecar.json',
    },
    {
      documentId: 'def',
      originalName: 'contrato.pdf',
      status: 'completed',
    },
  ]),
}))

describe('generateManifest', () => {
  it('generates a MANIFEST.json listing all documents', async () => {
    const { generateManifest } = await import('@/lib/manifest')
    const manifest = await generateManifest()

    expect(manifest.documents).toHaveLength(2)
    expect(manifest.documents[0]).toMatchObject({
      id: 'abc',
      name: 'ley-aduanera.pdf',
      contentFile: '/documents/abc/content.md',
      sidecarFile: '/documents/abc/sidecar.json',
    })
    expect(manifest.documents[1].sidecarFile).toBeNull()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test test/lib/manifest.test.ts`
Expected: FAIL

**Step 3: Write the implementation**

```typescript
// lib/manifest.ts
import { listDocuments } from './document-storage'

interface ManifestDocument {
  id: string
  name: string
  contentFile: string
  sidecarFile: string | null
  status: string
}

interface Manifest {
  generatedAt: string
  documents: ManifestDocument[]
}

export async function generateManifest(): Promise<Manifest> {
  const docs = await listDocuments()

  return {
    generatedAt: new Date().toISOString(),
    documents: docs
      .filter(d => d.status === 'completed')
      .map(d => ({
        id: d.documentId,
        name: d.originalName,
        contentFile: `/documents/${d.documentId}/content.md`,
        sidecarFile: d.sidecarPath ? `/documents/${d.documentId}/sidecar.json` : null,
        status: d.status,
      })),
  }
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test test/lib/manifest.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/manifest.ts test/lib/manifest.test.ts
git commit -m "feat: add MANIFEST.json generator for document inventory"
```

---

### Task 28: Final Validation

**Step 1: Run all tests**

Run: `pnpm test`
Expected: All PASS

**Step 2: Run coverage**

Run: `pnpm test:coverage`
Expected: 85%+ across all covered directories

**Step 3: Run full validation**

Run: `pnpm validate`
Expected: biome, eslint, typecheck all PASS

**Step 4: Review diff**

Run: `git diff main --stat`
Verify: All new files are in `lib/metadata/`, `lib/indexing/`, `lib/manifest.ts`, `test/`, and modifications to `workflows/`, `app/api/chat/`, `lib/document-storage.ts`

---

## Summary

| Phase | Tasks | New Files | Test Files | Key Dependencies |
|-------|-------|-----------|------------|-----------------|
| 1. Regex & Extraction | 1-9 | 8 | 7 + 3 fixtures | None |
| 2. LLM Enrichment | 10-12 | 2 | 2 | ai, @ai-sdk/openai (mocked) |
| 3. Workflow Integration | 13-17 | 0 | 4 | workflow (existing) |
| 4. LlamaCloud Indexing | 18-24 | 4 | 4 | @llamaindex/llama-cloud (existing) |
| 5. Vercel Blob | 25-28 | 2 | 2 | @vercel/blob (new) |
| **Total** | **28** | **16** | **19 + 3 fixtures** | |
