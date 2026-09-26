const { Client, LocalAuth } = require('whatsapp-web.js');
const TelegramBot = require('node-telegram-bot-api');
const QRCode = require('qrcode');

// --- CONFIGURATION ---
const telegramChatId = '1369963590'; // Hardcoded Chat ID
const telegramToken = process.env.BOT_TOKEN; // Pulled from Railway
const TARGET_GROUP_NAME = 'Gold'; // <--- ONLY FORWARD FROM THIS GROUP

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
    // Clear any pending webhooks/updates to fix the 409 Conflict error
    try {
        await bot.deleteWebHook({ drop_pending_updates: true });
    } catch (e) {
        console.log("Could not delete webhook, continuing...");
    }

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

    // QR Code Handler
    client.on('qr', async (qr) => {
        console.log('QR RECEIVED', qr);
        try {
            const qrBuffer = await QRCode.toBuffer(qr);
            await bot.sendPhoto(telegramChatId, qrBuffer, { 
                caption: 'Scan this QR code with WhatsApp to link your account' 
            }, { filename: 'qrcode.png', contentType: 'image/png' });
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

    // Message Handler (Forwards ONLY the "Gold" group to Telegram)
    client.on('message', async (msg) => {
        if (msg.fromMe) return;
        if (!msg.body) return;

        try {
            const chat = await msg.getChat();
            
            // 1. Ignore if it's not a group
            if (!chat.isGroup) return;

            // 2. Ignore if the group name does not exactly match "Gold"
            if (chat.name !== TARGET_GROUP_NAME) return;

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
