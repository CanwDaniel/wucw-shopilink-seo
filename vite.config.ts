import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import path from "path";

const pathname = (name: string) => path.resolve(__dirname, name)

export default defineConfig({
  plugins: [tailwindcss(), reactRouter()],
  resolve: {
    tsconfigPaths: true,
    alias: {
      "routes": pathname("./app/routes"),
      "server": pathname("./app/server"),
      "features": pathname("./app/features"),
      "types": pathname("./app/types"),
      "prisma": pathname("./prisma"),
    },
  },
});
