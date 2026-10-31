import React from 'react';
import { ToolCallItem } from '../types';

export interface CitationSource {
  index: string;
  title: string;
  url: string;
  domain: string;
  snippet: string;
  fileName?: string;
  fileId?: string;
  pageNumber?: number;
  highlightText?: string;
}

export interface RetrievedChunk {
  sourceIndex: number;
  fileName: string;
  fileId?: string;
  pageNumber: number;
  score?: number;
  snippet: string;
}

/**
 * Extracts structured document chunks from retrieve_document_context tool calls
 */
export function extractRetrievedChunks(toolCalls?: ToolCallItem[]): RetrievedChunk[] {
  const chunks: RetrievedChunk[] = [];
  if (!toolCalls || toolCalls.length === 0) return chunks;

  for (const tool of toolCalls) {
    if (tool.name !== 'retrieve_document_context' || !tool.output) continue;

    // Primary pattern matching: **[Source 1]** Document: `file.pdf` | **Page 1** (ID: `...`, Score: 0.1234)
    // ```text\n{snippet}\n```
    const docRegex = /\*\*\[Source\s*(\d+)\]\*\*\s*Document:\s*`([^`]+)`\s*\|\s*\*\*Page\s*(\d+)\*\*(?:\s*\(ID:\s*`([^`]+)`(?:,\s*Score:\s*([0-9.]+))?\))?[^\n]*\n```(?:text)?\n([\s\S]*?)```/gi;
    let match;
    while ((match = docRegex.exec(tool.output)) !== null) {
      const sourceIndex = parseInt(match[1], 10);
      const fileName = match[2].trim();
      const pageNumber = parseInt(match[3], 10);
      const fileId = match[4]?.trim();
      const score = match[5] ? parseFloat(match[5]) : undefined;
      const snippet = match[6].trim();

      chunks.push({
        sourceIndex,
        fileName,
        fileId,
        pageNumber,
        score,
        snippet,
      });
    }

    // Fallback regex if formatting was slightly different
    if (chunks.length === 0) {
      const fallbackRegex = /\[Source\s*(\d+)\][^\n]*Document:\s*`?([^`\n|]+)`?[^\n]*Page\s*(\d+)[^\n]*\n```(?:text)?\n([\s\S]*?)```/gi;
      let fbMatch;
      while ((fbMatch = fallbackRegex.exec(tool.output)) !== null) {
        chunks.push({
          sourceIndex: parseInt(fbMatch[1], 10),
          fileName: fbMatch[2].trim(),
          pageNumber: parseInt(fbMatch[3], 10),
          snippet: fbMatch[4].trim(),
        });
      }
    }
  }

  return chunks;
}

/**
 * Extracts structured citation sources from tool calls (especially Tavily web_search outputs)
 */
export function extractCitationSources(toolCalls?: ToolCallItem[]): Record<string, CitationSource> {
  const sourcesMap: Record<string, CitationSource> = {};
  if (!toolCalls || toolCalls.length === 0) return sourcesMap;

  for (const tool of toolCalls) {
    if (!tool.output) continue;

    // Look for Tavily structured search output format
    const sourcesMatch = tool.output.match(/### Detailed Sources:\s*([\s\S]*)$/i);
    const sourcesRaw = sourcesMatch ? sourcesMatch[1].trim() : tool.output;

    const regex = /\[(\d+)\]\s*\*\*([^*]+)\*\*(?:\s*\([^)]+\))?\s*\n-\s*\*\*URL\*\*:\s*([^\n]+)\s*\n-\s*\*\*Snippet\*\*:\s*([\s\S]*?)(?=\[\d+\]\s*\*\*|$)/g;
    let match;
    while ((match = regex.exec(sourcesRaw)) !== null) {
      const index = match[1];
      const title = match[2].trim();
      const url = match[3].trim();
      const snippet = match[4].trim();

      let domain = '';
      try {
        if (url.startsWith('http://') || url.startsWith('https://')) {
          domain = new URL(url).hostname.replace(/^www\./, '');
        } else {
          domain = url.split('/')[0];
        }
      } catch {
        domain = 'web';
      }

      sourcesMap[index] = {
        index,
        title,
        url,
        domain,
        snippet,
      };
    }

    // Look for RAG Document Retrieval format:
    // **[Source 1]** Document: `employee_handbook.pdf` | **Page 4** (ID: `...`)
    // ```text\n{snippet}\n```
    const docRegex = /\*\*\[Source\s*(\d+)\]\*\*\s*Document:\s*`([^`]+)`\s*\|\s*\*\*Page\s*(\d+)\*\*(?:\s*\(ID:\s*`([^`]+)`\))?[^\n]*\n```(?:text)?\n([\s\S]*?)```/g;
    let docMatch;
    while ((docMatch = docRegex.exec(tool.output)) !== null) {
      const index = docMatch[1];
      const fileName = docMatch[2].trim();
      const pageNumStr = docMatch[3].trim();
      const docId = docMatch[4]?.trim();
      const snippet = docMatch[5].trim();
      const pageNumber = parseInt(pageNumStr, 10);

      const sourceObj: CitationSource = {
        index,
        title: `${fileName} (Page ${pageNumStr})`,
        url: `#page-${pageNumStr}`,
        domain: `Page ${pageNumStr}`,
        snippet,
        fileName,
        fileId: docId,
        pageNumber: isNaN(pageNumber) ? undefined : pageNumber,
        highlightText: snippet,
      };
      sourcesMap[index] = sourceObj;
      sourcesMap[`page-${pageNumStr}`] = sourceObj;
      sourcesMap[`Page ${pageNumStr}`] = sourceObj;
    }
  }

  return sourcesMap;
}

/**
 * Parses citation anchor tags like `#cite-page-4?doc=...` into structured fields.
 */
export function parseCitationAnchor(rawAnchor: string): {
  index: string;
  pageNumber?: number;
  highlightText?: string;
  fileName?: string;
} {
  const clean = rawAnchor.replace(/^#cite-/, '');
  const [indexPart, queryPart] = clean.split('?');
  let pageNumber: number | undefined = undefined;
  let fileName: string | undefined = undefined;

  if (indexPart.startsWith('page-')) {
    const p = parseInt(indexPart.replace('page-', ''), 10);
    if (!isNaN(p)) pageNumber = p;
  }

  if (queryPart) {
    const params = new URLSearchParams(queryPart);
    if (params.get('doc')) fileName = params.get('doc') || undefined;
    if (params.get('page')) {
      const p = parseInt(params.get('page')!, 10);
      if (!isNaN(p)) pageNumber = p;
    }
  }

  return {
    index: indexPart,
    pageNumber,
    fileName,
  };
}

/**
 * Pre-processes markdown to convert citation references like `[1]`, `[2]`, `[1, 2]`,
 * and page citations like `[Page 4: "quote"]`, `[Page 4]`, `[p.4]` into clean Markdown links like `[p.4](#cite-page-4)`.
 * Quotes are stripped out to keep prose clean and prevent URL clutter.
 */
export function transformCitationsInMarkdown(markdown: string): string {
  if (!markdown) return '';

  // Split by fenced code blocks (```...```) to avoid touching code snippets
  const parts = markdown.split(/(```[\s\S]*?```)/g);

  return parts
    .map((part, index) => {
      // If inside code block, do not transform
      if (index % 2 === 1) {
        return part;
      }

      // 1. Handle comma separated numeric citations like `[1, 2, 3]` -> `[1] [2] [3]`
      let transformed = part.replace(/\[(\d+(?:\s*,\s*\d+)+)\]/g, (_m, group) => {
        const nums = group.split(',').map((n: string) => n.trim());
        return nums.map((n: string) => `[${n}]`).join(' ');
      });

      // 2. Handle Document Page Citations with optional quotes or prefixes:
      // Examples:
      // `[Page 4: "exact quote"]`
      // `[Document: handbook.pdf, Page 4: "exact quote"]`
      // `[Doc: handbook.pdf, Page 4]`
      // `[Page 4]`
      // `[p.4]` or `[p. 4]`
      const docPageRegex = /\[(?:(?:Document|Doc):\s*([^,\]]+),\s*)?(?:Page|page|p\.)\s*(\d+)(?:\s*[:\-–]\s*["'“](?:[^"'”\]]+)["'”])?\](?!\()/gi;
      transformed = transformed.replace(docPageRegex, (_m, docName, pageNum) => {
        const docParam = docName ? `?doc=${encodeURIComponent(docName.trim())}` : '';
        return `[p.${pageNum}](#cite-page-${pageNum}${docParam})`;
      });

      // 3. Match standalone `[1]` not followed by `(`
      transformed = transformed.replace(/\[(\d+)\](?!\()/g, (_m, num) => {
        return `[${num}](#cite-${num})`;
      });

      return transformed;
    })
    .join('');
}

/**
 * Highlights matching keywords and numbers between the snippet and context statement
 */
export function highlightKeywordsInSnippet(snippet: string, keywords: string[]): React.ReactNode[] {
  if (!snippet) return [];
  if (!keywords || keywords.length === 0) return [snippet];

  // Filter meaningful words (length >= 3, not common stop words)
  const stopWords = new Set([
    'the', 'and', 'for', 'that', 'this', 'with', 'from', 'are', 'was', 'were',
    'have', 'has', 'had', 'what', 'when', 'where', 'which', 'who', 'how', 'about'
  ]);

  const validKeywords = keywords
    .map(k => k.trim())
    .filter(k => k.length >= 3 && !stopWords.has(k.toLowerCase()));

  if (validKeywords.length === 0) return [snippet];

  // Build regex safely escaping keywords
  const escaped = validKeywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escaped.join('|')})`, 'gi');

  const parts = snippet.split(regex);
  return parts.map((part, i) => {
    if (regex.test(part)) {
      return (
        <mark
          key={i}
          style={{
            background: 'rgba(254, 240, 138, 0.65)',
            color: '#78350F',
            padding: '1px 3px',
            borderRadius: '3px',
            fontWeight: 600,
          }}
        >
          {part}
        </mark>
      );
    }
    return part;
  });
}

/**
 * Searches page text for the exact verbatim quote or fuzzy top sentence match,
 * and wraps the matching text in an animated glowing amber highlight <mark id="active-rag-highlight">.
 */
export function highlightDocumentText(fullText: string, quote?: string): React.ReactNode {
  if (!fullText) return null;
  const target = quote?.trim();
  if (!target || target.length < 3) {
    return fullText;
  }

  // 1. Try Exact / Substring match (case-insensitive & whitespace-normalized)
  const escapedTarget = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const exactRegex = new RegExp(escapedTarget, 'i');
  const exactMatch = exactRegex.exec(fullText);

  if (exactMatch && exactMatch.index !== undefined) {
    const start = exactMatch.index;
    const end = start + exactMatch[0].length;
    return (
      <>
        {fullText.slice(0, start)}
        <mark
          id="active-rag-highlight"
          className="rag-document-highlight"
          style={{
            background: '#FEF08A',
            color: '#854D0E',
            padding: '2px 6px',
            borderRadius: '4px',
            border: '1.5px solid #FACC15',
            boxShadow: '0 0 14px rgba(250, 204, 21, 0.55)',
            fontWeight: 700,
            scrollMargin: '120px',
          }}
        >
          {fullText.slice(start, end)}
        </mark>
        {fullText.slice(end)}
      </>
    );
  }

  // 2. Fuzzy sentence match (splits text into sentences and scores token overlap)
  const sentences = fullText.split(/(?<=[.!?\n])\s+/);
  const targetWords = target
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length >= 3);

  if (targetWords.length === 0) {
    return fullText;
  }

  let bestIndex = -1;
  let bestScore = 0;

  sentences.forEach((sentence, idx) => {
    const sWords = new Set(
      sentence.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/)
    );
    let matchCount = 0;
    for (const w of targetWords) {
      if (sWords.has(w)) matchCount++;
    }
    const score = matchCount / targetWords.length;
    if (score > bestScore && score >= 0.25) {
      bestScore = score;
      bestIndex = idx;
    }
  });

  if (bestIndex !== -1) {
    return (
      <>
        {sentences.slice(0, bestIndex).join(' ')}{' '}
        <mark
          id="active-rag-highlight"
          className="rag-document-highlight"
          style={{
            background: '#FEF08A',
            color: '#854D0E',
            padding: '2px 6px',
            borderRadius: '4px',
            border: '1.5px solid #FACC15',
            boxShadow: '0 0 14px rgba(250, 204, 21, 0.55)',
            fontWeight: 700,
            scrollMargin: '120px',
          }}
        >
          {sentences[bestIndex]}
        </mark>{' '}
        {sentences.slice(bestIndex + 1).join(' ')}
      </>
    );
  }

  return fullText;
}
