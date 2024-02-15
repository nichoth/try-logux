import { Signal, signal } from '@preact/signals'
import { CrossTabClient } from '@logux/client'
import { renameUser } from './users.js'
import Route from 'route-event'
import Debug from '@nichoth/debug'
const debug = Debug()
// import type { UserRenameAction } from './users.js'

/**
 * see https://logux.org/recipes/typescript/
 */

/**
 * When Logux client opens WebSocket connection, it sends a user ID and
 * user token to the server.
 */

/**
 * Setup
 *   - routes
 *   - logux subscription
 */
export function State ():{
    route:Signal<string>;
    count:Signal<number>;
    username:Signal<string|null>;
    _setRoute:(path:string)=>void;
} {  // eslint-disable-line indent
    const onRoute = Route()

    // const client = new CrossTabClient({
    //     server: 'ws://127.0.0.1:31337/',
    //     subprotocol: '1.0.0',
    //     userId: '123'
    // })

    const state = {
        _setRoute: onRoute.setRoute.bind(onRoute),
        username: signal<string|null>(null),
        count: signal<number>(0),
        route: signal<string>(location.pathname + location.search)
    }

    const client = new CrossTabClient({
        server: (import.meta.env.DEV ?
            'ws://localhost:8765' :
            'wss://logux.example.com'),
        subprotocol: '1.0.0',
        userId: 'anonymous',  // TODO: We will fill it in Authentication recipe
        token: '123'  // TODO: We will fill it in Authentication recipe
    })

    client.start()

    // @ts-ignore
    window.client = client
    debug('client', client)

    // client.log.add({
    //     type: 'logux/subscribe',
    //     channel: 'users/14'
    // }, { sync: true })

    const rename = renameUser({ userId: '123', name: 'alice' })
    debug('rename action', rename)
    client.sync(rename)

    // client.log.type<UserRenameAction>('user/rename', action => {
    //     // document.title = action.name
    //     state.username.value = action.name
    // })

    /**
     * Handle route changes
     */
    onRoute((path:string, data) => {
        const newPath = path.replace('/try-logux/', '/')  // <- for github pages
        state.route.value = newPath
        // handle scroll state like a web browser
        // (restore scroll position on back/forward)
        if (data.popstate) {
            return window.scrollTo(data.scrollX, data.scrollY)
        }
        // if this was a link click (not back button), then scroll to top
        window.scrollTo(0, 0)
    })

    return state
}

State.Increase = function (state:ReturnType<typeof State>) {
    state.count.value++
}

State.Decrease = function (state:ReturnType<typeof State>) {
    state.count.value--
}
