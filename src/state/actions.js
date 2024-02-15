import { actionCreatorFactory } from "typescript-fsa";
const createAction = actionCreatorFactory();
const renameUser = createAction("user/rename");
const increment = createAction("count/increment");
const decrement = createAction("count/decrement");
export {
  decrement,
  increment,
  renameUser
};
