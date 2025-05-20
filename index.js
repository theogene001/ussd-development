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

        // Transaction Example 1: Log transaction and update balance
        if ((lang === '1' && main === '1' && sub === '1') || (lang === '2' && main === '1' && sub === '1')) {
            const amount = 5000;
            const description = lang === '1' ? 'Viewed last transaction' : 'Reba irya nyuma';

            connection.beginTransaction(err => {
                if (err) {
                    console.error('❌ Transaction begin error:', err);
                    response = `END System error. Try again.`;
                    return res.send(response);
                }

                connection.query(
                    'INSERT INTO transactions (phoneNumber, amount, description, created_at) VALUES (?, ?, ?, NOW())',
                    [phoneNumber, amount, description],
                    (err, result) => {
                        if (err) {
                            return connection.rollback(() => {
                                console.error('❌ Insert error:', err);
                                response = `END Failed to log transaction.`;
                                return res.send(response);
                            });
                        }

                        connection.query(
                            'UPDATE balances SET balance = balance + ? WHERE phoneNumber = ?',
                            [amount, phoneNumber],
                            (err2, result2) => {
                                if (err2) {
                                    return connection.rollback(() => {
                                        console.error('❌ Update balance error:', err2);
                                        response = `END Failed to update balance.`;
                                        return res.send(response);
                                    });
                                }

                                connection.commit(err3 => {
                                    if (err3) {
                                        return connection.rollback(() => {
                                            console.error('❌ Commit error:', err3);
                                            response = `END Failed to finalize transaction.`;
                                            return res.send(response);
                                        });
                                    }

                                    const lastMsg = lang === '1'
                                        ? `END Last transaction: ${amount} RWF received`
                                        : `END Iranyuma: ${amount} RWF`;
                                    return res.send(lastMsg);
                                });
                            }
                        );
                    }
                );
            });

            return; // avoid sending res twice
        }

        // Fallback for other suboptions
        if (lang === '1') {
            if (main === '1') {
                if (sub === '2') {
                    response = `END All transactions feature coming soon.`;
                } else if (sub === '3') {
                    response = `CON Enter Amount to Send`;
                } else if (sub === '0') {
                    response = `CON Main Menu\n1. Transactions\n2. Support\n3. Settings\n0. Back`;
                } else {
                    response = `END Invalid selection`;
                }
            } else if (main === '2') {
                response = sub === '1' ? `END Call us at 1234`
                    : sub === '2' ? `END Email: help@example.com`
                    : sub === '0' ? `CON Main Menu\n1. Transactions\n2. Support\n3. Settings\n0. Back`
                    : `END Invalid option`;
            } else if (main === '3') {
                response = sub === '1' ? `END Language change coming soon`
                    : sub === '2' ? `END PIN reset feature coming soon`
                    : sub === '0' ? `CON Main Menu\n1. Transactions\n2. Support\n3. Settings\n0. Back`
                    : `END Invalid option`;
            }
        } else if (lang === '2') {
            if (main === '1') {
                if (sub === '2') {
                    response = `END Amakuru yose azaboneka vuba`;
                } else if (sub === '3') {
                    response = `END Perform a new transaction feature coming soon.`;
                } else if (sub === '0') {
                    response = `CON Ibyiciro\n1. Amakuru y'imari\n2. Ubufasha\n3. Guhindura\n0. Subira`;
                } else {
                    response = `END Hitamo siyo`;
                }
            } else if (main === '2') {
                response = sub === '1' ? `END Duhamagare kuri 1234`
                    : sub === '2' ? `END Email: help@example.com`
                    : sub === '0' ? `CON Ibyiciro\n1. Amakuru y'imari\n2. Ubufasha\n3. Guhindura\n0. Subira`
                    : `END Hitamo siyo`;
            } else if (main === '3') {
                response = sub === '1' ? `END Guhindura ururimi vuba`
                    : sub === '2' ? `END Guhindura PIN vuba`
                    : sub === '0' ? `CON Ibyiciro\n1. Amakuru y'imari\n2. Ubufasha\n3. Guhindura\n0. Subira`
                    : `END Hitamo siyo`;
            }
        }
    } else {
        response = `END Invalid entry`;
    }

    res.set('Content-Type', 'text/plain');
    res.send(response);
});

// Server setup
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
