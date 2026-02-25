# SPEC-UI-001: Document Viewer

**Status:** Draft
**Created:** 2026-02-14
**Domain:** UI/Frontend
**Priority:** High

## Overview

Add a universal document viewer that renders files based on their type (code, images, PDF, DOCX, Excel/CSV) in both an inline chat context and a fullscreen dialog. The feature integrates with the existing FileTree component and the readFile tool output.

## Context

Currently, the readFile tool in the chat renders all file output as syntax-highlighted code via `CodeBlock`. This works well for source code but provides no meaningful rendering for binary/document files like images, PDFs, DOCX, or spreadsheets. The FileTree component displays file listings but clicking files has no effect beyond selection. Users need visual rendering of documents in-context and an option to expand to a fullscreen viewer.

## Requirements (EARS Format)

### R1: File Type Detection Utility

**When** a file path is provided to the system, **the system shall** detect the file type category based on the file extension and return the appropriate renderer type.

Categories:
- `code` — .ts, .tsx, .js, .jsx, .json, .md, .py, .sh, .css, .html, .yml, .yaml, .toml, .sql, .rs, .go, .rb, .java, .xml
- `image` — .png, .jpg, .jpeg, .gif, .svg, .webp, .bmp, .ico
- `pdf` — .pdf
- `docx` — .docx
- `spreadsheet` — .xlsx, .xls, .csv
- `unknown` — all other extensions

### R2: DocumentViewer Dialog Component

**When** the DocumentViewer is opened, **the system shall** display a fullscreen dialog overlay with the file content rendered according to its detected type.

- R2.1: The dialog shall follow the existing `prompt-box-image-dialog.tsx` pattern using shadcn Dialog with `backdrop-blur-sm bg-black/70` overlay.
- R2.2: The dialog shall include a close button (X) in the top-right corner.
- R2.3: The dialog shall display the filename in the header area.
- R2.4: The dialog shall render the file content using the appropriate type-specific renderer.
- R2.5: **If** the file type is `unknown`, **the system shall** display a fallback message with the raw text content or a "Cannot preview this file type" notice.

### R3: Type-Specific Renderers

#### R3.1: Code Renderer

**When** a file of type `code` is opened in the DocumentViewer, **the system shall** render it using the existing `CodeBlock` component with syntax highlighting, line numbers enabled, and a copy button.

#### R3.2: Image Renderer

**When** a file of type `image` is opened in the DocumentViewer, **the system shall** render it as a zoomable/pannable image using `react-zoom-pan-pinch`.

- The image shall be displayed centered within the dialog viewport.
- The image source shall be a `data:` URI constructed from the base64 content and detected MIME type.
- Zoom controls (zoom in, zoom out, reset) shall be displayed.

#### R3.3: PDF Renderer

**When** a file of type `pdf` is opened in the DocumentViewer, **the system shall** render it using `react-pdf`.

- The PDF viewer must be loaded via `next/dynamic` with `ssr: false` to avoid server-side rendering issues.
- The PDF worker must be configured in the same module as the Document/Page components.
- Page navigation (previous/next) and current page indicator shall be provided.
- The PDF data shall be passed as an ArrayBuffer converted from base64.

#### R3.4: DOCX Renderer

**When** a file of type `docx` is opened in the DocumentViewer, **the system shall** convert the DOCX content to HTML using `mammoth.js` and render it within a styled container.

- Input shall be an ArrayBuffer converted from base64 content.
- The rendered HTML shall be displayed in a scrollable container with appropriate typography styles.

#### R3.5: Spreadsheet Renderer

**When** a file of type `spreadsheet` is opened in the DocumentViewer, **the system shall** render it as a styled HTML table.

- `.xlsx` and `.xls` files shall be parsed using SheetJS (`xlsx` package) with `XLSX.read(base64, {type: "base64"})`.
- `.csv` files shall be parsed using `papaparse`.
- The table shall display with alternating row colors, sticky header, and horizontal scroll for wide sheets.
- Sheet tab navigation shall be provided for multi-sheet workbooks.

### R4: FileTree Click Integration

**When** a user clicks on a file (not a folder) in the FileTree component within a bash tool's file-listing output, **the system shall** open the DocumentViewer dialog displaying that file's content.

- R4.1: The system shall invoke the sandbox's `readFile` capability to fetch the file content.
- R4.2: **While** the file is loading, **the system shall** display a loading spinner in the dialog.
- R4.3: Clicking a folder in the FileTree shall NOT open the DocumentViewer.

### R5: Inline readFile Enhancement

**When** the readFile tool returns output in the chat, **the system shall** render the content using the appropriate type-specific renderer inline (not just CodeBlock for everything).

- R5.1: Code files shall continue to render as `CodeBlock` (current behavior preserved).
- R5.2: Image files shall render as a thumbnail preview (max-height ~200px) with the expand button.
- R5.3: PDF files shall render a single-page preview with the expand button.
- R5.4: DOCX files shall render a truncated HTML preview with the expand button.
- R5.5: Spreadsheet files shall render a compact table preview (first 10 rows) with the expand button.

### R6: Expand Button

**When** a readFile tool result is displayed inline in the chat, **the system shall** display an expand button (icon) that opens the same DocumentViewer dialog as the FileTree click.

- R6.1: The expand button shall be positioned in the top-right corner of the inline preview.
- R6.2: The expand button shall use the `Maximize2` icon from `lucide-react`.
- R6.3: The button shall be visible on hover over the inline preview container.

## Technical Approach

### New Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| react-pdf | ^10.x | PDF rendering (React 19 compatible) |
| mammoth | ^1.11.x | DOCX to HTML conversion |
| xlsx | ^0.18.x | Excel file parsing |
| papaparse | ^5.5.x | CSV file parsing |
| react-zoom-pan-pinch | ^3.7.x | Image zoom/pan interactions |

### Architecture

```
components/ai-elements/document-viewer/
  index.tsx                    — DocumentViewer compound component + dialog
  document-viewer-provider.tsx — Context provider for viewer state
  renderers/
    code-renderer.tsx          — Wraps existing CodeBlock
    image-renderer.tsx         — react-zoom-pan-pinch + base64 data URI
    pdf-renderer.tsx           — react-pdf with dynamic import
    docx-renderer.tsx          — mammoth.js HTML rendering
    spreadsheet-renderer.tsx   — SheetJS/papaparse table rendering
lib/
  file-types.ts                — File type detection utility + base64 helpers
```

### Base64 Handling

The just-bash virtual filesystem stores all content as strings. For binary files, the readFile tool returns base64-encoded content. Conversion utilities:

- `base64ToArrayBuffer(base64: string): ArrayBuffer` — for react-pdf, mammoth
- `base64ToDataUri(base64: string, mimeType: string): string` — for images
- `getMimeType(filepath: string): string` — extension-based MIME detection

### SSR Considerations

- The PDF renderer **must** use `next/dynamic` with `{ ssr: false }` because `pdfjs-dist` requires browser APIs (Canvas, Worker).
- mammoth.js and SheetJS work in both environments but will only be used client-side in the dialog component.
- All renderer components are `"use client"` components.

## Out of Scope

- File editing/saving (read-only viewer)
- PowerPoint (.pptx) rendering
- Video/audio file playback
- File download functionality
- Drag-and-drop file upload to the viewer
- Server-side file conversion or processing
