import 'dotenv/config'
import { Server } from '@logux/server'
import Users from './modules/users.js'
// import { renameUser, increment } from '../state/actions.js'
import { renameUser, increment } from '../state/actions.js'
import Debug from '@nichoth/debug/node'
const debug = Debug('server')

type UserParams = {
    id: string
}

const server = new Server(
    Server.loadOptions(process, {
        subprotocol: '1.0.0',
        fileUrl: import.meta.url,
        supports: '1.x',
        port: 8765
    })
)

const count = 0

server.auth(async ({ userId, token }) => {
    debug('**in server.auth**', process.env.NODE_ENV)
    // const user = { username: 'alice', id: 'aliceID' }
    // return verifyJWT(token).userId === userId
    // return !!(token && user && userId === user.id)
    return (process.env.NODE_ENV === 'development')
})

Users(server)

server.channel('count/:action', {
    access (ctx, action, meta) {
        debug('**access count/:action**')
        return (process.env.NODE_ENV === 'development')
    },

    async load () {
        debug('**load count/:action**')
        return { type: 'set', value: count }
    }
})

/**
 * These are paths that clients can subscribe to --
 * `server.channel`
 */
server.channel<UserParams>('user/:id', {
    access (ctx, action, meta) {
        debug('**access**', action, meta)
        return ctx.params.id === ctx.userId
    },

    async load (ctx, action, meta) {
        const user = { username: 'alice', id: '123' }
        return { type: 'USER_NAME', name: user.username }
    }
})

server.type(renameUser, {
    access (ctx, action, meta) {
        debug('in server.type callback', action)
        // TypeScript will know that action must have `userId` key
        return action.payload.userId === ctx.userId
    },
})

server.type(renameUser, {
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
