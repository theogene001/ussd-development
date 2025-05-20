require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const app = express();

app.use(bodyParser.urlencoded({ extended: false }));

// Database connection
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

// USSD Endpoint
app.post('/ussd', (req, res) => {
    const { sessionId, serviceCode, phoneNumber, text } = req.body;
    const textArray = text.split('*');
    let level = textArray.length;
    let response = '';

    const language = textArray[0];
    if (language !== '1' && language !== '2') level = 0;

    // Save session in the database
    connection.query(
        'INSERT INTO sessions (sessionID, phoneNumber, userinput) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE userinput = ?',
        [sessionId, phoneNumber, text, text],
        err => {
            if (err) console.error('❌ Error saving session:', err);
        }
    );

    // Main Menu - Language Selection
    if (level === 0) {
        response = `CON Welcome / Murakaza neza\n1. English\n2. Kinyarwanda`;
    } else if (level === 1) {
        if (language === '1') {
            response = `CON Main Menu\n1. Transactions\n2. Support\n3. Settings\n0. Back`;
        } else if (language === '2') {
            response = `CON Ibyiciro\n1. Amakuru y'imari\n2. Ubufasha\n3. Guhindura\n0. Subira`;
        } else {
            response = `END Invalid selection`;
        }
    } else if (level === 2) {
        const option = textArray[1];
        if (language === '1') {
            switch (option) {
                case '1':
                    response = `CON Transactions:\n1. View Last Transaction\n2. Send Money\n0. Back`;
                    break;
                case '2':
                    response = `CON Support:\n1. Call Us\n2. Email Us\n0. Back`;
                    break;
                case '3':
                    response = `CON Settings:\n1. Change Language\n2. Reset PIN\n0. Back`;
                    break;
                case '0':
                    response = `CON Welcome / Murakaza neza\n1. English\n2. Kinyarwanda`;
                    break;
                default:
                    response = `END Invalid selection`;
            }
        } else if (language === '2') {
            switch (option) {
                case '1':
                    response = `CON Amakuru y'imari:\n1. Reba irya nyuma\n2. Ohereza Amafaranga\n0. Subira`;
                    break;
                case '2':
                    response = `CON Ubufasha:\n1. Hamagara\n2. Email\n0. Subira`;
                    break;
                case '3':
                    response = `CON Guhindura:\n1. Hindura ururimi\n2. Guhindura PIN\n0. Subira`;
                    break;
                case '0':
                    response = `CON Ibyiciro\n1. Amakuru y'imari\n2. Ubufasha\n3. Guhindura\n0. Subira`;
                    break;
                default:
                    response = `END Hitamo siyo`;
            }
        }
    } else if (level === 3) {
        const [lang, main, sub] = textArray;
        if (lang === '1') {
            if (main === '1') {
                if (sub === '1') {
                    // View last transaction
                    connection.query(
                        'SELECT amount, description, created_at FROM transactions WHERE phoneNumber = ? ORDER BY created_at DESC LIMIT 1',
                        [phoneNumber],
                        (err, result) => {
                            if (err) {
                                response = `END Error fetching transaction.`;
                                return;
                            }

                            if (result.length === 0) {
                                response = `END No transaction found.`;
                            } else {
                                const lastTransaction = result[0];
                                response = `END Last transaction: ${lastTransaction.amount} RWF, ${lastTransaction.description}, on ${lastTransaction.created_at}`;
                            }

                            res.set('Content-Type', 'text/plain');
                            res.send(response);
                        }
                    );
                } else if (sub === '2') {
                    // Send Money
                    response = `CON Enter Amount to Send (in RWF)`;
                    res.set('Content-Type', 'text/plain');
                    res.send(response);
                } else if (sub === '0') {
                    response = `CON Main Menu\n1. Transactions\n2. Support\n3. Settings\n0. Back`;
                    res.set('Content-Type', 'text/plain');
                    res.send(response);
                }
            } else if (main === '2') {
                if (sub === '1') {
                    response = `END Call us at 1234`;
                } else if (sub === '2') {
                    response = `END Email: help@example.com`;
                } else if (sub === '0') {
                    response = `CON Main Menu\n1. Transactions\n2. Support\n3. Settings\n0. Back`;
                } else {
                    response = `END Invalid option`;
                }
            } else if (main === '3') {
                if (sub === '1') {
                    response = `END Language change coming soon`;
                } else if (sub === '2') {
                    response = `END PIN reset feature coming soon`;
                } else if (sub === '0') {
                    response = `CON Main Menu\n1. Transactions\n2. Support\n3. Settings\n0. Back`;
                } else {
                    response = `END Invalid option`;
                }
            }
        } else if (lang === '2') {
            if (main === '1') {
                if (sub === '1') {
                    // View last transaction (in Kinyarwanda)
                    connection.query(
                        'SELECT amount, description, created_at FROM transactions WHERE phoneNumber = ? ORDER BY created_at DESC LIMIT 1',
                        [phoneNumber],
                        (err, result) => {
                            if (err) {
                                response = `END Ikosa ryo kubona amakuru.`;
                                return;
                            }

                            if (result.length === 0) {
                                response = `END Nta transaction ziriho.`;
                            } else {
                                const lastTransaction = result[0];
                                response = `END Iranyuma: ${lastTransaction.amount} RWF, ${lastTransaction.description}, kuri ${lastTransaction.created_at}`;
                            }

                            res.set('Content-Type', 'text/plain');
                            res.send(response);
                        }
                    );
                } else if (sub === '2') {
                    // Send Money (in Kinyarwanda)
                    response = `CON Andika umubare wohereza (mu RWF)`;
                    res.set('Content-Type', 'text/plain');
                    res.send(response);
                } else if (sub === '0') {
                    response = `CON Ibyiciro\n1. Amakuru y'imari\n2. Ubufasha\n3. Guhindura\n0. Subira`;
                    res.set('Content-Type', 'text/plain');
                    res.send(response);
                }
            } else if (main === '2') {
                if (sub === '1') {
                    response = `END Duhamagare kuri 1234`;
                } else if (sub === '2') {
                    response = `END Email: help@example.com`;
                } else if (sub === '0') {
                    response = `CON Ibyiciro\n1. Amakuru y'imari\n2. Ubufasha\n3. Guhindura\n0. Subira`;
                } else {
                    response = `END Hitamo siyo`;
                }
            } else if (main === '3') {
                if (sub === '1') {
                    response = `END Guhindura ururimi vuba`;
                } else if (sub === '2') {
                    response = `END Guhindura PIN vuba`;
                } else if (sub === '0') {
                    response = `CON Ibyiciro\n1. Amakuru y'imari\n2. Ubufasha\n3. Guhindura\n0. Subira`;
                } else {
                    response = `END Hitamo siyo`;
                }
            }
        }
    } else if (level === 4) {
        // Handle Money Transfer (After User Inputs Amount)
        const amount = textArray[3];
        if (amount) {
            // Log the transaction in the database
            connection.query(
                'INSERT INTO transactions (phoneNumber, amount, description, created_at) VALUES (?, ?, ?, NOW())',
                [phoneNumber, amount, 'Money Sent', (err) => {
                    if (err) {
                        response = `END Transaction Failed.`;
                    } else {
                        response = `END Transaction successful: ${amount} RWF sent.`;
                    }

                    res.set('Content-Type', 'text/plain');
                    res.send(response);
                }]
            );
        } else {
            response = `END Invalid amount.`;
            res.set('Content-Type', 'text/plain');
            res.send(response);
        }
    } else {
        response = `END Invalid entry`;
        res.set('Content-Type', 'text/plain');
        res.send(response);
    }
});

// Server setup
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
