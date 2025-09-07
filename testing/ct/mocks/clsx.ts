export type ClassValue = any;
export function clsx(...classes: any[]): string {
  return classes.filter(Boolean).join(" ");
}
export default clsx;
