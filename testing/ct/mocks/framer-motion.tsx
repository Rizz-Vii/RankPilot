export const motion = new Proxy(
  {},
  {
    get: () => (props: any) => <div {...props} />,
  }
);
export const AnimatePresence = ({ children }: any) => <>{children}</>;
