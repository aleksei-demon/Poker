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

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM дерево полностью построено');
    runTestDistribution();
});





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


// Функция раздачи конкретного количества карт в конкретное место
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

// Функция ТЕСТОВОЙ РАЗДАЧИ для настройки твоего интерфейса
function runTestDistribution() {
    // 1. Очищаем зоны перед тестом (чтобы карты не дублировались при повторном нажатии)
    document.querySelectorAll('#board, #cards-p, #cards-1, #cards-2, #cards-3').forEach(el => el.innerHTML = '');

    // 2. Раздаем ботам по 2 карты рубашкой вверх (true)
    dealCards(KOLODA, 2, '#cards-1', true);
    dealCards(KOLODA, 2, '#cards-2', true);
    dealCards(KOLODA, 2, '#cards-3', true);

    // 3. Раздаем живому игроку 2 карты лицом вверх (false)
    dealCards(KOLODA, 2, '#cards-p', false);

    // 4. Выкладываем на стол (board) сразу 5 карт лицом вверх (false)
    dealCards(KOLODA, 5, '#board', false);

    console.log(`Тестовая раздача выполнена! Остаток карт в колоде: ${KOLODA.length}`);
}











