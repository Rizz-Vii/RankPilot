declare module "webpack-bundle-analyzer" {
  import type { Compiler, WebpackPluginInstance } from "webpack";
  interface BundleAnalyzerPluginOptions {
    analyzerMode?: "server" | "static" | "disabled";
    analyzerHost?: string;
    analyzerPort?: number | "auto";
    reportFilename?: string;
    defaultSizes?: "stat" | "parsed" | "gzip";
    openAnalyzer?: boolean;
    generateStatsFile?: boolean;
    statsFilename?: string;
    // TODO:TRACKD-DEFER: refine statsOptions structure (webpack stats config shape)
    statsOptions?: unknown;
    logLevel?: "info" | "warn" | "error" | "silent";
  }
  class BundleAnalyzerPlugin implements WebpackPluginInstance {
    constructor(options?: BundleAnalyzerPluginOptions);
    apply(compiler: Compiler): void;
  }
  export { BundleAnalyzerPlugin, BundleAnalyzerPluginOptions };
  export default BundleAnalyzerPlugin;
}
