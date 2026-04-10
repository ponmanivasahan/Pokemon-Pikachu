const canvas=document.querySelector('canvas')
const c=canvas.getContext('2d')
c.imageSmoothingEnabled=false
c.webkitImageSmoothingEnabled=false
c.mozImageSmoothingEnabled=false
c.msImageSmoothingEnabled=false

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

const collisionsMap=[];
for(let i=0;i<collisions.length;i+=70){
    collisionsMap.push(collisions.slice(i,70+i));
}
const charactersMap=[]

for(let i=0;i<charactersMapData.length;i+=70){
    charactersMap.push(charactersMapData.slice(i,70+i))
}

const boundaries=[];
c.fillStyle='white';
const offset={x:-735,y:-650};

collisionsMap.forEach((row,i)=>{
    row.forEach((symbol,j)=>{
        if(symbol===1025)
            boundaries.push(
        new Boundary({
            position:{
                x:j*Boundary.width+worldOffset.x,
                y:i*Boundary.height+worldOffset.y,
            },
        }))
    })
});

const characters=[]
const villagerImg=new Image()
villagerImg.src='./images/villager/Idle.png'

const oldManImg=new Image()
villagerImg.src='./images/oldMan/Idle.png'
charactersMap.forEach((row,i)=>{
    row.forEach((symbol,j)=>{
        if(symbol===1026){
           characters.push(
            new Character({
                position:{
                    x:j*Boundary.width+offset.x,
                    y:i*Boundary.height+offset.y
                },
                 image:villagerImg,
                 frames:{
                    max:4,
                    hold:60
                 },
                 scale:3,
                 animate:true,
                 dialogue:['...','Hey mister, have you seen  my Doggochu?']
            })
           )
        }
        else if(symbol===1031){
            const trainerData=typeof getTrainerById==='function' ? getTrainerById('oldManTrainer') : null

            characters.push(
                new Character({
                    position:{
                        x:j*Boundary.width+offset.x,
                        y:i*Boundary.height+offset.y
                    },
                    image:oldManImg,
                    frames:{
                        max:4,
                        hold:60
                    },
                    scale:3,
                    dialogue:trainerData && trainerData.preBattleDialogue ? trainerData.preBattleDialogue : ['My bones hurt'],
                    role:'trainer',
                    trainerId:'oldManTrainer'
                })
            )
        }
        if(symbol !==0){
            boundaries.push(
                new Boundary({
                    position:{
                        x:j*Boundary.width+offset.x,
                        y:i*Boundary.height+offset.y
                    }
                })
            )
        }

    })
})


// const battleZonesMap = [];
// for (let i = 0; i < battleZones.length; i += 70) {
//     battleZonesMap.push(battleZones.slice(i, 70 + i));
// }


// c.fillRect(0,0,canvas.width,canvas.height)

// const battleZoneAreas = [];
// battleZonesMap.forEach((row, i) => {
//     row.forEach((symbol, j) => {
//         if (symbol === 1025) {
//             battleZoneAreas.push(
//                 new Boundary({
//                     position: {
//                         x: j * Boundary.width + worldOffset.x,
//                         y: i * Boundary.height + worldOffset.y
//                     }
//                 })
//             );
//         }
//     });
// });

const image=new Image()
const MAP_ASSET_VERSION=Date.now()
image.src='./images/town.png?v='+MAP_ASSET_VERSION

const foregroundImage=new Image();
foregroundImage.src='./images/foregroundObjects.png';

const playerDownImage=new Image();
playerDownImage.src='./images/playerDown.png';
const playerUpImage=new Image()
playerUpImage.src='./images/playerUp.png'
const playerLeftImage=new Image()
playerLeftImage.src='./images/playerLeft.png'
const playerRightImage=new Image()
playerRightImage.src='./images/playerRight.png'


const player=new Sprite({
    position:{
        x:canvas.width/2-192/4/2,
        y:canvas.height/2-68/2,
    },
    image:playerDownImage,
    frames:{
        max:4,
        hold:10
    },
    sprites:{
        up:playerUpImage,
        left:playerLeftImage,
        right:playerRightImage,
        down:playerDownImage
    }
});

const background=new Sprite({
    position:{
        x:offset.x,
        y:offset.y,
    },
    image:image,
});

const foreground=new Sprite({
    position:{
        x:offset.x,
        y:offset.y,
    },
    image:foregroundImage,
})
const keys={
    w:{pressed:false},
    a:{pressed:false},
    s:{pressed:false},
    d:{pressed:false},
};

const movementKeyOrder=[]

function updateMovementKeyOrder(key,isPressed){
    const index=movementKeyOrder.indexOf(key);
     if(isPressed){
        if(index!==-1) movementKeyOrder.splice(index,1)
            movementKeyOrder.push(key);
     }
     else if(index!==-1){
        movementKeyOrder.splice(index,1);
     }
     lastKey =movementKeyOrder.length>0?movementKeyOrder.at(-1):''
}


const movables=[background,foreground,...boundaries, ...battleZoneAreas];
const battle={
    initiated:false,
};

const PLAYER_SPEED=180;
let lastFrameTime=null 
let worldAnimationId=null


function rectangularCollision({ rectangle1, rectangle2 }) {
    return (
        rectangle1.position.x + rectangle1.width >= rectangle2.position.x &&
        rectangle1.position.x <= rectangle2.position.x + rectangle2.width &&
        rectangle1.position.y <= rectangle2.position.y + rectangle2.height &&
        rectangle1.position.y + rectangle1.height >= rectangle2.position.y
    );
}
function animate() {
    if(lastFrameTime===null){
        lastFrameTime=timestamp
    }

    const deltaSeconds=Math.min((timestamp-lastFrameTime)/1000,0.05)
    lastFrameTime=timestamp;
    const frameMovement=PLAYER_SPEED*deltaSeconds

    worldAnimationId=window.requestAnimationFrame(animate)
    renderables.forEach((renderable)=>{
        renderable.draw()
    })

    let moving=true;
    player.animate=false;
    
    const animationId = window.requestAnimationFrame(animate);
    background.draw();
    boundaries.forEach((boundary) => {
        boundary.draw();
    });

    player.draw();
    foreground.draw();

    if (battle.initiated) return;

    if(keys.w.pressed && lastKey==='w'){
        player.animate=true
        player.image=player.sprites.up

        checkForCharacterCollision({
            characters,
            player,
            characterOffset:{x:0,y:frameMovement}
        })

        for(let i=0;i<boundaries.length;i++){
            const boundary=boundaries[i]

            if(rectangularCollision({
                rectangle1:player,
                rectangle2:{
                    ...boundary,
                    position:{
                        x:boundary.position.x,
                        y:boundary.position.y+frameMovement
                    }
                }
            })
        ){
            moving=false
            break
        }
        }
        if(moving){
            movables.forEach((movable)=>{
                movable.position.y+=frameMovement
            })
        }
    }else if(keys.a.pressed && lastKey==='a'){
        player.animate=true
        player.image=player.sprites.left

        checkForCharacterCollision({
            characters,
            player,
            characterOffset:{x:frameMovement,y:0}
        })

        for(let i=0;i<boundaries.length;i++){
            const boundary=boundaries[i]
            if(
               rectangularCollision({
                rectangle1:player,
                rectangle2:{
                    ...boundary,
                    position:{
                        x:boundary.position.x+frameMovement,
                        y:boundary.position,y
                    }
                }
               }) 
            ){
                moving=false
                break
            }
        }
        if(moving){
            movables.forEach((movable)=>{
                movable.position.position.x+=frameMovement
            })
        }
    }
    else if(keys.s,pressed && lastKey==='s'){
        player.animate=true
        player.image=player.sprites.down
        checkForCharacterCollision({
            characters,
            player,
            characterOffset:{x:0,y:-frameMovement}
        })

        for(let i=0;i<boundaries.length;i++){
            const boundary=boundaries[i]
            if(
                rectangularCollision({
                    rectangle1:player,
                    rectangle2:{
                        ...boundary,
                        position:{
                            x:boundary.position.x,
                            y:boundary.position.y-frameMovement
                        }
                    }
                })
            ){
                moving=false
                break
            }
        }
        if(moving){
            movables.forEach((movable)=>{
                movable.position.y-=frameMovement
            })
        }
    }
    else if(keys.d.pressed && lastKey==='d'){
        player.animate=true
        player.image=player.sprites.right
        checkForCharacterCollision({
            characters,player,characterOffset:{x:-frameMovement,y:0}
        })

        for(let i=0;i<boundaries.length;i++){
            const boundary=boundaries[i]
            if(rectangularCollision({rectangle1:player,
                rectangle2:{...boundary,
                    position:{
                        x:boundary.position.x-frameMovement,
                        y:boundary.position.y
                    }
                }
            })){
                moving=false
                break
            }
        }
        if(moving){
            movables.forEach((movable)=>{
                movable.position.x-=frameMovement
            })
        }
    } 
}
animate();

let lastKey = '';

// function setMovementKey(key) {
//     if (!keys[key]) return;
//     keys[key].pressed = true;
//     lastKey = key;
// }

// function clearMovementKey(key) {
//     if (!keys[key]) return;
//     keys[key].pressed = false;
// }

window.addEventListener('keydown', (e) => {
    if(player.isinteracting){
    
    switch (e.key) {
        case 'w':
            setMovementKey('w');
            break;
        case 'a':
            setMovementKey('a');
            break;
        case 's':
            setMovementKey('s');
            break;
        case 'd':
            setMovementKey('d');
            break;
    }
    console.log(keys);
}
});
window.addEventListener('keyup', (e) => {
    switch (e.key) {
        case 'w':
            clearMovementKey('w');
            break;
        case 'a':
            clearMovementKey('a');
            break;
        case 's':
            clearMovementKey('s');
            break;
        case 'd':
            clearMovementKey('d');
            break;
    }
    console.log(keys);
});

const controlButtons = document.querySelectorAll('#mobileControls .controlButton');

controlButtons.forEach((button) => {
    const key = button.dataset.key;
    if (!key) return;

    button.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        setMovementKey(key);
        button.classList.add('active');
    });

    const release = () => {
        clearMovementKey(key);
        button.classList.remove('active');
    };

    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('pointerleave', release);
});
