import { Game } from './Game';
import './style.css';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) {
  throw new Error('App container not found');
}

const canvas = document.createElement('canvas');
canvas.id = 'game-canvas';
app.appendChild(canvas);

const game = new Game(canvas, app);
game.start();

window.addEventListener('beforeunload', () => {
  game.destroy();
});
