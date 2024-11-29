import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Fixes npm packages that depend on `fs` module
      config.resolve.fallback.fs = false;
    }

    config.module.rules.push({
      test: /\.node$/,
      use: "node-loader",
    });

    config.resolve = {
      ...config.resolve,
      // Alias to handle `node:` protocol issue
      alias: {
        ...config.resolve.alias,
        "node:async_hooks": "async_hooks",
      },
      fullySpecified: false, // Allows Webpack to resolve core modules without the `node:` prefix
    };

    config.externals = config.externals || [];

    // TODO: Workaround for issue : https://github.com/chroma-core/chroma/issues/2988
    config.externals.push({
      "https://unpkg.com/@xenova/transformers@2.13.2": "transformers",
    });

    return config;
  },
};

export default nextConfig;
