const canvasDiv = document.getElementById("canvas");
const myCanvas = document.createElement('canvas');
myCanvas.height = 400;
myCanvas.width = 400;
canvasDiv.appendChild(myCanvas);

const ctx = myCanvas.getContext('2d');
ctx.fillStyle = 'grey';
ctx.fillRect(10,10,390,390);

class Box {
  constructor(x, y, height, width, color) {
		this.x = x;
		this.y = y;
		this.height = height;
		this.width = width;
		this.color = color;
  }

  updatePos() {
    this.x += Math.random() * 0.3;
    this.y += Math.random() * 0.3;
  }
}

function draw(box) {
  ctx.fillStyle = box.color;
  ctx.fillRect(box.x,box.y,box.width,box.height);
}
const boxes = [
new Box(50, 60, 30, 20, 'red'),
new Box(60, 70, 40, 20, 'yellow'),
new Box(70, 80, 50, 20, 'green'),
new Box(80, 90, 60, 20, 'cyan'),
new Box(90, 100, 20, 20, 'blue'),
new Box(100, 50, 20, 20, 'purple'),
];
let animationId;
const animate = () => {
  ctx.fillStyle = 'grey';
  ctx.clearRect(0,0,800,800);
  ctx.fillRect(10,10,390,390);
  for (let b of boxes) {
    b.updatePos();
    draw(b);
  }
  animationId = requestAnimationFrame(animate);
};

canvasDiv.addEventListener('mouseover', () => {
  if (!animationId) {
    animationId = requestAnimationFrame(animate);
  }
});

canvasDiv.addEventListener('mouseout', () => {
  cancelAnimationFrame(animationId);
    animationId = null;
});
