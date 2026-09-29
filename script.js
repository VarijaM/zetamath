// Game State Management
class ZetaMathGame {
    constructor() {
        this.currentMode = null;
        this.currentTimeLimit = null;
        this.gameActive = false;
        this.currentQuestion = null;
        this.currentAnswer = null;
        this.score = 0;
        this.questionNumber = 1;
        this.startTime = null;
        this.questionStartTime = null;
        this.timeRemaining = 0;
        this.timer = null;
        this.feedbackTimer = null;
        this.endAt = null;
        this.acceptingAnswers = false;
        this.gameData = [];
        this.currentSession = {
            mode: null,
            timeLimit: null,
            questions: [],
            startTime: null,
            endTime: null
        };
        
        this.modes = {
            easy: ZetaMathLogic.PRESET_MODES.easy,
            medium: ZetaMathLogic.PRESET_MODES.medium,
            hard: ZetaMathLogic.PRESET_MODES.hard,
            free: {
                operations: ['addition', 'subtraction', 'multiplication', 'division'],
                ranges: {}
            }
        };
        
        this.initializeEventListeners();
        this.loadProgress();
    }
    
    initializeEventListeners() {
        // Mode selection
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => this.selectMode(btn.dataset.mode));
        });
        
        // Time selection
        document.querySelectorAll('.time-btn').forEach(btn => {
            btn.addEventListener('click', () => this.selectTime(parseInt(btn.dataset.time)));
        });
        
        // Navigation buttons
        document.getElementById('start-game-btn').addEventListener('click', () => this.startGame());
        document.getElementById('view-progress-btn').addEventListener('click', () => this.showProgress());
        document.getElementById('practice-drill-btn').addEventListener('click', () => this.showPracticeDrill());
        
        // Free mode configuration
        document.getElementById('back-to-menu').addEventListener('click', () => this.showScreen('main-menu'));
        document.getElementById('start-free-game').addEventListener('click', () => this.startFreeGame());
        
        // Game controls
        document.getElementById('answer-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.submitAnswer();
        });
        document.getElementById('submit-answer').addEventListener('click', () => this.submitAnswer());
        document.getElementById('end-round-btn').addEventListener('click', () => this.endGame());
        
        // Results screen
        document.getElementById('play-again').addEventListener('click', () => this.playAgain());
        document.getElementById('back-to-main').addEventListener('click', () => this.showScreen('main-menu'));
        document.getElementById('view-detailed-progress').addEventListener('click', () => this.showProgress());
        
        // Progress screen
        document.getElementById('back-from-progress').addEventListener('click', () => this.showScreen('main-menu'));
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });
        
        // Practice drill
        document.getElementById('start-ai-drill').addEventListener('click', () => this.startAIPracticeDrill());
        document.getElementById('start-wrong-questions-drill').addEventListener('click', () => this.startWrongQuestionsDrill());
        document.getElementById('clear-wrong-questions').addEventListener('click', () => this.clearWrongQuestionsConfirm());
        document.getElementById('back-from-drill').addEventListener('click', () => this.showScreen('main-menu'));
        
        // Practice time selection
        document.querySelectorAll('.practice-time-btn').forEach(btn => {
            btn.addEventListener('click', () => this.selectPracticeTime(parseInt(btn.dataset.time)));
        });
    }
    
    selectMode(mode) {
        this.currentMode = mode;
        document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('selected'));
        document.querySelector(`[data-mode="${mode}"]`).classList.add('selected');
        
        if (mode === 'free') {
            this.showScreen('free-mode-config');
        } else {
            this.checkStartGameButton();
        }
    }
    
    selectTime(time) {
        this.currentTimeLimit = time;
        document.querySelectorAll('.time-btn').forEach(btn => {
            btn.classList.toggle('selected', Number(btn.dataset.time) === time);
        });
        this.checkStartGameButton();
    }
    
    checkStartGameButton() {
        const startBtn = document.getElementById('start-game-btn');
        if (this.currentMode && this.currentTimeLimit && this.currentMode !== 'free') {
            startBtn.disabled = false;
        } else {
            startBtn.disabled = true;
        }
    }
    
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
    }
    
    startGame(options = {}) {
        if (!this.currentMode || !this.currentTimeLimit) return;

        // A normal start passes no options, so a previous drill cannot leak in.
        // Drills pass the mode and focus they want for this round only.
        const flags = ZetaMathLogic.resolveStartOptions(options);
        this.focusOperation = flags.focusOperation;
        this.practiceMode = flags.practiceMode;
        
        this.resetGame();
        this.currentSession = {
            mode: this.currentMode,
            timeLimit: this.currentTimeLimit,
            questions: [],
            startTime: Date.now(),
            endTime: null
        };
        
        this.showScreen('game-screen');
        this.startTimer();
        this.generateNextQuestion();
        document.getElementById('answer-input').focus();
    }
    
    readInput(id) {
        return document.getElementById(id).value;
    }

    validateFreeConfig(config) {
        return ZetaMathLogic.validateFreeConfig(config);
    }

    startFreeGame() {
        const operations = [];
        if (document.getElementById('add-check').checked) operations.push('addition');
        if (document.getElementById('sub-check').checked) operations.push('subtraction');
        if (document.getElementById('mul-check').checked) operations.push('multiplication');
        if (document.getElementById('div-check').checked) operations.push('division');

        const parsed = this.validateFreeConfig({
            operations,
            timeLimit: this.currentTimeLimit,
            ranges: {
                addition: { min: this.readInput('add-min'), max: this.readInput('add-max') },
                subtraction: { min: this.readInput('sub-min'), max: this.readInput('sub-max') },
                multiplication: {
                    factor1: { min: this.readInput('mul-min1'), max: this.readInput('mul-max1') },
                    factor2: { min: this.readInput('mul-min2'), max: this.readInput('mul-max2') }
                }
            }
        });

        if (!parsed.ok) {
            alert(parsed.message);
            return;
        }

        this.modes.free.operations = parsed.operations;
        this.modes.free.ranges = parsed.ranges;
        this.currentMode = 'free';
        this.currentTimeLimit = parsed.timeLimit;
        this.startGame();
    }
    
    resetGame() {
        this.gameActive = true;
        this.score = 0;
        this.questionNumber = 1;
        this.gameData = [];
        this.timeRemaining = this.currentTimeLimit;
        
        document.getElementById('current-score').textContent = '0';
        document.getElementById('question-number').textContent = '1';
        document.getElementById('time-remaining').textContent = this.timeRemaining;
        document.getElementById('feedback').textContent = '';
        document.getElementById('feedback').className = '';
        const answerInput = document.getElementById('answer-input');
        answerInput.value = '';
        answerInput.disabled = false;
        document.getElementById('submit-answer').disabled = false;
        this.acceptingAnswers = true;
        if (this.feedbackTimer) {
            clearTimeout(this.feedbackTimer);
            this.feedbackTimer = null;
        }
        document.querySelector('#game-screen .timer').classList.remove('low');
    }
    
    clearTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    remainingSeconds(endAt, now) {
        return ZetaMathLogic.remainingSeconds(endAt, now);
    }

    isLowTime(secondsRemaining) {
        return ZetaMathLogic.isLowTime(secondsRemaining, this.currentTimeLimit);
    }

    updateTimerDisplay() {
        document.getElementById('time-remaining').textContent = String(this.timeRemaining);
        document.querySelector('#game-screen .timer').classList.toggle('low', this.isLowTime(this.timeRemaining));
    }

    startTimer() {
        this.clearTimer();
        this.endAt = Date.now() + this.currentTimeLimit * 1000;
        const tick = () => {
            if (!this.gameActive) return;
            this.timeRemaining = this.remainingSeconds(this.endAt, Date.now());
            this.updateTimerDisplay();
            if (this.timeRemaining <= 0) {
                this.endGame();
            }
        };
        tick();
        this.timer = setInterval(tick, 200);
    }
    
    generateNextQuestion() {
        if (!this.gameActive) return;
        this.questionStartTime = Date.now();
        
        // Check if we're in wrong questions practice mode
        if (this.practiceMode === 'wrong-questions') {
            this.generateWrongQuestionForPractice();
            return;
        }
        
        // Regular question generation
        this.generateRegularQuestion();
    }
    
    parseNumericAnswer(raw) {
        return ZetaMathLogic.parseNumericAnswer(raw);
    }

    setAnsweringEnabled(enabled) {
        this.acceptingAnswers = enabled;
        document.getElementById('answer-input').disabled = !enabled;
        document.getElementById('submit-answer').disabled = !enabled;
    }

    submitAnswer() {
        if (!this.gameActive || !this.acceptingAnswers || !this.currentQuestion) return;

        const userAnswer = this.parseNumericAnswer(document.getElementById('answer-input').value);
        if (userAnswer === null) {
            const feedback = document.getElementById('feedback');
            feedback.textContent = 'Enter a whole number';
            feedback.className = 'feedback-incorrect';
            return;
        }

        this.setAnsweringEnabled(false);
        const correctAnswer = this.currentQuestion.answer;
        const timeSpent = (Date.now() - this.questionStartTime) / 1000;
        const correct = userAnswer === correctAnswer;

        const questionData = {
            ...this.currentQuestion,
            userAnswer,
            timeSpent,
            correct,
            questionNumber: this.questionNumber
        };
        
        this.gameData.push(questionData);
        this.currentSession.questions.push(questionData);
        this.recordAnswerForPractice(questionData, correct);
        
        const feedback = document.getElementById('feedback');
        if (correct) {
            this.score++;
            document.getElementById('current-score').textContent = this.score;
            feedback.textContent = 'Correct!';
            feedback.className = 'feedback-correct';
            document.getElementById('question-display').classList.add('pulse');
            this.scheduleAdvance(200);
        } else {
            feedback.textContent = `Incorrect! Answer was ${correctAnswer}`;
            feedback.className = 'feedback-incorrect';
            document.getElementById('answer-input').classList.add('shake');
            this.scheduleAdvance(1000);
        }
    }

    scheduleAdvance(delay) {
        if (this.feedbackTimer) clearTimeout(this.feedbackTimer);
        this.feedbackTimer = setTimeout(() => {
            this.feedbackTimer = null;
            if (!this.gameActive) return;
            document.getElementById('question-display').classList.remove('pulse');
            document.getElementById('answer-input').classList.remove('shake');
            this.setAnsweringEnabled(true);
            this.questionNumber++;
            document.getElementById('question-number').textContent = this.questionNumber;
            document.getElementById('feedback').textContent = '';
            document.getElementById('feedback').className = '';
            this.generateNextQuestion();
        }, delay);
    }
    
    endGame() {
        if (!this.gameActive) return;
        this.gameActive = false;
        this.acceptingAnswers = false;
        this.clearTimer();
        if (this.feedbackTimer) {
            clearTimeout(this.feedbackTimer);
            this.feedbackTimer = null;
        }
        const timerBox = document.querySelector('#game-screen .timer');
        if (timerBox) timerBox.classList.remove('low');
        this.currentSession.endTime = Date.now();
        
        this.saveGameSession();
        this.showGameResults();
        this.showScreen('results-screen');
    }
    
    showGameResults() {
        const stats = ZetaMathLogic.sessionStats(this.gameData);
        const totalQuestions = stats.total;
        const accuracy = stats.accuracy;
        const avgTime = totalQuestions > 0 ? stats.avgTime.toFixed(1) : '0.0';
        
        document.getElementById('final-score').textContent = this.score;
        document.getElementById('total-questions').textContent = totalQuestions;
        document.getElementById('accuracy').textContent = `${accuracy}%`;
        document.getElementById('avg-time').textContent = `${avgTime}s`;
        
        // Show detailed results
        const detailsContainer = document.getElementById('question-details');
        detailsContainer.innerHTML = '';
        
        this.gameData.forEach((question, index) => {
            const div = document.createElement('div');
            div.className = 'question-detail';
            div.innerHTML = `
                <span>Q${index + 1}: ${question.display.replace(' = ?', '')} = ${question.answer}</span>
                <span>Your: ${question.userAnswer}</span>
                <span style="color: ${question.correct ? '#38a169' : '#e53e3e'}">${question.timeSpent.toFixed(1)}s</span>
            `;
            detailsContainer.appendChild(div);
        });
    }
    
    playAgain() {
        this.showScreen('main-menu');
    }
    
    saveGameSession() {
        const gameHistory = this.loadProgress();
        gameHistory.push(this.currentSession);
        localStorage.setItem(
            'zetamath_history',
            JSON.stringify(ZetaMathLogic.capList(gameHistory, ZetaMathLogic.HISTORY_LIMIT))
        );
    }
    
    loadProgress() {
        return ZetaMathLogic.safeParseJSON(localStorage.getItem('zetamath_history'), []);
    }
    
    showProgress() {
        this.showScreen('progress-screen');
        this.updateProgressData();
    }
    
    updateProgressData() {
        const history = this.loadProgress();
        
        if (history.length === 0) {
            this.showNoDataMessage();
            return;
        }
        
        // Calculate overall stats
        const totalGames = history.length;
        let bestScore = 0;
        let totalAccuracy = 0;
        let fastestAnswer = Infinity;
        
        history.forEach(session => {
            const correctAnswers = session.questions.filter(q => q.correct).length;
            bestScore = Math.max(bestScore, correctAnswers);
            
            const sessionAccuracy = session.questions.length > 0 ? 
                (correctAnswers / session.questions.length) * 100 : 0;
            totalAccuracy += sessionAccuracy;
            
            session.questions.forEach(q => {
                if (q.correct && q.timeSpent < fastestAnswer) {
                    fastestAnswer = q.timeSpent;
                }
            });
        });
        
        const avgAccuracy = Math.round(totalAccuracy / totalGames);
        
        document.getElementById('total-games').textContent = totalGames;
        document.getElementById('best-score').textContent = bestScore;
        document.getElementById('avg-accuracy').textContent = `${avgAccuracy}%`;
        document.getElementById('fastest-answer').textContent = 
            fastestAnswer === Infinity ? 'N/A' : `${fastestAnswer.toFixed(1)}s`;
        
        this.createOverviewChart(history);
        this.createOperationChart(history);
        this.createTimeChart(history);
    }
    
    createOverviewChart(history) {
        const ctx = document.getElementById('overview-chart').getContext('2d');
        
        // Clear existing chart
        if (window.overviewChart) {
            window.overviewChart.destroy();
        }
        
        const last10Sessions = history.slice(-10);
        const labels = last10Sessions.map((_, index) => `Game ${index + 1}`);
        const scores = last10Sessions.map(session => 
            session.questions.filter(q => q.correct).length
        );
        const accuracies = last10Sessions.map(session => {
            const total = session.questions.length;
            const correct = session.questions.filter(q => q.correct).length;
            return total > 0 ? Math.round((correct / total) * 100) : 0;
        });
        
        window.overviewChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Score',
                    data: scores,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    yAxisID: 'y'
                }, {
                    label: 'Accuracy (%)',
                    data: accuracies,
                    borderColor: '#38a169',
                    backgroundColor: 'rgba(56, 161, 105, 0.1)',
                    yAxisID: 'y1'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: { 
                            display: true, 
                            text: 'Score',
                            font: { family: 'Work Sans', size: 14 }
                        },
                        ticks: {
                            font: { family: 'Work Sans' }
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: { 
                            display: true, 
                            text: 'Accuracy (%)',
                            font: { family: 'Work Sans', size: 14 }
                        },
                        grid: { drawOnChartArea: false },
                        ticks: {
                            font: { family: 'Work Sans' }
                        }
                    },
                    x: {
                        ticks: {
                            font: { family: 'Work Sans' }
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            font: { family: 'Work Sans' }
                        }
                    },
                    tooltip: {
                        titleFont: { family: 'Work Sans' },
                        bodyFont: { family: 'Work Sans' }
                    }
                }
            }
        });
    }
    
    createOperationChart(history) {
        this.createOperationAccuracyChart(history);
        this.createOperationTimeChart(history);
    }
    
    createOperationAccuracyChart(history) {
        const ctx = document.getElementById('operation-accuracy-chart').getContext('2d');
        
        if (window.operationAccuracyChart) {
            window.operationAccuracyChart.destroy();
        }
        
        const operationStats = {
            addition: { total: 0, correct: 0, totalTime: 0 },
            subtraction: { total: 0, correct: 0, totalTime: 0 },
            multiplication: { total: 0, correct: 0, totalTime: 0 },
            division: { total: 0, correct: 0, totalTime: 0 }
        };
        
        history.forEach(session => {
            session.questions.forEach(q => {
                const op = q.operation;
                operationStats[op].total++;
                if (q.correct) operationStats[op].correct++;
                operationStats[op].totalTime += q.timeSpent;
            });
        });
        
        const labels = Object.keys(operationStats).map(op => 
            op.charAt(0).toUpperCase() + op.slice(1)
        );
        const accuracies = Object.values(operationStats).map(stat => 
            stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0
        );
        
        window.operationAccuracyChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Accuracy (%)',
                    data: accuracies,
                    backgroundColor: [
                        'rgba(72, 187, 120, 0.8)',   // Addition - Green
                        'rgba(237, 137, 54, 0.8)',   // Subtraction - Orange
                        'rgba(229, 62, 62, 0.8)',    // Multiplication - Red
                        'rgba(159, 122, 234, 0.8)'   // Division - Purple
                    ],
                    borderColor: [
                        '#48bb78',
                        '#ed8936', 
                        '#e53e3e',
                        '#9f7aea'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        top: 20,
                        bottom: 20
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: { 
                            display: true, 
                            text: 'Accuracy (%)',
                            font: { family: 'Work Sans', size: 14 }
                        },
                        ticks: {
                            font: { family: 'Work Sans' }
                        }
                    },
                    x: {
                        ticks: {
                            font: { family: 'Work Sans' }
                        }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        titleFont: { family: 'Work Sans' },
                        bodyFont: { family: 'Work Sans' },
                        callbacks: {
                            afterBody: function(context) {
                                const opIndex = context[0].dataIndex;
                                const operations = Object.keys(operationStats);
                                const stat = operationStats[operations[opIndex]];
                                return [
                                    `Correct: ${stat.correct}/${stat.total}`,
                                    `Questions practiced: ${stat.total}`
                                ];
                            }
                        }
                    }
                }
            }
        });
    }
    
    createOperationTimeChart(history) {
        const ctx = document.getElementById('operation-time-chart').getContext('2d');
        
        if (window.operationTimeChart) {
            window.operationTimeChart.destroy();
        }
        
        const operationStats = {
            addition: { total: 0, correct: 0, totalTime: 0 },
            subtraction: { total: 0, correct: 0, totalTime: 0 },
            multiplication: { total: 0, correct: 0, totalTime: 0 },
            division: { total: 0, correct: 0, totalTime: 0 }
        };
        
        history.forEach(session => {
            session.questions.forEach(q => {
                const op = q.operation;
                operationStats[op].total++;
                if (q.correct) operationStats[op].correct++;
                operationStats[op].totalTime += q.timeSpent;
            });
        });
        
        const labels = Object.keys(operationStats).map(op => 
            op.charAt(0).toUpperCase() + op.slice(1)
        );
        const avgTimes = Object.values(operationStats).map(stat => 
            stat.total > 0 ? (stat.totalTime / stat.total).toFixed(1) : 0
        );
        
        window.operationTimeChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Average Time (seconds)',
                    data: avgTimes,
                    backgroundColor: [
                        'rgba(72, 187, 120, 0.8)',   // Addition - Green
                        'rgba(237, 137, 54, 0.8)',   // Subtraction - Orange
                        'rgba(229, 62, 62, 0.8)',    // Multiplication - Red
                        'rgba(159, 122, 234, 0.8)'   // Division - Purple
                    ],
                    borderColor: [
                        '#48bb78',
                        '#ed8936', 
                        '#e53e3e',
                        '#9f7aea'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        top: 20,
                        bottom: 20
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { 
                            display: true, 
                            text: 'Average Time (seconds)',
                            font: { family: 'Work Sans', size: 14 }
                        },
                        ticks: {
                            font: { family: 'Work Sans' }
                        }
                    },
                    x: {
                        ticks: {
                            font: { family: 'Work Sans' }
                        }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        titleFont: { family: 'Work Sans' },
                        bodyFont: { family: 'Work Sans' },
                        callbacks: {
                            afterBody: function(context) {
                                const opIndex = context[0].dataIndex;
                                const operations = Object.keys(operationStats);
                                const stat = operationStats[operations[opIndex]];
                                return [
                                    `Total time: ${stat.totalTime.toFixed(1)}s`,
                                    `Questions: ${stat.total}`
                                ];
                            }
                        }
                    }
                }
            }
        });
    }
    
    createTimeChart(history) {
        const ctx = document.getElementById('time-chart').getContext('2d');
        
        if (window.timeChart) {
            window.timeChart.destroy();
        }
        
        const timeStats = {};
        
        history.forEach(session => {
            const timeLimit = session.timeLimit;
            if (!timeStats[timeLimit]) {
                timeStats[timeLimit] = { 
                    total: 0, 
                    correct: 0, 
                    totalQuestions: 0,
                    sessions: 0,
                    bestScore: 0
                };
            }
            const correctAnswers = session.questions.filter(q => q.correct).length;
            timeStats[timeLimit].total += session.questions.length;
            timeStats[timeLimit].correct += correctAnswers;
            timeStats[timeLimit].totalQuestions += session.questions.length;
            timeStats[timeLimit].sessions++;
            timeStats[timeLimit].bestScore = Math.max(timeStats[timeLimit].bestScore, correctAnswers);
        });
        
        const sortedTimes = Object.keys(timeStats).sort((a, b) => a - b);
        const labels = sortedTimes.map(time => {
            const t = parseInt(time);
            return t >= 60 ? `${Math.floor(t/60)}m` : `${t}s`;
        });
        
        const accuracies = sortedTimes.map(time => {
            const stat = timeStats[time];
            return stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;
        });
        
        const avgScores = sortedTimes.map(time => {
            const stat = timeStats[time];
            return stat.sessions > 0 ? Math.round(stat.correct / stat.sessions) : 0;
        });
        
        window.timeChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Average Score',
                    data: avgScores,
                    backgroundColor: 'rgba(102, 126, 234, 0.8)',
                    borderColor: '#667eea',
                    borderWidth: 2,
                    yAxisID: 'y'
                }, {
                    label: 'Accuracy (%)',
                    data: accuracies,
                    backgroundColor: 'rgba(56, 161, 105, 0.8)',
                    borderColor: '#38a169',
                    borderWidth: 2,
                    yAxisID: 'y1'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: { display: true, text: 'Average Score' },
                        beginAtZero: true
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: { display: true, text: 'Accuracy (%)' },
                        grid: { drawOnChartArea: false },
                        beginAtZero: true,
                        max: 100
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Performance by Time Mode',
                        font: { family: 'Work Sans', size: 16 }
                    },
                    legend: {
                        labels: {
                            font: { family: 'Work Sans' }
                        }
                    },
                    tooltip: {
                        titleFont: { family: 'Work Sans' },
                        bodyFont: { family: 'Work Sans' },
                        callbacks: {
                            afterBody: function(context) {
                                const timeLimit = sortedTimes[context[0].dataIndex];
                                const stat = timeStats[timeLimit];
                                return [
                                    `Sessions played: ${stat.sessions}`,
                                    `Best score: ${stat.bestScore}`,
                                    `Total questions: ${stat.totalQuestions}`
                                ];
                            }
                        }
                    }
                }
            }
        });
    }
    
    showNoDataMessage() {
        document.getElementById('overview-chart').style.display = 'none';
        // Add no data message
    }
    
    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}-tab`).classList.add('active');
    }
    
    selectPracticeTime(time) {
        this.currentPracticeTimeLimit = time;
        document.querySelectorAll('.practice-time-btn').forEach(btn => {
            btn.classList.toggle('selected', Number(btn.dataset.time) === time);
        });
    }
    
    showPracticeDrill() {
        const recommendation = this.generateRecommendation();
        document.getElementById('drill-description').innerHTML = recommendation.description;
        this.currentDrillConfig = recommendation.config;
        
        // Set default practice time if not set
        if (!this.currentPracticeTimeLimit) {
            this.currentPracticeTimeLimit = 60; // Default to 60 seconds
        }
        
        // Update practice time button selection only. Main-menu time buttons
        // share the same data-time values, so a document-wide query would
        // highlight those instead.
        document.querySelectorAll('.practice-time-btn').forEach(btn => {
            btn.classList.toggle('selected', Number(btn.dataset.time) === this.currentPracticeTimeLimit);
        });
        
        // Update wrong questions info
        const wrongQuestions = this.getWrongQuestions();
        const countElement = document.getElementById('wrong-questions-count');
        const wrongQuestionsBtn = document.getElementById('start-wrong-questions-drill');
        
        if (wrongQuestions.length === 0) {
            countElement.textContent = "You have no wrong questions to practice yet";
            countElement.style.color = "#38a169";
            wrongQuestionsBtn.disabled = true;
            wrongQuestionsBtn.textContent = "No Wrong Questions Available";
        } else {
            countElement.textContent = `You have ${wrongQuestions.length} wrong questions to practice`;
            countElement.style.color = "#e53e3e";
            wrongQuestionsBtn.disabled = false;
            wrongQuestionsBtn.textContent = "Practice Wrong Questions";
        }
        
        this.showScreen('practice-drill-screen');
    }
    
    generateRecommendation() {
        const history = this.loadProgress();
        
        if (history.length === 0) {
            return {
                description: `<h3>Welcome to ZetaMath!</h3>
                <p>Since you're just starting out, I recommend beginning with <strong>Easy mode</strong> for 60 seconds to get familiar with the game mechanics.</p>
                <p>This will help establish a baseline for your arithmetic skills across all operations.</p>`,
                config: { mode: 'easy', focus: 'all' }
            };
        }
        
        // Analyze performance data
        const operationStats = {
            addition: { total: 0, correct: 0, totalTime: 0 },
            subtraction: { total: 0, correct: 0, totalTime: 0 },
            multiplication: { total: 0, correct: 0, totalTime: 0 },
            division: { total: 0, correct: 0, totalTime: 0 }
        };
        
        history.forEach(session => {
            session.questions.forEach(q => {
                const op = q.operation;
                operationStats[op].total++;
                if (q.correct) operationStats[op].correct++;
                operationStats[op].totalTime += q.timeSpent;
            });
        });
        
        // Find weakest areas
        let weakestOperation = null;
        let lowestAccuracy = 100;
        let slowestOperation = null;
        let slowestTime = 0;
        
        Object.keys(operationStats).forEach(op => {
            const stat = operationStats[op];
            if (stat.total > 0) {
                const accuracy = (stat.correct / stat.total) * 100;
                const avgTime = stat.totalTime / stat.total;
                
                if (accuracy < lowestAccuracy) {
                    lowestAccuracy = accuracy;
                    weakestOperation = op;
                }
                
                if (avgTime > slowestTime) {
                    slowestTime = avgTime;
                    slowestOperation = op;
                }
            }
        });
        
        // Generate recommendation
        let recommendation;
        let focusOperation = 'all';
        
        if (weakestOperation && lowestAccuracy < 80) {
            recommendation = `<h3>Accuracy Focus Recommended</h3>
            <p>Your <strong>${weakestOperation}</strong> accuracy is ${Math.round(lowestAccuracy)}%, which could use improvement.</p>
            <p>I recommend focused practice on ${weakestOperation} problems to build confidence and accuracy.</p>`;
            focusOperation = weakestOperation;
        } else if (slowestOperation && slowestTime > 3) {
            recommendation = `<h3>Speed Training Recommended</h3>
            <p>Your <strong>${slowestOperation}</strong> average time is ${slowestTime.toFixed(1)}s, which is slower than optimal.</p>
            <p>Let's work on speed drills for ${slowestOperation} to improve your reaction time.</p>`;
            focusOperation = slowestOperation;
        } else {
            recommendation = `<h3>Well-Rounded Practice</h3>
            <p>Great job! Your performance is solid across all operations.</p>
            <p>I recommend mixed practice to maintain your skills and continue improving overall speed.</p>`;
        }
        
        return {
            description: recommendation,
            config: { 
                mode: this.getRecommendedMode(history), 
                focus: focusOperation 
            }
        };
    }
    
    getRecommendedMode(history) {
        // Analyze recent performance to suggest appropriate difficulty
        const recentSessions = history.slice(-5);
        let totalAccuracy = 0;
        let sessionCount = 0;
        
        recentSessions.forEach(session => {
            if (session.questions.length > 0) {
                const correct = session.questions.filter(q => q.correct).length;
                totalAccuracy += (correct / session.questions.length) * 100;
                sessionCount++;
            }
        });
        
        const avgAccuracy = sessionCount > 0 ? totalAccuracy / sessionCount : 70;
        
        if (avgAccuracy >= 90) return 'hard';
        if (avgAccuracy >= 75) return 'medium';
        return 'easy';
    }
    
    startAIPracticeDrill() {
        if (!this.currentPracticeTimeLimit) {
            alert('Please select a practice duration!');
            return;
        }
        
        // Set up drill based on the recommendation. Flags are applied inside
        // startGame so they cannot be left over from a previous round.
        this.currentMode = this.currentDrillConfig.mode;
        this.currentTimeLimit = this.currentPracticeTimeLimit;
        const focus = this.currentDrillConfig.focus !== 'all' ? this.currentDrillConfig.focus : null;
        this.startGame({
            practiceMode: 'recommended',
            focusOperation: focus
        });
    }
    
    startWrongQuestionsDrill() {
        const wrongQuestions = this.getWrongQuestions();
        if (wrongQuestions.length === 0) {
            alert('No wrong questions available to practice!');
            return;
        }
        
        if (!this.currentPracticeTimeLimit) {
            alert('Please select a practice duration!');
            return;
        }
        
        // Set up drill for wrong questions
        this.currentMode = 'medium'; // Default difficulty for wrong questions
        this.currentTimeLimit = this.currentPracticeTimeLimit;
        this.startGame({ practiceMode: 'wrong-questions' });
    }
    
    clearWrongQuestionsConfirm() {
        const wrongQuestions = this.getWrongQuestions();
        if (wrongQuestions.length === 0) {
            alert('No wrong questions to clear!');
            return;
        }
        
        if (confirm(`Are you sure you want to clear all ${wrongQuestions.length} wrong questions? This cannot be undone.`)) {
            this.clearWrongQuestions();
            this.showPracticeDrill(); // Refresh the screen
            alert('Wrong questions cleared successfully!');
        }
    }
    
    rememberWrongQuestion(list, question, now) {
        return ZetaMathLogic.rememberWrongQuestion(list, question, now);
    }

    applyPracticeResult(list, question, correct, now) {
        return ZetaMathLogic.applyPracticeResult(list, question, correct, now);
    }

    pickPracticeQuestion(list) {
        return ZetaMathLogic.pickPracticeQuestion(list);
    }

    recordAnswerForPractice(questionData, correct) {
        const list = this.getWrongQuestions();
        const next = this.practiceMode === 'wrong-questions'
            ? this.applyPracticeResult(list, questionData, correct)
            : (correct ? list : this.rememberWrongQuestion(list, questionData));
        localStorage.setItem('zetamath_wrong_questions', JSON.stringify(next));
    }

    getWrongQuestions() {
        return ZetaMathLogic.safeParseJSON(localStorage.getItem('zetamath_wrong_questions'), []);
    }
    
    clearWrongQuestions() {
        localStorage.removeItem('zetamath_wrong_questions');
    }
    
    generateWrongQuestionForPractice() {
        const selectedQuestion = this.pickPracticeQuestion(this.getWrongQuestions());
        
        if (!selectedQuestion) {
            return this.generateRegularQuestion();
        }
        
        this.currentQuestion = {
            operation: selectedQuestion.operation,
            num1: selectedQuestion.num1,
            num2: selectedQuestion.num2,
            answer: selectedQuestion.answer,
            display: selectedQuestion.display,
            isFromWrongQuestions: true
        };
        
        document.getElementById('question-display').textContent = this.currentQuestion.display;
        document.getElementById('answer-input').value = '';
        document.getElementById('answer-input').focus();
    }
    
    generateRegularQuestion() {
        this.currentQuestion = ZetaMathLogic.generateQuestion({
            mode: this.currentMode,
            modes: this.modes,
            focusOperation: this.focusOperation
        });
        document.getElementById('question-display').textContent = this.currentQuestion.display;
        document.getElementById('answer-input').value = '';
        document.getElementById('answer-input').focus();
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.zetaMathGame = new ZetaMathGame();
}); 