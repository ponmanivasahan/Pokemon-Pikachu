const battleBackgroundImage = new Image()
battleBackgroundImage.src = './images/battleBackground.png'
const battleBackgroundBaseWidth = 1024
const battleBackgroundBaseHeight = 576

let battleBackground = null

function setupBattleBackground() {
  try {
    const battleBackgroundScale = Math.max(
      canvas.width / battleBackgroundBaseWidth,
      canvas.height / battleBackgroundBaseHeight
    )
    
    if (battleBackground) {
      battleBackground.scale = battleBackgroundScale
      battleBackground.position.y = -((battleBackgroundBaseHeight * battleBackgroundScale - canvas.height) / 2)
    } else {
      battleBackground = new Sprite({
        position: {
          x: 0,
          y: -((battleBackgroundBaseHeight * battleBackgroundScale - canvas.height) / 2)
        },
        image: battleBackgroundImage,
        scale: battleBackgroundScale
      })
    }
  } catch (error) {
    console.error('Battle background setup failed:', error)
  }
}

setupBattleBackground()

let draggle
let emby
let renderedSprites
let battleAnimationId
let queue

let isPlayerTurn = true
let canSwitchMonster = false
let attackButtonsLocked = false

let battlesWon = 0

let defeatedTrainers = {}
let currentBattleContext = null
let trainerEnemyParty = []
let trainerEnemyIndex = 0
function getTrainerDefinition(trainerId) {
  if (!trainerId) return null
  if (typeof window.getTrainerById !== 'function') return null
  return window.getTrainerById(trainerId)
}
window.isTrainerDefeated = function (trainerId) {
  return !!defeatedTrainers[trainerId]
}
let playerParty = []
let currentPartyIndex = 0
let enemyParty = []
let currentEnemyIndex = 0

const availableEnemies = ['Draggle', 'Draggle2', 'Draggle3']
const starterPartyKeys = ['Charmander', 'Bulbasaur', 'Squirtle']

const SAVE_KEY = 'pokemonAdventureSaveV1'
let hasLoadedSave = false

function saveGameState() {
  try {
    const saveData = {
      battlesWon
    }
    localStorage.setItem(SAVE_KEY, JSON.stringify(saveData))
  } catch (error) {
    console.warn('Save failed:', error)
  }
}

function loadGameState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return false

    const saveData = JSON.parse(raw)
    if (!saveData) {
      return false
    }
    battlesWon =
      typeof saveData.battlesWon === 'number' ? saveData.battlesWon : 0
    return true
  } catch (error) {
    console.warn('Load failed:', error)
    return false
  }
}

function clearSavedGame() {
  localStorage.removeItem(SAVE_KEY)
}

window.saveGameState = saveGameState
window.loadGameState = loadGameState
window.clearSavedGame = clearSavedGame

function setAttackButtonDisabled(disabled) {
  attackButtonsLocked = disabled
  refreshAttackButtons()
}

function getAttacksContainer() {
  return document.querySelector('#attacksBox') || document.querySelector('#attackBox')
}

function setDisplayIfExists(selector, value) {
  const element = document.querySelector(selector)
  if (element) {
    element.style.display = value
  }
}

function setStyleIfExists(selector, property, value) {
  const element = document.querySelector(selector)
  if (element) {
    element.style[property] = value
  }
}

function setBattleModeActive(active) {
  if (!document.body) return
  document.body.classList.toggle('is-in-battle', active)
}

function getBattleMonsterPositions() {
  const isMobile = window.matchMedia('(max-width: 560px)').matches

  const enemyX = Math.round(canvas.width * (isMobile ? 0.64 : 0.67))
  const enemyY = Math.round(canvas.height * (isMobile ? 0.1 : 0.14))
  const playerX = Math.round(canvas.width * (isMobile ? 0.16 : 0.2))
  const playerY = Math.round(canvas.height * (isMobile ? 0.44 : 0.48))

  return {
    enemy: { x: enemyX, y: enemyY },
    player: { x: playerX, y: playerY }
  }
}

function syncBattleMonsterPositions() {
  const positions = getBattleMonsterPositions()
  if (draggle) {
    draggle.position = { x: positions.enemy.x, y: positions.enemy.y }
  }
  if (emby) {
    emby.position = { x: positions.player.x, y: positions.player.y }
  }
}

function exitBattleToMap() {
  gsap.to('#overlappingDiv', {
    opacity: 1,
    onComplete: () => {
      cancelAnimationFrame(battleAnimationId)
      setBattleModeActive(false)
      animate()
      setDisplayIfExists('#userInterface', 'none')
      setDisplayIfExists('#partyDisplay', 'none')
      setDisplayIfExists('#dialogueBox', 'none')

      gsap.to('#overlappingDiv', {
        opacity: 0
      })

      battle.initiated = false
      audio.Map.play()
    }
  })
}
function initializePlayerParty() {
  playerParty = []
  for (let i = 0; i < starterPartyKeys.length; i++) {
    const monsterKey = starterPartyKeys[i]
    const monsterData = monsters[monsterKey] || monsters.Emby
    const newMonster = new Monster(monsterData)
    newMonster.monsterKey = monsterKey
    newMonster.level = 1 + i
    newMonster.xp = 0
    newMonster.maxHealth = newMonster.health
    playerParty.push(newMonster)
  }
  currentPartyIndex = 0
}
function getActivePlayerMonster() {
  return playerParty[currentPartyIndex]
}
function switchToNextMonster() {
  const currentIndex = currentPartyIndex
  for (let i = 1; i < playerParty.length; i++) {
    const nextIndex = (currentIndex + i) % playerParty.length
    if (playerParty[nextIndex].health > 0) {
      currentPartyIndex = nextIndex
      return playerParty[nextIndex]
    }
  }
  return null
}
function getAliveMonstersCount() {
  return playerParty.filter((m) => m.health > 0).length
}

function ensureValidActiveMonster() {
  if (!playerParty.length) return
  if (
    playerParty[currentPartyIndex] &&
    playerParty[currentPartyIndex].health > 0
  ) {
    return
  }

  const firstAlive = playerParty.findIndex((m) => m.health > 0)
  if (firstAlive >= 0) {
    currentPartyIndex = firstAlive
  }
}

function restorePartyIfAllFainted() {
  if (!playerParty.length) return
  if (getAliveMonstersCount() > 0) return

  playerParty.forEach((monster) => {
    monster.health = monster.maxHealth
    monster.cooldowns = {}
    monster.statusEffects = { burn: 0, poison: 0, stun: 0 }
    monster.defenseStage = 0
    monster.defenseBuffTurns = 0
  })

  currentPartyIndex = 0
}

function getStatusSummary(monster) {
  const parts = []

  if (monster.statusEffects.burn > 0) {
    parts.push('Burn (' + monster.statusEffects.burn + ')')
  }

  if (monster.statusEffects.poison > 0) {
    parts.push('Poison (' + monster.statusEffects.poison + ')')
  }

  if (monster.statusEffects.stun > 0) {
    parts.push('Stun (' + monster.statusEffects.stun + ')')
  }

  if (monster.defenseBuffTurns > 0) {
    parts.push('Def+ (' + monster.defenseBuffTurns + ')')
  }

  return parts.length > 0 ? parts.join(' | ') : 'Normal'
}

function setStatusText(elementId, monster) {
  const element = document.querySelector(elementId)
  if (!element) return
  const text = getStatusSummary(monster)

  element.innerHTML = 'Status: ' + text
  element.className = 'status-text'

  if (
    monster.statusEffects.burn > 0 ||
    monster.statusEffects.poison > 0 ||
    monster.statusEffects.stun > 0
  ) {
    element.classList.add('is-danger')
  } else if (monster.defenseBuffTurns > 0) {
    element.classList.add('is-buff')
  }
}

function updateStatusDisplay() {
  if (!emby || !draggle) return

  setStatusText('#playerStatusText', emby)
  setStatusText('#enemyStatusText', draggle)
}

function refreshAttackButtons() {
  const attacksContainer = getAttacksContainer()
  if (!attacksContainer) return

  attacksContainer.querySelectorAll('button').forEach((button) => {
    const attackName = button.dataset.attackName || button.innerText
    if (attackName === 'Run') {
      button.innerHTML = 'Run'
      button.disabled = attackButtonsLocked
      return
    }

    const selectedAttack = attacks[attackName]
    if (!selectedAttack) return
    const cooldown =
      emby && emby.cooldowns ? emby.cooldowns[attackName] || 0 : 0

    button.innerHTML =
      cooldown > 0
        ? selectedAttack.name + ' (CD ' + cooldown + ')'
        : selectedAttack.name
    button.disabled = attackButtonsLocked || cooldown > 0
  })
}

function handleAttackButtonClick(selectedAction) {
  if (!isPlayerTurn) return

  if (selectedAction === 'Run') {
    isPlayerTurn = false
    setAttackButtonDisabled(true)
    document.querySelector('#dialogueBox').innerHTML =
      emby.name + ' ran away safely!'
    document.querySelector('#dialogueBox').style.display = 'block'
    queue = [() => exitBattleToMap()]
    return
  }

  isPlayerTurn = false
  setAttackButtonDisabled(true)

  const selectedAttack = attacks[selectedAction]
  const playerAction = emby.attack({
    attack: selectedAttack,
    recipient: draggle,
    renderedSprites
  })

  updateHealthDisplay()

  if (playerAction && playerAction.cooldownBlocked) {
    isPlayerTurn = true
    setAttackButtonDisabled(false)
    return
  }

  if (emby.health <= 0) {
    queue.push(() => {
      emby.faint()
    })

    queue.push(() => {
      if (getAliveMonstersCount() > 0) {
        canSwitchMonster = true
        document.querySelector('#dialogueBox').innerHTML =
          emby.name + ' fainted! Click here or press 1-3 to switch Pokemon.'
        document.querySelector('#dialogueBox').style.display = 'block'
      } else {
        gsap.to('#overlappingDiv', {
          opacity: 1,
          onComplete: () => {
            cancelAnimationFrame(battleAnimationId)
            animate()
            setDisplayIfExists('#userInterface', 'none')
            setDisplayIfExists('#partyDisplay', 'none')
            gsap.to('#overlappingDiv', { opacity: 0 })
            battle.initiated = false
            setBattleModeActive(false)
            audio.Map.play()
          }
        })
      }
    })
    return
  }

  if (draggle.health <= 0) {
    queue.push(() => {
      draggle.faint()
    })

    queue.push(() => {
      const isTrainerBattle =
        currentBattleContext && currentBattleContext.type === 'trainer'

      if (isTrainerBattle && trainerEnemyIndex < trainerEnemyParty.length - 1) {
        trainerEnemyIndex++
        draggle = trainerEnemyParty[trainerEnemyIndex]
        draggle.opacity = 1
        syncBattleMonsterPositions()
        renderedSprites[0] = draggle

        document.querySelector('#userInterface').querySelector('h1').innerHTML =
          draggle.name
        document.querySelector('#dialogueBox').innerHTML =
          'Trainer sent out ' + draggle.name + '!'
        document.querySelector('#dialogueBox').style.display = 'block'
        updateHealthDisplay()
        return
      }

      battlesWon++

      let xpReward = 30
      if (isTrainerBattle) {
        const trainerDef = getTrainerDefinition(currentBattleContext.trainerId)
        if (
          trainerDef &&
          trainerDef.rewards &&
          typeof trainerDef.rewards.xp === 'number'
        ) {
          xpReward = trainerDef.rewards.xp
        }
        if (currentBattleContext.trainerId) {
          defeatedTrainers[currentBattleContext.trainerId] = true
        }
      }

      emby.xp += xpReward
      saveGameState()

      if (emby.xp >= 100) {
        emby.xp = emby.xp - 100
        emby.level++
        document.querySelector('#dialogueBox').innerHTML =
          'Level Up! ' + emby.name + ' is now level ' + emby.level + '!'
        document.querySelector('#dialogueBox').style.display = 'block'
      } else {
        document.querySelector('#dialogueBox').innerHTML =
          'Victory! Battles won: ' + battlesWon
        document.querySelector('#dialogueBox').style.display = 'block'
      }
    })

    queue.push(() => {
      gsap.to('#overlappingDiv', {
        opacity: 1,
        onComplete: () => {
          cancelAnimationFrame(battleAnimationId)
          animate()
          setDisplayIfExists('#userInterface', 'none')
          setDisplayIfExists('#partyDisplay', 'none')

          gsap.to('#overlappingDiv', {
            opacity: 0
          })

          battle.initiated = false
          setBattleModeActive(false)
          audio.Map.play()
        }
      })
    })
    return
  }

  queueEnemyAttackTurn()
}

function bindAttackButtonHandlers() {
  const attacksContainer = getAttacksContainer()
  if (!attacksContainer) return

  attacksContainer.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', (e) => {
      const selectedAction = e.currentTarget.dataset.attackName
      handleAttackButtonClick(selectedAction)
    })

    button.addEventListener('mouseenter', (e) => {
      const selectedAttack = attacks[e.currentTarget.dataset.attackName]
      if (!selectedAttack) {
        if (e.currentTarget.dataset.attackName === 'Run') {
          document.querySelector('#attackType').innerHTML = 'Escape'
          document.querySelector('#attackType').style.color = '#666'
        }
        return
      }

      document.querySelector('#attackType').innerHTML =
        selectedAttack.type +
        (emby.cooldowns[selectedAttack.name]
          ? ' (CD: ' + emby.cooldowns[selectedAttack.name] + ')'
          : '')
      document.querySelector('#attackType').style.color = selectedAttack.color
    })
  })
}

function rebuildAttackButtonsForActiveMonster() {
  const attacksBox = getAttacksContainer()
  if (!attacksBox) return
  attacksBox.replaceChildren()

  emby.attacks.forEach((attack) => {
    const button = document.createElement('button')
    button.innerHTML = attack.name
    button.dataset.attackName = attack.name
    attacksBox.append(button)
  })

  const runButton = document.createElement('button')
  runButton.innerHTML = 'Run'
  runButton.dataset.attackName = 'Run'
  attacksBox.append(runButton)

  bindAttackButtonHandlers()
  refreshAttackButtons()
}

function bindAttackButtonHandlers() {
  const attacksContainer = getAttacksContainer()
  if (!attacksContainer) return

  attacksContainer.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', (e) => {
      if (!isPlayerTurn) return

      const selectedAction = e.currentTarget.dataset.attackName
      if (selectedAction === 'Run') {
        isPlayerTurn = false
        setAttackButtonDisabled(true)
        document.querySelector('#dialogueBox').innerHTML =
          emby.name + ' ran away safely!'
        document.querySelector('#dialogueBox').style.display = 'block'
        queue = [() => exitBattleToMap()]
        return
      }

      isPlayerTurn = false
      setAttackButtonDisabled(true)

      const selectedAttack = attacks[selectedAction]
      const playerAction = emby.attack({
        attack: selectedAttack,
        recipient: draggle,
        renderedSprites
      })

      updateHealthDisplay()

      if (playerAction && playerAction.cooldownBlocked) {
        isPlayerTurn = true
        setAttackButtonDisabled(false)
        return
      }

      if (emby.health <= 0) {
        queue.push(() => {
          emby.faint()
        })

        queue.push(() => {
          if (getAliveMonstersCount() > 0) {
            canSwitchMonster = true
            document.querySelector('#dialogueBox').innerHTML =
              emby.name + ' fainted! Click here or press 1-3 to switch Pokemon.'
            document.querySelector('#dialogueBox').style.display = 'block'
          } else {
            gsap.to('#overlappingDiv', {
              opacity: 1,
              onComplete: () => {
                cancelAnimationFrame(battleAnimationId)
                animate()
                setDisplayIfExists('#userInterface', 'none')
                setDisplayIfExists('#partyDisplay', 'none')
                gsap.to('#overlappingDiv', { opacity: 0 })
                battle.initiated = false
                setBattleModeActive(false)
                audio.Map.play()
              }
            })
          }
        })
        return
      }

      if (draggle.health <= 0) {
        queue.push(() => {
          draggle.faint()
        })

        queue.push(() => {
          const isTrainerBattle =
            currentBattleContext && currentBattleContext.type === 'trainer'

          if (
            isTrainerBattle &&
            trainerEnemyIndex < trainerEnemyParty.length - 1
          ) {
            trainerEnemyIndex++
            draggle = trainerEnemyParty[trainerEnemyIndex]
            draggle.opacity = 1
            syncBattleMonsterPositions()
            renderedSprites[0] = draggle

            document
              .querySelector('#userInterface')
              .querySelector('h1').innerHTML = draggle.name
            document.querySelector('#dialogueBox').innerHTML =
              'Trainer sent out ' + draggle.name + '!'
            document.querySelector('#dialogueBox').style.display = 'block'
            updateHealthDisplay()
            return
          }

          battlesWon++

          let xpReward = 30
          if (isTrainerBattle) {
            const trainerDef = getTrainerDefinition(
              currentBattleContext.trainerId
            )
            if (
              trainerDef &&
              trainerDef.rewards &&
              typeof trainerDef.rewards.xp === 'number'
            ) {
              xpReward = trainerDef.rewards.xp
            }
            if (currentBattleContext.trainerId) {
              defeatedTrainers[currentBattleContext.trainerId]
            }
          }
          emby.xp += xpReward
          saveGameState()

          if (emby.xp >= 100) {
            emby.xp = emby.xp - 100
            emby.level++
            document.querySelector('#dialogueBox').innerHTML =
              'Level Up! ' + emby.name + ' is now level ' + emby.level + '!'
            document.querySelector('#dialogueBox').style.display = 'block'
          } else {
            document.querySelector('#dialogueBox').innerHTML =
              'Victory! Battles won: ' + battlesWon
            document.querySelector('#dialogueBox').style.display = 'block'
          }
        })

        queue.push(() => {
          gsap.to('#overlappingDiv', {
            opacity: 1,
            onComplete: () => {
              cancelAnimationFrame(battleAnimationId)
              animate()
              setDisplayIfExists('#userInterface', 'none')
              setDisplayIfExists('#partyDisplay', 'none')

              gsap.to('#overlappingDiv', {
                opacity: 0
              })

              battle.initiated = false
              setBattleModeActive(false)
              audio.Map.play()
            }
          })
        })
        return
      }
      queueEnemyAttackTurn()
    })

    button.addEventListener('mouseenter', (e) => {
      const selectedAttack = attacks[e.currentTarget.dataset.attackName]
      if (!selectedAttack) {
        if (e.currentTarget.dataset.attackName === 'Run') {
          document.querySelector('#attackType').innerHTML = 'Escape'
          document.querySelector('#attackType').style.color = '#666'
        }
        return
      }

      document.querySelector('#attackType').innerHTML =
        selectedAttack.type +
        (emby.cooldowns[selectedAttack.name]
          ? ' (CD: ' + emby.cooldowns[selectedAttack.name] + ')'
          : '')
      document.querySelector('#attackType').style.color = selectedAttack.color
    })
  })
}
function rebuildAttackButtonsForActiveMonster() {
  const attacksBox = getAttacksContainer()
  if (!attacksBox) return
  attacksBox.replaceChildren()

  emby.attacks.forEach((attack) => {
    const button = document.createElement('button')
    button.innerHTML = attack.name
    button.dataset.attackName = attack.name
    attacksBox.append(button)
  })

  const runButton = document.createElement('button')
  runButton.innerHTML = 'Run'
  runButton.dataset.attackName = 'Run'
  attacksBox.append(runButton)

  bindAttackButtonHandlers()
  refreshAttackButtons()
}

function getClampedHealthPercent(monster) {
  if (!monster) return 0
  const max = monster.maxHealth > 0 ? monster.maxHealth : 100
  const percent = (monster.health / max) * 100
  return Math.max(0, Math.min(100, percent))
}

function getHealthBarColor(percent) {
  if (percent <= 30) return '#e74c3c'
  if (percent <= 60) return '#f1c40f'
  return '#4efb38'
}
function updateHealthDisplay() {
  const playerMon = getActivePlayerMonster()
  const enemyMon = draggle

  const playerPercent = getClampedHealthPercent(playerMon)
  const enemyPercent = getClampedHealthPercent(enemyMon)

  const playerHealthBar = document.querySelector('#playerHealthBar')
  const enemyHealthBar = document.querySelector('#enemyHealthBar')

  if (!playerHealthBar || !enemyHealthBar) return

  playerHealthBar.style.width = playerPercent + '%'
  enemyHealthBar.style.width = enemyPercent + '%'

  playerHealthBar.style.backgroundColor = getHealthBarColor(playerPercent)
  enemyHealthBar.style.backgroundColor = getHealthBarColor(enemyPercent)

  const playerHPText = document.querySelector('#playerHPText')
  const enemyHPText = document.querySelector('#enemyHPText')
  if (playerHPText) {
    playerHPText.innerHTML = playerMon.health + '/' + playerMon.maxHealth + ' HP'
  }
  if (enemyHPText) {
    enemyHPText.innerHTML = enemyMon.health + '/' + enemyMon.maxHealth + ' HP'
  }
  updatePartyDisplay()
  updateStatusDisplay()
  refreshAttackButtons()
}
function updatePartyDisplay() {
  const partyList = document.querySelector('#partyList')
  if (!partyList) return
  partyList.innerHTML = ''

  playerParty.forEach((mon, index) => {
    const status = mon.health <= 0 ? 'FNT' : mon.health + '/' + mon.maxHealth
    const color =
      mon.health <= 0
        ? '#999'
        : mon.health < mon.maxHealth * 0.3
          ? '#ff0000'
          : '#000'
    const bold = currentPartyIndex === index ? 'bold' : 'normal'

    const html = `
      <div style="
        margin: 3px 0;
        font-weight: ${bold};
        color: ${color};
        padding: 3px 4px;
        border: ${currentPartyIndex === index ? '1px solid black' : '1px solid transparent'};
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 4px;
        white-space: nowrap;
      ">
        <span style="overflow: hidden; text-overflow: ellipsis;">${index + 1}. ${mon.name}</span>
        <span style="font-size: 7px;">${status}</span>
      </div>
    `
    partyList.innerHTML += html
  })
}

function queueEnemyAttackTurn() {
  const availableAttacks = draggle.attacks.filter((atk) => {
    return !draggle.cooldowns[atk.name]
  })

  const enemyAttackPool =
    availableAttacks.length > 0 ? availableAttacks : draggle.attacks
  const randomAttack =
    enemyAttackPool[Math.floor(Math.random() * enemyAttackPool.length)]

  queue.push(() => {
    draggle.attack({
      attack: randomAttack,
      recipient: emby,
      renderedSprites
    })

    updateHealthDisplay()

    if (emby.health <= 0) {
      queue.push(() => {
        emby.faint()
      })

      queue.push(() => {
        if (getAliveMonstersCount() > 0) {
          canSwitchMonster = true
          document.querySelector('#dialogueBox').innerHTML =
            emby.name + ' fainted! Click here or press 1-3 to switch Pokemon.'
          document.querySelector('#dialogueBox').style.display = 'block'
        } else {
          gsap.to('#overlappingDiv', {
            opacity: 1,
            onComplete: () => {
              cancelAnimationFrame(battleAnimationId)
              animate()
              setDisplayIfExists('#userInterface', 'none')
              setDisplayIfExists('#partyDisplay', 'none')

              gsap.to('#overlappingDiv', {
                opacity: 0
              })

              battle.initiated = false
              setBattleModeActive(false)
              audio.Map.play()
            }
          })
        }
      })
    }
  })
}

function initBattle(options) {
  const battleOptions = options || { type: 'wild' }
  currentBattleContext = {
    type: battleOptions.type || 'wild',
    trainerId: battleOptions.trainerId || null
  }
  trainerEnemyParty = []
  trainerEnemyIndex = 0
  setBattleModeActive(true)
  
  setupBattleBackground()

  setDisplayIfExists('#userInterface', 'block')
  setDisplayIfExists('#partyDisplay', 'block')
  setDisplayIfExists('#dialogueBox', 'none')
  setStyleIfExists('#enemyHealthBar', 'width', '100%')
  setStyleIfExists('#playerHealthBar', 'width', '100%')
  setStyleIfExists('#enemyHealthBar', 'backgroundColor', '#4efb38')
  setStyleIfExists('#playerHealthBar', 'backgroundColor', '#4efb38')
  const attacksContainer = getAttacksContainer()
  if (attacksContainer) {
    attacksContainer.replaceChildren()
  }
  if (playerParty.length === 0) {
    if (!hasLoadedSave) {
      hasLoadedSave = loadGameState()
    }
    initializePlayerParty()
  }

  restorePartyIfAllFainted()
  ensureValidActiveMonster()

  if (currentBattleContext.type === 'trainer') {
    const trainerDef = getTrainerDefinition(currentBattleContext.trainerId)

    if (
      trainerDef &&
      Array.isArray(trainerDef.party) &&
      trainerDef.party.length > 0
    ) {
      trainerEnemyParty = trainerDef.party.map((monsterkey) => {
        const enemy = new Monster(monsters[monsterkey])
        enemy.maxHealth = enemy.health
        return enemy
      })
      trainerEnemyIndex = 0
      draggle = trainerEnemyParty[trainerEnemyIndex]
    } else {
      const randomEnemyName =
        availableEnemies[Math.floor(Math.random() * availableEnemies.length)]
      draggle = new Monster(monsters[randomEnemyName])
      draggle.maxHealth = draggle.health
      currentBattleContext.type = 'wild'
    }
  } else {
    const randomEnemyName =
      availableEnemies[Math.floor(Math.random() * availableEnemies.length)]
    draggle = new Monster(monsters[randomEnemyName])
    draggle.maxHealth = draggle.health
  }
  emby = getActivePlayerMonster()
  syncBattleMonsterPositions()
  const userInterface = document.querySelector('#userInterface')
  if (userInterface) {
    const headers = userInterface.querySelectorAll('h1')
    if (headers[0]) {
      headers[0].innerHTML = draggle.name
    }
    if (headers[1]) {
      headers[1].innerHTML = emby.name + ' (Lv. ' + emby.level + ')'
    }
  }

  renderedSprites = [draggle, emby]
  queue = []
  isPlayerTurn = true
  canSwitchMonster = false

  updateHealthDisplay()
  updatePartyDisplay()

  rebuildAttackButtonsForActiveMonster()
  setAttackButtonDisabled(false)
  updateStatusDisplay()
  refreshAttackButtons()
}

function animateBattle() {
  battleAnimationId = window.requestAnimationFrame(animateBattle)
  
  c.fillStyle = '#000'
  c.fillRect(0, 0, canvas.width, canvas.height)
  
  if (battleBackground && battleBackground.image && battleBackground.image.complete) {
    battleBackground.draw()
  }

  renderedSprites.forEach((sprite) => {
    if (sprite && sprite.image && sprite.image.complete) {
      sprite.draw()
    }
  })
}
if (!hasLoadedSave) {
  hasLoadedSave = loadGameState()
}
if (playerParty.length === 0) {
  initializePlayerParty()
}
animate()

window.addEventListener('resize', () => {
  if (!battle.initiated) return
  setupBattleBackground()
  syncBattleMonsterPositions()
  updateHealthDisplay()
})

function activatePartyMonster(targetIndex) {
  const targetMonster = playerParty[targetIndex]
  if (!targetMonster || targetMonster.health <= 0) return false

  currentPartyIndex = targetIndex
  emby = targetMonster
  emby.opacity = 1
  syncBattleMonsterPositions()
  renderedSprites[1] = emby

  const userInterface = document.querySelector('#userInterface')
  if (userInterface) {
    const headers = userInterface.querySelectorAll('h1')
    if (headers[1]) {
      headers[1].innerHTML = emby.name + ' (Lv. ' + emby.level + ')'
    }
  }

  updateHealthDisplay()
  updatePartyDisplay()
  rebuildAttackButtonsForActiveMonster()
  document.querySelector('#dialogueBox').style.display = 'none'
  isPlayerTurn = true
  canSwitchMonster = false
  setAttackButtonDisabled(false)
  refreshAttackButtons()
  saveGameState()
  return true
}
document.addEventListener('keydown', (e) => {
  if (!battle.initiated) return

  const key = parseInt(e.key)
  if (Number.isNaN(key) || key < 1 || key > playerParty.length) return

  if (!canSwitchMonster && !isPlayerTurn) return

  const targetIndex = key - 1
  if (targetIndex === currentPartyIndex) return

  const wasForcedSwitch = canSwitchMonster
  const switched = activatePartyMonster(targetIndex)
  if (!switched) return
  if (!wasForcedSwitch) {
    isPlayerTurn = false
    setAttackButtonDisabled(true)
    queueEnemyAttackTurn()
    queue[0]()
    queue.shift()
  }
})

document.querySelector('#dialogueBox').addEventListener('click', (e) => {
  if (canSwitchMonster) {
    const nextMonster = switchToNextMonster()
    if (nextMonster) {
      activatePartyMonster(currentPartyIndex)
      e.currentTarget.style.display = 'none'
    }
  } else if (queue.length > 0) {
    queue[0]()
    queue.shift()
  } else {
    e.currentTarget.style.display = 'none'
    isPlayerTurn = true
    setAttackButtonDisabled(false)
  }
})