'use strict';
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
    // --- ПРОВЕРКА НА ВШЕЙ ---
    const uniqueCards = new Set(KOLODA);
    console.log("[DECK ENGINE]: Колода успешно перемешана. Карт: " + KOLODA.length + " | Уникальных: " + uniqueCards.size);
    if (KOLODA.length !== uniqueCards.size) {
        console.error("[CRITICAL]: В КОЛОДЕ ОБНАРУЖЕНЫ ДУБЛИКАТЫ ЕЩЕ ДО РАЗДАЧИ!");
    }
}
// Первый запуск при старте приложения
tasov();
//-----tasovka-------------------------------------------

//-----A N A L I Z E R-------------------------------------------
function parseCard(cardSymbol) {
    // 1. Проверяем, что нам вообще пришла строка нужной длины
    if (!cardSymbol || typeof cardSymbol !== 'string' || cardSymbol.length !== 1) {
        return null;
    }

    // 2. Проходим по матрице мастей (из твоего массива masti)
    for (let suitIndex = 0; suitIndex < masti.length; suitIndex++) {
        const valueIndex = masti[suitIndex].indexOf(cardSymbol);

        // Если символ найден в этой масти, возвращаем объект
        if (valueIndex !== -1) {
            return {
                value: valueIndex, // Номинал от 0 (Двойка) до 12 (Туз)
                suit: suitIndex    // Масть от 0 до 3
            };
        }
    }

    // Если прилетел какой-то левый символ (например, '2') — просто игнорируем его
    return null;
}

function evaluateFiveCards(fiveChars) {
    // Безопасный парсинг: убираем любые undefined/null
    const cards = fiveChars
        .map(parseCard)
        .filter(c => c !== null && c !== undefined)
        .sort((a, b) => b.value - a.value);

    // Если карт не 5, сбрасываем оценку
    if (cards.length !== 5) return { score: 0, name: "Старшая карта" };

    const valueCounts = {};
    const suitCounts = {};
    cards.forEach(c => {
        valueCounts[c.value] = (valueCounts[c.value] || 0) + 1;
        suitCounts[c.suit] = (suitCounts[c.suit] || 0) + 1;
    });

    const counts = Object.values(valueCounts).sort((a, b) => b - a);

    // Сортировка для кикеров
    const sortedValuesForKickers = [...cards].sort((a, b) => {
        const countA = valueCounts[a.value];
        const countB = valueCounts[b.value];
        if (countA !== countB) return countB - countA;
        return b.value - a.value;
    }).map(c => c.value);

    const isFlush = Object.values(suitCounts).some(cnt => cnt === 5);
    let isStraight = false;

    // Классический Стрит
    if (counts.length === 5 && (cards[0].value - cards[4].value === 4)) {
        isStraight = true;
    }

    // Стрит от Туза до Пятерки (А-5-4-3-2)
    // Номиналы: А=12, 5=3, 4=2, 3=1, 2=0. Проверяем строго все 5 карт!
    if (counts.length === 5 &&
        cards[0].value === 12 &&
        cards[1].value === 3 &&
        cards[2].value === 2 &&
        cards[3].value === 1 &&
        cards[4].value === 0) {

        isStraight = true;
        // Переносим Туз в конец (он играет как единица)
        const ace = sortedValuesForKickers.shift();
        sortedValuesForKickers.push(ace);
    }

    // Расчет kickerScore
    let kickerScore = 0;
    sortedValuesForKickers.forEach((val, index) => {
        kickerScore += val * Math.pow(15, 4 - index);
    });

    // Строгие константы базовых очков
    if (isStraight && isFlush) return { score: 80000000 + kickerScore, name: "Стрит-Флеш" };
    if (counts[0] === 4) return { score: 70000000 + kickerScore, name: "Каре" };
    if (counts[0] === 3 && counts[1] === 2) return { score: 60000000 + kickerScore, name: "Фулл-Хаус" };
    if (isFlush) return { score: 50000000 + kickerScore, name: "Флеш" };
    if (isStraight) return { score: 40000000 + kickerScore, name: "Стрит" };
    if (counts[0] === 3) return { score: 30000000 + kickerScore, name: "Сет" };
    if (counts[0] === 2 && counts[1] === 2) return { score: 20000000 + kickerScore, name: "Две Пары" };
    if (counts[0] === 2) return { score: 10000000 + kickerScore, name: "Пара" };

    return { score: kickerScore, name: "Старшая карта" };
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

    if (deck.length < count) {
        console.warn("[WARNING]: Карт в колоде мало! Срочная перетасовка.");
        tasov();
        deck = KOLODA; // Подменяем локальный deck на свежесозданную глобальную KOLODA
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
    // Сначала прячем фишку дилера у всех игроков
    players.forEach(p => {
        let selector = p.id === 'player' ? '.player .dealer-chip' : `#${p.id} .dealer-chip`;
        const chip = document.querySelector(selector);
        if (chip) chip.style.display = 'none';
    });

    // Показываем фишку ТОЛЬКО у текущего живого дилера
    const currentDealerPlayer = players[CURRENT_DEALER];
    if (currentDealerPlayer && currentDealerPlayer.budget > 0) {
        let activeSelector = currentDealerPlayer.id === 'player' ? '.player .dealer-chip' : `#${currentDealerPlayer.id} .dealer-chip`;
        const activeChip = document.querySelector(activeSelector);
        if (activeChip) activeChip.style.display = 'block';
    }
}

function makeAction(type) {
    const actionType = type.toUpperCase();
    PokerEngine.executeAction('player', actionType);
}

function calculatePots(allTablePlayers, activeShowdownPlayerIds) {
    // 1. Собираем ставки ВООБЩЕ ВСЕХ игроков, которые вкладывались в этот банк (даже сбросивших)
    let playerBets = allTablePlayers.map(p => ({
        id: p.id,
        amount: PokerEngine.gameState.totalBets ? (PokerEngine.gameState.totalBets[p.id] || 0) : 0,
        // Игрок реально в All-In для сайд-пота только если он активен, его бюджет 0, 
        // И кто-то поставил больше него (то есть его ставку зарейзили, а у него не было фишек доставиться)
        isAllIn: p.budget === 0 && activeShowdownPlayerIds.includes(p.id)
    }));

    // Проверяем, есть ли реальный ва-банк, который кто-то превысил.
    // Если все внесли одинаково, сбрасываем флаги All-In, чтобы не плодить ложные побочные банки.
    playerBets.forEach(p => {
        if (p.isAllIn) {
            const anyoneBetMore = playerBets.some(other => other.amount > p.amount);
            if (!anyoneBetMore) {
                p.isAllIn = false; // Это не создающий сайд-пот олл-ин, все уравнялись
            }
        }
    });

    let pots = [];

    // Крутим цикл, пока в массиве ставок есть хоть какие-то фишки
    while (playerBets.some(p => p.amount > 0)) {
        let contributors = playerBets.filter(p => p.amount > 0);

        // Ищем создателей сайд-потов (активных олл-инеров)
        let allInPlayers = contributors.filter(p => p.isAllIn);

        let minBet;
        if (allInPlayers.length > 0) {
            // Если есть зарейженный олл-ин, уровень банка отсекается по его ставке
            minBet = Math.min(...allInPlayers.map(p => p.amount));
        } else {
            // Если олл-инов нет, забираем остатки максимальных ставок
            minBet = Math.min(...contributors.map(p => p.amount));
        }

        let potAmount = 0;
        let allowedPlayers = [];

        playerBets.forEach(p => {
            if (p.amount > 0) {
                let contribution = Math.min(p.amount, minBet);
                potAmount += contribution;
                p.amount -= contribution;

                // Претендовать на этот кусок пирога могут ТЫЛЬКО те, кто не выкинул карты в Fold
                if (activeShowdownPlayerIds.includes(p.id)) {
                    allowedPlayers.push(p.id);
                }
            }
        });

        // Зачищаем флаг олл-ина у тех, чью ставку мы полностью «скушали» на этом уровне
        playerBets.forEach(p => {
            if (p.amount === 0) p.isAllIn = false;
        });

        pots.push({
            amount: potAmount,
            allowedPlayers: allowedPlayers
        });
    }

    // Если вдруг из-за фолдов создался пустой банк или банк без претендентов, 
    // склеиваем его с предыдущим (основным) банком
    return pots.filter(pot => pot.amount > 0 && pot.allowedPlayers.length > 0);
}

function showCustomConfirm(message) {
    return new Promise((resolve) => {
        // Создаем элементы через твой любимый чистый JS
        const overlay = document.createElement('div');
        overlay.className = 'custom-modal-overlay';

        const modal = document.createElement('div');
        modal.className = 'custom-modal-window';

        const textEl = document.createElement('div');
        textEl.className = 'custom-modal-text';
        textEl.innerText = message;

        const btnContainer = document.createElement('div');
        btnContainer.className = 'custom-modal-buttons';

        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'custom-modal-btn btn-confirm';
        confirmBtn.innerText = 'Принять вызов';

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'custom-modal-btn btn-cancel';
        cancelBtn.innerText = 'Завершить сессию';

        // Собираем пирог
        btnContainer.appendChild(confirmBtn);
        btnContainer.appendChild(cancelBtn);
        modal.appendChild(textEl);
        modal.appendChild(btnContainer);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Плавное появление (нужен микро-таймаут для запуска CSS transition)
        setTimeout(() => overlay.classList.add('active'), 10);

        // Функция закрытия окон
        const closeModal = (result) => {
            overlay.classList.remove('active');
            // Удаляем из DOM после завершения анимации
            setTimeout(() => overlay.remove(), 400);
            resolve(result);
        };

        // Навешиваем клики
        confirmBtn.onclick = () => closeModal(true);
        cancelBtn.onclick = () => closeModal(false);
    });
}

// =============================================================================
//  STORY DLC: VISUAL ENGINE (DIALOGUES & EFFECTS)
// =============================================================================

/**
 * Заставляет бота или игрока сказать фразу в "пузыре" комикса
 * @param {string} targetSelector - CSS селектор контейнера бокса бота (например '#bot-box-1')
 * @param {string} text - Текст реплики
 * @param {number} duration - Время отображения в мс
 */
function botSay(targetSelector, text, duration = 3500) {
    const container = document.querySelector(targetSelector);
    if (!container) { console.warn(`[STORY]: Контейнер ${targetSelector} не найден.`); return; }

    // На всякий случай удаляем старый пузырь, если бот еще не договорил прошлую фразу
    const oldBubble = container.querySelector('.speech-bubble');
    if (oldBubble) oldBubble.remove();

    const bubble = document.createElement('div');
    bubble.classList.add('speech-bubble');
    bubble.textContent = text;

    // Специфика Vanilla JS: контейнер должен быть relative, чтобы absolute пузырь встал ровно над ним
    if (window.getComputedStyle(container).position === 'static') {
        container.style.position = 'relative';
    }

    container.appendChild(bubble);

    // Плавное появление
    requestAnimationFrame(() => {
        bubble.classList.add('show');
    });

    // Плавное исчезновение и удаление
    setTimeout(() => {
        bubble.classList.remove('show');
        bubble.addEventListener('transitionend', () => {
            bubble.remove();
        });
    }, duration);
}

/**
 * Создает красивый визуальный эффект пролетающего сердечка между двумя точками
 */
function spawnHeartBetween(fromSelector, toSelector) {
    const fromEl = document.querySelector(fromSelector);
    const toEl = document.querySelector(toSelector);
    if (!fromEl || !toEl) return;

    const fromRect = fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();

    const heart = document.createElement('div');
    heart.innerHTML = '❤️';
    heart.classList.add('story-heart');

    // Начальная позиция (центр первого элемента)
    heart.style.left = `${fromRect.left + fromRect.width / 2}px`;
    heart.style.top = `${fromRect.top + fromRect.height / 2}px`;
    document.body.appendChild(heart);

    requestAnimationFrame(() => {
        heart.style.opacity = '1';
        heart.style.transform = 'scale(1.3) translateY(-20px)';

        // Перелет к центру второго элемента
        setTimeout(() => {
            heart.style.left = `${toRect.left + toRect.width / 2}px`;
            heart.style.top = `${toRect.top + toRect.height / 2}px`;
            heart.style.transform = 'scale(0.8)';
            heart.style.opacity = '0.7';
        }, 300);
    });

    // Чистка DOM
    setTimeout(() => {
        heart.style.opacity = '0';
        setTimeout(() => heart.remove(), 500);
    }, 2000);
}

// =============================================================================
//  STORY DLC: ГИБКАЯ СИНОПТИКА (game-func.js)
// =============================================================================
/**
 * Получает детальную погоду по конкретным координатам
 * @param {number|string} lat - Широта (по умолчанию Харьков)
 * @param {number|string} lon - Долгота (по умолчанию Харьков)
 * @returns {Promise<Object>}
 */
function fetchDetailedWeather(lat = 50.00, lon = 36.23) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m&wind_speed_unit=ms`;

    return fetch(url)
        .then(response => response.json())
        .then(data => {
            const current = data.current;
            return {
                temp: Math.round(current.temperature_2m),
                wind: Math.round(current.wind_speed_10m),
                code: current.weather_code
            };
        })
        .catch(err => {
            console.warn("[STORY API]: Не удалось получить погоду, включаем харьковский дефолт.");
            return { temp: 12, wind: 4, code: 3 };
        });
}

function loadSeptemberWeather() {
    if (StoryState.weatherLoaded) return;

    // Сначала определяем координаты по IP-адресу игрока
    fetch('https://ip-api.com/json/?fields=status,lat,lon')
        .then(res => res.json())
        .then(geo => {
            if (geo && geo.status === 'success') {
                console.log(`[STORY IP]: Координаты определены (${geo.lat}, ${geo.lon}). Запрашиваем погоду...`);
                return fetchDetailedWeather(geo.lat, geo.lon);
            } else {
                throw new Error('ip-api returned failed status');
            }
        })
        .catch(err => {
            console.warn("[STORY IP]: Не определили IP, переключаемся на Харьков по умолчанию.");
            // 50.00, 36.23 — координаты Харькова
            return fetchDetailedWeather(50.00, 36.23);
        })
        .then(weather => {
            // Когда погода (неважно, по IP или Харькову) пришла, сохраняем её вместе с датой
            const now = new Date();
            StoryState.weatherData = {
                temp: weather.temp,
                wind: weather.wind,
                code: weather.code,
                dayOfWeek: now.toLocaleDateString('ru-RU', { weekday: 'long' }),
                month: now.getMonth() + 1,
                dayOfMonth: now.getDate()
            };
            StoryState.weatherLoaded = true;
            console.log("[STORY]: Данные синоптика успешно зашиты в стейт:", StoryState.weatherData);
        });
}


// Функция, которая слепо берет текущий стейт из памяти и наполняет HTML

function updateWholeTableUI() {
    if (!players || !Array.isArray(players)) return;

    players.forEach((player, index) => {
        // ЖЕСТКИЙ ФИКС: Сначала отсекаем живого игрока, у него свой статический ID
        if (player.id === 'player') {
            const balanceEl = document.querySelector('#p-balance');
            if (balanceEl) balanceEl.textContent = `${player.budget}$`;
            return; // Выходим из итерации для игрока, ботов не считаем
        }

        // Теперь здесь гарантированно только боты. 
        // Чтобы индексы не сдвигались из-за игрока в массиве, проверяем реальный ID посадочного места бота:
        // Если у тебя боты в массиве идут строго под своими ID 'bot-1', 'bot-2', 'bot-3', завяжемся на них напрямую!
        const slotId = player.id; // 'bot-1', 'bot-2' или 'bot-3'
        const playerEl = document.querySelector(`#${slotId}`);

        if (!playerEl) {
            console.warn(`[UI REJECT]: Не найден HTML-слот #${slotId} для бота ${player.name}`);
            return;
        }

        // 1. Обновляем имя бота
        const nameEl = playerEl.querySelector('.white');
        if (nameEl && player.name) {
            nameEl.textContent = player.name + ' ';
        }

        // 2. Обновляем гендерный маркер
        const genderEl = playerEl.querySelector('.gender-marker');
        if (genderEl) {
            genderEl.className = 'gender-marker'; // Полный сброс старого пола
            const currentGender = String(player.gender || '').toLowerCase().trim();

            if (currentGender === 'female' || currentGender === 'f') {
                genderEl.classList.add('gender-female');
            } else {
                genderEl.classList.add('gender-male');
            }
        }

        // 3. Обновляем бюджет бота
        const botNum = slotId.replace('bot-', ''); // Вытащит 1, 2 или 3
        const balanceEl = document.querySelector(`#bot-balance-${botNum}`);
        if (balanceEl) {
            balanceEl.textContent = `${player.budget}$`;
        }
    });

    // 4. Обновляем банк
    const bankEl = document.querySelector('#bank');
    if (bankEl && PokerEngine.gameState) {
        bankEl.textContent = ` ${PokerEngine.gameState.pot || 0} $ `;
    }
}
