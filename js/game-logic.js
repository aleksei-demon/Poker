// =============================================================================
//  GAME-LOGIC.JS — логика приложения и стейт-машина
// =============================================================================


// Массив имен тех, кого мы уже размазали (для фана и истории)
let defeatedBots = [];

// 1. Конфигурация игры (Глобальные переменные)
let SMALL_BLIND = 5;
let BIG_BLIND = 10;

let players = [
    { id: 'player', name: 'Чел', budget: 100, elementId: '#cards-p' },
    { id: 'bot-1', name: 'Андрей', budget: 100, elementId: '#cards-1' },
    { id: 'bot-2', name: 'Ветал', budget: 100, elementId: '#cards-2' },
    { id: 'bot-3', name: '404', budget: 100, elementId: '#cards-3' }
];

// Внутри PokerEngine.gameState или как константу сверху файла:
const TOURNAMENT_STRUCTURE = [
    { level: 1, sb: 5, bb: 10 },
    { level: 2, sb: 10, bb: 20 },
    { level: 3, sb: 15, bb: 30 },
    { level: 4, sb: 25, bb: 50 },
    { level: 5, sb: 50, bb: 100 } // На этом уровне со стеком 100$ начнется жесткое месиво
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
    { name: 'Аркадий', style: 'AGRESSIVE', bluffChance: 0.15, aggression: 2.2, looseFactor: 1.1 },
    { name: 'Платон', style: 'MATH', bluffChance: 0.00, aggression: 1.0, looseFactor: 0.9 },
    { name: 'Федя', style: 'BLUFF', bluffChance: 0.40, aggression: 1.6, looseFactor: 1.2 },
    { name: 'Михалыч', style: 'ROCK', bluffChance: 0.02, aggression: 0.8, looseFactor: 0.85 },
    { name: 'Гарик', style: 'LOOSE', bluffChance: 0.20, aggression: 1.4, looseFactor: 1.4 },
    { name: 'Сентябрь', style: 'RANDOM', bluffChance: 0.50, aggression: 1.8, looseFactor: 1.0 }
];

function startNextTournamentRound() {
    console.log("=== СМЕНА СОСТАВА: ЗА СТОЛ САДЯТСЯ НОВЫЕ ИГРОКИ ===");

    // 1. Перемешиваем резерв, чтобы боты выпадали случайно, а не по очереди
    const shuffledReserve = [...BOT_RESERVE].sort(() => Math.random() - 0.5);

    // 2. Берем трех случайных ботов из перемешанного резерва для ПРОФИЛЕЙ
    const newBot1Data = shuffledReserve[0];
    const newBot2Data = shuffledReserve[1];
    const newBot3Data = shuffledReserve[2];

    //  ПЕРЕСАДКА ХАРАКТЕРОВ   
    BOT_PROFILES['bot-1'] = newBot1Data;
    BOT_PROFILES['bot-2'] = newBot2Data;
    BOT_PROFILES['bot-3'] = newBot3Data;

    // 3. Ротация имен и бюджетов в глобальном массиве players
    let botIndex = 0;
    players = players.map(p => {
        if (p.id === 'player') {
            return p; // Твой баланс (например, 400$) не трогаем!
        } else {
            // ИСПРАВЛЕНО: берем данные из shuffledReserve вместо несуществующего pool
            const newBotData = shuffledReserve[botIndex++];
            return {
                id: p.id,
                name: newBotData.name,
                budget: 100, // Новые боты заходят со 100$
                strategy: newBotData.style, // На всякий случай пишем актуальный стиль
                cards: []
            };
        }
    });

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

        // Перед тем как взводить таймер, смотрим — продолжается ли турнир?
        setTimeout(() => {
            if (this.checkTableBankruptcy()) {
                console.log("[TOURNAMENT]: Следующая раздача отменена, за столом остался абсолютный чемпион.");
                return; // Турнир окончен, стопаем поток
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
        let activeCount = 0;

        players.forEach(p => {
            let selector = p.id === 'player' ? '.player' : `#${p.id}`;
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
        // ИНТЕРАКТИВНЫЙ ФИНАЛ: ЕСЛИ ИГРОК ВЫИГРАЛ ТУРНИР
        // =========================================================================
        if (activeCount === 1) {
            const winner = players.find(p => p.budget > 0);

            // Если победил бот (мало ли), просто стопаем игру
            if (winner.id !== 'player') {
                if (this.gameState.botTimer) {
                    clearTimeout(this.gameState.botTimer);
                    this.gameState.botTimer = null;
                }
                showMessage_(`🏆 ТУРНИР ЗАВЕРШЕН! Победитель: ${winner.name}!`, 10000);
                return true;
            }

            // ЕСЛИ ПОБЕДИЛ ЧЕЛОВЕК (НАШ СЦЕНАРИЙ):
            if (this.gameState.botTimer) {
                clearTimeout(this.gameState.botTimer);
                this.gameState.botTimer = null;
            }

            // Формируем сочный текст с именами проигравших
            const losers = players.filter(p => p.id !== 'player').map(p => p.name).join(', ');
            const victoryText = `🏆 Ты раскатал ботов (${losers})! Они ушли пить пиво и занимать на проезд домой. За стол готовы сесть новые игроки с чистыми 100$.`;

            // Выводим сообщение на экран
            showMessage_(victoryText, 12000);

            // Через 5 секунд, когда игрок прочитает текст, выкатываем системное предложение
            // Через 5 секунд, когда игрок прочитает текст триумфа, выкатываем стильное предложение
            setTimeout(async () => {
                const playAgain = await showCustomConfirm("За Клубный Стол приглашаются новые лица! Готов рискнуть бюджетом?");

                if (playAgain) {
                    // Перезапускаем турнирный раунд со сменой ботов
                    startNextTournamentRound();
                } else {
                    console.log("[TOURNAMENT]: Игрок решил остаться королем горы и завершил сессию.");
                    // Сюда можно повесить редирект в главное меню или легкое затемнение стола
                    showMessage_("Сессия завершена. Вы ушли непобежденным! 👑", 5000);
                }
            }, 5000);

            return true; // Останавливаем стандартный запуск следующей раздачи
        }

        // Если сам игрок проиграл все фишки
        const playerObj = players.find(p => p.id === 'player');
        if (playerObj && playerObj.budget <= 0) {
            const actionPanel = document.querySelector('.action-buttons, .controls');
            if (actionPanel) {
                actionPanel.style.opacity = '0.1';
                actionPanel.style.pointerEvents = 'none';
            }
            showMessage_("💸 Вы вылетели из турнира! Игра окончена.", 7000);
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
        const bankEl = document.querySelector('#bank');
        if (bankEl) bankEl.textContent = ` ${this.gameState.pot} $ `;

        let balanceSelector = '#p-balance';
        let nameSelector = null;

        if (playerObj.id === 'bot-1') {
            balanceSelector = '#bot-balance-1';
            nameSelector = '#bot-1 .white';
        }
        if (playerObj.id === 'bot-2') {
            balanceSelector = '#bot-balance-2';
            nameSelector = '#bot-2 .white';
        }
        if (playerObj.id === 'bot-3') {
            balanceSelector = '#bot-balance-3';
            nameSelector = '#bot-3 .white';
        }

        // Синхронизируем баланс
        const balanceEl = document.querySelector(balanceSelector);
        if (balanceEl) balanceEl.textContent = ` ${playerObj.budget}$`;

        // СИНХРОНИЗАЦИЯ ИМЕНИ: Если это бот, динамически обновляем его имя на столе
        if (nameSelector) {
            const nameEl = document.querySelector(nameSelector);
            if (nameEl && nameEl.textContent.trim() !== playerObj.name.trim()) {
                nameEl.textContent = `${playerObj.name} `;
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
// При смене состава твоя логика просто заменяет эти три ключа объектами из резерва!
const BOT_PROFILES = {
    'bot-1': { name: 'Андрей', style: 'ROCK', bluffChance: 0.05, aggression: 1.5, looseFactor: 1.0 },
    'bot-2': { name: 'Ветал', style: 'MANIAC', bluffChance: 0.25, aggression: 2.5, looseFactor: 1.3 },
    'bot-3': { name: '404', style: 'GTO', bluffChance: 0.12, aggression: 1.0, looseFactor: 1.0 }
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

  // =================================================================================
    // 3. УМНОЕ РАСПРЕДЕЛЕНИЕ ОЦЕНКИ ПО УЛИЦАМ (ИСПРАВЛЕНО ПОД НОВЫЕ МИЛЛИОНЫ)
    // =================================================================================
    if (PokerEngine.gameState.street === 'PREFLOP') {
        handStrength = evaluatePreflopHand(botObj.cards);
        handName = "Стартовые карты";
    }
    else if (PokerEngine.gameState.street === 'FLOP') {
        try {
            const flopEval = evaluateFiveCards(sevenCards);
            if (flopEval && typeof flopEval.score !== 'undefined') {
                const score = flopEval.score;
                handName = flopEval.name; // Берем имя комбинации прямо из анализатора!

                // Калибровка силы для Флопа под новые миллионы:
                if (score >= 60000000) handStrength = 0.95; // Фулл-Хаус, Каре, Стрит-Флеш
                else if (score >= 50000000) handStrength = 0.85; // Флеш
                else if (score >= 40000000) handStrength = 0.80; // Стрит
                else if (score >= 30000000) handStrength = 0.75; // Сет (Тройка)
                else if (score >= 20000000) handStrength = 0.65; // Две пары
                else if (score >= 10000000) handStrength = 0.45; // Одна Пара
                else handStrength = 0.20;                        // Старшая карта / Ничего
            }
        } catch (e) {
            console.warn(`[BOT-AI] Сбой калькулятора флопа для ${botId}:`, e);
            handStrength = 0.25;
        }
    }
    else {
        // ТЁРН И РИВЕР
        try {
            const handEval = getBestCombination(sevenCards);
            if (handEval && typeof handEval.score !== 'undefined') {
                const handScore = handEval.score;
                handName = handEval.name; // Имя берем строго из движка!

                // Точнейшая калибровка силы на Тёрне/Ривере под новые миллионы:
                if (handScore >= 80000000) handStrength = 0.98;      // Стрит-Флеш
                else if (handScore >= 70000000) handStrength = 0.95; // Каре
                else if (handScore >= 60000000) handStrength = 0.90; // Фулл-Хаус
                else if (handScore >= 50000000) handStrength = 0.85; // Флеш
                else if (handScore >= 40000000) handStrength = 0.80; // Стрит
                else if (handScore >= 30000000) handStrength = 0.70; // Сет
                else if (handScore >= 20000000) handStrength = 0.55; // Две пары
                else if (handScore >= 10000000) handStrength = 0.35; // Пара
                else handStrength = 0.15;                            // Старшая карта
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

    // =================================================================================
    // 5. МОДИФИКАЦИЯ ПОВЕДЕНИЯ НА ОСНОВЕ УНИКАЛЬНОГО ХАРАКТЕРА БОТА
    // =================================================================================
    let randomFactor = Math.random() * (profile.bluffChance || 0.1);

    // Мягкие дефолтные значения для старых ботов, если новые свойства не заданы
    const looseFactor = profile.looseFactor || 1.0;
    const style = profile.style;

    // Внедряем характер в силу руки
    let decisionScore = handStrength * looseFactor + randomFactor;

    // Точечные уникальные фичи для новых личностей:
    if (style === 'RANDOM') { // Сентябрь
        // Абсолютно непредсказуем. Может выкинуть натс, может олл-инить на мусоре
        decisionScore = Math.random();
    }
    else if (style === 'MATH') { // Платон
        // Игнорирует блеф, играет строго по шансам банка и чистой математике комбинации
        decisionScore = handStrength;
        randomFactor = 0;
    }
    else if (style === 'ROCK') { // Михалыч
        // Сверхосторожный. Искусственно занижает ценность слабых рук, играет только верняк
        if (handStrength < 0.4) decisionScore -= 0.15;
    }
    else if (style === 'BLUFF') { // Федя
        // Если карта слабая, Федя с вероятностью 35% включает режим безумного блефа
        if (handStrength < 0.35 && Math.random() < 0.35) {
            decisionScore += 0.5;
        }
    }

    console.log(`[BOT-AI] ${profile.name} (${style}) думает на ${PokerEngine.gameState.street}. Рука: ${handName}, Итоговая Сила: ${decisionScore.toFixed(2)}, Шансы банка: ${potOdds.toFixed(2)}`);

    // =================================================================================
    // 6. ДЕРЕВЯННАЯ ЛОГИКА ДЕЙСТВИЙ (С учетом характера)
    // =================================================================================
    const agg = profile.aggression || 1.0;

    // Ситуация А: Ставок перед ботом нет (ЧЕК или РЕЙЗ)
    if (callAmount <= 0) {
        // Платон (MATH) не ставит на пустом месте без явного перевеса
        if (style === 'MATH' && decisionScore < 0.5) {
            PokerEngine.executeAction(botId, 'CHECK');
            return;
        }

        if (decisionScore > 0.65 || style === 'AGRESSIVE') {
            // Агрессивные боты крутят ставку сильнее
            const raiseSize = Math.round(20 * agg);
            PokerEngine.executeAction(botId, 'RAISE', raiseSize);
        } else if (decisionScore > 0.4 && Math.random() < 0.3) {
            // Полублеф
            PokerEngine.executeAction(botId, 'RAISE', 20);
        } else {
            PokerEngine.executeAction(botId, 'CHECK');
        }
    }
    // Ситуация Б: Перед ботом стоит ставка
    else {
        // Если ставка под стек — выбор All-In или Фолд
        if (callAmount >= botObj.budget) {
            if (style === 'MATH') {
                // Платон сравнивает шансы банка напрямую с математической силой
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

        // Логика обычного рейза/колла/фолда
        if (decisionScore > 0.78 || style === 'AGRESSIVE') {
            if (Math.random() < 0.35 && botObj.budget < currentPot && style !== 'MATH') {
                PokerEngine.executeAction(botId, 'ALL-IN');
            } else {
                const raiseSize = Math.round(40 * agg);
                PokerEngine.executeAction(botId, 'RAISE', raiseSize);
            }
        }
        // Математическое обоснование для колла (Шансы банка)
        else if (style === 'MATH' ? (handStrength > potOdds) : (decisionScore > potOdds || decisionScore > 0.36)) {
            PokerEngine.executeAction(botId, 'CALL');
        }
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
    // ПЕРВЫМ ДЕЛОМ проверяем, а не закончился ли турнир в прошлой раздаче?
    if (typeof PokerEngine !== 'undefined' && PokerEngine.checkTableBankruptcy) {
        const isGameOver = PokerEngine.checkTableBankruptcy();
        if (isGameOver) {
            console.log("[TOURNAMENT]: Запуск новой раздачи отменен. Турнир завершен.");
            return; // МГНОВЕННО КУСАЕМ КОД, новая раздача не начнется!
        }
    }
    console.log("=== ЧИСТКА СТОЛА И ПАМЯТИ ДЛЯ НОВОЙ РАЗДАЧИ ===");

    // 1. Очищаем таймер ботов
    if (PokerEngine && PokerEngine.gameState && PokerEngine.gameState.botTimer) {
        clearTimeout(PokerEngine.gameState.botTimer);
        PokerEngine.gameState.botTimer = null;
    }

    // 2. Полностью вычищаем все дочерние узлы DOM во всех контейнерах карт
    const cardContainers = ['#board', '#cards-1', '#cards-2', '#cards-3', '#cards-p'];
    cardContainers.forEach(selector => {
        const el = document.querySelector(selector);
        if (el) {
            el.innerHTML = ''; // Стираем все вложенные карты
            el.style.opacity = '1'; // Возвращаем яркость живому игроку
        }
    });

    // 3. Дополнительная страховка: если карты рендерятся внутри стола с общим классом .card
    document.querySelectorAll('.card').forEach(card => {
        // Если это не карты внутри бокса выбывшего игрока, удаляем их
        if (!card.closest('.eliminated')) {
            card.remove();
        }
    });

    // 4. Обнуляем карманные карты в памяти
    if (typeof players !== 'undefined' && Array.isArray(players)) {
        players.forEach(p => { p.cards = []; });
    }

    // 5. Сброс состояния игры в движке
    if (PokerEngine && PokerEngine.gameState) {
        PokerEngine.gameState.board = [];
        PokerEngine.gameState.foldedPlayers = [];
        PokerEngine.gameState.pot = 0;
        PokerEngine.gameState.currentBet = 0;
        // Очищаем ставки предыдущего раунда у всех игроков
        PokerEngine.gameState.roundBets = {};
    }

    // 5. Показываем уведомление
    if (typeof showMessage_ === 'function') {
        showMessage_("Новая раздача.", 2000);
    }

    // 6. Перемешивание и сдвиг фишки Дилера
    if (typeof tasov === 'function') tasov();

    if (typeof players !== 'undefined' && players.length > 0) {
        // Передаем фишку дилера СЛЕДУЮЩЕМУ ЖИВОМУ игроку
        CURRENT_DEALER = getNextActivePlayerIndex(CURRENT_DEALER);

        // И сразу обновляем отображение фишки на столе
        if (typeof updateDealerChipsUI === 'function') { updateDealerChipsUI(); }

        // 7. Раздаем физические карты (Берем из глобального массива KOLODA)
        if (typeof dealCards === 'function') {
            if (players.find(p => p.id === 'bot-1').budget > 0) dealCards(KOLODA, 2, '#cards-1', true);
            if (players.find(p => p.id === 'bot-2').budget > 0) dealCards(KOLODA, 2, '#cards-2', true);
            if (players.find(p => p.id === 'bot-3').budget > 0) dealCards(KOLODA, 2, '#cards-3', true);
            if (players.find(p => p.id === 'player').budget > 0) dealCards(KOLODA, 2, '#cards-p', false);
        }

        // 8. Запускаем префлоп торговлю через движок
        PokerEngine.initPreflop();
    } else {
        console.error("[CRITICAL]: Глобальный массив players не обнаружен!");
    }
}

//--- А Д   И   И З Р А И Л Ь --------------------------------------
function updateTournamentLevel() {
    if (!PokerEngine.gameState.handsPlayed) {
        PokerEngine.gameState.handsPlayed = 0;
        PokerEngine.gameState.currentLevelIdx = 0;
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


