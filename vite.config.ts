import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  // GitHub Pages 的项目站点挂在 /plasticine-tools-site/ 下；
  // 本地 dev 与普通构建仍然从根路径加载。
  base: mode === 'pages' ? '/plasticine-tools-site/' : '/',
  plugins: [react()],
  server: {
    port: 8888,
  },
}))
