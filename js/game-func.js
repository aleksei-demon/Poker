// =============================================================================
//  GAME-FUNC.JS — готовые функции игры
// =============================================================================

const masti = [
    ['b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'a'], // 0 Pika;
    ['o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'n'], // 1 Trefa;
    ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'A'], // 2 Bubna; RED
    ['O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'N'], // 3 Cherva; RED
];

//------------------t a s o v k a------------------------
let KOLODA = [];

// Теперь функцию можно безопасно вызывать в начале каждой раздачи!
function tasov() {
    let temp_masti = masti.flat();

    for (let i = temp_masti.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [temp_masti[i], temp_masti[j]] = [temp_masti[j], temp_masti[i]];
    }
    KOLODA = temp_masti;
    console.log("[DECK ENGINE]: Колода успешно перемешана. Карт: " + KOLODA.length);
}
// Первый запуск при старте приложения
tasov();
//-----tasovka-------------------------------------------

//-----A N A L I Z E R-------------------------------------------
function parseCard(char) {
    for (let suitIdx = 0; suitIdx < masti.length; suitIdx++) {
        const valIdx = masti[suitIdx].indexOf(char);
        if (valIdx !== -1) {
            return {
                value: valIdx, // 0 = 2, 1 = 3 ... 11 = Король, 12 = Туз
                suit: suitIdx  // 0 = Пика, 1 = Трефа, 2 = Бубна, 3 = Черва
            };
        }
    }
    return null;
}

function evaluateFiveCards(fiveChars) {
    const cards = fiveChars.map(parseCard).sort((a, b) => b.value - a.value);

    const valueCounts = {};
    const suitCounts = {};
    cards.forEach(c => {
        if (c) { // Защита от null-карт
            valueCounts[c.value] = (valueCounts[c.value] || 0) + 1;
            suitCounts[c.suit] = (suitCounts[c.suit] || 0) + 1;
        }
    });

    const counts = Object.values(valueCounts).sort((a, b) => b - a);
    const sortedValuesByCount = Object.keys(valueCounts)
        .map(Number)
        .sort((a, b) => {
            if (valueCounts[a] !== valueCounts[b]) return valueCounts[b] - valueCounts[a];
            return b - a;
        });

    const isFlush = Object.values(suitCounts).some(cnt => cnt === 5);
    let isStraight = false;

    if (counts.length === 5 && (cards[0].value - cards[4].value === 4)) {
        isStraight = true;
    }
    // Особый случай: Стрит от Туза до Пятерки (Колесо: А-5-4-3-2)
    if (counts.length === 5 && cards[0] && cards[1] && cards[4] && cards[0].value === 12 && cards[1].value === 3 && cards[4].value === 0) {
        isStraight = true;
        sortedValuesByCount.push(sortedValuesByCount.shift());
    }

    let kickerScore = 0;
    sortedValuesByCount.forEach((val, index) => {
        kickerScore += val * Math.pow(15, 4 - index);
    });

    if (isStraight && isFlush) return { score: 8000000 + kickerScore, name: "Стрит-Флеш" };
    if (counts[0] === 4) return { score: 7000000 + kickerScore, name: "Каре" };
    if (counts[0] === 3 && counts[1] === 2) return { score: 6000000 + kickerScore, name: "Фулл-Хаус" };
    if (isFlush) return { score: 5000000 + kickerScore, name: "Флеш" };
    if (isStraight) return { score: 4000000 + kickerScore, name: "Стрит" };
    if (counts[0] === 3) return { score: 3000000 + kickerScore, name: "Сет" };
    if (counts[0] === 2 && counts[1] === 2) return { score: 2000000 + kickerScore, name: "Две Пары" };
    if (counts[0] === 2) return { score: 1000000 + kickerScore, name: "Пара" };

    return { score: 0 + kickerScore, name: "Старшая карта" };
}

function getBestCombination(sevenChars) {
    if (!sevenChars || sevenChars.length < 5) {
        console.error("Критическая ошибка: для анализа нужно минимум 5 карт!");
        return { score: 0, name: "Нет комбинации" };
    }

    if (sevenChars.length === 5) { return evaluateFiveCards(sevenChars); }

    let bestHand = { score: -1, name: "" };
    const n = sevenChars.length;

    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            for (let k = j + 1; k < n; k++) {
                for (let l = k + 1; l < n; l++) {
                    for (let m = l + 1; m < n; m++) {
                        const currentFive = [sevenChars[i], sevenChars[j], sevenChars[k], sevenChars[l], sevenChars[m]];
                        const currentResult = evaluateFiveCards(currentFive);
                        if (currentResult.score > bestHand.score) {
                            bestHand = currentResult;
                        }
                    }
                }
            }
        }
    }
    return bestHand;
}
//-----A N A L I Z E R-------------------------------------------

function dealCards(deck, count, targetId, isSecret = false) {
    const cardsToGive = [];

    // Если в колоде внезапно кончились карты — страхуемся перетасовкой
    if (deck.length < count) {
        console.warn("[WARNING]: Карт в колоде мало! Срочная перетасовка.");
        tasov();
    }

    for (let i = 0; i < count; i++) {
        const topCard = deck.pop();
        if (topCard) {
            cardsToGive.push(topCard);
        }
    }

    renderCardsTo(cardsToGive, targetId, isSecret);
    return cardsToGive;
}

function makeAutomaticBet(playerObj, amount) {
    const actualBet = Math.min(playerObj.budget, amount);

    playerObj.budget -= actualBet;
    PokerEngine.gameState.pot += actualBet;
    PokerEngine.gameState.roundBets[playerObj.id] = actualBet;

    let balanceSelector = '#p-balance';
    if (playerObj.id === 'bot-1') balanceSelector = '#bot-balance-1';
    if (playerObj.id === 'bot-2') balanceSelector = '#bot-balance-2';
    if (playerObj.id === 'bot-3') balanceSelector = '#bot-balance-3';

    const balanceEl = document.querySelector(balanceSelector);
    if (balanceEl) {
        balanceEl.textContent = ` ${playerObj.budget}$`;
    }

    console.log(`[Блайнды]: ${playerObj.name} внес ${actualBet}$. Оставшийся бюджет: ${playerObj.budget}$`);
}

function updateDealerChipsUI() {
    document.querySelectorAll('.dealer-chip').forEach(el => el.style.display = 'none');

    const activeDealer = players[CURRENT_DEALER];
    if (!activeDealer) return; // Защита от сбоя индекса дилера

    let dealerContainerSelector = '#cards-p';
    if (activeDealer.id === 'bot-1') dealerContainerSelector = '#bot-1';
    if (activeDealer.id === 'bot-2') dealerContainerSelector = '#bot-2';
    if (activeDealer.id === 'bot-3') dealerContainerSelector = '#bot-3';

    if (activeDealer.id === 'player') {
        const pChip = document.querySelector('.player .dealer-chip');
        if (pChip) pChip.style.display = 'inline-block';
    } else {
        const botChip = document.querySelector(`${dealerContainerSelector} .dealer-chip`);
        if (botChip) botChip.style.display = 'inline-block';
    }
}

function makeAction(type) {
    const actionType = type.toUpperCase();
    PokerEngine.executeAction('player', actionType);
}

function calculatePots(activePlayers) {
    let playerBets = activePlayers.map(p => ({
        id: p.id,
        name: p.name,
        amount: PokerEngine.gameState.totalBets ? (PokerEngine.gameState.totalBets[p.id] || 0) : 0,
        isAllIn: p.budget === 0
    }));

    let pots = [];

    while (playerBets.some(p => p.amount > 0)) {
        let contributors = playerBets.filter(p => p.amount > 0);
        let allInPlayers = contributors.filter(p => p.isAllIn);

        let minBet;
        if (allInPlayers.length > 0) {
            minBet = Math.min(...allInPlayers.map(p => p.amount));
        } else {
            minBet = Math.min(...contributors.map(p => p.amount));
        }

        let potAmount = 0;
        let eligiblePlayerIds = [];

        playerBets.forEach(p => {
            if (p.amount > 0) {
                let contribution = Math.min(p.amount, minBet);
                potAmount += contribution;
                p.amount -= contribution;
                eligiblePlayerIds.push(p.id);
            }
        });

        pots.push({
            amount: potAmount,
            allowedPlayers: eligiblePlayerIds
        });
    }

    return pots;
}



