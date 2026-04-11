const canvas = document.querySelector('canvas')
const c = canvas.getContext('2d')

c.imageSmoothingEnabled = false
c.webkitImageSmoothingEnabled = false
c.mozImageSmoothingEnabled = false
c.msImageSmoothingEnabled = false

const GAME_WIDTH = 1024
const GAME_HEIGHT = 576

canvas.width = GAME_WIDTH
canvas.height = GAME_HEIGHT

function resizeCanvasDisplay() {
  const horizontalPadding = 16
  const verticalPadding = 16
  const maxWidth = window.innerWidth - horizontalPadding
  const maxHeight = window.innerHeight - verticalPadding
  const scale = Math.min(maxWidth / GAME_WIDTH, maxHeight / GAME_HEIGHT, 1)

  canvas.style.width = `${Math.floor(GAME_WIDTH * scale)}px`
  canvas.style.height = `${Math.floor(GAME_HEIGHT * scale)}px`

  const container = document.querySelector('.container')
  if (container) {
    container.style.width = canvas.style.width
    container.style.height = canvas.style.height
  }
}

resizeCanvasDisplay()
window.addEventListener('resize', resizeCanvasDisplay)

const collisionsMap = []
for (let i = 0; i < collisions.length; i += 70) {
  collisionsMap.push(collisions.slice(i, 70 + i))
}

const battleZonesMap = []
for (let i = 0; i < battleZones.length; i += 70) {
  battleZonesMap.push(battleZones.slice(i, 70 + i))
}

const charactersMap = []
for (let i = 0; i < charactersMapData.length; i += 70) {
  charactersMap.push(charactersMapData.slice(i, 70 + i))
}

const boundaries = []
const offset = {
  x: -735,
  y: -650
}

collisionsMap.forEach((row, i) => {
  row.forEach((symbol, j) => {
    if (symbol === 1025) {
      boundaries.push(
        new Boundary({
          position: {
            x: j * Boundary.width + offset.x,
            y: i * Boundary.height + offset.y
          }
        })
      )
    }
  })
})

const battleZoneBoundaries = []
battleZonesMap.forEach((row, i) => {
  row.forEach((symbol, j) => {
    if (symbol === 1025) {
      battleZoneBoundaries.push(
        new Boundary({
          position: {
            x: j * Boundary.width + offset.x,
            y: i * Boundary.height + offset.y
          }
        })
      )
    }
  })
})

const characters = []
const villagerImg = new Image()
villagerImg.src = './images/villager/Idle.png'

const oldManImg = new Image()
oldManImg.src = './images/oldMan/Idle.png'

charactersMap.forEach((row, i) => {
  row.forEach((symbol, j) => {
    if (symbol === 1026) {
      characters.push(
        new Character({
          position: {
            x: j * Boundary.width + offset.x,
            y: i * Boundary.height + offset.y
          },
          image: villagerImg,
          frames: {
            max: 4,
            hold: 60
          },
          scale: 3,
          animate: true,
          dialogue: ['...', 'Hey mister, have you seen my Doggochu?']
        })
      )
    } else if (symbol === 1031) {
      const trainerData =
        typeof getTrainerById === 'function'
          ? getTrainerById('oldManTrainer')
          : null

      characters.push(
        new Character({
          position: {
            x: j * Boundary.width + offset.x,
            y: i * Boundary.height + offset.y
          },
          image: oldManImg,
          frames: {
            max: 4,
            hold: 60
          },
          scale: 3,
          dialogue:
            trainerData && trainerData.preBattleDialogue
              ? trainerData.preBattleDialogue
              : ['My bones hurt'],
          role: 'trainer',
          trainerId: 'oldManTrainer'
        })
      )
    }

    if (symbol !== 0) {
      boundaries.push(
        new Boundary({
          position: {
            x: j * Boundary.width + offset.x,
            y: i * Boundary.height + offset.y
          }
        })
      )
    }
  })
})

const image = new Image()
const MAP_ASSET_VERSION = Date.now()
image.src = './images/town.png?v=' + MAP_ASSET_VERSION

const foregroundImage = new Image()
foregroundImage.src = './images/foregroundObjects.png?v=' + MAP_ASSET_VERSION

const playerDownImage = new Image()
playerDownImage.src = './images/playerDown.png'

const playerUpImage = new Image()
playerUpImage.src = './images/playerUp.png'

const playerLeftImage = new Image()
playerLeftImage.src = './images/playerLeft.png'

const playerRightImage = new Image()
playerRightImage.src = './images/playerRight.png'

const player = new Sprite({
  position: {
    x: canvas.width / 2 - 192 / 4 / 2,
    y: canvas.height / 2 - 68 / 2
  },
  image: playerDownImage,
  frames: {
    max: 4,
    hold: 10
  },
  sprites: {
    up: playerUpImage,
    left: playerLeftImage,
    right: playerRightImage,
    down: playerDownImage
  }
})

const background = new Sprite({
  position: {
    x: offset.x,
    y: offset.y
  },
  image
})

const foreground = new Sprite({
  position: {
    x: offset.x,
    y: offset.y
  },
  image: foregroundImage
})

const keys = {
  w: { pressed: false },
  a: { pressed: false },
  s: { pressed: false },
  d: { pressed: false }
}

const movementKeyOrder = []
let lastKey = ''

function updateMovementKeyOrder(key, isPressed) {
  const index = movementKeyOrder.indexOf(key)

  if (isPressed) {
    if (index !== -1) movementKeyOrder.splice(index, 1)
    movementKeyOrder.push(key)
  } else if (index !== -1) {
    movementKeyOrder.splice(index, 1)
  }

  lastKey = movementKeyOrder.length > 0 ? movementKeyOrder.at(-1) : ''
}

const movables = [
  background,
  ...boundaries,
  ...battleZoneBoundaries,
  foreground,
  ...characters
]
const renderables = [
  background,
  ...boundaries,
  ...characters,
  player,
  foreground
]

const battle = {
  initiated: false
}

let worldAnimationId = null
let battlePromptOpen = false
let lastBattlePromptAt = 0

const battlePromptState = {
  visible: false,
  pendingOptions: { type: 'wild' }
}

function ensureBattlePrompt() {
  if (document.querySelector('#battlePromptOverlay')) return

  const overlay = document.createElement('div')
  overlay.id = 'battlePromptOverlay'
  overlay.className = 'battle-prompt-overlay'

  const panel = document.createElement('div')
  panel.className = 'battle-prompt-panel'
  panel.innerHTML =
    '<h3>Battle Zone</h3><p>Step into the battlefield now?</p><div class="battle-prompt-actions"><button type="button" id="battlePromptNo">Keep Exploring</button><button type="button" id="battlePromptYes">Enter Battle</button></div>'

  overlay.append(panel)
  document.body.append(overlay)

  const closePrompt = () => {
    battlePromptOpen = false
    battlePromptState.visible = false
    overlay.classList.remove('is-open')
  }

  panel.querySelector('#battlePromptNo').addEventListener('click', closePrompt)
  panel.querySelector('#battlePromptYes').addEventListener('click', () => {
    const options = battlePromptState.pendingOptions || { type: 'wild' }
    closePrompt()
    startBattleTransition(options)
  })

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closePrompt()
  })
}

function openBattlePrompt(options = { type: 'wild' }) {
  ensureBattlePrompt()
  battlePromptState.pendingOptions = options
  battlePromptState.visible = true
  battlePromptOpen = true
  document.querySelector('#battlePromptOverlay').classList.add('is-open')
}

function startBattleTransition(options = { type: 'wild' }) {
  if (battle.initiated) return
  battle.initiated = true

  if (worldAnimationId !== null) {
    window.cancelAnimationFrame(worldAnimationId)
    worldAnimationId = null
  }

  if (typeof audio !== 'undefined') {
    audio.Map?.stop?.()
    audio.initBattle?.play?.()
    audio.battle?.play?.()
  }

  gsap.to('#overlappingDiv', {
    opacity: 1,
    repeat: 3,
    yoyo: true,
    duration: 0.25,
    onComplete() {
      gsap.to('#overlappingDiv', {
        opacity: 1,
        duration: 0.2,
        onComplete() {
          initBattle(options)
          animateBattle()
          gsap.to('#overlappingDiv', {
            opacity: 0,
            duration: 0.2
          })
        }
      })
    }
  })
}

const PLAYER_SPEED = 180
let lastFrameTime = null

function animate(timestamp = performance.now()) {
  if (lastFrameTime === null) lastFrameTime = timestamp

  const deltaSeconds = Math.min((timestamp - lastFrameTime) / 1000, 0.05)
  lastFrameTime = timestamp
  const frameMovement = PLAYER_SPEED * deltaSeconds

  worldAnimationId = window.requestAnimationFrame(animate)
  renderables.forEach((renderable) => renderable.draw())

  if (battle.initiated) return

  if (keys.w.pressed || keys.a.pressed || keys.s.pressed || keys.d.pressed) {
    for (let i = 0; i < battleZoneBoundaries.length; i++) {
      const battleZone = battleZoneBoundaries[i]
      const overlappingArea =
        (Math.min(
          player.position.x + player.width,
          battleZone.position.x + battleZone.width
        ) - Math.max(player.position.x, battleZone.position.x)) *
        (Math.min(
          player.position.y + player.height,
          battleZone.position.y + battleZone.height
        ) - Math.max(player.position.y, battleZone.position.y))

      if (
        rectangularCollision({
          rectangle1: player,
          rectangle2: battleZone
        }) &&
        overlappingArea > (player.width * player.height) / 2
      ) {
        const now = Date.now()
        if (!battlePromptOpen && now - lastBattlePromptAt > 1500) {
          lastBattlePromptAt = now
          openBattlePrompt({ type: 'wild' })
        }
        break
      }
    }
  }

  let moving = true
  player.animate = false

  if (keys.w.pressed && lastKey === 'w') {
    player.animate = true
    player.image = player.sprites.up

    checkForCharacterCollision({
      characters,
      player,
      characterOffset: { x: 0, y: frameMovement }
    })

    for (let i = 0; i < boundaries.length; i++) {
      const boundary = boundaries[i]
      if (
        rectangularCollision({
          rectangle1: player,
          rectangle2: {
            ...boundary,
            position: {
              x: boundary.position.x,
              y: boundary.position.y + frameMovement
            }
          }
        })
      ) {
        moving = false
        break
      }
    }

    if (moving) movables.forEach((movable) => (movable.position.y += frameMovement))
  } else if (keys.a.pressed && lastKey === 'a') {
    player.animate = true
    player.image = player.sprites.left

    checkForCharacterCollision({
      characters,
      player,
      characterOffset: { x: frameMovement, y: 0 }
    })

    for (let i = 0; i < boundaries.length; i++) {
      const boundary = boundaries[i]
      if (
        rectangularCollision({
          rectangle1: player,
          rectangle2: {
            ...boundary,
            position: {
              x: boundary.position.x + frameMovement,
              y: boundary.position.y
            }
          }
        })
      ) {
        moving = false
        break
      }
    }

    if (moving) movables.forEach((movable) => (movable.position.x += frameMovement))
  } else if (keys.s.pressed && lastKey === 's') {
    player.animate = true
    player.image = player.sprites.down

    checkForCharacterCollision({
      characters,
      player,
      characterOffset: { x: 0, y: -frameMovement }
    })

    for (let i = 0; i < boundaries.length; i++) {
      const boundary = boundaries[i]
      if (
        rectangularCollision({
          rectangle1: player,
          rectangle2: {
            ...boundary,
            position: {
              x: boundary.position.x,
              y: boundary.position.y - frameMovement
            }
          }
        })
      ) {
        moving = false
        break
      }
    }

    if (moving) movables.forEach((movable) => (movable.position.y -= frameMovement))
  } else if (keys.d.pressed && lastKey === 'd') {
    player.animate = true
    player.image = player.sprites.right

    checkForCharacterCollision({
      characters,
      player,
      characterOffset: { x: -frameMovement, y: 0 }
    })

    for (let i = 0; i < boundaries.length; i++) {
      const boundary = boundaries[i]
      if (
        rectangularCollision({
          rectangle1: player,
          rectangle2: {
            ...boundary,
            position: {
              x: boundary.position.x - frameMovement,
              y: boundary.position.y
            }
          }
        })
      ) {
        moving = false
        break
      }
    }

    if (moving) movables.forEach((movable) => (movable.position.x -= frameMovement))
  }
}

animate()

window.addEventListener('keydown', (e) => {
  if (player.isInteracting) {
    if (e.key === ' ') {
      player.interactionAsset.dialogueIndex++

      const { dialogueIndex, dialogue } = player.interactionAsset
      if (dialogueIndex <= dialogue.length - 1) {
        document.querySelector('#characterDialogueBox').innerHTML =
          player.interactionAsset.dialogue[dialogueIndex]
        return
      }

      const completedCharacter = player.interactionAsset
      player.isInteracting = false
      player.interactionAsset.dialogueIndex = 0
      document.querySelector('#characterDialogueBox').style.display = 'none'

      if (
        completedCharacter &&
        completedCharacter.role === 'trainer' &&
        completedCharacter.trainerId
      ) {
        const trainerDef =
          typeof window.getTrainerById === 'function'
            ? window.getTrainerById(completedCharacter.trainerId)
            : null

        if (
          trainerDef &&
          trainerDef.postBattleDialogue &&
          trainerDef.postBattleDialogue.length > 0
        ) {
          completedCharacter.dialogue = trainerDef.postBattleDialogue
        }
      }
    }
    return
  }

  switch (e.key) {
    case ' ':
      if (!player.interactionAsset) return
      document.querySelector('#characterDialogueBox').innerHTML =
        player.interactionAsset.dialogue[0]
      document.querySelector('#characterDialogueBox').style.display = 'flex'
      player.isInteracting = true
      break
    case 'w':
      keys.w.pressed = true
      updateMovementKeyOrder('w', true)
      break
    case 'a':
      keys.a.pressed = true
      updateMovementKeyOrder('a', true)
      break
    case 's':
      keys.s.pressed = true
      updateMovementKeyOrder('s', true)
      break
    case 'd':
      keys.d.pressed = true
      updateMovementKeyOrder('d', true)
      break
  }
})

window.addEventListener('keyup', (e) => {
  switch (e.key) {
    case 'w':
      keys.w.pressed = false
      updateMovementKeyOrder('w', false)
      break
    case 'a':
      keys.a.pressed = false
      updateMovementKeyOrder('a', false)
      break
    case 's':
      keys.s.pressed = false
      updateMovementKeyOrder('s', false)
      break
    case 'd':
      keys.d.pressed = false
      updateMovementKeyOrder('d', false)
      break
  }

  if (typeof window.saveGameState === 'function') {
    window.saveGameState()
  }
})

window.addEventListener('beforeunload', () => {
  if (typeof window.saveGameState === 'function') {
    window.saveGameState()
  }
})

const controlButtons = document.querySelectorAll('#mobileControls .controlButton')
controlButtons.forEach((button) => {
  const key = button.dataset.key
  if (!key || !keys[key]) return

  button.addEventListener('pointerdown', (event) => {
    event.preventDefault()
    keys[key].pressed = true
    updateMovementKeyOrder(key, true)
    button.classList.add('active')
  })

  const release = () => {
    keys[key].pressed = false
    updateMovementKeyOrder(key, false)
    button.classList.remove('active')
  }

  button.addEventListener('pointerup', release)
  button.addEventListener('pointercancel', release)
  button.addEventListener('pointerleave', release)
})
