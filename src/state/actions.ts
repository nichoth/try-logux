export const Action = {
    Increase: () => {
        return {}
    },

    user: {
        rename: (newName:string) => {
            return { type: 'user/rename', userId: 386, name: newName }
        }
    }
}
