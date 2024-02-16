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
import {
    increment,
    decrement,
    Events
} from './actions.js'
import Debug from '@nichoth/debug'
const debug = Debug()

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
    _client:InstanceType<typeof CrossTabClient>
    // _store:ReturnType<ReturnType<typeof createStoreCreator>>
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

    /**
     * @NOTE
     * This is where we subscribe to changes client side
     */
    client.log.add({
        type: 'logux/subscribe',
        channel: 'count/:action'
    }, { sync: true })

    client.start()

    debug('the client', client)

    const state = {
        _setRoute: onRoute.setRoute.bind(onRoute),
        _client: client,
        // _store: store,
        username: signal<string|null>(null),
        count: signal<number>(0),
        route: signal<string>(location.pathname + location.search)
    }

    badge(client, { messages: badgeEn, styles: badgeStyles })
    log(client)

    // @ts-ignore
    window.client = client

    /**
     * @NOTE
     * See [Sending Actions to Another Browser Tab](https://logux.org/guide/concepts/action/#sending-actions-to-another-browser-tab)
     * > `client.log.type(type, fn)` and `client.log.on('add', fn)` will not see
     * > cross-tab actions. You must set listeners by `client.on(type, fn)` and
     * > `client.on('add', fn)`.
     */
    client.on('add', (action) => {
        debug('client.on add', action)
        debug('events set', Events['events/set'], action.type)

        if (!(Events[action.type])) {
            return
        }

        /**
         * @TODO -- how to get types for the action?
         */
        if (action.type === Events['count/set']) {
            state.count.value = action.value
        }

        if (action.type === Events['count/decrement']) {
            state.count.value--
        }

        if (action.type === Events['count/increment']) {
            state.count.value++
        }
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

State.Increase = function (state:ReturnType<typeof State>) {
    const inc = increment()
    debug('increment action', inc)
    state._client.sync(inc)
}

State.Decrease = function (state:ReturnType<typeof State>) {
    const dec = decrement()
    debug('decrement action', dec)
    state._client.sync(dec)
    // state._client.log.add(dec, { sync: true })
}
