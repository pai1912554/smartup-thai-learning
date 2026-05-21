// ===== NAVIGATION =====
const navbar = document.getElementById('navbar');
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');

if (navToggle) {
    navToggle.addEventListener('click', () => {
        navLinks.classList.toggle('show');
    });
}

window.addEventListener('scroll', () => {
    if (navbar) {
        navbar.classList.toggle('scrolled', window.scrollY > 50);
    }
});

document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        navLinks?.classList.remove('show');
    });
});

// ===== ANIMATED COUNTER =====
function animateCounters() {
    document.querySelectorAll('.stat-number[data-target]').forEach(counter => {
        const target = parseInt(counter.dataset.target);
        const duration = 2000;
        const step = target / (duration / 16);
        let current = 0;
        const timer = setInterval(() => {
            current += step;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            counter.textContent = Math.floor(current);
        }, 16);
    });
}

// ===== PARTICLES =====
function createParticles() {
    const container = document.getElementById('particles');
    if (!container) return;
    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        const size = Math.random() * 200 + 50;
        particle.style.width = size + 'px';
        particle.style.height = size + 'px';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 10 + 's';
        particle.style.animationDuration = (Math.random() * 10 + 10) + 's';
        container.appendChild(particle);
    }
}

// ===== SCROLL ANIMATIONS =====
function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.fade-in, .method-card, .subject-card, .progress-card').forEach(el => {
        observer.observe(el);
    });
}

// ===== PROGRESS TRACKING =====
const ProgressTracker = {
    getProgress() {
        const data = localStorage.getItem('smartup_progress');
        return data ? JSON.parse(data) : {
            math: { lessons: 0, quizzes: 0, totalScore: 0, totalQuestions: 0 },
            science: { lessons: 0, quizzes: 0, totalScore: 0, totalQuestions: 0 },
            english: { lessons: 0, quizzes: 0, totalScore: 0, totalQuestions: 0 },
            mathExtra: { lessons: 0, quizzes: 0, totalScore: 0, totalQuestions: 0 }
        };
    },

    saveProgress(data) {
        localStorage.setItem('smartup_progress', JSON.stringify(data));
    },

    updateSubject(subject, quizScore, totalQuestions) {
        const data = this.getProgress();
        if (data[subject]) {
            data[subject].quizzes++;
            data[subject].totalScore += quizScore;
            data[subject].totalQuestions += totalQuestions;
        }
        this.saveProgress(data);
        this.updateUI();
    },

    completeLesson(subject) {
        const data = this.getProgress();
        if (data[subject]) {
            data[subject].lessons++;
        }
        this.saveProgress(data);
    },

    updateUI() {
        const data = this.getProgress();
        const totalLessonsMap = { math: 12, science: 15, english: 12, mathExtra: 14 };
        const subjects = ['math', 'science', 'english', 'mathExtra'];

        subjects.forEach((sub, i) => {
            const total = totalLessonsMap[sub];
            const percent = Math.round((data[sub].lessons / total) * 100);
            const bars = document.querySelectorAll('.progress-bar');
            const texts = document.querySelectorAll('.progress-text');
            if (bars[i]) {
                bars[i].style.width = percent + '%';
            }
            if (texts[i]) {
                texts[i].textContent = percent + '%';
            }
        });

        const totalLessons = subjects.reduce((sum, s) => sum + data[s].lessons, 0);
        const totalQuizzes = subjects.reduce((sum, s) => sum + data[s].quizzes, 0);
        const totalScore = subjects.reduce((sum, s) => sum + data[s].totalScore, 0);
        const totalQs = subjects.reduce((sum, s) => sum + data[s].totalQuestions, 0);
        const avg = totalQs > 0 ? Math.round((totalScore / totalQs) * 100) : 0;

        const elLessons = document.getElementById('totalLessons');
        const elQuizzes = document.getElementById('totalQuizzes');
        const elAvg = document.getElementById('avgScore');

        if (elLessons) elLessons.textContent = totalLessons;
        if (elQuizzes) elQuizzes.textContent = totalQuizzes;
        if (elAvg) elAvg.textContent = avg + '%';
    }
};

// ===== QUIZ ENGINE =====
class QuizEngine {
    constructor(containerId, questions, subject) {
        this.container = document.getElementById(containerId);
        this.questions = questions;
        this.subject = subject;
        this.answers = {};
        this.submitted = false;
        if (this.container) {
            this.render();
        }
    }

    render() {
        let html = `
            <h2>&#128221; แบบทดสอบท้ายบท</h2>
            <p class="quiz-desc">ทดสอบความเข้าใจของคุณ เลือกคำตอบที่ถูกต้องที่สุด</p>
        `;

        this.questions.forEach((q, idx) => {
            html += `
                <div class="quiz-question" id="q${idx}">
                    <div class="question-header">
                        <div class="question-num">${idx + 1}</div>
                        <div class="question-text">${q.question}</div>
                    </div>
                    ${q.visual ? `<div class="question-visual">${q.visual}</div>` : ''}
                    <div class="options-list">
                        ${q.options.map((opt, oi) => `
                            <button class="option-btn" data-question="${idx}" data-option="${oi}" onclick="quiz.selectOption(${idx}, ${oi})">
                                <span class="option-letter">${String.fromCharCode(65 + oi)}</span>
                                <span>${opt}</span>
                            </button>
                        `).join('')}
                    </div>
                    <div class="explanation" id="exp${idx}">${q.explanation}</div>
                </div>
            `;
        });

        html += `
            <div style="text-align: center; margin-top: 24px;">
                <button class="btn btn-primary" id="submitQuiz" onclick="quiz.submit()">
                    &#9989; ส่งคำตอบ
                </button>
            </div>
            <div class="quiz-results" id="quizResults"></div>
        `;

        this.container.innerHTML = html;
    }

    selectOption(questionIdx, optionIdx) {
        if (this.submitted) return;

        this.answers[questionIdx] = optionIdx;

        const btns = document.querySelectorAll(`[data-question="${questionIdx}"]`);
        btns.forEach(btn => btn.classList.remove('selected'));
        btns[optionIdx]?.classList.add('selected');
    }

    submit() {
        if (this.submitted) return;

        const unanswered = this.questions.filter((_, i) => this.answers[i] === undefined);
        if (unanswered.length > 0) {
            alert(`กรุณาตอบคำถามให้ครบทุกข้อ (ยังเหลืออีก ${unanswered.length} ข้อ)`);
            return;
        }

        this.submitted = true;
        let correct = 0;

        this.questions.forEach((q, idx) => {
            const questionEl = document.getElementById(`q${idx}`);
            const btns = document.querySelectorAll(`[data-question="${idx}"]`);
            const expEl = document.getElementById(`exp${idx}`);
            const selected = this.answers[idx];

            btns.forEach(btn => btn.classList.add('disabled'));

            if (selected === q.correct) {
                correct++;
                btns[selected]?.classList.add('correct');
                questionEl?.classList.add('answered-correct');
            } else {
                btns[selected]?.classList.add('wrong');
                btns[q.correct]?.classList.add('correct');
                questionEl?.classList.add('answered-wrong');
            }

            expEl?.classList.add('show');
        });

        const total = this.questions.length;
        const percent = Math.round((correct / total) * 100);
        let message = '';
        if (percent >= 80) message = '&#127881; ยอดเยี่ยม! คุณเข้าใจเนื้อหาเป็นอย่างดี';
        else if (percent >= 60) message = '&#128170; ดีมาก! ลองทบทวนข้อที่ผิดอีกครั้ง';
        else if (percent >= 40) message = '&#128161; พอใช้ ลองกลับไปอ่านเนื้อหาอีกรอบ';
        else message = '&#128218; ต้องทบทวนใหม่ ลองอ่านเนื้อหาอีกครั้ง';

        const resultsEl = document.getElementById('quizResults');
        if (resultsEl) {
            resultsEl.innerHTML = `
                <div class="results-score">${percent}%</div>
                <div class="results-text">${message}</div>
                <div class="results-detail">
                    <div class="detail-item">
                        <div class="num correct-color">${correct}</div>
                        <div class="label">ตอบถูก</div>
                    </div>
                    <div class="detail-item">
                        <div class="num wrong-color">${total - correct}</div>
                        <div class="label">ตอบผิด</div>
                    </div>
                </div>
                <button class="btn btn-outline" onclick="quiz.retry()">&#128260; ทำใหม่</button>
            `;
            resultsEl.classList.add('show');
            resultsEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        document.getElementById('submitQuiz').style.display = 'none';

        ProgressTracker.updateSubject(this.subject, correct, total);

        if (typeof recordQuizResult === 'function') {
            recordQuizResult(this.subject, correct, total);
        }
    }

    retry() {
        this.answers = {};
        this.submitted = false;
        this.render();
        this.container.scrollIntoView({ behavior: 'smooth' });
    }
}

// ===== TABS =====
function initTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const group = btn.closest('.lesson-tabs')?.parentElement;
            if (!group) return;

            group.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            group.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            const target = document.getElementById(btn.dataset.tab);
            target?.classList.add('active');
        });
    });
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    createParticles();
    animateCounters();
    initScrollAnimations();
    initTabs();
    ProgressTracker.updateUI();
});
