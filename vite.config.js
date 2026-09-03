import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // /api vai para o servidor de desenvolvimento em api/local.js
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
  resolve: {
    alias: { '@': path.resolve(process.cwd(), 'src') },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    /*
     * O padrao do Vite gera codigo que so roda em navegador recente. Num
     * Chrome/Edge um pouco mais velho, o arquivo nem e interpretado: a
     * pagina abre, o HTML aparece, e o app simplesmente nunca monta - sem
     * nada quebrar de forma visivel. Baixar o alvo custa alguns kb e
     * elimina essa classe inteira de problema.
     */
    target: ['es2015', 'chrome64', 'edge79', 'firefox67', 'safari12'],
    rollupOptions: {
      output: {
        /*
         * Nome de arquivo so com hash, sem palavra nenhuma.
         *
         * O padrao do Vite nomeia o pedaco do painel como "Admin-xxxx.js".
         * Antivirus, extensao de bloqueio e filtro de rede corporativa
         * costumam barrar URL que contenha "admin" - e o sintoma e
         * exatamente o que aconteceu aqui: o catalogo abre normal e o
         * painel fica parado para sempre, porque o arquivo dele nunca
         * chega e a requisicao nem falha, so pendura.
         */
        chunkFileNames: 'assets/[hash].js',
        entryFileNames: 'assets/[hash].js',
        assetFileNames: 'assets/[hash][extname]',
      },
    },
  },
});
