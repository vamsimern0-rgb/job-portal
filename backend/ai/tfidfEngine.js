/*
=========================================================
ENTERPRISE TF-IDF ENGINE
- Lightweight
- Fast
- Suitable for SaaS scale
- Compatible with cosineSimilarity
=========================================================
*/

import natural from "natural";

const tokenizer = new natural.WordTokenizer();

/* ================= TOKEN CLEANING ================= */

function cleanTokens(tokens = []) {
  return tokens
    .map(t => t.toLowerCase().trim())
    .filter(t => t.length > 2 && /^[a-zA-Z+#.]+$/.test(t));
}

/* ================= TOKENIZE TEXT ================= */

export function tokenizeText(text = "") {
  const raw = tokenizer.tokenize(text);
  return cleanTokens(raw);
}

/* ================= BUILD TF-IDF MODEL ================= */

export function buildTfIdfModel(documents = []) {
  const tfidf = new natural.TfIdf();

  documents.forEach(docTokens => {
    tfidf.addDocument(docTokens.join(" "));
  });

  return tfidf;
}

/* ================= VECTORIZE DOCUMENT ================= */

export function vectorizeDocument(tfidf, docIndex = 0) {
  const vector = {};

  tfidf.listTerms(docIndex).forEach(item => {
    vector[item.term] = item.tfidf;
  });

  return vector;
}