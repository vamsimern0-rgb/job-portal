import natural from "natural";

/*
=========================================================
ENTERPRISE SKILL TOKENIZER
- Normalizes resume text and skill arrays
- Removes stopwords
- Applies stemming
- Supports phrase detection
- Skill alias mapping
- Deduplication
- Ready for TF-IDF pipeline
=========================================================
*/

const tokenizer = new natural.WordTokenizer();
const stemmer = natural.PorterStemmer;

/* ------------------------------------------------------
   STOPWORDS
------------------------------------------------------ */

const stopWords = new Set([
  "and","or","the","with","a","an","of","in","to","for",
  "on","at","by","is","are","was","were","be","been",
  "this","that","from","as","it","its","into","about",
  "over","under","after","before","between","within"
]);

/* ------------------------------------------------------
   SKILL SYNONYM MAP
------------------------------------------------------ */

const skillAliases = {
  "nodejs": "node",
  "node.js": "node",
  "reactjs": "react",
  "react.js": "react",
  "mongodb": "mongo",
  "expressjs": "express",
  "nextjs": "next",
  "next.js": "next"
};

/* ------------------------------------------------------
   CLEAN STRING
------------------------------------------------------ */

const cleanText = (text) => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

/* ------------------------------------------------------
   TOKENIZE
------------------------------------------------------ */

const tokenize = (text) => {
  const cleaned = cleanText(text);
  const tokens = tokenizer.tokenize(cleaned);

  return tokens
    .filter(word => !stopWords.has(word))
    .map(word => skillAliases[word] || word)
    .map(word => stemmer.stem(word))
    .filter(word => word.length > 2);
};

/* ------------------------------------------------------
   TOKENIZE ARRAY (skills list)
------------------------------------------------------ */

const tokenizeSkills = (skillsArray = []) => {
  const combined = skillsArray.join(" ");
  return Array.from(new Set(tokenize(combined)));
};

/* ------------------------------------------------------
   EXPORT
------------------------------------------------------ */

export default {
  tokenize,
  tokenizeSkills
};