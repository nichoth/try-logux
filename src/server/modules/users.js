"use strict";
import { renameUser } from "../../state/users.js";
export default (server) => {
  server.type(renameUser, {
    access(ctx, action, meta) {
      return action.payload.userId === ctx.userId;
    }
  });
  server.channel("user/:id", {
    access(ctx, action, meta) {
      return ctx.params.id === ctx.userId;
    }
  });
};
