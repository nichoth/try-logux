// import { fileURLToPath } from 'url'
// import { dirname } from 'path'
import { isFirstOlder } from '@logux/core'
import { Server } from '@logux/server'
import Users, { UserParams } from './modules/users.js'

const server = new Server(
    Server.loadOptions(process, {
        subprotocol: '1.0.0',
        supports: '1.x',
        fileUrl: import.meta.url
    })
)

server.auth(async ({ userId, token }) => {
    const user = { username: 'alice', id: 'aliceID' }
    // return verifyJWT(token).userId === userId
    return !!user && userId === user.id
})

Users(server)

server.listen()

server.channel<UserParams>('user/:id', {
    access (ctx, action, meta) {
        return ctx.params.id === ctx.userId
    },

    async load (ctx, action, meta) {
        const user = { username: 'alice', id: '123' }
        return { type: 'USER_NAME', name: user.username }
    }
})

server.type('CHANGE_NAME', {
    access (ctx, action, meta) {
        return action.user === ctx.userId
    },

    resend (ctx, action, meta) {
        return { channel: `user/${ctx.userId}` }
    },

    async process (ctx, action, meta) {
        if (isFirstOlder(lastNameChange(action.user), meta)) {
            const newUser = { id: '123', name: 'bob' }
            // await db.changeUserName({ id: action.user, name: action.name })
        }
    }
})

server.listen()
