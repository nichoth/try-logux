# docs
Links to relevant docs

## core concepts
This is after the part about creating a `redux` client-side store.

Tells you what an `action` is, but doesn't give examples of creating them with
`typescript-fsa`.

* [guide/architecture/core](https://logux.org/guide/architecture/core/)

## `IndexedStore`

* [web-api/#indexedstore](https://logux.org/web-api/#indexedstore)


## recipes

### recipes/typescript
Has the example of `typescript-fsa`.

* [recipes/typescript](https://logux.org/recipes/typescript/)

This is an example of a subscription:

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
