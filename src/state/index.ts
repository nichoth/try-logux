import { Signal, signal } from '@preact/signals'
import Route from 'route-event'
import {
    // IndexedStore,
    CrossTabClient,
    badge,
    badgeEn,
    log
} from '@logux/client'
import { badgeStyles } from '@logux/client/badge/styles'
import { combineReducers } from 'redux'
import { createStoreCreator } from '@logux/redux'
import {
    IncrementAction,
    increment,
    DecrementAction,
    decrement,
    CountSet
} from './actions.js'
import Debug from '@nichoth/debug'
const debug = Debug()
// import type { UserRenameAction } from './users.js'

const reducerState = { count: 0 }
const reducer = combineReducers({
    test: (state = 0) => state, // Remove me when you will have real reducer

    count: {
        increment: () => {
            debug('**the reduce functino was called**')
            reducerState.count++
        }
    }
})
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
    _store:ReturnType<ReturnType<typeof createStoreCreator>>
    _setRoute:(path:string)=>void;
} {  // eslint-disable-line indent
    const onRoute = Route()

    const client = new CrossTabClient({
        server: (import.meta.env.DEV ?
            'ws://localhost:8765' :
            'wss://logux.example.com'),
        subprotocol: '1.0.0',
        userId: 'anonymous',  // TODO: We will fill it, in Authentication recipe
        token: '123'  // TODO: We will fill it in Authentication recipe
    })

    const createStore = createStoreCreator(client)
    const store = createStore(reducer)

    store.client.log.add({
        type: 'logux/subscribe',
        channel: 'count/:action'
    }, { sync: true })

    store.client.start()

    const state = {
        _setRoute: onRoute.setRoute.bind(onRoute),
        // _client: store.client,
        _store: store,
        username: signal<string|null>(null),
        count: signal<number>(0),
        route: signal<string>(location.pathname + location.search)
    }

    badge(store.client, { messages: badgeEn, styles: badgeStyles })
    log(store.client)

    // @ts-ignore
    window.client = client

    // client.log.add({
    //     type: 'logux/subscribe',
    //     channel: 'users/14'
    // }, { sync: true })

    // const rename = renameUser({ userId: '123', name: 'alice' })
    // debug('rename action', rename)
    // client.sync(rename)

    store.client.log.type<IncrementAction>('count/increment', action => {
        debug('in client.log.type callback for increment', action)
        state.count.value++
    })

    store.client.log.type<DecrementAction>('count/decrement', action => {
        debug('client.log.type callback for decrement', action)
        state.count.value--
    })

    store.client.log.type<CountSet>('count/set', action => {
        debug('action in count/set', action)
        state.count.value = action.value
    })

    // store.client.log.type

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
    const inc = increment()
    debug('increment action', inc)

    state._store.dispatch.sync(inc)
    // state.count.value++
}

State.Decrease = function (state:ReturnType<typeof State>) {
    // state.count.value--
    const dec = decrement()
    debug('decrement action', dec)
    /**
     * @NOTE
     * the `.sync` call here -- this means we *do* send the action to the server
     * (calling it without .sync mean this is a local, in-tab action)
     */
    state._store.dispatch.sync(dec)
}
