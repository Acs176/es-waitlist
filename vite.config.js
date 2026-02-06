import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1];
  const githubPagesBase = repoName ? `/${repoName}/` : "/";

  return {
    base: env.VITE_BASE_PATH || process.env.VITE_BASE_PATH || githubPagesBase,
    plugins: [react()],
    server: {
      port: 5173
    }
  };
});
