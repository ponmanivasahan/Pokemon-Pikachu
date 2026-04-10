const battleBackgroundImage=new Image()
battleBackgroundImage.src='./images/battleBackground.png'
const battleBackground=new Sprite({position:{
    x:0,
    y:0
  },
  image:battleBackgroundImage
})
let draggle
let emby
let renderSprites
let battleAnimationId
let queue

let isPlayerTurn=true
let canSwitchMonster=false
let attackButtonsLocked=false

let battlesWon=0
let defeatedTrainers={}
let currentBattleContext=null
let trainerEnemyParty=[]
let trainerEnemyIndex=0

function getTrainerDefinition(trainerId){
if(!trainerId) return null
if(typeof window.getTrainerById!=='function') return null
return window.getTrainerById(trainerId)
}
window.isTrainerDefeated=function(trainerId){
    return !!defeatedTrainers[trainerId]
}

let playerParty=[]
let currentPlayerIndex=0
let enemyParty=[]
let currentEnemyIndex=0
const availableEnemies=['Draggle','Draggle2','Draggle3']
const starterPartyKeys=['Charmander','Bulbasur','Squirtle']

const SAVE_KEY='pokemonAdventureSaveV1'
let hasLoadSave=false

function saveGameState(){
    try{
        const saveData={
            battlesWon
        }
        localStorage.setItem(SAVE_KEY,JSON.stringify(saveData))
    }
    catch(error){
        console.warn('Save failed:',error)
    }
}

function loadGameState(){
    try{
        const raw=localStorage.getItem(SAVE_KEY)
        if(!raw) return false

        const saveData=JSON.parse(raw)
        if(!saveData){
            return false
        }
        battlesWon=typeof saveData.battlesWon==='number' ? saveData.battlesWon:0
        return true
    }
    catch(error){
        console.warn('Load failed:',error)
        return false
    }
}

function clearSavedGame(){
    localStorage.removeItem(SAVE_KEY)
}
window.saveGameState=saveGameState
window.loadGameState=loadGameState
window.clearSavedGame=clearSavedGame

function setAttackButtonDisabled(disabled){
    attackButtonsLocked=disabled
    refreshAttackButtons()
}

function exitBattleToMap(){
    gsap.to('#overlappingDiv',{
        opacity:1,
         onComplete:()=>{
            cancelAnimationFrame(battleAnimationId)
            animate()
            document.querySelector('#userInterface').style.display='none'
            document.querySelector('#partyDisplay').style.display='none'
            document.querySelector('#dialogueBox').style.display='none'

            gsap.to('#overlappingDiv',{opacity:0})

            battle.initiated=false
            
         }
    })
}
function initBattle(){
    document.querySelector('#userInterface').style.display='block'
    document.querySelector('#dialogueBox').style.display='none'
    document.querySelector('#enemyHealthBar').style.width='100%'
    document.querySelector('#playerHealthBar').style.width='100%'
     document.querySelector('#attackBox').replaceChildren()
     draggle=new Monster(monsters.Draggle)
     emby=new Monster(monsters.Emby)
     renderSprites=[draggle,emby]
     queue=[]

     emby.attacks.forEach((attack)=>{
        const button=document.createElement('button')
        button.innerHTML=attack.name
        document.querySelector('#attackBox').append(button)
     })

     document.querySelectorAll('#attackBox button').forEach((button)=>{
        button.addEventListener('click',(e)=>{
            const selectedAttack=attacks[e.currentTarget.innerHTML]
            emby.attack({
                attack:selectedAttack,
                recipient:draggle,
                renderedSprites:renderSprites
            })
          
              if(draggle.health<=0){
                queue.push(()=>{
                    draggle.faint()
                })
                queue.push(()=>{
                    gsap.to('#overlappingDiv',{
                        opacity:1,
                        onComplete:()=>{
                            cancelAnimationFrame(battleAnimationId)
                            animate()
                            document.querySelector('#userInterface').style.display='none'

                            gsap.to('#overlappingDiv',{
                                opacity:0
                            })
                            battle.initiated=false
                    //feature to come
                           if (typeof audio !== 'undefined') audio.Map?.play?.()
                        }
                    })
                })
              }
    
            const randomAttack=draggle.attacks[Math.floor(Math.random()*draggle.attacks.length)]

            queue.push(()=>{
                draggle.attack({
                    attack:randomAttack,
                    recipient:emby,
                    renderedSprites:renderSprites
                })
                if(emby.health<=0){
                    queue.push(()=>{
                        emby.faint()
                    })
                    queue.push(()=>{
                        gsap.to('#overlappingDiv',{
                            opacity:1,
                            onComplete:()=>{
                                cancelAnimationFrame(battleAnimationId)
                                animate()
                                document.querySelector('#userInterface').style.display='none'

                                gsap.to('#overlappingDiv',{
                                    opacity:0
                                })
                                battle.initiated=false
                               if (typeof audio !== 'undefined') audio.Map?.play?.()
                            }
                        })
                    })
                }
            })
        })

        button.addEventListener('mouseenter',(e)=>{
                    const selectedAttack=attacks[e.currentTarget.innerHTML]
                    document.querySelector('#attackType').innerHTML=selectedAttack.type
                    document.querySelector('#attackType').style.color=selectedAttack.color
                })
     })

}

function animateBattle(){
    battleAnimationId=window.requestAnimationFrame(animateBattle)
    battleBackground.draw()
    console.log(battleAnimationId)
    renderSprites.forEach((sprite)=>{
        sprite.draw()
    })
}

document.querySelector('#dialogueBox').addEventListener('click',(e)=>{
    if(queue.length>0){
        queue[0]()
        queue.shift()
    }
    else{
        e.currentTarget.style.display='none'
    }
})