// =============================================================================
//  GAME-LOGIC.JS — логика приложения и стейт-машина
// =============================================================================

// 1. Конфигурация игры (Глобальные переменные)
const SMALL_BLIND = 5;
const BIG_BLIND = 10;

let players = [
    { id: 'player', name: 'Чел', budget: 100, elementId: '#cards-p' },
    { id: 'bot-1', name: 'Андрей', budget: 100, elementId: '#cards-1' },
    { id: 'bot-2', name: 'Ветал', budget: 100, elementId: '#cards-2' },
    { id: 'bot-3', name: '404', budget: 100, elementId: '#cards-3' }
];

let CURRENT_DEALER = 0;

// 2. ДВИЖОК ИГРЫ
const PokerEngine = {
    gameState: {
        pot: 0,
        currentBet: 0,
        activePlayerIndex: 0,
        lastRaiseIndex: 0,
        roundBets: {},      // Ставки текущего раунда
        foldedPlayers: [],   // Сюда будут улетать пасанувшие игроки
        street: 'PREFLOP',
        actedPlayers: [], // здесь ID тех, кто походил на этой улице
        botTimer: null,
    },

    initPreflop() {
        this.gameState.currentBet = BIG_BLIND;
        this.gameState.foldedPlayers = []; // Сброс пасов перед новой раздачей
        this.gameState.roundBets = { 'player': 0, 'bot-1': 0, 'bot-2': 0, 'bot-3': 0 };
        this.gameState.street = 'PREFLOP';
        this.gameState.actedPlayers = [];

        // Рассчитываем блайнды от текущего дилера
        const sbPlayerIndex = (CURRENT_DEALER + 1) % players.length;
        const bbPlayerIndex = (CURRENT_DEALER + 2) % players.length;

        // Списываем фишки через game-func.js
        makeAutomaticBet(players[sbPlayerIndex], SMALL_BLIND);
        makeAutomaticBet(players[bbPlayerIndex], BIG_BLIND);

        // Записываем блайнды в историю текущего раунда торгов
        this.gameState.roundBets[players[sbPlayerIndex].id] = SMALL_BLIND;
        this.gameState.roundBets[players[bbPlayerIndex].id] = BIG_BLIND;

        // Обновляем отображение банка на столе
        const bankEl = document.querySelector('#bank');
        if (bankEl) {
            bankEl.textContent = ` ${this.gameState.pot} $ `;
        }

        // Первым ходит тот, кто сидит СЛЕДУЮЩИМ после Большого Блайнда (UTG)
        this.gameState.activePlayerIndex = (CURRENT_DEALER + 3) % players.length;

        console.log(`Торги начались! Первым ходит: ${players[this.gameState.activePlayerIndex].name}`);
        this.startWaitingForAction();
    },

    startWaitingForAction() {
        const activePlayer = players[this.gameState.activePlayerIndex];
        this.highlightActivePlayerUI(activePlayer.id);

        console.log(`[ОЧЕРЕДЬ]: Сейчас должен ходить ID: ${activePlayer.id} (${activePlayer.name})`);

        // Очищаем любой старый таймер, если он вдруг остался в живых
        if (this.gameState.botTimer) {
            clearTimeout(this.gameState.botTimer);
            this.gameState.botTimer = null;
        }

        if (activePlayer.id === 'player') {
            console.log("Ход Чела. Включаем кнопки...");
            this.toggleControlsUI(true);
        } else {
            console.log(`Ходит бот: ${activePlayer.name}. Думает...`);
            this.toggleControlsUI(false);

            // Сохраняем таймер в gameState
            this.gameState.botTimer = setTimeout(() => {
                if (this.getCurrentPlayerId() === activePlayer.id) {
                    runBotLogic(activePlayer.id);
                }
            }, 2500);
        }
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

        this.syncBalancesUI(playerObj);
        console.log(`[LOG ENGINE]: ${playerObj.name} сделал КОЛЛ (+${callAmount}$), всего в раунде: ${this.gameState.roundBets[playerId]}$`);
    },

    handleFold(playerId) {
        if (!this.gameState.foldedPlayers.includes(playerId)) {
            this.gameState.foldedPlayers.push(playerId);
        }

        const playerObj = players.find(p => p.id === playerId);
        console.log(`[LOG ENGINE]: ${playerObj.name} сбросил карты (FOLD).`);

        // Визуально гасим карты пасанувшего игрока
        this.syncFoldUI(playerId);
    },

    handleRaise(playerId, raiseAmount) {
        const playerObj = players.find(p => p.id === playerId);

        // Вычисляем, сколько игроку нужно ВСЕГО поставить в этом раунде
        // Это текущая максимальная ставка + величина самого рейза
        const targetTotalBet = this.gameState.currentBet + raiseAmount;

        // Сколько ему нужно докинуть с учетом того, что он уже поставил в этом раунде
        const alreadyBet = this.gameState.roundBets[playerId] || 0;
        let amountToDeduct = targetTotalBet - alreadyBet;

        // Защита от ухода в минус (если не хватает бюджета — идет ва-банк)
        if (amountToDeduct > playerObj.budget) {
            amountToDeduct = playerObj.budget;
        }

        // Списываем фишки и обновляем банк
        playerObj.budget -= amountToDeduct;
        this.gameState.pot += amountToDeduct;

        // Фиксируем новую общую ставку этого игрока в раунде
        this.gameState.roundBets[playerId] = alreadyBet + amountToDeduct;

        // Обновляем глобальную максимальную ставку раунда!
        this.gameState.currentBet = this.gameState.roundBets[playerId];

        // ВАЖНО: так как ставка выросла, все ОСТАЛЬНЫЕ живые игроки 
        // теперь снова обязаны сказать свое слово. Очищаем actedPlayers,
        // оставляя там только того, кто прямо сейчас сделал этот РЕЙЗ!
        this.gameState.actedPlayers = [playerId];

        // Синхронизируем балансы на экране
        this.syncBalancesUI(playerObj);

        console.log(`[LOG ENGINE]: ${playerObj.name} сделал РЕЙЗ на +${raiseAmount}$, текущая ставка раунда: ${this.gameState.currentBet}$`);
    },

    handleAllIn(playerId) {
        const playerObj = players.find(p => p.id === playerId);

        // Если у игрока вообще нет фишек, он не может пойти ва-банк
        if (playerObj.budget <= 0) {
            console.log(`[ENGINE]: У ${playerObj.name} нет фишек для Ва-банка!`);
            return;
        }

        // Вся заначка летит в игру
        const allInAmount = playerObj.budget;

        // Вычисляем, какая у игрока станет ОБЩАЯ ставка в этом раунде
        const alreadyBet = this.gameState.roundBets[playerId] || 0;
        const playerTotalRoundBet = alreadyBet + allInAmount;

        // Списываем всё подчистую и добавляем в банк
        playerObj.budget = 0;
        this.gameState.pot += allInAmount;

        // Фиксируем новую ставку игрока в раунде
        this.gameState.roundBets[playerId] = playerTotalRoundBet;

        // Если этот Ва-банк перебил текущую максимальную ставку раунда,
        // то мы обновляем её и заставляем остальных доставлять фишки!
        if (playerTotalRoundBet > this.gameState.currentBet) {
            this.gameState.currentBet = playerTotalRoundBet;

            // Сбрасываем круг торгов: теперь все остальные обязаны ответить на этот вызов
            this.gameState.actedPlayers = [playerId];
            console.log(`[LOG ENGINE]: ${playerObj.name} двигает ВА-БАНК! Ставка раунда поднята до: ${this.gameState.currentBet}$`);
        } else {
            // Если игрок пошел Ва-банк на остатки (коротким стеком), который меньше currentBet,
            // круг торгов не сбрасывается, он просто докинул всё, что мог.
            console.log(`[LOG ENGINE]: ${playerObj.name} доставляет последние фишки ВА-БАНК (${playerTotalRoundBet}$)`);
        }

        // Обновляем циферки на экране
        this.syncBalancesUI(playerObj);
    },

    syncFoldUI(playerId) {
        let selector = playerId === 'player' ? '#cards-p' : `#cards-${playerId.split('-')[1]}`;
        const cardsEl = document.querySelector(selector);
        if (cardsEl) {
            cardsEl.style.opacity = '0.2'; // Делаем карты полупрозрачными
        }
    },

    syncBalancesUI(playerObj) {
        const bankEl = document.querySelector('#bank');
        if (bankEl) bankEl.textContent = ` ${this.gameState.pot} $ `;

        let balanceSelector = '#p-balance';
        if (playerObj.id === 'bot-1') balanceSelector = '#bot-balance-1';
        if (playerObj.id === 'bot-2') balanceSelector = '#bot-balance-2';
        if (playerObj.id === 'bot-3') balanceSelector = '#bot-balance-3';

        const balanceEl = document.querySelector(balanceSelector);
        if (balanceEl) balanceEl.textContent = ` ${playerObj.budget}$`;
    },

    checkRoundCompletion() {
        // Список игроков не в пассе
        const activePlayers = players.filter(p => !this.gameState.foldedPlayers.includes(p.id));

        // 1. Проверяем, что ВСЕ живые игроки сделали хотя бы один ход
        const allActed = activePlayers.every(p => this.gameState.actedPlayers.includes(p.id));

        // 2. Проверяем, что все ставки равны
        const allMatched = activePlayers.every(p => {
            const playerBet = this.gameState.roundBets[p.id] || 0;
            return playerBet === this.gameState.currentBet;
        });

        // Раунд завершен только при выполнении обоих условий!
        if (allActed && allMatched) {
            console.log(`[ENGINE]: Все ставки сравнялись и все игроки походили. Раунд ${this.gameState.street} завершен!`);
            this.advanceStreet();
        } else {
            this.nextTurn();
        }
    },

    advanceStreet() {
        // Очищаем список походивших игроков, так как на новой улице все ходят заново
        this.gameState.actedPlayers = [];
        // Сбрасываем текущую ставку раунда (на новых улицах торги начинаются с 0$)
        this.gameState.currentBet = 0;
        this.gameState.roundBets = { 'player': 0, 'bot-1': 0, 'bot-2': 0, 'bot-3': 0 };

        if (this.gameState.street === 'PREFLOP') {
            this.gameState.street = 'FLOP';
            console.log("=== ПЕРЕХОД НА ФЛОП ===");
            showMessage_("Флоп!", 2000);

            // Выкладываем 3 карты на борд
            dealCards(KOLODA, 3, '#board', false);
            this.resetTurnForNewStreet();

        } else if (this.gameState.street === 'FLOP') {
            this.gameState.street = 'TURN';
            console.log("=== ПЕРЕХОД НА ТЕРН ===");
            showMessage_("Терн!", 2000);

            // Добавляем 1 карту на борд (всего станет 4)
            dealCards(KOLODA, 1, '#board', false);
            this.resetTurnForNewStreet();

        } else if (this.gameState.street === 'TURN') {
            this.gameState.street = 'RIVER';
            console.log("=== ПЕРЕХОД НА РИВЕР ===");
            showMessage_("Ривер!", 2000);

            // Добавляем последнюю 1 карту на борд (всего станет 5)
            dealCards(KOLODA, 1, '#board', false);
            this.resetTurnForNewStreet();

        } else if (this.gameState.street === 'RIVER') {
            this.gameState.street = 'SHOWDOWN';
            console.log("=== ВСКРЫТИЕ (SHOWDOWN) ===");
            showMessage_("Вскрытие карт!", 3000);

            this.handleShowdown();
        }
    },

    // Вспомогательный метод: определяет, кто должен ходить первым на новой улице
    resetTurnForNewStreet() {
        // На постфлопе первым всегда ходит Малый Блайнд (первый игрок после Дилера)
        this.gameState.activePlayerIndex = (CURRENT_DEALER + 1) % players.length;

        // Если этот игрок уже в пассе — ищем следующего живого по кругу
        while (this.gameState.foldedPlayers.includes(this.getCurrentPlayerId())) {
            this.gameState.activePlayerIndex = (this.gameState.activePlayerIndex + 1) % players.length;
        }

        // Запускаем ожидание действия
        this.startWaitingForAction();
    },

    // Временная заглушка для финала раздачи
    handleShowdown() {
        console.log("Раздача завершена. Здесь будет определение победителя!");
        // Пока просто через 5 секунд автоматически запускаем новую раздачу
        setTimeout(() => {
            startNewHand();
        }, 9000);
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

        switch (actionType) {
            case 'CHECK':
                // На ЧЕКе ничего не списываем, просто логируем. 
                // В покере ЧЕК возможен, только если currentBet === 0 или равен твоей ставке
                console.log(`[LOG ENGINE]: ${pName} сказал ЧЕК`);
                break;
            case 'CALL':
                this.handleCall(playerId);
                break;
            case 'FOLD':
                this.handleFold(playerId);
                break;
            case 'RAISE':
                this.handleRaise(playerId, 20);
                break;
            case 'ALL-IN':
                this.handleAllIn(playerId);
                break;
        }

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

    toggleControlsUI(isEnabled) {
        // Находим все наши кнопки в DOM
        const btnPass = document.getElementById('btn-fold');
        const btnCheck = document.getElementById('btn-check');
        const btnCall = document.getElementById('btn-call');
        const btnRaise = document.getElementById('btn-raise');
        const btnAllIn = document.getElementById('btn-allin');

        // Если сейчас ход БОТА — наглухо блокируем вообще все кнопки
        if (!isEnabled) {
            [btnPass, btnCheck, btnCall, btnRaise, btnAllIn].forEach(btn => {
                if (btn) btn.disabled = true;
            });
            if (btnCall) btnCall.textContent = 'КОЛЛ';
            return;
        }

        // --- МАГИЯ ЛИМИТОВ: Если ход ЧЕЛОВЕКА ---
        const playerId = 'player';
        const alreadyBet = this.gameState.roundBets[playerId] || 0;

        // Сколько нужно доплатить, чтобы сравняться с максимальной ставкой?
        const callAmount = this.gameState.currentBet - alreadyBet;

        // 1. ПАСС и ВА-БАНК доступны всегда, когда ход твой
        if (btnPass) btnPass.disabled = false;
        if (btnAllIn) btnAllIn.disabled = false;

        // 2. Логика ЧЕК vs КОЛЛ
        if (callAmount <= 0) {
            // Ставок перед тобой нет (или ты уже уравнял) -> Можно ЧЕКнуть
            if (btnCheck) btnCheck.disabled = false;

            // Коллировать нечего -> Блокируем КОЛЛ
            if (btnCall) {
                btnCall.disabled = true;
                btnCall.textContent = 'КОЛЛ';
            }
        } else {
            // Перед тобой есть ставка -> ЧЕКнуть нельзя! Блокируем.
            if (btnCheck) btnCheck.disabled = true;

            // Нужно доставить фишки -> Активируем КОЛЛ и пишем сумму
            if (btnCall) {
                btnCall.disabled = false;
                btnCall.textContent = `КОЛЛ (${callAmount}$)`;
            }
        }

        // 3. Логика РЕЙЗа (нельзя рейзить, если у тебя нет фишек)
        const playerObj = players.find(p => p.id === playerId);
        if (btnRaise) {
            // Если оставшегося бюджета не хватает на минимальный рейз (20$), блокируем кнопку
            btnRaise.disabled = (playerObj.budget < 20);
        }
    },
};

// Функция связи кнопок интерфейса с движком
function makeAction(type, e) {
    if (e) e.preventDefault();
    console.log(type, e);
    const actionType = type.toUpperCase();
    PokerEngine.executeAction('player', actionType);
}

// Простая логика ботов
function runBotLogic(botId) {
    PokerEngine.executeAction(botId, 'CALL');
}

// ТОЧКА ЗАПУСКА
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM дерево полностью построено');
    startNewHand();
});

// Запуск раунда
function startNewHand() {
    console.log("=== НАЧАЛО НАСТОЯЩЕЙ РАЗДАЧИ ===");
    showMessage_("Новая раздача.", 2000);

    // очищаем таймер ботов
    if (PokerEngine.gameState.botTimer) {
        clearTimeout(PokerEngine.gameState.botTimer);
        PokerEngine.gameState.botTimer = null;
    }

    // Чистим контейнеры и возвращаем картам 100% яркость после прошлого пасса
    document.querySelectorAll('#board, #cards-1, #cards-2, #cards-3, #cards-p').forEach(el => {
        el.innerHTML = '';
        el.style.opacity = '1';
    });

    PokerEngine.gameState.pot = 0;

    tasov();
    CURRENT_DEALER = (CURRENT_DEALER + 1) % players.length;
    updateDealerChipsUI();

    // Те самые плачущие константы удалены, так как расчет идет сразу внутри initPreflop

    dealCards(KOLODA, 2, '#cards-1', true);
    dealCards(KOLODA, 2, '#cards-2', true);
    dealCards(KOLODA, 2, '#cards-3', true);
    dealCards(KOLODA, 2, '#cards-p', false);

    PokerEngine.initPreflop();
}