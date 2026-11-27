import {defineConfig} from 'vite';
import {lanMultiplayer} from './server/multiplayer.js';

export default defineConfig({
  plugins:[lanMultiplayer()],
  server:{host:'0.0.0.0'},
  preview:{host:'0.0.0.0'}
});
