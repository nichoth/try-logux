import { actionCreatorFactory } from 'typescript-fsa'
import { Action } from '@logux/core'

const createAction = actionCreatorFactory()

export type UserRenameAction = Action & {
    type: 'user/rename',
    userId: string,
    name: string
}

export const renameUser = createAction<{
    userId:string,
    name:string
}>('user/rename')

export type IncrementAction = Action & {
    type: 'count/increment',
}

export const increment = createAction<void>('count/increment')

export type DecrementAction = Action & {
    type: 'count/decrement',
}

export const decrement = createAction<void>('count/decrement')

export const set = createAction<{ value:number }>('count/set')

export type CountSet = Action & { type:'count/set', value:number }
