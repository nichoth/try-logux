"use strict";
import { actionCreatorFactory } from "typescript-fsa";
const createAction = actionCreatorFactory();
export const renameUser = createAction("user/rename");
