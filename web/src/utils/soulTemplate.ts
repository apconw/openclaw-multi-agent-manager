/**
 * 从 soulTemplate 中解析出核心职责和工作准则
 */
export function parseSoulSections(soulTemplate: string): {
  coreMission: string;
  criticalRules: string;
} {
  const coreMissionMatch = soulTemplate.match(/## 核心职责\s*\n([\s\S]*?)(?=\n## |$)/);
  const criticalRulesMatch = soulTemplate.match(/## 工作准则\s*\n([\s\S]*?)(?=\n## |$)/);

  return {
    coreMission: coreMissionMatch ? coreMissionMatch[1].trim() : '',
    criticalRules: criticalRulesMatch ? criticalRulesMatch[1].trim() : '',
  };
}
