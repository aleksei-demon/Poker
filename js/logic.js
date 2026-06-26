// =============================================================================
//  LOGIC.JS — логика приложения
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

//--------- З А П У С К -------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM дерево полностью построено');
    startNewHand();
});
//----- запуск -------------------------------------------

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

// Конфигурация игры (блайнды)
const SMALL_BLIND = 5;
const BIG_BLIND = 10;

// Структура игроков для управления бюджетом (примерная, адаптируй под свой массив)
let players = [
    { id: 'player', name: 'Чел', budget: 100, elementId: '#cards-p' },
    { id: 'bot-1', name: 'Андрей', budget: 100, elementId: '#cards-1' },
    { id: 'bot-2', name: 'Ветал', budget: 100, elementId: '#cards-2' },
    { id: 'bot-3', name: '404', budget: 100, elementId: '#cards-3' }
];

// Переменная для хранения текущего дилера (индекс в массиве players: 0 - Чел, 1 - Андрей...)
let CURRENT_DEALER = 0;

//  запуск раунда 
function startNewHand() {
    console.log("=== НАЧАЛО НАСТОЯЩЕЙ РАЗДАЧИ ===");
    showMessage_("Новая раздача.", 9500);
    // 1. Очищаем DOM-контейнеры от старых карт   
    document.querySelectorAll('#board, #cards-1, #cards-2, #cards-3, #cards-p').forEach(el => el.innerHTML = '');

    // 2. Полный сброс банка и ставок в движке
    PokerEngine.gameState.pot = 0;
    PokerEngine.gameState.currentBet = 0;

    // 3. Вызываем тасовку
    tasov();
    console.log(`Колода заряжена. Карт в наличии: ${KOLODA.length}`);

    // 4. Двигаем фишку дилера по часовой стрелке на следующий раунд
    CURRENT_DEALER = (CURRENT_DEALER + 1) % players.length;
    updateDealerChipsUI();

    // 5. Автоматический сбор блайндов
    //  малый блайнд ставит следующий после дилера, а большой — за ним.
    const sbPlayerIndex = (CURRENT_DEALER + 1) % players.length;
    const bbPlayerIndex = (CURRENT_DEALER + 2) % players.length;

    makeAutomaticBet(players[sbPlayerIndex], SMALL_BLIND);
    makeAutomaticBet(players[bbPlayerIndex], BIG_BLIND);

    // Синхронизируем отображение общего банка на сукне
    const bankEl = document.querySelector('#bank');
    if (bankEl) bankEl.textContent = ` ${PokerEngine.gameState.pot} $ `;

    //  РАЗДАЧА КАРТ 
    // Ботам отдаем карты "в закрытую" (true) — вешается класс .card-back
    dealCards(KOLODA, 2, '#cards-1', true); // Андрей
    dealCards(KOLODA, 2, '#cards-2', true); // Ветал
    dealCards(KOLODA, 2, '#cards-3', true); // 404

    dealCards(KOLODA, 2, '#cards-p', false); // Чел

    console.log(`Раздача завершена. Остаток карт в колоде: ${KOLODA.length}`);
}

// Функция автоматического списания слепых ставок (блайндов)
function makeAutomaticBet(playerObj, amount) {
    // Определяем, сколько игрок реально может поставить (защита от нехватки денег)
    const actualBet = Math.min(playerObj.budget, amount);

    playerObj.budget -= actualBet;
    PokerEngine.gameState.pot += actualBet;

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

//=========================================================
//================== ⇓ М А Ш И Н А ⇓ ↓↓↓↓==========================
//=========================================================
// Единственная точка входа для любых игровых действий
const PokerEngine = {
    // Состояние игры (state)
    gameState: {
        pot: 0,
        currentBet: 0,
        activePlayerIndex: 0,
        // ... и т.д.
    },

    // Тот самый API, который дергают и люди, и боты
    executeAction(playerId, actionType, amount = 0) {
        // 1. Проверяем, действительно ли сейчас ход этого playerId
        if (playerId !== this.getCurrentPlayerId()) {
            console.error("Ход не в вашу очередь!");
            return false;
        }

        // 2. Обрабатываем команду
        switch (actionType) {
            case 'FOLD':
                this.handleFold(playerId);
                break;
            case 'CHECK':
                this.handleCheck(playerId);
                break;
            case 'CALL':
                this.handleCall(playerId);
                break;
            case 'RAISE':
                this.handleRaise(playerId, amount);
                break;
            case 'ALL_IN':
                this.handleAllIn(playerId);
                break;
        }

        // 3. После действия обновляем интерфейс и передаем ход дальше
        this.nextTurn();
    }
};
//================== ↑ М А Ш И Н А ↑ ↑↑↑↑↑↑↑⇑⇑⇑⇑⇑==========================
//=========================================================

// document.querySelector('#all-in').addEventListener('click', () => {
//     // Передаем ID игрока (например, 0) и команду
//     PokerEngine.executeAction(0, 'ALL_IN');
// });








function runBotLogic(botId) {
    const decision = analyzeSituation(botId); // Бот подумал и решил сделать RAISE

    // Бот вызывает то же API, что и кнопка игрока!
    PokerEngine.executeAction(botId, 'RAISE', decision.amount);
}
//-------ПРИМЕР ВЫЗОВА Ф ИГРЫ------------------
















