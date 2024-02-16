# docs

Some notes

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
