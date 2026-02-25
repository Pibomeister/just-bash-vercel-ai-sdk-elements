# SPEC-UI-001: Acceptance Criteria

## AC1: File Type Detection

### AC1.1: Code files detected correctly
**Given** a filepath ending in `.ts`, `.tsx`, `.js`, `.jsx`, `.json`, `.md`, `.py`, `.sh`, `.css`, `.html`, `.yml`, `.yaml`, `.toml`, `.sql`, `.rs`, `.go`, `.rb`, `.java`, or `.xml`
**When** `detectFileCategory(filepath)` is called
**Then** it returns `"code"`

### AC1.2: Image files detected correctly
**Given** a filepath ending in `.png`, `.jpg`, `.jpeg`, `.gif`, `.svg`, `.webp`, `.bmp`, or `.ico`
**When** `detectFileCategory(filepath)` is called
**Then** it returns `"image"`

### AC1.3: PDF files detected correctly
**Given** a filepath ending in `.pdf`
**When** `detectFileCategory(filepath)` is called
**Then** it returns `"pdf"`

### AC1.4: DOCX files detected correctly
**Given** a filepath ending in `.docx`
**When** `detectFileCategory(filepath)` is called
**Then** it returns `"docx"`

### AC1.5: Spreadsheet files detected correctly
**Given** a filepath ending in `.xlsx`, `.xls`, or `.csv`
**When** `detectFileCategory(filepath)` is called
**Then** it returns `"spreadsheet"`

### AC1.6: Unknown files handled
**Given** a filepath ending in `.unknown` or any unrecognized extension
**When** `detectFileCategory(filepath)` is called
**Then** it returns `"unknown"`

## AC2: DocumentViewer Dialog

### AC2.1: Dialog opens with content
**Given** the DocumentViewer provider's `open()` method is called with a file path and content
**When** the dialog renders
**Then** a fullscreen overlay appears with backdrop blur, showing the file content rendered by the appropriate renderer

### AC2.2: Dialog closes
**Given** the DocumentViewer dialog is open
**When** the user clicks the X button or presses Escape
**Then** the dialog closes and the overlay disappears

### AC2.3: Filename displayed
**Given** the DocumentViewer dialog is open with filepath `src/index.ts`
**When** the dialog header renders
**Then** the filename `src/index.ts` is displayed in the header

## AC3: Code Rendering

### AC3.1: Syntax highlighting in dialog
**Given** a `.ts` file is opened in the DocumentViewer
**When** the code renderer displays
**Then** the code has syntax highlighting via Shiki, line numbers are shown, and a copy button is available

### AC3.2: Code inline rendering preserved
**Given** the readFile tool returns a `.ts` file in the chat
**When** the inline preview renders
**Then** the existing CodeBlock rendering is preserved (no regression)

## AC4: Image Rendering

### AC4.1: Image displays in dialog
**Given** a `.png` file with base64 content is opened in the DocumentViewer
**When** the image renderer displays
**Then** the image is rendered centered in the dialog viewport with correct aspect ratio

### AC4.2: Image zoom works
**Given** an image is displayed in the DocumentViewer
**When** the user clicks zoom in
**Then** the image scale increases and can be panned

### AC4.3: Image zoom reset
**Given** a zoomed-in image in the DocumentViewer
**When** the user clicks the reset button
**Then** the image returns to its original scale and position

### AC4.4: Image inline preview
**Given** the readFile tool returns a `.png` file in the chat
**When** the inline preview renders
**Then** a thumbnail preview (max-height ~200px) is shown with an expand button

## AC5: PDF Rendering

### AC5.1: PDF displays in dialog
**Given** a `.pdf` file with base64 content is opened in the DocumentViewer
**When** the PDF renderer loads
**Then** the first page of the PDF is rendered

### AC5.2: PDF page navigation
**Given** a multi-page PDF is displayed in the DocumentViewer
**When** the user clicks "Next"
**Then** the next page is displayed and the page indicator updates

### AC5.3: PDF loading state
**Given** a PDF file is being loaded in the DocumentViewer
**When** the PDF is still loading
**Then** a shimmer/loading indicator is displayed

### AC5.4: PDF no SSR crash
**Given** the application is server-rendered
**When** the PDF renderer component is imported
**Then** no SSR errors occur (dynamic import with ssr: false)

## AC6: DOCX Rendering

### AC6.1: DOCX displays in dialog
**Given** a `.docx` file with base64 content is opened in the DocumentViewer
**When** the DOCX renderer processes the file
**Then** the document content is displayed as formatted HTML

### AC6.2: DOCX scrollable
**Given** a long DOCX document is displayed
**When** the content exceeds the viewport
**Then** the container is scrollable

### AC6.3: DOCX conversion error
**Given** a corrupted or invalid DOCX file
**When** the DOCX renderer attempts conversion
**Then** an error message is displayed instead of crashing

## AC7: Spreadsheet Rendering

### AC7.1: Excel displays in dialog
**Given** a `.xlsx` file with base64 content is opened in the DocumentViewer
**When** the spreadsheet renderer processes the file
**Then** the data is displayed as a styled HTML table with header row and alternating row colors

### AC7.2: CSV displays in dialog
**Given** a `.csv` file content is opened in the DocumentViewer
**When** the spreadsheet renderer processes the file
**Then** the parsed CSV data is displayed as a styled HTML table

### AC7.3: Multi-sheet navigation
**Given** an `.xlsx` file with multiple sheets
**When** sheet tabs are rendered
**Then** the user can switch between sheets and the table updates

### AC7.4: Spreadsheet horizontal scroll
**Given** a spreadsheet with many columns
**When** the table exceeds the viewport width
**Then** the table is horizontally scrollable

### AC7.5: Spreadsheet inline compact preview
**Given** the readFile tool returns a `.xlsx` file in the chat
**When** the inline preview renders
**Then** only the first 10 rows are shown with an expand button

## AC8: FileTree Click Integration

### AC8.1: File click opens viewer
**Given** a FileTree is displayed from a bash ls/find command output
**When** the user clicks on a file entry (not a folder)
**Then** the DocumentViewer dialog opens showing that file's content

### AC8.2: Folder click does not open viewer
**Given** a FileTree is displayed
**When** the user clicks on a folder entry
**Then** the DocumentViewer dialog does NOT open

### AC8.3: Loading state during file fetch
**Given** the user clicks a file in the FileTree
**When** the file content is being fetched from the sandbox
**Then** a loading indicator is shown in the dialog

## AC9: Expand Button

### AC9.1: Expand button visible on hover
**Given** a readFile tool result is displayed inline
**When** the user hovers over the inline preview
**Then** an expand button (Maximize2 icon) appears in the top-right corner

### AC9.2: Expand button opens dialog
**Given** the expand button is visible on a readFile inline preview
**When** the user clicks the expand button
**Then** the DocumentViewer dialog opens with the same file content

## AC10: Fallback Handling

### AC10.1: Unknown file type in dialog
**Given** a file with an unrecognized extension is opened in the DocumentViewer
**When** the renderer switch evaluates the file category
**Then** the raw text content is displayed, or a "Cannot preview this file type" message is shown

### AC10.2: Unknown file type inline
**Given** the readFile tool returns a file with an unknown extension
**When** the inline preview renders
**Then** it falls back to CodeBlock rendering (current behavior)
