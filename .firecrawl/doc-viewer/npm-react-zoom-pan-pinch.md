⚠️

**Security Update**: Classic tokens have been revoked. Granular tokens are now limited to 90 days and require 2FA by default. Update your CI/CD workflows to avoid disruption. [Learn more](https://gh.io/all-npm-classic-tokens-revoked).

×

# react-zoom-pan-pinch  ![TypeScript icon, indicating that this package has built-in type declarations](https://static-production.npmjs.com/4a2a680dfcadf231172b78b1d3beb975.svg)

3.7.0 • Public • Published a year ago

- [Readme](https://www.npmjs.com/package/react-zoom-pan-pinch?activeTab=readme)
- [Code Beta](https://www.npmjs.com/package/react-zoom-pan-pinch?activeTab=code)
- [0 Dependencies](https://www.npmjs.com/package/react-zoom-pan-pinch?activeTab=dependencies)
- [339 Dependents](https://www.npmjs.com/package/react-zoom-pan-pinch?activeTab=dependents)
- [69 Versions](https://www.npmjs.com/package/react-zoom-pan-pinch?activeTab=versions)

# 🖼 React Zoom Pan Pinch

[Permalink: 🖼 React Zoom Pan Pinch](https://www.npmjs.com/package/react-zoom-pan-pinch#-react-zoom-pan-pinch)

> Super fast and light react npm package for zooming, panning and pinching html
> elements in easy way

[![](https://custom-icon-badges.demolab.com/static/v1?label=&message=BetterTyped&color=333&logo=BT)](https://bettertyped.com/)[![](https://custom-icon-badges.demolab.com/npm/v/react-zoom-pan-pinch.svg?logo=npm&color=e22121)](https://www.npmjs.com/package/react-zoom-pan-pinch)[![](https://custom-icon-badges.demolab.com/github/stars/prc5/react-zoom-pan-pinch?logo=star)](https://github.com/prc5/react-zoom-pan-pinch)[![](https://custom-icon-badges.demolab.com/github/license/prc5/react-zoom-pan-pinch?logo=law&color=yellow)](https://github.com/prc5/react-zoom-pan-pinch/blob/main/License.md)[![](https://custom-icon-badges.demolab.com/badge/semver-commitzen-e10079?logo=semantic-release&color=e76f51)](https://github.com/semantic-release/semantic-release)[![](https://custom-icon-badges.demolab.com/npm/dm/react-zoom-pan-pinch?logoColor=fff&logo=trending-up)](https://www.npmjs.com/package/react-zoom-pan-pinch)[![](https://custom-icon-badges.demolab.com/bundlephobia/minzip/react-zoom-pan-pinch?color=E10098&logo=package)](https://www.npmjs.com/package/react-zoom-pan-pinch)[![](https://custom-icon-badges.demolab.com/badge/typescript-%23007ACC.svg?logo=typescript&logoColor=white)](https://github.com/prc5/react-zoom-pan-pinch)[![](https://hits.sh/github.com/prc5/react-zoom-pan-pinch.svg?color=64BC4B&logo=bookmeter)](https://hits.sh/github.com/prc5/react-zoom-pan-pinch/)[![Twitter Follow](https://img.shields.io/twitter/follow/maciej_pyrc?label=Follow%20&style=social)](https://twitter.com/maciej_pyrc)

#### Sources

[Permalink: Sources](https://www.npmjs.com/package/react-zoom-pan-pinch#sources)

- [Demo](https://bettertyped.github.io/react-zoom-pan-pinch/?path=/story/examples-big-image--big-image)
- [Docs](https://bettertyped.github.io/react-zoom-pan-pinch/?path=/story/docs-props--page)

[![Premium sponsor banner](https://raw.githubusercontent.com/prc5/sponsors/main/assets/Platinum.png)](https://raw.githubusercontent.com/prc5/sponsors/main/assets/Platinum.png)

[![Premium sponsor banner](https://raw.githubusercontent.com/prc5/sponsors/main/packages/platinum/sponsorkit/sponsors.svg)](https://raw.githubusercontent.com/prc5/sponsors/main/packages/platinum/sponsorkit/sponsors.svg)

## Key Features

[Permalink: Key Features](https://www.npmjs.com/package/react-zoom-pan-pinch#key-features)

- 🚀 Fast and easy to use
- 🏭 Light, without external dependencies
- 💎 Mobile gestures, touchpad gestures and desktop mouse events support
- 🎁 Powerful context usage, which gives you a lot of freedom
- 🔧 Highly customizable
- 👑 Animations and Utils to create own tools
- 🔮 Advanced hooks and components

## Try other BetterTyped projects

[Permalink: Try other BetterTyped projects](https://www.npmjs.com/package/react-zoom-pan-pinch#try-other-bettertyped-projects)

Do you like this library? Try out other projects

[![Hyper Fetch](https://raw.githubusercontent.com/BetterTyped/hyper-fetch/main/.github/assets/readme.png)](https://github.com/BetterTyped/hyper-fetch)

**[⚡Hyper Fetch](https://github.com/BetterTyped/hyper-fetch)** \- Fetching and
realtime data exchange framework.

* * *

## Installation

[Permalink: Installation](https://www.npmjs.com/package/react-zoom-pan-pinch#installation)

```
npm install --save react-zoom-pan-pinch
or
yarn add react-zoom-pan-pinch
```

[![Premium sponsor banner](https://raw.githubusercontent.com/prc5/sponsors/main/assets/Gold.png)](https://raw.githubusercontent.com/prc5/sponsors/main/assets/Gold.png)

[![Premium sponsor banner](https://raw.githubusercontent.com/prc5/sponsors/main/packages/gold/sponsorkit/sponsors.svg)](https://raw.githubusercontent.com/prc5/sponsors/main/packages/gold/sponsorkit/sponsors.svg)

## Examples

[Permalink: Examples](https://www.npmjs.com/package/react-zoom-pan-pinch#examples)

```
import React, { Component } from "react";

import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

const Example = () => {
  return (
    <TransformWrapper>
      <TransformComponent>
        <img src="image.jpg" alt="test" />
      </TransformComponent>
    </TransformWrapper>
  );
};
```

or

```
import React, { Component } from "react";

import {
  TransformWrapper,
  TransformComponent,
  useControls,
} from "react-zoom-pan-pinch";

const Controls = () => {
  const { zoomIn, zoomOut, resetTransform } = useControls();

  return (
    <div className="tools">
      <button onClick={() => zoomIn()}>+</button>
      <button onClick={() => zoomOut()}>-</button>
      <button onClick={() => resetTransform()}>x</button>
    </div>
  );
};

const Example = () => {
  return (
    <TransformWrapper
      initialScale={1}
      initialPositionX={200}
      initialPositionY={100}
    >
      {({ zoomIn, zoomOut, resetTransform, ...rest }) => (
        <>
          <Controls />
          <TransformComponent>
            <img src="image.jpg" alt="test" />
            <div>Example text</div>
          </TransformComponent>
        </>
      )}
    </TransformWrapper>
  );
};
```

[![Premium sponsor banner](https://raw.githubusercontent.com/prc5/sponsors/main/assets/Silver.png)](https://raw.githubusercontent.com/prc5/sponsors/main/assets/Silver.png)

[![Premium sponsor banner](https://raw.githubusercontent.com/prc5/sponsors/main/packages/silver/sponsorkit/sponsors.svg)](https://raw.githubusercontent.com/prc5/sponsors/main/packages/silver/sponsorkit/sponsors.svg)

## License

[Permalink: License](https://www.npmjs.com/package/react-zoom-pan-pinch#license)

MIT © [prc5](https://github.com/prc5)

## Help me keep working on this project ❤️

[Permalink: Help me keep working on this project ❤️](https://www.npmjs.com/package/react-zoom-pan-pinch#help-me-keep-working-on-this-project-%EF%B8%8F)

- [Become a Sponsor on GitHub](https://github.com/sponsors/prc5)

## 💖 Our sponsors

[Permalink: 💖 Our sponsors](https://www.npmjs.com/package/react-zoom-pan-pinch#-our-sponsors)

[![My Sponsors](https://raw.githubusercontent.com/prc5/sponsors/main/packages/other/sponsorkit/sponsors.svg?raw=true)](https://github.com/sponsors/prc5)

## Readme

### Keywords

- [react](https://www.npmjs.com/search?q=keywords:react)
- [zoom](https://www.npmjs.com/search?q=keywords:zoom)
- [pan](https://www.npmjs.com/search?q=keywords:pan)
- [pinch](https://www.npmjs.com/search?q=keywords:pinch)
- [animation](https://www.npmjs.com/search?q=keywords:animation)
- [velocity](https://www.npmjs.com/search?q=keywords:velocity)
- [css](https://www.npmjs.com/search?q=keywords:css)
- [fast](https://www.npmjs.com/search?q=keywords:fast)
- [transformations](https://www.npmjs.com/search?q=keywords:transformations)
- [scale](https://www.npmjs.com/search?q=keywords:scale)
- [drag](https://www.npmjs.com/search?q=keywords:drag)
- [viewer](https://www.npmjs.com/search?q=keywords:viewer)
- [reacts](https://www.npmjs.com/search?q=keywords:reacts)
- [touch](https://www.npmjs.com/search?q=keywords:touch)
- [css3](https://www.npmjs.com/search?q=keywords:css3)
- [svg](https://www.npmjs.com/search?q=keywords:svg)
- [bounds](https://www.npmjs.com/search?q=keywords:bounds)
- [context](https://www.npmjs.com/search?q=keywords:context)

Viewing react-zoom-pan-pinch version 3.7.0