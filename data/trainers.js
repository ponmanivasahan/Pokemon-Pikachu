const trainers={
    oldManTrainer:{
        trainerId:'oldManTrainer',
        displayName:'Veteran Old Man',
        preBattleDialogue:[
            'My bones hurt... but my monsters are still strong.',
            'Let us battle!'
        ],
        postBattleDialogue:[
            'You already proved your strength.',
            'Train hard and come back later.'
        ],
        party:['Draggle','Draggle2'],
        rewards:{
            xp:60
        },
        canRematch:false
    }
}

function getTrainerById(trainerId){
    if(!trainerId) return null
    if(typeof trainers==='undefined') return null
    return trainers[trainerId] || null
}
window.getTrainerbyId=getTrainerById