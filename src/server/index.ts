import 'dotenv/config'
import { Server } from '@logux/server'
import Debug from '@nichoth/debug/node'
import { increment, decrement } from '../state/actions.js'
import { FaunaLogStore } from '@bicycle-codes/logux-fauna'
import { Log } from '@logux/core'
const debug = Debug('server')

/**
 * @see {@link https://logux.org/node-api/#logstore}
 */
const store = new FaunaLogStore()

/**
 * @see {@link https://logux.org/node-api/#log}
 */
const log = new Log({
    store,
    nodeId: 'client123'
})

debug('the log', log)

/**
 * @see {@link https://logux.org/node-api/#serveroptions}
 *
 * Connected to the `Log` because the Log and server use
 * the same `store`.
 */
const server = new Server(
    Server.loadOptions(process, {
        subprotocol: '1.0.0',
        store: store,
        fileUrl: import.meta.url,
        supports: '1',
        port: 8765
    })
)

let count = 3

server.auth(async ({ userId, token }) => {
    debug('**in server.auth**', process.env.NODE_ENV)
    return (process.env.NODE_ENV === 'development')
})

/**
 * This is where we define paths that clients can subscribe to
 */
server.channel<{ value:number }>('count/:action', {
    access (_, action, meta) {
        debug('**access count/:action**', action)
        return (process.env.NODE_ENV === 'development')
    },

    async load (_, action) {
        debug('**load count/:action**', action)
        // see https://logux.org/guide/concepts/subscription/#re-subscription
        // const count = db.loadCount()
        // if (!action.since || count.changesAt > action.since.time) {
        //     return { type: 'user/add', count }
        // }
        return { type: 'count/set', value: count }
    }
})

/**
 * Handler functions for actions we get from the clients
 */
server.type(increment, {
    access (_, action, meta) {
        debug('action', action)
        debug('meta', meta)
        return process.env.NODE_ENV === 'development'
    },

    resend (_, action, meta) {
        debug('resending increment', action)
        return 'count/:action'
    },

    process (_, action, meta) {
        debug('incrementing')
        debug(JSON.stringify(action, null, 2))
        debug(JSON.stringify(meta, null, 2))
        count++
    }
})

server.type(decrement, {
    access (ctx, action, meta) {
        debug('in server.type.decrement.access', action)
        debug('meta', meta)
        return process.env.NODE_ENV === 'development'
    },

    resend (_, action) {
        debug('resending decrement', action)
        return 'count/:action'
    },

    process (_, action, meta) {
        debug('decrementing')
        debug(JSON.stringify(action, null, 2))
        debug(JSON.stringify(meta, null, 2))
        count--
    }
})

// let last
// server.type('CHANGE_NAME', {
//     access (ctx, action, meta) {
//         return action.user === ctx.userId
//     },

//     resend (ctx, action, meta) {
//         return { channel: `user/${ctx.userId}` }
//     },

//     async process (ctx, action, meta) {
//         last = action
//         if (isFirstOlder(last, meta)) {
//             // const newUser = { id: '123', name: 'bob' }
//             // await db.changeUserName({ id: action.user, name: action.name })
//         }
//     }
// })

server.listen()
