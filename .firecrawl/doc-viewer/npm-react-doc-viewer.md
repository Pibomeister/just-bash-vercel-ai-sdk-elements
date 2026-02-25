⚠️

**Security Update**: Classic tokens have been revoked. Granular tokens are now limited to 90 days and require 2FA by default. Update your CI/CD workflows to avoid disruption. [Learn more](https://gh.io/all-npm-classic-tokens-revoked).

×

# @cyntler/react-doc-viewer  ![TypeScript icon, indicating that this package has built-in type declarations](https://static-production.npmjs.com/4a2a680dfcadf231172b78b1d3beb975.svg)

1.17.1 • Public • Published 5 months ago

- [Readme](https://www.npmjs.com/package/@cyntler/react-doc-viewer?activeTab=readme)
- [Code Beta](https://www.npmjs.com/package/@cyntler/react-doc-viewer?activeTab=code)
- [8 Dependencies](https://www.npmjs.com/package/@cyntler/react-doc-viewer?activeTab=dependencies)
- [76 Dependents](https://www.npmjs.com/package/@cyntler/react-doc-viewer?activeTab=dependents)
- [52 Versions](https://www.npmjs.com/package/@cyntler/react-doc-viewer?activeTab=versions)

[![npm-version](https://img.shields.io/npm/v/@cyntler/react-doc-viewer.svg)](https://www.npmjs.com/package/@cyntler/react-doc-viewer)[![npm-download](https://img.shields.io/npm/dt/@cyntler/react-doc-viewer.svg)](https://www.npmjs.com/package/@cyntler/react-doc-viewer)

## I am stopping work on this library

[Permalink: I am stopping work on this library](https://www.npmjs.com/package/@cyntler/react-doc-viewer#i-am-stopping-work-on-this-library)

> \[!WARNING\]
> **Due to lack of free time to develop this library, I am stopping work on this library.**
>
> **It will not be developed in the near future.**

# @cyntler/react-doc-viewer

[Permalink: @cyntler/react-doc-viewer](https://www.npmjs.com/package/@cyntler/react-doc-viewer#cyntlerreact-doc-viewer)

File viewer for **React v17+**.

> This is a fork of [https://github.com/Alcumus/react-doc-viewer](https://github.com/Alcumus/react-doc-viewer) (inactivity for a long time).

## Important note!

[Permalink: Important note!](https://www.npmjs.com/package/@cyntler/react-doc-viewer#important-note)

> \[!IMPORTANT\]
> This library uses the official MS Office online document viewing service. This means it works on an iframe basis and only supports public file URLs! Therefore, it may not be compatible with all projects. Currently, there is no way to natively render MS Office documents in the browser.

## Table of Contents

[Permalink: Table of Contents](https://www.npmjs.com/package/@cyntler/react-doc-viewer#table-of-contents)

- [Supported file types](https://www.npmjs.com/package/@cyntler/react-doc-viewer#supported-file-types)
- [Storybook Demo](https://www.npmjs.com/package/@cyntler/react-doc-viewer#storybook-demo)
- [Installation](https://www.npmjs.com/package/@cyntler/react-doc-viewer#installation)
- [Usage](https://www.npmjs.com/package/@cyntler/react-doc-viewer#usage)  - [Required styles](https://www.npmjs.com/package/@cyntler/react-doc-viewer#required-styles)
  - [Basic](https://www.npmjs.com/package/@cyntler/react-doc-viewer#basic)
  - [Initial Active Document](https://www.npmjs.com/package/@cyntler/react-doc-viewer#initial-active-document)
  - [Control over the displayed document](https://www.npmjs.com/package/@cyntler/react-doc-viewer#control-over-the-displayed-document)
  - [Displaying blob/uploaded documents](https://www.npmjs.com/package/@cyntler/react-doc-viewer#displaying-blobuploaded-documents)
  - [Included Renderers](https://www.npmjs.com/package/@cyntler/react-doc-viewer#included-renderers)
  - [Custom Renderer](https://www.npmjs.com/package/@cyntler/react-doc-viewer#custom-renderer)
  - [Custom File Loader](https://www.npmjs.com/package/@cyntler/react-doc-viewer#custom-file-loader)
- [Theme](https://www.npmjs.com/package/@cyntler/react-doc-viewer#theme)
- [Custom pre-fetch HTTP Verb](https://www.npmjs.com/package/@cyntler/react-doc-viewer#custom-pre-fetch-http-verb)
- [Custom Request Headers](https://www.npmjs.com/package/@cyntler/react-doc-viewer#custom-request-headers)
- [Internationalization (i18n)](https://www.npmjs.com/package/@cyntler/react-doc-viewer#internationalization-i18n)
- [Styling](https://www.npmjs.com/package/@cyntler/react-doc-viewer#styling)  - [CSS Class](https://www.npmjs.com/package/@cyntler/react-doc-viewer#css-class)
  - [CSS Class Default Override](https://www.npmjs.com/package/@cyntler/react-doc-viewer#css-class-default-override)
  - [React Inline](https://www.npmjs.com/package/@cyntler/react-doc-viewer#react-inline)
  - [Styled Components](https://www.npmjs.com/package/@cyntler/react-doc-viewer#styled-components)
- [Using DocViewerRef](https://www.npmjs.com/package/@cyntler/react-doc-viewer#using-docviewerref)
- [Config](https://www.npmjs.com/package/@cyntler/react-doc-viewer#config)  - [Overriding Header Component](https://www.npmjs.com/package/@cyntler/react-doc-viewer#overriding-header-component)
  - [Overriding Loading Renderer](https://www.npmjs.com/package/@cyntler/react-doc-viewer#overriding-loading-renderer)
  - [Overriding No Renderer (Error)](https://www.npmjs.com/package/@cyntler/react-doc-viewer#overriding-no-renderer-error)

## Supported file types

[Permalink: Supported file types](https://www.npmjs.com/package/@cyntler/react-doc-viewer#supported-file-types)

| Extension | MIME Type | Comments |
| --- | --- | --- |
| bmp | image/bmp |  |
| csv | text/csv |  |
| odt | application/vnd.oasis.opendocument.text |  |
| doc | application/msword | Public URLs only! |
| docx | application/vnd.openxmlformats-officedocument.wordprocessingml.document | Public URLs only! |
| gif | image/gif |  |
| htm | text/htm |  |
| html | text/html |  |
| jpg | image/jpg |  |
| jpeg | image/jpeg |  |
| pdf | application/pdf |  |
| png | image/png |  |
| ppt | application/vnd.ms-powerpoint | Public URLs only! |
| pptx | application/vnd.openxmlformats-officedocument.presentationml.presentation | Public URLs only! |
| tiff | image/tiff |  |
| txt | text/plain |  |
| xls | application/vnd.ms-excel | Public URLs only! |
| xlsx | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet | Public URLs only! |
| mp4 | video/mp4 |  |
| webp | image/webp |  |

## Storybook Demo

[Permalink: Storybook Demo](https://www.npmjs.com/package/@cyntler/react-doc-viewer#storybook-demo)

[https://cyntler.github.io/react-doc-viewer](https://cyntler.github.io/react-doc-viewer)

## Installation

[Permalink: Installation](https://www.npmjs.com/package/@cyntler/react-doc-viewer#installation)

Use one of the package managers for Node.js.

```
 npm i @cyntler/react-doc-viewer
 # or
 yarn add @cyntler/react-doc-viewer
```

## Usage

[Permalink: Usage](https://www.npmjs.com/package/@cyntler/react-doc-viewer#usage)

> **Warning:** _By default the component height will expand and contract to the current loaded file. The width will expand to fill the parent._

### Required styles

[Permalink: Required styles](https://www.npmjs.com/package/@cyntler/react-doc-viewer#required-styles)

The library exports a CSS file containing classes needed for correct rendering of e.g. PDF files. It is best to include it at the beginning of the application or in the place where you use this library.

```
import "@cyntler/react-doc-viewer/dist/index.css";
```

### Basic

[Permalink: Basic](https://www.npmjs.com/package/@cyntler/react-doc-viewer#basic)

DocViewer requires at least an array of document objects to function.
Each document object must have a uri to a file, either a url that returns a file or a local file.

```
import DocViewer, { DocViewerRenderers } from "@cyntler/react-doc-viewer";
import "@cyntler/react-doc-viewer/dist/index.css";

function App() {
  const docs = [\
    { uri: "https://url-to-my-pdf.pdf" }, // Remote file\
    { uri: require("./example-files/pdf.pdf") }, // Local File\
  ];

  return <DocViewer documents={docs} pluginRenderers={DocViewerRenderers} />;
}
```

### Initial Active Document

[Permalink: Initial Active Document](https://www.npmjs.com/package/@cyntler/react-doc-viewer#initial-active-document)

By default, the first item in your `documents` array will be displayed after the component is rendered. However, there is a prop `initialActiveDocument` that you can point to the initial document that should be displayed.

```
import DocViewer, { DocViewerRenderers } from "@cyntler/react-doc-viewer";
import "@cyntler/react-doc-viewer/dist/index.css";

const App = () => {
  const docs = [\
    { uri: "https://url-to-my-pdf.pdf" }, // Remote file\
    { uri: require("./example-files/pdf.pdf") }, // Local File\
  ];

  return (
    <DocViewer
      documents={docs}
      initialActiveDocument={docs[1]}
      pluginRenderers={DocViewerRenderers}
    />
  );
};
```

### Control over the displayed document

[Permalink: Control over the displayed document](https://www.npmjs.com/package/@cyntler/react-doc-viewer#control-over-the-displayed-document)

From version **1.11.0** you can control the displayed document through two props: `activeDocument` and `onDocumentChange`.

```
const DocViewerControlOverDisplayedDocument = () => {
  const docs = [\
    { uri: "https://url-to-my-pdf.pdf" }, // Remote file\
    { uri: require("./example-files/pdf.pdf") }, // Local File\
  ];
  const [activeDocument, setActiveDocument] = useState(docs[0]);

  const handleDocumentChange = (document) => {
    setActiveDocument(document);
  };

  return (
    <>
      <DocViewer
        documents={docs}
        activeDocument={activeDocument}
        onDocumentChange={handleDocumentChange}
      />
    </>
  );
};
```

### Displaying blob/uploaded documents

[Permalink: Displaying blob/uploaded documents](https://www.npmjs.com/package/@cyntler/react-doc-viewer#displaying-blobuploaded-documents)

Since **v1.6.2** you can use documents in the form of blobs, which allows you to e.g. display uploaded files.

```
const DocViewerWithInputApp = () => {
  const [selectedDocs, setSelectedDocs] = useState<File[]>([]);

  return (
    <>
      <input
        type="file"
        accept=".pdf"
        multiple
        onChange={(el) =>
          el.target.files?.length &&
          setSelectedDocs(Array.from(el.target.files))
        }
      />
      <DocViewer
        documents={selectedDocs.map((file) => ({
          uri: window.URL.createObjectURL(file),
          fileName: file.name,
        }))}
        pluginRenderers={DocViewerRenderers}
      />
    </>
  );
};
```

### Included Renderers

[Permalink: Included Renderers](https://www.npmjs.com/package/@cyntler/react-doc-viewer#included-renderers)

To use the included renderers.
`DocViewerRenderers` is an Array of all the included renderers.

```
import DocViewer, { DocViewerRenderers } from "@cyntler/react-doc-viewer";
import "@cyntler/react-doc-viewer/dist/index.css";

<DocViewer
  pluginRenderers={DocViewerRenderers}
  {/* ... */}
/>;
```

Or you can import individual renderers.

```
import DocViewer, { PDFRenderer, PNGRenderer } from "@cyntler/react-doc-viewer";
import "@cyntler/react-doc-viewer/dist/index.css";

<DocViewer
  pluginRenderers={[PDFRenderer, PNGRenderer]}
  {/* ... */}
/>;
```

### Custom Renderer

[Permalink: Custom Renderer](https://www.npmjs.com/package/@cyntler/react-doc-viewer#custom-renderer)

To create a custom renderer, that will just exist for your project.

```
import React from "react";
import DocViewer from "@cyntler/react-doc-viewer";

const MyCustomPNGRenderer: DocRenderer = ({
  mainState: { currentDocument },
}) => {
  if (!currentDocument) return null;

  return (
    <div id="my-png-renderer">
      <img id="png-img" src={currentDocument.fileData as string} />
    </div>
  );
};

MyCustomPNGRenderer.fileTypes = ["png", "image/png"];
MyCustomPNGRenderer.weight = 1;
```

And supply it to `pluginRenderers` inside an `Array`.

```
import DocViewer, { DocViewerRenderers } from "@cyntler/react-doc-viewer";
import "@cyntler/react-doc-viewer/dist/index.css";

<DocViewer
  pluginRenderers={[MyCustomPNGRenderer]}
  documents={
    [\
      // ...\
    ]
  }
/>;
```

### Custom File Loader

[Permalink: Custom File Loader](https://www.npmjs.com/package/@cyntler/react-doc-viewer#custom-file-loader)

If you need to prevent the actual loading of the file by `@cyntler/react-doc-viewer`.

You can decorate your custom renderer with a callback to do as you wish. e.g. Load the file yourself in an iFrame.

```
MyCustomPNGRenderer.fileLoader = ({
  documentURI,
  signal,
  fileLoaderComplete,
}) => {
  myCustomFileLoaderCode().then(() => {
    // Whenever you have finished you must call fileLoaderComplete() to remove the loading animation
    fileLoaderComplete();
  });
};
```

## Theme

[Permalink: Theme](https://www.npmjs.com/package/@cyntler/react-doc-viewer#theme)

You can provide a theme object with one or all of the available properties.

```
<DocViewer
  documents={docs}
  theme={{
    primary: "#5296d8",
    secondary: "#ffffff",
    tertiary: "#5296d899",
    textPrimary: "#ffffff",
    textSecondary: "#5296d8",
    textTertiary: "#00000099",
    disableThemeScrollbar: false,
  }}
/>
```

## Custom pre-fetch HTTP Verb

[Permalink: Custom pre-fetch HTTP Verb](https://www.npmjs.com/package/@cyntler/react-doc-viewer#custom-pre-fetch-http-verb)

Some services (such as AWS) provide URLs that works only for one pre-configured verb.
By default, `@cyntler/react-doc-viewer` fetches document metadata through a `HEAD` request in order to guess its `Content-Type`.
If you need to have a specific verb for the pre-fetching, use the `prefetchMethod` option on the DocViewer:

```
import DocViewer, { DocViewerRenderers } from "@cyntler/react-doc-viewer";

<DocViewer prefetchMethod="GET" />;
```

## Custom Request Headers

[Permalink: Custom Request Headers](https://www.npmjs.com/package/@cyntler/react-doc-viewer#custom-request-headers)

Provide request headers, i.e. for authenticating with an API etc.

```
const headers = {
  "X-Access-Token": "1234567890",
  "My-Custom-Header": "my-custom-value",
};

<DocViewer documents={docs} prefetchMethod="GET" requestHeaders={headers} />;
```

## Internationalization (i18n)

[Permalink: Internationalization (i18n)](https://www.npmjs.com/package/@cyntler/react-doc-viewer#internationalization-i18n)

From **v1.6.0** you can pass the `language` prop to the `DocViewer` component to get translated sentences and words that can be displayed by this library.

```
<DocViewer documents={docs} language="pl" />
```

The translations are based on the `.json` files that can be found in the `src/locales` directory.

## Styling

[Permalink: Styling](https://www.npmjs.com/package/@cyntler/react-doc-viewer#styling)

Any styling applied to the `<DocViewer>` component, is directly applied to the main `div` container.

### CSS Class

[Permalink: CSS Class](https://www.npmjs.com/package/@cyntler/react-doc-viewer#css-class)

```
<DocViewer documents={docs} className="my-doc-viewer-style" />
```

### CSS Class Default Override

[Permalink: CSS Class Default Override](https://www.npmjs.com/package/@cyntler/react-doc-viewer#css-class-default-override)

Each component / div already has a DOM id that can be used to style any part of the document viewer.

```
#react-doc-viewer #header-bar {
  background-color: #faf;
}
```

### React Inline

[Permalink: React Inline](https://www.npmjs.com/package/@cyntler/react-doc-viewer#react-inline)

```
<DocViewer documents={docs} style={{ width: 500, height: 500 }} />
```

### Styled Components

[Permalink: Styled Components](https://www.npmjs.com/package/@cyntler/react-doc-viewer#styled-components)

```
import styled from "styled-components";

// ...

<MyDocViewer documents={docs} />;

// ...

const MyDocViewer = styled(DocViewer)`
  border-radius: 10px;
`;
```

## Using DocViewerRef

[Permalink: Using DocViewerRef](https://www.npmjs.com/package/@cyntler/react-doc-viewer#using-docviewerref)

Since **v1.13.0** you can control the display of the document with `reference`.

```
import DocViewer, { DocViewerRef } from "@cyntler/react-doc-viewer";

export const UsingRef = () => {
  const docViewerRef = useRef<DocViewerRef>(null);

  return (
    <>
      <div>
        <button onClick={() => docViewerRef?.current?.prev()}>
          Prev Document By Ref
        </button>
        <button onClick={() => docViewerRef?.current?.next()}>
          Next Document By Ref
        </button>
      </div>
      <DocViewer
        ref={docViewerRef}
        documents={docs}
        config={{ header: { disableHeader: true } }}
      />
    </>
  );
};
```

## Config

[Permalink: Config](https://www.npmjs.com/package/@cyntler/react-doc-viewer#config)

You can provide a config object, which configures parts of the component as required.

```
<DocViewer
  documents={docs}
  config={{
    header: {
      disableHeader: false,
      disableFileName: false,
      retainURLParams: false,
    },
    csvDelimiter: ",", // "," as default,
    pdfZoom: {
      defaultZoom: 1.1, // 1 as default,
      zoomJump: 0.2, // 0.1 as default,
    },
    pdfVerticalScrollByDefault: true, // false as default
  }}
/>
```

### Overriding Header Component

[Permalink: Overriding Header Component](https://www.npmjs.com/package/@cyntler/react-doc-viewer#overriding-header-component)

You can pass a callback function to `config.header.overrideComponent` that returns a React Element. The function's parameters will be populated and usable, this function will also be re-called whenever the mainState updates.
Parameters include the state object from the main component, and document navigation functions for `previousDocument` and `nextDocument`.

Example:

```
const MyHeader: IHeaderOverride = (state, previousDocument, nextDocument) => {
  if (!state.currentDocument || state.config?.header?.disableFileName) {
    return null;
  }

  return (
    <>
      <div>{state.currentDocument.uri || ""}</div>
      <div>
        <button onClick={previousDocument} disabled={state.currentFileNo === 0}>
          Previous Document
        </button>
        <button
          onClick={nextDocument}
          disabled={state.currentFileNo >= state.documents.length - 1}
        >
          Next Document
        </button>
      </div>
    </>
  );
};

<DocViewer
  pluginRenderers={DocViewerRenderers}
  documents={
    {
      // ...
    }
  }
  config={{
    header: {
      overrideComponent: MyHeader,
    },
  }}
/>;
```

### Overriding Loading Renderer

[Permalink: Overriding Loading Renderer](https://www.npmjs.com/package/@cyntler/react-doc-viewer#overriding-loading-renderer)

You can pass a callback function to `config.loadingRenderer.overrideComponent` that returns a React Element.

Example:

```
const MyLoadingRenderer = ({ document, fileName }) => {
  const fileText = fileName || document?.fileType || "";

  if (fileText) {
    return <div>Loading Renderer ({fileText})...</div>;
  }

  return <div>Loading Renderer...</div>;
};

<DocViewer
  pluginRenderers={DocViewerRenderers}
  documents={
    {
      // ...
    }
  }
  config={{
    loadingRenderer: {
      overrideComponent: MyLoadingRenderer,
    },
  }}
/>;
```

By default, the loading component is rendered if document loading process takes more than 500 ms.

You can change this time value or disable this feature to make the component display immediately:

```
const MyLoadingRenderer = ({ document, fileName }) => {
  ...
};

<DocViewer
  pluginRenderers={DocViewerRenderers}
  documents={
    {
      // ...
    }
  }
  config={{
    loadingRenderer: {
      overrideComponent: MyLoadingRenderer,
      showLoadingTimeout: false, // false if you want to disable or number to provide your own value (ms)
    },
  }}
/>;
```

### Overriding No Renderer (Error)

[Permalink: Overriding No Renderer (Error)](https://www.npmjs.com/package/@cyntler/react-doc-viewer#overriding-no-renderer-error)

You can pass a callback function to `config.noRenderer.overrideComponent` that returns a React Element.

Example:

```
const MyNoRenderer = ({ document, fileName }) => {
  const fileText = fileName || document?.fileType || "";

  if (fileText) {
    return <div>No Renderer Error! ({fileText})</div>;
  }

  return <div>No Renderer Error!</div>;
};

<DocViewer
  pluginRenderers={DocViewerRenderers}
  documents={
    {
      // ...
    }
  }
  config={{
    noRenderer: {
      overrideComponent: MyNoRenderer,
    },
  }}
/>;
```

## Readme

### Keywords

- [reactjs](https://www.npmjs.com/search?q=keywords:reactjs)
- [react-library](https://www.npmjs.com/search?q=keywords:react-library)
- [file-viewer](https://www.npmjs.com/search?q=keywords:file-viewer)
- [doc-viewer](https://www.npmjs.com/search?q=keywords:doc-viewer)

Viewing @cyntler/react-doc-viewer version 1.17.1