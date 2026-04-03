import { ImageResponse } from "next/og";
import { getSharedPortfolioBySlug } from "@/lib/share-store";

export const runtime = "nodejs";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

type ImageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function OpenGraphImage({ params }: ImageProps) {
  const { slug } = await params;
  const record = await getSharedPortfolioBySlug(slug);

  if (!record) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#09111f",
            color: "#e5eefb",
            fontSize: 42,
            fontWeight: 600,
          }}
        >
          Repo2Site Portfolio
        </div>
      ),
      size,
    );
  }

  const { portfolio } = record;
  const featuredProject = portfolio.repositories[0];
  const palette = portfolio.theme.palette;
  const isDarkMode = portfolio.appearance.colorMode === "dark";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 56,
          background: isDarkMode
            ? `linear-gradient(135deg, ${palette.accentSoft}, #09111f 58%, #020617)`
            : `linear-gradient(135deg, ${palette.page}, #ffffff)`,
          color: isDarkMode ? "#e5eefb" : palette.text,
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: 18,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: palette.accent,
                color: "#fff",
                fontSize: 22,
                fontWeight: 700,
              }}
            >
              R2
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontSize: 18, textTransform: "uppercase", letterSpacing: 4, opacity: 0.74 }}>
                Repo2Site
              </div>
              <div style={{ fontSize: 24, fontWeight: 600 }}>Public portfolio</div>
            </div>
          </div>
          <div
            style={{
              padding: "10px 18px",
              borderRadius: 999,
              background: isDarkMode ? "rgba(255,255,255,0.08)" : palette.accentSoft,
              fontSize: 18,
            }}
          >
            /u/{record.slug}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 980 }}>
          <div style={{ fontSize: 72, lineHeight: 1.02, fontWeight: 700 }}>
            {portfolio.hero.name}
          </div>
          <div style={{ fontSize: 38, lineHeight: 1.2, opacity: 0.92 }}>
            {record.metadata.description}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", maxWidth: 820 }}>
            {portfolio.techStack.slice(0, 5).map((tech) => (
              <div
                key={tech}
                style={{
                  padding: "10px 16px",
                  borderRadius: 999,
                  background: isDarkMode ? "rgba(255,255,255,0.08)" : palette.chip,
                  fontSize: 20,
                }}
              >
                {tech}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 24, opacity: 0.82 }}>
            {featuredProject ? `Featured: ${featuredProject.name}` : "Built with Repo2Site"}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
