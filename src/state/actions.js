import { actionCreatorFactory } from "typescript-fsa";
const createAction = actionCreatorFactory();
const renameUser = createAction("user/rename");
const increment = createAction("count/increment");
const decrement = createAction("count/decrement");
const set = createAction("count/set");
export {
  decrement,
  increment,
  renameUser,
  set
};
