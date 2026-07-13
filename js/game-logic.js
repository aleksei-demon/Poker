'use strict';
// =============================================================================
//  GAME-LOGIC.JS — логика приложения и стейт-машина
// =============================================================================


// Массив имен тех, кого мы уже размазали (для фана и истории)
let defeatedBots = [];

// 1. Конфигурация игры (Глобальные переменные)
let SMALL_BLIND = 0;
let BIG_BLIND = 0;
let CURRENT_TOURNAMENT_LEVEL = 1; // Стартуем всегда с 1 уровня
// Внутри PokerEngine.gameState или как константу сверху файла:
const TOURNAMENT_STRUCTURE = [
    { level: 1, sb: 5, bb: 10 },
    { level: 2, sb: 10, bb: 20 },
    { level: 3, sb: 20, bb: 40 },
    { level: 4, sb: 40, bb: 80 },
    { level: 5, sb: 50, bb: 100 },// На этом уровне со стеком 100$ начнется жесткое месиво
];

let CURRENT_DEALER = 0;

function getNextActivePlayerIndex(startIndex) {
    let index = startIndex;
    for (let i = 0; i < players.length; i++) {
        index = (index + 1) % players.length;
        if (players[index].budget > 0) {
            return index;
        }
    }
    return startIndex;
}

// Пул новых ботов, которые ждут своей очереди в клубе
const BOT_RESERVE = [
    { name: 'Аркадий', gender: 'male', style: 'AGRESSIVE', bluffChance: 0.15, aggression: 2.2, looseFactor: 1.1 },
    { name: 'Платон', gender: 'male', style: 'MATH', bluffChance: 0.00, aggression: 1.0, looseFactor: 0.9 },
    { name: 'Федя', gender: 'male', style: 'BLUFF', bluffChance: 0.40, aggression: 1.6, looseFactor: 1.2 },
    { name: 'Михалыч', gender: 'male', style: 'ROCK', bluffChance: 0.02, aggression: 0.8, looseFactor: 0.85 },
    { name: 'Гарик', gender: 'male', style: 'LOOSE', bluffChance: 0.20, aggression: 1.4, looseFactor: 1.4 },
    { name: 'Сентябрь', gender: 'male', style: 'RANDOM', bluffChance: 0.50, aggression: 1.8, looseFactor: 1.0 },
    { name: 'Болт', gender: 'male', style: 'BOLT', bluffChance: 0.99, aggression: 5.0, looseFactor: 2.0 },

    // Добавляем девчонок в резерв, чтобы протестировать смену пола на полную!
    { name: 'Катя', gender: 'female', style: 'MATH', bluffChance: 0.05, aggression: 1.2, looseFactor: 0.95 },
    { name: 'Диана', gender: 'female', style: 'AGRESSIVE', bluffChance: 0.25, aggression: 2.0, looseFactor: 1.15 },
    { name: 'Ленка', gender: 'female', style: 'BLUFF', bluffChance: 0.45, aggression: 1.5, looseFactor: 1.3 }
];

// =============================================================================
// ИНИЦИАЛИЗАЦИЯ УЧАСТНИКОВ И ПРОФИЛЕЙ (БЕТОННАЯ СТРУКТУРА)
// =============================================================================

// 1. Берем случайного бота из резерва на место Андрея для ПЕРВОЙ игры
// (Предполагаем, что у ботов в BOT_RESERVE уже прописаны name, style, gender)
const randomFirstBot = BOT_RESERVE[Math.floor(Math.random() * BOT_RESERVE.length)];

// 2. Инициализируем профили (Ветал и 404 всегда со старта)
// gender может быть 'male' (m) или 'female' (f)
const BOT_PROFILES = {
    'bot-1': {
        name: randomFirstBot.name,
        style: randomFirstBot.style,
        gender: randomFirstBot.gender || 'male', // Страховка дефолта
        bluffChance: randomFirstBot.bluffChance || 0.15,
        aggression: randomFirstBot.aggression || 1.2,
        looseFactor: randomFirstBot.looseFactor || 1.1
    },
    'bot-2': {
        name: 'Ветал',
        style: 'MANIAC',
        gender: 'male',
        bluffChance: 0.25,
        aggression: 2.5,
        looseFactor: 1.3
    },
    'bot-3': {
        name: '404',
        style: 'GTO',
        gender: 'female',
        bluffChance: 0.12,
        aggression: 1.0,
        looseFactor: 1.0
    }
};

// 3. СВЯЗЫВАЕМ СТАРТОВЫЙ МАССИВ ИГРОКОВ С ПРОФИЛЯМИ (С полной передачей гендера!)
let players = [
    {
        id: 'player',
        name: 'Вы',
        budget: 100,
        cards: [],
        gender: 'male' // Или любой дефолт, для игрока обычно UI статичен
    },
    {
        id: 'bot-1',
        name: BOT_PROFILES['bot-1'].name,
        gender: BOT_PROFILES['bot-1'].gender, // ВОТ ОН, КЛЮЧЕВОЙ ФИКС ДЛЯ ИНДИКАТОРА!
        budget: 100,
        strategy: BOT_PROFILES['bot-1'].style,
        cards: [],
        // Доп. переменные для ИИ, чтобы runBotLogic брал их прямо отсюда
        bluffChance: BOT_PROFILES['bot-1'].bluffChance,
        aggression: BOT_PROFILES['bot-1'].aggression,
        looseFactor: BOT_PROFILES['bot-1'].looseFactor
    },
    {
        id: 'bot-2',
        name: BOT_PROFILES['bot-2'].name,
        gender: BOT_PROFILES['bot-2'].gender,
        budget: 100,
        strategy: BOT_PROFILES['bot-2'].style,
        cards: [],
        bluffChance: BOT_PROFILES['bot-2'].bluffChance,
        aggression: BOT_PROFILES['bot-2'].aggression,
        looseFactor: BOT_PROFILES['bot-2'].looseFactor
    },
    {
        id: 'bot-3',
        name: BOT_PROFILES['bot-3'].name,
        gender: BOT_PROFILES['bot-3'].gender,
        budget: 100,
        strategy: BOT_PROFILES['bot-3'].style,
        cards: [],
        bluffChance: BOT_PROFILES['bot-3'].bluffChance,
        aggression: BOT_PROFILES['bot-3'].aggression,
        looseFactor: BOT_PROFILES['bot-3'].looseFactor
    }
];

console.log("[ENGINE INIT]: Профили игроков и гендерные маркеры успешно разложены по памяти.", players);
function startNextTournamentRound() {
    console.log("=== СМЕНА СОСТАВА: ЗА СТОЛ САДЯТСЯ НОВЫЕ ИГРОКИ ===");

    // 1. Перемешиваем резерв, чтобы боты выпадали случайно
    const shuffledReserve = [...BOT_RESERVE].sort(() => Math.random() - 0.5);

    // 2. Обновляем глобальные профили для ИИ
    BOT_PROFILES['bot-1'] = shuffledReserve[0];
    BOT_PROFILES['bot-2'] = shuffledReserve[1];
    BOT_PROFILES['bot-3'] = shuffledReserve[2];

    // 3. Синхронизируем массив игроков (с ПОЛНЫМ переносом гендера!)
    players.forEach(p => {
        if (p.id !== 'player') {
            const currentProfile = BOT_PROFILES[p.id];

            p.name = currentProfile.name;
            p.gender = currentProfile.gender;   // <--- ЖЕСТКИЙ ФИКС: Сохраняем пол в массив players!
            p.strategy = currentProfile.style; // Железно пишем актуальный стиль для runBotLogic!
            p.budget = 100;                     // Сбрасываем стек до 100$ для защиты титула

            // До кучи переносим ИИ-параметры, чтобы боты не тупили со старыми настройками
            p.bluffChance = currentProfile.bluffChance || 0.15;
            p.aggression = currentProfile.aggression || 1.2;
            p.looseFactor = currentProfile.looseFactor || 1.1;

            // Массив p.cards НЕ очищаем здесь вслепую, чтобы не сломать раздачу движка!
        }
    });

    console.log(`[TOURNAMENT]: Состав обновлен. На местах: ${players[1].name} (${players[1].gender}), ${players[2].name} (${players[2].gender}), ${players[3].name} (${players[3].gender})`);

    // 4. СБРОС UI: возвращаем боксам ботов живой вид и обновляем данные (имена и балансы)
    players.forEach(p => {
        // Убираем класс вылета (.eliminated), который повесил checkTableBankruptcy
        const selector = p.id === 'player' ? '.player' : `#${p.id}`;
        const el = document.querySelector(selector);
        if (el) el.classList.remove('eliminated');

        // Сбрасываем прозрачность карт (очистка эффекта FOLD)
        const cardsSelector = p.id === 'player' ? '#cards-p' : `#cards-${p.id.split('-')[1]}`;
        const cardsEl = document.querySelector(cardsSelector);
        if (cardsEl) cardsEl.style.opacity = '1';

        // Обновляем балансы и имена на экране (у ботов встанут новые имена и по 100$)
        PokerEngine.syncBalancesUI(p);
    });

    // КРИТИЧЕСКИЙ ВЫЗОВ: Принудительно заставляем таблицу перерисовать имена и МАРКЕРЫ ПОЛА!
    if (typeof updateWholeTableUI === 'function') {
        updateWholeTableUI();
    }

    // 5. Сбрасываем блайнды на стартовый Уровень 1
    if (PokerEngine.gameState) {
        PokerEngine.gameState.handsPlayed = 0;
        PokerEngine.gameState.currentLevelIdx = 0;
    }
    SMALL_BLIND = 5;
    BIG_BLIND = 10;

    console.log("[TOURNAMENT]: Раунд защиты титула запущен! Начинаем новую раздачу.");

    // 6. Запускаем новую раздачу через твой стандартный метод!
    startNewHand();
}

// =============================================================================
//  STORY DLC: STATE ENGINE
// =============================================================================
const StoryState = {
    mihalichSavedPlayer: false,
    vetalSaved404: false,
    weatherLoaded: false,
    weatherData: null,
    septemberCommentedWeather: false // Флаг, чтобы Сентябрь ворчал один раз
};




// 2.==== Д В И Ж О К   И Г Р Ы ===============================
const PokerEngine = {
    gameState: {
        pot: 0,
        currentBet: 0,
        activePlayerIndex: 0,
        lastRaiseIndex: 0,
        roundBets: {},      // Ставки текущего раунда (сбрасываются каждую улицу)
        foldedPlayers: [],   // Игроки, сбросившие карты
        street: 'PREFLOP',
        actedPlayers: [],   // ID тех, кто сделал действие на текущей улице
        totalBets: {},      // Накопленные за всю раздачу ставки (для Side Pots)
        board: [],          // Карты на столе
        botTimer: null,
    },

    // Добавь этот геттер внутрь объекта или класса PokerEngine для удобства
    get activePlayers() {
        // Возвращает только тех, кто в игре (не выбыл по деньгам и не сбросил карты в этой раздаче)
        return players.filter(p => p.budget > 0 && !this.gameState.foldedPlayers.includes(p.id));
    },

    initPreflop() {
        // ТРИГГЕР РОСТА БЛАЙНДОВ: "Ад и Израиль"
        updateTournamentLevel();
        // 1. Сброс состояния для новой раздачи
        this.gameState.currentBet = BIG_BLIND;
        this.gameState.foldedPlayers = [];
        this.gameState.roundBets = { 'player': 0, 'bot-1': 0, 'bot-2': 0, 'bot-3': 0 };
        this.gameState.totalBets = { 'player': 0, 'bot-1': 0, 'bot-2': 0, 'bot-3': 0 };
        this.gameState.street = 'PREFLOP';
        this.gameState.actedPlayers = [];
        this.gameState.board = [];

        // 2. Автоматически отправляем в фолд выбывших игроков ДО расчета блайндов
        players.forEach(p => {
            if (p.budget <= 0) {
                if (!this.gameState.foldedPlayers.includes(p.id)) {
                    this.gameState.foldedPlayers.push(p.id);
                }
                this.syncFoldUI(p.id);
            }
        });

        // 3. Рассчитываем блайнды от текущего дилера через твою функцию поиска живых игроков
        const sbPlayerIndex = getNextActivePlayerIndex(CURRENT_DEALER);
        const bbPlayerIndex = getNextActivePlayerIndex(sbPlayerIndex);

        const sbPlayer = players[sbPlayerIndex];
        const bbPlayer = players[bbPlayerIndex];

        // 4. Списываем фишки (защита от нехватки баланса на блайнд)
        const sbActual = Math.min(sbPlayer.budget, SMALL_BLIND);
        const bbActual = Math.min(bbPlayer.budget, BIG_BLIND);

        makeAutomaticBet(sbPlayer, sbActual);
        makeAutomaticBet(bbPlayer, bbActual);

        // Фиксируем ставки в стейте движка
        this.gameState.roundBets[sbPlayer.id] = sbActual;
        this.gameState.roundBets[bbPlayer.id] = bbActual;
        this.gameState.totalBets[sbPlayer.id] = sbActual;
        this.gameState.totalBets[bbPlayer.id] = bbActual;

        // Если блайнд вынудил игрока зайти Ва-Банк, помечаем его как сходившего
        if (sbPlayer.budget === 0) this.gameState.actedPlayers.push(sbPlayer.id);
        if (bbPlayer.budget === 0) this.gameState.actedPlayers.push(bbPlayer.id);

        // 5. Синхронизируем UI банка стола
        const bankEl = document.querySelector('#bank');
        if (bankEl) {
            bankEl.textContent = ` ${this.gameState.pot} $ `;
        }

        // 6. Первым на префлопе ходит UTG (игрок, следующий ЗА Большим Блайндом)
        // Используем твою функцию, чтобы гарантированно выбрать живого игрока!
        this.gameState.activePlayerIndex = getNextActivePlayerIndex(bbPlayerIndex);

        console.log(`[ENGINE]: Торги начались. Первым ходит: ${players[this.gameState.activePlayerIndex].name}`);

        // Передаем управление циклу ходов
        this.startWaitingForAction();
    },

    startWaitingForAction() {
        const activePlayer = players[this.gameState.activePlayerIndex];

        // Если вдруг круг дошел до игрока без фишек (All-In), принудительно пушим его в acted и идем дальше
        if (activePlayer.budget <= 0 && !this.gameState.foldedPlayers.includes(activePlayer.id)) {
            if (!this.gameState.actedPlayers.includes(activePlayer.id)) {
                this.gameState.actedPlayers.push(activePlayer.id);
            }
            this.checkRoundCompletion();
            return;
        }

        this.highlightActivePlayerUI(activePlayer.id);
        console.log(`[ОЧЕРЕДЬ]: Ход ID: ${activePlayer.id} (${activePlayer.name})`);

        if (this.gameState.botTimer) {
            clearTimeout(this.gameState.botTimer);
            this.gameState.botTimer = null;
        }

        if (activePlayer.id === 'player') {
            this.toggleControlsUI(true);
        } else {
            this.toggleControlsUI(false);
            this.gameState.botTimer = setTimeout(() => {
                if (this.getCurrentPlayerId() === activePlayer.id) {
                    runBotLogic(activePlayer.id);
                }
            }, 2500);
        }
    },

    handleFold(playerId) {
        if (!this.gameState.foldedPlayers.includes(playerId)) {
            this.gameState.foldedPlayers.push(playerId);
        }

        const pName = players.find(p => p.id === playerId).name;
        console.log(`[ENGINE]: ${pName} — FOLD.`);
        this.syncFoldUI(playerId);

        const activePlayersCount = players.length - this.gameState.foldedPlayers.length;
        if (activePlayersCount === 1) {
            this.handleLoneSurvivorWin();
            return true;
        }
        return false;
    },

    handleLoneSurvivorWin() {
        const winner = players.find(p => !this.gameState.foldedPlayers.includes(p.id));
        console.log(`=== ДОСРОЧНЫЙ ФИНАЛ: Все сфолдили ===`);

        winner.budget += this.gameState.pot;
        this.syncBalancesUI(winner);

        if (this.gameState.botTimer) {
            clearTimeout(this.gameState.botTimer);
            this.gameState.botTimer = null;
        }

        showMessage_(`${winner.name} забирает банк ${this.gameState.pot}$!`, 4000);

        setTimeout(() => {
            // Если метод вернул true (игра закончена или идет катсцена) — просто выходим
            if (this.checkTableBankruptcy()) {
                console.log("[TOURNAMENT]: Следующая раздача отменена, за столом сюжетное событие или чемпион.");
                return;
            }
            startNewHand();
        }, 5500);
    },

    handleCall(playerId) {
        const playerObj = players.find(p => p.id === playerId);
        const alreadyBet = this.gameState.roundBets[playerId] || 0;
        let callAmount = this.gameState.currentBet - alreadyBet;

        if (callAmount > playerObj.budget) {
            callAmount = playerObj.budget;
        }

        playerObj.budget -= callAmount;
        this.gameState.pot += callAmount;
        this.gameState.roundBets[playerId] = alreadyBet + callAmount;
        this.gameState.totalBets[playerId] = (this.gameState.totalBets[playerId] || 0) + callAmount;

        this.syncBalancesUI(playerObj);
        console.log(`[ENGINE]: ${playerObj.name} — CALL (+${callAmount}$). Всего в поте: ${this.gameState.totalBets[playerId]}$`);
    },

    handleRaise(playerId, raiseAmount) {
        const playerObj = players.find(p => p.id === playerId);
        const targetTotalBet = this.gameState.currentBet + raiseAmount;
        const alreadyBet = this.gameState.roundBets[playerId] || 0;
        let amountToDeduct = targetTotalBet - alreadyBet;

        if (amountToDeduct > playerObj.budget) {
            amountToDeduct = playerObj.budget;
        }

        playerObj.budget -= amountToDeduct;
        this.gameState.pot += amountToDeduct;
        this.gameState.roundBets[playerId] = alreadyBet + amountToDeduct;
        this.gameState.currentBet = this.gameState.roundBets[playerId];
        this.gameState.totalBets[playerId] = (this.gameState.totalBets[playerId] || 0) + amountToDeduct;

        // СБРОС СЛЕДУЮЩИХ ИГРОКОВ: Переоткрываем торги для тех, кто может платить
        // Оставляем в actedPlayers только текущего рейзера и тех, у кого нет фишек (олл-инеров)
        this.gameState.actedPlayers = players
            .filter(p => p.budget === 0 && !this.gameState.foldedPlayers.includes(p.id))
            .map(p => p.id);

        if (!this.gameState.actedPlayers.includes(playerId)) {
            this.gameState.actedPlayers.push(playerId);
        }

        this.syncBalancesUI(playerObj);
        console.log(`[ENGINE]: ${playerObj.name} — RAISE (+${raiseAmount}$). Тотал ставки раунда: ${this.gameState.currentBet}$`);
    },

    handleAllIn(playerId) {
        const playerObj = players.find(p => p.id === playerId);
        if (playerObj.budget <= 0) return;

        const allInAmount = playerObj.budget;
        const alreadyBet = this.gameState.roundBets[playerId] || 0;
        const playerTotalRoundBet = alreadyBet + allInAmount;

        playerObj.budget = 0;
        this.gameState.pot += allInAmount;
        this.gameState.roundBets[playerId] = playerTotalRoundBet;
        this.gameState.totalBets[playerId] = (this.gameState.totalBets[playerId] || 0) + allInAmount;

        // Если олл-ин повышает текущую ставку — это считается как полноценный рейз
        if (playerTotalRoundBet > this.gameState.currentBet) {
            this.gameState.currentBet = playerTotalRoundBet;

            this.gameState.actedPlayers = players
                .filter(p => p.budget === 0 && !this.gameState.foldedPlayers.includes(p.id))
                .map(p => p.id);
        }

        if (!this.gameState.actedPlayers.includes(playerId)) {
            this.gameState.actedPlayers.push(playerId);
        }

        this.syncBalancesUI(playerObj);
        console.log(`[ENGINE]: ${playerObj.name} — ALL-IN (${playerTotalRoundBet}$)`);
    },

    checkRoundCompletion() {
        // Игроки, которые не сдались И у которых есть фишки для продолжения торгов
        const activeBettingPlayers = players.filter(p =>
            !this.gameState.foldedPlayers.includes(p.id) && p.budget > 0
        );

        // Если остался максимум один игрок с фишками (остальные в олл-ине или фолде)
        if (activeBettingPlayers.length <= 1) {
            // Проверяем, уровняли ли оставшиеся ставку
            const activePlayers = players.filter(p => !this.gameState.foldedPlayers.includes(p.id));
            const allMatched = activePlayers.every(p => {
                // Если игрок в олл-ине, он не может уравнять больше своего стека, проверяем только платежеспособных
                if (p.budget > 0) {
                    return (this.gameState.roundBets[p.id] || 0) === this.gameState.currentBet;
                }
                return true;
            });

            if (allMatched) {
                console.log("[ENGINE]: Торги завершены (активных игроков нет, либо ставки выровнены).");
                this.advanceStreet();
                return;
            }
        }

        // Стандартная проверка круга
        const activePlayers = players.filter(p => !this.gameState.foldedPlayers.includes(p.id));
        const allActed = activePlayers.every(p => this.gameState.actedPlayers.includes(p.id));
        const allMatched = activePlayers.every(p => {
            if (p.budget <= 0) return true; // Олл-инеров не вашим проверять на полное равенство верхнего лимита
            return (this.gameState.roundBets[p.id] || 0) === this.gameState.currentBet;
        });

        if (allActed && allMatched) {
            console.log(`[ENGINE]: Раунд ${this.gameState.street} успешно завершен.`);
            this.advanceStreet();
        } else {
            this.nextTurn();
        }
    },

    advanceStreet() {
        if (this.gameState.botTimer) {
            clearTimeout(this.gameState.botTimer);
            this.gameState.botTimer = null;
        }

        this.gameState.actedPlayers = [];
        this.gameState.currentBet = 0;
        this.gameState.roundBets = { 'player': 0, 'bot-1': 0, 'bot-2': 0, 'bot-3': 0 };

        // Если в игре осталось 2+ живых игрока, но только у одного (или ни у кого) есть фишки —
        // это ситуация, когда торги больше невозможны. Крутим борд до шоудауна.
        const livePlayersWithMoney = players.filter(p => !this.gameState.foldedPlayers.includes(p.id) && p.budget > 0);
        const autoRunBoard = livePlayersWithMoney.length <= 1;

        const msDelay = autoRunBoard ? 1200 : 2000;

        if (this.gameState.street === 'PREFLOP') {
            this.gameState.street = 'FLOP';
            showMessage_("Флоп!", msDelay, true);
            const newCards = dealCards(KOLODA, 3, '#board', false);

            // Чистый вариант: Жестко присваиваем массив из 3 новых карт флопа
            this.gameState.board = [...newCards];

            setTimeout(() => { autoRunBoard ? this.advanceStreet() : this.resetTurnForNewStreet(); }, msDelay);

        } else if (this.gameState.street === 'FLOP') {
            this.gameState.street = 'TURN';
            showMessage_("Терн!", msDelay, true);
            const newCards = dealCards(KOLODA, 1, '#board', false);

            // Чистый вариант: Берем старые 3 карты и дописываем 1 новую с Терна
            this.gameState.board = [...this.gameState.board, ...newCards];

            setTimeout(() => { autoRunBoard ? this.advanceStreet() : this.resetTurnForNewStreet(); }, msDelay);

        } else if (this.gameState.street === 'TURN') {
            this.gameState.street = 'RIVER';
            showMessage_("Ривер!", msDelay, true);
            const newCards = dealCards(KOLODA, 1, '#board', false);

            // Чистый вариант: Берем 4 карты стола и дописываем последнюю 1 карту Ривера
            this.gameState.board = [...this.gameState.board, ...newCards];

            setTimeout(() => { this.advanceStreet(); }, msDelay);

        } else if (this.gameState.street === 'RIVER') {
            this.gameState.street = 'SHOWDOWN';
            showMessage_("Вскрытие карт!", 3000);
            this.handleShowdown();
        }
    },

    resetTurnForNewStreet() {
        // На постфлопе первый — Малый Блайнд (позиция Dealer + 1)
        this.gameState.activePlayerIndex = (CURRENT_DEALER + 1) % players.length;

        // Пропускаем тех, кто в фолде
        while (this.gameState.foldedPlayers.includes(this.getCurrentPlayerId())) {
            this.gameState.activePlayerIndex = (this.gameState.activePlayerIndex + 1) % players.length;
        }

        this.startWaitingForAction();
    },

    handleShowdown() {
        this.toggleControlsUI(false);
        const boardCards = this.gameState.board || [];
        const activePlayers = players.filter(p => !this.gameState.foldedPlayers.includes(p.id));
        const showdownResults = [];

        activePlayers.forEach(p => {
            const rawPlayerCards = Array.isArray(p.cards) ? p.cards : [];
            const rawBoardCards = Array.isArray(boardCards) ? boardCards : [];

            // БЕРЕМ СТРОГО ПОСЛЕДНИЕ 2 КАРТЫ ИГРОКА И ПОСЛЕДНИЕ 5 КАРТ СТОЛА
            // Это защитит от забытых не очищенных массивов из прошлых раундов
            const cleanPlayer = rawPlayerCards.filter(c => typeof c === 'string' && c.length === 1).slice(-2);
            const cleanBoard = rawBoardCards.filter(c => typeof c === 'string' && c.length === 1).slice(-5);

            const sevenCards = [...cleanPlayer, ...cleanBoard];

            // Вызываем калькулятор
            const bestHand = getBestCombination(sevenCards);

            console.log(`[SHOWDOWN СТРОГИЙ] Игрок: ${p.name}, Карты (${sevenCards.length}):`, sevenCards, `-> ${bestHand.name}`);

            showdownResults.push({
                id: p.id,
                name: p.name,
                score: bestHand.score,
                handName: bestHand.name
            });
        });

        showdownResults.sort((a, b) => b.score - a.score);

        let delay = 500;

        // Вскрытие карт человека
        const playerRes = showdownResults.find(r => r.id === 'player');
        if (playerRes) {
            setTimeout(() => { showMessage_(`у вас: ${playerRes.handName}`, 1400); }, delay);
            delay += 1500;
        }

        // Вскрытие живых ботов
        const activeBots = activePlayers.filter(p => p.id !== 'player');
        activeBots.forEach((bot) => {
            const currentBotRes = showdownResults.find(r => r.id === bot.id);
            if (!currentBotRes) return;

            setTimeout(() => {
                const botZone = document.querySelector(`#cards-${bot.id.replace('bot-', '')}`);
                if (botZone) {
                    const cards = botZone.querySelectorAll('span.card');
                    cards.forEach(card => {
                        card.classList.add('edge-on');
                        card.addEventListener('transitionend', function handler(e) {
                            if (e.propertyName !== 'transform') return;
                            card.removeEventListener('transitionend', handler);
                            card.classList.remove('card-back');
                            card.classList.add('card-front');
                            card.classList.remove('edge-on');
                        });
                    });
                }
                showMessage_(`${bot.name}: ${currentBotRes.handName}`, 1400);
            }, delay);
            delay += 1500;
        });

        // Финансовый расчет распределения потов (с учетом Side Pots)
        setTimeout(() => {
            console.log("--- РАСЧЕТ БАНКОВ (SIDE POTS) ---");

            // 1. Передаем глобальный массив players (чтобы собрать фишки со всех, даже сбросивших)
            // 2. Передаем массив ID только активных участников вскрытия
            const activeIds = activePlayers.map(p => p.id);
            const finalPots = calculatePots(players, activeIds);
            let totalDelay = 0;

            // =========================================================================
            // ЖЕСТКИЙ АНТИ-БАГ ХАК ДЛЯ ИГРЫ 1 НА 1 (HEADS-UP)
            // Если за столом осталось всего 2 живых претендента на вскрытии, 
            // никаких "побочных" банков быть не может. Склеиваем всё в один Основной банк!
            // =========================================================================
            if (activePlayers.length <= 2 && finalPots.length > 1) {
                console.warn(`[POTS FIX]: Обнаружен баг calculatePots в игре 1х1. Склеиваем ${finalPots.length} банков в один.`);

                // 1. Считаем общую сумму всех некорректно нарезанных банков
                const totalAmount = finalPots.reduce((sum, p) => sum + p.amount, 0);

                // 2. БЕЗОПАСНЫЙ МУТАЦИОННЫЙ ФИКС: 
                // Очищаем массив finalPots с 0-го индекса до конца и сразу вставляем один правильный банк
                finalPots.splice(0, finalPots.length, {
                    amount: totalAmount,
                    allowedPlayers: activePlayers.map(p => p.id)
                });
            }

            finalPots.forEach((pot, index) => {
                // Если банк пустой (баг расчетов), просто пропускаем его
                if (pot.amount <= 0) return;

                setTimeout(() => {
                    // Отбираем игроков, которые имеют право на этот конкретный банк
                    let candidates = showdownResults.filter(res => pot.allowedPlayers.includes(res.id));

                    // Сортируем по убыванию силы комбинации
                    candidates.sort((a, b) => b.score - a.score);

                    if (candidates.length === 0) return;

                    // =========================================================================
                    // РЕШЕНИЕ ПРОБЛЕМЫ НИЧЬЕЙ (SPLIT POT)
                    // Находим ВСЕХ игроков, у которых максимальный score равен лучшему
                    // =========================================================================
                    const maxScore = candidates[0].score;
                    const potWinners = candidates.filter(c => c.score === maxScore);

                    // Делим сумму банка на количество победителей
                    const shareAmount = Math.floor(pot.amount / potWinners.length);
                    const potType = index === 0 ? "Основной банк" : `Побочный банк #${index}`;

                    potWinners.forEach(potWinner => {
                        let winText = `${potWinner.name} забирает часть банка ${potType} (${shareAmount} $) с комбинацией: ${potWinner.handName}! 🏆`;

                        if (potWinner.id === 'player') {
                            winText = `Вы забираете часть банка ${potType} (${shareAmount} $)! 🎉🏆`;
                        }

                        // Если победитель один — текст стандартный
                        if (potWinners.length === 1) {
                            winText = potWinner.id === 'player'
                                ? `Вы забираете ${potType} (${pot.amount} $)! 🎉🏆`
                                : `${potWinner.name} забирает ${potType} (${pot.amount} $) с комбинацией: ${potWinner.handName}! 🏆`;
                        }

                        showMessage_(winText, 3000);

                        // Начисляем деньги в память и обновляем UI
                        const winnerObj = players.find(p => p.id === potWinner.id);
                        if (winnerObj) {
                            // Если деление неровное, последнему может упасть на 1$ меньше/больше, 
                            // но для простоты отдаем ровную долю shareAmount
                            winnerObj.budget += (potWinners.length === 1) ? pot.amount : shareAmount;

                            // Используем твой починенный syncBalancesUI!
                            this.syncBalancesUI(winnerObj);
                        }
                    });

                }, totalDelay);

                totalDelay += 3500;
            });

            // Конец раздачи: Проверка на глобальное банкротство стола
            setTimeout(() => {
                this.gameState.pot = 0;
                this.gameState.totalBets = {};

                // Вызываем проверку. Если она вернула true — стопаем движок. 
                if (this.checkTableBankruptcy()) {
                    console.log("[ENGINE STOP]: Перехват банкротства сработал. Ждем таймеры сцен.");
                    return;
                }

                // Если банкротов нет — спокойно идем в следующую раздачу
                startNewHand();
            }, totalDelay + 500);

        }, delay + 500);
    },

    checkTableBankruptcy() {
        // =========================================================================
        // ЖЕСТКАЯ ЗА ЗАЩИТА: Выбивать или спасать можно ТОЛЬКО когда раздача ОКОНЧЕНА.
        // Если идет PREFLOP, FLOP, TURN или RIVER — игроки с 0 балансом сидят в All-In!
        // =========================================================================
        if (PokerEngine && PokerEngine.gameState) {
            const currentStreet = PokerEngine.gameState.street;
            if (currentStreet !== 'SHOWDOWN' && currentStreet !== 'END_HAND') {
                console.log(`[TOURNAMENT]: Защита All-In активна. Улица: ${currentStreet}. Проверка банкротства пропущена.`);
                return false;
            }
        }

        let activeCount = 0;

        // Первичный подсчет живых игроков
        players.forEach(p => {
            const selector = p.id === 'player' ? '.player' : `#${p.id}`;
            const el = document.querySelector(selector);

            if (p.budget <= 0) {
                if (el && !el.classList.contains('eliminated')) {
                    el.classList.add('eliminated');
                    console.log(`[TOURNAMENT]: Игрок ${p.name} официально покинул турнир.`);
                }
            } else {
                activeCount++;
                if (el) el.classList.remove('eliminated');
            }
        });

        // =========================================================================
        // 1. ИНТЕРАКТИВНЫЙ ФИНАЛ: ТУРНИР ОПРЕДЕЛИЛ ПОБЕДИТЕЛЯ (ОСТАЛСЯ 1 ИГРОК)
        // =========================================================================
        if (activeCount === 1) {
            if (this.gameState && this.gameState.botTimer) {
                clearTimeout(this.gameState.botTimer);
                this.gameState.botTimer = null;
            }

            const winner = players.find(p => p.budget > 0);

            if (winner.id !== 'player') {
                showMessage_(`🏆 ТУРНИР ЗАВЕРШЕН! Победитель: ${winner.name}!`, 10000);
                return true;
            }

            const losers = players.filter(p => p.id !== 'player').map(p => p.name).join(', ');
            const victoryText = `🏆 Поздравляем! Вы обыграли всех (${losers}). Новые лица уже за столом!`;

            showMessage_(victoryText, 12000);

            setTimeout(async () => {
                const playAgain = await showCustomConfirm("За Клубный Стол приглашаются новые лица! Готов рискнуть бюджетом?");
                if (playAgain && typeof startNextTournamentRound === 'function') {
                    startNextTournamentRound();
                }
            }, 5000);

            return true;
        }

        // =========================================================================
        // 2. ДУШЕВНЫЙ ПЕРЕХВАТ: ЕСЛИ КТО-ТО ОБАНКРОТИЛСЯ (ПОСЛЕ ВСКРЫТИЯ КАРТ)
        // =========================================================================
        const luckyReceiver = players.find(p => p.budget <= 0);

        // Если есть обнулившийся игрок и сработал шанс 50%
        if (luckyReceiver && !StoryState.mihalichSavedPlayer && Math.random() < 0.5) {

            let saviorBot = null;
            const giftAmount = (luckyReceiver.id === 'player') ? 20 : 5;
            const minDonorBudget = (luckyReceiver.id === 'player') ? 45 : 15;

            // СЦЕНАРИЙ А: Обнулилась 404 -> Её спасает СТРОГО Ветал (если у него есть деньги)
            if (luckyReceiver.name === '404') {
                saviorBot = players.find(p => p.name === 'Ветал' && p.budget >= minDonorBudget);
            }
            // СЦЕНАРИЙ Б: Обнулился Человек (игрок) -> Его спасает любой живой бот, КРОМЕ 404
            else if (luckyReceiver.id === 'player') {
                const kindBots = players.filter(p =>
                    p.id !== 'player' &&
                    p.name !== '404' &&
                    !p.id.includes('404') &&
                    p.budget >= minDonorBudget
                );
                if (kindBots.length > 0) {
                    saviorBot = kindBots[Math.floor(Math.random() * kindBots.length)];
                }
            }
            // Все остальные случаи (бот обнулил бота, или 404 пытается кого-то спасти) — игнорируются.
            // saviorBot останется null, и сработает стандартный вылет.

            // Если спаситель найден по одному из двух разрешенных сценариев — запускаем магию
            if (saviorBot) {
                StoryState.mihalichSavedPlayer = true;
                console.log(`[STORY]: Бот ${saviorBot.name} спасает ${luckyReceiver.name} на сумму ${giftAmount}$.`);

                // А. УНИВЕРСАЛЬНАЯ ФУНКЦИЯ ОБНОВЛЕНИЯ DOM
                const updateVisualBalance = (pObject, newBalance) => {
                    if (pObject.id === 'player') {
                        const myBalanceSpan = document.getElementById('p-balance') || document.querySelector('#p-balance');
                        if (myBalanceSpan) myBalanceSpan.innerText = ` ${newBalance} $`;
                    }

                    if (pObject.name === '404') {
                        const bot3Balance = document.getElementById('bot-balance-3') || document.querySelector('#bot-balance-3');
                        if (bot3Balance) bot3Balance.innerText = ` ${newBalance} $`;
                    }

                    let el = document.getElementById(pObject.id) || document.querySelector(pObject.id.startsWith('#') ? pObject.id : `#${pObject.id}`);
                    if (!el && pObject.id === 'player') el = document.querySelector('.player');

                    if (!el) {
                        const allSeats = document.querySelectorAll('.player, .bot, .player-seat, [class*="bot"]');
                        for (let seat of allSeats) {
                            if (seat.textContent.includes(pObject.name)) { el = seat; break; }
                        }
                    }

                    if (el) {
                        el.classList.remove('eliminated');
                        el.style.opacity = '1';
                        const balanceEl = el.querySelector('[id*="balance"]') || el.querySelector('.balance') || el.querySelector('.player-balance');
                        if (balanceEl) balanceEl.textContent = `${newBalance}$`;
                    }
                };

                // Б. МГНОВЕННО фиксируем балансы в памяти
                saviorBot.budget -= giftAmount;
                luckyReceiver.budget = giftAmount;

                // В. МГНОВЕННО перерисовываем интерфейс балансов на экране
                updateVisualBalance(luckyReceiver, giftAmount);
                updateVisualBalance(saviorBot, saviorBot.budget);

                // =========================================================================
                // ЖЕСТКАЯ РЕАНИМАЦИЯ ДЛЯ POKER ENGINE
                // =========================================================================
                if (PokerEngine && PokerEngine.gameState) {
                    PokerEngine.gameState.pot = 0;
                    PokerEngine.gameState.currentBet = 0;
                    PokerEngine.gameState.roundBets = {};
                    PokerEngine.gameState.totalBets = {};

                    if (Array.isArray(PokerEngine.gameState.foldedPlayers)) {
                        PokerEngine.gameState.foldedPlayers = PokerEngine.gameState.foldedPlayers.filter(id => id !== luckyReceiver.id && id !== 'player');
                    }
                    if (Array.isArray(PokerEngine.gameState.actedPlayers)) {
                        PokerEngine.gameState.actedPlayers = [];
                    }
                    PokerEngine.gameState.street = 'PREFLOP';
                }

                if (typeof PokerEngine !== 'undefined' && PokerEngine.render) {
                    try { PokerEngine.render(); } catch (e) { console.warn(e); }
                }

                // Г. СЦЕНАРНЫЕ РЕПЛИКИ И ДИАЛОГИ
                if (luckyReceiver.id === 'player') {
                    setTimeout(() => {
                        const phrases = {
                            'Михалыч': "Держи двадцатку. Посиди ещё немного с нами. Весело с тобой...",
                            'Ветал': "Да ладно тебе, не уходи. Возьми двадцатку, бро.",
                            'Андрей': "Куда собрался? На вот 20 баксов, погнали дальше."
                        };
                        const botPhrase = phrases[saviorBot.name] || `Держи 20$, земляк. Рано тебе еще вылетать!`;
                        const formattedBotId = saviorBot.id.startsWith('#') ? saviorBot.id : `#${saviorBot.id}`;
                        botSay(formattedBotId, botPhrase, 4000);
                    }, 1000);
                } else if (luckyReceiver.name === '404' && saviorBot.name === 'Ветал') {
                    setTimeout(() => {
                        const formattedReceiverId = luckyReceiver.id.startsWith('#') ? luckyReceiver.id : `#${luckyReceiver.id}`;
                        botSay(formattedReceiverId, "- Подкинь пятёрку, а то вылечу...", 3000);
                    }, 1000);

                    setTimeout(() => {
                        const formattedSaviorId = saviorBot.id.startsWith('#') ? saviorBot.id : `#${saviorBot.id}`;
                        botSay(formattedSaviorId, "- Держи, мне не сложно.", 3000);

                        if (typeof spawnHeartBetween === 'function') {
                            spawnHeartBetween('#bot-2', '#bot-3');
                        }
                    }, 3500);
                }

                const totalDelay = (luckyReceiver.id === 'player') ? 5500 : 7000;
                setTimeout(() => {
                    const actionPanel = document.querySelector('.action-buttons, .controls');
                    if (actionPanel) {
                        actionPanel.style.opacity = '1';
                        actionPanel.style.pointerEvents = 'auto';
                    }

                    const boardEl = document.querySelector('#board');
                    if (boardEl) boardEl.innerHTML = '';

                    if (typeof PokerEngine !== 'undefined' && PokerEngine.render) {
                        try { PokerEngine.render(); } catch (e) { console.warn(e); }
                    }

                    if (typeof startNewHand === 'function') {
                        startNewHand();
                    } else if (this.startHand) {
                        this.startHand();
                    }

                    console.log(`[STORY]: Сцена спасения успешно завершена. Новая раздача пошла.`);
                }, totalDelay);

                return true;
            }
        }

        // =========================================================================
        // КРИТИЧЕСКИЙ ВЫЛЕТ ИГРОКА (Если обнулился Игрок, но никто не помог)
        // =========================================================================
        if (luckyReceiver && luckyReceiver.id === 'player') {
            console.log("[STORY]: Спаситель не нашелся. Полный стоп игры для Игрока.");

            const actionPanel = document.querySelector('.action-buttons, .controls');
            if (actionPanel) {
                actionPanel.style.opacity = '0.5';
                actionPanel.style.pointerEvents = 'none';
            }

            const playerSeat = document.querySelector('.player, #player');
            if (playerSeat) {
                playerSeat.classList.add('eliminated');
                playerSeat.style.opacity = '0.4';
            }

            setTimeout(async () => {
                const messageText = "БАНКРОТ. Мужики сочувственно промолчали. Фишки кончились, но жизнь продолжается...";
                const confirmPromise = showCustomConfirm(messageText);

                const confirmBtn = document.querySelector('.custom-modal-btn.btn-confirm');
                const cancelBtn = document.querySelector('.custom-modal-btn.btn-cancel');

                if (confirmBtn) confirmBtn.innerText = 'Попробовать снова';
                if (cancelBtn) cancelBtn.innerText = 'На военный флот';

                const wantsToPlayAgain = await confirmPromise;

                if (wantsToPlayAgain) {
                    location.reload();
                } else {
                    window.location.href = '../battleship/index.html';
                }

            }, 15000);

            return true;
        }

        return false;
    },

    executeAction(playerId, actionType, amount = 0) {
        if (playerId !== this.getCurrentPlayerId()) {
            console.error("Ход не в вашу очередь!");
            return false;
        }

        if (!this.gameState.actedPlayers.includes(playerId)) {
            this.gameState.actedPlayers.push(playerId);
        }

        const pName = players.find(p => p.id === playerId).name;
        showMessage_(`${pName}: ${actionType}`, 2500);

        let isHandOver = false;

        switch (actionType) {
            case 'CHECK':
                console.log(`[ENGINE]: ${pName} — CHECK`);
                break;
            case 'CALL':
                this.handleCall(playerId);
                break;
            case 'FOLD':
                isHandOver = this.handleFold(playerId);
                break;
            case 'RAISE':
                // Передаем реальный размер рейза, пришедший из UI или логики бота
                this.handleRaise(playerId, amount > 0 ? amount : 20);
                break;
            case 'ALL-IN':
                this.handleAllIn(playerId);
                break;
        }

        if (isHandOver) return;

        this.checkRoundCompletion();
    },

    nextTurn() {
        let attempts = 0;
        do {
            this.gameState.activePlayerIndex = (this.gameState.activePlayerIndex + 1) % players.length;
            attempts++;
            if (attempts > players.length) break;
        } while (this.gameState.foldedPlayers.includes(this.getCurrentPlayerId()));

        this.startWaitingForAction();
    },

    getCurrentPlayerId() {
        return players[this.gameState.activePlayerIndex].id;
    },

    highlightActivePlayerUI(activeId) {
        document.querySelectorAll('.bot-place, .player').forEach(el => el.classList.remove('active-turn'));
        let selector = activeId === 'player' ? '.player' : `#${activeId}`;
        const el = document.querySelector(selector);
        if (el) el.classList.add('active-turn');
    },

    syncFoldUI(playerId) {
        let selector = playerId === 'player' ? '#cards-p' : `#cards-${playerId.split('-')[1]}`;
        const cardsEl = document.querySelector(selector);
        if (cardsEl) { cardsEl.style.opacity = '0.2'; }
    },

    syncBalancesUI(playerObj) {
        if (!playerObj || !playerObj.id) return;

        // 1. Находим контейнер игрока или бота по его жесткому ID (#player, #bot-1, #bot-2, #bot-3)
        // Для игрока также проверяем класс .player, если на нем нет ID
        const playerEl = document.querySelector(`#${playerObj.id}`) || document.querySelector(`.${playerObj.id}`);

        // Переменная для хранения элемента баланса
        let balanceSpan = null;

        // 2. ЖЕСТКИЙ ФИКС ДЛЯ ИГРОКА: Ищем его баланс глобально по документу, а не внутри контейнера
        if (playerObj.id === 'player') {
            balanceSpan = document.querySelector('#p-balance')
                || (playerEl ? playerEl.querySelector('[id*="balance"]') : null);
        } else if (playerEl) {
            // Для ботов ищем внутри их карточек, как и раньше
            balanceSpan = playerEl.querySelector(`#bot-balance-${playerObj.id.replace('bot-', '')}`)
                || playerEl.querySelector('[id*="balance"]');
        }

        // Если нашли — обновляем цифру
        if (balanceSpan) {
            balanceSpan.textContent = `${playerObj.budget}$`;
        }

        // Обновляем общую кассу (банк) на столе
        const bankEl = document.querySelector('#bank');
        if (bankEl && this.gameState && this.gameState.pot !== undefined) {
            bankEl.textContent = `${this.gameState.pot}$`;
        }

        // 3. ОБНОВЛЕНИЕ ДАННЫХ ДЛЯ БОТОВ (Имя + Пол)
        if (playerObj.id !== 'player' && playerEl) {

            // ЖЕСТКИЙ ФИКС ИМЕНИ: Находим элемент, где сидит имя бота, и ставим новое из памяти
            const nameEl = playerEl.querySelector('.bot-name')
                || playerEl.querySelector('.white') // Добавил твой класс .white из updateWholeTableUI
                || playerEl.querySelector('.name')
                || playerEl.querySelector('strong')
                || playerEl.querySelector('.player-name');

            if (nameEl && playerObj.name) {
                console.log(`[UI FIX]: Меняем имя на слоте ${playerObj.id}: на ${playerObj.name}`);
                nameEl.textContent = playerObj.name;
            }

            // ЖЕСТКИЙ ФИКС ПОЛА: Находим индикатор
            const genderMarker = playerEl.querySelector('.gender-marker') || playerEl.querySelector('.gender');
            if (genderMarker) {
                // Счищаем всё старое
                genderMarker.className = 'gender-marker'; // Безопасный полный сброс классов

                // Ставим актуальный класс пола из объекта
                if (playerObj.gender === 'female' || playerObj.gender === 'f') {
                    genderMarker.classList.add('gender-female');
                } else {
                    genderMarker.classList.add('gender-male');
                }
                console.log(`[UI FIX]: Сменили пол на слоте ${playerObj.id} для ${playerObj.name} -> ${playerObj.gender}`);
            }
        }
    },

    toggleControlsUI(isEnabled) {
        const btnPass = document.getElementById('btn-fold');
        const btnCheck = document.getElementById('btn-check');
        const btnCall = document.getElementById('btn-call');
        const btnRaise = document.getElementById('btn-raise');
        const btnAllIn = document.getElementById('btn-allin');

        if (!isEnabled) {
            [btnPass, btnCheck, btnCall, btnRaise, btnAllIn].forEach(btn => {
                if (btn) btn.disabled = true;
            });
            if (btnCall) btnCall.textContent = 'КОЛЛ';
            return;
        }

        const playerId = 'player';
        const alreadyBet = this.gameState.roundBets[playerId] || 0;
        const callAmount = this.gameState.currentBet - alreadyBet;
        const playerObj = players.find(p => p.id === playerId);

        if (btnPass) btnPass.disabled = false;
        if (btnAllIn) btnAllIn.disabled = (playerObj.budget <= 0);

        // Логика ЧЕК / КОЛЛ
        if (callAmount <= 0) {
            if (btnCheck) btnCheck.disabled = false;
            if (btnCall) {
                btnCall.disabled = true;
                btnCall.textContent = 'КОЛЛ';
            }
        } else {
            if (btnCheck) btnCheck.disabled = true;
            if (btnCall) {
                // Если callAmount больше стека — кнопка Колл превращается в All-In по смыслу, но доступна
                btnCall.disabled = false;
                btnCall.textContent = `КОЛЛ (${Math.min(callAmount, playerObj.budget)}$)`;
            }
        }

        // Логика кнопки РЕЙЗ
        if (btnRaise) {
            // Минимальный шаг рейза — 20$. Кнопка доступна, только если у нас есть эти деньги поверх колла
            const minRaiseCost = callAmount + 20;
            btnRaise.disabled = (playerObj.budget < minRaiseCost);
        }
    },
};

//-------движок игры---------

let isSliderOpen = false;

function makeAction(type, amount = 0, e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();

    const actionType = type.toUpperCase();
    const sliderContainer = document.getElementById('raise-slider-container');
    const slider = document.getElementById('raise-range-slider');
    const sliderText = document.getElementById('slider-value');
    const raiseBtn = document.getElementById('btn-raise'); // Наш селектор из матрицы

    const playerObj = players.find(p => p.id === 'player');
    const alreadyBet = PokerEngine.gameState.roundBets['player'] || 0;
    const currentCall = PokerEngine.gameState.currentBet - alreadyBet;

    if (actionType === 'RAISE') {
        if (!isSliderOpen) {
            // ПЕРВЫЙ КЛИК: Считаем лимиты и открываем
            const minRaise = currentCall + (typeof BIG_BLIND !== 'undefined' ? BIG_BLIND : 10);
            const maxRaise = playerObj.budget;

            if (minRaise >= maxRaise) {
                console.log("[USER]: Стек слишком мал для кастомного рейза. Идем Ва-Банк.");
                if (sliderContainer) sliderContainer.style.display = 'none';
                isSliderOpen = false;
                if (raiseBtn) raiseBtn.innerText = 'Рейз';
                PokerEngine.executeAction('player', 'ALL-IN');
                return;
            }

            // Инициализация ползунка данными
            slider.min = minRaise;
            slider.max = maxRaise;
            slider.value = minRaise;
            sliderText.innerText = minRaise;

            document.getElementById('slider-min-label').innerText = `${minRaise}$`;
            document.getElementById('slider-max-label').innerText = `All-In (${maxRaise}$)`;

            // Связываем движение ползунка с выводом текста
            slider.oninput = function () {
                sliderText.innerText = this.value;
            };

            // Показываем блок регулятора
            sliderContainer.style.display = 'block';
            isSliderOpen = true;

            if (raiseBtn) {
                raiseBtn.innerText = 'ОК';
                raiseBtn.style.background = '#48bb78'; // Приятный зеленый цвет подтверждения
            }
            return;
        } else {
            // ВТОРОЙ КЛИК: Считываем ставку и пушим в движок
            const finalRaiseAmount = parseInt(slider.value, 10);

            sliderContainer.style.display = 'none';
            isSliderOpen = false;

            if (raiseBtn) {
                raiseBtn.innerText = 'Рейз';
                raiseBtn.style.background = '';
            }

            PokerEngine.executeAction('player', 'RAISE', finalRaiseAmount);
            return;
        }
    }

    // Если нажали любую другую кнопку (Пасс, Чек, Колл) — сворачиваем регулятор ставок
    if (sliderContainer && isSliderOpen) {
        sliderContainer.style.display = 'none';
        isSliderOpen = false;
        if (raiseBtn) {
            raiseBtn.innerText = 'Рейз';
            raiseBtn.style.background = '';
        }
    }

    // Стандартное действие для остальных кнопок
    PokerEngine.executeAction('player', actionType, amount);
}

// Конфигурация характеров ботов (Их базовые настройки)
// 2. Инициализируем стартовые профили (Ветал и 404 всегда на месте!)


function runBotLogic(botId) {
    // =================================================================================
    // 1. НАХОДИМ ОБЪЕКТ БОТА И ЕГО АКТУАЛЬНЫЙ СТИЛЬ
    // =================================================================================
    const botObj = players.find(p => p.id === botId);

    // Если бот пуст, выбыл или у него кончились фишки — автоматический фолд
    if (!botObj || botObj.budget <= 0) {
        if (typeof PokerEngine !== 'undefined') PokerEngine.executeAction(botId, 'FOLD');
        return;
    }

    const profile = BOT_PROFILES[botId] || {};
    const botName = botObj.name;
    const style = botObj.strategy || 'GTO';

    // =================================================================================
    // 2. СОБИРАЕМ КАРТЫ ДЛЯ АНАЛИЗА
    // =================================================================================
    const boardCards = (PokerEngine && PokerEngine.gameState) ? PokerEngine.gameState.board : [];
    const sevenCards = [...(botObj.cards || []), ...boardCards];

    let handStrength = 0.15; // Дефолтная сила (мусор)
    let handName = "Старшая карта";
    const currentStreet = (PokerEngine && PokerEngine.gameState) ? PokerEngine.gameState.street : 'PREFLOP';

    // =================================================================================
    // 3. УМНОЕ РАСПРЕДЕЛЕНИЕ ОЦЕНКИ ПО УЛИЦАМ
    // =================================================================================
    if (currentStreet === 'PREFLOP') {
        if (typeof evaluatePreflopHand === 'function') {
            handStrength = evaluatePreflopHand(botObj.cards);
        }
        handName = "Стартовые карты";
    }
    else if (currentStreet === 'FLOP') {
        try {
            if (typeof evaluateFiveCards === 'function') {
                const flopEval = evaluateFiveCards(sevenCards);
                if (flopEval && typeof flopEval.score !== 'undefined') {
                    const score = flopEval.score;
                    handName = flopEval.name;

                    if (score >= 60000000) handStrength = 0.95;      // Фулл-Хаус+
                    else if (score >= 50000000) handStrength = 0.85; // Флеш
                    else if (score >= 40000000) handStrength = 0.80; // Стрит
                    else if (score >= 30000000) handStrength = 0.75; // Сет
                    else if (score >= 20000000) handStrength = 0.65; // Две пары
                    else if (score >= 10000000) handStrength = 0.45; // Пара
                    else handStrength = 0.20;
                }
            }
        } catch (e) {
            console.warn(`[BOT-AI] Сбой калькулятора флопа для ${botId}:`, e);
            handStrength = 0.25;
        }
    }
    else {
        try {
            if (typeof getBestCombination === 'function') {
                const handEval = getBestCombination(sevenCards);
                if (handEval && typeof handEval.score !== 'undefined') {
                    const handScore = handEval.score;
                    handName = handEval.name;

                    if (handScore >= 80000000) handStrength = 0.98;      // Стрит-Флеш
                    else if (handScore >= 70000000) handStrength = 0.95; // Каре
                    else if (handScore >= 60000000) handStrength = 0.90; // Фулл-Хаус
                    else if (handScore >= 50000000) handStrength = 0.85; // Флеш
                    else if (handScore >= 40000000) handStrength = 0.80; // Стрит
                    else if (handScore >= 30000000) handStrength = 0.70; // Сет
                    else if (handScore >= 20000000) handStrength = 0.55; // Две пары
                    else if (handScore >= 10000000) handStrength = 0.35; // Пара
                    else handStrength = 0.15;
                }
            }
        } catch (e) {
            console.warn(`[BOT-AI] Сбой getBestCombination для ${botId}:`, e);
            handStrength = 0.2;
        }
    }

    // =================================================================================
    // 4. РАСЧЕТ ЭКОНОМИКИ СТОЛА
    // =================================================================================
    const roundBets = (PokerEngine && PokerEngine.gameState) ? PokerEngine.gameState.roundBets : {};
    const currentBet = (PokerEngine && PokerEngine.gameState) ? PokerEngine.gameState.currentBet : 0;
    const currentPot = (PokerEngine && PokerEngine.gameState) ? PokerEngine.gameState.pot : 0;

    const alreadyBet = roundBets[botId] || 0;
    const callAmount = currentBet - alreadyBet;

    // Безопасный расчет шансов банка (без деления на 0)
    const totalPotExpectation = currentPot + callAmount;
    const potOdds = totalPotExpectation > 0 ? (callAmount / totalPotExpectation) : 0;

    // =================================================================================
    // 5. МОДИФИКАЦИЯ ПОВЕДЕНИЯ НА ОСНОВЕ УНИКАЛЬНОГО ХАРАКТЕРА
    // =================================================================================
    let randomFactor = Math.random() * (profile.bluffChance || 0.1);
    const looseFactor = profile.looseFactor || 1.0;

    let decisionScore = handStrength * looseFactor + randomFactor;

    if (style === 'RANDOM') {
        decisionScore = Math.random();
    }
    else if (style === 'MATH') {
        decisionScore = handStrength;
        randomFactor = 0;
    }
    else if (style === 'ROCK') {
        if (handStrength < 0.4) decisionScore -= 0.15;
    }
    else if (style === 'BLUFF') {
        if (handStrength < 0.35 && Math.random() < 0.35) {
            decisionScore += 0.5;
        }
    }

    console.log(`[BOT-AI] ${botName} (${style}) думает на ${currentStreet}. Рука: ${handName}, Итоговая Сила: ${decisionScore.toFixed(2)}, Шансы банка: ${potOdds.toFixed(2)}`);

    // =================================================================================
    // 6. ЛОГИКА ДЕЙСТВИЙ И ЗАЩИТА СТЭКОВ
    // =================================================================================
    const agg = profile.aggression || 1.0;

    // СПЕЦИАЛЬНЫЙ РЕЖИМ БОТА "БОЛТ" (С ПОЛНОЙ ВАЛИДАЦИЕЙ)
    if (style === 'BOLT') {
        const activePlayers = players.filter(p => p.budget > 0 && p.id !== botId);
        const minBudget = activePlayers.length > 0 ? Math.min(...activePlayers.map(p => p.budget)) : 20;

        // Гарантируем, что targetBet не равен нулю и адекватен
        let targetBet = Math.max(minBudget, currentBet + 10);

        if (targetBet >= botObj.budget) {
            PokerEngine.executeAction(botId, 'ALL-IN');
            return;
        }

        if (callAmount <= 0) {
            PokerEngine.executeAction(botId, 'RAISE', targetBet);
        } else {
            if (currentBet < targetBet) {
                PokerEngine.executeAction(botId, 'RAISE', targetBet);
            } else {
                PokerEngine.executeAction(botId, 'CALL');
            }
        }
        return;
    }

    // Ситуация А: Ставок перед ботом нет (ЧЕК или РЕЙЗ)
    if (callAmount <= 0) {
        if (style === 'MATH' && decisionScore < 0.5) {
            PokerEngine.executeAction(botId, 'CHECK');
            return;
        }

        if (decisionScore > 0.65 || style === 'AGRESSIVE') {
            const raiseSize = Math.round(20 * agg);
            // Защита: Если рейз съедает стек, идем All-In
            if (raiseSize >= botObj.budget) {
                PokerEngine.executeAction(botId, 'ALL-IN');
            } else {
                PokerEngine.executeAction(botId, 'RAISE', raiseSize);
            }
        } else if (decisionScore > 0.4 && Math.random() < 0.3) {
            const minRaise = 20;
            if (minRaise >= botObj.budget) {
                PokerEngine.executeAction(botId, 'ALL-IN');
            } else {
                PokerEngine.executeAction(botId, 'RAISE', minRaise);
            }
        } else {
            PokerEngine.executeAction(botId, 'CHECK');
        }
    }
    // Ситуация Б: Перед ботом стоит чья-то ставка
    else {
        // Если цена колла больше или равна всему бюджету бота
        if (callAmount >= botObj.budget) {
            if (style === 'MATH') {
                if (handStrength > potOdds && handStrength > 0.45) {
                    PokerEngine.executeAction(botId, 'ALL-IN');
                } else {
                    PokerEngine.executeAction(botId, 'FOLD');
                }
                return;
            }

            if (decisionScore > 0.58 || (style === 'AGRESSIVE' && Math.random() < 0.6)) {
                PokerEngine.executeAction(botId, 'ALL-IN');
            } else {
                PokerEngine.executeAction(botId, 'FOLD');
            }
            return;
        }

        // Если бот хочет переповысить (Рейз/Трибет)
        if (decisionScore > 0.78 || style === 'AGRESSIVE') {
            if (Math.random() < 0.35 && botObj.budget < currentPot && style !== 'MATH') {
                PokerEngine.executeAction(botId, 'ALL-IN');
            } else {
                // Математически честный рейз: размер колла + сверху ставка
                const raiseSize = currentBet + Math.round(40 * agg);
                if (raiseSize >= botObj.budget) {
                    PokerEngine.executeAction(botId, 'ALL-IN');
                } else {
                    PokerEngine.executeAction(botId, 'RAISE', raiseSize);
                }
            }
        }
        // Если бот готов коллировать
        else if (style === 'MATH' ? (handStrength > potOdds) : (decisionScore > potOdds || decisionScore > 0.36)) {
            PokerEngine.executeAction(botId, 'CALL');
        }
        // Пасс
        else {
            PokerEngine.executeAction(botId, 'FOLD');
        }
    }
}

// Надежная оценка стартовых карт на Префлопе (извлечение чистых номиналов)
function evaluatePreflopHand(cards) {
    if (!cards || cards.length < 2) return 0.1;

    // Функция достает только номинал карты (например, из "10s" -> "10", из "Ah" -> "A")
    const getRank = (cardStr) => {
        if (typeof cardStr !== 'string') return '';
        return cardStr.length === 3 ? cardStr.substring(0, 2) : cardStr[0];
    };

    const r1 = getRank(cards[0]);
    const r2 = getRank(cards[1]);

    if (!r1 || !r2) return 0.2;

    // 1. Карманная пара (Два Короля, две Девятки и т.д.)
    if (r1.toLowerCase() === r2.toLowerCase()) {
        const highPairs = ['a', 'k', 'q', 'j', '10'];
        if (highPairs.includes(r1.toLowerCase())) return 0.85; // Премиум пары
        return 0.65; // Средние и мелкие пары
    }

    // 2. Две крупные карты (Бродвей: картинки и тузы)
    const broadway = ['A', 'K', 'Q', 'J', '10'];
    if (broadway.includes(r1) && broadway.includes(r2)) {
        return 0.55;
    }

    // 3. Коннекторы или туз со слабой картой
    if (r1 === 'A' || r2 === 'A') return 0.4;

    // Прочий мусор
    return 0.22;
}

// ТОЧКА ЗАПУСКА ИГРЫ
document.addEventListener('DOMContentLoaded', () => {
    console.log('[DOM]: Инициализация интерфейса покера.');

    // 2. И только потом запускаем первую раздачу
    startNewHand();
    loadSeptemberWeather();
});

// Запуск новой раздачи
function startNewHand() {
    updateWholeTableUI();

    // =============================================================================
    //  STORY DLC: БЕЗУПРЕЧНЫЙ ПЕРЕХВАТ - ВЕТАЛ ❤️ 404
    // =============================================================================
    const botVetal = players.find(p => p.id === 'bot-2');
    const bot404 = players.find(p => p.id === 'bot-3');

    if (botVetal && bot404 && bot404.budget <= 0 && !StoryState.vetalSaved404 && botVetal.budget >= 10) {
        StoryState.vetalSaved404 = true;
        console.log("[STORY]: Ветал замечает банкротство 404 и запускает сцену помощи!");

        botVetal.budget -= 5;
        bot404.budget = 5;

        const el404 = document.querySelector('#bot-3');
        if (el404) {
            el404.classList.remove('eliminated');
            el404.style.opacity = '1';
            const balanceSpan404 = el404.querySelector('#bot-balance-3') || el404.querySelector('[id*="balance"]');
            if (balanceSpan404) balanceSpan404.textContent = '5$';
        }

        const elVetal = document.querySelector('#bot-2');
        if (elVetal) {
            const balanceSpanVetal = elVetal.querySelector('#bot-balance-2') || elVetal.querySelector('[id*="balance"]');
            if (balanceSpanVetal) balanceSpanVetal.textContent = `${botVetal.budget}$`;
        }

        const actionPanel = document.querySelector('.action-buttons, .controls');
        if (actionPanel) actionPanel.style.pointerEvents = 'none';

        botSay('#bot-3', "Ветал, подкинешь пятёрочку, а то вылечу?", 3500);

        setTimeout(() => {
            botSay('#bot-2', "Держи, мне не сложно. Играй.", 3500);
            if (typeof spawnHeartBetween === 'function') {
                spawnHeartBetween('#bot-2', '#bot-3');
            }

            setTimeout(() => {
                if (actionPanel) actionPanel.style.pointerEvents = 'auto';
                try { if (typeof PokerEngine !== 'undefined' && PokerEngine.render) PokerEngine.render(); } catch (e) { }
                if (typeof PokerEngine !== 'undefined' && PokerEngine.initPreflop) PokerEngine.initPreflop();
            }, 3000);
        }, 4000);

        return;
    }

    // =============================================================================
    // ЖЕСТКИЙ СТОП-КРАН ДЛЯ БАНКРОТСТВА ИГРОКА
    // =============================================================================
    const checkPlayer = players.find(p => p.id === 'player');
    if (checkPlayer && checkPlayer.budget <= 0) {
        console.log("[STOP CRITICAL]: У игрока 0$. Чистка стола заблокирована. Ожидание модального окна.");
        return; // МГНОВЕННЫЙ ВЫХОД. Не даем стереть карты со стола, пока тикают 15 секунд драматичной паузы!
    }

    console.log("=== ЧИСТКА СТОЛА И ПАМЯТИ ДЛЯ НОВОЙ РАЗДАЧИ ===");

    // 1. Очищаем висящие таймеры ботов
    if (PokerEngine && PokerEngine.gameState) {
        if (PokerEngine.gameState.botTimer) {
            clearTimeout(PokerEngine.gameState.botTimer);
            PokerEngine.gameState.botTimer = null;
        }
        PokerEngine.gameState.board = [];
        PokerEngine.gameState.foldedPlayers = [];
        PokerEngine.gameState.pot = 0;
        PokerEngine.gameState.currentBet = 0;
        PokerEngine.gameState.roundBets = {};
    }

    // 2. Обнуляем карманные карты в памяти
    if (typeof players !== 'undefined' && Array.isArray(players)) {
        players.forEach(p => { p.cards = []; });
    }

    // 3. Полностью вычищаем все контейнеры карт в DOM
    const cardContainers = ['#board', '#cards-1', '#cards-2', '#cards-3', '#cards-p'];
    cardContainers.forEach(selector => {
        const el = document.querySelector(selector);
        if (el) {
            el.innerHTML = '';
            el.style.opacity = '1';
        }
    });

    // 4. Дополнительная страховка: удаление карт
    document.querySelectorAll('.card').forEach(card => {
        if (!card.closest('.eliminated')) {
            card.remove();
        }
    });

    if (typeof showMessage_ === 'function') {
        showMessage_("Новая раздача.", 2000);
    }

    if (typeof tasov === 'function') tasov();

    if (typeof players !== 'undefined' && players.length > 0) {
        CURRENT_DEALER = getNextActivePlayerIndex(CURRENT_DEALER);

        if (typeof updateDealerChipsUI === 'function') {
            updateDealerChipsUI();
        }

        // РАЗДАЧА КАРТ ТОЛЬКО ТЕМ У КОГО ЕСТЬ ДЕНЬГИ
        if (typeof dealCards === 'function') {
            const b1 = players.find(p => p.id === 'bot-1');
            const b2 = players.find(p => p.id === 'bot-2');
            const b3 = players.find(p => p.id === 'bot-3');
            const pl = players.find(p => p.id === 'player');

            if (b1 && b1.budget > 0) dealCards(KOLODA, 2, '#cards-1', true);
            if (b2 && b2.budget > 0) dealCards(KOLODA, 2, '#cards-2', true);
            if (b3 && b3.budget > 0) dealCards(KOLODA, 2, '#cards-3', true);
            if (pl && pl.budget > 0) dealCards(KOLODA, 2, '#cards-p', false);
        }

        if (typeof PokerEngine !== 'undefined' && PokerEngine.initPreflop) {
            PokerEngine.initPreflop();
        }

        // СЕНТЯБРЬ И ПОГОДА
        const septemberBot = players.find(p => p.name.trim() === 'Сентябрь');
        if (septemberBot && StoryState.weatherLoaded && !StoryState.septemberCommentedWeather) {
            StoryState.septemberCommentedWeather = true;
            const w = StoryState.weatherData;
            let phrase = "";

            if ((w.month === 12 && w.dayOfMonth === 31) || (w.month === 1 && (w.dayOfMonth === 1 || w.dayOfMonth === 2))) {
                phrase = `С Новым годом, мужики! Насыпайте фишки, под ёлочку пойдёт...`;
            } else {
                if (Math.random() < 0.5) {
                    phrase = `Вот уже ${w.dayOfWeek}, время летит... Идеальный момент, чтобы катать покер.`;
                } else {
                    if (w.temp < 0) phrase = `На улице дубак конкретный, ${w.temp}°C. `;
                    else if (w.temp > 25) phrase = `За окном пекло, ${w.temp}°C, дышать нечем. `;
                    else phrase = `Погода шепчет, ${w.temp}°C как-никак. `;

                    if (w.code >= 61 && w.code <= 67) phrase += `Ещё и дождь зарядил, мерзость.`;
                    else if (w.wind > 10) phrase += `И ветрище дует, аж рамы трещат.`;
                    else if (w.code === 0) phrase += `Солнце лупит прямо в монитор.`;
                    else phrase += `Катаем в уюте.`;
                }
            }

            setTimeout(() => {
                botSay(`#${septemberBot.id}`, phrase, 6000);
            }, 2500);
        }

    } else {
        console.error("[CRITICAL]: Глобальный массив players не обнаружен!");
    }
}

//--- А Д   И   И З Р А И Л Ь --------------------------------------
function updateTournamentLevel() {
    // 1. Инициализируем стейт, если раздачи еще не начались
    if (!PokerEngine.gameState.handsPlayed) {
        PokerEngine.gameState.handsPlayed = 0;
        PokerEngine.gameState.currentLevelIdx = 0;

        //  При самом первом запуске принудительно берем 1-й уровень из структуры       
        const startLevel = TOURNAMENT_STRUCTURE[0];
        if (startLevel) {
            SMALL_BLIND = startLevel.sb;
            BIG_BLIND = startLevel.bb;
            console.log(`[TOURNAMENT]: Турнир стартовал. Уровень 1. SB: ${SMALL_BLIND}$, BB: ${BIG_BLIND}$`);
        }
    }

    PokerEngine.gameState.handsPlayed++;
    console.log(`[TOURNAMENT]: Раздача #${PokerEngine.gameState.handsPlayed}`);

    // Повышаем уровень каждые 4 раздачи
    const HANDS_PER_LEVEL = 4;
    const newLevelIdx = Math.floor((PokerEngine.gameState.handsPlayed - 1) / HANDS_PER_LEVEL);

    // Если перешли на новый уровень и он есть в нашей структуре
    if (newLevelIdx !== PokerEngine.gameState.currentLevelIdx && newLevelIdx < TOURNAMENT_STRUCTURE.length) {
        PokerEngine.gameState.currentLevelIdx = newLevelIdx;
        const currentLevel = TOURNAMENT_STRUCTURE[newLevelIdx];

        // Меняем глобальные блайнды игры
        SMALL_BLIND = currentLevel.sb;
        BIG_BLIND = currentLevel.bb;

        console.log(`%c[💥 LEVEL UP]: Блайнды выросли! Новый уровень: ${currentLevel.level}. SB: ${SMALL_BLIND}$, BB: ${BIG_BLIND}$`, "color: #ff3333; font-weight: bold;");
        showMessage_(`⚠️ Блайнды выросли! Малый: ${SMALL_BLIND}$, Большой: ${BIG_BLIND}$`, 4000);
    }
}
//___________ад и израиль ______________________________________________




