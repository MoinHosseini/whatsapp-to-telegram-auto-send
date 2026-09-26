const { Client, LocalAuth } = require('whatsapp-web.js');
const TelegramBot = require('node-telegram-bot-api');
const qrcode = require('qrcode-terminal');
const puppeteer = require('puppeteer');

const telegramBotToken = '8096816657:AAEIGLl_DoC08As3bW8d8lZjqPDtA-TJXtc';
const telegramChatId = '1786564127';
const aiContact = '34604154472@c.us';

const bot = new TelegramBot(telegramBotToken);

async function sendProgress(msg) {
    try {
        await bot.sendMessage(telegramChatId, `🔄 ${msg}`);
    } catch (e) {
        console.error('❌ Failed to send progress update:', e.message);
    }
}

(async () => {
    await sendProgress('🚀 Starting WhatsApp + Telegram bot initialization...');

    const client = new Client({
        authStrategy: new LocalAuth({ dataPath: './session' }),
        puppeteer: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu'
            ],
        }
    });

const QRCode = require('qrcode');

client.on('qr', async (qr) => {
    console.log('QR RECEIVED', qr);
    try {
        const qrImage = await QRCode.toDataURL(qr);
        // Replace 'YOUR_CHAT_ID' with your actual Telegram chat ID (you can get it from @userinfobot)
        // Or, if the bot is already listening to messages, we can send it to the last person who sent /start
        bot.sendPhoto(process.env.TELEGRAM_CHAT_ID || 'YOUR_CHAT_ID', qrImage, { 
            caption: 'Scan this QR code with WhatsApp to link your account' 
        });
    } catch (err) {
        console.error('Failed to generate QR image', err);
    }
});

    client.on('ready', () => sendProgress('✅ WhatsApp successfully logged in and running!'));
    client.on('authenticated', () => sendProgress('🔐 WhatsApp session authenticated.'));
    client.on('auth_failure', (msg) => sendProgress(`❌ Authentication failed: ${msg}`));
    client.on('disconnected', (reason) => sendProgress(`⚠️ WhatsApp disconnected: ${reason}`));

    client.on('message', async (msg) => {
        if (msg.from !== aiContact && msg.body) {
            const chat = await msg.getChat();
            const sender = chat.name || chat.id.user;
            client.sendMessage(aiContact, `From ${sender}:\n${msg.body}`);
        }
    });

    client.on('message_create', async (msg) => {
        if (msg.from === aiContact && !msg.fromMe && msg.body) {
            bot.sendMessage(telegramChatId, `🤖 *AI Reply:*\n${msg.body}`, { parse_mode: 'Markdown' });
        }
    });

    try {
        await client.initialize();
        await sendProgress('🟢 Client initialization complete.');
    } catch (err) {
        await sendProgress(`🔥 Failed to initialize client: ${err.message}`);
        console.error('Client init error:', err);
    }
})();
