import { Server } from '@logux/server'
import Users from './modules/users.js'

console.log('**file url**', import.meta.url)

const server = new Server(
    Server.loadOptions(process, {
        subprotocol: '1.0.0',
        fileUrl: import.meta.url,
        supports: '1.x',
        port: 8765
        // port: 31337
    })
)

server.auth(async ({ userId, token }) => {
    const user = { username: 'alice', id: 'aliceID' }
    // return verifyJWT(token).userId === userId
    return !!(token && user && userId === user.id)
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
