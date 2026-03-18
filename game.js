/**
 * MWA Running Game Logic
 */

// --- Configuration ---
const CONFIG = {
    gravity: 0.5,
    jumpForce: -13,
    groundHeight: 50,
    gameSpeed: 5.45, // Tweaked to 5.45 based on feedback
    doubleJump: false,
    targetWidth: 1200, // Reference width for scaling
    GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycby14r63ELGIE7fMfoQKqdMXbr09ekaq7-WLR4QYysIUgO_Rq-Lh3_MB4ruhj8E__B8AQg/exec'
};

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    state.scale = getScale();
    document.documentElement.style.setProperty('--scale', state.scale);
}

function getScale() {
    // Reference: 1440x900 as a standard laptop wide screen
    const baseW = 1440;
    const baseH = 900;
    const sW = canvas.width / baseW;
    const sH = canvas.height / baseH;
    // Use Math.min to ensure it fits both directions, but keep a reasonable floor
    return Math.max(0.5, Math.min(sW, sH, 1.2));
}

// --- Game State ---
const state = {
    screen: 'registration',
    playerData: null,
    score: 0,
    frames: 0,
    gameLoopId: null,
    entities: [],
    input: {
        jump: false
    },
    nextSpawnFrame: 100,
    collectedIndices: [],
    quizInterval: null,
    quizTimeLeft: 5,
    health: 100,
    isInvincible: false,
    invincibilityTimer: 0,
    currentProject: null,
    completedProjectIds: [],
    levelDecoySpawned: false,
    scale: 1.0, // Initial scale
    quizCorrectCount: 0 // Track correct quiz answers
};

const PROJECTS_POOL = [
    {
        id: "CMO1-T2-P1",
        fullName: "CMO1-T2-P1 โครงการจัดทำข้อมูล Customer Persona และ Customer Journey",
        words: ["CMO1-T2-P1", "จัดทำข้อมูล", "Customer Persona", "Customer Journey"],
        keyWords: ["จัดทำข้อมูล", "Customer Journey"],
        objectives: ["พัฒนาวิเคราะห์ข้อมูลเพื่อตอบสนองลูกค้า"]
    },
    {
        id: "CMO1-T2-P2",
        fullName: "CMO1-T2-P2 โครงการพัฒนาปรับปรุงผลิตภัณฑ์และบริการที่ตอบสนองลูกค้าตาม Customer Persona และ Customer Journey",
        words: ["CMO1-T2-P2", "ปรับปรุงผลิตภัณฑ์และบริการ", "ที่ตอบสนองลูกค้า", "Customer Persona"],
        keyWords: ["ปรับปรุงผลิตภัณฑ์และบริการ", "Customer Persona"],
        objectives: ["พัฒนาผลิตภัณฑ์และบริการเพื่อตอบสนองลูกค้าเป้าหมาย"]
    },
    {
        id: "CMO1-T3-P1",
        fullName: "CMO1-T3-P1 โครงการยกระดับการให้บริการมาตรอัจฉริยะ Smart Meter",
        words: ["CMO1-T3-P1", "โครงการยกระดับบริการ", "มาตรอัจฉริยะ", "Smart Meter"],
        keyWords: ["มาตรอัจฉริยะ", "Smart Meter"],
        objectives: ["ยกระดับและขยายผลบริการ Smart Meter ให้ตอบสนองความคาดหวังของลูกค้า"]
    },
    {
        id: "CMO1-T3-P2",
        fullName: "CMO1-T3-P2 โครงการสนับสนุนบริการ Digital Service ผ่าน MWA Point",
        words: ["CMO1-T3-P2", "สนับสนุนบริการ", "Digital Service", "MWA Point"],
        keyWords: ["Digital Service", "MWA Point"],
        objectives: ["กระตุ้นการใช้ Digital Service และสร้างความสัมพันธ์ที่ดีผ่าน MWA Point"]
    },
    {
        id: "CMO1-T3-P3",
        fullName: "CMO1-T3-P3 โครงการพัฒนา/เพิ่มช่องทางการรับชำระเงินด้วยบริการ Digital Service",
        words: ["CMO1-T3-P3", "พัฒนา/เพิ่มช่องทางการรับชำระเงิน", "Digital Service"],
        keyWords: ["พัฒนา/เพิ่มช่องทางการรับชำระเงิน", "Digital Service"],
        objectives: ["เพิ่มช่องทางและสร้างการรับรู้การรับชำระเงินด้วย Digital Service"]
    },
    {
        id: "CMO1-T3-P4",
        fullName: "CMO1-T3-P4 โครงการประชาสัมพันธ์เพื่อกระตุ้นการใช้บริการผ่านช่องทาง Digital Service",
        words: ["CMO1-T3-P4", "ประชาสัมพันธ์", "ช่องทาง", "Digital Service"],
        keyWords: ["ประชาสัมพันธ์", "ช่องทาง Digital Service"],
        objectives: ["ประชาสัมพันธ์กระตุ้นการใช้และเพิ่มความพึงพอใจในบริการ Digital Service"]
    },
    {
        id: "CMO1-T4-P1",
        fullName: "CMO1-T4-P1 โครงการยกระดับศูนย์บริการประชาชน 1125 ",
        words: ["CMO1-T4-P1", "โครงการยกระดับ", "ศูนย์บริการประชาชน", "1125"],
        keyWords: ["ศูนย์บริการประชาชน", "1125"],
        objectives: ["ตอบสนองความคาดหวังและสร้างภาพลักษณ์ที่ดีผ่านศูนย์บริการประชาชน 1125"]
    },
    {
        id: "CMO1-T5-P1",
        fullName: "CMO1-T5-P1 โครงการพัฒนาข้อมูลชุดคำตอบสำหรับ AI-based chatbot",
        words: ["CMO1-T5-P1", "พัฒนาข้อมูลชุดคำตอบ", "สำหรับ", "AI-based chatbot"],
        keyWords: ["AI-based chatbot"],
        objectives: ["ยกระดับการบริการด้วย AI-based chatbot เพื่อตอบสนองความคาดหวังของลูกค้า"]
    },
    {
        id: "CMO1-T6-P1",
        fullName: "CMO1-T6-P1 โครงการยกระดับความสัมพันธ์กับกลุ่มลูกค้ารายสำคัญ (MWA Top-Tier)",
        words: ["CMO1-T6-P1", "ยกระดับความสัมพันธ์", "ลูกค้ารายสำคัญ", "(MWA Top-Tier)"],
        keyWords: ["ยกระดับความสัมพันธ์", "ลูกค้ารายสำคัญ", "(MWA Top-Tier)"],
        objectives: ["ยกระดับความสัมพันธ์ รวบรวมความต้องการ และสร้างภาพลักษณ์ที่ดีต่อลูกค้ารายสำคัญ"]
    },
    {
        id: "CMO1-T6-P2",
        fullName: "CMO1-T6-P2 โครงการยกระดับความสัมพันธ์ด้วยกิจกรรมสร้างความสัมพันธ์กับกลุ่มลูกค้าทั่วไป",
        words: ["CMO1-T6-P2", "สร้างความสัมพันธ์", "ลูกค้าทั่วไป"],
        keyWords: ["สร้างความสัมพันธ์", "ลูกค้าทั่วไป"],
        objectives: ["ยกระดับความสัมพันธ์ รวบรวมความต้องการ และสร้างภาพลักษณ์ที่ดีต่อลูกค้าทั่วไป"]
    },
    {
        id: "CMO3-T1-P1",
        fullName: "CMO3-T1-P1 โครงการงาน Integrated Waterworks Services",
        words: ["CMO3-T1-P1", "Integrated", "Waterworks", "Services"],
        keyWords: ["Integrated", "Waterworks", "Services"],
        objectives: ["เพิ่มรายได้ของธุรกิจที่เกี่ยวเนื่องด้านงานบริการด้านการออกแบบ และปรับปรุงระบบประปา"]
    },
    {
        id: "CMO3-T1-P2",
        fullName: "CMO3-T1-P2 โครงการบริการ Home Care Services",
        words: ["CMO3-T1-P2", "Home Care", "Services"],
        keyWords: ["Home Care", "Services"],
        objectives: ["เพิ่มรายได้ของธุรกิจที่เกี่ยวเนื่องด้านการบริการประปาครบวงจรสำหรับสถานที่ใช้น้ำ"]
    },
    {
        id: "CMO3-T1-P3",
        fullName: "CMO3-T1-P3 โครงการศูนย์บริการทดสอบงานประปา (Testing Center)",
        words: ["CMO3-T1-P3", "ทดสอบงานประปา", "Testing Center"],
        keyWords: ["ทดสอบงานประปา", "Testing Center"],
        objectives: ["เพิ่มรายได้ของธุรกิจที่เกี่ยวเนื่องด้านศูนย์บริการทดสอบงานประปา"]
    },
    {
        id: "CMO3-T1-P4",
        fullName: "CMO3-T1-P4 โครงการ Innovation & Technology",
        words: ["CMO3-T1-P4", "Innovation", "& Technology"],
        keyWords: ["Innovation", "& Technology"],
        objectives: ["เพิ่มรายได้ของธุรกิจที่เกี่ยวเนื่องด้านการบริการนวัตกรรมและเทคโนโลยี"]
    },
    {
        id: "CMO3-T1-P5",
        fullName: "CMO3-T1-P5 โครงการศูนย์ความเป็นเลิศด้านระบบประปา (MWA Excellent Center)",
        words: ["CMO3-T1-P5", "ระบบประปา", "MWA Excellent Center"],
        keyWords: ["ระบบประปา", "MWA Excellent Center"],
        objectives: ["เพิ่มรายได้ของธุรกิจที่เกี่ยวเนื่องด้านศูนย์ความเป็นเลิศด้านระบบประปา"]
    }
];

let WORD_LIST = PROJECTS_POOL[0].words; // Default fallback

// --- DOM Elements ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const regScreen = document.getElementById('registration-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const hud = document.getElementById('ui-hud');
const scoreDisplay = document.getElementById('score');
const finalScoreDisplay = document.getElementById('final-score');
const regForm = document.getElementById('regForm');
const restartBtn = document.getElementById('restart-btn');
const playerDisplayName = document.getElementById('player-display-name');
const clearScreen = document.getElementById('clear-screen');
const projectFullName = document.getElementById('project-full-name');
const clearScoreDisplay = document.getElementById('clear-score');
const clearRestartBtn = document.getElementById('clear-restart-btn');
const goToQuizBtn = document.getElementById('go-to-quiz-btn');

const introScreen = document.getElementById('project-intro-screen');
const introProjectName = document.getElementById('intro-project-name');
const introObjectives = document.getElementById('intro-project-objectives');
const startLevelBtn = document.getElementById('start-level-btn');

const grandClearScreen = document.getElementById('grand-clear-screen');
const grandClearScoreDisplay = document.getElementById('grand-clear-score');
const grandRestartBtn = document.getElementById('grand-restart-btn');
const viewLeaderboardBtnGrand = document.getElementById('view-leaderboard-btn-grand');
const congratsText = document.getElementById('congrats-text');
const quizScreen = document.getElementById('quiz-screen');
const quizOptions = document.getElementById('quiz-options');
const quizTimerBar = document.getElementById('quiz-timer-bar');
const quizTimerText = document.getElementById('quiz-timer-text');
const healthBarFill = document.getElementById('health-bar-fill');
const healthText = document.getElementById('health-text');
const currentProjectCount = document.getElementById('current-project-count');
const restartBtnText = restartBtn.querySelector('span') || restartBtn; // Fallback if no span

// Pause Elements
const pauseBtn = document.getElementById('pause-btn');
const pauseScreen = document.getElementById('pause-screen');
const resumeBtn = document.getElementById('resume-btn');
const quitBtn = document.getElementById('quit-btn');

// --- Initialization ---
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    state.scale = getScale();
    document.documentElement.style.setProperty('--scale', state.scale);
}
window.addEventListener('resize', resize);
resize();

// --- Registration Logic ---
// --- Registration Logic ---
regForm.addEventListener('submit', (e) => {
    e.preventDefault();
    console.log('Form submitted');

    try {
        const formData = new FormData(regForm);
        const data = {
            fullname: formData.get('fullname'),
            department: formData.get('department'),
            affiliation: formData.get('affiliation'),
            phone: formData.get('phone'),
            employeeId: formData.get('employeeId')
        };

        if (data.fullname && data.department) {
            state.playerData = data;
            playerDisplayName.textContent = `${data.fullname} (${data.department})`;

            // Show Rules Modal instead of starting game immediately
            const rulesModal = document.getElementById('rules-modal');
            if (rulesModal) {
                rulesModal.classList.remove('hidden');
            } else {
                // UI Fallback: Start game if modal missing
                startProjectIntro();
            }
        } else {
            alert('กรุณากรอกข้อมูลให้ครบถ้วน');
        }
    } catch (error) {
        console.error('Critical error in start game:', error);
        alert('เกิดข้อผิดพลาดในการเริ่มเกม: ' + error.message);
        startProjectIntro();
    }
});

const assets = {
    dino: new Image(),
    pipe: new Image()
};
assets.dino.src = 'dino.png';
assets.pipe.src = 'pipe.png';

// --- Game Logic ---

class Player {
    constructor() {
        const s = state.scale;
        this.width = 88 * s;
        this.height = 94 * s;
        this.x = 100 * s;
        this.y = canvas.height - (CONFIG.groundHeight * s) - this.height;
        this.vy = 0;
        this.isGrounded = true;
        this.jumpCount = 0;
    }

    update() {
        // Gravity
        this.vy += CONFIG.gravity * state.scale;
        this.y += this.vy;

        // Ground Collision
        const groundY = canvas.height - (CONFIG.groundHeight * state.scale) - this.height;
        if (this.y >= groundY) {
            this.y = groundY;
            this.vy = 0;
            this.isGrounded = true;
            this.jumpCount = 0;
        } else {
            this.isGrounded = false;
        }
    }

    jump() {
        // Single jump logic: Only jump if grounded.
        if (this.isGrounded) {
            this.vy = CONFIG.jumpForce * state.scale;
            this.jumpCount++;
        }
    }

    draw() {
        if (state.isInvincible) {
            // Flicker effect: only draw half the time
            if (Math.floor(state.frames / 5) % 2 === 0) return;
            // Or reduce opacity
            ctx.globalAlpha = 0.6;
        }

        if (assets.dino.complete) {
            ctx.drawImage(assets.dino, this.x, this.y, this.width, this.height);
        } else {
            // Fallback
            ctx.fillStyle = '#ff6b6b';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }

        ctx.globalAlpha = 1.0; // Reset
    }
}

class Obstacle {
    constructor() {
        const s = state.scale;
        this.width = 50 * s;
        this.height = 90 * s;
        this.type = 'ground';

        this.x = canvas.width;
        this.y = canvas.height - (CONFIG.groundHeight * s) - this.height;

        this.speed = CONFIG.gameSpeed * s;
        this.markedForDeletion = false;
    }

    update() {
        this.x -= this.speed;
        if (this.x + this.width < 0) this.markedForDeletion = true;
    }

    draw() {
        if (assets.pipe.complete) {
            ctx.drawImage(assets.pipe, this.x, this.y, this.width, this.height);
        } else {
            // Fallback
            ctx.fillStyle = '#2c3e50';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }
}

// --- Collectible System ---
// WORD_LIST is now dynamically updated in startGame()

function generateDecoy(word) {
    if (!word) return "Error";

    // Precise dictionary for highly similar visually/phonetically deceptive typos
    const typoMap = {
        "จัดทำข้อมูล": "จัดทำข้อมล",
        "Customer Persona": "Customer Persono",
        "Customer Journey": "Customer Jorney",
        "ปรับปรุงผลิตภัณฑ์และบริการ": "ปรับปรุงผลิตภัณท์และบริการ",
        "ที่ตอบสนองลูกค้า": "ที่ตอบสนองลูกค่า",
        "โครงการยกระดับบริการ": "โครงการยกระดับบรีการ",
        "มาตรอัจฉริยะ": "มาตราอัจฉริยะ",
        "Smart Meter": "Smart Metar",
        "สนับสนุนบริการ": "สนันสนุนบริการ",
        "Digital Service": "Digitai Service",
        "ช่องทาง Digital Service": "ช่องทาง Digitai Service",
        "MWA Point": "MWA Poin",
        "พัฒนา/เพิ่มช่องทางการรับชำระเงิน": "พัฒนา/เพื่มช่องทางการรับชำระเงิน",
        "การรับชำระเงิน": "การรับชำระเงิย",
        "ประชาสัมพันธ์": "ประชาสัมพันธ",
        "กระตุ้นการใช้บริการ": "กระตุ้นการใช้บริกาล",
        "โครงการยกระดับ": "โครงการยกระตับ",
        "ศูนย์บริการประชาชน": "ศุนย์บริการประชาชน",
        "1125": "1126",
        "พัฒนาข้อมูลชุดคำตอบ": "พัฒนาข้อมูลชุดคำคอบ",
        "สำหรับ": "สำหลับ",
        "AI-based chatbot": "Al-based chatbot",
        "ยกระดับความสัมพันธ์": "ยกระดับความสัมพันธ",
        "ลูกค้ารายสำคัญ": "ลูกค่ารายสำคัญ",
        "(MWA Top-Tier)": "(MWA Top-Teir)",
        "สร้างความสัมพันธ์": "สร้างส้มพันธ์",
        "ลูกค้าทั่วไป": "ลูกค้าทั้วไป",
        "Integrated": "lntegrated",
        "Waterworks": "Waterwork",
        "Services": "Servlces",
        "Home Care": "Hame Care",
        "ทดสอบงานประปา": "ทตสอบงานประปา",
        "Testing Center": "Testlng Center",
        "Innovation": "lnnovation",
        "& Technology": "& Technolagy",
        "ระบบประปา": "ระบบปะปา",
        "MWA Excellent Center": "MWA Excelent Center"
    };

    if (typoMap[word]) return typoMap[word];

    // For project IDs like CMO1-T2-P1 -> CM01-T2-P1 (Replace O with zero)
    if (word.startsWith("CMO")) {
        return word.replace("O", "0");
    }

    // Generic fallback for any other words: swap two adjacent middle characters
    const chars = word.split('');
    if (chars.length > 3) {
        const idx = Math.floor(Math.random() * (chars.length - 2)) + 1; // Pick middle character
        [chars[idx], chars[idx + 1]] = [chars[idx + 1], chars[idx]];
    } else {
        chars.push('x');
    }
    return chars.join('');
}

class Collectible {
    constructor(text, index, isDecoy = false) {
        const s = state.scale;
        this.text = text;
        this.index = index;
        this.isDecoy = isDecoy;

        this.height = 65 * s; // Increased height for larger font

        ctx.font = `bold ${Math.floor(36 * s)}px "Kanit", sans-serif`; // Increased font size
        const textMetrics = ctx.measureText(text);
        this.width = textMetrics.width + (40 * s); // Increased padding

        this.x = canvas.width + 100;
        this.y = canvas.height - (CONFIG.groundHeight * s) - (200 * s);

        this.speed = CONFIG.gameSpeed * s;
        this.markedForDeletion = false;
        this.collected = false;
    }

    update() {
        this.x -= this.speed;
        if (this.x + this.width < 0) this.markedForDeletion = true;
    }

    draw() {
        if (this.collected) return;
        const s = state.scale;

        ctx.fillStyle = 'rgba(255, 230, 0, 0.95)'; // Brighter yellow, high opacity
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(this.x, this.y, this.width, this.height, 30 * state.scale);
        } else {
            ctx.rect(this.x, this.y, this.width, this.height);
        }
        ctx.fill();

        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 3 * state.scale;
        ctx.stroke();

        // White outline for better text contrast
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 6 * state.scale; // Thicker white stroke
        ctx.lineJoin = 'round';
        ctx.miterLimit = 2;
        ctx.strokeText(this.text, this.x + this.width / 2, this.y + this.height / 2);

        ctx.fillStyle = '#00008B';
        ctx.font = `bold ${Math.floor(36 * state.scale)}px "Kanit", sans-serif`; // Larger font
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.text, this.x + this.width / 2, this.y + this.height / 2);
    }
}

const projectSequence = document.getElementById('project-sequence');

function initCollectionBar() {
    projectSequence.innerHTML = '';
    const fullName = state.currentProject.fullName;
    
    let currentIndex = 0;
    let sequenceItems = [];
    
    WORD_LIST.forEach((targetWord, idx) => {
        const foundPos = fullName.indexOf(targetWord, currentIndex);
        if (foundPos !== -1) {
            if (foundPos > currentIndex) {
                const prefix = fullName.substring(currentIndex, foundPos).trim();
                if (prefix) {
                    sequenceItems.push({ text: prefix, isTarget: false });
                }
            }
            sequenceItems.push({ text: targetWord, isTarget: true, targetId: idx });
            currentIndex = foundPos + targetWord.length;
        } else {
            sequenceItems.push({ text: targetWord, isTarget: true, targetId: idx });
        }
    });
    
    if (currentIndex < fullName.length) {
        const suffix = fullName.substring(currentIndex).trim();
        if (suffix) {
            sequenceItems.push({ text: suffix, isTarget: false });
        }
    }
    
    sequenceItems.forEach(item => {
        let displayText = item.text.replace(/โครงการ/g, '').trim();
        if (displayText === '' && !item.isTarget) return; // Skip if it becomes completely empty
        
        const span = document.createElement('span');
        span.textContent = displayText;
        span.classList.add('sequence-item');
        
        if (item.isTarget) {
            span.id = `word-${item.targetId}`;
        } else {
            span.classList.add('collected');
        }
        
        projectSequence.appendChild(span);
    });
}

function collectWord(collectible) {
    if (collectible.isDecoy) {
        // Lose 20 HP instead of Game Over
        takeDamage(20);
        state.score -= 20; // Small penalty
        return;
    }

    // Check if already collected
    if (state.collectedIndices.includes(collectible.index)) return;

    state.collectedIndices.push(collectible.index);
    state.score += 50; // Bonus score

    // UI Update
    const el = document.getElementById(`word-${collectible.index}`);
    if (el) {
        el.classList.add('collected');
    }

    // Check Win/Completion
    if (state.collectedIndices.length >= WORD_LIST.length) {
        showClearScreen();
    }
}

let player;
let obstacles = [];
let collectibles = [];

function startProjectIntro() {
    // Select uncompleted project
    const availableProjects = PROJECTS_POOL.filter(p => !state.completedProjectIds.includes(p.id));

    // If all projects completed, reset or show victory (this is handled in quiz flow ideally)
    if (availableProjects.length === 0) {
        state.completedProjectIds = []; // Reset for new run if forced
        state.currentProject = PROJECTS_POOL[Math.floor(Math.random() * PROJECTS_POOL.length)];
    } else {
        state.currentProject = availableProjects[Math.floor(Math.random() * availableProjects.length)];
    }

    // Apply Option 1: Reduce number of words to collect
    // Use the explicitly defined key words for the project
    if (state.currentProject.keyWords) {
        WORD_LIST = [...state.currentProject.keyWords];
    } else {
        const fullWordList = state.currentProject.words;
        if (fullWordList.length > 2) {
            const idWord = fullWordList[0];
            const keyWord = fullWordList[fullWordList.length - 1];
            WORD_LIST = [idWord, keyWord];
        } else {
            WORD_LIST = fullWordList; // Less than 3 words, just use them all safely
        }
    }

    // Show intro screen!
    state.screen = 'intro';

    // Hide other screens
    quizScreen.classList.add('hidden');
    clearScreen.classList.add('hidden');
    if (grandClearScreen) grandClearScreen.classList.add('hidden');
    regScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    if (pauseScreen) pauseScreen.classList.add('hidden');
    hud.classList.add('hidden');

    introProjectName.textContent = state.currentProject.fullName;
    introObjectives.innerHTML = '';

    // Default objective if not specified
    const objectives = state.currentProject.objectives || ["ร่วมเป็นส่วนหนึ่งในการขับเคลื่อนและพัฒนา กปน. ให้ดียิ่งขึ้น"];

    objectives.forEach(obj => {
        const li = document.createElement('li');
        li.textContent = obj;
        introObjectives.appendChild(li);
    });

    introScreen.classList.remove('hidden');
}

function startGame() {
    introScreen.classList.add('hidden');

    state.screen = 'playing';
    // state.score = 0; // Don't reset score - make it cumulative!
    state.frames = 0;
    state.nextSpawnFrame = 100;
    state.collectedIndices = [];
    state.levelDecoySpawned = false;

    // Only reset health at the start of a new run
    if (state.completedProjectIds.length === 0) {
        state.health = 100;
    }

    state.isInvincible = false;
    state.invincibilityTimer = 0;
    updateHealthUI();
    updateProgressUI();

    obstacles = [];
    collectibles = [];
    player = new Player();

    clearInterval(state.quizInterval);
    quizScreen.classList.add('hidden');
    clearScreen.classList.add('hidden');

    if (grandClearScreen) grandClearScreen.classList.add('hidden');
    if (congratsText) {
        congratsText.classList.add('hidden');
        congratsText.classList.remove('show');
    }

    initCollectionBar(); // Reset UI

    // UI Updates
    regScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    hud.classList.remove('hidden');

    // Start Loop
    cancelAnimationFrame(state.gameLoopId);
    loop();
}

function gameOver() {
    state.screen = 'gameover';

    // Safety: Explicitly stop the game loop
    if (state.gameLoopId) {
        cancelAnimationFrame(state.gameLoopId);
        state.gameLoopId = null;
    }

    const finalScore = Math.floor(state.score);
    finalScoreDisplay.textContent = finalScore;
    hud.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');

    // Reset heading and button text
    const heading = gameOverScreen.querySelector('h1');
    if (heading) heading.textContent = "Game Over";
    restartBtn.textContent = "กลับสู่หน้าแรก (Return to Start)";

    // Send data to Google Sheet
    if (CONFIG.GOOGLE_SCRIPT_URL && CONFIG.GOOGLE_SCRIPT_URL !== 'YOUR_GOOGLE_SCRIPT_URL_HERE' && state.playerData) {
        // Merge player data with score and action
        const dataToSend = {
            action: 'saveScore',
            ...state.playerData,
            score: finalScore,
            projectsCleared: state.completedProjectIds.length,
            quizCorrect: state.quizCorrectCount
        };

        console.log('Sending score to Google Sheet...', dataToSend);

        fetch(CONFIG.GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(dataToSend)
        })
            .then(() => console.log('Score sent successfully'))
            .catch(err => console.error('Error sending score:', err));
    }
}

// --- Pause Logic ---
function pauseGame() {
    if (state.screen !== 'playing') return;
    state.screen = 'paused';
    if (state.gameLoopId) {
        cancelAnimationFrame(state.gameLoopId);
        state.gameLoopId = null;
    }
    if (pauseScreen) pauseScreen.classList.remove('hidden');
}

function resumeGame() {
    if (state.screen !== 'paused') return;
    state.screen = 'playing';
    if (pauseScreen) pauseScreen.classList.add('hidden');

    // Resume loop
    state.gameLoopId = requestAnimationFrame(loop);
}

function quitGame() {
    if (pauseScreen) pauseScreen.classList.add('hidden');
    if (hud) hud.classList.add('hidden');
    if (regScreen) regScreen.classList.remove('hidden');

    state.screen = 'registration';
    state.playerData = null;
    state.score = 0;
    state.completedProjectIds = [];
    if (regForm) regForm.reset();
}

function takeDamage(amount) {
    if (state.isInvincible) return;

    state.health -= amount;
    if (state.health < 0) state.health = 0;

    updateHealthUI();

    // Visual feedback
    canvas.classList.add('hit');
    setTimeout(() => canvas.classList.remove('hit'), 400);

    if (state.health <= 0) {
        gameOver();
    } else {
        // Temporary invincibility (1.5 seconds)
        state.isInvincible = true;
        state.invincibilityTimer = 90; // 90 frames @ 60fps
    }
}

function updateHealthUI() {
    if (healthBarFill && healthText) {
        healthBarFill.style.width = state.health + '%';
        healthText.textContent = 'ชีวิต: ' + Math.ceil(state.health) + '%';

        // Color Change
        if (state.health > 50) healthBarFill.style.background = 'linear-gradient(to right, #2ecc71, #27ae60)';
        else if (state.health > 20) healthBarFill.style.background = 'linear-gradient(to right, #f1c40f, #f39c12)';
        else healthBarFill.style.background = 'linear-gradient(to right, #e74c3c, #c0392b)';
    }
}

function showClearScreen() {
    state.screen = 'gameover'; // Use gameover state to stop processing
    state.gameLoopId = null;

    state.score += 1000; // Completion bonus
    const finalScore = Math.floor(state.score);

    projectFullName.textContent = state.currentProject.fullName;
    clearScoreDisplay.textContent = finalScore;

    hud.classList.add('hidden');
    clearScreen.classList.remove('hidden');
}

function startQuiz() {
    clearScreen.classList.add('hidden');
    quizScreen.classList.remove('hidden');

    const correctName = state.currentProject.fullName;

    // Pick 3 distractors from other projects
    const others = PROJECTS_POOL.filter(p => p.id !== state.currentProject.id);
    const shuffledOthers = others.sort(() => Math.random() - 0.5);
    const distractors = shuffledOthers.slice(0, 3).map(p => p.fullName);

    const options = [correctName, ...distractors];
    // Shuffle all 4 options
    options.sort(() => Math.random() - 0.5);

    quizOptions.innerHTML = '';
    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = opt;
        btn.onclick = () => handleQuizAnswer(opt === correctName, btn);
        quizOptions.appendChild(btn);
    });

    // Reset and start timer
    state.quizTimeLeft = 5;
    quizTimerBar.style.width = '100%';
    quizTimerText.textContent = state.quizTimeLeft;

    clearInterval(state.quizInterval);
    state.quizInterval = setInterval(() => {
        state.quizTimeLeft -= 0.1;
        if (state.quizTimeLeft <= 0) {
            state.quizTimeLeft = 0;
            clearInterval(state.quizInterval);
            handleQuizAnswer(false); // Timeout also means wrong/minus
        }
        quizTimerText.textContent = Math.ceil(state.quizTimeLeft);
        quizTimerBar.style.width = (state.quizTimeLeft / 5 * 100) + '%';
    }, 100);
}

function handleQuizAnswer(isCorrect, btn = null) {
    clearInterval(state.quizInterval);

    // Score adjustment (+/- 10 points)
    if (isCorrect) {
        state.score += 10;
        state.quizCorrectCount++; // Increment correct quiz count
        if (btn) btn.classList.add('correct');
        // Mark project as completed if correctly answered
        if (!state.completedProjectIds.includes(state.currentProject.id)) {
            state.completedProjectIds.push(state.currentProject.id);
        }
    } else {
        state.score -= 10;
        if (btn) btn.classList.add('wrong');
        // Highlight correct one if missed
        const buttons = quizOptions.querySelectorAll('.option-btn');
        const correctName = state.currentProject.fullName;
        buttons.forEach(b => {
            if (b.textContent === correctName) b.classList.add('correct');
        });
    }

    updateProgressUI();

    // Delay slightly then go to final GameOver/Next
    setTimeout(() => {
        quizScreen.classList.add('hidden');

        if (state.completedProjectIds.length < 15) {
            // Not all done, show transition
            showNextProjectPrompt();
        } else {
            // Grand Victory!
            showFinalGameOver(true);
        }
    }, 3000);
}

function showNextProjectPrompt() {
    state.screen = 'gameover';
    state.gameLoopId = null;

    const finalScore = Math.floor(state.score);
    finalScoreDisplay.textContent = finalScore;

    // Customize Game Over Screen as "Project Cleared"
    const heading = gameOverScreen.querySelector('h1');
    if (heading) heading.textContent = "ภารกิจสำเร็จ! (Project Cleared)";

    restartBtn.textContent = "เริ่มโครงการถัดไป (Next Project)";
    gameOverScreen.classList.remove('hidden');
}

function showFinalGameOver(isGrandVictory = false) {
    state.screen = 'gameover';
    state.gameLoopId = null;
    const finalScore = Math.floor(state.score);
    const completedCount = state.completedProjectIds.length;

    if (isGrandVictory) {
        if (grandClearScoreDisplay) grandClearScoreDisplay.textContent = finalScore;
        state.completedProjectIds = []; // Reset for next time if they click restart
        if (grandClearScreen) grandClearScreen.classList.remove('hidden');

        if (congratsText) {
            congratsText.classList.remove('hidden');
            setTimeout(() => {
                congratsText.classList.add('show');
            }, 50);
        }

        // Trigger confetti celebration
        if (window.confetti) {
            confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 }, zIndex: 1000 });
            setTimeout(() => confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 }, zIndex: 1000 }), 500);
            setTimeout(() => confetti({ particleCount: 120, spread: 120, origin: { y: 0.7 }, zIndex: 1000 }), 1000);
            setTimeout(() => confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 }, zIndex: 1000 }), 1500);
        }
    } else {
        if (finalScoreDisplay) finalScoreDisplay.textContent = finalScore;
        const heading = gameOverScreen.querySelector('h1');
        if (heading) {
            heading.textContent = "Game Over";
        }
        if (restartBtn) restartBtn.textContent = "เล่นใหม่ตั้งแต่ต้น (Play Again)";
        if (gameOverScreen) gameOverScreen.classList.remove('hidden');
    }

    // Send final data
    if (CONFIG.GOOGLE_SCRIPT_URL && CONFIG.GOOGLE_SCRIPT_URL !== 'YOUR_GOOGLE_SCRIPT_URL_HERE' && state.playerData) {
        const dataToSend = {
            action: 'saveScore',
            ...state.playerData,
            score: finalScore,
            projectsCleared: isGrandVictory ? 15 : completedCount,
            quizCorrect: state.quizCorrectCount
        };
        fetch(CONFIG.GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(dataToSend)
        }).catch(err => console.error('Error sending score:', err));
    }
}

function updateProgressUI() {
    if (currentProjectCount) {
        currentProjectCount.textContent = state.completedProjectIds.length;
    }
}

function handleInput(e) {
    if (state.screen !== 'playing') return;

    if (e.code === 'Space' || e.code === 'ArrowUp') {
        player.jump();
    }
}

window.addEventListener('keydown', handleInput);
window.addEventListener('keyup', handleInput);


function loop() {
    if (state.screen !== 'playing') return;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update
    state.frames++;
    state.score += 0.1;
    scoreDisplay.textContent = Math.floor(state.score);

    // Invincibility handling
    if (state.isInvincible) {
        state.invincibilityTimer--;
        if (state.invincibilityTimer <= 0) {
            state.isInvincible = false;
        }
    }

    // Constant Game Speed for readability
    // Removed difficulty scaling (increasing speed) to keep text readable
    CONFIG.gameSpeed = 5.3; // Tweaked to 5.3 based on feedback

    player.update();

    // Obstacle Spawning
    if (state.frames >= state.nextSpawnFrame) {
        obstacles.push(new Obstacle());

        // Chance to spawn a collectible after an obstacle
        let addedDelay = 0;
        const nextIndex = state.collectedIndices.length;
        const totalWords = WORD_LIST.length;

        if (nextIndex < totalWords && Math.random() > 0.1) {
            const targetWord = WORD_LIST[nextIndex];
            const isTargetActive = collectibles.some(c => !c.isDecoy && c.index === nextIndex);

            // Determine what to spawn
            let spawnType = 'none';
            const isID = targetWord.startsWith('CMO');

            if (!isTargetActive) {
                // Correct word not on screen yet. We can spawn a decoy FIRST.
                if (!isID) {
                    const isFinalWord = (nextIndex === totalWords - 1);
                    // 30% chance for a decoy, or force it if it's the final word and no decoy spawned yet
                    if ((!state.levelDecoySpawned && isFinalWord) || Math.random() < 0.3) {
                        spawnType = 'decoy';
                    } else {
                        spawnType = 'correct';
                    }
                } else {
                    // Project IDs are always correct
                    spawnType = 'correct';
                }
            } else {
                // The correct word is already on screen!
                // Prevent decoys from spawning AFTER the correct word.
                spawnType = 'none';
            }

            // Spawn further away: 450px allows enough room after the previous pipe
            const safeDist = 450;

            if (spawnType === 'correct') {
                const col = new Collectible(targetWord, nextIndex, false);
                col.x = canvas.width + safeDist;
                collectibles.push(col);
                // Give plenty of time before the NEXT pipe spawns so it isn't directly below the word
                addedDelay = 120;
            } else if (spawnType === 'decoy') {
                state.levelDecoySpawned = true; // Mark that a decoy has appeared this level
                const decoyWord = generateDecoy(targetWord);
                const col = new Collectible(decoyWord, -1, true);
                col.x = canvas.width + safeDist;
                collectibles.push(col);
                // Give plenty of time before the NEXT pipe spawns so it isn't directly below the word
                addedDelay = 120;
            }
        }

        // Set next spawn frame with a minimum gap
        const minGap = 65; // Slightly increased base gap to prevent pipes from bunching up
        const maxGap = 105;
        const randomGap = Math.floor(Math.random() * (maxGap - minGap + 1) + minGap);
        state.nextSpawnFrame = state.frames + randomGap + addedDelay;
    }

    // Collectibles Update
    collectibles.forEach(col => {
        col.update();
        col.draw();

        // Collision
        if (!col.collected &&
            player.x < col.x + col.width &&
            player.x + player.width > col.x &&
            player.y < col.y + col.height &&
            player.y + player.height > col.y
        ) {
            col.collected = true;
            collectWord(col);
        }
    });
    collectibles = collectibles.filter(col => !col.markedForDeletion);

    // Obstacles Update & Collision
    obstacles.forEach(obs => {
        obs.speed = CONFIG.gameSpeed;
        obs.update();
        obs.draw();

        // Hitbox Adjustment (Forgiving Collision)
        const hitboxPadding = 15;
        const playerHitbox = {
            x: player.x + hitboxPadding,
            y: player.y + hitboxPadding,
            width: player.width - (hitboxPadding * 2),
            height: player.height - (hitboxPadding * 2)
        };
        const obsHitbox = {
            x: obs.x + 5,
            y: obs.y + 5,
            width: obs.width - 10,
            height: obs.height - 10
        };

        if (
            playerHitbox.x < obsHitbox.x + obsHitbox.width &&
            playerHitbox.x + playerHitbox.width > obsHitbox.x &&
            playerHitbox.y < obsHitbox.y + obsHitbox.height &&
            playerHitbox.y + playerHitbox.height > obsHitbox.y
        ) {
            takeDamage(20);
            if (!state.isInvincible) {
                state.score = Math.max(0, state.score - 20); // Penalty for hitting obstacle
            }
        }
    });

    obstacles = obstacles.filter(obs => !obs.markedForDeletion);

    player.draw();

    // Draw Ground
    ctx.fillStyle = '#654321';
    ctx.fillRect(0, canvas.height - (CONFIG.groundHeight * state.scale), canvas.width, CONFIG.groundHeight * state.scale);

    state.gameLoopId = requestAnimationFrame(loop);
}

// Button Events
if (startLevelBtn) {
    startLevelBtn.addEventListener('click', startGame);
}

restartBtn.addEventListener('click', () => {
    // If text is "Next Project" or similar, just start the next one
    if (restartBtn.textContent.includes("Next Project") || restartBtn.textContent.includes("เริ่มโครงการถัดไป")) {
        startProjectIntro();
    } else {
        // Return to registration instead of direct restart as requested
        gameOverScreen.classList.add('hidden');
        regScreen.classList.remove('hidden');
        state.screen = 'registration';
        state.playerData = null;
        state.score = 0;
        state.completedProjectIds = []; // Reset progress on full game over
        regForm.reset();
    }
});

const leaderboardScreen = document.getElementById('leaderboard-screen');
const leaderboardBody = document.getElementById('leaderboard-body');
const leaderboardTable = document.getElementById('leaderboard-table');
const leaderboardLoading = document.getElementById('leaderboard-loading');
const viewLeaderboardBtnReg = document.getElementById('view-leaderboard-btn-reg');
const viewLeaderboardBtnGameover = document.getElementById('view-leaderboard-btn-gameover');
const closeLeaderboardBtn = document.getElementById('close-leaderboard-btn');

function showLeaderboard() {
    leaderboardScreen.classList.remove('hidden');
    leaderboardLoading.classList.remove('hidden');
    leaderboardTable.classList.add('hidden');
    leaderboardBody.innerHTML = '';

    // IfPlayerData is null, try to grab it from the form (allows checking rank before playing)
    if (!state.playerData) {
        const formData = new FormData(regForm);
        const tempName = formData.get('fullname');
        const tempID = formData.get('employeeId');
        if (tempName && tempID) {
            state.playerData = {
                fullname: tempName,
                employeeId: tempID,
                department: formData.get('department'),
                affiliation: formData.get('affiliation'),
                phone: formData.get('phone')
            };
        }
    }

    fetch(CONFIG.GOOGLE_SCRIPT_URL + '?action=getLeaderboard')
        .then(response => response.json())
        .then(data => {
            renderLeaderboard(data);
        })
        .catch(err => {
            console.error('Error fetching leaderboard:', err);
            leaderboardLoading.textContent = 'ไม่สามารถโหลดข้อมูลได้ในขณะนี้';
        });
}

function renderLeaderboard(data) {
    leaderboardLoading.classList.add('hidden');
    leaderboardTable.classList.remove('hidden');

    if (!data || data.length === 0) {
        leaderboardBody.innerHTML = '<tr><td colspan="4" style="text-align:center">ยังไม่มีข้อมูลคะแนน</td></tr>';
        return;
    }

    // Sort by score descending and take top 10
    data.sort((a, b) => b.score - a.score);
    const top10 = data.slice(0, 10);

    const personalRankContainer = document.getElementById('personal-rank-container');
    if (personalRankContainer && state.playerData) {
        // Find current player in the full data set to get rank
        // Use more robust matching (trim whitespace, case insensitive name)
        const playerIndex = data.findIndex(entry => {
            if (!entry.fullname || !entry.employeeId) return false;
            const matchName = entry.fullname.toString().trim().toLowerCase() === state.playerData.fullname.toString().trim().toLowerCase();
            const matchID = entry.employeeId.toString().trim() === state.playerData.employeeId.toString().trim();
            return matchName && matchID;
        });

        if (playerIndex !== -1) {
            const playerEntry = data[playerIndex];
            const rank = playerIndex + 1;
            personalRankContainer.innerHTML = `อันดับของคุณ: ${rank} (คะแนน: ${Math.floor(playerEntry.score)})`;
            personalRankContainer.classList.remove('hidden');
        } else {
            personalRankContainer.classList.add('hidden');
        }
    }

    top10.forEach((entry, index) => {
        const row = document.createElement('tr');
        const rank = index + 1;
        let rankClass = '';
        if (rank === 1) rankClass = 'rank-1';
        else if (rank === 2) rankClass = 'rank-2';
        else if (rank === 3) rankClass = 'rank-3';

        // Highlight player row if they are in the top 10
        if (state.playerData && entry.fullname && entry.employeeId &&
            entry.fullname.toString().trim().toLowerCase() === state.playerData.fullname.toString().trim().toLowerCase() &&
            entry.employeeId.toString().trim() === state.playerData.employeeId.toString().trim()) {
            row.style.background = '#fff3cd';
        }

        row.innerHTML = `
            <td class="rank-cell ${rankClass}">${rank}</td>
            <td>${entry.fullname || 'Anonymous'}</td>
            <td>${entry.department || '-'}</td>
            <td style="font-weight:bold">${Math.floor(entry.score)}</td>
        `;
        leaderboardBody.appendChild(row);
    });
}

viewLeaderboardBtnReg.addEventListener('click', showLeaderboard);
viewLeaderboardBtnGameover.addEventListener('click', showLeaderboard);
if (viewLeaderboardBtnGrand) {
    viewLeaderboardBtnGrand.addEventListener('click', showLeaderboard);
}

closeLeaderboardBtn.addEventListener('click', () => {
    leaderboardScreen.classList.add('hidden');
});

if (grandRestartBtn) {
    grandRestartBtn.addEventListener('click', () => {
        if (grandClearScreen) grandClearScreen.classList.add('hidden');
        if (congratsText) {
            congratsText.classList.remove('show');
            congratsText.classList.add('hidden');
        }
        regScreen.classList.remove('hidden');
        state.screen = 'registration';
        state.playerData = null;
        state.score = 0;
        state.completedProjectIds = [];
        regForm.reset();
    });
}

goToQuizBtn.addEventListener('click', startQuiz);

// Rules Modal Logic
const rulesModal = document.getElementById('rules-modal');
const closeRulesBtn = document.getElementById('close-rules-btn');

closeRulesBtn.addEventListener('click', () => {
    rulesModal.classList.add('hidden');

    // START GAME HERE in the new flow
    startProjectIntro();

    // Play Background Music
    const bgMusic = document.getElementById('bg-music');
    if (bgMusic) {
        bgMusic.volume = 0.5;
        bgMusic.play().catch(error => {
            console.log("Audio play failed (likely autoplay policy):", error);
        });
    }
});

// Mobile Touch Support Re-enabled
window.addEventListener('touchstart', (e) => {
    if (state.screen === 'playing') {
        player.jump();
    }
});

// Pause Event Listeners
if (pauseBtn) pauseBtn.addEventListener('click', pauseGame);
if (resumeBtn) resumeBtn.addEventListener('click', resumeGame);
if (quitBtn) quitBtn.addEventListener('click', quitGame);

window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyP' || e.code === 'Escape') {
        if (state.screen === 'playing') {
            pauseGame();
        } else if (state.screen === 'paused') {
            resumeGame();
        }
    }
});

// Initial Render
ctx.fillStyle = '#87CEEB';
ctx.fillRect(0, 0, canvas.width, canvas.height);

// Draw some ground
const s = state.scale;
ctx.fillStyle = '#654321';
ctx.fillRect(0, canvas.height - (CONFIG.groundHeight * s), canvas.width, CONFIG.groundHeight * s);
