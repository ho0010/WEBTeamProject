//버그1: 아무 것도 안하고 계속 켜 놓으면 일정 시간 지나면 bgm이 더이상 작동하지 않음
//근데 이거는 브라우저 자체 정책 문제일 수 있음.

//수정할 점: 쓸데없는 버튼(버튼의 기능을 하지 않는것)은 버튼으로 하지말고 다른걸로 대체하면 좋을듯

//추가할 점: 선택 할 수 있는 것의 커서를 손가락으로 바꾸면 좋을듯?
//ingame 사운드와 main-menu 사운드를 분리해서 서로 다른 사운드로 하는것도 나쁘지 않을듯?

$(function () {
  let gamePaused = false;
  let savedGameState = null;
  const bgmAudio = $('#bgm')[0];
  const bgmList = ['assets/bgm0.mp3', 'assets/bgm1.mp3']; //bgm 추가하고싶으면 여기 바꾸면 됨
  const effect = $('#main-effect')[0]; //이펙트용
  const uniformList = ['assets/homeUniform.png', 'assets/awayUniform.png']; //unform 추가하고싶으면 여기 바꾸면 됨
  const pauseList = ['assets/Pause.png', 'assets/Play.png']; //ingame에서 pause버튼 이미지 리스트
  const bgmOnOffList = ['assets/SongOn.png', 'assets/SongOff.png']; //ingame에서 bgm on off button list
  let curr_uniform = 'assets/homeUniform.png'; //현재 유니폼
  let curr_stage = 0;

  // Canvas setup
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 1000;
  canvas.height = 800;

  // Game state
  let score = 0;
  let specialShootCount = 3;
  let ballLaunched = false;
  let ballDirX = 0;
  let ballDirY = -4;
  let specialMode = null;
  let ballX = 0;
  let ballY = 0;
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
  const gkSpeed = 3;

  // Field (background) settings
  const FIELD_X = 100;
  const FIELD_Y = 0;
  const FIELD_WIDTH = 800;
  const FIELD_HEIGHT = 800;

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
    speed: 3,
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
    ballDirY = -4;
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
        callback();
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

        for (const block of blocks) {
          if (detectCollision(ball, block) && destroyed < 2 && block.type !== 'gk') {
            destroyed++;
            updateScore(score + (block.type === 'defender' ? 100 : 50));
            if (block.type === 'referee') specialShootCount++;
            continue; // Do not add to remainingBlocks (destroyed)
          }
          remainingBlocks.push(block);
        }

        blocks = remainingBlocks;

        if (destroyed >= 2) {
          ball.isPowerShot = false;
          specialMode = null;
          ballDirX = 0;
          ballDirY = -4;
          $('#gameCanvas').removeClass('powershot-active');
        }
      } else {
        if (!ball.isPowerShot) {
          blocks.forEach((block) => {
            if (hit) return;
            if (
              ball.x + ball.radius > block.x &&
              ball.x - ball.radius < block.x + block.width &&
              ball.y + ball.radius > block.y &&
              ball.y - ball.radius < block.y + block.height
            ) {
              // Calculate overlap distances
              const overlapLeft = ball.x + ball.radius - block.x;
              const overlapRight = block.x + block.width - (ball.x - ball.radius);
              const overlapTop = ball.y + ball.radius - block.y;
              const overlapBottom = block.y + block.height - (ball.y - ball.radius);
              const minOverlapX = Math.min(overlapLeft, overlapRight);
              const minOverlapY = Math.min(overlapTop, overlapBottom);

              // Determine collision side
              if (minOverlapX < minOverlapY) {
                // Horizontal collision (left or right)
                ballDirX *= -1;
                // Adjust position to prevent sticking
                if (overlapLeft < overlapRight) {
                  ball.x = block.x - ball.radius;
                } else {
                  ball.x = block.x + block.width + ball.radius;
                }
              } else if (minOverlapY < minOverlapX) {
                // Vertical collision (top or bottom)
                ballDirY *= -1;
                if (overlapTop < overlapBottom) {
                  ball.y = block.y - ball.radius;
                } else {
                  ball.y = block.y + block.height + ball.radius;
                }
              } else {
                // True corner: reflect both directions
                ballDirX *= -1;
                ballDirY *= -1;
              }

              if (block.type === 'gk') {
                hit = true;
                return;
              }
              block.hp -= specialMode === 'curve' ? 3 : 1;
              if (block.hp <= 0) {
                blocks = blocks.filter((b) => b !== block);
                if (block.type === 'referee') {
                  specialShootCount++;
                }
                updateScore(score + (block.type === 'defender' ? 100 : 50));
              }
              hit = true;
            }
          });
        }
      }

      // Goal collision check
      const goalX = 480;
      const goalY = 130;
      const goalWidth = 110;
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
          $('#gameCanvas').removeClass('powershot-active');
        }
        updateScore(score + 1000);
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
          $('#gameCanvas').removeClass('powershot-active'); // ✅ 여기서도 해제
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
        const relativeIntersectX = ball.x - (player.x + player.width / 2);
        const normalizedRelativeX = relativeIntersectX / (player.width / 2);
        const maxBounceAngle = Math.PI / 3;
        const bounceAngle = normalizedRelativeX * maxBounceAngle;
        const speed = Math.sqrt(ballDirX ** 2 + ballDirY ** 2);

        ballDirX = speed * Math.sin(bounceAngle);
        ballDirY = -Math.abs(speed * Math.cos(bounceAngle));
      }

      // 골키퍼와 충돌 체크 (공 튕기기만)
      if (
        ball.x + ball.radius > goalkeeper.x &&
        ball.x - ball.radius < goalkeeper.x + goalkeeper.width &&
        ball.y + ball.radius > goalkeeper.y &&
        ball.y - ball.radius < goalkeeper.y + goalkeeper.height
      ) {
        // 단순 상하 반사 (필요시 반사각 적용 가능)
        ballDirY *= -1;
      }
    }
  }

  // 골키퍼 움직임 추가
  function moveGoalkeeper() {
    goalkeeper.x += gkDirection * gkSpeed;

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
        $('#gameCanvas').addClass('powershot-active'); // ✅ 이펙트 적용

        ballLaunched = true;
        ballDirX = 0;
        ballDirY = -9;
        moveBall(); // Immediately trigger moveBall for PowerShot effect
      }
      if (e.key === ' ') {
        if (!ballLaunched) {
          specialMode = null;
          ballLaunched = true;
          ballDirX = 0;
          ballDirY = -4;
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
  function quarter_finals() {
    $('#main').hide();
    $('#ingame').show();

    timeLeft = 60;
    updateMatchScore(0, 0);
    updateScore(0);
    updateSpecialCount(3);

    // Initialize game objects
    player.x = 500;
    player.y = 650;
    resetBallToPlayer();

    // Initialize blocks
    blocks = [
      // Example: [top, left, type]
      // [180, 470, 'gk'],
      // [240, 270, 'brick'], ...
    ];
    const defenseLayout = [
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
    // Separate goalkeeper from blocks
    const gkBlock = defenseLayout.find(([top, left, type]) => type === 'gk');
    if (gkBlock) {
      goalkeeper.x = gkBlock[1];
      goalkeeper.y = gkBlock[0];
    }
    blocks = defenseLayout
      .filter(([top, left, type]) => type !== 'gk')
      .map(([top, left, type]) => ({
        x: left,
        y: top,
        width: BLOCK_WIDTH,
        height: BLOCK_HEIGHT,
        type,
        hp: 1,
      }));

    startTimer(() => {
      const [me, enemy] = matchScore;
      if (me > enemy) {
        alert('8강 승리! 4강 진출');
      } else {
        alert('패배! 다시 도전하세요.');
        location.reload();
      }
    });
  }

  // Menu event handlers
  $('#main-button1').on('click', function () {
    playMenuEffect();
    $('#main-elements').hide();
    $('#kickoff-elements').show();
  });

  $('#kickoff-button3').on('click', function () {
    $('#main').hide();
    $('#ingame').show();
    quarter_finals();
  });

  // Restore Settings and Ingame button event handlers
  $('#main-button2')
    .off('click')
    .on('click', function () {
      playMenuEffect();
      $('#main-elements').hide();
      $('#setting-elements').show();
      $('#setting-bgm-type').text(bgmList[0]);

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
          $('#setting-bgm-type').text(bgmList[bgm_index]);
        });
      $('#right-arrow')
        .off('click')
        .on('click', function () {
          let current_bgm = $('#bgm').attr('src');
          let bgm_index = bgmList.indexOf(current_bgm);
          bgm_index = (bgm_index + 1) % bgmList.length;
          $('#bgm').attr('src', bgmList[bgm_index]);
          $('#bgm')[0].play();
          $('#setting-bgm-type').text(bgmList[bgm_index]);
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
      console.log('뒤로가기 버튼 눌림'); // 이게 콘솔에 찍히는지 확인

      $('#kickoff-elements').hide(); // 킥오프 선택 버튼 숨김
      $('#main').show(); // 메인 화면 전체 보이기
      $('#main-elements').show(); // 메인 메뉴 버튼들 보이기
      $('#ingame').hide(); // 혹시나 열렸을 인게임 화면 숨김
      $('#ingame-pause').hide(); // 혹시나 열렸을 일시정지 화면 숨김
      $('#setting-elements').hide(); // 설정창도 닫기
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
});
