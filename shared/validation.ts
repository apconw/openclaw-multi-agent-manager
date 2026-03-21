/**
 * Shared validation logic for Feishu credentials.
 * Used by both the Skill (server-side) and the Web UI (client-side).
 */

export function validateFeishuCredentials(
  appId: string,
  appSecret: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!appId) {
    errors.push('App ID 不能为空');
  } else if (!appId.startsWith('cli_')) {
    errors.push('App ID 必须以 cli_ 开头');
  } else if (appId.length < 10) {
    errors.push('App ID 长度过短（至少 10 位）');
  }

  if (!appSecret) {
    errors.push('App Secret 不能为空');
  } else if (appSecret.length !== 32) {
    errors.push(`App Secret 必须是 32 位（当前 ${appSecret.length} 位）`);
  }

  return { valid: errors.length === 0, errors };
}
