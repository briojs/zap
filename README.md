## ⚡ Zap

[![npm version](https://img.shields.io/npm/v/zap-fetch?color=yellow)](https://npmjs.com/package/zap-fetch)
[![npm downloads](https://img.shields.io/npm/dm/zap-fetch?color=yellow)](https://npmjs.com/package/zap-fetch)
[![bundle size](https://img.shields.io/bundlephobia/minzip/zap-fetch?color=yellow)](https://bundlephobia.com/package/zap-fetch)
[![license](https://img.shields.io/github/license/briojs/zap?color=yellow)](https://github.com/briojs/zap/blob/main/LICENSE)

### Install

```sh
# npm
npm install -D zap-fetch

# yarn
yarn add -D zap-fetch

# pnpm
pnpm install -D zap-fetch

# bun
bun install -D zap-fetch
```

### Simple usage

```ts
import {$zap, createZapFetch} from 'zap-fetch'

// Use default fetch
const {body, response} = await $zap.get('https://jsonplaceholder.typicode.com/todos/1')

// Or create your own instance
const zap = createZapFetch({
    baseUrl: 'https://jsonplaceholder.typicode.com',
})

const {body, response} = await zap.get('/todos/1')
```

### Body

```ts
import {$zap} from 'zap-fetch'

const {body} = await $zap.get('/todos/1')
```    

Zap will automatically parse the response body based on the `Content-Type` header.

You can also provide which method to use for parsing the body.

```ts
import {$zap} from 'zap-fetch'

const {body} = await $zap.get('/todos/1', {
    responseType: 'arrayBuffer',
})
```

### Sending data

Body will be automatically stringified if it's possible. `ReadableStream`, `Stream` and `Buffer` are also supported.

```ts
import {$zap} from 'zap-fetch'

const {body} = await $zap.post('/todos', {
    body: {
        title: 'foo',
        completed: false,
        userId: 1,
    },
})
```

### Errors

You can catch the error manually.

```ts
import {$zap} from 'zap-fetch'

const ctx = await $zap.get('/todos/1').catch((error) => {
    console.error(error)
})
```

### Hooks/Interceptors

```ts
import {$zap} from 'zap-fetch'

const {body} = await $zap.get('/todos/1', {
    onRequest: ({request}) => {
        console.log(request)
    },
    onResponse: ({response}) => {
        console.log(response)
    },
})
```

Published under the [MIT](https://github.com/briojs/zap/blob/main/LICENSE) license.
Made by [@malezjaa](https://github.com/briojs)
and [community](https://github.com/briojs/zap/graphs/contributors) 💛
<br><br>
<a href="https://github.com/briojs/zap/graphs/contributors">
<img src="https://contrib.rocks/image?repo=briojs/zap" />
</a>

