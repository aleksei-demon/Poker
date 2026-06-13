const const_masti = [
    ['f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'a',],
    ['s', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'n',],
    ['F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'A',],
    ['S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'N',],
];  // 0 Pika;  1 Trefa;  2 Bubna;  3 Cherva

let kozuri = [];
let kompKards = [];
let playerKards = [];
let koloda_v_igre = [];
let op1 = [];
//---------------------
let komp_kozurs = [];
let player_kozurs = [];
let player_hod = true;
let comp_prinyal = false;


//-------------------------S h o w   M a s s a g e-------------------------------------
function showMassage_(massage = '', timeShow = 900) {
    let body = document.querySelector('body');
    let p = document.createElement('p');
    p.classList.add('massage');
    p.setAttribute('id', 'p_massage');
    p.innerText = massage;
    body.prepend(p);
    let p_massage = document.getElementById('p_massage');
    let stepTransparent = 0;
    let down = false;
    setInterval(() => {
        if (stepTransparent < 100 && down == false) {
            p_massage.style.opacity = (stepTransparent * 0.01);
            stepTransparent += 5;
            if (stepTransparent >= 99) { down = true }
        }
        if (stepTransparent > 0 && down == true) {
            p_massage.style.opacity = (stepTransparent * 0.01);
            stepTransparent--;
        }
    }, (timeShow / 200));
    setTimeout(() => {
        body.removeChild(p_massage);
    }, timeShow);
}
//-------------------------Show Massage-------------------------------------

//------------------t a s o v k a------------------------
let tempTasov = [];
function tasov() {
    let tempconst_masti = [];
    let count = 0;
    for (let i = 0; i < const_masti.length; i++) {
        for (let k = 0; k < const_masti[i].length; k++) { tempconst_masti[count] = const_masti[i][k]; count++; }
    }
    for (let i = tempconst_masti.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [tempconst_masti[i], tempconst_masti[j]] = [tempconst_masti[j], tempconst_masti[i]];
    }
    tempTasov = tempconst_masti;
}
tasov();
//-----tasovka-------------------------------------------

//------------------- R A Z D A C H A -------------------------------------

function razdacha_(arr_actual) {
    for (let i = 0; i < arr_actual.length; i++) {
        if (i < 6 && playerKards.length < 6) {
            console.log('mne ');
            playerKards.push(arr_actual[i]);
        } else if (i < 12 && i >= 6 && kompKards.length < 6) {
            console.log('tebe ');
            kompKards.push(arr_actual[i]);
        } else if (i >= 12 && koloda_v_igre.length < 24) {
            console.log('koloda_v_igre ');
            koloda_v_igre.push(arr_actual[i]);
        }
    }
}
razdacha_(tempTasov);
tempTasov = koloda_v_igre;
//-------------------razdacha-----------------------------------------------

//---------------------- K O Z U R I --------------------------------------------------------------

function kozuri_() {
    for (let i = 0; i < const_masti.length; i++) {
        for (let k = 0; k < const_masti[i].length; k++) {
            if (const_masti[i][k] == koloda_v_igre[23]) {
                kozuri = const_masti[i].slice(0);
                if (i == 0) { console.log('Pika') }
                if (i == 1) { console.log('Trefa') }
                if (i == 2) { console.log('Bubna') }
                if (i == 3) { console.log('Cherva') }
            }
        }
    }
}
kozuri_();

//------------------------kozuri--------------------------------------------------------------

//----------------- C H E Y   H O D -----------------------------

function chey_hod() {
    player_kozurs = playerKards.filter(function (obj) { return kozuri.indexOf(obj) >= 0; });
    komp_kozurs = kompKards.filter(function (obj) { return kozuri.indexOf(obj) >= 0; });
    let p = 0, k = 0; // собрав массивы козырей ПК и игрока, установим и сравним старшинство козырей.
    for (let i = 0; i < kozuri.length; i++) {
        if (player_kozurs[player_kozurs.length - 1] == kozuri[i]) { p = i };
        if (komp_kozurs[komp_kozurs.length - 1] == kozuri[i]) { k = i };
    }

    if (p > k || p == k) { console.log('player_hod'); showMassage_('Х о д и !', 6000); player_hod = true };
    if (p < k) {
        console.log('komp_hod'); showMassage_('О т б и в а й !', 6000); player_hod = false;
        hod_kompa_();

        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    }
}
chey_hod();
//-------------------chey hod----------------------------

// -------------- V E R S T K A   ------------------------------------------------

function verstka_() {
    let compzone_elem = document.querySelector('.compzone');
    while (compzone_elem.firstChild) { compzone_elem.removeChild(compzone_elem.firstChild); }

    for (let i = 0; i < koloda_v_igre.length; i++) {
        let divs = document.createElement('div');
        divs.classList.add('card', 'card-back', 'c' + i);
        if (i == (koloda_v_igre.length - 1)) {
            divs.classList.add('card-front'); divs.classList.remove('card-back');
            let p = document.createElement('p'); p.classList.add('p-card');
            if (koloda_v_igre[i] == koloda_v_igre[i].toUpperCase()) { p.classList.add('red'); }
            p.innerHTML = koloda_v_igre[i];
            divs.append(p);
        }
        compzone_elem.append(divs);
    }

    let playerzone_elem = document.querySelector('.playerzone');
    while (playerzone_elem.firstChild) { playerzone_elem.removeChild(playerzone_elem.firstChild); }

    try {
        for (let i = 0; i < playerKards.length; i++) {
            let divs = document.createElement('div');
            let p = document.createElement('p');
            divs.classList.add('card', 'card-front', 'd' + i);
            divs.setAttribute('name', 'player');
            p.classList.add('p-card', 'p' + i);
            if (playerKards[i] == playerKards[i].toUpperCase()) { p.classList.add('red'); }
            p.innerHTML = playerKards[i];
            divs.append(p);
            playerzone_elem.append(divs);
        }
    }
    catch (e) { console.error('внешний блок catch', e.message); }

    let pole_elem = document.querySelector('.pole');
    while (pole_elem.firstChild) { pole_elem.removeChild(pole_elem.firstChild); }

    try {
        for (let i = 0; i < op1.length; i++) {
            let divs = document.createElement('div');
            let p = document.createElement('p');
            divs.classList.add('card', 'card-front', 'd' + i);
            divs.setAttribute('name', 'pole');
            p.classList.add('p-card', 'p' + i);
            if (op1[i] == op1[i].toUpperCase()) { p.classList.add('red'); }
            p.innerHTML = op1[i];
            divs.append(p);
            pole_elem.append(divs);
        }
    }
    catch (e) { console.error('внешний блок catch', e.message); }
    playerClick_refresh();
}
verstka_();
//------verstka---------------- C l i c k _ r e f r e s h -------------------------------------------------------------------------------

function playerClick_refresh() {
    let playerClickCards = document.getElementsByName('player');
    for (let i = 0; i < playerClickCards.length; i++) {
        playerClickCards[i].onclick = () => {
            console.log(player_hod);
            if (player_hod == true) { // !!!
                //===================================================================== КОНТРОЛЬ ПОДКИДА
                let podki_hodCard = [];// это карта, которую пробует подкинуть человек
                podki_hodCard[0] = playerKards[i];
                let good = false;
                let mozhno_podkinut = [];
                for (let i = 0; i < const_masti.length; i++) {
                    for (let k = 0; k < const_masti[i].length; k++) {
                        for (let a = 0; a < op1.length; a++) {
                            if (op1[a] == const_masti[i][k]) {
                                //=====перебрали const_masti и получили место op1[a] в const_masti.
                                for (let u = 0; u <= 3; u++) {
                                    if (const_masti[u][k] !== op1[a]) { mozhno_podkinut.push(const_masti[u][k]); }
                                }
                            }
                        }
                    }
                } // выше мы получили карты что можно было бы подкинуть   
                console.log('mozhno_podkinut ' + mozhno_podkinut);
                if (mozhno_podkinut.includes(podki_hodCard[0])) { good = true; }
                //===================================================================== КОНТРОЛЬ ПОДКИДА
                if (op1.length < 1 || good) {
                    let hodCard = playerKards.splice(i, 1,);
                    op1.push(hodCard[0]);
                    console.log('podki hod');
                    verstka_();
                    razbor_(hodCard);
                }
            } else {
                console.log('p r o ver it');
                //++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ КОНТРОЛЬ ПОБОЯ
                let testingCard = [];// это карта, которой пробует бить человек
                testingCard[0] = playerKards[i];
                let rost_testingCard = 0, mast_testingCard = 0; good = false;
                let rost_OP_Card = 0, mast_OP_Card = 0;
                for (let a = 0; a < const_masti.length; a++) {
                    for (let k = 0; k < const_masti[a].length; k++) {
                        if (testingCard[0] == const_masti[a][k]) {// определим ранги бьющей карты
                            rost_testingCard = k; mast_testingCard = a;
                        }
                        if (op1[op1.length - 1] == const_masti[a][k]) {// определим ранги побиваемой карты
                            rost_OP_Card = k; mast_OP_Card = a;
                        }
                    }
                }// Сравним ранги карт и назначим "good"
                if (rost_testingCard > rost_OP_Card && mast_testingCard == mast_OP_Card) {
                    good = true;
                } else if (kozuri.includes(testingCard[0])) {
                    good = true;
                }
                //++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ КОНТРОЛЬ ПОБОЯ
                if (good) {
                    let hodCard = playerKards.splice(i, 1,);
                    op1.push(hodCard[0]);
                    console.log(op1);
                    verstka_();
                    // player_hod = true;
                    console.log('player_hod == false');
                    podkinut_();
                }
            }

        }
    }
}
playerClick_refresh();

// --------------Click_refresh---------------------------------------------

//------------------------ O T B O Y ------------------------------------------------------------

function otboy_(comp_prinyal = false) { //!!!!!!!!!!!!!!!!!!!!!!!!!!!!

    if (playerKards.length == 0 && kompKards.length == 0 && koloda_v_igre.length == 0) { showMassage_('Ничья !', 12000); return } // ничья
    if (kompKards.length == 0 && koloda_v_igre.length == 0) { showMassage_('Ты проиграл !', 12000); return } // победа компа 
    if (playerKards.length == 0 && koloda_v_igre.length == 0) { showMassage_('Ты победил !', 12000); return } // победа человека 

    op1 = [];
    if (player_hod == true && koloda_v_igre.length > 0) {
        while (6 > kompKards.length) {
            let boat = koloda_v_igre.splice(0, 1);
            kompKards.push(boat[0]);
        }
        while (6 > playerKards.length && koloda_v_igre.length > 0) {
            let boat = koloda_v_igre.splice(0, 1);
            playerKards.push(boat[0]);
        }
    } else {
        while (6 > playerKards.length && koloda_v_igre.length > 0) {
            let boat = koloda_v_igre.splice(0, 1);
            playerKards.push(boat[0]);
        }
        while (6 > kompKards.length && koloda_v_igre.length > 0) {
            let boat = koloda_v_igre.splice(0, 1);
            kompKards.push(boat[0]);
        }
    }
    if (comp_prinyal == true) {
        showMassage_('З а б р а л !', 3000);
        player_hod = true;
        comp_prinyal = false;

    } else if (comp_prinyal == null) {
        showMassage_('Вы приняли !', 3000);
        player_hod = false;
        comp_prinyal = false;

    } else {
        player_hod = (!player_hod); // инверсия ход_игрока по отбою.
        showMassage_('О т б о й !', 2000);
        hod_kompa_();
    }
    if (player_hod == false) { hod_kompa_(); }// !!!!!!!!!!!!

    verstka_();
}

document.querySelector('.compzone').onclick = () => {
    if (op1.length % 2 == 0) { otboy_(); }
}

//--------------------------------------otboy-------------------------------------------


//----------------------- R A Z B O R ---------------------------------------------------------- R A Z B O R --------------------

function razbor_(hodCard) {
    for (let i = 0; i < const_masti.length; i++) {
        for (let k = 0; k < const_masti[i].length; k++) {
            if (hodCard[0] == const_masti[i][k]) {
                //=====перебрали const_masti и получили место ХодКарты в const_masti.
                let podkinut = [];
                for (let u = 0; u <= 3; u++) {
                    if (const_masti[u][k] !== hodCard[0]) { podkinut.push(const_masti[u][k]); }
                }
                console.log('podkinut ' + podkinut);
                //======================================
                console.log('mast' + i + "  karta" + k);
                console.log('otvet eto ' + const_masti[i][k + 1]);
                let otvet_eto = const_masti[i][k + 1];
                if (otvet_eto == undefined) {
                    let imeemKozur_cards = [];
                    imeemKozur_cards = kompKards.filter(x => kozuri.includes(x)); // тут получаем наши козыря ..      
                    let er = hodCard.filter(x => kozuri.includes(x)); // фиксим баг с тем как бить козырь козырем)))  
                    if (imeemKozur_cards.length == 0 || er.length > 0) { // если их нема то 
                        console.log('prinimau');
                        let temp_arr = kompKards.concat(op1);
                        op1 = [];
                        kompKards = temp_arr;
                        console.log('kompKards4 = ' + kompKards);
                        player_hod = true;
                        console.log(player_hod);
                        verstka_();
                        otboy_(true);//!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                        return;
                    } else { // получим младший из доступных козырей
                        let small = []; let kk = 999; // выделить младшую карту
                        for (let i = 0; i < const_masti.length; i++) {
                            for (let k = 0; k < const_masti[i].length; k++) {
                                if (imeemKozur_cards.includes(const_masti[i][k])) {
                                    if (k < kk) {
                                        kk = k;
                                        small[0] = const_masti[i][k]; // записали младшую в small[0]
                                    }
                                }
                            }
                        }
                        for (let u = 0; u < kompKards.length; u++) {
                            if (kompKards[u] == small[0]) {
                                console.log(small + ' ..small');// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                                let temp = kompKards.splice(u, 1); // срезали младшую в Ход                
                                op1.push(temp[0]);
                                verstka_();
                                return;
                            }
                        }
                    }
                }
                console.log(const_masti[i][k].length);
                let otvet = const_masti[i].slice(k + 1);
                //console.log(otvet);
                //=======================================
                let shag_Flag = 0;
                let prinimau_flag = 0;
                for (let a = 0; a < otvet.length; a++) {
                    for (let b = 0; b < kompKards.length; b++) {
                        if (otvet[a] === kompKards[b]) {
                            if (shag_Flag == 0) {
                                prinimau_flag++;
                                console.log('kompKards1 = ' + kompKards);
                                let otvetCard = kompKards.splice(b, 1);
                                op1.push(otvetCard[0]);
                                console.log('kompKards2 = ' + kompKards);
                                verstka_();
                                shag_Flag++;
                                break;
                            }
                        }
                    }
                }
                //===+++++++++++++++++++++++++++++++++++++++++++
                for (let a = 0; a < otvet.length; a++) {
                    for (let b = 0; b < kompKards.length; b++) {
                        if (shag_Flag == 0) {
                            let imeemKozur_cards = [];
                            imeemKozur_cards = kompKards.filter(x => kozuri.includes(x)); // тут получаем наши козыря ..      
                            let er = hodCard.filter(x => kozuri.includes(x)); // фиксим баг с тем как бить козырь козырем)))  
                            if (imeemKozur_cards.length == 0 || er.length > 0) { // если их нема то 
                                console.log('prinimau');
                                let temp_arr = kompKards.concat(op1);
                                op1 = [];
                                kompKards = temp_arr;
                                console.log('kompKards4 = ' + kompKards);
                                player_hod = true;
                                console.log(player_hod);
                                verstka_();
                                otboy_(true);//!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                                return;
                            } else { // получим младший из доступных козырей
                                let small = []; let kk = 999; // выделить младшую карту
                                for (let i = 0; i < const_masti.length; i++) {
                                    for (let k = 0; k < const_masti[i].length; k++) {
                                        if (imeemKozur_cards.includes(const_masti[i][k])) {
                                            if (k < kk) {
                                                kk = k;
                                                small[0] = const_masti[i][k]; // записали младшую в small[0]
                                            }
                                        }
                                    }
                                }
                                for (let u = 0; u < kompKards.length; u++) {
                                    if (kompKards[u] == small[0]) {
                                        console.log(small + ' ..small');// !!!!!!!!!!!!!!!!!!!!!!!
                                        let temp = kompKards.splice(u, 1); // срезали младшую в Ход 
                                        op1.push(temp[0]);
                                        verstka_();
                                        return;
                                    }
                                }
                            }
                        }
                    }
                }
                //===++++++++++++++++++++++++++++++++++++++++++
                if (prinimau_flag == 0) {
                    console.log(prinimau_flag + ' prinimau_flag');
                    let temp_arr = kompKards.concat(op1);
                    op1 = [];
                    kompKards = temp_arr;
                    console.log('kompKards3 = ' + kompKards);
                    otboy_(true);// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

                }
            }
        }
    }
}
//------------------razbor-------------------------------------------------------------------------------razbor------------------


//-------------------------------------- H O D   K O M P A ----------------------------------

function hod_kompa_() {
    let temp_cards = [];

    if (koloda_v_igre.length > 10 && player_hod == false) {//

        let get_kozur_cards = kompKards.filter(x => kozuri.includes(x)); // выделить козыря .. 
        let temp_cards = kompKards.filter(x => !kozuri.includes(x)); // выделить простые .. 
        console.log(temp_cards + ' простыеКарты');
        console.log(get_kozur_cards + ' козыри');

        let small = []; let kk = 999; // выделить младшую карту

        for (let i = 0; i < const_masti.length; i++) {
            for (let k = 0; k < const_masti[i].length; k++) {
                if (temp_cards.includes(const_masti[i][k])) {
                    if (k < kk) {
                        kk = k;
                        small[0] = const_masti[i][k]; // записали младшую в small[0]
                    }
                }
            }
        }

        for (let u = 0; u < kompKards.length; u++) {
            if (kompKards[u] == small[0]) {
                console.log(small + ' ..small');// !!!!!!!!!!!!!!!!
                op1 = kompKards.splice(u, 1); // срезали младшую в Ход  
            }
        }

        verstka_();

    } else if (player_hod == false) {
        temp_cards = kompKards;
        let small = []; let kk = 999; // выделить младшую карту

        for (let i = 0; i < const_masti.length; i++) {
            for (let k = 0; k < const_masti[i].length; k++) {
                if (temp_cards.includes(const_masti[i][k])) {
                    if (k < kk) {
                        kk = k;
                        small[0] = const_masti[i][k]; // записали младшую в small[0]
                    }
                }
            }
        }

        for (let u = 0; u < kompKards.length; u++) {
            if (kompKards[u] == small[0]) {
                console.log(small + ' ..small');// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                op1 = kompKards.splice(u, 1); // срезали младшую в Ход 
            }
        }
        verstka_();
    }
    player_hod == true;
}

//-----------------------------------------hod kompa-----------------------------------------

//---------------- p o d k i n u t -------------------------------------------- p o d k i n u t ---------------
function podkinut_() {
    let podkinut = [];
    if (koloda_v_igre.length > 4) {
        for (let i = 0; i < const_masti.length; i++) {
            for (let k = 0; k < const_masti[i].length; k++) {
                for (let a = 0; a < op1.length; a++) {
                    if (op1[a] == const_masti[i][k]) {
                        //=====перебрали const_masti и получили место op1[a] в const_masti.
                        for (let u = 0; u <= 3; u++) {
                            if (const_masti[u][k] !== op1[a]) { podkinut.push(const_masti[u][k]); }
                        }
                    }
                }
            }
        } // выше мы получили карты что можно было бы подкинуть         console.log('p o d k i n u t ' + podkinut);
        let prostue_cards = kompKards.filter(x => !kozuri.includes(x)); // выделить простые .карты. 
        let realDostup_cards = prostue_cards.filter(x => podkinut.includes(x)); // получили реально доступные .карты.

        let small = []; let kk = 999; // выделить младшую карту

        for (let i = 0; i < const_masti.length; i++) {
            for (let k = 0; k < const_masti[i].length; k++) {
                if (realDostup_cards.includes(const_masti[i][k])) {
                    if (k < kk) {
                        kk = k;
                        small[0] = const_masti[i][k]; // записали младшую в small[0]
                    }
                }
            }
        }

        for (let u = 0; u < kompKards.length; u++) {
            if (kompKards[u] == small[0]) {
                console.log(small + ' ..small');// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                let temp = kompKards.splice(u, 1); // срезали младшую в Ход                
                op1.push(temp[0]);
            }
        }
        console.log('p o d k i n u t ' + small);

    }
    verstka_();
}
//---------------podkinut-------------------------------podkinut-------------------------------------------

//-------------------------C H E L   P R I N Y A L--------------------------------------
document.querySelector('.pole').onclick = () => {
    chel_prinyal(); //!!
}

function chel_prinyal() {
    if (player_hod == false && op1.length % 2 == 1) {
        let temp_arr = playerKards.concat(op1);
        op1 = [];
        playerKards = temp_arr;
        otboy_(null);
    }// !!! playerKards
}
//-------------------------chel_prinyal--------------------------------------------------






