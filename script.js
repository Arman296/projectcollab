// Simple Pong game
// Left paddle: player (mouse + Up/Down keys)
// Right paddle: computer AI
// Ball bounces off walls and paddles. Scoreboard updates.

(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  const scoreboardPlayer = document.getElementById('playerScore');
  const scoreboardComputer = document.getElementById('computerScore');
  const restartBtn = document.getElementById('restartBtn');

  const W = canvas.width;
  const H = canvas.height;

  // Game objects
  const paddle = {
    width: 12,
    height: 110,
    speed: 6,
    player: { x: 12, y: (H - 110) / 2 },
    computer: { x: W - 12 - 12, y: (H - 110) / 2 }
  };

  const ball = {
    x: W / 2,
    y: H / 2,
    r: 9,
    speed: 5,
    vx: 0,
    vy: 0
  };

  let score = { player: 0, computer: 0 };
  let upPressed = false;
  let downPressed = false;
  let isServing = true;
  let serveTimeout = null;

  // Initialize ball with random direction
  function resetBall(toPlayer = false) {
    ball.x = W / 2;
    ball.y = H / 2;
    ball.speed = 5;
    const angle = (Math.random() * Math.PI / 4) - (Math.PI / 8); // -22.5deg .. +22.5deg
    const dir = toPlayer ? -1 : 1;
    ball.vx = dir * ball.speed * Math.cos(angle);
    ball.vy = ball.speed * Math.sin(angle);
    isServing = true;
    clearTimeout(serveTimeout);
    serveTimeout = setTimeout(() => {
      isServing = false;
    }, 600);
  }

  function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

  function drawNet() {
    const segH = 12;
    ctx.fillStyle = '#24303f';
    for (let y = 0; y < H; y += segH * 2) {
      ctx.fillRect(W / 2 - 1, y, 2, segH);
    }
  }

  function draw() {
    // background
    ctx.clearRect(0, 0, W, H);

    // net
    drawNet();

    // paddles
    ctx.fillStyle = '#dbeafe';
    ctx.fillRect(paddle.player.x, paddle.player.y, paddle.width, paddle.height);
    ctx.fillRect(paddle.computer.x, paddle.computer.y, paddle.width, paddle.height);

    // ball
    ctx.beginPath();
    ctx.fillStyle = '#f1f5f9';
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Circle vs AABB collision detection
  function circleRectCollision(cx, cy, r, rx, ry, rw, rh) {
    const closestX = clamp(cx, rx, rx + rw);
    const closestY = clamp(cy, ry, ry + rh);
    const dx = cx - closestX;
    const dy = cy - closestY;
    return (dx * dx + dy * dy) <= (r * r);
  }

  function update() {
    // Player paddle movement by keys
    if (upPressed) {
      paddle.player.y -= paddle.speed;
    } else if (downPressed) {
      paddle.player.y += paddle.speed;
    }

    // Keep paddles in bounds
    paddle.player.y = clamp(paddle.player.y, 0, H - paddle.height);

    // Computer AI: follow the ball with limited speed
    const targetY = ball.y - paddle.height / 2;
    const compSpeed = 4.2; // tweak difficulty
    if (paddle.computer.y + paddle.height / 2 < ball.y - 6) {
      paddle.computer.y += compSpeed;
    } else if (paddle.computer.y + paddle.height / 2 > ball.y + 6) {
      paddle.computer.y -= compSpeed;
    }
    paddle.computer.y = clamp(paddle.computer.y, 0, H - paddle.height);

    if (isServing) {
      // small idle animation: keep ball near serving side
      if (ball.vx < 0) ball.x = paddle.player.x + paddle.width + ball.r + 6;
      else ball.x = paddle.computer.x - ball.r - 6;
      ball.y = paddle.player.y + paddle.height / 2;
      draw();
      return;
    }

    // Move ball
    ball.x += ball.vx;
    ball.y += ball.vy;

    // Top/bottom wall collision
    if (ball.y - ball.r <= 0) {
      ball.y = ball.r;
      ball.vy = -ball.vy;
    } else if (ball.y + ball.r >= H) {
      ball.y = H - ball.r;
      ball.vy = -ball.vy;
    }

    // Paddle collisions
    // Player paddle
    const playerRect = { x: paddle.player.x, y: paddle.player.y, w: paddle.width, h: paddle.height };
    const computerRect = { x: paddle.computer.x, y: paddle.computer.y, w: paddle.width, h: paddle.height };

    if (circleRectCollision(ball.x, ball.y, ball.r, playerRect.x, playerRect.y, playerRect.w, playerRect.h)) {
      // place ball outside paddle to avoid sticking
      ball.x = playerRect.x + playerRect.w + ball.r + 0.5;
      // reflect and add spin based on hit position
      const relativeY = (ball.y - (playerRect.y + playerRect.h / 2));
      const normalized = relativeY / (playerRect.h / 2); // -1 .. 1
      const maxBounceAngle = Math.PI / 3; // 60 degrees
      const bounceAngle = normalized * maxBounceAngle;
      const speed = Math.min(Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy) * 1.05, 12);
      ball.vx = Math.cos(bounceAngle) * speed;
      if (ball.vx < 0) ball.vx = -ball.vx; // ensure to the right
      ball.vy = Math.sin(bounceAngle) * speed;
      // small nudge so it moves right
      if (Math.abs(ball.vx) < 2) ball.vx = 2;
    }

    // Computer paddle collision
    if (circleRectCollision(ball.x, ball.y, ball.r, computerRect.x, computerRect.y, computerRect.w, computerRect.h)) {
      ball.x = computerRect.x - ball.r - 0.5;
      const relativeY = (ball.y - (computerRect.y + computerRect.h / 2));
      const normalized = relativeY / (computerRect.h / 2);
      const maxBounceAngle = Math.PI / 3;
      const bounceAngle = normalized * maxBounceAngle;
      const speed = Math.min(Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy) * 1.05, 12);
      ball.vx = -Math.cos(bounceAngle) * speed;
      if (ball.vx > 0) ball.vx = -ball.vx; // ensure to the left
      ball.vy = Math.sin(bounceAngle) * speed;
      if (Math.abs(ball.vx) < 2) ball.vx = -2;
    }

    // Scoring: ball goes past left or right edges
    if (ball.x - ball.r <= 0) {
      // computer scores
      score.computer += 1;
      scoreboardComputer.textContent = score.computer;
      resetBall(false);
    } else if (ball.x + ball.r >= W) {
      // player scores
      score.player += 1;
      scoreboardPlayer.textContent = score.player;
      resetBall(true);
    }

    draw();
  }

  // Input handlers
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const y = e.clientY - rect.top;
    // center paddle on mouse
    paddle.player.y = clamp(y - paddle.height / 2, 0, H - paddle.height);
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') { upPressed = true; e.preventDefault(); }
    else if (e.key === 'ArrowDown') { downPressed = true; e.preventDefault(); }
  });

  window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowUp') upPressed = false;
    else if (e.key === 'ArrowDown') downPressed = false;
  });

  restartBtn.addEventListener('click', () => {
    score.player = 0; score.computer = 0;
    scoreboardPlayer.textContent = '0';
    scoreboardComputer.textContent = '0';
    paddle.player.y = (H - paddle.height) / 2;
    paddle.computer.y = (H - paddle.height) / 2;
    resetBall(Math.random() < 0.5);
  });

  // Start the game
  resetBall(Math.random() < 0.5);

  // Game loop using requestAnimationFrame
  let last = performance.now();
  function loop(now) {
    const dt = now - last;
    // update at fixed step for stability (can be adjusted)
    update(dt / 1000);
    last = now;
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

})();