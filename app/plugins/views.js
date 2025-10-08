import path from "path";
import nunjucks from "nunjucks";
import { config } from "../config/index.js";
import vision from "@hapi/vision";

const { googleTagManagerKey, isLocal, serviceName } = config;

export const viewsPlugin = {
  plugin: vision,
  options: {
    engines: {
      njk: {
        compile: (src, options) => {
          const template = nunjucks.compile(src, options.environment);

          return (context) => {
            return template.render(context);
          };
        },
        prepare: (options, next) => {
          options.compileOptions.environment = nunjucks.configure(
            [
              path.join(options.relativeTo || process.cwd(), options.path),
              "node_modules/govuk-frontend/dist",
            ],
            {
              autoescape: true,
              trimBlocks: true,
              watch: false,
            },
          );

          return next();
        },
      },
    },
    path: "../views",
    relativeTo: "./app/views",
    isCached: !isLocal,
    context: {
      appVersion: "1.0.0",
      assetPath: "/assets",
      pageTitle: serviceName,
      googleTagManagerKey,
    },
  },
};
