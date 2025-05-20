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

    // Get language or default to 0
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

    if (level === 0) {
        response = `CON Welcome / Murakaza neza\n1. English\n2. Kinyarwanda`;
    } else if (level === 1) {
        if (language === '1') {
            response = `CON Main Menu\n1. View Transactions\n2. Contact Support\n0. Back`;
        } else if (language === '2') {
            response = `CON Ibyiciro By'ibanze\n1. Reba Amakuru\n2. Hamagara Ubufasha\n0. Subira inyuma`;
        } else {
            response = `END Invalid selection`;
        }
    } else if (level === 2) {
        const menuOption = textArray[1];
        if (language === '1') {
            if (menuOption === '1') {
                // example query (replace with actual logic)
                response = `END Your recent transaction: 5000 RWF received`;
            } else if (menuOption === '2') {
                response = `END Contact us at 1234`;
            } else if (menuOption === '0') {
                response = `CON Welcome / Murakaza neza\n1. English\n2. Kinyarwanda`;
            } else {
                response = `END Invalid selection`;
            }
        } else if (language === '2') {
            if (menuOption === '1') {
                response = `END Iyanyuma wabonye: 5000 RWF yakiriwe`;
            } else if (menuOption === '2') {
                response = `END Duhamagare kuri 1234`;
            } else if (menuOption === '0') {
                response = `CON Welcome / Murakaza neza\n1. English\n2. Kinyarwanda`;
            } else {
                response = `END Hitamo siyo`;
            }
        }
    } else {
        response = `END Invalid entry`;
    }

    res.set('Content-Type: text/plain');
    res.send(response);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
