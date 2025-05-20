//버그1: 아무 것도 안하고 계속 켜 놓으면 일정 시간 지나면 bgm이 더이상 작동하지 않음
//근데 이거는 브라우저 자체 정책 문제일 수 있음.

//수정할 점: 쓸데없는 버튼(버튼의 기능을 하지 않는것)은 버튼으로 하지말고 다른걸로 대체하면 좋을듯

//추가할 점: 선택 할 수 있는 것의 커서를 손가락으로 바꾸면 좋을듯?
//ingame 사운드와 main-menu 사운드를 분리해서 서로 다른 사운드로 하는것도 나쁘지 않을듯?

$(function(){
	const bgmAudio = $("#bgm")[0];
	const bgmList = ["bgm0.mp3", "bgm1.mp3"]; //bgm 추가하고싶으면 여기 바꾸면 됨
	const effect = $("#main-effect")[0];//이펙트용
	const uniformList=["homeUniform.png","awayUniform.png"]; //unform 추가하고싶으면 여기 바꾸면 됨
	const pauseList=["Pause.png","Play.png"]; //ingame에서 pause버튼 이미지 리스트
	const bgmOnOffList=["SongOn.png","SongOff.png"]; //ingame에서 bgm on off button list
	let curr_uniform="homeUniform.png"; //현재 유니폼

	//현재 스테이지 표시용 
	//무조건 낮은 단계부터 차례대로 해야되고 밑에 단계를 못깨면 윗 단계 플레이 불가
	let curr_stage=0; 
	$("#kickoff-button1").prop("disabled",true);
	$("#kickoff-button2").prop("disabled",true);



	function playMenuEffect() {
		effect.currentTime = 0;
		effect.play();
	} //menu effect 사운드. 필요할때마다 호출하면됨


	// 기본 사운드 설정, 처음 소리 크기는 여기 변수 값 바꿔주면 됨
	bgmAudio.volume = 0.3;
	effect.volume=0.5;

	// 사용자의 첫 클릭 시 소리 재생 허용
	//브라우저 정책상 어떤 event가 발생해야지만 audio가 실행이 됨
	//그냥 처음부터 실행되게 하는 방법을 나중에 있으면 찾아볼 것
	$(document).one("click", function () {
		bgmAudio.muted = false;
		bgmAudio.play().catch(err => {
			console.warn("BGM 재생 실패:", err);
		});
	});

	
	//Kickoff
	$("#main-button1").on("click",function (){
		playMenuEffect();
		$("#main-elements").hide();
		$("#kickoff-elements").show();
		$("#kickoff-button3").off("click").click(function(){
			$("#main").hide();
			$("#ingame").show();

			//pause button
			$("#ingame-pause-button").off("click").click(function(){
				playMenuEffect(); // 클릭 사운드 효과

			    // 현재 버튼의 배경 이미지 추출
			    let currentPauseButton = $(this).css("background-image");

			    // 이미지 파일명만 추출
			    if (currentPauseButton.includes(pauseList[0])) {
			        // 현재가 "Pause.png"일 때 -> "Play.png"로 변경
			        $(this).css("background-image", `url('${pauseList[1]}')`);

			        // 여기에 게임을 멈추는 로직 추가!! ************

			        $("#ingame").hide();
			        $("#ingame-pause").show();

			        //main menu 클릭할 때 
			        $("#back-to-main-menu").off("click").click(function(){
			        	playMenuEffect();
			        	//여기에 게임을 초기화하는 로직 추가 ************
			        	//모든 것을 처음으로 바꿔 놔야 함 ************
			        	$("#ingame-pause-button").css("background-image", `url('${pauseList[0]}')`); //pause 버튼 바꾸기
			        	$("#ingame-pause").hide();
			        	$("#main").show();
			        	$("#kickoff-elements").trigger("click");
			        });

			    } else {
			        // 현재가 "Play.png"일 때 -> "Pause.png"로 변경
			        $(this).css("background-image", `url('${pauseList[0]}')`);
			        // 여기에 게임을 다시 시작하는 로직 추가
			    }
			});

			//sound on & off button
			$("#ingame-bgm-button").off("click").click(function(){
				let currentBgmButton=$(this).css("background-image");
				if(currentBgmButton.includes(bgmOnOffList[0])){ //song on 일 때 //main-menu에서의 세팅과 일치해야함
					$(this).css("background-image",`url('${bgmOnOffList[1]}')`);
					$("#setting-mute").css("background-image", "url('soundoff.png')"); //main쪽 아이톤도 바꿔야함
					bgmAudio.muted = true;
					$("#setting-sounds").prop("disabled", true); //prop으로 컨트롤바 사용 할지 말지 지정

				}
				else{
					$(this).css("background-image",`url('${bgmOnOffList[0]}')`);
					$("#setting-mute").css("background-image", "url('soundon.png')");//main쪽 아이톤도 바꿔야함
					bgmAudio.muted = false;
					$("#setting-sounds").prop("disabled", false); //prop으로 컨트롤바 사용 할지 말지 지정
				}

				
			});

			//ingame play


		});

		$("#kickoff-back").off("click").click(function(){
			playMenuEffect();
			$("#main-elements").show();
			$("#kickoff-elements").hide();
		});
	});

	//8강
	function quarter_finals(){

	}


	//4강
	function semi_finals(){
		
	}


	//결승
	function final(){
		
	}

	//Setting
	//버그 수정: back버튼을 누르고 다시 돌아올 때마다 off를 안했어서 
	//이벤트 핸들러가 중복되었었음
	$("#main-button2").on("click",function (){
		playMenuEffect();
		$("#main-elements").hide();
		$("#setting-elements").show();
		$("#setting-bgm-type").text(bgmList[0]); //처음 실행할 때 보여주기 위함


		//control sounds range
		$("#setting-sounds").off("input change").on("input change", function () {
			const volume = parseFloat($(this).val());
			bgmAudio.volume = volume;
		});
		
		// control muted
		$("#setting-mute").off("click").on("click", function () {
			playMenuEffect();
			const isMuted = bgmAudio.muted;
			if (isMuted) {
				$(this).css("background-image", "url('soundon.png')");
				$("#ingame-bgm-button").css("background-image",`url('${bgmOnOffList[0]}')`);//ingame 쪽 아이콘도 sound on으로 바꿔야 함

				bgmAudio.muted = false;
				$("#setting-sounds").prop("disabled", false); //prop으로 컨트롤바 사용 할지 말지 지정
			} else {
				$(this).css("background-image", "url('soundoff.png')");
				$("#ingame-bgm-button").css("background-image",`url('${bgmOnOffList[1]}')`);//ingame 쪽 아이콘도 sound on으로 바꿔야 함
				bgmAudio.muted = true;
				$("#setting-sounds").prop("disabled", true);
			}
		});

		//control bgm types
		$("#left-arrow").off("click").click(function (){
			let current_bgm=$("#bgm").attr("src");
			let bgm_index=bgmList.indexOf(current_bgm);
			bgm_index=(bgm_index-1+bgmList.length)%bgmList.length;
			$("#bgm").attr("src", bgmList[bgm_index]);
			$("#bgm")[0].play();
			$("#setting-bgm-type").text(bgmList[bgm_index]);
		});

		$("#right-arrow").off("click").click(function (){
			let current_bgm=$("#bgm").attr("src");
			let bgm_index=bgmList.indexOf(current_bgm);
			bgm_index=(bgm_index+1)%bgmList.length;
			$("#bgm").attr("src", bgmList[bgm_index]);
			$("#bgm")[0].play();
			$("#setting-bgm-type").text(bgmList[bgm_index]);
		});

		//uniform
		$("#home-uniform").off("click").click(function(){
			playMenuEffect();
			curr_uniform=uniformList[0];
			$(this).css("background-color","rgba(255, 255, 255, 0.9)");
			$("#away-uniform").css("background-color","rgba(255, 255, 255, 0.5)");
		});

		$("#away-uniform").off("click").click(function(){
			playMenuEffect();
			curr_uniform=uniformList[1];
			$(this).css("background-color","rgba(255, 255, 255, 0.9)");
			$("#home-uniform").css("background-color","rgba(255, 255, 255, 0.5)");
		});


		$("#setting-back").off("click").click(function () {
			playMenuEffect();
			$("#main-elements").show();
			$("#setting-elements").hide();
		});
	});

});



