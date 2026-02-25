# SPEC-UI-001: Implementation Plan

## Task Decomposition

### Phase 1: Foundation (No new dependencies)

#### Task 1.1: File Type Detection Utility
**File:** `lib/file-types.ts`
**Effort:** Small
**Dependencies:** None

Create the file type detection utility with:
- `detectFileCategory(filepath: string): FileCategory` — returns 'code' | 'image' | 'pdf' | 'docx' | 'spreadsheet' | 'unknown'
- `getMimeType(filepath: string): string` — returns MIME type string
- `base64ToArrayBuffer(base64: string): ArrayBuffer` — conversion helper
- `base64ToDataUri(base64: string, mimeType: string): string` — data URI helper
- `isBase64Content(content: string): boolean` — heuristic to detect base64-encoded content

Extend the existing `extensionToLanguage` pattern from `app/page.tsx`.

#### Task 1.2: DocumentViewer Provider and Shell
**Files:** `components/ai-elements/document-viewer/document-viewer-provider.tsx`, `components/ai-elements/document-viewer/index.tsx`
**Effort:** Medium
**Dependencies:** Task 1.1

Create the compound component structure:
- `DocumentViewerProvider` — React context with `{ isOpen, file: { path, content, category }, open(path, content), close() }`
- `DocumentViewer` — Dialog shell following `prompt-box-image-dialog.tsx` pattern
- `DocumentViewerTrigger` — Opens the dialog (used as expand button)
- Export barrel from `index.tsx`

#### Task 1.3: Code Renderer
**File:** `components/ai-elements/document-viewer/renderers/code-renderer.tsx`
**Effort:** Small
**Dependencies:** Task 1.2

Wrap existing `CodeBlock` with `showLineNumbers` and `CodeBlockCopyButton` in the dialog context. Reuse `detectLanguage` from page.tsx (extract to `lib/file-types.ts`).

### Phase 2: Image Support

#### Task 2.1: Install react-zoom-pan-pinch
**Effort:** Small
**Dependencies:** None

```bash
pnpm add react-zoom-pan-pinch
```

#### Task 2.2: Image Renderer
**File:** `components/ai-elements/document-viewer/renderers/image-renderer.tsx`
**Effort:** Medium
**Dependencies:** Task 1.2, Task 2.1

- Use `TransformWrapper` + `TransformComponent` from react-zoom-pan-pinch
- Render `<img>` with `base64ToDataUri()` as src
- Add zoom controls (ZoomIn, ZoomOut, ResetTransform buttons)
- Center image within dialog viewport with `max-h-[85vh]` constraint

### Phase 3: PDF Support

#### Task 3.1: Install react-pdf
**Effort:** Small
**Dependencies:** None

```bash
pnpm add react-pdf
```

#### Task 3.2: PDF Renderer
**File:** `components/ai-elements/document-viewer/renderers/pdf-renderer.tsx`
**Effort:** Large
**Dependencies:** Task 1.2, Task 3.1

- Dynamic import wrapper: `next/dynamic` with `{ ssr: false }`
- Configure `pdfjs.GlobalWorkerOptions.workerSrc` in same module
- `Document` + `Page` components from react-pdf
- Page navigation: previous/next buttons + "Page X of Y" indicator
- Loading state with Shimmer component
- Convert base64 content to ArrayBuffer for the `file` prop

### Phase 4: DOCX Support

#### Task 4.1: Install mammoth
**Effort:** Small
**Dependencies:** None

```bash
pnpm add mammoth
```

#### Task 4.2: DOCX Renderer
**File:** `components/ai-elements/document-viewer/renderers/docx-renderer.tsx`
**Effort:** Medium
**Dependencies:** Task 1.2, Task 4.1

- Convert base64 to ArrayBuffer
- Call `mammoth.convertToHtml({ arrayBuffer })` in useEffect
- Render HTML in a scrollable container with `prose` typography classes
- Loading state while conversion runs
- Error state if conversion fails

### Phase 5: Spreadsheet Support

#### Task 5.1: Install xlsx and papaparse
**Effort:** Small
**Dependencies:** None

```bash
pnpm add xlsx papaparse && pnpm add -D @types/papaparse
```

#### Task 5.2: Spreadsheet Renderer
**File:** `components/ai-elements/document-viewer/renderers/spreadsheet-renderer.tsx`
**Effort:** Large
**Dependencies:** Task 1.2, Task 5.1

- For .xlsx/.xls: `XLSX.read(base64, { type: "base64" })`, extract sheet names and data via `XLSX.utils.sheet_to_json`
- For .csv: `Papa.parse(content, { header: true })`
- Render as HTML table with Tailwind styling (sticky header, alternating rows, horizontal scroll)
- Sheet tab selector for multi-sheet workbooks
- Compact mode (first 10 rows) for inline preview

### Phase 6: Integration

#### Task 6.1: Renderer Switch Component
**File:** `components/ai-elements/document-viewer/renderer-switch.tsx`
**Effort:** Small
**Dependencies:** Tasks 1.3, 2.2, 3.2, 4.2, 5.2

Central component that switches renderer based on `FileCategory`:
```tsx
switch (category) {
  case 'code': return <CodeRenderer ... />;
  case 'image': return <ImageRenderer ... />;
  case 'pdf': return <PDFRenderer ... />;
  case 'docx': return <DocxRenderer ... />;
  case 'spreadsheet': return <SpreadsheetRenderer ... />;
  default: return <FallbackRenderer ... />;
}
```

#### Task 6.2: Inline readFile Enhancement
**File:** `app/page.tsx` (modify readFile tool section, lines ~262-288)
**Effort:** Medium
**Dependencies:** Task 6.1

- Replace the current CodeBlock-only rendering with type-aware rendering
- Add expand button (Maximize2 icon) to open DocumentViewer dialog
- Keep CodeBlock rendering for `code` type files (preserves current behavior)
- Add compact inline renderers for image, pdf, docx, spreadsheet types
- Wrap the chat page with `DocumentViewerProvider`

#### Task 6.3: FileTree Click Integration
**File:** `app/page.tsx` (modify FileTree rendering section, lines ~223-260)
**Effort:** Medium
**Dependencies:** Task 6.1

- Add `onSelect` handler to FileTree that:
  1. Calls the readFile tool via a fetch to `/api/read-file` endpoint (or reads from existing tool output)
  2. Opens the DocumentViewer dialog with the file content
- Create a lightweight API route or utility to read files from the sandbox
- Filter out folder selections (only open files)

#### Task 6.4: Wrap Page with DocumentViewerProvider
**File:** `app/page.tsx`
**Effort:** Small
**Dependencies:** Task 6.2, Task 6.3

- Wrap the page content with `DocumentViewerProvider`
- Place the `DocumentViewer` dialog component at the root level
- Wire up the expand button and FileTree click handlers to use the provider's `open()` method

## Execution Order

```
Phase 1 (Foundation)
  1.1 → 1.2 → 1.3

Phase 2-5 (Renderers - can be parallelized)
  2.1 → 2.2
  3.1 → 3.2
  4.1 → 4.2
  5.1 → 5.2

Phase 6 (Integration - sequential)
  6.1 → 6.2 → 6.3 → 6.4
```

Phases 2-5 can run in parallel after Phase 1 completes. Phase 6 depends on all renderer phases.

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| react-pdf SSR crash | High | Dynamic import with ssr: false, verified pattern |
| Large base64 files causing slowness | Medium | Lazy rendering, loading states, potential chunking |
| SheetJS bundle size (~400KB) | Medium | Dynamic import for spreadsheet renderer only |
| mammoth HTML output styling conflicts | Low | Scope styles within a container, use prose classes |
| react-zoom-pan-pinch touch conflicts on mobile | Low | Test on mobile, configure touch settings |
