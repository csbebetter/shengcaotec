const printButton = document.querySelector("[data-print-cv]");

if (printButton) {
  printButton.addEventListener("click", () => {
    window.print();
  });
}

class SakuraPetal {
  constructor(width, height, resetLimit) {
    this.resetLimit = resetLimit;
    this.resetCount = 0;
    this.reset(width, height, true);
  }

  reset(width, height, initial = false) {
    this.x = initial ? Math.random() * width : Math.random() * width;
    this.y = initial ? Math.random() * height : -40 - Math.random() * 120;
    this.size = 9 + Math.random() * 13;
    this.speedY = 0.9 + Math.random() * 1.5;
    this.speedX = -1.2 + Math.random() * 2.4;
    this.swing = Math.random() * Math.PI * 2;
    this.swingSpeed = 0.014 + Math.random() * 0.02;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = -0.016 + Math.random() * 0.032;
    this.opacity = 0.58 + Math.random() * 0.28;
    this.active = true;
  }

  update(width, height) {
    if (!this.active) {
      return;
    }

    this.swing += this.swingSpeed;
    this.rotation += this.rotationSpeed;
    this.x += this.speedX + Math.sin(this.swing) * 1.15;
    this.y += this.speedY;

    const outOfBounds =
      this.x < -60 ||
      this.x > width + 60 ||
      this.y > height + 60;

    if (!outOfBounds) {
      return;
    }

    if (this.resetLimit === -1 || this.resetCount < this.resetLimit) {
      this.resetCount += 1;
      this.reset(width, height);
      return;
    }

    this.active = false;
  }

  draw(context) {
    if (!this.active) {
      return;
    }

    context.save();
    context.translate(this.x, this.y);
    context.rotate(this.rotation);
    context.scale(this.size / 18, this.size / 18);
    context.globalAlpha = this.opacity;

    const gradient = context.createLinearGradient(-12, -10, 12, 14);
    gradient.addColorStop(0, "#fff7fb");
    gradient.addColorStop(0.45, "#ffd7e8");
    gradient.addColorStop(1, "#f1a8c6");

    context.fillStyle = gradient;
    context.beginPath();
    context.moveTo(0, -12);
    context.bezierCurveTo(10, -12, 16, -2, 7, 8);
    context.bezierCurveTo(3, 12, 1, 14, 0, 16);
    context.bezierCurveTo(-1, 14, -3, 12, -7, 8);
    context.bezierCurveTo(-16, -2, -10, -12, 0, -12);
    context.closePath();
    context.fill();

    context.strokeStyle = "rgba(255, 255, 255, 0.45)";
    context.lineWidth = 1.2;
    context.beginPath();
    context.moveTo(0, -8);
    context.quadraticCurveTo(1.6, 2, 0, 14);
    context.stroke();

    context.restore();
  }
}

class SakuraField {
  constructor(options = {}) {
    this.count = options.count ?? 21;
    this.resetLimit = options.resetLimit ?? 2;
    this.petals = [];
    this.animationFrame = null;
    this.canvas = null;
    this.context = null;
    this.handleResize = this.handleResize.bind(this);
    this.render = this.render.bind(this);
  }

  mount() {
    if (this.canvas) {
      return;
    }

    this.canvas = document.createElement("canvas");
    this.canvas.id = "canvas_sakura";
    this.canvas.className = "sakura-canvas";
    this.canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(this.canvas);

    this.context = this.canvas.getContext("2d");
    this.handleResize();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    this.petals = Array.from(
      { length: this.count },
      () => new SakuraPetal(viewportWidth, viewportHeight, this.resetLimit),
    );

    window.addEventListener("resize", this.handleResize);
    this.animationFrame = window.requestAnimationFrame(this.render);
  }

  handleResize() {
    if (!this.canvas) {
      return;
    }

    const ratio = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.canvas.width = width * ratio;
    this.canvas.height = height * ratio;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  render() {
    if (!this.context || !this.canvas) {
      return;
    }

    const width = window.innerWidth;
    const height = window.innerHeight;

    this.context.clearRect(0, 0, width, height);

    for (const petal of this.petals) {
      petal.update(width, height);
      petal.draw(this.context);
    }

    this.animationFrame = window.requestAnimationFrame(this.render);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const sakuraField = new SakuraField({
    count: 34,
    resetLimit: -1,
  });

  sakuraField.mount();
});
