/* Minimal types for the copied UMD recipe modules (they are plain JS). */
declare module "*/sonify-core.js" {
  const core: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  export default core;
}
declare module "*/jukebox-engine.js" {
  const engine: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  export default engine;
}
