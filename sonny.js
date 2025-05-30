//버그1: 아무 것도 안하고 계속 켜 놓으면 일정 시간 지나면 bgm이 더이상 작동하지 않음
//근데 이거는 브라우저 자체 정책 문제일 수 있음.

//수정할 점: 쓸데없는 버튼(버튼의 기능을 하지 않는것)은 버튼으로 하지말고 다른걸로 대체하면 좋을듯

//추가할 점: 선택 할 수 있는 것의 커서를 손가락으로 바꾸면 좋을듯?
//ingame 사운드와 main-menu 사운드를 분리해서 서로 다른 사운드로 하는것도 나쁘지 않을듯?

$(function () {
  const bgmAudio = $('#bgm')[0];
  const bgmList = ['assets/bgm0.mp3', 'assets/bgm1.mp3']; //bgm 추가하고싶으면 여기 바꾸면 됨
  const effect = $('#main-effect')[0]; //이펙트용
  const uniformList = ['assets/homeUniform.png', 'assets/awayUniform.png']; //unform 추가하고싶으면 여기 바꾸면 됨
  const pauseList = ['assets/Pause.png', 'assets/Play.png']; //ingame에서 pause버튼 이미지 리스트
  const bgmOnOffList = ['assets/SongOn.png', 'assets/SongOff.png']; //ingame에서 bgm on off button list
  let curr_uniform = 'assets/homeUniform.png'; //현재 유니폼
  let curr_stage = 0;

  // $(document).on('mousemove', function(e) {
  //   // e.pageX, e.pageY는 문서 전체 기준 좌표
  //   // e.clientX, e.clientY는 브라우저 창(뷰포트) 기준 좌표
  //   console.log('마우스 위치:', e.pageX, e.pageY);
  // }); //마우스 위치 확인용 
  
  // 필요할때마다 쓰면 됨

  let score = 0;
  let specialShootCount = 3;
  let ballLaunched = false;
  let ballDirX = 0;
  let ballDirY = -8;
  let specialMode = null;
  let x = 0;
  let y = 0;
  let matchScore = [0, 0];
  let timeLeft = 60;
  let timerInterval;

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
    const player = $('#player');
    const px = player.position().left;
    $('#ball').css({ top: '630px', left: px + 10 + 'px' });
    x = $('#ball').position().left;
    y = $('#ball').position().top;
    ballDirX = 0;
    ballDirY = -8; //
  }

  function startTimer(callback) {
    clearInterval(timerInterval);
    updateTimerDisplay();
    timerInterval = setInterval(() => {
      if (timeLeft > 0) {
        timeLeft--;
        updateTimerDisplay();
      } else {
        clearInterval(timerInterval);
        callback();
      }
    }, 1000);
  }
  function moveBall() {
    if (ballLaunched) {
      x += ballDirX;
      y += ballDirY;
      $('#ball').css({ top: y + 'px', left: x + 'px' });

      const FIELD_LEFT = 270;
      const FIELD_RIGHT = 750;
      const FIELD_TOP = 170;
      const FIELD_BOTTOM = 690;
      const BALL_SIZE = 10; //위 사이즈가 적정 사이즈 인듯

      if (x <= FIELD_LEFT) {
        x = FIELD_LEFT;
        ballDirX *= -1;
      }
      if (x + BALL_SIZE >= FIELD_RIGHT) {
        x = FIELD_RIGHT - BALL_SIZE;
        ballDirX *= -1;
      }
      if (y <= FIELD_TOP) {
        y = FIELD_TOP;
        ballDirY *= -1;
      }
      if (y + BALL_SIZE >= FIELD_BOTTOM) {
        ballLaunched = false;
        updateScore(score - 300);
        updateMatchScore(matchScore[0], matchScore[1] + 1);
        resetBallToPlayer();
        return;
      }

      const ball = $('#ball');

      let hit = false;

      $('.brick, .defender, .referee, .gk').each(function () {
        if (hit && specialMode !== 'power') return; // 일반 슛은 첫 충돌 후 종료

        const $b = $(this);
        const bx = $b.position().left;
        const by = $b.position().top;
        const bw = $b.width();
        const bh = $b.height();

        if (x + 20 > bx && x < bx + bw && y + 20 > by && y < by + bh) {
          let hp = parseInt($b.attr('data-hp'));
          let damage = 1;

          // 파워모드: defender는 1회만 파괴 가능, brick/referee는 전부 파괴 가능
          if (specialMode === 'power') {
            if ($b.hasClass('gk')) {
              updateScore(score - 300);
              updateMatchScore(matchScore[0], matchScore[1] + 1);
              ballDirY *= -1;
              specialMode = null;
              hit = true;
              return;
            }

            if ($b.hasClass('defender')) {
              // 첫 defender만 파괴
              $b.remove();
              updateScore(score + 100);
              ballDirY *= -1;
              specialMode = null;
              hit = true;
              return;
            }

            if ($b.hasClass('brick')) {
              $b.remove();
              updateScore(score + 50);
              return; // 반사 없이 진행
            }

            if ($b.hasClass('referee')) {
              $b.remove();
              specialShootCount++;
              return; // 반사 없이 진행
            }
          } else {
            // 일반 슛
            if ($b.hasClass('gk')) {
              updateScore(score - 300);
              updateMatchScore(matchScore[0], matchScore[1] + 1);
            } else {
              hp -= specialMode === 'curve' ? 3 : 1;
              if (hp > 0) {
                $b.attr('data-hp', hp);
                $b.css('opacity', hp / 3);
              } else {
                $b.remove();
              }
              if ($b.hasClass('defender')) updateScore(score + 100);
              if ($b.hasClass('brick')) updateScore(score + 50);
              if ($b.hasClass('referee')) specialShootCount++;
            }

            ballDirY *= -1;
            hit = true;
          }
        }
      });
      // Player 반사
      const player = $('#player');
      const px = player.position().left;
      const py = player.position().top;
      const pw = player.width();
      const ph = player.height();

      if (x + 20 > px && x < px + pw && y + 20 > py && y < py + ph) {
        // 공이 플레이어에 부딪힌 상대 위치 (비율)
        const relativeIntersectX = x + 10 - (px + pw / 2); // 공 중심 - 패들 중심
        const normalizedRelativeX = relativeIntersectX / (pw / 2); // -1 ~ 1 범위
        const maxBounceAngle = Math.PI / 3; // 최대 반사각 (60도)

        const bounceAngle = normalizedRelativeX * maxBounceAngle;

        const speed = Math.sqrt(ballDirX ** 2 + ballDirY ** 2);
        ballDirX = speed * Math.sin(bounceAngle);
        ballDirY = -Math.abs(speed * Math.cos(bounceAngle)); // 항상 위로 튀게
      }
    }
  }

  setInterval(moveBall, 30);



  function playMenuEffect() {
    effect.currentTime = 0;
    effect.play();
  } //menu effect 사운드. 필요할때마다 호출하면됨

  // 기본 사운드 설정, 처음 소리 크기는 여기 변수 값 바꿔주면 됨
  bgmAudio.volume = 0.3;
  effect.volume = 0.5;

  // 사용자의 첫 클릭 시 소리 재생 허용
  //브라우저 정책상 어떤 event가 발생해야지만 audio가 실행이 됨
  //그냥 처음부터 실행되게 하는 방법을 나중에 있으면 찾아볼 것
  $(document).one('click', function () {
    bgmAudio.muted = false;
    bgmAudio.play().catch((err) => {
      console.warn('BGM 재생 실패:', err);
    });
  });

  //Kickoff
  $('#main-button1').on('click', function () {
    playMenuEffect();
    $('#main-elements').hide();
    $('#kickoff-elements').show();
    $('#kickoff-button3')
      .off('click')
      .click(function () {
        $('#main').hide();
        $('#ingame').show();

        quarter_finals();

        //pause button
        $('#ingame-pause-button')
          .off('click')
          .click(function () {
            playMenuEffect(); // 클릭 사운드 효과

            // 현재 버튼의 배경 이미지 추출
            let currentPauseButton = $(this).css('background-image');

            // 이미지 파일명만 추출
            if (currentPauseButton.includes(pauseList[0])) {
              // 현재가 "Pause.png"일 때 -> "Play.png"로 변경
              $(this).css('background-image', `url('${pauseList[1]}')`);

              // 여기에 게임을 멈추는 로직 추가!! ************

              $('#ingame').hide();
              $('#ingame-pause').show();

              //main menu 클릭할 때
              $('#back-to-main-menu')
                .off('click')
                .click(function () {
                  playMenuEffect();
                  //여기에 게임을 초기화하는 로직 추가 ************
                  //모든 것을 처음으로 바꿔 놔야 함 ************
                  $('#ingame-pause-button').css('background-image', `url('${pauseList[0]}')`); //pause 버튼 바꾸기
                  $('#ingame-pause').hide();
                  $('#main').show();
                  $('#kickoff-elements').trigger('click');
                });
            } else {
              // 현재가 "Play.png"일 때 -> "Pause.png"로 변경
              $(this).css('background-image', `url('${pauseList[0]}')`);
              // 여기에 게임을 다시 시작하는 로직 추가
            }
          });

        //sound on & off button
        // $('#ingame-bgm-button')
        //   .off('click')
        //   .click(function () {
        //     let currentBgmButton = $(this).css('background-image');
        //     if (currentBgmButton.includes(bgmOnOffList[0])) {
        //       //song on 일 때 //main-menu에서의 세팅과 일치해야함
        //       $(this).css('background-image', `url('${bgmOnOffList[1]}')`);
        //       $('#setting-mute').css('background-image', "url('assets/soundoff.png')"); //main쪽 아이톤도 바꿔야함
        //       bgmAudio.muted = true;
        //       $('#setting-sounds').prop('disabled', true); //prop으로 컨트롤바 사용 할지 말지 지정
        //     } else {
        //       $(this).css('background-image', `url('${bgmOnOffList[0]}')`);
        //       $('#setting-mute').css('background-image', "url('assets/soundon.png')"); //main쪽 아이톤도 바꿔야함
        //       bgmAudio.muted = false;
        //       $('#setting-sounds').prop('disabled', false); //prop으로 컨트롤바 사용 할지 말지 지정
        //     }
        //   });

        //ingame play
      });

    $('#kickoff-back')
      .off('click')
      .click(function () {
        playMenuEffect();
        $('#main-elements').show();
        $('#kickoff-elements').hide();
      });
  });

  //8강
  function quarter_finals() {
    $('#main').hide();
    $('#ingame').show();
    $('#ingame-main').empty();

    timeLeft = 60;
    updateMatchScore(0, 0);
    updateScore(0);

    $('#ingame-main').append(`
    <div id="ingame-ui-score">000000</div>
    <div id="ingame-ui-timer">01:00</div>
    <div id="ingame-ui-match">0 - 0</div>
    <div id="ingame-ui-special">남은 스페셜슛: 3</div>

    <button id="ingame-bgm-button"></button>
    <button id="ingame-reset-button"></button>
    <button id="ingame-pause-button"></button>
`);

    // BGM 상태에 따라 버튼 이미지 설정
    $('#ingame-bgm-button').css('background-image', 
      `url('${bgmAudio.muted ? bgmOnOffList[1] : bgmOnOffList[0]}')`);

    // 공 생성
    $('#ingame-main').append('<div id="ball"></div>');
    // 플레이어 생성
    $('#ingame-main').append('<div id="player"></div>');

    x = 390;
    y = 700;
    resetBallToPlayer();

    const defenseLayout = [
      // 1줄
      [180, 470, 'gk'],

      // 2줄
      [240, 270, 'brick'],
      [240, 320, 'defender'],
      [240, 370, 'brick'],
      [240, 420, 'defender'],
      [240, 470, 'brick'],
      [240, 520, 'defender'],
      [240, 570, 'brick'],
      [240, 620, 'defender'],
      [240, 670, 'brick'],

      // 3줄
      [280, 270, 'brick'],
      [280, 320, 'brick'],
      [280, 370, 'brick'],
      [280, 420, 'defender'],
      [280, 470, 'brick'],
      [280, 520, 'defender'],
      [280, 570, 'brick'],
      [280, 620, 'brick'],
      [280, 670, 'brick'],

      // 4줄
      [320, 270, 'referee'],
      [320, 320, 'brick'],
      [320, 370, 'defender'],
      [320, 420, 'brick'],
      [320, 470, 'defender'],
      [320, 520, 'brick'],
      [320, 570, 'defender'],
      [320, 620, 'brick'],
      [320, 670, 'brick'],

      // 5줄
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

    defenseLayout.forEach(([top, left, type], i) => {
      let className = 'brick';
      let hp = 1;
      if (type === 'defender') {
        className = 'defender';
        hp = 3;
      } else if (type === 'referee') {
        className = 'referee';
        hp = 1;
      } else if (type === 'gk') {
        className = 'gk';
        hp = -1;
      }
      $('#ingame-main').append(
        `<div class="${className}" style="top:${top}px; left:${left}px; cursor: default;" data-hp="${hp}" id="block-${i}"></div>`
      );
    });

    $(document)
      .off('keydown')
      .on('keydown', function (e) {
        const step = 30;
        const player = $('#player');
        const px = player.position().left;

        if (e.key === 'ArrowLeft' && px > 0) {
          player.css('left', px - step + 'px');
        }
        if (e.key === 'ArrowRight' && px < 760) {
          player.css('left', px + step + 'px');
        }
        if (e.key === 'q') {
          y = $('#ball').position().top;

          if (specialShootCount > 0 && Math.abs(y - 630) < 30) {
            specialShootCount--;
            updateSpecialCount(specialShootCount);
            specialMode = 'power';
            ballLaunched = true;
            ballDirX = 0;
            ballDirY = -6;
          }
        }
        if (e.key === 'w') {
          y = $('#ball').position().top;

          if (specialShootCount > 0 && Math.abs(y - 630) < 30) {
            specialShootCount--;
            updateSpecialCount(specialShootCount);
            specialMode = 'curve';
            ballLaunched = true;
            ballDirX = 2;
            ballDirY = -4;
          }
        }
        if (e.key === ' ') {
          if (!ballLaunched) {
            specialMode = null;
            ballLaunched = true;
            ballDirX = 0;
            ballDirY = -6;
          }
        }
      });

    $('#ingame-reset-button')
      .off('click')
      .on('click', function () {
        location.reload();
      });

    //sound on & off button
    $('#ingame-bgm-button')
      .off('click')
      .click(function () {
        const isMuted = bgmAudio.muted;
        bgmAudio.muted = !isMuted;
        $(this).css('background-image', 
          `url('${!isMuted ? bgmOnOffList[1] : bgmOnOffList[0]}')`);
        $('#setting-mute').css('background-image', 
          `url('assets/${!isMuted ? 'soundoff.png' : 'soundon.png'}')`);
        $('#setting-sounds').prop('disabled', !isMuted);
      });

    $('#ingame-pause-button')
      .off('click')
      .on('click', function () {
        alert('일시정지 기능은 추후 구현됩니다.');
      });

    startTimer(() => {
      const [me, enemy] = matchScore;
      if (me > enemy) {
        alert('8강 승리! 4강 진출');
      } else {
        alert('패배! 다시 도전하세요.');
        location.reload();
      }
    });

    updateSpecialCount(specialShootCount);
  }

  //4강
  function semi_finals() {}

  //결승
  function final() {}

  //Setting
  //버그 수정: back버튼을 누르고 다시 돌아올 때마다 off를 안했어서
  //이벤트 핸들러가 중복되었었음
  $('#main-button2').on('click', function () {
    playMenuEffect();
    $('#main-elements').hide();
    $('#setting-elements').show();
    $('#setting-bgm-type').text(bgmList[0]); //처음 실행할 때 보여주기 위함

    //control sounds range
    $('#setting-sounds')
      .off('input change')
      .on('input change', function () {
        const volume = parseFloat($(this).val());
        bgmAudio.volume = volume;
      });

    // control muted
    $('#setting-mute')
      .off('click')
      .on('click', function () {
        playMenuEffect();
        const isMuted = bgmAudio.muted;
        if (isMuted) {
          $(this).css('background-image', "url('assets/soundon.png')"); //버그 수정
          $('#ingame-bgm-button').css('background-image', `url('assets/${bgmOnOffList[0]}')`); //ingame 쪽 아이콘도 sound on으로 바꿔야 함
          bgmAudio.muted = false;
          $('#setting-sounds').prop('disabled', false); //prop으로 컨트롤바 사용 할지 말지 지정

        } else {
          $(this).css('background-image', "url('assets/soundoff.png')"); //버그 수정
          $('#ingame-bgm-button').css('background-image', `url('assets/${bgmOnOffList[1]}')`); //ingame 쪽 아이콘도 sound on으로 바꿔야 함
          bgmAudio.muted = true;
          $('#setting-sounds').prop('disabled', true);
        }
      });

    //control bgm types
    $('#left-arrow')
      .off('click')
      .click(function () {
        let current_bgm = $('#bgm').attr('src');
        let bgm_index = bgmList.indexOf(current_bgm);
        bgm_index = (bgm_index - 1 + bgmList.length) % bgmList.length;
        $('#bgm').attr('src', bgmList[bgm_index]);
        $('#bgm')[0].play();
        $('#setting-bgm-type').text(bgmList[bgm_index]);
      });

    $('#right-arrow')
      .off('click')
      .click(function () {
        let current_bgm = $('#bgm').attr('src');
        let bgm_index = bgmList.indexOf(current_bgm);
        bgm_index = (bgm_index + 1) % bgmList.length;
        $('#bgm').attr('src', bgmList[bgm_index]);
        $('#bgm')[0].play();
        $('#setting-bgm-type').text(bgmList[bgm_index]);
      });

    //uniform
    $('#home-uniform')
      .off('click')
      .click(function () {
        playMenuEffect();
        curr_uniform = uniformList[0];
        $(this).css('background-color', 'rgba(255, 255, 255, 0.9)');
        $('#away-uniform').css('background-color', 'rgba(255, 255, 255, 0.5)');
      });

    $('#away-uniform')
      .off('click')
      .click(function () {
        playMenuEffect();
        curr_uniform = uniformList[1];
        $(this).css('background-color', 'rgba(255, 255, 255, 0.9)');
        $('#home-uniform').css('background-color', 'rgba(255, 255, 255, 0.5)');
      });

    $('#setting-back')
      .off('click')
      .click(function () {
        playMenuEffect();
        $('#main-elements').show();
        $('#setting-elements').hide();
      });
  });
});
