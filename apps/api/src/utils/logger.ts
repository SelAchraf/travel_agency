import pino, { type LoggerOptions } from "pino";
import { env } from "../config/env.js";

const options: LoggerOptions = {
  level: env.NODE_ENV === "test" ? "silent" : env.NODE_ENV === "production" ? "info" : "debug",
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "password",
      "passwordHash",
      "token",
      "refreshToken",
      "passportNumber",
      "passportNumberEncrypted",
      "*.password",
      "*.token",
    ],
    censor: "[REDACTED]",
  },
};

if (env.NODE_ENV === "development") {
  options.transport = {
    target: "pino-pretty",
    options: {
      colorize: true,
      ignore: "pid,hostname",
    },
  };
}

export const logger = pino(options);
