import { inflateSync } from "node:zlib";
import type {
  EnrichmentSourceResult,
  EnrichmentSourceType,
  EnrichmentSuggestion,
  EnrichmentSuggestionField,
} from "@/lib/types";

type ExtractedPage = {
  pageTitle: string;
  description: string;
  text: string;
  emails: string[];
  phones: string[];
  links: string[];
  images: string[];
  notes: string[];
};

type UploadInput = {
  name: string;
  type: string;
  buffer: Buffer;
};

const URL_TIMEOUT_MS = 10000;
const PDF_TEXT_LIMIT = 12000;

export function detectEnrichmentSourceType(rawUrl: string): EnrichmentSourceType {
  let parsed: URL;

  try {
    parsed = new URL(rawUrl);
  } catch {
    return "custom-profile";
  }

  const host = parsed.hostname.toLowerCase();
  const path = parsed.pathname.toLowerCase();

  if (path.includes("cover-letter") || path.includes("cover_letter") || path.includes("coverletter")) {
    return "cover-letter";
  }

  if (path.endsWith(".pdf") || path.includes("resume") || path.includes("cv")) {
    return "resume";
  }

  if (host.includes("linkedin.com")) {
    return "linkedin";
  }

  if (host.includes("joinhandshake.com") || host.includes("handshake")) {
    return "handshake";
  }

  if (host.includes("portfolio")) {
    return "portfolio-website";
  }

  return "personal-website";
}

export async function enrichSources(params: { urls: string[]; files: UploadInput[] }) {
  const urlResults = await Promise.all(
    Array.from(new Set(params.urls.map((url) => url.trim()).filter(Boolean))).map((url) =>
      enrichPublicSource(url),
    ),
  );
  const fileResults = params.files.length > 0 ? params.files.map((file) => enrichUploadedPdf(file)) : [];

  return {
    sources: [...urlResults, ...fileResults],
  };
}

async function enrichPublicSource(sourceUrl: string): Promise<EnrichmentSourceResult> {
  const sourceType = detectEnrichmentSourceType(sourceUrl);
  const sourceLabel = buildSourceLabel(sourceType, sourceUrl);

  try {
    const response = await fetchSource(sourceUrl);
    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    const loginBlockedReason = detectBlockedReason(sourceType, response, contentType);

    if (loginBlockedReason) {
      return buildFailedResult({
        sourceUrl,
        sourceType,
        sourceLabel,
        reason: loginBlockedReason,
      });
    }

    if (!response.ok) {
      return buildFailedResult({
        sourceUrl,
        sourceType,
        sourceLabel,
        reason:
          response.status >= 500
            ? "Inaccessible public page: the source returned a server error."
            : `Inaccessible public page: the source returned HTTP ${response.status}.`,
      });
    }

    const isPdf = contentType.includes("pdf") || sourceType === "resume";

    if (isPdf) {
      return buildPublicPdfResult(sourceUrl, sourceType, sourceLabel);
    }

    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return buildFailedResult({
        sourceUrl,
        sourceType,
        sourceLabel,
        reason: `Unsupported format: this source responded with ${contentType || "an unknown content type"}.`,
      });
    }

    const html = await response.text();

    if (!html.trim()) {
      return buildFailedResult({
        sourceUrl,
        sourceType,
        sourceLabel,
        reason: "Inaccessible public page: the source returned an empty response.",
      });
    }

    const extracted = extractHtmlPage(html, sourceUrl);
    const suggestions = buildSuggestions({
      sourceUrl,
      sourceType,
      sourceLabel,
      extracted,
    });

    return {
      sourceUrl,
      sourceType,
      sourceLabel,
      pageTitle: extracted.pageTitle,
      suggestions,
      notes: extracted.notes,
      images: extracted.images.slice(0, 3),
      warnings:
        suggestions.length === 0
          ? ["No safe portfolio suggestions were detected from this public source."]
          : [],
      status: "success",
    };
  } catch (error) {
    return buildFailedResult({
      sourceUrl,
      sourceType,
      sourceLabel,
      reason: explainFetchFailure(error, sourceType),
    });
  }
}

function enrichUploadedPdf(file: UploadInput): EnrichmentSourceResult {
  const isCoverLetter = /cover[-_\s]?letter/i.test(file.name);
  const sourceType: EnrichmentSourceType = isCoverLetter ? "local-cover-letter" : "local-resume";
  const sourceLabel = isCoverLetter ? `Uploaded cover letter: ${file.name}` : `Uploaded resume: ${file.name}`;
  const sourceUrl = `upload://${file.name}`;

  if (!file.type.includes("pdf") && !file.name.toLowerCase().endsWith(".pdf")) {
    return buildFailedResult({
      sourceUrl,
      sourceType,
        sourceLabel,
        sourceName: file.name,
        reason: "Unsupported format: only PDF resumes and cover letters are supported right now.",
      });
  }

  try {
    const text = extractPdfText(file.buffer);

    if (!text.trim()) {
      return buildFailedResult({
        sourceUrl,
        sourceType,
        sourceLabel,
        sourceName: file.name,
        reason: isCoverLetter
          ? "Unsupported or image-only PDF: no extractable text was found in the uploaded cover letter."
          : "Unsupported or image-only PDF: no extractable text was found in the uploaded resume.",
      });
    }

    const extracted = extractTextOnlyPage(text, file.name);
    const suggestions = buildSuggestions({
      sourceUrl,
      sourceType,
      sourceLabel,
      extracted,
    });

    return {
      sourceUrl,
      sourceName: file.name,
      sourceType,
      sourceLabel,
      pageTitle: file.name,
      suggestions,
      notes: extracted.notes,
      images: [],
      warnings:
        suggestions.length === 0
          ? ["The resume text was extracted, but no safe structured suggestions were found to apply automatically."]
          : [],
      status: "success",
    };
  } catch {
    return buildFailedResult({
      sourceUrl,
      sourceType,
      sourceLabel,
      sourceName: file.name,
      reason: "The uploaded PDF could not be read. Try a text-based PDF instead of a scanned image file.",
    });
  }
}

async function fetchSource(sourceUrl: string) {
  return fetch(sourceUrl, {
    headers: {
      "User-Agent": "repo2site-enrichment/1.0",
      Accept: "text/html,application/pdf;q=0.9,*/*;q=0.2",
    },
    signal: AbortSignal.timeout(URL_TIMEOUT_MS),
  });
}

function detectBlockedReason(sourceType: EnrichmentSourceType, response: Response, contentType: string) {
  if ([401, 403].includes(response.status)) {
    return sourceType === "linkedin" || sourceType === "handshake"
      ? "Login required or blocked site: this profile is not accessible as a public page."
      : "Blocked site: this public source returned an authorization error.";
  }

  if (response.status === 404) {
    return "Inaccessible public page: the supplied URL returned 404.";
  }

  if (response.redirected && /login|signin|auth/i.test(response.url)) {
    return "Login required: this source redirects to an authentication page, so Repo2Site cannot import it.";
  }

  if (sourceType === "linkedin" || sourceType === "handshake") {
    const serverHeader = response.headers.get("server")?.toLowerCase() ?? "";

    if (contentType.includes("text/html") && serverHeader.includes("cloudflare")) {
      return "Blocked site: this profile appears to be protected by an anti-bot or access control layer.";
    }
  }

  return "";
}

function explainFetchFailure(error: unknown, sourceType: EnrichmentSourceType) {
  if (sourceType === "linkedin" || sourceType === "handshake") {
    return "Login required or blocked site: Repo2Site could not access this profile as a public page.";
  }

  return "Inaccessible public page: Repo2Site could not reach this URL or the site did not respond as a public source.";
}

function buildPublicPdfResult(
  sourceUrl: string,
  sourceType: EnrichmentSourceType,
  sourceLabel: string,
): EnrichmentSourceResult {
  const isCoverLetter = /cover[-_\s]?letter/i.test(sourceUrl);
  const field: EnrichmentSuggestionField = isCoverLetter
    ? "linksSection.coverLetterUrl"
    : "linksSection.resumeUrl";

  return {
    sourceUrl,
    sourceType,
    sourceLabel,
    pageTitle: isCoverLetter ? "Public cover letter" : "Public resume",
    suggestions: [
      {
        id: createSuggestionId(sourceUrl, field, sourceUrl),
        field,
        label: isCoverLetter ? "Cover letter link" : "Resume link",
        value: sourceUrl,
        sourceType,
        sourceUrl,
        sourceLabel,
        note: "Imported conservatively as a public document link.",
      },
    ],
    notes: [
      "Public PDF links are imported conservatively as document links. For deeper resume extraction, upload a local PDF file.",
    ],
    images: [],
    warnings: [],
    status: "success",
  };
}

function buildFailedResult(params: {
  sourceUrl: string;
  sourceType: EnrichmentSourceType;
  sourceLabel: string;
  reason: string;
  sourceName?: string;
}) : EnrichmentSourceResult {
  return {
    sourceUrl: params.sourceUrl,
    sourceName: params.sourceName,
    sourceType: params.sourceType,
    sourceLabel: params.sourceLabel,
    pageTitle: params.sourceName || params.sourceLabel,
    suggestions: [],
    notes: [],
    images: [],
    warnings: [],
    status: "failed",
    failureReason: params.reason,
  };
}

function extractHtmlPage(html: string, sourceUrl: string): ExtractedPage {
  const text = decodeHtmlEntities(stripTags(html)).replace(/\s+/g, " ").trim();
  const pageTitle =
    readMetaContent(html, "property", "og:title") ||
    readMetaContent(html, "name", "twitter:title") ||
    readTagContent(html, "title") ||
    readFirstMatch(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i) ||
    new URL(sourceUrl).hostname;
  const description =
    readMetaContent(html, "name", "description") ||
    readMetaContent(html, "property", "og:description") ||
    extractParagraph(html) ||
    "";
  const emails = dedupe([
    ...matchAllGroup(html, /mailto:([^\s"'?#]+)/gi),
    ...matchAllGroup(text, /([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi),
  ]);
  const phones = dedupe([
    ...matchAllGroup(html, /tel:([+\d()[\]\-\s.]+)/gi),
    ...matchAllGroup(text, /(\+?\d[\d\s().-]{7,}\d)/g),
  ]);
  const links = dedupe(extractLinks(html, sourceUrl));
  const images = dedupe(
    [
      readMetaContent(html, "property", "og:image"),
      readMetaContent(html, "name", "twitter:image"),
      ...matchAllGroup(html, /<img[^>]+src=["']([^"']+)["']/gi),
    ]
      .filter(Boolean)
      .map((value) => resolveUrl(sourceUrl, value))
      .filter(Boolean),
  );

  return {
    pageTitle: cleanText(pageTitle),
    description: cleanText(description),
    text,
    emails,
    phones,
    links,
    images,
    notes: buildNotes(text, html),
  };
}

function extractTextOnlyPage(text: string, sourceName: string): ExtractedPage {
  const normalizedText = text.replace(/\s+/g, " ").trim();
  const headlineLines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8);
  const pageTitle = headlineLines[0] || sourceName;
  const description =
    findSectionBody(text, ["summary", "profile", "professional summary", "about"]) ||
    headlineLines.slice(1, 3).join(" ");

  return {
    pageTitle,
    description,
    text: normalizedText,
    emails: dedupe(matchAllGroup(normalizedText, /([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi)),
    phones: dedupe(matchAllGroup(normalizedText, /(\+?\d[\d\s().-]{7,}\d)/g)),
    links: dedupe(matchAllGroup(normalizedText, /(https?:\/\/[^\s)]+)|(www\.[^\s)]+)/gi).flatMap((match) => match ? [normalizeUrlGuess(match)] : [])),
    images: [],
    notes: buildResumeNotes(text),
  };
}

function buildSuggestions(params: {
  sourceUrl: string;
  sourceType: EnrichmentSourceType;
  sourceLabel: string;
  extracted: ExtractedPage;
}): EnrichmentSuggestion[] {
  const { sourceUrl, sourceType, sourceLabel, extracted } = params;
  const suggestions: EnrichmentSuggestion[] = [];

  const push = (
    field: EnrichmentSuggestionField,
    label: string,
    value: string,
    note?: string,
    auxiliaryLabel?: string,
  ) => {
    const cleanValue = value.trim();

    if (!cleanValue) {
      return;
    }

    suggestions.push({
      id: createSuggestionId(sourceUrl, field, cleanValue),
      field,
      label,
      value: cleanValue,
      sourceType,
      sourceUrl,
      sourceLabel,
      note,
      auxiliaryLabel,
    });
  };

  const titleHeadline = normalizeHeadline(extracted.pageTitle);
  const description = limitText(extracted.description, 280);

  if (sourceType === "personal-website" || sourceType === "portfolio-website") {
    push("linksSection.portfolioUrl", "Portfolio website", sourceUrl);
  }

  if (sourceType === "linkedin") {
    push("linksSection.linkedIn", "LinkedIn profile", sourceUrl);
  }

  if (sourceType === "handshake") {
    push("linksSection.handshakeUrl", "Handshake profile", sourceUrl);
  }

  if (titleHeadline && !looksLikeHostName(titleHeadline)) {
    push("hero.headline", "Professional headline", titleHeadline, "Detected from the imported source.");
  }

  if (description) {
    push("professional.summary", "Professional summary", description, "Detected from the imported source.");
    push("about.description", "About copy", description, "Detected from the imported source.");
  }

  if (extracted.emails[0]) {
    push("contact.email", "Public email", extracted.emails[0], "Detected from visible source text.");
  }

  if (extracted.phones[0]) {
    push("contact.phone", "Public phone", extracted.phones[0], "Detected from visible source text.");
  }

  const locationCandidate = matchLocation(extracted.text);
  if (locationCandidate) {
    push("professional.location", "Location", locationCandidate, "Detected conservatively from visible text.");
  }

  const availabilityCandidate = matchAvailability(extracted.text);
  if (availabilityCandidate) {
    push("professional.availability", "Availability", availabilityCandidate, "Detected conservatively from visible text.");
  }

  const resumeLink = extracted.links.find((link) => /resume|cv/i.test(link));
  const coverLetterLink = extracted.links.find((link) => /cover[-_\s]?letter/i.test(link));
  const linkedInLink = extracted.links.find((link) => link.includes("linkedin.com"));
  const handshakeLink = extracted.links.find((link) => link.includes("handshake"));
  const websiteLink = extracted.links.find((link) => isExternalProfileLink(link, sourceUrl));

  if (resumeLink && sourceType !== "local-resume" && sourceType !== "resume") {
    push("linksSection.resumeUrl", "Resume link", resumeLink, "Detected from a public resume link.");
  }

  if (coverLetterLink) {
    push("linksSection.coverLetterUrl", "Cover letter link", coverLetterLink, "Detected from a public cover letter link.");
  }

  if (linkedInLink && sourceType !== "linkedin") {
    push("linksSection.linkedIn", "LinkedIn profile", linkedInLink, "Detected from a linked social profile.");
  }

  if (handshakeLink && sourceType !== "handshake") {
    push("linksSection.handshakeUrl", "Handshake profile", handshakeLink, "Detected from a linked professional profile.");
  }

  if (websiteLink && !["personal-website", "portfolio-website"].includes(sourceType)) {
    push("linksSection.portfolioUrl", "Portfolio website", websiteLink, "Detected from a linked public website.");
  }

  for (const customLink of extracted.links
    .filter(
      (link) =>
        !/linkedin\.com|handshake|resume|cv|cover[-_\s]?letter/i.test(link) &&
        isLikelyProfileLink(link),
    )
    .slice(0, 2)) {
    push(
      "linksSection.customLink",
      "Custom public profile",
      customLink,
      "Detected from a public profile or portfolio link.",
      deriveLinkLabel(customLink),
    );
  }

  return dedupeSuggestions(suggestions);
}

function buildResumeNotes(text: string) {
  const notes: string[] = [];
  const experience = findSectionBody(text, ["experience", "work experience", "employment"]);
  const education = findSectionBody(text, ["education"]);
  const skills = findSectionBody(text, ["skills", "technical skills", "core skills"]);
  const summary =
    findSectionBody(text, ["summary", "professional summary", "profile", "about"]) ||
    matchSectionSnippet(text, "summary");

  if (summary) {
    notes.push(`Summary highlight: ${limitText(summary, 180)}`);
  }
  if (experience) {
    notes.push(`Experience highlight: ${limitText(experience, 180)}`);
  }

  if (education) {
    notes.push(`Education highlight: ${limitText(education, 180)}`);
  }

  if (skills) {
    notes.push(`Skills detected: ${limitText(skills, 160)}`);
  }

  return notes.slice(0, 4);
}

function buildNotes(text: string, html: string) {
  const notes: string[] = [];
  const experience = matchSectionSnippet(text, "experience");
  const education = matchSectionSnippet(text, "education");

  if (experience) {
    notes.push(`Experience highlight: ${experience}`);
  }

  if (education) {
    notes.push(`Education highlight: ${education}`);
  }

  if (/<img/i.test(html)) {
    notes.push("Public project or profile imagery was detected and is available for future review.");
  }

  return notes.slice(0, 3);
}

function extractPdfText(buffer: Buffer) {
  const pdfString = buffer.toString("latin1");
  const streamRegex = /stream\r?\n([\s\S]*?)endstream/g;
  const chunks: string[] = [];
  let match: RegExpExecArray | null = streamRegex.exec(pdfString);

  while (match) {
    const streamContent = match[1];
    const start = match.index;
    const header = pdfString.slice(Math.max(0, start - 200), start);
    const rawBuffer = Buffer.from(streamContent, "latin1");

    if (header.includes("/FlateDecode")) {
      try {
        chunks.push(inflateSync(rawBuffer).toString("latin1"));
      } catch {
        chunks.push(streamContent);
      }
    } else {
      chunks.push(streamContent);
    }

    match = streamRegex.exec(pdfString);
  }

  const combined = chunks.join("\n") || pdfString;
  const textFragments = matchAllGroup(combined, /\(([^()]{1,500})\)\s*Tj/g)
    .concat(matchAllGroup(combined, /\(([^()]{1,500})\)\s*'/g))
    .concat(matchAllGroup(combined, /\[(.*?)\]\s*TJ/gs).flatMap(extractTextFromPdfArray));
  const rawText = decodePdfText(textFragments.join("\n") || combined)
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, " ")
    .replace(/\s{2,}/g, " ")
    .slice(0, PDF_TEXT_LIMIT);

  return rawText;
}

function extractTextFromPdfArray(value: string) {
  return matchAllGroup(value, /\(([^()]{1,500})\)/g);
}

function decodePdfText(value: string) {
  return value
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\([0-7]{3})/g, (_, octal: string) => String.fromCharCode(Number.parseInt(octal, 8)));
}

function findSectionBody(text: string, headings: string[]) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].toLowerCase();

    if (headings.some((heading) => line === heading || line.startsWith(`${heading}:`))) {
      return lines.slice(index + 1, index + 5).join(" ");
    }
  }

  return "";
}

function readMetaContent(html: string, attribute: "name" | "property", value: string) {
  const regex = new RegExp(
    `<meta[^>]+${attribute}=["']${escapeRegExp(value)}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    "i",
  );

  return cleanText(readFirstMatch(html, regex));
}

function readTagContent(html: string, tag: string) {
  return cleanText(readFirstMatch(html, new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i")));
}

function extractParagraph(html: string) {
  const paragraphs = matchAllGroup(html, /<p[^>]*>([\s\S]*?)<\/p>/gi)
    .map((item) => cleanText(item))
    .filter((item) => item.length >= 80);

  return paragraphs[0] ?? "";
}

function extractLinks(html: string, sourceUrl: string) {
  return matchAllGroup(html, /<a[^>]+href=["']([^"']+)["']/gi)
    .map((href) => resolveUrl(sourceUrl, href))
    .filter(Boolean);
}

function resolveUrl(base: string, href: string) {
  try {
    return new URL(href, base).toString();
  } catch {
    return "";
  }
}

function normalizeUrlGuess(value: string) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function createSuggestionId(sourceUrl: string, field: string, value: string) {
  return `${field}:${sourceUrl}:${value}`.toLowerCase();
}

function buildSourceLabel(sourceType: EnrichmentSourceType, sourceUrl: string) {
  if (sourceType === "local-resume") {
    return sourceUrl.replace(/^upload:\/\//, "Uploaded resume: ");
  }

  if (sourceType === "local-cover-letter") {
    return sourceUrl.replace(/^upload:\/\//, "Uploaded cover letter: ");
  }

  const host = (() => {
    try {
      return new URL(sourceUrl).hostname.replace(/^www\./, "");
    } catch {
      return sourceUrl;
    }
  })();

  const prefix =
    sourceType === "resume"
      ? "Resume"
      : sourceType === "cover-letter"
        ? "Cover Letter"
      : sourceType === "linkedin"
        ? "LinkedIn"
      : sourceType === "handshake"
        ? "Handshake"
        : sourceType === "portfolio-website"
          ? "Portfolio"
          : "Website";

  return `${prefix} import from ${host}`;
}

function matchLocation(text: string) {
  const patterns = [
    /\b(?:based in|located in|location[:\s]+)([A-Z][a-z]+(?:,\s*[A-Z]{2})?)\b/,
    /\b([A-Z][a-z]+,\s*[A-Z]{2})\b/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      return cleanText(match[1]);
    }
  }

  return "";
}

function matchAvailability(text: string) {
  const patterns = [
    /\b(open to [^.]{0,80})\b/i,
    /\b(available for [^.]{0,80})\b/i,
    /\b(seeking [^.]{0,80})\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      return cleanText(match[1]);
    }
  }

  return "";
}

function matchSectionSnippet(text: string, sectionName: string) {
  const pattern = new RegExp(`${sectionName}\\s*[:\\-]?\\s*([^\\.]{20,180}\\.)`, "i");
  const match = text.match(pattern);

  return match?.[1] ? cleanText(match[1]) : "";
}

function normalizeHeadline(value: string) {
  return cleanText(value.split("|")[0]?.split(" - ")[0] ?? value);
}

function looksLikeHostName(value: string) {
  return /\.[a-z]{2,}/i.test(value) && value.split(" ").length <= 2;
}

function isLikelyProfileLink(url: string) {
  return /^https?:\/\//i.test(url);
}

function isExternalProfileLink(url: string, sourceUrl: string) {
  if (sourceUrl.startsWith("upload://")) {
    return true;
  }

  try {
    const target = new URL(url);
    const source = new URL(sourceUrl);
    return target.hostname !== source.hostname;
  } catch {
    return false;
  }
}

function deriveLinkLabel(url: string) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host.split(".")[0] || "Profile";
  } catch {
    return "Profile";
  }
}

function limitText(value: string, maxLength: number) {
  const cleanValue = cleanText(value);
  if (cleanValue.length <= maxLength) {
    return cleanValue;
  }

  return `${cleanValue.slice(0, maxLength - 1).trimEnd()}…`;
}

function readFirstMatch(value: string, pattern: RegExp) {
  const match = value.match(pattern);
  return match?.[1] ?? "";
}

function matchAllGroup(value: string, pattern: RegExp) {
  return Array.from(value.matchAll(pattern)).flatMap((match) => match.slice(1).filter(Boolean));
}

function cleanText(value: string) {
  return decodeHtmlEntities(stripTags(value)).replace(/\s+/g, " ").trim();
}

function stripTags(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function dedupe(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function dedupeSuggestions(suggestions: EnrichmentSuggestion[]) {
  const seen = new Set<string>();

  return suggestions.filter((suggestion) => {
    const key = `${suggestion.field}:${suggestion.value.toLowerCase()}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
