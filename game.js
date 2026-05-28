/**
 * ROOFLINE DASH - CORE ENGINE
 * A high-performance 3D runner built with Three.js.
 */

// --- CONFIGURATION ---
const LANE_WIDTH = 4;
const LANES = [-LANE_WIDTH, 0, LANE_WIDTH];
const INITIAL_SPEED = 30;
const SPEED_INCREMENT = 0.5;
const GRAVITY = -45;
const JUMP_FORCE = 18;

const MODE_CONFIG = {
    easy: { speedMult: 0.8, spawnRate: 0.6, creditsMult: 1 },
    medium: { speedMult: 1.0, spawnRate: 0.8, creditsMult: 1.5 },
    hard: { speedMult: 1.3, spawnRate: 1.2, creditsMult: 2 }
};

const WARDROBE = [
    { id: 'courier', name: 'Courier Jacket', color: 0xffb347 },
    { id: 'transit', name: 'Transit Vest', color: 0x00dbde },
    { id: 'stealth', name: 'Stealth Suit', color: 0x333333 }
];

// --- GAME STATE ---
let state = {
    playing: false,
    speed: INITIAL_SPEED,
    score: 0,
    best: parseInt(localStorage.getItem('roofline_best')) || 0,
    credits: parseInt(localStorage.getItem('roofline_credits')) || 0,
    earnedThisRun: 0,
    distance: 0,
    multiplier: 1.0,
    lane: 1, // 0: Left, 1: Middle, 2: Right
    targetX: 0,
    currentX: 0,
    isJumping: false,
    isSliding: false,
    verticalVelocity: 0,
    y: 0,
    mode: 'easy',
    skin: 'courier'
};

// --- THREE.JS GLOBALS ---
let scene, camera, renderer, clock;
let player, mixer, animations = {};
let currentAction = 'sprint';
let trackGroup, hazards = [], props = [];
let lights = {};

// --- ASSET MANAGEMENT ---
const loader = new THREE.GLTFLoader(); // Changed from GLTFLoader
const models = {};

async function loadGltfFromB64(key, b64) {
    return new Promise((resolve, reject) => {
        try {
            const jsonStr = atob(b64);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            loader.load(url, (gltf) => {
                URL.revokeObjectURL(url);
                resolve(gltf);
            }, undefined, reject);
        } catch (e) {
            reject(e);
        }
    });
}

async function initAssets() {
    const assetsData = window.ROOFLINE_ASSETS;
    if (!assetsData) {
        console.error("No assets found in window.ROOFLINE_ASSETS!");
        return;
    }

    const loadTasks = [
        loadGltfFromB64('player', assetsData.player),
        loadGltfFromB64('bomb', assetsData.coffin0),
        loadGltfFromB64('saw', assetsData.coffin2),
        loadGltfFromB64('spiky', assetsData.coffin1),
        loadGltfFromB64('tree', assetsData.prop2),
        loadGltfFromB64('bush', assetsData.prop0),
        loadGltfFromB64('rock', assetsData.prop3)
    ];

    const results = await Promise.all(loadTasks);
    models.player = results[0];
    models.bomb = results[1];
    models.saw = results[2];
    models.spiky = results[3];
    models.tree = results[4];
    models.bush = results[5];
    models.rock = results[6];
    
    console.log("Assets loaded successfully.");
}

// --- INITIALIZATION ---
function initEngine() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050506);
    scene.fog = new THREE.Fog(0x050506, 40, 100);

    camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 6, 12);
    camera.lookAt(0, 2, -5);

    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game-canvas'), antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;

    clock = new THREE.Clock();

    // Lights
    lights.ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(lights.ambient);

    lights.sun = new THREE.DirectionalLight(0xffb347, 1.2);
    lights.sun.position.set(10, 20, 10);
    lights.sun.castShadow = true;
    scene.add(lights.sun);

    // Track Group
    trackGroup = new THREE.Group();
    scene.add(trackGroup);

    // Initial Floor
    const floorGeo = new THREE.PlaneGeometry(30, 200);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x111112 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    window.addEventListener('resize', onWindowResize);
}

function setupPlayer() {
    const gltf = models.player;
    player = gltf.scene;
    player.scale.set(1.5, 1.5, 1.5);
    player.traverse(n => { if (n.isMesh) n.castShadow = true; });
    scene.add(player);

    mixer = new THREE.AnimationMixer(player);
    gltf.animations.forEach(clip => {
        animations[clip.name.toLowerCase()] = mixer.clipAction(clip);
    });

    if (animations.sprint) animations.sprint.play();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// --- GAMEPLAY LOGIC ---
function spawnHazard() {
    if (!state.playing) return;
    
    const lane = Math.floor(Math.random() * 3);
    const typeRoll = Math.random();
    let model;
    
    if (typeRoll < 0.4) model = models.bomb.scene.clone();
    else if (typeRoll < 0.7) model = models.saw.scene.clone();
    else model = models.spiky.scene.clone();

    model.position.set(LANES[lane], 0, -100);
    model.scale.set(1.5, 1.5, 1.5);
    scene.add(model);
    hazards.push({ mesh: model, lane: lane });
}

function spawnProp() {
    if (!state.playing) return;
    const side = Math.random() > 0.5 ? 1 : -1;
    const typeRoll = Math.random();
    let model;
    
    if (typeRoll < 0.5) model = models.tree.scene.clone();
    else if (typeRoll < 0.8) model = models.bush.scene.clone();
    else model = models.rock.scene.clone();

    model.position.set(side * (LANE_WIDTH * 2 + Math.random() * 10), 0, -100);
    model.scale.set(2, 2, 2);
    scene.add(model);
    props.push(model);
}

function resetGame() {
    state.playing = false;
    state.speed = INITIAL_SPEED * MODE_CONFIG[state.mode].speedMult;
    state.score = 0;
    state.distance = 0;
    state.earnedThisRun = 0;
    state.lane = 1;
    state.targetX = 0;
    state.currentX = 0;
    state.y = 0;
    state.isJumping = false;
    state.isSliding = false;
    state.verticalVelocity = 0;

    hazards.forEach(h => scene.remove(h.mesh));
    props.forEach(p => scene.remove(p));
    hazards = [];
    props = [];

    player.position.set(0, 0, 0);
    switchAnimation('sprint');
    
    updateUI();
}

function switchAnimation(name) {
    if (!animations[name] || currentAction === name) return;
    const nextAction = animations[name];
    const prevAction = animations[currentAction];

    nextAction.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(0.2).play();
    if (prevAction) prevAction.fadeOut(0.2);
    
    currentAction = name;
}

function handleInput(key) {
    if (!state.playing) return;

    if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
        if (state.lane > 0) state.lane--;
    } else if (key === 'ArrowRight' || key === 'd' || key === 'D') {
        if (state.lane < 2) state.lane++;
    } else if ((key === 'ArrowUp' || key === 'w' || key === 'W') && !state.isJumping) {
        state.isJumping = true;
        state.verticalVelocity = JUMP_FORCE;
        switchAnimation('jump');
    } else if ((key === 'ArrowDown' || key === 's' || key === 'S') && !state.isSliding) {
        state.isSliding = true;
        switchAnimation('slide'); // Assuming 'slide' or 'crouch' exists
        setTimeout(() => { 
            state.isSliding = false; 
            if (!state.isJumping) switchAnimation('sprint');
        }, 800);
    }

    state.targetX = LANES[state.lane];
}

// --- UPDATE LOOP ---
function update(delta) {
    if (!state.playing) return;

    // Movement
    state.distance += state.speed * delta;
    state.speed += SPEED_INCREMENT * delta;
    state.score = Math.floor(state.distance);
    
    // Smooth Lane Change
    state.currentX = THREE.MathUtils.lerp(state.currentX, state.targetX, 10 * delta);
    player.position.x = state.currentX;

    // Jump Physics
    if (state.isJumping) {
        state.y += state.verticalVelocity * delta;
        state.verticalVelocity += GRAVITY * delta;
        if (state.y <= 0) {
            state.y = 0;
            state.isJumping = false;
            switchAnimation('sprint');
        }
    }
    player.position.y = state.y;

    // Hazards
    for (let i = hazards.length - 1; i >= 0; i--) {
        const h = hazards[i];
        h.mesh.position.z += state.speed * delta;
        
        // Rotating saws/spiky balls
        h.mesh.rotation.y += 2 * delta;

        // Collision Check
        const distZ = Math.abs(h.mesh.position.z - player.position.z);
        if (distZ < 1.5 && h.lane === state.lane) {
            // Simplified height check for jump/slide
            const isColliding = (state.isJumping && h.mesh.position.y > 2) || 
                               (!state.isJumping && !state.isSliding) ||
                               (state.isSliding && h.mesh.position.y < 1); // Logic depends on obstacle type

            if (distZ < 0.8) gameOver(); 
        }

        if (h.mesh.position.z > 20) {
            scene.remove(h.mesh);
            hazards.splice(i, 1);
            state.earnedThisRun += 1; // Credits for passing
        }
    }

    // Props
    for (let i = props.length - 1; i >= 0; i--) {
        const p = props[i];
        p.position.z += state.speed * delta;
        if (p.position.z > 20) {
            scene.remove(p);
            props.splice(i, 1);
        }
    }

    // Spawning
    const spawnChance = delta * 2 * MODE_CONFIG[state.mode].spawnRate;
    if (Math.random() < spawnChance) spawnHazard();
    if (Math.random() < spawnChance * 2) spawnProp();

    if (mixer) mixer.update(delta);
    
    updateUI();
}

function updateUI() {
    document.getElementById('score-val').textContent = state.score;
    document.getElementById('dist-val').textContent = Math.floor(state.distance) + 'm';
    document.getElementById('credits-val').textContent = state.credits + state.earnedThisRun;
    document.getElementById('best-val').textContent = state.best;
}

function gameOver() {
    state.playing = false;
    switchAnimation('die');
    
    state.credits += state.earnedThisRun;
    if (state.score > state.best) {
        state.best = state.score;
        localStorage.setItem('roofline_best', state.score);
    }
    localStorage.setItem('roofline_credits', state.credits);

    document.getElementById('final-dist').textContent = Math.floor(state.distance) + 'm';
    document.getElementById('earned-credits').textContent = '+' + state.earnedThisRun;
    document.getElementById('game-over-menu').classList.remove('hidden');
}

function render() {
    requestAnimationFrame(render);
    const delta = clock.getDelta();
    update(Math.min(delta, 0.1));
    renderer.render(scene, camera);
}

// --- UI EVENT BINDING ---
function initUI() {
    document.getElementById('start-run-btn').onclick = () => {
        document.getElementById('start-menu').classList.add('hidden');
        state.playing = true;
        state.distance = 0;
        state.score = 0;
        state.earnedThisRun = 0;
    };

    document.getElementById('retry-btn').onclick = () => {
        document.getElementById('game-over-menu').classList.add('hidden');
        resetGame();
        state.playing = true;
    };

    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.mode = btn.dataset.mode;
        };
    });

    // Dummy Wardrobe Population
    const wardrobeList = document.getElementById('wardrobe-list');
    WARDROBE.forEach(item => {
        const card = document.createElement('div');
        card.className = `skin-card ${state.skin === item.id ? 'active' : ''}`;
        card.innerHTML = `<div style="width:40px;height:40px;background-color:#${item.color.toString(16)};border-radius:50%;"></div>`;
        card.onclick = () => {
            document.querySelectorAll('.skin-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            state.skin = item.id;
            // Update player mesh color or skin logic
        };
        wardrobeList.appendChild(card);
    });

    window.addEventListener('keydown', (e) => handleInput(e.key));
}

// --- START ---
(async () => {
    initEngine();
    await initAssets();
    setupPlayer();
    initUI();
    resetGame();
    render();
})();
