var sock = io("/");
var updatables = [];

const DEBUG = true;

var states = {
  scene: 0,
  balls: [],
  game: {
    id: -1,
    launched: false
  },
  control: {},
  econtrol: {},
  _e: {}
};

function launchBall() {
  var ball = new CurlingBall();
  ball.isPlayer = 1;
  ball.setPosition(width / 2, height + 200);
  for (var i = 0; i < states.balls.length; i++) {
    states.balls[i].isPlayer = 0;
  }
  states.balls.push(ball);
  var force = {
    x: 0,
    y: -8 * (states.control.power + 0.3)
  };
  force = Matter.Vector.rotate(force, states.control.angle);
  Matter.Body.applyForce(ball.body, { x: width / 2, y: height + 200 }, force);
  Matter.Body.setAngularVelocity(ball.body, (Math.random() - 0.5) * 0.1);
}

function getPlayer() {
  return states.balls.filter(ball => ball.isPlayer)[0];
}

function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function ease(cur, target, c, precision) {
  var delta = target - cur;
  if (Math.abs(delta) < (precision || 0.001)) {
    return cur;
  }
  return cur + delta * (c || 0.01);
}

function map(t, a, b, c, d) {
  return ((t - a) / (b - a)) * (d - c) + c;
}

function checkForGameover() {
  var moving = 0;
  var hasMaxScore = undefined;
  var maxScore = 10000;
  var newballs = [];
  for (var i = 0; i < states.balls.length; i++) {
    states.balls[i].isMaxScore = false;
    if (!states.balls[i].isStoppedOrOutside()) {
      moving++;
    }
    if (states.balls[i].score() < maxScore) {
      maxScore = states.balls[i].score();
      hasMaxScore = states.balls[i];
    }
    if (!states.balls[i].life == 0) {
      newballs.push(states.balls[i]);
    }
  }
  if (hasMaxScore) {
    hasMaxScore.isMaxScore = true;
  }
  states.balls = newballs;

  if (moving == 0) {
    for (var i = 0; i < states.balls.length; i++) {
      if (!states.balls[i].isMaxScore) {
        states.balls[i].life = 0;
      }
    }
    sock.emit("all", {
      key: "gameover",
      value: 0
    });
    vm.$data.gameover = true;
  }
}

function checkForNewGame() {
  if (!states.control) {
    return;
  }
  if (states.control.gameId != states.game.id) {
    if (states.control.launched) {
      //bad game!
      states.game.id = -100; //waiting
      console.log("not good, resetting");
      sock.emit("all", "reset");
      return;
    } else {
      vm.$data.gaming = false;
      vm.$data.distance = 0;
      vm.$data.gameover = false;
      states.game.id = states.control.gameId;
      states.game.launched = false;
      return;
    }
  } else if (!states.game.launched && states.control.launched) {
    states.game.launched = true;
    launchBall();
  } else if (states.game.launched && states.control.launched) {
    vm.$data.gaming = true;
    checkForGameover();
  }
}

sock.on("state", d => {
  states.control = d.control;
});

function loop(updateFunction) {
  updatables.push(updateFunction);
}

loop(() => {
  for (var i in states.control) {
    if (states.econtrol[i] !== states.control[i]) {
      states.econtrol[i] = states.econtrol[i] || states.control[i];
      states.econtrol[i] +=
        (states.control[i] - states.econtrol[i]) * (states._e[i] || 0.1);
    }
  }
});

const binghuNames = [];
const binghuColors = ["red", "yellow"];
const binghuKV = {};

let binghuFrameNum;
if (DEBUG) {
  binghuFrameNum = 1;
} else {
  binghuFrameNum = 360;
}

for (let i = 1; i <= binghuFrameNum; i++) {
  binghuColors.forEach(color => {
    if (!binghuKV[color]) {
      binghuKV[color] = [];
    }
    const name =
      "./assets/binghu-" + color + "/binghu" + (i + "").padStart(4, 0) + ".png";
    binghuNames.push(name);
    binghuKV[color][i - 1] = name;
  });
}

PIXI.loader
  .add([
    "./assets/playerBrush.png",
    "./assets/playerDash.png",
    "./assets/playerLine1.png",
    "./assets/playerLine2.png",
    "./assets/playerRing.png",
    "./assets/playerText.png",
    "./assets/halfCircle.png",
    "./assets/straight.png",
    "./assets/line.png",
    "./assets/rect.png",
    "./assets/trangle.png",
    "./assets/ring.png",
    "./assets/aimring.png",
    "./assets/winnerRing.png",
    "./assets/aimbtn.png",
    "./assets/circle.png",
    "./assets/shade.png",
    "./assets/crossbig.png",
    "./assets/track.png",
    "./assets/aim.png",
    "./assets/gradientMask.png",
    "./assets/stroke.png",
    ...binghuNames
  ])
  .load(setup);

Engine = Matter.Engine;
Runner = Matter.Runner;
Mouse = Matter.Mouse;
World = Matter.World;
Bodies = Matter.Bodies;
runner = Runner.create();
engine = Engine.create();
world = engine.world;
world.gravity.y = 0;

function center(b, x, y) {
  b.anchor.x = b.anchor.y = 0.5;
  position(b, x, y);
}

function position(b, x, y) {
  if (x || y) {
    b.position.x = x;
    b.position.y = y;
  }
}

const resources = PIXI.loader.resources;
const width = 1920;
const height = 6480;

var centerPosition = {
  x: width / 2,
  y: 1300
};

const app = new PIXI.Application({
  width,
  height,
  backgroundColor: 0xffffff
});
document.body.appendChild(app.view);

app.stage = new PIXI.display.Stage();

const container = new PIXI.Container();
var ballsContainer = new PIXI.Container();
app.stage.addChild(container);

var turn = [
  {
    x: 0, //Math.sin(Date.now() / 1000) * 30,
    y: 0, //5 * 1.5,
    a: 0
  },
  {
    x: -0,
    y: 0, //5 * 2.5,
    a: 0
  }
];

const u = -0.001;
class CurlingBall {
  constructor() {
    this.isPlayer = false;

    this.isMaxScore = false;
    this._isMaxScore = 0;
    this.color = binghuColors[random(0, binghuColors.length - 1)];

    this.texture = resources[binghuKV[this.color][0]].texture;
    this.container = new PIXI.Container();

    this.sprite = new PIXI.Sprite(this.texture);
    this.shade = new PIXI.Sprite(resources["./assets/shade.png"].texture);
    this.shade.blendMode = PIXI.BLEND_MODES.MULTIPLY;
    this.shade.width = this.shade.height = 335;
    this.shade.position.x = 40;
    this.sprite.width = this.sprite.height = 335;

    this.winnerRing = new PIXI.Sprite(
      resources["./assets/winnerRing.png"].texture
    );
    this.winnerRing.blendMode = PIXI.BLEND_MODES.MULTIPLY;
    this.winnerRing.width = this.winnerRing.height = 400;

    this.playerRing = new PIXI.Sprite(
      resources["./assets/playerRing.png"].texture
    );
    this.playerRing.scale.set(0.8);
    center(this.playerRing, 0, 0);
    this.container.addChild(this.playerRing);

    // brush
    this.brush1Container = new PIXI.Container();
    const brush1 = new PIXI.Sprite(
      resources["./assets/playerBrush.png"].texture
    );
    brush1.scale.set(0.8);
    brush1.anchor.set(0.5);
    brush1.x = 0;
    brush1.y = -400;
    this.brush1Container.addChild(brush1);

    this.brush2Container = new PIXI.Container();
    const brush2 = new PIXI.Sprite(
      resources["./assets/playerBrush.png"].texture
    );
    brush2.scale.set(0.8);
    brush2.anchor.set(0.5);
    brush2.x = 0;
    brush2.y = -400;
    this.brush2Container.addChild(brush2);
    this.container.addChild(this.brush1Container);
    this.container.addChild(this.brush2Container);
    // brush

    // speed
    this.speedContainer = new PIXI.Graphics();
    const speedText = new PIXI.Text("", {
      fontWeight: "bold",
      fontSize: 50,
      fontFamily: "PingFang SC",
      fill: "#ae2128",
      align: "center"
    });
    speedText.anchor.set(0.5);
    speedText.y = -250;
    this.speedText = speedText;

    this.speedContainer.addChild(speedText);

    // this.container
    this.container.addChild(this.speedContainer);
    const halfCircle = new PIXI.Sprite(
      resources["./assets/halfCircle.png"].texture
    );
    halfCircle.scale.set(0.7);
    center(halfCircle, 0, -halfCircle.height / 2);
    this.speedContainer.addChild(halfCircle);
    // speed

    // angle
    this.angleContainer = new PIXI.Container();
    const angleSprite = new PIXI.Sprite(
      resources["./assets/playerText.png"].texture
    );
    this.angleContainer.addChild(angleSprite);
    angleSprite.anchor.set(0.5);
    angleSprite.scale.set(0.75);
    angleSprite.y = 220;

    const angleText = new PIXI.Text("", {
      fontWeight: "bold",
      fontSize: 50,
      fontFamily: "PingFang SC",
      fill: "#ffffff",
      align: "center"
    });
    angleText.anchor.set(0.5);
    angleSprite.addChild(angleText);
    this.angleText = angleText;

    this.speedContainer.addChild(this.angleContainer);
    // angle

    center(this.winnerRing, 0, 0);
    center(this.shade, 0, 0);
    center(this.sprite, 0, 0);

    this.container.addChild(this.sprite);
    this.container.addChild(this.shade);
    this.container.addChild(this.winnerRing);

    ballsContainer.addChild(this.container);

    this.shade.alpha = 0.4;

    this.body = Bodies.circle(0, 0, 150, {
      frictionAir: 0.0,
      restitution: 0.5,
      friction: 0
    });

    World.add(world, this.body);

    this.life = 1;
    this._life = 1;

    this.updatable = this.update.bind(this);
    updatables.push(this.updatable);
  }

  score() {
    return Matter.Vector.magnitude(
      Matter.Vector.sub(this.body.position, centerPosition)
    );
  }

  isOutside() {
    return (
      this.body.position.x < -160 ||
      this.body.position.y < -160 ||
      this.body.position.x > width + 160 ||
      this.body.position.y > height + 1800
    );
  }

  isStoppedOrOutside() {
    if (Matter.Vector.magnitude(this.body.velocity) < 0.2 || this.isOutside()) {
      return true;
    }
    return false;
  }

  setPosition(x, y) {
    Matter.Body.setPosition(this.body, {
      x: x,
      y: y
    });
  }

  update(t, dt) {
    this._isMaxScore += ((this.isMaxScore ? 1 : 0) - this._isMaxScore) * 0.2;
    this.winnerRing.alpha = this._isMaxScore * (this.isPlayer ? 0 : 1);

    this.playerRing.visible = this.isPlayer;

    this.winnerRing.rotation += 0.02;
    this._life += (this.life - this._life) * 0.1;
    this.container.alpha = this._life;

    if (this.isOutside()) {
      this.life = 0;
    }

    if (this._life <= 0.1) {
      ballsContainer.removeChild(this.container);
      this.isPlayer = false;
      this.updatable.remove = true;
    }

    if (this.life == 0) {
      World.remove(world, this.body);
    }

    this.container.position.x = this.body.position.x;
    this.container.position.y = this.body.position.y;

    let unmod = Math.abs((this.body.angle / Math.PI) * 180) % 1;
    let rot = Math.floor(Math.abs((this.body.angle / Math.PI) * 180)) % 360;
    this.sprite.rotation = (-unmod / 180) * Math.PI;

    if (!DEBUG) {
      this.sprite.texture = resources[binghuKV[this.color][rot]].texture;
    }

    if (this.isPlayer) {
      turn[0].a = Matter.Vector.angle(this.body.velocity, turn[0]);
      turn[1].a = Matter.Vector.angle(this.body.velocity, turn[1]);

      turn[0].a = Math.min(Math.PI / 4, Math.max(turn[0].a, -Math.PI / 4));
      turn[1].a = Math.min(Math.PI / 4, Math.max(turn[1].a, -Math.PI / 4));

      turn[0].a = Math.max(0, Math.pow(Math.cos(turn[0].a), 2));
      turn[1].a = Math.max(0, Math.pow(Math.cos(turn[1].a), 2));

      turn[0] = Matter.Vector.mult(turn[0], turn[0].a);
      turn[1] = Matter.Vector.mult(turn[1], turn[1].a);

      var mod = Matter.Vector.add(turn[0], turn[1]);

      var friction = {
        x: u * this.body.velocity.x,
        y: u * this.body.velocity.y
      };

      mod = Matter.Vector.mult(mod, -0.03 * Matter.Vector.magnitude(friction));
      friction = Matter.Vector.add(friction, mod);

      Matter.Body.applyForce(
        this.body,
        { x: this.body.position.x, y: this.body.position.y },
        friction
      );
      Matter.Body.setAngularVelocity(
        this.body,
        this.body.angularVelocity * 0.995
      );
    } else {
      var friction = {
        x: u * this.body.velocity.x,
        y: u * this.body.velocity.y
      };
      Matter.Body.applyForce(
        this.body,
        { x: this.body.position.x, y: this.body.position.y },
        friction
      );
      Matter.Body.setAngularVelocity(
        this.body,
        this.body.angularVelocity * 0.995
      );
    }
  }
}

function setup() {
  // ======================================================
  // background
  // ======================================================

  const inputs = [];

  class Base {
    constructor() {
      this.t = 0;
      this.container = new PIXI.Container();
      container.addChild(this.container);
    }
  }

  class Line extends Base {
    constructor() {
      super();
      this.pool = [];
      this.gravity = -10;
      this.dots = [];
      this.density = 60;

      this.randomDots = [];

      for (let i = 0; i < 10; i++) {
        const sprite = new PIXI.Sprite(
          resources["./assets/circle.png"].texture
        );
        this.container.addChild(sprite);
        sprite.anchor.set(0.5);
        const input = {
          pos: new Vec2(random(100, width - 100), random(500, height - 500)),
          type: 1,
          sprite,
          speed: Math.random() * 10 + 3,
          direction: [random(-10, 10), random(-10, 10)]
        };
        sprite.x = input.pos.x;
        sprite.y = input.pos.y;
        this.randomDots.push(input);
        this.container.addChild(sprite);
      }

      const layer = new PIXI.display.Layer();
      layer.useRenderTexture = true;
      layer.useDoubleBuffer = true;
      const trailSprite = new PIXI.Sprite(layer.getRenderTexture());
      layer.addChild(trailSprite);
      trailSprite.alpha = 0.9;
      const showLayer = new PIXI.Sprite(layer.getRenderTexture());

      this.container.addChild(layer);
      this.container.addChild(showLayer);

      this.particleContainer = new PIXI.particles.ParticleContainer(10000, {
        rotation: true,
        tint: true,
        scale: true
      });

      layer.addChild(this.particleContainer);
      // create pool
      for (let i = 0; i < 3000; i++) {
        const sprite = new PIXI.Sprite(
          resources["./assets/straight.png"].texture
        );
        sprite.anchor.set(0.5);
        this.pool.push(sprite);
        sprite.visible = false;
        this.particleContainer.addChild(sprite);
      }
    }
    createDot(y = 0) {
      for (let i = 0; i < this.pool.length; i++) {
        if (!this.pool[i].visible) {
          const sprite = this.pool[i];
          sprite.visible = true;
          const posX = Math.random() * width;
          const randomDots = this.randomDots;

          const dot = {
            invincible: random(0, 8) === 0,
            t: Math.random() * 100 + 20,
            alive: true,
            posX,
            pos: new Vec2(posX, y),
            targetPos: new Vec2(posX, y),
            nextPos: new Vec2(posX, y),
            mass: 2 + Math.random() * 2,
            frequency: Math.random() * 10,
            amplitude: 50 + Math.random() * 20,
            color: [0xffffff, 1],
            size: Math.random() * 20 + 20,
            sprite,
            update(gravity) {
              this.t += 0.01;
              const prevPos = this.pos.clone();
              this.targetPos.x =
                this.posX + Math.sin(this.t * this.frequency) * this.amplitude;
              this.targetPos.y -= gravity * this.mass;
              this.pos.x = ease(this.pos.x, this.targetPos.x, 0.2);
              this.pos.y = ease(this.pos.y, this.targetPos.y, 0.2);
              if (this.pos.y > height + 100) {
                this.alive = false;
                this.sprite.visible = false;
              }
              this.color[1] = Math.abs(Math.sin(this.t));

              const updateForce = (posArr, k) => {
                for (let i = 0; i < posArr.length; i++) {
                  const input = posArr[i];
                  const vector = new Vec2(input.x, input.y).subtract(this.pos);
                  const length = vector.length();
                  let F = k / Math.pow(length, 2);
                  F = Math.min(F, 100);
                  const forceX = (vector.x / length) * F;
                  const forceY = (vector.y / length) * F;
                  this.pos.x -= forceX;
                  this.pos.y -= forceY;
                }
              };

              if (!this.invincible) {
                updateForce(inputs, 2000000);
                updateForce(randomDots.map(randomDot => randomDot.pos), 500000);
              }

              this.sprite.x = (this.pos.clone().x + prevPos.x) / 2;
              this.sprite.y = (this.pos.clone().y + prevPos.y) / 2;
              const vector = prevPos.subtract(this.pos.clone());
              this.sprite.rotation =
                Math.atan2(vector.y, vector.x) + Math.PI / 2;
              this.sprite.height = this.size * (vector.length() / 10);
              this.sprite.tint = this.color[0];
              this.sprite.alpha = this.color[1];
              this.sprite.width = this.size * 0.8;
            }
          };

          this.dots.push(dot);
          break;
        }
      }
    }
    update(delta) {
      this.t += delta;

      this.randomDots.forEach(randomDot => {
        randomDot.pos.x += (randomDot.direction[0] * randomDot.speed) / 10;
        randomDot.pos.y += (randomDot.direction[1] * randomDot.speed) / 10;
        if (randomDot.pos.y < -100) {
          randomDot.pos.y = height + 100;
        }
        if (randomDot.pos.y > height + 100) {
          randomDot.pos.y = -100;
        }
        if (randomDot.pos.x < -100) {
          randomDot.pos.x = width + 100;
        }
        if (randomDot.pos.x > width + 100) {
          randomDot.pos.x = -100;
        }
        randomDot.sprite.x = randomDot.pos.x;
        randomDot.sprite.y = randomDot.pos.y;
      });

      for (
        let i = 0;
        i < Math.round((-this.gravity / 100) * this.density);
        i++
      ) {
        this.createDot();
      }
      this.dots = this.dots.filter(dot => dot.alive);
      this.dots.forEach(dot => {
        dot.update(this.gravity);
      });
    }
  }

  class Magnetic extends Base {
    constructor() {
      super();

      this.forcePoints = [];
      this.particleContainer = new PIXI.particles.ParticleContainer(10000, {
        rotation: true,
        tint: true,
        scale: true
      });
      this.container.addChild(this.particleContainer);
      this.rects = [];
      this.size = 40;
      this.margin = this.size / 2;
      this.r = 300;
      this.initGrid();
    }
    initGrid() {
      for (let i = 0; i < width + this.size; i += this.size + this.margin) {
        for (let j = 0; j < height + this.size; j += this.size + this.margin) {
          const sprite = new PIXI.Sprite(
            resources["./assets/line.png"].texture
          );
          sprite.anchor.set(0.5);
          sprite.x = i;
          sprite.y = j;
          sprite.tint = 0x00b5ff;
          sprite.width = this.size;
          sprite.height = this.size;
          this.particleContainer.addChild(sprite);
          this.rects.push(sprite);
        }
      }
    }
    update(delta) {
      this.t += delta;

      // if (this.forcePoints.length < 20 && Math.random() > 0.93) {
      //   this.forcePoints.push({
      //     v: [0, -100 + Math.random() * -1000],
      //     p: [Math.random() * width, height],
      //     m: Math.random() * 200 + 100
      //   });
      // }

      // this.forcePoints.forEach(dot => {
      //   dot.p[0] += (dot.v[0] * delta) / 60;
      //   dot.p[1] += (dot.v[1] * delta) / 60;
      //   dot.decay = Math.pow((dot.p[1] - height / 2) / (height / 2), 6) + 1;
      //   if (dot.p[1] < 0) {
      //     dot.p[1] += height;
      //   }
      // });

      this.rects.forEach(rect => {
        let alphaTarget = Math.abs(
          noise.simplex3(rect.x / 1000, rect.y / 1000, this.t / 1000)
        );
        let rotationTarget = noise.simplex3(
          rect.x / 5000,
          rect.y / 5000,
          this.t / 100
        );

        // var fx = 0;
        // var fy = 0;
        // var G = 100000;
        // for (var j = 0; j < this.forcePoints.length; j++) {
        //   let dx = rect.x - this.forcePoints[j].p[0];
        //   let dy = rect.y - this.forcePoints[j].p[1];
        //   var dsq = dx * dx + dy * dy + 1;
        //   let d = Math.sqrt(dsq);
        //   let g = Math.min(
        //     500,
        //     (G * this.forcePoints[j].m * this.forcePoints[j].decay) / dsq
        //   );
        //   fx += (dx / d) * g;
        //   fy += (dy / d) * g;
        // }

        // var df = Math.min(300, Math.sqrt(fx * fx + fy * fy));
        // rotationTarget = Math.atan2(fy, fx) + Math.PI / 4;
        // let sizeTarget = df;
        let sizeTarget = this.size;

        for (let i = 0; i < inputs.length; i++) {
          const input = inputs[i];
          const vector = new Vec2(rect.x - input.x, rect.y - input.y);
          if (vector.length() < this.r) {
            sizeTarget = this.size * (vector.length() / (this.r * 2));
            alphaTarget = this.r / vector.length() / 1.5;
            let angle = new Vec2(0, 1).angleTo(vector);
            rotationTarget = angle + (Math.PI * 3) / 4;
          }
        }
        rect.width = ease(this.size, sizeTarget, 0.5);
        rect.height = ease(this.size, sizeTarget, 0.5);
        rect.rotation = ease(rect.rotation, rotationTarget, 0.1);
      });

      this.render();
    }
    render() {}
  }

  class Grid extends Base {
    constructor() {
      super();
      this.particleContainer = new PIXI.particles.ParticleContainer(10000, {
        rotation: true,
        tint: true,
        scale: true
      });

      this.container.addChild(this.particleContainer);
      this.rects = [];
      this.size = 40;
      this.margin = this.size / 2;
      this.initGrid();
      this.r = 400;

      this.randomDots = [];

      for (let i = 0; i < 10; i++) {
        const sprite = new PIXI.Sprite(
          resources["./assets/circle.png"].texture
        );
        sprite.anchor.set(0.5);
        const input = {
          pos: new Vec2(random(100, width - 100), random(500, height - 500)),
          type: 1,
          sprite,
          speed: Math.random() * 10 + 3,
          direction: [random(-10, 10), random(-10, 10)]
        };
        sprite.x = input.pos.x;
        sprite.y = input.pos.y;
        this.randomDots.push(input);
        // this.container.addChild(sprite);
      }
    }
    initGrid() {
      for (let i = 0; i < width + this.size; i += this.size + this.margin) {
        for (let j = 0; j < height + this.size; j += this.size + this.margin) {
          const sprite = new PIXI.Sprite(
            resources["./assets/rect.png"].texture
          );
          sprite.anchor.set(0.5);
          sprite.x = i;
          sprite.y = j;
          sprite.tint = 0xffffff;
          sprite.width = this.size;
          sprite.height = this.size;
          this.particleContainer.addChild(sprite);
          this.rects.push(sprite);
        }
      }
    }
    update(delta) {
      this.t += delta;

      this.randomDots.forEach(randomDot => {
        randomDot.pos.x += (randomDot.direction[0] * randomDot.speed) / 10;
        randomDot.pos.y += (randomDot.direction[1] * randomDot.speed) / 10;
        if (randomDot.pos.y < -100) {
          randomDot.pos.y = height + 100;
        }
        if (randomDot.pos.y > height + 100) {
          randomDot.pos.y = -100;
        }
        if (randomDot.pos.x < -100) {
          randomDot.pos.x = width + 100;
        }
        if (randomDot.pos.x > width + 100) {
          randomDot.pos.x = -100;
        }
        randomDot.sprite.x = randomDot.pos.x;
        randomDot.sprite.y = randomDot.pos.y;
      });

      this.rects.forEach(rect => {
        let alphaTarget =
          Math.abs(noise.simplex3(rect.x / 100, rect.y / 100, this.t / 100)) /
          2;
        let sizeTarget = this.size;

        const updateForce = (posArr, r) => {
          for (let i = 0; i < posArr.length; i++) {
            const input = posArr[i];
            const vector = new Vec2(rect.x - input.x, rect.y - input.y);
            if (vector.length() < r) {
              sizeTarget = this.size * (vector.length() / (r * 2));
              alphaTarget = r / vector.length();
            }
          }
        };

        updateForce(this.randomDots.map(randomDot => randomDot.pos), 100);
        updateForce(inputs, 400);

        rect.width = ease(this.size, sizeTarget, 0.5);
        rect.height = ease(this.size, sizeTarget, 0.5);

        rect.alpha = ease(rect.alpha, alphaTarget, 0.1);
      });

      this.render();
    }
    render() {}
  }

  loop(() => {
    inputs.length = 0;
    states.balls.forEach(ball => {
      inputs.push(new Vec2(ball.body.position.x, ball.body.position.y));
    });
  });

  // const magetic = new Magnetic();
  // const gird = new Grid();
  // const line = new Line();

  loop((time, delta) => {
    delta = delta / 10;
    // gird.container.visible = false;
    // magetic.container.visible = false;
    // line.container.visible = false;
    // if (states.scene === 0) {
    //   magetic.container.visible = true;
    //   magetic.update(delta);
    // }
    // if (states.scene === 1) {
    //   gird.container.visible = true;
    //   gird.update(delta);
    // }
    // if (states.scene === 2) {
    //   line.container.visible = true;
    //   line.update(delta);
    // }
  });

  // ======================================================
  // background
  // ======================================================

  //track
  {
    var track = new PIXI.Container();

    var sprite_track = new PIXI.Sprite(resources["./assets/track.png"].texture);
    var sprite_aim = new PIXI.Sprite(resources["./assets/aim.png"].texture);

    track.addChild(sprite_track);
    track.addChild(sprite_aim);

    sprite_aim.anchor.x = sprite_aim.anchor.y = 0.5;
    sprite_aim.position.x = width / 2;
    sprite_aim.position.y = 1297.3;

    sprite_aim.blendMode = PIXI.BLEND_MODES.MULTIPLY;
    container.addChild(track);
  }

  // ====================================
  const playerInfo = new PIXI.Container();

  const playerDash = new PIXI.Sprite(
    resources["./assets/playerDash.png"].texture
  );
  center(playerDash, width / 2, height);
  playerInfo.addChild(playerDash);

  // const playerLineCenter = new PIXI.Sprite(
  //   resources["./assets/playerLine1.png"].texture
  // );
  // playerLineCenter.anchor.set(0.5, 1);
  // playerLineCenter.x = width - 100;
  // playerLineCenter.y = height;
  // playerInfo.addChild(playerLineCenter);

  const playerLineTop = new PIXI.Sprite(
    resources["./assets/playerLine2.png"].texture
  );
  playerLineTop.anchor.set(0.5);
  playerLineTop.x = width - 100;
  playerLineTop.y = height;
  playerInfo.addChild(playerLineTop);

  // const playerDistance1Text = new PIXI.Text("运动距离", {
  //   fontWeight: "bold",
  //   fontSize: 50,
  //   fontFamily: "PingFang SC",
  //   fill: "#ccc",
  //   align: "right"
  // });
  // playerDistance1Text.anchor.set(0.5);
  // playerDistance1Text.x = width - 240;

  // const playerDistance2Text = new PIXI.Text("", {
  //   fontWeight: "bold",
  //   fontSize: 50,
  //   fontFamily: "PingFang SC",
  //   fill: "#ccc",
  //   align: "right"
  // });
  // playerDistance2Text.anchor.set(0.5);
  // playerDistance2Text.x = width - 240;

  // playerInfo.addChild(playerDistance1Text);
  // playerInfo.addChild(playerDistance2Text);
  container.addChild(playerInfo);
  // ====================================

  var time = 0;
  function update(n) {
    var delta = Date.now() - time;
    time = Date.now();
    Runner.tick(runner, engine, delta);
    var nextUpdatables = [];
    for (var i = 0; i < updatables.length; i++) {
      if (!updatables[i].remove) {
        updatables[i](time, delta);
        nextUpdatables.push(updatables[i]);
      }
    }
    updatables = nextUpdatables;
    requestAnimationFrame(update);
  }

  update();
  // var c = new CurlingBall();
  // window.c = c;
  // c.setPosition(width / 2, height);

  var aimContainer = new PIXI.Container();

  var aimRing = new PIXI.Sprite(resources["./assets/aimring.png"].texture);
  var aimBtn = new PIXI.Sprite(resources["./assets/aimbtn.png"].texture);
  var aimText = new PIXI.Text("测试", {
    fontFamily: "PingFang SC",
    fontSize: 50,
    fill: 0xffffff,
    align: "center"
  });

  aimBtn.position.y = -60;
  aimText.position.y = -85;

  var aimRotator = new PIXI.Container();
  var aimMask = new PIXI.Sprite(resources["./assets/gradientMask.png"].texture);
  var aimDash = new PIXI.extras.TilingSprite(
    resources["./assets/stroke.png"].texture,
    15,
    3470
  );

  aimMask.anchor.x = 0.5;
  aimMask.anchor.y = 1;
  aimDash.anchor.x = 0.5;
  aimDash.anchor.y = 1;

  aimRotator.addChild(aimMask);
  aimRotator.addChild(aimDash);

  aimDash.mask = aimMask;

  center(aimText);
  aimBtn.addChild(aimText);

  aimRing.anchor.x = aimBtn.anchor.x = 0.5;
  aimRing.anchor.y = aimBtn.anchor.y = 1;
  aimContainer.addChild(aimRing);
  aimContainer.addChild(aimRotator);
  aimContainer.addChild(aimBtn);
  aimRotator.position.y = 200;

  aimContainer.position.x = width / 2;
  aimContainer.position.y = height;

  loop(() => {
    var show_angler = Math.min(
      1,
      states.econtrol.angle_enabled + states.econtrol.selecting_power
    );
    aimText.text =
      "角度 " + Math.floor((states.control.angle / Math.PI) * 1800) / 10 + "°";
    aimContainer.alpha = show_angler;
    aimDash.tilePosition.y += -4.1;
    aimRotator.rotation = states.econtrol.angle || 0;
  });

  container.addChild(aimContainer);
  container.addChild(ballsContainer);

  // ===================

  loop(() => {
    states.balls.forEach(ball => {
      if (ball.isPlayer) {
        ball.brush1Container.visible = true;
        ball.brush2Container.visible = true;
        ball.speedContainer.visible = true;
      } else {
        ball.brush1Container.visible = false;
        ball.brush2Container.visible = false;
        ball.speedContainer.visible = false;
      }
    });

    const player = getPlayer();
    playerInfo.visible = false;
    if (player) {
      playerInfo.visible = true;

      const y = player.container.y;
      // playerLineCenter.height = height - y;
      vm.$data.distance = height - y;

      playerDash.y = y;
      playerLineTop.y = y;
      // playerDistance1Text.y = y + 50;
      // playerDistance2Text.y = y + 150;
      // playerDistance2Text.text = `19cm`;

      // TODO
      player.brush1Container.rotation += 0.01;
      player.brush2Container.rotation -= 0.01;
      const sp = player.speedContainer;
      sp.clear();
      sp.lineStyle(16, 0xae2128, 1);
      sp.arc(0, 0, 186, Math.PI, Math.PI + Math.PI / 3, false);
      sp.lineTo();
      player.angleText.text = `角度 -2°`;
      player.speedText.text = `速度 ${player.brush1Container.rotation.toFixed(
        2
      )}m/s`;
    }
  });
  // ====================
}

loop(checkForNewGame);

// ====================
// ====================
// ====================
// ====================

const vm = new Vue({
  el: "#box",
  data: {
    gameover: false,
    distance: 0,
    gaming: false
  }
});
