# example

Make a counting app that automatically synchronizes state amongst
several devices.

See [the example in ../src/state/index.ts](../src/state//index.ts).

## subscribe to state changes
In the example, we create a `logux` client. Then we subscribe to changes with
`.log.add`, and an action type of `'logux/subscribe'`:

```js
client.log.add({
    type: 'logux/subscribe',
    channel: 'count/:action'
}, { sync: true })
```

After that, we [need to subscribe to state changes](https://logux.org/guide/concepts/action/#sending-actions-to-another-browser-tab)
via `client.on('add', fn)`.

> [!IMPORTANT]
> `client.log.type(type, fn)` and `client.log.on('add', fn)` will not see
> cross-tab actions. You must set listeners by `client.on(type, fn)` and
> `client.on('add', fn)`.

## how do we update the state?

Create an action, and pass it to `client.sync`:

```js
import { increment } from './actions.js'

State.Increase = function (state:ReturnType<typeof State>) {
    const inc = increment()
    state._client.sync(inc)
}
```

## server-side
So far we have only looked at the browser. *But*, a server is involved too. The
server is an authority for validating any state changes.

### create a server

```js
const server = new Server(
    Server.loadOptions(process, {
        subprotocol: '1.0.0',
        fileUrl: import.meta.url,
        supports: '1.x',
        port: 8765
    })
)
```

### define possible subscriptions
The server defines what subscriptions are possible in runtime code, with the
[`server.channel` method](https://logux.org/guide/concepts/subscription/).

The `server.channel` method takes an object of several functions, one of which
is `load`.

```js
async load () {
    return { type: 'count/set', value: count }
}
```

[Read about `load`](https://logux.org/guide/architecture/practice/#subscriptions)

The `load` function is used to send initial data to the client.

```js
/**
 * This is where we define paths that clients can subscribe to
 */
server.channel<{ value:number }>('count/:action', {
    access (_, action, meta) {
        debug('**count/:action access**', action)
        return (process.env.NODE_ENV === 'development')
    },

    async load (_, action) {
        debug('**load count/:action**', action)
        return { type: 'count/set', value: count }
    }
})
```
