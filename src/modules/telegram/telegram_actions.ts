import { Telegraf } from "telegraf"
import usersService from "./users/users"
import axios from 'axios'
import { createWriteStream } from "fs"
import otherService from "../other/other.service"
import { pool } from "../db/db"
import { SelectResponseDBT } from "../db/types"
import sessionService from "./session/session.service"
import { ComplexI } from "./session/types"

export default class TelegramActions {

    private bot: Telegraf

    constructor(bot: Telegraf) {
        this.bot = bot
    }

    executeActions() {
        try {
            this.bot.on('callback_query', this.callbackQuery)
            this.bot.on('new_chat_members', async (ctx) => await this.handleNewChatMembers(ctx))
            this.bot.on('left_chat_member', this.handleLeftChatMemberasync)
            this.bot.on("photo", this.handlePhoto)
            this.bot.on('document', this.handleDocument)
            this.bot.on('video', this.handleVideo)
            this.bot.on("video_note", this.handleVideoNote)
        } catch (e) {
            console.log(e)
        }

    }
    private async callbackQuery(ctx: any) {
        if (!ctx.callbackQuery && !ctx.callbackQuery.data) return
        const callbackData = ctx.callbackQuery.data as string
        const regExp = new RegExp("complexId=")

        if (regExp.test(callbackData)) {
            const username = ctx.chat.username
            const complex: ComplexI = await pool.execute('select * from complex where id = ?', [Number(callbackData.split("=")[1])]).then((r: SelectResponseDBT<ComplexI>) => r[0][0])
            const user = await pool.execute('select * from users where login = ?', [username]).then((r: SelectResponseDBT) => r[0][0])
            const session = await sessionService.getSession(user)
            await sessionService.updateUsersValues("lastResComplexId", complex.name, session)
            ctx.reply('Вы хотите предоставить доступ к гео или описать текстом?', {
                reply_markup: {
                    inline_keyboard: [{ text: `Гео`, callback_data: `geo`}, { text: `Текстом`, callback_data: `geodescription`}]
            }})

        }
    }

    private async handleNewChatMembers(ctx: any) {
        
        try {
            try {
                await this.cheackAdminForGroup(ctx)
            } catch (e) {
                return ctx.reply(`В этой группе я работать не буду!`)
            }
            
            for (let i = 0; i < ctx.message.new_chat_members.length; i++) {
                if (ctx.message.new_chat_members[i].username) await usersService.createUser({ login: ctx.message.new_chat_members[i].username!, phone: null })
                ctx.reply(`Добро пожаловать, ${ctx.message.new_chat_members[i].username}!`)
    
            }
        } catch (e) {
            console.log(e)
        }
    }

    private async handleLeftChatMemberasync(ctx: any) {

        try {
            await this.cheackAdminForGroup(ctx)
        } catch (e) {
            return ctx.reply(`В этой группе я работать не буду!`)
        }

        const member = ctx.message.left_chat_member
        if (member.username) {
            await usersService.deleteUser(member.username!)
            ctx.reply(`Прощай, ${member.username}! Мы будем скучать!`)
        }
    }

    private async handlePhoto(ctx: any) {

        const username = ctx.chat.username

        if (ctx.update && ctx.update.message && ctx.update.message.photo && Array.isArray(ctx.update.message.photo)) {
            const file_id = ctx.update.message.photo[ctx.update.message.photo.length - 1]["file_id"]
            const fileLink = await ctx.telegram.getFileLink(file_id)
            console.log(fileLink)
            ctx.reply(`Фото`)
            return
        }

    }

    private async handleDocument(ctx: any) {

        const username = ctx.chat.username
        const fileId = ctx.message.document.file_id
        const fileName = ctx.message.document.file_name
        const fileExtension = fileName.split('.').pop().toLowerCase()

        if (fileExtension === 'png' || fileExtension === 'jpg' || fileExtension === 'jpeg' || 'mp4' || "webm") {
            //bl
            ctx.reply(fileExtension)
            return

        } else return ctx.reply('❌ Формат файла не поддерживается.')
    }

    private async handleVideo(ctx: any) {
        const username = ctx.chat.username
        const fileId = ctx.message.video.file_id
        const fileName = ctx.message.video.file_name || 'video.mp4'
        const fileExtension = fileName.split('.').pop().toLowerCase()


        const supportedVideoFormats = ['mp4', 'webm', 'avi', 'mov', 'mkv', 'flv', 'wmv', 'mpeg']

        if (supportedVideoFormats.includes(fileExtension)) {
            ctx.reply(`Получено видео: ${fileExtension}`)

            // Получаем ссылку на видео
            const fileUrl = await ctx.telegram.getFileLink(fileId)

            // logic
            return ctx.reply(`Ссылка на ваше видео: ${fileUrl}`)
        } else {
            return ctx.reply('❌ Формат видео не поддерживается.')
        }
    }

    private async handleVideoNote(ctx: any) {
        if (!ctx || !ctx.message.video_note) {
            return ctx.reply('❌ Ошибка: контекст или видеозаметка не определены.')
        }

        const fileId = ctx.message.video_note.file_id

        try {
            const fileLink = await ctx.telegram.getFileLink(fileId)
            console.log('Ссылка на видеозаметку:', fileLink)

            // Загружаем видеозаметку
            const response = await axios.get(fileLink, { responseType: 'stream' })
            const filePath = otherService.getPathToStorage() + `/${fileId}.mp4`

            const writer = createWriteStream(filePath)
            response.data.pipe(writer);

            writer.on('finish', () => {
                ctx.reply(`✅ Видеозаметка успешно загружена: ${filePath}`);
            });

            writer.on('error', (err) => {
                console.error('Ошибка при сохранении файла:', err);
                ctx.reply('❌ Ошибка при загрузке видеозаметки.');
            });
        } catch (error) {
            console.error('Ошибка при получении файла:', error);
            ctx.reply('❌ Произошла ошибка при получении видеозаметки.');
        }
    }

    private async cheackAdminForGroup(ctx: any) {
        try {
            const chatId = ctx.chat.id
            const admins = await ctx.telegram.getChatAdministrators(chatId)

            if (admins.length > 0) {
                let adminVerify = false
                admins.forEach((admin: any) => {
                    if (admin.user.username === process.env.ROOT_TG_USER_LOGIN) return adminVerify = true
                })

                if (!adminVerify) throw new Error()
                ctx.reply("Админ")
            } else {
                throw new Error()
            }
        } catch (error) {
            throw new Error()
        }
    }

}