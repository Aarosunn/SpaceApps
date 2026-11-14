/* Prefix public assets with the base path, so archived static snapshots work from a sub-folder. */
export const asset = (p: string) => `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${p}`;
