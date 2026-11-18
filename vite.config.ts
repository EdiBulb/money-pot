import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// 한 파일(index.html)로 빌드해서 어디든 그대로 올릴 수 있게 한다.
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
})
