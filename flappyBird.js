//sounds
var jumpSound = new Audio("jumpSound2.wav");
let gameOverSound = new Audio("gameOver.wav");
let passPipeSound = new Audio("coinSound.wav");

//board
let board;
let boardWidth = 360;
let boardHeight = 640;
let context;

//bird
let birdWidth = 34;
let birdHeight = 24;
let birdX = boardWidth/8;
let birdY = boardHeight/2;
let birdImg;

let bird = {
    x : birdX,
    y : birdY,
    width : birdWidth,
    height : birdHeight
}

//pipes
let pipeArray = [];
let pipeWidth = 64;
let pipeHeight = 512;
let pipeX = boardWidth;
let pipeY = 0;

let topPipeImg;
let bottomPipeImg;

//physics
let velocityX = -2
; //pipes moving left speed
let velocityY = 0; //bird jump speed
let gravity = 0.4;

let gameOver = false;
let score = 0;

//score
let bestScore = 0;
let isNewRecord = false;

let level = 1;

window.onload = function(){
    board= document.getElementById("board");
    board.height= boardHeight;
    board.width= boardWidth;
    context= board.getContext("2d");

    //draw flappy bird
    //context.fillStyle = "green";
    //context.fillRect(bird.x, bird.y, bird.width, bird.height);  

    //load images
    birdImg= new Image();
    birdImg.src = "./images/flappybird.png";
    birdImg.onload = function() {
        context.drawImage();
    }

    topPipeImg = new Image();
    topPipeImg.src = "./images/toppipe.png";

    bottomPipeImg = new Image();
    bottomPipeImg.src = "./images/bottompipe.png"; 

    /*if (level >= 2) {
        topPipeImg = new Image();
        topPipeImg.src = "./images/toppipe_infernal.png";
    
        bottomPipeImg = new Image();
        bottomPipeImg.src = "./images/bottompipe_infernal.png";
    } else {
        topPipeImg = new Image();
        topPipeImg.src = "./images/toppipe.png";
    
        bottomPipeImg = new Image();
        bottomPipeImg.src = "./images/bottompipe.png";
    }*/

    requestAnimationFrame(update);
    setInterval(placePipes, 1500); //1,5 seg
    document.addEventListener("keydown", moveBird);
}

function update() {
    requestAnimationFrame(update);
    //changeBackground();

    if (score === 20) {
        level++;
        board.className = "level-2";
        topPipeImg = new Image();
        topPipeImg.src = "./images/toppipe_infernal.png";
    
        bottomPipeImg = new Image();
        bottomPipeImg.src = "./images/bottompipe_infernal.png";
      }

    if (score === 1) {
        topPipeImg = new Image();
        topPipeImg.src = "./images/toppipe.png";
    
        bottomPipeImg = new Image();
        bottomPipeImg.src = "./images/bottompipe.png";
    }
      

    if (gameOver) {
        cancelAnimationFrame(update);
        level = 1;
        return;
    }
    context.clearRect(0, 0, board.width, board.height);

    //bird
    velocityY += gravity;
    //bird.y += velocityY;
    bird.y = Math.max(bird.y + velocityY, 0); //aplicar gravedad a bird.y y limitar bird.y
    context.drawImage(birdImg, bird.x, bird.y, bird.width, bird.height);

    if (bird.y > board.height) {
        gameOver = true;
    }

    //pipes
    for (let i = 0; i < pipeArray.length; i++){
        let pipe = pipeArray[i];
        pipe.x += velocityX;
        context.drawImage(pipe.img, pipe.x, pipe.y, pipe.width, pipe.height);

        if (!pipe.passed && bird.x > pipe.x + pipe.width) {
            score += 0.5; //Porque hay 2 pipes y 0.5*2 = 1;
            pipe.passed = true;
        }

        if (pipe.passed) {
            passPipeSound.play();
        }

        if (detectCollision(bird, pipe)) {
            gameOverSound.play();
            gameOver = true;
        }

        if (score > bestScore) {
            bestScore = score;
            isNewRecord = true;
          } else {
            isNewRecord = false;
          }        
    }

    if (isNewRecord) {
        context.fillText(`Score: ${score}   NEW RECORD!`, 5, 45);
      } else {
        context.fillText(`Score: ${score}   Best: ${bestScore}`, 5, 45);
      }
      

    //clear pipes
    while (pipeArray.length > 0 && pipeArray[0].x < -pipeWidth){
        pipeArray.shift(); //rumueve el primer elemento del arreglo
    }

    //score
    context.fillStyle = "white";
    context.font = "30px sans-serif";
   // context.fillText (score, 5, 45);  

    if (gameOver) {
        context.fillText("GAME OVER", 5, 90);
    }
}

function placePipes(){

    if (gameOver) {
        return;
    }

    let randomPipeY = pipeY - pipeHeight/4 - Math.random()*(pipeHeight/2);
    let openingSpace = board.height/6;

    /*if (level >= 2) {
        topPipeImg = new Image();
        topPipeImg.src = "./images/toppipe_infernal.png";
    
        bottomPipeImg = new Image();
        bottomPipeImg.src = "./images/bottompipe_infernal.png";
    } else {
        topPipeImg = new Image();
        topPipeImg.src = "./images/toppipe.png";
    
        bottomPipeImg = new Image();
        bottomPipeImg.src = "./images/bottompipe.png";
    }*/


    let topPipe = {
        img: topPipeImg,
        x : pipeX,
        y : randomPipeY,
        width : pipeWidth,
        height : pipeHeight,
        passed : false
    }

    pipeArray.push(topPipe);

    let bottomPipe = {
        img: bottomPipeImg,
        x : pipeX,
        y : randomPipeY + pipeHeight + openingSpace,
        width : pipeWidth,
        height : pipeHeight,
        passed : false
    }
    pipeArray.push(bottomPipe);
}

let initialBirdY = birdY;

function moveBird(e){
    if (e.code == "Space" || e.code == "ArrowUp" || e.code == "KeyX") {

        jumpSound.play();

        //jump
        velocityY = -6;

        //reset game
        if (gameOver) {

           /* bird.y = initialBirdY;
            pipeArray = [];
            score = 0;
            gameOver = false;*/

            resetGame();
        }
    }
}

function detectCollision(a, b){
    return a.x < b.x + b.width && 
           a.x + a.width > b.x &&
           a.y < b.y +b.height &&
           a.y + a.height > b.y;
}

function resetGame() {
    // Restablecer variables y elementos del juego al nivel 1
    level = 1;
    board.className = "level-1";
  
    pipeArray = [];
  
    // Restablecer imágenes de tuberías al nivel 1
    topPipeImg = new Image();
    topPipeImg.src = "./images/toppipe.png";
  
    bottomPipeImg = new Image();
    bottomPipeImg.src = "./images/bottompipe.png";
  
    // Restablecer otras variables y elementos del juego según sea necesario
    // ...
  
    // Reiniciar el juego
    gameOver = false;
    score = 0;
    bird.y = initialBirdY;
  }
  
