import 'dotenv/config'
import faunadb from 'faunadb'
import Debug from '@nichoth/debug'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { getClient } from '../src/server/get-client.js'
const q = faunadb.query
const debug = Debug()

/**
 * If module was called directly, not imported.
 */
const client = getClient()
const pathToThisFile = resolve(fileURLToPath(import.meta.url))
if (!process.argv[1]) {
    dbSetup(client)
} else {
    const pathPassedToNode = resolve(process.argv[1])
    if (pathToThisFile.includes(pathPassedToNode)) {
        dbSetup(client)
    }
}

export async function dbSetup (client) {
    if (
        !process.env.NODE_ENV?.includes('development') &&
        !process.env.NODE_ENV?.includes('test') &&
        !process.env.NODE_ENV?.includes('staging')
    ) {
        throw new Error('env should be test or staging or development')
    }

    const collections = ['actions', 'log_meta']

    /**
     * 1. Delete collections
     */
    await client.query(q.Do(collections.map(collection => {
        return q.If(
            q.Exists(q.Collection(collection)),
            q.Delete(q.Collection(collection)),
            "doesn't exist"
        )
    })))

    debug('**deleted collections**')

    /**
     * 2. Create collections
     */
    await client.query(q.Do(collections.map(name => {
        return q.CreateCollection({ name })
    })))

    debug('**created collections**')

    /**
     * 3. Create indexes
     */
    await client.query(q.CreateIndex({
        name: 'action_by_id',
        source: q.Collection('actions'),
        terms: [
            { field: ['data', 'id'] }
        ]
    }))
}
