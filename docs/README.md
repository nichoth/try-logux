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

## the example
See [../src/state/index.ts](../src/state//index.ts)

This creates an action on the client side
```js
// src/state/index.ts
const rename = renameUser({ userId: '123', name: 'alice' })
```


