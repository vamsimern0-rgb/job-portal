/*
=========================================================
SIMPLE AI RECOMMENDATION ENGINE
- Skill match scoring
- Lightweight logic
=========================================================
*/

export function calculateMatchScore(studentSkills = [], jobSkills = []) {

  if (!Array.isArray(studentSkills)) studentSkills = [];
  if (!Array.isArray(jobSkills)) jobSkills = [];

  const normalizedStudent = studentSkills.map(s =>
    s.toLowerCase().trim()
  );

  const normalizedJob = jobSkills.map(s =>
    s.toLowerCase().trim()
  );

  if (normalizedJob.length === 0) return 0;

  const matches = normalizedJob.filter(skill =>
    normalizedStudent.includes(skill)
  );

  const score = (matches.length / normalizedJob.length) * 100;

  return Math.round(score);
}