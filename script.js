
const rndRoll = (n = 1) => (new Array(n)).fill(0).reduce((prev, curr) => prev + Math.random(), 0)

const rndColor = (v = 1) => {
  const r = 1 - v
  const comp = '000'.split('').map(el => Math.random())
  const min = Math.min(...comp)
  const max = Math.max(...comp)
  const del = max - min
  comp.forEach((el, i) => {
    comp[i] = (
      (v * (el - min) / del + r * el) * 255
    ) << 0
  })
  //console.log(comp, min, max, del)
  return `#${comp.map(el => el.toString(16).padStart(2, 0)).join('')}`
}

class Vector {
  constructor({x = 0, y = 0}) {
    this.x = x
    this.y = y
  }
  
  get qLen() {
    return ((this.x * this.x) + (this.y * this.y))
  }

  get length() {
    return Math.sqrt(this.qLen)
  }
  
  add({x = 0, y = 0}) {
    return new Vector({
      x: this.x + x,
      y: this.y + y
    })
  }
  
  sub({x = 0, y = 0}) {
    return new Vector({
      x: this.x - x,
      y: this.y - y
    })
  }
  
  mult(n = 1) {
    return new Vector({
      x: this.x * n,
      y: this.y * n
    })
  }
  
  get norm() {
    const l = this.length || 1
    return new Vector({
      x: this.x / l,
      y: this.y / l
    })
  }

  static make(x = 0, y = 0) {
    return new Vector({x, y})
  }
}

class Unit {
  constructor(x = 0, y = 0) {
    this.pos = new Vector({x, y})
    this.target = null
    this.cooldown = Math.random()
    this.speed = (0.75 + rndRoll() * 0.5) * 32
    this.el = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    this.el.setAttribute('r', 10)
    this.el.setAttribute('cx', this.pos.x)
    this.el.setAttribute('cy', this.pos.y)
    SCENE.FLD.appendChild(this.el)
    this.color = rndColor(0.5)
    this.auto = true
  }
  
  update(t) {
    if (this.cooldown > 0) {
      // chilling
      this.cooldown = this.cooldown - t
    } else {
      // moving
      if (this.target) {
        const dist = this.pos.sub(this.target)
        const step = dist.norm.mult(t * -this.speed)
        
        if (step.length >= dist.length) {
          // here
          this.pos = new Vector(this.target)
          this.target = null
        } else {
          // not yet
          this.pos = this.pos.add(
            step
          )
        }
      } else {
        // new target
        if (this.auto) {
          this.target = new Vector({
            x: (rndRoll(10) - 5) * 100 + 200,
            y: (rndRoll(10) - 5) * 100 + 200
          })
          this.cooldown = rndRoll(10) + 2
          //console.log('New target %o in %f', this.target, this.cooldown)
        }
      }
    }
  }

  set color(hexColor) {
    this.el.setAttribute('fill', hexColor ? hexColor : rndColor())
  }

  place() {
    this.el.setAttribute('cx', this.pos.x)
    this.el.setAttribute('cy', this.pos.y)
  }
}

const DB = document.body

const SCENE = {
  time: Date.now(),
  unit: [],
  FLD: null,
  CUR: {x: 0, y: 0},
  CAM: {x: 0, y: 0},
}

HTMLElement.prototype.cel = function(tag) { 
  const el = document.createElement(tag)
  if (el) { this.appendChild(el) } 
  return el 
}

HTMLElement.prototype.cen = function(NS, tag) { 
  const el = document.createElementNS(NS, tag)
  if (el) { this.appendChild(el) } 
  return el 
}

function gel(i) { return document.getElementById(i) }

const fldCoord = (e) => {
  const rect = SCENE.FLD.getBoundingClientRect()
  return Vector.make(
    e.clientX - rect.x,
    e.clientY - rect.y
  )
}

function Pan(camX = 0, camY = 0) {
  const crnX = (camX - 200).toFixed(2)
  const crnY = (camY - 150).toFixed(2)

  SCENE.CAM = Vector.make(camX * 1, camY * 1)

  SCENE.FLD.setAttribute('viewBox', `${crnX} ${crnY} 400 300`)
  SCENE.FLD.style.backgroundPosition = `${-crnX}px ${-crnY}px`
}

function hover(e) {
  SCENE.CUR = fldCoord(e).sub(Vector.make(200, 150))
}

function onClick(e) {
  const u0 = SCENE.unit[0].pos
  const pos = fldCoord(e)
    .sub(Vector.make(200, 150))
    .add(u0)
    .add(SCENE.CAM.sub(u0))

  console.log(
    pos,
    SCENE.CAM,
    SCENE.unit[0].pos
  )
  SCENE.unit[0].target = new Vector(pos)
}

function solve() {
  // collisions
  const l = SCENE.unit.length
  SCENE.unit.forEach((u, idx, arr) => {
    const n = idx + 1
    for (let i = n; i < l; i++) {
      const opp = arr[i]
      const dst = opp.pos.sub(u.pos)
      if (dst.qLen < 400) {
        const nor = dst.norm
        const mid = dst.mult(0.5).add(u.pos)
        const mov = nor.mult(10)
        u.pos = mid.sub(mov)
        opp.pos = mid.add(mov)
      }
    }
  })
}

function render(time) {
  const radLim = 200 * 200
  const delta = time - SCENE.time
  SCENE.time = time
  SCENE.unit.forEach(u => u.update(delta / 1000))
  solve()
  SCENE.unit.forEach(u => u.place())

  const target = new Vector(SCENE.unit[0].pos)
  const cursor = new Vector(SCENE.CUR)
  const focus = SCENE
    .unit
    .slice(1)
    .filter(el => el.pos.sub(target).qLen < radLim)
  const crowd = focus
    .reduce(
      (prev, curr) => {
        const item = curr.pos.sub(target)
        const weight = (radLim - item.qLen) / radLim
        return prev.add(item.mult(weight))
      }, 
      Vector.make(0, 0)
    )
    .mult(1 / (focus.length + 1))

  const {
    x,
    y
  } = target
    .mult(gel('inp_target').value / 100)
    .add(
      cursor.mult(gel('inp_cursor').value / 100)
    )
    .add(
      crowd.mult(gel('inp_crowd').value / 100)
    )

  Pan(x, y)
  
  requestAnimationFrame(render)
}

function init() {
  SCENE.FLD = DB.cen('http://www.w3.org/2000/svg', 'svg')
  SCENE.FLD.addEventListener('click', onClick)
  SCENE.FLD.addEventListener('mousemove', hover, false)
  SCENE.FLD.onmouseleave = () => { SCENE.CUR = Vector.make(0, 0) }

  SCENE.unit = (new Array(12)).fill(0).map(el => new Unit(
    400 + 100 * (rndRoll(4) - 2), 
    250 + 100 * (rndRoll(4) - 2)
  ))
  SCENE.unit[0].color = '#000'
  SCENE.unit[0].auto = false
  render()
}

init()