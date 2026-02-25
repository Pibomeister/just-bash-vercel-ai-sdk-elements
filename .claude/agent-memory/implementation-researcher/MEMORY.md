# Implementation Researcher Memory

## Project Stack
- Next.js 16.1.6, React 19.2.3, TypeScript (strict), Tailwind CSS 4, pnpm
- shadcn/ui (New York style, stone base color, OKLch)
- AI SDK v6, just-bash (simulated bash - base64 virtual filesystem)

## Document Viewer Libraries (Researched 2026-02-14)
- See `doc-viewer-research.md` for full details
- react-pdf v10.3.0: Supports React 19, needs dynamic import in Next.js App Router
- mammoth v1.11.0: DOCX->HTML, browser input is {arrayBuffer: ArrayBuffer}
- docx-preview v0.3.7: Better visual fidelity than mammoth, renderAsync(data, container)
- SheetJS (xlsx) v0.18.5: Not updated in 4 years on npm, but docs site is active. Use read(b64, {type:"base64"})
- react-zoom-pan-pinch v3.7.0: TransformWrapper + TransformComponent pattern
- @react-pdf-viewer/core: NOT compatible with React 19 (open issue #1869), avoid
- @cyntler/react-doc-viewer: ABANDONED by maintainer, avoid
- papaparse v5.5.3: Best CSV parser, zero dependencies
