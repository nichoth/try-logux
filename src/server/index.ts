import 'dotenv/config'
import { Server } from '@logux/server'
import Users from './modules/users.js'
import Debug from '@nichoth/debug/node'
const debug = Debug('server')

const server = new Server(
    Server.loadOptions(process, {
        subprotocol: '1.0.0',
        fileUrl: import.meta.url,
        supports: '1.x',
        port: 8765
    })
)

server.auth(async ({ userId, token }) => {
    debug('**in server.auth**', process.env.NODE_ENV)
    // const user = { username: 'alice', id: 'aliceID' }
    // return verifyJWT(token).userId === userId
    // return !!(token && user && userId === user.id)
    return (process.env.NODE_ENV === 'development')
})

Users(server)

server.channel('user/:id', {
    access (ctx, action, meta) {
        return ctx.params.id === ctx.userId
    },

    async load (ctx, action, meta) {
        const user = { username: 'alice', id: '123' }
        return { type: 'USER_NAME', name: user.username }
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
