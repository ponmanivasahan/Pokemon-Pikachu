class Sprite {
  constructor({
    position,
    velocity,
    image,
    frames = { max: 1, hold: 10 },
    sprites,
    animate = false,
    rotation = 0,
    scale = 1
  }) {
    this.position = position
    this.image = new Image()
    this.frames = { ...frames, val: 0, elapsed: 0 }
    this.width = 0
    this.height = 0
    this.image.onload = () => {
      this.width = (this.image.width / this.frames.max) * scale
      this.height = this.image.height * scale
    }
    this.image.src = image.src

    this.animate = animate
    this.sprites = sprites
    this.opacity = 1

    this.rotation = rotation
    this.scale = scale
  }

  draw() {
    c.save()
    c.translate(
      this.position.x + this.width / 2,
      this.position.y + this.height / 2
    )
    c.rotate(this.rotation)
    c.translate(
      -this.position.x - this.width / 2,
      -this.position.y - this.height / 2
    )
    c.globalAlpha = this.opacity

    const crop = {
      position: {
        x: this.frames.val * (this.width / this.scale),
        y: 0
      },
      width: this.image.width / this.frames.max,
      height: this.image.height
    }

    const image = {
      position: {
        x: this.position.x,
        y: this.position.y
      },
      width: this.image.width / this.frames.max,
      height: this.image.height
    }

    c.drawImage(
      this.image,
      crop.position.x,
      crop.position.y,
      crop.width,
      crop.height,
      image.position.x,
      image.position.y,
      image.width * this.scale,
      image.height * this.scale
    )

    c.restore()

    if (!this.animate) return

    if (this.frames.max > 1) {
      this.frames.elapsed++
    }

    if (this.frames.elapsed % this.frames.hold === 0) {
      if (this.frames.val < this.frames.max - 1) this.frames.val++
      else this.frames.val = 0
    }
  }
}

function getAudioTrack(name) {
  if (typeof window === 'undefined' || !window.audio) return null
  return window.audio[name] || null
}

function playAudioTrack(name) {
  const track = getAudioTrack(name)
  if (track && typeof track.play === 'function') {
    track.play()
  }
}

function stopAudioTrack(name) {
  const track = getAudioTrack(name)
  if (track && typeof track.stop === 'function') {
    track.stop()
  }
}

class Monster extends Sprite {
  constructor({
    position,
    velocity,
    image,
    frames = { max: 1, hold: 10 },
    sprites,
    animate = false,
    rotation = 0,
    isEnemy = false,
    name,
    attacks
  }) {
    super({
      position,
      velocity,
      image,
      frames,
      sprites,
      animate,
      rotation
    })
    this.health = isEnemy ? 300 : 100
    this.maxHealth = this.health
    this.level = 1
    this.xp = 0
    this.isEnemy = isEnemy
    this.name = name
    this.attacks = attacks

    this.cooldowns = {}
    this.statusEffects = {
      burn: 0,
      poison: 0,
      stun: 0
    }
    this.defenseStage = 0
    this.defenseBuffTurns = 0
    this.turnStartProcessed = false
  }

  faint() {
    document.querySelector('#dialogueBox').innerHTML = this.name + ' fainted!'
    gsap.to(this.position, {
      y: this.position.y + 20
    })
    gsap.to(this, {
      opacity: 0
    })
    stopAudioTrack('battle')
    playAudioTrack('victory')
  }

  getDefenseMultiplier() {
    return 1 + this.defenseStage * 0.25
  }

  takeDamage(rawDamage) {
    const reducedDamage = Math.max(
      1,
      Math.round(rawDamage / this.getDefenseMultiplier())
    )
    this.health = Math.max(0, this.health - reducedDamage)
    return reducedDamage
  }

  heal(amount) {
    const before = this.health
    this.health = Math.min(this.maxHealth, this.health + amount)
    return this.health - before
  }

  applyDefenseBuff(stages, duration) {
    const oldStage = this.defenseStage
    this.defenseStage = Math.min(3, this.defenseStage + stages)
    this.defenseBuffTurns = Math.max(this.defenseBuffTurns, duration)
    return this.defenseStage > oldStage
  }

  applyStatus(type, duration) {
    if (!(type in this.statusEffects)) return false
    const previous = this.statusEffects[type]
    this.statusEffects[type] = Math.max(previous, duration)
    return this.statusEffects[type] > previous
  }

  tickCooldowns() {
    Object.keys(this.cooldowns).forEach((attackName) => {
      if (this.cooldowns[attackName] > 0) {
        this.cooldowns[attackName] -= 1
      }
      if (this.cooldowns[attackName] <= 0) {
        delete this.cooldowns[attackName]
      }
    })
  }

  applyStartTurnEffects() {
    const turnMessages = []

    if (this.defenseBuffTurns > 0) {
      this.defenseBuffTurns -= 1
      if (this.defenseBuffTurns === 0 && this.defenseStage > 0) {
        this.defenseStage = 0
        turnMessages.push(this.name + "'s defense buff wore off.")
      }
    }

    if (this.statusEffects.burn > 0) {
      const burnDamage = Math.max(1, Math.floor(this.maxHealth * 0.08))
      this.health = Math.max(0, this.health - burnDamage)
      this.statusEffects.burn -= 1
      turnMessages.push(
        this.name + ' is burned and took ' + burnDamage + ' damage.'
      )
    }

    if (this.statusEffects.poison > 0) {
      const poisonDamage = Math.max(1, Math.floor(this.maxHealth * 0.1))
      this.health = Math.max(0, this.health - poisonDamage)
      this.statusEffects.poison -= 1
      turnMessages.push(
        this.name + ' is poisoned and took ' + poisonDamage + ' damage.'
      )
    }

    return turnMessages
  }

  attack({ attack, recipient, renderedSprites }) {
    const dialogueBox = document.querySelector('#dialogueBox')
    dialogueBox.style.display = 'block'

    let startTurnMessages = []
    if (!this.turnStartProcessed) {
      startTurnMessages = this.applyStartTurnEffects()
      this.turnStartProcessed = true
    }

    const startTurnPrefix =
      startTurnMessages.length > 0
        ? startTurnMessages.join('<br/>') + '<br/>'
        : ''

    if (this.health <= 0) {
      this.tickCooldowns()
      this.turnStartProcessed = false
      dialogueBox.innerHTML =
        startTurnPrefix + this.name + ' fainted before moving!'
      return { acted: false, selfFainted: true, startTurnOnly: true }
    }

    if (this.statusEffects.stun > 0) {
      this.statusEffects.stun -= 1
      this.tickCooldowns()
      this.turnStartProcessed = false
      dialogueBox.innerHTML =
        startTurnPrefix + this.name + ' is stunned and cannot move!'
      return { acted: false, stunned: true }
    }

    if (this.cooldowns[attack.name] > 0) {
      dialogueBox.innerHTML =
        startTurnPrefix +
        attack.name +
        ' is on cooldown for ' +
        this.cooldowns[attack.name] +
        ' more turn(s)!'
      this.turnStartProcessed = false
      return { acted: false, cooldownBlocked: true }
    }

    const hasDamage = attack.damage && attack.damage > 0
    const canMiss = hasDamage
    const isMiss = canMiss ? Math.random() < 0.1 : false

    if (isMiss) {
      this.tickCooldowns()
      this.turnStartProcessed = false
      dialogueBox.innerHTML =
        startTurnPrefix + this.name + ' used ' + attack.name + ' but it missed!'
      if (attack.cooldown && attack.cooldown > 0) {
        this.cooldowns[attack.name] = attack.cooldown
      }
      return { acted: true, missed: true }
    }

    const isCritical = hasDamage ? Math.random() < 0.1 : false
    let rawDamage = hasDamage ? attack.damage : 0
    if (isCritical) rawDamage = Math.floor(rawDamage * 2)

    let healthBar = '#enemyHealthBar'
    if (this.isEnemy) healthBar = '#playerHealthBar'

    const recipientHealthPercent = () => {
      const max = recipient.maxHealth > 0 ? recipient.maxHealth : 100
      const percent = (recipient.health / max) * 100
      return Math.max(0, Math.min(100, percent))
    }

    let rotation = 1
    if (this.isEnemy) rotation = -2.2

    let finalDamage = 0

    if (hasDamage) {
      finalDamage = recipient.takeDamage(rawDamage)

      const damageDisplay = document.createElement('div')
      damageDisplay.style.position = 'fixed'
      damageDisplay.style.color = isCritical ? '#ff0000' : '#ffffff'
      damageDisplay.style.fontSize = isCritical ? '24px' : '20px'
      damageDisplay.style.fontWeight = 'bold'
      damageDisplay.style.fontFamily = " 'Press Start 2P', cursive"
      damageDisplay.style.pointerEvents = 'none'
      damageDisplay.style.zIndex = '50'
      damageDisplay.innerHTML = `-${finalDamage}`
      damageDisplay.style.left = recipient.position.x + 100 + 'px'
      damageDisplay.style.top = recipient.position.y - 50 + 'px'
      document.body.appendChild(damageDisplay)

      gsap.to(damageDisplay, {
        y: -40,
        opacity: 0,
        duration: 1,
        onComplete: () => {
          damageDisplay.remove()
        }
      })
    }

    let dialogueText = this.name + ' used ' + attack.name

    if (isCritical) {
      dialogueText += ' (Critical Hit!)'
    }

    if (attack.heal && attack.heal > 0) {
      const healed = this.heal(attack.heal)
      dialogueText += '<br/>' + this.name + ' recovered ' + healed + ' HP!'
    }

    if (attack.selfEffect?.defenseBuff) {
      const { stages, duration } = attack.selfEffect.defenseBuff
      const buffed = this.applyDefenseBuff(stages, duration)
      if (buffed) {
        dialogueText += '<br/>' + this.name + "'s defense rose!"
      } else {
        dialogueText += '<br/>' + this.name + "'s defense can't go any higher"
      }
    }

    if (
      attack.statusEffect &&
      recipient.health > 0 &&
      Math.random() < attack.statusEffect.chance
    ) {
      const applied = recipient.applyStatus(
        attack.statusEffect.type,
        attack.statusEffect.duration
      )

      if (applied) {
        const statusLabelMap = {
          burn: 'burned',
          poison: 'poisoned',
          stun: 'stunned'
        }
        dialogueText +=
          '<br/>' +
          recipient.name +
          ' is ' +
          statusLabelMap[attack.statusEffect.type] +
          '!'
      }
    }

    if (startTurnMessages.length > 0) {
      dialogueText = startTurnMessages.join('<br/>') + '<br/>' + dialogueText
    }

    this.tickCooldowns()
    this.turnStartProcessed = false

    dialogueBox.innerHTML = dialogueText

    const applyCommonHitEffect = () => {
      playAudioTrack('tackleHit')
      gsap.to(healthBar, {
        width: recipientHealthPercent() + '%'
      })

      gsap.to(recipient.position, {
        x: recipient.position.x + 10,
        yoyo: true,
        repeat: 5,
        duration: 0.08
      })

      gsap.to(recipient, {
        opacity: 0,
        repeat: 5,
        yoyo: true,
        duration: 0.08
      })
    }

    const spawnTypePulse = (color) => {
      const pulse = document.createElement('div')
      pulse.style.position = 'fixed'
      pulse.style.left = recipient.position.x + 60 + 'px'
      pulse.style.top = recipient.position.y + 40 + 'px'
      pulse.style.width = '20px'
      pulse.style.height = '20px'
      pulse.style.borderRadius = '50%'
      pulse.style.background = color
      pulse.style.pointerEvents = 'none'
      pulse.style.zIndex = '60'
      pulse.style.boxShadow = '0 0 12px ' + color
      document.body.appendChild(pulse)

      gsap.to(pulse, {
        width: 90,
        height: 90,
        opacity: 0,
        x: -35,
        y: -35,
        duration: 0.35,
        onComplete: () => {
          pulse.remove()
        }
      })
    }

    switch (attack.name) {
      case 'Fireball':
        playAudioTrack('initFireball')
        const fireballImage = new Image()
        fireballImage.src = './images/fireball.png'
        const fireball = new Sprite({
          position: {
            x: this.position.x,
            y: this.position.y
          },
          image: fireballImage,
          frames: {
            max: 4,
            hold: 10
          },
          animate: true,
          rotation
        })
        renderedSprites.splice(1, 0, fireball)

        gsap.to(fireball.position, {
          x: recipient.position.x,
          y: recipient.position.y,
          onComplete: () => {
            playAudioTrack('fireballHit')
            applyCommonHitEffect()

            renderedSprites.splice(1, 1)
          }
        })
        break
      case 'PoisonSting':
        const poisonTl = gsap.timeline()
        let poisonMoveDistance = 20
        if (this.isEnemy) poisonMoveDistance = -20

        poisonTl
          .to(this.position, {
            x: this.position.x - poisonMoveDistance
          })
          .to(this.position, {
            x: this.position.x + poisonMoveDistance * 2,
            duration: 0.1,
            onComplete: () => {
              spawnTypePulse('rgba(46, 204, 113, 0.75)')
              applyCommonHitEffect()
            }
          })
          .to(this.position, {
            x: this.position.x
          })
        break
      case 'ThunderShock':
        const shockTl = gsap.timeline()
        let shockMoveDistance = 20
        if (this.isEnemy) shockMoveDistance = -20

        shockTl
          .to(this.position, {
            x: this.position.x - shockMoveDistance
          })
          .to(this.position, {
            x: this.position.x + shockMoveDistance * 2,
            duration: 0.1,
            onComplete: () => {
              spawnTypePulse('rgba(52, 152, 219, 0.75)')
              gsap.to(recipient.position, {
                x: recipient.position.x + 4,
                yoyo: true,
                repeat: 8,
                duration: 0.03
              })

              applyCommonHitEffect()
            }
          })
          .to(this.position, {
            x: this.position.x
          })
        break
      case 'Tackle':
        const tackleTl = gsap.timeline()
        let movementDistance = 20
        if (this.isEnemy) movementDistance = -20

        tackleTl
          .to(this.position, {
            x: this.position.x - movementDistance
          })
          .to(this.position, {
            x: this.position.x + movementDistance * 2,
            duration: 0.1,
            onComplete: () => {
              applyCommonHitEffect()
            }
          })
          .to(this.position, {
            x: this.position.x
          })
        break
      case 'Recover':
      case 'IronGuard':
        break
    }

    if (attack.cooldown && attack.cooldown > 0) {
      this.cooldowns[attack.name] = attack.cooldown
    }

    return { acted: true, damage: finalDamage }
  }
}
class Boundary {
  static width = 48
  static height = 48
  constructor({ position }) {
    this.position = position
    this.width = 48
    this.height = 48
  }

  draw() {
    c.fillStyle = 'rgba(255, 0, 0, 0)'
    c.fillRect(this.position.x, this.position.y, this.width, this.height)
  }
}

class Character extends Sprite {
  constructor({
    position,
    velocity,
    image,
    frames = { max: 1, hold: 10 },
    sprites,
    animate = false,
    rotation = 0,
    scale = 1,
    dialogue = [''],
    role = 'npc',
    trainerId = null
  }) {
    super({
      position,
      velocity,
      image,
      frames,
      sprites,
      animate,
      rotation,
      scale
    })

    this.dialogue = dialogue
    this.dialogueIndex = 0
    this.role = role
    this.trainerId = trainerId
  }
}