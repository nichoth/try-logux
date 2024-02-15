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

export type IncrementActtion = Action & {
    type: 'count/increment',
    value: 1
}

export const increment = createAction<{ value: 1 }>('count/increment')
