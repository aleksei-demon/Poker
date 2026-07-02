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

    initPreflop() {
        // Сброс состояния для новой раздачи
        this.gameState.currentBet = BIG_BLIND;
        this.gameState.foldedPlayers = [];
        this.gameState.roundBets = { 'player': 0, 'bot-1': 0, 'bot-2': 0, 'bot-3': 0 };
        this.gameState.totalBets = { 'player': 0, 'bot-1': 0, 'bot-2': 0, 'bot-3': 0 };
        this.gameState.street = 'PREFLOP';
        this.gameState.actedPlayers = [];
        this.gameState.board = [];

        // Автоматически отправляем в фолд банкротов ДО расчета блайндов
        players.forEach(p => {
            if (p.budget <= 0) {
                if (!this.gameState.foldedPlayers.includes(p.id)) {
                    this.gameState.foldedPlayers.push(p.id);
                }
                this.syncFoldUI(p.id);
                console.log(`[ENGINE]: Игрок ${p.name} банкрот и пропускает раздачу.`);
            }
        });

        // Рассчитываем блайнды от текущего дилера (с учетом живых игроков)
        const sbPlayerIndex = (CURRENT_DEALER + 1) % players.length;
        const bbPlayerIndex = (CURRENT_DEALER + 2) % players.length;

        const sbPlayer = players[sbPlayerIndex];
        const bbPlayer = players[bbPlayerIndex];

        // Списываем фишки (если у игрока меньше блайнда — он автоматом идет в All-In)
        const sbActual = Math.min(sbPlayer.budget, SMALL_BLIND);
        const bbActual = Math.min(bbPlayer.budget, BIG_BLIND);

        makeAutomaticBet(sbPlayer, sbActual);
        makeAutomaticBet(bbPlayer, bbActual);

        // Фиксируем в стейте
        this.gameState.roundBets[sbPlayer.id] = sbActual;
        this.gameState.roundBets[bbPlayer.id] = bbActual;
        this.gameState.totalBets[sbPlayer.id] = sbActual;
        this.gameState.totalBets[bbPlayer.id] = bbActual;

        // Если блайнд стал олл-ином, помечаем, что они походили
        if (sbPlayer.budget === 0) this.gameState.actedPlayers.push(sbPlayer.id);
        if (bbPlayer.budget === 0) this.gameState.actedPlayers.push(bbPlayer.id);

        // Обновляем UI банка
        const bankEl = document.querySelector('#bank');
        if (bankEl) { bankEl.textContent = ` ${this.gameState.pot} $ `; }

        // Первым на префлопе ходит UTG (следующий после ББ)
        this.gameState.activePlayerIndex = (CURRENT_DEALER + 3) % players.length;

        // Корректируем, если выбранный игрок уже в фолде/банкрот
        while (this.gameState.foldedPlayers.includes(this.getCurrentPlayerId())) {
            this.gameState.activePlayerIndex = (this.gameState.activePlayerIndex + 1) % players.length;
        }

        console.log(`[ENGINE]: Торги начались. Первым ходит: ${players[this.gameState.activePlayerIndex].name}`);
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
        setTimeout(() => { startNewHand(); }, 5500);
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
            this.gameState.board.push(...newCards);

            setTimeout(() => { autoRunBoard ? this.advanceStreet() : this.resetTurnForNewStreet(); }, msDelay);

        } else if (this.gameState.street === 'FLOP') {
            this.gameState.street = 'TURN';
            showMessage_("Терн!", msDelay, true);
            const newCards = dealCards(KOLODA, 1, '#board', false);
            this.gameState.board.push(...newCards);

            setTimeout(() => { autoRunBoard ? this.advanceStreet() : this.resetTurnForNewStreet(); }, msDelay);

        } else if (this.gameState.street === 'TURN') {
            this.gameState.street = 'RIVER';
            showMessage_("Ривер!", msDelay, true);
            const newCards = dealCards(KOLODA, 1, '#board', false);
            this.gameState.board.push(...newCards);

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
            const sevenCards = [...(p.cards || []), ...boardCards];
            const bestHand = getBestCombination(sevenCards);
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
            setTimeout(() => { showMessage_(`Ваша рука: ${playerRes.handName}`, 1400); }, delay);
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
            const finalPots = calculatePots(activePlayers);
            let totalDelay = 0;

            finalPots.forEach((pot, index) => {
                setTimeout(() => {
                    let candidates = showdownResults.filter(res => pot.allowedPlayers.includes(res.id));
                    candidates.sort((a, b) => b.score - a.score);

                    let potWinner = candidates[0];
                    let potType = index === 0 ? "Основной банк" : `Побочный банк #${index}`;
                    let winText = `${potWinner.name} забирает ${potType} (${pot.amount} $) с комбинацией: ${potWinner.handName}! 🏆`;

                    if (potWinner.id === 'player') {
                        winText = `Вы забираете ${potType} (${pot.amount} $)! 🎉🏆`;
                    }

                    showMessage_(winText, 3000);

                    const winnerObj = players.find(p => p.id === potWinner.id);
                    if (winnerObj) {
                        winnerObj.budget += pot.amount;
                        this.syncBalancesUI(winnerObj);
                    }
                }, totalDelay);

                totalDelay += 3500;
            });

            // Конец раздачи: Проверка на глобальное банкротство стола
            setTimeout(() => {
                this.gameState.pot = 0;
                this.gameState.totalBets = {};

                const gameIsOver = this.checkTableBankruptcy();
                if (!gameIsOver) {
                    startNewHand(); // Обычный перезапуск, если у ботов есть деньги
                }
            }, totalDelay + 500);

        }, delay + 500);
    },

    checkTableBankruptcy() {
        // Находим игроков, у которых остались деньги
        const solventPlayers = players.filter(p => p.budget > 0);

        // Ситуация 1: У всех, кроме одного игрока, кончились деньги (Игрок всех победил)
        const activeBots = players.filter(p => p.id !== 'player');
        const allBotsAreBroke = activeBots.every(b => b.budget <= 0);

        // Ситуация 2: У самого игрока 0$ (или вообще остался только один бот с деньгами, как на скрине)
        const playerIsBroke = players.find(p => p.id === 'player').budget <= 0;
        const totalBrokeCount = players.filter(p => p.budget <= 0).length;

        // Если за столом остался всего 1 игрок с деньгами (или меньше, вдруг ничья)
        if (solventPlayers.length <= 1 || allBotsAreBroke || playerIsBroke) {
            if (this.gameState.botTimer) {
                clearTimeout(this.gameState.botTimer);
                this.gameState.botTimer = null;
            }

            // Формируем текст сообщения в зависимости от того, кто пострадал
            let notificationText = "🎉 Вы подчистили стол! Боты закупают новые фишки...";
            if (playerIsBroke) {
                notificationText = "💸 Вы проигрались дотла! Оформляем авто-докупку фишек для всех банкротов...";
            } else if (solventPlayers.length <= 1) {
                const winnerName = solventPlayers.length === 1 ? solventPlayers[0].name : "Лидер";
                notificationText = `Игрок ${winnerName} остался один! Стол делает докупку фишек...`;
            }

            showMessage_(notificationText, 5000);

            // Через 5.5 секунд восстанавливаем балансы всем, у кого 0$ (или меньше)
            setTimeout(() => {
                players.forEach(p => {
                    if (p.budget <= 0) {
                        p.budget = 100; // Стандартный стек закупки
                        console.log(`[REBUY]: Игрок ${p.name} докупил фишек до 100$.`);
                    }
                });

                // Синхронизируем UI балансов для всех
                players.forEach(p => this.syncBalancesUI(p));

                // Сбрасываем дилера на нулевую позицию, чтобы начать честный новый круг
                CURRENT_DEALER = 0;
                if (typeof updateDealerChipsUI === 'function') updateDealerChipsUI();

                // Запускаем чистую новую раздачу
                startNewHand();
            }, 5500);

            return true; // Игра временно остановлена на перезапуск
        }

        return false; // Все в порядке, продолжаем в обычном режиме
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
        const bankEl = document.querySelector('#bank');
        if (bankEl) bankEl.textContent = ` ${this.gameState.pot} $ `;

        let balanceSelector = '#p-balance';
        if (playerObj.id === 'bot-1') balanceSelector = '#bot-balance-1';
        if (playerObj.id === 'bot-2') balanceSelector = '#bot-balance-2';
        if (playerObj.id === 'bot-3') balanceSelector = '#bot-balance-3';

        const balanceEl = document.querySelector(balanceSelector);
        if (balanceEl) balanceEl.textContent = ` ${playerObj.budget}$`;
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

// Функция связи кнопок интерфейса с движком
function makeAction(type, amount = 0, e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    console.log(`[USER ACTION]: Игрок выбрал ${type} со ставкой: ${amount}`);
    const actionType = type.toUpperCase();

    // Передаем сумму (важно для RAISE)
    PokerEngine.executeAction('player', actionType, amount);
}

// Конфигурация характеров ботов (Их базовые настройки)
const BOT_PROFILES = {
    'bot-1': { name: 'Андрей', style: 'ROCK', bluffChance: 0.05, aggression: 1.5 },
    'bot-2': { name: 'Ветал', style: 'MANIAC', bluffChance: 0.25, aggression: 2.5 },
    'bot-3': { name: '404', style: 'GTO', bluffChance: 0.12, aggression: 1.0 }
};

function runBotLogic(botId) {
    // 1. Находим профиль и объект бота в памяти
    const profile = BOT_PROFILES[botId];
    const botObj = players.find(p => p.id === botId);

    // Если бот пуст, выбыл или у него кончились фишки — автоматический фолд
    if (!botObj || botObj.budget <= 0) {
        PokerEngine.executeAction(botId, 'FOLD');
        return;
    }

    // 2. Собираем карты для анализа
    const boardCards = PokerEngine.gameState.board || [];
    const sevenCards = [...(botObj.cards || []), ...boardCards];

    let handStrength = 0.15; // Дефолтная сила (мусор)
    let handName = "Старшая карта";

    // 3. УМНОЕ РАСПРЕДЕЛЕНИЕ ОЦЕНКИ ПО УЛИЦАМ
    if (PokerEngine.gameState.street === 'PREFLOP') {
        handStrength = evaluatePreflopHand(botObj.cards);
        handName = "Стартовые карты";
    }
    else if (PokerEngine.gameState.street === 'FLOP') {
        try {
            // Оценка на флопе (5 карт)
            const flopEval = evaluateFiveCards(sevenCards);
            if (flopEval && typeof flopEval.score !== 'undefined') {
                if (flopEval.score > 2000000) handStrength = 0.65;     // Две пары и выше
                else if (flopEval.score > 1000000) handStrength = 0.45; // Пара
                else handStrength = 0.2;                                // Ничего нет
                handName = flopEval.name;
            }
        } catch (e) {
            console.warn(`[BOT-AI] Сбой калькулятора флопа для ${botId}:`, e);
            handStrength = 0.25;
        }
    }
    else {
        // На Терне и Ривере (6-7 карт) ищем полноценную комбинацию
        try {
            const handEval = getBestCombination(sevenCards);
            if (handEval && typeof handEval.score !== 'undefined') {
                const handScore = handEval.score;
                handName = handEval.name;

                if (handScore > 5000000) handStrength = 0.9;       // Флеш / Фулл-хаус+
                else if (handScore > 3000000) handStrength = 0.75;  // Сет / Стрит
                else if (handScore > 2000000) handStrength = 0.6;   // Две пары
                else if (handScore > 1000000) handStrength = 0.4;   // Пара
                else handStrength = 0.15;                           // Старшая карта
            }
        } catch (e) {
            console.warn(`[BOT-AI] Сбой getBestCombination для ${botId}:`, e);
            handStrength = 0.2;
        }
    }

    // 4. Расчет экономики стола
    const alreadyBet = PokerEngine.gameState.roundBets[botId] || 0;
    const callAmount = PokerEngine.gameState.currentBet - alreadyBet;
    const currentPot = PokerEngine.gameState.pot;

    // Шансы банка (риск к общему выигрышу)
    const potOdds = callAmount / (currentPot + callAmount || 1);

    // 5. Влияние характера бота (блеф)
    const randomFactor = Math.random() * profile.bluffChance;
    const decisionScore = handStrength + randomFactor;

    console.log(`[BOT-AI] ${profile.name} (${profile.style}) думает на ${PokerEngine.gameState.street}. Рука: ${handName}, Итоговая Сила: ${decisionScore.toFixed(2)}, Шансы банка: ${potOdds.toFixed(2)}`);

    // 6. Дерево принятия решений (Округляем ставки до целых фишек!)

    // Ситуация А: Ставок перед ботом нет (Можно сказать ЧЕК или сделать ставку/РЕЙЗ)
    if (callAmount <= 0) {
        if (decisionScore > 0.7) {
            // Сильная рука -> делаем агрессивный бет
            const raiseSize = Math.round(20 * profile.aggression);
            PokerEngine.executeAction(botId, 'RAISE', raiseSize);
        } else if (decisionScore > 0.4 && Math.random() < 0.3) {
            // Полублеф со средней рукой
            PokerEngine.executeAction(botId, 'RAISE', 20);
        } else {
            // Бесплатный чек
            PokerEngine.executeAction(botId, 'CHECK');
        }
    }
    // Ситуация Б: Перед ботом стоит ставка. Нужно коллировать, рейзить или пасовать
    else {
        // Если ставка превышает весь стек бота — его выбор сводится к All-In или Фолд
        if (callAmount >= botObj.budget) {
            if (decisionScore > 0.6 || (decisionScore > potOdds && Math.random() < 0.5)) {
                PokerEngine.executeAction(botId, 'ALL-IN');
            } else {
                PokerEngine.executeAction(botId, 'FOLD');
            }
            return;
        }

        if (decisionScore > 0.8) {
            // Натсовая рука -> жестко крутим наверх
            if (Math.random() < 0.4 && botObj.budget < currentPot) {
                PokerEngine.executeAction(botId, 'ALL-IN');
            } else {
                const raiseSize = Math.round(40 * profile.aggression);
                PokerEngine.executeAction(botId, 'RAISE', raiseSize);
            }
        }
        // Защита по математическим шансам банка (пот-оддсы) или просто хорошая пара
        else if (decisionScore > potOdds || decisionScore > 0.38) {
            PokerEngine.executeAction(botId, 'CALL');
        }
        // Карта не стоит этих денег -> сброс
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
    startNewHand();
});

// Запуск новой раздачи
function startNewHand() {
    console.log("=== ЧИСТКА СТОЛА И ПАМЯТИ ДЛЯ НОВОЙ РАЗДАЧИ ===");

    // 1. Очищаем таймер ботов, предотвращая утечку асинхронных ходов
    if (PokerEngine && PokerEngine.gameState && PokerEngine.gameState.botTimer) {
        clearTimeout(PokerEngine.gameState.botTimer);
        PokerEngine.gameState.botTimer = null;
    }

    // 2. Чистим контейнеры карт в UI и возвращаем им 100% яркость после прошлых фолдов
    document.querySelectorAll('#board, #cards-1, #cards-2, #cards-3, #cards-p').forEach(el => {
        el.innerHTML = '';
        el.style.opacity = '1';
    });

    // 3. Обнуляем карманные карты у всех игроков в оперативной памяти
    if (typeof players !== 'undefined' && Array.isArray(players)) {
        players.forEach(p => { p.cards = []; });
    }

    // 4. Сброс стейта игры
    if (PokerEngine && PokerEngine.gameState) {
        PokerEngine.gameState.board = [];
        PokerEngine.gameState.foldedPlayers = [];
        PokerEngine.gameState.pot = 0;
    }

    // 5. Показываем уведомление
    if (typeof showMessage_ === 'function') {
        showMessage_("Новая раздача.", 2000);
    }

    // 6. Перемешивание и сдвиг фишки Дилера
    if (typeof tasov === 'function') tasov();

    if (typeof players !== 'undefined' && players.length > 0) {
        CURRENT_DEALER = (CURRENT_DEALER + 1) % players.length;
        if (typeof updateDealerChipsUI === 'function') updateDealerChipsUI();

        // 7. Раздаем физические карты (Берем из глобального массива KOLODA)
        if (typeof dealCards === 'function') {
            dealCards(KOLODA, 2, '#cards-1', true);
            dealCards(KOLODA, 2, '#cards-2', true);
            dealCards(KOLODA, 2, '#cards-3', true);
            dealCards(KOLODA, 2, '#cards-p', false); // Игроку (рубашкой вниз)
        }

        // 8. Запускаем префлоп торговлю через движок
        PokerEngine.initPreflop();
    } else {
        console.error("[CRITICAL]: Глобальный массив players не обнаружен!");
    }
}







