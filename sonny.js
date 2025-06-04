//버그1: 아무 것도 안하고 계속 켜 놓으면 일정 시간 지나면 bgm이 더이상 작동하지 않음
//근데 이거는 브라우저 자체 정책 문제일 수 있음.

//수정할 점: 쓸데없는 버튼(버튼의 기능을 하지 않는것)은 버튼으로 하지말고 다른걸로 대체하면 좋을듯

//추가할 점: 선택 할 수 있는 것의 커서를 손가락으로 바꾸면 좋을듯?
//ingame 사운드와 main-menu 사운드를 분리해서 서로 다른 사운드로 하는것도 나쁘지 않을듯?

$(function () {
  let countedBlocks = new Set();
  let gamePaused = false;

  const bgmAudio = $('#bgm')[0];
  const bgmList = ['assets/bgm0.mp3', 'assets/bgm1.mp3']; //bgm 추가하고싶으면 여기 바꾸면 됨
  const bgmNames = ['BGM 1', 'BGM 2']; // BGM 표시 이름
  const effect = $('#main-effect')[0]; //이펙트용
  const uniformList = ['assets/homeUniform.png', 'assets/awayUniform.png']; //unform 추가하고싶으면 여기 바꾸면 됨
  const pauseList = ['assets/Pause.png', 'assets/Play.png']; //ingame에서 pause버튼 이미지 리스트
  const bgmOnOffList = ['assets/SongOn.png', 'assets/SongOff.png']; //ingame에서 bgm on off button list
  let curr_uniform = 'assets/homeUniform.png'; //현재 유니폼

  // Canvas setup
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 1000;
  canvas.height = 800;

  // 마우스 위치 추적
  let mouseX = 0;
  let mouseY = 0;

  // 마우스 이동 이벤트 리스너
  document.addEventListener('mousemove', function (event) {
    // 전체 문서 기준 마우스 위치
    mouseX = event.pageX;
    mouseY = event.pageY;

    // 캔버스 기준 상대 위치 계산
    const canvasRect = canvas.getBoundingClientRect();
    const relativeX = mouseX - canvasRect.left;
    const relativeY = mouseY - canvasRect.top;

    // 콘솔에 위치 출력
    console.clear(); // 이전 로그 지우기
    console.log('=== 마우스 위치 ===');
    console.log(`전체 화면 기준: X=${Math.round(mouseX)}, Y=${Math.round(mouseY)}`);
    console.log(`캔버스 기준: X=${Math.round(relativeX)}, Y=${Math.round(relativeY)}`);
  });

  // Game state
  let score = 0;
  let specialShootCount = 3;
  let passCount = 0;
  let assistCount = 0;
  let ballLaunched = false;
  let ballDirX = 0;
  let ballDirY = -6;
  const BALL_SPEED = 5; // 공의 기본 속도 상수
  let specialMode = null;
  let matchScore = [0, 0];
  let timeLeft = 60;
  let timerInterval;
  let playerDirX = 0;
  let playerDirY = 0;
  const maxSpeed = 3;
  const maxSpeedY = 3;
  const FIELD_LEFT = 240;
  const FIELD_RIGHT = 760;
  let gkDirection = 1;

  // Stage difficulty settings
  const selectedStage = localStorage.getItem('selectedStage') || 'quarter';
  let gkSpeed = 1;
  let defenderHp = 1;
  if (selectedStage === 'semifinal') {
    gkSpeed = 2;
    defenderHp = 2;
  } else if (selectedStage === 'final') {
    gkSpeed = 3;
    defenderHp = 3;
  }

  // Game object sizes (from CSS)
  const BLOCK_WIDTH = 50;
  const BLOCK_HEIGHT = 30;
  const PLAYER_WIDTH = 50;
  const PLAYER_HEIGHT = 30;
  const BALL_RADIUS = 12.5; // 25px diameter
  const GK_WIDTH = 50;
  const GK_HEIGHT = 30;

  // Game objects
  //speed 는 안쓰임
  const player = {
    x: 470, // left: 470px
    y: 650, // top: 650px
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    speed: 3,
  };

  const ball = {
    x: 390 + BALL_RADIUS, // left: 390px + radius
    y: 550 + BALL_RADIUS, // top: 550px + radius
    radius: BALL_RADIUS,
    speed: 0.001,
  };

  const goalkeeper = {
    x: 470, // example, will be set by defenseLayout
    y: 180, // example, will be set by defenseLayout
    width: GK_WIDTH,
    height: GK_HEIGHT,
    speed: gkSpeed,
  };

  let blocks = [];

  // Load images
  const images = {};
  function loadImage(key, src) {
    images[key] = new Image();
    images[key].src = src;
  }

  loadImage('player', curr_uniform);
  loadImage('ball', 'assets/ball.svg');
  loadImage('goalkeeper', 'assets/goalkeeper.svg');
  loadImage('brick', 'assets/brick.svg');
  loadImage('defender', 'assets/defender.svg');
  loadImage('referee', 'assets/referee.svg');
  loadImage('background', 'assets/background.png');

  function updateScore(value) {
    score = value;
    $('#ingame-ui-score').text(score.toString().padStart(6, '0'));
  }

  function updateMatchScore(me, enemy) {
    matchScore = [me, enemy];
    $('#ingame-ui-match').text(`${me} - ${enemy}`);
  }

  function updateTimerDisplay() {
    const min = Math.floor(timeLeft / 60)
      .toString()
      .padStart(2, '0');
    const sec = (timeLeft % 60).toString().padStart(2, '0');
    $('#ingame-ui-timer').text(`${min}:${sec}`);
  }

  function updateSpecialCount(value) {
    $('#ingame-ui-special').text(`남은 스페셜슛: ${value}`);
  }

  function resetBallToPlayer() {
    ball.x = player.x + player.width / 2;
    ball.y = player.y - ball.radius - 10;
    ballDirX = 0;
    ballDirY = -BALL_SPEED;
  }

  function startTimer(callback) {
    clearInterval(timerInterval);
    updateTimerDisplay();
    timerInterval = setInterval(() => {
      if (gamePaused) return; //stop when the game paused

      if (timeLeft > 0) {
        timeLeft--;
        updateTimerDisplay();
      } else {
        clearInterval(timerInterval);
        showResultScreen(matchScore[0] > matchScore[1]);
      }
    }, 1000);
  }

  // Helper for collision detection (for PowerShot block)
  function detectCollision(ball, block) {
    return (
      ball.x + ball.radius > block.x &&
      ball.x - ball.radius < block.x + block.width &&
      ball.y + ball.radius > block.y &&
      ball.y - ball.radius < block.y + block.height
    );
  }

  function moveBall() {
    if (gamePaused) return;
    if (ballLaunched) {
      ball.x += ballDirX;
      ball.y += ballDirY;

      // Block collisions (including PowerShot logic)
      let hit = false;
      if (ball.isPowerShot) {
        let destroyed = 0;
        const remainingBlocks = [];
        let closestBlock = null;
        let minDistance = Infinity;

        // Find the closest block that is actually colliding with the ball
        for (const block of blocks) {
          if (block.type === 'gk') {
            remainingBlocks.push(block);
            continue;
          }

          // Check if the ball is actually colliding with the block
          const isColliding =
            ball.x + ball.radius > block.x &&
            ball.x - ball.radius < block.x + block.width &&
            ball.y + ball.radius > block.y &&
            ball.y - ball.radius < block.y + block.height;

          if (isColliding) {
            // Calculate distance to block's center
            const blockCenterX = block.x + block.width / 2;
            const blockCenterY = block.y + block.height / 2;
            const distance = Math.sqrt(
              Math.pow(ball.x - blockCenterX, 2) + Math.pow(ball.y - blockCenterY, 2)
            );

            if (distance < minDistance) {
              minDistance = distance;
              closestBlock = block;
            }
          } else {
            remainingBlocks.push(block);
          }
        }

        // If we found a block to destroy
        if (closestBlock) {
          destroyed++;
          const blockKey = `${closestBlock.x}-${closestBlock.y}-${closestBlock.type}`;
          if (!countedBlocks.has(blockKey)) {
            if (closestBlock.type === 'referee') {
              specialShootCount++;
              updateSpecialCount(specialShootCount);
            }
            if (closestBlock.type === 'brick') {
              passCount++;
              updateScore(score + 50);
            } else if (closestBlock.type === 'defender') {
              assistCount++;
              updateScore(score + 100);
            } else {
              updateScore(score + 50);
            }
            countedBlocks.add(blockKey);
          }
        }

        blocks = remainingBlocks;

        if (destroyed >= 1) {
          ball.isPowerShot = false;
          specialMode = null;
          ballDirX = 0;
          ballDirY = -BALL_SPEED;
          $('#ingame').removeClass('powershot-active');
        }
      } else {
        if (!ball.isPowerShot) {
          blocks.forEach((block) => {
            if (hit) return;

            // 충돌 감지
            const isColliding =
              ball.x + ball.radius > block.x &&
              ball.x - ball.radius < block.x + block.width &&
              ball.y + ball.radius > block.y &&
              ball.y - ball.radius < block.y + block.height;

            if (isColliding) {
              // 충돌 방향 계산
              const overlapLeft = ball.x + ball.radius - block.x;
              const overlapRight = block.x + block.width - (ball.x - ball.radius);
              const overlapTop = ball.y + ball.radius - block.y;
              const overlapBottom = block.y + block.height - (ball.y - ball.radius);

              // 가장 작은 겹침 방향으로 반사
              const minOverlapX = Math.min(overlapLeft, overlapRight);
              const minOverlapY = Math.min(overlapTop, overlapBottom);

              if (minOverlapX < minOverlapY) {
                // X축 충돌
                ballDirX *= -1;
                // 위치 조정
                if (overlapLeft < overlapRight) {
                  ball.x = block.x - ball.radius;
                } else {
                  ball.x = block.x + block.width + ball.radius;
                }
              } else {
                // Y축 충돌
                ballDirY *= -1;
                // 위치 조정
                if (overlapTop < overlapBottom) {
                  ball.y = block.y - ball.radius;
                } else {
                  ball.y = block.y + block.height + ball.radius;
                }
              }

              // 속도 정규화
              const currentSpeed = Math.sqrt(ballDirX * ballDirX + ballDirY * ballDirY);
              if (currentSpeed > 0) {
                ballDirX = (ballDirX / currentSpeed) * BALL_SPEED;
                ballDirY = (ballDirY / currentSpeed) * BALL_SPEED;
              }

              if (block.type === 'gk') {
                hit = true;
                return;
              }

              block.hp -= specialMode === 'curve' ? 3 : 1;
              if (block.hp <= 0) {
                blocks = blocks.filter((b) => b !== block);
                // Avoid duplicate counting per block
                const blockKey = `${block.x}-${block.y}-${block.type}`;
                if (!countedBlocks.has(blockKey)) {
                  if (block.type === 'referee') {
                    specialShootCount++;
                    updateSpecialCount(specialShootCount);
                  }
                  if (block.type === 'brick') {
                    passCount++;
                    console.log(passCount);
                    updateScore(score + 50);
                  }
                  if (block.type === 'defender') {
                    assistCount++;
                    console.log(assistCount);

                    updateScore(score + 100);
                  }
                  countedBlocks.add(blockKey);
                }
              }
              hit = true;
            }
          });
        }
      }

      // Goal collision check
      const goalX = 460;
      const goalY = 130;
      const goalWidth = 80;
      const goalHeight = 50;

      if (
        ball.x + ball.radius > goalX &&
        ball.x - ball.radius < goalX + goalWidth &&
        ball.y + ball.radius > goalY &&
        ball.y - ball.radius < goalY + goalHeight
      ) {
        if (ball.isPowerShot) {
          ball.isPowerShot = false;
          specialMode = null;
          $('#ingame').removeClass('powershot-active');
        }
        updateScore(score + 500);
        updateMatchScore(matchScore[0] + 1, matchScore[1]);
        ballLaunched = false;
        resetBallToPlayer();
        return;
      }

      // Field boundaries
      const FIELD_TOP = 160;
      const FIELD_BOTTOM = 680;

      if (ball.x - ball.radius <= FIELD_LEFT) {
        ball.x = FIELD_LEFT + ball.radius;
        ballDirX *= -1;
      }
      if (ball.x + ball.radius >= FIELD_RIGHT) {
        ball.x = FIELD_RIGHT - ball.radius;
        ballDirX *= -1;
      }
      if (ball.y - ball.radius <= FIELD_TOP) {
        ball.y = FIELD_TOP + ball.radius;
        ballDirY *= -1;
      }
      if (ball.y + ball.radius >= FIELD_BOTTOM) {
        updateScore(score - 300);
        updateMatchScore(matchScore[0], matchScore[1] + 1);
        ballLaunched = false;
        if (ball.isPowerShot) {
          ball.isPowerShot = false;
          specialMode = null;
          $('#ingame').removeClass('powershot-active');
        }
        resetBallToPlayer();
        return;
      }

      // Player collision
      if (
        ball.x + ball.radius > player.x &&
        ball.x - ball.radius < player.x + player.width &&
        ball.y + ball.radius > player.y &&
        ball.y - ball.radius < player.y + player.height
      ) {
        // 플레이어와의 충돌 처리
        const relativeIntersectX = ball.x - (player.x + player.width / 2);
        const normalizedRelativeX = relativeIntersectX / (player.width / 2);
        const maxBounceAngle = Math.PI / 3;
        const bounceAngle = normalizedRelativeX * maxBounceAngle;

        ballDirX = BALL_SPEED * Math.sin(bounceAngle);
        ballDirY = -Math.abs(BALL_SPEED * Math.cos(bounceAngle));

        // 위치 조정
        ball.y = player.y - ball.radius;
      }

      // 골키퍼와 충돌 체크
      if (
        ball.x + ball.radius > goalkeeper.x &&
        ball.x - ball.radius < goalkeeper.x + goalkeeper.width &&
        ball.y + ball.radius > goalkeeper.y &&
        ball.y - ball.radius < goalkeeper.y + goalkeeper.height
      ) {
        // 골키퍼와의 충돌 처리
        const relativeIntersectX = ball.x - (goalkeeper.x + goalkeeper.width / 2);
        const normalizedRelativeX = relativeIntersectX / (goalkeeper.width / 2);
        const maxBounceAngle = Math.PI / 3;
        const bounceAngle = normalizedRelativeX * maxBounceAngle;

        ballDirX = BALL_SPEED * Math.sin(bounceAngle);
        ballDirY = Math.abs(BALL_SPEED * Math.cos(bounceAngle));

        // 위치 조정
        if (ball.y < goalkeeper.y + goalkeeper.height / 2) {
          ball.y = goalkeeper.y - ball.radius;
        } else {
          ball.y = goalkeeper.y + goalkeeper.height + ball.radius;
        }
      }
    }
  }

  // 골키퍼 움직임 추가
  function moveGoalkeeper() {
    goalkeeper.x += gkDirection * goalkeeper.speed;

    if (goalkeeper.x < 340) {
      goalkeeper.x = 340;
      gkDirection = 1;
    }
    if (goalkeeper.x + goalkeeper.width > 650) {
      goalkeeper.x = 650 - goalkeeper.width;
      gkDirection = -1;
    }
  }

  function movePlayer() {
    player.x += playerDirX * maxSpeed;
    player.y += playerDirY * maxSpeedY;

    // Boundary checks
    if (player.x < 250) player.x = 250;
    if (player.x > 740) player.x = 740;
    if (player.y < 510) player.y = 510;
    if (player.y > 690) player.y = 690;

    if (!ballLaunched) {
      resetBallToPlayer();
    }
  }

  // Draw function: draw background to fill 1000x800, fix block types, and adjust button positions
  function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background to 800x800, centered in the 1000x800 canvas
    if (images.background && images.background.complete && images.background.naturalWidth !== 0) {
      ctx.drawImage(images.background, 0, 0, 800, 800);
    } else {
      ctx.fillStyle = '#228B22';
      ctx.fillRect(0, 0, 800, 800);
    }

    // Draw blocks (shift x by -100)
    blocks.forEach((block) => {
      let type = block.type;
      if (!images[type]) type = 'brick';
      const img = images[type];
      if (img && img.complete && img.naturalWidth !== 0) {
        ctx.globalAlpha = block.hp / 3;
        ctx.drawImage(img, block.x - 100, block.y, block.width, block.height);
        ctx.globalAlpha = 1;
      } else {
        ctx.globalAlpha = block.hp / 3;
        ctx.fillStyle = 'gray';
        ctx.fillRect(block.x - 100, block.y, block.width, block.height);
        ctx.globalAlpha = 1;
      }
    });

    // Draw goalkeeper (shift x by -100)
    const gkImg = images.goalkeeper;
    if (gkImg && gkImg.complete && gkImg.naturalWidth !== 0) {
      ctx.drawImage(gkImg, goalkeeper.x - 100, goalkeeper.y, goalkeeper.width, goalkeeper.height);
    } else {
      ctx.fillStyle = 'blue';
      ctx.fillRect(goalkeeper.x - 100, goalkeeper.y, goalkeeper.width, goalkeeper.height);
    }

    // Draw player (shift x by -100)
    const playerImg = images.player;
    if (playerImg && playerImg.complete && playerImg.naturalWidth !== 0) {
      ctx.drawImage(playerImg, player.x - 100, player.y, player.width, player.height);
    } else {
      ctx.fillStyle = 'red';
      ctx.fillRect(player.x - 100, player.y, player.width, player.height);
    }

    // Draw ball (shift x by -100)
    const ballImg = images.ball;
    if (ballImg && ballImg.complete && ballImg.naturalWidth !== 0) {
      ctx.drawImage(
        ballImg,
        ball.x - ball.radius - 100,
        ball.y - ball.radius,
        ball.radius * 2,
        ball.radius * 2
      );
    } else {
      ctx.beginPath();
      ctx.arc(ball.x - 100, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fillStyle = 'white';
      ctx.fill();
      ctx.closePath();
    }
  }

  function gameLoop() {
    if (!gamePaused) {
      moveBall();
      moveGoalkeeper();
      movePlayer();
    }
    draw();
    requestAnimationFrame(gameLoop);
  }

  // Start game loop
  gameLoop();

  // Event listeners
  $(document)
    .off('keydown keyup')
    .on('keydown', function (e) {
      if (e.key === 'ArrowLeft') playerDirX = -1;
      if (e.key === 'ArrowRight') playerDirX = 1;
      if (e.key === 'ArrowUp') playerDirY = -1;
      if (e.key === 'ArrowDown') playerDirY = 1;
      if (e.key === 'q' || e.key === 'ㅂ') {
        console.log('Q키 눌림');
        if (specialShootCount <= 0 || ballLaunched) return;
        specialShootCount--;
        updateSpecialCount(specialShootCount);
        specialMode = 'power';
        ball.isPowerShot = true; // ← 이것이 핵심입니다!
        $('#ingame').addClass('powershot-active'); // ✅ 이펙트 적용

        ballLaunched = true;
        ballDirX = 0;
        ballDirY = -9;
        moveBall(); // Immediately trigger moveBall for PowerShot effect
      }
      if (e.key === ' ') {
        if (!ballLaunched) {
          specialMode = null;
          ballLaunched = true;
          ballDirX = Math.random() * 3 - 1;
          ballDirY = -5;
        }
      }
    })
    .on('keyup', function (e) {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') playerDirX = 0;
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') playerDirY = 0;
    });

  function playMenuEffect() {
    effect.currentTime = 0;
    effect.play();
  }

  // Sound settings
  bgmAudio.volume = 0.3;
  effect.volume = 0.5;

  $(document).one('click', function () {
    bgmAudio.muted = false;
    bgmAudio.play().catch((err) => {
      console.warn('BGM 재생 실패:', err);
    });
  });

  // Game initialization
  // defenderHp: int, gkSpeed: int, formation: string
  function quarter_finals(defenderHp, gkSpeed, formation) {
    $('#main').hide();
    $('#ingame').show();

    timeLeft = 10;
    updateMatchScore(0, 0);
    updateScore(0);
    updateSpecialCount(3);
    passCount = 0;
    assistCount = 0;
    countedBlocks.clear();

    // Initialize game objects
    player.x = 500;
    player.y = 650;
    resetBallToPlayer();

    // Dynamic defense layout based on formation
    let defenseLayout;
    if (formation === 'final') {
      // Hardest: denser defenders, more bricks
      defenseLayout = [
        [180, 470, 'gk'],
        [240, 270, 'brick'],
        [240, 320, 'brick'],
        [240, 370, 'defender'],
        [240, 420, 'brick'],
        [240, 470, 'defender'],
        [240, 520, 'brick'],
        [240, 570, 'defender'],
        [240, 620, 'brick'],
        [240, 670, 'brick'],
        [280, 270, 'brick'],
        [280, 320, 'defender'],
        [280, 370, 'brick'],
        [280, 420, 'brick'],
        [280, 470, 'brick'],
        [280, 520, 'brick'],
        [280, 570, 'brick'],
        [280, 620, 'defender'],
        [280, 670, 'brick'],
        [320, 270, 'referee'],
        [320, 320, 'brick'],
        [320, 370, 'defender'],
        [320, 420, 'brick'],
        [320, 470, 'defender'],
        [320, 520, 'brick'],
        [320, 570, 'defender'],
        [320, 620, 'brick'],
        [320, 670, 'brick'],
        [360, 270, 'brick'],
        [360, 320, 'brick'],
        [360, 370, 'brick'],
        [360, 420, 'brick'],
        [360, 470, 'defender'],
        [360, 520, 'brick'],
        [360, 570, 'brick'],
        [360, 620, 'brick'],
        [360, 670, 'brick'],
      ];
    } else if (formation === 'semifinal') {
      // Medium: mix of defenders and bricks
      defenseLayout = [
        [180, 470, 'gk'],
        [240, 270, 'brick'],
        [240, 320, 'defender'],
        [240, 370, 'brick'],
        [240, 420, 'defender'],
        [240, 470, 'brick'],
        [240, 520, 'defender'],
        [240, 570, 'brick'],
        [240, 620, 'defender'],
        [240, 670, 'brick'],
        [280, 270, 'brick'],
        [280, 320, 'brick'],
        [280, 370, 'defender'],
        [280, 420, 'brick'],
        [280, 470, 'defender'],
        [280, 520, 'brick'],
        [280, 570, 'defender'],
        [280, 620, 'brick'],
        [280, 670, 'brick'],
        [320, 270, 'referee'],
        [320, 320, 'brick'],
        [320, 370, 'defender'],
        [320, 420, 'brick'],
        [320, 470, 'defender'],
        [320, 520, 'brick'],
        [320, 570, 'defender'],
        [320, 620, 'brick'],
        [320, 670, 'brick'],
        [360, 270, 'brick'],
        [360, 320, 'brick'],
        [360, 370, 'brick'],
        [360, 420, 'brick'],
        [360, 470, 'brick'],
        [360, 520, 'brick'],
        [360, 570, 'brick'],
        [360, 620, 'brick'],
        [360, 670, 'brick'],
      ];
    } else {
      // Default to quarterfinals: more bricks, fewer defenders
      defenseLayout = [
        [180, 470, 'gk'],
        [240, 270, 'brick'],
        [240, 320, 'defender'],
        [240, 370, 'brick'],
        [240, 420, 'defender'],
        [240, 470, 'brick'],
        [240, 520, 'defender'],
        [240, 570, 'brick'],
        [240, 620, 'defender'],
        [240, 670, 'brick'],
        [280, 270, 'brick'],
        [280, 320, 'brick'],
        [280, 370, 'brick'],
        [280, 420, 'defender'],
        [280, 470, 'brick'],
        [280, 520, 'defender'],
        [280, 570, 'brick'],
        [280, 620, 'brick'],
        [280, 670, 'brick'],
        [320, 270, 'referee'],
        [320, 320, 'brick'],
        [320, 370, 'defender'],
        [320, 420, 'brick'],
        [320, 470, 'defender'],
        [320, 520, 'brick'],
        [320, 570, 'defender'],
        [320, 620, 'brick'],
        [320, 670, 'brick'],
        [360, 270, 'brick'],
        [360, 320, 'brick'],
        [360, 370, 'brick'],
        [360, 420, 'brick'],
        [360, 470, 'defender'],
        [360, 520, 'brick'],
        [360, 570, 'brick'],
        [360, 620, 'brick'],
        [360, 670, 'brick'],
      ];
    }
    // Separate goalkeeper from blocks
    const gkBlock = defenseLayout.find(([top, left, type]) => type === 'gk');
    if (gkBlock) {
      goalkeeper.x = gkBlock[1];
      goalkeeper.y = gkBlock[0];
      goalkeeper.speed = gkSpeed;
    }
    blocks = defenseLayout
      .filter(([top, left, type]) => type !== 'gk')
      .map(([top, left, type]) => ({
        x: left,
        y: top,
        width: BLOCK_WIDTH,
        height: BLOCK_HEIGHT,
        type,
        hp: type === 'defender' ? defenderHp : 1,
      }));

    startTimer(() => {
      const [me, enemy] = matchScore;
      const won = me > enemy;
      showResultScreen(won); // Call result screen with outcome
    });
  }

  // Story navigation
  let currentStory = 1;
  const totalStories = 6;

  function resetStoryState() {
    currentStory = 1;
    $('#story-img').attr('src', 'assets/story1.png');
    $('#story-backward').addClass('visible');
    $('#story-forward').addClass('visible');
    $('#story-skip').addClass('visible');
  }
  // Skip 버튼 클릭 시 바로 킥오프 화면으로 전환
  $('#story-skip')
    .off('click')
    .on('click', function () {
      playMenuEffect();
      $('#story').hide();
      $('#main-img').show();
      $('#kickoff-elements').show();
    });

  $('#main-button1').on('click', function () {
    playMenuEffect();
    $('#main-elements').hide();
    $('#main-img').hide();
    $('#story').show();
    resetStoryState();
  });

  $('#story-forward').on('click', function () {
    playMenuEffect();
    if (currentStory < totalStories) {
      currentStory++;
      $('#story-img').attr('src', `assets/story${currentStory}.png`);
    } else if (currentStory === totalStories) {
      // 마지막 스토리에서 forward 버튼을 클릭했을 때만 킥오프 화면으로 전환
      setTimeout(() => {
        $('#story').hide();
        $('#main-img').show();
        $('#kickoff-elements').show();
      }, 1000);
    }
  });

  $('#story-backward').on('click', function () {
    playMenuEffect();
    if (currentStory > 1) {
      currentStory--;
      $('#story-img').attr('src', `assets/story${currentStory}.png`);
    } else {
      // 첫 번째 스토리에서 뒤로가기 버튼을 누르면 메인 화면으로 돌아감
      $('#story').hide();
      $('#main-img').show();
      $('#main-elements').show();
    }
  });

  // Start game with parameters for each stage
  function startGame(stage, defenderHp, gkSpeed, formation) {
    // 게임 상태 초기화
    gamePaused = false;
    score = 0;
    specialShootCount = 3;
    ballLaunched = false;
    ballDirX = 0;
    ballDirY = -6;
    specialMode = null;
    matchScore = [0, 0];
    timeLeft = 60;

    // 타이머 초기화
    clearInterval(timerInterval);
    countedBlocks.clear();

    // UI 업데이트
    updateScore(0);
    updateMatchScore(0, 0);
    updateSpecialCount(3);
    updateTimerDisplay();

    // 화면 전환
    $('#main').hide();
    $('#ingame').show();
    $('#result-screen').hide();

    // 스테이지 정보 저장
    localStorage.setItem('selectedStage', stage);

    // 게임 시작
    quarter_finals(defenderHp, gkSpeed, formation);
  }

  const kickoff1 = document.getElementById('kickoff-button1');
  const kickoff2 = document.getElementById('kickoff-button2');
  const kickoff3 = document.getElementById('kickoff-button3');
  if (kickoff1) kickoff1.addEventListener('click', () => startGame('final', 3, 3, 'final'));
  if (kickoff2) kickoff2.addEventListener('click', () => startGame('semifinal', 2, 2, 'semifinal'));
  if (kickoff3) kickoff3.addEventListener('click', () => startGame('quarter', 1, 1, 'quarter'));

  // Restore Settings and Ingame button event handlers
  $('#main-button2')
    .off('click')
    .on('click', function () {
      playMenuEffect();
      $('#main-elements').hide();
      $('#setting-elements').show();
      $('#setting-bgm-type').text(bgmNames[0]);

      // Sound range
      $('#setting-sounds')
        .off('input change')
        .on('input change', function () {
          const volume = parseFloat($(this).val());
          bgmAudio.volume = volume;
        });

      // Mute
      $('#setting-mute')
        .off('click')
        .on('click', function () {
          playMenuEffect();
          const isMuted = bgmAudio.muted;
          if (isMuted) {
            $(this).css('background-image', "url('assets/soundon.png')");
            $('#ingame-bgm-button').css('background-image', `url('${bgmOnOffList[0]}')`);
            bgmAudio.muted = false;
            $('#setting-sounds').prop('disabled', false);
          } else {
            $(this).css('background-image', "url('assets/soundoff.png')");
            $('#ingame-bgm-button').css('background-image', `url('${bgmOnOffList[1]}')`);
            bgmAudio.muted = true;
            $('#setting-sounds').prop('disabled', true);
          }
        });

      // BGM types
      $('#left-arrow')
        .off('click')
        .on('click', function () {
          let current_bgm = $('#bgm').attr('src');
          let bgm_index = bgmList.indexOf(current_bgm);
          bgm_index = (bgm_index - 1 + bgmList.length) % bgmList.length;
          $('#bgm').attr('src', bgmList[bgm_index]);
          $('#bgm')[0].play();
          $('#setting-bgm-type').text(bgmNames[bgm_index]);
        });
      $('#right-arrow')
        .off('click')
        .on('click', function () {
          let current_bgm = $('#bgm').attr('src');
          let bgm_index = bgmList.indexOf(current_bgm);
          bgm_index = (bgm_index + 1) % bgmList.length;
          $('#bgm').attr('src', bgmList[bgm_index]);
          $('#bgm')[0].play();
          $('#setting-bgm-type').text(bgmNames[bgm_index]);
        });

      // Uniform
      $('#home-uniform')
        .off('click')
        .on('click', function () {
          playMenuEffect();
          curr_uniform = uniformList[0];
          loadImage('player', curr_uniform);
          $(this).css('background-color', 'rgba(255, 255, 255, 0.9)');
          $('#away-uniform').css('background-color', 'rgba(255, 255, 255, 0.5)');
        });
      $('#away-uniform')
        .off('click')
        .on('click', function () {
          playMenuEffect();
          curr_uniform = uniformList[1];
          loadImage('player', curr_uniform);
          $(this).css('background-color', 'rgba(255, 255, 255, 0.9)');
          $('#home-uniform').css('background-color', 'rgba(255, 255, 255, 0.5)');
        });

      // Back button
      $('#setting-back')
        .off('click')
        .on('click', function () {
          playMenuEffect();
          $('#main-elements').show();
          $('#setting-elements').hide();
        });
    });

  // Ingame button handlers
  $('#ingame-bgm-button')
    .off('click')
    .on('click', function () {
      const isMuted = bgmAudio.muted;
      bgmAudio.muted = !isMuted;
      $(this).css('background-image', `url('${!isMuted ? bgmOnOffList[1] : bgmOnOffList[0]}')`);
      $('#setting-mute').css(
        'background-image',
        `url('assets/${!isMuted ? 'soundoff.png' : 'soundon.png'}')`
      );
      $('#setting-sounds').prop('disabled', !isMuted);
      $(this).blur();
    });
  $('#ingame-reset-button')
    .off('click')
    .on('click', function () {
      location.reload();
    });
  $('#ingame-pause-button')
    .off('click')
    .on('click', function () {
      playMenuEffect();
      gamePaused = true;
      $('#ingame').hide();
      $('#ingame-pause').show();
      // Resume button
      $('#continue')
        .off('click')
        .on('click', function () {
          playMenuEffect();
          $('#ingame').show();
          $('#ingame-pause').hide();
          gamePaused = false;
        });
      // Main menu button
      $('#back-to-main-menu')
        .off('click')
        .on('click', function () {
          playMenuEffect();
          gamePaused = false;
          location.reload();
        });
    });
  $('#kickoff-back')
    .off('click')
    .on('click', function () {
      playMenuEffect();
      $('#kickoff-elements').hide();
      $('#main').show();
      $('#main-elements').show();
      $('#ingame').hide();
      $('#ingame-pause').hide();
      $('#setting-elements').hide();
      resetStoryState(); // 스토리 상태 초기화
    });

  // Adjust button positions to match original CSS (top-right, etc)
  $('#ingame-bgm-button').css({
    top: '20px',
    right: '150px',
    left: '',
    bottom: '',
    position: 'absolute',
    width: '50px',
    height: '50px',
  });
  $('#ingame-reset-button').css({
    top: '20px',
    right: '90px',
    left: '',
    bottom: '',
    position: 'absolute',
    width: '50px',
    height: '50px',
  });
  $('#ingame-pause-button').css({
    top: '20px',
    right: '30px',
    left: '',
    bottom: '',
    position: 'absolute',
    width: '50px',
    height: '50px',
  });
  // Show the result screen, hiding all other game/menu elements
  function showResultScreen(won) {
    const [me, enemy] = matchScore;
    const goalCount = matchScore[0];
    gamePaused = true;
    running = false;

    const currentStage = localStorage.getItem('selectedStage');
    console.log('Current stage:', currentStage);
    console.log('Game won:', won);

    $('#main').hide();
    $('#ingame').hide();
    $('#ingame-pause').hide();
    $('#result-screen').hide();

    // Final stage에서 이긴 경우 ending.png 표시
    if (currentStage === 'final' && won) {
      console.log('Showing ending screen');
      // ending.png를 보여주는 임시 div 생성
      const endingDiv = $('<div>').css({
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 1000,
        background: 'black',
        opacity: 0,
        transition: 'opacity 5s ease-in-out',
      });

      const endingImg = $('<img>').attr({
        src: 'assets/ending.png',
        style: 'width: 100%; height: 100%; object-fit: contain;',
      });

      endingDiv.append(endingImg);
      $('body').append(endingDiv);

      // 페이드 인
      setTimeout(() => {
        endingDiv.css('opacity', 1);
      }, 100);

      // 10초 후 페이드 아웃
      setTimeout(() => {
        endingDiv.css('opacity', 0);

        // 5초 후 메인 화면으로 전환
        setTimeout(() => {
          endingDiv.remove();
          location.reload();
        }, 5000);
      }, 10000);
    } else {
      console.log('Showing normal result screen');
      // 일반 결과 화면 표시
      $('#result-title').text(won ? '승리' : '패배');
      $('#result-score').text(score.toString().padStart(6, '0'));
      $('#match-result').html(`경기결과<br />한국 ${me} : ${enemy} 상대팀`);
      $('#match-detail').html(`경기 내용<br />
        골 ${goalCount}회 ${goalCount * 500}점<br />
        패스 ${passCount}회 ${passCount * 50}점<br />
        어시스트 ${assistCount}회 ${assistCount * 100}점<br />
        실점 ${enemy}회 ${enemy * -300}점`);

      $('#result-screen').css('display', 'flex');
      if (won) {
        $('#next-game-btn').show();
        $('#select-stage-btn').hide();

        // 다음 경기로 버튼 클릭 이벤트
        $('#next-game-btn')
          .off('click')
          .on('click', function () {
            let nextStage;
            if (currentStage === 'quarter') {
              nextStage = 'semifinal';
            } else if (currentStage === 'semifinal') {
              nextStage = 'final';
            }

            if (nextStage) {
              // 결과 화면 숨기기
              $('#result-screen').hide();

              // 다음 스테이지로 진행
              if (nextStage === 'semifinal') {
                startGame('semifinal', 2, 2, 'semifinal');
              } else if (nextStage === 'final') {
                startGame('final', 3, 3, 'final');
              }
            }
          });
      } else {
        $('#next-game-btn').hide();
        $('#select-stage-btn').show();
      }
    }
  }

  // 초기 BGM 이름 설정
  let initial_bgm = $('#bgm').attr('src');
  let initial_index = bgmList.indexOf(initial_bgm);
  $('#setting-bgm-type').text(bgmNames[initial_index]);

  $('#main-button3').on('click', function () {
    playMenuEffect();
    window.close();
  });
});
