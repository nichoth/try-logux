import pkg from 'faunadb'
import Debug from '@nichoth/debug'
const { Client } = pkg
const debug = Debug()

debug('aaaaaaaaaaaaaaaaaaaaa')

console.log('*****************process env secret...', process.env.FAUNA_SECRET)

export function getClient ():InstanceType<typeof Client> {
    return (new Client({
        secret: process.env.FAUNA_SECRET!
    }))
}
