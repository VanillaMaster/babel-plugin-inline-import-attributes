# @vanilla/babel-plugin-inline-import-attributes
Babel plugin to inline text imports with `type` import attribute set to `inline/text`

## installation
```
npm install git+https://github.com/VanillaMaster/babel-plugin-inline-import-attributes.git
```
> ***TIP:*** use [`#semver:<semver>`](https://docs.npmjs.com/cli/commands/npm-install) syntax

## module specifier resolution algorithm
[import-meta-resolve](https://github.com/wooorm/import-meta-resolve)
package used as [esm resolution algorithm](https://nodejs.org/api/esm.html#resolution-and-loading-algorithm)
implementation

## example
```JavaScript
// @filename: before.js
import text from "./data.txt" with { type: "inline/text" }

// @filename: after.js
const text = "content of ./data.txt"
```
```JavaScript
// @filename: before.js
import * as module from "./data.txt" with { type: "inline/text" }

// @filename: after.js
const module = Object.create(null, {
    default: {
        value: "content of ./data.txt",
        configurable: false,
        writable: false,
        enumerable: true
    },
    [Symbol.toStringTag]: {
        value: "Module",
        configurable: false,
        writable: false,
        enumerable: false
    }
});
```
```JavaScript
// @filename: before.js
import text, * as module from "./data.txt" with { type: "inline/text" }

// @filename: after.js
const module = Object.create(null, {
    default: {
        value: "content of ./data.txt",
        configurable: false,
        writable: false,
        enumerable: true
    },
    [Symbol.toStringTag]: {
        value: "Module",
        configurable: false,
        writable: false,
        enumerable: false
    }
}), text = module.default;
```