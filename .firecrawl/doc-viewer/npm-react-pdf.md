⚠️

**Security Update**: Classic tokens have been revoked. Granular tokens are now limited to 90 days and require 2FA by default. Update your CI/CD workflows to avoid disruption. [Learn more](https://gh.io/all-npm-classic-tokens-revoked).

×

# react-pdf  ![TypeScript icon, indicating that this package has built-in type declarations](https://static-production.npmjs.com/4a2a680dfcadf231172b78b1d3beb975.svg)

10.3.0 • Public • Published a month ago

- [Readme](https://www.npmjs.com/package/react-pdf?activeTab=readme)
- [Code Beta](https://www.npmjs.com/package/react-pdf?activeTab=code)
- [8 Dependencies](https://www.npmjs.com/package/react-pdf?activeTab=dependencies)
- [1022 Dependents](https://www.npmjs.com/package/react-pdf?activeTab=dependents)
- [153 Versions](https://www.npmjs.com/package/react-pdf?activeTab=versions)

[![npm](https://img.shields.io/npm/v/react-pdf.svg)](https://www.npmjs.com/package/react-pdf)[![downloads](https://img.shields.io/npm/dt/react-pdf.svg)](https://camo.githubusercontent.com/7c1768f27ab95ded49bdd5399a8e0402624dae9d1afc26027b0dfa7fc5219089/68747470733a2f2f696d672e736869656c64732e696f2f6e706d2f64742f72656163742d7064662e737667)[![CI](https://github.com/wojtekmaj/react-pdf/actions/workflows/ci.yml/badge.svg)](https://github.com/wojtekmaj/react-pdf/actions)

# React-PDF

[Permalink: React-PDF](https://www.npmjs.com/package/react-pdf#react-pdf)

Display PDFs in your React app as easily as if they were images.

## Lost?

[Permalink: Lost?](https://www.npmjs.com/package/react-pdf#lost)

This package is used to _display_ existing PDFs. If you wish to _create_ PDFs using React, you may be looking for [@react-pdf/renderer](https://www.npmjs.com/package/@react-pdf/renderer).

## tl;dr

[Permalink: tl;dr](https://www.npmjs.com/package/react-pdf#tldr)

- Install by executing `npm install react-pdf` or `yarn add react-pdf`.
- Import by adding `import { Document } from 'react-pdf'`.
- Use by adding `<Document file="..." />`. `file` can be a URL, base64 content, Uint8Array, and more.
- Put `<Page />` components inside `<Document />` to render pages.
- Import stylesheets for [annotations](https://www.npmjs.com/package/react-pdf#support-for-annotations) and [text layer](https://www.npmjs.com/package/react-pdf#support-for-text-layer) if applicable.

## Demo

[Permalink: Demo](https://www.npmjs.com/package/react-pdf#demo)

A minimal demo page can be found in `sample` directory.

[Online demo](https://projects.wojtekmaj.pl/react-pdf/) is also available!

## Before you continue

[Permalink: Before you continue](https://www.npmjs.com/package/react-pdf#before-you-continue)

React-PDF is under constant development. This documentation is written for React-PDF 10.x branch. If you want to see documentation for other versions of React-PDF, use dropdown on top of GitHub page to switch to an appropriate tag. Here are quick links to the newest docs from each branch:

- [v9.x](https://github.com/wojtekmaj/react-pdf/blob/v9.x/packages/react-pdf/README.md)
- [v8.x](https://github.com/wojtekmaj/react-pdf/blob/v8.x/packages/react-pdf/README.md)
- [v7.x](https://github.com/wojtekmaj/react-pdf/blob/v7.x/packages/react-pdf/README.md)
- [v6.x](https://github.com/wojtekmaj/react-pdf/blob/v6.x/README.md)
- [v5.x](https://github.com/wojtekmaj/react-pdf/blob/v5.x/README.md)
- [v4.x](https://github.com/wojtekmaj/react-pdf/blob/v4.x/README.md)
- [v3.x](https://github.com/wojtekmaj/react-pdf/blob/v3.x/README.md)
- [v2.x](https://github.com/wojtekmaj/react-pdf/blob/v2.x/README.md)
- [v1.x](https://github.com/wojtekmaj/react-pdf/blob/v1.x/README.md)

## Getting started

[Permalink: Getting started](https://www.npmjs.com/package/react-pdf#getting-started)

### Compatibility

[Permalink: Compatibility](https://www.npmjs.com/package/react-pdf#compatibility)

#### Browser support

[Permalink: Browser support](https://www.npmjs.com/package/react-pdf#browser-support)

React-PDF supports the latest versions of all major modern browsers.

Browser compatibility for React-PDF primarily depends on PDF.js support. For details, refer to the [PDF.js documentation](https://github.com/mozilla/pdf.js/wiki/Frequently-Asked-Questions#faq-support).

You may extend the list of supported browsers by providing additional polyfills (e.g. `Array.prototype.at`, `Promise.allSettled` or `Promise.withResolvers`) and configuring your bundler to transpile `pdfjs-dist`.

#### React

[Permalink: React](https://www.npmjs.com/package/react-pdf#react)

To use the latest version of React-PDF, your project needs to use React 16.8 or later.

#### Preact

[Permalink: Preact](https://www.npmjs.com/package/react-pdf#preact)

React-PDF may be used with Preact.

### Installation

[Permalink: Installation](https://www.npmjs.com/package/react-pdf#installation)

Add React-PDF to your project by executing `npm install react-pdf` or `yarn add react-pdf`.

#### Next.js

[Permalink: Next.js](https://www.npmjs.com/package/react-pdf#nextjs)

If you use Next.js prior to v15 (v15.0.0-canary.53, specifically), you may need to add the following to your `next.config.js`:

```
module.exports = {
+ swcMinify: false,
}
```

### Configure PDF.js worker

[Permalink: Configure PDF.js worker](https://www.npmjs.com/package/react-pdf#configure-pdfjs-worker)

For React-PDF to work, PDF.js worker needs to be provided. You have several options.

#### Import worker (recommended)

[Permalink: Import worker (recommended)](https://www.npmjs.com/package/react-pdf#import-worker-recommended)

For most cases, the following example will work:

```
import { pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();
```

> \[!WARNING\]
> The `workerSrc` must be set in the **same module** where you use React-PDF components (e.g., `<Document>`, `<Page>`). Setting it in a separate file like `main.tsx` and then importing React-PDF in another component may cause the default value to overwrite your custom setting due to module execution order. Always configure the worker in the file where you render the PDF components.

> \[!NOTE\]
> In Next.js, make sure to skip SSR when importing the module you're using this code in. Here's how to do this in [Pages Router](https://nextjs.org/docs/pages/guides/lazy-loading#with-no-ssr) and [App Router](https://nextjs.org/docs/app/guides/lazy-loading#skipping-ssr).

> \[!NOTE\]
> pnpm requires an `.npmrc` file with `public-hoist-pattern[]=pdfjs-dist` for this to work.

See more examples

##### Parcel 2

[Permalink: Parcel 2](https://www.npmjs.com/package/react-pdf#parcel-2)

For Parcel 2, you need to use a slightly different code:

```
 pdfjs.GlobalWorkerOptions.workerSrc = new URL(
-  'pdfjs-dist/build/pdf.worker.min.mjs',
+  'npm:pdfjs-dist/build/pdf.worker.min.mjs',
   import.meta.url,
 ).toString();
```

#### Copy worker to public directory

[Permalink: Copy worker to public directory](https://www.npmjs.com/package/react-pdf#copy-worker-to-public-directory)

You will have to make sure on your own that `pdf.worker.mjs` file from `pdfjs-dist/build` is copied to your project's output folder.

For example, you could use a custom script like:

```
import path from 'node:path';
import fs from 'node:fs';

const pdfjsDistPath = path.dirname(require.resolve('pdfjs-dist/package.json'));
const pdfWorkerPath = path.join(pdfjsDistPath, 'build', 'pdf.worker.mjs');

fs.cpSync(pdfWorkerPath, './dist/pdf.worker.mjs', { recursive: true });
```

#### Use external CDN

[Permalink: Use external CDN](https://www.npmjs.com/package/react-pdf#use-external-cdn)

```
import { pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
```

> \[!WARNING\]
> The `workerSrc` must be set in the **same module** where you use React-PDF components (e.g., `<Document>`, `<Page>`). Setting it in a separate file like `main.tsx` and then importing React-PDF in another component may cause the default value to overwrite your custom setting due to module execution order. Always configure the worker in the file where you render the PDF components.

### Usage

[Permalink: Usage](https://www.npmjs.com/package/react-pdf#usage)

Here's an example of basic usage:

```
import { useState } from 'react';
import { Document, Page } from 'react-pdf';

function MyApp() {
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState<number>(1);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
    setNumPages(numPages);
  }

  return (
    <div>
      <Document file="somefile.pdf" onLoadSuccess={onDocumentLoadSuccess}>
        <Page pageNumber={pageNumber} />
      </Document>
      <p>
        Page {pageNumber} of {numPages}
      </p>
    </div>
  );
}
```

Check the [sample directory](https://github.com/wojtekmaj/react-pdf/tree/main/sample) in this repository for a full working example. For more examples and more advanced use cases, check [Recipes](https://github.com/wojtekmaj/react-pdf/wiki/Recipes) in [React-PDF Wiki](https://github.com/wojtekmaj/react-pdf/wiki/).

### Support for annotations

[Permalink: Support for annotations](https://www.npmjs.com/package/react-pdf#support-for-annotations)

If you want to use annotations (e.g. links) in PDFs rendered by React-PDF, then you would need to include stylesheet necessary for annotations to be correctly displayed like so:

```
import 'react-pdf/dist/Page/AnnotationLayer.css';
```

### Support for text layer

[Permalink: Support for text layer](https://www.npmjs.com/package/react-pdf#support-for-text-layer)

If you want to use text layer in PDFs rendered by React-PDF, then you would need to include stylesheet necessary for text layer to be correctly displayed like so:

```
import 'react-pdf/dist/Page/TextLayer.css';
```

### Support for non-latin characters

[Permalink: Support for non-latin characters](https://www.npmjs.com/package/react-pdf#support-for-non-latin-characters)

If you want to ensure that PDFs with non-latin characters will render perfectly, or you have encountered the following warning:

```
Warning: The CMap "baseUrl" parameter must be specified, ensure that the "cMapUrl" and "cMapPacked" API parameters are provided.
```

then you would also need to include cMaps in your build and tell React-PDF where they are.

#### Copying cMaps

[Permalink: Copying cMaps](https://www.npmjs.com/package/react-pdf#copying-cmaps)

First, you need to copy cMaps from `pdfjs-dist` (React-PDF's dependency - it should be in your `node_modules` if you have React-PDF installed). cMaps are located in `pdfjs-dist/cmaps`.

##### Vite

[Permalink: Vite](https://www.npmjs.com/package/react-pdf#vite)

Add [`vite-plugin-static-copy`](https://www.npmjs.com/package/vite-plugin-static-copy) by executing `npm install vite-plugin-static-copy --save-dev` or `yarn add vite-plugin-static-copy --dev` and add the following to your Vite config:

```
+import path from 'node:path';
+import { createRequire } from 'node:module';

-import { defineConfig } from 'vite';
+import { defineConfig, normalizePath } from 'vite';
+import { viteStaticCopy } from 'vite-plugin-static-copy';

+const require = createRequire(import.meta.url);
+
+const pdfjsDistPath = path.dirname(require.resolve('pdfjs-dist/package.json'));
+const cMapsDir = normalizePath(path.join(pdfjsDistPath, 'cmaps'));

export default defineConfig({
  plugins: [\
+   viteStaticCopy({\
+     targets: [\
+       {\
+         src: cMapsDir,\
+         dest: '',\
+       },\
+     ],\
+   }),\
  ]
});
```

##### Webpack

[Permalink: Webpack](https://www.npmjs.com/package/react-pdf#webpack)

Add [`copy-webpack-plugin`](https://www.npmjs.com/package/copy-webpack-plugin) by executing `npm install copy-webpack-plugin --save-dev` or `yarn add copy-webpack-plugin --dev` and add the following to your Webpack config:

```
+import path from 'node:path';
+import CopyWebpackPlugin from 'copy-webpack-plugin';

+const pdfjsDistPath = path.dirname(require.resolve('pdfjs-dist/package.json'));
+const cMapsDir = path.join(pdfjsDistPath, 'cmaps');

module.exports = {
  plugins: [\
+   new CopyWebpackPlugin({\
+     patterns: [\
+       {\
+         from: cMapsDir,\
+         to: 'cmaps/'\
+       },\
+     ],\
+   }),\
  ],
};
```

##### Other tools

[Permalink: Other tools](https://www.npmjs.com/package/react-pdf#other-tools)

If you use other bundlers, you will have to make sure on your own that cMaps are copied to your project's output folder.

For example, you could use a custom script like:

```
import path from 'node:path';
import fs from 'node:fs';

const pdfjsDistPath = path.dirname(require.resolve('pdfjs-dist/package.json'));
const cMapsDir = path.join(pdfjsDistPath, 'cmaps');

fs.cpSync(cMapsDir, 'dist/cmaps/', { recursive: true });
```

#### Setting up React-PDF

[Permalink: Setting up React-PDF](https://www.npmjs.com/package/react-pdf#setting-up-react-pdf)

Now that you have cMaps in your build, pass required options to Document component by using `options` prop, like so:

```
// Outside of React component
const options = {
  cMapUrl: '/cmaps/',
};

// Inside of React component
<Document options={options} />;
```

> \[!NOTE\]
> Make sure to define `options` object outside of your React component or use `useMemo` if you can't.

Alternatively, you could use cMaps from external CDN:

```
// Outside of React component
import { pdfjs } from 'react-pdf';

const options = {
  cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
};

// Inside of React component
<Document options={options} />;
```

### Support for JPEG 2000

[Permalink: Support for JPEG 2000](https://www.npmjs.com/package/react-pdf#support-for-jpeg-2000)

If you want to ensure that JPEG 2000 images in PDFs will render, or you have encountered the following warning:

```
Warning: Unable to decode image "img_p0_1": "JpxError: OpenJPEG failed to initialize".
```

then you would also need to include wasm directory in your build and tell React-PDF where it is.

#### Copying wasm directory

[Permalink: Copying wasm directory](https://www.npmjs.com/package/react-pdf#copying-wasm-directory)

First, you need to copy wasm from `pdfjs-dist` (React-PDF's dependency - it should be in your `node_modules` if you have React-PDF installed). cMaps are located in `pdfjs-dist/wasm`.

##### Vite

[Permalink: Vite](https://www.npmjs.com/package/react-pdf#vite-1)

Add [`vite-plugin-static-copy`](https://www.npmjs.com/package/vite-plugin-static-copy) by executing `npm install vite-plugin-static-copy --save-dev` or `yarn add vite-plugin-static-copy --dev` and add the following to your Vite config:

```
+import path from 'node:path';
+import { createRequire } from 'node:module';

-import { defineConfig } from 'vite';
+import { defineConfig, normalizePath } from 'vite';
+import { viteStaticCopy } from 'vite-plugin-static-copy';

+const require = createRequire(import.meta.url);
+
+const pdfjsDistPath = path.dirname(require.resolve('pdfjs-dist/package.json'));
+const wasmDir = normalizePath(path.join(pdfjsDistPath, 'wasm'));

export default defineConfig({
  plugins: [\
+   viteStaticCopy({\
+     targets: [\
+       {\
+         src: wasmDir,\
+         dest: '',\
+       },\
+     ],\
+   }),\
  ]
});
```

##### Webpack

[Permalink: Webpack](https://www.npmjs.com/package/react-pdf#webpack-1)

Add [`copy-webpack-plugin`](https://www.npmjs.com/package/copy-webpack-plugin) by executing `npm install copy-webpack-plugin --save-dev` or `yarn add copy-webpack-plugin --dev` and add the following to your Webpack config:

```
+import path from 'node:path';
+import CopyWebpackPlugin from 'copy-webpack-plugin';

+const pdfjsDistPath = path.dirname(require.resolve('pdfjs-dist/package.json'));
+const wasmDir = path.join(pdfjsDistPath, 'wasm');

module.exports = {
  plugins: [\
+   new CopyWebpackPlugin({\
+     patterns: [\
+       {\
+         from: wasmDir,\
+         to: 'wasm/'\
+       },\
+     ],\
+   }),\
  ],
};
```

##### Other tools

[Permalink: Other tools](https://www.npmjs.com/package/react-pdf#other-tools-1)

If you use other bundlers, you will have to make sure on your own that wasm directory is copied to your project's output folder.

For example, you could use a custom script like:

```
import path from 'node:path';
import fs from 'node:fs';

const pdfjsDistPath = path.dirname(require.resolve('pdfjs-dist/package.json'));
const wasmDir = path.join(pdfjsDistPath, 'wasm');

fs.cpSync(wasmDir, 'dist/wasm/', { recursive: true });
```

#### Setting up React-PDF

[Permalink: Setting up React-PDF](https://www.npmjs.com/package/react-pdf#setting-up-react-pdf-1)

Now that you have wasm directory in your build, pass required options to Document component by using `options` prop, like so:

```
// Outside of React component
const options = {
  wasmUrl: '/wasm/',
};

// Inside of React component
<Document options={options} />;
```

> \[!NOTE\]
> Make sure to define `options` object outside of your React component or use `useMemo` if you can't.

Alternatively, you could use wasm directory from external CDN:

```
// Outside of React component
import { pdfjs } from 'react-pdf';

const options = {
  wasmUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/wasm/`,
};

// Inside of React component
<Document options={options} />;
```

### Support for standard fonts

[Permalink: Support for standard fonts](https://www.npmjs.com/package/react-pdf#support-for-standard-fonts)

If you want to support PDFs using standard fonts (deprecated in PDF 1.5, but still around), or you have encountered the following warning:

```
The standard font "baseUrl" parameter must be specified, ensure that the "standardFontDataUrl" API parameter is provided.
```

then you would also need to include standard fonts in your build and tell React-PDF where they are.

#### Copying fonts

[Permalink: Copying fonts](https://www.npmjs.com/package/react-pdf#copying-fonts)

First, you need to copy standard fonts from `pdfjs-dist` (React-PDF's dependency - it should be in your `node_modules` if you have React-PDF installed). Standard fonts are located in `pdfjs-dist/standard_fonts`.

##### Vite

[Permalink: Vite](https://www.npmjs.com/package/react-pdf#vite-2)

Add [`vite-plugin-static-copy`](https://www.npmjs.com/package/vite-plugin-static-copy) by executing `npm install vite-plugin-static-copy --save-dev` or `yarn add vite-plugin-static-copy --dev` and add the following to your Vite config:

```
+import path from 'node:path';
+import { createRequire } from 'node:module';

-import { defineConfig } from 'vite';
+import { defineConfig, normalizePath } from 'vite';
+import { viteStaticCopy } from 'vite-plugin-static-copy';

+const require = createRequire(import.meta.url);
+const standardFontsDir = normalizePath(
+  path.join(path.dirname(require.resolve('pdfjs-dist/package.json')), 'standard_fonts')
+);

export default defineConfig({
  plugins: [\
+   viteStaticCopy({\
+     targets: [\
+       {\
+         src: standardFontsDir,\
+         dest: '',\
+       },\
+     ],\
+   }),\
  ]
});
```

##### Webpack

[Permalink: Webpack](https://www.npmjs.com/package/react-pdf#webpack-2)

Add [`copy-webpack-plugin`](https://www.npmjs.com/package/copy-webpack-plugin) by executing `npm install copy-webpack-plugin --save-dev` or `yarn add copy-webpack-plugin --dev` and add the following to your Webpack config:

```
+import path from 'node:path';
+import CopyWebpackPlugin from 'copy-webpack-plugin';

+const standardFontsDir = path.join(path.dirname(require.resolve('pdfjs-dist/package.json')), 'standard_fonts');

module.exports = {
  plugins: [\
+   new CopyWebpackPlugin({\
+     patterns: [\
+       {\
+         from: standardFontsDir,\
+         to: 'standard_fonts/'\
+       },\
+     ],\
+   }),\
  ],
};
```

##### Other tools

[Permalink: Other tools](https://www.npmjs.com/package/react-pdf#other-tools-2)

If you use other bundlers, you will have to make sure on your own that standard fonts are copied to your project's output folder.

For example, you could use a custom script like:

```
import path from 'node:path';
import fs from 'node:fs';

const pdfjsDistPath = path.dirname(require.resolve('pdfjs-dist/package.json'));
const standardFontsDir = path.join(pdfjsDistPath, 'standard_fonts');

fs.cpSync(standardFontsDir, 'dist/standard_fonts/', { recursive: true });
```

#### Setting up React-PDF

[Permalink: Setting up React-PDF](https://www.npmjs.com/package/react-pdf#setting-up-react-pdf-2)

Now that you have standard fonts in your build, pass required options to Document component by using `options` prop, like so:

```
// Outside of React component
const options = {
  standardFontDataUrl: '/standard_fonts/',
};

// Inside of React component
<Document options={options} />;
```

> \[!NOTE\]
> Make sure to define `options` object outside of your React component or use `useMemo` if you can't.

Alternatively, you could use standard fonts from external CDN:

```
// Outside of React component
import { pdfjs } from 'react-pdf';

const options = {
  standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
};

// Inside of React component
<Document options={options} />;
```

## User guide

[Permalink: User guide](https://www.npmjs.com/package/react-pdf#user-guide)

### Document

[Permalink: Document](https://www.npmjs.com/package/react-pdf#document)

Loads a document passed using `file` prop.

#### Props

[Permalink: Props](https://www.npmjs.com/package/react-pdf#props)

| Prop name | Description | Default value | Example values |
| --- | --- | --- | --- |
| className | Class name(s) that will be added to rendered element along with the default `react-pdf__Document`. | n/a | - String:<br>  <br>  `"custom-class-name-1 custom-class-name-2"`<br>- Array of strings:<br>  <br>  `["custom-class-name-1", "custom-class-name-2"]` |
| error | What the component should display in case of an error. | `"Failed to load PDF file."` | - String:<br>  <br>  `"An error occurred!"`<br>- React element:<br>  <br>  `<p>An error occurred!</p>`<br>- Function:<br>  <br>  `this.renderError` |
| externalLinkRel | Link rel for links rendered in annotations. | `"noopener noreferrer nofollow"` | One of valid [values for `rel` attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#attr-rel).<br>- `"noopener"`<br>- `"noreferrer"`<br>- `"nofollow"`<br>- `"noopener noreferrer"` |
| externalLinkTarget | Link target for external links rendered in annotations. | unset, which means that default behavior will be used | One of valid [values for `target` attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#attr-target).<br>- `"_self"`<br>- `"_blank"`<br>- `"_parent"`<br>- `"_top"` |
| file | What PDF should be displayed.<br>Its value can be an URL, a file (imported using `import … from …` or from file input form element), or an object with parameters (`url` \- URL; `data` \- data, preferably Uint8Array; `range` \- PDFDataRangeTransport.<br>**Warning**: Since equality check (`===`) is used to determine if `file` object has changed, it must be memoized by setting it in component's state, `useMemo` or other similar technique. | n/a | - URL:<br>  <br>  `"https://example.com/sample.pdf"`<br>- File:<br>  <br>  `import importedPdf from '../static/sample.pdf'` and then<br>  <br>  `sample`<br>- Parameter object:<br>  <br>  `{ url: 'https://example.com/sample.pdf' }` |
| imageResourcesPath | The path used to prefix the src attributes of annotation SVGs. | n/a (pdf.js will fallback to an empty string) | `"/public/images/"` |
| inputRef | A prop that behaves like [ref](https://reactjs.org/docs/refs-and-the-dom.html), but it's passed to main `<div>` rendered by `<Document>` component. | n/a | - Function:<br>  <br>  `(ref) => { this.myDocument = ref; }`<br>- Ref created using `createRef`:<br>  <br>  `this.ref = createRef();`<br>  <br>  …<br>  <br>  `inputRef={this.ref}`<br>- Ref created using `useRef`:<br>  <br>  `const ref = useRef();`<br>  <br>  …<br>  <br>  `inputRef={ref}` |
| loading | What the component should display while loading. | `"Loading PDF…"` | - String:<br>  <br>  `"Please wait!"`<br>- React element:<br>  <br>  `<p>Please wait!</p>`<br>- Function:<br>  <br>  `this.renderLoader` |
| noData | What the component should display in case of no data. | `"No PDF file specified."` | - String:<br>  <br>  `"Please select a file."`<br>- React element:<br>  <br>  `<p>Please select a file.</p>`<br>- Function:<br>  <br>  `this.renderNoData` |
| onItemClick | Function called when an outline item or a thumbnail has been clicked. Usually, you would like to use this callback to move the user wherever they requested to. | n/a | `({ dest, pageIndex, pageNumber }) => alert('Clicked an item from page ' + pageNumber + '!')` |
| onLoadError | Function called in case of an error while loading a document. | n/a | `(error) => alert('Error while loading document! ' + error.message)` |
| onLoadProgress | Function called, potentially multiple times, as the loading progresses. | n/a | `({ loaded, total }) => alert('Loading a document: ' + (loaded / total) * 100 + '%')` |
| onLoadSuccess | Function called when the document is successfully loaded. | n/a | `(pdf) => alert('Loaded a file with ' + pdf.numPages + ' pages!')` |
| onPassword | Function called when a password-protected PDF is loaded. | Function that prompts the user for password. | `(callback) => callback('s3cr3t_p4ssw0rd')` |
| onSourceError | Function called in case of an error while retrieving document source from `file` prop. | n/a | `(error) => alert('Error while retrieving document source! ' + error.message)` |
| onSourceSuccess | Function called when document source is successfully retrieved from `file` prop. | n/a | `() => alert('Document source retrieved!')` |
| options | An object in which additional parameters to be passed to PDF.js can be defined. Most notably:<br>- `cMapUrl`;<br>- `httpHeaders` \- custom request headers, e.g. for authorization);<br>- `withCredentials` \- a boolean to indicate whether or not to include cookies in the request (defaults to `false`)<br>For a full list of possible parameters, check [PDF.js documentation on DocumentInitParameters](https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib.html#~DocumentInitParameters).<br>**Note**: Make sure to define options object outside of your React component or use `useMemo` if you can't. | n/a | `{ cMapUrl: '/cmaps/' }` |
| renderMode | Rendering mode of the document. Can be `"canvas"`, `"custom"` or `"none"`. If set to `"custom"`, `customRenderer` must also be provided. | `"canvas"` | `"custom"` |
| rotate | Rotation of the document in degrees. If provided, will change rotation globally, even for the pages which were given `rotate` prop of their own. `90` = rotated to the right, `180` = upside down, `270` = rotated to the left. | n/a | `90` |
| scale | Document scale. | `1` | `0.5` |

### Page

[Permalink: Page](https://www.npmjs.com/package/react-pdf#page)

Displays a page. Should be placed inside `<Document />`. Alternatively, it can have `pdf` prop passed, which can be obtained from `<Document />`'s `onLoadSuccess` callback function, however some advanced functions like rendering annotations and linking between pages inside a document may not be working correctly.

#### Props

[Permalink: Props](https://www.npmjs.com/package/react-pdf#props-1)

| Prop name | Description | Default value | Example values |
| --- | --- | --- | --- |
| canvasBackground | Canvas background color. Any valid `canvas.fillStyle` can be used. | n/a | `"transparent"` |
| canvasRef | A prop that behaves like [ref](https://reactjs.org/docs/refs-and-the-dom.html), but it's passed to `<canvas>` rendered by `<Canvas>` component. | n/a | - Function:<br>  <br>  `(ref) => { this.myCanvas = ref; }`<br>- Ref created using `createRef`:<br>  <br>  `this.ref = createRef();`<br>  <br>  …<br>  <br>  `inputRef={this.ref}`<br>- Ref created using `useRef`:<br>  <br>  `const ref = useRef();`<br>  <br>  …<br>  <br>  `inputRef={ref}` |
| className | Class name(s) that will be added to rendered element along with the default `react-pdf__Page`. | n/a | - String:<br>  <br>  `"custom-class-name-1 custom-class-name-2"`<br>- Array of strings:<br>  <br>  `["custom-class-name-1", "custom-class-name-2"]` |
| customRenderer | Function that customizes how a page is rendered. You must set `renderMode` to `"custom"` to use this prop. | n/a | `MyCustomRenderer` |
| customTextRenderer | Function that customizes how a text layer is rendered. | n/a | ``({ str, itemIndex }) => str.replace(/ipsum/g, value => `<mark>${value}</mark>`)`` |
| devicePixelRatio | The ratio between physical pixels and device-independent pixels (DIPs) on the current device. | `window.devicePixelRatio` | `1` |
| error | What the component should display in case of an error. | `"Failed to load the page."` | - String:<br>  <br>  `"An error occurred!"`<br>- React element:<br>  <br>  `<p>An error occurred!</p>`<br>- Function:<br>  <br>  `this.renderError` |
| filterAnnotations | Function to filter annotations before they are rendered. | n/a | `({ annotations }) => annotations.filter(annotation => annotation.subtype === 'Text')` |
| height | Page height. If neither `height` nor `width` are defined, page will be rendered at the size defined in PDF. If you define `width` and `height` at the same time, `height` will be ignored. If you define `height` and `scale` at the same time, the height will be multiplied by a given factor. | Page's default height | `300` |
| imageResourcesPath | The path used to prefix the src attributes of annotation SVGs. | n/a (pdf.js will fallback to an empty string) | `"/public/images/"` |
| inputRef | A prop that behaves like [ref](https://reactjs.org/docs/refs-and-the-dom.html), but it's passed to main `<div>` rendered by `<Page>` component. | n/a | - Function:<br>  <br>  `(ref) => { this.myPage = ref; }`<br>- Ref created using `createRef`:<br>  <br>  `this.ref = createRef();`<br>  <br>  …<br>  <br>  `inputRef={this.ref}`<br>- Ref created using `useRef`:<br>  <br>  `const ref = useRef();`<br>  <br>  …<br>  <br>  `inputRef={ref}` |
| loading | What the component should display while loading. | `"Loading page…"` | - String:<br>  <br>  `"Please wait!"`<br>- React element:<br>  <br>  `<p>Please wait!</p>`<br>- Function:<br>  <br>  `this.renderLoader` |
| noData | What the component should display in case of no data. | `"No page specified."` | - String:<br>  <br>  `"Please select a page."`<br>- React element:<br>  <br>  `<p>Please select a page.</p>`<br>- Function:<br>  <br>  `this.renderNoData` |
| onGetAnnotationsError | Function called in case of an error while loading annotations. | n/a | `(error) => alert('Error while loading annotations! ' + error.message)` |
| onGetAnnotationsSuccess | Function called when annotations are successfully loaded. | n/a | `(annotations) => alert('Now displaying ' + annotations.length + ' annotations!')` |
| onGetStructTreeError | Function called in case of an error while loading structure tree. | n/a | `(error) => alert('Error while loading structure tree! ' + error.message)` |
| onGetStructTreeSuccess | Function called when structure tree is successfully loaded. | n/a | `(structTree) => alert(JSON.stringify(structTree))` |
| onGetTextError | Function called in case of an error while loading text layer items. | n/a | `(error) => alert('Error while loading text layer items! ' + error.message)` |
| onGetTextSuccess | Function called when text layer items are successfully loaded. | n/a | `({ items, styles }) => alert('Now displaying ' + items.length + ' text layer items!')` |
| onLoadError | Function called in case of an error while loading the page. | n/a | `(error) => alert('Error while loading page! ' + error.message)` |
| onLoadSuccess | Function called when the page is successfully loaded. | n/a | `(page) => alert('Now displaying a page number ' + page.pageNumber + '!')` |
| onRenderAnnotationLayerError | Function called in case of an error while rendering the annotation layer. | n/a | `(error) => alert('Error while loading annotation layer! ' + error.message)` |
| onRenderAnnotationLayerSuccess | Function called when annotations are successfully rendered on the screen. | n/a | `() => alert('Rendered the annotation layer!')` |
| onRenderError | Function called in case of an error while rendering the page. | n/a | `(error) => alert('Error while loading page! ' + error.message)` |
| onRenderSuccess | Function called when the page is successfully rendered on the screen. | n/a | `() => alert('Rendered the page!')` |
| onRenderTextLayerError | Function called in case of an error while rendering the text layer. | n/a | `(error) => alert('Error while rendering text layer! ' + error.message)` |
| onRenderTextLayerSuccess | Function called when the text layer is successfully rendered on the screen. | n/a | `() => alert('Rendered the text layer!')` |
| pageIndex | Which page from PDF file should be displayed, by page index. Ignored if `pageNumber` prop is provided. | `0` | `1` |
| pageNumber | Which page from PDF file should be displayed, by page number. If provided, `pageIndex` prop will be ignored. | `1` | `2` |
| pdf | pdf object obtained from `<Document />`'s `onLoadSuccess` callback function. | (automatically obtained from parent `<Document />`) | `pdf` |
| renderAnnotationLayer | Whether annotations (e.g. links) should be rendered. | `true` | `false` |
| renderForms | Whether forms should be rendered. `renderAnnotationLayer` prop must be set to `true`. | `false` | `true` |
| renderMode | Rendering mode of the document. Can be `"canvas"`, `"custom"` or `"none"`. If set to `"custom"`, `customRenderer` must also be provided. | `"canvas"` | `"custom"` |
| renderTextLayer | Whether a text layer should be rendered. | `true` | `false` |
| rotate | Rotation of the page in degrees. `90` = rotated to the right, `180` = upside down, `270` = rotated to the left. | Page's default setting, usually `0` | `90` |
| scale | Page scale. | `1` | `0.5` |
| width | Page width. If neither `height` nor `width` are defined, page will be rendered at the size defined in PDF. If you define `width` and `height` at the same time, `height` will be ignored. If you define `width` and `scale` at the same time, the width will be multiplied by a given factor. | Page's default width | `300` |

### Outline

[Permalink: Outline](https://www.npmjs.com/package/react-pdf#outline)

Displays an outline (table of contents). Should be placed inside `<Document />`. Alternatively, it can have `pdf` prop passed, which can be obtained from `<Document />`'s `onLoadSuccess` callback function.

#### Props

[Permalink: Props](https://www.npmjs.com/package/react-pdf#props-2)

| Prop name | Description | Default value | Example values |
| --- | --- | --- | --- |
| className | Class name(s) that will be added to rendered element along with the default `react-pdf__Outline`. | n/a | - String:<br>  <br>  `"custom-class-name-1 custom-class-name-2"`<br>- Array of strings:<br>  <br>  `["custom-class-name-1", "custom-class-name-2"]` |
| inputRef | A prop that behaves like [ref](https://reactjs.org/docs/refs-and-the-dom.html), but it's passed to main `<div>` rendered by `<Outline>` component. | n/a | - Function:<br>  <br>  `(ref) => { this.myOutline = ref; }`<br>- Ref created using `createRef`:<br>  <br>  `this.ref = createRef();`<br>  <br>  …<br>  <br>  `inputRef={this.ref}`<br>- Ref created using `useRef`:<br>  <br>  `const ref = useRef();`<br>  <br>  …<br>  <br>  `inputRef={ref}` |
| onItemClick | Function called when an outline item has been clicked. Usually, you would like to use this callback to move the user wherever they requested to. | n/a | `({ dest, pageIndex, pageNumber }) => alert('Clicked an item from page ' + pageNumber + '!')` |
| onLoadError | Function called in case of an error while retrieving the outline. | n/a | `(error) => alert('Error while retrieving the outline! ' + error.message)` |
| onLoadSuccess | Function called when the outline is successfully retrieved. | n/a | `(outline) => alert('The outline has been successfully retrieved.')` |

### Thumbnail

[Permalink: Thumbnail](https://www.npmjs.com/package/react-pdf#thumbnail)

Displays a thumbnail of a page. Does not render the annotation layer or the text layer. Does not register itself as a link target, so the user will not be scrolled to a Thumbnail component when clicked on an internal link (e.g. in Table of Contents). When clicked, attempts to navigate to the page clicked (similarly to a link in Outline). Should be placed inside `<Document />`. Alternatively, it can have `pdf` prop passed, which can be obtained from `<Document />`'s `onLoadSuccess` callback function.

#### Props

[Permalink: Props](https://www.npmjs.com/package/react-pdf#props-3)

Props are the same as in `<Page />` component, but certain annotation layer and text layer-related props are not available:

- customTextRenderer
- onGetAnnotationsError
- onGetAnnotationsSuccess
- onGetTextError
- onGetTextSuccess
- onRenderAnnotationLayerError
- onRenderAnnotationLayerSuccess
- onRenderTextLayerError
- onRenderTextLayerSuccess
- renderAnnotationLayer
- renderForms
- renderTextLayer

On top of that, additional props are available:

| Prop name | Description | Default value | Example values |
| --- | --- | --- | --- |
| className | Class name(s) that will be added to rendered element along with the default `react-pdf__Thumbnail`. | n/a | - String:<br>  <br>  `"custom-class-name-1 custom-class-name-2"`<br>- Array of strings:<br>  <br>  `["custom-class-name-1", "custom-class-name-2"]` |
| onItemClick | Function called when a thumbnail has been clicked. Usually, you would like to use this callback to move the user wherever they requested to. | n/a | `({ dest, pageIndex, pageNumber }) => alert('Clicked an item from page ' + pageNumber + '!')` |

## Useful links

[Permalink: Useful links](https://www.npmjs.com/package/react-pdf#useful-links)

- [React-PDF Wiki](https://github.com/wojtekmaj/react-pdf/wiki/)

## License

[Permalink: License](https://www.npmjs.com/package/react-pdf#license)

The MIT License.

## Author

[Permalink: Author](https://www.npmjs.com/package/react-pdf#author)

|     |     |
| --- | --- |
| [![Wojciech Maj](https://avatars.githubusercontent.com/u/5426427?v=4&s=128)](https://avatars.githubusercontent.com/u/5426427?v=4&s=128) | [Wojciech Maj](https://github.com/wojtekmaj) |

## Thank you

[Permalink: Thank you](https://www.npmjs.com/package/react-pdf#thank-you)

This project wouldn't be possible without the awesome work of [Niklas Närhinen](https://github.com/nnarhinen) who created its original version and without Mozilla, author of [pdf.js](http://mozilla.github.io/pdf.js). Thank you!

### Sponsors

[Permalink: Sponsors](https://www.npmjs.com/package/react-pdf#sponsors)

Thank you to all our sponsors! [Become a sponsor](https://opencollective.com/react-pdf-wojtekmaj#sponsor) and get your image on our README on GitHub.

[![](https://opencollective.com/react-pdf-wojtekmaj/sponsors.svg?width=890)](https://opencollective.com/react-pdf-wojtekmaj#sponsors)

### Backers

[Permalink: Backers](https://www.npmjs.com/package/react-pdf#backers)

Thank you to all our backers! [Become a backer](https://opencollective.com/react-pdf-wojtekmaj#backer) and get your image on our README on GitHub.

[![](https://opencollective.com/react-pdf-wojtekmaj/backers.svg?width=890)](https://opencollective.com/react-pdf-wojtekmaj#backers)

### Top Contributors

[Permalink: Top Contributors](https://www.npmjs.com/package/react-pdf#top-contributors)

Thank you to all our contributors that helped on this project!

[![Top Contributors](https://opencollective.com/react-pdf/contributors.svg?width=890&button=false)](https://camo.githubusercontent.com/28b89992a974e0608115dbfff1ffd40ad53748b50ee6d57a247038f75de4026c/68747470733a2f2f6f70656e636f6c6c6563746976652e636f6d2f72656163742d7064662f636f6e7472696275746f72732e7376673f77696474683d38393026627574746f6e3d66616c7365)

## Readme

### Keywords

- [pdf](https://www.npmjs.com/search?q=keywords:pdf)
- [pdf-viewer](https://www.npmjs.com/search?q=keywords:pdf-viewer)
- [react](https://www.npmjs.com/search?q=keywords:react)

Viewing react-pdf version 10.3.0