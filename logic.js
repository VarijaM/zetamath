(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    root.ZetaMathLogic = api;
}(globalThis, function () {
    const HISTORY_LIMIT = 100;
    const WRONG_QUESTION_LIMIT = 50;
    const OPERATIONS = ['addition', 'subtraction', 'multiplication', 'division'];

    const PRESET_MODES = {
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
        }
    };

    function resolveStartOptions(options = {}) {
        return {
            focusOperation: options.focusOperation || null,
            practiceMode: options.practiceMode || null
        };
    }

    function parseNumericAnswer(raw) {
        if (typeof raw !== 'string') return null;
        const trimmed = raw.trim();
        if (!/^-?\d+$/.test(trimmed)) return null;
        return Number(trimmed);
    }

    function remainingSeconds(endAt, now) {
        return Math.max(0, Math.ceil((endAt - now) / 1000));
    }

    function isLowTime(secondsRemaining, timeLimit) {
        if (secondsRemaining <= 0) return false;
        const threshold = Math.min(10, Math.max(3, Math.ceil(timeLimit * 0.2)));
        return secondsRemaining <= threshold;
    }

    function randomInt(min, max, rng) {
        const lo = Math.ceil(min);
        const hi = Math.floor(max);
        if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi < lo) {
            throw new Error(`Invalid range ${min}..${max}`);
        }
        return Math.floor(rng() * (hi - lo + 1)) + lo;
    }

    function rangeFor(operation, mode, modes) {
        const config = modes[mode];
        if (mode === 'free') {
            if (operation === 'multiplication' || operation === 'division') {
                return config.ranges.multiplication;
            }
            return config.ranges[operation];
        }
        if (operation === 'multiplication' || operation === 'division') {
            return config.multiplication;
        }
        return config[operation];
    }

    function buildQuestion(operation, mode, modes, rng) {
        const range = rangeFor(operation, mode, modes);
        if (operation === 'addition') {
            const num1 = randomInt(range.min, range.max, rng);
            const num2 = randomInt(range.min, range.max, rng);
            return {
                operation,
                num1,
                num2,
                answer: num1 + num2,
                display: `${num1} + ${num2} = ?`
            };
        }
        if (operation === 'subtraction') {
            const num1 = randomInt(range.min, range.max, rng);
            const num2 = randomInt(range.min, Math.min(num1, range.max), rng);
            return {
                operation,
                num1,
                num2,
                answer: num1 - num2,
                display: `${num1} - ${num2} = ?`
            };
        }
        if (operation === 'multiplication') {
            const num1 = randomInt(range.factor1.min, range.factor1.max, rng);
            const num2 = randomInt(range.factor2.min, range.factor2.max, rng);
            return {
                operation,
                num1,
                num2,
                answer: num1 * num2,
                display: `${num1} × ${num2} = ?`
            };
        }
        const factor1 = randomInt(range.factor1.min, range.factor1.max, rng);
        const factor2 = randomInt(range.factor2.min, range.factor2.max, rng);
        const product = factor1 * factor2;
        return {
            operation: 'division',
            num1: product,
            num2: factor2,
            answer: factor1,
            display: `${product} ÷ ${factor2} = ?`
        };
    }

    function generateQuestion({ mode, modes, focusOperation, rng = Math.random }) {
        let operation;
        if (focusOperation && focusOperation !== 'all') {
            operation = focusOperation;
        } else if (mode === 'free') {
            const operations = modes.free.operations;
            operation = operations[Math.floor(rng() * operations.length)];
        } else {
            operation = OPERATIONS[Math.floor(rng() * OPERATIONS.length)];
        }
        return buildQuestion(operation, mode, modes, rng);
    }

    function checkPair(label, minRaw, maxRaw, minimum) {
        const minText = String(minRaw ?? '').trim();
        const maxText = String(maxRaw ?? '').trim();
        if (!/^-?\d+$/.test(minText) || !/^-?\d+$/.test(maxText)) {
            return { error: `${label} needs whole-number bounds.` };
        }
        const min = Number(minText);
        const max = Number(maxText);
        if (min < minimum || max < minimum) {
            return { error: `${label} must be at least ${minimum}.` };
        }
        if (min > max) {
            return { error: `${label} minimum cannot be greater than its maximum.` };
        }
        return { min, max };
    }

    function validateFreeConfig({ operations, ranges, timeLimit }) {
        if (!Number.isFinite(timeLimit) || timeLimit <= 0) {
            return { ok: false, message: 'Please select a time limit.' };
        }
        if (!operations.length) {
            return { ok: false, message: 'Please select at least one operation.' };
        }

        const addition = checkPair('Addition', ranges.addition.min, ranges.addition.max, 0);
        if (addition.error && operations.includes('addition')) {
            return { ok: false, message: addition.error };
        }
        const subtraction = checkPair('Subtraction', ranges.subtraction.min, ranges.subtraction.max, 0);
        if (subtraction.error && operations.includes('subtraction')) {
            return { ok: false, message: subtraction.error };
        }

        const needsFactors = operations.includes('multiplication') || operations.includes('division');
        const factor1 = checkPair(
            'Multiplication factor 1',
            ranges.multiplication.factor1.min,
            ranges.multiplication.factor1.max,
            1
        );
        const factor2 = checkPair(
            'Multiplication factor 2',
            ranges.multiplication.factor2.min,
            ranges.multiplication.factor2.max,
            1
        );
        if (needsFactors && (factor1.error || factor2.error)) {
            const error = factor1.error || factor2.error;
            if (error.includes('at least 1')) {
                return {
                    ok: false,
                    message: 'Multiplication factors must be at least 1 so division never divides by zero.'
                };
            }
            return { ok: false, message: error };
        }

        return {
            ok: true,
            timeLimit,
            operations,
            ranges: {
                addition: addition.error ? { min: 0, max: 0 } : { min: addition.min, max: addition.max },
                subtraction: subtraction.error ? { min: 0, max: 0 } : { min: subtraction.min, max: subtraction.max },
                multiplication: {
                    factor1: factor1.error ? { min: 1, max: 1 } : { min: factor1.min, max: factor1.max },
                    factor2: factor2.error ? { min: 1, max: 1 } : { min: factor2.min, max: factor2.max }
                }
            }
        };
    }

    function questionIdentity(question) {
        return `${question.operation}|${question.num1}|${question.num2}`;
    }

    function capList(list, limit) {
        if (list.length <= limit) return list;
        return list.slice(-limit);
    }

    function capWrongQuestions(list, limit = WRONG_QUESTION_LIMIT) {
        if (list.length <= limit) return list;
        return list
            .slice()
            .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
            .slice(-limit);
    }

    function rememberWrongQuestion(list, question, now = Date.now()) {
        const id = questionIdentity(question);
        const existing = list.find(item => questionIdentity(item) === id);
        if (existing) {
            return list.map(item => {
                if (questionIdentity(item) !== id) return item;
                return {
                    ...item,
                    answer: question.answer,
                    display: question.display,
                    userAnswer: question.userAnswer,
                    timeSpent: question.timeSpent,
                    timestamp: now,
                    missCount: (item.missCount || 1) + 1
                };
            });
        }
        const stored = {
            operation: question.operation,
            num1: question.num1,
            num2: question.num2,
            answer: question.answer,
            display: question.display,
            userAnswer: question.userAnswer,
            timeSpent: question.timeSpent,
            timestamp: now,
            practiceCount: 0,
            missCount: 1
        };
        return capWrongQuestions(list.concat(stored));
    }

    function applyPracticeResult(list, question, correct, now = Date.now()) {
        const id = questionIdentity(question);
        const index = list.findIndex(item => questionIdentity(item) === id);
        if (index === -1) {
            return correct ? list.slice() : rememberWrongQuestion(list, question, now);
        }
        if (correct) return list.filter((_, itemIndex) => itemIndex !== index);
        return list.map((item, itemIndex) => {
            if (itemIndex !== index) return item;
            return {
                ...item,
                userAnswer: question.userAnswer,
                timeSpent: question.timeSpent,
                timestamp: now,
                practiceCount: (item.practiceCount || 0) + 1,
                missCount: (item.missCount || 1) + 1
            };
        });
    }

    function pickPracticeQuestion(list) {
        if (!list.length) return null;
        return list.slice().sort((a, b) => {
            const practiceDelta = (a.practiceCount || 0) - (b.practiceCount || 0);
            if (practiceDelta !== 0) return practiceDelta;
            return (b.timestamp || 0) - (a.timestamp || 0);
        })[0];
    }

    function safeParseJSON(raw, fallback) {
        if (typeof raw !== 'string' || raw.trim() === '') return fallback;
        try {
            const value = JSON.parse(raw);
            if (Array.isArray(fallback) && !Array.isArray(value)) return fallback;
            if (value === null || value === undefined) return fallback;
            return value;
        } catch {
            return fallback;
        }
    }

    function sessionStats(questions) {
        const total = questions.length;
        let correct = 0;
        let totalTime = 0;
        questions.forEach(question => {
            if (question.correct) correct += 1;
            totalTime += Number(question.timeSpent) || 0;
        });
        return {
            total,
            correct,
            accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
            avgTime: total > 0 ? totalTime / total : 0
        };
    }

    const MIN_OPERATION_SAMPLE = 5;
    const ACCURACY_TARGET = 80;
    const SLOW_THRESHOLD_SECONDS = 3;

    function operationLabel(operation) {
        return operation.charAt(0).toUpperCase() + operation.slice(1);
    }

    function questionsOf(session) {
        return Array.isArray(session.questions) ? session.questions : [];
    }

    function summarizeOperations(history) {
        const stats = {
            addition: { total: 0, correct: 0, totalTime: 0 },
            subtraction: { total: 0, correct: 0, totalTime: 0 },
            multiplication: { total: 0, correct: 0, totalTime: 0 },
            division: { total: 0, correct: 0, totalTime: 0 }
        };
        history.forEach(session => {
            questionsOf(session).forEach(question => {
                const bucket = stats[question.operation];
                if (!bucket) return;
                bucket.total += 1;
                if (question.correct) bucket.correct += 1;
                bucket.totalTime += Number(question.timeSpent) || 0;
            });
        });
        return stats;
    }

    function weightedAccuracy(history) {
        let correct = 0;
        let total = 0;
        history.forEach(session => {
            questionsOf(session).forEach(question => {
                total += 1;
                if (question.correct) correct += 1;
            });
        });
        return {
            correct,
            total,
            percent: total > 0 ? (correct / total) * 100 : 0
        };
    }

    function progressSummary(history) {
        const accuracy = weightedAccuracy(history);
        let bestScore = 0;
        let fastestAnswer = null;
        history.forEach(session => {
            const stats = sessionStats(questionsOf(session));
            if (stats.correct > bestScore) bestScore = stats.correct;
            questionsOf(session).forEach(question => {
                if (!question.correct) return;
                if (fastestAnswer === null || question.timeSpent < fastestAnswer) {
                    fastestAnswer = question.timeSpent;
                }
            });
        });
        return {
            totalGames: history.length,
            bestScore,
            avgAccuracy: accuracy.total > 0 ? Math.round(accuracy.percent) : 0,
            fastestAnswer,
            questionCount: accuracy.total,
            correctCount: accuracy.correct
        };
    }

    function recommendedMode(history) {
        const { percent, total } = weightedAccuracy(history.slice(-5));
        if (total < MIN_OPERATION_SAMPLE) return 'easy';
        if (percent >= 90) return 'hard';
        if (percent >= 75) return 'medium';
        return 'easy';
    }

    function recommendPractice(history) {
        if (!history.length) {
            return {
                title: 'Start with an easy round',
                paragraphs: [
                    'There is no history yet. A 60 second easy round is a good baseline across all four operations.'
                ],
                config: { mode: 'easy', focus: 'all' }
            };
        }

        const stats = summarizeOperations(history);
        let weakest = null;
        let lowestAccuracy = 100;
        let slowest = null;
        let slowestTime = 0;
        Object.keys(stats).forEach(operation => {
            const stat = stats[operation];
            if (stat.total < MIN_OPERATION_SAMPLE) return;
            const accuracy = (stat.correct / stat.total) * 100;
            const avgTime = stat.totalTime / stat.total;
            if (accuracy < lowestAccuracy) {
                lowestAccuracy = accuracy;
                weakest = operation;
            }
            if (avgTime > slowestTime) {
                slowestTime = avgTime;
                slowest = operation;
            }
        });

        const mode = recommendedMode(history);
        if (weakest && lowestAccuracy < ACCURACY_TARGET) {
            const name = operationLabel(weakest);
            return {
                title: 'Accuracy focus',
                paragraphs: [
                    `${name} accuracy is ${Math.round(lowestAccuracy)}% across ${stats[weakest].total} questions.`,
                    `Practice ${name.toLowerCase()} on ${mode} until it stays at or above ${ACCURACY_TARGET}%.`
                ],
                config: { mode, focus: weakest }
            };
        }
        if (slowest && slowestTime > SLOW_THRESHOLD_SECONDS) {
            const name = operationLabel(slowest);
            return {
                title: 'Speed focus',
                paragraphs: [
                    `${name} is averaging ${slowestTime.toFixed(1)}s, above the ${SLOW_THRESHOLD_SECONDS}s target.`,
                    `A ${mode} speed drill on ${name.toLowerCase()} is the next step.`
                ],
                config: { mode, focus: slowest }
            };
        }

        const qualified = Object.values(stats).some(stat => stat.total >= MIN_OPERATION_SAMPLE);
        return {
            title: qualified ? 'Mixed practice' : 'Keep playing',
            paragraphs: [
                qualified
                    ? 'Recent results are at or above the accuracy and speed targets. Mixed practice will keep all four operations sharp.'
                    : `Each operation needs at least ${MIN_OPERATION_SAMPLE} answered questions before a single miss can pick the drill.`
            ],
            config: { mode, focus: 'all' }
        };
    }

    function overviewSeries(history, count = 10) {
        return history.slice(-count).map((session, index) => {
            const stats = sessionStats(questionsOf(session));
            return {
                label: `Game ${index + 1}`,
                score: stats.correct,
                accuracy: stats.accuracy
            };
        });
    }

    function timeModeSummary(history) {
        const buckets = {};
        history.forEach(session => {
            const timeLimit = session.timeLimit;
            if (!buckets[timeLimit]) {
                buckets[timeLimit] = { total: 0, correct: 0, sessions: 0, bestScore: 0 };
            }
            const stats = sessionStats(questionsOf(session));
            buckets[timeLimit].total += stats.total;
            buckets[timeLimit].correct += stats.correct;
            buckets[timeLimit].sessions += 1;
            buckets[timeLimit].bestScore = Math.max(buckets[timeLimit].bestScore, stats.correct);
        });
        return Object.keys(buckets)
            .sort((a, b) => Number(a) - Number(b))
            .map(time => {
                const stat = buckets[time];
                const seconds = Number(time);
                return {
                    timeLimit: seconds,
                    label: seconds >= 60 ? `${Math.floor(seconds / 60)}m` : `${seconds}s`,
                    sessions: stat.sessions,
                    bestScore: stat.bestScore,
                    totalQuestions: stat.total,
                    accuracy: stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0,
                    avgScore: stat.sessions > 0 ? Math.round(stat.correct / stat.sessions) : 0
                };
            });
    }

    return {
        HISTORY_LIMIT,
        WRONG_QUESTION_LIMIT,
        OPERATIONS,
        PRESET_MODES,
        resolveStartOptions,
        parseNumericAnswer,
        remainingSeconds,
        isLowTime,
        randomInt,
        generateQuestion,
        validateFreeConfig,
        questionIdentity,
        capList,
        capWrongQuestions,
        rememberWrongQuestion,
        applyPracticeResult,
        pickPracticeQuestion,
        safeParseJSON,
        sessionStats,
        MIN_OPERATION_SAMPLE,
        ACCURACY_TARGET,
        SLOW_THRESHOLD_SECONDS,
        summarizeOperations,
        weightedAccuracy,
        progressSummary,
        recommendedMode,
        recommendPractice,
        overviewSeries,
        timeModeSummary
    };
}));
