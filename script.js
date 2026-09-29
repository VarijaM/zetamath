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
        this.gameData = [];
        this.currentSession = {
            mode: null,
            timeLimit: null,
            questions: [],
            startTime: null,
            endTime: null
        };
        
        // Game mode configurations
        this.modes = {
            easy: {
                addition: { min: 2, max: 60 },
                subtraction: { min: 2, max: 60 },
                multiplication: { factor1: { min: 2, max: 12 }, factor2: { min: 2, max: 20 } }
            },
            medium: {
                addition: { min: 2, max: 100 },
                subtraction: { min: 2, max: 100 },
                multiplication: { factor1: { min: 2, max: 12 }, factor2: { min: 2, max: 100 } }
            },
            hard: {
                addition: { min: 2, max: 300 },
                subtraction: { min: 2, max: 300 },
                multiplication: { factor1: { min: 2, max: 20 }, factor2: { min: 2, max: 200 } }
            },
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
        this.focusOperation = options.focusOperation || null;
        this.practiceMode = options.practiceMode || null;
        
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
    
    startFreeGame() {
        // Get free mode configuration
        const operations = [];
        if (document.getElementById('add-check').checked) operations.push('addition');
        if (document.getElementById('sub-check').checked) operations.push('subtraction');
        if (document.getElementById('mul-check').checked) operations.push('multiplication');
        if (document.getElementById('div-check').checked) operations.push('division');
        
        if (operations.length === 0) {
            alert('Please select at least one operation!');
            return;
        }
        
        // Get ranges
        this.modes.free.operations = operations;
        this.modes.free.ranges = {
            addition: {
                min: parseInt(document.getElementById('add-min').value),
                max: parseInt(document.getElementById('add-max').value)
            },
            subtraction: {
                min: parseInt(document.getElementById('sub-min').value),
                max: parseInt(document.getElementById('sub-max').value)
            },
            multiplication: {
                factor1: {
                    min: parseInt(document.getElementById('mul-min1').value),
                    max: parseInt(document.getElementById('mul-max1').value)
                },
                factor2: {
                    min: parseInt(document.getElementById('mul-min2').value),
                    max: parseInt(document.getElementById('mul-max2').value)
                }
            }
        };
        
        this.currentMode = 'free';
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
        document.getElementById('answer-input').value = '';
    }
    
    startTimer() {
        this.timer = setInterval(() => {
            this.timeRemaining--;
            document.getElementById('time-remaining').textContent = this.timeRemaining;
            
            if (this.timeRemaining <= 0) {
                this.endGame();
            }
        }, 1000);
    }
    
    generateNextQuestion() {
        this.questionStartTime = Date.now();
        
        // Check if we're in wrong questions practice mode
        if (this.practiceMode === 'wrong-questions') {
            this.generateWrongQuestionForPractice();
            return;
        }
        
        // Regular question generation
        this.generateRegularQuestion();
    }
    
    submitAnswer() {
        if (!this.gameActive) return;
        
        const userAnswer = parseInt(document.getElementById('answer-input').value);
        const correctAnswer = this.currentQuestion.answer;
        const timeSpent = (Date.now() - this.questionStartTime) / 1000;
        
        const questionData = {
            ...this.currentQuestion,
            userAnswer,
            timeSpent,
            correct: userAnswer === correctAnswer,
            questionNumber: this.questionNumber
        };
        
        this.gameData.push(questionData);
        this.currentSession.questions.push(questionData);
        
        // Store wrong questions for practice
        if (!questionData.correct) {
            this.saveWrongQuestion(questionData);
        }
        
        if (userAnswer === correctAnswer) {
            this.score++;
            document.getElementById('current-score').textContent = this.score;
            document.getElementById('feedback').textContent = 'Correct!';
            document.getElementById('feedback').className = 'feedback-correct';
            document.getElementById('question-display').classList.add('pulse');
            
            // Immediately move to next question
            setTimeout(() => {
                document.getElementById('question-display').classList.remove('pulse');
                this.questionNumber++;
                document.getElementById('question-number').textContent = this.questionNumber;
                this.generateNextQuestion();
                document.getElementById('feedback').textContent = '';
            }, 200);
            
        } else {
            document.getElementById('feedback').textContent = `Incorrect! Answer was ${correctAnswer}`;
            document.getElementById('feedback').className = 'feedback-incorrect';
            document.getElementById('answer-input').classList.add('shake');
            
            setTimeout(() => {
                document.getElementById('answer-input').classList.remove('shake');
                this.questionNumber++;
                document.getElementById('question-number').textContent = this.questionNumber;
                this.generateNextQuestion();
                document.getElementById('feedback').textContent = '';
            }, 1000);
        }
    }
    
    endGame() {
        this.gameActive = false;
        clearInterval(this.timer);
        this.currentSession.endTime = Date.now();
        
        this.saveGameSession();
        this.showGameResults();
        this.showScreen('results-screen');
    }
    
    showGameResults() {
        const totalQuestions = this.gameData.length;
        const correctAnswers = this.gameData.filter(q => q.correct).length;
        const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
        const totalTime = this.gameData.reduce((sum, q) => sum + q.timeSpent, 0);
        const avgTime = totalQuestions > 0 ? (totalTime / totalQuestions).toFixed(1) : '0.0';
        
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
                <span>Your: ${question.userAnswer || 'No answer'}</span>
                <span style="color: ${question.correct ? '#38a169' : '#e53e3e'}">${question.timeSpent.toFixed(1)}s</span>
            `;
            detailsContainer.appendChild(div);
        });
    }
    
    playAgain() {
        this.showScreen('main-menu');
    }
    
    saveGameSession() {
        let gameHistory = JSON.parse(localStorage.getItem('zetamath_history') || '[]');
        gameHistory.push(this.currentSession);
        
        // Keep only last 100 sessions to prevent storage overflow
        if (gameHistory.length > 100) {
            gameHistory = gameHistory.slice(-100);
        }
        
        localStorage.setItem('zetamath_history', JSON.stringify(gameHistory));
    }
    
    loadProgress() {
        const history = JSON.parse(localStorage.getItem('zetamath_history') || '[]');
        return history;
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
        let recommendation = '';
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
    
    saveWrongQuestion(questionData) {
        let wrongQuestions = JSON.parse(localStorage.getItem('zetamath_wrong_questions') || '[]');
        
        // Add the wrong question with timestamp
        const wrongQuestion = {
            ...questionData,
            timestamp: Date.now(),
            practiceCount: 0
        };
        
        wrongQuestions.push(wrongQuestion);
        
        // Keep only last 50 wrong questions to prevent storage overflow
        if (wrongQuestions.length > 50) {
            wrongQuestions = wrongQuestions.slice(-50);
        }
        
        localStorage.setItem('zetamath_wrong_questions', JSON.stringify(wrongQuestions));
    }
    
    getWrongQuestions() {
        return JSON.parse(localStorage.getItem('zetamath_wrong_questions') || '[]');
    }
    
    clearWrongQuestions() {
        localStorage.removeItem('zetamath_wrong_questions');
    }
    
    generateWrongQuestionForPractice() {
        const wrongQuestions = this.getWrongQuestions();
        
        if (wrongQuestions.length === 0) {
            // Fallback to regular question generation
            return this.generateRegularQuestion();
        }
        
        // Sort by practice count (least practiced first) and recent timestamp
        wrongQuestions.sort((a, b) => {
            if (a.practiceCount !== b.practiceCount) {
                return a.practiceCount - b.practiceCount;
            }
            return b.timestamp - a.timestamp;
        });
        
        // Pick from the least practiced questions
        const selectedQuestion = wrongQuestions[0];
        
        // Create a new question based on the wrong one
        this.currentQuestion = {
            operation: selectedQuestion.operation,
            num1: selectedQuestion.num1,
            num2: selectedQuestion.num2,
            answer: selectedQuestion.answer,
            display: selectedQuestion.display,
            isFromWrongQuestions: true,
            originalQuestionId: selectedQuestion.timestamp
        };
        
        // Increment practice count
        selectedQuestion.practiceCount++;
        localStorage.setItem('zetamath_wrong_questions', JSON.stringify(wrongQuestions));
        
        document.getElementById('question-display').textContent = this.currentQuestion.display;
        document.getElementById('answer-input').value = '';
        document.getElementById('answer-input').focus();
    }
    
    generateRegularQuestion() {
        const mode = this.currentMode;
        let operation, num1, num2, answer;
        
        // Check if we're in a focused practice drill
        if (this.focusOperation && this.focusOperation !== 'all') {
            operation = this.focusOperation;
        } else if (mode === 'free') {
            const operations = this.modes.free.operations;
            operation = operations[Math.floor(Math.random() * operations.length)];
        } else if (mode === 'custom') {
            // Custom mode for practice drills with specific focus
            operation = this.focusOperation || 'addition';
        } else {
            const operations = ['addition', 'subtraction', 'multiplication', 'division'];
            operation = operations[Math.floor(Math.random() * operations.length)];
        }
        
        switch (operation) {
            case 'addition':
                const addRange = mode === 'free' ? this.modes.free.ranges.addition : this.modes[mode].addition;
                num1 = this.randomBetween(addRange.min, addRange.max);
                num2 = this.randomBetween(addRange.min, addRange.max);
                answer = num1 + num2;
                this.currentQuestion = {
                    operation: 'addition',
                    num1, num2, answer,
                    display: `${num1} + ${num2} = ?`
                };
                break;
                
            case 'subtraction':
                const subRange = mode === 'free' ? this.modes.free.ranges.subtraction : this.modes[mode].subtraction;
                num1 = this.randomBetween(subRange.min, subRange.max);
                num2 = this.randomBetween(subRange.min, Math.min(num1, subRange.max));
                answer = num1 - num2;
                this.currentQuestion = {
                    operation: 'subtraction',
                    num1, num2, answer,
                    display: `${num1} - ${num2} = ?`
                };
                break;
                
            case 'multiplication':
                const mulRange = mode === 'free' ? this.modes.free.ranges.multiplication : this.modes[mode].multiplication;
                num1 = this.randomBetween(mulRange.factor1.min, mulRange.factor1.max);
                num2 = this.randomBetween(mulRange.factor2.min, mulRange.factor2.max);
                answer = num1 * num2;
                this.currentQuestion = {
                    operation: 'multiplication',
                    num1, num2, answer,
                    display: `${num1} × ${num2} = ?`
                };
                break;
                
            case 'division':
                // Reverse multiplication for division
                const divRange = mode === 'free' ? this.modes.free.ranges.multiplication : this.modes[mode].multiplication;
                const factor1 = this.randomBetween(divRange.factor1.min, divRange.factor1.max);
                const factor2 = this.randomBetween(divRange.factor2.min, divRange.factor2.max);
                const product = factor1 * factor2;
                answer = factor1;
                this.currentQuestion = {
                    operation: 'division',
                    num1: product, num2: factor2, answer,
                    display: `${product} ÷ ${factor2} = ?`
                };
                break;
        }
        
        document.getElementById('question-display').textContent = this.currentQuestion.display;
        document.getElementById('answer-input').value = '';
        document.getElementById('answer-input').focus();
    }
    
    randomBetween(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.zetaMathGame = new ZetaMathGame();
}); 