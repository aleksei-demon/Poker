// =============================================================================
//  GAME-FUNC.JS — готовые функции игры
// =============================================================================

const masti = [
    ['b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'a',],// 0 Pika;
    ['o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'n',],// 1 Trefa;
    ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'A',],// 2 Bubna; RED
    ['O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'N',],// 3 Cherva; RED
];

//------------------t a s o v k a------------------------
let KOLODA = [];
function tasov() {
    let temp_masti = masti.flat();

    for (let i = temp_masti.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [temp_masti[i], temp_masti[j]] = [temp_masti[j], temp_masti[i]];
    }
    KOLODA = temp_masti;
}
tasov();
//-----tasovka-------------------------------------------
//-----A N A L I Z E R-------------------------------------------
function parseCard(char) {
    // Проходим по всем мастям в твоем массиве
    for (let suitIdx = 0; suitIdx < masti.length; suitIdx++) {
        // Ищем, в какой строке и на какой позиции лежит символ
        const valIdx = masti[suitIdx].indexOf(char);

        if (valIdx !== -1) {
            return {
                value: valIdx, // 0 = 2, 1 = 3 ... 11 = Король, 12 = Туз
                suit: suitIdx  // 0 = Пика, 1 = Трефа, 2 = Бубна, 3 = Черва
            };
        }
    }
    return null; // На случай джокера или ошибки
}

function evaluateFiveCards(fiveChars) {
    // 1. Дешифруем буквы в объекты { value, suit } и сортируем по убыванию номинала (от Туза к Двойке)
    const cards = fiveChars.map(parseCard).sort((a, b) => b.value - a.value);

    // 2. Считаем, сколько каких номиналов и мастей у нас на руках
    const valueCounts = {};
    const suitCounts = {};
    cards.forEach(c => {
        valueCounts[c.value] = (valueCounts[c.value] || 0) + 1;
        suitCounts[c.suit] = (suitCounts[c.suit] || 0) + 1;
    });

    // Массивы количества повторений для удобного поиска пар/сетов
    const counts = Object.values(valueCounts).sort((a, b) => b - a);
    // Номиналы, отсортированные по частоте появления (сначала пары/сеты, затем кикеры)
    const sortedValuesByCount = Object.keys(valueCounts)
        .map(Number)
        .sort((a, b) => {
            if (valueCounts[a] !== valueCounts[b]) return valueCounts[b] - valueCounts[a];
            return b - a;
        });

    // 3. Флаги базовых комбинаций
    const isFlush = Object.values(suitCounts).some(cnt => cnt === 5);

    // Проверка на Стрит (5 карт идут подряд)
    let isStraight = false;
    // Стандартный случай (например: 9-8-7-6-5)
    if (counts.length === 5 && (cards[0].value - cards[4].value === 4)) {
        isStraight = true;
    }
    // Особый случай: Стрит от Туза до Пятерки (Колесо: А-5-4-3-2). В нашей математике Туз=12, Пятерка=3
    if (counts.length === 5 && cards[0].value === 12 && cards[1].value === 3 && cards[4].value === 0) {
        isStraight = true;
        // Переставляем Туз в конец для правильного расчета веса, так как в этом стрите он играет как единица
        sortedValuesByCount.push(sortedValuesByCount.shift());
    }

    // 4. ГЕНЕРАЦИЯ УНИКАЛЬНОГО ВЕСА ДЛЯ КИКЕРОВ
    // Переводим номиналы карт в 16-ричную систему, чтобы они работали как тайбрейкеры
    // Формула: Ранг_Комбинации + (Карта1 * 15^4) + (Карта2 * 15^3) + ...
    let kickerScore = 0;
    sortedValuesByCount.forEach((val, index) => {
        kickerScore += val * Math.pow(15, 4 - index);
    });

    // 5. ОПРЕДЕЛЯЕМ ИТОГОВУЮ РУКУ

    // Стрит-Флеш / Роял-Флеш
    if (isStraight && isFlush) {
        return { score: 8000000 + kickerScore, name: "Стрит-Флеш" };
    }
    // Каре
    if (counts[0] === 4) {
        return { score: 7000000 + kickerScore, name: "Каре" };
    }
    // Фулл-Хаус (Тройка + Пара)
    if (counts[0] === 3 && counts[1] === 2) {
        return { score: 6000000 + kickerScore, name: "Фулл-Хаус" };
    }
    // Флеш
    if (isFlush) {
        return { score: 5000000 + kickerScore, name: "Флеш" };
    }
    // Стрит
    if (isStraight) {
        return { score: 4000000 + kickerScore, name: "Стрит" };
    }
    // Сет / Тройка
    if (counts[0] === 3) {
        return { score: 3000000 + kickerScore, name: "Сет" };
    }
    // Две пары
    if (counts[0] === 2 && counts[1] === 2) {
        return { score: 2000000 + kickerScore, name: "Две Пары" };
    }
    // Одна пара
    if (counts[0] === 2) {
        return { score: 1000000 + kickerScore, name: "Пара" };
    }

    // Старшая карта
    return { score: 0 + kickerScore, name: "Старшая карта" };
}

function getBestCombination(sevenChars) {
    if (sevenChars.length < 5) {
        console.error("Критическая ошибка: для анализа нужно минимум 5 карт!");
        return { score: 0, name: "Нет комбинации" };
    }

    // Если карт всего 5 (например, на стадии Флопа для каких-то тестов), то вариант один
    if (sevenChars.length === 5) {
        return evaluateFiveCards(sevenChars);
    }

    let bestHand = { score: -1, name: "" };
    const n = sevenChars.length;

    // Генерируем все уникальные пятерки карт (сочетания)
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            for (let k = j + 1; k < n; k++) {
                for (let l = k + 1; l < n; l++) {
                    for (let m = l + 1; m < n; m++) {

                        // Собираем текущие 5 карт по индексам
                        const currentFive = [
                            sevenChars[i],
                            sevenChars[j],
                            sevenChars[k],
                            sevenChars[l],
                            sevenChars[m]
                        ];

                        // Оцениваем их силу
                        const currentResult = evaluateFiveCards(currentFive);

                        // Если эта комбинация сильнее всех предыдущих — запоминаем её
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


//  раздача конкретного количества карт в конкретное место
function dealCards(deck, count, targetId, isSecret = false) {
    const cardsToGive = [];

    for (let i = 0; i < count; i++) {
        const topCard = deck.pop(); // Отрезаем карту из колоды, уменьшая её
        if (topCard) {
            cardsToGive.push(topCard);
        }
    }

    // Отправляем отрезанные карты на отрисовку
    renderCardsTo(cardsToGive, targetId, isSecret);
}


// Функция автоматического списания слепых ставок (блайндов)
function makeAutomaticBet(playerObj, amount) {
    // Определяем, сколько игрок реально может поставить (защита от нехватки денег)
    const actualBet = Math.min(playerObj.budget, amount);

    playerObj.budget -= actualBet;
    PokerEngine.gameState.pot += actualBet;
    PokerEngine.gameState.roundBets[playerObj.id] = actualBet;

    // Ищем селектор баланса конкретного игрока на основе его структуры
    let balanceSelector = '#p-balance'; // Для живого игрока по умолчанию
    if (playerObj.id === 'bot-1') balanceSelector = '#bot-balance-1';
    if (playerObj.id === 'bot-2') balanceSelector = '#bot-balance-2';
    if (playerObj.id === 'bot-3') balanceSelector = '#bot-balance-3';

    // Обновляем баланс в интерфейсе
    const balanceEl = document.querySelector(balanceSelector);
    if (balanceEl) {
        balanceEl.textContent = ` ${playerObj.budget}$`;
    }

    console.log(`[Блайнды]: ${playerObj.name} внес ${actualBet}$. Оставшийся бюджет: ${playerObj.budget}$`);
}


// функция для отображения фишки дилера "D"
function updateDealerChipsUI() {
    // Сначала скрываем ВСЕ фишки "D" на столе
    document.querySelectorAll('.dealer-chip').forEach(el => el.style.display = 'none');

    // Находим нужного игрока/бота, у которого сейчас фокус дилера
    const activeDealer = players[CURRENT_DEALER];

    // Ищем фишку именно внутри контейнера этого игрока
    let dealerContainerSelector = '#cards-p'; // Для игрока фишка лежит в секции .player, но можно привязаться к родителю
    if (activeDealer.id === 'bot-1') dealerContainerSelector = '#bot-1';
    if (activeDealer.id === 'bot-2') dealerContainerSelector = '#bot-2';
    if (activeDealer.id === 'bot-3') dealerContainerSelector = '#bot-3';

    if (activeDealer.id === 'player') {
        // У игрока в myFields фишка лежит в .player
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








