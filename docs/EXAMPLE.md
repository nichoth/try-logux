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
via `client.on('add', fn)`. This emits events related to our application domain.

> [!IMPORTANT]
> `client.log.type(type, fn)` and `client.log.on('add', fn)` will not see
> cross-tab actions. You must set listeners by `client.on('add', fn)`.

```js
client.on('add', (action) => {
    if (action.type === 'foo') {
        state.count.value = action.value
        return
    }
})
```

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

```js
/**
 * This is where we define paths that clients can subscribe to
 */
server.channel<{ value:number }>('users/:id', {
    async access (ctx, action, meta) {
        let client = await db.loadUser(ctx.userId)
        return client.hasAccessToUser(ctx.params.id)
    },

    async load (_, action) {
        let user = await db.loadUser(ctx.params.id)
        return { type: 'user/add', user }
    }
})
```

#### .load

The `server.channel` method takes an object of several functions, one of which
is `load`.

```js
async load () {
    return { type: 'count/set', value: count }
}
```

[Read about `load`](https://logux.org/guide/architecture/practice/#subscriptions)

The `load` function is used to send initial data to the client. You need to
send JSON with the right `type` and shape for the action.

This function will run once when the client initially subscribes to the channel.

### resend

> After sending initial state, the server needs to know what actions are
> relevant to this channel.

> `server.type()` is a setting for each action

Use the `resend` callback in the `server.type` method to set the channels that
need to know about this action.

```js
// __this means__
// when the server gets the 'users/add' action,
// we should re-send this action to any clients
// who are subscribed to the channel 'users/:id',
server.type('users/add', {
    // ...
    resend (ctx, action, meta) {
        return 'users/:id'
    },
    // ...
})
```
