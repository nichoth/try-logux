import { combineReducers } from 'redux'
import { Signal, signal } from '@preact/signals'
import { createStoreCreator } from '@logux/redux'
import { CrossTabClient, badge, badgeEn, log } from '@logux/client'
import { badgeStyles } from '@logux/client/badge/styles'
import type { ClientMeta } from '@logux/client'
import type { Log, LogStore } from '@logux/core'
// import { ActionCreator } from '@logux/actions'
import Route from 'route-event'
import type { UserRenameAction } from './users.js'
import Debug from '@nichoth/debug'
const debug = Debug()

const reducer = combineReducers({
    count: (state = 0) => state
})

// export const store = configureStore({
//     reducer: {},
// })

// export type RootState = ReturnType<typeof store.getState>
// export type AppDispatch = typeof store.dispatch

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
    _client:CrossTabClient<{}, Log<ClientMeta, LogStore>>
} {  // eslint-disable-line indent
    const onRoute = Route()

    const client = new CrossTabClient({
        server: (process.env.NODE_ENV === 'development'
            ? 'ws://127.0.0.1:31337/'
            : 'wss://logux.example.com'),
        subprotocol: '1.0.0',
        userId: 'anonymous',  // TODO: We will fill it in Authentication recipe
        token: '123' // TODO: We will fill it in Authentication recipe
    })

    const createStore = createStoreCreator(client)
    const store = createStore(reducer)
    log(store.client)
    badge(store.client, { messages: badgeEn, styles: badgeStyles })
    store.client.start()

    debug('store', store)

    debug('store.getstate', store.getState())

    const state = {
        _client: client,
        _store: store,
        _setRoute: onRoute.setRoute.bind(onRoute),
        username: signal<string|null>(null),
        count: signal<number>(0),
        route: signal<string>(location.pathname + location.search)
    }

    client.type('INC', (action, meta) => {
        debug('increment action', action)
        debug('increment action', meta)
        state.count.value++
    })

    client.log.type<UserRenameAction>('user/rename', action => {
        // document.title = action.name
        state.username.value = action.name
    })

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

State.Increase = async function (state:ReturnType<typeof State>) {
    await state._client.sync({ type: 'logux/subscribe', channel: 'counter' })
    state.count.value++
}

State.Decrease = function (state:ReturnType<typeof State>) {
    state.count.value--
}
