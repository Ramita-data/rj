const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreNum = document.getElementById('scoreNum');
const levelNum = document.getElementById('levelNum');
const paypalContainer = document.getElementById('paypal-button-container');
const unlockMsg = document.getElementById('unlock-msg');
const adBar = document.getElementById('ad-bar');
const bgMusic = document.getElementById('bgMusic');

let score = Number(localStorage.getItem('score')) || 0;
let level = Number(localStorage.getItem('level')) || 1;

scoreNum.textContent = score;
levelNum.textContent = level;

// Resize canvas
function resizeCanvas() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Load images
const playerImg = new Image();
playerImg.src = 'player-lantern.png';
const floatingImg = new Image();
floatingImg.src = 'floating-lantern.png';
const obstacleImg = new Image();
obstacleImg.src = 'obstacle.png';
const bgImg = new Image();
bgImg.src = 'background.png';

// Player lantern
let lantern = {x:canvas.width/2, y:canvas.height-80, width:100, height:100, speed:6};
let moveLeft=false, moveRight=false;
document.addEventListener('keydown', e=>{ if(e.key==='ArrowLeft') moveLeft=true; if(e.key==='ArrowRight') moveRight=true; });
document.addEventListener('keyup', e=>{ if(e.key==='ArrowLeft') moveLeft=false; if(e.key==='ArrowRight') moveRight=false; });

// Start music on first click/tap
let musicStarted = false;
canvas.addEventListener('pointerdown', () => {
  if(!musicStarted){ bgMusic.volume=0.3; bgMusic.play().catch(()=>{}); musicStarted=true; }
});

// Floating lanterns
class FloatingLantern {
  constructor(){
    this.x = Math.random()*(canvas.width-60)+30;
    this.y = Math.random()*canvas.height/2;
    this.width=60;
    this.height=60;
    this.connected=false;
    this.floatOffset=Math.random()*Math.PI*2;
    this.particles=[];
  }
  draw(){
    let floatY = this.y + Math.sin(Date.now()/500 + this.floatOffset)*8;
    ctx.drawImage(floatingImg, this.x-this.width/2, floatY-this.height/2, this.width, this.height);
    this.updateParticles(floatY);
  }
  updateParticles(y){
    if(Math.random()<0.1) this.particles.push({x:this.x, y:y, alpha:1, size:Math.random()*3+1});
    this.particles.forEach((p,i)=>{
      ctx.beginPath();
      ctx.fillStyle=`rgba(255,255,255,${p.alpha})`;
      ctx.arc(p.x, p.y, p.size,0,Math.PI*2);
      ctx.fill();
      p.y -= 0.5; p.alpha -=0.02;
      if(p.alpha<=0) this.particles.splice(i,1);
    });
  }
}

// Obstacles
class Obstacle {
  constructor(){
    this.width = Math.random()*60+60;
    this.height = 40;
    this.x = Math.random()*(canvas.width-this.width);
    this.y = -50;
    this.speed = 1 + level*0.2;
  }
  update(){ this.y += this.speed; }
  draw(){ ctx.drawImage(obstacleImg, this.x, this.y, this.width, this.height); }
}

let floatingLanterns=[];
for(let i=0;i<5;i++) floatingLanterns.push(new FloatingLantern());
let obstacles=[];

// Animate
function animate(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // Draw background
  if(bgImg.complete) ctx.drawImage(bgImg,0,0,canvas.width,canvas.height);

  // Move player
  if(moveLeft) lantern.x-=lantern.speed;
  if(moveRight) lantern.x+=lantern.speed;
  lantern.x = Math.min(Math.max(lantern.x, lantern.width/2), canvas.width-lantern.width/2);

  // Draw player
  if(playerImg.complete) ctx.drawImage(playerImg, lantern.x-lantern.width/2, lantern.y-lantern.height/2, lantern.width, lantern.height);

  // Floating lanterns
  floatingLanterns.forEach((f,i)=>{
    f.draw();
    let floatY = f.y + Math.sin(Date.now()/500 + f.floatOffset)*8;
    let dx = lantern.x - f.x;
    let dy = lantern.y - floatY;
    if(Math.hypot(dx,dy)<lantern.width/2+f.width/2 && !f.connected){
      score++;
      f.connected=true;
      scoreNum.textContent=score;
      localStorage.setItem('score',score);
      if(score%5===0){
        level++;
        levelNum.textContent=level;
        localStorage.setItem('level',level);
        floatingLanterns.push(new FloatingLantern());
        obstacles.push(new Obstacle());
        if(level===5 && localStorage.getItem('adsRemoved')!=='true'){
          paypalContainer.classList.remove('hidden');
          setupPayPal();
        }
      }
    }
  });

  // Obstacles
  obstacles.forEach((o,i)=>{
    o.update();
    o.draw();
    if(lantern.x+lantern.width/2>o.x && lantern.x-lantern.width/2<o.x+o.width &&
       lantern.y+lantern.height/2>o.y && lantern.y-lantern.height/2<o.y+o.height){
      alert("💥 You hit an obstacle! Game Over.");
      score=0; level=1; localStorage.setItem('score',0); localStorage.setItem('level',1);
      scoreNum.textContent=score; levelNum.textContent=level;
      floatingLanterns=[]; for(let i=0;i<5;i++) floatingLanterns.push(new FloatingLantern());
      obstacles=[];
    }
    if(o.y>canvas.height) obstacles.splice(i,1);
  });

  requestAnimationFrame(animate);
}
animate();

// PayPal
function setupPayPal(){
  if(!window.paypal) return;
  paypal.Buttons({
    style:{layout:'vertical',color:'gold',shape:'rect',label:'paypal'},
    createOrder:(data,actions)=>actions.order.create({purchase_units:[{description:"Unlock Ad-Free Mode", amount:{value:"10.00"}}]}),
    onApprove:(data,actions)=>actions.order.capture().then(()=>{
      localStorage.setItem('adsRemoved','true');
      paypalContainer.classList.add('hidden');
      unlockMsg.classList.remove('hidden');
      adBar.style.display='none';
    }),
    onError:(err)=>console.error(err)
  }).render('#paypal-button-container');
}
