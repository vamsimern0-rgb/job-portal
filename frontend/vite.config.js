import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'


// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (id.includes("axios")) {
            return "vendor-axios";
          }

          if (id.includes("socket.io-client") || id.includes("engine.io-client")) {
            return "vendor-socket";
          }

          if (id.includes("jspdf")) {
            return "vendor-jspdf";
          }

          if (id.includes("html2canvas")) {
            return "vendor-html2canvas";
          }

          if (id.includes("dompurify")) {
            return "vendor-dompurify";
          }

          if (id.includes("recharts") || id.includes("d3-")) {
            return "vendor-charts";
          }

          if (id.includes("dayjs")) {
            return "vendor-dayjs";
          }

          if (id.includes("lucide-react")) {
            return "vendor-icons";
          }
        }
      }
    }
  }
})
