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

    // Save session
    connection.query(
        'INSERT INTO sessions (sessionID, phoneNumber, userinput) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE userinput = ?',
        [sessionId, phoneNumber, text, text],
        err => {
            if (err) console.error('❌ Error saving session:', err);
        }
    );

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
                    response = `CON Transactions:\n1. View Last Transaction\n2. View All Transactions\n3. Perform New Transaction\n0. Back`;
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
                    response = `CON Amakuru y'imari:\n1. Reba irya nyuma\n2. Reba byose\n3. Kora igikorwa\n0. Subira`;
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
                    response = `END Last transaction: 5000 RWF received`;
                    connection.query(
                        'INSERT INTO transactions (phoneNumber, amount, description, created_at) VALUES (?, ?, ?, NOW())',
                        [phoneNumber, 5000, 'Viewed last transaction'],
                        err => {
                            if (err) console.error('❌ Transaction log error:', err);
                        }
                    );
                } else if (sub === '2') {
                    response = `END All transactions feature coming soon.`;
                } else if (sub === '3') {
                    response = `CON Enter Amount to Send`;
                } else if (sub === '0') {
                    response = `CON Main Menu\n1. Transactions\n2. Support\n3. Settings\n0. Back`;
                } else {
                    response = `END Invalid selection`;
                }
            }
        } else if (lang === '2') {
            if (main === '1') {
                if (sub === '1') {
                    response = `END Iranyuma: 5000 RWF`;
                    connection.query(
                        'INSERT INTO transactions (phoneNumber, amount, description, created_at) VALUES (?, ?, ?, NOW())',
                        [phoneNumber, 5000, 'Reba irya nyuma'],
                        err => {
                            if (err) console.error('❌ Transaction log error:', err);
                        }
                    );
                } else if (sub === '2') {
                    response = `END Amakuru yose azaboneka vuba`;
                } else if (sub === '3') {
                    response = `CON Andika umubare wohereza`;
                } else if (sub === '0') {
                    response = `CON Ibyiciro\n1. Amakuru y'imari\n2. Ubufasha\n3. Guhindura\n0. Subira`;
                } else {
                    response = `END Hitamo siyo`;
                }
            }
        }
    } else if (level === 4) {
        const [lang, main, sub, amount] = textArray;

        if ((lang === '1' && main === '1' && sub === '3') || (lang === '2' && main === '1' && sub === '3')) {
            const description = lang === '1' ? 'New transaction' : 'Igikorwa gishya';
            const numericAmount = parseFloat(amount);

            if (isNaN(numericAmount) || numericAmount <= 0) {
                response = lang === '1' ? `END Invalid amount entered.` : `END Umubare winjiye siwo.`;
            } else {
                // Insert transaction in a transaction block
                connection.beginTransaction(err => {
                    if (err) {
                        console.error('❌ Begin transaction error:', err);
                        return res.send(lang === '1' ? `END System error` : `END Ikosa rya sisitemu`);
                    }

                    connection.query(
                        'INSERT INTO transactions (phoneNumber, amount, description, created_at) VALUES (?, ?, ?, NOW())',
                        [phoneNumber, numericAmount, description],
                        (err1, result) => {
                            if (err1) {
                                return connection.rollback(() => {
                                    console.error('❌ Insert error:', err1);
                                    return res.send(lang === '1' ? `END Failed to save transaction.` : `END Ntibishobotse kubika igikorwa.`);
                                });
                            }

                            connection.commit(err2 => {
                                if (err2) {
                                    return connection.rollback(() => {
                                        console.error('❌ Commit error:', err2);
                                        return res.send(lang === '1' ? `END Transaction commit failed.` : `END Igikorwa nticyarangiye neza.`);
                                    });
                                }

                                return res.send(lang === '1'
                                    ? `END Transaction of ${numericAmount} RWF successful.`
                                    : `END Igikorwa cya ${numericAmount} RWF cyagenze neza.`);
                            });
                        }
                    );
                });
                return; // prevent sending response again below
            }
        } else {
            response = `END Invalid entry`;
        }
    } else {
        response = `END Invalid entry`;
    }

    res.set('Content-Type', 'text/plain');
    res.send(response);
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
