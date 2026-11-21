let pendingSkill = "";

export function markSkillFocus(categoryId: string, index: number) {
  pendingSkill = `${categoryId}:${index}`;
}

export function skillShouldFocus(categoryId: string, index: number) {
  return pendingSkill === `${categoryId}:${index}`;
}

export function clearSkillFocus() {
  pendingSkill = "";
}
