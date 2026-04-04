const TECH_ICON_ALIASES: Record<string, string> = {
  "c#": "csharp",
  "c++": "cplusplus",
  css: "css3",
  dockerfile: "docker",
  expressjs: "express",
  "github actions": "github",
  golang: "go",
  html: "html5",
  javascript: "javascript",
  js: "javascript",
  mongodb: "mongo",
  next: "nextjs",
  "next.js": "nextjs",
  nextjs: "nextjs",
  node: "nodejs",
  "node.js": "nodejs",
  postgres: "postgresql",
  "react.js": "react",
  "tailwind css": "tailwind",
  tailwindcss: "tailwind",
  ts: "typescript",
  typescript: "typescript",
};

const TECH_ICONS: Record<
  string,
  {
    accent: string;
    label: string;
    shortLabel: string;
  }
> = {
  aws: { accent: "#FF9900", label: "AWS", shortLabel: "AWS" },
  cplusplus: { accent: "#00599C", label: "C++", shortLabel: "C+" },
  csharp: { accent: "#512BD4", label: "C#", shortLabel: "C#" },
  css3: { accent: "#1572B6", label: "CSS", shortLabel: "CSS" },
  docker: { accent: "#2496ED", label: "Docker", shortLabel: "DK" },
  express: { accent: "#6B7280", label: "Express", shortLabel: "EX" },
  figma: { accent: "#A259FF", label: "Figma", shortLabel: "FG" },
  git: { accent: "#F05032", label: "Git", shortLabel: "GT" },
  github: { accent: "#6E5494", label: "GitHub", shortLabel: "GH" },
  go: { accent: "#00ADD8", label: "Go", shortLabel: "GO" },
  html5: { accent: "#E34F26", label: "HTML", shortLabel: "HTML" },
  java: { accent: "#F89820", label: "Java", shortLabel: "JV" },
  javascript: { accent: "#F7DF1E", label: "JavaScript", shortLabel: "JS" },
  mongo: { accent: "#47A248", label: "MongoDB", shortLabel: "MG" },
  nextjs: { accent: "#111827", label: "Next.js", shortLabel: "N" },
  nodejs: { accent: "#339933", label: "Node.js", shortLabel: "ND" },
  postgresql: { accent: "#4169E1", label: "PostgreSQL", shortLabel: "PG" },
  prisma: { accent: "#2D3748", label: "Prisma", shortLabel: "PR" },
  python: { accent: "#3776AB", label: "Python", shortLabel: "PY" },
  react: { accent: "#61DAFB", label: "React", shortLabel: "RE" },
  rust: { accent: "#DEA584", label: "Rust", shortLabel: "RS" },
  tailwind: { accent: "#06B6D4", label: "Tailwind", shortLabel: "TW" },
  typescript: { accent: "#3178C6", label: "TypeScript", shortLabel: "TS" },
  vercel: { accent: "#000000", label: "Vercel", shortLabel: "VC" },
};

export function normalizeRepo2SiteTechKey(value: string) {
  const baseKey = value.trim().toLowerCase().replace(/[._/]+/g, " ");
  return TECH_ICON_ALIASES[baseKey] ?? baseKey.replace(/\s+/g, "");
}

export function getRepo2SiteTechIcon(value: string) {
  return TECH_ICONS[normalizeRepo2SiteTechKey(value)] ?? null;
}
