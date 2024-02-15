import { actionCreatorFactory } from "typescript-fsa";
const createAction = actionCreatorFactory();
const renameUser = createAction("user/rename");
const increment = createAction("count/increment");
export {
  increment,
  renameUser
};
