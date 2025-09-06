export const motion = new Proxy({}, {
    get: () => (props: any) => <div {...props} />,
});
