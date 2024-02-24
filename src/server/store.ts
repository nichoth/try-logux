import { query as q, Client } from 'faunadb'
import { LogStore, LogPage } from '@logux/core'
import type { Criteria, ReadonlyListener, Action, Meta } from '@logux/core/log'
import { ServerMeta } from '@logux/server'
import Debug from '@nichoth/debug/node'
import { getClient } from './get-client'
const debug = Debug('server')

// the ID of our metadata document,
// for the `lastAdded` count
const { LOG_META_REF } = process.env

export interface Synced {
    received:number;
    sent:number;
}

export type LastSynced = Synced

// function checkIndex (store, index) {
//     debug('check index', store, index)

//     if (!store.indexes[index]) {
//         store.indexes[index] = { added: [], entries: [] }
//     }
// }

// function forEachIndex (meta:Meta, cb) {
//     const indexes = meta!.indexes
//     if (isDefined(indexes) && indexes!.length > 0) {
//         for (const index of indexes!) {
//             cb(index)
//         }
//     }
// }

// function insert (store, entry) {
//     store.lastAdded += 1
//     entry[1].added = store.lastAdded
//     store.added.push(entry)
//     forEachIndex(entry[1], index => {
//         checkIndex(store, index)
//         store.indexes[index].added.push(entry)
//     })
//     return Promise.resolve(entry[1])
// }

// function eject (store, meta) {
//     const added = meta.added
//     let start = 0
//     let end = store.added.length - 1
//     while (start <= end) {
//         const middle = (end + start) >> 1
//         const otherAdded = store.added[middle][1].added
//         if (otherAdded < added) {
//             start = middle + 1
//         } else if (otherAdded > added) {
//             end = middle - 1
//         } else {
//             store.added.splice(middle, 1)
//             break
//         }
//     }
// }

// function find (list, id) {
//     for (let i = list.length - 1; i >= 0; i--) {
//         if (id === list[i][1].id) {
//             return i
//         }
//     }
//     return -1
// }

// function isDefined (value) {
//     return typeof value !== 'undefined'
// }

/**
 * > Every Store class should provide 8 standard methods.
 *
 * @see {@link https://logux.org/node-api/#logstore}
 */

export class FaunaLogStore extends LogStore {
    client:InstanceType<typeof Client>

    constructor () {
        super()
        this.client = getClient()
    }

    /**
     * Add an action to the store.
     *
     * - check if this document ID already exists; return false if so
     */
    async add (action:Action, meta:ServerMeta):Promise<false|ServerMeta> {
        const id = meta!.id.split(' ')

        const entry = {
            action,
            created: [meta.time, id[1], id[2], id[0]].join(' '),
            id: meta.id,
            indexes: meta.indexes || [],
            meta,
            reasons: meta.reasons,
            time: meta.time
        }

        try {
            await this.client.query(
                q.Let(
                    {
                        logMeta: q.Get(q.Ref(
                            q.Collection('log_meta'),
                            LOG_META_REF
                        )),
                        doc: q.Match(
                            q.Index('action_by_id'),
                            [id]
                        ),
                    },
                    q.If(
                        q.Exists(q.Var('doc')),
                        q.Abort('That ID already exists'),
                        q.Do([
                            q.Update(
                                q.Var('logMeta'),
                                {
                                    data: {
                                        last_added: q.Add(q.Select(
                                            ['data', 'last_added'],
                                            q.Var('logMeta')
                                        ), 1)
                                    }
                                }
                            ),
                            q.Create(
                                q.Collection('actions'),
                                { data: entry }
                            ),
                        ])
                    )
                )
            )

            return entry.meta
        } catch (err) {
            return false
        }
    }

    /**
     * Returns a promise with array of action and metadata.
     *
     * @see {@link https://logux.org/node-api/#logstore-byid}
     *
     * @param id The action ID
     * @returns {Promise<[Action, ServerMeta] | [null, null]>}
     */
    async byId (id:string):Promise<[Action, ServerMeta]> {
        const doc:{ data } = await this.client.query(
            q.Get(q.Match(
                q.Index('action_by_id'),
                id
            )),
        )

        const { action, meta } = doc.data

        return [action, meta]
    }

    /**
     * Update the metadata of an action.
     *
     * @param id The action ID
     * @param diff The update
     * @returns false if the ID was not found, true otherwise
     */
    async changeMeta (id:string, diff:Record<string, any>):Promise<boolean> {
        try {
            await this.client.query(
                q.Let({
                    doc: q.Get(q.Match(
                        q.Index('action_by_id'),
                        id
                    ))
                }, q.Update(
                    q.Ref(q.Var('doc')),

                    {
                        data: q.Merge(
                            q.Select(['data'], q.Get(q.Var('doc'))),
                            q.Merge(
                                q.Select(['data', 'meta'], q.Get(q.Var('doc'))),
                                diff
                            )
                        )
                    }
                ))
            )

            return true
        } catch (err) {
            console.log('**err**', err)
            return false
        }
    }

    /**
     * Remove all data from the store.
     */
    async clean ():Promise<void> {
        // delete the collection,
        // then create a new one
        await this.client.query(q.Delete(q.Collection('actions')))
        await this.client.query(q.CreateCollection({ name: 'actions' }))
    }

    /**
     * Return a Promise with first page.
     *
     * @see {@link https://logux.org/node-api/#logstore-get LogStore.get docs}
     * @param opts @see {@link https://logux.org/node-api/#getoptions Get options}
     * @returns {LogPage<T>}
     */
    async get (opts:{
        index?:string,
        order?:'added'|'created'
    } = {}):Promise<LogPage> {
        /**
         * @TODO
         * Need to use the sort options and index param
         */
        const docs:{ data } = await this.client.query(
            q.Map(
                q.Paginate(q.Documents(q.Collection('actions'))),
                q.Lambda('action', q.Get(q.Var('action')))
            )
        )

        /**
         * @TODO
         * Should return `next` function to get the next page
         */
        return { entries: docs.data }
    }

    async getLastAdded () {
        const last = await this.client.query<string>(
            q.Select(
                ['data', 'last_added'],
                q.Get(q.Documents(q.Collection('log_meta'))),
            )
        )

        return parseInt(last)
    }

    /**
     * Get added values for latest synchronized received/sent events.
     *
     * @see {@link https://logux.org/node-api/#logstore-getlastsynced}
     * @returns {Promise<LastSynced>} Promise with added values
     */
    async getLastSynced ():Promise<LastSynced> {
        const last:{ lastReceived, lastSent } = await this.client.query(
            q.Select(
                ['data'],
                q.Get(q.Documents(q.Collection('log_meta')))
            )
        )

        return {
            received: last.lastReceived,
            sent: last.lastSent
        }
    }

    async setLastSynced (values:{ sent:number; received:number }):Promise<void> {
        await this.client.query(q.Update(
            q.Select([0], (q.Documents(q.Collection('actions')))),
            {
                data: {
                    last_sent: values.sent,
                    last_received: values.received
                }
            }
        ))
    }

    /**
     * Remove action from store.
     * @see {@link https://logux.org/node-api/#logstore-remove}
     * @param {string} id The ID of the action
     * @returns {Promise<false|[Action<T>, ServerMeta]>}
     */
    async remove (id:string):Promise<false|[Action, ServerMeta]> {
        const doc = await this.client.query<false|[Action, ServerMeta]>(
            q.Let({
                doc: q.Match(q.Index('action_by_id'), [id])
            }, q.If(
                q.Exists(q.Var('doc')),
                q.Delete(q.Var('doc')),
                false
            ))
        )

        return doc
    }

    /**
     * Remove reason from action’s metadata and remove actions without reasons.
     *
     * @TODO Need to implement this.
     *
     * @see {@link https://logux.org/node-api/#logstore-removereason}
     */
    async removeReason (
        reason:string,
        criteria:Criteria,
        callback:ReadonlyListener<Action, Meta>
    ):Promise<void> {
        let doc
        if (criteria.id) {
            try {
                doc = await this.client.query(
                    q.Get(q.Match(q.Index('action_by_id'), criteria.id))
                )
            } catch (err) {
                // do nothing
            }
        } else {
            try {
                doc = await this.client.query(
                    q.Delete(q.Match(q.Index('action_by_reason'), reason))
                )
            } catch (err) {
                // do nothing
            }
        }

        debug('remove reason', doc)
        callback(doc.data.action, doc.data.meta)

        // update indexes
        // for (const meta of doc.data) {
        //     forEachIndex(meta, i => {
        //         this.indexes[i].entries = this.indexes[i].entries.filter(removing)
        //         this.indexes[i].added = this.indexes[i].added.filter(removing)
        //     })
        // }
    }
}

// export class MemoryStore {
//     constructor () {
//         this.entries = []
//         this.added = []
//         this.indexes = {}
//         this.lastReceived = 0
//         this.lastAdded = 0
//         this.lastSent = 0
//     }

//     async add (action, meta) {
//         const entry = [action, meta]
//         const id = meta.id

//         const list = this.entries
//         for (let i = 0; i < list.length; i++) {
//             const [, otherMeta] = list[i]
//             if (id === otherMeta.id) {
//                 return false
//             } else if (!isFirstOlder(otherMeta, meta)) {
//                 forEachIndex(meta, index => {
//                     checkIndex(this, index)
//                     const indexList = this.indexes[index].entries
//                     const j = indexList.findIndex(item => !isFirstOlder(item[1], meta))
//                     indexList.splice(j, 0, entry)
//                 })
//                 list.splice(i, 0, entry)
//                 return insert(this, entry)
//             }
//         }

//         forEachIndex(meta, index => {
//             checkIndex(this, index)
//             this.indexes[index].entries.push(entry)
//         })
//         list.push(entry)
//         return insert(this, entry)
//     }

//     async byId (id) {
//         const created = find(this.entries, id)
//         if (created === -1) {
//             return [null, null]
//         } else {
//             const [action, meta] = this.entries[created]
//             return [action, meta]
//         }
//     }

//     async changeMeta (id, diff) {
//         const index = find(this.entries, id)
//         if (index === -1) {
//             return false
//         } else {
//             const meta = this.entries[index][1]
//             for (const key in diff) meta[key] = diff[key]
//             return true
//         }
//     }

//     async clean () {
//         this.entries = []
//         this.added = []
//         this.indexes = {}
//         this.lastReceived = 0
//         this.lastAdded = 0
//         this.lastSent = 0
//     }

//     async get (opts = {}) {
//         const index = opts.index
//         let store = this
//         let entries
//         if (index) {
//             store = this.indexes[index] || { added: [], entries: [] }
//         }
//         if (opts.order === 'created') {
//             entries = store.entries
//         } else {
//             entries = store.added
//         }
//         return { entries: entries.slice(0) }
//     }

//     async getLastAdded () {
//         return this.lastAdded
//     }

//     async getLastSynced () {
//         return {
//             received: this.lastReceived,
//             sent: this.lastSent
//         }
//     }

//     async remove (id, created) {
//         if (typeof created === 'undefined') {
//             created = find(this.entries, id)
//             if (created === -1) return Promise.resolve(false)
//         }

//         const entry = [this.entries[created][0], this.entries[created][1]]
//         forEachIndex(entry[1], index => {
//             const entries = this.indexes[index].entries
//             const indexed = find(entries, id)
//             if (indexed !== -1) entries.splice(indexed, 1)
//         })
//         this.entries.splice(created, 1)

//         forEachIndex(entry[1], index => {
//             eject(this.indexes[index], entry[1])
//         })
//         eject(this, entry[1])

//         return entry
//     }

//     async removeReason (
//         reason:string,
//         criteria:Criteria,
//         callback:ReadonlyListener<Action, Meta>
//     ) {
//         const removed = []

//         if (criteria.id) {
//             const index = find(this.entries, criteria.id)
//             if (index !== -1) {
//                 const meta = this.entries[index][1]
//                 const reasonPos = meta.reasons.indexOf(reason)
//                 if (reasonPos !== -1) {
//                     meta.reasons.splice(reasonPos, 1)
//                     if (meta.reasons.length === 0) {
//                         callback(this.entries[index][0], meta)
//                         this.remove(criteria.id)
//                     }
//                 }
//             }
//         } else {
//             this.entries = this.entries.filter(([action, meta]) => {
//                 const c = criteria

//                 const reasonPos = meta.reasons.indexOf(reason)
//                 if (reasonPos === -1) {
//                     return true
//                 }
//                 if (isDefined(c.olderThan) && !isFirstOlder(meta, c.olderThan)) {
//                     return true
//                 }
//                 if (isDefined(c.youngerThan) && !isFirstOlder(c.youngerThan, meta)) {
//                     return true
//                 }
//                 if (isDefined(c.minAdded) && meta.added < c.minAdded) {
//                     return true
//                 }
//                 if (isDefined(c.maxAdded) && meta.added > c.maxAdded) {
//                     return true
//                 }

//                 meta.reasons.splice(reasonPos, 1)
//                 if (meta.reasons.length === 0) {
//                     callback(action, meta)
//                     removed.push(meta)
//                     return false
//                 } else {
//                     return true
//                 }
//             })

//             const removedAdded = removed.map(m => m.added)
//             const removing = i => !removedAdded.includes(i[1].added)
//             this.added = this.added.filter(removing)

//             for (const meta of removed) {
//                 forEachIndex(meta, i => {
//                     this.indexes[i].entries = this.indexes[i].entries.filter(removing)
//                     this.indexes[i].added = this.indexes[i].added.filter(removing)
//                 })
//             }
//         }
//     }

//     async setLastSynced (values) {
//         if (typeof values.sent !== 'undefined') {
//             this.lastSent = values.sent
//         }
//         if (typeof values.received !== 'undefined') {
//             this.lastReceived = values.received
//         }
//     }
// }

// import { isFirstOlder } from '@logux/core'
// import { AnyAction, Meta } from 'typescript-fsa'

// // need to make a LogStore for server-side persistence

// export class FaunaLogStore {
//     name:string;
//     adding:Record<string, boolean>;
//     initing:false|this;
//     db

//     constructor (name = 'logux') {
//         this.name = name
//         this.adding = {}
//         this.initing = false
//     }

//     os (name:string, write?:'write') {
//         const mode = write ? 'readwrite' : 'readonly'
//         return this.db.transaction(name, mode).objectStore(name)
//     }

//     async add (action:AnyAction, meta:Meta) {
//         const id = meta!.id.split(' ')
//         const entry = {
//             action,
//             created: [meta!.time, id[1], id[2], id[0]].join(' '),
//             id: meta!.id,
//             indexes: meta!.indexes || [],
//             meta,
//             reasons: meta!.reasons,
//             time: meta!.time
//         }

//         if (this.adding[entry.created]) {
//             return false
//         }

//         this.adding[entry.created] = true

//         const store = await this.init()
//         if (!store) throw new Error('not store')  // for TS

//         const exist = await promisify(store.os('log').index('id').get(meta!.id))

//         if (exist) {
//             return false
//         } else {
//             const added = await promisify(store.os('log', 'write').add(entry))
//             delete store.adding[entry.created]
//             meta!.added = added
//             return meta
//         }
//     }

//     async init ():Promise<this|false> {
//         if (this.initing) return this.initing

//         const store = this
//         const opening = indexedDB.open(this.name, VERSION)

//         opening.onupgradeneeded = function (ev) {
//             const db = ev.target.result

//             let log:IDBObjectStore
//             if (ev.oldVersion < 1) {
//                 log = db.createObjectStore('log', {
//                     autoIncrement: true,
//                     keyPath: 'added'
//                 })
//                 log.createIndex('id', 'id', { unique: true })
//                 log.createIndex('created', 'created', { unique: true })
//                 log.createIndex('reasons', 'reasons', { multiEntry: true })
//                 db.createObjectStore('extra', { keyPath: 'key' })
//             }
//             if (ev.oldVersion < 2) {
//                 if (!log!) {
//                     /* c8 ignore next 2 */
//                     log = opening.transaction.objectStore('log')
//                 }
//                 log.createIndex('indexes', 'indexes', { multiEntry: true })
//             }
//         }

//         this.initing = promisify(opening).then(db => {
//             store.db = db
//             db.onversionchange = function () {
//                 store.db.close()
//                 if (typeof document !== 'undefined' && document.reload) {
//                     document.reload()
//                 }
//             }
//             return store
//         })

//         return this.initing
//     }
// }

// const VERSION = 2

// function rejectify (request, reject) {
//     request.onerror = e => {
//         /* c8 ignore next 2 */
//         reject(e.target.error)
//     }
// }

// function promisify (request) {
//     return new Promise((resolve, reject) => {
//         rejectify(request, reject)
//         request.onsuccess = e => {
//             resolve(e.target.result)
//         }
//     })
// }

// function isDefined (value) {
//     return typeof value !== 'undefined'
// }

// export class IndexedStore {
//     name:string;
//     adding:Record<string, boolean>;
//     initing:boolean|Promise<this>;
//     db

//     constructor (name = 'logux') {
//         this.name = name
//         this.adding = {}
//         this.initing = false
//     }

//     async add (action, meta) {
//         const id = meta.id.split(' ')
//         const entry = {
//             action,
//             created: [meta.time, id[1], id[2], id[0]].join(' '),
//             id: meta.id,
//             indexes: meta.indexes || [],
//             meta,
//             reasons: meta.reasons,
//             time: meta.time
//         }

//         if (this.adding[entry.created]) {
//             return false
//         }
//         this.adding[entry.created] = true

//         const store = await this.init()
//         const exist = await promisify(store.os('log').index('id').get(meta.id))
//         if (exist) {
//             return false
//         } else {
//             const added = await promisify(store.os('log', 'write').add(entry))
//             delete store.adding[entry.created]
//             meta.added = added
//             return meta
//         }
//     }

//     async byId (id) {
//         const store = await this.init()
//         const result = await promisify(store.os('log').index('id').get(id))
//         if (result) {
//             return [result.action, result.meta]
//         } else {
//             return [null, null]
//         }
//     }

//     async changeMeta (id, diff) {
//         const store = await this.init()
//         const entry = await promisify(store.os('log').index('id').get(id))
//         if (!entry) {
//             return false
//         } else {
//             for (const key in diff) entry.meta[key] = diff[key]
//             if (diff.reasons) entry.reasons = diff.reasons
//             await promisify(store.os('log', 'write').put(entry))
//             return true
//         }
//     }

//     async clean () {
//         const store = await this.init()
//         store.db.close()
//         await promisify(indexedDB.deleteDatabase(store.name))
//     }

//     async get ({ index, order }) {
//         const store = await this.init()
//         return new Promise((resolve, reject) => {
//             const log = store.os('log')
//             let request
//             if (index) {
//                 if (order === 'created') {
//                     request = log.index('created').openCursor(null, 'prev')
//                 } else {
//                     const keyRange = IDBKeyRange.only(index)
//                     request = log.index('indexes').openCursor(keyRange, 'prev')
//                 }
//             } else if (order === 'created') {
//                 request = log.index('created').openCursor(null, 'prev')
//             } else {
//                 request = log.openCursor(null, 'prev')
//             }
//             rejectify(request, reject)

//             const entries = []
//             request.onsuccess = function (e) {
//                 const cursor = e.target.result
//                 if (!cursor) {
//                     resolve({ entries })
//                     return
//                 }
//                 if (!index || cursor.value.indexes.includes(index)) {
//                     cursor.value.meta.added = cursor.value.added
//                     entries.unshift([cursor.value.action, cursor.value.meta])
//                 }
//                 cursor.continue()
//             }
//         })
//     }

//     async getLastAdded () {
//         const store = await this.init()
//         const cursor = await promisify(store.os('log').openCursor(null, 'prev'))
//         return cursor ? cursor.value.added : 0
//     }

//     async getLastSynced () {
//         const store = await this.init()
//         const data = await promisify(store.os('extra').get('lastSynced'))
//         if (data) {
//             return { received: data.received, sent: data.sent }
//         } else {
//             return { received: 0, sent: 0 }
//         }
//     }

//     init () {
//         if (this.initing) return this.initing

//         const store = this
//         const opening = indexedDB.open(this.name, VERSION)

//         opening.onupgradeneeded = function (ev) {
//             const db = ev.target.result

//             let log:IDBObjectStore
//             if (ev.oldVersion < 1) {
//                 log = db.createObjectStore('log', {
//                     autoIncrement: true,
//                     keyPath: 'added'
//                 })
//                 log.createIndex('id', 'id', { unique: true })
//                 log.createIndex('created', 'created', { unique: true })
//                 log.createIndex('reasons', 'reasons', { multiEntry: true })
//                 db.createObjectStore('extra', { keyPath: 'key' })
//             }
//             if (ev.oldVersion < 2) {
//                 if (!log!) {
//                     /* c8 ignore next 2 */
//                     log = opening.transaction.objectStore('log')
//                 }
//                 log.createIndex('indexes', 'indexes', { multiEntry: true })
//             }
//         }

//         this.initing = promisify(opening).then(db => {
//             store.db = db
//             db.onversionchange = function () {
//                 store.db.close()
//                 if (typeof document !== 'undefined' && document.reload) {
//                     document.reload()
//                 }
//             }
//             return store
//         })

//         return this.initing
//     }

//     os (name, write) {
//         const mode = write ? 'readwrite' : 'readonly'
//         return this.db.transaction(name, mode).objectStore(name)
//     }

//     async remove (id) {
//         const store = await this.init()
//         const entry = await promisify(store.os('log').index('id').get(id))
//         if (!entry) {
//             return false
//         } else {
//             await promisify(store.os('log', 'write').delete(entry.added))
//             entry.meta.added = entry.added
//             return [entry.action, entry.meta]
//         }
//     }

//     async removeReason (reason, criteria, callback) {
//         const store = await this.init()
//         if (criteria.id) {
//             const entry = await promisify(store.os('log').index('id').get(criteria.id))
//             if (entry) {
//                 const index = entry.meta.reasons.indexOf(reason)
//                 if (index !== -1) {
//                     entry.meta.reasons.splice(index, 1)
//                     entry.reasons = entry.meta.reasons
//                     if (entry.meta.reasons.length === 0) {
//                         callback(entry.action, entry.meta)
//                         await promisify(store.os('log', 'write').delete(entry.added))
//                     } else {
//                         await promisify(store.os('log', 'write').put(entry))
//                     }
//                 }
//             }
//         } else {
//             await new Promise((resolve, reject) => {
//                 const log = store.os('log', 'write')
//                 const request = log.index('reasons').openCursor(reason)
//                 rejectify(request, reject)
//                 request.onsuccess = function (e) {
//                     if (!e.target.result) {
//                         resolve()
//                         return
//                     }

//                     const entry = e.target.result.value
//                     const m = entry.meta
//                     const c = criteria

//                     if (isDefined(c.olderThan) && !isFirstOlder(m, c.olderThan)) {
//                         e.target.result.continue()
//                         return
//                     }
//                     if (isDefined(c.youngerThan) && !isFirstOlder(c.youngerThan, m)) {
//                         e.target.result.continue()
//                         return
//                     }
//                     if (isDefined(c.minAdded) && entry.added < c.minAdded) {
//                         e.target.result.continue()
//                         return
//                     }
//                     if (isDefined(c.maxAdded) && entry.added > c.maxAdded) {
//                         e.target.result.continue()
//                         return
//                     }

//                     let process
//                     if (entry.reasons.length === 1) {
//                         entry.meta.reasons = []
//                         entry.meta.added = entry.added
//                         callback(entry.action, entry.meta)
//                         process = log.delete(entry.added)
//                     } else {
//                         entry.reasons.splice(entry.reasons.indexOf(reason), 1)
//                         entry.meta.reasons = entry.reasons
//                         process = log.put(entry)
//                     }

//                     rejectify(process, reject)
//                     process.onsuccess = function () {
//                         e.target.result.continue()
//                     }
//                 }
//             })
//         }
//     }

//     async setLastSynced (values) {
//         const store = await this.init()
//         let data = await promisify(store.os('extra').get('lastSynced'))
//         if (!data) data = { key: 'lastSynced', received: 0, sent: 0 }
//         if (typeof values.sent !== 'undefined') {
//             data.sent = values.sent
//         }
//         if (typeof values.received !== 'undefined') {
//             data.received = values.received
//         }
//         await promisify(store.os('extra', 'write').put(data))
//     }
// }
