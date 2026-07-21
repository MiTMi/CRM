import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the DB drivers out of the bundle — PGlite ships WASM, and `pg` is a
  // native-capable server package. They run only in the Node server runtime.
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
};

export default nextConfig;
