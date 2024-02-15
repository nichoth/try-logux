import type { BaseServer } from '@logux/server'
import { renameUser } from '../../state/actions.js'

/**
 * Define types for ctx.params in subscriptions
 */
export type UserParams = {
    id:string
}

/**
 * see https://logux.org/recipes/typescript/
 */

/**
 * Use `typescript-fsa` to share actions between client and server.
 */

export default (server:BaseServer) => {
    server.type(renameUser, {
        access (ctx, action, meta) {
            // TypeScript will know that action must have `userId` key
            return action.payload.userId === ctx.userId
        },
    })

    server.channel<UserParams>('user/:id', {
        access (ctx, action, meta) {
            return ctx.params.id === ctx.userId
        }
    })
}
