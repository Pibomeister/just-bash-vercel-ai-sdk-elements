# Web Research: Legal RAG Chunking Best Practices

## Status Note

**Research Incomplete**: The web research agents for community-sourced legal RAG chunking best practices were killed before completing their investigation. This document summarizes what IS known from existing internal research and identifies critical research gaps.

---

## Known Findings

The following findings are based on existing research documentation (`vectors-structured-extension-llama-cloud.md`) and verified LlamaCloud API types:

### 1. Optimal Chunk Sizes for Legal Text

**Legislation and Contracts**: 256-512 tokens
- Articles in legislation are typically 200-800 tokens
- Clauses in contracts are typically 150-600 tokens
- 512-token chunks accommodate most legal units with headroom for hierarchical context

**Court Rulings**: 500-1000 tokens
- Considerandos vary widely: 100-2000 tokens
- Larger chunks preserve complex legal reasoning flow
- 50-token overlap captures cross-considerando references

### 2. Hierarchical Context Prepending

**Critical for Legal RAG**: Always prepend hierarchical metadata to chunks.

**Why**:
- Legal meaning depends on structural position (e.g., "Article 47" vs "Article 47, Section III")
- Embeddings encode both content AND position
- Retrieval returns legally interpretable results

**Template**:
```
[{document_type} > {document_name} > {titulo} > {capitulo} > {articulo}]

{chunk_content}
```

### 3. LlamaCloud Chunking Modes

**Available Modes** (from verified API types):
- **Auto**: LlamaCloud selects strategy (512 tokens, 50 overlap default)
- **Character**: Exact character boundaries (rare for legal text)
- **Token**: Token-based chunks (cost optimization)
- **Sentence**: Sentence-aware chunking (recommended for legislation)
- **Semantic**: Embedding-based breakpoints (recommended for court rulings)

**Legal Recommendation**:
- Use **sentence chunking** for well-structured documents (legislation, contracts)
- Use **semantic chunking** for variable-length units (court rulings, considerandos)

### 4. Hybrid Search Configuration

**Recommended Alpha**: 0.5 (equal weight to vector + keyword)

**Rationale**:
- Legal queries mix semantic concepts ("mala fe") and exact terms ("Artículo 123")
- Hybrid search captures both patterns
- LlamaCloud's `auto_routed` retrieval mode automatically selects optimal strategy

### 5. Mexican Legal Document Structure

**Hierarchy** (Legislation):
```
TITULO (Title)
  └─ CAPITULO (Chapter)
      └─ ARTICULO (Article)
          └─ fracción (Section)
              └─ inciso (Subsection)
```

**Hierarchy** (Court Rulings):
```
VISTOS (Viewed/Seen)
RESULTANDOS (Whereas/Facts)
CONSIDERANDOS (Considerations/Reasoning)
PUNTOS RESOLUTIVOS (Resolutions/Orders)
```

**Chunking Boundary**: Always respect these structural units (never split mid-article or mid-considerando).

### 6. Embedding Model for Spanish Legal Text

**Recommended**: `llama-text-embed-v2`
- **26 languages** including Spanish
- **+20% performance** vs OpenAI `text-embedding-3-large` on Spanish legal corpus
- **Dynamic dimensions**: 256, 512, 1024 (storage cost optimization)

**Alternative**: NVIDIA `llama-embed-nemotron-8b`
- **#1 MTEB multilingual ranking**
- **4096-dimensional** embeddings (highest accuracy)
- **Trade-off**: Higher storage/compute costs

---

## Research Gaps

The following questions remain unanswered due to incomplete web research:

### 1. Community Best Practices

**Missing**:
- Are there public benchmarks comparing chunking strategies on legal corpora?
- What do legal tech companies (e.g., Casetext, vLex, Ross Intelligence) use for chunking?
- Are there published papers on legal RAG chunking strategies?

**Why It Matters**: Community validation could reveal optimizations or edge cases not covered in internal research.

### 2. Chunking Strategy Comparisons

**Missing**:
- Sentence chunking vs semantic chunking on legal benchmarks (Recall@K, Precision@K)
- Impact of chunk overlap (0 vs 50 vs 100 tokens) on retrieval quality
- Performance differences between token-based and sentence-based chunking for contracts

**Why It Matters**: Quantitative comparisons would validate the "sentence for legislation, semantic for rulings" recommendation.

### 3. Real-World Performance Metrics

**Missing**:
- What retrieval quality (Recall@10, MRR) do production legal RAG systems achieve?
- What chunk sizes do deployed systems use in practice?
- How do users evaluate chunk quality (user feedback, click-through rates)?

**Why It Matters**: Real-world metrics provide ground truth beyond theoretical recommendations.

### 4. Cross-Lingual Legal RAG

**Missing**:
- How do multilingual legal systems chunk mixed-language documents (Spanish + English contracts)?
- Do cross-lingual embeddings (e.g., `llama-embed-nemotron-8b`) require different chunk sizes?
- Are there best practices for chunking translated legal text (e.g., treaties)?

**Why It Matters**: Mexican legal corpus includes English contracts, international treaties, and foreign case law references.

### 5. Metadata Schema Standards

**Missing**:
- Are there industry-standard metadata schemas for legal documents (e.g., LegalRuleML, Akoma Ntoso)?
- Do legal RAG systems use controlled vocabularies (e.g., EUROVOC, Library of Congress Subject Headings)?
- How do production systems handle document versioning (reformed vs original text)?

**Why It Matters**: Standardized metadata improves interoperability and cross-system retrieval.

### 6. Contextual Chunking Techniques

**Missing**:
- Do any systems use LLM-based contextual chunking (e.g., Anthropic's contextual retrieval)?
- What is the cost/performance trade-off of prepending LLM-generated context vs static hierarchical context?
- Are there open-source implementations of contextual chunking for legal text?

**Why It Matters**: LLM-generated context could improve retrieval quality beyond static metadata prepending.

---

## Recommendations for Future Research

### High Priority

1. **Benchmark Chunking Strategies**
   - Create test corpus: 1000 Mexican legal documents (legislation, contracts, rulings)
   - Compare: sentence, semantic, token, hybrid chunking
   - Metrics: Recall@10, Precision@10, MRR, latency
   - Publish results for community validation

2. **Survey Legal RAG Deployments**
   - Interview legal tech companies about chunking practices
   - Collect real-world performance metrics
   - Document production system configurations

3. **Test Cross-Lingual Chunking**
   - Create bilingual test corpus (Spanish-English contracts)
   - Compare embeddings: `llama-text-embed-v2` vs `llama-embed-nemotron-8b`
   - Measure retrieval quality across languages

### Medium Priority

4. **Evaluate Contextual Chunking**
   - Implement LLM-based context prepending (e.g., Claude Opus)
   - Compare cost and retrieval quality vs static context
   - Measure impact on Mexican legal corpus

5. **Standardize Metadata Schema**
   - Map Mexican legal structure to LegalRuleML/Akoma Ntoso
   - Create controlled vocabulary for legal_domain field
   - Validate against DOF (Diario Oficial de la Federación) conventions

### Low Priority

6. **Open-Source Legal RAG Toolkit**
   - Release chunking configurations as open-source templates
   - Provide LlamaCloud pipeline presets for legal text
   - Document integration with Mexican legal databases (e.g., SCJN, DOF)

---

## Known Tools and Resources

While web research was incomplete, the following tools are mentioned in existing research:

### LlamaCloud Pipeline API
- **Transform Config**: Supports sentence, semantic, token, character chunking
- **Segmentation**: Element-based segmentation for structured legal documents
- **Hybrid Search**: Alpha-weighted vector + keyword retrieval

### Embedding Models
- **llama-text-embed-v2**: 26 languages, dynamic dimensions
- **NVIDIA llama-embed-nemotron-8b**: #1 MTEB multilingual

### Legal Document Standards
- **LegalRuleML**: XML schema for legal documents
- **Akoma Ntoso**: XML for parliamentary, legislative, and judiciary documents
- **EUROVOC**: Multilingual thesaurus for legal domains (EU-focused)

---

## Conclusion

This document captures the current state of knowledge on legal RAG chunking strategies based on internal research and verified API types. The identified research gaps represent opportunities for future investigation to validate and refine the existing recommendations.

**Key Takeaway**: Current recommendations (sentence chunking for legislation, semantic for rulings, 512-token chunks, hierarchical context prepending) are based on sound principles but lack community validation and real-world performance data.

**Next Steps**: Execute high-priority research tasks to fill critical gaps and publish findings for community feedback.

---

## Sources

1. **Internal Research** — `ai/docs/research/vectors-structured-extension-llama-cloud.md`
2. **LlamaCloud API Types** — Verified from `@llamaindex/llama-cloud` v0.2.18
3. **Mexican Legal Structure** — Diario Oficial de la Federación (DOF) conventions
4. **MTEB Leaderboard** — Multilingual embedding model rankings
5. **Legal Document Standards** — LegalRuleML, Akoma Ntoso (referenced but not researched)
