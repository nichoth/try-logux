In the [logux-redux code](https://github.com/logux/redux/blob/main/create-store-creator/index.js), we have

```js
store.dispatch.sync = (action, meta = {}) => {
    if (meta.reasons || meta.keepLast) meta.noAutoReason = true
    return client.sync(action, meta)
}
```

So we can probably replace `store.dispatch.sync` calls with `client.sync`.
