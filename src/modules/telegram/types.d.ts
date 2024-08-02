export interface TelegramButtonI {
    reply_markup: {
        inline_keyboard: Array<{ text: string, callback_data: string }[]>
    }
}