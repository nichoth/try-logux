# try logux
![tests](https://github.com/nichoth/try-logux/actions/workflows/nodejs.yml/badge.svg)

Trying [logux](https://logux.org/)

## develop
Start a localhost server, and serve the netlify serverless functions locally.
Note the lambda functions are accessible at the path `/api/` from the
frontend code.

```sh
npm start
```

## architecture

See [this article](https://gomakethings.com/easier-state-management-with-preact-signals/) for more details about application architecture.

We create application state and logic in the file [./src/state.ts](./src/state.ts). This exports static functions, creates a state object, and sets up URL routing.

In the view code, you would call the functions exposed in [state](./src/state.ts) with a state instance in response to application events.
