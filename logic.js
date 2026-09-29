/* global globalThis, module */
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
        sessionStats
    };
}));
