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








