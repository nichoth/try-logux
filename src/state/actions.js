import { actionCreatorFactory } from "typescript-fsa";
const createAction = actionCreatorFactory();
const renameUser = createAction("user/rename");
const increment = createAction("count/increment");
const decrement = createAction("count/decrement");
const set = createAction("count/set");
const Events = {
  "count/increment": increment().type,
  "count/decrement": decrement().type,
  "count/set": "count/set"
};
export {
  Events,
  decrement,
  increment,
  renameUser,
  set
};
