# Web Researcher Memory

## AI SDK v6 Key Patterns (Feb 2026)

### File Attachment Handling
- `toModelOutput` function separates tool results from what's sent to the model
- Return complete data in `execute`, use `toModelOutput` to control tokens sent back
- Helps avoid sending thousands of unnecessary tokens for file contents or binary data
- Optional conversion function maps tool result to multi-modal content parts
- Content parts have `type` (e.g., 'text', 'image') and corresponding data

### Known Issues
- Bedrock provider has reported issues with "file" parts (Jan 2026 issue #11518)
- Migration from v5 to v6 is straightforward with `npx @ai-sdk/codemod v6`

## Document Viewer Libraries (2025-2026)

### react-pdf
- **React 19**: Compatible with React 16.8+, 17, 18, and 19 (since v4.1.0)
- **Next.js 16**: Compatible, requires Next.js 14.1.1+ (prior versions had server crash bug)
- **SSR**: Must use dynamic import with `ssr: false` (relies on browser APIs)
- **Worker**: Set `workerSrc` in same module as components (not separate file)
- **Pattern**: Three-layer architecture (PDFViewerClient → PDFViewer wrapper → page)

### DOCX Rendering
- **mammoth.js**: Converts .docx to HTML, semantic HTML output, works server + client
- **docx-preview**: Better styling support (text color, background, fonts) than mammoth
- **Recommendation**: docx-preview.js preferred for browser rendering quality
- Both work with FileReader API for client-side ArrayBuffer conversion

### Excel/Spreadsheet
- **SheetJS (xlsx)**: Industry standard, actively maintained 2025+
- Use `read()` + `utils.sheet_to_json()` to convert to arrays of objects
- Render as HTML tables or integrate with react-data-grid
- x-spreadsheet for interactive editing capabilities

### Universal Document Viewers
- **@iamjariwala/react-doc-viewer**: 20+ file types, annotations, TypeScript support
- **@cyntler/react-doc-viewer**: Maintained fork, requires public URLs (uses MS Office iframe)
- **Nutrient Web SDK**: Commercial, comprehensive (PDF, Office, images)
- **react-file-viewer**: Open-source, extensible driver architecture

### Base64 Image Rendering
- Regular `<img src="data:image/png;base64,..." />` works in React/Next.js
- Next.js Image component does NOT support data URIs (throws hostname error)
- Base64 images not cached by browser, best for small icons
- For large files, convert base64 → Blob → object URL for better performance

## AI Chat UI Patterns

### File Preview in Chat
- ChatGPT: Fullscreen document viewer with table of contents, citations, side panel
- Claude: Upload paperclip icon, Artifacts feature for code preview
- ChatPDF: Side-by-side interface, clickable citations scroll to source

### Component Architecture
- **AI SDK RSC**: `streamUI` with React Server Components for generative UI
- **Tool-based generation**: Tools return React components, streamed to client
- **Composition pattern**: Radix-style primitives (assistant-ui), not monolithic
- **File attachments**: PromptInput with compound components, PromptInputMessage type

### shadcn/ui Integration
- Dialog component ideal for file previews (zoom, fullscreen, navigation)
- File uploader: react-dropzone + Zod validation + preview property
- Image preview blocks available at shadcn.io/blocks
- Accept prop for MIME type restrictions: `accept={{ 'image/png': ['.png'] }}`

## MIME Type Detection
- Access `file.type` property from File objects
- `file-type` module reads first bytes (not extension-based)
- `mime-types` package: `mime.lookup('json')` → `'application/json'`
- react-doc-viewer uses `fileTypes` array for renderer matching

## LlamaParse SDK (2026)

### Header/Footer Removal
- **`do_not_output_page_header`** (bool): Removes headers from markdown output
- **`do_not_output_page_footer`** (bool): Removes footers from markdown output
- Removed content available in JSON via `pageHeaderMarkdown`/`pageFooterMarkdown`
- **Not available in Fast mode** - requires Balanced/Premium (v1) or Agentic tiers (v2)

### Region Selection (Bounding Box)
- **`bbox_top`**, **`bbox_bottom`**, **`bbox_left`**, **`bbox_right`** (0-1 ratios)
- Alternative approach to exclude header/footer regions
- Values normalized relative to page dimensions

### Page Separators
- **`page_separator`** (string): Default `\n---\n`
- Supports `{pageNumber}` or `{page_number}` placeholder
- Related: `pagePrefix`, `pageSuffix` with same placeholder support

### Parsing Instructions (Deprecated)
- **`parsing_instruction`** (string): Natural language instructions
- Example: "Remove headers and footers"
- **v1 only** - v2 uses prompts in `agentic_options` instead
- Three types: `formatting_instruction`, `complemental_formatting_instruction`, `content_guideline_instruction`

### API v2 Tiers (Current)
- **Fast**: No LLM, fastest, no header/footer detection
- **Cost Effective**: Budget-optimized structured output
- **Agentic**: High accuracy with reasoning
- **Agentic Plus**: Maximum accuracy for complex documents

### Other Parameters
- **`skip_diagonal_text`** (bool): Ignore text not rotated 0/90/180/270°
- **`merge_tables_across_pages`** (bool): Side effect removes headers/footers
- **`do_not_unroll_columns`** (bool): Prevent column reordering
- **`split_by_page`** (bool): One document per page
- **`invalidate_cache`** (bool): Force re-parse
- **`do_not_cache`** (bool): Skip caching
