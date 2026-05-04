# Answer-First Architecture

## 1. Technical Mechanism
- **Information Entropy:** Minimizing entropy at the start of a document allows retrieval systems (RAG) to extract definitive answers without parsing complex rhetorical structures.
- **Extractive QA:** LLMs utilize extractive question-answering models to isolate spans of text that directly answer the query. "Is/Are" statements serve as high-probability anchors.
- **Semantic Chunking:** Modern vector databases chunk documents by paragraphs or sentences; a self-contained answer in chunk #1 maximizes cosine similarity with direct user queries.

## 2. Mermaid Diagram
```mermaid
flowchart LR;
    Q[User Query: "What is X?"] --> DB[(Vector DB)];
    DB --> |Cosine Similarity Search| C1[Chunk 1: Direct Definition];
    DB -.-> |Low Similarity| C2[Chunk 2: Historical Context];
    C1 --> Output[LLM Generates Answer citing Chunk 1];
```

## 3. Implementation Specifications
- **Syntactic Structure:** Use the format `[Entity] is a [Category] that [Function]`.
- **Avoid Preambles:** Do not start with historical context or marketing fluff.
- **List Priming:** Immediately follow the definition with an `<ul>` tag detailing 3-4 core attributes.

## 4. References
- [Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks (Lewis et al.)](https://arxiv.org/abs/2005.11401)