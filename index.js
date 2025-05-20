require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const app = express();

app.use(bodyParser.urlencoded({ extended: false }));

const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: 3306
});

connection.connect(err => {
    if (err) throw err;
    console.log('✅ MySQL connected');
});

app.post('/ussd', (req, res) => {
    const { sessionId, serviceCode, phoneNumber, text } = req.body;
    let response = '';
    let textArray = text.split('*');
    let level = textArray.length;

    let language = textArray[0];
    if (language !== '1' && language !== '2') level = 0;

    // Save session
    connection.query(
        'INSERT INTO Sessions (sessionID, phoneNumber, userinput) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE userinput = ?',
        [sessionId, phoneNumber, text, text],
        (err) => {
            if (err) console.error(err);
        }
    );

    // Language selection
    if (level === 0) {
        response = `CON Welcome / Murakaza neza\n1. English\n2. Kinyarwanda`;
    }

    // Main menu
    else if (level === 1) {
        if (language === '1') {
            response = `CON Main Menu\n1. Account Info\n2. Payments\n3. Support\n0. Back`;
        } else if (language === '2') {
            response = `CON Ibyiciro By'ibanze\n1. Amakuru y'Konti\n2. Kwishyura\n3. Ubufasha\n0. Subira inyuma`;
        } else {
            response = `END Invalid selection`;
        }
    }

    // Submenus
    else if (level === 2) {
        const menuOption = textArray[1];
        if (menuOption === '0') {
            response = `CON Welcome / Murakaza neza\n1. English\n2. Kinyarwanda`;
        } else if (language === '1') {
            if (menuOption === '1') {
                response = `CON Account Info:\n1. Check Balance\n2. View History\n0. Back`;
            } else if (menuOption === '2') {
                response = `CON Payments:\n1. Pay a Bill\n2. Check Payment Status\n0. Back`;
            } else if (menuOption === '3') {
                response = `CON Support:\n1. Contact Us\n2. FAQ\n0. Back`;
            } else {
                response = `END Invalid selection`;
            }
        } else if (language === '2') {
            if (menuOption === '1') {
                response = `CON Amakuru y'Konti:\n1. Reba Saldo\n2. Reba Amateka\n0. Subira inyuma`;
            } else if (menuOption === '2') {
                response = `CON Kwishyura:\n1. Kwishyura Inyemezabuguzi\n2. Reba Imiterere\n0. Subira inyuma`;
            } else if (menuOption === '3') {
                response = `CON Ubufasha:\n1. Hamagara\n2. Ibibazo Bikunze Kubazwa\n0. Subira inyuma`;
            } else {
                response = `END Hitamo siyo`;
            }
        }
    }

    // Sub-submenus or final actions
    else if (level === 3) {
        const mainOption = textArray[1];
        const subOption = textArray[2];

        if (subOption === '0') {
            // Return to Main Menu
            if (language === '1') {
                response = `CON Main Menu\n1. Account Info\n2. Payments\n3. Support\n0. Back`;
            } else {
                response = `CON Ibyiciro By'ibanze\n1. Amakuru y'Konti\n2. Kwishyura\n3. Ubufasha\n0. Subira inyuma`;
            }
        } else if (language === '1') {
            if (mainOption === '1') {
                if (subOption === '1') {
                    response = `END Your balance is 12,000 RWF`;
                } else if (subOption === '2') {
                    response = `END Last 5 transactions: 1000, 2500, 3200, 500, 1500`;
                } else {
                    response = `END Invalid selection`;
                }
            } else if (mainOption === '2') {
                if (subOption === '1') {
                    response = `END Please visit www.example.com to pay your bill`;
                } else if (subOption === '2') {
                    response = `END No pending payments found`;
                } else {
                    response = `END Invalid selection`;
                }
            } else if (mainOption === '3') {
                if (subOption === '1') {
                    response = `END Call us at 1234 for support`;
                } else if (subOption === '2') {
                    response = `END Visit www.example.com/faq for FAQs`;
                } else {
                    response = `END Invalid selection`;
                }
            } else {
                response = `END Invalid option`;
            }
        } else if (language === '2') {
            if (mainOption === '1') {
                if (subOption === '1') {
                    response = `END Saldo yawe ni 12,000 RWF`;
                } else if (subOption === '2') {
                    response = `END Imyirondoro 5 iheruka: 1000, 2500, 3200, 500, 1500`;
                } else {
                    response = `END Hitamo siyo`;
                }
            } else if (mainOption === '2') {
                if (subOption === '1') {
                    response = `END Sura www.example.com kwishyura`;
                } else if (subOption === '2') {
                    response = `END Nta kwishyura bigikenewe`;
                } else {
                    response = `END Hitamo siyo`;
                }
            } else if (mainOption === '3') {
                if (subOption === '1') {
                    response = `END Duhamagare kuri 1234`;
                } else if (subOption === '2') {
                    response = `END Sura www.example.com/faq kubibazo bisubizwa kenshi`;
                } else {
                    response = `END Hitamo siyo`;
                }
            } else {
                response = `END Hitamo siyo`;
            }
        }
    }

    // Fallback
    else {
        response = `END Invalid entry`;
    }

    res.set('Content-Type: text/plain');
    res.send(response);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
