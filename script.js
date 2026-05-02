const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let time = 0;

/* ======================
   ORIGINAL COLORS
====================== */

const colors = [
"#ff5500",
"#00ffff",
"#00ff88",
"#ffaa00",
"#bb00ff"
];

/* ======================
   SOUND SYSTEM (FIXED)
====================== */

let clickSound = new Audio("sounds/click.mp3");
let burstSound = new Audio("sounds/burst.mp3");

clickSound.preload="auto";
burstSound.preload="auto";

document.addEventListener("click", () => {

clickSound.play().then(()=>{
clickSound.pause();
clickSound.currentTime=0;
});

burstSound.play().then(()=>{
burstSound.pause();
burstSound.currentTime=0;
});

},{once:true});

/* ======================
   CAMERA
====================== */

navigator.mediaDevices
.getUserMedia({ video:true })
.then(stream=>{
video.srcObject = stream;
});

/* ======================
   RADAR PULSE
====================== */

let radarPulse = 0;

function drawRadarPulse(){

let cx = canvas.width - 95;
let cy = canvas.height - 95;

radarPulse++;

if(radarPulse > 60)
radarPulse = 0;

ctx.beginPath();

ctx.arc(cx,cy,radarPulse,0,Math.PI*2);

ctx.strokeStyle="#00ffff";
ctx.lineWidth=0.5;

ctx.globalAlpha=0.3;
ctx.stroke();
ctx.globalAlpha=1;

}

/* ======================
   ENERGY DOTS
====================== */

let energyDots=[];

function createEnergy(x1,y1,x2,y2,color){

energyDots.push({
x1,y1,x2,y2,
t:Math.random(),
speed:0.02,
color
});

}

function drawEnergyDots(){

energyDots.forEach(dot=>{

dot.t+=dot.speed;

if(dot.t>1)
dot.t=0;

let x=
dot.x1+(dot.x2-dot.x1)*dot.t;

let y=
dot.y1+(dot.y2-dot.y1)*dot.t;

ctx.beginPath();

ctx.arc(x,y,1,0,Math.PI*2);

ctx.fillStyle=dot.color;

ctx.shadowBlur=10;
ctx.shadowColor=dot.color;

ctx.fill();

});

}

/* ======================
   PARTICLES
====================== */

let particles=[];

function createParticle(x,y,color){

particles.push({
x,y,
vx:(Math.random()-0.5)*2,
vy:(Math.random()-0.5)*2,
life:25,
color
});

}

function drawParticles(){

particles.forEach(p=>{

ctx.beginPath();

ctx.arc(p.x,p.y,1,0,Math.PI*2);

ctx.fillStyle=p.color;

ctx.shadowBlur=8;
ctx.shadowColor=p.color;

ctx.fill();

p.x+=p.vx;
p.y+=p.vy;

p.life--;

});

particles=particles.filter(p=>p.life>0);

}

/* ======================
   TRAILS
====================== */

let trails={};

function drawTrail(id,x,y,color){

if(!trails[id])
trails[id]=[];

trails[id].push({x,y});

if(trails[id].length>20)
trails[id].shift();

ctx.beginPath();

trails[id].forEach((p,i)=>{

if(i==0)
ctx.moveTo(p.x,p.y);
else
ctx.lineTo(p.x,p.y);

});

ctx.strokeStyle=color;

ctx.lineWidth=1;

ctx.shadowBlur=8;
ctx.shadowColor=color;

ctx.stroke();

}

/* ======================
   FINGER LABELS (RESTORED)
====================== */

const fingerNames=[
"THUMB",
"INDEX",
"MIDDLE",
"RING",
"PINKY"
];

function drawLabel(x,y,text,color){

ctx.font="10px Consolas";

ctx.fillStyle=color;

ctx.shadowBlur=6;
ctx.shadowColor=color;

ctx.fillText(text,x+8,y-8);

}

/* ======================
   DRAW FUNCTIONS
====================== */

function drawCircle(x,y,color,size){

ctx.beginPath();

ctx.arc(x,y,size,0,Math.PI*2);

ctx.fillStyle=color;

ctx.shadowBlur=15;
ctx.shadowColor=color;

ctx.fill();

}

function drawRipple(x,y,color){

let r=Math.abs(Math.sin(time))*15+8;

ctx.beginPath();

ctx.arc(x,y,r,0,Math.PI*2);

ctx.strokeStyle=color;

ctx.lineWidth=0.8;

ctx.globalAlpha=0.4;

ctx.stroke();

ctx.globalAlpha=1;

}

function animatedLine(x1,y1,x2,y2,color){

let pulse=Math.sin(time)*0.3+1;

ctx.beginPath();

ctx.moveTo(x1,y1);
ctx.lineTo(x2,y2);

ctx.strokeStyle=color;

ctx.lineWidth=pulse;

ctx.shadowBlur=5;
ctx.shadowColor=color;

ctx.stroke();

if(Math.random()<0.02){
createEnergy(x1,y1,x2,y2,color);
}

}

/* ======================
   MEDIAPIPE
====================== */

const hands=new Hands({
locateFile:file=>
`https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
maxNumHands:2,
modelComplexity:1,
minDetectionConfidence:0.7,
minTrackingConfidence:0.7
});
/* ======================
   PINCH SOUND DETECTION
====================== */

let pinchState = false;

function detectPinch(hand){

let thumb = hand[4];
let index = hand[8];

let dx = thumb.x - index.x;
let dy = thumb.y - index.y;

let dist =
Math.sqrt(dx*dx + dy*dy);

/* pinch start */

if(dist < 0.05 && !pinchState){

clickSound.currentTime = 0;
clickSound.play();

burstSound.currentTime = 0;
burstSound.play();

pinchState = true;

}

/* release */

if(dist > 0.08){

pinchState = false;

}

}

/* ======================
   MAIN LOOP
====================== */

hands.onResults(results=>{

ctx.clearRect(0,0,canvas.width,canvas.height);

time+=0.05;

drawParticles();
drawEnergyDots();
drawRadarPulse();

if(results.multiHandLandmarks){

let handsData=[];

results.multiHandLandmarks.forEach((hand,hIndex)=>{

let fingerIndexes=[4,8,12,16,20];

let converted=[];

fingerIndexes.forEach((idx,i)=>{

let p=hand[idx];

let x=p.x*canvas.width;
let y=p.y*canvas.height;

let color=colors[i];

converted.push({x,y,color});

drawTrail(
hIndex+"_"+i,
x,y,
color
);

drawCircle(x,y,color,5);
drawRipple(x,y,color);

drawLabel(
x,y,
fingerNames[i],
color
);

createParticle(x,y,color);

});

/* internal connections */

for(let i=0;i<converted.length;i++){
for(let j=i+1;j<converted.length;j++){

animatedLine(
converted[i].x,
converted[i].y,
converted[j].x,
converted[j].y,
converted[j].color
);

}
}

handsData.push(converted);

/* ⭐ THIS IS THE ONLY NEW LINE */

detectPinch(hand);

});

/* cross-hand */

if(handsData.length==2){

let h1=handsData[0];
let h2=handsData[1];

for(let i=0;i<h1.length;i++){
for(let j=0;j<h2.length;j++){

animatedLine(
h1[i].x,
h1[i].y,
h2[j].x,
h2[j].y,
h2[j].color
);

}
}

}

}

});

/* ======================
   CAMERA START
====================== */

const camera=new Camera(video,{
onFrame:async()=>{
await hands.send({ image:video });
},
width:1280,
height:720
});

camera.start();

/* ======================
   FACE PREVIEW (FIXED)
====================== */

const previewBox =
document.getElementById("previewBox");

const captureBtn =
document.getElementById("captureBtn");

captureBtn.onclick = ()=>{

if(video.videoWidth === 0) return;

let tempCanvas =
document.createElement("canvas");

tempCanvas.width =
video.videoWidth;

tempCanvas.height =
video.videoHeight;

let tctx =
tempCanvas.getContext("2d");

tctx.drawImage(video,0,0);

previewBox.src =
tempCanvas.toDataURL("image/png");

};

/* ======================
   GPS ADDRESS (FINAL)
====================== */

function getExactLocation(){

if (navigator.geolocation){

navigator.geolocation.getCurrentPosition(

async (position)=>{

let lat=position.coords.latitude;
let lon=position.coords.longitude;

try{

let res =
await fetch(
`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
);

let data=await res.json();

let addr=data.address;

let street=
addr.road||
addr.neighbourhood||
"Unknown Street";

let area=
addr.suburb||
addr.city_district||
"Unknown Area";

let city=
addr.city||
addr.town||
addr.village||
"Unknown City";

let country=
addr.country||
"Unknown Country";

document
.getElementById("locationBox")
.innerHTML=

"📍 LOCATION:<br>"+
street+"<br>"+
area+"<br>"+
city+"<br>"+
country;

}
catch(err){
console.log("Location fetch error");
}

}

);

}

}

getExactLocation();