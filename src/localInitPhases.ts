/** 与前端 `web/src/utils/localInitApi.ts` 中顺序保持一致 */
export const LOCAL_INIT_PROGRESS_PHASES = [
  'create-roles',
  'write-workspace',
  'config-path',
  'config-channels',
  'config-bindings',
  'config-tools',
  'config-session',
  'config-validate',
  'gateway-restart',
  'done',
] as const;

export type LocalInitProgressPhase = (typeof LOCAL_INIT_PROGRESS_PHASES)[number];
export type LocalInitPhase = LocalInitProgressPhase | 'error';
