[1mdiff --git a/battlescenes.js b/battlescenes.js[m
[1mindex d0e8f03..8fbf090 100644[m
[1m--- a/battlescenes.js[m
[1m+++ b/battlescenes.js[m
[36m@@ -32,7 +32,7 @@[m [mwindow.isTrainerDefeated=function(trainerId){[m
 }[m
 [m
 let playerParty=[][m
[31m-let currentPlayerIndex=0[m
[32m+[m[32mlet currentPartyIndex=0[m[41m[m
 let enemyParty=[][m
 let currentEnemyIndex=0[m
 const availableEnemies=['Draggle','Draggle2','Draggle3'][m
[36m@@ -100,6 +100,78 @@[m [mfunction exitBattleToMap(){[m
          }[m
     })[m
 }[m
[32m+[m[41m[m
[32m+[m[32mfunction initializePlayerParty(){[m[41m[m
[32m+[m[32m    playerParty=[][m[41m[m
[32m+[m[32m    for(let i=0;i<starterPartyKeys.length;i++){[m[41m[m
[32m+[m[32m        const monsterKey=starterPartyKeys[i][m[41m[m
[32m+[m[32m        const monsterData=monsters[monsterKey] || monsters.Emby[m[41m[m
[32m+[m[32m        const newMonster=new Monster(monsterData)[m[41m[m
[32m+[m[32m        newMonster.monsterKey=monsterKey[m[41m[m
[32m+[m[32m        newMonster.level=1+i[m[41m[m
[32m+[m[32m        newMonster.xp=0[m[41m[m
[32m+[m[32m        newMonster.maxHealth=newMonster.health[m[41m[m
[32m+[m[32m        playerParty.push(newMonster)[m[41m[m
[32m+[m[32m    }[m[41m[m
[32m+[m[32m    currentPartyIndex=0[m[41m[m
[32m+[m[32m}[m[41m[m
[32m+[m[41m[m
[32m+[m[32mfunction getActivePlayerMonster(){[m[41m[m
[32m+[m[32m    return playerParty[currentPartyIndex][m[41m[m
[32m+[m[32m}[m[41m[m
[32m+[m[41m[m
[32m+[m[32mfunction switchToNextMonster(){[m[41m[m
[32m+[m[32m    const currentIndex=currentPartyIndex[m[41m[m
[32m+[m[32m    for(let i=1;i<playerParty.length;i++){[m[41m[m
[32m+[m[32m        const nextIndex=(currentIndex+i)%playerParty.length[m[41m[m
[32m+[m[32m        if(playerParty[nextIndex].health>0){[m[41m[m
[32m+[m[32m            currentPartyIndex=nextIndex[m[41m[m
[32m+[m[32m            return playerParty[nextIndex][m[41m[m
[32m+[m[32m        }[m[41m[m
[32m+[m[32m    }[m[41m[m
[32m+[m[32m    return null[m[41m[m
[32m+[m[32m}[m[41m[m
[32m+[m[41m[m
[32m+[m[32mfunction getAliveMonstersCount(){[m[41m[m
[32m+[m[32m    return playerParty.filter((m)=>m.health>0).length[m[41m[m
[32m+[m[32m}[m[41m[m
[32m+[m[41m[m
[32m+[m[32mfunction ensureValidActiveMonster(){[m[41m[m
[32m+[m[32m    if(!playerParty.length) return[m[41m[m
[32m+[m[32m    if(playerParty[currentPartyIndex] && playerParty[currentPartyIndex].health>0){[m[41m[m
[32m+[m[32m        return[m[41m[m
[32m+[m[32m    }[m[41m[m
[32m+[m[32m    const firstAlive=playerParty.findIndex((m)=>m.health>0)[m[41m[m
[32m+[m[32m    if(firstAlive>0){[m[41m[m
[32m+[m[32m        currentPartyIndex=firstAlive[m[41m[m
[32m+[m[32m    }[m[41m[m
[32m+[m[32m}[m[41m[m
[32m+[m[41m[m
[32m+[m[32mfunction restorePartyIfAllFainted(){[m[41m[m
[32m+[m[32m    if(!playerParty.length) return[m[41m[m
[32m+[m[32m    if(getAliveMonstersCount()>0) return[m[41m[m
[32m+[m[41m[m
[32m+[m[32m    playerParty.forEach((monster)=>{[m[41m[m
[32m+[m[32m        monster.health=monster.maxHealth[m[41m[m
[32m+[m[32m        monster.cooldowns={}[m[41m[m
[32m+[m[32m        monster.statusEffects={burn:0,poison:0,stun:0}[m[41m[m
[32m+[m[32m        monster.defenseStage=0[m[41m[m
[32m+[m[32m        monster.defenseBuffTurns=0[m[41m[m
[32m+[m[32m    })[m[41m[m
[32m+[m[32m    currentPartyIndex=0[m[41m[m
[32m+[m[32m}[m[41m[m
[32m+[m[41m[m
[32m+[m[32mfunction getStatusSummary(monster){[m[41m[m
[32m+[m[32m    const parts=[][m[41m[m
[32m+[m[32m    if(monster.statusEffects.burn>0){[m[41m[m
[32m+[m[32m        parts.push('Burn(' + monster.statusEffects.burn +')')[m[41m[m
[32m+[m[32m    }[m[41m[m
[32m+[m[32m    if(monster.statusEffects.poison>0){[m[41m[m
[32m+[m[32m        parts.push('Poison ('+ monster.statusEffects.stun + ')')[m[41m[m
[32m+[m[32m    }[m[41m[m
[32m+[m[41m    [m
[32m+[m[32m}[m[41m[m
[32m+[m[41m[m
 function initBattle(){[m
     document.querySelector('#userInterface').style.display='block'[m
     document.querySelector('#dialogueBox').style.display='none'[m
