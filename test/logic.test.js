const test = require('node:test');
const assert = require('node:assert/strict');
const logic = require('../logic.js');

function modesWith(preset) {
    return {
        [preset]: logic.PRESET_MODES[preset],
        free: {
            operations: ['addition'],
            ranges: {
                addition: { min: 2, max: 5 },
                subtraction: { min: 2, max: 5 },
                multiplication: { factor1: { min: 2, max: 4 }, factor2: { min: 2, max: 6 } }
            }
        }
    };
}

test('a normal start clears practice flags', () => {
    assert.deepEqual(logic.resolveStartOptions({}), {
        focusOperation: null,
        practiceMode: null
    });
    assert.deepEqual(
        logic.resolveStartOptions({ focusOperation: 'division', practiceMode: 'wrong-questions' }),
        { focusOperation: 'division', practiceMode: 'wrong-questions' }
    );
});

test('parseNumericAnswer ignores blanks and non-integers', () => {
    assert.equal(logic.parseNumericAnswer(''), null);
    assert.equal(logic.parseNumericAnswer('   '), null);
    assert.equal(logic.parseNumericAnswer('1.5'), null);
    assert.equal(logic.parseNumericAnswer('2e1'), null);
    assert.equal(logic.parseNumericAnswer('nope'), null);
    assert.equal(logic.parseNumericAnswer(12), null);
    assert.equal(logic.parseNumericAnswer('03'), 3);
    assert.equal(logic.parseNumericAnswer(' -4 '), -4);
    assert.equal(logic.parseNumericAnswer('0'), 0);
});

test('remainingSeconds counts down from a deadline', () => {
    assert.equal(logic.remainingSeconds(10_000, 0), 10);
    assert.equal(logic.remainingSeconds(10_000, 9_100), 1);
    assert.equal(logic.remainingSeconds(10_000, 10_000), 0);
    assert.equal(logic.remainingSeconds(10_000, 12_000), 0);
});

test('the timer is marked low only near the end of the round', () => {
    assert.equal(logic.isLowTime(3, 15), true);
    assert.equal(logic.isLowTime(4, 15), false);
    assert.equal(logic.isLowTime(10, 60), true);
    assert.equal(logic.isLowTime(11, 60), false);
    assert.equal(logic.isLowTime(0, 60), false);
});

test('focused addition uses the low end of the range when rng is 0', () => {
    const question = logic.generateQuestion({
        mode: 'easy',
        modes: modesWith('easy'),
        focusOperation: 'addition',
        rng: () => 0
    });
    assert.deepEqual(question, {
        operation: 'addition',
        num1: 2,
        num2: 2,
        answer: 4,
        display: '2 + 2 = ?'
    });
});

test('preset questions stay inside their ranges and divide evenly', () => {
    const modes = modesWith('easy');
    for (let i = 0; i < 40; i += 1) {
        const subtraction = logic.generateQuestion({
            mode: 'easy',
            modes,
            focusOperation: 'subtraction'
        });
        assert.ok(subtraction.answer >= 0);
        assert.equal(subtraction.num1 - subtraction.num2, subtraction.answer);
        assert.ok(subtraction.num1 >= 2 && subtraction.num1 <= 60);

        const division = logic.generateQuestion({
            mode: 'easy',
            modes,
            focusOperation: 'division'
        });
        assert.equal(division.num2 * division.answer, division.num1);
        assert.ok(division.num2 >= 2);
    }
});

test('free mode only asks for the selected operation', () => {
    const modes = modesWith('easy');
    modes.free.operations = ['multiplication'];
    const question = logic.generateQuestion({ mode: 'free', modes, rng: () => 0 });
    assert.equal(question.operation, 'multiplication');
    assert.equal(question.answer, question.num1 * question.num2);
});

test('validateFreeConfig rejects missing time, empty operations, reversed ranges, and zero factors', () => {
    const ranges = {
        addition: { min: '2', max: '10' },
        subtraction: { min: '4', max: '9' },
        multiplication: {
            factor1: { min: '2', max: '5' },
            factor2: { min: '3', max: '7' }
        }
    };
    assert.equal(logic.validateFreeConfig({ operations: ['addition'], ranges, timeLimit: null }).ok, false);
    assert.equal(logic.validateFreeConfig({ operations: [], ranges, timeLimit: 30 }).ok, false);
    assert.match(
        logic.validateFreeConfig({
            operations: ['addition'],
            ranges: { ...ranges, addition: { min: '12', max: '3' } },
            timeLimit: 30
        }).message,
        /minimum cannot be greater/
    );
    assert.match(
        logic.validateFreeConfig({
            operations: ['division'],
            ranges: {
                ...ranges,
                multiplication: {
                    factor1: { min: '0', max: '5' },
                    factor2: { min: '2', max: '4' }
                }
            },
            timeLimit: 30
        }).message,
        /divides by zero/
    );
    const valid = logic.validateFreeConfig({
        operations: ['addition'],
        timeLimit: 30,
        ranges: {
            addition: { min: '2', max: '10' },
            subtraction: { min: '', max: '' },
            multiplication: { factor1: { min: '0', max: '1' }, factor2: { min: '', max: '' } }
        }
    });
    assert.equal(valid.ok, true);
    assert.deepEqual(valid.ranges.addition, { min: 2, max: 10 });
});

test('missed questions are stored once and retired after a correct retry', () => {
    const question = {
        operation: 'addition',
        num1: 8,
        num2: 5,
        answer: 13,
        display: '8 + 5 = ?',
        userAnswer: 12,
        timeSpent: 2
    };
    let list = logic.rememberWrongQuestion([], question, 1);
    list = logic.rememberWrongQuestion(list, { ...question, userAnswer: 11 }, 2);
    assert.equal(list.length, 1);
    assert.equal(list[0].missCount, 2);
    assert.equal(list[0].practiceCount, 0);

    list = logic.applyPracticeResult(list, question, false, 3);
    assert.equal(list.length, 1);
    assert.equal(list[0].practiceCount, 1);
    assert.equal(list[0].missCount, 3);

    list = logic.applyPracticeResult(list, question, true, 4);
    assert.deepEqual(list, []);
});

test('the wrong-question list keeps the 50 most recent problems', () => {
    let list = [];
    for (let i = 0; i < 55; i += 1) {
        list = logic.rememberWrongQuestion(list, {
            operation: 'addition',
            num1: i,
            num2: 1,
            answer: i + 1,
            display: `${i} + 1 = ?`,
            userAnswer: 0,
            timeSpent: 1
        }, 1000 + i);
    }
    assert.equal(list.length, logic.WRONG_QUESTION_LIMIT);
    assert.equal(list[0].num1, 5);
    assert.equal(list[list.length - 1].num1, 54);
});

test('practice picking prefers the least practiced question without changing the list', () => {
    const older = { operation: 'addition', num1: 1, num2: 1, practiceCount: 0, timestamp: 1 };
    const newer = { operation: 'addition', num1: 2, num2: 2, practiceCount: 0, timestamp: 5 };
    const practiced = { operation: 'addition', num1: 3, num2: 3, practiceCount: 2, timestamp: 9 };
    const list = [practiced, older, newer];
    assert.equal(logic.pickPracticeQuestion(list).num1, 2);
    assert.equal(list[1].practiceCount, 0);
    assert.equal(logic.pickPracticeQuestion([]), null);
});

test('safeParseJSON falls back when storage is missing or corrupt', () => {
    assert.deepEqual(logic.safeParseJSON(null, []), []);
    assert.deepEqual(logic.safeParseJSON('', []), []);
    assert.deepEqual(logic.safeParseJSON('{', []), []);
    assert.deepEqual(logic.safeParseJSON('{"not":"an array"}', []), []);
    assert.deepEqual(logic.safeParseJSON('null', []), []);
    assert.deepEqual(logic.safeParseJSON('[1,2]', []), [1, 2]);
});

test('session stats and history cap', () => {
    const stats = logic.sessionStats([
        { correct: true, timeSpent: 1 },
        { correct: false, timeSpent: 3 },
        { correct: true, timeSpent: 2 }
    ]);
    assert.equal(stats.total, 3);
    assert.equal(stats.correct, 2);
    assert.equal(stats.accuracy, 67);
    assert.equal(stats.avgTime, 2);

    const history = [1, 2, 3, 4, 5];
    assert.deepEqual(logic.capList(history, 3), [3, 4, 5]);
    assert.equal(logic.capList(history, 10), history);
});
