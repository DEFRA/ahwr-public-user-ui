import { StatusCodes } from "http-status-codes";
import { trackError } from "../logging/logger.js";

export const trackHandlers = [
  {
    method: "GET",
    path: "/track1",
    options: {
      auth: false,
      plugins: {
        yar: { skip: true },
      },
    },
    handler: (request, h) => {
      trackError(request.logger, new Error("test error"), "test-trackerror", "This is a test tracking error");
      return h.response("ok").code(StatusCodes.OK);
    },
  },
  {
    method: "GET",
    path: "/track2",
    options: {
      auth: false,
      plugins: {
        yar: { skip: true },
      },
    },
    handler: (request, h) => {
      request.logger.info(
        {
          error: new Error("test error direct"),
          event: {
            type: "exception",
            severity: "error",
            category: "test-trackerror-direct"
          },
        },
        "This is a direct tracking error",
      );
      return h.response("ok").code(StatusCodes.OK);
    },
  },
  {
    method: "GET",
    path: "/track3",
    options: {
      auth: false,
      plugins: {
        yar: { skip: true },
      },
    },
    handler: (request, h) => {
      request.logger.error(
        {
          event: {
            type: "exception",
            severity: "error",
            category: "test-trackerror-direct-noerror"
          },
        },
        "This is a direct tracking error with event but no error",
      );
      return h.response("ok").code(StatusCodes.OK);
    },
  },
  {
    method: "GET",
    path: "/track4",
    options: {
      auth: false,
      plugins: {
        yar: { skip: true },
      },
    },
    handler: (request, h) => {
      request.logger.error(
        {
          error: new Error("test error only direct"),
        },
        "This is a direct tracking error with no event",
      );
      return h.response("ok").code(StatusCodes.OK);
    },
  },
];
