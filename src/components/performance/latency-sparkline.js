// Wrapper to provide both default and named export for LatencySparkline without causing re-export resolution issues.
import LatencySparklineDefault from "./latency-sparkline";
// If underlying module already exports named LatencySparkline, re-export it; else create one.
export { LatencySparklineDefault as LatencySparkline };
export default LatencySparklineDefault;
