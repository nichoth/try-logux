# try logux
Trying [logux](https://logux.org/)

* [see the example docs](./docs/EXAMPLE.md)

-------

* [subscriptions](https://logux.org/guide/concepts/subscription/)
* [guide](https://logux.org/guide/architecture/core/)
* [recipes](https://logux.org/recipes/authentication/)
* [node API](https://logux.org/node-api/)
* [web API](https://logux.org/web-api/)

## develop

Copy the `.env.example` file to `src/server/.env`

```sh
cp ./.env.example ./src/server/.env
```

Start the `logux` server in one terminal:

```sh
npm run start:logux
```

In a different terminal, start the frontend server:

```sh
npm run start:vite
```

## architecture

See [this article](https://gomakethings.com/easier-state-management-with-preact-signals/) for more details about
application architecture.

We create application state and logic in the file [./src/state.ts](./src/state.ts). 
This exports static functions, creates a state object, sets up URL routing, and
subscribes to `logux`.

In the view code, you would call the functions exposed in [state](./src/state.ts)
with a state instance in response to DOM events.
