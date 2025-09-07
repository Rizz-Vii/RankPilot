export default function LoadingScreen(props: {
  fullScreen?: boolean;
  text?: string;
  className?: string;
}) {
  return <div data-testid="loading-screen">{props.text || "Loading..."}</div>;
}
