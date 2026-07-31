# 🚀 Enterprise Retrieval-Augmented Generation (RAG) Platform

Production-ready, full-stack Enterprise RAG Chatbot Platform built with **React**, **Vite**, **TypeScript**, **TailwindCSS**, **Node.js/Express**, **LangChain JS (LCEL)**, **Groq (llama-3.3-70b-versatile)**, **BAAI/bge-small-en-v1.5 Embeddings via HuggingFace**, and **Pinecone Vector Database**.

---

## 🌟 Key Architecture Highlights

- **Clean Architecture & SOLID Principles**: Modular feature-based structure with clear separation between Controllers, Services, Repositories, Loaders, and Vector Stores.
- **Strict Zero-Hallucination Guardrails**: LCEL system prompt restricts answers *strictly* to retrieved document context. Unfound information triggers standardized default response without fabrication.
- **Multiformat Document Ingestion**: Native parsing for **PDF**, **DOCX**, **TXT**, **Markdown**, **CSV**, and **HTML** files with automatic text cleaning and metadata generation.
- **Advanced Vector Retrieval**: Support for **Cosine Similarity Search**, **Maximum Marginal Relevance (MMR)**, **History-Aware Question Rephrasing**, **Metadata Filtering**, and **Context Compression**.
- **Real-Time Telemetry & SSE Streaming**: Server-Sent Events (SSE) streaming chat completion with live metrics (total latency, token usage, embedding generation speed, vector search latency, verified citation cards with similarity scores).
- **Comprehensive Fallback Modes**: Fully functional local vector memory and context synthesis engines if external API keys (`PINECONE_API_KEY`, `GROQ_API_KEY`, `HUGGINGFACE_API_KEY`) are missing during offline testing.

---

## 📐 Architecture Diagrams

### 1. High-Level System Architecture Diagram (ASCII)

```
+-----------------------------------------------------------------------------------+
|                                 REACT FRONTEND                                    |
|   +------------------+  +------------------+  +------------------+                |
|   |  Chat Window     |  | Sidebar & Memory |  | Document Manager |                |
|   |  (Streaming SSE) |  | Session Store    |  | Dropzone Upload  |                |
|   +--------+---------+  +--------+---------+  +--------+---------+                |
|            |                     |                     |                          |
|            +---------------------+---------------------+                          |
|                                  | (REST & SSE Stream)                            |
+----------------------------------|------------------------------------------------+
                                   v
+----------------------------------|------------------------------------------------+
|                                 BACKEND API                                       |
|   +---------------------------------------------------------------------------+   |
|   | Controller Layer (Chat, Document, Session, Metrics)                      |   |
|   +------------------------------------+--------------------------------------+   |
|                                        |                                          |
|   +------------------------------------v--------------------------------------+   |
|   | Service Layer & Repositories                                              |   |
|   | (DocumentService, ChatService, SessionRepository, DocumentRepository)      |   |
|   +------------------------------------+--------------------------------------+   |
|                                        |                                          |
|   +------------------------------------v--------------------------------------+   |
|   | RAG Core Engine (LCEL Engine)                                             |   |
|   | +-----------------+ +-------------------+ +-------------------+           |   |
|   | | DocumentLoader  | | RecursiveSplitter | | TextCleaner & Meta|           |   |
|   | +--------+--------+ +---------+---------+ +---------+---------+           |   |
|   |          v                    v                     v                     |   |
|   | +-------------------------------------------------------------+           |   |
|   | | EmbeddingService (BAAI/bge-small-en-v1.5 HuggingFace)       |           |   |
|   | +-----------------------------+-------------------------------+           |   |
|   |                               v                                           |   |
|   | +-------------------------------------------------------------+           |   |
|   | | RetrieverService & ContextCompressor (Similarity / MMR)     |           |   |
|   | +-----------------------------+-------------------------------+           |   |
|   |                               v                                           |   |
|   | +-------------------------------------------------------------+           |   |
|   | | Groq LLM (llama-3.3-70b-versatile streaming response)       |           |   |
|   | +-------------------------------------------------------------+           |   |
|   +------------------------------------+--------------------------------------+   |
+----------------------------------------|------------------------------------------+
                                         v
+----------------------------------------+------------------------------------------+
|                            EXTERNAL SERVICES & PERSISTENCE                        |
|   +-----------------------+ +-----------------------+ +-----------------------+   |
|   | HuggingFace API       | | Pinecone Vector Store | | Groq Inference Engine |   |
|   | (384-dim Embeddings)  | | (Namespaced Index)   | | (LLaMA-3.3 70B)       |   |
|   +-----------------------+ +-----------------------+ +-----------------------+   |
+-----------------------------------------------------------------------------------+
```

---

### 2. Document Ingestion Pipeline Data Flow Diagram (ASCII)

```
  [User File Upload (PDF, DOCX, CSV, TXT, HTML, MD)]
                          |
                          v
         +----------------------------------+
         |     DocumentLoaderFactory        |
         | (pdf-parse / mammoth / cheerio)  |
         +----------------+-----------------+
                          |
                          v
         +----------------------------------+
         |           TextCleaner            |
         | (Control char strip & normalize) |
         +----------------+-----------------+
                          |
                          v
         +----------------------------------+
         |        MetadataGenerator         |
         | (docId, chunkId, page, timestamp)|
         +----------------+-----------------+
                          |
                          v
         +----------------------------------+
         | RecursiveCharacterTextSplitter   |
         | (chunkSize: 1000, overlap: 200)  |
         +----------------+-----------------+
                          |
                          v
         +----------------------------------+
         |        EmbeddingService          |
         |   (BAAI/bge-small-en-v1.5)       |
         +----------------+-----------------+
                          |
                          v
         +----------------------------------+
         |         PineconeService          |
         |   (Upsert 384-dim vectors)       |
         +----------------+-----------------+
                          |
                          v
          [Indexed Knowledge Available]
```

---

### 3. Query Sequence Diagram (ASCII)

```
Client App            Express Server         RetrieverService       Pinecone / HF          Groq LLM
    |                       |                       |                      |                  |
    |--- POST /api/chat --->|                       |                      |                  |
    |                       |-- 1. Rephrase Query ->|                      |                  |
    |                       |                       |-- 2. Embed Query --->|                  |
    |                       |                       |<- Vector Embedding --|                  |
    |                       |                       |-- 3. Query Index --->|                  |
    |                       |                       |<- Chunks & Scores ---|                  |
    |                       |<- Top K Chunks -------|                      |                  |
    |                       |-- 4. Stream Prompt ------------------------------------------->|
    |<- SSE Tokens Stream --|<-- Token Chunks ------------------------------------------------|
    |<- SSE Final Metrics --|                       |                      |                  |
```

---

## 🛠️ Environment Variables Configuration

Create a `.env` file in the `backend/` directory:

```ini
PORT=5000
NODE_ENV=development

# Groq LLM API Key (llama-3.3-70b-versatile)
GROQ_API_KEY=gsk_your_groq_api_key_here

# HuggingFace API Key (BAAI/bge-small-en-v1.5)
HUGGINGFACE_API_KEY=hf_your_huggingface_api_key_here

# Pinecone Vector Database Config
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX=rag-platform-index
PINECONE_NAMESPACE=default

# RAG Configuration Defaults
MAX_FILE_SIZE=10485760
TOP_K=4
SIMILARITY_THRESHOLD=0.7
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
```

---

## 📦 Installation & Local Setup

### 1. Install Backend Dependencies

```bash
cd backend
npm install
```

### 2. Run Backend Server

```bash
# Development Mode with Live Watch
npm run dev

# Run Backend Unit & Integration Tests
npm run test
```

### 3. Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

### 4. Run Frontend Server

```bash
# Vite Development Server (Port 3000)
npm run dev
```

Open your browser at `http://localhost:3000`.

---

## 🐳 Docker Deployment

To launch the complete platform in isolated production Docker containers:

```bash
docker-compose up --build
```

- **Frontend Access**: `http://localhost:3000` (Nginx container)
- **Backend API**: `http://localhost:5000` (Node.js API container)

---

## 🧪 End-to-End Testing Guide

### Sample Document for Testing (`sample_policy.txt`)

Create a text file with the following content:

```text
ACME Enterprise Cloud Security Policy (v4.2)
Section 1: Data Encryption Standards
All customer data stored within ACME databases must be encrypted at rest using AES-256 bits algorithm.
Data in transit across public networks must use TLS 1.3 encryption protocol with minimum RSA-4096 key pairs.

Section 2: Authentication and Access Controls
All employee access to cloud management consoles requires mandatory Multi-Factor Authentication (MFA).
Passwords must be at least 16 characters long containing uppercase, lowercase, special symbols, and numbers.
Access permissions follow the Principle of Least Privilege and are audited quarterly by security team.
```

### Ingestion Steps:
1. Click **Upload Files** or drag `sample_policy.txt` into the modal dialog.
2. Click **Ingest Documents to Pinecone**.
3. Verify the document appears in the library as `INDEXED`.

### Sample Chat Queries to Try:
- **Query 1**: "What encryption standard is required for data at rest?"
  - *Expected Response*: AES-256 bits algorithm, citing `sample_policy.txt (Page 1)`.
- **Query 2**: "What is the password requirement?"
  - *Expected Response*: At least 16 characters with uppercase, lowercase, special symbols, and numbers.
- **Query 3 (Hallucination Guard Test)**: "Who is the CEO of Apple?"
  - *Expected Response*: "I couldn't find that information in the uploaded documents."

---

## 📊 REST API Documentation

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/upload` | Upload and ingest multiple files (PDF, DOCX, CSV, TXT, HTML, MD). |
| `POST` | `/api/chat` | Execute streaming (SSE) or JSON RAG query with history & metrics. |
| `GET` | `/api/documents` | Retrieve list of ingested documents and chunk stats. |
| `DELETE`| `/api/documents/:id` | Delete document and wipe associated vectors from Pinecone. |
| `GET` | `/api/sessions` | Fetch all chat conversation sessions. |
| `POST` | `/api/sessions` | Create a new conversation session. |
| `DELETE`| `/api/sessions/:id` | Delete conversation session. |
| `GET` | `/api/metrics` | Get aggregate system telemetry (latency, token usage, Pinecone stats). |
| `GET` | `/api/health` | Health check endpoint. |

---

## 🔒 Security & Best Practices

- **Helmet Header Hardening**: Protection against XSS, clickjacking, and mime-sniffing.
- **Multer File Validation**: Strict file type verification and size limit enforcement.
- **Zod Input Schema Validation**: Comprehensive request parameter validation.
- **Express Rate Limiting**: Abuse protection on API endpoints.
- **Zero-Hallucination Prompts**: Defensive system prompts prohibiting model extrapolation outside context.

---

## 🔮 Future Improvements

- Multi-modal embeddings support for images/diagrams within PDFs.
- Hybrid BM25 + Vector Dense Search reranking integration.
- Distributed Redis caching for vector query embeddings.
