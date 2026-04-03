export function getSiteOrigin() {
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (configuredOrigin) {
    return configuredOrigin.replace(/\/+$/, "");
  }

  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();

  if (productionHost) {
    return `https://${productionHost.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;
  }

  const deploymentHost = process.env.VERCEL_URL?.trim();

  if (deploymentHost) {
    return `https://${deploymentHost.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;
  }

  return "http://localhost:3000";
}
