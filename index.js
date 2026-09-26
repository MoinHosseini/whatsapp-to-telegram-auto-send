const { Client, LocalAuth } = require('whatsapp-web.js');
const TelegramBot = require('node-telegram-bot-api');
const QRCode = require('qrcode');

// --- CONFIGURATION ---
// HARDCODED CHAT ID (You asked to hardcode it, so here it is)
const telegramChatId = '1369963590'; 

// Token is still pulled from Railway for security
const telegramToken = process.env.BOT_TOKEN;

// OPTIONAL: If you ONLY want to forward messages from a specific group, type its exact name here.
// Leave it as '' (empty) to forward messages from ALL WhatsApp groups.
const TARGET_GROUP_NAME = ''; 

// Initialize Telegram Bot
const bot = new TelegramBot(telegramToken, { polling: true });

// Helper function to send messages to Telegram safely
async function sendToTelegram(message) {
    try {
        await bot.sendMessage(telegramChatId, message, { parse_mode: 'Markdown' });
    } catch (err) {
        console.error('❌ Failed to send message to Telegram:', err.message);
    }
}

(async () => {
    await sendToTelegram('🚀 Starting WhatsApp + Telegram bot...');

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

    // QR Code Handler (Sends image to Telegram instead of crashing)
    client.on('qr', async (qr) => {
        console.log('QR RECEIVED', qr);
        try {
            const qrImage = await QRCode.toDataURL(qr);
            await bot.sendPhoto(telegramChatId, qrImage, { 
                caption: 'Scan this QR code with WhatsApp to link your account' 
            });
            console.log('✅ QR code sent to Telegram successfully!');
        } catch (err) {
            console.error('❌ Failed to send QR to Telegram:', err.message);
        }
    });

    // Status Handlers
    client.on('ready', () => sendToTelegram('✅ WhatsApp successfully logged in and running!'));
    client.on('authenticated', () => sendToTelegram('🔐 WhatsApp session authenticated.'));
    client.on('auth_failure', (msg) => sendToTelegram(`❌ Authentication failed: ${msg}`));
    client.on('disconnected', (reason) => sendToTelegram(`⚠️ WhatsApp disconnected: ${reason}`));

    // Message Handler (Forwards WhatsApp Group messages to Telegram)
    client.on('message', async (msg) => {
        if (msg.fromMe) return;
        if (!msg.body) return;

        try {
            const chat = await msg.getChat();
            if (!chat.isGroup) return;
            if (TARGET_GROUP_NAME && chat.name !== TARGET_GROUP_NAME) return;

            const contact = await msg.getContact();
            const senderName = contact.pushname || contact.number;
            const forwardMessage = `*${chat.name}*\n👤 *${senderName}*\n\n${msg.body}`;

            await sendToTelegram(forwardMessage);
            console.log(`✅ Forwarded message from ${senderName}`);

        } catch (err) {
            console.error('❌ Error processing WhatsApp message:', err.message);
        }
    });

    // Initialize the WhatsApp client
    try {
        await client.initialize();
    } catch (err) {
        await sendToTelegram(`🔥 Failed to initialize client: ${err.message}`);
        console.error('Client init error:', err);
    }
})();
