# docs

> `server.type` is a way to define any custom reaction for user's action.

> `addSyncMap` is a predefined CRDT Map implementation on top of the server.type.

## database
We are using [FaunaDB](https://faunadb.com/).

### setup the database
To setup the DB with empty collections, run

```sh
npm run setup-db
```

This requires a few env variables:
```sh
NODE_ENV="development"
FAUNA_SECRET="123abc"
```

### schema
This depends on the database having 2 collections and an index, and 1 document.

#### collections
```js
['actions', 'log_meta']
```

#### index
```js
await client.query(q.CreateIndex({
    name: 'action_by_id',
    source: q.Collection('actions'),
    terms: [
        { field: ['data', 'id'] }
    ]
}))
```

#### document
```js
await client.query(q.Create(
    q.Collection('log_meta'),
    { data: { last_added: 0, last_sent: 0, last_received: 0 } }
))
```

## run the server

```sh
npm start
```

### environment variables
Need an env var of the ID of the document created in step 1.

```sh
NODE_ENV="development"
DEBUG="server"
FAUNA_SECRET="123abc"
LOG_META_REF="123"  # the Fauna ID of the meta doc
```


## in progress

> For that [encrypted actions] you need to write LogStore implementation (using IndexedDB example)

* [docs for `IndexedStore`](https://logux.org/web-api/#indexedstore)
* [`IndexedStore` source code](https://github.com/logux/client/blob/main/indexed-store/index.js)

-------

See [MemoryStore](https://github.com/logux/core/blob/main/memory-store/index.js) for an example.


## server

* [see the example docs](./docs/EXAMPLE.md)
* [see the guide on server-side node](https://logux.org/guide/starting/node-server/#creating-the-project)
* [see Log docs](https://logux.org/node-api/#log)

> Log is main idea in Logux. In most end-user tools you will work with log and should know log API.

```js
const log = new Log({
  store: new MemoryStore(),
  nodeId: 'client:134'
})
```

### [Using a database](https://logux.org/guide/starting/node-server/#database)

> Logux Server supports any database. We will use PostgreSQL only as an example.

## client

* [indexed DB example](https://logux.org/guide/concepts/node/#store)

```js
import { IndexedStore } from '@logux/client'

const client = new CrossTabClient({
  store: new IndexedStore(),
  // ...
})
```


-------


Some notes

* [See "log store"](https://logux.org/node-api/#logstore) -- the server-side
  implementation of the DB/log.
* See [zero knowledge](https://logux.org/recipes/zero-knowledge/) -- docs about
  encrypting the event log

## `IndexedStore`

* [web-api/#indexedstore](https://logux.org/web-api/#indexedstore)

## recipes

### recipes/typescript
Has the example of `typescript-fsa`.

* [recipes/typescript](https://logux.org/recipes/typescript/)

This is how the server handles subscriptions. You create a channel for each
string value that clients can subscribe to.

```ts
// a subscription, serverside
server.channel<UserParams>('user/:id', {
    access (ctx, action, meta) {
        return ctx.params.id === ctx.userId
    }
})
```

## this example app
See [../src/state/index.ts](../src/state//index.ts) at [commit 6129fe6](https://github.com/nichoth/try-logux/tree/6129fe660a2c3bb7b065326cc55c0f7a7d901238) 

This creates an action on the client side
```js
// src/state/index.ts
const rename = renameUser({ userId: '123', name: 'alice' })
```

We don't make any API calls or persist anything at this point. To sync with the 
server, you should call `.sync`

```js
client.sync(rename)
```

### subscriptions
[See the docs](https://logux.org/web-api/#globals-loguxsubscribe)

We need to subscribe to changes from the client-side. Do this by adding
an action:

```js
store.client.log.add({
    type: 'logux/subscribe',
    channel: 'count/:action'
}, { sync: true })
```

## actions

See [concepts/action](https://logux.org/guide/concepts/action/#adding-actions-on-the-client)

> Adding actions to the log is the only way to change application state in Logux.

> [!IMPORTANT]
> client.log.type(type, fn) and client.log.on('add', fn) will not see
> cross-tab actions. You must set listeners by client.on(type, fn) and
> client.on('add', fn).

See [Sending Actions to Another Browser Tab](https://logux.org/guide/concepts/action/#sending-actions-to-another-browser-tab)
