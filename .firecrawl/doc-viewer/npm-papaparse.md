⚠️

**Security Update**: Classic tokens have been revoked. Granular tokens are now limited to 90 days and require 2FA by default. Update your CI/CD workflows to avoid disruption. [Learn more](https://gh.io/all-npm-classic-tokens-revoked).

×

# papaparse  [![DefinitelyTyped icon, indicating that this package has TypeScript declarations provided by the separate @types/papaparse package](https://static-production.npmjs.com/6179152a7c724954712283fc030b570d.svg)](https://www.npmjs.com/package/@types/papaparse)

5.5.3 • Public • Published 9 months ago

- [Readme](https://www.npmjs.com/package/papaparse?activeTab=readme)
- [Code Beta](https://www.npmjs.com/package/papaparse?activeTab=code)
- [0 Dependencies](https://www.npmjs.com/package/papaparse?activeTab=dependencies)
- [2462 Dependents](https://www.npmjs.com/package/papaparse?activeTab=dependents)
- [45 Versions](https://www.npmjs.com/package/papaparse?activeTab=versions)

# Parse CSV with JavaScript

[Permalink: Parse CSV with JavaScript](https://www.npmjs.com/package/papaparse#parse-csv-with-javascript)

Papa Parse is the fastest in-browser CSV (or delimited text) parser for JavaScript. It is reliable and correct according to [RFC 4180](https://tools.ietf.org/html/rfc4180), and it comes with these features:

- Easy to use
- Parse CSV files directly (local or over the network)
- Fast mode
- Stream large files (even via HTTP)
- Reverse parsing (converts JSON to CSV)
- Auto-detect delimiter
- Worker threads to keep your web page reactive
- Header row support
- Pause, resume, abort
- Can convert numbers and booleans to their types
- Optional jQuery integration to get files from `<input type="file">` elements
- One of the only parsers that correctly handles line-breaks and quotations

Papa Parse has **no dependencies** \- not even jQuery.

## Install

[Permalink: Install](https://www.npmjs.com/package/papaparse#install)

papaparse is available on [npm](https://www.npmjs.com/package/papaparse). It
can be installed with the following command:

```
npm install papaparse
```

If you don't want to use npm, [papaparse.min.js](https://unpkg.com/papaparse@latest/papaparse.min.js) can be downloaded to your project source.

## Usage

[Permalink: Usage](https://www.npmjs.com/package/papaparse#usage)

```
import Papa from 'papaparse';

Papa.parse(file, config);

const csv = Papa.unparse(data[, config]);
```

## Homepage & Demo

[Permalink: Homepage & Demo](https://www.npmjs.com/package/papaparse#homepage--demo)

- [Homepage](http://papaparse.com/)
- [Demo](http://papaparse.com/demo)

To learn how to use Papa Parse:

- [Documentation](http://papaparse.com/docs)

The website is hosted on [Github Pages](https://pages.github.com/). Its content is also included in the docs folder of this repository. If you want to contribute on it just clone the master of this repository and open a pull request.

## Papa Parse for Node

[Permalink: Papa Parse for Node](https://www.npmjs.com/package/papaparse#papa-parse-for-node)

Papa Parse can parse a [Readable Stream](https://nodejs.org/api/stream.html#stream_readable_streams) instead of a [File](https://www.w3.org/TR/FileAPI/) when used in Node.js environments (in addition to plain strings). In this mode, `encoding` must, if specified, be a Node-supported character encoding. The `Papa.LocalChunkSize`, `Papa.RemoteChunkSize` , `download`, `withCredentials` and `worker` config options are unavailable.

Papa Parse can also parse in a node streaming style which makes `.pipe` available. Simply pipe the [Readable Stream](https://nodejs.org/api/stream.html#stream_readable_streams) to the stream returned from `Papa.parse(Papa.NODE_STREAM_INPUT, options)`. The `Papa.LocalChunkSize`, `Papa.RemoteChunkSize` , `download`, `withCredentials`, `worker`, `step`, and `complete` config options are unavailable. To register a callback with the stream to process data, use the `data` event like so: `stream.on('data', callback)` and to signal the end of stream, use the 'end' event like so: `stream.on('end', callback)`.

## Get Started

[Permalink: Get Started](https://www.npmjs.com/package/papaparse#get-started)

For usage instructions, see the [homepage](http://papaparse.com/) and, for more detail, the [documentation](http://papaparse.com/docs).

## Tests

[Permalink: Tests](https://www.npmjs.com/package/papaparse#tests)

Papa Parse is under test. Download this repository, run `npm install`, then `npm test` to run the tests.

## Contributing

[Permalink: Contributing](https://www.npmjs.com/package/papaparse#contributing)

To discuss a new feature or ask a question, open an issue. To fix a bug, submit a pull request to be credited with the [contributors](https://github.com/mholt/PapaParse/graphs/contributors)! Remember, a pull request, _with test_, is best. You may also discuss on Twitter with [#PapaParse](https://twitter.com/search?q=%23PapaParse&src=typd&f=realtime) or directly to me, [@mholt6](https://twitter.com/mholt6).

If you contribute a patch, ensure the tests suite is running correctly. We run continuous integration on each pull request and will not accept a patch that breaks the tests.

## Readme

### Keywords

- [csv](https://www.npmjs.com/search?q=keywords:csv)
- [parser](https://www.npmjs.com/search?q=keywords:parser)
- [parse](https://www.npmjs.com/search?q=keywords:parse)
- [parsing](https://www.npmjs.com/search?q=keywords:parsing)
- [delimited](https://www.npmjs.com/search?q=keywords:delimited)
- [text](https://www.npmjs.com/search?q=keywords:text)
- [data](https://www.npmjs.com/search?q=keywords:data)
- [auto-detect](https://www.npmjs.com/search?q=keywords:auto-detect)
- [comma](https://www.npmjs.com/search?q=keywords:comma)
- [tab](https://www.npmjs.com/search?q=keywords:tab)
- [pipe](https://www.npmjs.com/search?q=keywords:pipe)
- [file](https://www.npmjs.com/search?q=keywords:file)
- [filereader](https://www.npmjs.com/search?q=keywords:filereader)
- [stream](https://www.npmjs.com/search?q=keywords:stream)
- [worker](https://www.npmjs.com/search?q=keywords:worker)
- [workers](https://www.npmjs.com/search?q=keywords:workers)
- [thread](https://www.npmjs.com/search?q=keywords:thread)
- [threading](https://www.npmjs.com/search?q=keywords:threading)
- [multi-threaded](https://www.npmjs.com/search?q=keywords:multi-threaded)
- [jquery-plugin](https://www.npmjs.com/search?q=keywords:jquery-plugin)

Viewing papaparse version 5.5.3