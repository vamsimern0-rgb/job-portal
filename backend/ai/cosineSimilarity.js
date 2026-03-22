/*
=========================================================
ENTERPRISE COSINE SIMILARITY ENGINE
- Proper vector normalization
- Returns value between 0 and 1
- Handles empty vectors safely
=========================================================
*/

const cosineSimilarity = (vecA = {}, vecB = {}) => {

  if (!vecA || !vecB) return 0;

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  const terms = new Set([
    ...Object.keys(vecA),
    ...Object.keys(vecB)
  ]);

  terms.forEach(term => {
    const valA = vecA[term] || 0;
    const valB = vecB[term] || 0;

    dotProduct += valA * valB;
    magnitudeA += valA * valA;
    magnitudeB += valB * valB;
  });

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) return 0;

  return dotProduct / (magnitudeA * magnitudeB);
};

export { cosineSimilarity };
export default cosineSimilarity;